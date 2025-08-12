// hooks/usePhotographerDetail.ts - EMERGENCY FIX VERSION
import { useState, useCallback, useMemo } from 'react';
import { Photographer } from '../types';
import { photographerService } from '../services/photographerService';
import { Review } from '../types';
import { usePhotographerImages } from './useImages';

// Extend the existing Photographer interface to include additional fields from API response
export interface PhotographerDetail extends Photographer {
  reviews?: Review[];
}

export const usePhotographerDetail = () => {
  const [photographerId, setPhotographerId] = useState<number>(0);
  const [photographerDetail, setPhotographerDetail] = useState<PhotographerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ EMERGENCY FIX: Wrap usePhotographerImages with try-catch protection
  let imagesHookResult;
  try {
    imagesHookResult = usePhotographerImages(photographerId > 0 ? photographerId : 0);
  } catch (error) {
    console.error('❌ usePhotographerImages hook error:', error);
    // Fallback to safe default values
    imagesHookResult = {
      images: [],
      imageUrls: [],
      primaryImage: null,
      primaryImageUrl: null,
      loading: false,
      error: 'Failed to load images',
      fetchImages: () => Promise.resolve([]),
      refresh: () => Promise.resolve([]),
      createImage: () => Promise.resolve(null),
      updateImage: () => Promise.resolve(null),
      deleteImage: () => Promise.resolve(false),
      setPrimaryImage: () => Promise.resolve(false),
      uploadMultiple: () => Promise.resolve([])
    };
  }

  const {
    images: imageResponses = [], // ✅ DEFAULT FALLBACK
    imageUrls: images = [], // ✅ DEFAULT FALLBACK
    primaryImage = null,
    primaryImageUrl = null,
    loading: loadingImages = false,
    error: imageError = null,
    fetchImages,
    refresh: refreshImages,
    createImage,
    updateImage,
    deleteImage,
    setPrimaryImage,
    uploadMultiple
  } = imagesHookResult;

  // ✅ TRIPLE SAFETY: Force arrays to be arrays
  const ultraSafeImages = useMemo(() => {
    try {
      if (Array.isArray(images)) return images;
      if (images && typeof images === 'object' && '$values' in images) {
        return Array.isArray((images as any).$values) ? (images as any).$values : [];
      }
      return [];
    } catch (error) {
      console.error('❌ Error processing images:', error);
      return [];
    }
  }, [images]);

  const ultraSafeImageResponses = useMemo(() => {
    try {
      if (Array.isArray(imageResponses)) return imageResponses;
      if (imageResponses && typeof imageResponses === 'object' && '$values' in imageResponses) {
        return Array.isArray((imageResponses as any).$values) ? (imageResponses as any).$values : [];
      }
      return [];
    } catch (error) {
      console.error('❌ Error processing imageResponses:', error);
      return [];
    }
  }, [imageResponses]);

  const fetchPhotographerById = useCallback(async (photographerIdParam: string | number) => {
    setLoading(true);
    setError(null);
    
    try {
      // Handle both string and number input
      const id = typeof photographerIdParam === 'string' 
        ? parseInt(photographerIdParam) 
        : photographerIdParam;

      // Validate ID before proceeding
      if (!id || isNaN(id) || id <= 0) {
        throw new Error('Invalid photographer ID');
      }

      console.log('🔍 Fetching photographer by ID:', id);
      
      // Set photographer ID first - this will trigger the images hook
      setPhotographerId(id);
      
      // Fetch photographer by ID
      const photographerData = await photographerService.getById(id);
      console.log('✅ Photographer data received:', photographerData);

      if (!photographerData) {
        throw new Error('Photographer not found');
      }

      // Initialize the detail object with photographer data
      let photographerWithExtras: PhotographerDetail = {
        ...photographerData,
        reviews: []
      };

      console.log('📋 Photographer detail prepared:', {
        id: photographerWithExtras.photographerId,
        name: photographerWithExtras.fullName,
        hasProfileImage: !!photographerWithExtras.profileImage,
        hasEquipment: !!photographerWithExtras.equipment,
        hasSpecialty: !!photographerWithExtras.specialty,
        availabilityStatus: photographerWithExtras.availabilityStatus
      });

      setPhotographerDetail(photographerWithExtras);

      // ✅ IMPORTANT: Images will be fetched by the hook, but we handle errors gracefully
      console.log('🖼️ Images hook will attempt to fetch images for photographer:', id);
      console.log('🖼️ If no primary image found (404), that\'s OK - using fallback empty arrays');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('❌ Error fetching photographer by ID:', err);
      setPhotographerId(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearPhotographerDetail = useCallback(() => {
    console.log('🧹 Clearing photographer detail');
    setPhotographerDetail(null);
    setPhotographerId(0);
    setError(null);
  }, []);

  // ✅ Enhanced debug info
  const debugInfo = useMemo(() => {
    const info = {
      photographerId,
      hasPhotographerDetail: !!photographerDetail,
      rawImagesType: typeof images,
      rawImageResponsesType: typeof imageResponses,
      ultraSafeImagesLength: ultraSafeImages.length,
      ultraSafeImageResponsesLength: ultraSafeImageResponses.length,
      loadingPhotographer: loading,
      loadingImages,
      photographerError: error,
      imageError,
      primaryImageUrl,
      hasPrimaryImage: !!primaryImage,
      // ✅ CRITICAL: Log actual values for debugging
      rawImages: images,
      rawImageResponses: imageResponses,
      isImagesArray: Array.isArray(images),
      isImageResponsesArray: Array.isArray(imageResponses)
    };
    
    console.log('🔍 usePhotographerDetail debug (EMERGENCY FIX):', info);
    return info;
  }, [
    photographerId,
    photographerDetail,
    images,
    imageResponses,
    ultraSafeImages.length,
    ultraSafeImageResponses.length,
    loading,
    loadingImages,
    error,
    imageError,
    primaryImageUrl,
    primaryImage
  ]);

  // ✅ ULTRA SAFE: Return guaranteed arrays
  const returnValue = useMemo(() => ({
    // Photographer data
    photographerDetail,
    loading,
    error,
    fetchPhotographerById,
    clearPhotographerDetail,
    
    // ✅ ULTRA SAFE: Guaranteed arrays, never undefined
    images: ultraSafeImages, // string[] - GUARANTEED array
    imageResponses: ultraSafeImageResponses, // ImageResponse[] - GUARANTEED array
    primaryImage, // ImageResponse | null
    primaryImageUrl, // string | null
    loadingImages,
    imageError,
    
    // Images methods with error protection
    createImage: createImage || (() => Promise.resolve(null)),
    updateImage: updateImage || (() => Promise.resolve(null)),
    deleteImage: deleteImage || (() => Promise.resolve(false)),
    setPrimaryImage: setPrimaryImage || (() => Promise.resolve(false)),
    uploadMultiple: uploadMultiple || (() => Promise.resolve([])),

    // Debug info
    debugInfo,
  }), [
    photographerDetail,
    loading,
    error,
    fetchPhotographerById,
    clearPhotographerDetail,
    ultraSafeImages,
    ultraSafeImageResponses,
    primaryImage,
    primaryImageUrl,
    loadingImages,
    imageError,
    createImage,
    updateImage,
    deleteImage,
    setPrimaryImage,
    uploadMultiple,
    debugInfo,
  ]);

  return returnValue;
};