import { useState, useCallback } from 'react';
import { apiClient } from '../services/base';

export interface NearbyLocationData {
    id: string;
  source: 'internal' | 'external';
  locationId?: number;
  externalId?: string;
  class?: string;
  type?: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  distanceInKm: number;
  // Internal location fields
  images?: string[];
  hourlyRate?: number;
  capacity?: number;
  availabilityStatus?: string;
  styles?: string[];
  // External location fields (from Google)
  rating?: number;
  place_id?: string;
}

interface UseNearbyLocationsReturn {
  nearbyLocations: NearbyLocationData[];
  loading: boolean;
  error: string | null;
  searchNearbyLocations: (params: {
    address?: string;
    latitude?: number;
    longitude?: number;
    radiusInKm?: number;
    tags?: string;
    limit?: number;
  }) => Promise<void>;
  clearNearbyLocations: () => void;
}

export const useNearbyLocations = (): UseNearbyLocationsReturn => {
  const [nearbyLocations, setNearbyLocations] = useState<NearbyLocationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchNearbyLocations = useCallback(async (params: {
    address?: string;
    latitude?: number;
    longitude?: number;
    radiusInKm?: number;
    tags?: string;
    limit?: number;
  }) => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Searching nearby locations with params:', params);

      // Prepare request body theo format API bạn đã định
      const requestBody = {
        address: params.address || '',
        radiusInKm: params.radiusInKm || 5,
        tags: params.tags || 'cafe, studio, coffee',
        limit: params.limit || 10,
      };

      console.log('📤 Request body:', requestBody);

      // Call SnapLink API
      const response = await apiClient.post<any>('/api/Location/nearby/combined', requestBody);
      
      console.log('📥 Raw API response:', response);

      // Process API response - có thể là array hoặc object với $values
      let locationsArray: any[] = [];
      if (Array.isArray(response)) {
        locationsArray = response;
      } else if (response && Array.isArray(response.$values)) {
        locationsArray = response.$values;
      } else if (response && Array.isArray(response.results)) {
        locationsArray = response.results;
      } else if (response && response.data && Array.isArray(response.data)) {
        locationsArray = response.data;
      } else if (response) {
        // Single object response
        locationsArray = [response];
      }

      console.log(`📋 Processing ${locationsArray.length} locations from API`);

      // Transform data to match our interface
      const transformedLocations: NearbyLocationData[] = locationsArray
        .filter(item => item && item.name) // Filter valid items
        .map((item: any) => {
          const isInternal = item.source === 'internal';
          
          return {
            id: isInternal && item.locationId 
            ? item.locationId.toString() 
            : item.externalId || `external-${item.latitude}-${item.longitude}`,
            source: item.source || 'external',
            locationId: item.locationId,
            externalId: item.externalId,
            class: item.class,
            type: item.type,
            name: item.name || 'Unknown Location',
            address: item.address,
            latitude: item.latitude || 0,
            longitude: item.longitude || 0,
            distanceInKm: item.distanceInKm || 0,
            // Internal fields (chỉ có khi source = 'internal')
            images: isInternal ? (item.images || []) : undefined,
            hourlyRate: isInternal ? item.hourlyRate : undefined,
            capacity: isInternal ? item.capacity : undefined,
            availabilityStatus: isInternal ? item.availabilityStatus : undefined,
            styles: isInternal ? item.styles : undefined,
            // External fields (từ Google Places)
            rating: !isInternal ? item.rating : undefined,
            place_id: !isInternal ? item.place_id : undefined
          };
        });

      setNearbyLocations(transformedLocations);
      console.log(`✅ Successfully processed ${transformedLocations.length} nearby locations`);

    } catch (err: any) {
      console.error('❌ Error searching nearby locations:', err);
      const errorMessage = err?.response?.data?.message || 
                          err?.message || 
                          'Failed to search nearby locations';
      setError(errorMessage);
      setNearbyLocations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearNearbyLocations = useCallback(() => {
    setNearbyLocations([]);
    setError(null);
  }, []);

  return {
    nearbyLocations,
    loading,
    error,
    searchNearbyLocations,
    clearNearbyLocations
  };
};
