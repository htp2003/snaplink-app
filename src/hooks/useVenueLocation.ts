import { useState, useCallback } from "react";
import * as Location from "expo-location";
import { LocationCoordinates, PlaceDetails } from "../types/locationTypes";
import { GooglePlaceResult } from "../services/directGooglePlacesService";

interface UseVenueLocationReturn {
  // State
  currentLocation: LocationCoordinates | null;
  selectedPlace: PlaceDetails | null;
  loading: boolean;
  error: string | null;

  // Actions
  getCurrentLocation: () => Promise<LocationCoordinates | null>;
  selectPlace: (place: PlaceDetails) => void;
  selectGooglePlace: (place: GooglePlaceResult) => void;
  clearLocation: () => void;
  clearError: () => void;

  // Computed
  hasLocationPermission: boolean;
  locationDisplay: string;

  // Get location data for API request
  getLocationDataForAPI: () => {
    latitude?: number;
    longitude?: number;
    address?: string;
  };
}

export const useVenueLocation = (): UseVenueLocationReturn => {
  const [currentLocation, setCurrentLocation] =
    useState<LocationCoordinates | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearLocation = useCallback(() => {
    setCurrentLocation(null);
    setSelectedPlace(null);
  }, []);

  const getCurrentLocation =
    useCallback(async (): Promise<LocationCoordinates | null> => {
      try {
        setLoading(true);
        setError(null);

        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        setHasLocationPermission(status === "granted");

        if (status !== "granted") {
          throw new Error("Quyền truy cập vị trí bị từ chối");
        }

        // Get current position
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const coordinates: LocationCoordinates = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };

        setCurrentLocation(coordinates);

        // Clear selected place when using current location
        setSelectedPlace(null);

        return coordinates;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể lấy vị trí hiện tại";
        setError(errorMessage);
        return null;
      } finally {
        setLoading(false);
      }
    }, []);

  const selectPlace = useCallback((place: PlaceDetails) => {
    setSelectedPlace(place);
    setCurrentLocation(place.coordinates);
    setError(null);
  }, []);

  const selectGooglePlace = useCallback(
    (place: GooglePlaceResult) => {
      const placeDetails: PlaceDetails = {
        placeId: place.placeId,
        name: place.displayName || place.name || "Unknown Place",
        address: place.formattedAddress || "Unknown Address",
        coordinates: {
          latitude: place.location?.latitude || 0,
          longitude: place.location?.longitude || 0,
        },
        rating: place.rating,
        types: place.types || [],
      };

      selectPlace(placeDetails);
    },
    [selectPlace]
  );

  const getLocationDataForAPI = useCallback(() => {
    if (selectedPlace) {
      return {
        latitude: selectedPlace.coordinates.latitude,
        longitude: selectedPlace.coordinates.longitude,
        // Use the place address as the primary address if available
      };
    }

    if (currentLocation) {
      return {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      };
    }

    return {};
  }, [selectedPlace, currentLocation]);

  // Computed values
  const locationDisplay = selectedPlace
    ? selectedPlace.name
    : currentLocation
    ? `${currentLocation.latitude.toFixed(
        6
      )}, ${currentLocation.longitude.toFixed(6)}`
    : "Chưa chọn vị trí";

  return {
    // State
    currentLocation,
    selectedPlace,
    loading,
    error,

    // Actions
    getCurrentLocation,
    selectPlace,
    selectGooglePlace,
    clearLocation,
    clearError,

    // Computed
    hasLocationPermission,
    locationDisplay,
    getLocationDataForAPI,
  };
};
