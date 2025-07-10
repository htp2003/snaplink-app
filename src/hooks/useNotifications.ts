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
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await notificationService.getByUserId(userId);
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.readStatus).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.motificationId === notificationId 
            ? { ...notification, readStatus: true }
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      setError(err instanceof Error ? err.message : 'Error marking as read');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.readStatus);
      
      await Promise.all(
        unreadNotifications.map(n => notificationService.markAsRead(n.motificationId))
      );
      
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, readStatus: true }))
      );
      
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      setError(err instanceof Error ? err.message : 'Error marking all as read');
    }
  }, [notifications]);

  const createNotification = useCallback(async (data: any) => {
    try {
      setLoading(true);
      await notificationService.create(data);
      await fetchNotifications(); // Refresh list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating notification');
    } finally {
      setLoading(false);
    }
  }, [fetchNotifications]);

  const deleteNotification = useCallback(async (id: number) => {
    try {
      await notificationService.delete(id);
      setNotifications(prev => prev.filter(n => n.motificationId !== id));
      // Update unread count if deleted notification was unread
      const deletedNotification = notifications.find(n => n.motificationId === id);
      if (deletedNotification && !deletedNotification.readStatus) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting notification');
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