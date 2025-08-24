// services/photographerService.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

export interface Style {
  styleId: number;
  name: string;
  description?: string;
  photographerCount?: number;
}

export interface PhotographerProfile {
  photographerId: number;
  userId: number;
  yearsExperience: number;
  equipment: string;
  specialty?: string;
  portfolioUrl?: string;
  hourlyRate: number;
  availabilityStatus: string;
  rating: number;
  ratingSum: number;
  ratingCount: number;
  featuredStatus: boolean;
  verificationStatus: string;
  address?: string;
  googleMapsAddress?: string;
  latitude?: number;
  longitude?: number;
  styleIds?: number[];
  userName?: string;
  email?: string;
  phoneNumber?: string;
  fullName?: string;
  profileImage?: string;
  bio?: string;
  createAt?: string;
  updateAt?: string;
  status?: string;
  styles?: string[];
  user?: {
    userId: number;
    fullName: string;
    email: string;
    phoneNumber?: string;
    profileImage?: string;
    bio?: string;
  };
}

export interface CreatePhotographerRequest {
  userId: number;
  yearsExperience?: number;
  equipment?: string;
  hourlyRate?: number;
  availabilityStatus?: string;
  rating?: number;
  ratingSum?: number;
  ratingCount?: number;
  featuredStatus?: boolean;
  verificationStatus?: string;
  address?: string;
  googleMapsAddress?: string;
  latitude?: number;
  longitude?: number;
  styleIds?: number[];
  profileImage?: string; // Optional image URL
}

export interface UpdatePhotographerRequest {
  yearsExperience?: number;
  equipment?: string;
  hourlyRate?: number;
  availabilityStatus?: string;
  profileImage?: string;
  rating?: number;
  ratingSum?: number;
  ratingCount?: number;
  featuredStatus?: boolean;
  verificationStatus?: string;
  address?: string;
  googleMapsAddress?: string;
  latitude?: number;
  longitude?: number;
  styleIds?: number[];
}

export interface Review {
  reviewId: number;
  bookingId: number;
  reviewerId: number;
  revieweeId: number;
  revieweeType: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer?: {
    fullName: string;
    profileImage?: string;
  };
}

export interface PhotographerStyle {
  styleId: number;
  name: string;
  description?: string;
}

