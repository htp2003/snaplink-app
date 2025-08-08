import { apiClient } from "./base";
import { Location, LocationDto, LocationOwner, LocationOwnerDto, LocationApiResponse } from "../types";

export interface NearbyLocationRequest {
  address: string;
  radiusInKm: number;
  tags: string;
  limit: number;
}

export interface NearbyLocationResponse {
  source: 'internal' | 'external';
  locationId?: number;
  externalId?: string;
  class?: string;
  type?: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  distanceInKm: number;
  // Internal fields
  images?: any[];
  hourlyRate?: number;
  capacity?: number;
  availabilityStatus?: string;
  styles?: string[];
  // External fields
  rating?: number;
  place_id?: string;
}

const ENDPOINTS = {
  ALL: "/api/Location/GetAllLocations",
  BY_ID: (id: number) => `/api/Location/GetLocationById?id=${id}`,
  CREATE: "/api/Location/CreateLocation",
  UPDATE: (id: number) => `/api/Location/UpdateLocation?id=${id}`,
  DELETE: (id: number) => `/api/Location/DeleteLocation?id=${id}`,

  NEARBY_COMBINED: "/api/Location/nearby/combined",

  // Location Owner endpoints
  OWNERS: "/api/LocationOwner",
  OWNER_BY_ID: (id: number) =>
    `/api/LocationOwner/GetByLocationOwnerId?id=${id}`,
  CREATE_OWNER: "/api/LocationOwner/CreatedLocationOwnerId",
  UPDATE_OWNER: (id: number) =>
    `/api/LocationOwner/UpdateByLocationOwnerId?id=${id}`,
  DELETE_OWNER: (id: number) =>
    `/api/LocationOwner/DeleteByLocationOwnerId?id=${id}`,
};

export const locationService = {
  // Get all locations - API might return array or object with $values
  getAll: (): Promise<LocationApiResponse[] | { $values: LocationApiResponse[] }> => 
    apiClient.get<LocationApiResponse[] | { $values: LocationApiResponse[] }>(ENDPOINTS.ALL),

  // Get location by ID - API returns single location with full details
  getById: (id: number): Promise<LocationApiResponse> => 
    apiClient.get<LocationApiResponse>(ENDPOINTS.BY_ID(id)),

  // Create location
  create: (data: LocationDto): Promise<Location> => 
    apiClient.post<Location>(ENDPOINTS.CREATE, data),

  // Update location
  update: (id: number, data: LocationDto): Promise<Location> => 
    apiClient.put<Location>(ENDPOINTS.UPDATE(id), data),

  // Delete location
  delete: (id: number): Promise<void> => 
    apiClient.delete<void>(ENDPOINTS.DELETE(id)),

  searchNearby: (data: NearbyLocationRequest): Promise<NearbyLocationResponse[] | { $values: NearbyLocationResponse[] }> => 
    apiClient.post<NearbyLocationResponse[] | { $values: NearbyLocationResponse[] }>(ENDPOINTS.NEARBY_COMBINED, data),
};

export const locationOwnerService = {
  // Get all location owners
  getAll: (): Promise<LocationOwner[]> => 
    apiClient.get<LocationOwner[]>(ENDPOINTS.OWNERS),

  // Get location owner by ID
  getById: (id: number): Promise<LocationOwner> => 
    apiClient.get<LocationOwner>(ENDPOINTS.OWNER_BY_ID(id)),

  // Create location owner
  create: (data: LocationOwnerDto): Promise<LocationOwner> => 
    apiClient.post<LocationOwner>(ENDPOINTS.CREATE_OWNER, data),

  // Update location owner
  update: (id: number, data: LocationOwnerDto): Promise<LocationOwner> => 
    apiClient.put<LocationOwner>(ENDPOINTS.UPDATE_OWNER(id), data),

  // Delete location owner
  delete: (id: number): Promise<void> => 
    apiClient.delete<void>(ENDPOINTS.DELETE_OWNER(id)),
}