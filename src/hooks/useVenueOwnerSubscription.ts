import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { venueOwnerProfileService } from "../services/venueOwnerProfileService";

export interface PremiumSubscription {
  premiumSubscriptionId: number;
  userId: number;
  packageId: number;
  startDate: string;
  endDate: string;
  status: string;
  paymentId?: number;
  photographerId?: number;
  locationId: number;
  package: {
    packageId: number;
    name: string;
    description: string;
    price: number;
    durationDays: number;
    features: string;
    applicableTo: string;
  };
}

export interface LocationWithSubscription {
  locationId: number;
  name: string;
  address?: string;
  premiumSubscriptions?: PremiumSubscription[];
  hasActiveSubscription?: boolean;
  canCreateEvent?: boolean;
}

export const useVenueOwnerSubscription = () => {
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [userLocations, setUserLocations] = useState<
    LocationWithSubscription[]
  >([]);

  // Subscription utility functions
  const hasActiveSubscription = useCallback(
    (subscriptions?: PremiumSubscription[]): boolean => {
      if (!subscriptions || subscriptions.length === 0) return false;

      const activeSubscriptions = subscriptions.filter((subscription) => {
        const isActive = subscription.status === "Active";
        const isLocationSubscription =
          subscription.package?.applicableTo === "location";
        const isNotExpired = new Date(subscription.endDate) > new Date();
        return isActive && isLocationSubscription && isNotExpired;
      });

      return activeSubscriptions.length > 0;
    },
    []
  );

  const getActiveSubscription = useCallback(
    (subscriptions?: PremiumSubscription[]): PremiumSubscription | null => {
      if (!subscriptions || subscriptions.length === 0) return null;

      const activeSubscriptions = subscriptions.filter((subscription) => {
        const isActive = subscription.status === "Active";
        const isLocationSubscription =
          subscription.package?.applicableTo === "location";
        const isNotExpired = new Date(subscription.endDate) > new Date();
        return isActive && isLocationSubscription && isNotExpired;
      });

      if (activeSubscriptions.length === 0) return null;

      return activeSubscriptions.sort(
        (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
      )[0];
    },
    []
  );

  const getSubscriptionRemainingDays = useCallback(
    (endDate: string): number => {
      const end = new Date(endDate);
      const now = new Date();
      const diffTime = end.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    },
    []
  );

  // Get current user ID from JWT
  const getCurrentUserId = useCallback(async (): Promise<number | null> => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return null;

      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("Invalid JWT format");

      const payload = parts[1];
      const paddedPayload =
        payload + "=".repeat((4 - (payload.length % 4)) % 4);
      const decodedPayload = atob(paddedPayload);
      const payloadObj = JSON.parse(decodedPayload);

      const userIdStr =
        payloadObj[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
        ];
      const userId = parseInt(userIdStr, 10);
      return userId;
    } catch (error) {
      console.error("Error extracting user ID from JWT:", error);
      return null;
    }
  }, []);

  // Get location with subscription details
  const getLocationWithSubscriptionDetails = useCallback(
    async (locationId: number): Promise<LocationWithSubscription | null> => {
      try {
        const token = await AsyncStorage.getItem("token");
        if (!token) return null;

        const apiUrl = `https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net/api/Location/GetLocationById?id=${locationId}`;

        const response = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const result = await response.json();

        let location: LocationWithSubscription;
        if (result.error !== undefined && result.data) {
          if (result.error === 0) {
            location = result.data as LocationWithSubscription;
          } else {
            return null;
          }
        } else if (result.locationId) {
          location = result as LocationWithSubscription;
        } else {
          return null;
        }

        location.hasActiveSubscription = hasActiveSubscription(
          location.premiumSubscriptions
        );
        location.canCreateEvent = location.hasActiveSubscription;

        return location;
      } catch (error) {
        console.error(
          `Error getting location ${locationId} with subscription details:`,
          error
        );
        return null;
      }
    },
    [hasActiveSubscription]
  );

  // Load user locations with subscription details
  const loadUserLocationsWithSubscriptions = useCallback(
    async (getLocationsByOwnerId: any, preselectedLocationId?: number) => {
      try {
        setLoadingSubscriptions(true);

        const currentUserId = await getCurrentUserId();
        if (!currentUserId) throw new Error("Could not get current user ID");

        const locationOwner =
          await venueOwnerProfileService.getLocationOwnerByUserId(
            currentUserId
          );
        if (!locationOwner) throw new Error("No LocationOwner record found");

        const basicLocations = await getLocationsByOwnerId(
          locationOwner.locationOwnerId
        );
        if (basicLocations.length === 0) {
          return { locations: [], error: "NO_LOCATIONS" };
        }

        const locationsWithSubscriptions: LocationWithSubscription[] = [];
        let totalActiveSubscriptions = 0;

        for (const location of basicLocations) {
          try {
            const locationWithSub = await getLocationWithSubscriptionDetails(
              location.locationId
            );

            if (locationWithSub) {
              const hasActive = hasActiveSubscription(
                locationWithSub.premiumSubscriptions
              );

              if (hasActive) totalActiveSubscriptions++;

              const enhancedLocation: LocationWithSubscription = {
                ...locationWithSub,
                hasActiveSubscription: hasActive,
                canCreateEvent: hasActive,
              };

              locationsWithSubscriptions.push(enhancedLocation);
            } else {
              const basicLocationWithSub: LocationWithSubscription = {
                ...location,
                hasActiveSubscription: false,
                canCreateEvent: false,
              };
              locationsWithSubscriptions.push(basicLocationWithSub);
            }
          } catch (error) {
            const basicLocationWithSub: LocationWithSubscription = {
              ...location,
              hasActiveSubscription: false,
              canCreateEvent: false,
            };
            locationsWithSubscriptions.push(basicLocationWithSub);
          }
        }

        setUserLocations(locationsWithSubscriptions);

        // Check if no locations have subscriptions
        if (
          totalActiveSubscriptions === 0 &&
          locationsWithSubscriptions.length > 0
        ) {
          return {
            locations: locationsWithSubscriptions,
            error: "NO_SUBSCRIPTION",
          };
        }

        return { locations: locationsWithSubscriptions, error: null };
      } catch (error) {
        console.error(
          "Error loading user locations with subscriptions:",
          error
        );
        return { locations: [], error: "LOAD_ERROR" };
      } finally {
        setLoadingSubscriptions(false);
      }
    },
    [
      getCurrentUserId,
      getLocationWithSubscriptionDetails,
      hasActiveSubscription,
    ]
  );

  return {
    userLocations,
    loadingSubscriptions,
    hasActiveSubscription,
    getActiveSubscription,
    getSubscriptionRemainingDays,
    loadUserLocationsWithSubscriptions,
    setUserLocations,
  };
};
