// services/api/reviewService.ts
import { Review, CreateReviewRequest, UpdateReviewRequest } from '../types/review';
import { apiClient } from './base';

// Review endpoints
const ENDPOINTS = {
  ALL: '/api/Review',
  BY_ID: (id: number) => `/api/Review/${id}`,
  CREATE: '/api/Review',
  UPDATE: (id: number) => `/api/Review/${id}`,
  DELETE: (id: number) => `/api/Review/${id}`,
  BY_PHOTOGRAPHER: (photographerId: number) => `/api/Review/photographer/${photographerId}`,
  BY_BOOKING: (bookingId: number) => `/api/Review/booking/${bookingId}`,
  AVERAGE_RATING: (photographerId: number) => `/api/Review/photographer/${photographerId}/average-rating`,
};

export const reviewService = {
  // Get all reviews
  getAll: (): Promise<Review[]> => 
    apiClient.get<Review[]>(ENDPOINTS.ALL),

  // Get review by ID
  getById: (id: number): Promise<Review> => 
    apiClient.get<Review>(ENDPOINTS.BY_ID(id)),

  // Get reviews by photographer
  getByPhotographer: (photographerId: number): Promise<Review[]> => 
    apiClient.get<Review[]>(ENDPOINTS.BY_PHOTOGRAPHER(photographerId)),

  // Get reviews by booking
  getByBooking: (bookingId: number): Promise<Review[]> => 
    apiClient.get<Review[]>(ENDPOINTS.BY_BOOKING(bookingId)),

  // Get average rating for photographer
  getAverageRating: (photographerId: number): Promise<{ averageRating: number }> => 
    apiClient.get<{ averageRating: number }>(ENDPOINTS.AVERAGE_RATING(photographerId)),

  // Create new review
  create: (data: CreateReviewRequest): Promise<Review> => 
    apiClient.post<Review>(ENDPOINTS.CREATE, data),

  // Update review
  update: (id: number, data: UpdateReviewRequest): Promise<Review> => 
    apiClient.put<Review>(ENDPOINTS.UPDATE(id), data),

  // Delete review
  delete: (id: number): Promise<void> => 
    apiClient.delete<void>(ENDPOINTS.DELETE(id)),

  // === HELPER METHODS ===

  // Get photographer reviews with stats
  getPhotographerReviewsWithStats: async (photographerId: number): Promise<{
    reviews: Review[];
    averageRating: number;
    totalReviews: number;
  }> => {
    try {
      const [reviews, ratingData] = await Promise.all([
        reviewService.getByPhotographer(photographerId),
        reviewService.getAverageRating(photographerId).catch(() => ({ averageRating: 0 }))
      ]);

      return {
        reviews,
        averageRating: ratingData.averageRating,
        totalReviews: reviews.length
      };
    } catch (error) {
      console.error('Error fetching photographer reviews with stats:', error);
      throw error;
    }
  },

  // Check if user can review a booking
  canUserReview: async (bookingId: number, userId: number): Promise<boolean> => {
    try {
      const existingReviews = await reviewService.getByBooking(bookingId);
      const userHasReviewed = existingReviews.some(review => review.reviewerId === userId);
      return !userHasReviewed;
    } catch (error) {
      console.error('Error checking review eligibility:', error);
      return false;
    }
  },

  // Get recent reviews (latest first)
  getRecentReviews: async (photographerId: number, limit: number = 5): Promise<Review[]> => {
    try {
      const reviews = await reviewService.getByPhotographer(photographerId);
      return reviews
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching recent reviews:', error);
      return [];
    }
  },

  // Get rating distribution for photographer
  getRatingDistribution: async (photographerId: number): Promise<Record<1 | 2 | 3 | 4 | 5, number>> => {
    try {
      const reviews = await reviewService.getByPhotographer(photographerId);
      const distribution: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      
      reviews.forEach(review => {
        if (review.rating >= 1 && review.rating <= 5) {
          const rating = review.rating as 1 | 2 | 3 | 4 | 5;
          distribution[rating]++;
        }
      });

      return distribution;
    } catch (error) {
      console.error('Error calculating rating distribution:', error);
      return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    }
  },

  // Validate review data before submission
  validateReviewData: (data: CreateReviewRequest): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!data.bookingId || data.bookingId <= 0) {
      errors.push('Booking ID is required');
    }

    if (!data.reviewerId || data.reviewerId <= 0) {
      errors.push('Reviewer ID is required');
    }

    if (!data.revieweeId || data.revieweeId <= 0) {
      errors.push('Reviewee ID is required');
    }

    if (!data.revieweeType || data.revieweeType.trim() === '') {
      errors.push('Reviewee type is required');
    }

    if (!data.rating || data.rating < 1 || data.rating > 5) {
      errors.push('Rating must be between 1 and 5');
    }

    if (data.comment && data.comment.length > 1000) {
      errors.push('Comment must be less than 1000 characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Submit review with validation
  submitReview: async (data: CreateReviewRequest): Promise<{ success: boolean; review?: Review; errors?: string[] }> => {
    try {
      // Validate data first
      const validation = reviewService.validateReviewData(data);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors
        };
      }

      // Check if user can review this booking
      const canReview = await reviewService.canUserReview(data.bookingId, data.reviewerId);
      if (!canReview) {
        return {
          success: false,
          errors: ['You have already reviewed this booking']
        };
      }

      // Submit review
      const review = await reviewService.create(data);
      return {
        success: true,
        review
      };
    } catch (error) {
      console.error('Error submitting review:', error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to submit review']
      };
    }
  }
};