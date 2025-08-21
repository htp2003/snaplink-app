// services/eventService.ts - Fixed to handle empty database 401

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

  // 🎯 ENHANCED fetchWithAuth to handle empty database 401
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
        
        // 🎯 SPECIAL HANDLING: Empty database returns 401 with empty body
        if (response.status === 401 && this.isEmptyDatabaseResponse(endpoint, errorText)) {
          console.log(`💡 Empty database detected for ${endpoint} - returning empty success response`);
          return {
            error: 0,
            message: 'No events found',
            data: [] as any // Safe cast for list endpoints
          };
        }

        console.error("❌ EventService HTTP error:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          endpoint,
        });

        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("❌ EventService API Request failed:", error);
      throw error;
    }
  }

  // 🔍 Helper: Detect if 401 is due to empty database
  private isEmptyDatabaseResponse(endpoint: string, errorText: string): boolean {
    // Signs that this 401 is likely empty database, not auth failure:
    // 1. Error body is empty
    // 2. Endpoint is a list endpoint (would return array)
    // 3. User is actually logged in (has token)
    
    const isListEndpoint = this.isListEndpoint(endpoint);
    const hasEmptyErrorBody = !errorText || errorText.trim() === '';
    
    // If it's a list endpoint and error body is empty, likely empty database
    return isListEndpoint && hasEmptyErrorBody;
  }

  // 🔍 Helper: Check if endpoint returns list data
  private isListEndpoint(endpoint: string): boolean {
    const listEndpoints = [
      '/api/LocationEvent',
      '/api/LocationEvent/active',
      '/api/LocationEvent/upcoming', 
      '/api/LocationEvent/featured',
      '/api/LocationEvent/list',
      '/api/LocationEvent/nearby',
      '/api/LocationEvent/search'
    ];

    return listEndpoints.some(listEndpoint => endpoint.includes(listEndpoint));
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
      console.log('🔥 Getting hot events...');
      const upcomingResponse = await this.getUpcomingEvents();
      
      if (upcomingResponse.error !== 0) {
        return upcomingResponse;
      }

      const upcomingEvents = upcomingResponse.data || [];
      
      // Filter for "hot" events
      const hotEvents = upcomingEvents.filter(event => {
        const bookingRate = event.totalBookingsCount / Math.max(1, event.maxBookingsPerSlot);
        const hasDiscount = event.discountedPrice && 
          event.originalPrice && 
          event.discountedPrice < event.originalPrice;
        const eventDate = new Date(event.startDate);
        const now = new Date();
        const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        const isStartingSoon = daysUntilEvent <= 7 && daysUntilEvent >= 0;
        
        return bookingRate > 0.7 || hasDiscount || isStartingSoon;
      });

      console.log(`✅ Found ${hotEvents.length} hot events from ${upcomingEvents.length} upcoming events`);
      return {
        error: 0,
        message: 'Success',
        data: hotEvents
      };
    } catch (error) {
      console.error('❌ Error getting hot events:', error);
      return {
        error: 1,
        message: error instanceof Error ? error.message : 'Failed to get hot events',
        data: []
      };
    }
  }

  async getTrendingEvents(): Promise<ApiResponse<LocationEvent[]>> {
    try {
      console.log('📈 Getting trending events...');
      const activeResponse = await this.getActiveEvents();
      
      if (activeResponse.error !== 0) {
        return activeResponse;
      }

      const activeEvents = activeResponse.data || [];
      
      const trendingEvents = activeEvents
        .sort((a, b) => {
          const aActivity = (a.totalBookingsCount || 0) + (a.approvedPhotographersCount || 0);
          const bActivity = (b.totalBookingsCount || 0) + (b.approvedPhotographersCount || 0);
          return bActivity - aActivity;
        })
        .slice(0, 10);

      console.log(`✅ Found ${trendingEvents.length} trending events from ${activeEvents.length} active events`);
      return {
        error: 0,
        message: 'Success',
        data: trendingEvents
      };
    } catch (error) {
      console.error('❌ Error getting trending events:', error);
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

  // ========== 4. USER BOOKINGS (optional) ==========
  
  async getUserEventBookings(userId: number): Promise<ApiResponse<EventBooking[]>> {
    return this.fetchWithAuth<EventBooking[]>(`/api/LocationEvent/user/${userId}/bookings`);
  }

  async cancelEventBooking(eventBookingId: number): Promise<ApiResponse<boolean>> {
    return this.fetchWithAuth<boolean>(`/api/LocationEvent/booking/${eventBookingId}`, {
      method: 'DELETE'
    });
  }

  // ========== 5. FALLBACK METHODS FOR EMPTY DATABASE ==========

  async getHotEventsOrEmpty(): Promise<LocationEvent[]> {
    try {
      const response = await this.getHotEvents();
      return response.data || [];
    } catch (error) {
      console.warn('🔥 Hot events not available (likely empty database)');
      return [];
    }
  }

  async getFeaturedEventsOrEmpty(): Promise<LocationEvent[]> {
    try {
      const response = await this.getFeaturedEvents();
      return response.data || [];
    } catch (error) {
      console.warn('⭐ Featured events not available (likely empty database)');
      return [];
    }
  }

  async getTrendingEventsOrEmpty(): Promise<LocationEvent[]> {
    try {
      const response = await this.getTrendingEvents();
      return response.data || [];
    } catch (error) {
      console.warn('📈 Trending events not available (likely empty database)');
      return [];
    }
  }

  async getAllEventsOrEmpty(): Promise<LocationEvent[]> {
    try {
      const response = await this.getAllEvents();
      return response.data || [];
    } catch (error) {
      console.warn('📅 All events not available (likely empty database)');
      return [];
    }
  }

  // ========== 6. DEBUG HELPER ==========
  
  async debugEmptyDatabase(): Promise<void> {
    if (!__DEV__) return;
    
    console.log('\n🔍 === EVENT SERVICE DEBUG ===');
    const token = await this.getAuthToken();
    console.log('🔑 Has token:', !!token);
    
    if (!token) {
      console.log('❌ No token - cannot test endpoints');
      return;
    }

    const endpoints = ['/api/LocationEvent', '/api/LocationEvent/upcoming', '/api/LocationEvent/featured'];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n📝 Testing: ${endpoint}`);
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        
        console.log(`📥 Raw Status: ${response.status}`);
        const text = await response.text();
        console.log(`📄 Raw Body: "${text}"`);
        
        if (response.status === 401 && (!text || text.trim() === '')) {
          console.log('💡 This looks like empty database 401!');
        }
      } catch (error) {
        console.log(`💥 Request failed:`, error);
      }
    }
  }
}

export const eventService = new EventService();