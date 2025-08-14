// services/photographerEventService.ts

import { 
  LocationEvent, 
  EventApplication, 
  EventApplicationRequest,
  ApiResponse,
  EventPhotographer,
  EventBookingRequest,
  EventStatistics
} from '../types/photographerEvent';
import AsyncStorage from '@react-native-async-storage/async-storage';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net';

class PhotographerEventService {
  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error getting token from AsyncStorage:", error);
    }

    return headers;
  }
  
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

  // 1. Browse Events - Discover and discover events
  async getActiveEvents(): Promise<ApiResponse<LocationEvent[]>> {
    return this.fetchWithAuth<LocationEvent[]>('/api/LocationEvent/active');
  }

  async getUpcomingEvents(): Promise<ApiResponse<LocationEvent[]>> {
    return this.fetchWithAuth<LocationEvent[]>('/api/LocationEvent/upcoming');
  }

  async getFeaturedEvents(): Promise<ApiResponse<LocationEvent[]>> {
    return this.fetchWithAuth<LocationEvent[]>('/api/LocationEvent/featured');
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

  async getEventDetail(eventId: number): Promise<ApiResponse<LocationEvent>> {
    return this.fetchWithAuth<LocationEvent>(`/api/LocationEvent/${eventId}/detail`);
  }

  // 2. Apply to Event - Submit application with special rate
  async applyToEvent(request: EventApplicationRequest): Promise<ApiResponse<EventApplication>> {
    return this.fetchWithAuth<EventApplication>('/api/LocationEvent/apply', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 3. Wait for Response - Check application status
  async getPhotographerApplications(photographerId: number): Promise<ApiResponse<EventApplication[]>> {
    return this.fetchWithAuth<EventApplication[]>(`/api/LocationEvent/photographer/${photographerId}/applications`);
  }

  async withdrawApplication(eventId: number, photographerId: number): Promise<ApiResponse<boolean>> {
    return this.fetchWithAuth<boolean>(`/api/LocationEvent/${eventId}/photographer/${photographerId}/withdraw`, {
      method: 'DELETE',
    });
  }

  // 4. Participate - Once approved, available for bookings
  async getApprovedPhotographers(eventId: number): Promise<ApiResponse<EventPhotographer[]>> {
    return this.fetchWithAuth<EventPhotographer[]>(`/api/LocationEvent/${eventId}/approved-photographers`);
  }

  // Helper methods
  async canApplyToEvent(eventId: number, photographerId: number): Promise<boolean> {
    try {
      const eventResponse = await this.getEventDetail(eventId);
      const applicationsResponse = await this.getPhotographerApplications(photographerId);
      
      if (eventResponse.error !== 0 || applicationsResponse.error !== 0) {
        return false;
      }

      const event = eventResponse.data;
      const applications = applicationsResponse.data;

      // Check if event is open for applications
      if (event.status !== 'Open') {
        return false;
      }

      // Check if photographer has already applied
      const existingApplication = applications.find(app => 
        app.eventId === eventId && 
        app.status !== 'Withdrawn'
      );

      return !existingApplication;
    } catch (error) {
      console.error('Error checking application eligibility:', error);
      return false;
    }
  }

  async getApplicationStatus(eventId: number, photographerId: number): Promise<string | null> {
    try {
      const applicationsResponse = await this.getPhotographerApplications(photographerId);
      
      if (applicationsResponse.error !== 0) {
        return null;
      }

      const application = applicationsResponse.data.find(app => 
        app.eventId === eventId
      );

      return application?.status || null;
    } catch (error) {
      console.error('Error getting application status:', error);
      return null;
    }
  }

  // ========== CUSTOMER BOOKING METHODS ==========
  async bookEvent(request: EventBookingRequest): Promise<ApiResponse<any>> {
  try {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/LocationEvent/booking`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error booking event:', error);
    throw error;
  }
}

async getEventBookings(eventId: number): Promise<ApiResponse<any[]>> {
  try {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/LocationEvent/${eventId}/bookings`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching event bookings:', error);
    throw error;
  }
}

async getUserEventBookings(userId: number): Promise<ApiResponse<any[]>> {
  try {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/LocationEvent/user/${userId}/bookings`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user event bookings:', error);
    throw error;
  }
}

async cancelEventBooking(eventBookingId: number): Promise<ApiResponse<any>> {
  try {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/LocationEvent/booking/${eventBookingId}`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error canceling event booking:', error);
    throw error;
  }
}

// ========== GENERAL EVENT METHODS ==========

async getAllEvents(): Promise<ApiResponse<LocationEvent[]>> {
  try {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/LocationEvent`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching all events:', error);
    throw error;
  }
}

async getEventsByLocation(locationId: number): Promise<ApiResponse<LocationEvent[]>> {
  try {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/LocationEvent/location/${locationId}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching events by location:', error);
    throw error;
  }
}

async getEventsByStatus(status: string): Promise<ApiResponse<LocationEvent[]>> {
  try {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/LocationEvent/status/${encodeURIComponent(status)}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching events by status:', error);
    throw error;
  }
}

async getEventsByDateRange(startDate: string, endDate: string): Promise<ApiResponse<LocationEvent[]>> {
  try {
    const headers = await this.getHeaders();
    const url = `${API_BASE_URL}/api/LocationEvent/date-range?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching events by date range:', error);
    throw error;
  }
}

// ========== EVENT STATISTICS ==========
async getEventStatistics(eventId: number): Promise<ApiResponse<EventStatistics>> {
  try {
    const headers = await this.getHeaders();
    const response = await fetch(`${API_BASE_URL}/api/LocationEvent/${eventId}/statistics`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching event statistics:', error);
    throw error;
  }
}

// ========== HOT EVENTS LOGIC ==========

async getHotEvents(): Promise<ApiResponse<LocationEvent[]>> {
  try {
    // Get all upcoming events
    const upcomingResponse = await this.getUpcomingEvents();
    
    if (upcomingResponse.error !== 0) {
      return upcomingResponse;
    }

    const upcomingEvents = upcomingResponse.data || [];
    
    // Filter for "hot" events based on booking activity
    const hotEvents = upcomingEvents.filter(event => {
      // Calculate booking rate
      const bookingRate = event.totalBookingsCount / (event.maxBookingsPerSlot || 1);
      
      // Check if discounted
      const hasDiscount = event.discountedPrice && 
        event.originalPrice && 
        event.discountedPrice < event.originalPrice;
      
      // Check if starting soon (within 7 days)
      const eventDate = new Date(event.startDate);
      const now = new Date();
      const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      const isStartingSoon = daysUntilEvent <= 7;
      
      // Hot criteria: high booking rate OR discounted OR starting soon
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
    // Get all active events and sort by activity
    const activeResponse = await this.getActiveEvents();
    
    if (activeResponse.error !== 0) {
      return activeResponse;
    }

    const activeEvents = activeResponse.data || [];
    
    // Sort by combination of bookings and photographer applications
    const trendingEvents = activeEvents
      .sort((a, b) => {
        const aActivity = a.totalBookingsCount + a.approvedPhotographersCount;
        const bActivity = b.totalBookingsCount + b.approvedPhotographersCount;
        return bActivity - aActivity; // Descending order
      })
      .slice(0, 10); // Top 10 trending

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



}

export const photographerEventService = new PhotographerEventService();