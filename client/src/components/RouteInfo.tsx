import React, { useState } from 'react';
import { Clock, Route as RouteIcon, ArrowRight, Car, Bus, PersonStanding, Bike, Navigation } from 'lucide-react';
import { Route, TransportMode } from '@shared/schema';
import TurnByTurnDirections from './TurnByTurnDirections';

interface RouteInfoProps {
  routes: Route[];
  selectedRouteIndex: number;
  onRouteSelect: (index: number) => void;
  sourceName: string;
  destinationName: string;
}

const RouteInfo: React.FC<RouteInfoProps> = ({
  routes,
  selectedRouteIndex,
  onRouteSelect,
  sourceName,
  destinationName
}) => {
  const [showDirections, setShowDirections] = useState<boolean>(false);
  
  // Format distance to km or m
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  // Format duration to hours and minutes
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };

  // Get short names for source and destination
  const getShortName = (fullName: string): string => {
    if (!fullName) return '';
    
    // Split by commas and take the first part
    const parts = fullName.split(',');
    return parts[0].trim();
  };

  const shortSourceName = getShortName(sourceName);
  const shortDestName = getShortName(destinationName);
  
  // Get traffic indicator text and color
  const getTrafficInfo = (route: Route) => {
    if (!route.hasTraffic) return null;
    
    let color, text;
    switch (route.severity) {
      case 'high':
        color = 'bg-red-500';
        text = 'Heavy traffic';
        break;
      case 'medium':
        color = 'bg-orange-500';
        text = 'Moderate traffic';
        break;
      case 'low':
        color = 'bg-green-500';
        text = 'Clear route';
        break;
      default:
        return null;
    }
    
    return { color, text };
  };
  
  // Get transport mode icon and name
  const getTransportModeInfo = (mode?: TransportMode) => {
    switch (mode) {
      case 'driving':
        return { 
          icon: <Car className="h-4 w-4" />, 
          name: 'Driving'
        };
      case 'walking':
        return { 
          icon: <PersonStanding className="h-4 w-4" />, 
          name: 'Walking'
        };
      case 'cycling':
        return { 
          icon: <Bike className="h-4 w-4" />, 
          name: 'Cycling'
        };
      case 'transit':
        return { 
          icon: <Bus className="h-4 w-4" />, 
          name: 'Transit'
        };
      default:
        return { 
          icon: <Car className="h-4 w-4" />, 
          name: 'Driving'
        };
    }
  };

  // Get selected route
  const selectedRoute = routes[selectedRouteIndex] || null;

  if (showDirections && selectedRoute) {
    return (
      <TurnByTurnDirections 
        route={selectedRoute} 
        onClose={() => setShowDirections(false)} 
      />
    );
  }

  return (
    <div className="bg-white p-5 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-3 flex items-center">
        <RouteIcon className="h-5 w-5 mr-2 text-blue-600" />
        Route Options
      </h3>
      
      <div className="mb-4 flex items-center text-sm text-gray-600">
        <span className="font-medium">{shortSourceName}</span>
        <ArrowRight className="mx-2 h-4 w-4" />
        <span className="font-medium">{shortDestName}</span>
      </div>
      
      <div className="space-y-3 mb-1">
        {routes.map((route, index) => {
          const trafficInfo = getTrafficInfo(route);
          
          return (
            <div 
              key={index}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                route.isSelected 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
              onClick={() => onRouteSelect(index)}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-2 ${
                    route.isSelected ? 'bg-blue-500' : 'bg-gray-300'
                  }`}></div>
                  <span className="font-medium">
                    {index === 0 ? 'Fastest Route' : `Alternative ${index}`}
                  </span>
                </div>
                {route.isSelected && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Selected
                  </span>
                )}
              </div>
              
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                <span>{formatDuration(route.duration)}</span>
                <span className="mx-2">•</span>
                <span>{formatDistance(route.distance)}</span>
                
                {/* Transport mode info */}
                {route.transportMode && (
                  <>
                    <span className="mx-2">•</span>
                    <span className="flex items-center">
                      {getTransportModeInfo(route.transportMode).icon}
                      <span className="ml-1">{getTransportModeInfo(route.transportMode).name}</span>
                    </span>
                  </>
                )}
                
                {/* Traffic info */}
                {trafficInfo && (
                  <>
                    <span className="mx-2">•</span>
                    <span className="flex items-center">
                      <div className={`h-2 w-2 ${trafficInfo.color} rounded-full mr-1`}></div>
                      {trafficInfo.text}
                    </span>
                  </>
                )}
              </div>
              
              {route.isSelected && route.severity === 'high' && route.delay && route.delay > 0 && (
                <div className="mt-2 flex items-center text-xs text-red-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  +{route.delay} min delay due to heavy traffic
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <button 
        className="w-full py-2.5 mt-4 border border-blue-600 text-blue-600 bg-white rounded-md font-medium hover:bg-blue-50 transition-colors flex items-center justify-center"
        onClick={() => setShowDirections(true)}
        disabled={routes.length === 0 || !selectedRoute?.steps || selectedRoute.steps.length === 0}
      >
        <Navigation className="h-5 w-5 mr-1.5" />
        Show Turn-by-Turn Directions
      </button>
    </div>
  );
};

export default RouteInfo;
