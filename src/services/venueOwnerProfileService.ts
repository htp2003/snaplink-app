// services/venueOwnerProfileService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  LocationOwner,
  CreateLocationOwnerRequest,
  UpdateLocationOwnerRequest,
} from "../types/venueOwner";

const API_BASE_URL =
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

class VenueOwnerProfileService {
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
   * Get location owner profile by userId (helper method)
   */
  async getLocationOwnerByUserId(
    userId: number
  ): Promise<LocationOwner | null> {
    try {
      console.log("🔍 Getting location owner by userId:", userId);

      // Get all location owners and find by userId
      const allOwners = await this.getAllLocationOwners();
      console.log("📋 All owners received:", allOwners);

      // Find the latest/active LocationOwner for this userId
      // Filter out null entries and entries without business info
      const validOwners = allOwners.filter(
        (owner) =>
          owner &&
          owner.userId === userId &&
          (owner.businessName ||
            owner.businessAddress ||
            owner.businessRegistrationNumber)
      );

      if (validOwners.length > 0) {
        // Take the most recent one (highest locationOwnerId)
        const owner = validOwners.reduce((latest, current) =>
          current.locationOwnerId > latest.locationOwnerId ? current : latest
        );

        console.log("✅ Location owner found by userId:", owner);
        return owner;
      } else {
        console.log("ℹ️ No active location owner found for userId:", userId);
        return null;
      }
    } catch (error) {
      console.error("❌ Get location owner by userId error:", error);
      throw error;
    }
  }

  /**
   * Create a new location owner profile
   */
  async createLocationOwner(
    data: CreateLocationOwnerRequest
  ): Promise<LocationOwner> {
    try {
      console.log("🏢 Creating location owner profile:", data);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationOwner/CreatedLocationOwnerId`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );

      console.log("📥 Create location owner response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Create location owner error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const result = await response.json();
        console.log("✅ Location owner created (JSON):", result);
        return result;
      } else {
        // If API returns text response (like "Created"), we need to fetch the created profile
        const textResponse = await response.text();
        console.log("✅ Location owner created (text):", textResponse);

        if (textResponse.toLowerCase().includes("created")) {
          // Profile was created successfully, now fetch it
          console.log("🔄 Fetching newly created profile...");

          // Wait a moment for database to process
          await new Promise((resolve) => setTimeout(resolve, 500));

          try {
            // Get all location owners and find the one with matching userId
            const allOwners = await this.getAllLocationOwners();
            const newOwner = allOwners.find(
              (owner) => owner.userId === data.userId
            );

            if (newOwner) {
              console.log("✅ Found newly created profile:", newOwner);
              return newOwner;
            } else {
              console.log("⚠️ Profile created but not found in list");
              // Try to create a minimal response object
              return {
                locationOwnerId: 0, // We don't know the actual ID yet
                userId: data.userId,
                businessName: data.businessName,
                businessAddress: data.businessAddress,
                businessRegistrationNumber: data.businessRegistrationNumber,
                verificationStatus: "pending",
              } as LocationOwner;
            }
          } catch (fetchError) {
            console.error("❌ Error fetching created profile:", fetchError);
            // Return a minimal response so UI can continue
            return {
              locationOwnerId: 0, // We don't know the actual ID yet
              userId: data.userId,
              businessName: data.businessName,
              businessAddress: data.businessAddress,
              businessRegistrationNumber: data.businessRegistrationNumber,
              verificationStatus: "pending",
            } as LocationOwner;
          }
        } else {
          throw new Error(`Unexpected response: ${textResponse}`);
        }
      }
    } catch (error) {
      console.error("❌ Create location owner error:", error);
      throw error;
    }
  }

  /**
   * Get location owner profile by locationOwnerId
   */
  async getLocationOwnerById(
    locationOwnerId: number
  ): Promise<LocationOwner | null> {
    try {
      console.log("🔍 Getting location owner by ID:", locationOwnerId);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationOwner/GetByLocationOwnerId?id=${locationOwnerId}`
      );

      console.log("📥 Get location owner response status:", response.status);

      if (response.status === 404) {
        console.log("ℹ️ Location owner not found");
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Get location owner error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Location owner retrieved:", result);
      return result;
    } catch (error) {
      console.error("❌ Get location owner error:", error);
      throw error;
    }
  }

  /**
   * Update location owner profile
   */
  async updateLocationOwner(
    locationOwnerId: number,
    data: UpdateLocationOwnerRequest
  ): Promise<LocationOwner> {
    try {
      console.log("✏️ Updating location owner:", locationOwnerId, data);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationOwner/UpdateByLocationOwnerId?id=${locationOwnerId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        }
      );

      console.log("📥 Update location owner response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Update location owner error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        const result = await response.json();
        console.log("✅ Location owner updated (JSON):", result);
        return result;
      } else {
        // If API returns text, fetch the updated profile
        const textResponse = await response.text();
        console.log("✅ Location owner updated (text):", textResponse);

        // Fetch the updated profile
        const updatedProfile = await this.getLocationOwnerById(locationOwnerId);
        if (!updatedProfile) {
          throw new Error(
            "Profile updated but unable to retrieve updated data"
          );
        }
        return updatedProfile;
      }
    } catch (error) {
      console.error("❌ Update location owner error:", error);
      throw error;
    }
  }

  /**
   * Delete location owner profile
   */
  async deleteLocationOwner(locationOwnerId: number): Promise<boolean> {
    try {
      console.log("🗑️ Deleting location owner:", locationOwnerId);

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationOwner/DeleteByLocationOwnerId?id=${locationOwnerId}`,
        {
          method: "DELETE",
        }
      );

      console.log("📥 Delete location owner response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Delete location owner error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      console.log("✅ Location owner deleted");
      return true;
    } catch (error) {
      console.error("❌ Delete location owner error:", error);
      throw error;
    }
  }

  /**
   * Get all location owners (admin function)
   */
  async getAllLocationOwners(): Promise<LocationOwner[]> {
    try {
      console.log("📋 Getting all location owners");

      const response = await this.makeAuthenticatedRequest(
        `${API_BASE_URL}/api/LocationOwner`
      );

      console.log(
        "📥 Get all location owners response status:",
        response.status
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Get all location owners error:", errorText);
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ All location owners retrieved:", result);
      return result;
    } catch (error) {
      console.error("❌ Get all location owners error:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const venueOwnerProfileService = new VenueOwnerProfileService();
