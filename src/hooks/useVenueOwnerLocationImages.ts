// hooks/useVenueOwnerLocationImages.ts
import { useState, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import {
  venueOwnerImageService,
  ImageResponse,
} from "../services/venueOwnerImageService.ts";

export interface UseVenueOwnerLocationImagesReturn {
  images: ImageResponse[];
  primaryImage: ImageResponse | null;
  loading: boolean;
  error: string | null;
  uploadImage: (
    imageUri: string,
    isPrimary?: boolean,
    caption?: string
  ) => Promise<ImageResponse | null>;
  uploadMultipleImages: (
    imageUris: string[],
    primaryIndex?: number
  ) => Promise<ImageResponse[]>;
  fetchImages: () => Promise<void>;
  setPrimaryImage: (imageId: number) => Promise<boolean>;
  deleteImage: (imageId: number) => Promise<boolean>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export const useVenueOwnerLocationImages = (
  locationId: number
): UseVenueOwnerLocationImagesReturn => {
  const [images, setImages] = useState<ImageResponse[]>([]);
  const [primaryImage, setPrimaryImageState] = useState<ImageResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch all images for location
  const fetchImages = useCallback(async () => {
    if (!locationId || locationId <= 0) {
      setImages([]);
      setPrimaryImageState(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("📸 Fetching images for location:", locationId);

      // Fetch both images and primary image in parallel
      const [imagesData, primaryImageData] = await Promise.all([
        venueOwnerImageService.getLocationImages(locationId),
        venueOwnerImageService.getLocationPrimaryImage(locationId),
      ]);

      setImages(imagesData);
      setPrimaryImageState(primaryImageData);

      console.log("✅ Location images fetched:", {
        totalImages: imagesData.length,
        primaryImage: primaryImageData?.url || "none",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch location images";
      setError(errorMessage);
      console.error("❌ Fetch location images error:", err);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  // Upload single image
  const uploadImage = useCallback(
    async (
      imageUri: string,
      isPrimary: boolean = false,
      caption?: string
    ): Promise<ImageResponse | null> => {
      if (!locationId || locationId <= 0) return null;

      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerImageService.uploadLocationImage(
          locationId,
          imageUri,
          isPrimary,
          caption
        );

        // Refresh images after upload
        await fetchImages();
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to upload image";
        setError(errorMessage);
        console.error("❌ Upload image error:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [locationId, fetchImages]
  );

  // Upload multiple images
  const uploadMultipleImages = useCallback(
    async (
      imageUris: string[],
      primaryIndex?: number
    ): Promise<ImageResponse[]> => {
      if (!locationId || locationId <= 0) return [];

      setLoading(true);
      setError(null);

      try {
        const results =
          await venueOwnerImageService.uploadMultipleLocationImages(
            locationId,
            imageUris,
            primaryIndex
          );

        // Refresh images after upload
        await fetchImages();
        return results;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to upload images";
        setError(errorMessage);
        console.error("❌ Upload multiple images error:", err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [locationId, fetchImages]
  );

  // Set primary image
  const setPrimaryImage = useCallback(
    async (imageId: number): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const success = await venueOwnerImageService.setPrimaryImage(imageId);

        if (success) {
          // Refresh images to update primary status
          await fetchImages();
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to set primary image";
        setError(errorMessage);
        console.error("❌ Set primary image error:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchImages]
  );

  // Delete image
  const deleteImage = useCallback(
    async (imageId: number): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const success = await venueOwnerImageService.deleteImage(imageId);

        if (success) {
          // Refresh images after deletion
          await fetchImages();
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete image";
        setError(errorMessage);
        console.error("❌ Delete image error:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchImages]
  );

  // Refresh images (alias for fetchImages)
  const refresh = useCallback(() => fetchImages(), [fetchImages]);

  // Auto-fetch when locationId changes
  useEffect(() => {
    if (locationId && locationId > 0) {
      fetchImages();
    } else {
      // Clear images when locationId is invalid
      setImages([]);
      setPrimaryImageState(null);
      setError(null);
    }
  }, [fetchImages]);

  return {
    images,
    primaryImage,
    loading,
    error,
    uploadImage,
    uploadMultipleImages,
    fetchImages,
    setPrimaryImage,
    deleteImage,
    refresh,
    clearError,
  };
};
