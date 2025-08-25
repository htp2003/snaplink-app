// context/NotificationProvider.tsx - Context Provider cho Notification System (FIXED)

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../hooks/useAuth';
import { notificationService, autoNotificationHelper } from '../services/notificationService';
import { 
  NotificationResponse, 
  NotificationStats,
  NotificationType,
  UseNotificationOptions 
} from '../types/notification';
import { useNotifications } from '../hooks/useNotification';

// Context interface
interface NotificationContextType {
  // States
  notifications: NotificationResponse[];
  unreadCount: number;
  stats: NotificationStats | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  hasMore: boolean;
  
  // Methods
  fetchNotifications: (refresh?: boolean) => Promise<boolean>;
  refreshNotifications: () => Promise<boolean>;
  markAsRead: (id: number) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (id: number) => Promise<boolean>;
  deleteReadNotifications: () => Promise<boolean>;
  
  // Helper methods
  sendBookingNotification: (photographerId: number, customerName: string, bookingId: number) => Promise<boolean>;
  sendMessageNotification: (recipientId: number, senderName: string, messageContent: string, conversationId: number) => Promise<boolean>;
  sendPaymentNotification: (userId: number, amount: number, paymentId: number, success: boolean) => Promise<boolean>;
  
  // Settings
  isNotificationEnabled: boolean;
  setNotificationEnabled: (enabled: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Provider Props
interface NotificationProviderProps {
  children: React.ReactNode;
  options?: UseNotificationOptions;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children, 
  options = {} 
}) => {
  const { user, isAuthenticated } = useAuth();
  const [isNotificationEnabled, setIsNotificationEnabled] = useState(true);
  
  // Use the main notification hook
  const notificationHook = useNotifications({
    userId: user?.id,
    autoRefresh: true,
    refreshInterval: 30000, // 30 seconds
    pageSize: 20,
    ...options
  });

  // Setup notification service auth token
  useEffect(() => {
    const setupNotificationAuth = async () => {
      try {
        if (isAuthenticated && user?.id) {
          const token = await AsyncStorage.getItem('token');
          if (token) {
            notificationService.setAuthToken(token);
            console.log('🔐 NotificationProvider: Auth token set for user', user.id);
          }
        } else {
          notificationService.clearAuthToken();
          console.log('🔐 NotificationProvider: Auth token cleared');
        }
      } catch (error) {
        console.error('❌ NotificationProvider: Failed to setup auth:', error);
      }
    };

    setupNotificationAuth();
  }, [isAuthenticated, user?.id]);

  // Load notification settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await AsyncStorage.getItem('notification_settings');
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          setIsNotificationEnabled(settings.enabled !== false);
        }
      } catch (error) {
        console.error('❌ Failed to load notification settings:', error);
      }
    };

    loadSettings();
  }, []);

  // Save notification settings
  const handleSetNotificationEnabled = useCallback(async (enabled: boolean) => {
    try {
      setIsNotificationEnabled(enabled);
      const settings = { enabled };
      await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));
      console.log('✅ Notification settings saved:', { enabled });
    } catch (error) {
      console.error('❌ Failed to save notification settings:', error);
    }
  }, []);

  // Helper methods using autoNotificationHelper
  const sendBookingNotification = useCallback(async (
    photographerId: number, 
    customerName: string, 
    bookingId: number
  ): Promise<boolean> => {
    if (!isNotificationEnabled) {
      console.log('🔕 Notifications disabled, skipping booking notification');
      return false;
    }

    try {
      console.log('📤 Sending booking notification:', { photographerId, customerName, bookingId });
      const success = await autoNotificationHelper.notifyNewBooking(photographerId, customerName, bookingId);
      
      if (success) {
        // Refresh notifications for the recipient
        await notificationHook.refreshNotifications();
        console.log('✅ Booking notification sent and refreshed');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Failed to send booking notification:', error);
      return false;
    }
  }, [isNotificationEnabled, notificationHook.refreshNotifications]);

  const sendMessageNotification = useCallback(async (
    recipientId: number, 
    senderName: string, 
    messageContent: string, 
    conversationId: number
  ): Promise<boolean> => {
    if (!isNotificationEnabled) {
      console.log('🔕 Notifications disabled, skipping message notification');
      return false;
    }

    try {
      console.log('📤 Sending message notification:', { recipientId, senderName, conversationId });
      const success = await autoNotificationHelper.notifyNewMessage(recipientId, senderName, messageContent, conversationId);
      
      if (success) {
        await notificationHook.refreshNotifications();
        console.log('✅ Message notification sent and refreshed');
      }
      
      return success;
    } catch (error) {
      console.error('❌ Failed to send message notification:', error);
      return false;
    }
  }, [isNotificationEnabled, notificationHook.refreshNotifications]);

  const sendPaymentNotification = useCallback(async (
    userId: number, 
    amount: number, 
    paymentId: number, 
    success: boolean
  ): Promise<boolean> => {
    if (!isNotificationEnabled) {
      console.log('🔕 Notifications disabled, skipping payment notification');
      return false;
    }

    try {
      console.log('📤 Sending payment notification:', { userId, amount, paymentId, success });
      const notificationSuccess = await autoNotificationHelper.notifyPaymentUpdate(userId, amount, paymentId, success);
      
      if (notificationSuccess) {
        await notificationHook.refreshNotifications();
        console.log('✅ Payment notification sent and refreshed');
      }
      
      return notificationSuccess;
    } catch (error) {
      console.error('❌ Failed to send payment notification:', error);
      return false;
    }
  }, [isNotificationEnabled, notificationHook.refreshNotifications]);

  // Fetch notifications with refresh option
  const fetchNotifications = useCallback(async (refresh: boolean = false): Promise<boolean> => {
    if (refresh) {
      return await notificationHook.refreshNotifications();
    } else {
      return await notificationHook.fetchNotifications();
    }
  }, [notificationHook.refreshNotifications, notificationHook.fetchNotifications]);

  // Context value - 🔥 FIXED: Thêm đầy đủ properties
  const contextValue: NotificationContextType = {
    // States from hook
    notifications: notificationHook.notifications,
    unreadCount: notificationHook.unreadCount,
    stats: notificationHook.stats, // ✅ ADDED
    isLoading: notificationHook.isLoading,
    isRefreshing: notificationHook.isRefreshing, 
    error: notificationHook.error,
    hasMore: notificationHook.hasMore, // ✅ ADDED
    
    // Methods from hook - 🔥 FIXED: Sử dụng wrapper methods
    fetchNotifications, // ✅ Use wrapper
    refreshNotifications: notificationHook.refreshNotifications, 
    markAsRead: notificationHook.markAsRead,
    markAllAsRead: notificationHook.markAllAsRead,    
    deleteNotification: notificationHook.deleteNotification,  
    deleteReadNotifications: notificationHook.deleteReadNotifications, // ✅ ADDED
    
    // Helper methods
    sendBookingNotification,
    sendMessageNotification,
    sendPaymentNotification,
    
    // Settings
    isNotificationEnabled,
    setNotificationEnabled: handleSetNotificationEnabled,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook to use notification context
export const useNotificationContext = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider');
  }
  return context;
};

// HOC for components that need notification access
export const withNotifications = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  return (props: P) => (
    <NotificationProvider>
      <Component {...props} />
    </NotificationProvider>
  );
};