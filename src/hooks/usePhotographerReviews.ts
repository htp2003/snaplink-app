import { useState, useEffect, useCallback } from 'react';
import { ratingService } from '../services/ratingService';
import { userService } from '../services/userService';
import type { RatingResponse } from '../types/rating';

// Enhanced rating response with user info
interface EnhancedRatingResponse extends RatingResponse {
  reviewerFullName?: string;
  reviewerProfileImage?: string | null; // Allow null to match userService response
}

interface UsePhotographerReviewsResult {
  reviews: EnhancedRatingResponse[];
  averageRating: number;
  totalReviews: number;
  loading: boolean;
  error: string | null;
  refreshReviews: () => Promise<void>;
}

export function usePhotographerReviews(
  photographerId: number | string,
  currentRating?: number,
  totalReviews?: number
): UsePhotographerReviewsResult {
  const [reviews, setReviews] = useState<EnhancedRatingResponse[]>([]);
  const [averageRating, setAverageRating] = useState<number>(currentRating || 0);
  const [totalReviewsCount, setTotalReviewsCount] = useState<number>(totalReviews || 0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const photographerIdNum = typeof photographerId === 'string' 
    ? parseInt(photographerId) 
    : photographerId;

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
    if (!photographerIdNum || isNaN(photographerIdNum) || photographerIdNum <= 0) {
      console.warn('Invalid photographer ID:', photographerId);
      setError('ID photographer không hợp lệ');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('📸 Fetching reviews for photographer:', photographerIdNum);
      
      // Sử dụng Rating API endpoint: /api/Rating/ByPhotographer/{photographerId}
      const fetchedRatings = await ratingService.getRatingsByPhotographer(photographerIdNum);
      
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
      console.error('❌ Error fetching photographer reviews:', err);
      
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
  }, [photographerIdNum, currentRating, totalReviews, photographerId]);

  const refreshReviews = useCallback(async () => {
    console.log('🔄 Refreshing photographer reviews...');
    await fetchReviews();
  }, [fetchReviews]);

  // Fetch reviews when component mounts or photographerId changes
  useEffect(() => {
    if (photographerIdNum && photographerIdNum > 0) {
      fetchReviews();
    } else {
      // Use fallback values if no valid photographer ID
      setAverageRating(currentRating || 0);
      setTotalReviewsCount(totalReviews || 0);
      setReviews([]);
      setError(null);
      setLoading(false);
    }
  }, [fetchReviews, photographerIdNum, currentRating, totalReviews]);

  return {
    reviews,
    averageRating,
    totalReviews: totalReviewsCount,
    loading,
    error,
    refreshReviews
  };
}