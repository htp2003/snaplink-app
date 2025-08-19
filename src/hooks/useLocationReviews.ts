import { useState, useEffect, useCallback } from 'react';
import { ratingService } from '../services/ratingService';
import { userService } from '../services/userService';
import type { RatingResponse } from '../types/rating';

// Enhanced rating response with user info
interface EnhancedRatingResponse extends RatingResponse {
  reviewerFullName?: string;
  reviewerProfileImage?: string | null; 
}

interface UseLocationReviewsResult {
  reviews: EnhancedRatingResponse[];
  averageRating: number;
  totalReviews: number;
  loading: boolean;
  error: string | null;
  refreshReviews: () => Promise<void>;
}

export function useLocationReviews(
  locationId: number | string,
  currentRating?: number,
  totalReviews?: number
): UseLocationReviewsResult {
  const [reviews, setReviews] = useState<EnhancedRatingResponse[]>([]);
  const [averageRating, setAverageRating] = useState<number>(currentRating || 0);
  const [totalReviewsCount, setTotalReviewsCount] = useState<number>(totalReviews || 0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const locationIdNum = typeof locationId === 'string' 
    ? parseInt(locationId) 
    : locationId;

  // Helper function to fetch user info using existing userService
  const fetchUserInfo = async (userId: number) => {
    try {
      console.log('🔍 Fetching user info for ID:', userId);
      
      const userData = await userService.getUserById(userId);
      
      console.log('✅ User info fetched:', userData);
      return userData;
    } catch (error) {
      console.warn('Failed to fetch user info for ID:', userId, error);
      return null;
    }
  };

  const fetchReviews = useCallback(async () => {
    if (!locationIdNum || isNaN(locationIdNum) || locationIdNum <= 0) {
      console.warn('Invalid location ID:', locationId);
      setError('ID location không hợp lệ');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📍 Fetching reviews for location:', locationIdNum);
      
      // Sử dụng Rating API endpoint: /api/Rating/ByLocation/{locationId}
      const fetchedRatings = await ratingService.getRatingsByLocation(locationIdNum);
      
      console.log('✅ Reviews fetched successfully:', fetchedRatings);
      
      // Enhance ratings with user information
      const enhancedRatings: EnhancedRatingResponse[] = await Promise.all(
        fetchedRatings.map(async (rating) => {
          const userInfo = await fetchUserInfo(rating.reviewerUserId);
          
          return {
            ...rating,
            reviewerFullName: userInfo?.fullName || userInfo?.userName || 'Người dùng ẩn danh',
            reviewerProfileImage: userInfo?.profileImage || null
          };
        })
      );
      
      console.log('✅ Enhanced ratings with user info:', enhancedRatings);
      
      setReviews(enhancedRatings);
      
      // Tính toán average rating và total count từ data thực tế
      const calculatedAverage = ratingService.calculateAverageRating(enhancedRatings);
      const calculatedTotal = enhancedRatings.length;
      
      setAverageRating(calculatedAverage || currentRating || 0);
      setTotalReviewsCount(calculatedTotal || totalReviews || 0);
      
      console.log('📊 Rating stats:', {
        average: calculatedAverage,
        total: calculatedTotal,
        reviews: enhancedRatings.length
      });
      
    } catch (err) {
      console.error('⚠️ Error fetching location reviews:', err);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Không thể tải đánh giá';
      
      setError(errorMessage);
      
      // Fallback to provided values if API fails
      if (currentRating !== undefined) {
        setAverageRating(currentRating);
      }
      if (totalReviews !== undefined) {
        setTotalReviewsCount(totalReviews);
      }
    } finally {
      setLoading(false);
    }
  }, [locationIdNum, currentRating, totalReviews, locationId]);

  const refreshReviews = useCallback(async () => {
    console.log('🔄 Refreshing location reviews...');
    await fetchReviews();
  }, [fetchReviews]);

  // Fetch reviews when component mounts or locationId changes
  useEffect(() => {
    if (locationIdNum && locationIdNum > 0) {
      fetchReviews();
    } else {
      // Use fallback values if no valid location ID
      setAverageRating(currentRating || 0);
      setTotalReviewsCount(totalReviews || 0);
      setReviews([]);
      setError(null);
      setLoading(false);
    }
  }, [fetchReviews, locationIdNum, currentRating, totalReviews]);

  return {
    reviews,
    averageRating,
    totalReviews: totalReviewsCount,
    loading,
    error,
    refreshReviews
  };
}