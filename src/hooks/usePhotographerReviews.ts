import { useState, useEffect, useCallback } from 'react';
import { ratingService } from '../services/ratingService';
import { userService } from '../services/userService';
import type { RatingResponse } from '../types/rating';

// Enhanced rating response with user info
interface EnhancedRatingResponse extends RatingResponse {
  reviewerFullName?: string;
  reviewerProfileImage?: string | null; 
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
  photographerId: number | string
): UsePhotographerReviewsResult {
  const [reviews, setReviews] = useState<EnhancedRatingResponse[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalReviewsCount, setTotalReviewsCount] = useState<number>(0);
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
      console.warn('⚠️ Failed to fetch user info for ID:', userId, error);
      return null;
    }
  };

  // Reset state function
  const resetState = useCallback(() => {
    setReviews([]);
    setAverageRating(0);
    setTotalReviewsCount(0);
    setError(null);
  }, []);

  const fetchReviews = useCallback(async () => {
    // Validate photographer ID
    if (!photographerIdNum || isNaN(photographerIdNum) || photographerIdNum <= 0) {
      console.warn('❌ Invalid photographer ID:', photographerId);
      setError('ID photographer không hợp lệ');
      resetState();
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 🔥 Reset state ngay khi bắt đầu fetch để tránh hiển thị data cũ
      resetState();

      console.log('📸 Fetching reviews for photographer:', photographerIdNum);
      
      // Fetch ratings from API
      const fetchedRatings = await ratingService.getRatingsByPhotographer(photographerIdNum);
      
      console.log('✅ Raw reviews fetched:', {
        count: fetchedRatings?.length || 0,
        data: fetchedRatings
      });
      
      // 🔥 Kiểm tra xem có reviews thực sự không
      if (!fetchedRatings || !Array.isArray(fetchedRatings) || fetchedRatings.length === 0) {
        console.log('📊 No reviews found for photographer:', photographerIdNum);
        setReviews([]);
        setAverageRating(0);
        setTotalReviewsCount(0);
        return;
      }
      
      // Enhance ratings with user information
      console.log('🔄 Enhancing ratings with user info...');
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
      
      console.log('✅ Enhanced ratings completed:', enhancedRatings.length);
      
      // Set reviews
      setReviews(enhancedRatings);
      
      // 🔥 Tính toán rating CHỈ từ data thực tế, KHÔNG fallback
      const calculatedAverage = ratingService.calculateAverageRating(enhancedRatings);
      const calculatedTotal = enhancedRatings.length;
      
      // 🔥 Đảm bảo chỉ set giá trị thực tế
      const finalAverage = calculatedAverage && calculatedAverage > 0 ? calculatedAverage : 0;
      const finalTotal = calculatedTotal && calculatedTotal > 0 ? calculatedTotal : 0;
      
      setAverageRating(finalAverage);
      setTotalReviewsCount(finalTotal);
      
      console.log('📊 Final rating calculation:', {
        rawAverage: calculatedAverage,
        finalAverage,
        rawTotal: calculatedTotal,
        finalTotal,
        reviewsLength: enhancedRatings.length
      });
      
    } catch (err) {
      console.error('❌ Error fetching photographer reviews:', err);
      
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Không thể tải đánh giá';
      
      setError(errorMessage);
      
      // 🔥 Khi có lỗi, đảm bảo reset về 0
      setReviews([]);
      setAverageRating(0);
      setTotalReviewsCount(0);
    } finally {
      setLoading(false);
    }
  }, [photographerIdNum, photographerId, resetState]);

  const refreshReviews = useCallback(async () => {
    console.log('🔄 Manually refreshing photographer reviews...');
    await fetchReviews();
  }, [fetchReviews]);

  // 🔥 Effect để fetch reviews khi photographerId thay đổi
  useEffect(() => {
    console.log('🔄 Photographer ID changed, resetting and fetching:', {
      photographerId,
      photographerIdNum,
      isValid: photographerIdNum && photographerIdNum > 0
    });

    // Reset state ngay khi photographerId thay đổi
    resetState();
    setLoading(false);
    
    if (photographerIdNum && photographerIdNum > 0) {
      fetchReviews();
    } else {
      console.log('⚠️ Invalid photographer ID, keeping empty state');
    }
  }, [photographerIdNum, fetchReviews, resetState]);

  // 🔥 Debug effect
  useEffect(() => {
    console.log('🔍 usePhotographerReviews State Update:', {
      photographerId: photographerIdNum,
      reviews: reviews.length,
      averageRating,
      totalReviews: totalReviewsCount,
      loading,
      error
    });
  }, [photographerIdNum, reviews.length, averageRating, totalReviewsCount, loading, error]);

  return {
    reviews,
    averageRating,
    totalReviews: totalReviewsCount,
    loading,
    error,
    refreshReviews
  };
}