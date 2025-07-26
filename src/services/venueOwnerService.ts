// services/venueOwnerService.ts
import { apiClient } from './base';

export interface VenueOwner {
  id: number;
  userId: number;
  businessName: string;
  businessAddress: string;
  businessRegistrationNumber: string;
  verificationStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVenueOwnerRequest {
  userId: number;
  businessName: string;
  businessAddress: string;
  businessRegistrationNumber: string;
  verificationStatus?: string;
}

export interface UpdateVenueOwnerRequest {
  businessName?: string;
  businessAddress?: string;
  businessRegistrationNumber?: string;
  verificationStatus?: string;
}

class VenueOwnerService {
  async getAllVenueOwners(): Promise<VenueOwner[]> {
    return apiClient.get<VenueOwner[]>('/api/LocationOwner');
  }

  async getVenueOwnerById(id: number): Promise<VenueOwner> {
    return apiClient.get<VenueOwner>(`/api/LocationOwner/GetByLocationOwnerId?id=${id}`);
  }

  async createVenueOwner(data: CreateVenueOwnerRequest): Promise<VenueOwner> {
    return apiClient.post<VenueOwner>('/api/LocationOwner/CreatedLocationOwnerId', data);
  }

  async updateVenueOwner(id: number, data: UpdateVenueOwnerRequest): Promise<VenueOwner> {
    return apiClient.put<VenueOwner>(`/api/LocationOwner/UpdateByLocationOwnerId?id=${id}`, data);
  }

  async deleteVenueOwner(id: number): Promise<void> {
    return apiClient.delete<void>(`/api/LocationOwner/DeleteByLocationOwnerId?id=${id}`);
  }
}

export const venueOwnerService = new VenueOwnerService();