import { useState, useCallback, useEffect } from "react";
import { ImageResponse } from "../types/image";
import { imageService, ImageType } from "../services/imageService";

export interface UseImagesReturn {
  images: ImageResponse[];
  imageUrls: string[];
  primaryImage: ImageResponse | null;
  primaryImageUrl: string | null;
  loading: boolean;
  error: string | null;
  fetchImages: () => Promise<void>;
  refresh: () => Promise<void>;
  createImage: (
    file: any,
    isPrimary?: boolean,
    caption?: string
  ) => Promise<ImageResponse | null>;
  updateImage: (
    imageId: number,
    options?: {
      photographerId?: number;
      locationId?: number;
      photographerEventId?: number;
      url?: string;
      isPrimary?: boolean;
      caption?: string;
    }
  ) => Promise<ImageResponse | null>;
  deleteImage: (imageId: number) => Promise<boolean>;
  setPrimaryImage: (imageId: number) => Promise<boolean>;
  uploadMultiple: (
    files: any[],
    primaryIndex?: number
  ) => Promise<ImageResponse[]>;
  clear: () => void;
}

// 🆕 ULTIMATE SILENT ERROR HANDLER - NO ERRORS BUBBLE UP
const silentImageCall = async <T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  operationName: string
): Promise<T> => {
  try {
    const result = await operation();
    return result;
  } catch (error: any) {
    // 🎯 COMPLETELY SILENT - NO CONSOLE.ERROR, NO THROW
    // Only log in development for debugging
    if (__DEV__) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      const errorStatus = error?.status || error?.response?.status;
      
      // Even in dev, keep 404s very quiet
      if (errorStatus === 404 || errorMessage.includes('404') || errorMessage.includes('Not Found')) {
        console.log(`📷 ${operationName}: No images found (404) - using fallback`);
      } else {
        console.log(`📷 ${operationName}: ${errorMessage} - using fallback`);
      }
    }
    
    // Always return fallback, never throw
    return fallbackValue;
  }
};

