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

  // Fetch photo deliveries by photographer
  const fetchPhotoDeliveries = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);

        const deliveries = await photoDeliveryService.getPhotoDeliveriesByPhotographer(
          photographerId
        );
        setPhotoDeliveries(deliveries);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Có lỗi xảy ra khi tải danh sách giao hàng ảnh';
        setError(errorMessage);
        console.error('Error fetching photo deliveries:', err);
      } finally {
        setLoading(false);
      }
    },
    [photographerId]
  );

  // Get photo delivery by booking ID
  const getPhotoDeliveryByBooking = useCallback(
    async (bookingId: number): Promise<PhotoDeliveryData | null> => {
      try {
        return await photoDeliveryService.getPhotoDeliveryByBooking(bookingId);
      } catch (err) {
        console.error('Error fetching photo delivery by booking:', err);
        return null;
      }
    },
    []
  );

  // Create photo delivery
  const createPhotoDelivery = useCallback(
    async (request: CreatePhotoDeliveryRequest): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

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
        Alert.alert('Lỗi', errorMessage);
        console.error('Error creating photo delivery:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchPhotoDeliveries]
  );

  // Update photo delivery
  const updatePhotoDelivery = useCallback(
    async (
      photoDeliveryId: number,
      request: UpdatePhotoDeliveryRequest
    ): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

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
        Alert.alert('Lỗi', errorMessage);
        console.error('Error updating photo delivery:', err);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [fetchPhotoDeliveries]
  );

  // Delete photo delivery
  const deletePhotoDelivery = useCallback(
    async (photoDeliveryId: number): Promise<boolean> => {
      try {
        setLoading(true);
        setError(null);

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
    
    // Actions
    fetchPhotoDeliveries,
    getPhotoDeliveryByBooking,
    createPhotoDelivery,
    updatePhotoDelivery,
    deletePhotoDelivery,
    refreshPhotoDeliveries,
    
    // Computed values
    getPhotoDeliveriesByStatus,
    getDeliveryCounts,
    hasPhotoDelivery,
    getPhotoDeliveryForBooking,
    getAllPhotoDeliveries,
  };
};