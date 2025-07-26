// services/locationManagementService.ts
import { apiClient } from "./base";

export interface Venue {
  id: number;
  locationOwnerId: number;
  name: string;
  address: string;
  description: string;
  amenities: string;
  hourlyRate: number;
  capacity: number;
  indoor: boolean;
  outdoor: boolean;
  availabilityStatus: string;
  featuredStatus: boolean;
  verificationStatus: string;
  rating?: number;
  totalBookings?: number;
  images?: VenueImage[];
}

export interface VenueImage {
  id: number;
  venueId: number;
  imageUrl: string;
  title: string;
  description: string;
  isCover: boolean;
  orderIndex: number;
  createdAt: string;
}

export interface CreateVenueRequest {
  locationOwnerId: number;
  name: string;
  address: string;
  description?: string;
  amenities?: string;
  hourlyRate?: number;
  capacity?: number;
  indoor?: boolean;
  outdoor?: boolean;
  availabilityStatus?: string;
  featuredStatus?: boolean;
  verificationStatus?: string;
}

export interface UpdateVenueRequest {
  name?: string;
  address?: string;
  description?: string;
  amenities?: string;
  hourlyRate?: number;
  capacity?: number;
  indoor?: boolean;
  outdoor?: boolean;
  availabilityStatus?: string;
  featuredStatus?: boolean;
  verificationStatus?: string;
}

class LocationManagementService {
  // Venue/Location APIs
  async getAllVenues(): Promise<Venue[]> {
    return apiClient.get<Venue[]>("/api/Location/GetAllLocations");
  }

  async getVenueById(id: number): Promise<Venue> {
    return apiClient.get<Venue>(`/api/Location/GetLocationById?id=${id}`);
  }

  async createVenue(data: CreateVenueRequest): Promise<Venue> {
    return apiClient.post<Venue>("/api/Location/CreateLocation", data);
  }

  async updateVenue(id: number, data: UpdateVenueRequest): Promise<Venue> {
    return apiClient.put<Venue>(`/api/Location/UpdateLocation?id=${id}`, data);
  }

  async deleteVenue(id: number): Promise<void> {
    return apiClient.delete<void>(`/api/Location/DeleteLocation?id=${id}`);
  }

  // Image APIs for venues
  async getVenueImages(venueId: number): Promise<VenueImage[]> {
    return apiClient.get<VenueImage[]>(`/api/Image/location/${venueId}`);
  }

  async getVenuePrimaryImage(venueId: number): Promise<VenueImage> {
    return apiClient.get<VenueImage>(`/api/Image/location/${venueId}/primary`);
  }

  async uploadVenueImage(formData: FormData): Promise<VenueImage> {
    return apiClient.request<VenueImage>("/api/Image", {
      method: "POST",
      body: formData,
      headers: {
        // Don't set Content-Type, let browser set it for FormData
      },
    });
  }

  async updateVenueImage(data: {
    id: number;
    locationId?: number;
    url?: string;
    isPrimary?: boolean;
    caption?: string;
  }): Promise<VenueImage> {
    return apiClient.put<VenueImage>("/api/Image", data);
  }

  async deleteVenueImage(id: number): Promise<void> {
    return apiClient.delete<void>(`/api/Image/${id}`);
  }

  async setVenueImageAsPrimary(id: number): Promise<void> {
    return apiClient.put<void>(`/api/Image/${id}/set-primary`);
  }
}

export const locationManagementService = new LocationManagementService();
