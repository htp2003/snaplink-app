// hooks/useLocationDetail.ts
import { useState } from 'react';
import { locationService } from '../services/locationService';
import type { Location } from '../types';


export interface LocationDetail extends Location {
  locationOwner?: {
    locationOwnerId: number;
    userId: number;
    businessName?: string;
    businessAddress?: string;
    businessRegistrationNumber?: string;
    verificationStatus?: string;
    user?: {
      id: number;
      fullName: string;
      email?: string;
      phoneNumber?: string;
    };
  };
  locationImages?: {
    $id: string;
    $values: Array<{
      id: number;
      imageUrl: string;
      description?: string;
    }>;
  };
  advertisements?: any[];
}

export const useLocationDetail = () => {
  const [locationDetail, setLocationDetail] = useState<LocationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocationById = async (locationId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const id = parseInt(locationId);
      
      console.log('Fetching location by ID:', id);
      const locationData = await locationService.getById(id);
      console.log('Location data received:', locationData);

      setLocationDetail(locationData as LocationDetail);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching location by ID:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearLocationDetail = () => {
    setLocationDetail(null);
    setError(null);
  };

  return {
    locationDetail,
    loading,
    error,
    fetchLocationById,
    clearLocationDetail,
  };
};