import { useState, useEffect, useCallback } from 'react';
import { NotificationApiResponse } from '../types';
import { notificationService } from '../services/notificationService';

export interface UseNotificationsReturn {
  notifications: NotificationApiResponse[];
  loading: boolean;
  error: string | null;
  unreadCount: number;
  refetch: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  createNotification: (data: any) => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
}

export const useNotifications = (userId?: number): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<NotificationApiResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      console.log('No userId provided, skipping fetch');
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    
    console.log(`Fetching notifications for userId: ${userId}`);
    setLoading(true);
    setError(null);
    
    try {
      const data = await notificationService.getByUserId(userId);
      
      console.log(`Fetched ${data.length} notifications:`, data);
      
      // Ensure data is an array and filter out any null/undefined items
      const validNotifications = Array.isArray(data) ? 
        data.filter(n => n && typeof n === 'object') : [];
      
      console.log(`Valid notifications: ${validNotifications.length}`);
      
      setNotifications(validNotifications);
      const unreadNotifications = validNotifications.filter(n => n && !n.readStatus);
      setUnreadCount(unreadNotifications.length);
      
      console.log(`Unread count: ${unreadNotifications.length}`);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      console.log(`Attempting to mark notification ${notificationId} as read`);
      
      // Optimistically update UI first
      setNotifications(prev => 
        prev.map(notification => 
          notification && notification.motificationId === notificationId 
            ? { ...notification, readStatus: true }
            : notification
        ).filter(Boolean)
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
      
      // Try to update on server
      const result = await notificationService.markAsRead(notificationId);
      
      console.log(`Successfully marked notification ${notificationId} as read`, result);
      
    } catch (err) {
      console.error('Error marking notification as read:', err);
      
      // If server update fails, revert the optimistic update
      setNotifications(prev => 
        prev.map(notification => 
          notification && notification.motificationId === notificationId 
            ? { ...notification, readStatus: false }
            : notification
        ).filter(Boolean)
      );
      
      setUnreadCount(prev => prev + 1);
      
      // Only show error for non-JSON parse errors
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (!errorMessage.includes('JSON Parse error')) {
        setError(errorMessage);
      }
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => n && !n.readStatus);
      
      if (unreadNotifications.length === 0) {
        console.log('No unread notifications to mark as read');
        return;
      }
      
      console.log(`Marking ${unreadNotifications.length} notifications as read`);
      
      // Optimistically update UI first
      setNotifications(prev => 
        prev.map(notification => 
          notification ? { ...notification, readStatus: true } : notification
        ).filter(Boolean)
      );
      
      setUnreadCount(0);
      
      // Try to update on server
      const results = await Promise.allSettled(
        unreadNotifications.map(n => notificationService.markAsRead(n.motificationId))
      );
      
      // Check if any requests failed (excluding JSON parse errors)
      const realFailures = results.filter(result => {
        if (result.status === 'rejected') {
          const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
          return !errorMessage.includes('JSON Parse error');
        }
        return false;
      });
      
      if (realFailures.length > 0) {
        console.error('Some notifications failed to update:', realFailures);
        // Optionally revert optimistic update or show partial success message
      }
      
      console.log('Successfully marked all notifications as read');
      
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      
      // Revert optimistic update
      await fetchNotifications();
      
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (!errorMessage.includes('JSON Parse error')) {
        setError(errorMessage);
      }
    }
  }, [notifications, fetchNotifications]);

  const createNotification = useCallback(async (data: any) => {
    try {
      setLoading(true);
      console.log('Creating notification:', data);
      await notificationService.create(data);
      await fetchNotifications(); // Refresh list
    } catch (err) {
      console.error('Error creating notification:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications]);

  const deleteNotification = useCallback(async (id: number) => {
    try {
      console.log(`Deleting notification ${id}`);
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n && n.motificationId !== id));
      
      // Update unread count if deleted notification was unread
      const deletedNotification = notifications.find(n => n && n.motificationId === id);
      if (deletedNotification && !deletedNotification.readStatus) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    }
  }, [notifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    refetch: fetchNotifications,
    markAsRead,
    markAllAsRead,
    createNotification,
    deleteNotification,
  };
};