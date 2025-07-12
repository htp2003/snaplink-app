import { useState, useCallback, useMemo } from 'react';
import { locationService } from '../services/locationService';
import { LocationApiResponse } from '../types/location';
import { useLocationImages } from './useImages';
import { userService } from '../services/userService';

export interface LocationDetailWithImages extends LocationApiResponse {
  ownerAvatar?: string;
  ownerProfile?: any; // User profile data
}

export const useLocationDetail = () => {
  const [locationId, setLocationId] = useState<number>(0);
  const [locationDetail, setLocationDetail] = useState<LocationDetailWithImages | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use the images hook for this location - only when we have a valid ID
  const {
    images: imageResponses, // ImageResponse[] - full image objects from API
    imageUrls: galleryImages, // string[] - image URLs extracted from ImageResponse[]
    loading: loadingImages,
    error: imageError,
    fetchImages,
    refresh: refreshImages,
    createImage,
    updateImage,
    deleteImage,
    setPrimaryImage,
    uploadMultiple
  } = useLocationImages(locationId);

  const fetchLocationById = useCallback(async (locationIdParam: string | number) => {
    setLoading(true);
    setError(null);
    
    try {
      const id = Number(locationIdParam);
      console.log('🎯 Setting locationId to:', id, typeof id);
      setLocationId(id); // This will trigger the images hook to fetch location images
      
      console.log('Fetching location detail for ID:', id);
      
      // Fetch location details from location API
      const locationData = await locationService.getById(id);
      console.log('Location data received:', locationData);

      // Initialize the detail object with location data
      let locationWithExtras: LocationDetailWithImages = {
        ...locationData,
        ownerAvatar: undefined,
        ownerProfile: undefined
      };

      // If we have locationOwner with userId, fetch the owner's profile for avatar
      if (locationData.locationOwner?.userId) {
        try {
          console.log('Fetching owner profile for userId:', locationData.locationOwner.userId);
          
          // Assuming you have a userService.getById method
          const ownerProfile = await userService.getUserById(locationData.locationOwner.userId);
          console.log('Owner profile received:', ownerProfile);
          
          locationWithExtras.ownerProfile = ownerProfile;
          locationWithExtras.ownerAvatar = ownerProfile?.profileImage
          
        } catch (ownerError) {
          console.log('Could not fetch owner profile (non-critical):', ownerError);
          // Don't fail the whole request if owner profile fails
        }
      }

      setLocationDetail(locationWithExtras);
      
      // Gallery images will be fetched automatically by the useLocationImages hook when locationId changes

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch location details';
      setError(errorMessage);
      console.error('Error fetching location detail:', err);
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array since this function doesn't depend on any props/state

  const refreshLocationDetail = useCallback(() => {
    if (locationDetail?.locationId) {
      fetchLocationById(locationDetail.locationId);
    }
  }, [locationDetail?.locationId, fetchLocationById]);

  const clearLocationDetail = useCallback(() => {
    setLocationDetail(null);
    setLocationId(0);
    setError(null);
  }, []);

  // Memoize the return object to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    // Location data
    locationDetail,
    loading,
    error,
    fetchLocationById,
    refreshLocationDetail,
    clearLocationDetail,
    
    // Images data from useLocationImages hook  
    galleryImages, // string[] - image URLs from Image API
    images: galleryImages, // alias for backward compatibility
    imageResponses, // ImageResponse[] - full image objects
    loadingImages,
    imageError,
    
    // Images methods
    createImage,
    updateImage,
    deleteImage,
    setPrimaryImage,
    uploadMultiple,
    refreshImages,
  }), [
    locationDetail,
    loading,
    error,
    fetchLocationById,
    refreshLocationDetail,
    clearLocationDetail,
    galleryImages,
    imageResponses,
    loadingImages,
    imageError,
    createImage,
    updateImage,
    deleteImage,
    setPrimaryImage,
    uploadMultiple,
    refreshImages,
  ]);

  return returnValue;
};