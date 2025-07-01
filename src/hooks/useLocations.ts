// hooks/useLocations.ts
import { useState, useEffect } from 'react';
import { locationService } from '../services/locationService';
import type { Location } from '../types';

// Transform API data to match component props
export interface LocationData {
  id: string;
  locationId: number;
  name: string;
  avatar: string;
  images: string[];
  styles: string[];
  address?: string;
  description?: string;
  amenities?: string;
  hourlyRate?: number;
  capacity?: number;
  indoor?: boolean;
  outdoor?: boolean;
  availabilityStatus?: string;
  featuredStatus?: boolean;
  verificationStatus?: string;
}

export const useLocations = () => {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const transformLocationData = (location: any): LocationData => {
    // Extract amenities as styles
    let styles: string[] = [];
    if (location.amenities) {
      styles = location.amenities.split(',').map((s: string) => s.trim());
    } else {
      styles = location.indoor && location.outdoor ? ['Indoor', 'Outdoor'] :
              location.indoor ? ['Indoor'] :
              location.outdoor ? ['Outdoor'] : ['Studio'];
    }

    return {
      id: location.locationId.toString(),
      locationId: location.locationId,
      name: location.name || 'Unknown Location',
      avatar: 'https://via.placeholder.com/150', // Default avatar since API doesn't provide
      images: location.locationImages?.$values?.length > 0 
        ? location.locationImages.$values.map((img: any) => img.imageUrl || img.url)
        : [
          'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300', // Studio
          'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=300', // Office
          'https://images.unsplash.com/photo-1540518614846-7eded47c9eb8?w=300', // Workspace
          'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=300', // Meeting room
        ],
      styles,
      address: location.address,
      description: location.description,
      amenities: location.amenities,
      hourlyRate: location.hourlyRate,
      capacity: location.capacity,
      indoor: location.indoor,
      outdoor: location.outdoor,
      availabilityStatus: location.availabilityStatus || 'available',
      featuredStatus: location.featuredStatus,
      verificationStatus: location.verificationStatus,
    };
  };

  const fetchAllLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await locationService.getAll();
      console.log('Location API raw data:', data);
      
      let arr: any[] = [];
      if (Array.isArray(data)) {
        arr = data;
      } if (data && typeof data === 'object' && Array.isArray((data as any).$values)) {
        arr = (data as any).$values;
      } else {
        arr = [];
      }
      
      const transformedData = arr
        .filter(location => location && location.locationId !== undefined)
        .map(transformLocationData);
      
      setLocations(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch locations');
      console.error('Error fetching locations:', err);
    } finally {
      setLoading(false);
    }
  };

  const getLocationById = async (id: number): Promise<LocationData | null> => {
    try {
      const data = await locationService.getById(id);
      return transformLocationData(data);
    } catch (err) {
      console.error('Error fetching location by id:', err);
      return null;
    }
  };

  const refreshLocations = () => {
    fetchAllLocations();
  };

  useEffect(() => {
    fetchAllLocations();
  }, []);

  return {
    locations,
    loading,
    error,
    refreshLocations,
    fetchAllLocations,
    getLocationById,
  };
};