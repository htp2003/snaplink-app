// services/imageService.ts
import { 
    ImageResponse,
    CreateImageRequest,
    UpdateImageRequest
  } from '../types/image';
  import { apiClient } from './base';
  
  // Image API endpoints
  const ENDPOINTS = {
    // Get images by type and reference ID
    BY_TYPE_REF: (type: string, refId: number) => `/api/Image/type/${type}/ref/${refId}`,
    // Get primary image by type and reference ID
    PRIMARY_BY_TYPE_REF: (type: string, refId: number) => `/api/Image/type/${type}/ref/${refId}/primary`,
    // Get all images by type 
    BY_TYPE: (type: string) => `/api/Image/type/${type}`,
    // Get image by ID
    BY_ID: (id: number) => `/api/Image/${id}`,
    // Create image
    CREATE: '/api/Image',
    // Update image
    UPDATE: '/api/Image',
    // Delete image
    DELETE: (id: number) => `/api/Image/${id}`,
    // Set primary image
    SET_PRIMARY: (id: number) => `/api/Image/${id}/set-primary`,
  };
  
  export type ImageType = 'photographer' | 'location' | 'style' | 'event';
  
  export const imageService = {
    // === BASIC CRUD OPERATIONS ===
  
    // Get all images for a specific type and reference ID
    getImagesByTypeAndRef: async (type: ImageType, refId: number): Promise<ImageResponse[]> => {
      try {
        const response = await apiClient.get<ImageResponse[]>(
          ENDPOINTS.BY_TYPE_REF(type, refId)
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
        console.error(`Error fetching ${type} images for ID ${refId}:`, error);
        return [];
      }
    },
  
    // Get primary image for a specific type and reference ID
    getPrimaryImageByTypeAndRef: async (type: ImageType, refId: number): Promise<ImageResponse | null> => {
      try {
        const response = await apiClient.get<ImageResponse>(
          ENDPOINTS.PRIMARY_BY_TYPE_REF(type, refId)
        );
        return response;
      } catch (error) {
        console.error(`Error fetching primary ${type} image for ID ${refId}:`, error);
        return null;
      }
    },
  
    // Get all images by type (admin function)
    getAllImagesByType: async (type: ImageType): Promise<ImageResponse[]> => {
      try {
        const response = await apiClient.get<ImageResponse[]>(ENDPOINTS.BY_TYPE(type));
        
        let imageArray: ImageResponse[] = [];
        if (Array.isArray(response)) {
          imageArray = response;
        } else if (response && Array.isArray((response as any).$values)) {
          imageArray = (response as any).$values;
        }
  
        return imageArray;
      } catch (error) {
        console.error(`Error fetching all ${type} images:`, error);
        return [];
      }
    },
  
    // Get image by ID
    getImageById: async (id: number): Promise<ImageResponse | null> => {
      try {
        const response = await apiClient.get<ImageResponse>(ENDPOINTS.BY_ID(id));
        return response;
      } catch (error) {
        console.error(`Error fetching image by ID ${id}:`, error);
        return null;
      }
    },
  
    // Create new image
    createImage: async (
      type: ImageType, 
      refId: number, 
      imageUrl: string, 
      isPrimary: boolean = false, 
      caption?: string
    ): Promise<ImageResponse | null> => {
      try {
        const createRequest: CreateImageRequest = {
          url: imageUrl,
          type: type,
          refId: refId,
          isPrimary: isPrimary,
          caption: caption,
        };
        
        const response = await apiClient.post<ImageResponse>(ENDPOINTS.CREATE, createRequest);
        return response;
      } catch (error) {
        console.error(`Error creating ${type} image:`, error);
        return null;
      }
    },
  
    // Update image
    updateImage: async (
      imageId: number, 
      imageUrl?: string, 
      isPrimary?: boolean, 
      caption?: string
    ): Promise<ImageResponse | null> => {
      try {
        const updateRequest: UpdateImageRequest = {
          id: imageId,
          url: imageUrl,
          isPrimary: isPrimary,
          caption: caption,
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
        imageService.getImagesByTypeAndRef('photographer', photographerId),
      getPrimaryImage: (photographerId: number) => 
        imageService.getPrimaryImageByTypeAndRef('photographer', photographerId),
      createImage: (photographerId: number, imageUrl: string, isPrimary?: boolean, caption?: string) => 
        imageService.createImage('photographer', photographerId, imageUrl, isPrimary, caption),
      getAllImages: () => 
        imageService.getAllImagesByType('photographer'),
    },
  
    // Location images
    location: {
      getImages: (locationId: number) => 
        imageService.getImagesByTypeAndRef('location', locationId),
      getPrimaryImage: (locationId: number) => 
        imageService.getPrimaryImageByTypeAndRef('location', locationId),
      createImage: (locationId: number, imageUrl: string, isPrimary?: boolean, caption?: string) => 
        imageService.createImage('location', locationId, imageUrl, isPrimary, caption),
      getAllImages: () => 
        imageService.getAllImagesByType('location'),
    },
  
    // Style images
    style: {
      getImages: (styleId: number) => 
        imageService.getImagesByTypeAndRef('style', styleId),
      getPrimaryImage: (styleId: number) => 
        imageService.getPrimaryImageByTypeAndRef('style', styleId),
      createImage: (styleId: number, imageUrl: string, isPrimary?: boolean, caption?: string) => 
        imageService.createImage('style', styleId, imageUrl, isPrimary, caption),
      getAllImages: () => 
        imageService.getAllImagesByType('style'),
    },
  
    // Event images
    event: {
      getImages: (eventId: number) => 
        imageService.getImagesByTypeAndRef('event', eventId),
      getPrimaryImage: (eventId: number) => 
        imageService.getPrimaryImageByTypeAndRef('event', eventId),
      createImage: (eventId: number, imageUrl: string, isPrimary?: boolean, caption?: string) => 
        imageService.createImage('event', eventId, imageUrl, isPrimary, caption),
      getAllImages: () => 
        imageService.getAllImagesByType('event'),
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
      type: ImageType, 
      refId: number, 
      imageUrls: string[], 
      primaryIndex?: number
    ): Promise<ImageResponse[]> => {
      try {
        const uploadPromises = imageUrls.map((url, index) => 
          imageService.createImage(
            type, 
            refId, 
            url, 
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