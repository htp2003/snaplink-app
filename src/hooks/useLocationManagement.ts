// hooks/useLocationManagement.ts
import { useState, useEffect } from "react";
import {
  locationManagementService,
  Venue,
  CreateVenueRequest,
  UpdateVenueRequest,
} from "../services/locationManagementService";

export const useLocationManagement = () => {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await locationManagementService.getAllVenues();
      setVenues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch venues");
    } finally {
      setLoading(false);
    }
  };

  const getVenueById = async (id: number): Promise<Venue | null> => {
    try {
      setLoading(true);
      setError(null);
      const data = await locationManagementService.getVenueById(id);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch venue");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const createVenue = async (
    data: CreateVenueRequest
  ): Promise<Venue | null> => {
    try {
      setLoading(true);
      setError(null);
      const newVenue = await locationManagementService.createVenue(data);
      setVenues((prev) => [...prev, newVenue]);
      return newVenue;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create venue");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateVenue = async (
    id: number,
    data: UpdateVenueRequest
  ): Promise<Venue | null> => {
    try {
      setLoading(true);
      setError(null);
      const updatedVenue = await locationManagementService.updateVenue(
        id,
        data
      );
      setVenues((prev) =>
        prev.map((venue) => (venue.id === id ? updatedVenue : venue))
      );
      return updatedVenue;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update venue");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteVenue = async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await locationManagementService.deleteVenue(id);
      setVenues((prev) => prev.filter((venue) => venue.id !== id));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete venue");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    venues,
    loading,
    error,
    fetchVenues,
    getVenueById,
    createVenue,
    updateVenue,
    deleteVenue,
  };
};
