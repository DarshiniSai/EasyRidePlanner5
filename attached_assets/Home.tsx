import React, { useState } from 'react';
import LocationInput from '@/components/LocationInput';
import Map from '@/components/Map';
import RouteInfo from '@/components/RouteInfo';
import { MapPin, Navigation } from 'lucide-react';
import { Route, Coordinate, TransportMode } from '@shared/schema';

const Home: React.FC = () => {
  const [source, setSource] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [sourceCoords, setSourceCoords] = useState<Coordinate | null>(null);
  const [destCoords, setDestCoords] = useState<Coordinate | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [transportMode, setTransportMode] = useState<TransportMode>('driving');

  const handleRouteSelect = (index: number) => {
    setSelectedRouteIndex(index);
    setRoutes(prevRoutes => 
      prevRoutes.map((route, i) => ({
        ...route,
        isSelected: i === index
      }))
    );
  };

  const handleRoutesLoaded = (newRoutes: Route[]) => {
    const routesWithSelection = newRoutes.map((route, index) => ({
      ...route,
      isSelected: index === 0
    }));
    setRoutes(routesWithSelection);
    setSelectedRouteIndex(0);
    setIsLoading(false);
  };

  const handleTransportModeChange = (mode: TransportMode) => {
    setTransportMode(mode);
    if (sourceCoords && destCoords) {
      setIsLoading(true);
      // The Map component will trigger a new route request with the updated transport mode
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center">
            <Navigation className="h-8 w-8 mr-2" />
            <h1 className="text-2xl font-bold">EasyRoutePlanner</h1>
          </div>
          <div>
            {/* Authentication buttons removed for demo */}
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-1/3 order-2 lg:order-1">
            <div className="bg-white p-5 rounded-lg shadow-md mb-4">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                Plan Your Route
              </h2>
              
              <LocationInput 
                source={source}
                destination={destination}
                setSource={setSource}
                setDestination={setDestination}
                onSelectSource={setSourceCoords}
                onSelectDestination={setDestCoords}
                setIsLoading={setIsLoading}
              />
              
              <div className="mb-5 mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Transportation Mode</label>
                <div className="flex flex-wrap gap-2">
                  <button 
                    className={`flex items-center px-3 py-2 rounded-md font-medium transition-colors ${
                      transportMode === 'driving' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => handleTransportModeChange('driving')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                    </svg>
                    Driving
                  </button>
                  <button 
                    className={`flex items-center px-3 py-2 rounded-md font-medium transition-colors ${
                      transportMode === 'transit' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => handleTransportModeChange('transit')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18v10a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-5 9 5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9h18" />
                      <circle cx="8" cy="16" r="2" />
                      <circle cx="16" cy="16" r="2" />
                    </svg>
                    Public Transit
                  </button>
                  <button 
                    className={`flex items-center px-3 py-2 rounded-md font-medium transition-colors ${
                      transportMode === 'walking' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => handleTransportModeChange('walking')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
                    </svg>
                    Walking
                  </button>
                  <button 
                    className={`flex items-center px-3 py-2 rounded-md font-medium transition-colors ${
                      transportMode === 'cycling' 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    onClick={() => handleTransportModeChange('cycling')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <circle cx="5.5" cy="17.5" r="3.5"/>
                      <circle cx="18.5" cy="17.5" r="3.5"/>
                      <path d="M15 6a1 1 0 100-2 1 1 0 000 2zm-3 11.5V14l-3-3 4-3 2 3h2"/>
                    </svg>
                    Cycling
                  </button>
                </div>
              </div>
              
              <button 
                className="w-full py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
                onClick={() => {
                  if (sourceCoords && destCoords) {
                    setIsLoading(true);
                  }
                }}
                disabled={!sourceCoords || !destCoords || isLoading}
              >
                Find Routes
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Save your routes feature coming soon!</p>
                </div>
              </div>
            </div>
            
            {routes.length > 0 && (
              <RouteInfo 
                routes={routes}
                selectedRouteIndex={selectedRouteIndex}
                onRouteSelect={handleRouteSelect}
                sourceName={source}
                destinationName={destination}
              />
            )}
          </div>
          
          <div className="w-full lg:w-2/3 order-1 lg:order-2">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <Map 
                source={sourceCoords} 
                destination={destCoords} 
                routes={routes}
                onRoutesLoaded={handleRoutesLoaded}
                onRouteSelect={handleRouteSelect}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                transportMode={transportMode}
              />
              
              {routes.length > 0 && routes[selectedRouteIndex].hasTraffic && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <h4 className="font-medium text-red-700">Traffic Alert</h4>
                    <p className="text-sm text-red-600">
                      {routes[selectedRouteIndex].severity === 'high' 
                        ? 'Heavy traffic detected on this route. Expect delays of up to ' + (routes[selectedRouteIndex].delay || 15) + ' minutes.'
                        : routes[selectedRouteIndex].severity === 'medium'
                          ? 'Moderate traffic conditions on this route. Consider alternative routes if in a hurry.'
                          : 'Minor traffic conditions detected. Route still flowing well.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-100 p-4 mt-8">
        <div className="container mx-auto text-center text-gray-600 text-sm">
          <p>© 2025 EasyRoutePlanner | Using OpenStreetMap and OSRM</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;
