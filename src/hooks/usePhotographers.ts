// hooks/usePhotographers.ts
import { useState, useEffect } from 'react';

import type { Photographer } from '../types';
import { photographerService } from '../services/photographerService';

// Transform API data to match your current component props
export interface PhotographerData {
  id: string;
  fullName: string;
  avatar: string;
  images: string[];
  styles: string[];
  rating?: number;
  hourlyRate?: number;
  availabilityStatus?: string;
  specialty?: string;
  portfolioUrl?: string;
}

export const usePhotographers = () => {
  const [photographers, setPhotographers] = useState<PhotographerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const transformPhotographerData = (photographer: Photographer): PhotographerData => {
    // Handle styles from API response
    let styles: string[] = [];
    if (photographer.styles && Array.isArray((photographer.styles as any).$values)) {
      styles = (photographer.styles as any).$values;
    } else if (Array.isArray(photographer.styles)) {
      styles = photographer.styles as string[];
    } else if (typeof photographer.specialty === 'string') {
      styles = photographer.specialty.split(',').map((s: string) => s.trim());
    } else {
      styles = ['Photography'];
    }

    return {
      id: photographer.photographerId.toString(),
      fullName: photographer.fullName || 'Unknown Photographer',
      avatar: photographer.profileImage || 'https://via.placeholder.com/150',
      images: photographer.profileImage ? [photographer.profileImage] : [
        'https://via.placeholder.com/300x300?text=Portfolio+1',
        'https://via.placeholder.com/300x300?text=Portfolio+2',
        'https://via.placeholder.com/300x300?text=Portfolio+3',
        'https://via.placeholder.com/300x300?text=Portfolio+4',
      ],
      styles,
      rating: photographer.rating,
      hourlyRate: photographer.hourlyRate,
      availabilityStatus: photographer.availabilityStatus || 'available',
      specialty: photographer.specialty,
      portfolioUrl: photographer.profileImage,
    };
  };

  const fetchAllPhotographers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await photographerService.getAll();
      console.log('Photographer API raw data:', data);
      
      let arr: any[] = [];
      if (Array.isArray(data)) {
        arr = data;
      } else if (data && Array.isArray((data as any).$values)) {
        arr = (data as any).$values;
      } else {
        arr = [];
      }
      
      const transformedData = arr
        .filter(p => p && (p.photographerId !== undefined || p.id !== undefined))
        .map(transformPhotographerData);
      
      setPhotographers(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch photographers');
      console.error('Error fetching photographers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedPhotographers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await photographerService.getFeatured();
      console.log('Featured photographers raw data:', data);
      
      let arr: any[] = [];
      if (Array.isArray(data)) {
        arr = data;
      } else if (data && Array.isArray((data as any).$values)) {
        arr = (data as any).$values;
      } else {
        arr = [];
      }
      
      const transformedData = arr
        .filter(p => p && (p.photographerId !== undefined || p.id !== undefined))
        .map(transformPhotographerData);
      
      setPhotographers(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch featured photographers');
      console.error('Error fetching featured photographers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailablePhotographers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await photographerService.getAvailable();
      
      let arr: any[] = [];
      if (Array.isArray(data)) {
        arr = data;
      } else if (data && Array.isArray((data as any).$values)) {
        arr = (data as any).$values;
      } else {
        arr = [];
      }
      
      const transformedData = arr
        .filter(p => p && (p.photographerId !== undefined || p.id !== undefined))
        .map(transformPhotographerData);
      
      setPhotographers(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch available photographers');
      console.error('Error fetching available photographers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotographersBySpecialty = async (specialty: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await photographerService.getBySpecialty(specialty);
      
      let arr: any[] = [];
      if (Array.isArray(data)) {
        arr = data;
      } else if (data && Array.isArray((data as any).$values)) {
        arr = (data as any).$values;
      } else {
        arr = [];
      }
      
      const transformedData = arr
        .filter(p => p && (p.photographerId !== undefined || p.id !== undefined))
        .map(transformPhotographerData);
      
      setPhotographers(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch photographers by specialty');
      console.error('Error fetching photographers by specialty:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPhotographerById = async (id: number): Promise<PhotographerData | null> => {
    try {
      const data = await photographerService.getById(id);
      return transformPhotographerData(data);
    } catch (err) {
      console.error('Error fetching photographer by id:', err);
      return null;
    }
  };

  const refreshPhotographers = () => {
    fetchAllPhotographers();
  };

  useEffect(() => {
    fetchAllPhotographers();
  }, []);

  return {
    photographers,
    profiles: photographers, // For backward compatibility
    loading,
    error,
    refreshPhotographers,
    fetchAllPhotographers,
    fetchFeaturedPhotographers,
    fetchAvailablePhotographers,
    fetchPhotographersBySpecialty,
    getPhotographerById,
  };
};

// For backward compatibility
export const useProfiles = usePhotographers;