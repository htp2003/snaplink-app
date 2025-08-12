import { useState, useCallback, useEffect } from 'react';
import { ratingService } from '../services/ratingService';
import type {
  RatingResponse,
  CreateRatingRequest,
  UpdateRatingRequest,
  UseRatingOptions,
  RatingValidationErrors,
  CreateRatingResult,
  UpdateRatingResult,
  RatingTarget,
  RatingTargetInfo
} from '../types/rating';

export const useRating = (options: UseRatingOptions = {}) => {
  const { userId, autoRefresh = false, refreshInterval = 30000 } = options;

  // ===== RATING STATES =====
  const [rating, setRating] = useState<RatingResponse | null>(null);
  const [ratings, setRatings] = useState<RatingResponse[]>([]);
  const [photographerRatings, setPhotographerRatings] = useState<RatingResponse[]>([]);
  const [locationRatings, setLocationRatings] = useState<RatingResponse[]>([]);
  
  const [loadingRating, setLoadingRating] = useState(false);
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [creatingRating, setCreatingRating] = useState(false);
  const [updatingRating, setUpdatingRating] = useState(false);
  const [deletingRating, setDeletingRating] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [lastPollingTime, setLastPollingTime] = useState<number>(0);

  // ===== RATING CRUD METHODS =====
  
  const createRating = useCallback(async (
    ratingData: CreateRatingRequest
  ): Promise<RatingResponse | null> => {
    if (creatingRating) return null;

    try {
      setCreatingRating(true);
      setError(null);

      console.log('🔧 Hook: Creating rating with data:', ratingData);
      const result = await ratingService.createRating(ratingData);
      
      if (result.success && result.rating) {
        console.log('✅ Hook: Rating created successfully:', result.rating);
        setRating(result.rating);
        setError(null);
        
        // Add to appropriate lists
        setRatings(prev => [result.rating!, ...prev]);
        
        if (result.rating.photographerId) {
          setPhotographerRatings(prev => [result.rating!, ...prev]);
        }
        
        if (result.rating.locationId) {
          setLocationRatings(prev => [result.rating!, ...prev]);
        }
        
        return result.rating;
      } else {
        throw new Error(result.error || 'Failed to create rating');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tạo đánh giá';
      setError(errorMessage);
      console.error('❌ Hook: Error in createRating:', err);
      return null;
    } finally {
      setCreatingRating(false);
    }
  }, [creatingRating]);

  const getAllRatings = useCallback(async (): Promise<RatingResponse[]> => {
    try {
      setLoadingRatings(true);
      
      console.log('📋 Hook: Fetching all ratings');
      const fetchedRatings = await ratingService.getAllRatings();
      
      setRatings(fetchedRatings);
      setLastPollingTime(Date.now());
      setError(null);
      console.log('✅ Hook: All ratings fetched successfully:', fetchedRatings.length);
      
      return fetchedRatings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể lấy danh sách đánh giá';
      console.error('❌ Hook: Error in getAllRatings:', err);
      setError(errorMessage);
      return [];
    } finally {
      setLoadingRatings(false);
    }
  }, []);

  const getRatingById = useCallback(async (ratingId: number): Promise<RatingResponse | null> => {
    try {
      setLoadingRating(true);
      
      console.log('🔍 Hook: Fetching rating by ID:', ratingId);
      
      if (!ratingId || isNaN(ratingId) || ratingId <= 0) {
        throw new Error('Invalid rating ID');
      }
      
      const fetchedRating = await ratingService.getRatingById(ratingId);
      
      setRating(fetchedRating);
      setLastPollingTime(Date.now());
      setError(null);
      console.log('✅ Hook: Rating fetched successfully:', fetchedRating);
      
      return fetchedRating;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể lấy thông tin đánh giá';
      console.error('❌ Hook: Error in getRatingById:', err);
      
      if (!errorMessage.includes('Rating not found')) {
        setError(errorMessage);
      }
      
      return null;
    } finally {
      setLoadingRating(false);
    }
  }, []);

  const getRatingsByPhotographer = useCallback(async (photographerId: number): Promise<RatingResponse[]> => {
    try {
      setLoadingRatings(true);
      
      console.log('📸 Hook: Fetching ratings for photographer:', photographerId);
      
      if (!photographerId || isNaN(photographerId) || photographerId <= 0) {
        throw new Error('Invalid photographer ID');
      }
      
      const fetchedRatings = await ratingService.getRatingsByPhotographer(photographerId);
      
      setPhotographerRatings(fetchedRatings);
      setLastPollingTime(Date.now());
      setError(null);
      console.log('✅ Hook: Photographer ratings fetched successfully:', fetchedRatings.length);
      
      return fetchedRatings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể lấy đánh giá của photographer';
      console.error('❌ Hook: Error in getRatingsByPhotographer:', err);
      setError(errorMessage);
      return [];
    } finally {
      setLoadingRatings(false);
    }
  }, []);

  const getRatingsByLocation = useCallback(async (locationId: number): Promise<RatingResponse[]> => {
    try {
      setLoadingRatings(true);
      
      console.log('📍 Hook: Fetching ratings for location:', locationId);
      
      if (!locationId || isNaN(locationId) || locationId <= 0) {
        throw new Error('Invalid location ID');
      }
      
      const fetchedRatings = await ratingService.getRatingsByLocation(locationId);
      
      setLocationRatings(fetchedRatings);
      setLastPollingTime(Date.now());
      setError(null);
      console.log('✅ Hook: Location ratings fetched successfully:', fetchedRatings.length);
      
      return fetchedRatings;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể lấy đánh giá của location';
      console.error('❌ Hook: Error in getRatingsByLocation:', err);
      setError(errorMessage);
      return [];
    } finally {
      setLoadingRatings(false);
    }
  }, []);

  const updateRating = useCallback(async (
    ratingId: number,
    updateData: UpdateRatingRequest
  ): Promise<RatingResponse | null> => {
    if (updatingRating) return null;

    try {
      setUpdatingRating(true);
      setError(null);

      console.log('🔧 Hook: Updating rating:', ratingId, updateData);
      
      if (!ratingId || isNaN(ratingId) || ratingId <= 0) {
        throw new Error('Invalid rating ID');
      }
      
      const result = await ratingService.updateRating(ratingId, updateData);
      
      if (result.success && result.rating) {
        console.log('✅ Hook: Rating updated successfully:', result.rating);
        setRating(result.rating);
        setError(null);
        
        // Update in lists
        const updateRatingInList = (prev: RatingResponse[]) => 
          prev.map(r => r.id === ratingId ? result.rating! : r);
          
        setRatings(updateRatingInList);
        setPhotographerRatings(updateRatingInList);
        setLocationRatings(updateRatingInList);
        
        return result.rating;
      } else {
        throw new Error(result.error || 'Failed to update rating');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể cập nhật đánh giá';
      setError(errorMessage);
      console.error('❌ Hook: Error in updateRating:', err);
      return null;
    } finally {
      setUpdatingRating(false);
    }
  }, [updatingRating]);

  const deleteRating = useCallback(async (ratingId: number): Promise<boolean> => {
    if (deletingRating) return false;

    try {
      setDeletingRating(true);
      setError(null);

      console.log('🗑️ Hook: Deleting rating:', ratingId);
      
      if (!ratingId || isNaN(ratingId) || ratingId <= 0) {
        throw new Error('Invalid rating ID');
      }
      
      await ratingService.deleteRating(ratingId);
      
      console.log('✅ Hook: Rating deleted successfully');
      
      // Remove from current rating if it matches
      if (rating?.id === ratingId) {
        setRating(null);
      }
      
      // Remove from lists
      const removeRatingFromList = (prev: RatingResponse[]) => 
        prev.filter(r => r.id !== ratingId);
        
      setRatings(removeRatingFromList);
      setPhotographerRatings(removeRatingFromList);
      setLocationRatings(removeRatingFromList);
      
      setError(null);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể xóa đánh giá';
      setError(errorMessage);
      console.error('❌ Hook: Error in deleteRating:', err);
      return false;
    } finally {
      setDeletingRating(false);
    }
  }, [deletingRating, rating]);

  // ===== CONVENIENCE METHODS =====

  const createPhotographerRating = useCallback(async (
    bookingId: number,
    reviewerUserId: number,
    photographerId: number,
    score: number,
    comment?: string
  ): Promise<RatingResponse | null> => {
    try {
      console.log('📸 Hook: Creating photographer rating');
      
      const result = await ratingService.createPhotographerRating(
        bookingId,
        reviewerUserId,
        photographerId,
        score,
        comment
      );
      
      if (result.success && result.rating) {
        setRating(result.rating);
        setRatings(prev => [result.rating!, ...prev]);
        setPhotographerRatings(prev => [result.rating!, ...prev]);
        setError(null);
        return result.rating;
      } else {
        throw new Error(result.error || 'Failed to create photographer rating');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tạo đánh giá photographer';
      setError(errorMessage);
      console.error('❌ Hook: Error in createPhotographerRating:', err);
      return null;
    }
  }, []);

  const createLocationRating = useCallback(async (
    bookingId: number,
    reviewerUserId: number,
    locationId: number,
    score: number,
    comment?: string
  ): Promise<RatingResponse | null> => {
    try {
      console.log('📍 Hook: Creating location rating');
      
      const result = await ratingService.createLocationRating(
        bookingId,
        reviewerUserId,
        locationId,
        score,
        comment
      );
      
      if (result.success && result.rating) {
        setRating(result.rating);
        setRatings(prev => [result.rating!, ...prev]);
        setLocationRatings(prev => [result.rating!, ...prev]);
        setError(null);
        return result.rating;
      } else {
        throw new Error(result.error || 'Failed to create location rating');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tạo đánh giá location';
      setError(errorMessage);
      console.error('❌ Hook: Error in createLocationRating:', err);
      return null;
    }
  }, []);

  // ===== UTILITY METHODS =====

  const clearRatingData = useCallback(() => {
    setRating(null);
    setRatings([]);
    setPhotographerRatings([]);
    setLocationRatings([]);
    setError(null);
    setLastPollingTime(0);
    console.log('🧹 Rating data cleared');
  }, []);

  const refreshRating = useCallback(async () => {
    const ratingId = rating?.id;
    if (ratingId) {
      console.log('🔄 Refreshing rating with ID:', ratingId);
      await getRatingById(ratingId);
    } else {
      console.warn('⚠️ Cannot refresh rating - no rating ID found');
    }
  }, [rating, getRatingById]);

  const refreshPhotographerRatings = useCallback(async (photographerId: number) => {
    if (photographerId && photographerId > 0) {
      console.log('🔄 Refreshing photographer ratings for:', photographerId);
      await getRatingsByPhotographer(photographerId);
    }
  }, [getRatingsByPhotographer]);

  const refreshLocationRatings = useCallback(async (locationId: number) => {
    if (locationId && locationId > 0) {
      console.log('🔄 Refreshing location ratings for:', locationId);
      await getRatingsByLocation(locationId);
    }
  }, [getRatingsByLocation]);

  // ===== VALIDATION =====

  const validateRatingData = useCallback((ratingData: CreateRatingRequest): RatingValidationErrors => {
    const errors: RatingValidationErrors = {};

    if (!ratingData.bookingId || isNaN(ratingData.bookingId) || ratingData.bookingId <= 0) {
      errors.bookingId = 'Booking ID không hợp lệ';
    }

    if (!ratingData.reviewerUserId || isNaN(ratingData.reviewerUserId) || ratingData.reviewerUserId <= 0) {
      errors.reviewerUserId = 'Reviewer User ID không hợp lệ';
    }

    // Validate rating target
    const hasPhotographerId = ratingData.photographerId && ratingData.photographerId > 0;
    const hasLocationId = ratingData.locationId && ratingData.locationId > 0;

    if (!hasPhotographerId && !hasLocationId) {
      errors.target = 'Phải chọn đánh giá cho photographer hoặc location';
    } else if (hasPhotographerId && hasLocationId) {
      errors.target = 'Chỉ có thể đánh giá photographer HOẶC location, không được cả hai';
    }

    if (!ratingData.score || isNaN(ratingData.score) || ratingData.score < 1 || ratingData.score > 5) {
      errors.score = 'Điểm đánh giá phải từ 1 đến 5';
    }

    if (ratingData.comment && ratingData.comment.trim().length > 1000) {
      errors.comment = 'Nhận xét không được vượt quá 1000 ký tự';
    }

    return errors;
  }, []);

  const validateUpdateData = useCallback((updateData: UpdateRatingRequest): RatingValidationErrors => {
    const errors: RatingValidationErrors = {};

    if (!updateData.score || isNaN(updateData.score) || updateData.score < 1 || updateData.score > 5) {
      errors.score = 'Điểm đánh giá phải từ 1 đến 5';
    }

    if (updateData.comment && updateData.comment.trim().length > 1000) {
      errors.comment = 'Nhận xét không được vượt quá 1000 ký tự';
    }

    return errors;
  }, []);

  // ===== RATING STATISTICS =====

  const calculateAverageRating = useCallback((ratingsList: RatingResponse[]): number => {
    return ratingService.calculateAverageRating(ratingsList);
  }, []);

  const getRatingDistribution = useCallback((ratingsList: RatingResponse[]): Record<number, number> => {
    return ratingService.getRatingDistribution(ratingsList);
  }, []);

  const getPhotographerAverageRating = useCallback((): number => {
    return calculateAverageRating(photographerRatings);
  }, [photographerRatings, calculateAverageRating]);

  const getLocationAverageRating = useCallback((): number => {
    return calculateAverageRating(locationRatings);
  }, [locationRatings, calculateAverageRating]);

  const getPhotographerRatingDistribution = useCallback((): Record<number, number> => {
    return getRatingDistribution(photographerRatings);
  }, [photographerRatings, getRatingDistribution]);

  const getLocationRatingDistribution = useCallback((): Record<number, number> => {
    return getRatingDistribution(locationRatings);
  }, [locationRatings, getRatingDistribution]);

  // ===== RATING UTILITIES =====

  const getRatingLabel = useCallback((score: number): string => {
    return ratingService.getRatingLabel(score);
  }, []);

  const getRatingColor = useCallback((score: number): string => {
    return ratingService.getRatingColor(score);
  }, []);

  const validateRatingTarget = useCallback((photographerId?: number | null, locationId?: number | null) => {
    return ratingService.validateRatingTarget(photographerId, locationId);
  }, []);

  // ===== TESTING METHODS =====

  const testCreatePhotographerRating = useCallback(async (
    testBookingId: number,
    testUserId: number,
    testPhotographerId: number
  ): Promise<CreateRatingResult> => {
    try {
      setCreatingRating(true);
      setError(null);

      const result = await ratingService.testCreatePhotographerRating(
        testBookingId,
        testUserId,
        testPhotographerId
      );
      
      if (result.success && result.rating) {
        setRating(result.rating);
        setError(null);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Test photographer rating failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setCreatingRating(false);
    }
  }, []);

  const testCreateLocationRating = useCallback(async (
    testBookingId: number,
    testUserId: number,
    testLocationId: number
  ): Promise<CreateRatingResult> => {
    try {
      setCreatingRating(true);
      setError(null);

      const result = await ratingService.testCreateLocationRating(
        testBookingId,
        testUserId,
        testLocationId
      );
      
      if (result.success && result.rating) {
        setRating(result.rating);
        setError(null);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Test location rating failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setCreatingRating(false);
    }
  }, []);

  // ===== AUTO REFRESH EFFECT =====
  useEffect(() => {
    if (!autoRefresh || !rating?.id) {
      return;
    }

    console.log('🔄 Setting up auto refresh for rating:', rating.id);
    
    const interval = setInterval(async () => {
      console.log('🔄 Auto refreshing rating...');
      await refreshRating();
    }, refreshInterval);

    return () => {
      console.log('🔄 Clearing auto refresh interval');
      clearInterval(interval);
    };
  }, [autoRefresh, rating?.id, refreshInterval, refreshRating]);

  // ===== CURRENT RATING UTILITIES =====

  const getCurrentRatingId = useCallback((): number | null => {
    return rating?.id || null;
  }, [rating]);

  const getCurrentRatingScore = useCallback((): number => {
    return rating?.score || 0;
  }, [rating]);

  const getCurrentRatingComment = useCallback((): string => {
    return rating?.comment || '';
  }, [rating]);

  const getCurrentRatingTarget = useCallback((): RatingTarget | null => {
    if (!rating) return null;
    if (rating.photographerId) return 'photographer';
    if (rating.locationId) return 'location';
    return null;
  }, [rating]);

  const getCurrentRatingTargetInfo = useCallback((): RatingTargetInfo | null => {
    if (!rating) return null;
    
    if (rating.photographerId) {
      return {
        type: 'photographer',
        id: rating.photographerId,
        name: rating.photographerName
      };
    }
    
    if (rating.locationId) {
      return {
        type: 'location',
        id: rating.locationId,
        name: rating.locationName
      };
    }
    
    return null;
  }, [rating]);

  const getRatingDebugInfo = useCallback(() => {
    if (!rating) return null;
    
    return {
      id: rating.id,
      bookingId: rating.bookingId,
      reviewerUserId: rating.reviewerUserId,
      photographerId: rating.photographerId,
      locationId: rating.locationId,
      score: rating.score,
      comment: rating.comment,
      createdAt: rating.createdAt,
      updatedAt: rating.updatedAt,
      reviewerName: rating.reviewerName,
      photographerName: rating.photographerName,
      locationName: rating.locationName,
      bookingDate: rating.bookingDate,
      target: getCurrentRatingTarget(),
      targetInfo: getCurrentRatingTargetInfo()
    };
  }, [rating, getCurrentRatingTarget, getCurrentRatingTargetInfo]);

  return {
    // ===== DATA =====
    rating,
    ratings,
    photographerRatings,
    locationRatings,
    lastPollingTime,

    // ===== LOADING STATES =====
    loadingRating,
    loadingRatings,
    creatingRating,
    updatingRating,
    deletingRating,
    error,

    // ===== CRUD METHODS =====
    createRating,
    getAllRatings,
    getRatingById,
    getRatingsByPhotographer,
    getRatingsByLocation,
    updateRating,
    deleteRating,

    // ===== CONVENIENCE METHODS =====
    createPhotographerRating,
    createLocationRating,

    // ===== UTILITY METHODS =====
    clearRatingData,
    refreshRating,
    refreshPhotographerRatings,
    refreshLocationRatings,

    // ===== VALIDATION =====
    validateRatingData,
    validateUpdateData,
    validateRatingTarget,

    // ===== STATISTICS =====
    calculateAverageRating,
    getRatingDistribution,
    getPhotographerAverageRating,
    getLocationAverageRating,
    getPhotographerRatingDistribution,
    getLocationRatingDistribution,

    // ===== RATING UTILITIES =====
    getRatingLabel,
    getRatingColor,

    // ===== CURRENT RATING UTILITIES =====
    getCurrentRatingId,
    getCurrentRatingScore,
    getCurrentRatingComment,
    getCurrentRatingTarget,
    getCurrentRatingTargetInfo,
    getRatingDebugInfo,

    // ===== TESTING METHODS =====
    testCreatePhotographerRating,
    testCreateLocationRating,

    // ===== SETTER METHODS (for external updates) =====
    setRating,
    setRatings,
    setPhotographerRatings,
    setLocationRatings,
    setError,
  };
};