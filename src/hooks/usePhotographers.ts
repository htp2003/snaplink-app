// hooks/usePhotographers.ts - Complete Rewrite với API recommend chuẩn
import { useState, useCallback } from 'react';
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
  // 🎯 Separate states cho từng loại photographer
  const [nearbyPhotographers, setNearbyPhotographers] = useState<PhotographerData[]>([]);
  const [recommendedPhotographers, setRecommendedPhotographers] = useState<PhotographerData[]>([]);
  const [popularPhotographers, setPopularPhotographers] = useState<PhotographerData[]>([]);
  const [userStylePhotographers, setUserStylePhotographers] = useState<PhotographerData[]>([]);
  const [photographers, setPhotographers] = useState<PhotographerData[]>([]);
  
  // Loading states
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [recommendedLoading, setRecommendedLoading] = useState(false);
  const [popularLoading, setPopularLoading] = useState(false);
  const [userStyleLoading, setUserStyleLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Error states
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [recommendedError, setRecommendedError] = useState<string | null>(null);
  const [popularError, setPopularError] = useState<string | null>(null);
  const [userStyleError, setUserStyleError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 🔧 Transform photographer data function
  const transformPhotographerData = useCallback((photographerApiData: any): PhotographerData => {
    console.log('=== Transforming photographer data ===');
    console.log('Raw photographer data:', JSON.stringify(photographerApiData, null, 2));

    const photographerId = photographerApiData.photographerId || photographerApiData.id;
    
    if (!photographerId) {
      console.warn('⚠️ No photographer ID found');
      throw new Error('No photographer ID found');
    }
    
    // Get user info
    const userInfo = photographerApiData.user || photographerApiData;
    const fullName = userInfo.fullName || photographerApiData.fullName || 'Unknown Photographer';
    
    // Get profile image from multiple sources
    const profileImage = photographerApiData.profileImage || 
                         userInfo.profileImage || 
                         photographerApiData.user?.profileImage ||
                         null;
    
    const rating = photographerApiData.rating;
    const hourlyRate = photographerApiData.hourlyRate;
    const availabilityStatus = photographerApiData.availabilityStatus || 'available';
    const yearsExperience = photographerApiData.yearsExperience;
    const equipment = photographerApiData.equipment;
    const verificationStatus = photographerApiData.verificationStatus;
    const portfolioUrl = photographerApiData.portfolioUrl;
    
    // Extract styles
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

  // 🔧 Create fallback photographer
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

  // 🔧 Process API response
  const processApiResponse = useCallback((apiResponse: any): any[] => {
    console.log('🔍 Processing API response:', apiResponse);
    
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

  // 🔧 Transform photographers array
  const transformPhotographersArray = useCallback((photographersArray: any[]): PhotographerData[] => {
    const transformedData: PhotographerData[] = [];
    
    for (const photographer of photographersArray) {
      if (photographer && (photographer.photographerId !== undefined || photographer.id !== undefined)) {
        try {
          const transformed = transformPhotographerData(photographer);
          transformedData.push(transformed);
        } catch (error) {
          console.error('Error transforming photographer:', photographer.photographerId || photographer.id, error);
          transformedData.push(createFallbackPhotographer(photographer));
        }
      } else {
        console.warn('Invalid photographer data:', photographer);
      }
    }
    
    return transformedData;
  }, [transformPhotographerData, createFallbackPhotographer]);

  // 🎯 MAIN: Fetch RECOMMENDED photographers cho màn hình chính (KHÔNG CẦN locationId)
  const fetchRecommendedPhotographers = useCallback(async (
    latitude?: number,   // 🔧 FIXED: Optional
    longitude?: number,  // 🔧 FIXED: Optional
    radiusKm: number = 50,
    maxResults: number = 20
  ) => {
    if (recommendedLoading) return;
    
    try {
      setRecommendedLoading(true);
      setRecommendedError(null);
      console.log('=== 🎯 Fetching RECOMMENDED Photographers for HOME SCREEN ===');
      console.log('📍 Parameters:', { 
        latitude: latitude ?? 'undefined', 
        longitude: longitude ?? 'undefined', 
        radiusKm, 
        maxResults,
        locationId: 'undefined (HOME SCREEN - no locationId needed)' 
      });
      
      // 🎯 Pass optional parameters to service
      const photographersResponse = await photographerService.getRecommended(
        latitude,   // can be undefined
        longitude,  // can be undefined
        undefined,  // locationId - always undefined for home screen
        radiusKm, 
        maxResults
      );
      
      console.log('🔍 RAW API Response:', JSON.stringify(photographersResponse, null, 2));
      
      const photographersArray = processApiResponse(photographersResponse);
      console.log('🔍 Processed Array length:', photographersArray.length);
      
      const transformedData = transformPhotographersArray(photographersArray);
      
      console.log('🎯 Final RECOMMENDED photographers:', transformedData.length);
      console.log('🎯 Final data preview:', transformedData.map(p => ({ id: p.id, name: p.fullName })));
      setRecommendedPhotographers(transformedData);
      
    } catch (err) {
      console.error('❌ Error fetching RECOMMENDED photographers:', err);
      setRecommendedError(err instanceof Error ? err.message : 'Failed to fetch recommended photographers');
      setRecommendedPhotographers([]);
    } finally {
      setRecommendedLoading(false);
    }
  }, [processApiResponse, transformPhotographersArray]);

  // 🔍 Fetch NEARBY photographers
  const fetchNearbyPhotographers = useCallback(async (
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ) => {
    if (nearbyLoading) return;
    
    try {
      setNearbyLoading(true);
      setNearbyError(null);
      console.log('=== 🔍 Fetching NEARBY Photographers ===');
      console.log(`📍 Location: ${latitude}, ${longitude}, Radius: ${radiusKm}km`);
      
      const photographersResponse = await photographerService.getNearby(latitude, longitude, radiusKm);
      const photographersArray = processApiResponse(photographersResponse);
      const transformedData = transformPhotographersArray(photographersArray);
      
      console.log('🔍 Final transformed NEARBY photographers:', transformedData.length);
      setNearbyPhotographers(transformedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch nearby photographers';
      setNearbyError(errorMessage);
      console.error('Error fetching nearby photographers:', err);
      setNearbyPhotographers([]);
    } finally {
      setNearbyLoading(false);
    }
  }, [processApiResponse, transformPhotographersArray]);

  // 🔥 Fetch POPULAR photographers
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
      console.log('=== 🔥 Fetching Popular Photographers ===');
      console.log(`📍 Page: ${page}, PageSize: ${pageSize}`);
      if (latitude && longitude) {
        console.log(`📍 Location: ${latitude}, ${longitude}`);
      }
      
      const photographersResponse = await photographerService.getPopular(latitude, longitude, page, pageSize);
      const photographersArray = processApiResponse(photographersResponse);
      const transformedData = transformPhotographersArray(photographersArray);
      
      console.log('🔥 Final transformed popular photographers:', transformedData.length);
      setPopularPhotographers(transformedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch popular photographers';
      setPopularError(errorMessage);
      console.error('Error fetching popular photographers:', err);
      setPopularPhotographers([]);
    } finally {
      setPopularLoading(false);
    }
  }, [processApiResponse, transformPhotographersArray]);

  // ✨ Fetch photographers by USER STYLES
  const fetchPhotographersByUserStyles = useCallback(async (
    latitude?: number,
    longitude?: number
  ) => {
    if (userStyleLoading) return;
    
    try {
      setUserStyleLoading(true);
      setUserStyleError(null);
      console.log('=== ✨ Fetching Photographers by User Styles ===');
      if (latitude && longitude) {
        console.log(`📍 Location: ${latitude}, ${longitude}`);
      }
      
      const photographersResponse = await photographerService.getByUserStyles(latitude, longitude);
      const photographersArray = processApiResponse(photographersResponse);
      const transformedData = transformPhotographersArray(photographersArray);
      
      console.log('✨ Final transformed user style photographers:', transformedData.length);
      setUserStylePhotographers(transformedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch photographers by user styles';
      setUserStyleError(errorMessage);
      console.error('Error fetching photographers by user styles:', err);
      setUserStylePhotographers([]);
    } finally {
      setUserStyleLoading(false);
    }
  }, [processApiResponse, transformPhotographersArray]);

  // 🔄 Fetch ALL photographers
  const fetchAllPhotographers = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('=== 📋 Fetching All Photographers ===');
      
      const photographersResponse = await photographerService.getAll();
      const photographersArray = processApiResponse(photographersResponse);
      const transformedData = transformPhotographersArray(photographersArray);
      
      console.log('📋 Final transformed photographers:', transformedData.length);
      setPhotographers(transformedData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch photographers';
      setError(errorMessage);
      console.error('Error fetching photographers:', err);
      setPhotographers([]);
    } finally {
      setLoading(false);
    }
  }, [processApiResponse, transformPhotographersArray]);

  // 🔄 Fetch FEATURED photographers
  const fetchFeaturedPhotographers = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('=== ⭐ Fetching Featured Photographers ===');
      
      const photographersResponse = await photographerService.getFeatured();
      const photographersArray = processApiResponse(photographersResponse);
      const transformedData = transformPhotographersArray(photographersArray);
      
      console.log('⭐ Final transformed featured photographers:', transformedData.length);
      setPhotographers(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch featured photographers');
      console.error('Error fetching featured photographers:', err);
      setPhotographers([]);
    } finally {
      setLoading(false);
    }
  }, [processApiResponse, transformPhotographersArray]);

  // 🔄 Fetch AVAILABLE photographers
  const fetchAvailablePhotographers = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      console.log('=== ✅ Fetching Available Photographers ===');
      
      const photographersResponse = await photographerService.getAvailable();
      const photographersArray = processApiResponse(photographersResponse);
      const transformedData = transformPhotographersArray(photographersArray);
      
      console.log('✅ Final transformed available photographers:', transformedData.length);
      setPhotographers(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch available photographers');
      console.error('Error fetching available photographers:', err);
      setPhotographers([]);
    } finally {
      setLoading(false);
    }
  }, [processApiResponse, transformPhotographersArray]);

  // 🔍 Get photographer by ID
  const getPhotographerById = useCallback(async (id: number): Promise<PhotographerData | null> => {
    try {
      const photographerData = await photographerService.getById(id);
      return transformPhotographerData(photographerData);
    } catch (err) {
      console.error('Error fetching photographer by id:', err);
      return null;
    }
  }, [transformPhotographerData]);

  // 🔍 Get photographer detail
  const getPhotographerDetail = useCallback(async (id: number): Promise<PhotographerData | null> => {
    try {
      const photographerData = await photographerService.getDetail(id);
      return transformPhotographerData(photographerData);
    } catch (err) {
      console.error('Error fetching photographer detail:', err);
      return null;
    }
  }, [transformPhotographerData]);

  // 🔄 REFRESH functions
  const refreshRecommendedPhotographers = useCallback((
    latitude: number,
    longitude: number,
    radiusKm: number = 50,
    maxResults: number = 20
  ) => {
    console.log('🔄 Refreshing RECOMMENDED photographers');
    fetchRecommendedPhotographers(latitude, longitude, radiusKm, maxResults);
  }, [fetchRecommendedPhotographers]);

  const refreshNearbyPhotographers = useCallback((
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ) => {
    console.log('🔄 Refreshing NEARBY photographers');
    fetchNearbyPhotographers(latitude, longitude, radiusKm);
  }, [fetchNearbyPhotographers]);

  const refreshPopularPhotographers = useCallback((
    latitude?: number,
    longitude?: number,
    page: number = 1,
    pageSize: number = 10
  ) => {
    console.log('🔄 Refreshing POPULAR photographers');
    fetchPopularPhotographers(latitude, longitude, page, pageSize);
  }, [fetchPopularPhotographers]);

  const refreshUserStylePhotographers = useCallback((
    latitude?: number,
    longitude?: number
  ) => {
    console.log('🔄 Refreshing USER-STYLE photographers');
    fetchPhotographersByUserStyles(latitude, longitude);
  }, [fetchPhotographersByUserStyles]);

  const refreshPhotographers = useCallback(() => {
    fetchAllPhotographers();
  }, [fetchAllPhotographers]);

  // 🔍 Debug log
  console.log('🔍 usePhotographers hook state:', {
    recommendedCount: recommendedPhotographers?.length || 0,
    nearbyCount: nearbyPhotographers?.length || 0,
    popularCount: popularPhotographers?.length || 0,
    userStyleCount: userStylePhotographers?.length || 0,
    recommendedLoading,
    nearbyLoading,
    popularLoading,
    userStyleLoading
  });

  return {
    // 🎯 Recommended photographers (API recommend cho màn hình chính)
    recommendedPhotographers,
    recommendedLoading,
    recommendedError,
    fetchRecommendedPhotographers,
    refreshRecommendedPhotographers,
    
    // 🔍 Nearby photographers
    nearbyPhotographers,
    nearbyLoading,
    nearbyError,
    fetchNearbyPhotographers,
    refreshNearbyPhotographers,
    
    // 🔥 Popular photographers
    popularPhotographers,
    popularLoading,
    popularError,
    fetchPopularPhotographers,
    refreshPopularPhotographers,
    
    // ✨ User style photographers
    userStylePhotographers,
    userStyleLoading,
    userStyleError,
    fetchPhotographersByUserStyles,
    refreshUserStylePhotographers,
    
    // 📋 Original data
    photographers,
    profiles: photographers, // For backward compatibility
    loading,
    error,
    
    // 🔄 Original functions
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