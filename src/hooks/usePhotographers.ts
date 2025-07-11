// hooks/usePhotographers.ts - Simplified version - only use avatar from User API
import { useState, useEffect } from 'react';
import type { Photographer } from '../types/photographer';
import { photographerService } from '../services/photographerService';

// Simplified interface - only avatar from User API
export interface PhotographerData {
  id: string;
  fullName: string;
  avatar: string; // Avatar từ User profile (profileImage) only
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transform photographer data từ API response - simplified without images
  const transformPhotographerData = (photographerApiData: any): PhotographerData => {
    console.log('=== Transforming photographer data ===');
    console.log('Raw photographer data:', photographerApiData);

    // Extract photographer info từ API response
    const photographerId = photographerApiData.photographerId || photographerApiData.id;
    const userId = photographerApiData.userId;
    
    // User info (nested trong photographer response)
    const userInfo = photographerApiData.user || photographerApiData;
    const fullName = userInfo.fullName || photographerApiData.fullName || 'Unknown Photographer';
    const profileImage = userInfo.profileImage || photographerApiData.profileImage;
    
    // Photographer specific info
    const rating = photographerApiData.rating;
    const hourlyRate = photographerApiData.hourlyRate;
    const availabilityStatus = photographerApiData.availabilityStatus || 'available';
    const yearsExperience = photographerApiData.yearsExperience;
    const equipment = photographerApiData.equipment;
    const verificationStatus = photographerApiData.verificationStatus;
    const portfolioUrl = photographerApiData.portfolioUrl;
    
    // Handle styles - có thể từ nhiều nguồn khác nhau
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
      // Fallback: dùng equipment làm specialty
      styles = [equipment];
    } else {
      styles = ['Professional Photography'];
    }

    console.log('Extracted styles:', styles);

    // Get avatar từ User profile only - with fallback
    const avatar = profileImage || 
                   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&auto=format';

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

    console.log('Transformed photographer data:', result);
    return result;
  };

  // Helper function to create fallback photographer data
  const createFallbackPhotographer = (photographer: any): PhotographerData => {
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
  };

  // Process API response data
  const processApiResponse = (apiResponse: any): any[] => {
    console.log('Processing API response:', apiResponse);
    
    // Handle different response formats
    if (Array.isArray(apiResponse)) {
      return apiResponse;
    }
    
    // Handle .NET API response with $values
    if (apiResponse && Array.isArray(apiResponse.$values)) {
      return apiResponse.$values;
    }
    
    // Handle single object
    if (apiResponse && typeof apiResponse === 'object') {
      return [apiResponse];
    }
    
    console.warn('Unexpected API response format:', apiResponse);
    return [];
  };

  const fetchAllPhotographers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('=== Fetching All Photographers ===');
      
      // Fetch photographers data từ API - no images needed
      const photographersResponse = await photographerService.getAll();
      console.log('Raw photographers API response:', photographersResponse);
      
      const photographersArray = processApiResponse(photographersResponse);
      console.log('Processed photographers array:', photographersArray.length);

      if (photographersArray.length === 0) {
        console.warn('No photographers found in API response');
        setPhotographers([]);
        return;
      }
      
      // Transform data - simplified without images
      const transformedData: PhotographerData[] = [];
      for (const photographer of photographersArray) {
        if (photographer && (photographer.photographerId !== undefined || photographer.id !== undefined)) {
          try {
            const transformed = transformPhotographerData(photographer);
            transformedData.push(transformed);
          } catch (transformError) {
            console.error('Error transforming photographer:', photographer.photographerId || photographer.id, transformError);
            // Thêm fallback data thay vì bỏ qua
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
      
      // Set empty array instead of keeping loading state
      setPhotographers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeaturedPhotographers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('=== Fetching Featured Photographers ===');
      
      const photographersResponse = await photographerService.getFeatured();
      const photographersArray = processApiResponse(photographersResponse);
      console.log('Featured photographers data received:', photographersArray.length);
      
      // Transform data - simplified without images
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
  };

  const fetchAvailablePhotographers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('=== Fetching Available Photographers ===');
      
      const photographersResponse = await photographerService.getAvailable();
      const photographersArray = processApiResponse(photographersResponse);
      console.log('Available photographers data received:', photographersArray.length);
      
      // Transform data - simplified without images
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
  };

  const fetchPhotographersBySpecialty = async (specialty: string) => {
    try {
      setLoading(true);
      setError(null);
      console.log('=== Fetching Photographers by Specialty ===');
      
      const photographersResponse = await photographerService.getBySpecialty(specialty);
      const photographersArray = processApiResponse(photographersResponse);
      console.log('Photographers by specialty data received:', photographersArray.length);
      
      // Transform data - simplified without images
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
  };

  // Lấy photographer theo ID (chuẩn hóa, chỉ dùng 1 hàm)
  const getPhotographerById = async (id: number): Promise<PhotographerData | null> => {
    try {
      const photographerData = await photographerService.getPhotographerProfile(id);
      return transformPhotographerData(photographerData);
    } catch (err) {
      console.error('Error fetching photographer by id:', err);
      return null;
    }
  };

  // Nếu muốn giữ hàm getPhotographerDetail riêng, cũng dùng chung getPhotographerProfile
  const getPhotographerDetail = async (id: number): Promise<PhotographerData | null> => {
    try {
      const photographerData = await photographerService.getPhotographerProfile(id);
      return transformPhotographerData(photographerData);
    } catch (err) {
      console.error('Error fetching photographer detail:', err);
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
    getPhotographerDetail,
  };
};

// For backward compatibility
export const useProfiles = usePhotographers;