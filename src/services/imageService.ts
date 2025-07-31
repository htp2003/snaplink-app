// services/imageService.ts (FIXED VERSION)
import { 
  ImageResponse,
  CreateImageRequest,
  UpdateImageRequest
} from '../types/image';
import { apiClient } from './base';

// Image API endpoints - Updated based on OpenAPI spec
const ENDPOINTS = {
  // Get images by photographer ID
  BY_PHOTOGRAPHER: (photographerId: number) => `/api/Image/photographer/${photographerId}`,
  // Get images by location ID
  BY_LOCATION: (locationId: number) => `/api/Image/location/${locationId}`,
  // Get images by event ID
  BY_EVENT: (eventId: number) => `/api/Image/event/${eventId}`,
  // Get primary image by photographer ID
  PRIMARY_BY_PHOTOGRAPHER: (photographerId: number) => `/api/Image/photographer/${photographerId}/primary`,
  // Get primary image by location ID
  PRIMARY_BY_LOCATION: (locationId: number) => `/api/Image/location/${locationId}/primary`,
  // Get primary image by event ID
  PRIMARY_BY_EVENT: (eventId: number) => `/api/Image/event/${eventId}/primary`,
  // Create image (multipart/form-data)
  CREATE: '/api/Image',
  // Update image
  UPDATE: '/api/Image',
  // Delete image
  DELETE: (id: number) => `/api/Image/${id}`,
  // Set primary image
  SET_PRIMARY: (id: number) => `/api/Image/${id}/set-primary`,
};

export type ImageType = 'photographer' | 'location' | 'event';

// Helper function to create proper FormData for React Native
const createFormDataForImage = (
  fileUri: string,
  fileName: string,
  photographerId?: number,
  locationId?: number,
  photographerEventId?: number,
  isPrimary: boolean = false,
  caption?: string
) => {
  const formData = new FormData();
  
  // CRITICAL: This is the correct way to append files in React Native
  formData.append('File', {
    uri: fileUri,
    type: 'image/jpeg', // or determine from file extension
    name: fileName,
  } as any);
  
  // Append other fields
  if (photographerId) {
    formData.append('PhotographerId', photographerId.toString());
  }
  if (locationId) {
    formData.append('LocationId', locationId.toString());
  }
  if (photographerEventId) {
    formData.append('PhotographerEventId', photographerEventId.toString());
  }
  formData.append('IsPrimary', isPrimary.toString());
  if (caption) {
    formData.append('Caption', caption);
  }
  
  return formData;
};

