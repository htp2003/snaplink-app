// hooks/useVenueOwnerData.ts
import { useState, useEffect } from "react";
import {
  venueOwnerService,
  VenueOwner,
  CreateVenueOwnerRequest,
  UpdateVenueOwnerRequest,
} from "../services/venueOwnerService";

export const useVenueOwnerData = () => {
  const [venueOwners, setVenueOwners] = useState<VenueOwner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVenueOwners = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await venueOwnerService.getAllVenueOwners();
      setVenueOwners(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch venue owners"
      );
    } finally {
      setLoading(false);
    }
  };

  const getVenueOwnerById = async (id: number): Promise<VenueOwner | null> => {
    try {
      setLoading(true);
      setError(null);
      const data = await venueOwnerService.getVenueOwnerById(id);
      return data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch venue owner"
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createVenueOwner = async (
    data: CreateVenueOwnerRequest
  ): Promise<VenueOwner | null> => {
    try {
      setLoading(true);
      setError(null);
      const newVenueOwner = await venueOwnerService.createVenueOwner(data);
      setVenueOwners((prev) => [...prev, newVenueOwner]);
      return newVenueOwner;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create venue owner"
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateVenueOwner = async (
    id: number,
    data: UpdateVenueOwnerRequest
  ): Promise<VenueOwner | null> => {
    try {
      setLoading(true);
      setError(null);
      const updatedVenueOwner = await venueOwnerService.updateVenueOwner(
        id,
        data
      );
      setVenueOwners((prev) =>
        prev.map((owner) => (owner.id === id ? updatedVenueOwner : owner))
      );
      return updatedVenueOwner;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update venue owner"
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteVenueOwner = async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await venueOwnerService.deleteVenueOwner(id);
      setVenueOwners((prev) => prev.filter((owner) => owner.id !== id));
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete venue owner"
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenueOwners();
  }, []);

  return {
    venueOwners,
    loading,
    error,
    fetchVenueOwners,
    getVenueOwnerById,
    createVenueOwner,
    updateVenueOwner,
    deleteVenueOwner,
  };
};
