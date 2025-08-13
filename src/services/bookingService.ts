// services/bookingService.ts - ONLY BOOKING FUNCTIONS

import { apiClient } from "./base";
import type {
  CreateBookingRequest,
  UpdateBookingRequest,
  BookingResponse,
  BookingListResponse,
  PriceCalculationResponse,
} from "../types/booking";
import type { CheckAvailabilityResponse } from "../types/availability";

const BOOKING_ENDPOINTS = {
  CREATE: (userId: number) => `/api/Booking/create?userId=${userId}`,
  GET_BY_ID: (bookingId: number) => `/api/Booking/${bookingId}`,
  UPDATE: (bookingId: number) => `/api/Booking/${bookingId}`,
  GET_USER_BOOKINGS: (userId: number) => `/api/Booking/user/${userId}`,
  GET_PHOTOGRAPHER_BOOKINGS: (photographerId: number) =>
    `/api/Booking/photographer/${photographerId}`,
  CANCEL: (bookingId: number) => `/api/Booking/${bookingId}/cancel`,
  COMPLETE: (bookingId: number) => `/api/Booking/${bookingId}/complete`,
  CONFIRM: (bookingId: number) => `/api/Booking/${bookingId}/confirm`,
  PHOTOGRAPHER_AVAILABILITY: (photographerId: number) =>
    `/api/Booking/availability/photographer/${photographerId}`,
  LOCATION_AVAILABILITY: (locationId: number) =>
    `/api/Booking/availability/location/${locationId}`,
  CALCULATE_PRICE: "/api/Booking/calculate-price",
  CLEANUP_EXPIRED: "/api/Booking/cleanup-expired",
  CLEANUP_PENDING: "/api/Booking/cleanup-all-pending",
};

export class BookingService {
  // Helper method to extract booking ID from response
  private extractBookingId(response: any): number {
    if (response.bookingId) return response.bookingId;
    if (response.id) return response.id;
    if (response.data?.bookingId) return response.data.bookingId;
    if (response.data?.id) return response.data.id;

    console.error("Could not extract booking ID from response:", response);
    throw new Error("Invalid booking response - missing ID");
  }

  // ===== BOOKING CRUD METHODS =====

  async createBooking(
    userId: number,
    data: CreateBookingRequest
  ): Promise<BookingResponse> {
    try {
      const response = await apiClient.post<any>(
        BOOKING_ENDPOINTS.CREATE(userId),
        data
      );

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

      // Ensure the response has the correct structure
      const bookingResponse: BookingResponse = {
        ...bookingData,
        id: bookingId,
        bookingId: bookingId, // Ensure both fields are present
      };

      return bookingResponse;
    } catch (error) {
      console.error("❌ Error creating booking:", error);
      throw error;
    }
  }

  async getBookingById(bookingId: number): Promise<BookingResponse> {
    try {
      const response = await apiClient.get<any>(
        BOOKING_ENDPOINTS.GET_BY_ID(bookingId)
      );

      // Handle different response structures
      let bookingData;
      if (response.data) {
        bookingData = response.data;
      } else if (response.booking) {
        bookingData = response.booking;
      } else if (response.bookingId || response.id) {
        bookingData = response;
      } else {
        console.error("❌ Unexpected response structure:", response);
        throw new Error("Invalid booking response structure");
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
        startDatetime: bookingData.startDatetime || "",
        endDatetime: bookingData.endDatetime || "",

        // Location
        locationId: bookingData.locationId,
        externalLocation: bookingData.externalLocation,

        // Requests
        specialRequests: bookingData.specialRequests,

        // ✅ API trả về totalPrice, map thành totalAmount
        status: bookingData.status || "pending",
        totalPrice: bookingData.totalPrice || 0,
        escrowBalance: bookingData.escrowBalance || 0,

        // Timestamps
        createdAt: bookingData.createdAt || new Date().toISOString(),
        updatedAt: bookingData.updatedAt || new Date().toISOString(),

        // ✅ THÊM: Extended fields từ API response
        photographer: bookingData.photographerName
          ? {
              photographerId: bookingData.photographerId,
              fullName: bookingData.photographerName,
              profileImage: "", // API không trả về
              hourlyRate: bookingData.pricePerHour || 0,
            }
          : undefined,

        location: bookingData.locationName
          ? {
              id: bookingData.locationId,
              locationId: bookingData.locationId,
              name: bookingData.locationName,
              address: bookingData.locationAddress,
              hourlyRate: bookingData.pricePerHour,
            }
          : undefined,
      };

      return normalizedBooking;
    } catch (error) {
      console.error("❌ Error fetching booking by ID:", error);
      throw error;
    }
  }