class PhotographerService {
  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const token = await AsyncStorage.getItem("token");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  // Basic CRUD operations
  async getAll(): Promise<PhotographerProfile[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE_URL}/api/Photographer`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching photographers:", error);
      throw error;
    }
  }

  async getById(photographerId: number): Promise<PhotographerProfile> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/Photographer/${photographerId}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Photographer not found");
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching photographer by ID:", error);
      throw error;
    }
  }

  async getDetail(photographerId: number): Promise<PhotographerProfile> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/Photographer/${photographerId}/detail`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Photographer detail not found");
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching photographer detail:", error);
      throw error;
    }
  }

  // NEW: Get nearby photographers
  async getNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 10
  ): Promise<PhotographerProfile[]> {
    try {
      const headers = await this.getHeaders();
      const url = `${API_BASE_URL}/api/Photographer/nearby?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm}`;
      
      console.log('Fetching nearby photographers:', url);
      
      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching nearby photographers:", error);
      throw error;
    }
  }

  // NEW: Get popular photographers
  async getPopular(
    latitude?: number,
    longitude?: number,
    page: number = 1,
    pageSize: number = 10
  ): Promise<PhotographerProfile[]> {
    try {
      const headers = await this.getHeaders();
      
      let url = `${API_BASE_URL}/api/Photographer/popular?page=${page}&pageSize=${pageSize}`;
      
      if (latitude !== undefined && longitude !== undefined) {
        url += `&latitude=${latitude}&longitude=${longitude}`;
      }
      
      console.log('Fetching popular photographers:', url);
      
      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching popular photographers:", error);
      throw error;
    }
  }

  // NEW: Get photographers by user styles (recommendations)
  async getByUserStyles(
    latitude?: number,
    longitude?: number
  ): Promise<PhotographerProfile[]> {
    try {
      const headers = await this.getHeaders();
      
      let url = `${API_BASE_URL}/api/Photographer/by-user-styles`;
      
      if (latitude !== undefined && longitude !== undefined) {
        url += `?latitude=${latitude}&longitude=${longitude}`;
      }
      
      console.log('Fetching photographers by user styles:', url);
      
      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching photographers by user styles:", error);
      throw error;
    }
  }

  // NEW: Get recommended photographers (combination of location and user preferences)
  async getRecommended(
    latitude?: number,
    longitude?: number,
    locationId?: number, // 🔧 undefined cho màn hình chính, có giá trị cho PhotographerModal
    radiusKm: number = 50,
    maxResults: number = 20
  ): Promise<PhotographerProfile[]> {
    try {
      const headers = await this.getHeaders();
  
      // 🔧 Build URL correctly
      let url = `${API_BASE_URL}/api/Photographer/recommend?radiusKm=${radiusKm}&maxResults=${maxResults}`;
  
      // 📍 Add lat/lng if provided and valid
      if (latitude != null && longitude != null) {
        url += `&latitude=${latitude}&longitude=${longitude}`;
        console.log(`📍 Added location: lat=${latitude}, lng=${longitude}`);
      } else {
        console.log(`⚠️ No location provided for recommend API`);
      }
  
      // 🏢 Only add locationId when provided (PhotographerModal case)
      // 🎯 KHÔNG thêm locationId cho màn hình chính (để undefined)
      if (locationId != null && locationId !== undefined) {
        url += `&locationId=${locationId}`;
        console.log(`🏢 Added locationId: ${locationId} (PhotographerModal case)`);
      } else {
        console.log(`🏠 HOME SCREEN: No locationId provided (as expected for main screen)`);
      }
  
      console.log("🎯 Final recommend API URL:", url);
  
      const response = await fetch(url, { 
        method: "GET", 
        headers 
      });
  
      if (!response.ok) {
        console.error("❌ Recommend API Error:", response.status, response.statusText);
        const errorText = await response.text();
        console.error("❌ Error response body:", errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
  
      const result = await response.json();
      console.log("🔍 Raw recommend API response:", JSON.stringify(result, null, 2));
  
      // 🔧 Normalize response - đảm bảo luôn trả về array
      let photographersArray: any[] = [];
      
      if (Array.isArray(result)) {
        photographersArray = result;
        console.log("✅ Direct array response, length:", result.length);
      } else if (result?.data && Array.isArray(result.data)) {
        photographersArray = result.data;
        console.log("✅ Found data array in response, length:", result.data.length);
      } else if (result?.$values && Array.isArray(result.$values)) {
        photographersArray = result.$values;
        console.log("✅ Found $values array in response, length:", result.$values.length);
      } else if (result && typeof result === 'object' && Object.keys(result).length > 0) {
        // Single photographer object
        photographersArray = [result];
        console.log("✅ Single photographer object, wrapped in array");
      } else {
        console.warn("⚠️ Unexpected recommend API response format:", result);
        photographersArray = [];
      }
  
      console.log("✅ Final processed recommend photographers array length:", photographersArray.length);
  
      // 🔍 DEBUG: Log first few photographers if exists
      if (photographersArray.length > 0) {
        console.log("🔍 First photographer in recommend response:", {
          photographerId: photographersArray[0]?.photographerId,
          id: photographersArray[0]?.id,
          fullName: photographersArray[0]?.fullName || photographersArray[0]?.user?.fullName,
          hasUser: !!photographersArray[0]?.user,
          allKeys: Object.keys(photographersArray[0] || {})
        });
        
        // Log first 3 photographers summary
        photographersArray.slice(0, 3).forEach((photographer, index) => {
          console.log(`🔍 Photographer ${index + 1}:`, {
            id: photographer.photographerId || photographer.id,
            name: photographer.fullName || photographer.user?.fullName || 'Unknown',
            rating: photographer.rating,
            hourlyRate: photographer.hourlyRate
          });
        });
      }
  
      return photographersArray;
  
    } catch (error) {
      console.error("❌ Error in getRecommended:", error);
      
      // 🔧 Log detailed error info
      if (error instanceof Error) {
        console.error("❌ Error message:", error.message);
        console.error("❌ Error stack:", error.stack);
      }
      
      // 🔧 Return empty array instead of throwing to prevent UI crashes
      console.log("🔧 Returning empty array due to error");
      return [];
    }
  }
  
  

  async create(data: CreatePhotographerRequest): Promise<PhotographerProfile> {
    try {
      const headers = await this.getHeaders();

      // Ensure styleIds are numbers
      const cleanData = {
        ...data,
        styleIds: data.styleIds?.map((id) => Number(id)) || [],
      };

      const response = await fetch(`${API_BASE_URL}/api/Photographer`, {
        method: "POST",
        headers,
        body: JSON.stringify(cleanData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Create photographer error response:", errorText);
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }

      const contentType = response.headers.get("content-type");
      let result;
      if (contentType && contentType.includes("application/json")) {
        result = await response.json();
      } else {
        result = await response.text();
      }

      return result;
    } catch (error) {
      console.error("Error creating photographer:", error);
      throw error;
    }
  }

  async update(
    photographerId: number,
    data: UpdatePhotographerRequest
  ): Promise<PhotographerProfile> {
    try {
      const headers = await this.getHeaders();

      // Ensure styleIds are numbers
      const cleanData = {
        ...data,
        styleIds: data.styleIds?.map((id) => Number(id)) || [],
      };

      const response = await fetch(
        `${API_BASE_URL}/api/Photographer/${photographerId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(cleanData),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Update photographer error response:", errorText);
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const result = await response.json();
        return result;
      } else {
        return { photographerId, ...cleanData } as PhotographerProfile;
      }
    } catch (error) {
      console.error("Error updating photographer:", error);
      throw error;
    }
  }

  async delete(photographerId: number): Promise<void> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/Photographer/${photographerId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error deleting photographer:", error);
      throw error;
    }
  }

  // Get all available styles from Style API
  async getStyles(): Promise<Style[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE_URL}/api/Style`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const styles = await response.json();
      return styles;
    } catch (error) {
      console.error("Error fetching styles:", error);
      throw error;
    }
  }

  // Style management - Fixed API endpoints based on Swagger
  async getPhotographerStyles(
    photographerId: number
  ): Promise<PhotographerStyle[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/Photographer/${photographerId}/styles`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return []; // Return empty array if no styles found
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const stylesData = await response.json();

      // API returns array of style names: ["Fashion", "Wedding", "Landscape"]
      // We need to convert to PhotographerStyle objects with styleId

      if (!Array.isArray(stylesData)) {
        console.warn("⚠️ Unexpected styles data format:", stylesData);
        return [];
      }

      // Get all available styles to map names to IDs
      const allStyles = await this.getStyles();

      // Map style names to PhotographerStyle objects
      const photographerStyles: PhotographerStyle[] = stylesData
        .map((styleName: string) => {
          const matchingStyle = allStyles.find(
            (style) => style.name === styleName
          );

          if (matchingStyle) {
            return {
              styleId: matchingStyle.styleId,
              name: matchingStyle.name,
              description: matchingStyle.description,
            };
          } else {
            console.warn(
              "⚠️ Could not find matching style for name:",
              styleName
            );
            return null;
          }
        })
        .filter((style) => style !== null) as PhotographerStyle[];

      return photographerStyles;
    } catch (error) {
      console.error("Error fetching photographer styles:", error);
      throw error;
    }
  }

  async addStyle(photographerId: number, styleId: number): Promise<void> {
    try {
      const headers = await this.getHeaders();

      const response = await fetch(
        `${API_BASE_URL}/api/Photographer/${photographerId}/styles/${styleId}`,
        {
          method: "POST",
          headers,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Add style error:", errorText);
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error adding style:", error);
      throw error;
    }
  }

  async removeStyle(photographerId: number, styleId: number): Promise<void> {
    try {
      const headers = await this.getHeaders();

      const response = await fetch(
        `${API_BASE_URL}/api/Photographer/${photographerId}/styles/${styleId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Remove style error:", errorText);
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }
    } catch (error) {
      console.error("Error removing style:", error);
      throw error;
    }
  }

  // Specialized queries
  async getFeatured(): Promise<PhotographerProfile[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/Photographer/featured`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching featured photographers:", error);
      throw error;
    }
  }

  async getAvailable(): Promise<PhotographerProfile[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/Photographer/available`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching available photographers:", error);
      throw error;
    }
  }

  async getByStyle(styleName: string): Promise<PhotographerProfile[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/Photographer/style/${encodeURIComponent(
          styleName
        )}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching photographers by style:", error);
      throw error;
    }
  }

  // Reviews
  async getReviews(photographerId: number): Promise<Review[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/Review/photographer/${photographerId}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching reviews:", error);
      throw error;
    }
  }

  async getAverageRating(
    photographerId: number
  ): Promise<{ averageRating: number }> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/Review/photographer/${photographerId}/average-rating`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching average rating:", error);
      throw error;
    }
  }

  // Status updates
  async updateAvailability(
    photographerId: number,
    status: string
  ): Promise<void> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/Photographer/${photographerId}/availability`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(status),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error updating availability:", error);
      throw error;
    }
  }

  async updateRating(photographerId: number, rating: number): Promise<void> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/Photographer/${photographerId}/rating`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(rating),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error updating rating:", error);
      throw error;
    }
  }

  async updateVerification(
    photographerId: number,
    status: string
  ): Promise<void> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/Photographer/${photographerId}/verify`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify(status),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error updating verification:", error);
      throw error;
    }
  }

  // Location management
  async updateLocation(
    photographerId: number,
    data: {
      address?: string;
      googleMapsAddress?: string;
      latitude?: number;
      longitude?: number;
    }
  ): Promise<void> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(
        `${API_BASE_URL}/api/Photographer/${photographerId}/location`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error updating location:", error);
      throw error;
    }
  }

  // Utility methods for AsyncStorage
  async storePhotographerId(
    userId: number,
    photographerId: number
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `photographerId_${userId}`,
        photographerId.toString()
      );
    } catch (error) {
      console.error("Error storing photographerId:", error);
    }
  }

  async getStoredPhotographerId(userId: number): Promise<number | null> {
    try {
      const photographerId = await AsyncStorage.getItem(
        `photographerId_${userId}`
      );
      return photographerId ? parseInt(photographerId) : null;
    } catch (error) {
      console.error("Error getting stored photographerId:", error);
      return null;
    }
  }

  async findPhotographerByUserId(
    userId: number
  ): Promise<PhotographerProfile | null> {
    try {
      // First try stored photographerId
      const storedPhotographerId = await this.getStoredPhotographerId(userId);

      if (storedPhotographerId) {
        try {
          const profile = await this.getById(storedPhotographerId);
          return profile;
        } catch (error) {
          if (error instanceof Error && error.message.includes("not found")) {
            // Stored ID is invalid, remove it
            await AsyncStorage.removeItem(`photographerId_${userId}`);
          }
        }
      }

      // Fallback: Search all photographers for matching userId
      try {
        const allPhotographers = await this.getAll();
        const matchingPhotographer = allPhotographers.find(
          (p) => p.userId === userId
        );

        if (matchingPhotographer) {
          // Store this photographerId for future use
          await this.storePhotographerId(
            userId,
            matchingPhotographer.photographerId
          );
          return matchingPhotographer;
        }
      } catch (error) {
        console.error("Error searching photographers by userId:", error);
      }

      // No photographer profile exists
      return null;
    } catch (error) {
      console.error("Error finding photographer by userId:", error);
      return null;
    }
  }
}

export const photographerService = new PhotographerService();