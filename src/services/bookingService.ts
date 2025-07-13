// services/bookingService.ts
import { apiClient } from './base';
import type {
  CreateBookingRequest,
  UpdateBookingRequest,
  BookingResponse,
  BookingListResponse,
  AvailabilityResponse,
  PriceCalculationResponse,
  BookingFilters
} from '../types/booking';

const ENDPOINTS = {
  CREATE: (userId: number) => `/api/Booking/create?userId=${userId}`,
  GET_BY_ID: (bookingId: number) => `/api/Booking/${bookingId}`,
  UPDATE: (bookingId: number) => `/api/Booking/${bookingId}`,
  GET_USER_BOOKINGS: (userId: number) => `/api/Booking/user/${userId}`,
  GET_PHOTOGRAPHER_BOOKINGS: (photographerId: number) => `/api/Booking/photographer/${photographerId}`,
  CANCEL: (bookingId: number) => `/api/Booking/${bookingId}/cancel`,
  COMPLETE: (bookingId: number) => `/api/Booking/${bookingId}/complete`,
  PHOTOGRAPHER_AVAILABILITY: (photographerId: number) => `/api/Booking/availability/photographer/${photographerId}`,
  LOCATION_AVAILABILITY: (locationId: number) => `/api/Booking/availability/location/${locationId}`,
  CALCULATE_PRICE: '/api/Booking/calculate-price',
  CLEANUP_EXPIRED: '/api/Booking/cleanup-expired',
  CLEANUP_PENDING: '/api/Booking/cleanup-all-pending'
};

export class BookingService {
  
