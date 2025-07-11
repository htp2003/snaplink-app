// Get photographer profile by photographerId  
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net';

export interface Style {
  styleId: number;
  name: string;
  description: string;
  photographerCount: number;
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
  styleIds?: number[];
  // Additional fields from API response
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
}

export interface CreatePhotographerRequest {
  userId: number;
  yearsExperience: number;
  equipment: string;
  hourlyRate: number;
  availabilityStatus: string;
  rating: number;
  ratingSum: number;
  ratingCount: number;
  featuredStatus: boolean;
  verificationStatus: string;
  styleIds: number[];
}

export interface UpdatePhotographerRequest extends CreatePhotographerRequest {
  photographerId: number;
}

class PhotographerService {
  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const token = await AsyncStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }
  // Get featured photographers
  async getFeatured(): Promise<PhotographerProfile[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE_URL}/api/Photographer/featured`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching featured photographers:', error);
      throw error;
    }
  }

  // Get all photography 
  async getAll(): Promise<PhotographerProfile[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE_URL}/api/Photographer`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching photographers:', error);
      throw error;
    }
  }

  // Get all photography styles
  async getStyles(): Promise<Style[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE_URL}/api/Style`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching styles:', error);
      throw error;
    }
  }

  // Get photographer profile by photographerId - chỉ method này được giữ lại
  async getPhotographerProfile(photographerId: number): Promise<PhotographerProfile> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE_URL}/api/Photographer/${photographerId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Photographer profile not found');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching photographer profile:', error);
      throw error;
    }
  }

  // Create photographer profile
  async createPhotographerProfile(data: CreatePhotographerRequest): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE_URL}/api/Photographer`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      // Handle both JSON and text responses
      const contentType = response.headers.get('content-type');
      let result;
      if (contentType && contentType.includes('application/json')) {
        result = await response.json();
      } else {
        result = await response.text();
      }

      // Try to extract photographerId from response and store it
      let photographerId = null;
      if (typeof result === 'object' && result.photographerId) {
        photographerId = result.photographerId;
      } else if (typeof result === 'object' && result.id) {
        photographerId = result.id;
      }

      if (photographerId) {
        await this.storePhotographerId(data.userId, photographerId);
        console.log(`Stored photographerId ${photographerId} for userId ${data.userId}`);
      }

      return result;
    } catch (error) {
      console.error('Error creating photographer profile:', error);
      throw error;
    }
  }

  // Store photographerId in AsyncStorage after creating profile
  async storePhotographerId(userId: number, photographerId: number): Promise<void> {
    try {
      await AsyncStorage.setItem(`photographerId_${userId}`, photographerId.toString());
    } catch (error) {
      console.error('Error storing photographerId:', error);
    }
  }

  // Get stored photographerId for a userId
  async getStoredPhotographerId(userId: number): Promise<number | null> {
    try {
      const photographerId = await AsyncStorage.getItem(`photographerId_${userId}`);
      return photographerId ? parseInt(photographerId) : null;
    } catch (error) {
      console.error('Error getting stored photographerId:', error);
      return null;
    }
  }

  // Try to find photographer profile - check stored ID first, then try userId as fallback
  async findPhotographerProfile(userId: number): Promise<PhotographerProfile | null> {
    try {
      // First try stored photographerId
      const storedPhotographerId = await this.getStoredPhotographerId(userId);
      
      if (storedPhotographerId) {
        try {
          const profile = await this.getPhotographerProfile(storedPhotographerId);
          return profile;
        } catch (error) {
          if (error instanceof Error && error.message.includes('not found')) {
            // Stored ID is invalid, remove it
            await AsyncStorage.removeItem(`photographerId_${userId}`);
            console.log('Removed invalid stored photographerId');
          }
        }
      }

      // Fallback: try userId as photographerId (in case they're the same)
      try {
        const profile = await this.getPhotographerProfile(userId);
        // If successful, store this photographerId for future use
        await this.storePhotographerId(userId, profile.photographerId);
        console.log(`Found photographer profile with userId as photographerId, stored for future use`);
        return profile;
      } catch (error) {
        // No photographer profile exists
        return null;
      }
    } catch (error) {
      console.error('Error finding photographer profile:', error);
      return null;
    }
  }

  // Alias cho getById để tương thích code cũ
  getById(photographerId: number) {
    return this.getPhotographerProfile(photographerId);
  }

  // Lấy photographer available (filter phía client)
  async getAvailable(): Promise<PhotographerProfile[]> {
    const all = await this.getAll();
    return all.filter(p => p.availabilityStatus === 'available');
  }

  // Lấy photographer theo specialty (filter phía client)
  async getBySpecialty(specialty: string): Promise<PhotographerProfile[]> {
    const all = await this.getAll();
    return all.filter(p => p.specialty === specialty);
  }

  // Update photographer profile
  async updatePhotographerProfile(photographerId: number, data: Partial<UpdatePhotographerRequest>): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE_URL}/api/Photographer/${photographerId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      // Handle both JSON and text responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error('Error updating photographer profile:', error);
      throw error;
    }
  }

  // Get photographer styles
  async getPhotographerStyles(photographerId: number): Promise<Style[]> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE_URL}/api/Photographer/${photographerId}/styles`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching photographer styles:', error);
      throw error;
    }
  }

  // Add style to photographer
  async addStyleToPhotographer(photographerId: number, styleId: number): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE_URL}/api/Photographer/${photographerId}/styles/${styleId}`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Error adding style to photographer:', error);
      throw error;
    }
  }

  // Remove style from photographer
  async removeStyleFromPhotographer(photographerId: number, styleId: number): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await fetch(`${API_BASE_URL}/api/Photographer/${photographerId}/styles/${styleId}`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      return await response.text();
    } catch (error) {
      console.error('Error removing style from photographer:', error);
      throw error;
    }
  }

  // Batch update photographer styles
  async updatePhotographerStyles(photographerId: number, styleIds: number[]): Promise<void> {
    try {
      // Get current styles
      const currentStyles = await this.getPhotographerStyles(photographerId);
      const currentStyleIds = currentStyles.map(style => style.styleId);

      // Find styles to add and remove
      const stylesToAdd = styleIds.filter(id => !currentStyleIds.includes(id));
      const stylesToRemove = currentStyleIds.filter(id => !styleIds.includes(id));

      // Add new styles
      for (const styleId of stylesToAdd) {
        await this.addStyleToPhotographer(photographerId, styleId);
      }

      // Remove old styles
      for (const styleId of stylesToRemove) {
        await this.removeStyleFromPhotographer(photographerId, styleId);
      }
    } catch (error) {
      console.error('Error updating photographer styles:', error);
      throw error;
    }
  }
}

export const photographerService = new PhotographerService();