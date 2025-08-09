// hooks/useVenueOwnerEventImages.ts
import { useState, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import {
  venueOwnerImageService,
  ImageResponse,
} from "../services/venueOwnerImageService.ts";

export interface UseVenueOwnerEventImagesReturn {
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
  updateImage: (
    imageId: number,
    updates: { isPrimary?: boolean; caption?: string }
  ) => Promise<ImageResponse | null>;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export const useVenueOwnerEventImages = (
  eventId: number
): UseVenueOwnerEventImagesReturn => {
  const [images, setImages] = useState<ImageResponse[]>([]);
  const [primaryImage, setPrimaryImageState] = useState<ImageResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch all images for event
  const fetchImages = useCallback(async () => {
    if (!eventId || eventId <= 0) {
      setImages([]);
      setPrimaryImageState(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("📸 Fetching images for event:", eventId);

      // Fetch both images and primary image in parallel
      const [imagesData, primaryImageData] = await Promise.all([
        venueOwnerImageService.getEventImages(eventId),
        venueOwnerImageService.getEventPrimaryImage(eventId),
      ]);

      setImages(imagesData);
      setPrimaryImageState(primaryImageData);

      console.log("✅ Event images fetched:", {
        totalImages: imagesData.length,
        primaryImage: primaryImageData?.url || "none",
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch event images";
      setError(errorMessage);
      console.error("❌ Fetch event images error:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  // Upload single image
  const uploadImage = useCallback(
    async (
      imageUri: string,
      isPrimary: boolean = false,
      caption?: string
    ): Promise<ImageResponse | null> => {
      if (!eventId || eventId <= 0) return null;

      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerImageService.uploadEventImage(
          eventId,
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
        console.error("❌ Upload event image error:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [eventId, fetchImages]
  );

  // Upload multiple images
  const uploadMultipleImages = useCallback(
    async (
      imageUris: string[],
      primaryIndex?: number
    ): Promise<ImageResponse[]> => {
      if (!eventId || eventId <= 0) return [];

      setLoading(true);
      setError(null);

      try {
        const results = await venueOwnerImageService.uploadMultipleEventImages(
          eventId,
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
        console.error("❌ Upload multiple event images error:", err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [eventId, fetchImages]
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
        console.error("❌ Set primary event image error:", err);
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
        console.error("❌ Delete event image error:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchImages]
  );

  // Update image
  const updateImage = useCallback(
    async (
      imageId: number,
      updates: { isPrimary?: boolean; caption?: string }
    ): Promise<ImageResponse | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerImageService.updateImage(
          imageId,
          updates
        );

        // Refresh images after update
        await fetchImages();
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update image";
        setError(errorMessage);
        console.error("❌ Update event image error:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchImages]
  );

  // Refresh images (alias for fetchImages)
  const refresh = useCallback(() => fetchImages(), [fetchImages]);

  // Auto-fetch when eventId changes
  useEffect(() => {
    if (eventId && eventId > 0) {
      fetchImages();
    } else {
      // Clear images when eventId is invalid
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
    updateImage,
    refresh,
    clearError,
  };
};