  async updateBooking(
    bookingId: number,
    data: UpdateBookingRequest
  ): Promise<BookingResponse> {
    try {
      const response = await apiClient.put<BookingResponse>(
        BOOKING_ENDPOINTS.UPDATE(bookingId),
        data
      );

      return response;
    } catch (error) {
      console.error("❌ Error updating booking:", error);
      throw error;
    }
  }

  async getUserBookings(
    userId: number,
    page: number = 1,
    pageSize: number = 50
  ): Promise<BookingListResponse> {
    try {
      const response = await apiClient.get<any>(
        `${BOOKING_ENDPOINTS.GET_USER_BOOKINGS(
          userId
        )}?page=${page}&pageSize=${pageSize}`
      );

      if (response.data && response.error === 0) {
        const normalizedBookings = response.data.bookings.map(
          (bookingData: any) => ({
            ...bookingData,
            id: bookingData.bookingId || bookingData.id,
            bookingId: bookingData.bookingId || bookingData.id,
            totalPrice: bookingData.totalPrice || bookingData.totalAmount || 0,

            photographer: bookingData.photographerName
              ? {
                  photographerId: bookingData.photographerId,
                  fullName: bookingData.photographerName,
                  profileImage: "",
                  hourlyRate: bookingData.pricePerHour || 0,
                }
              : undefined,

            location: bookingData.locationName
              ? {
                  locationId: bookingData.locationId,
                  name: bookingData.locationName,
                  address: bookingData.locationAddress,
                  hourlyRate: bookingData.pricePerHour,
                }
              : undefined,
          })
        );

        return {
          ...response.data,
          bookings: normalizedBookings,
        };
      }

      return response;
    } catch (error) {
      console.error("❌ Error fetching user bookings:", error);
      throw error;
    }
  }

  async getPhotographerBookings(
    photographerId: number,
    page: number = 1,
    pageSize: number = 10
  ): Promise<BookingListResponse> {
    try {
      const response = await apiClient.get<BookingListResponse>(
        `${BOOKING_ENDPOINTS.GET_PHOTOGRAPHER_BOOKINGS(
          photographerId
        )}?page=${page}&pageSize=${pageSize}`
      );

      return response;
    } catch (error) {
      console.error("❌ Error fetching photographer bookings:", error);
      throw error;
    }
  }

  async cancelBooking(bookingId: number): Promise<void> {
    try {
      await apiClient.put<void>(BOOKING_ENDPOINTS.CANCEL(bookingId));
    } catch (error) {
      console.error("❌ Error cancelling booking:", error);
      throw error;
    }
  }

  async completeBooking(bookingId: number): Promise<void> {
    try {
      await apiClient.put<void>(BOOKING_ENDPOINTS.COMPLETE(bookingId));
    } catch (error) {
      console.error("❌ Error completing booking:", error);
      throw error;
    }
  }

