// hooks/useVenueOwnerProfile.ts
import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { venueOwnerProfileService } from "../services/venueOwnerProfileService";
import {
  LocationOwner,
  CreateLocationOwnerRequest,
  UpdateLocationOwnerRequest,
} from "../types/venueOwner";

export function useVenueOwnerProfile() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Get venue owner profile by userId
   */
  const getProfileByUserId = useCallback(
    async (userId: number): Promise<LocationOwner | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerProfileService.getLocationOwnerByUserId(
          userId
        );
        console.log("✅ Profile retrieved by userId:", result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tải hồ sơ";
        console.error("❌ Get profile by userId error:", errorMessage);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Create new venue owner profile
   */
  const createProfile = useCallback(
    async (data: CreateLocationOwnerRequest): Promise<LocationOwner | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerProfileService.createLocationOwner(data);
        console.log("✅ Profile created successfully:", result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tạo hồ sơ";
        console.error("❌ Create profile error:", errorMessage);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get venue owner profile by locationOwnerId
   */
  const getProfileById = useCallback(
    async (locationOwnerId: number): Promise<LocationOwner | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerProfileService.getLocationOwnerById(
          locationOwnerId
        );
        console.log("✅ Profile retrieved:", result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tải hồ sơ";
        console.error("❌ Get profile error:", errorMessage);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Update venue owner profile
   */
  const updateProfile = useCallback(
    async (
      locationOwnerId: number,
      data: UpdateLocationOwnerRequest
    ): Promise<LocationOwner | null> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerProfileService.updateLocationOwner(
          locationOwnerId,
          data
        );
        console.log("✅ Profile updated successfully:", result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể cập nhật hồ sơ";
        console.error("❌ Update profile error:", errorMessage);
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Delete venue owner profile
   */
  const deleteProfile = useCallback(
    async (locationOwnerId: number): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const result = await venueOwnerProfileService.deleteLocationOwner(
          locationOwnerId
        );
        console.log("✅ Profile deleted successfully");
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể xóa hồ sơ";
        console.error("❌ Delete profile error:", errorMessage);
        setError(errorMessage);
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Get all venue owner profiles (admin function)
   */
  const getAllProfiles = useCallback(async (): Promise<LocationOwner[]> => {
    setLoading(true);
    setError(null);

    try {
      const result = await venueOwnerProfileService.getAllLocationOwners();
      console.log("✅ All profiles retrieved:", result);
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể tải danh sách hồ sơ";
      console.error("❌ Get all profiles error:", errorMessage);
      setError(errorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

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

  return {
    // State
    loading,
    error,

    // Actions
    createProfile,
    getProfileById,
    getProfileByUserId,
    updateProfile,
    deleteProfile,
    getAllProfiles,
    clearError,
    showErrorAlert,
  };
}
