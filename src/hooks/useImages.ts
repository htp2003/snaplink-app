import { useState, useCallback, useEffect } from 'react';
import { ImageResponse } from '../types/image';
import { imageService, ImageType } from '../services/imageService';

export interface UseImagesReturn {
  images: ImageResponse[];
  imageUrls: string[];
  primaryImage: ImageResponse | null;
  primaryImageUrl: string | null;
  loading: boolean;
  error: string | null;
  fetchImages: () => Promise<void>;
  refresh: () => Promise<void>;
  createImage: (file: File, isPrimary?: boolean, caption?: string) => Promise<ImageResponse | null>;
  updateImage: (imageId: number, options?: {
    photographerId?: number;
    locationId?: number;
    photographerEventId?: number;
    url?: string;
    isPrimary?: boolean;
    caption?: string;
  }) => Promise<ImageResponse | null>;
  deleteImage: (imageId: number) => Promise<boolean>;
  setPrimaryImage: (imageId: number) => Promise<boolean>;
  uploadMultiple: (files: File[], primaryIndex?: number) => Promise<ImageResponse[]>;
  clear: () => void;
}

export const useImages = (type: ImageType, refId: number): UseImagesReturn => {
  const [images, setImages] = useState<ImageResponse[]>([]);
  const [primaryImage, setPrimaryImageState] = useState<ImageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived state - memoized to prevent unnecessary recalculations
  const imageUrls = imageService.extractImageUrls(images);
  const primaryImageUrl = primaryImage?.url || null;

  // Fetch images for the specified type and reference ID
  const fetchImages = useCallback(async () => {
    if (!refId || refId <= 0) {
      setImages([]);
      setPrimaryImageState(null);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`Fetching ${type} images for ID ${refId}...`);
      
      // Fetch both images and primary image in parallel
      const [imagesData, primaryImageData] = await Promise.all([
        imageService.getImagesByType(type, refId),
        imageService.getPrimaryImageByType(type, refId)
      ]);
      
      console.log(`${type} images fetched:`, {
        totalImages: imagesData.length,
        primaryImage: primaryImageData?.url || 'none',
        imageUrls: imagesData.map(img => img.url)
      });

      setImages(imagesData);
      setPrimaryImageState(primaryImageData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch images';
      setError(errorMessage);
      console.error(`Error fetching ${type} images:`, err);
    } finally {
      setLoading(false);
    }
  }, [type, refId]);

  // Auto-fetch when refId changes
  useEffect(() => {
    if (refId && refId > 0) {
      fetchImages();
    } else {
      // Clear images when refId is invalid
      setImages([]);
      setPrimaryImageState(null);
      setError(null);
    }
  }, [fetchImages]);

  // Refresh images (alias for fetchImages)
  const refresh = useCallback(() => fetchImages(), [fetchImages]);

  // Create new image - Updated to use File instead of URL
  const createImage = useCallback(async (
    file: File, 
    isPrimary: boolean = false, 
    caption?: string
  ): Promise<ImageResponse | null> => {
    if (!refId || refId <= 0) return null;
    
    try {
      setLoading(true);
      setError(null);
      
      let newImage: ImageResponse | null = null;
      
      // Call appropriate create method based on type
      switch (type) {
        case 'photographer':
          newImage = await imageService.photographer.createImage(file, refId, isPrimary, caption);
          break;
        case 'location':
          newImage = await imageService.location.createImage(file, refId, isPrimary, caption);
          break;
        case 'event':
          newImage = await imageService.event.createImage(file, refId, isPrimary, caption);
          break;
        default:
          console.error(`Unknown image type: ${type}`);
          return null;
      }
      
      if (newImage) {
        // Refresh images to get updated list
        await fetchImages();
        console.log(`Created new ${type} image:`, newImage.url);
      }
      
      return newImage;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create image';
      setError(errorMessage);
      console.error(`Error creating ${type} image:`, err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [type, refId, fetchImages]);

  // Update image - Updated with new parameters
  const updateImage = useCallback(async (
    imageId: number,
    options?: {
      photographerId?: number;
      locationId?: number;
      photographerEventId?: number;
      url?: string;
      isPrimary?: boolean;
      caption?: string;
    }
  ): Promise<ImageResponse | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedImage = await imageService.updateImage(
        imageId,
        options?.photographerId,
        options?.locationId,
        options?.photographerEventId,
        options?.url,
        options?.isPrimary,
        options?.caption
      );
      
      if (updatedImage) {
        // Refresh images to get updated list
        await fetchImages();
        console.log(`Updated ${type} image:`, updatedImage.url);
      }
      
      return updatedImage;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update image';
      setError(errorMessage);
      console.error(`Error updating ${type} image:`, err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [type, fetchImages]);

  // Delete image
  const deleteImage = useCallback(async (imageId: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const success = await imageService.deleteImage(imageId);
      
      if (success) {
        // Refresh images to get updated list
        await fetchImages();
        console.log(`Deleted ${type} image ID:`, imageId);
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete image';
      setError(errorMessage);
      console.error(`Error deleting ${type} image:`, err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [type, fetchImages]);

  // Set primary image
  const setPrimaryImage = useCallback(async (imageId: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const success = await imageService.setPrimaryImage(imageId);
      
      if (success) {
        // Refresh images to get updated primary status
        await fetchImages();
        console.log(`Set primary ${type} image ID:`, imageId);
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set primary image';
      setError(errorMessage);
      console.error(`Error setting primary ${type} image:`, err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [type, fetchImages]);

  // Upload multiple images - Updated to use Files
  const uploadMultiple = useCallback(async (
    files: File[], 
    primaryIndex?: number
  ): Promise<ImageResponse[]> => {
    if (!refId || refId <= 0) return [];
    
    try {
      setLoading(true);
      setError(null);
      
      let uploadedImages: ImageResponse[] = [];
      
      // Call appropriate upload method based on type
      switch (type) {
        case 'photographer':
          uploadedImages = await imageService.uploadMultipleImages(
            files, refId, undefined, undefined, primaryIndex
          );
          break;
        case 'location':
          uploadedImages = await imageService.uploadMultipleImages(
            files, undefined, refId, undefined, primaryIndex
          );
          break;
        case 'event':
          uploadedImages = await imageService.uploadMultipleImages(
            files, undefined, undefined, refId, primaryIndex
          );
          break;
        default:
          console.error(`Unknown image type: ${type}`);
          return [];
      }
      
      if (uploadedImages.length > 0) {
        // Refresh images to get updated list
        await fetchImages();
        console.log(`Uploaded ${uploadedImages.length} ${type} images`);
      }
      
      return uploadedImages;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload images';
      setError(errorMessage);
      console.error(`Error uploading multiple ${type} images:`, err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [type, refId, fetchImages]);

  // Clear state
  const clear = useCallback(() => {
    setImages([]);
    setPrimaryImageState(null);
    setError(null);
  }, []);

  return {
    images,
    imageUrls,
    primaryImage,
    primaryImageUrl,
    loading,
    error,
    fetchImages,
    refresh,
    createImage,
    updateImage,
    deleteImage,
    setPrimaryImage,
    uploadMultiple,
    clear,
  };
};

// Convenience hooks for specific types
export const usePhotographerImages = (photographerId: number) => 
  useImages('photographer', photographerId);

export const useLocationImages = (locationId: number) => 
  useImages('location', locationId);

export const useEventImages = (eventId: number) => 
  useImages('event', eventId);

// Quick hooks to get just the images without full CRUD functionality
export const usePhotographerImageUrls = (photographerId: number): string[] => {
  const { imageUrls } = usePhotographerImages(photographerId);
  return imageUrls;
};

export const useLocationImageUrls = (locationId: number): string[] => {
  const { imageUrls } = useLocationImages(locationId);
  return imageUrls;
};

export const useEventImageUrls = (eventId: number): string[] => {
  const { imageUrls } = useEventImages(eventId);
  return imageUrls;
};

// Hooks to get primary image only
export const usePhotographerPrimaryImage = (photographerId: number): string | null => {
  const { primaryImageUrl } = usePhotographerImages(photographerId);
  return primaryImageUrl;
};

export const useLocationPrimaryImage = (locationId: number): string | null => {
  const { primaryImageUrl } = useLocationImages(locationId);
  return primaryImageUrl;
};

export const useEventPrimaryImage = (eventId: number): string | null => {
  const { primaryImageUrl } = useEventImages(eventId);
  return primaryImageUrl;
};