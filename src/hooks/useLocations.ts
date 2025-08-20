import { useState, useEffect, useCallback } from 'react';
import { locationService } from '../services/locationService';
import { imageService } from '../services/imageService';
import type { Location, LocationImage } from '../types';

// 📍 GPS related interfaces
interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

// Transform API data to match component props
export interface LocationData {
  id: string;
  locationId: number;
  name: string;
  images: string[]; // Array of image URLs
  styles: string[];
  address?: string;
  description?: string;
  amenities?: string;
  hourlyRate?: number;
  capacity?: number;
  indoor?: boolean;
  outdoor?: boolean;
  availabilityStatus?: string;
  featuredStatus?: boolean;
  verificationStatus?: string;
  // GPS related fields
  distance?: number; 
  source?: 'app' | 'google';
  placeId?: string; 
  rating?: number; 
}

interface UseLocationsReturn {
  // 📍 Location data
  locations: LocationData[];
  loading: boolean;
  error: string | null;

  // GPS & App locations only
  currentLocation: LocationCoords | null;
  nearbyAppLocations: LocationData[];
  hasLocationPermission: boolean;
  gpsLoading: boolean;
  gpsError: string | null;

  // 📱 Methods
  refreshLocations: () => void;
  fetchAllLocations: () => void;
  getLocationById: (id: number) => Promise<LocationData | null>;
  
  // GPS Methods
  requestLocationPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<LocationCoords | null>;
  searchNearbyAppLocations: (radiusKm?: number) => Promise<void>;
  searchAppLocationsByAddress: (address: string, radiusKm?: number) => Promise<void>;
  clearNearbyResults: () => void;

}

