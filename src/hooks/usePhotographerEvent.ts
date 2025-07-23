// hooks/usePhotographerEvent.ts

import { useState, useEffect } from 'react';
import { 
  CreatePhotographerEventRequest, 
  Location, 
  PhotographerEvent,
  CreateEventFormData 
} from '../types/photographerEvent';
import photographerEventService from '../services/photographerEventService';

export const usePhotographerEvent = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Create event
  const createEvent = async (
    photographerId: number,
    eventData: CreatePhotographerEventRequest
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await photographerEventService.createPhotographerEvent(
        photographerId,
        eventData
      );

      if (response.success) {
        setSuccess(true);
        return true;
      } else {
        setError(response.message);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Reset states
  const resetStates = () => {
    setError(null);
    setSuccess(false);
    setLoading(false);
  };

  return {
    loading,
    error,
    success,
    createEvent,
    resetStates,
  };
};

export const useLocations = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllLocations = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await photographerEventService.getAllLocations();
      
      if (response.success) {
        setLocations(response.data);
      } else {
        setError(response.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch locations';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocationById = async (locationId: number): Promise<Location | null> => {
    try {
      const response = await photographerEventService.getLocationById(locationId);
      return response.success ? response.data : null;
    } catch (err) {
      console.error('Failed to fetch location:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchAllLocations();
  }, []);

  return {
    locations,
    loading,
    error,
    fetchAllLocations,
    fetchLocationById,
  };
};

// Form validation hook
export const useEventFormValidation = () => {
  const [errors, setErrors] = useState<Partial<CreateEventFormData>>({});

  const validateForm = (formData: CreateEventFormData): boolean => {
    const newErrors: Partial<CreateEventFormData> = {};

    // Title validation
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    // Price validation
    const originalPrice = parseFloat(formData.originalPrice);
    if (!formData.originalPrice || isNaN(originalPrice) || originalPrice <= 0) {
      newErrors.originalPrice = 'Valid original price is required';
    }

    // Discount validation
    if (formData.discountedPrice) {
      const discountedPrice = parseFloat(formData.discountedPrice);
      if (isNaN(discountedPrice) || discountedPrice < 0) {
        newErrors.discountedPrice = 'Valid discounted price is required';
      } else if (discountedPrice >= originalPrice) {
        newErrors.discountedPrice = 'Discounted price must be less than original price';
      }
    }

    // Discount percentage validation
    if (formData.discountPercentage) {
      const discountPercentage = parseFloat(formData.discountPercentage);
      if (isNaN(discountPercentage) || discountPercentage < 0 || discountPercentage > 100) {
        newErrors.discountPercentage = 'Discount percentage must be between 0-100';
      }
    }

    // Date validation
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required' as any;
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required' as any;
    }

    if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
      newErrors.endDate = 'End date must be after start date' as any;
    }

    // Max bookings validation
    const maxBookings = parseInt(formData.maxBookings);
    if (!formData.maxBookings || isNaN(maxBookings) || maxBookings <= 0) {
      newErrors.maxBookings = 'Valid max bookings number is required';
    }

    // Location validation
    if (formData.selectedLocationIds.length === 0) {
      newErrors.selectedLocationIds = 'At least one location must be selected' as any;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearErrors = () => {
    setErrors({});
  };

  return {
    errors,
    validateForm,
    clearErrors,
  };
};