// hooks/useBooking.ts
import { useState, useCallback, useEffect } from 'react';
import { bookingService } from '../services/bookingService';
import type {
  CreateBookingRequest,
  UpdateBookingRequest,
  BookingResponse,
  BookingListResponse,
  AvailabilityResponse,
  PriceCalculationResponse,
  BookingFormData,
  BookingValidationErrors,
  UseBookingOptions
} from '../types/booking';

export const useBooking = (options: UseBookingOptions = {}) => {
  const { userId, photographerId, autoFetch = false } = options;

  // States
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [currentBooking, setCurrentBooking] = useState<BookingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [priceCalculation, setPriceCalculation] = useState<PriceCalculationResponse | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0
  });

  // Validation
  const validateBookingForm = useCallback((formData: BookingFormData): BookingValidationErrors => {
    const errors: BookingValidationErrors = {};

    if (!formData.photographerId) {
      errors.photographer = 'Vui lòng chọn photographer';
    }

    if (!formData.selectedDate) {
      errors.date = 'Vui lòng chọn ngày';
    } else if (formData.selectedDate < new Date()) {
      errors.date = 'Ngày chọn phải trong tương lai';
    }

    if (!formData.selectedStartTime) {
      errors.startTime = 'Vui lòng chọn giờ bắt đầu';
    }

    if (!formData.selectedEndTime) {
      errors.endTime = 'Vui lòng chọn giờ kết thúc';
    }

    if (formData.selectedStartTime && formData.selectedEndTime) {
      const startTime = new Date(`2000-01-01 ${formData.selectedStartTime}`);
      const endTime = new Date(`2000-01-01 ${formData.selectedEndTime}`);
      
      if (endTime <= startTime) {
        errors.endTime = 'Giờ kết thúc phải sau giờ bắt đầu';
      }
    }

    if (!formData.useExternalLocation && !formData.selectedLocation) {
      errors.location = 'Vui lòng chọn địa điểm';
    }

    if (formData.useExternalLocation && !formData.externalLocation?.name) {
      errors.location = 'Vui lòng nhập thông tin địa điểm';
    }

    return errors;
  }, []);

  // Create booking
  const createBooking = useCallback(async (
    userIdParam: number, 
    bookingData: CreateBookingRequest
  ): Promise<BookingResponse | null> => {
    if (creating) return null;

    try {
      setCreating(true);
      setError(null);

      console.log('Creating booking with data:', bookingData);
      const response = await bookingService.createBooking(userIdParam, bookingData);
      
      setCurrentBooking(response);
      // Add to bookings list if we're tracking user bookings
      if (userId === userIdParam) {
        setBookings(prev => [response, ...prev]);
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tạo booking';
      setError(errorMessage);
      console.error('Error in createBooking hook:', err);
      return null;
    } finally {
      setCreating(false);
    }
  }, [creating, userId]);

  // Get booking by ID
  const getBookingById = useCallback(async (bookingId: number): Promise<BookingResponse | null> => {
    try {
      setLoading(true);
      setError(null);

      const response = await bookingService.getBookingById(bookingId);
      setCurrentBooking(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể lấy thông tin booking';
      setError(errorMessage);
      console.error('Error in getBookingById hook:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update booking
  const updateBooking = useCallback(async (
    bookingId: number, 
    updateData: UpdateBookingRequest
  ): Promise<BookingResponse | null> => {
    if (updating) return null;

    try {
      setUpdating(true);
      setError(null);

      const response = await bookingService.updateBooking(bookingId, updateData);
      
      setCurrentBooking(response);
      // Update in bookings list
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId ? response : booking
      ));

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể cập nhật booking';
      setError(errorMessage);
      console.error('Error in updateBooking hook:', err);
      return null;
    } finally {
      setUpdating(false);
    }
  }, [updating]);

  // Fetch user bookings
  const fetchUserBookings = useCallback(async (
    userIdParam: number,
    page: number = 1,
    pageSize: number = 10
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await bookingService.getUserBookings(userIdParam, page, pageSize);
      
      setBookings(response.bookings || []);
      setPagination({
        page: response.page || page,
        pageSize: response.pageSize || pageSize,
        totalCount: response.totalCount || 0,
        totalPages: response.totalPages || 0
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể lấy danh sách booking';
      setError(errorMessage);
      console.error('Error in fetchUserBookings hook:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch photographer bookings
  const fetchPhotographerBookings = useCallback(async (
    photographerIdParam: number,
    page: number = 1,
    pageSize: number = 10
  ) => {
    try {
      setLoading(true);
      setError(null);

      const response = await bookingService.getPhotographerBookings(photographerIdParam, page, pageSize);
      
      setBookings(response.bookings || []);
      setPagination({
        page: response.page || page,
        pageSize: response.pageSize || pageSize,
        totalCount: response.totalCount || 0,
        totalPages: response.totalPages || 0
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể lấy danh sách booking';
      setError(errorMessage);
      console.error('Error in fetchPhotographerBookings hook:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check availability
  const checkAvailability = useCallback(async (
    photographerIdParam: number,
    startTime: string,
    endTime: string,
    locationId?: number
  ) => {
    try {
      setCheckingAvailability(true);
      setError(null);

      const [photographerResponse, locationResponse] = await Promise.all([
        bookingService.checkPhotographerAvailability(photographerIdParam, startTime, endTime),
        locationId ? bookingService.checkLocationAvailability(locationId, startTime, endTime) : Promise.resolve({ available: true, conflictingBookings: [], suggestedTimes: [] } as AvailabilityResponse)
      ]);

      // Safe spread with fallback arrays
      const combinedAvailability: AvailabilityResponse = {
        available: photographerResponse.available && locationResponse.available,
        conflictingBookings: [
          ...(photographerResponse.conflictingBookings || []),
          ...(locationResponse.conflictingBookings || [])
        ],
        suggestedTimes: photographerResponse.suggestedTimes || []
      };

      setAvailability(combinedAvailability);
      return combinedAvailability;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể kiểm tra tình trạng';
      setError(errorMessage);
      console.error('Error in checkAvailability hook:', err);
      return { 
        available: false, 
        conflictingBookings: [], 
        suggestedTimes: [] 
      } as AvailabilityResponse;
    } finally {
      setCheckingAvailability(false);
    }
  }, []);

  // Calculate price
  const calculatePrice = useCallback(async (
    photographerIdParam: number,
    startTime: string,
    endTime: string,
    locationId?: number
  ) => {
    try {
      setCalculatingPrice(true);
      setError(null);

      const response = await bookingService.calculatePrice(
        photographerIdParam,
        startTime,
        endTime,
        locationId
      );

      setPriceCalculation(response);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tính giá';
      setError(errorMessage);
      console.error('Error in calculatePrice hook:', err);
      return null;
    } finally {
      setCalculatingPrice(false);
    }
  }, []);

  // Cancel booking
  const cancelBooking = useCallback(async (bookingId: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      await bookingService.cancelBooking(bookingId);
      
      // Update booking status in state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'cancelled' as any }
          : booking
      ));

      if (currentBooking?.id === bookingId) {
        setCurrentBooking(prev => prev ? { ...prev, status: 'cancelled' as any } : null);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể hủy booking';
      setError(errorMessage);
      console.error('Error in cancelBooking hook:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentBooking]);

  // Complete booking
  const completeBooking = useCallback(async (bookingId: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      await bookingService.completeBooking(bookingId);
      
      // Update booking status in state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: 'completed' as any }
          : booking
      ));

      if (currentBooking?.id === bookingId) {
        setCurrentBooking(prev => prev ? { ...prev, status: 'completed' as any } : null);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể hoàn thành booking';
      setError(errorMessage);
      console.error('Error in completeBooking hook:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentBooking]);

  // Clear states
  const clearBookingData = useCallback(() => {
    setBookings([]);
    setCurrentBooking(null);
    setAvailability(null);
    setPriceCalculation(null);
    setError(null);
  }, []);

  // Auto fetch on mount
  useEffect(() => {
    if (autoFetch && userId) {
      fetchUserBookings(userId);
    } else if (autoFetch && photographerId) {
      fetchPhotographerBookings(photographerId);
    }
  }, [autoFetch, userId, photographerId, fetchUserBookings, fetchPhotographerBookings]);

  return {
    // Data
    bookings,
    currentBooking,
    availability,
    priceCalculation,
    setPriceCalculation, // Expose the setter
    pagination,
    
    // Loading states
    loading,
    creating,
    updating,
    checkingAvailability,
    calculatingPrice,
    error,

    // Methods
    createBooking,
    getBookingById,
    updateBooking,
    fetchUserBookings,
    fetchPhotographerBookings,
    checkAvailability,
    calculatePrice,
    cancelBooking,
    completeBooking,
    validateBookingForm,
    clearBookingData,

    // Utilities
    refreshUserBookings: () => userId && fetchUserBookings(userId, pagination.page, pagination.pageSize),
    refreshPhotographerBookings: () => photographerId && fetchPhotographerBookings(photographerId, pagination.page, pagination.pageSize),
  };
};