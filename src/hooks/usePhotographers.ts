// hooks/usePhotographers.ts - Fixed version để tránh infinite render và syntax errors
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
  // Original states
  const [photographers, setPhotographers] = useState<PhotographerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Separate states cho từng loại photographer
  const [nearbyPhotographers, setNearbyPhotographers] = useState<PhotographerData[]>([]);
  const [popularPhotographers, setPopularPhotographers] = useState<PhotographerData[]>([]);
  const [userStylePhotographers, setUserStylePhotographers] = useState<PhotographerData[]>([]);
  
  // Loading states
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [popularLoading, setPopularLoading] = useState(false);
  const [userStyleLoading, setUserStyleLoading] = useState(false);
  
  // Error states
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [popularError, setPopularError] = useState<string | null>(null);
  const [userStyleError, setUserStyleError] = useState<string | null>(null);

  // Transform photographer data - stable function
  const transformPhotographerData = useCallback((photographerApiData: any): PhotographerData => {
    console.log('=== Transforming photographer data ===');
    console.log('Raw photographer data:', JSON.stringify(photographerApiData, null, 2));

    const photographerId = photographerApiData.photographerId || photographerApiData.id;
    const userId = photographerApiData.userId;
    
    if (!photographerId) {
      console.warn('❌ No photographer ID found');
      throw new Error('No photographer ID found');
    }
    
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
      console.log('📝 Styles from styles array:', styles);
    } else if (photographerApiData.photographerStyles && Array.isArray(photographerApiData.photographerStyles)) {
      styles = photographerApiData.photographerStyles.map((ps: any) => 
        ps.style?.name || ps.styleName || 'Photography'
      );
      console.log('📝 Styles from photographerStyles:', styles);
    } else if (equipment) {
      styles = [equipment];
      console.log('📝 Styles from equipment:', styles);
    } else {
      styles = ['Professional Photography'];
      console.log('📝 Default styles:', styles);
    }

    // 🚀 BETTER AVATAR LOGIC: Always provide a fallback
    const avatar = profileImage && profileImage !== null && profileImage.trim() !== '' 
                   ? profileImage
                   : '';
                   
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

    console.log('✅ Transformed photographer data:', JSON.stringify(result, null, 2));
    return result;
  }, []);

  // Helper function to create fallback photographer data
  const createFallbackPhotographer = useCallback((photographer: any): PhotographerData => {
    const photographerId = photographer.photographerId || photographer.id;
    const fallbackAvatar = photographer.profileImage;
    
    return {
      id: photographerId.toString(),
      fullName: photographer.fullName || 'Unknown Photographer',
      avatar: fallbackAvatar || '',
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
    console.log('🔍 Processing API response:', apiResponse);
    
    // Check for nested data structure
    if (apiResponse && apiResponse.data && Array.isArray(apiResponse.data)) {
      console.log('✅ Found data array with length:', apiResponse.data.length);
      return apiResponse.data;
    }
    
    if (Array.isArray(apiResponse)) {
      console.log('✅ Direct array with length:', apiResponse.length);
      return apiResponse;
    }
    
    if (apiResponse && Array.isArray(apiResponse.$values)) {
      console.log('✅ Found $values array with length:', apiResponse.$values.length);
      return apiResponse.$values;
    }
    
    if (apiResponse && typeof apiResponse === 'object') {
      console.log('⚠️ Single object, wrapping in array');
      return [apiResponse];
    }
    
    console.warn('❌ Unexpected API response format:', apiResponse);
    return [];
  }, []);

  // STABLE fetch functions - NO DEPENDENCIES to prevent re-render
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
  }, []); // Empty dependency array

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
  }, []); // Empty dependency array

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
  }, []); // Empty dependency array

  // NEW: Fetch nearby photographers - STABLE
  const fetchNearbyPhotographers = useCallback(async (
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ) => {
    if (nearbyLoading) return;
    
    try {
      setNearbyLoading(true);
      setNearbyError(null);
      console.log('=== Fetching Nearby Photographers ===');
      console.log(`Location: ${latitude}, ${longitude}, Radius: ${radiusKm}km`);
      
      const photographersResponse = await photographerService.getNearby(latitude, longitude, radiusKm);
      const photographersArray = processApiResponse(photographersResponse);
      console.log('Nearby photographers data received:', photographersArray.length);
      
      const transformedData: PhotographerData[] = [];
      for (const photographer of photographersArray) {
        if (photographer && (photographer.photographerId !== undefined || photographer.id !== undefined)) {
          try {
            const transformed = transformPhotographerData(photographer);
            transformedData.push(transformed);
          } catch (error) {
            console.error('Error transforming nearby photographer:', photographer.photographerId, error);
            transformedData.push(createFallbackPhotographer(photographer));
          }
        }
      }
      
      console.log('Final transformed nearby photographers:', transformedData);
      setNearbyPhotographers(transformedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch nearby photographers';
      setNearbyError(errorMessage);
      console.error('Error fetching nearby photographers:', err);
      setNearbyPhotographers([]);
    } finally {
      setNearbyLoading(false);
    }
  }, []); // Empty dependency array

  // NEW: Fetch popular photographers - STABLE  
  const fetchPopularPhotographers = useCallback(async (
    latitude?: number,
    longitude?: number,
    page: number = 1,
    pageSize: number = 10
  ) => {
    if (popularLoading) return;
    
    try {
      setPopularLoading(true);
      setPopularError(null);
      console.log('=== Fetching Popular Photographers ===');
      console.log(`Page: ${page}, PageSize: ${pageSize}`);
      if (latitude && longitude) {
        console.log(`Location: ${latitude}, ${longitude}`);
      }
      
      const photographersResponse = await photographerService.getPopular(latitude, longitude, page, pageSize);
      const photographersArray = processApiResponse(photographersResponse);
      console.log('Popular photographers data received:', photographersArray.length);
      
      const transformedData: PhotographerData[] = [];
      for (const photographer of photographersArray) {
        if (photographer && (photographer.photographerId !== undefined || photographer.id !== undefined)) {
          try {
            const transformed = transformPhotographerData(photographer);
            transformedData.push(transformed);
          } catch (error) {
            console.error('Error transforming popular photographer:', photographer.photographerId, error);
            transformedData.push(createFallbackPhotographer(photographer));
          }
        }
      }
      
      console.log('Final transformed popular photographers:', transformedData);
      setPopularPhotographers(transformedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch popular photographers';
      setPopularError(errorMessage);
      console.error('Error fetching popular photographers:', err);
      setPopularPhotographers([]);
    } finally {
      setPopularLoading(false);
    }
  }, []); // Empty dependency array

  // NEW: Fetch photographers by user styles - STABLE
  const fetchPhotographersByUserStyles = useCallback(async (
    latitude?: number,
    longitude?: number
  ) => {
    if (userStyleLoading) return;
    
    try {
      setUserStyleLoading(true);
      setUserStyleError(null);
      console.log('=== Fetching Photographers by User Styles ===');
      if (latitude && longitude) {
        console.log(`Location: ${latitude}, ${longitude}`);
      }
      
      const photographersResponse = await photographerService.getByUserStyles(latitude, longitude);
      const photographersArray = processApiResponse(photographersResponse);
      console.log('User style photographers data received:', photographersArray.length);
      
      const transformedData: PhotographerData[] = [];
      for (const photographer of photographersArray) {
        if (photographer && (photographer.photographerId !== undefined || photographer.id !== undefined)) {
          try {
            const transformed = transformPhotographerData(photographer);
            transformedData.push(transformed);
          } catch (error) {
            console.error('Error transforming user style photographer:', photographer.photographerId, error);
            transformedData.push(createFallbackPhotographer(photographer));
          }
        }
      }
      
      console.log('Final transformed user style photographers:', transformedData);
      setUserStylePhotographers(transformedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch photographers by user styles';
      setUserStyleError(errorMessage);
      console.error('Error fetching photographers by user styles:', err);
      setUserStylePhotographers([]);
    } finally {
      setUserStyleLoading(false);
    }
  }, []); // Empty dependency array

  // Get photographer by ID
  const getPhotographerById = useCallback(async (id: number): Promise<PhotographerData | null> => {
    try {
      const photographerData = await photographerService.getById(id);
      return transformPhotographerData(photographerData);
    } catch (err) {
      console.error('Error fetching photographer by id:', err);
      return null;
    }
  }, [transformPhotographerData]);

  const getPhotographerDetail = useCallback(async (id: number): Promise<PhotographerData | null> => {
    try {
      const photographerData = await photographerService.getById(id);
      return transformPhotographerData(photographerData);
    } catch (err) {
      console.error('Error fetching photographer detail:', err);
      return null;
    }
  }, [transformPhotographerData]);

  // STABLE refresh functions - NO DEPENDENCIES
  const refreshPhotographers = useCallback(() => {
    fetchAllPhotographers();
  }, []);

  const refreshNearbyPhotographers = useCallback((
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ) => {
    fetchNearbyPhotographers(latitude, longitude, radiusKm);
  }, []);

  const refreshPopularPhotographers = useCallback((
    latitude?: number,
    longitude?: number,
    page: number = 1,
    pageSize: number = 10
  ) => {
    fetchPopularPhotographers(latitude, longitude, page, pageSize);
  }, []);

  const refreshUserStylePhotographers = useCallback((
    latitude?: number,
    longitude?: number
  ) => {
    fetchPhotographersByUserStyles(latitude, longitude);
  }, []);

  return {
    // Original data
    photographers,
    profiles: photographers, // For backward compatibility
    loading,
    error,
    
    // NEW: Nearby photographers
    nearbyPhotographers,
    nearbyLoading,
    nearbyError,
    fetchNearbyPhotographers,
    refreshNearbyPhotographers,
    
    // NEW: Popular photographers
    popularPhotographers,
    popularLoading,
    popularError,
    fetchPopularPhotographers,
    refreshPopularPhotographers,
    
    // NEW: User style photographers
    userStylePhotographers,
    userStyleLoading,
    userStyleError,
    fetchPhotographersByUserStyles,
    refreshUserStylePhotographers,
    
    // Original functions
    refreshPhotographers,
    fetchAllPhotographers,
    fetchFeaturedPhotographers,
    fetchAvailablePhotographers,
    getPhotographerById,
    getPhotographerDetail,
  };
};

// For backward compatibility
export const useProfiles = usePhotographers;