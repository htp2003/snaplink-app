// services/imageService.ts
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

export const imageService = {
  // === BASIC CRUD OPERATIONS - Updated for new API ===

  // Get all images for a photographer
  getPhotographerImages: async (photographerId: number): Promise<ImageResponse[]> => {
    try {
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

      return imageArray;
    } catch (error) {
      console.error(`Error fetching photographer images for ID ${photographerId}:`, error);
      return [];
    }
  },

  // Get all images for a location
  getLocationImages: async (locationId: number): Promise<ImageResponse[]> => {
    try {
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

      return imageArray;
    } catch (error) {
      console.error(`Error fetching location images for ID ${locationId}:`, error);
      return [];
    }
  },

  // Get all images for an event
  getEventImages: async (eventId: number): Promise<ImageResponse[]> => {
    try {
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

      return imageArray;
    } catch (error) {
      console.error(`Error fetching event images for ID ${eventId}:`, error);
      return [];
    }
  },

  // Get primary image for a photographer
  getPrimaryPhotographerImage: async (photographerId: number): Promise<ImageResponse | null> => {
    try {
      const response = await apiClient.get<ImageResponse>(
        ENDPOINTS.PRIMARY_BY_PHOTOGRAPHER(photographerId)
      );
      return response;
    } catch (error) {
      console.error(`Error fetching primary photographer image for ID ${photographerId}:`, error);
      return null;
    }
  },

  // Get primary image for a location
  getPrimaryLocationImage: async (locationId: number): Promise<ImageResponse | null> => {
    try {
      const response = await apiClient.get<ImageResponse>(
        ENDPOINTS.PRIMARY_BY_LOCATION(locationId)
      );
      return response;
    } catch (error) {
      console.error(`Error fetching primary location image for ID ${locationId}:`, error);
      return null;
    }
  },

  // Get primary image for an event
  getPrimaryEventImage: async (eventId: number): Promise<ImageResponse | null> => {
    try {
      const response = await apiClient.get<ImageResponse>(
        ENDPOINTS.PRIMARY_BY_EVENT(eventId)
      );
      return response;
    } catch (error) {
      console.error(`Error fetching primary event image for ID ${eventId}:`, error);
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
        console.error(`Unknown image type: ${type}`);
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
        console.error(`Unknown image type: ${type}`);
        return null;
    }
  },

  // Create new image - Updated to use multipart/form-data
  createImage: async (
    file: File, // File object for upload
    photographerId?: number,
    locationId?: number,
    photographerEventId?: number,
    isPrimary: boolean = false, 
    caption?: string
  ): Promise<ImageResponse | null> => {
    try {
      const formData = new FormData();
      formData.append('File', file);
      
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
      
      const response = await apiClient.post<ImageResponse>(ENDPOINTS.CREATE, formData);
      return response;
    } catch (error) {
      console.error('Error creating image:', error);
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
      return response;
    } catch (error) {
      console.error(`Error updating image ${imageId}:`, error);
      return null;
    }
  },

  // Delete image
  deleteImage: async (id: number): Promise<boolean> => {
    try {
      await apiClient.delete<void>(ENDPOINTS.DELETE(id));
      return true;
    } catch (error) {
      console.error(`Error deleting image ${id}:`, error);
      return false;
    }
  },

  // Set image as primary
  setPrimaryImage: async (id: number): Promise<boolean> => {
    try {
      await apiClient.put<void>(ENDPOINTS.SET_PRIMARY(id));
      return true;
    } catch (error) {
      console.error(`Error setting primary image ${id}:`, error);
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
    createImage: (file: File, photographerId: number, isPrimary?: boolean, caption?: string) => 
      imageService.createImage(file, photographerId, undefined, undefined, isPrimary, caption),
  },

  // Location images
  location: {
    getImages: (locationId: number) => 
      imageService.getLocationImages(locationId),
    getPrimaryImage: (locationId: number) => 
      imageService.getPrimaryLocationImage(locationId),
    createImage: (file: File, locationId: number, isPrimary?: boolean, caption?: string) => 
      imageService.createImage(file, undefined, locationId, undefined, isPrimary, caption),
  },

  // Event images
  event: {
    getImages: (eventId: number) => 
      imageService.getEventImages(eventId),
    getPrimaryImage: (eventId: number) => 
      imageService.getPrimaryEventImage(eventId),
    createImage: (file: File, eventId: number, isPrimary?: boolean, caption?: string) => 
      imageService.createImage(file, undefined, undefined, eventId, isPrimary, caption),
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

  // Upload multiple images for a type and reference ID
  uploadMultipleImages: async (
    files: File[],
    photographerId?: number,
    locationId?: number,
    photographerEventId?: number,
    primaryIndex?: number
  ): Promise<ImageResponse[]> => {
    try {
      const uploadPromises = files.map((file, index) => 
        imageService.createImage(
          file,
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
        } else {
          console.error(`Failed to upload image ${index + 1}:`, result);
        }
      });

      return successfulUploads;
    } catch (error) {
      console.error('Error uploading multiple images:', error);
      return [];
    }
  },

  // Delete multiple images
  deleteMultipleImages: async (imageIds: number[]): Promise<boolean[]> => {
    try {
      const deletePromises = imageIds.map(id => imageService.deleteImage(id));
      const results = await Promise.allSettled(deletePromises);
      
      return results.map(result => result.status === 'fulfilled' && result.value);
    } catch (error) {
      console.error('Error deleting multiple images:', error);
      return imageIds.map(() => false);
    }
  },
};