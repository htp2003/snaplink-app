// services/eventService.ts - Focused User Event Service

import { 
    LocationEvent, 
    EventBooking, 
    EventBookingRequest,
    ApiResponse,
    EventPhotographer
  } from '../types/event';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net';
  
  class EventService {
    private async getAuthToken(): Promise<string | null> {
      try {
        const token = await AsyncStorage.getItem("token");
        return token;
      } catch (error) {
        console.error("❌ Error getting token from AsyncStorage:", error);
        return null;
      }
    }
  
    private async fetchWithAuth<T>(
      endpoint: string, 
      options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
      try {
        const token = await this.getAuthToken();
  
        if (!token) {
          throw new Error("No authentication token found. Please login again.");
        }
  
        const config: RequestInit = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
          ...options,
        };
  
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  
        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ EventService HTTP error:", {
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
        console.error("❌ EventService API Request failed:", error);
        throw error;
      }
    }
  
    // ========== 1. EVENT DISCOVERY (cho HomeScreen) ==========
    
    async getAllEvents(): Promise<ApiResponse<LocationEvent[]>> {
      return this.fetchWithAuth<LocationEvent[]>('/api/LocationEvent');
    }
  
    async getActiveEvents(): Promise<ApiResponse<LocationEvent[]>> {
      return this.fetchWithAuth<LocationEvent[]>('/api/LocationEvent/active');
    }
  
    async getUpcomingEvents(): Promise<ApiResponse<LocationEvent[]>> {
      return this.fetchWithAuth<LocationEvent[]>('/api/LocationEvent/upcoming');
    }
  
    async getFeaturedEvents(): Promise<ApiResponse<LocationEvent[]>> {
      return this.fetchWithAuth<LocationEvent[]>('/api/LocationEvent/featured');
    }
  
    async getHotEvents(): Promise<ApiResponse<LocationEvent[]>> {
      try {
        // Get upcoming events first
        const upcomingResponse = await this.getUpcomingEvents();
        
        if (upcomingResponse.error !== 0) {
          return upcomingResponse;
        }
  
        const upcomingEvents = upcomingResponse.data || [];
        
        // Filter for "hot" events
        const hotEvents = upcomingEvents.filter(event => {
          // Calculate booking rate
          const bookingRate = event.totalBookingsCount / Math.max(1, event.maxBookingsPerSlot);
          
          // Check if discounted
          const hasDiscount = event.discountedPrice && 
            event.originalPrice && 
            event.discountedPrice < event.originalPrice;
          
          // Check if starting soon (within 7 days)
          const eventDate = new Date(event.startDate);
          const now = new Date();
          const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          const isStartingSoon = daysUntilEvent <= 7 && daysUntilEvent >= 0;
          
          // Hot criteria
          return bookingRate > 0.7 || hasDiscount || isStartingSoon;
        });
  
        return {
          error: 0,
          message: 'Success',
          data: hotEvents
        };
      } catch (error) {
        console.error('Error getting hot events:', error);
        return {
          error: 1,
          message: error instanceof Error ? error.message : 'Failed to get hot events',
          data: []
        };
      }
    }
  
    async getTrendingEvents(): Promise<ApiResponse<LocationEvent[]>> {
      try {
        const activeResponse = await this.getActiveEvents();
        
        if (activeResponse.error !== 0) {
          return activeResponse;
        }
  
        const activeEvents = activeResponse.data || [];
        
        // Sort by activity
        const trendingEvents = activeEvents
          .sort((a, b) => {
            const aActivity = a.totalBookingsCount + a.approvedPhotographersCount;
            const bActivity = b.totalBookingsCount + b.approvedPhotographersCount;
            return bActivity - aActivity;
          })
          .slice(0, 10);
  
        return {
          error: 0,
          message: 'Success',
          data: trendingEvents
        };
      } catch (error) {
        console.error('Error getting trending events:', error);
        return {
          error: 1,
          message: error instanceof Error ? error.message : 'Failed to get trending events',
          data: []
        };
      }
    }
  
    // ========== 2. EVENT DETAIL ==========
    
    async getEventDetail(eventId: number): Promise<ApiResponse<LocationEvent>> {
      return this.fetchWithAuth<LocationEvent>(`/api/LocationEvent/${eventId}/detail`);
    }
  
    async searchEvents(searchTerm: string): Promise<ApiResponse<LocationEvent[]>> {
      const params = new URLSearchParams({ searchTerm });
      return this.fetchWithAuth<LocationEvent[]>(`/api/LocationEvent/search?${params}`);
    }
  
    async getNearbyEvents(
      latitude: number, 
      longitude: number, 
      radiusKm: number = 10
    ): Promise<ApiResponse<LocationEvent[]>> {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radiusKm: radiusKm.toString()
      });
      return this.fetchWithAuth<LocationEvent[]>(`/api/LocationEvent/nearby?${params}`);
    }
  
    // ========== 3. EVENT BOOKING (cho BookingEventScreen) ==========
    
    async getApprovedPhotographers(eventId: number): Promise<ApiResponse<EventPhotographer[]>> {
      return this.fetchWithAuth<EventPhotographer[]>(`/api/LocationEvent/${eventId}/approved-photographers`);
    }
  
    async bookEvent(request: EventBookingRequest): Promise<ApiResponse<EventBooking>> {
      return this.fetchWithAuth<EventBooking>('/api/LocationEvent/booking', {
        method: 'POST',
        body: JSON.stringify(request)
      });
    }
  
    // ========== 4. USER BOOKINGS (optional - chỉ khi cần) ==========
    
    async getUserEventBookings(userId: number): Promise<ApiResponse<EventBooking[]>> {
      return this.fetchWithAuth<EventBooking[]>(`/api/LocationEvent/user/${userId}/bookings`);
    }
  
    async cancelEventBooking(eventBookingId: number): Promise<ApiResponse<boolean>> {
      return this.fetchWithAuth<boolean>(`/api/LocationEvent/booking/${eventBookingId}`, {
        method: 'DELETE'
      });
    }
  }
  
  export const eventService = new EventService();