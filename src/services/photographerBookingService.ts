// services/photographerBookingService.ts

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Booking,
  BookingListResponse,
  BookingQueryParams,
  UpdateBookingStatusRequest,
  ApiResponse,
} from "../types/booking";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

class BookingService {
  // ✅ FIX: Get token from AsyncStorage
  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem("token");

      return token;
    } catch (error) {
      console.error("❌ Error getting token from AsyncStorage:", error);
      return null;
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const token = await this.getAuthToken(); // ✅ Get real token

      if (!token) {
        throw new Error("No authentication token found. Please login again.");
      }

      const config: RequestInit = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // ✅ Add real token
          ...options.headers,
        },
        ...options,
      };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ BookingService HTTP error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `HTTP error! status: ${response.status} - ${errorText}`
        );
      }

      const data = await response.json();

      return data;
    } catch (error) {
      console.error("❌ BookingService API Request failed:", error);
      throw error;
    }
  }

  // Get bookings for a photographer
  async getPhotographerBookings(
    photographerId: number,
    params: BookingQueryParams = {}
  ): Promise<any> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.pageSize)
      queryParams.append("pageSize", params.pageSize.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/Booking/photographer/${photographerId}${
      queryString ? `?${queryString}` : ""
    }`;

    const response = await this.makeRequest<any>(endpoint);

    // The API returns: { error: 0, message: "...", data: { bookings: [...], totalCount: 3, ... } }
    // We need to extract the actual bookings array

    let processedResponse;

    if (response.error === 0 && response.data && response.data.bookings) {
      // Standard API response format
      processedResponse = {
        data: {
          bookings: response.data.bookings, // ✅ Extract the actual array
          totalCount: response.data.totalCount,
          page: response.data.page,
          pageSize: response.data.pageSize,
          totalPages: response.data.totalPages,
        },
        error: 0,
        message: response.message || "Success",
      };
    } else if (response.bookings) {
      // Direct response with bookings array (fallback)
      processedResponse = {
        data: {
          bookings: response.bookings,
          totalCount: response.totalCount || response.bookings.length,
          page: response.page || params.page || 1,
          pageSize: response.pageSize || params.pageSize || 10,
          totalPages:
            response.totalPages ||
            Math.ceil(
              (response.totalCount || response.bookings.length) /
                (params.pageSize || 10)
            ),
        },
        error: 0,
        message: "Success",
      };
    } else if (Array.isArray(response)) {
      // Direct array response (fallback)
      processedResponse = {
        data: {
          bookings: response,
          totalCount: response.length,
          page: params.page || 1,
          pageSize: params.pageSize || 10,
          totalPages: Math.ceil(response.length / (params.pageSize || 10)),
        },
        error: 0,
        message: "Success",
      };
    } else {
      // Unknown format
      processedResponse = {
        data: {
          bookings: [],
          totalCount: 0,
          page: 1,
          pageSize: 10,
          totalPages: 1,
        },
        error: 1,
        message: "Unknown response format",
      };
    }

    return processedResponse;
  }

  // Get single booking details
  async getBookingById(bookingId: number): Promise<any> {
    const response = await this.makeRequest<any>(`/api/Booking/${bookingId}`);

    return response;
  }

  // Update booking status (accept, reject, complete)
  async updateBookingStatus(
    bookingId: number,
    statusData: Partial<UpdateBookingStatusRequest>
  ): Promise<any> {
    const response = await this.makeRequest<any>(`/api/Booking/${bookingId}`, {
      method: "PUT",
      body: JSON.stringify(statusData),
    });

    return {
      error: 0,
      message: "Success",
      data: response,
    };
  }

  // Cancel booking
  async cancelBooking(bookingId: number): Promise<any> {
    const response = await this.makeRequest<any>(
      `/api/Booking/${bookingId}/cancel`,
      {
        method: "PUT",
      }
    );

    return {
      error: 0,
      message: "Booking cancelled successfully",
      data: response,
    };
  }

  // Complete booking
  async completeBooking(bookingId: number): Promise<any> {
    const response = await this.makeRequest<any>(
      `/api/Booking/${bookingId}/Complete`,
      {
        method: "PUT",
      }
    );

    return {
      error: 0,
      message: "Booking completed successfully",
      data: response,
    };
  }

  // Get all bookings (if needed for admin/overview)
  async getAllBookings(params: BookingQueryParams = {}): Promise<any> {
    const queryParams = new URLSearchParams();

    if (params.page) queryParams.append("page", params.page.toString());
    if (params.pageSize)
      queryParams.append("pageSize", params.pageSize.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/Booking${queryString ? `?${queryString}` : ""}`;

    return this.makeRequest<any>(endpoint);
  }
}

export const bookingService = new BookingService();
