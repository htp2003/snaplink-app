import { useState, useCallback } from 'react';
import { photographerService } from '../services/photographerService';
import { LocationUpdateRequest, PlaceDetails, LocationCoordinates } from '../types/locationTypes';
import * as Location from 'expo-location';
import { GooglePlaceResult } from 'src/services/directGooglePlacesService';

interface UsePhotographerLocationReturn {
  // State
  currentLocation: LocationCoordinates | null;
  selectedPlace: PlaceDetails | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  getCurrentLocation: () => Promise<LocationCoordinates | null>;
  updatePhotographerLocation: (photographerId: number, locationData: LocationUpdateRequest) => Promise<void>;
  selectPlace: (place: PlaceDetails) => void;
  clearLocation: () => void;
  clearError: () => void;
  
  // Computed
  hasLocationPermission: boolean;
  locationDisplay: string;
}

export const usePhotographerLocation = (): UsePhotographerLocationReturn => {
  const [currentLocation, setCurrentLocation] = useState<LocationCoordinates | null>(null);
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

  const getCurrentLocation = useCallback(async (): Promise<LocationCoordinates | null> => {
    try {
      setLoading(true);
      setError(null);

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');

      if (status !== 'granted') {
        throw new Error('Quyền truy cập vị trí bị từ chối');
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
      return coordinates;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể lấy vị trí hiện tại';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // usePhotographerLocation.ts - Updated
const updatePhotographerLocation = useCallback(async (
  photographerId: number, 
  locationData: LocationUpdateRequest,
  placeDetails?: GooglePlaceResult // Thêm Google Place data
): Promise<void> => {
  try {
    setLoading(true);
    setError(null);

    // Cập nhật với Google Place data nếu có
    const enrichedLocationData = placeDetails ? {
      ...locationData,
      googlePlaceId: placeDetails.placeId,
      rating: placeDetails.rating,
      types: placeDetails.types?.join(',')
    } : locationData;

    await photographerService.updateLocation(photographerId, enrichedLocationData);
    
    console.log('Location updated with Google Places data');
  } catch (err) {
    // error handling
  } finally {
    setLoading(false);
  }
}, []);

  const selectPlace = useCallback((place: PlaceDetails) => {
    setSelectedPlace(place);
    setCurrentLocation(place.coordinates);
  }, []);

  // Computed values
  const locationDisplay = selectedPlace 
    ? selectedPlace.name 
    : currentLocation 
    ? `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`
    : 'Chưa chọn vị trí';

  return {
    // State
    currentLocation,
    selectedPlace,
    loading,
    error,
    
    // Actions
    getCurrentLocation,
    updatePhotographerLocation,
    selectPlace,
    clearLocation,
    clearError,
    
    // Computed
    hasLocationPermission,
    locationDisplay,
  };
};