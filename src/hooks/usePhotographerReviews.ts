// hooks/usePhotographerReviews.ts
import { useState, useEffect, useCallback } from 'react';
import { Review } from '../types/review';
import { reviewService } from '../services/reviewService';


interface UsePhotographerReviewsResult {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
  loading: boolean;
  error: string | null;
  refreshReviews: () => Promise<void>;
}

export const usePhotographerReviews = (
  photographerId: number | string,
  initialRating?: number,
  initialCount?: number
): UsePhotographerReviewsResult => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(initialRating || 0);
  const [totalReviews, setTotalReviews] = useState(initialCount || 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Convert photographerId to number if it's string
      const id = typeof photographerId === 'string' ? parseInt(photographerId) : photographerId;
      
      // Validate ID
      if (!id || isNaN(id)) {
        throw new Error('Invalid photographer ID');
      }
      
      // Sử dụng reviewService thay vì photographerService
      const data = await reviewService.getPhotographerReviewsWithStats(id);

      setReviews(data.reviews);
      setAverageRating(data.averageRating || initialRating || 0);
      setTotalReviews(data.totalReviews || initialCount || 0);

    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError(err instanceof Error ? err.message : 'Không thể tải đánh giá');
      
      // Fallback to initial data if available
      if (initialRating !== undefined) {
        setAverageRating(initialRating);
        setTotalReviews(initialCount || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [photographerId]); // ← CHỈ DEPEND VÀO photographerId

  const refreshReviews = useCallback(async () => {
    await fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    const id = typeof photographerId === 'string' ? parseInt(photographerId) : photographerId;
    if (id && !isNaN(id)) {
      fetchReviews();
    }
  }, [photographerId]); // ← CHỈ DEPEND VÀO photographerId

  return {
    reviews,
    averageRating,
    totalReviews,
    loading,
    error,
    refreshReviews
  };
};