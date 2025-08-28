// hooks/useBooking.ts - UPDATED WITH CONFIRM BOOKING

import { useState, useCallback, useEffect } from "react";
import { bookingService } from "../services/bookingService";
import {
  CreateBookingRequest,
  UpdateBookingRequest,
  BookingResponse,
  BookingListResponse,
  PriceCalculationResponse,
  BookingFormData,
  BookingValidationErrors,
  UseBookingOptions,
  BookingStatus,
} from "../types/booking";
import type { CheckAvailabilityResponse } from "../types/availability";
import { availabilityService } from "../services/availabilityService";

export const useBooking = (options: UseBookingOptions = {}) => {
  const { userId, photographerId, autoFetch = false } = options;

  // ===== BOOKING STATES =====
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [currentBooking, setCurrentBooking] = useState<BookingResponse | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [confirming, setConfirming] = useState(false); 
  const [settingUnderReview, setSettingUnderReview] = useState(false);; 
  const [error, setError] = useState<string | null>(null);

  // ===== AVAILABILITY & PRICING STATES =====
  const [availability, setAvailability] =
    useState<CheckAvailabilityResponse | null>(null);
  const [priceCalculation, setPriceCalculation] =
    useState<PriceCalculationResponse | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [calculatingPrice, setCalculatingPrice] = useState(false);

  // ===== PAGINATION STATES =====
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 0,
  });

  // ===== VALIDATION =====
  const validateBookingForm = useCallback(
    (formData: BookingFormData): BookingValidationErrors => {
      const errors: BookingValidationErrors = {};

      if (!formData.photographerId) {
        errors.photographer = "Vui lòng chọn photographer";
      }

      if (!formData.selectedDate) {
        errors.date = "Vui lòng chọn ngày";
      } else if (formData.selectedDate < new Date()) {
        errors.date = "Ngày chọn phải trong tương lai";
      }

      if (!formData.selectedStartTime) {
        errors.startTime = "Vui lòng chọn giờ bắt đầu";
      }

      if (!formData.selectedEndTime) {
        errors.endTime = "Vui lòng chọn giờ kết thúc";
      }

      if (formData.selectedStartTime && formData.selectedEndTime) {
        const startTime = new Date(`2000-01-01 ${formData.selectedStartTime}`);
        const endTime = new Date(`2000-01-01 ${formData.selectedEndTime}`);

        if (endTime <= startTime) {
          errors.endTime = "Giờ kết thúc phải sau giờ bắt đầu";
        }
      }

      if (!formData.useExternalLocation && !formData.selectedLocation) {
        errors.location = "Vui lòng chọn địa điểm";
      }

      if (formData.useExternalLocation && !formData.externalLocation?.name) {
        errors.location = "Vui lòng nhập thông tin địa điểm";
      }

      return errors;
    },
    []
  );

  // ===== BOOKING CRUD METHODS =====

  const createBooking = useCallback(
    async (
      userIdParam: number,
      bookingData: CreateBookingRequest
    ): Promise<BookingResponse | null> => {
      if (creating) return null;

      try {
        setCreating(true);
        setError(null);

        console.log({
  Hehehehehe: bookingData.startDatetime,
  Huhuhuhuhu: bookingData.endDatetime,
  photographerId: bookingData.photographerId,
});

        const response = await bookingService.createBooking(
          userIdParam,
          bookingData
        );

        setCurrentBooking(response);
        if (userId === userIdParam) {
          setBookings((prev) => [response, ...prev]);
        }

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tạo booking";
        setError(errorMessage);
        console.error("❌ Hook: Error in createBooking:", err);
        return null;
      } finally {
        setCreating(false);
      }
    },
    [creating, userId]
  );

  const getBookingById = useCallback(
    async (bookingId: number): Promise<BookingResponse | null> => {
      try {
        setLoading(true);
        setError(null);

        const response = await bookingService.getBookingById(bookingId);
        setCurrentBooking(response);
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể lấy thông tin booking";
        setError(errorMessage);
        console.error("❌ Hook: Error in getBookingById:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateBooking = useCallback(
    async (
      bookingId: number,
      updateData: UpdateBookingRequest
    ): Promise<BookingResponse | null> => {
      if (updating) return null;

      try {
        setUpdating(true);
        setError(null);

        const response = await bookingService.updateBooking(
          bookingId,
          updateData
        );

        setCurrentBooking(response);
        setBookings((prev) =>
          prev.map((booking) => (booking.id === bookingId ? response : booking))
        );

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể cập nhật booking";
        setError(errorMessage);
        console.error("❌ Hook: Error in updateBooking:", err);
        return null;
      } finally {
        setUpdating(false);
      }
    },
    [updating]
  );

  const fetchUserBookings = useCallback(
    async (userIdParam: number, page: number = 1, pageSize: number = 10) => {
      try {
        setLoading(true);
        setError(null);

        const response = await bookingService.getUserBookings(
          userIdParam,
          page,
          pageSize
        );

        setBookings(response.bookings || []);
        setPagination({
          page: response.page || page,
          pageSize: response.pageSize || pageSize,
          totalCount: response.totalCount || 0,
          totalPages: response.totalPages || 0,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể lấy danh sách booking";
        setError(errorMessage);
        console.error("❌ Hook: Error in fetchUserBookings:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchPhotographerBookings = useCallback(
    async (
      photographerIdParam: number,
      page: number = 1,
      pageSize: number = 10
    ) => {
      try {
        setLoading(true);
        setError(null);

        const response = await bookingService.getPhotographerBookings(
          photographerIdParam,
          page,
          pageSize
        );

        setBookings(response.bookings || []);
        setPagination({
          page: response.page || page,
          pageSize: response.pageSize || pageSize,
          totalCount: response.totalCount || 0,
          totalPages: response.totalPages || 0,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể lấy danh sách booking";
        setError(errorMessage);
        console.error("❌ Hook: Error in fetchPhotographerBookings:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const cancelBooking = useCallback(
    async (bookingId: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        await bookingService.cancelBooking(bookingId);

        setBookings((prev) =>
          prev.map((booking) =>
            booking.id === bookingId
              ? { ...booking, status: BookingStatus.CANCELLED }
              : booking
          )
        );

        if (currentBooking?.id === bookingId) {
          setCurrentBooking((prev) =>
            prev ? { ...prev, status: BookingStatus.CANCELLED } : null
          );
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể hủy booking";
        setError(errorMessage);
        console.error("❌ Hook: Error in cancelBooking:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [currentBooking]
  );

  const completeBooking = useCallback(
    async (bookingId: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

        await bookingService.completeBooking(bookingId);

        setBookings((prev) =>
          prev.map((booking) =>
            booking.id === bookingId
              ? { ...booking, status: BookingStatus.COMPLETED }
              : booking
          )
        );

        if (currentBooking?.id === bookingId) {
          setCurrentBooking((prev) =>
            prev ? { ...prev, status: BookingStatus.COMPLETED } : null
          );
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể hoàn thành booking";
        setError(errorMessage);
        console.error("❌ Hook: Error in completeBooking:", err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [currentBooking]
  );

  // ✅ NEW: Confirm booking method
  const confirmBooking = useCallback(
    async (bookingId: number): Promise<boolean> => {
      if (confirming) return false;

      try {
        setConfirming(true);
        setError(null);

        await bookingService.confirmBooking(bookingId);

        // Update local state
        setBookings((prev) =>
          prev.map((booking) =>
            booking.id === bookingId
              ? { ...booking, status: BookingStatus.CONFIRMED }
              : booking
          )
        );

        if (currentBooking?.id === bookingId) {
          setCurrentBooking((prev) =>
            prev ? { ...prev, status: BookingStatus.CONFIRMED } : null
          );
        }

        console.log(`✅ Booking ${bookingId} confirmed successfully in hook`);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể xác nhận booking";
        setError(errorMessage);
        console.error("❌ Hook: Error in confirmBooking:", err);
        return false;
      } finally {
        setConfirming(false);
      }
    },
    [confirming, currentBooking]
  );

  const setBookingUnderReview = useCallback(
    async (bookingId: number): Promise<boolean> => {
      if (settingUnderReview) return false;
  
      try {
        setSettingUnderReview(true);
        setError(null);
  
        await bookingService.setBookingUnderReview(bookingId);
  
        // Update local state
        setBookings((prev) =>
          prev.map((booking) =>
            booking.id === bookingId
              ? { ...booking, status: BookingStatus.UNDER_REVIEW }
              : booking
          )
        );
  
        if (currentBooking?.id === bookingId) {
          setCurrentBooking((prev) =>
            prev ? { ...prev, status: BookingStatus.UNDER_REVIEW } : null
          );
        }
  
        console.log(`✅ Booking ${bookingId} set under review successfully in hook`);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể cập nhật trạng thái booking";
        setError(errorMessage);
        console.error("❌ Hook: Error in setBookingUnderReview:", err);
        return false;
      } finally {
        setSettingUnderReview(false);
      }
    },
    [settingUnderReview, currentBooking]
  );

  



  // ===== AVAILABILITY & PRICING METHODS =====



  const calculatePrice = useCallback(
    async (
      photographerIdParam: number,
      startTime: string,
      endTime: string,
      locationId?: number
    ) => {
      try {
        setCalculatingPrice(true);
        setError(null);

        const response = locationId !== undefined
          ? await bookingService.calculatePrice(
              photographerIdParam,
              startTime,
              endTime,
              locationId
            )
          : await bookingService.calculatePrice(
              photographerIdParam,
              startTime,
              endTime,
              // @ts-expect-error: locationId is required by type, but service handles missing value
              undefined
            );

        setPriceCalculation(response);
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tính giá";
        setError(errorMessage);
        console.error("❌ Hook: Error in calculatePrice:", err);
        return null;
      } finally {
        setCalculatingPrice(false);
      }
    },
    []
  );

  // ===== UTILITY METHODS =====

  const clearBookingData = useCallback(() => {
    setBookings([]);
    setCurrentBooking(null);
    setAvailability(null);
    setPriceCalculation(null);
    setError(null);
  }, []);

  const refreshCurrentBooking = useCallback(async () => {
    if (currentBooking?.id) {
      await getBookingById(currentBooking.id);
    }
  }, [currentBooking, getBookingById]);

  // Booking status utilities
  const canCancelBooking = useCallback((booking: BookingResponse): boolean => {
    const cancelableStatuses = [BookingStatus.PENDING, BookingStatus.CONFIRMED];
    return cancelableStatuses.includes(booking.status);
  }, []);

  const canCompleteBooking = useCallback(
    (booking: BookingResponse): boolean => {
      return (
        booking.status === BookingStatus.CONFIRMED ||
        booking.status === BookingStatus.IN_PROGRESS
      );
    },
    []
  );

  const canConfirmBooking = useCallback((booking: BookingResponse): boolean => {
    return booking.status === BookingStatus.PENDING;
  }, []);

  const getBookingStatusColor = useCallback((status: BookingStatus): string => {
    switch (status) {
      case BookingStatus.PENDING:
        return "#FFA726";
      case BookingStatus.CONFIRMED:
        return "#42A5F5";
      case BookingStatus.IN_PROGRESS:
        return "#66BB6A";
      case BookingStatus.COMPLETED:
        return "#4CAF50";
      case BookingStatus.CANCELLED:
        return "#EF5350";
      case BookingStatus.EXPIRED:
        return "#BDBDBD";
      default:
        return "#757575";
    }
  }, []);

  const getBookingStatusText = useCallback((status: BookingStatus): string => {
    switch (status) {
      case BookingStatus.PENDING:
        return "Đang chờ";
      case BookingStatus.CONFIRMED:
        return "Đã xác nhận";
      case BookingStatus.IN_PROGRESS:
        return "Đang thực hiện";
      case BookingStatus.COMPLETED:
        return "Hoàn thành";
      case BookingStatus.CANCELLED:
        return "Đã hủy";
      case BookingStatus.EXPIRED:
        return "Đã hết hạn";
      default:
        return "Không xác định";
    }
  }, []);

  // Auto fetch on mount
  useEffect(() => {
    if (autoFetch && userId) {
      fetchUserBookings(userId);
    } else if (autoFetch && photographerId) {
      fetchPhotographerBookings(photographerId);
    }
  }, [
    autoFetch,
    userId,
    photographerId,
    fetchUserBookings,
    fetchPhotographerBookings,
  ]);

  return {
    // ===== DATA =====
    bookings,
    currentBooking,
    availability,
    priceCalculation,
    pagination,

    // ===== LOADING STATES =====
    loading,
    creating,
    updating,
    confirming, // ✅ NEW: confirming state
    checkingAvailability,
    calculatingPrice,
    error,

    // ===== BOOKING METHODS =====
    createBooking,
    getBookingById,
    updateBooking,
    fetchUserBookings,
    fetchPhotographerBookings,
    cancelBooking,
    completeBooking,
    confirmBooking, // ✅ NEW: confirmBooking method
    validateBookingForm,
    settingUnderReview,
    setBookingUnderReview,

    // ===== AVAILABILITY & PRICING METHODS =====
    calculatePrice,

    // ===== UTILITY METHODS =====
    clearBookingData,
    refreshCurrentBooking,
    canCancelBooking,
    canCompleteBooking,
    canConfirmBooking, // ✅ NEW: canConfirmBooking utility
    getBookingStatusColor,
    getBookingStatusText,

    // ===== SETTER METHODS (for external updates) =====
    setCurrentBooking,
    setBookings,
    setError,
    setAvailability,
    setPriceCalculation,

    // ===== REFRESH UTILITIES =====
    refreshUserBookings: () =>
      userId && fetchUserBookings(userId, pagination.page, pagination.pageSize),
    refreshPhotographerBookings: () =>
      photographerId &&
      fetchPhotographerBookings(
        photographerId,
        pagination.page,
        pagination.pageSize
      ),
  };
};