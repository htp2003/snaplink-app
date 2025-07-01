// hooks/usePhotographerDetail.ts
import { useState } from 'react';
import { Photographer } from '../types';
import { photographerService } from '../services/photographerService';
import { Review } from '../types';


// Extend the existing Photographer interface to include additional fields from API response
export interface PhotographerDetail extends Photographer {
  reviews?: Review[];
}

export const usePhotographerDetail = () => {
  const [photographerDetail, setPhotographerDetail] = useState<PhotographerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotographerById = async (photographerId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const id = parseInt(photographerId);
      
      // Fetch photographer by ID (using the standard endpoint /api/Photographer/{id})
      console.log('Fetching photographer by ID:', id);
      const photographerData = await photographerService.getById(id);
      console.log('Photographer data received:', photographerData);

      // Fetch reviews for this photographer
      let reviews: Review[] = [];
      try {
        const reviewsData = await photographerService.getReviews(id);
        console.log('Reviews data received:', reviewsData);
        
        // Handle case where reviews might be wrapped in $values
        if (Array.isArray(reviewsData)) {
          reviews = reviewsData;
        } else if (reviewsData && Array.isArray((reviewsData as any).$values)) {
          reviews = (reviewsData as any).$values;
        }
      } catch (reviewError) {
        console.log('Could not fetch reviews (non-critical):', reviewError);
        // Don't fail the whole request if reviews fail
      }

      // Combine photographer data with reviews
      const photographerWithReviews: PhotographerDetail = {
        ...photographerData,
        reviews: reviews
      };

      setPhotographerDetail(photographerWithReviews);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Error fetching photographer by ID:', err);
    } finally {
      setLoading(false);
    }
  };

  const clearPhotographerDetail = () => {
    setPhotographerDetail(null);
    setError(null);
  };

  return {
    photographerDetail,
    loading,
    error,
    fetchPhotographerById,
    clearPhotographerDetail,
  };
};