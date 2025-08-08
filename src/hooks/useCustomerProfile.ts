// hooks/useCustomerProfile.ts
import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { userService } from "../services/userService";
import {
  UserProfile,
  CustomerStats,
  UpdateUserDto,
  UserBooking,
  UserTransaction,
  UserNotification,
} from "../types/userProfile";

export interface UseCustomerProfileReturn {
  // Data
  user: UserProfile | null;
  stats: CustomerStats | null;

  // States
  loading: boolean;
  refreshing: boolean;
  error: string | null;

  // Actions
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: {
    fullName?: string;
    phoneNumber?: string;
    bio?: string;
    profileImage?: string;
  }) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
  updateProfileImage: (imageUri: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearError: () => void;

  // Getters
  getUserRoles: () => string[];
  getUserStyles: () => string[];
  hasRole: (roleName: string) => boolean;
  isVerified: () => boolean;
  isPhotographer: () => boolean;
  isLocationOwner: () => boolean;
  isAdmin: () => boolean;
  isModerator: () => boolean;

  // Data getters
  getRecentBookings: (limit?: number) => UserBooking[];
  getRecentTransactions: (limit?: number) => UserTransaction[];
  getUnreadNotifications: () => UserNotification[];
  getProfileCompletionPercentage: () => number;
  isProfileComplete: () => boolean;
  hasActiveSubscription: () => boolean;
  getActiveSubscription: () => any;
  getMembershipDuration: () => string;

  // Utility
  formatDate: (dateString: string) => string;
  formatDateTime: (dateString: string) => string;
}

