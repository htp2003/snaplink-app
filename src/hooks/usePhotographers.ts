// hooks/usePhotographers.ts - Fixed version để tránh infinite render
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Photographer } from '../types/photographer';
import { photographerService } from '../services/photographerService';

export interface PhotographerData {
  id: string;
  fullName: string;
  avatar: string;
  styles: string[];
  rating?: number;
  hourlyRate?: number;
  availabilityStatus?: string;
  specialty?: string;
  portfolioUrl?: string;
  yearsExperience?: number;
  equipment?: string;
  verificationStatus?: string;
}

export const usePhotographers = () => {
  const [photographers, setPhotographers] = useState<PhotographerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref để track nếu đã fetch rồi
  const hasFetched = useRef(false);

  // Transform photographer data - stable function
  const transformPhotographerData = useCallback((photographerApiData: any): PhotographerData => {
    console.log('=== Transforming photographer data ===');
    console.log('Raw photographer data:', photographerApiData);

    const photographerId = photographerApiData.photographerId || photographerApiData.id;
    const userId = photographerApiData.userId;
    
    // 🔧 FIX: API response structure analysis
    const userInfo = photographerApiData.user || photographerApiData;
    const fullName = userInfo.fullName || photographerApiData.fullName || 'Unknown Photographer';
    
    // 🔧 FIX: Check actual API response structure for profileImage
    console.log('🔍 Profile image sources:');
    console.log('  - photographerApiData.profileImage:', photographerApiData.profileImage);
    console.log('  - userInfo.profileImage:', userInfo.profileImage);
    console.log('  - photographerApiData.user?.profileImage:', photographerApiData.user?.profileImage);
    
    // Try multiple sources for profile image
    const profileImage = photographerApiData.profileImage || 
                         userInfo.profileImage || 
                         photographerApiData.user?.profileImage ||
                         null;
    
    console.log('🖼️ Final profileImage value:', profileImage);
    
    const rating = photographerApiData.rating;
    const hourlyRate = photographerApiData.hourlyRate;
    const availabilityStatus = photographerApiData.availabilityStatus || 'available';
    const yearsExperience = photographerApiData.yearsExperience;
    const equipment = photographerApiData.equipment;
    const verificationStatus = photographerApiData.verificationStatus;
    const portfolioUrl = photographerApiData.portfolioUrl;
    
    let styles: string[] = [];
    if (photographerApiData.styles && Array.isArray(photographerApiData.styles)) {
      styles = photographerApiData.styles.map((style: any) => 
        typeof style === 'string' ? style : style.name || style.styleName || 'Photography'
      );
    } else if (photographerApiData.photographerStyles && Array.isArray(photographerApiData.photographerStyles)) {
      styles = photographerApiData.photographerStyles.map((ps: any) => 
        ps.style?.name || ps.styleName || 'Photography'
      );
    } else if (equipment) {
      styles = [equipment];
    } else {
      styles = ['Professional Photography'];
    }

    // 🚀 BETTER AVATAR LOGIC: Always provide a fallback
    const avatar = profileImage && profileImage !== null && profileImage.trim() !== '' 
                   ? profileImage 
                   : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&auto=format';

    console.log('🎨 Final avatar assigned:', avatar);

    const result: PhotographerData = {
      id: photographerId.toString(),
      fullName,
      avatar,
      styles,
      rating,
      hourlyRate,
      availabilityStatus,
      specialty: styles[0] || 'Professional Photographer',
      portfolioUrl,
      yearsExperience,
      equipment,
      verificationStatus,
    };

    console.log('✅ Transformed photographer data:', result);
    return result;
  }, []);

  // Helper function to create fallback photographer data
  const createFallbackPhotographer = useCallback((photographer: any): PhotographerData => {
    const photographerId = photographer.photographerId || photographer.id;
    const fallbackAvatar = photographer.profileImage || 
                           'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&auto=format';
    
    return {
      id: photographerId.toString(),
      fullName: photographer.fullName || 'Unknown Photographer',
      avatar: fallbackAvatar,
      styles: ['Professional Photography'],
      rating: photographer.rating,
      hourlyRate: photographer.hourlyRate,
      availabilityStatus: photographer.availabilityStatus || 'available',
      specialty: 'Professional Photography',
      portfolioUrl: photographer.portfolioUrl,
      yearsExperience: photographer.yearsExperience,
      equipment: photographer.equipment,
      verificationStatus: photographer.verificationStatus,
    };
  }, []);

  // Process API response data
  const processApiResponse = useCallback((apiResponse: any): any[] => {
    console.log('Processing API response:', apiResponse);
    
    if (Array.isArray(apiResponse)) {
      return apiResponse;
    }
    
    if (apiResponse && Array.isArray(apiResponse.$values)) {
      return apiResponse.$values;
    }
    
    if (apiResponse && typeof apiResponse === 'object') {
      return [apiResponse];
    }
    
    console.warn('Unexpected API response format:', apiResponse);
    return [];
  }, []);

  // STABLE fetch functions với useCallback
  const fetchAllPhotographers = useCallback(async () => {
    if (loading) return; // Prevent concurrent calls
    
    try {
      setLoading(true);
      setError(null);
      console.log('=== Fetching All Photographers ===');
      
      const photographersResponse = await photographerService.getAll();
      console.log('Raw photographers API response:', photographersResponse);
      
      const photographersArray = processApiResponse(photographersResponse);
      console.log('Processed photographers array:', photographersArray.length);

      if (photographersArray.length === 0) {
        console.warn('No photographers found in API response');
        setPhotographers([]);
        return;
      }
      
      const transformedData: PhotographerData[] = [];
      for (const photographer of photographersArray) {
        if (photographer && (photographer.photographerId !== undefined || photographer.id !== undefined)) {
          try {
            const transformed = transformPhotographerData(photographer);
            transformedData.push(transformed);
          } catch (transformError) {
            console.error('Error transforming photographer:', photographer.photographerId || photographer.id, transformError);
            transformedData.push(createFallbackPhotographer(photographer));
          }
        } else {
          console.warn('Invalid photographer data:', photographer);
        }
      }
      
      console.log('Final transformed photographers:', transformedData.length);
      setPhotographers(transformedData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch photographers';
      setError(errorMessage);
      console.error('Error fetching photographers:', err);
      setPhotographers([]);
    } finally {
      setLoading(false);
    }
  }, [loading, processApiResponse, transformPhotographerData, createFallbackPhotographer]);

  const fetchFeaturedPhotographers = useCallback(async () => {
    if (loading) return; // Prevent concurrent calls
    
    try {
      setLoading(true);
      setError(null);
      console.log('=== Fetching Featured Photographers ===');
      
      const photographersResponse = await photographerService.getFeatured();
      const photographersArray = processApiResponse(photographersResponse);
      console.log('Featured photographers data received:', photographersArray.length);
      
      if (photographersArray.length === 0) {
        console.warn('No featured photographers found');
        setPhotographers([]);
        return;
      }
      
      const transformedData: PhotographerData[] = [];
      for (const photographer of photographersArray) {
        if (photographer && (photographer.photographerId !== undefined || photographer.id !== undefined)) {
          try {
            const transformed = transformPhotographerData(photographer);
            transformedData.push(transformed);
          } catch (error) {
            console.error('Error transforming featured photographer:', photographer.photographerId, error);
            transformedData.push(createFallbackPhotographer(photographer));
          }
        }
      }
      
      console.log('Final transformed featured photographers:', transformedData);
      setPhotographers(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch featured photographers');
      console.error('Error fetching featured photographers:', err);
      setPhotographers([]);
    } finally {
      setLoading(false);
    }
  }, [loading, processApiResponse, transformPhotographerData, createFallbackPhotographer]);

  const fetchAvailablePhotographers = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('=== Fetching Available Photographers ===');
      
      const photographersResponse = await photographerService.getAvailable();
      const photographersArray = processApiResponse(photographersResponse);
      console.log('Available photographers data received:', photographersArray.length);
      
      const transformedData: PhotographerData[] = [];
      for (const photographer of photographersArray) {
        if (photographer && (photographer.photographerId !== undefined || photographer.id !== undefined)) {
          try {
            const transformed = transformPhotographerData(photographer);
            transformedData.push(transformed);
          } catch (error) {
            console.error('Error transforming available photographer:', photographer.photographerId, error);
            transformedData.push(createFallbackPhotographer(photographer));
          }
        }
      }
      
      console.log('Final transformed available photographers:', transformedData);
      setPhotographers(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch available photographers');
      console.error('Error fetching available photographers:', err);
      setPhotographers([]);
    } finally {
      setLoading(false);
    }
  }, [loading, processApiResponse, transformPhotographerData, createFallbackPhotographer]);

  const fetchPhotographersBySpecialty = useCallback(async (specialty: string) => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('=== Fetching Photographers by Specialty ===');
      
      const photographersResponse = await photographerService.getBySpecialty(specialty);
      const photographersArray = processApiResponse(photographersResponse);
      console.log('Photographers by specialty data received:', photographersArray.length);
      
      const transformedData: PhotographerData[] = [];
      for (const photographer of photographersArray) {
        if (photographer && (photographer.photographerId !== undefined || photographer.id !== undefined)) {
          try {
            const transformed = transformPhotographerData(photographer);
            transformedData.push(transformed);
          } catch (error) {
            console.error('Error transforming photographer by specialty:', photographer.photographerId, error);
            transformedData.push(createFallbackPhotographer(photographer));
          }
        }
      }
      
      console.log('Final transformed photographers by specialty:', transformedData);
      setPhotographers(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch photographers by specialty');
      console.error('Error fetching photographers by specialty:', err);
      setPhotographers([]);
    } finally {
      setLoading(false);
    }
  }, [loading, processApiResponse, transformPhotographerData, createFallbackPhotographer]);

  // Get photographer by ID
  const getPhotographerById = useCallback(async (id: number): Promise<PhotographerData | null> => {
    try {
      const photographerData = await photographerService.getPhotographerProfile(id);
      return transformPhotographerData(photographerData);
    } catch (err) {
      console.error('Error fetching photographer by id:', err);
      return null;
    }
  }, [transformPhotographerData]);

  const getPhotographerDetail = useCallback(async (id: number): Promise<PhotographerData | null> => {
    try {
      const photographerData = await photographerService.getPhotographerProfile(id);
      return transformPhotographerData(photographerData);
    } catch (err) {
      console.error('Error fetching photographer detail:', err);
      return null;
    }
  }, [transformPhotographerData]);

  const refreshPhotographers = useCallback(() => {
    fetchAllPhotographers();
  }, [fetchAllPhotographers]);

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
    getPhotographerDetail,
  };
};

// For backward compatibility
export const useProfiles = usePhotographers;