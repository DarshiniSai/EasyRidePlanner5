import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import axios from "axios";
import crypto from "crypto";
import { z } from "zod";
import { Coordinate, TransportMode, Route, TrafficSeverity, NavigationStep, ConstructionZone, TrafficUpdate } from "@shared/schema";

// OSRM service base URL
const OSRM_BASE_URL = "https://router.project-osrm.org/route/v1";

// Connected WebSocket clients
const clients = new Set<WebSocket>();

// Store current-view areas for clients
const clientAreas = new Map<WebSocket, { center: Coordinate, radius: number }>();

// Store transport modes for clients
const clientTransportModes = new Map<WebSocket, TransportMode>();

// Construction zones that are active
const constructionZones: ConstructionZone[] = [
  {
    id: "1",
    location: [78.5, 17.4],
    description: "Bridge repair work",
    severity: "medium",
    startDate: "2023-10-01",
    endDate: "2024-12-31",
    affectedRoads: ["NH65"]
  },
  {
    id: "2",
    location: [78.6, 17.45],
    description: "Road widening project",
    severity: "high",
    startDate: "2024-01-15",
    endDate: "2024-11-30",
    affectedRoads: ["NH44"]
  },
  {
    id: "3",
    location: [78.42, 17.43],
    description: "Utility work",
    severity: "low",
    startDate: "2024-02-01",
    endDate: "2024-08-31",
    affectedRoads: ["Local roads"]
  },
  {
    id: "4",
    location: [78.47, 17.41],
    description: "Pothole repairs",
    severity: "low",
    startDate: "2024-05-15",
    endDate: "2024-06-30",
    affectedRoads: ["City streets"]
  },
  {
    id: "5",
    location: [78.55, 17.38],
    description: "Major intersection reconstruction",
    severity: "high",
    startDate: "2024-03-01",
    endDate: "2025-01-31",
    affectedRoads: ["NH65", "State Highway 1"]
  }
];

// Traffic update cache for quick retrieval
const trafficUpdates: TrafficUpdate[] = [];

