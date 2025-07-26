// hooks/useVenueImageManagement.ts
import { useState } from "react";
import {
  locationManagementService,
  VenueImage,
} from "../services/locationManagementService";

export const useVenueImageManagement = () => {
  const [images, setImages] = useState<VenueImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVenueImages = async (venueId: number) => {
    try {
      setLoading(true);
      setError(null);
      const data = await locationManagementService.getVenueImages(venueId);
      setImages(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch venue images"
      );
    } finally {
      setLoading(false);
    }
  };

  const getPrimaryImage = async (
    venueId: number
  ): Promise<VenueImage | null> => {
    try {
      const data = await locationManagementService.getVenuePrimaryImage(
        venueId
      );
      return data;
    } catch (err) {
      console.warn("No primary image found for venue:", venueId);
      return null;
    }
  };

  const uploadImage = async (
    formData: FormData
  ): Promise<VenueImage | null> => {
    try {
      setLoading(true);
      setError(null);
      const newImage = await locationManagementService.uploadVenueImage(
        formData
      );
      setImages((prev) => [...prev, newImage]);
      return newImage;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateImage = async (data: {
    id: number;
    locationId?: number;
    url?: string;
    isPrimary?: boolean;
    caption?: string;
  }): Promise<VenueImage | null> => {
    try {
      setLoading(true);
      setError(null);
      const updatedImage = await locationManagementService.updateVenueImage(
        data
      );
      setImages((prev) =>
        prev.map((img) => (img.id === data.id ? updatedImage : img))
      );
      return updatedImage;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update image");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteImage = async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await locationManagementService.deleteVenueImage(id);
      setImages((prev) => prev.filter((img) => img.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete image");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const setPrimaryImage = async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await locationManagementService.setVenueImageAsPrimary(id);
      // Update local state to reflect primary change
      setImages((prev) =>
        prev.map((img) => ({ ...img, isPrimary: img.id === id }))
      );
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to set primary image"
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    images,
    loading,
    error,
    fetchVenueImages,
    getPrimaryImage,
    uploadImage,
    updateImage,
    deleteImage,
    setPrimaryImage,
  };
};
