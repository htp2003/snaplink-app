// hooks/useBookings.ts

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { 
  Booking, 
  BookingQueryParams, 
  BookingStatus,
  BookingCardData, 
  BookingStatusPhotographer
} from '../types/booking';
import { bookingService } from '../services/photographerBookingService';

export const useBookings = (photographerId: number) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
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
  const fetchBookings = useCallback(async (params: BookingQueryParams = {}) => {
    try {
      setError(null);
      const isRefresh = params.page === 1;
      
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await bookingService.getPhotographerBookings(photographerId, params);
      
      if (response.error === 0) {
        setBookings(response.data.bookings);
        setPagination({
          totalCount: response.data.totalCount,
          page: response.data.page,
          pageSize: response.data.pageSize,
          totalPages: response.data.totalPages,
        });
      } else {
        throw new Error(response.message || 'Failed to fetch bookings');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      Alert.alert('Lỗi', `Không thể tải danh sách đơn hàng: ${errorMessage}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [photographerId]);

  // Load more bookings (pagination)
  const loadMoreBookings = useCallback(async () => {
    if (pagination.page < pagination.totalPages && !loading) {
      const nextPage = pagination.page + 1;
      try {
        setLoading(true);
        const response = await bookingService.getPhotographerBookings(photographerId, {
          page: nextPage,
          pageSize: pagination.pageSize,
        });

        if (response.error === 0) {
          setBookings(prev => [...prev, ...response.data.bookings]);
          setPagination({
            totalCount: response.data.totalCount,
            page: response.data.page,
            pageSize: response.data.pageSize,
            totalPages: response.data.totalPages,
          });
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        Alert.alert('Lỗi', `Không thể tải thêm đơn hàng: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    }
  }, [photographerId, pagination, loading]);

  // Refresh bookings
  const refreshBookings = useCallback(() => {
    fetchBookings({ page: 1, pageSize: pagination.pageSize });
  }, [fetchBookings, pagination.pageSize]);

  // Accept booking
  const acceptBooking = useCallback(async (bookingId: number) => {
    try {
      const response = await bookingService.updateBookingStatus(bookingId, {
        status: 'Confirmed',
      });

      if (response.error === 0) {
        setBookings(prev => prev.map(booking =>
          booking.bookingId === bookingId 
            ? { ...booking, status: 'Confirmed' as BookingStatusPhotographer }
            : booking
        ));
        Alert.alert('Thành công', 'Đã xác nhận đơn hàng!');
        return true;
      } else {
        throw new Error(response.message || 'Failed to accept booking');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      Alert.alert('Lỗi', `Không thể xác nhận đơn hàng: ${errorMessage}`);
      return false;
    }
  }, []);

  // Reject booking
  const rejectBooking = useCallback(async (bookingId: number) => {
    try {
      const response = await bookingService.cancelBooking(bookingId);

      if (response.error === 0) {
        setBookings(prev => prev.map(booking =>
          booking.bookingId === bookingId 
            ? { ...booking, status: 'Cancelled' as BookingStatusPhotographer }
            : booking
        ));
        Alert.alert('Đã hủy', 'Đơn hàng đã được hủy.');
        return true;
      } else {
        throw new Error(response.message || 'Failed to reject booking');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      Alert.alert('Lỗi', `Không thể hủy đơn hàng: ${errorMessage}`);
      return false;
    }
  }, []);

  // Complete booking
  const completeBooking = useCallback(async (bookingId: number) => {
    try {
      const response = await bookingService.completeBooking(bookingId);

      if (response.error === 0) {
        setBookings(prev => prev.map(booking =>
          booking.bookingId === bookingId 
            ? { ...booking, status: 'Completed' as BookingStatusPhotographer }
            : booking
        ));
        Alert.alert('Thành công', 'Đơn hàng đã hoàn thành!');
        return true;
      } else {
        throw new Error(response.message || 'Failed to complete booking');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      Alert.alert('Lỗi', `Không thể hoàn thành đơn hàng: ${errorMessage}`);
      return false;
    }
  }, []);

  // Transform API data to UI format
  const transformBookingToCardData = useCallback((booking: Booking): BookingCardData => {
    const startDate = new Date(booking.startDatetime);
    const endDate = new Date(booking.endDatetime);
    
    // Map API status to UI status
    const getUIStatus = (apiStatus: BookingStatusPhotographer): BookingCardData['status'] => {
      switch (apiStatus) {
        case 'Pending': return 'pending';
        case 'Confirmed': return 'confirmed';
        case 'Cancelled': return 'rejected';
        case 'Completed': return 'completed';
        case 'InProgress': return 'in-progress';
        default: return 'pending';
      }
    };

    return {
      id: booking.bookingId.toString(),
      customerName: booking.userName,
      customerPhone: '', // Not provided in API, you might need to fetch separately
      customerEmail: booking.userEmail,
      serviceType: 'Chụp ảnh', // Generic, you might want to add this field to API
      location: booking.locationName,
      locationAddress: booking.locationAddress,
      date: startDate.toISOString().split('T')[0],
      time: startDate.toTimeString().slice(0, 5),
      duration: booking.durationHours,
      price: booking.totalPrice,
      status: getUIStatus(booking.status),
      description: booking.specialRequests || 'Không có yêu cầu đặc biệt',
      createdAt: booking.createdAt,
      specialRequests: booking.specialRequests || undefined,
      hasPayment: booking.hasPayment,
      paymentStatus: booking.paymentStatus,
      paymentAmount: booking.paymentAmount,
      pricePerHour: booking.pricePerHour,
    };
  }, []);

  // Get transformed bookings for UI
  const getBookingsForUI = useCallback(() => {
    return bookings.map(transformBookingToCardData);
  }, [bookings, transformBookingToCardData]);

  // Filter bookings by status
  const getBookingsByStatus = useCallback((status: BookingCardData['status']) => {
    const uiBookings = getBookingsForUI();
    return uiBookings.filter(booking => booking.status === status);
    
  }, [getBookingsForUI]);
  
  

  // Get booking counts by status
  const getBookingCounts = useCallback(() => {
    const uiBookings = getBookingsForUI();
    return {
      pending: uiBookings.filter(b => b.status === 'pending').length,
      confirmed: uiBookings.filter(b => b.status === 'confirmed' || b.status === 'in-progress').length,
      completed: uiBookings.filter(b => b.status === 'completed' || b.status === 'rejected').length,
    };
  }, [getBookingsForUI]);

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
    acceptBooking,
    rejectBooking,
    completeBooking,
    
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