// Helper function to make multipart API calls
const uploadImageWithFormData = async (formData: FormData): Promise<ImageResponse | null> => {
  try {
    console.log('🚀 Uploading image with FormData...');
    
    // Use fetch directly for multipart uploads instead of apiClient
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api-url.com'}${ENDPOINTS.CREATE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        // Add your auth headers here if needed
        // 'Authorization': `Bearer ${your-token}`,
      },
      body: formData,
    });

    console.log('📡 Upload response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Upload failed:', errorText);
      throw new Error(`Upload failed: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Upload successful:', result);
    return result;
  } catch (error) {
    console.error('💥 Upload error:', error);
    throw error;
  }
};

export const imageService = {
  // === BASIC CRUD OPERATIONS - Updated for new API ===

  // Get all images for a photographer
  getPhotographerImages: async (photographerId: number): Promise<ImageResponse[]> => {
    try {
      console.log(`📥 Fetching photographer images for ID: ${photographerId}`);
      const response = await apiClient.get<ImageResponse[]>(
        ENDPOINTS.BY_PHOTOGRAPHER(photographerId)
      );
      
      // Handle different response formats from API
      let imageArray: ImageResponse[] = [];
      if (Array.isArray(response)) {
        imageArray = response;
      } else if (response && Array.isArray((response as any).$values)) {
        imageArray = (response as any).$values;
      } else if (response && typeof response === 'object') {
        // Single object response, wrap in array
        imageArray = [response as ImageResponse];
      }

      console.log(`✅ Fetched ${imageArray.length} photographer images`);
      return imageArray;
    } catch (error) {
      console.error(`❌ Error fetching photographer images for ID ${photographerId}:`, error);
      return [];
    }
  },

  // Get all images for a location
  getLocationImages: async (locationId: number): Promise<ImageResponse[]> => {
    try {
      console.log(`📥 Fetching location images for ID: ${locationId}`);
      const response = await apiClient.get<ImageResponse[]>(
        ENDPOINTS.BY_LOCATION(locationId)
      );
      
      let imageArray: ImageResponse[] = [];
      if (Array.isArray(response)) {
        imageArray = response;
      } else if (response && Array.isArray((response as any).$values)) {
        imageArray = (response as any).$values;
      } else if (response && typeof response === 'object') {
        imageArray = [response as ImageResponse];
      }

      console.log(`✅ Fetched ${imageArray.length} location images`);
      return imageArray;
    } catch (error) {
      console.error(`❌ Error fetching location images for ID ${locationId}:`, error);
      return [];
    }
  },

  // Get all images for an event
  getEventImages: async (eventId: number): Promise<ImageResponse[]> => {
    try {
      console.log(`📥 Fetching event images for ID: ${eventId}`);
      const response = await apiClient.get<ImageResponse[]>(
        ENDPOINTS.BY_EVENT(eventId)
      );
      
      let imageArray: ImageResponse[] = [];
      if (Array.isArray(response)) {
        imageArray = response;
      } else if (response && Array.isArray((response as any).$values)) {
        imageArray = (response as any).$values;
      } else if (response && typeof response === 'object') {
        imageArray = [response as ImageResponse];
      }

      console.log(`✅ Fetched ${imageArray.length} event images`);
      return imageArray;
    } catch (error) {
      console.error(`❌ Error fetching event images for ID ${eventId}:`, error);
      return [];
    }
  },

  // Get primary image for a photographer
  getPrimaryPhotographerImage: async (photographerId: number): Promise<ImageResponse | null> => {
    try {
      console.log(`📥 Fetching primary photographer image for ID: ${photographerId}`);
      const response = await apiClient.get<ImageResponse>(
        ENDPOINTS.PRIMARY_BY_PHOTOGRAPHER(photographerId)
      );
      console.log(`✅ Fetched primary photographer image`);
      return response;
    } catch (error) {
      console.error(`❌ Error fetching primary photographer image for ID ${photographerId}:`, error);
      return null;
    }
  },

  // Get primary image for a location
  getPrimaryLocationImage: async (locationId: number): Promise<ImageResponse | null> => {
    try {
      console.log(`📥 Fetching primary location image for ID: ${locationId}`);
      const response = await apiClient.get<ImageResponse>(
        ENDPOINTS.PRIMARY_BY_LOCATION(locationId)
      );
      console.log(`✅ Fetched primary location image`);
      return response;
    } catch (error) {
      console.error(`❌ Error fetching primary location image for ID ${locationId}:`, error);
      return null;
    }
  },

  // Get primary image for an event
  getPrimaryEventImage: async (eventId: number): Promise<ImageResponse | null> => {
    try {
      console.log(`📥 Fetching primary event image for ID: ${eventId}`);
      const response = await apiClient.get<ImageResponse>(
        ENDPOINTS.PRIMARY_BY_EVENT(eventId)
      );
      console.log(`✅ Fetched primary event image`);
      return response;
    } catch (error) {
      console.error(`❌ Error fetching primary event image for ID ${eventId}:`, error);
      return null;
    }
  },

  // Generic method to get images by type and ID
  getImagesByType: async (type: ImageType, id: number): Promise<ImageResponse[]> => {
    switch (type) {
      case 'photographer':
        return imageService.getPhotographerImages(id);
      case 'location':
        return imageService.getLocationImages(id);
      case 'event':
        return imageService.getEventImages(id);
      default:
        console.error(`❌ Unknown image type: ${type}`);
        return [];
    }
  },

  // Generic method to get primary image by type and ID
  getPrimaryImageByType: async (type: ImageType, id: number): Promise<ImageResponse | null> => {
    switch (type) {
      case 'photographer':
        return imageService.getPrimaryPhotographerImage(id);
      case 'location':
        return imageService.getPrimaryLocationImage(id);
      case 'event':
        return imageService.getPrimaryEventImage(id);
      default:
        console.error(`❌ Unknown image type: ${type}`);
        return null;
    }
  },

  // Create new image - FIXED VERSION
  createImage: async (
    fileUri: string, // Changed from File object to URI string for React Native
    fileName: string, // Add fileName parameter
    photographerId?: number,
    locationId?: number,
    photographerEventId?: number,
    isPrimary: boolean = false, 
    caption?: string
  ): Promise<ImageResponse | null> => {
    try {
      console.log('🚀 Creating image:', {
        fileUri: fileUri.substring(0, 50) + '...',
        fileName,
        photographerId,
        locationId,
        photographerEventId,
        isPrimary,
        caption
      });

      const formData = createFormDataForImage(
        fileUri,
        fileName,
        photographerId,
        locationId,
        photographerEventId,
        isPrimary,
        caption
      );
      
      const response = await uploadImageWithFormData(formData);
      
      if (response) {
        console.log('✅ Image created successfully:', response.id);
      }
      
      return response;
    } catch (error) {
      console.error('❌ Error creating image:', error);
      return null;
    }
  },

  // Update image - Updated based on UpdateImageRequest schema
  updateImage: async (
    imageId: number,
    photographerId?: number,
    locationId?: number,
    photographerEventId?: number,
    url?: string,
    isPrimary?: boolean, 
    caption?: string
  ): Promise<ImageResponse | null> => {
    try {
      console.log(`🔄 Updating image ${imageId}`);
      
      const updateRequest: UpdateImageRequest = {
        id: imageId,
        photographerId,
        locationId,
        photographerEventId,
        url,
        isPrimary,
        caption,
      };
      
      const response = await apiClient.put<ImageResponse>(ENDPOINTS.UPDATE, updateRequest);
      
      if (response) {
        console.log(`✅ Image ${imageId} updated successfully`);
      }
      
      return response;
    } catch (error) {
      console.error(`❌ Error updating image ${imageId}:`, error);
      return null;
    }
  },

  // Delete image
  deleteImage: async (id: number): Promise<boolean> => {
    try {
      console.log(`🗑️  Deleting image ${id}`);
      await apiClient.delete<void>(ENDPOINTS.DELETE(id));
      console.log(`✅ Image ${id} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting image ${id}:`, error);
      return false;
    }
  },

  // Set image as primary
  setPrimaryImage: async (id: number): Promise<boolean> => {
    try {
      console.log(`⭐ Setting image ${id} as primary`);
      await apiClient.put<void>(ENDPOINTS.SET_PRIMARY(id));
      console.log(`✅ Image ${id} set as primary successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Error setting primary image ${id}:`, error);
      return false;
    }
  },

  // === CONVENIENCE METHODS FOR SPECIFIC TYPES ===

  // Photographer images
  photographer: {
    getImages: (photographerId: number) => 
      imageService.getPhotographerImages(photographerId),
    getPrimaryImage: (photographerId: number) => 
      imageService.getPrimaryPhotographerImage(photographerId),
    createImage: (fileUri: string, fileName: string, photographerId: number, isPrimary?: boolean, caption?: string) => 
      imageService.createImage(fileUri, fileName, photographerId, undefined, undefined, isPrimary, caption),
  },

  // Location images
  location: {
    getImages: (locationId: number) => 
      imageService.getLocationImages(locationId),
    getPrimaryImage: (locationId: number) => 
      imageService.getPrimaryLocationImage(locationId),
    createImage: (fileUri: string, fileName: string, locationId: number, isPrimary?: boolean, caption?: string) => 
      imageService.createImage(fileUri, fileName, undefined, locationId, undefined, isPrimary, caption),
  },

  // Event images
  event: {
    getImages: (eventId: number) => 
      imageService.getEventImages(eventId),
    getPrimaryImage: (eventId: number) => 
      imageService.getPrimaryEventImage(eventId),
    createImage: (fileUri: string, fileName: string, eventId: number, isPrimary?: boolean, caption?: string) => 
      imageService.createImage(fileUri, fileName, undefined, undefined, eventId, isPrimary, caption),
  },

  // === UTILITY METHODS ===

  // Extract image URLs from ImageResponse array
  extractImageUrls: (images: ImageResponse[]): string[] => {
    return images.map(img => img.url).filter(url => url !== undefined && url !== null);
  },

  // Find primary image from array
  findPrimaryImage: (images: ImageResponse[]): ImageResponse | null => {
    return images.find(img => img.isPrimary) || null;
  },

  // Get first image URL or null
  getFirstImageUrl: (images: ImageResponse[]): string | null => {
    const urls = imageService.extractImageUrls(images);
    return urls.length > 0 ? urls[0] : null;
  },

  // Get primary image URL or first image URL or null
  getPrimaryOrFirstImageUrl: (images: ImageResponse[]): string | null => {
    const primary = imageService.findPrimaryImage(images);
    if (primary?.url) return primary.url;
    return imageService.getFirstImageUrl(images);
  },

  // === BATCH OPERATIONS ===

  // Upload multiple images for a type and reference ID - FIXED VERSION
  uploadMultipleImages: async (
    imageAssets: Array<{ uri: string; fileName: string }>, // Changed structure
    photographerId?: number,
    locationId?: number,
    photographerEventId?: number,
    primaryIndex?: number
  ): Promise<ImageResponse[]> => {
    try {
      console.log(`🚀 Uploading ${imageAssets.length} images...`);
      
      const uploadPromises = imageAssets.map((asset, index) => 
        imageService.createImage(
          asset.uri,
          asset.fileName,
          photographerId,
          locationId,
          photographerEventId,
          index === primaryIndex, // Set as primary if it's the primary index
          `Image ${index + 1}`
        )
      );

      const results = await Promise.allSettled(uploadPromises);
      
      // Filter successful uploads
      const successfulUploads: ImageResponse[] = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          successfulUploads.push(result.value);
          console.log(`✅ Image ${index + 1} uploaded successfully`);
        } else {
          console.error(`❌ Failed to upload image ${index + 1}:`, result);
        }
      });

      console.log(`✅ Successfully uploaded ${successfulUploads.length}/${imageAssets.length} images`);
      return successfulUploads;
    } catch (error) {
      console.error('❌ Error uploading multiple images:', error);
      return [];
    }
  },

  // Delete multiple images
  deleteMultipleImages: async (imageIds: number[]): Promise<boolean[]> => {
    try {
      console.log(`🗑️  Deleting ${imageIds.length} images...`);
      
      const deletePromises = imageIds.map(id => imageService.deleteImage(id));
      const results = await Promise.allSettled(deletePromises);
      
      const resultArray = results.map((result, index) => {
        const success = result.status === 'fulfilled' && result.value;
        if (success) {
          console.log(`✅ Image ${imageIds[index]} deleted successfully`);
        } else {
          console.error(`❌ Failed to delete image ${imageIds[index]}`);
        }
        return success;
      });

      const successCount = resultArray.filter(Boolean).length;
      console.log(`✅ Successfully deleted ${successCount}/${imageIds.length} images`);
      
      return resultArray;
    } catch (error) {
      console.error('❌ Error deleting multiple images:', error);
      return imageIds.map(() => false);
    }
  },
};