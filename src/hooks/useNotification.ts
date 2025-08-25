// hooks/useNotifications.ts - Hook quản lý thông báo

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  NotificationResponse,
  NotificationListResponse,
  NotificationQuery,
  NotificationStats,
  UseNotificationOptions,
  NotificationNavigationHandler,
  CreateNotificationRequest,
  NotificationType,
  DEFAULT_PAGE_SIZE,
  DEFAULT_REFRESH_INTERVAL
} from '../types/notification';
import { notificationService } from '../services/notificationService';

// Main hook interface
export interface UseNotificationsReturn {
  // States
  notifications: NotificationResponse[];
  unreadCount: number;
  stats: NotificationStats | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasMore: boolean;
  
  // Pagination
  currentPage: number;
  totalCount: number;
  
  // Methods
  fetchNotifications: (query?: NotificationQuery) => Promise<boolean>;
  refreshNotifications: () => Promise<boolean>;
  loadMoreNotifications: () => Promise<boolean>;
  
  // CRUD operations
  createNotification: (request: CreateNotificationRequest) => Promise<boolean>;
  markAsRead: (id: number) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (id: number) => Promise<boolean>;
  deleteReadNotifications: () => Promise<boolean>;
  
  // Utility
  getUnreadCount: () => Promise<void>;
  getStats: () => Promise<void>;
  clearError: () => void;
  
  // Navigation handler
  setNavigationHandler: (handler: NotificationNavigationHandler) => void;
  
  // Auto refresh
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
}