  // Create new booking
  async createBooking(userId: number, data: CreateBookingRequest): Promise<BookingResponse> {
    try {
      console.log('Creating booking for user:', userId, data);
      const response = await apiClient.post<BookingResponse>(
        ENDPOINTS.CREATE(userId), 
        data
      );
      console.log('Booking created successfully:', response);
      return response;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  // Get booking by ID
  async getBookingById(bookingId: number): Promise<BookingResponse> {
    try {
      console.log('Fetching booking by ID:', bookingId);
      const response = await apiClient.get<BookingResponse>(
        ENDPOINTS.GET_BY_ID(bookingId)
      );
      console.log('Booking fetched:', response);
      return response;
    } catch (error) {
      console.error('Error fetching booking by ID:', error);
      throw error;
    }
  }

  // Update booking
  async updateBooking(bookingId: number, data: UpdateBookingRequest): Promise<BookingResponse> {
    try {
      console.log('Updating booking:', bookingId, data);
      const response = await apiClient.put<BookingResponse>(
        ENDPOINTS.UPDATE(bookingId),
        data
      );
      console.log('Booking updated successfully:', response);
      return response;
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  }

  // Get user bookings with pagination
  async getUserBookings(
    userId: number, 
    page: number = 1, 
    pageSize: number = 10
  ): Promise<BookingListResponse> {
    try {
      console.log('Fetching user bookings:', { userId, page, pageSize });
      const response = await apiClient.get<BookingListResponse>(
        `${ENDPOINTS.GET_USER_BOOKINGS(userId)}?page=${page}&pageSize=${pageSize}`
      );
      console.log('User bookings fetched:', response);
      return response;
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      throw error;
    }
  }

  // Get photographer bookings with pagination
  async getPhotographerBookings(
    photographerId: number,
    page: number = 1,
    pageSize: number = 10
  ): Promise<BookingListResponse> {
    try {
      console.log('Fetching photographer bookings:', { photographerId, page, pageSize });
      const response = await apiClient.get<BookingListResponse>(
        `${ENDPOINTS.GET_PHOTOGRAPHER_BOOKINGS(photographerId)}?page=${page}&pageSize=${pageSize}`
      );
      console.log('Photographer bookings fetched:', response);
      return response;
    } catch (error) {
      console.error('Error fetching photographer bookings:', error);
      throw error;
    }
  }

  // Cancel booking
  async cancelBooking(bookingId: number): Promise<void> {
    try {
      console.log('Cancelling booking:', bookingId);
      await apiClient.put<void>(ENDPOINTS.CANCEL(bookingId));
      console.log('Booking cancelled successfully');
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }

  // Complete booking
  async completeBooking(bookingId: number): Promise<void> {
    try {
      console.log('Completing booking:', bookingId);
      await apiClient.put<void>(ENDPOINTS.COMPLETE(bookingId));
      console.log('Booking completed successfully');
    } catch (error) {
      console.error('Error completing booking:', error);
      throw error;
    }
  }

  // Check photographer availability
  async checkPhotographerAvailability(
    photographerId: number,
    startTime: string,
    endTime: string
  ): Promise<AvailabilityResponse> {
    try {
      console.log('Checking photographer availability:', { photographerId, startTime, endTime });
      const params = new URLSearchParams({
        startTime,
        endTime
      });
      
      const response = await apiClient.get<AvailabilityResponse | { available: boolean }>(
        `${ENDPOINTS.PHOTOGRAPHER_AVAILABILITY(photographerId)}?${params}`
      );
      
      console.log('Raw photographer availability response:', response);
      
      // Handle different response formats from API
      const responseData = (response as any).data || response;
      let available = false;
      if (typeof responseData.available === 'boolean') {
        available = responseData.available;
      } else if (typeof responseData.isAvailable === 'boolean') {
        available = responseData.isAvailable;
      } else if (typeof responseData.isAvailable === 'string') {
        available = responseData.isAvailable === 'true';
      }
      const normalizedResponse: AvailabilityResponse = {
        available,
        conflictingBookings: responseData.conflictingBookings || [],
        suggestedTimes: responseData.suggestedTimes || []
      };
      
      console.log('Normalized photographer availability:', normalizedResponse);
      return normalizedResponse;
    } catch (error) {
      console.error('Error checking photographer availability:', error);
      // Return default unavailable response on error
      return { 
        available: false, 
        conflictingBookings: [], 
        suggestedTimes: [] 
      };
    }
  }

  // Check location availability
  async checkLocationAvailability(
    locationId: number,
    startTime: string,
    endTime: string
  ): Promise<AvailabilityResponse> {
    try {
      console.log('Checking location availability:', { locationId, startTime, endTime });
      const params = new URLSearchParams({
        startTime,
        endTime
      });
      
      const response = await apiClient.get<AvailabilityResponse | { available: boolean }>(
        `${ENDPOINTS.LOCATION_AVAILABILITY(locationId)}?${params}`
      );
      
      console.log('Raw location availability response:', response);

      const responseData = (response as any).data || response;
      console.log('responseData:', responseData);

      let available = false;
if (typeof responseData.available === 'boolean') {
  available = responseData.available;
} else if (typeof responseData.isAvailable === 'boolean') {
  available = responseData.isAvailable;
} else if (typeof responseData.isAvailable === 'string') {
  available = responseData.isAvailable === 'true';
}
      
      // Handle different response formats from API
      const normalizedResponse: AvailabilityResponse = {
        available,
        conflictingBookings: responseData.conflictingBookings || [],
        suggestedTimes: responseData.suggestedTimes || []
      };
      
      console.log('Normalized location availability:', normalizedResponse);
      return normalizedResponse;
    } catch (error) {
      console.error('Error checking location availability:', error);
      return { 
        available: false, 
        conflictingBookings: [], 
        suggestedTimes: [] 
      };
    }
  }

  // Calculate booking price
  async calculatePrice(
    photographerId: number,
    startTime: string,
    endTime: string,
    locationId?: number
  ): Promise<PriceCalculationResponse> {
    try {
      console.log('Calculating booking price:', { photographerId, startTime, endTime, locationId });
      
      const params = new URLSearchParams({
        photographerId: photographerId.toString(),
        startTime,
        endTime
      });

      if (locationId) {
        params.append('locationId', locationId.toString());
      }

      const response = await apiClient.get<PriceCalculationResponse>(
        `${ENDPOINTS.CALCULATE_PRICE}?${params}`
      );
      console.log('Price calculation result:', response);
      return response;
    } catch (error) {
      console.error('Error calculating price:', error);
      throw error;
    }
  }

  // Admin: Cleanup expired bookings
  async cleanupExpiredBookings(): Promise<void> {
    try {
      console.log('Cleaning up expired bookings');
      await apiClient.post<void>(ENDPOINTS.CLEANUP_EXPIRED);
      console.log('Expired bookings cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up expired bookings:', error);
      throw error;
    }
  }

  // Admin: Cleanup all pending bookings
  async cleanupAllPendingBookings(): Promise<void> {
    try {
      console.log('Cleaning up all pending bookings');
      await apiClient.post<void>(ENDPOINTS.CLEANUP_PENDING);
      console.log('All pending bookings cleaned up successfully');
    } catch (error) {
      console.error('Error cleaning up pending bookings:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const bookingService = new BookingService();