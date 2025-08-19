// hooks/usePhotographerDetail.ts - ENHANCED ERROR HANDLING VERSION
import { useState, useCallback, useMemo } from 'react';
import { Photographer } from '../types';
import { photographerService } from '../services/photographerService';
import { Review } from '../types';
import { usePhotographerImages } from './useImages';

// Extend the existing Photographer interface to include additional fields from API response
export interface PhotographerDetail extends Photographer {
  reviews?: Review[];
}

// 🆕 Error classification types
type ErrorType = 'network' | 'not_found' | 'image_not_found' | 'server' | 'unknown';

interface ErrorInfo {
  type: ErrorType;
  message: string;
  shouldShowAlert: boolean;
  originalError?: any;
}

export const usePhotographerDetail = () => {
  const [photographerId, setPhotographerId] = useState<number>(0);
  const [photographerDetail, setPhotographerDetail] = useState<PhotographerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null);

  // 🆕 Enhanced error classification
  const classifyError = useCallback((error: any): ErrorInfo => {
    const errorMessage = error?.message || error?.toString() || 'Unknown error';
    
    // Network errors
    if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
      return {
        type: 'network',
        message: 'Lỗi kết nối mạng. Vui lòng kiểm tra internet.',
        shouldShowAlert: true,
        originalError: error
      };
    }
    
    // 404 errors for photographer
    if (errorMessage.includes('404') && !errorMessage.toLowerCase().includes('image')) {
      return {
        type: 'not_found',
        message: 'Không tìm thấy thông tin photographer.',
        shouldShowAlert: true,
        originalError: error
      };
    }
    
    // 404 errors for images (should not show alert)
    if (errorMessage.includes('404') && errorMessage.toLowerCase().includes('image')) {
      return {
        type: 'image_not_found',
        message: 'Photographer chưa upload ảnh nào.',
        shouldShowAlert: false,
        originalError: error
      };
    }
    
    // Server errors (5xx)
    if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      return {
        type: 'server',
        message: 'Lỗi máy chủ. Vui lòng thử lại sau.',
        shouldShowAlert: true,
        originalError: error
      };
    }
    
    // Default unknown error
    return {
      type: 'unknown',
      message: 'Đã xảy ra lỗi không xác định.',
      shouldShowAlert: true,
      originalError: error
    };
  }, []);

  // 🆕 ENHANCED: Safer usePhotographerImages with error boundary
  let imagesHookResult;
  try {
    imagesHookResult = usePhotographerImages(photographerId > 0 ? photographerId : 0);
  } catch (error) {
    console.error('⚠️ usePhotographerImages hook error (handled safely):', error);
    // Ultra-safe fallback to prevent crash
    imagesHookResult = {
      images: [],
      imageUrls: [],
      primaryImage: null,
      primaryImageUrl: null,
      loading: false,
      error: 'Images service unavailable',
      fetchImages: () => Promise.resolve([]),
      refresh: () => Promise.resolve([]),
      createImage: () => Promise.resolve(null),
      updateImage: () => Promise.resolve(null),
      deleteImage: () => Promise.resolve(false),
      setPrimaryImage: () => Promise.resolve(false),
      uploadMultiple: () => Promise.resolve([])
    };
  }

  // 🆕 Destructure with ultra-safe defaults
  const {
    images: imageResponses = [],
    imageUrls: images = [],
    primaryImage = null,
    primaryImageUrl = null,
    loading: loadingImages = false,
    error: imageError = null,
    fetchImages = () => Promise.resolve([]),
    refresh: refreshImages = () => Promise.resolve([]),
    createImage = () => Promise.resolve(null),
    updateImage = () => Promise.resolve(null),
    deleteImage = () => Promise.resolve(false),
    setPrimaryImage = () => Promise.resolve(false),
    uploadMultiple = () => Promise.resolve([])
  } = imagesHookResult || {};

  // 🆕 ULTRA SAFE: Triple-layer safety for arrays
  const ultraSafeImages = useMemo(() => {
    try {
      // First layer: Check if it's already an array
      if (Array.isArray(images)) {
        return images.filter(img => img && typeof img === 'string');
      }
      
      // Second layer: Check for $values pattern
      if (images && typeof images === 'object' && '$values' in images) {
        const valuesArray = (images as any).$values;
        if (Array.isArray(valuesArray)) {
          return valuesArray.filter(img => img && typeof img === 'string');
        }
      }
      
      // Third layer: Check if it's a single image wrapped
      if (images && typeof images === 'string') {
        return [images];
      }
      
      // Final fallback
      return [];
    } catch (error) {
      console.error('⚠️ Error processing images (handled safely):', error);
      return [];
    }
  }, [images]);

  const ultraSafeImageResponses = useMemo(() => {
    try {
      if (Array.isArray(imageResponses)) {
        return imageResponses.filter(img => img && typeof img === 'object');
      }
      
      if (imageResponses && typeof imageResponses === 'object' && '$values' in imageResponses) {
        const valuesArray = (imageResponses as any).$values;
        if (Array.isArray(valuesArray)) {
          return valuesArray.filter(img => img && typeof img === 'object');
        }
      }
      
      return [];
    } catch (error) {
      console.error('⚠️ Error processing imageResponses (handled safely):', error);
      return [];
    }
  }, [imageResponses]);

  // 🆕 Enhanced image error classification
  const processedImageError = useMemo(() => {
    if (!imageError) return null;
    
    const classified = classifyError(imageError);
    return classified.type === 'image_not_found' ? classified.message : null;
  }, [imageError, classifyError]);

  const fetchPhotographerById = useCallback(async (photographerIdParam: string | number) => {
    setLoading(true);
    setError(null);
    setErrorInfo(null);
    
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
      
      // Fetch photographer by ID with better error handling
      let photographerData;
      try {
        photographerData = await photographerService.getById(id);
        console.log('✅ Photographer data received:', photographerData);
      } catch (fetchError) {
        const errorInfo = classifyError(fetchError);
        setErrorInfo(errorInfo);
        
        if (errorInfo.shouldShowAlert) {
          setError(errorInfo.message);
        }
        
        throw fetchError;
      }

      if (!photographerData) {
        const notFoundError = {
          type: 'not_found' as ErrorType,
          message: 'Photographer not found',
          shouldShowAlert: true
        };
        setErrorInfo(notFoundError);
        setError(notFoundError.message);
        return;
      }

      // Initialize the detail object with photographer data
      const photographerWithExtras: PhotographerDetail = {
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

      // 🆕 Images will be fetched by the hook, with graceful error handling
      console.log('🖼️ Images hook will attempt to fetch images for photographer:', id);
      console.log('🖼️ Image 404 errors are handled gracefully - no alerts shown');

    } catch (err) {
      const errorInfo = classifyError(err);
      setErrorInfo(errorInfo);
      
      if (errorInfo.shouldShowAlert) {
        setError(errorInfo.message);
      }
      
      console.error('⚠️ Error fetching photographer by ID:', err);
      setPhotographerId(0);
    } finally {
      setLoading(false);
    }
  }, [classifyError]);

  const clearPhotographerDetail = useCallback(() => {
    console.log('🧹 Clearing photographer detail');
    setPhotographerDetail(null);
    setPhotographerId(0);
    setError(null);
    setErrorInfo(null);
  }, []);

  // 🆕 Safe methods with error protection - Fixed TypeScript spread issue
  const safeCreateImage = useCallback(async (...args: Parameters<typeof createImage>) => {
    try {
      return await createImage.apply(null, args);
    } catch (error) {
      console.error('⚠️ Error creating image (handled):', error);
      return null;
    }
  }, [createImage]);

  const safeUpdateImage = useCallback(async (...args: Parameters<typeof updateImage>) => {
    try {
      return await updateImage.apply(null, args);
    } catch (error) {
      console.error('⚠️ Error updating image (handled):', error);
      return null;
    }
  }, [updateImage]);

  const safeDeleteImage = useCallback(async (...args: Parameters<typeof deleteImage>) => {
    try {
      return await deleteImage.apply(null, args);
    } catch (error) {
      console.error('⚠️ Error deleting image (handled):', error);
      return false;
    }
  }, [deleteImage]);

  const safeSetPrimaryImage = useCallback(async (...args: Parameters<typeof setPrimaryImage>) => {
    try {
      return await setPrimaryImage.apply(null, args);
    } catch (error) {
      console.error('⚠️ Error setting primary image (handled):', error);
      return false;
    }
  }, [setPrimaryImage]);

  const safeUploadMultiple = useCallback(async (...args: Parameters<typeof uploadMultiple>) => {
    try {
      return await uploadMultiple.apply(null, args);
    } catch (error) {
      console.error('⚠️ Error uploading multiple images (handled):', error);
      return [];
    }
  }, [uploadMultiple]);

  // 🆕 Enhanced debug info with error classification
  const debugInfo = useMemo(() => {
    const info = {
      photographerId,
      hasPhotographerDetail: !!photographerDetail,
      ultraSafeImagesLength: ultraSafeImages.length,
      ultraSafeImageResponsesLength: ultraSafeImageResponses.length,
      loadingPhotographer: loading,
      loadingImages,
      photographerError: error,
      imageError: processedImageError,
      errorInfo,
      primaryImageUrl,
      hasPrimaryImage: !!primaryImage,
      // Debug actual data types
      rawImagesType: typeof images,
      rawImageResponsesType: typeof imageResponses,
      isImagesArray: Array.isArray(images),
      isImageResponsesArray: Array.isArray(imageResponses),
      // Sample data for debugging
      sampleImages: ultraSafeImages.slice(0, 2),
      sampleImageResponses: ultraSafeImageResponses.slice(0, 1)
    };
    
    console.log('🔍 usePhotographerDetail debug (ENHANCED ERROR HANDLING):', info);
    return info;
  }, [
    photographerId,
    photographerDetail,
    ultraSafeImages.length,
    ultraSafeImageResponses.length,
    loading,
    loadingImages,
    error,
    processedImageError,
    errorInfo,
    primaryImageUrl,
    primaryImage,
    images,
    imageResponses,
    ultraSafeImages,
    ultraSafeImageResponses
  ]);

  // 🆕 ULTRA SAFE: Return guaranteed safe values
  const returnValue = useMemo(() => ({
    // Photographer data
    photographerDetail,
    loading,
    error, // Only critical errors that should show alerts
    errorInfo, // Detailed error classification
    fetchPhotographerById,
    clearPhotographerDetail,
    
    // 🆕 GUARANTEED SAFE: Arrays that will never be undefined/null
    images: ultraSafeImages, // string[] - GUARANTEED array
    imageResponses: ultraSafeImageResponses, // ImageResponse[] - GUARANTEED array
    primaryImage, // ImageResponse | null
    primaryImageUrl, // string | null
    loadingImages,
    imageError: processedImageError, // Only non-404 image errors
    
    // 🆕 SAFE: Error-protected methods
    createImage: safeCreateImage,
    updateImage: safeUpdateImage,
    deleteImage: safeDeleteImage,
    setPrimaryImage: safeSetPrimaryImage,
    uploadMultiple: safeUploadMultiple,

    // Enhanced debug info
    debugInfo,
  }), [
    photographerDetail,
    loading,
    error,
    errorInfo,
    fetchPhotographerById,
    clearPhotographerDetail,
    ultraSafeImages,
    ultraSafeImageResponses,
    primaryImage,
    primaryImageUrl,
    loadingImages,
    processedImageError,
    safeCreateImage,
    safeUpdateImage,
    safeDeleteImage,
    safeSetPrimaryImage,
    safeUploadMultiple,
    debugInfo,
  ]);

  return returnValue;
};