export const useNotifications = (options: UseNotificationOptions = {}): UseNotificationsReturn => {
  const {
    userId,
    autoRefresh = false,
    refreshInterval = DEFAULT_REFRESH_INTERVAL,
    pageSize = DEFAULT_PAGE_SIZE
  } = options;

  // States
  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Refs
  const navigationHandler = useRef<NotificationNavigationHandler | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastQueryRef = useRef<NotificationQuery>({});

  // ===== FETCH OPERATIONS =====

  const fetchNotifications = useCallback(async (query: NotificationQuery = {}): Promise<boolean> => {
    if (!userId) {
      setError('User ID is required');
      return false;
    }
  
    try {
      setIsLoading(true);
      setError(null);
  
      const fullQuery = {
        page: 1,
        pageSize,
        ...query
      };
  
      lastQueryRef.current = fullQuery;
  
      console.log('🔄 Fetching notifications with query:', fullQuery);
  
      // ✅ FIXED: This now uses the corrected getUserNotifications method
      // which internally calls the new endpoint /Notification/GetNotificationsByUserId/{userId}
      const response = await notificationService.getUserNotifications(userId, fullQuery);
      
      if (response.error === 0 && response.data) {
        console.log('✅ Notifications fetched successfully:', response.data);
        setNotifications(response.data.notifications);
        setHasMore(response.data.hasMore);
        setCurrentPage(response.data.page);
        setTotalCount(response.data.totalCount);
        return true;
      } else {
        console.error('❌ Failed to fetch notifications:', response.message);
        setError(response.message || 'Failed to fetch notifications');
        return false;
      }
    } catch (error) {
      console.error('💥 Error fetching notifications:', error);
      setError('Failed to fetch notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, pageSize]);

  const refreshNotifications = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      setIsRefreshing(true);
      setCurrentPage(1);
      
      console.log('🔄 Refreshing notifications...');
      
      const query = { ...lastQueryRef.current, page: 1 };
      const result = await fetchNotifications(query);
      
      // Also refresh unread count and stats
      await getUnreadCount();
      await getStats();
      
      return result;
    } catch (error) {
      console.error('💥 Error refreshing notifications:', error);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchNotifications]);

  const loadMoreNotifications = useCallback(async (): Promise<boolean> => {
    if (!userId || !hasMore || isLoading) {
      console.log('⚠️ Cannot load more:', { userId: !!userId, hasMore, isLoading });
      return false;
    }

    try {
      setIsLoading(true);
      setError(null);

      const nextPage = currentPage + 1;
      const query = { ...lastQueryRef.current, page: nextPage };

      console.log('📄 Loading more notifications, page:', nextPage);

      const response = await notificationService.getUserNotifications(userId, query);
      
      if (response.error === 0 && response.data) {
        console.log('✅ More notifications loaded:', response.data.notifications.length);
        setNotifications(prev => [...prev, ...response.data!.notifications]);
        setHasMore(response.data.hasMore);
        setCurrentPage(response.data.page);
        return true;
      } else {
        console.error('❌ Failed to load more notifications:', response.message);
        setError(response.message || 'Failed to load more notifications');
        return false;
      }
    } catch (error) {
      console.error('💥 Error loading more notifications:', error);
      setError('Failed to load more notifications');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId, hasMore, isLoading, currentPage]);

  // ===== CRUD OPERATIONS =====

  const createNotification = useCallback(async (request: CreateNotificationRequest): Promise<boolean> => {
    try {
      console.log('📝 Creating notification:', request);
      
      const response = await notificationService.createNotification(request);
      
      if (response.error === 0) {
        console.log('✅ Notification created successfully');
        // Refresh notifications to show the new one
        await refreshNotifications();
        return true;
      } else {
        console.error('❌ Failed to create notification:', response.message);
        setError(response.message || 'Failed to create notification');
        return false;
      }
    } catch (error) {
      console.error('💥 Error creating notification:', error);
      setError('Failed to create notification');
      return false;
    }
  }, [refreshNotifications]);

  const markAsRead = useCallback(async (id: number): Promise<boolean> => {
    try {
      console.log('👁️ Marking notification as read:', id);
      
      const response = await notificationService.markAsRead(id);
      
      if (response.error === 0) {
        console.log('✅ Notification marked as read');
        // Update local state
        setNotifications(prev => 
          prev.map(n => n.motificationId === id ? { ...n, readStatus: true } : n)
        );
        // Update unread count
        await getUnreadCount();
        return true;
      } else {
        console.error('❌ Failed to mark as read:', response.message);
        setError(response.message || 'Failed to mark as read');
        return false;
      }
    } catch (error) {
      console.error('💥 Error marking as read:', error);
      setError('Failed to mark as read');
      return false;
    }
  }, []);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      console.log('👁️‍🗨️ Marking all notifications as read for user:', userId);
      
      const response = await notificationService.markAllAsRead(userId);
      
      if (response.error === 0) {
        console.log('✅ All notifications marked as read:', response.data);
        // Update local state
        setNotifications(prev => 
          prev.map(n => ({ ...n, readStatus: true }))
        );
        // Update unread count
        setUnreadCount(0);
        return true;
      } else {
        console.error('❌ Failed to mark all as read:', response.message);
        setError(response.message || 'Failed to mark all as read');
        return false;
      }
    } catch (error) {
      console.error('💥 Error marking all as read:', error);
      setError('Failed to mark all as read');
      return false;
    }
  }, [userId]);

  const deleteNotification = useCallback(async (id: number): Promise<boolean> => {
    try {
      console.log('🗑️ Deleting notification:', id);
      
      const response = await notificationService.deleteNotification(id);
      
      if (response.error === 0) {
        console.log('✅ Notification deleted successfully');
        // Remove from local state
        setNotifications(prev => prev.filter(n => n.motificationId !== id));
        // Update counts
        await getUnreadCount();
        await getStats();
        return true;
      } else {
        console.error('❌ Failed to delete notification:', response.message);
        setError(response.message || 'Failed to delete notification');
        return false;
      }
    } catch (error) {
      console.error('💥 Error deleting notification:', error);
      setError('Failed to delete notification');
      return false;
    }
  }, []);

  const deleteReadNotifications = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      console.log('🗑️ Deleting read notifications for user:', userId);
      
      const response = await notificationService.deleteReadNotifications(userId);
      
      if (response.error === 0) {
        console.log('✅ Read notifications deleted:', response.data);
        // Remove read notifications from local state
        setNotifications(prev => prev.filter(n => !n.readStatus));
        // Update counts
        await getStats();
        return true;
      } else {
        console.error('❌ Failed to delete read notifications:', response.message);
        setError(response.message || 'Failed to delete read notifications');
        return false;
      }
    } catch (error) {
      console.error('💥 Error deleting read notifications:', error);
      setError('Failed to delete read notifications');
      return false;
    }
  }, [userId]);

  // ===== UTILITY METHODS =====

  const getUnreadCount = useCallback(async (): Promise<void> => {
    if (!userId) return;
  
    try {
      console.log('🔢 Getting unread count for user:', userId);
      
      // ✅ FIXED: Use the new endpoint to get user-specific notifications
      const response = await notificationService.getNotificationsByUserId(userId);
      
      if (response.error === 0 && response.data) {
        const unreadCount = response.data.filter(n => !n.readStatus).length;
        console.log('✅ Unread count:', unreadCount);
        setUnreadCount(unreadCount);
      } else {
        console.error('❌ Failed to get unread count:', response.message);
      }
    } catch (error) {
      console.error('💥 Error getting unread count:', error);
    }
  }, [userId]);

  const getStats = useCallback(async (): Promise<void> => {
    if (!userId) return;
  
    try {
      console.log('📊 Getting stats for user:', userId);
      
      // ✅ FIXED: Use the new endpoint for stats calculation
      const response = await notificationService.getNotificationsByUserId(userId);
      
      if (response.error === 0 && response.data) {
        const userNotifications = response.data;
        
        const stats: NotificationStats = {
          totalCount: userNotifications.length,
          unreadCount: userNotifications.filter(n => !n.readStatus).length,
          readCount: userNotifications.filter(n => n.readStatus).length,
          typeBreakdown: {} as any
        };
  
        // Initialize type breakdown
        Object.values(NotificationType).forEach(type => {
          stats.typeBreakdown[type] = 0;
        });
  
        // Count by type
        userNotifications.forEach(notification => {
          stats.typeBreakdown[notification.notificationType]++;
        });
  
        console.log('📊 Stats calculated:', stats);
        setStats(stats);
      } else {
        console.error('❌ Failed to get stats:', response.message);
      }
    } catch (error) {
      console.error('💥 Error getting stats:', error);
    }
  }, [userId]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===== NAVIGATION HANDLER =====

  const setNavigationHandler = useCallback((handler: NotificationNavigationHandler) => {
    console.log('🧭 Setting navigation handler');
    navigationHandler.current = handler;
  }, []);

  // ===== AUTO REFRESH =====

  const startAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
    }

    console.log('⏰ Starting auto refresh with interval:', refreshInterval);

    refreshIntervalRef.current = setInterval(async () => {
      console.log('🔄 Auto refreshing notifications...');
      await refreshNotifications();
    }, refreshInterval);
  }, [refreshInterval, refreshNotifications]);

  const stopAutoRefresh = useCallback(() => {
    if (refreshIntervalRef.current) {
      console.log('⏰ Stopping auto refresh');
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  }, []);

  // ===== EFFECTS =====

  // Initial fetch on mount or userId change
  useEffect(() => {
    console.log('🔄 Initial effect, userId:', userId);
    
    if (userId) {
      fetchNotifications();
      getUnreadCount();
      getStats();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [userId]); // Only depend on userId

  // Start/stop auto refresh based on autoRefresh option
  useEffect(() => {
    if (autoRefresh && userId) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    return () => {
      stopAutoRefresh();
    };
  }, [autoRefresh, userId, startAutoRefresh, stopAutoRefresh]);

  return {
    // States
    notifications,
    unreadCount,
    stats,
    isLoading,
    isRefreshing,
    error,
    hasMore,
    
    // Pagination
    currentPage,
    totalCount,
    
    // Methods
    fetchNotifications,
    refreshNotifications,
    loadMoreNotifications,
    
    // CRUD operations
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    
    // Utility
    getUnreadCount,
    getStats,
    clearError,
    
    // Navigation
    setNavigationHandler,
    
    // Auto refresh
    startAutoRefresh,
    stopAutoRefresh,
  };
};

// ===== UTILITY HOOKS =====

/**
 * Hook để xử lý navigation từ notifications
 */
// hooks/useNotification.ts - FIXED useNotificationNavigation

export const useNotificationNavigation = (navigation: any) => {
  const handleNotificationNavigation = useCallback((notification: NotificationResponse) => {
    console.log('🧭 Navigating from notification:', notification);
    
    try {
      switch (notification.notificationType) {
        case NotificationType.NEW_BOOKING:
        case NotificationType.BOOKING_STATUS_UPDATE:
          if (notification.motificationId) {
            navigation.navigate('BookingDetailScreen', { 
              bookingId: notification.motificationId 
            });
          }
          break;
          
        case NotificationType.NEW_MESSAGE:
          if (notification.motificationId) {
            navigation.navigate('ChatScreen', { 
              conversationId: notification.motificationId,
              title: 'Chat'
            });
          }
          break;
          
        case NotificationType.PAYMENT_UPDATE:
          if (notification.motificationId) {
            navigation.navigate('PaymentWaitingScreen', {
              payment: { 
                id: notification.motificationId,
                paymentId: notification.motificationId
              }
            });
          }
          break;
          
        case NotificationType.NEW_APPLICATION:
        case NotificationType.APPLICATION_RESPONSE:
          if (notification.motificationId) {
            navigation.navigate('EventDetailScreen', { 
              eventId: notification.motificationId.toString()
            });
          }
          break;
          
        case NotificationType.PHOTO_DELIVERY:
          if (notification.motificationId) {
            navigation.navigate('PhotoDeliveryScreen', { 
              bookingId: notification.motificationId,
              customerName: 'Customer'
            });
          }
          break;

        case NotificationType.WITHDRAWAL_UPDATE:
          navigation.navigate('WalletScreen');
          break;
          
        case NotificationType.SYSTEM_ANNOUNCEMENT:
        case NotificationType.EVENT_REMINDER:
        default:
          console.log('No specific navigation for notification type:', notification.notificationType);
          break;
      }
    } catch (error) {
      console.error('💥 Error navigating from notification:', error);
    }
  }, [navigation]);
  
  return handleNotificationNavigation;
};
/**
 * Hook để quản lý notification permissions và settings
 */
export const useNotificationSettings = () => {
  const [settings, setSettings] = useState({
    enabled: true,
    sound: true,
    vibration: true,
    types: Object.values(NotificationType).reduce((acc, type) => {
      acc[type] = true;
      return acc;
    }, {} as Record<NotificationType, boolean>)
  });

  const updateSetting = useCallback((key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const updateTypeSetting = useCallback((type: NotificationType, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      types: {
        ...prev.types,
        [type]: enabled
      }
    }));
  }, []);

  return {
    settings,
    updateSetting,
    updateTypeSetting
  };
};

/**
 * Hook để filter notifications
 */
export const useNotificationFilter = () => {
  const [filters, setFilters] = useState<NotificationQuery>({});

  const setTypeFilter = useCallback((type?: NotificationType) => {
    setFilters(prev => ({ ...prev, notificationType: type }));
  }, []);

  const setReadStatusFilter = useCallback((readStatus?: boolean) => {
    setFilters(prev => ({ ...prev, readStatus }));
  }, []);

  const setDateRangeFilter = useCallback((dateFrom?: string, dateTo?: string) => {
    setFilters(prev => ({ ...prev, dateFrom, dateTo }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  return {
    filters,
    setTypeFilter,
    setReadStatusFilter,
    setDateRangeFilter,
    clearFilters
  };
};

/**
 * Hook để manage notification badges/counters
 */
export const useNotificationBadge = (userId?: number) => {
  const [badgeCount, setBadgeCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  const updateBadgeCount = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await notificationService.getUnreadCount(userId);
      if (response.error === 0) {
        const count = response.data || 0;
        setBadgeCount(count);
        setIsVisible(count > 0);
      }
    } catch (error) {
      console.error('Error updating badge count:', error);
    }
  }, [userId]);

  const clearBadge = useCallback(() => {
    setBadgeCount(0);
    setIsVisible(false);
  }, []);

  const hideBadge = useCallback(() => {
    setIsVisible(false);
  }, []);

  const showBadge = useCallback(() => {
    setIsVisible(badgeCount > 0);
  }, [badgeCount]);

  // Auto update badge count periodically
  useEffect(() => {
    if (userId) {
      updateBadgeCount();
      
      const interval = setInterval(updateBadgeCount, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [userId, updateBadgeCount]);

  return {
    badgeCount,
    isVisible,
    updateBadgeCount,
    clearBadge,
    hideBadge,
    showBadge
  };
};

/**
 * Hook để handle notification actions (bulk operations)
 */
export const useNotificationActions = (userId?: number) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const markMultipleAsRead = useCallback(async (notificationIds: number[]): Promise<boolean> => {
    if (!userId || notificationIds.length === 0) return false;

    try {
      setIsProcessing(true);
      let successCount = 0;

      for (const id of notificationIds) {
        const response = await notificationService.markAsRead(id);
        if (response.error === 0) {
          successCount++;
        }
      }

      console.log(`✅ Marked ${successCount}/${notificationIds.length} notifications as read`);
      return successCount > 0;
    } catch (error) {
      console.error('Error marking multiple as read:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [userId]);

  const deleteMultiple = useCallback(async (notificationIds: number[]): Promise<boolean> => {
    if (!userId || notificationIds.length === 0) return false;

    try {
      setIsProcessing(true);
      let successCount = 0;

      for (const id of notificationIds) {
        const response = await notificationService.deleteNotification(id);
        if (response.error === 0) {
          successCount++;
        }
      }

      console.log(`✅ Deleted ${successCount}/${notificationIds.length} notifications`);
      return successCount > 0;
    } catch (error) {
      console.error('Error deleting multiple notifications:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [userId]);

  const archiveOldNotifications = useCallback(async (olderThanDays: number = 30): Promise<number> => {
    if (!userId) return 0;

    try {
      setIsProcessing(true);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const response = await notificationService.getUserNotifications(userId, {
        dateTo: cutoffDate.toISOString(),
        readStatus: true,
        pageSize: 1000
      });

      if (response.error !== 0 || !response.data) {
        return 0;
      }

      const oldNotifications = response.data.notifications;
      let archivedCount = 0;

      for (const notification of oldNotifications) {
        const deleteResponse = await notificationService.deleteNotification(Number(notification.motificationId));
        if (deleteResponse.error === 0) {
          archivedCount++;
        }
      }

      console.log(`🗄️ Archived ${archivedCount} old notifications`);
      return archivedCount;
    } catch (error) {
      console.error('Error archiving old notifications:', error);
      return 0;
    } finally {
      setIsProcessing(false);
    }
  }, [userId]);

  return {
    isProcessing,
    markMultipleAsRead,
    deleteMultiple,
    archiveOldNotifications
  };
};

/**
 * Hook để handle notification sound/vibration
 */
export const useNotificationSound = () => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const playNotificationSound = useCallback(async (notificationType: NotificationType) => {
    if (!soundEnabled) return;

    try {
      // Implement sound playing logic here
      // You can use different sounds for different notification types
      console.log('🔊 Playing notification sound for type:', notificationType);
      
      // Example implementation:
      // await Audio.Sound.createAsync({ uri: getSoundForType(notificationType) });
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [soundEnabled]);

  const triggerVibration = useCallback(async (pattern: 'short' | 'long' | 'double' = 'short') => {
    if (!vibrationEnabled) return;

    try {
      console.log('📳 Triggering vibration pattern:', pattern);
      
      // Example implementation:
      // await Haptics.impactAsync(
      //   pattern === 'long' ? Haptics.ImpactFeedbackStyle.Heavy :
      //   pattern === 'double' ? Haptics.ImpactFeedbackStyle.Medium :
      //   Haptics.ImpactFeedbackStyle.Light
      // );
    } catch (error) {
      console.error('Error triggering vibration:', error);
    }
  }, [vibrationEnabled]);

  return {
    soundEnabled,
    vibrationEnabled,
    setSoundEnabled,
    setVibrationEnabled,
    playNotificationSound,
    triggerVibration
  };
};

/**
 * Hook để search/filter notifications
 */
export const useNotificationSearch = (notifications: NotificationResponse[]) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<NotificationResponse[]>([]);

  const performSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults(notifications);
      return;
    }

    const lowercaseQuery = query.toLowerCase();
    const filtered = notifications.filter(notification => 
      notification.title.toLowerCase().includes(lowercaseQuery) ||
      notification.content.toLowerCase().includes(lowercaseQuery) ||
      notification.notificationType.toLowerCase().includes(lowercaseQuery)
    );

    setSearchResults(filtered);
  }, [notifications]);

  useEffect(() => {
    performSearch(searchQuery);
  }, [notifications, performSearch, searchQuery]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults(notifications);
  }, [notifications]);

  return {
    searchQuery,
    searchResults,
    performSearch,
    clearSearch,
    hasActiveSearch: searchQuery.trim().length > 0
  };
};