import { apiClient } from './base';
import type {
  RatingResponse,
  CreateRatingRequest,
  UpdateRatingRequest,
  CreateRatingResult,
  UpdateRatingResult,
  RatingTarget,
  RatingValidationErrors,
  RATING_SCORES
} from '../types/rating';

const RATING_ENDPOINTS = {
  GET_ALL: '/api/Rating/GetRatings',
  GET_BY_ID: (id: number) => `/api/Rating/GetRatingById/${id}`,
  BY_PHOTOGRAPHER: (photographerId: number) => `/api/Rating/ByPhotographer/${photographerId}`,
  BY_LOCATION: (locationId: number) => `/api/Rating/ByLocation/${locationId}`,
  CREATE: '/api/Rating/CreateRating',
  UPDATE: (id: number) => `/api/Rating/UpdateRating/${id}`,
  DELETE: (id: number) => `/api/Rating/DeleteRating/${id}`,
};

export class RatingService {
  
  // ===== VALIDATION METHODS =====
  
  private validateCreateRatingData(ratingData: CreateRatingRequest): RatingValidationErrors {
    const errors: RatingValidationErrors = {};

    if (!ratingData.bookingId || isNaN(ratingData.bookingId) || ratingData.bookingId <= 0) {
      errors.bookingId = 'Booking ID không hợp lệ';
    }

    if (!ratingData.reviewerUserId || isNaN(ratingData.reviewerUserId) || ratingData.reviewerUserId <= 0) {
      errors.reviewerUserId = 'Reviewer User ID không hợp lệ';
    }

    // Validate rating target: must have either photographerId OR locationId, not both or neither
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
  }

  private validateUpdateRatingData(updateData: UpdateRatingRequest): RatingValidationErrors {
    const errors: RatingValidationErrors = {};

    if (!updateData.score || isNaN(updateData.score) || updateData.score < 1 || updateData.score > 5) {
      errors.score = 'Điểm đánh giá phải từ 1 đến 5';
    }

    if (updateData.comment && updateData.comment.trim().length > 1000) {
      errors.comment = 'Nhận xét không được vượt quá 1000 ký tự';
    }

    return errors;
  }

  // ===== CRUD OPERATIONS =====

