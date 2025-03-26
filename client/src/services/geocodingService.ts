import { apiRequest } from '@/lib/queryClient';

/**
 * Interface representing a geocoding search result
 */
interface SearchResult {
  name: string;
  displayName: string;
  lat: number;
  lon: number;
}

/**
 * Search for places using the geocoding API
 * @param query The search query
 * @param isReverse Whether this is a reverse geocoding query (coordinates to address)
 * @returns Promise resolving to an array of search results
 */
export async function searchPlaces(
  query: string,
  isReverse: boolean = false
): Promise<SearchResult[]> {
  try {
    const url = `/api/geocode?q=${encodeURIComponent(query)}&reverse=${isReverse}`;
    console.log('Fetching:', url);
    const response = await apiRequest('GET', url);
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers));
    const text = await response.text(); // Get raw text first
    console.log('Response Body:', text);
    const data = JSON.parse(text); // Parse manually
    return data;
  } catch (error) {
    console.error('Error searching places:', error);
    throw error;
  }
}
