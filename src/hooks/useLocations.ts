// hooks/useLocations.ts
import { useState, useEffect } from 'react';
import { locationService } from '../services/locationService';
import type { Location, LocationImage } from '../types';

// Transform API data to match component props
export interface LocationData {
  id: string;
  locationId: number;
  name: string;
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
    console.log('Transforming location data:', location);
    
    // Extract amenities as styles
    let styles: string[] = [];
    if (location.amenities) {
      styles = location.amenities.split(',').map((s: string) => s.trim());
    } else {
      styles = location.indoor && location.outdoor ? ['Indoor', 'Outdoor'] :
              location.indoor ? ['Indoor'] :
              location.outdoor ? ['Outdoor'] : ['Studio'];
    }

    // Handle images - check both possible structures
    let images: string[] = [];
    
    if (Array.isArray(location.locationImages)) {
      // API returns array directly
      images = location.locationImages
        .filter((img: LocationImage) => img && (img.imageUrl || img.url))
        .map((img: LocationImage) => img.imageUrl || img.url || '');
    } else if (location.locationImages && typeof location.locationImages === 'object' && '$values' in location.locationImages) {
      // API returns with $values wrapper
      const imageArray = (location.locationImages as any).$values;
      if (Array.isArray(imageArray)) {
        images = imageArray
          .filter((img: LocationImage) => img && (img.imageUrl || img.url))
          .map((img: LocationImage) => img.imageUrl || img.url || '');
      }
    }
    
    // Use default images if no images available
    if (images.length === 0) {
      images = [
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300', // Avatar
        'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=300', // Grid 1
        'https://images.unsplash.com/photo-1540518614846-7eded47c9eb8?w=300', // Grid 2
        'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=300', // Grid 3
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300', // Grid 4
      ];
    }

    // Ensure we have at least 5 images (1 for avatar + 4 for grid)
    // If we have fewer than 5, duplicate some images to fill the gaps
    while (images.length < 5) {
      images.push(...images.slice(0, 5 - images.length));
    }

    const transformedData: LocationData = {
      id: location.locationId.toString(),
      locationId: location.locationId,
      name: location.name || 'Unknown Location',
      images,
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

    console.log('Transformed location data:', transformedData);
    return transformedData;
  };

  const fetchAllLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching all locations...');
      const data = await locationService.getAll();
      console.log('Location API raw data:', data);
      
      let arr: any[] = [];
      
      // Handle different response structures
      if (Array.isArray(data)) {
        arr = data;
      } else if (data && typeof data === 'object' && Array.isArray((data as any).$values)) {
        arr = (data as any).$values;
      } else if (data && typeof data === 'object') {
        // Single object response
        arr = [data];
      } else {
        console.warn('Unexpected data structure:', data);
        arr = [];
      }
      
      console.log('Processed array:', arr);
      
      const transformedData = arr
        .filter(location => {
          const isValid = location && location.locationId !== undefined;
          if (!isValid) {
            console.warn('Invalid location data:', location);
          }
          return isValid;
        })
        .map(transformLocationData);
      
      console.log('Final transformed data:', transformedData);
      setLocations(transformedData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch locations';
      console.error('Error fetching locations:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getLocationById = async (id: number): Promise<LocationData | null> => {
    try {
      console.log('Fetching location by ID:', id);
      const data = await locationService.getById(id);
      console.log('Location by ID raw data:', data);
      
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