import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2 } from 'lucide-react';
import { searchPlaces } from '@/services/geocodingService';
import { Coordinate } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';

interface LocationInputProps {
  source: string;
  destination: string;
  setSource: (source: string) => void;
  setDestination: (destination: string) => void;
  onSelectSource: (coords: Coordinate | null) => void;
  onSelectDestination: (coords: Coordinate | null) => void;
  setIsLoading: (isLoading: boolean) => void;
}

interface Suggestion {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
}

const LocationInput: React.FC<LocationInputProps> = ({
  source,
  destination,
  setSource,
  setDestination,
  onSelectSource,
  onSelectDestination,
  setIsLoading
}) => {
  const [sourceSuggestions, setSourceSuggestions] = useState<Suggestion[]>([]);
  const [destSuggestions, setDestSuggestions] = useState<Suggestion[]>([]);
  const [isSearchingSource, setIsSearchingSource] = useState<boolean>(false);
  const [isSearchingDest, setIsSearchingDest] = useState<boolean>(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState<boolean>(false);
  const [showDestDropdown, setShowDestDropdown] = useState<boolean>(false);
  
  const sourceRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);
  const sourceInputRef = useRef<HTMLInputElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();
  
  useEffect(() => {
    // Add click outside handlers to close dropdowns
    const handleClickOutside = (event: MouseEvent) => {
      if (sourceRef.current && !sourceRef.current.contains(event.target as Node)) {
        setShowSourceDropdown(false);
      }
      if (destRef.current && !destRef.current.contains(event.target as Node)) {
        setShowDestDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const searchSourcePlaces = async (query: string) => {
    if (query.trim().length < 2) {
      setSourceSuggestions([]);
      setShowSourceDropdown(false);
      return;
    }
    
    setIsSearchingSource(true);
    try {
      const results = await searchPlaces(query);
      setSourceSuggestions(results);
      setShowSourceDropdown(true);
    } catch (error) {
      console.error('Error searching places:', error);
      toast({
        title: 'Error',
        description: 'Failed to search for places. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSearchingSource(false);
    }
  };
  
  const searchDestPlaces = async (query: string) => {
    if (query.trim().length < 2) {
      setDestSuggestions([]);
      setShowDestDropdown(false);
      return;
    }
    
    setIsSearchingDest(true);
    try {
      const results = await searchPlaces(query);
      setDestSuggestions(results);
      setShowDestDropdown(true);
    } catch (error) {
      console.error('Error searching places:', error);
      toast({
        title: 'Error',
        description: 'Failed to search for places. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSearchingDest(false);
    }
  };
  
  const handleSourceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSource(value);
    searchSourcePlaces(value);
  };
  
  const handleDestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDestination(value);
    searchDestPlaces(value);
  };
  
  const handleSourceSelect = (suggestion: Suggestion) => {
    setSource(suggestion.displayName);
    onSelectSource([suggestion.lon, suggestion.lat]);
    setShowSourceDropdown(false);
  };
  
  const handleDestSelect = (suggestion: Suggestion) => {
    setDestination(suggestion.displayName);
    onSelectDestination([suggestion.lon, suggestion.lat]);
    setShowDestDropdown(false);
  };
  
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Not supported',
        description: 'Geolocation is not supported by your browser',
        variant: 'destructive'
      });
      return;
    }
    
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Reverse geocode to get address
          const results = await searchPlaces(`${latitude},${longitude}`, true);
          if (results.length > 0) {
            setSource(results[0].displayName);
            onSelectSource([longitude, latitude]);
          } else {
            setSource(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            onSelectSource([longitude, latitude]);
          }
        } catch (error) {
          console.error('Error reverse geocoding:', error);
          setSource(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          onSelectSource([longitude, latitude]);
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        setIsLoading(false);
        let message = 'Failed to get your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location permission denied';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }
        toast({
          title: 'Geolocation error',
          description: message,
          variant: 'destructive'
        });
      }
    );
  };
  
  const handleSwapLocations = () => {
    // Swap text values
    const tempText = source;
    setSource(destination);
    setDestination(tempText);
    
    // Swap coordinates if both exist
    const tempCoords = onSelectSource;
    if (sourceInputRef.current?.dataset.coordinates && destInputRef.current?.dataset.coordinates) {
      const sourceCoords = JSON.parse(sourceInputRef.current.dataset.coordinates) as Coordinate;
      const destCoords = JSON.parse(destInputRef.current.dataset.coordinates) as Coordinate;
      
      onSelectSource(destCoords);
      onSelectDestination(sourceCoords);
    } else {
      // Reset coordinates if we don't have both
      onSelectSource(null);
      onSelectDestination(null);
    }
  };

  return (
    <div className="space-y-4 mb-5">
      {/* Source Location Input */}
      <div ref={sourceRef} className="relative">
        <Label htmlFor="source" className="block text-sm font-medium text-gray-700 mb-1">
          Start Location
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
          </div>
          <Input
            ref={sourceInputRef}
            id="source"
            type="text"
            placeholder="Enter starting point"
            className="pl-10"
            value={source}
            onChange={handleSourceChange}
            onFocus={() => {
              if (source.trim().length >= 2) {
                setShowSourceDropdown(true);
              }
            }}
          />
          {isSearchingSource && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>
        
        {/* Source Suggestions Dropdown */}
        {showSourceDropdown && sourceSuggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md overflow-hidden border border-gray-200">
            <ul className="max-h-60 overflow-auto py-1">
              {sourceSuggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  onClick={() => handleSourceSelect(suggestion)}
                >
                  {suggestion.displayName}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Destination Location Input */}
      <div ref={destRef} className="relative">
        <Label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
          Destination
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
          </div>
          <Input
            ref={destInputRef}
            id="destination"
            type="text"
            placeholder="Enter destination"
            className="pl-10"
            value={destination}
            onChange={handleDestChange}
            onFocus={() => {
              if (destination.trim().length >= 2) {
                setShowDestDropdown(true);
              }
            }}
          />
          {isSearchingDest && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          )}
        </div>
        
        {/* Destination Suggestions Dropdown */}
        {showDestDropdown && destSuggestions.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white shadow-lg rounded-md overflow-hidden border border-gray-200">
            <ul className="max-h-60 overflow-auto py-1">
              {destSuggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  onClick={() => handleDestSelect(suggestion)}
                >
                  {suggestion.displayName}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Helper Buttons */}
      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleUseCurrentLocation}
        >
          <MapPin className="mr-2 h-4 w-4" />
          Use Current Location
        </Button>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={handleSwapLocations}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          Swap
        </Button>
      </div>
    </div>
  );
};

export default LocationInput;
