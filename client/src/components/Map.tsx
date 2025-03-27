import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Coordinate, Route, TransportMode, ConstructionZone } from '@shared/schema';
import { getAlternativeRoutes } from '@/services/osrmService';
import { useWebSocket } from '@/hooks/use-websocket';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface MapProps {
  source: Coordinate | null;
  destination: Coordinate | null;
  routes: Route[];
  onRoutesLoaded: (routes: Route[]) => void;
  onRouteSelect: (index: number) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  transportMode: TransportMode;
}

const Map: React.FC<MapProps> = ({
  source,
  destination,
  routes,
  onRoutesLoaded,
  onRouteSelect,
  isLoading,
  setIsLoading,
  transportMode
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const routeLayersRef = useRef<L.Layer[]>([]);
  const sourceMarkerRef = useRef<L.Marker | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);
  const constructionMarkersRef = useRef<L.Marker[]>([]);
  
  const [mapInitialized, setMapInitialized] = useState<boolean>(false);
  
  const { constructionZones, trafficUpdates, connectionStatus, subscribeToArea } = useWebSocket();
  const { toast } = useToast();
  
  // Initialize map on component mount
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629], // Default to center of India
      zoom: 5,
      zoomControl: false
    });
    
    // Add zoom control to top-right
    L.control.zoom({
      position: 'topright'
    }).addTo(map);
    
    // Add tile layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    mapRef.current = map;
    setMapInitialized(true);
    
    // Clean up on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);
  
  // Create custom markers for source and destination
  const createCustomMarker = (type: 'source' | 'destination') => {
    const color = type === 'source' ? '#22c55e' : '#ef4444';
    const html = `
      <div class="flex items-center justify-center w-8 h-8">
        <div class="w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-md">
          <div class="w-3 h-3 rounded-full bg-${type === 'source' ? 'green' : 'red'}-500"></div>
        </div>
      </div>
    `;
    
    return L.divIcon({
      className: 'custom-marker',
      html,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };
  
  // Create custom marker for construction zones
  const createConstructionMarker = () => {
    const html = `
      <div class="flex items-center justify-center w-8 h-8">
        <div class="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center shadow-md text-white">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3.5 h-3.5">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
      </div>
    `;
    
    return L.divIcon({
      className: 'construction-marker',
      html,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });
  };
  
  // Update source and destination markers
  useEffect(() => {
    if (!mapInitialized || !mapRef.current) return;
    
    // Clear existing markers
    if (sourceMarkerRef.current) {
      sourceMarkerRef.current.remove();
      sourceMarkerRef.current = null;
    }
    
    if (destMarkerRef.current) {
      destMarkerRef.current.remove();
      destMarkerRef.current = null;
    }
    
    // Add new markers if coordinates exist
    if (source) {
      sourceMarkerRef.current = L.marker([source[1], source[0]], {
        icon: createCustomMarker('source'),
        zIndexOffset: 1000 // Make sure it's above routes and construction
      }).addTo(mapRef.current);
    }
    
    if (destination) {
      destMarkerRef.current = L.marker([destination[1], destination[0]], {
        icon: createCustomMarker('destination'),
        zIndexOffset: 1000 // Make sure it's above routes and construction
      }).addTo(mapRef.current);
    }
    
    // If both source and destination are set, fit bounds
    if (source && destination) {
      mapRef.current.fitBounds([
        [source[1], source[0]],
        [destination[1], destination[0]]
      ], { padding: [50, 50] });
    } 
    // Otherwise zoom to the one that exists
    else if (source) {
      mapRef.current.setView([source[1], source[0]], 13);
    } 
    else if (destination) {
      mapRef.current.setView([destination[1], destination[0]], 13);
    }
  }, [source, destination, mapInitialized]);
  
  // Fetch routes when source, destination, or transport mode changes
  useEffect(() => {
    const fetchRoutes = async () => {
      if (!source || !destination || !mapInitialized || !mapRef.current) {
        return;
      }
      
      setIsLoading(true);
      
      try {
        const newRoutes = await getAlternativeRoutes(source, destination, transportMode);
        onRoutesLoaded(newRoutes);
        
        // Subscribe to the area covered by the route
        if (newRoutes.length > 0) {
          // Calculate center of the route
          const bounds = L.latLngBounds([
            [source[1], source[0]],
            [destination[1], destination[0]]
          ]);
          const center: Coordinate = [
            bounds.getCenter().lng,
            bounds.getCenter().lat
          ];
          
          // Radius is half the distance between points (in km) + buffer
          const radius = bounds.getNorthEast().distanceTo(bounds.getSouthWest()) / 2000 + 5;
          
          // Subscribe to area for real-time updates
          subscribeToArea(center, radius);
        }
      } catch (error) {
        console.error('Error fetching routes:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch routes. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (source && destination && isLoading) {
      fetchRoutes();
    }
  }, [source, destination, transportMode, isLoading, mapInitialized, onRoutesLoaded, setIsLoading, subscribeToArea, toast]);
  
  // Update route display when routes change
  useEffect(() => {
    if (!mapInitialized || !mapRef.current) return;
    
    // Clear previous route layers
    routeLayersRef.current.forEach(layer => {
      if (mapRef.current) {
        mapRef.current.removeLayer(layer);
      }
    });
    routeLayersRef.current = [];
    
    if (routes.length === 0) return;
    
    // Add new route layers
    routes.forEach((route, index) => {
      if (!route.geometry) return;
      
      try {
        // Decode polyline geometry
        const decodedPath = decodePolyline(route.geometry);
        
        // Determine color based on traffic severity and selection
        let color = '#3b82f6'; // Default blue
        let opacity = 0.6;
        let weight = 5;
        
        if (route.isSelected) {
          weight = 7;
          opacity = 0.8;
        }
        
        if (route.hasTraffic && route.severity) {
          if (route.severity === 'high') {
            color = '#ef4444'; // Red
          } else if (route.severity === 'medium') {
            color = '#f97316'; // Orange
          } else if (route.severity === 'low') {
            color = '#22c55e'; // Green
          }
        }
        
        // Create polyline and add to map
        const polyline = L.polyline(decodedPath, {
          color,
          weight,
          opacity,
          lineJoin: 'round'
        }).addTo(mapRef.current!);
        
        // Add click handler to select route
        polyline.on('click', () => {
          onRouteSelect(index);
        });
        
        routeLayersRef.current.push(polyline);
      } catch (error) {
        console.error('Error decoding polyline:', error);
      }
    });
    
    // If there's at least one valid route, fit bounds
    if (routeLayersRef.current.length > 0) {
      const bounds = L.featureGroup(routeLayersRef.current).getBounds();
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [routes, mapInitialized, onRouteSelect]);
  
  // Update construction zone markers when they change
  useEffect(() => {
    if (!mapInitialized || !mapRef.current) return;
    
    // Clear previous construction markers
    constructionMarkersRef.current.forEach(marker => {
      if (mapRef.current) {
        mapRef.current.removeLayer(marker);
      }
    });
    constructionMarkersRef.current = [];
    
    if (constructionZones.length === 0 || !source || !destination || routeLayersRef.current.length === 0) return;
    
    // Only place construction zones near routes
    constructionZones.forEach(zone => {
      const zoneLatLng = L.latLng(zone.location[1], zone.location[0]);
      
      // Check if construction zone is near any route
      const isNearRoute = routeLayersRef.current.some(route => {
        if (route instanceof L.Polyline) {
          const routeLatLngs = route.getLatLngs();
          
          // Check if zone is within a certain distance of any point on the route
          return routeLatLngs.some((point: L.LatLng) => {
            return point.distanceTo(zoneLatLng) < 5000; // 5km threshold
          });
        }
        return false;
      });
      
      if (isNearRoute) {
        // Check that the construction zone is not too close to source or destination
        const sourceLatLng = L.latLng(source[1], source[0]);
        const destLatLng = L.latLng(destination[1], destination[0]);
        
        if (zoneLatLng.distanceTo(sourceLatLng) > 200 && zoneLatLng.distanceTo(destLatLng) > 200) {
          const marker = L.marker([zone.location[1], zone.location[0]], {
            icon: createConstructionMarker()
          }).addTo(mapRef.current!);
          
          marker.bindPopup(`
            <div class="p-2">
              <div class="font-semibold text-yellow-800">${zone.description}</div>
              <div class="text-sm text-gray-600">Until: ${new Date(zone.endDate).toLocaleDateString()}</div>
            </div>
          `);
          
          constructionMarkersRef.current.push(marker);
        }
      }
    });
  }, [constructionZones, routes, mapInitialized, source, destination]);
  
  // Show connection status toast when it changes
  useEffect(() => {
    if (connectionStatus === 'connected') {
      toast({
        title: 'Connected',
        description: 'Live traffic updates are now active.',
        variant: 'default'
      });
    } else if (connectionStatus === 'disconnected') {
      toast({
        title: 'Disconnected',
        description: 'Live traffic updates are not available.',
        variant: 'destructive'
      });
    }
  }, [connectionStatus, toast]);
  
  // Helper function to decode polyline
  const decodePolyline = (encoded: string): L.LatLngExpression[] => {
    // Polyline decoding logic
    let index = 0;
    const len = encoded.length;
    const points: L.LatLngExpression[] = [];
    let lat = 0;
    let lng = 0;
    
    while (index < len) {
      let b;
      let shift = 0;
      let result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lat += dlat;
      
      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
      lng += dlng;
      
      points.push([lat / 1e5, lng / 1e5]);
    }
    
    return points;
  };
  
  return (
    <div className="relative">
      <div ref={mapContainerRef} className="h-[500px] rounded-lg overflow-hidden border border-gray-200"></div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-2 right-2 z-[1000] bg-white px-3 py-1 rounded-full shadow-md text-sm flex items-center">
          <Loader2 className="h-4 w-4 mr-2 text-blue-600 animate-spin" />
          Loading routes...
        </div>
      )}
      
      {/* Connection status indicator */}
      <div className="absolute top-2 left-2 z-[1000] flex items-center">
        <div className={`p-2 rounded-md flex items-center space-x-1 ${
          connectionStatus === 'connected' 
            ? 'bg-green-100 text-green-700'
            : connectionStatus === 'connecting'
            ? 'bg-yellow-100 text-yellow-700'
            : 'bg-red-100 text-red-700'
        }`}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
            <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
            <line x1="12" y1="20" x2="12.01" y2="20"></line>
          </svg>
          <span className="text-xs font-medium">
            {connectionStatus === 'connected' 
              ? 'Live Updates Active'
              : connectionStatus === 'connecting'
              ? 'Connecting...'
              : 'Disconnected'}
          </span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 right-4 z-[1000] bg-white p-3 rounded-lg shadow-md">
        <div className="text-sm font-medium mb-2">Legend</div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 opacity-30"></div>
            <span className="text-xs">Heavy Traffic</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-orange-500 opacity-30"></div>
            <span className="text-xs">Moderate Traffic</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 opacity-30"></div>
            <span className="text-xs">Clear Route</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 opacity-70 flex items-center justify-center rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-white">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
            </div>
            <span className="text-xs">Construction Zone</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Map;
