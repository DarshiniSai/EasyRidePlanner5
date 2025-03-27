import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, useMap, Circle, Tooltip, useMapEvents } from "react-leaflet"; 
import L, { LatLngExpression, LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";
import { getAlternativeRoutes } from "../utils/osrmService";
import { Loader2, AlertTriangle, MapPin, Navigation, Locate, Wifi, WifiOff } from "lucide-react";
import { Coordinate, Route, TransportMode, ConstructionZone } from "@shared/schema";
import { useWebSocket } from "@/hooks/use-websocket";

// Create custom marker icons to ensure they display properly
const createCustomIcon = (color = 'blue') => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

interface MapProps {
  source: Coordinate | null;
  destination: Coordinate | null;
  routes: Route[];
  onRoutesLoaded: (routes: Route[]) => void;
  onRouteSelect: (index: number) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  transportMode: TransportMode;
}

// Component to handle map view updates
const MapUpdater: React.FC<{
  source: Coordinate | null;
  destination: Coordinate | null;
  routes: Route[];
}> = ({ source, destination, routes }) => {
  const map = useMap();
  
  useEffect(() => {
    if (source && destination) {
      const bounds = L.latLngBounds(
        [source.lat, source.lng],
        [destination.lat, destination.lng]
      );
      
      // If we have routes, include all route points in the bounds
      if (routes.length > 0) {
        const selectedRoute = routes.find(r => r.isSelected) || routes[0];
        if (selectedRoute) {
          selectedRoute.coordinates.forEach(point => {
            bounds.extend(point);
          });
        }
      }
      
      // Add some padding around the bounds
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (source) {
      map.setView([source.lat, source.lng], 13);
    } else if (destination) {
      map.setView([destination.lat, destination.lng], 13);
    }
  }, [map, source, destination, routes]);
  
  return null;
};

const defaultCenter: LatLngExpression = [16.3067, 80.4365]; // Default to Guntur

// Component to handle user location
const LocationMarker: React.FC<{
  onLocationFound: (location: Coordinate) => void
}> = ({ onLocationFound }) => {
  const [position, setPosition] = useState<LatLngTuple | null>(null);
  const [accuracy, setAccuracy] = useState<number>(0);
  const userLocationIcon = createCustomIcon('blue');
  
  const map = useMapEvents({
    locationfound(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
      setAccuracy(e.accuracy);
      onLocationFound({
        lat: e.latlng.lat,
        lng: e.latlng.lng
      });
      map.flyTo(e.latlng, Math.max(15, map.getZoom()));
    },
    locationerror(e) {
      console.error("Location error:", e.message);
    }
  });
  
  return position === null ? null : (
    <>
      <Marker 
        position={position} 
        icon={userLocationIcon}
      >
        <Tooltip direction="top" permanent>
          Your location
        </Tooltip>
      </Marker>
      <Circle 
        center={position} 
        radius={accuracy} 
        pathOptions={{ 
          color: 'blue', 
          fillColor: 'blue', 
          fillOpacity: 0.1 
        }}
      />
    </>
  );
};

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
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinate | null>(null);
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(false);
  const [realtimeConstructionZones, setRealtimeConstructionZones] = useState<ConstructionZone[]>([]);
  const [showRealtimeData, setShowRealtimeData] = useState<boolean>(true);
  
  // Get real-time updates via WebSocket
  const { 
    constructionZones, 
    trafficUpdates, 
    connectionStatus, 
    sendMessage 
  } = useWebSocket();
  
  // When WebSocket returns construction zones, update state
  useEffect(() => {
    if (constructionZones.length > 0) {
      setRealtimeConstructionZones(constructionZones);
    }
  }, [constructionZones]);
  
  const mapRef = useRef<L.Map | null>(null);
  const sourceIcon = createCustomIcon('green');
  const destinationIcon = createCustomIcon('red');
  const constructionIcon = new L.DivIcon({
    html: `<div class="flex items-center justify-center w-8 h-8 bg-yellow-500 rounded-full border-2 border-white">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>`,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  const getTrafficColor = (severity?: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high':
        return '#ef4444'; // red
      case 'medium':
        return '#f97316'; // orange
      case 'low':
        return '#22c55e'; // green
      default:
        return '#ef4444';
    }
  };

  useEffect(() => {
    if (source && destination) {
      setIsLoading(true);
      setError(null);
      
      getAlternativeRoutes(source, destination, transportMode)
        .then((data) => {
          // Simulate traffic data for demo purposes
          const enhancedRoutes = data.map((route, idx) => {
            // First route (fastest) has high traffic
            if (idx === 0) {
              return {
                ...route,
                hasTraffic: true,
                trafficSegments: route.coordinates.slice(0, 3).map(coord => coord as [number, number]),
                severity: 'high' as const,
                delay: 15
              };
            } 
            // Second route has medium traffic
            else if (idx === 1) {
              return {
                ...route,
                hasTraffic: true,
                trafficSegments: route.coordinates.slice(2, 4).map(coord => coord as [number, number]),
                severity: 'medium' as const,
                delay: 8
              };
            }
            // Third route is clear
            else {
              return {
                ...route,
                hasTraffic: true,
                trafficSegments: route.coordinates.slice(4, 5).map(coord => coord as [number, number]),
                severity: 'low' as const,
                delay: 0
              };
            }
          });
          
          onRoutesLoaded(enhancedRoutes);
        })
        .catch((err) => {
          console.error("Error fetching routes:", err);
          setError("Failed to fetch routes. Please try again.");
          setIsLoading(false);
        });
    }
  }, [source, destination, transportMode, onRoutesLoaded, setIsLoading]);

  const handleRouteClick = (index: number) => {
    onRouteSelect(index);
  };

  // Function to use current location as source
  const useCurrentLocationAsSource = () => {
    if (mapRef.current) {
      setTrackingEnabled(true);
      mapRef.current.locate({ 
        watch: true, 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      });
    }
  };

  // Handle when a location is found
  const handleLocationFound = (location: Coordinate) => {
    setUserLocation(location);
  };

  // Function to stop tracking
  const stopTracking = () => {
    if (mapRef.current) {
      mapRef.current.stopLocate();
      setTrackingEnabled(false);
    }
  };

  return (
    <div className="relative w-full h-[500px] rounded-lg overflow-hidden">
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-2 right-2 z-[1000] bg-white px-3 py-1 rounded-full shadow-md text-sm flex items-center">
          <Loader2 className="animate-spin h-4 w-4 mr-2 text-blue-500" />
          Loading routes...
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute top-2 right-2 z-[1000] bg-red-50 text-red-600 px-3 py-1 rounded-full shadow-md text-sm">
          {error}
        </div>
      )}

      {/* Connection status indicator */}
      <div className="absolute top-2 left-2 z-[1000] flex items-center">
        <div className={`p-2 rounded-md ${
          connectionStatus === 'connected' 
            ? 'bg-green-100 text-green-700' 
            : connectionStatus === 'connecting'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-700'
        } flex items-center space-x-1`}>
          {connectionStatus === 'connected' ? (
            <Wifi className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <span className="text-xs font-medium">
            {connectionStatus === 'connected' 
              ? 'Live Updates Active' 
              : connectionStatus === 'connecting'
                ? 'Connecting...'
                : 'Live Updates Disconnected'}
          </span>
        </div>
      </div>

      {/* Current location button */}
      <button 
        onClick={trackingEnabled ? stopTracking : useCurrentLocationAsSource}
        className={`absolute top-14 left-4 z-[1000] p-2 rounded-full shadow-md ${
          trackingEnabled ? 'bg-blue-500 text-white' : 'bg-white text-blue-600'
        }`}
        title={trackingEnabled ? "Stop tracking location" : "Use current location"}
      >
        <Locate className="h-5 w-5" />
      </button>
      
      {/* Toggle real-time data button */}
      <button 
        onClick={() => setShowRealtimeData(!showRealtimeData)}
        className={`absolute top-28 left-4 z-[1000] p-2 rounded-full shadow-md ${
          showRealtimeData ? 'bg-blue-500 text-white' : 'bg-white text-gray-500'
        }`}
        title={showRealtimeData ? "Hide real-time data" : "Show real-time data"}
      >
        <AlertTriangle className="h-5 w-5" />
      </button>
      
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
              <AlertTriangle className="h-3 w-3 text-white" />
            </div>
            <span className="text-xs">Construction Zone</span>
          </div>
        </div>
      </div>
      
      {/* Map */}
      <MapContainer 
        center={defaultCenter} 
        zoom={13} 
        className="w-full h-full"
        ref={mapRef}
      >
        <TileLayer 
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Source marker */}
        {source && (
          <Marker 
            position={[source.lat, source.lng]}
            icon={sourceIcon}
          >
            <Tooltip direction="top" permanent>
              Start
            </Tooltip>
          </Marker>
        )}
        
        {/* Destination marker */}
        {destination && (
          <Marker 
            position={[destination.lat, destination.lng]}
            icon={destinationIcon}
          >
            <Tooltip direction="top" permanent>
              Destination
            </Tooltip>
          </Marker>
        )}
        
        {/* Route lines and traffic indicators */}
        {routes.map((route, index) => (
          <React.Fragment key={index}>
            {/* Route line */}
            <Polyline 
              positions={route.coordinates} 
              pathOptions={{
                color: route.isSelected ? "#3b82f6" : "#9ca3af",
                weight: route.isSelected ? 5 : 3,
                opacity: route.isSelected ? 0.8 : 0.5
              }}
              eventHandlers={{
                click: () => handleRouteClick(index)
              }}
            />
            
            {/* Traffic circles for selected route */}
            {route.isSelected && route.trafficSegments && route.trafficSegments.map((segment, segIndex) => (
              <Circle
                key={`traffic-${segIndex}`}
                center={segment}
                radius={200}
                pathOptions={{
                  color: getTrafficColor(route.severity),
                  fillColor: getTrafficColor(route.severity),
                  fillOpacity: 0.3
                }}
              />
            ))}
            
            {/* Construction zones for selected route */}
            {route.isSelected && route.constructionZones && route.constructionZones.map((zone, zoneIndex) => (
              <React.Fragment key={`construction-${zoneIndex}`}>
                <Marker
                  position={zone.location}
                  icon={constructionIcon}
                >
                  <Tooltip direction="top">
                    <div className="font-medium text-yellow-600">Construction Zone</div>
                    <div className="text-sm">{zone.description || 'Road work in progress'}</div>
                    <div className="text-xs mt-1">
                      Severity: {zone.severity === 'high' 
                      ? 'Major delay expected' 
                      : zone.severity === 'medium' 
                        ? 'Moderate delay' 
                        : 'Minor delay'}
                    </div>
                  </Tooltip>
                </Marker>
                <Circle
                  center={zone.location}
                  radius={300}
                  pathOptions={{
                    color: '#eab308', // yellow
                    fillColor: '#eab308',
                    fillOpacity: 0.2,
                    dashArray: '5, 10'
                  }}
                />
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
        
        {/* Current location marker when tracking is enabled */}
        {trackingEnabled && <LocationMarker onLocationFound={handleLocationFound} />}
        
        {/* Real-time construction zones from WebSocket */}
        {showRealtimeData && realtimeConstructionZones.map((zone) => (
          <React.Fragment key={`realtime-cz-${zone.id}`}>
            <Marker
              position={zone.location}
              icon={constructionIcon}
            >
              <Tooltip direction="top">
                <div className="font-medium text-yellow-600">
                  Live Construction Zone
                </div>
                <div className="text-sm">{zone.description || 'Road work in progress'}</div>
                {zone.startDate && zone.endDate && (
                  <div className="text-xs text-gray-600 mt-1">
                    {new Date(zone.startDate).toLocaleDateString()} - {new Date(zone.endDate).toLocaleDateString()}
                  </div>
                )}
                <div className="text-xs mt-1">
                  Severity: {zone.severity === 'high' 
                  ? 'Major delay expected' 
                  : zone.severity === 'medium' 
                    ? 'Moderate delay' 
                    : 'Minor delay'}
                </div>
              </Tooltip>
            </Marker>
            <Circle
              center={zone.location}
              radius={300}
              pathOptions={{
                color: '#eab308', // yellow
                fillColor: '#eab308',
                fillOpacity: 0.2,
                dashArray: '5, 10'
              }}
            />
          </React.Fragment>
        ))}
        
        {/* Real-time traffic updates */}
        {showRealtimeData && trafficUpdates.map((update, index) => (
          <Circle
            key={`traffic-update-${index}`}
            center={update.location}
            radius={150}
            pathOptions={{
              color: getTrafficColor(update.severity),
              fillColor: getTrafficColor(update.severity),
              fillOpacity: 0.4,
              weight: 2
            }}
          >
            <Tooltip>
              <div className="font-medium text-red-600">Live Traffic Alert</div>
              <div className="text-sm">{update.description}</div>
              <div className="text-xs text-gray-600 mt-1">
                {new Date(update.timestamp).toLocaleTimeString()}
              </div>
            </Tooltip>
          </Circle>
        ))}
        
        {/* Map view updater */}
        <MapUpdater source={source} destination={destination} routes={routes} />
      </MapContainer>
    </div>
  );
};

export default Map;
