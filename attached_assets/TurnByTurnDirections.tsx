import React from 'react';
import { Route, NavigationStep, TransportMode } from '@shared/schema';
import { 
  ChevronRight, 
  ArrowDown, 
  ArrowUp, 
  ArrowLeft, 
  ArrowRight, 
  CornerDownLeft, 
  CornerDownRight, 
  CornerUpLeft, 
  CornerUpRight,
  Flag,
  Home,
  Clock,
  Car,
  Bike,
  PersonStanding,
  Bus
} from 'lucide-react';

interface TurnByTurnDirectionsProps {
  route: Route;
  onClose: () => void;
}

const TurnByTurnDirections: React.FC<TurnByTurnDirectionsProps> = ({ route, onClose }) => {
  // Get icon for the turn type
  const getTurnIcon = (step: NavigationStep) => {
    if (!step.maneuver) return <ChevronRight className="h-5 w-5" />;
    
    const { type, modifier } = step.maneuver;
    
    if (type === 'arrive') {
      return <Flag className="h-5 w-5 text-red-500" />;
    }
    
    if (type === 'depart') {
      return <Home className="h-5 w-5 text-green-500" />;
    }
    
    switch (modifier) {
      case 'straight':
        return <ArrowUp className="h-5 w-5" />;
      case 'slight right':
        return <CornerUpRight className="h-5 w-5" />;
      case 'right':
        return <ArrowRight className="h-5 w-5" />;
      case 'sharp right':
        return <CornerDownRight className="h-5 w-5" />;
      case 'slight left':
        return <CornerUpLeft className="h-5 w-5" />;
      case 'left':
        return <ArrowLeft className="h-5 w-5" />;
      case 'sharp left':
        return <CornerDownLeft className="h-5 w-5" />;
      case 'uturn':
        return <ArrowDown className="h-5 w-5" />;
      default:
        return <ChevronRight className="h-5 w-5" />;
    }
  };
  
  // Format distance to km or m
  const formatDistance = (meters: number): string => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };
  
  // Format duration to minutes and seconds
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (minutes > 0) {
      return `${minutes} min${remainingSeconds > 0 ? ` ${remainingSeconds} sec` : ''}`;
    }
    return `${remainingSeconds} sec`;
  };
  
  // Format the total duration (hours and minutes)
  const formatTotalDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours} hr ${minutes} min`;
    }
    return `${minutes} min`;
  };
  
  // Get the transport mode icon
  const getTransportModeIcon = (mode?: TransportMode) => {
    switch (mode) {
      case 'driving':
        return <Car className="h-5 w-5" />;
      case 'walking':
        return <PersonStanding className="h-5 w-5" />;
      case 'cycling':
        return <Bike className="h-5 w-5" />;
      case 'transit':
        return <Bus className="h-5 w-5" />;
      default:
        return <Car className="h-5 w-5" />;
    }
  };
  
  if (!route.steps || route.steps.length === 0) {
    return (
      <div className="p-5 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Turn-by-Turn Directions</h3>
          <button 
            className="text-gray-500 hover:text-gray-700" 
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="py-10 text-center text-gray-500">
          No directions available for this route.
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-5 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Turn-by-Turn Directions</h3>
        <button 
          className="text-gray-500 hover:text-gray-700" 
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      
      {/* Route summary */}
      <div className="mb-5 p-3 bg-blue-50 rounded-md border border-blue-100">
        <div className="flex items-center text-blue-800 font-medium mb-2">
          {getTransportModeIcon(route.transportMode)}
          <span className="ml-2">
            {route.transportMode ? route.transportMode.charAt(0).toUpperCase() + route.transportMode.slice(1) : 'Driving'} Directions
          </span>
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Clock className="h-4 w-4 mr-1" />
          <span className="font-medium">{formatTotalDuration(route.duration)}</span>
          <span className="mx-1">•</span>
          <span>{formatDistance(route.distance)}</span>
        </div>
      </div>
      
      {/* Steps list */}
      <div className="space-y-4">
        {route.steps.map((step, index) => (
          <div 
            key={index} 
            className={`flex p-3 rounded-md ${
              index === 0 || index === route.steps!.length - 1 
                ? 'bg-blue-50 border border-blue-100'
                : 'border border-gray-100 hover:bg-gray-50'
            }`}
          >
            <div className="mr-3 mt-1">
              {getTurnIcon(step)}
            </div>
            <div className="flex-grow">
              <div className="font-medium">
                {step.instruction}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {formatDistance(step.distance)}
                <span className="mx-1">•</span>
                {formatDuration(step.duration)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TurnByTurnDirections;