export const useLocations = (): UseLocationsReturn => {
  // 📍 Location state
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GPS & App locations only
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [nearbyAppLocations, setNearbyAppLocations] = useState<LocationData[]>([]);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // ❌ REMOVED: Google Places state
  // const [nearbyGooglePlaces, setNearbyGooglePlaces] = useState<LocationData[]>([]);

  // 🖼️ Helper function to get main image for a location
  const getLocationMainImage = async (locationId: number): Promise<string> => {
    try {
      console.log(`🔍 Getting image for location ${locationId}...`);
      
      const apiImages = await imageService.location.getImages(locationId);
      
      if (apiImages && apiImages.length > 0) {
        const firstImageUrl = apiImages[0].url;
        console.log(`✅ Found image for location ${locationId}:`, firstImageUrl);
        return firstImageUrl;
      } else {
        console.log(`⚠️ Location ${locationId} has no images`);
        return '';
      }
    } catch (error) {
      console.log(`❌ Error getting image for location ${locationId}:`, error);
      return '';
    }
  };

  // 🔄 Transform location data
  const transformLocationData = async (location: any): Promise<LocationData> => {
    console.log('🔄 Transforming location data:', location.locationId);
    
    let styles: string[] = [];
    if (location.amenities) {
      styles = location.amenities.split(',').map((s: string) => s.trim());
    } else {
      styles = location.indoor && location.outdoor ? ['Indoor', 'Outdoor'] :
              location.indoor ? ['Indoor'] :
              location.outdoor ? ['Outdoor'] : ['Studio'];
    }

    const mainImageUrl = await getLocationMainImage(location.locationId);

    const transformedData: LocationData = {
      id: location.locationId.toString(),
      locationId: location.locationId,
      name: location.name || 'Unknown Location',
      images: [mainImageUrl],
      styles,
      address: location.address,
      description: location.description,
      amenities: location.amenities,
      hourlyRate: location.hourlyRate,
      capacity: location.capacity,
      indoor: location.indoor,
      outdoor: location.outdoor,
      availabilityStatus: location.availabilityStatus || 'available',
      featuredStatus: location.featuredStatus,
      verificationStatus: location.verificationStatus,
      source: 'app',
      // Add distance if current location is available
      distance: currentLocation && location.latitude && location.longitude
        ? locationService.gps.calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            location.latitude,
            location.longitude
          )
        : undefined,
    };

    console.log('✅ Transformed location data:', {
      locationId: transformedData.locationId,
      name: transformedData.name,
      distance: transformedData.distance,
    });
    
    return transformedData;
  };

  // ❌ REMOVED: Google Places transformation function
  // const transformGooglePlaceData = (place: GooglePlaceData): LocationData => { ... }

  // 📍 Core location methods
  const fetchAllLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🢸 Fetching all locations...');
      
      const data = await locationService.getAll();
      console.log('📦 Raw data from Location API:', data);
      
      let arr: any[] = [];
      
      if (Array.isArray(data)) {
        arr = data;
      } else if (data && typeof data === 'object' && Array.isArray((data as any).$values)) {
        arr = (data as any).$values;
      } else if (data && typeof data === 'object') {
        arr = [data];
      } else {
        console.warn('⚠️ Unexpected data structure:', data);
        arr = [];
      }
      
      console.log(`📋 Processing ${arr.length} locations...`);
      
      const validLocations = arr.filter(location => {
        const isValid = location && location.locationId !== undefined;
        if (!isValid) {
          console.warn('❌ Invalid location data:', location);
        }
        return isValid;
      });

      console.log('🢸 Location IDs from API:', validLocations.map(loc => loc.locationId));

      const transformedData: LocationData[] = [];
      for (const location of validLocations) {
        try {
          const transformed = await transformLocationData(location);
          transformedData.push(transformed);
        } catch (error) {
          console.error(`❌ Error transforming location ${location.locationId}:`, error);
          // Add fallback location data
          transformedData.push({
            id: location.locationId.toString(),
            locationId: location.locationId,
            name: location.name || 'Unknown Location',
            images: [''],
            styles: ['Studio'],
            address: location.address,
            hourlyRate: location.hourlyRate,
            capacity: location.capacity,
            availabilityStatus: location.availabilityStatus || 'available',
            source: 'app',
          });
        }
      }
      
      console.log(`✅ Successfully transformed ${transformedData.length} locations`);
      setLocations(transformedData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error fetching locations';
      console.error('❌ Error fetching locations:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getLocationById = async (id: number): Promise<LocationData | null> => {
    try {
      console.log('🔍 Fetching location by ID:', id);
      const data = await locationService.getById(id);
      console.log('📦 Raw location by ID data:', data);
      
      return await transformLocationData(data);
    } catch (err) {
      console.error('❌ Error fetching location by ID:', err);
      return null;
    }
  };

  const refreshLocations = () => {
    fetchAllLocations();
  };

  // GPS Methods
  const requestLocationPermission = useCallback(async (): Promise<boolean> => {
    try {
      setGpsError(null);
      const granted = await locationService.gps.requestPermission();
      setHasLocationPermission(granted);
      return granted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to request location permission';
      setGpsError(errorMessage);
      return false;
    }
  }, []);

  const getCurrentLocation = useCallback(async (): Promise<LocationCoords | null> => {
    try {
      setGpsLoading(true);
      setGpsError(null);
      
      const location = await locationService.gps.getCurrentLocation();
      setCurrentLocation(location);
      setHasLocationPermission(locationService.gps.hasPermission);
      
      return location;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get current location';
      setGpsError(errorMessage);
      return null;
    } finally {
      setGpsLoading(false);
    }
  }, []);

  // 🆕 SIMPLIFIED: Search only app locations nearby
  const searchNearbyAppLocations = useCallback(async (radiusKm: number = 5): Promise<void> => {
    try {
      setGpsLoading(true);
      setGpsError(null);
      
      console.log('🔍 Searching nearby app locations...');
      
      const results = await locationService.getNearbyAppLocations(radiusKm);
      
      if (results.currentLocation) {
        setCurrentLocation(results.currentLocation);
      }

      // Transform app locations
      const transformedAppLocations: LocationData[] = [];
      for (const appLocation of results.appLocations) {
        if (appLocation.source === 'internal' && appLocation.locationId) {
          try {
            // Get full location data for app locations
            const fullLocationData = await locationService.getById(appLocation.locationId);
            const transformed = await transformLocationData(fullLocationData);
            transformed.distance = appLocation.distanceInKm;
            transformedAppLocations.push(transformed);
          } catch (error) {
            console.error('❌ Error getting full app location data:', error);
            // Fallback to basic data
            transformedAppLocations.push({
              id: appLocation.locationId.toString(),
              locationId: appLocation.locationId,
              name: appLocation.name,
              images: appLocation.images || [''],
              styles: appLocation.styles || ['Studio'],
              address: appLocation.address,
              hourlyRate: appLocation.hourlyRate,
              capacity: appLocation.capacity,
              availabilityStatus: appLocation.availabilityStatus || 'available',
              distance: appLocation.distanceInKm,
              source: 'app',
            });
          }
        }
      }

      // Sort by distance
      transformedAppLocations.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setNearbyAppLocations(transformedAppLocations);

      console.log('✅ Nearby app search completed:', {
        appLocations: transformedAppLocations.length,
        currentLocation: results.currentLocation,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search nearby app locations';
      setGpsError(errorMessage);
      console.error('❌ Error searching nearby app locations:', error);
    } finally {
      setGpsLoading(false);
    }
  }, []);

  const searchAppLocationsByAddress = useCallback(async (address: string, radiusKm: number = 5): Promise<void> => {
    try {
      setGpsLoading(true);
      setGpsError(null);
      
      console.log('🔍 Searching app locations by address:', address);
      
      // First geocode the address to get coordinates
      const coords = await locationService.gps.geocodeAddress(address);
      if (!coords) {
        throw new Error('Could not find coordinates for the given address');
      }

      // Update current location to the searched address
      setCurrentLocation(coords);

      // Search app locations using the coordinates
      const response = await locationService.searchNearby({
        address: `${coords.latitude},${coords.longitude}`,
        radiusInKm: radiusKm,
        tags: 'cafe, studio, photography',
        limit: 20,
      });

      let appLocations: any[] = [];
      if (Array.isArray(response)) {
        appLocations = response;
      } else if (response && Array.isArray((response as any).$values)) {
        appLocations = (response as any).$values;
      }

      // Transform app locations
      const transformedAppLocations: LocationData[] = [];
      for (const appLocation of appLocations) {
        if (appLocation.source === 'internal' && appLocation.locationId) {
          try {
            const fullLocationData = await locationService.getById(appLocation.locationId);
            const transformed = await transformLocationData(fullLocationData);
            transformed.distance = appLocation.distanceInKm;
            transformedAppLocations.push(transformed);
          } catch (error) {
            transformedAppLocations.push({
              id: appLocation.locationId.toString(),
              locationId: appLocation.locationId,
              name: appLocation.name,
              images: appLocation.images || [''],
              styles: appLocation.styles || ['Studio'],
              address: appLocation.address,
              hourlyRate: appLocation.hourlyRate,
              capacity: appLocation.capacity,
              availabilityStatus: appLocation.availabilityStatus || 'available',
              distance: appLocation.distanceInKm,
              source: 'app',
            });
          }
        }
      }

      // Sort by distance
      transformedAppLocations.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setNearbyAppLocations(transformedAppLocations);

      console.log('✅ Address search completed:', {
        address,
        coordinates: coords,
        appLocations: transformedAppLocations.length,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to search app locations by address';
      setGpsError(errorMessage);
      console.error('❌ Error searching by address:', error);
    } finally {
      setGpsLoading(false);
    }
  }, []);

  const clearNearbyResults = useCallback(() => {
    setNearbyAppLocations([]);
    setGpsError(null);
  }, []);

  // 🚀 Initialize on mount
  useEffect(() => {
    fetchAllLocations();
    
    // Auto-request location permission
    requestLocationPermission().then(granted => {
      if (granted) {
        console.log('✅ Location permission granted, getting current location...');
        getCurrentLocation();
      }
    });
  }, [requestLocationPermission, getCurrentLocation]);

  return {
    // 📍 Location data
    locations,
    loading,
    error,

    // GPS & App locations only
    currentLocation,
    nearbyAppLocations,
    hasLocationPermission,
    gpsLoading,
    gpsError,

    // 📱 Methods
    refreshLocations,
    fetchAllLocations,
    getLocationById,
    
    // GPS Methods
    requestLocationPermission,
    getCurrentLocation,
    searchNearbyAppLocations,
    searchAppLocationsByAddress,
    clearNearbyResults,
  };
};