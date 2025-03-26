import { apiRequest } from '@/lib/queryClient';
import { Coordinate, Route, TransportMode } from '@shared/schema';

/**
 * Fetches alternative routes from source to destination using OSRM
 */
export async function getAlternativeRoutes(
  source: Coordinate,
  destination: Coordinate,
  transportMode: TransportMode = 'driving'
): Promise<Route[]> {
  try {
    const response = await apiRequest(
      'POST',
      '/api/routes',
      {
        source,
        destination,
        transportMode
      }
    );
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching routes:', error);
    throw error;
  }
}

/**
 * Gets the ETA (Estimated Time of Arrival) for a route
 */
export function calculateETA(durationInSeconds: number): string {
  const now = new Date();
  const arrival = new Date(now.getTime() + durationInSeconds * 1000);
  
  const hours = arrival.getHours();
  const minutes = arrival.getMinutes();
  
  // Format as 12-hour time (e.g. 2:45 PM)
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12; // Convert to 12-hour format
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  
  return `${formattedHours}:${formattedMinutes} ${ampm}`;
}
