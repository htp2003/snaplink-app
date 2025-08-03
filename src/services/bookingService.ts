// services/bookingService.ts - ONLY BOOKING FUNCTIONS

import { apiClient } from './base';
import type {
  CreateBookingRequest,
  UpdateBookingRequest,
  BookingResponse,
  BookingListResponse,
  PriceCalculationResponse
} from '../types/booking';
import type { CheckAvailabilityResponse } from '../types/availability'; 

const BOOKING_ENDPOINTS = {
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
  
  // Helper method to extract booking ID from response
  private extractBookingId(response: any): number {
    if (response.bookingId) return response.bookingId;  
    if (response.id) return response.id;
    if (response.data?.bookingId) return response.data.bookingId;
    if (response.data?.id) return response.data.id;
    
    console.error('Could not extract booking ID from response:', response);
    throw new Error('Invalid booking response - missing ID');
  }

  // ===== BOOKING CRUD METHODS =====
  
  async createBooking(userId: number, data: CreateBookingRequest): Promise<BookingResponse> {
    try {
      console.log('📝 Creating booking for user:', userId);
      console.log('📝 Booking data:', JSON.stringify(data, null, 2));
      
      const response = await apiClient.post<any>(
        BOOKING_ENDPOINTS.CREATE(userId), 
        data
      );
      
      console.log('📦 Raw booking creation response:', JSON.stringify(response, null, 2));
      
      // Handle different response structures
      let bookingData;
      if (response.data) {
        bookingData = response.data;
      } else if (response.booking) {
        bookingData = response.booking;
      } else {
        bookingData = response;
      }
      
      // Validate response has required ID
      const bookingId = this.extractBookingId(bookingData);
      console.log('📌 Extracted booking ID:', bookingId);
      
      // Ensure the response has the correct structure
      const bookingResponse: BookingResponse = {
        ...bookingData,
        id: bookingId,
        bookingId: bookingId, // Ensure both fields are present
      };
      
      console.log('✅ Booking created successfully:', {
        id: bookingResponse.id,
        bookingId: bookingResponse.bookingId,
        userId: bookingResponse.userId,
        status: bookingResponse.status
      });
      
      return bookingResponse;
    } catch (error) {
      console.error('❌ Error creating booking:', error);
      throw error;
    }
  }

  async getBookingById(bookingId: number): Promise<BookingResponse> {
    try {
      console.log('🔍 Fetching booking by ID:', bookingId);
      
      const response = await apiClient.get<any>(
        BOOKING_ENDPOINTS.GET_BY_ID(bookingId)
      );
      
      console.log('📦 Raw getBookingById response:', JSON.stringify(response, null, 2));
      
      // Handle different response structures
      let bookingData;
      if (response.data) {
        bookingData = response.data;
      } else if (response.booking) {
        bookingData = response.booking;
      } else if (response.bookingId || response.id) {
        bookingData = response;
      } else {
        console.error('❌ Unexpected response structure:', response);
        throw new Error('Invalid booking response structure');
      }
      
      // ✅ SỬA: Map đúng field names từ API response
      const normalizedBooking: BookingResponse = {
        // ✅ API trả về bookingId, map thành cả id và bookingId
        id: bookingData.bookingId || bookingData.id || bookingId,
        bookingId: bookingData.bookingId || bookingData.id || bookingId,
        
        // Required fields
        userId: bookingData.userId || 0,
        photographerId: bookingData.photographerId || 0,
        
        // DateTime fields  
        startDatetime: bookingData.startDatetime || '',
        endDatetime: bookingData.endDatetime || '',
        
        // Location
        locationId: bookingData.locationId,
        externalLocation: bookingData.externalLocation,
        
        // Requests
        specialRequests: bookingData.specialRequests,
        
        // ✅ API trả về totalPrice, map thành totalAmount
        status: bookingData.status || 'pending',
        totalPrice: bookingData.totalPrice || bookingData.totalAmount || 0,
        
        // Timestamps
        createdAt: bookingData.createdAt || new Date().toISOString(),
        updatedAt: bookingData.updatedAt || new Date().toISOString(),
        
        // ✅ THÊM: Extended fields từ API response
        photographer: bookingData.photographerName ? {
          photographerId: bookingData.photographerId,
          fullName: bookingData.photographerName,
          profileImage: '', // API không trả về
          hourlyRate: bookingData.pricePerHour || 0
        } : undefined,
        
        location: bookingData.locationName ? {
          locationId: bookingData.locationId,
          name: bookingData.locationName,
          address: bookingData.locationAddress,
          hourlyRate: bookingData.pricePerHour
        } : undefined
      };
      
      console.log('✅ Booking normalized successfully:', {
        id: normalizedBooking.id,
        bookingId: normalizedBooking.bookingId,
        userId: normalizedBooking.userId,
        photographerId: normalizedBooking.photographerId,
        status: normalizedBooking.status,
        totalPrice: normalizedBooking.totalPrice,
        originalTotalPrice: bookingData.totalPrice, // Original từ API
        hasPayment: bookingData.hasPayment,
        paymentStatus: bookingData.paymentStatus
      });
      
      return normalizedBooking;
    } catch (error) {
      console.error('❌ Error fetching booking by ID:', error);
      throw error;
    }
  }

  async updateBooking(bookingId: number, data: UpdateBookingRequest): Promise<BookingResponse> {
    try {
      console.log('📝 Updating booking:', bookingId, data);
      const response = await apiClient.put<BookingResponse>(
        BOOKING_ENDPOINTS.UPDATE(bookingId),
        data
      );
      console.log('✅ Booking updated successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Error updating booking:', error);
      throw error;
    }
  }

  async getUserBookings(
    userId: number, 
    page: number = 1, 
    pageSize: number = 50
  ): Promise<BookingListResponse> {
    try {
      console.log('📋 Fetching user bookings:', { userId, page, pageSize });
      const response = await apiClient.get<any>(
        `${BOOKING_ENDPOINTS.GET_USER_BOOKINGS(userId)}?page=${page}&pageSize=${pageSize}`
      );
      
      
      if (response.data && response.error === 0) {
        const normalizedBookings = response.data.bookings.map((bookingData: any) => ({
          
          ...bookingData,
          id: bookingData.bookingId || bookingData.id,
          bookingId: bookingData.bookingId || bookingData.id,
          totalPrice: bookingData.totalPrice || bookingData.totalAmount || 0,
          
          
          photographer: bookingData.photographerName ? {
            photographerId: bookingData.photographerId,
            fullName: bookingData.photographerName,
            profileImage: '',
            hourlyRate: bookingData.pricePerHour || 0
          } : undefined,
          
          location: bookingData.locationName ? {
            locationId: bookingData.locationId,
            name: bookingData.locationName,
            address: bookingData.locationAddress,
            hourlyRate: bookingData.pricePerHour
          } : undefined
        }));
        
        return {
          ...response.data,
          bookings: normalizedBookings
        };
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error fetching user bookings:', error);
      throw error;
    }
  }

  async getPhotographerBookings(
    photographerId: number,
    page: number = 1,
    pageSize: number = 10
  ): Promise<BookingListResponse> {
    try {
      console.log('📋 Fetching photographer bookings:', { photographerId, page, pageSize });
      const response = await apiClient.get<BookingListResponse>(
        `${BOOKING_ENDPOINTS.GET_PHOTOGRAPHER_BOOKINGS(photographerId)}?page=${page}&pageSize=${pageSize}`
      );
      console.log('✅ Photographer bookings fetched:', response);
      return response;
    } catch (error) {
      console.error('❌ Error fetching photographer bookings:', error);
      throw error;
    }
  }

  async cancelBooking(bookingId: number): Promise<void> {
    try {
      console.log('❌ Cancelling booking:', bookingId);
      await apiClient.put<void>(BOOKING_ENDPOINTS.CANCEL(bookingId));
      console.log('✅ Booking cancelled successfully');
    } catch (error) {
      console.error('❌ Error cancelling booking:', error);
      throw error;
    }
  }

  async completeBooking(bookingId: number): Promise<void> {
    try {
      console.log('✅ Completing booking:', bookingId);
      await apiClient.put<void>(BOOKING_ENDPOINTS.COMPLETE(bookingId));
      console.log('✅ Booking completed successfully');
    } catch (error) {
      console.error('❌ Error completing booking:', error);
      throw error;
    }
  }

  // ===== AVAILABILITY METHODS =====
  
  async checkPhotographerAvailability(
    photographerId: number,
    startTime: string,
    endTime: string
  ): Promise<CheckAvailabilityResponse> {
    try {
      console.log('🔍 Checking photographer availability:', { photographerId, startTime, endTime });
      const params = new URLSearchParams({
        startTime,
        endTime
      });
      
      const response = await apiClient.get<any>(
        `${BOOKING_ENDPOINTS.PHOTOGRAPHER_AVAILABILITY(photographerId)}?${params}`
      );
      
      console.log('📦 Raw photographer availability response:', response);
      
      // Normalize response format
      const responseData = response.data || response;
      let available = false;
      
      if (typeof responseData.available === 'boolean') {
        available = responseData.available;
      } else if (typeof responseData.isAvailable === 'boolean') {
        available = responseData.isAvailable;
      } else if (typeof responseData.isAvailable === 'string') {
        available = responseData.isAvailable === 'true';
      }
      
      const normalizedResponse: CheckAvailabilityResponse = {
        available,
        conflictingBookings: responseData.conflictingBookings || [],
        suggestedTimes: responseData.suggestedTimes || [],
        message: responseData.message
      };
      
      console.log('✅ Normalized photographer availability:', normalizedResponse);
      return normalizedResponse;
    } catch (error) {
      console.error('❌ Error checking photographer availability:', error);
      return { 
        available: false, 
        conflictingBookings: [], 
        suggestedTimes: [],
        message: 'Không thể kiểm tra tình trạng photographer'
      };
    }
  }

  async checkLocationAvailability(
    locationId: number,
    startTime: string,
    endTime: string
  ): Promise<CheckAvailabilityResponse> {
    try {
      console.log('🔍 Checking location availability:', { locationId, startTime, endTime });
      const params = new URLSearchParams({
        startTime,
        endTime
      });
      
      const response = await apiClient.get<any>(
        `${BOOKING_ENDPOINTS.LOCATION_AVAILABILITY(locationId)}?${params}`
      );
      
      console.log('📦 Raw location availability response:', response);

      const responseData = response.data || response;
      let available = false;
      
      if (typeof responseData.available === 'boolean') {
        available = responseData.available;
      } else if (typeof responseData.isAvailable === 'boolean') {
        available = responseData.isAvailable;
      } else if (typeof responseData.isAvailable === 'string') {
        available = responseData.isAvailable === 'true';
      }
      
      const normalizedResponse: CheckAvailabilityResponse = {
        available,
        conflictingBookings: responseData.conflictingBookings || [],
        suggestedTimes: responseData.suggestedTimes || [],
        message: responseData.message
      };
      
      console.log('✅ Normalized location availability:', normalizedResponse);
      return normalizedResponse;
    } catch (error) {
      console.error('❌ Error checking location availability:', error);
      return { 
        available: false, 
        conflictingBookings: [], 
        suggestedTimes: [],
        message: 'Không thể kiểm tra tình trạng địa điểm'
      };
    }
  }

  // ===== PRICING METHODS =====

  async calculatePrice(
    photographerId: number,
    startTime: string,
    endTime: string,
    locationId?: number
  ): Promise<PriceCalculationResponse> {
    try {
      console.log('💰 Calculating booking price:', { photographerId, startTime, endTime, locationId });
      
      const params = new URLSearchParams({
        photographerId: photographerId.toString(),
        startTime,
        endTime
      });

      if (locationId) {
        params.append('locationId', locationId.toString());
      }

      const response = await apiClient.get<PriceCalculationResponse>(
        `${BOOKING_ENDPOINTS.CALCULATE_PRICE}?${params}`
      );
      console.log('✅ Price calculation result:', response);
      return response;
    } catch (error) {
      console.error('❌ Error calculating price:', error);
      throw error;
    }
  }

  // ===== ADMIN METHODS =====
  
  async cleanupExpiredBookings(): Promise<void> {
    try {
      console.log('🧹 Cleaning up expired bookings');
      await apiClient.post<void>(BOOKING_ENDPOINTS.CLEANUP_EXPIRED);
      console.log('✅ Expired bookings cleaned up successfully');
    } catch (error) {
      console.error('❌ Error cleaning up expired bookings:', error);
      throw error;
    }
  }

  async cleanupAllPendingBookings(): Promise<void> {
    try {
      console.log('🧹 Cleaning up all pending bookings');
      await apiClient.post<void>(BOOKING_ENDPOINTS.CLEANUP_PENDING);
      console.log('✅ All pending bookings cleaned up successfully');
    } catch (error) {
      console.error('❌ Error cleaning up pending bookings:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====
  
  async getBookingWithAvailabilityCheck(
    bookingId: number,
    photographerId: number,
    startTime: string,
    endTime: string,
    locationId?: number
  ): Promise<{
    booking: BookingResponse;
    availability: CheckAvailabilityResponse;
  }> {
    try {
      console.log('🔍 Fetching booking with availability check');
      
      const [booking, availability] = await Promise.all([
        this.getBookingById(bookingId),
        this.checkPhotographerAvailability(photographerId, startTime, endTime)
      ]);
      
      return { booking, availability };
    } catch (error) {
      console.error('❌ Error fetching booking with availability:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const bookingService = new BookingService();