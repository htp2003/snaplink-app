import { useState, useCallback } from 'react';
import { locationService } from '../services/locationService';
import { LocationApiResponse } from '../types/location';

export const useLocationDetail = () => {
  const [locationDetail, setLocationDetail] = useState<LocationApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocationById = useCallback(async (locationId: string | number) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Fetching location detail for ID:', locationId);
      
      // Fetch location details
      const location = await locationService.getById(Number(locationId));
      console.log('Location data received:', location);

      setLocationDetail(location);
      console.log('Location detail set successfully:', location);
      
    } catch (err) {
      console.error('Error fetching location detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch location details');
      setLocationDetail(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshLocationDetail = useCallback(() => {
    if (locationDetail?.locationId) {
      fetchLocationById(locationDetail.locationId);
    }
  }, [locationDetail?.locationId, fetchLocationById]);

  const clearLocationDetail = () => {
    setLocationDetail(null);
    setError(null);
  };

  return {
    locationDetail,
    loading,
    error,
    fetchLocationById,
    refreshLocationDetail,
    clearLocationDetail,
  };
};