   async confirmBooking(bookingId: number): Promise<void> {
    try {
      console.log(`🔄 Confirming booking ${bookingId}...`);
      await apiClient.put<void>(BOOKING_ENDPOINTS.CONFIRM(bookingId));
      console.log(`✅ Booking ${bookingId} confirmed successfully`);
    } catch (error) {
      console.error("❌ Error confirming booking:", error);
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
      const params = new URLSearchParams({
        startTime,
        endTime,
      });

      const response = await apiClient.get<any>(
        `${BOOKING_ENDPOINTS.PHOTOGRAPHER_AVAILABILITY(
          photographerId
        )}?${params}`
      );

      // Normalize response format
      const responseData = response.data || response;
      let available = false;

      if (typeof responseData.available === "boolean") {
        available = responseData.available;
      } else if (typeof responseData.isAvailable === "boolean") {
        available = responseData.isAvailable;
      } else if (typeof responseData.isAvailable === "string") {
        available = responseData.isAvailable === "true";
      }

      const normalizedResponse: CheckAvailabilityResponse = {
        available,
        conflictingBookings: responseData.conflictingBookings || [],
        suggestedTimes: responseData.suggestedTimes || [],
        message: responseData.message,
      };

      return normalizedResponse;
    } catch (error) {
      console.error("❌ Error checking photographer availability:", error);
      return {
        available: false,
        conflictingBookings: [],
        suggestedTimes: [],
        message: "Không thể kiểm tra tình trạng photographer",
      };
    }
  }

  async checkLocationAvailability(
    locationId: number,
    startTime: string,
    endTime: string
  ): Promise<CheckAvailabilityResponse> {
    try {
      const params = new URLSearchParams({
        startTime,
        endTime,
      });

      const response = await apiClient.get<any>(
        `${BOOKING_ENDPOINTS.LOCATION_AVAILABILITY(locationId)}?${params}`
      );

      const responseData = response.data || response;
      let available = false;

      if (typeof responseData.available === "boolean") {
        available = responseData.available;
      } else if (typeof responseData.isAvailable === "boolean") {
        available = responseData.isAvailable;
      } else if (typeof responseData.isAvailable === "string") {
        available = responseData.isAvailable === "true";
      }

      const normalizedResponse: CheckAvailabilityResponse = {
        available,
        conflictingBookings: responseData.conflictingBookings || [],
        suggestedTimes: responseData.suggestedTimes || [],
        message: responseData.message,
      };

      return normalizedResponse;
    } catch (error) {
      console.error("❌ Error checking location availability:", error);
      return {
        available: false,
        conflictingBookings: [],
        suggestedTimes: [],
        message: "Không thể kiểm tra tình trạng địa điểm",
      };
    }
  }

  // ===== PRICING METHODS =====

  async calculatePrice(
    photographerId: number,
    startTime: string,
    endTime: string,
    locationId: number
  ): Promise<PriceCalculationResponse> {
    try {
      const params = new URLSearchParams({
        photographerId: photographerId.toString(),
        startTime,
        endTime,
      });

      if (locationId) {
        params.append("locationId", locationId.toString());
      }

      const response = await apiClient.get<PriceCalculationResponse>(
        `${BOOKING_ENDPOINTS.CALCULATE_PRICE}?${params}`
      );

      return response;
    } catch (error) {
      console.error("❌ Error calculating price:", error);
      throw error;
    }
  }

  // ===== ADMIN METHODS =====

  async cleanupExpiredBookings(): Promise<void> {
    try {
      await apiClient.post<void>(BOOKING_ENDPOINTS.CLEANUP_EXPIRED);
    } catch (error) {
      console.error("❌ Error cleaning up expired bookings:", error);
      throw error;
    }
  }

  async cleanupAllPendingBookings(): Promise<void> {
    try {
      await apiClient.post<void>(BOOKING_ENDPOINTS.CLEANUP_PENDING);
    } catch (error) {
      console.error("❌ Error cleaning up pending bookings:", error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  async getBookingWithAvailabilityCheck(
    bookingId: number,
    photographerId: number,
    startTime: string,
    endTime: string,
    locationId: number
  ): Promise<{
    booking: BookingResponse;
    availability: CheckAvailabilityResponse;
  }> {
    try {
      const [booking, availability] = await Promise.all([
        this.getBookingById(bookingId),
        this.checkPhotographerAvailability(photographerId, startTime, endTime),
      ]);

      return { booking, availability };
    } catch (error) {
      console.error("❌ Error fetching booking with availability:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const bookingService = new BookingService();
