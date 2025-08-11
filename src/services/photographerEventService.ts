// services/photographerEventService.ts

import { 
  LocationEvent, 
  EventApplication, 
  EventApplicationRequest,
  ApiResponse,
  EventPhotographer
} from '../types/photographerEvent';
import AsyncStorage from '@react-native-async-storage/async-storage';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net';

class PhotographerEventService {
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
}

export const photographerEventService = new PhotographerEventService();