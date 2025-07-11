// hooks/usePhotographerDetail.ts
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

  // Use the images hook for this photographer - only when we have a valid ID
  const {
    images: imageResponses,
    imageUrls: images,
    primaryImage,
    primaryImageUrl,
    loading: loadingImages,
    error: imageError,
    fetchImages,
    refresh: refreshImages,
    createImage,
    updateImage,
    deleteImage,
    setPrimaryImage,
    uploadMultiple
  } = usePhotographerImages(photographerId);

  const fetchPhotographerById = useCallback(async (photographerIdParam: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const id = parseInt(photographerIdParam);
      setPhotographerId(id); // This will trigger the images hook
      
      // Fetch photographer by ID (using the standard endpoint /api/Photographer/{id})
      console.log('Fetching photographer by ID:', id);
      const photographerData = await photographerService.getById(id);
      console.log('Photographer data received:', photographerData);

      // Initialize the detail object with photographer data
      let photographerWithExtras: PhotographerDetail = {
        ...photographerData,
        reviews: []
      };

      // Fetch reviews for this photographer
      try {
        const reviewsData = await photographerService.getReviews(id);
        console.log('Reviews data received:', reviewsData);
        
        // Handle case where reviews might be wrapped in $values
        if (Array.isArray(reviewsData)) {
          photographerWithExtras.reviews = reviewsData;
        } else if (reviewsData && Array.isArray((reviewsData as any).$values)) {
          photographerWithExtras.reviews = (reviewsData as any).$values;
        }
      } catch (reviewError) {
        console.log('Could not fetch reviews (non-critical):', reviewError);
        // Don't fail the whole request if reviews fail
      }

      setPhotographerDetail(photographerWithExtras);

      // Images will be fetched automatically by the images hook when photographerId changes

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching photographer by ID:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearPhotographerDetail = useCallback(() => {
    setPhotographerDetail(null);
    setPhotographerId(0);
    setError(null);
  }, []);

  // Memoize the return object to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    // Photographer data
    photographerDetail,
    loading,
    error,
    fetchPhotographerById,
    clearPhotographerDetail,
    
    // Images data from usePhotographerImages hook
    images, // string[] - image URLs
    imageResponses, // ImageResponse[] - full image objects
    primaryImage, // ImageResponse | null
    primaryImageUrl, // string | null
    loadingImages,
    imageError,
    
    // Images methods (excluding refresh since it's not needed)
    createImage,
    updateImage,
    deleteImage,
    setPrimaryImage,
    uploadMultiple,
  }), [
    photographerDetail,
    loading,
    error,
    fetchPhotographerById,
    clearPhotographerDetail,
    images,
    imageResponses,
    primaryImage,
    primaryImageUrl,
    loadingImages,
    imageError,
    createImage,
    updateImage,
    deleteImage,
    setPrimaryImage,
    uploadMultiple,
  ]);

  return returnValue;
};