export const useCustomerProfile = (): UseCustomerProfileReturn => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current user ID from storage
  const getCurrentUserId = async (): Promise<number | null> => {
    try {
      const userId = await AsyncStorage.getItem("currentUserId");
      return userId ? parseInt(userId) : null;
    } catch (error) {
      console.error("Error getting current user ID:", error);
      return null;
    }
  };

  // Calculate user statistics
  const calculateStats = useCallback((userData: UserProfile): CustomerStats => {
    return userService.calculateUserStats(userData);
  }, []);

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    try {
      setError(null);
      const userId = await getCurrentUserId();

      if (!userId) {
        throw new Error("No user ID found. Please login again.");
      }

      const userData = await userService.getUserById(userId);

      setUser(userData);
      setStats(calculateStats(userData));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch profile";
      setError(errorMessage);
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [calculateStats]);

  // Update profile
  const updateProfile = useCallback(
    async (updates: {
      fullName?: string;
      phoneNumber?: string;
      bio?: string;
      profileImage?: string;
    }) => {
      try {
        setError(null);
        const userId = await getCurrentUserId();

        if (!userId) {
          throw new Error("No user ID found. Please login again.");
        }

        const updatedUser = await userService.updateProfile(userId, updates);

        setUser(updatedUser);
        setStats(calculateStats(updatedUser));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update profile";
        setError(errorMessage);
        console.error("Error updating profile:", err);
        throw err; // Re-throw to allow caller to handle
      }
    },
    [calculateStats]
  );

  // Change password
  const changePassword = useCallback(
    async (newPassword: string) => {
      try {
        setError(null);
        const userId = await getCurrentUserId();

        if (!userId) {
          throw new Error("No user ID found. Please login again.");
        }

        const updatedUser = await userService.changePassword(
          userId,
          newPassword
        );

        setUser(updatedUser);
        setStats(calculateStats(updatedUser));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to change password";
        setError(errorMessage);
        console.error("Error changing password:", err);
        throw err;
      }
    },
    [calculateStats]
  );

  // Update profile image
  const updateProfileImage = useCallback(
    async (imageUri: string) => {
      try {
        setError(null);
        const userId = await getCurrentUserId();

        if (!userId) {
          throw new Error("No user ID found. Please login again.");
        }

        const updatedUser = await userService.updateProfileImage(
          userId,
          imageUri
        );

        setUser(updatedUser);
        setStats(calculateStats(updatedUser));
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update profile image";
        setError(errorMessage);
        console.error("Error updating profile image:", err);
        throw err;
      }
    },
    [calculateStats]
  );

  // Refresh data
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile();
  }, [fetchProfile]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // User role and permission getters
  const getUserRoles = useCallback((): string[] => {
    return user ? userService.getUserRoles(user) : [];
  }, [user]);

  const getUserStyles = useCallback((): string[] => {
    return user ? userService.getUserStyles(user) : [];
  }, [user]);

  const hasRole = useCallback(
    (roleName: string): boolean => {
      return user ? userService.hasRole(user, roleName) : false;
    },
    [user]
  );

  const isVerified = useCallback((): boolean => {
    return user ? userService.isVerified(user) : false;
  }, [user]);

  const isPhotographer = useCallback((): boolean => {
    return user ? userService.isPhotographer(user) : false;
  }, [user]);

  const isLocationOwner = useCallback((): boolean => {
    return user ? userService.isLocationOwner(user) : false;
  }, [user]);

  const isAdmin = useCallback((): boolean => {
    return user ? userService.isAdmin(user) : false;
  }, [user]);

  const isModerator = useCallback((): boolean => {
    return user ? userService.isModerator(user) : false;
  }, [user]);

  // Data getters
  const getRecentBookings = useCallback(
    (limit: number = 10): UserBooking[] => {
      return user ? userService.getRecentBookings(user, limit) : [];
    },
    [user]
  );

  const getRecentTransactions = useCallback(
    (limit: number = 10): UserTransaction[] => {
      return user ? userService.getRecentTransactions(user, limit) : [];
    },
    [user]
  );

  const getUnreadNotifications = useCallback((): UserNotification[] => {
    return user ? userService.getUnreadNotifications(user) : [];
  }, [user]);

  const getProfileCompletionPercentage = useCallback((): number => {
    return user ? userService.getProfileCompletionPercentage(user) : 0;
  }, [user]);

  const isProfileComplete = useCallback((): boolean => {
    return user ? userService.isProfileComplete(user) : false;
  }, [user]);

  const hasActiveSubscription = useCallback((): boolean => {
    return user ? userService.hasActiveSubscription(user) : false;
  }, [user]);

  const getActiveSubscription = useCallback(() => {
    return user ? userService.getActiveSubscription(user) : null;
  }, [user]);

  const getMembershipDuration = useCallback((): string => {
    return user ? userService.getMembershipDurationFormatted(user) : "";
  }, [user]);

  // Utility functions
  const formatDate = useCallback((dateString: string): string => {
    return userService.formatDate(dateString);
  }, []);

  const formatDateTime = useCallback((dateString: string): string => {
    return userService.formatDateTime(dateString);
  }, []);

  // Initial load
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Auto-refresh on app focus (optional)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === "active" && user) {
        // Optionally refresh data when app becomes active
        // refresh();
      }
    };

    // You can add AppState listener here if needed
    // AppState.addEventListener('change', handleAppStateChange);

    return () => {
      // AppState.removeEventListener('change', handleAppStateChange);
    };
  }, [user]);

  return {
    // Data
    user,
    stats,

    // States
    loading,
    refreshing,
    error,

    // Actions
    fetchProfile,
    updateProfile,
    changePassword,
    updateProfileImage,
    refresh,
    clearError,

    // Getters
    getUserRoles,
    getUserStyles,
    hasRole,
    isVerified,
    isPhotographer,
    isLocationOwner,
    isAdmin,
    isModerator,

    // Data getters
    getRecentBookings,
    getRecentTransactions,
    getUnreadNotifications,
    getProfileCompletionPercentage,
    isProfileComplete,
    hasActiveSubscription,
    getActiveSubscription,
    getMembershipDuration,

    // Utility
    formatDate,
    formatDateTime,
  };
};
