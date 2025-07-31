// services/venueOwnerLocationService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  VenueLocation,
  CreateLocationRequest,
  UpdateLocationRequest,
  LocationFilters,
} from "../types/venueLocation";

const API_BASE_URL =
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

class VenueOwnerLocationService {
  private async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem("token");
  }

  private async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const token = await this.getAuthToken();

    return fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });
  }

  /**
   * Get all locations (with optional filtering)
   */
  async getAllLocations(filters?: LocationFilters): Promise<VenueLocation[]> {
    try {
      console.log("📋 Getting all locations with filters:", filters);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/Location/GetAllLocations`
      );

      console.log("📥 Get all locations response status:", response.status);

      if (response.status === 404) {
        console.log("ℹ️ No locations found (404) - returning empty array");
        return [];
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Get all locations error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ All locations retrieved:", result);

      // Handle different response formats
      let locationsArray: VenueLocation[] = [];

      if (Array.isArray(result)) {
        locationsArray = result;
      } else if (result && result.data && Array.isArray(result.data)) {
        locationsArray = result.data;
      } else if (result && typeof result === "object") {
        // Single location object
        locationsArray = [result];
      } else {
        console.log("⚠️ Unexpected response format, returning empty array");
        return [];
      }

      // Apply client-side filtering if needed
      if (filters) {
        locationsArray = locationsArray.filter((location) => {
          if (
            filters.locationOwnerId &&
            location.locationOwnerId !== filters.locationOwnerId
          ) {
            return false;
          }
          if (
            filters.availabilityStatus &&
            location.availabilityStatus !== filters.availabilityStatus
          ) {
            return false;
          }
          if (
            filters.locationType &&
            location.locationType !== filters.locationType
          ) {
            return false;
          }
          if (
            filters.indoor !== undefined &&
            location.indoor !== filters.indoor
          ) {
            return false;
          }
          if (
            filters.outdoor !== undefined &&
            location.outdoor !== filters.outdoor
          ) {
            return false;
          }
          if (
            filters.minHourlyRate &&
            location.hourlyRate &&
            location.hourlyRate < filters.minHourlyRate
          ) {
            return false;
          }
          if (
            filters.maxHourlyRate &&
            location.hourlyRate &&
            location.hourlyRate > filters.maxHourlyRate
          ) {
            return false;
          }
          if (
            filters.minCapacity &&
            location.capacity &&
            location.capacity < filters.minCapacity
          ) {
            return false;
          }
          if (
            filters.maxCapacity &&
            location.capacity &&
            location.capacity > filters.maxCapacity
          ) {
            return false;
          }
          return true;
        });
      }

      console.log(`✅ Filtered locations: ${locationsArray.length} items`);
      return locationsArray;
    } catch (error) {
      console.error("❌ Get all locations error:", error);
      throw error;
    }
  }

  /**
   * Get locations by locationOwnerId
   */
  async getLocationsByOwnerId(
    locationOwnerId: number
  ): Promise<VenueLocation[]> {
    try {
      console.log("🏢 Getting locations for owner:", locationOwnerId);

      return await this.getAllLocations({ locationOwnerId });
    } catch (error) {
      console.error("❌ Get locations by owner error:", error);
      throw error;
    }
  }

  /**
   * Get location by locationId
   */
  async getLocationById(locationId: number): Promise<VenueLocation | null> {
    try {
      console.log("🔍 Getting location by ID:", locationId);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/Location/GetLocationById?id=${locationId}`
      );

      console.log("📥 Get location by ID response status:", response.status);

      if (response.status === 404) {
        console.log("ℹ️ Location not found");
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Get location by ID error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Location retrieved:", result);
      return result;
    } catch (error) {
      console.error("❌ Get location by ID error:", error);
      throw error;
    }
  }

  /**
   * Create new location
   */
  async createLocation(data: CreateLocationRequest): Promise<VenueLocation> {
    try {
      console.log("🏗️ Creating new location:", data);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/Location/CreateLocation`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );

      console.log("📥 Create location response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Create location error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const result = await response.json();
        console.log("✅ Location created (JSON):", result);
        return result;
      } else {
        // If API returns text response (like "Created")
        const textResponse = await response.text();
        console.log("✅ Location created (text):", textResponse);

        if (textResponse.toLowerCase().includes("created")) {
          // Wait a moment for database to process
          await new Promise((resolve) => setTimeout(resolve, 500));

          try {
            // Find the newly created location
            const locations = await this.getLocationsByOwnerId(
              data.locationOwnerId
            );
            const newLocation = locations.find(
              (location) =>
                location.name === data.name && location.address === data.address
            );

            if (newLocation) {
              console.log("✅ Found newly created location:", newLocation);
              return newLocation;
            } else {
              // Return a minimal response object
              return {
                locationId: 0, // Temporary ID
                locationOwnerId: data.locationOwnerId,
                name: data.name,
                address: data.address,
                description: data.description,
                amenities: data.amenities,
                hourlyRate: data.hourlyRate,
                capacity: data.capacity,
                indoor: data.indoor,
                outdoor: data.outdoor,
                availabilityStatus: data.availabilityStatus || "Available",
                featuredStatus: data.featuredStatus || false,
                verificationStatus: data.verificationStatus || "pending",
                locationType: data.locationType || "Registered",
                externalPlaceId: data.externalPlaceId,
                latitude: data.latitude,
                longitude: data.longitude,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              } as VenueLocation;
            }
          } catch (fetchError) {
            console.error("❌ Error fetching created location:", fetchError);
            // Return minimal response
            return {
              locationId: 0,
              locationOwnerId: data.locationOwnerId,
              name: data.name,
              address: data.address,
              availabilityStatus: "Available",
              locationType: "Registered",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            } as VenueLocation;
          }
        } else {
          throw new Error(`Unexpected response: ${textResponse}`);
        }
      }
    } catch (error) {
      console.error("❌ Create location error:", error);
      throw error;
    }
  }

  /**
   * Update location
   */
  async updateLocation(
    locationId: number,
    data: UpdateLocationRequest
  ): Promise<VenueLocation> {
    try {
      console.log("✏️ Updating location:", locationId, data);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/Location/UpdateLocation?id=${locationId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        }
      );

      console.log("📥 Update location response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Update location error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const result = await response.json();
        console.log("✅ Location updated (JSON):", result);
        return result;
      } else {
        // If API returns text, fetch the updated location
        const textResponse = await response.text();
        console.log("✅ Location updated (text):", textResponse);

        // Fetch the updated location
        const updatedLocation = await this.getLocationById(locationId);
        if (!updatedLocation) {
          throw new Error(
            "Location updated but unable to retrieve updated data"
          );
        }
        return updatedLocation;
      }
    } catch (error) {
      console.error("❌ Update location error:", error);
      throw error;
    }
  }

  /**
   * Delete location
   */
  async deleteLocation(locationId: number): Promise<boolean> {
    try {
      console.log("🗑️ Deleting location:", locationId);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/Location/DeleteLocation?id=${locationId}`,
        {
          method: "DELETE",
        }
      );

      console.log("📥 Delete location response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Delete location error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      console.log("✅ Location deleted");
      return true;
    } catch (error) {
      console.error("❌ Delete location error:", error);
      throw error;
    }
  }

  /**
   * Get primary image for a location
   */
  async getPrimaryLocationImage(locationId: number): Promise<string | null> {
    try {
      const location = await this.getLocationById(locationId);

      if (location?.images && location.images.length > 0) {
        // Find primary image or use first image
        const primaryImage =
          location.images.find((img) => img.isPrimary) || location.images[0];
        return primaryImage.url;
      }

      return null;
    } catch (error) {
      console.error("❌ Get primary image error:", error);
      return null;
    }
  }
}

// Export singleton instance
export const venueOwnerLocationService = new VenueOwnerLocationService();
