import { apiClient } from "./base";
import { Location, LocationDto, LocationOwner, LocationOwnerDto, LocationApiResponse } from "../types";
import * as ExpoLocation from 'expo-location';

// 🔍 GPS & Location interfaces
export interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// Existing interfaces
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
  // Existing endpoints
  ALL: "/api/Location/GetAllLocations",
  BY_ID: (id: number) => `/api/Location/GetLocationById?id=${id}`,
  CREATE: "/api/Location/CreateLocation",
  UPDATE: (id: number) => `/api/Location/UpdateLocation?id=${id}`,
  DELETE: (id: number) => `/api/Location/DeleteLocation?id=${id}`,
  NEARBY_COMBINED: "/api/Location/nearby/combined",

  // Location Owner endpoints
  OWNERS: "/api/LocationOwner",
  OWNER_BY_ID: (id: number) => `/api/LocationOwner/GetByLocationOwnerId?id=${id}`,
  CREATE_OWNER: "/api/LocationOwner/CreatedLocationOwnerId",
  UPDATE_OWNER: (id: number) => `/api/LocationOwner/UpdateByLocationOwnerId?id=${id}`,
  DELETE_OWNER: (id: number) => `/api/LocationOwner/DeleteByLocationOwnerId?id=${id}`,


};

// 🌍 GPS & Location Service Class
class GPSLocationService {
  private hasPermission: boolean = false;
  private lastKnownLocation: LocationCoords | null = null;

  // 🔍 Request location permission
  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      this.hasPermission = status === 'granted';
      return this.hasPermission;
    } catch (error) {
      console.error('❌ Location permission error:', error);
      return false;
    }
  }

  // 🔍 Get current location
  async getCurrentLocation(): Promise<LocationCoords | null> {
    try {
      if (!this.hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) {
          throw new Error('Location permission denied');
        }
      }

      console.log('🔍 Getting current location...');
      
      const location = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });

      const coords: LocationCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
      };

      this.lastKnownLocation = coords;
      console.log('✅ Got current location:', coords);
      
      return coords;
    } catch (error) {
      console.error('❌ Get current location error:', error);
      return this.lastKnownLocation; // Return cached location if available
    }
  }

  // 🌍 Get location from address string
  async geocodeAddress(address: string): Promise<LocationCoords | null> {
    try {
      const geocoded = await ExpoLocation.geocodeAsync(address);
      if (geocoded.length > 0) {
        const result = geocoded[0];
        return {
          latitude: result.latitude,
          longitude: result.longitude,
        };
      }
      return null;
    } catch (error) {
      console.error('❌ Geocode error:', error);
      return null;
    }
  }

  // 📐 Calculate distance between two points
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return Math.round(distance * 100) / 100;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Getter for permission status
  get hasLocationPermission(): boolean {
    return this.hasPermission;
  }

  // Getter for last known location
  get lastLocation(): LocationCoords | null {
    return this.lastKnownLocation;
  }
}

// 🢏 Create service instance
const gpsService = new GPSLocationService();

// 🔍 Location Service - cleaned version without Google Places backend endpoints
export const locationService = {
  // ========== EXISTING METHODS ==========
  getAll: (): Promise<LocationApiResponse[] | { $values: LocationApiResponse[] }> => 
    apiClient.get<LocationApiResponse[] | { $values: LocationApiResponse[] }>(ENDPOINTS.ALL),

  getById: (id: number): Promise<LocationApiResponse> => 
    apiClient.get<LocationApiResponse>(ENDPOINTS.BY_ID(id)),

  create: (data: LocationDto): Promise<Location> => 
    apiClient.post<Location>(ENDPOINTS.CREATE, data),

  update: (id: number, data: LocationDto): Promise<Location> => 
    apiClient.put<Location>(ENDPOINTS.UPDATE(id), data),

  delete: (id: number): Promise<void> => 
    apiClient.delete<void>(ENDPOINTS.DELETE(id)),

  searchNearby: (data: NearbyLocationRequest): Promise<NearbyLocationResponse[] | { $values: NearbyLocationResponse[] }> => 
    apiClient.post<NearbyLocationResponse[] | { $values: NearbyLocationResponse[] }>(ENDPOINTS.NEARBY_COMBINED, data),

  // ========== GPS METHODS ==========
  gps: {
    requestPermission: () => gpsService.requestPermission(),
    getCurrentLocation: () => gpsService.getCurrentLocation(),
    geocodeAddress: (address: string) => gpsService.geocodeAddress(address),
    calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number) => 
      gpsService.calculateDistance(lat1, lon1, lat2, lon2),
    get hasPermission() { return gpsService.hasLocationPermission; },
    get lastLocation() { return gpsService.lastLocation; },
  },

  // ❌ REMOVED: All Google Places methods - use directGooglePlacesService instead
  // googlePlaces: { ... }

  // ========== SIMPLIFIED SEARCH METHODS ==========
  
  // 🔍 Search app locations only
  async searchAppLocationsByText(query: string): Promise<NearbyLocationResponse[]> {
    try {
      // Use your existing search API with default location
      const defaultLocation = { lat: 10.8231, lng: 106.6297 }; // HCM center
      
      const response = await this.searchNearby({
        address: `${defaultLocation.lat},${defaultLocation.lng}`,
        radiusInKm: 50, // Larger radius for text search
        tags: query,
        limit: 20,
      });
  
      if (Array.isArray(response)) {
        return response;
      } else if (response && Array.isArray((response as any).$values)) {
        return (response as any).$values;
      }
      
      return [];
    } catch (error) {
      console.error('❌ App text search error:', error);
      return [];
    }
  },

  // 🌍 Get nearby app locations using current GPS position
  async getNearbyAppLocations(radiusKm: number = 5): Promise<{
    appLocations: NearbyLocationResponse[];
    currentLocation: LocationCoords | null;
  }> {
    const results = {
      appLocations: [] as NearbyLocationResponse[],
      currentLocation: null as LocationCoords | null,
    };

    try {
      // Get current location
      const currentLocation = await gpsService.getCurrentLocation();
      results.currentLocation = currentLocation;

      if (currentLocation) {
        // Search app locations
        const response = await this.searchNearby({
          address: `${currentLocation.latitude},${currentLocation.longitude}`,
          radiusInKm: radiusKm,
          tags: 'cafe, studio, photography',
          limit: 20,
        });

        if (Array.isArray(response)) {
          results.appLocations = response;
        } else if (response && Array.isArray((response as any).$values)) {
          results.appLocations = (response as any).$values;
        }
      }

      return results;
    } catch (error) {
      console.error('❌ Nearby app locations error:', error);
      return results;
    }
  },
};

export const locationOwnerService = {
  getAll: (): Promise<LocationOwner[]> => 
    apiClient.get<LocationOwner[]>(ENDPOINTS.OWNERS),

  getById: (id: number): Promise<LocationOwner> => 
    apiClient.get<LocationOwner>(ENDPOINTS.OWNER_BY_ID(id)),

  create: (data: LocationOwnerDto): Promise<LocationOwner> => 
    apiClient.post<LocationOwner>(ENDPOINTS.CREATE_OWNER, data),

  update: (id: number, data: LocationOwnerDto): Promise<LocationOwner> => 
    apiClient.put<LocationOwner>(ENDPOINTS.UPDATE_OWNER(id), data),

  delete: (id: number): Promise<void> => 
    apiClient.delete<void>(ENDPOINTS.DELETE_OWNER(id)),
};

// 📤 Export GPS service instance
export { gpsService };