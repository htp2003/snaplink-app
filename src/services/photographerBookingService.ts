// services/bookingService.ts

import { 
  Booking, 
  BookingListResponse, 
  BookingQueryParams, 
  UpdateBookingStatusRequest,
  ApiResponse 
} from '../types/booking';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net';

class BookingService {
  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if needed
          // 'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Get bookings for a photographer
  async getPhotographerBookings(
    photographerId: number, 
    params: BookingQueryParams = {}
  ): Promise<BookingListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/Booking/photographer/${photographerId}${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<BookingListResponse>(endpoint);
  }

  // Get single booking details
  async getBookingById(bookingId: number): Promise<ApiResponse<Booking>> {
    return this.makeRequest<ApiResponse<Booking>>(`/api/Booking/${bookingId}`);
  }

  // Update booking status (accept, reject, complete)
  async updateBookingStatus(
    bookingId: number, 
    statusData: Partial<UpdateBookingStatusRequest>
  ): Promise<ApiResponse<any>> {
    return this.makeRequest<ApiResponse<any>>(`/api/Booking/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(statusData),
    });
  }

  // Cancel booking
  async cancelBooking(bookingId: number): Promise<ApiResponse<any>> {
    return this.makeRequest<ApiResponse<any>>(`/api/Booking/${bookingId}/cancel`, {
      method: 'PUT',
    });
  }

  // Complete booking
  async completeBooking(bookingId: number): Promise<ApiResponse<any>> {
    return this.makeRequest<ApiResponse<any>>(`/api/Booking/${bookingId}/complete`, {
      method: 'PUT',
    });
  }

  // Get all bookings (if needed for admin/overview)
  async getAllBookings(params: BookingQueryParams = {}): Promise<BookingListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    const queryString = queryParams.toString();
    const endpoint = `/api/Booking${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest<BookingListResponse>(endpoint);
  }
}

export const bookingService = new BookingService();