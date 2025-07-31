// services/venueOwnerImageService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

export interface ImageResponse {
  id: number;
  url: string;
  photographerId?: number;
  locationId?: number;
  photographerEventId?: number;
  isPrimary: boolean;
  caption?: string;
  createdAt: string;
}

class VenueOwnerImageService {
  private async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem("token");
  }

  /**
   * Upload image for location
   */
  async uploadLocationImage(
    locationId: number,
    imageUri: string,
    isPrimary: boolean = false,
    caption?: string
  ): Promise<ImageResponse> {
    try {
      const token = await this.getAuthToken();

      const formData = new FormData();

      // Append file - React Native format
      formData.append("File", {
        uri: imageUri,
        type: "image/jpeg",
        name: `location-${locationId}-${Date.now()}.jpg`,
      } as any);

      // Append location ID
      formData.append("LocationId", locationId.toString());

      // Append isPrimary
      formData.append("IsPrimary", isPrimary.toString());

      // Append caption if provided
      if (caption) {
        formData.append("Caption", caption);
      }

      console.log("📤 Uploading location image:", {
        locationId,
        isPrimary,
        caption,
        imageUri,
        token: token ? "Present" : "Missing",
      });

      console.log("📋 FormData contents:", {
        File: "Image file attached",
        LocationId: locationId.toString(),
        IsPrimary: isPrimary.toString(),
        Caption: caption || "No caption",
      });

      const response = await fetch(`${API_BASE_URL}/api/Image`, {
        method: "POST",
        headers: {
          // Không set Content-Type, để FormData tự handle
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      console.log("📥 Upload response status:", response.status);
      console.log("📥 Upload response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Upload response error:", errorText);
        console.error("❌ Response status:", response.status);
        console.error("❌ Response statusText:", response.statusText);
        throw new Error(
          errorText || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log("✅ Location image uploaded successfully:", result);
      return result;
    } catch (error) {
      console.error("❌ Upload location image error:", error);
      throw error;
    }
  }

  /**
   * Get all images for a location
   */
  async getLocationImages(locationId: number): Promise<ImageResponse[]> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(
        `${API_BASE_URL}/api/Image/location/${locationId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.status === 404) {
        console.log("ℹ️ No images found for location");
        return [];
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Location images retrieved:", result.length);
      return result;
    } catch (error) {
      console.error("❌ Get location images error:", error);
      throw error;
    }
  }

  /**
   * Get primary image for location
   */
  async getLocationPrimaryImage(
    locationId: number
  ): Promise<ImageResponse | null> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(
        `${API_BASE_URL}/api/Image/location/${locationId}/primary`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (response.status === 404) {
        console.log("ℹ️ No primary image found for location");
        return null;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Location primary image retrieved:", result);
      return result;
    } catch (error) {
      console.error("❌ Get location primary image error:", error);
      return null;
    }
  }

  /**
   * Set image as primary for location
   */
  async setPrimaryImage(imageId: number): Promise<boolean> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(
        `${API_BASE_URL}/api/Image/${imageId}/set-primary`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      console.log("✅ Image set as primary successfully");
      return true;
    } catch (error) {
      console.error("❌ Set primary image error:", error);
      return false;
    }
  }

  /**
   * Delete image
   */
  async deleteImage(imageId: number): Promise<boolean> {
    try {
      const token = await this.getAuthToken();

      const response = await fetch(`${API_BASE_URL}/api/Image/${imageId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      console.log("✅ Image deleted successfully");
      return true;
    } catch (error) {
      console.error("❌ Delete image error:", error);
      return false;
    }
  }

  /**
   * Upload multiple images for location
   */
  async uploadMultipleLocationImages(
    locationId: number,
    imageUris: string[],
    primaryIndex?: number
  ): Promise<ImageResponse[]> {
    try {
      const uploadPromises = imageUris.map((uri, index) => {
        const isPrimary = primaryIndex === index;
        return this.uploadLocationImage(locationId, uri, isPrimary);
      });

      const results = await Promise.all(uploadPromises);
      console.log("✅ Multiple location images uploaded:", results.length);
      return results;
    } catch (error) {
      console.error("❌ Upload multiple location images error:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const venueOwnerImageService = new VenueOwnerImageService();
