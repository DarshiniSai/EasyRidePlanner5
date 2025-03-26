import React, { useState, useEffect, useRef } from 'react';
import { MapPin, X, Navigation, Search, Loader2 } from 'lucide-react';
import { searchPlaces } from '../utils/geocodingService';
import { Coordinate } from '@shared/schema';

interface LocationInputProps {
  source: string;
  destination: string;
  setSource: (source: string) => void;
  setDestination: (destination: string) => void;
  onSelectSource: (coords: Coordinate) => void;
  onSelectDestination: (coords: Coordinate) => void;
  setIsLoading: (isLoading: boolean) => void;
}

interface SearchResult {
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
  const [sourceResults, setSourceResults] = useState<SearchResult[]>([]);
  const [destResults, setDestResults] = useState<SearchResult[]>([]);
  const [isSearchingSource, setIsSearchingSource] = useState(false);
  const [isSearchingDest, setIsSearchingDest] = useState(false);
  const [showSourceResults, setShowSourceResults] = useState(false);
  const [showDestResults, setShowDestResults] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  
  const sourceRef = useRef<HTMLInputElement>(null);
  const destRef = useRef<HTMLInputElement>(null);
  const sourceResultsRef = useRef<HTMLDivElement>(null);
  const destResultsRef = useRef<HTMLDivElement>(null);
  
  // Handle source search
  useEffect(() => {
    const delayFn = setTimeout(() => {
      if (source.trim().length >= 3) {
        setIsSearchingSource(true);
        searchPlaces(source)
          .then((results) => {
            setSourceResults(results);
            setShowSourceResults(true);
          })
          .catch((error) => {
            console.error('Error searching places:', error);
          })
          .finally(() => {
            setIsSearchingSource(false);
          });
      } else {
        setSourceResults([]);
        setShowSourceResults(false);
      }
    }, 500);
    
    return () => clearTimeout(delayFn);
  }, [source]);
  
  // Handle destination search
  useEffect(() => {
    const delayFn = setTimeout(() => {
      if (destination.trim().length >= 3) {
        setIsSearchingDest(true);
        searchPlaces(destination)
          .then((results) => {
            setDestResults(results);
            setShowDestResults(true);
          })
          .catch((error) => {
            console.error('Error searching places:', error);
          })
          .finally(() => {
            setIsSearchingDest(false);
          });
      } else {
        setDestResults([]);
        setShowDestResults(false);
      }
    }, 500);
    
    return () => clearTimeout(delayFn);
  }, [destination]);
  
  // Handle clicks outside search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sourceResultsRef.current && !sourceResultsRef.current.contains(event.target as Node) && 
          sourceRef.current && !sourceRef.current.contains(event.target as Node)) {
        setShowSourceResults(false);
      }
      
      if (destResultsRef.current && !destResultsRef.current.contains(event.target as Node) && 
          destRef.current && !destRef.current.contains(event.target as Node)) {
        setShowDestResults(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleSelectSource = (result: SearchResult) => {
    setSource(result.name);
    onSelectSource({ lat: result.lat, lng: result.lon });
    setShowSourceResults(false);
  };
  
  const handleSelectDestination = (result: SearchResult) => {
    setDestination(result.name);
    onSelectDestination({ lat: result.lat, lng: result.lon });
    setShowDestResults(false);
  };
  
  const handleUseCurrentLocation = () => {
    setGeoError(null);
    setIsLoading(true);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode to get the address name
          searchPlaces(`${latitude},${longitude}`, true)
            .then((results) => {
              if (results.length > 0) {
                setSource(results[0].name);
                onSelectSource({ lat: latitude, lng: longitude });
              } else {
                setSource(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                onSelectSource({ lat: latitude, lng: longitude });
              }
            })
            .catch((error) => {
              console.error('Error in reverse geocoding:', error);
              setSource(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
              onSelectSource({ lat: latitude, lng: longitude });
            })
            .finally(() => {
              setIsLoading(false);
            });
        },
        (error) => {
          console.error('Geolocation error:', error);
          setGeoError('Could not get your location. Please check permissions.');
          setIsLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setGeoError('Geolocation is not supported by your browser.');
      setIsLoading(false);
    }
  };
  
  const clearSource = () => {
    setSource('');
    onSelectSource(null as any);
    sourceRef.current?.focus();
  };
  
  const clearDestination = () => {
    setDestination('');
    onSelectDestination(null as any);
    destRef.current?.focus();
  };
  
  return (
    <div>
      {/* Source input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Start Location</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="h-5 w-5 text-green-500">
              <MapPin className="h-5 w-5" />
            </div>
          </div>
          <input
            ref={sourceRef}
            type="text"
            className="block w-full pl-10 pr-10 py-2.5 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Enter start location"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            onFocus={() => source.trim().length >= 3 && setShowSourceResults(true)}
          />
          {source && (
            <button 
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={clearSource}
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        
        {/* Source search results */}
        {showSourceResults && (
          <div 
            ref={sourceResultsRef}
            className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md overflow-hidden max-h-60 overflow-y-auto"
          >
            {isSearchingSource ? (
              <div className="p-3 flex items-center justify-center">
                <Loader2 className="animate-spin h-5 w-5 mr-2 text-blue-500" />
                <span>Searching...</span>
              </div>
            ) : sourceResults.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {sourceResults.map((result, index) => (
                  <li 
                    key={index}
                    className="p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSelectSource(result)}
                  >
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">{result.name}</div>
                        <div className="text-xs text-gray-500">{result.displayName}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-3 text-center text-gray-500">No results found</div>
            )}
          </div>
        )}
        
        <div className="text-xs mt-1">
          <button 
            className="text-blue-600 hover:text-blue-700 flex items-center"
            onClick={handleUseCurrentLocation}
          >
            <Navigation className="h-3.5 w-3.5 mr-1" />
            Use current location
          </button>
          {geoError && (
            <p className="text-red-500 mt-1">{geoError}</p>
          )}
        </div>
      </div>
      
      {/* Destination input */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="h-5 w-5 text-red-500">
              <MapPin className="h-5 w-5" />
            </div>
          </div>
          <input
            ref={destRef}
            type="text"
            className="block w-full pl-10 pr-10 py-2.5 rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Enter destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            onFocus={() => destination.trim().length >= 3 && setShowDestResults(true)}
          />
          {destination && (
            <button 
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={clearDestination}
            >
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>
        
        {/* Destination search results */}
        {showDestResults && (
          <div 
            ref={destResultsRef}
            className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md overflow-hidden max-h-60 overflow-y-auto"
          >
            {isSearchingDest ? (
              <div className="p-3 flex items-center justify-center">
                <Loader2 className="animate-spin h-5 w-5 mr-2 text-blue-500" />
                <span>Searching...</span>
              </div>
            ) : destResults.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {destResults.map((result, index) => (
                  <li 
                    key={index}
                    className="p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleSelectDestination(result)}
                  >
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium">{result.name}</div>
                        <div className="text-xs text-gray-500">{result.displayName}</div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-3 text-center text-gray-500">No results found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationInput;
