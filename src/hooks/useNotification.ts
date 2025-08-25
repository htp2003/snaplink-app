// hooks/useNotifications.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import {
  DeviceType,
  NotificationPermissionStatus,
  UseNotificationOptions,
  DeviceResponse,
  NotificationData,
  NotificationNavigationHandler,
  NotificationType,
  RegisterDeviceRequest,
  NotificationPriority
} from '../types/notification';
import { notificationService } from 'src/services/notificationService';



// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Main hook interface
export interface UseNotificationsReturn {
  // States
  expoPushToken: string | null;
  isRegistered: boolean;
  isLoading: boolean;
  permissionStatus: NotificationPermissionStatus | null;
  error: string | null;
  
  // Device info
  deviceInfo: DeviceResponse | null;
  
  // Methods
  requestPermissions: () => Promise<boolean>;
  registerDevice: (userId: number) => Promise<boolean>;
  unregisterDevice: () => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
  updateLastUsed: () => Promise<void>;
  
  // Navigation handler
  setNavigationHandler: (handler: NotificationNavigationHandler) => void;
  
  // Manual notification handling
  setupListeners: () => void;
  removeListeners: () => void;
}

export const useNotifications = (options: UseNotificationOptions = {}): UseNotificationsReturn => {
  const {
    userId,
    autoRegister = true,
    autoRefresh = true,
    refreshInterval = 24 * 60 * 60 * 1000, // 24 hours
  } = options;

  // States
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceResponse | null>(null);

  // Refs
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const navigationHandler = useRef<NotificationNavigationHandler | null>(null);
  const refreshInterval_Ref = useRef<NodeJS.Timeout | null>(null);

  // ===== PERMISSION MANAGEMENT =====

  const checkPermissionStatus = useCallback(async (): Promise<NotificationPermissionStatus> => {
    try {
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      const permissionStatus: NotificationPermissionStatus = {
        granted: status === 'granted',
        canAskAgain,
        status
      };
      setPermissionStatus(permissionStatus);
      return permissionStatus;
    } catch (error) {
      console.error('Error checking permission status:', error);
      const fallbackStatus: NotificationPermissionStatus = {
        granted: false,
        canAskAgain: true,
        status: 'undetermined'
      };
      setPermissionStatus(fallbackStatus);
      return fallbackStatus;
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);

      // Check if device supports push notifications
      if (!Device.isDevice) {
        setError('Push notifications only work on physical devices');
        return false;
      }

      // Setup notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      // Check current permission status
      const currentStatus = await checkPermissionStatus();
      
      if (currentStatus.granted) {
        return true;
      }

      if (!currentStatus.canAskAgain) {
        setError('Permission denied. Please enable notifications in settings.');
        return false;
      }

      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      const newStatus: NotificationPermissionStatus = {
        granted: status === 'granted',
        canAskAgain: status !== 'denied',
        status
      };
      
      setPermissionStatus(newStatus);
      
      if (!newStatus.granted) {
        setError('Notification permissions not granted');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      setError('Failed to request permissions');
      return false;
    }
  }, [checkPermissionStatus]);

  // ===== TOKEN MANAGEMENT =====

  const getExpoPushToken = useCallback(async (): Promise<string | null> => {
    try {
      if (!Device.isDevice) {
        throw new Error('Must use physical device for Push Notifications');
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        throw new Error('Project ID not found in expo config');
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      return tokenData.data;
    } catch (error) {
      console.error('Error getting Expo push token:', error);
      setError(`Failed to get push token: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        return false;
      }

      const token = await getExpoPushToken();
      if (!token) {
        return false;
      }

      setExpoPushToken(token);
      return true;
    } catch (error) {
      console.error('Error refreshing token:', error);
      setError('Failed to refresh token');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [requestPermissions, getExpoPushToken]);

  // ===== DEVICE REGISTRATION =====

  const registerDevice = useCallback(async (targetUserId: number): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Ensure we have permissions and token
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        return false;
      }

      const token = expoPushToken || await getExpoPushToken();
      if (!token) {
        setError('No push token available');
        return false;
      }

      // Prepare device registration data
      const deviceData: RegisterDeviceRequest = {
        userId: targetUserId,
        expoPushToken: token,
        deviceType: Platform.OS as DeviceType,
        deviceId: Constants.deviceId || `${Platform.OS}-${Date.now()}`,
        deviceName: Constants.deviceName || `${Platform.OS} Device`,
        appVersion: Constants.expoConfig?.version || '1.0.0',
        osVersion: Platform.Version?.toString() || 'Unknown',
      };

      // Register with backend
      const response = await notificationService.registerDevice(deviceData);
      
      if (response.error === 0 && response.data) {
        setDeviceInfo(response.data);
        setIsRegistered(true);
        setExpoPushToken(token);
        
        // Start auto refresh if enabled
        if (autoRefresh) {
          startAutoRefresh();
        }
        
        return true;
      } else {
        setError(response.message || 'Failed to register device');
        return false;
      }
    } catch (error) {
      console.error('Error registering device:', error);
      setError('Failed to register device');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [expoPushToken, getExpoPushToken, requestPermissions, autoRefresh]);

  const unregisterDevice = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      if (!expoPushToken) {
        setError('No token to unregister');
        return false;
      }

      await notificationService.deleteDeviceByToken(expoPushToken);
      
      // Clear local state
      setIsRegistered(false);
      setDeviceInfo(null);
      setExpoPushToken(null);
      
      // Stop auto refresh
      stopAutoRefresh();
      
      return true;
    } catch (error) {
      console.error('Error unregistering device:', error);
      setError('Failed to unregister device');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [expoPushToken]);

  // ===== AUTO REFRESH =====

  const startAutoRefresh = useCallback(() => {
    stopAutoRefresh(); // Clear existing interval
    
    refreshInterval_Ref.current = setInterval(async () => {
      if (expoPushToken) {
        await notificationService.updateLastUsed(expoPushToken);
      }
    }, refreshInterval);
  }, [expoPushToken, refreshInterval]);

  const stopAutoRefresh = useCallback(() => {
    if (refreshInterval_Ref.current) {
      clearInterval(refreshInterval_Ref.current);
      refreshInterval_Ref.current = null;
    }
  }, []);

  const updateLastUsed = useCallback(async (): Promise<void> => {
    if (expoPushToken) {
      try {
        await notificationService.updateLastUsed(expoPushToken);
      } catch (error) {
        console.error('Failed to update last used:', error);
      }
    }
  }, [expoPushToken]);

  // ===== NOTIFICATION LISTENERS =====

  const handleNotificationReceived = useCallback((notification: Notifications.Notification) => {
    console.log('📱 Notification received in foreground:', notification);
    
    // Update last used when receiving notification
    updateLastUsed();
    
    // You can add custom logic here for foreground notifications
    // For example, show in-app notification banner
  }, [updateLastUsed]);

  const handleNotificationResponse = useCallback((response: Notifications.NotificationResponse) => {
    console.log('👆 Notification tapped:', response);
    
    const notificationData = response.notification.request.content.data as NotificationData;
    
    // Call navigation handler if set
    if (navigationHandler.current && notificationData) {
      navigationHandler.current(notificationData);
    }
    
    // Update last used when user interacts with notification
    updateLastUsed();
  }, [updateLastUsed]);

  const setupListeners = useCallback(() => {
    // Remove existing listeners first
    removeListeners();
    
    // Setup new listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(handleNotificationReceived);
    responseListener.current = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
  }, [handleNotificationReceived, handleNotificationResponse]);

  const removeListeners = useCallback(() => {
    if (notificationListener.current) {
      Notifications.removeNotificationSubscription(notificationListener.current);
      notificationListener.current = null;
    }
    
    if (responseListener.current) {
      Notifications.removeNotificationSubscription(responseListener.current);
      responseListener.current = null;
    }
  }, []);

  // ===== NAVIGATION HANDLER =====

  const setNavigationHandler = useCallback((handler: NotificationNavigationHandler) => {
    navigationHandler.current = handler;
  }, []);

  // ===== EFFECTS =====

  // Auto setup on mount
  useEffect(() => {
    const initialize = async () => {
      // Check initial permission status
      await checkPermissionStatus();
      
      // Auto register if userId provided and autoRegister enabled
      if (userId && autoRegister) {
        const success = await refreshToken();
        if (success) {
          await registerDevice(userId);
        }
      }
      
      // Setup listeners
      setupListeners();
    };

    initialize();

    // Cleanup on unmount
    return () => {
      removeListeners();
      stopAutoRefresh();
    };
  }, [userId, autoRegister]); // Only depend on initial props

  // Update last used when app becomes active
  useEffect(() => {
    updateLastUsed();
  }, [updateLastUsed]);

  return {
    // States
    expoPushToken,
    isRegistered,
    isLoading,
    permissionStatus,
    error,
    deviceInfo,
    
    // Methods
    requestPermissions,
    registerDevice,
    unregisterDevice,
    refreshToken,
    updateLastUsed,
    
    // Navigation
    setNavigationHandler,
    
    // Listeners
    setupListeners,
    removeListeners,
  };
};

// ===== UTILITY HOOKS =====

/**
 * Hook để xử lý navigation từ notifications
 */
export const useNotificationNavigation = (navigation: any) => {
  const handleNotificationNavigation = useCallback((data: NotificationData) => {
    console.log('🧭 Navigating from notification:', data);
    
    try {
      switch (data.screen) {
        case 'BookingDetailScreen':
          if (data.bookingId) {
            navigation.navigate('BookingDetailScreen', { 
              bookingId: parseInt(data.bookingId) 
            });
          }
          break;
          
        case 'ChatScreen':
          if (data.conversationId) {
            navigation.navigate('ChatScreen', { 
              conversationId: parseInt(data.conversationId),
              title: 'Chat'
            });
          }
          break;
          
        case 'PaymentWaitingScreen':
          if (data.paymentId) {
            navigation.navigate('PaymentWaitingScreen', {
              payment: { 
                id: parseInt(data.paymentId),
                paymentId: parseInt(data.paymentId)
              }
            });
          }
          break;
          
        case 'EventDetailScreen':
          if (data.eventId) {
            navigation.navigate('EventDetailScreen', { 
              eventId: data.eventId 
            });
          }
          break;
          
        case 'PhotoDeliveryScreen':
          if (data.bookingId) {
            navigation.navigate('PhotoDeliveryScreen', { 
              bookingId: parseInt(data.bookingId),
              customerName: 'Customer'
            });
          }
          break;
          
        default:
          console.log('Unknown notification screen:', data.screen);
          break;
      }
    } catch (error) {
      console.error('Error navigating from notification:', error);
    }
  }, [navigation]);
  
  return handleNotificationNavigation;
};

/**
 * Hook để lấy permission status
 */
export const useNotificationPermissions = () => {
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus | null>(null);
  
  const checkStatus = useCallback(async () => {
    try {
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      const newStatus: NotificationPermissionStatus = {
        granted: status === 'granted',
        canAskAgain,
        status
      };
      setPermissionStatus(newStatus);
      return newStatus;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return null;
    }
  }, []);
  
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);
  
  return {
    permissionStatus,
    checkStatus
  };
};