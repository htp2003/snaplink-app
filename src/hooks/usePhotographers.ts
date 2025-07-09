// hooks/usePhotographers.ts
import { useState, useEffect } from 'react';
import type { Photographer } from '../types/photographer';
import type { PhotographerImage } from '../types/photographerImage';
import { photographerService } from '../services/photographerService';

// Transform API data to match your current component props
export interface PhotographerData {
  id: string;
  fullName: string;
  avatar: string; // Avatar thật từ User profile (profileImage)
  cardImage: string | null; // Ảnh đầu tiên từ PhotographerImage, null nếu không có
  images: string[]; // Tất cả images từ PhotographerImage
  styles: string[];
  rating?: number;
  hourlyRate?: number;
  availabilityStatus?: string;
  specialty?: string;
  portfolioUrl?: string;
  yearsExperience?: number;
  primaryImage?: PhotographerImage;
}

export const usePhotographers = () => {
  const [photographers, setPhotographers] = useState<PhotographerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const transformPhotographerData = async (photographer: Photographer): Promise<PhotographerData> => {
    // Handle styles from API response
    let styles: string[] = [];
    if (Array.isArray(photographer.styles)) {
      styles = photographer.styles;
    } else if (typeof photographer.specialty === 'string') {
      styles = photographer.specialty.split(',').map((s: string) => s.trim());
    } else {
      styles = ['Photography'];
    }

    // Get avatar from User profile
    const avatar = photographer.profileImage || 
                   'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&auto=format&fit=crop&q=80';
    
    // Initialize cardImage as null - only set if PhotographerImage exists
    let cardImage: string | null = null;
    let images: string[] = [];
    let primaryImage: PhotographerImage | undefined;

    try {
      // Get all images from PhotographerImage API
      const photographerImages = await photographerService.getImages(photographer.photographerId);
      
      // Process images array
      let imageArray: PhotographerImage[] = [];
      if (Array.isArray(photographerImages)) {
        imageArray = photographerImages;
      } else if (photographerImages && Array.isArray((photographerImages as any).$values)) {
        imageArray = (photographerImages as any).$values;
      }

      // Extract image URLs
      images = imageArray.map(img => img.imageUrl);

      // Find primary image
      primaryImage = imageArray.find(img => img.isPrimary);

      // Set cardImage ONLY if there are images from PhotographerImage
      if (images.length > 0) {
        cardImage = images[0]; // Ảnh đầu tiên từ PhotographerImage
      }

    } catch (error) {
      console.error('Error fetching images for photographer:', photographer.photographerId, error);
      // cardImage remains null if no images
    }

    return {
      id: photographer.photographerId.toString(),
      fullName: photographer.fullName || 'Unknown Photographer',
      avatar, // profileImage từ User (luôn có giá trị)
      cardImage, // Ảnh đầu tiên từ PhotographerImage hoặc null
      images,
      styles,
      rating: photographer.rating,
      hourlyRate: photographer.hourlyRate,
      availabilityStatus: photographer.availabilityStatus || 'available',
      specialty: photographer.specialty,
      portfolioUrl: photographer.portfolioUrl,
      yearsExperience: photographer.yearsExperience,
      primaryImage,
    };
  };

  const fetchAllPhotographers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await photographerService.getAll();
      
      let arr: any[] = [];
      if (Array.isArray(data)) {
        arr = data;
      } else if (data && Array.isArray((data as any).$values)) {
        arr = (data as any).$values;
      } else {
        arr = [];
      }
      
      // Transform data with images - process sequentially to avoid overwhelming API
      const transformedData: PhotographerData[] = [];
      for (const photographer of arr) {
        if (photographer && (photographer.photographerId !== undefined || photographer.id !== undefined)) {
          try {
            const transformed = await transformPhotographerData(photographer);
            transformedData.push(transformed);
          } catch (error) {
            console.error('Error transforming photographer:', photographer.photographerId, error);
            // Add photographer without images if transformation fails
            const fallbackAvatar = photographer.profileImage || 
                                   'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&auto=format&fit=crop&q=80';
            transformedData.push({
              id: photographer.photographerId.toString(),
              fullName: photographer.fullName || 'Unknown Photographer',
              avatar: fallbackAvatar,
              cardImage: null, // Không có PhotographerImage
              images: [],
              styles: photographer.specialty ? [photographer.specialty] : ['Photography'],
              rating: photographer.rating,
              hourlyRate: photographer.hourlyRate,
              availabilityStatus: photographer.availabilityStatus || 'available',
              specialty: photographer.specialty,
              portfolioUrl: photographer.portfolioUrl,
              yearsExperience: photographer.yearsExperience,
            });
          }
        }
      }
      
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
      
      let arr: any[] = [];
      if (Array.isArray(data)) {
        arr = data;
      } else if (data && Array.isArray((data as any).$values)) {
        arr = (data as any).$values;
      } else {
        arr = [];
      }
      
      // Transform data with images
      const transformedData: PhotographerData[] = [];
      for (const photographer of arr) {
        if (photographer && (photographer.photographerId !== undefined || photographer.id !== undefined)) {
          try {
            const transformed = await transformPhotographerData(photographer);
            transformedData.push(transformed);
          } catch (error) {
            console.error('Error transforming featured photographer:', photographer.photographerId, error);
          }
        }
      }
      
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
      
      // Transform data with images
      const transformedData: PhotographerData[] = [];
      for (const photographer of arr) {
        if (photographer && (photographer.photographerId !== undefined || photographer.id !== undefined)) {
          try {
            const transformed = await transformPhotographerData(photographer);
            transformedData.push(transformed);
          } catch (error) {
            console.error('Error transforming available photographer:', photographer.photographerId, error);
          }
        }
      }
      
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
      
      // Transform data with images
      const transformedData: PhotographerData[] = [];
      for (const photographer of arr) {
        if (photographer && (photographer.photographerId !== undefined || photographer.id !== undefined)) {
          try {
            const transformed = await transformPhotographerData(photographer);
            transformedData.push(transformed);
          } catch (error) {
            console.error('Error transforming photographer by specialty:', photographer.photographerId, error);
          }
        }
      }
      
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
      return await transformPhotographerData(data);
    } catch (err) {
      console.error('Error fetching photographer by id:', err);
      return null;
    }
  };

  // Method để lấy photographer với images từ API PhotographerImage
  const getPhotographerWithImages = async (id: number): Promise<PhotographerData | null> => {
    try {
      const photographer = await photographerService.getById(id);
      return await transformPhotographerData(photographer);
    } catch (err) {
      console.error('Error fetching photographer with images:', err);
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
    getPhotographerWithImages,
  };
};

// For backward compatibility
export const useProfiles = usePhotographers;