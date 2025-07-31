// hooks/useVenueOwnerLocation.ts
import { useState, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import { venueOwnerLocationService } from "../services/venueOwnerLocationService";
import {
  VenueLocation,
  CreateLocationRequest,
  UpdateLocationRequest,
  LocationFilters,
} from "../types/venueLocation";

export function useVenueOwnerLocation() {
  const [locations, setLocations] = useState<VenueLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get all locations with optional filtering
   */
  const getAllLocations = useCallback(
    async (filters?: LocationFilters): Promise<VenueLocation[]> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerLocationService.getAllLocations(filters);
        console.log("✅ All locations retrieved:", result.length);
        setLocations(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách địa điểm";
        console.error("❌ Get all locations error:", errorMessage);

        // Don't set error for 404 (no locations found)
        if (!errorMessage.includes("404")) {
          setError(errorMessage);
        } else {
          console.log("ℹ️ No locations found, showing empty state");
          setLocations([]);
        }
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get locations by owner ID
   */
  const getLocationsByOwnerId = useCallback(
    async (locationOwnerId: number): Promise<VenueLocation[]> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerLocationService.getLocationsByOwnerId(
          locationOwnerId
        );
        console.log("✅ Owner locations retrieved:", result.length);
        setLocations(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tải địa điểm";
        console.error("❌ Get owner locations error:", errorMessage);

        // Don't set error for 404 (no locations found)
        if (!errorMessage.includes("404")) {
          setError(errorMessage);
        } else {
          console.log("ℹ️ No locations found for owner, showing empty state");
          setLocations([]);
        }
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get location by ID
   */
  const getLocationById = useCallback(
    async (locationId: number): Promise<VenueLocation | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerLocationService.getLocationById(
          locationId
        );
        console.log("✅ Location retrieved:", result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tải thông tin địa điểm";
        console.error("❌ Get location error:", errorMessage);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Create new location
   */
  const createLocation = useCallback(
    async (data: CreateLocationRequest): Promise<VenueLocation | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerLocationService.createLocation(data);
        console.log("✅ Location created successfully:", result);

        // Add to current locations list
        setLocations((prev) => [...prev, result]);

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tạo địa điểm";
        console.error("❌ Create location error:", errorMessage);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Update location
   */
  const updateLocation = useCallback(
    async (
      locationId: number,
      data: UpdateLocationRequest
    ): Promise<VenueLocation | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerLocationService.updateLocation(
          locationId,
          data
        );
        console.log("✅ Location updated successfully:", result);

        // Update in current locations list
        setLocations((prev) =>
          prev.map((location) =>
            location.locationId === locationId ? result : location
          )
        );

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể cập nhật địa điểm";
        console.error("❌ Update location error:", errorMessage);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Delete location
   */
  const deleteLocation = useCallback(
    async (locationId: number): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const success = await venueOwnerLocationService.deleteLocation(
          locationId
        );

        if (success) {
          console.log("✅ Location deleted successfully");

          // Remove from current locations list
          setLocations((prev) =>
            prev.filter((location) => location.locationId !== locationId)
          );
        }

        return success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể xóa địa điểm";
        console.error("❌ Delete location error:", errorMessage);
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get primary image for location
   */
  const getPrimaryImage = useCallback(
    async (locationId: number): Promise<string | null> => {
      try {
        // Find location in current state first, avoid API call if possible
        const existingLocation = locations.find(
          (loc) => loc.locationId === locationId
        );
        if (existingLocation?.images && existingLocation.images.length > 0) {
          const primaryImage =
            existingLocation.images.find((img) => img.isPrimary) ||
            existingLocation.images[0];
          return primaryImage.url;
        }

        // Fallback to API call only if needed
        return await venueOwnerLocationService.getPrimaryLocationImage(
          locationId
        );
      } catch (err) {
        console.error("❌ Get primary image error:", err);
        return null;
      }
    },
    [locations] // Depend on locations to use cached data
  );

  /**
   * Refresh locations (with loading state)
   */
  const refreshLocations = useCallback(
    async (locationOwnerId?: number): Promise<void> => {
      setRefreshing(true);
      setError(null);

      try {
        if (locationOwnerId) {
          await getLocationsByOwnerId(locationOwnerId);
        } else {
          await getAllLocations();
        }
      } catch (err) {
        console.error("❌ Refresh locations error:", err);
      } finally {
        setRefreshing(false);
      }
    },
    [] // Remove dependencies to prevent infinite loop
  );

  /**
   * Show error alert if needed
   */
  const showErrorAlert = useCallback(
    (customMessage?: string) => {
      const message = customMessage || error || "Có lỗi xảy ra";
      Alert.alert("Lỗi", message);
    },
    [error]
  );

  /**
   * Filter locations by criteria
   */
  const filterLocations = useCallback(
    (filters: LocationFilters): VenueLocation[] => {
      return locations.filter((location) => {
        if (
          filters.locationOwnerId &&
          location.locationOwnerId !== filters.locationOwnerId
        ) {
          return false;
        }
        if (
          filters.availabilityStatus &&
          location.availabilityStatus !== filters.availabilityStatus
        ) {
          return false;
        }
        if (
          filters.locationType &&
          location.locationType !== filters.locationType
        ) {
          return false;
        }
        if (
          filters.indoor !== undefined &&
          location.indoor !== filters.indoor
        ) {
          return false;
        }
        if (
          filters.outdoor !== undefined &&
          location.outdoor !== filters.outdoor
        ) {
          return false;
        }
        if (
          filters.minHourlyRate &&
          location.hourlyRate &&
          location.hourlyRate < filters.minHourlyRate
        ) {
          return false;
        }
        if (
          filters.maxHourlyRate &&
          location.hourlyRate &&
          location.hourlyRate > filters.maxHourlyRate
        ) {
          return false;
        }
        if (
          filters.minCapacity &&
          location.capacity &&
          location.capacity < filters.minCapacity
        ) {
          return false;
        }
        if (
          filters.maxCapacity &&
          location.capacity &&
          location.capacity > filters.maxCapacity
        ) {
          return false;
        }
        return true;
      });
    },
    [locations]
  );

  return {
    // State
    locations,
    loading,
    error,
    refreshing,

    // Actions
    getAllLocations,
    getLocationsByOwnerId,
    getLocationById,
    createLocation,
    updateLocation,
    deleteLocation,
    getPrimaryImage,
    refreshLocations,
    clearError,
    showErrorAlert,
    filterLocations,
  };
}
