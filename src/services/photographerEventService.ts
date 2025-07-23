// services/photographerEventService.ts

import { CreatePhotographerEventRequest, Location, PhotographerEvent, ApiResponse } from '../types/photographerEvent';

const BASE_URL = 'https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net/api';

class PhotographerEventService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          // Add authorization header if needed
          // 'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return {
        success: true,
        data,
        message: 'Success',
        statusCode: response.status,
      };
    } catch (error) {
      console.error('API Request Error:', error);
      return {
        success: false,
        data: null as T,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        statusCode: 500,
      };
    }
  }

  // Create photographer event
  async createPhotographerEvent(
    photographerId: number,
    eventData: CreatePhotographerEventRequest
  ): Promise<ApiResponse<PhotographerEvent>> {
    return this.makeRequest<PhotographerEvent>(
      `/PhotographerEvent/${photographerId}`,
      {
        method: 'POST',
        body: JSON.stringify(eventData),
      }
    );
  }

  // Get location by ID
  async getLocationById(locationId: number): Promise<ApiResponse<Location>> {
    return this.makeRequest<Location>(
      `/Location/GetLocationById?id=${locationId}`
    );
  }

  // Get all locations
  async getAllLocations(): Promise<ApiResponse<Location[]>> {
    return this.makeRequest<Location[]>('/Location/GetAllLocations');
  }

  // Get photographer events
  async getPhotographerEvents(): Promise<ApiResponse<PhotographerEvent[]>> {
    return this.makeRequest<PhotographerEvent[]>('/PhotographerEvent');
  }

  // Get photographer event by ID
  async getPhotographerEventById(eventId: number): Promise<ApiResponse<PhotographerEvent>> {
    return this.makeRequest<PhotographerEvent>(`/PhotographerEvent/${eventId}`);
  }

  // Update photographer event
  async updatePhotographerEvent(
    eventId: number,
    eventData: Partial<CreatePhotographerEventRequest>
  ): Promise<ApiResponse<PhotographerEvent>> {
    return this.makeRequest<PhotographerEvent>(
      `/PhotographerEvent/${eventId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ eventId, ...eventData }),
      }
    );
  }

  // Delete photographer event
  async deletePhotographerEvent(eventId: number): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(
      `/PhotographerEvent/${eventId}`,
      {
        method: 'DELETE',
      }
    );
  }
}

export const photographerEventService = new PhotographerEventService();
export default photographerEventService;