export const useImages = (type: ImageType, refId: number): UseImagesReturn => {
  const [images, setImages] = useState<ImageResponse[]>([]);
  const [primaryImage, setPrimaryImageState] = useState<ImageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); // Only for truly critical errors

  // Derived state - memoized to prevent unnecessary recalculations
  const imageUrls = imageService.extractImageUrls(images);
  const primaryImageUrl = primaryImage?.url || null;

  // Helper function to extract file info from various input formats
  const extractFileInfo = (file: any): { uri: string; fileName: string } => {
    try {
      // Handle different input formats
      if (typeof file === "string") {
        const fileName = file.split("/").pop() || "image.jpg";
        return { uri: file, fileName };
      }

      if (file && typeof file === "object") {
        if (file.uri) {
          const fileName = file.name || file.uri.split("/").pop() || "image.jpg";
          return { uri: file.uri, fileName };
        }
        if (file.name && file.size) {
          return { uri: file.uri || "", fileName: file.name };
        }
      }

      throw new Error(`Invalid file format: ${typeof file}`);
    } catch (err) {
      // Even file extraction errors should be silent
      console.log("📷 File extraction failed - using fallback");
      return { uri: "", fileName: "image.jpg" };
    }
  };

  // 🆕 COMPLETELY SILENT fetchImages - NO ERRORS EVER BUBBLE UP
  const fetchImages = useCallback(async () => {
    if (!refId || refId <= 0) {
      setImages([]);
      setPrimaryImageState(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null); // Clear any previous errors

    // 🎯 ULTRA SILENT: Use silentImageCall wrapper
    const imagesData = await silentImageCall(
      () => imageService.getImagesByType(type, refId),
      [] as ImageResponse[], // Fallback to empty array
      `Fetch ${type} images for ID ${refId}`
    );

    const primaryImageData = await silentImageCall(
      () => imageService.getPrimaryImageByType(type, refId),
      null as ImageResponse | null, // Fallback to null
      `Fetch ${type} primary image for ID ${refId}`
    );

    // Set results - these are guaranteed to be safe values
    setImages(imagesData);
    setPrimaryImageState(primaryImageData);
    
    setLoading(false);
    // Note: No error state is set because all errors are handled silently
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

  // 🆕 COMPLETELY SILENT createImage
  const createImage = useCallback(
    async (
      file: any,
      isPrimary: boolean = false,
      caption?: string
    ): Promise<ImageResponse | null> => {
      if (!refId || refId <= 0) {
        return null;
      }

      setLoading(true);
      setError(null);

      try {
        const { uri, fileName } = extractFileInfo(file);
        
        if (!uri) {
          setLoading(false);
          return null;
        }

        let newImage: ImageResponse | null = null;

        switch (type) {
          case "photographer":
            newImage = await silentImageCall(
              () => imageService.photographer.createImage(uri, fileName, refId, isPrimary, caption),
              null,
              `Create ${type} image`
            );
            break;
          case "location":
            newImage = await silentImageCall(
              () => imageService.location.createImage(uri, fileName, refId, isPrimary, caption),
              null,
              `Create ${type} image`
            );
            break;
          case "event":
            newImage = await silentImageCall(
              () => imageService.event.createImage(uri, fileName, refId, isPrimary, caption),
              null,
              `Create ${type} image`
            );
            break;
          default:
            setLoading(false);
            return null;
        }

        if (newImage) {
          // Refresh images silently
          await fetchImages();
        }

        setLoading(false);
        return newImage;
      } catch (err) {
        // Even this catch should be silent
        setLoading(false);
        return null;
      }
    },
    [type, refId, fetchImages]
  );

  // 🆕 COMPLETELY SILENT updateImage
  const updateImage = useCallback(
    async (
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
      setLoading(true);
      setError(null);

      const updatedImage = await silentImageCall(
        () => imageService.updateImage(
          imageId,
          options?.photographerId,
          options?.locationId,
          options?.photographerEventId,
          options?.url,
          options?.isPrimary,
          options?.caption
        ),
        null,
        `Update ${type} image ${imageId}`
      );

      if (updatedImage) {
        await fetchImages();
      }

      setLoading(false);
      return updatedImage;
    },
    [type, fetchImages]
  );

  // 🆕 COMPLETELY SILENT deleteImage
  const deleteImage = useCallback(
    async (imageId: number): Promise<boolean> => {
      setLoading(true);
      setError(null);

      const success = await silentImageCall(
        () => imageService.deleteImage(imageId),
        false,
        `Delete ${type} image ${imageId}`
      );

      if (success) {
        await fetchImages();
      }

      setLoading(false);
      return success;
    },
    [type, fetchImages]
  );

  // 🆕 COMPLETELY SILENT setPrimaryImage
  const setPrimaryImage = useCallback(
    async (imageId: number): Promise<boolean> => {
      setLoading(true);
      setError(null);

      const success = await silentImageCall(
        () => imageService.setPrimaryImage(imageId),
        false,
        `Set primary ${type} image ${imageId}`
      );

      if (success) {
        await fetchImages();
      }

      setLoading(false);
      return success;
    },
    [type, fetchImages]
  );

  // 🆕 COMPLETELY SILENT uploadMultiple
  const uploadMultiple = useCallback(
    async (
      files: any[],
      primaryIndex?: number
    ): Promise<ImageResponse[]> => {
      if (!refId || refId <= 0) {
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        // Convert files to proper format
        const imageAssets = files.map((file) => {
          const { uri, fileName } = extractFileInfo(file);
          return { uri, fileName };
        }).filter(asset => asset.uri); // Filter out invalid files

        if (imageAssets.length === 0) {
          setLoading(false);
          return [];
        }

        let uploadedImages: ImageResponse[] = [];

        switch (type) {
          case "photographer":
            uploadedImages = await silentImageCall(
              () => imageService.uploadMultipleImages(imageAssets, refId, undefined, undefined, primaryIndex),
              [],
              `Upload multiple ${type} images`
            );
            break;
          case "location":
            uploadedImages = await silentImageCall(
              () => imageService.uploadMultipleImages(imageAssets, undefined, refId, undefined, primaryIndex),
              [],
              `Upload multiple ${type} images`
            );
            break;
          case "event":
            uploadedImages = await silentImageCall(
              () => imageService.uploadMultipleImages(imageAssets, undefined, undefined, refId, primaryIndex),
              [],
              `Upload multiple ${type} images`
            );
            break;
          default:
            setLoading(false);
            return [];
        }

        if (uploadedImages.length > 0) {
          await fetchImages();
        }

        setLoading(false);
        return uploadedImages;
      } catch (err) {
        setLoading(false);
        return [];
      }
    },
    [type, refId, fetchImages]
  );

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
    error, // Will almost always be null now
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
  useImages("photographer", photographerId);

export const useLocationImages = (locationId: number) =>
  useImages("location", locationId);

export const useEventImages = (eventId: number) => useImages("event", eventId);

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
export const usePhotographerPrimaryImage = (
  photographerId: number
): string | null => {
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