// hooks/useBookingPhotographer.ts

import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import {
  Booking,
  BookingQueryParams,
  BookingStatus,
  BookingCardData,
  BookingStatusPhotographer,
} from "../types/booking";
import { bookingService } from "../services/photographerBookingService";

// Define the actual booking structure based on API response
interface ApiBooking {
  bookingId: number;
  userId: number;
  photographerId: number;
  locationId?: number;
  externalLocationId?: number;
  startDatetime: string;
  endDatetime: string;
  totalPrice: number;
  status: string;
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
  userName: string;
  userEmail: string;
  locationName: string;
  locationAddress: string;
  paymentAmount: number;
  externalLocation?: {
    name: string;
    address: string;
  };
}

export const useBookings = (photographerId: number) => {
  const [bookings, setBookings] = useState<ApiBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    totalCount: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });

  // Fetch bookings
  const fetchBookings = useCallback(
    async (params: BookingQueryParams = {}) => {
      try {
        setError(null);
        const isRefresh = params.page === 1;

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await bookingService.getPhotographerBookings(
          photographerId,
          params
        );

        if (response && (response.error === 0 || !response.error)) {
          const bookingsData =
            response.data?.bookings ||
            response.bookings ||
            response.data ||
            response ||
            [];

          if (Array.isArray(bookingsData)) {
            setBookings(bookingsData);

            setPagination({
              totalCount:
                response.data?.totalCount ||
                response.totalCount ||
                bookingsData.length ||
                0,
              page: response.data?.page || response.page || params.page || 1,
              pageSize:
                response.data?.pageSize ||
                response.pageSize ||
                params.pageSize ||
                10,
              totalPages: response.data?.totalPages || response.totalPages || 1,
            });
          } else {
            setBookings([]);
          }
        } else {
          throw new Error(response?.message || "Failed to fetch bookings");
        }
      } catch (err) {
        console.error("💥 ERROR fetching bookings:", err);
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        setError(errorMessage);
        Alert.alert("Lỗi", `Không thể tải danh sách đơn hàng: ${errorMessage}`);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [photographerId]
  );

  // Load more bookings (pagination)
  const loadMoreBookings = useCallback(async () => {
    if (pagination.page < pagination.totalPages && !loading) {
      const nextPage = pagination.page + 1;
      try {
        setLoading(true);
        const response = await bookingService.getPhotographerBookings(
          photographerId,
          {
            page: nextPage,
            pageSize: pagination.pageSize,
          }
        );

        if (response && (response.error === 0 || !response.error)) {
          const newBookings =
            response.data?.bookings || response.data || response || [];
          setBookings((prev) => [
            ...prev,
            ...(Array.isArray(newBookings) ? newBookings : []),
          ]);
          setPagination({
            totalCount: response.data?.totalCount || 0,
            page: response.data?.page || nextPage,
            pageSize: response.data?.pageSize || pagination.pageSize,
            totalPages: response.data?.totalPages || 1,
          });
        }
      } catch (err) {
        console.error("Error loading more bookings:", err);
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        Alert.alert("Lỗi", `Không thể tải thêm đơn hàng: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }
  }, [photographerId, pagination, loading]);

  // Refresh bookings
  const refreshBookings = useCallback(() => {
    fetchBookings({ page: 1, pageSize: pagination.pageSize });
  }, [fetchBookings, pagination.pageSize]);

  // ✅ CONFIRM BOOKING - Sử dụng API confirm
  const confirmBooking = useCallback(async (bookingId: number) => {
    try {
      console.log(`🔄 Confirming booking ${bookingId}...`);
      
      const response = await bookingService.confirmBooking(bookingId);

      if (response && (response.error === 0 || !response.error)) {
        setBookings((prev) =>
          prev.map((booking) =>
            booking.bookingId === bookingId
              ? { ...booking, status: "Confirmed" }
              : booking
          )
        );
        Alert.alert("Thành công", "Đã xác nhận đơn hàng!");
        return true;
      } else {
        throw new Error(response?.message || "Failed to confirm booking");
      }
    } catch (err) {
      console.error("❌ Error confirming booking:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      Alert.alert("Lỗi", `Không thể xác nhận đơn hàng: ${errorMessage}`);
      return false;
    }
  }, []);

  // ✅ ACCEPT BOOKING (legacy method - maps to confirm)
  const acceptBooking = useCallback(async (bookingId: number) => {
    return confirmBooking(bookingId);
  }, [confirmBooking]);

  // ✅ COMPLETE BOOKING - Sử dụng API Complete
  const completeBooking = useCallback(async (bookingId: number) => {
    try {
      console.log(`🔄 Completing booking ${bookingId}...`);
      
      const response = await bookingService.completeBooking(bookingId);

      if (response && (response.error === 0 || !response.error)) {
        // ✅ Update local state immediately
        setBookings((prev) =>
          prev.map((booking) =>
            booking.bookingId === bookingId
              ? { ...booking, status: "Completed" }
              : booking
          )
        );
        
        Alert.alert("Thành công", "Đơn hàng đã hoàn thành!");
        return true;
      } else {
        throw new Error(response?.message || "Failed to complete booking");
      }
    } catch (err) {
      console.error("❌ Error completing booking:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      Alert.alert("Lỗi", `Không thể hoàn thành đơn hàng: ${errorMessage}`);
      return false;
    }
  }, []);

  // ✅ REJECT/CANCEL BOOKING
  const rejectBooking = useCallback(async (bookingId: number) => {
    try {
      console.log(`🔄 Cancelling booking ${bookingId}...`);
      
      const response = await bookingService.cancelBooking(bookingId);

      if (response && (response.error === 0 || !response.error)) {
        setBookings((prev) =>
          prev.map((booking) =>
            booking.bookingId === bookingId
              ? { ...booking, status: "Cancelled" }
              : booking
          )
        );
        Alert.alert("Đã hủy", "Đơn hàng đã được hủy.");
        return true;
      } else {
        throw new Error(response?.message || "Failed to cancel booking");
      }
    } catch (err) {
      console.error("❌ Error cancelling booking:", err);
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      Alert.alert("Lỗi", `Không thể hủy đơn hàng: ${errorMessage}`);
      return false;
    }
  }, []);

  // Transform API data to UI format
  const transformBookingToCardData = useCallback(
    (booking: ApiBooking): BookingCardData => {
      const startDate = new Date(booking.startDatetime);
      const endDate = new Date(booking.endDatetime);
      const durationHours = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
      );

      // ✅ Map API status to UI status
      const getUIStatus = (apiStatus: string): BookingCardData["status"] => {
        const status = apiStatus?.toLowerCase();

        switch (status) {
          case "pending":
            return "pending";
          case "confirmed":
            return "confirmed";
          case "cancelled":
          case "canceled":
            return "rejected";
          case "completed":
          case "finished":
          case "done":
            return "completed";
          case "inprogress":
          case "in-progress":
          case "in_progress":
            return "in-progress";
          default:
            console.warn(`⚠️ Unknown booking status: ${apiStatus}`);
            return "pending";
        }
      };

      // Calculate price per hour
      const pricePerHour =
        durationHours > 0
          ? booking.totalPrice / durationHours
          : booking.totalPrice;

      const result = {
        id: booking.bookingId.toString(),
        userName: booking.userName || `User ${booking.userId}`,
        customerName: booking.userName || `User ${booking.userId}`,
        customerPhone: "",
        customerEmail: booking.userEmail || "",
        serviceType: "Chụp ảnh",
        location:
          booking.locationName ||
          booking.externalLocation?.name ||
          "Chưa xác định",
        locationName:
          booking.locationName ||
          booking.externalLocation?.name ||
          "Chưa xác định",
        locationAddress:
          booking.locationAddress || booking.externalLocation?.address || "",
        date: startDate.toISOString().split("T")[0],
        time: startDate.toTimeString().slice(0, 5),
        duration: durationHours,
        totalPrice: booking.totalPrice,
        status: getUIStatus(booking.status),
        description: booking.specialRequests || "Không có yêu cầu đặc biệt",
        createdAt: booking.createdAt,
        specialRequests: booking.specialRequests || undefined,
        hasPayment: false,
        paymentStatus: "pending",
        paymentAmount: booking.paymentAmount,
        pricePerHour: pricePerHour,
      };

      return result;
    },
    []
  );

  // Get transformed bookings for UI
  const getBookingsForUI = useCallback(() => {
    return bookings.map(transformBookingToCardData);
  }, [bookings, transformBookingToCardData]);

  // Filter bookings by status
  const getBookingsByStatus = useCallback(
    (status: BookingCardData["status"]) => {
      const uiBookings = getBookingsForUI();
      return uiBookings.filter((booking) => booking.status === status);
    },
    [getBookingsForUI]
  );

  // Get booking counts by status
  const getBookingCounts = useCallback(() => {
    const uiBookings = getBookingsForUI();
    const counts = {
      pending: uiBookings.filter((b) => b.status === "pending").length,
      confirmed: uiBookings.filter(
        (b) => b.status === "confirmed" || b.status === "in-progress"
      ).length,
      completed: uiBookings.filter(
        (b) => b.status === "completed" || b.status === "rejected"
      ).length,
    };

    return counts;
  }, [getBookingsForUI, bookings]);

  // Initial load
  useEffect(() => {
    if (photographerId) {
      fetchBookings({ page: 1, pageSize: 10 });
    }
  }, [photographerId, fetchBookings]);

  return {
    // Data
    bookings,
    pagination,

    // States
    loading,
    refreshing,
    error,

    // Actions
    fetchBookings,
    loadMoreBookings,
    refreshBookings,
    acceptBooking, // Maps to confirmBooking
    confirmBooking, // ✅ New method
    rejectBooking,
    completeBooking, // ✅ Updated to use Complete API
    
    // Helpers
    getBookingsForUI,
    getBookingsByStatus,
    getBookingCounts,
    transformBookingToCardData,

    // Computed values
    hasMorePages: pagination.page < pagination.totalPages,
    totalBookings: pagination.totalCount,
  };
};