// Parse coordinates from request data
const parseCoordinate = (coord: any): Coordinate => {
  const schema = z.tuple([z.number(), z.number()]);
  return schema.parse(coord);
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Handle WebSocket connections
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    clients.add(ws);
    clientTransportModes.set(ws, 'driving'); // Default transport mode
    
    // Send initial construction zones
    ws.send(JSON.stringify({
      type: 'constructionZones',
      data: constructionZones
    }));
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        
        // Handle different message types
        switch (data.type) {
          case 'subscribe':
            // Store client's current area of interest
            if (data.area && data.area.center && data.area.radius) {
              clientAreas.set(ws, {
                center: data.area.center,
                radius: data.area.radius
              });
              console.log(`Client subscribed to area: ${JSON.stringify(data.area)}`);
            } else if (data.area && data.area.radius) {
              // Use default center if not provided
              clientAreas.set(ws, {
                center: [78.5, 17.4], // Default center
                radius: data.area.radius
              });
              console.log(`Client subscribed to default area with radius: ${data.area.radius}km`);
            }
            break;
            
          case 'updateTransportMode':
            if (data.mode && ['driving', 'walking', 'cycling', 'transit'].includes(data.mode)) {
              clientTransportModes.set(ws, data.mode as TransportMode);
              console.log(`Client updated transport mode to: ${data.mode}`);
            }
            break;
            
          default:
            console.log(`Received unknown message type: ${data.type}`);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
      clientAreas.delete(ws);
      clientTransportModes.delete(ws);
    });
  });
  
  // Start periodic traffic updates for connected clients
  setInterval(() => sendTrafficUpdates(), 15000);
  
  // Geocoding API - Search for places
  app.get('/api/geocode', async (req, res) => {
    try {
      const query = req.query.q as string;
      const isReverse = req.query.reverse === 'true';
      
      if (!query) {
        return res.status(400).json({ message: 'Query parameter is required' });
      }
      
      let url;
      if (isReverse) {
        // Reverse geocoding (coordinates to address)
        const [lat, lon] = query.split(',').map(coord => parseFloat(coord.trim()));
        if (isNaN(lat) || isNaN(lon)) {
          return res.status(400).json({ message: 'Invalid coordinates format' });
        }
        url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
      } else {
        // Forward geocoding (address to coordinates)
        url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`;
      }
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'EasyRoutePlanner/1.0'
        }
      });
      
      if (isReverse) {
        // Single result for reverse geocoding
        const result = response.data;
        if (!result) {
          return res.json([]);
        }
        
        return res.json([{
          name: result.name || result.display_name.split(',')[0],
          displayName: result.display_name,
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon)
        }]);
      } else {
        // Multiple results for forward geocoding
        const results = response.data.map((item: any) => ({
          name: item.name || item.display_name.split(',')[0],
          displayName: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon)
        }));
        
        return res.json(results);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      res.status(500).json({ message: 'Failed to search for places' });
    }
  });
  
  // Routing API - Get routes between source and destination
  app.post('/api/routes', async (req, res) => {
    try {
      const source = parseCoordinate(req.body.source);
      const destination = parseCoordinate(req.body.destination);
      const transportMode = req.body.transportMode as TransportMode || 'driving';
      
      // Convert transport mode to OSRM profile
      const profile = transportMode === 'transit' ? 'driving' : transportMode;
      
      // Format coordinates for OSRM
      const coordinates = `${source[0]},${source[1]};${destination[0]},${destination[1]}`;
      
      // OSRM API request for alternative routes
      const response = await axios.get(`${OSRM_BASE_URL}/${profile}/${coordinates}?alternatives=true&steps=true&geometries=polyline&overview=full`);
      
      if (response.data.code !== 'Ok') {
        return res.status(400).json({ message: 'Failed to find routes' });
      }
      
      // Process OSRM response
      const routes: Route[] = response.data.routes.map((route: any, index: number) => {
        // Generate random traffic conditions for demo
        const hasTraffic = Math.random() > 0.3;
        let severity: TrafficSeverity | undefined;
        let delay = 0;
        
        if (hasTraffic) {
          const rand = Math.random();
          if (rand < 0.33) {
            severity = 'low';
          } else if (rand < 0.66) {
            severity = 'medium';
            delay = Math.floor(Math.random() * 8) + 3; // 3-10 min delay
          } else {
            severity = 'high';
            delay = Math.floor(Math.random() * 15) + 10; // 10-25 min delay
          }
        }
        
        // Process navigation steps
        const steps: NavigationStep[] = [];
        route.legs.forEach((leg: any) => {
          leg.steps.forEach((step: any) => {
            steps.push({
              distance: step.distance,
              duration: step.duration,
              geometry: step.geometry,
              name: step.name,
              instruction: step.maneuver.instruction || step.name,
              maneuver: {
                type: step.maneuver.type,
                modifier: step.maneuver.modifier,
                location: step.maneuver.location ? [step.maneuver.location[0], step.maneuver.location[1]] : undefined,
                bearing_before: step.maneuver.bearing_before,
                bearing_after: step.maneuver.bearing_after
              }
            });
          });
        });
        
        return {
          distance: route.distance,
          duration: hasTraffic && severity === 'high' ? route.duration + (delay * 60) : route.duration,
          geometry: route.geometry,
          steps,
          transportMode,
          isSelected: index === 0,
          hasTraffic,
          severity,
          delay
        };
      });
      
      res.json(routes);
    } catch (error) {
      console.error('Routing error:', error);
      res.status(500).json({ message: 'Failed to get routes' });
    }
  });

  return httpServer;
}

// Function to send traffic updates to clients
function sendTrafficUpdates() {
  // Only send updates if there are connected clients
  if (clients.size === 0) return;
  
  // Generate a random traffic update
  const generateTrafficUpdate = (): TrafficUpdate => {
    const id = crypto.randomUUID();
    const severities: TrafficSeverity[] = ['low', 'medium', 'high'];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    
    // Generate a location near the client's area of interest or a default area
    const clientAreasList = Array.from(clientAreas.values());
    let location: Coordinate;
    
    if (clientAreasList.length > 0) {
      // Pick a random client's area
      const randomArea = clientAreasList[Math.floor(Math.random() * clientAreasList.length)];
      
      // Generate a point within the radius of that area
      const angle = Math.random() * Math.PI * 2; // Random angle
      const distance = Math.random() * randomArea.radius * 0.8; // Random distance within 80% of radius (in km)
      
      // Convert distance to degrees (approximate)
      const latOffset = distance * Math.sin(angle) / 111; // 1 degree lat is about 111km
      const lngOffset = distance * Math.cos(angle) / (111 * Math.cos(randomArea.center[1] * Math.PI / 180));
      
      location = [
        randomArea.center[0] + lngOffset,
        randomArea.center[1] + latOffset
      ];
    } else {
      // Default to a random location if no client areas
      location = [
        78.4 + Math.random() * 0.2,
        17.4 + Math.random() * 0.1
      ];
    }
    
    const descriptions = {
      low: [
        "Minor slowdown",
        "Slightly congested",
        "Light traffic",
        "Traffic flowing well"
      ],
      medium: [
        "Moderate congestion",
        "Slower than usual traffic",
        "Busy conditions",
        "Expect some delays"
      ],
      high: [
        "Heavy traffic jam",
        "Major congestion",
        "Significant delays",
        "Standstill traffic"
      ]
    };
    
    const description = descriptions[severity][Math.floor(Math.random() * descriptions[severity].length)];
    
    return {
      id,
      location,
      description,
      severity,
      timestamp: new Date().toISOString(),
      speed: severity === 'high' ? Math.random() * 20 : 
             severity === 'medium' ? 20 + Math.random() * 30 :
             50 + Math.random() * 40,
      congestion: severity === 'high' ? 0.8 + Math.random() * 0.2 :
                  severity === 'medium' ? 0.4 + Math.random() * 0.4 :
                  Math.random() * 0.4
    };
  };
  
  const update = generateTrafficUpdate();
  trafficUpdates.unshift(update);
  
  // Keep only the last 20 updates
  while (trafficUpdates.length > 20) {
    trafficUpdates.pop();
  }
  
  // Send update to relevant clients
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      // Check if the client is subscribed to the area where the update occurred
      const clientArea = clientAreas.get(client);
      
      if (clientArea) {
        // Calculate distance between client area center and update location
        const lat1 = clientArea.center[1];
        const lon1 = clientArea.center[0];
        const lat2 = update.location[1];
        const lon2 = update.location[0];
        
        // Simple distance calculation (in km, approximate)
        const latDiff = (lat2 - lat1) * 111;
        const lonDiff = (lon2 - lon1) * 111 * Math.cos(lat1 * Math.PI / 180);
        const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
        
        // If the update is within the client's radius of interest, send it
        if (distance <= clientArea.radius) {
          client.send(JSON.stringify({
            type: 'trafficUpdate',
            data: update
          }));
        }
      }
    }
  });
  
  // Occasionally send construction updates
  if (Math.random() < 0.1) {
    // Randomly update or add a construction zone
    const updateExisting = Math.random() < 0.5 && constructionZones.length > 0;
    
    if (updateExisting) {
      // Update an existing zone
      const zoneIndex = Math.floor(Math.random() * constructionZones.length);
      const zone = constructionZones[zoneIndex];
      
      // Modify endDate
      const currentEndDate = new Date(zone.endDate);
      const newEndDate = new Date(currentEndDate);
      
      // 50% chance to extend, 50% chance to reduce
      if (Math.random() < 0.5) {
        newEndDate.setDate(currentEndDate.getDate() + Math.floor(Math.random() * 30));
      } else {
        newEndDate.setDate(currentEndDate.getDate() - Math.floor(Math.random() * 10));
      }
      
      // Update the zone
      constructionZones[zoneIndex] = {
        ...zone,
        endDate: newEndDate.toISOString().split('T')[0],
        description: Math.random() < 0.3 ? 
          zone.description + " (Updated)" :
          zone.description
      };
      
      // Send to all clients
      clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'constructionUpdate',
            data: constructionZones[zoneIndex]
          }));
        }
      });
    } else {
      // Create a new construction zone near a client's area
      const clientAreasList = Array.from(clientAreas.values());
      
      if (clientAreasList.length > 0) {
        const randomArea = clientAreasList[Math.floor(Math.random() * clientAreasList.length)];
        
        // Generate a point within the radius of that area
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * randomArea.radius * 0.7;
        
        // Convert distance to degrees (approximate)
        const latOffset = distance * Math.sin(angle) / 111;
        const lngOffset = distance * Math.cos(angle) / (111 * Math.cos(randomArea.center[1] * Math.PI / 180));
        
        const location: Coordinate = [
          randomArea.center[0] + lngOffset,
          randomArea.center[1] + latOffset
        ];
        
        const descriptions = [
          "Road resurfacing work",
          "Bridge maintenance",
          "Utility installation",
          "Pothole repairs",
          "Lane expansion project",
          "Sidewalk construction",
          "Drainage improvements",
          "Traffic signal installation"
        ];
        
        const severities: TrafficSeverity[] = ['low', 'medium', 'high'];
        
        // Create start and end dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 30 + Math.floor(Math.random() * 90)); // 1-4 months project
        
        const newZone: ConstructionZone = {
          id: crypto.randomUUID(),
          location,
          description: descriptions[Math.floor(Math.random() * descriptions.length)],
          severity: severities[Math.floor(Math.random() * severities.length)],
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          affectedRoads: ["Local roads"]
        };
        
        // Add to the list
        constructionZones.push(newZone);
        
        // Send to all clients
        clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'constructionUpdate',
              data: newZone
            }));
          }
        });
      }
    }
  }
}
