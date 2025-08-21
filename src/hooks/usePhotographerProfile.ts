// hooks/usePhotographerProfile.ts - Updated with location functionality
import { useState, useCallback } from 'react';
import { 
  photographerService, 
  PhotographerProfile, 
  CreatePhotographerRequest, 
  UpdatePhotographerRequest,
  PhotographerStyle
} from '../services/photographerService';
import { LocationUpdateRequest, PlaceDetails } from '../types/locationTypes';

interface UsePhotographerProfileReturn {
  // State
  photographer: PhotographerProfile | null;
  styles: PhotographerStyle[];
  loading: boolean;
  error: string | null;
  
  // Actions
  findByUserId: (userId: number) => Promise<void>;
  createProfile: (data: CreatePhotographerRequest) => Promise<void>;
  updatePhotographer: (data: UpdatePhotographerRequest) => Promise<void>;
  updateLocation: (locationData: LocationUpdateRequest) => Promise<void>;
  updateLocationFromPlace: (place: PlaceDetails) => Promise<void>;
  addStyle: (styleId: number) => Promise<void>;
  removeStyle: (styleId: number) => Promise<void>;
  clearError: () => void;
  
  // Computed values
  displayName: string;
  hourlyRate: string;
  yearsExperience: string;
  equipment: string;
  isAvailable: boolean;
  hasLocation: boolean;
  locationDisplay: string;
  coordinates: { latitude: number; longitude: number } | null;
}

export const usePhotographerProfile = (): UsePhotographerProfileReturn => {
  const [photographer, setPhotographer] = useState<PhotographerProfile | null>(null);
  const [styles, setStyles] = useState<PhotographerStyle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const findByUserId = useCallback(async (userId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Looking for photographer profile with userId:', userId);
      
      const profile = await photographerService.findPhotographerByUserId(userId);
      
      if (profile) {
        console.log('✅ Found photographer profile:', profile);
        setPhotographer(profile);
        
        // Load photographer styles
        try {
          const photographerStyles = await photographerService.getPhotographerStyles(profile.photographerId);
          console.log('✅ Loaded photographer styles:', photographerStyles);
          setStyles(photographerStyles);
        } catch (styleError) {
          console.warn('⚠️ Could not load photographer styles:', styleError);
          setStyles([]); // Set empty array if styles can't be loaded
        }
      } else {
        console.log('❌ No photographer profile found for userId:', userId);
        setPhotographer(null);
        setStyles([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      console.error('❌ Error finding photographer profile:', errorMessage);
      setError(errorMessage);
      setPhotographer(null);
      setStyles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProfile = useCallback(async (data: CreatePhotographerRequest) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🆕 Creating photographer profile:', data);
      
      const newProfile = await photographerService.create(data);
      console.log('✅ Created photographer profile:', newProfile);
      
      setPhotographer(newProfile);
      
      // Store photographerId for future use
      await photographerService.storePhotographerId(data.userId, newProfile.photographerId);
      
      // Load styles if styleIds were provided
      if (data.styleIds && data.styleIds.length > 0) {
        try {
          const photographerStyles = await photographerService.getPhotographerStyles(newProfile.photographerId);
          setStyles(photographerStyles);
        } catch (styleError) {
          console.warn('⚠️ Could not load styles after creation:', styleError);
          setStyles([]);
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create photographer profile';
      console.error('❌ Error creating photographer profile:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePhotographer = useCallback(async (data: UpdatePhotographerRequest) => {
    if (!photographer) {
      throw new Error('No photographer profile to update');
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Updating photographer profile:', data);
      
      const updatedProfile = await photographerService.update(photographer.photographerId, data);
      console.log('✅ Updated photographer profile:', updatedProfile);
      
      setPhotographer(updatedProfile);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update photographer profile';
      console.error('❌ Error updating photographer profile:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [photographer]);

  // NEW: Update location functionality
  const updateLocation = useCallback(async (locationData: LocationUpdateRequest) => {
    if (!photographer) {
      throw new Error('No photographer profile found');
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('📍 Updating photographer location:', locationData);
      
      await photographerService.updateLocation(photographer.photographerId, locationData);
      
      // Update local state with new location data
      setPhotographer(prev => prev ? {
        ...prev,
        address: locationData.address || prev.address,
        googleMapsAddress: locationData.googleMapsAddress || prev.googleMapsAddress,
        latitude: locationData.latitude ?? prev.latitude,
        longitude: locationData.longitude ?? prev.longitude,
      } : null);
      
      console.log('✅ Location updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update location';
      console.error('❌ Error updating location:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [photographer]);

  // NEW: Update location from PlaceDetails
  const updateLocationFromPlace = useCallback(async (place: PlaceDetails) => {
    const locationData: LocationUpdateRequest = {
      address: place.address,
      googleMapsAddress: place.address,
      latitude: place.coordinates.latitude,
      longitude: place.coordinates.longitude,
    };
    
    await updateLocation(locationData);
  }, [updateLocation]);

  const addStyle = useCallback(async (styleId: number) => {
    if (!photographer) {
      throw new Error('No photographer profile found');
    }

    try {
      console.log('➕ Adding style:', styleId, 'to photographer:', photographer.photographerId);
      
      await photographerService.addStyle(photographer.photographerId, styleId);
      
      // Reload styles
      const updatedStyles = await photographerService.getPhotographerStyles(photographer.photographerId);
      setStyles(updatedStyles);
      
      console.log('✅ Style added successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add style';
      console.error('❌ Error adding style:', errorMessage);
      throw err;
    }
  }, [photographer]);

  const removeStyle = useCallback(async (styleId: number) => {
    if (!photographer) {
      throw new Error('No photographer profile found');
    }

    try {
      console.log('➖ Removing style:', styleId, 'from photographer:', photographer.photographerId);
      
      await photographerService.removeStyle(photographer.photographerId, styleId);
      
      // Reload styles
      const updatedStyles = await photographerService.getPhotographerStyles(photographer.photographerId);
      setStyles(updatedStyles);
      
      console.log('✅ Style removed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove style';
      console.error('❌ Error removing style:', errorMessage);
      throw err;
    }
  }, [photographer]);

  // Computed values
  const displayName = photographer?.user?.fullName || photographer?.fullName || 'Người dùng';
  
  const hourlyRate = photographer?.hourlyRate 
    ? `${photographer.hourlyRate.toLocaleString('vi-VN')} VNĐ/giờ`
    : 'Chưa thiết lập';
    
  const yearsExperience = photographer?.yearsExperience 
    ? `${photographer.yearsExperience} năm`
    : 'Chưa thiết lập';
    
  const equipment = photographer?.equipment || 'Chưa thiết lập';
  
  const isAvailable = photographer?.availabilityStatus === 'Available';

  // NEW: Location computed values
  const hasLocation = Boolean(photographer?.latitude && photographer?.longitude);
  
  const locationDisplay = photographer?.address || 
    (hasLocation ? `${photographer!.latitude!.toFixed(6)}, ${photographer!.longitude!.toFixed(6)}` : 'Chưa thiết lập vị trí');

  const coordinates = hasLocation ? {
    latitude: photographer!.latitude!,
    longitude: photographer!.longitude!
  } : null;

  return {
    // State
    photographer,
    styles,
    loading,
    error,
    
    // Actions
    findByUserId,
    createProfile,
    updatePhotographer,
    updateLocation,
    updateLocationFromPlace,
    addStyle,
    removeStyle,
    clearError,
    
    // Computed values
    displayName,
    hourlyRate,
    yearsExperience,
    equipment,
    isAvailable,
    hasLocation,
    locationDisplay,
    coordinates,
  };
};