// hooks/usePhotoDelivery.ts

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import photoDeliveryService from '../services/photoDeliveryService';
import {
  PhotoDeliveryData,
  CreatePhotoDeliveryRequest,
  UpdatePhotoDeliveryRequest,
  DeliveryCounts,
} from '../types/photoDelivery';

export const usePhotoDelivery = (photographerId: number) => {
  const [photoDeliveries, setPhotoDeliveries] = useState<PhotoDeliveryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ Thêm state để phân biệt empty vs error
  const [isEmpty, setIsEmpty] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Fetch photo deliveries by photographer
  const fetchPhotoDeliveries = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);
        setHasError(false);
        setIsEmpty(false);

        const deliveries = await photoDeliveryService.getPhotoDeliveriesByPhotographer(
          photographerId
        );
        
        setPhotoDeliveries(deliveries);
        
        // ✅ Set empty state if no deliveries found
        if (deliveries.length === 0) {
          setIsEmpty(true);
        }
        
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Có lỗi xảy ra khi tải danh sách giao hàng ảnh';
        
        // ✅ Only set error state for real errors, not empty results
        setError(errorMessage);
        setHasError(true);
        setPhotoDeliveries([]); // Reset to empty array
        console.error('Error fetching photo deliveries:', err);
      } finally {
        setLoading(false);
      }
    },
    [photographerId]
  );

  // ✅ Get photo delivery by booking ID - NO ALERT/TOAST
  const getPhotoDeliveryByBooking = useCallback(
    async (bookingId: number): Promise<PhotoDeliveryData | null> => {
      try {
        return await photoDeliveryService.getPhotoDeliveryByBooking(bookingId);
      } catch (err) {
        // ✅ SILENT ERROR - không hiển thị alert/toast
        console.error('Error fetching photo delivery by booking:', err);
        return null;
      }
    },
    []
  );

  // Create photo delivery - CÓ THỂ hiển thị alert
  const createPhotoDelivery = useCallback(
    async (request: CreatePhotoDeliveryRequest): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);
        setHasError(false);

        await photoDeliveryService.createPhotoDelivery(request);
        
        Alert.alert('Thành công', 'Tạo giao hàng ảnh thành công!');
        await fetchPhotoDeliveries(false); // Refresh list
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Có lỗi xảy ra khi tạo giao hàng ảnh';
        setError(errorMessage);
        setHasError(true);
        Alert.alert('Lỗi', errorMessage);
        console.error('Error creating photo delivery:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchPhotoDeliveries]
  );

  // Update photo delivery - CÓ THỂ hiển thị alert
  const updatePhotoDelivery = useCallback(
    async (
      photoDeliveryId: number,
      request: UpdatePhotoDeliveryRequest
    ): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);
        setHasError(false);

        await photoDeliveryService.updatePhotoDelivery(photoDeliveryId, request);
        
        Alert.alert('Thành công', 'Cập nhật giao hàng ảnh thành công!');
        await fetchPhotoDeliveries(false); // Refresh list
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Có lỗi xảy ra khi cập nhật giao hàng ảnh';
        setError(errorMessage);
        setHasError(true);
        Alert.alert('Lỗi', errorMessage);
        console.error('Error updating photo delivery:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchPhotoDeliveries]
  );

  // Delete photo delivery - CÓ THỂ hiển thị alert
  const deletePhotoDelivery = useCallback(
    async (photoDeliveryId: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);
        setHasError(false);

        await photoDeliveryService.deletePhotoDelivery(photoDeliveryId);
        
        Alert.alert('Thành công', 'Xóa giao hàng ảnh thành công!');
        await fetchPhotoDeliveries(false); // Refresh list
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Có lỗi xảy ra khi xóa giao hàng ảnh';
        setError(errorMessage);
        setHasError(true);
        Alert.alert('Lỗi', errorMessage);
        console.error('Error deleting photo delivery:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchPhotoDeliveries]
  );

  // Refresh data
  const refreshPhotoDeliveries = useCallback(async () => {
    setRefreshing(true);
    await fetchPhotoDeliveries(false);
    setRefreshing(false);
  }, [fetchPhotoDeliveries]);

  // Get photo deliveries by status
  const getPhotoDeliveriesByStatus = useCallback(
    (status: string): PhotoDeliveryData[] => {
      return photoDeliveries.filter((delivery) =>
        delivery.status.toLowerCase() === status.toLowerCase()
      );
    },
    [photoDeliveries]
  );

  // Get delivery counts by status
  const getDeliveryCounts = useCallback((): DeliveryCounts => {
    return {
      pending: photoDeliveries.filter(
        (d) => d.status.toLowerCase() === 'pending'
      ).length,
      delivered: photoDeliveries.filter(
        (d) => d.status.toLowerCase() === 'delivered'
      ).length,
      notRequired: photoDeliveries.filter(
        (d) => d.status.toLowerCase() === 'notrequired'
      ).length,
    };
  }, [photoDeliveries]);

  // Check if booking has photo delivery
  const hasPhotoDelivery = useCallback(
    (bookingId: number): boolean => {
      return photoDeliveries.some((delivery) => delivery.bookingId === bookingId);
    },
    [photoDeliveries]
  );

  // Get photo delivery for specific booking
  const getPhotoDeliveryForBooking = useCallback(
    (bookingId: number): PhotoDeliveryData | undefined => {
      return photoDeliveries.find((delivery) => delivery.bookingId === bookingId);
    },
    [photoDeliveries]
  );

  // Get all photo deliveries
  const getAllPhotoDeliveries = useCallback((): PhotoDeliveryData[] => {
    return photoDeliveries;
  }, [photoDeliveries]);

  // ✅ Reset error state when needed
  const clearError = useCallback(() => {
    setError(null);
    setHasError(false);
  }, []);

  // Initialize data fetch
  useEffect(() => {
    if (photographerId) {
      fetchPhotoDeliveries();
    }
  }, [photographerId, fetchPhotoDeliveries]);

  return {
    // Data
    photoDeliveries,
    
    // States
    loading,
    refreshing,
    error,
    isEmpty,        // ✅ Thêm state để check empty
    hasError,       // ✅ Thêm state để check real error
    
    // Actions
    fetchPhotoDeliveries,
    getPhotoDeliveryByBooking,  // ✅ SILENT - không hiển thị toast
    createPhotoDelivery,
    updatePhotoDelivery,
    deletePhotoDelivery,
    refreshPhotoDeliveries,
    clearError,     // ✅ Thêm action để clear error
    
    // Computed values
    getPhotoDeliveriesByStatus,
    getDeliveryCounts,
    hasPhotoDelivery,
    getPhotoDeliveryForBooking,
    getAllPhotoDeliveries,
  };
};