  /**
   * Create a new rating
   * @param ratingData - Rating data to create
   * @returns Promise<CreateRatingResult>
   */
  async createRating(ratingData: CreateRatingRequest): Promise<CreateRatingResult> {
    try {
      console.log('🎯 Service: Creating rating with data:', ratingData);

      // Validate rating data
      const validationErrors = this.validateCreateRatingData(ratingData);
      if (Object.keys(validationErrors).length > 0) {
        const errorMessage = Object.values(validationErrors).join(', ');
        throw new Error(`Validation failed: ${errorMessage}`);
      }

      // Prepare final payload - ensure null values for unused target
      const finalPayload = {
        bookingId: ratingData.bookingId,
        reviewerUserId: ratingData.reviewerUserId,
        photographerId: ratingData.photographerId || null,
        locationId: ratingData.locationId || null,
        score: ratingData.score,
        comment: ratingData.comment?.trim() || null
      };

      console.log('📤 Service: Sending rating payload:', finalPayload);

      const response = await apiClient.post<any>(RATING_ENDPOINTS.CREATE, finalPayload);
      
      console.log('📦 Service: Rating creation response:', response);

      // Handle API response format
      let apiData;
      if (response.error === 0 && response.data) {
        apiData = response.data;
      } else if (response.data) {
        apiData = response.data;
      } else {
        apiData = response;
      }

      if (!apiData) {
        throw new Error('Empty response from rating API');
      }

      // Normalize rating response
      const rating = Array.isArray(apiData) ? apiData[0] : apiData;

      if (!rating) {
        throw new Error('No rating data in response');
      }

      console.log('✅ Service: Rating created successfully:', rating);
      
      return {
        success: true,
        rating,
        error: undefined
      };
    } catch (error) {
      console.error('❌ Service: Error creating rating:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Không thể tạo đánh giá';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get all ratings
   * @returns Promise<RatingResponse[]>
   */
  async getAllRatings(): Promise<RatingResponse[]> {
    try {
      console.log('📋 Service: Fetching all ratings');
      
      const response = await apiClient.get<any>(RATING_ENDPOINTS.GET_ALL);
      
      // Handle API response format
      let apiData;
      if (response.error === 0 && response.data) {
        apiData = response.data;
      } else if (response.data) {
        apiData = response.data;
      } else {
        apiData = response;
      }

      const ratings = Array.isArray(apiData) ? apiData : (apiData ? [apiData] : []);

      console.log('✅ Service: Fetched ratings successfully:', ratings.length);
      return ratings;
    } catch (error) {
      console.error('❌ Service: Error fetching all ratings:', error);
      throw error;
    }
  }

  /**
   * Get rating by ID
   * @param ratingId - Rating ID to fetch
   * @returns Promise<RatingResponse>
   */
  async getRatingById(ratingId: number): Promise<RatingResponse> {
    try {
      console.log('🔍 Service: Fetching rating by ID:', ratingId);

      if (!ratingId || isNaN(ratingId) || ratingId <= 0) {
        throw new Error('Invalid rating ID');
      }
      
      const response = await apiClient.get<any>(RATING_ENDPOINTS.GET_BY_ID(ratingId));
      
      // Handle API response format
      let apiData;
      if (response.error === 0 && response.data) {
        apiData = response.data;
      } else if (response.data) {
        apiData = response.data;
      } else {
        apiData = response;
      }

      const rating = Array.isArray(apiData) ? apiData[0] : apiData;

      if (!rating) {
        throw new Error('Rating not found');
      }

      console.log('✅ Service: Rating fetched successfully:', rating);
      return rating;
    } catch (error) {
      console.error('❌ Service: Error fetching rating:', error);
      throw error;
    }
  }

  /**
   * Get ratings by photographer ID
   * @param photographerId - Photographer ID
   * @returns Promise<RatingResponse[]>
   */
  async getRatingsByPhotographer(photographerId: number): Promise<RatingResponse[]> {
    try {
      console.log('📸 Service: Fetching ratings for photographer:', photographerId);

      if (!photographerId || isNaN(photographerId) || photographerId <= 0) {
        throw new Error('Invalid photographer ID');
      }
      
      const response = await apiClient.get<any>(RATING_ENDPOINTS.BY_PHOTOGRAPHER(photographerId));
      
      // Handle API response format
      let apiData;
      if (response.error === 0 && response.data) {
        apiData = response.data;
      } else if (response.data) {
        apiData = response.data;
      } else {
        apiData = response;
      }

      const ratings = Array.isArray(apiData) ? apiData : (apiData ? [apiData] : []);

      console.log('✅ Service: Photographer ratings fetched:', ratings.length);
      return ratings;
    } catch (error) {
      console.error('❌ Service: Error fetching photographer ratings:', error);
      throw error;
    }
  }

  /**
   * Get ratings by location ID
   * @param locationId - Location ID
   * @returns Promise<RatingResponse[]>
   */
  async getRatingsByLocation(locationId: number): Promise<RatingResponse[]> {
    try {
      console.log('📍 Service: Fetching ratings for location:', locationId);

      if (!locationId || isNaN(locationId) || locationId <= 0) {
        throw new Error('Invalid location ID');
      }
      
      const response = await apiClient.get<any>(RATING_ENDPOINTS.BY_LOCATION(locationId));
      
      // Handle API response format
      let apiData;
      if (response.error === 0 && response.data) {
        apiData = response.data;
      } else if (response.data) {
        apiData = response.data;
      } else {
        apiData = response;
      }

      const ratings = Array.isArray(apiData) ? apiData : (apiData ? [apiData] : []);

      console.log('✅ Service: Location ratings fetched:', ratings.length);
      return ratings;
    } catch (error) {
      console.error('❌ Service: Error fetching location ratings:', error);
      throw error;
    }
  }

  /**
   * Update rating
   * @param ratingId - Rating ID to update
   * @param updateData - Data to update
   * @returns Promise<UpdateRatingResult>
   */
  async updateRating(ratingId: number, updateData: UpdateRatingRequest): Promise<UpdateRatingResult> {
    try {
      console.log('🔧 Service: Updating rating:', ratingId, updateData);

      if (!ratingId || isNaN(ratingId) || ratingId <= 0) {
        throw new Error('Invalid rating ID');
      }

      // Validate update data
      const validationErrors = this.validateUpdateRatingData(updateData);
      if (Object.keys(validationErrors).length > 0) {
        const errorMessage = Object.values(validationErrors).join(', ');
        throw new Error(`Validation failed: ${errorMessage}`);
      }

      const finalPayload = {
        score: updateData.score,
        comment: updateData.comment?.trim() || null
      };
      
      const response = await apiClient.put<any>(RATING_ENDPOINTS.UPDATE(ratingId), finalPayload);
      
      // Handle API response format
      let apiData;
      if (response.error === 0 && response.data) {
        apiData = response.data;
      } else if (response.data) {
        apiData = response.data;
      } else {
        apiData = response;
      }

      const rating = Array.isArray(apiData) ? apiData[0] : apiData;

      console.log('✅ Service: Rating updated successfully:', rating);
      
      return {
        success: true,
        rating,
        error: undefined
      };
    } catch (error) {
      console.error('❌ Service: Error updating rating:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Không thể cập nhật đánh giá';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Delete rating
   * @param ratingId - Rating ID to delete
   * @returns Promise<boolean>
   */
  async deleteRating(ratingId: number): Promise<boolean> {
    try {
      console.log('🗑️ Service: Deleting rating:', ratingId);

      if (!ratingId || isNaN(ratingId) || ratingId <= 0) {
        throw new Error('Invalid rating ID');
      }
      
      await apiClient.delete<any>(RATING_ENDPOINTS.DELETE(ratingId));

      console.log('✅ Service: Rating deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ Service: Error deleting rating:', error);
      throw error;
    }
  }

  // ===== CONVENIENCE METHODS =====

  /**
   * Create rating for photographer
   * @param bookingId - Booking ID
   * @param reviewerUserId - Reviewer user ID
   * @param photographerId - Photographer ID
   * @param score - Rating score (1-5)
   * @param comment - Optional comment
   * @returns Promise<CreateRatingResult>
   */
  async createPhotographerRating(
    bookingId: number,
    reviewerUserId: number,
    photographerId: number,
    score: number,
    comment?: string
  ): Promise<CreateRatingResult> {
    try {
      const ratingData: CreateRatingRequest = {
        bookingId,
        reviewerUserId,
        photographerId,
        locationId: null, // Explicitly null for photographer rating
        score,
        comment: comment?.trim() || null
      };

      console.log('📸 Service: Creating photographer rating:', ratingData);
      
      return await this.createRating(ratingData);
    } catch (error) {
      console.error('❌ Service: Error creating photographer rating:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Không thể tạo đánh giá photographer'
      };
    }
  }

  /**
   * Create rating for location
   * @param bookingId - Booking ID
   * @param reviewerUserId - Reviewer user ID
   * @param locationId - Location ID
   * @param score - Rating score (1-5)
   * @param comment - Optional comment
   * @returns Promise<CreateRatingResult>
   */
  async createLocationRating(
    bookingId: number,
    reviewerUserId: number,
    locationId: number,
    score: number,
    comment?: string
  ): Promise<CreateRatingResult> {
    try {
      const ratingData: CreateRatingRequest = {
        bookingId,
        reviewerUserId,
        photographerId: null, // Explicitly null for location rating
        locationId,
        score,
        comment: comment?.trim() || null
      };

      console.log('📍 Service: Creating location rating:', ratingData);
      
      return await this.createRating(ratingData);
    } catch (error) {
      console.error('❌ Service: Error creating location rating:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Không thể tạo đánh giá location'
      };
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Get rating label text
   * @param score - Rating score
   * @returns string
   */
  getRatingLabel(score: number): string {
    const labels = {
      1: 'Rất tệ',
      2: 'Tệ',
      3: 'Bình thường',
      4: 'Tốt',
      5: 'Xuất sắc'
    };
    return labels[score as keyof typeof labels] || 'Không xác định';
  }

  /**
   * Get rating color
   * @param score - Rating score
   * @returns string
   */
  getRatingColor(score: number): string {
    const colors = {
      1: '#f44336', // Red
      2: '#ff9800', // Orange
      3: '#ffeb3b', // Yellow
      4: '#8bc34a', // Light Green
      5: '#4caf50'  // Green
    };
    return colors[score as keyof typeof colors] || '#757575';
  }

  /**
   * Calculate average rating
   * @param ratings - Array of ratings
   * @returns number
   */
  calculateAverageRating(ratings: RatingResponse[]): number {
    if (!ratings || ratings.length === 0) return 0;
    
    const total = ratings.reduce((sum, rating) => sum + rating.score, 0);
    return Math.round((total / ratings.length) * 10) / 10; // Round to 1 decimal
  }

  /**
   * Get rating distribution
   * @param ratings - Array of ratings
   * @returns object with score distribution
   */
  getRatingDistribution(ratings: RatingResponse[]): Record<number, number> {
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    
    ratings.forEach(rating => {
      if (rating.score >= 1 && rating.score <= 5) {
        distribution[rating.score as 1 | 2 | 3 | 4 | 5]++;
      }
    });
    
    return distribution;
  }

  /**
   * Validate rating target
   * @param photographerId - Photographer ID (optional)
   * @param locationId - Location ID (optional)
   * @returns object with validation result
   */
  validateRatingTarget(photographerId?: number | null, locationId?: number | null): {
    isValid: boolean;
    target: RatingTarget | null;
    error?: string;
  } {
    const hasPhotographerId = photographerId && photographerId > 0;
    const hasLocationId = locationId && locationId > 0;

    if (!hasPhotographerId && !hasLocationId) {
      return {
        isValid: false,
        target: null,
        error: 'Phải chọn đánh giá cho photographer hoặc location'
      };
    }

    if (hasPhotographerId && hasLocationId) {
      return {
        isValid: false,
        target: null,
        error: 'Chỉ có thể đánh giá photographer HOẶC location, không được cả hai'
      };
    }

    return {
      isValid: true,
      target: hasPhotographerId ? 'photographer' : 'location'
    };
  }

  // ===== TEST & DEBUG METHODS =====

  /**
   * Test create photographer rating
   * @param testBookingId - Test booking ID
   * @param testUserId - Test user ID
   * @param testPhotographerId - Test photographer ID
   * @returns Promise<CreateRatingResult>
   */
  async testCreatePhotographerRating(
    testBookingId: number,
    testUserId: number,
    testPhotographerId: number
  ): Promise<CreateRatingResult> {
    try {
      console.log('🧪 Service: Testing photographer rating creation');
      
      return await this.createPhotographerRating(
        testBookingId,
        testUserId,
        testPhotographerId,
        5,
        'Test photographer rating'
      );
    } catch (error) {
      console.error('🧪 Test photographer rating failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed'
      };
    }
  }

  /**
   * Test create location rating
   * @param testBookingId - Test booking ID
   * @param testUserId - Test user ID
   * @param testLocationId - Test location ID
   * @returns Promise<CreateRatingResult>
   */
  async testCreateLocationRating(
    testBookingId: number,
    testUserId: number,
    testLocationId: number
  ): Promise<CreateRatingResult> {
    try {
      console.log('🧪 Service: Testing location rating creation');
      
      return await this.createLocationRating(
        testBookingId,
        testUserId,
        testLocationId,
        4,
        'Test location rating'
      );
    } catch (error) {
      console.error('🧪 Test location rating failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed'
      };
    }
  }
}

// Export singleton instance
export const ratingService = new RatingService();