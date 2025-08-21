// hooks/useNotification.ts - COMPLETE PUSH NOTIFICATION HOOK

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Platform, AppState, AppStateStatus } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

import { notificationService } from '../services/notificationService';
import { DEFAULT_NOTIFICATION_SETTINGS, NotificationType } from '../types/notification';
import type {
  RegisterDeviceRequest,
  UpdateDeviceRequest,
  DeviceResponse,
  SendNotificationRequest,
  SendBulkNotificationRequest,
  NotificationSendResult,
  BulkNotificationResponse,
  TokenValidationResult,
  CleanupResult,
  NotificationData,
  NotificationSettings,
  NotificationPermissionStatus,
  UseNotificationOptions,
} from '../types/notification';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const useNotification = (options: UseNotificationOptions = {}) => {
  const { userId, autoRegister = true, autoRefresh = true, refreshInterval = 30000 } = options;
  
  const navigation = useNavigation();
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const appStateListener = useRef<any>(null);

  // ===== STATE MANAGEMENT =====
  
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [currentDevice, setCurrentDevice] = useState<DeviceResponse | null>(null);
  const [userDevices, setUserDevices] = useState<DeviceResponse[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>({
    granted: false,
    canAskAgain: true,
    status: 'undetermined',
  });
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  
  // Loading states
  const [isInitializing, setIsInitializing] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Debug state
  const [lastNotificationReceived, setLastNotificationReceived] = useState<any>(null);
  const [lastNotificationTapped, setLastNotificationTapped] = useState<any>(null);

  // ===== INITIALIZATION =====

  const initialize = useCallback(async (): Promise<boolean> => {
    if (isInitializing) return false;

    try {
      setIsInitializing(true);
      setError(null);
      
      console.log('🚀 Initializing notification system...');

      // Check if device supports notifications
      if (!Device.isDevice) {
        console.warn('⚠️ Push notifications not supported on simulator');
        setError('Push notifications only work on physical devices');
        return false;
      }

      // Set user ID in service
      if (userId) {
        notificationService.setUserId(userId);
      }

      // Request permission
      const permission = await requestPermission();
      if (!permission.granted) {
        console.warn('⚠️ Notification permission not granted');
        return false;
      }

      // Get Expo push token
      const token = await getExpoPushToken();
      if (!token) {
        console.error('❌ Failed to get Expo push token');
        setError('Failed to get push notification token');
        return false;
      }

      // Auto-register device if enabled and user ID available
      if (autoRegister && userId && token) {
        await registerCurrentDevice(token);
      }

      // Setup notification listeners
      setupNotificationListeners();

      // Setup app state listener for token refresh
      setupAppStateListener();

      console.log('✅ Notification system initialized successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize notifications';
      console.error('❌ Notification initialization failed:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [userId, autoRegister, isInitializing]);

  // ===== PERMISSION MANAGEMENT =====

  const requestPermission = useCallback(async (): Promise<NotificationPermissionStatus> => {
    try {
      console.log('🔐 Requesting notification permission...');

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
        });
      }

      // Check existing permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Request permission if not granted
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowDisplayInCarPlay: true,
            allowCriticalAlerts: false,
            provideAppNotificationSettings: true,
            allowProvisional: false,
          },
        });
        finalStatus = status;
      }

      const permissionResult: NotificationPermissionStatus = {
        granted: finalStatus === 'granted',
        canAskAgain: finalStatus !== 'denied',
        status: finalStatus as any,
      };

      setPermissionStatus(permissionResult);
      console.log('✅ Permission result:', permissionResult);

      return permissionResult;
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      const errorResult: NotificationPermissionStatus = {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
      setPermissionStatus(errorResult);
      return errorResult;
    }
  }, []);

  const checkPermission = useCallback(async (): Promise<NotificationPermissionStatus> => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      
      const result: NotificationPermissionStatus = {
        granted: status === 'granted',
        canAskAgain: status !== 'denied',
        status: status as any,
      };

      setPermissionStatus(result);
      return result;
    } catch (error) {
      console.error('❌ Error checking permission:', error);
      const errorResult: NotificationPermissionStatus = {
        granted: false,
        canAskAgain: false,
        status: 'denied',
      };
      setPermissionStatus(errorResult);
      return errorResult;
    }
  }, []);

  // ===== TOKEN MANAGEMENT =====

  const getExpoPushToken = useCallback(async (): Promise<string | null> => {
    try {
      console.log('🎯 Getting Expo push token...');

      if (!Device.isDevice) {
        console.warn('⚠️ Must use physical device for push notifications');
        return null;
      }

      // Check permission first
      const permission = await checkPermission();
      if (!permission.granted) {
        console.warn('⚠️ Notification permission not granted');
        return null;
      }

      // Get project ID
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      if (!projectId) {
        console.error('❌ Project ID not found in app config');
        setError('Missing Expo project ID configuration');
        return null;
      }

      // Get token
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      const token = tokenData.data;

      if (!token) {
        console.error('❌ Failed to get Expo push token');
        return null;
      }

      console.log('✅ Expo push token obtained:', token.substring(0, 30) + '...');
      setExpoPushToken(token);
      
      return token;
    } catch (error) {
      console.error('❌ Error getting Expo push token:', error);
      setError(error instanceof Error ? error.message : 'Failed to get push token');
      return null;
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      console.log('🔄 Refreshing Expo push token...');
      
      const newToken = await getExpoPushToken();
      
      if (newToken && newToken !== expoPushToken) {
        console.log('🔄 Token changed, updating device registration...');
        
        // Update device registration with new token
        if (currentDevice?.deviceId) {
          await updateDevice(currentDevice.deviceId, { expoPushToken: newToken });
        } else if (userId) {
          await registerCurrentDevice(newToken);
        }
      }
      
      return newToken;
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      return null;
    }
  }, [expoPushToken, currentDevice, userId]);

  // ===== DEVICE MANAGEMENT =====

  const registerDevice = useCallback(async (request: RegisterDeviceRequest): Promise<DeviceResponse | null> => {
    if (isRegistering) return null;

    try {
      setIsRegistering(true);
      setError(null);

      console.log('📱 Registering device...');
      const device = await notificationService.registerDevice(request);
      
      setCurrentDevice(device);
      setExpoPushToken(device.expoPushToken);
      
      console.log('✅ Device registered successfully:', device.deviceId);
      return device;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to register device';
      console.error('❌ Device registration failed:', error);
      setError(errorMessage);
      return null;
    } finally {
      setIsRegistering(false);
    }
  }, [isRegistering]);

  const registerCurrentDevice = useCallback(async (token?: string): Promise<DeviceResponse | null> => {
    const targetUserId = userId || notificationService.getCurrentUserId();
    const targetToken = token || expoPushToken;

    if (!targetUserId) {
      setError('No user ID available for device registration');
      return null;
    }

    if (!targetToken) {
      console.warn('⚠️ No token available, getting new token...');
      const newToken = await getExpoPushToken();
      if (!newToken) return null;
      return await registerCurrentDevice(newToken);
    }

    try {
      const device = await notificationService.registerCurrentDevice(targetToken, targetUserId);
      setCurrentDevice(device);
      return device;
    } catch (error) {
      console.error('❌ Error registering current device:', error);
      setError(error instanceof Error ? error.message : 'Failed to register device');
      return null;
    }
  }, [userId, expoPushToken, getExpoPushToken]);

  const updateDevice = useCallback(async (deviceId: number, request: UpdateDeviceRequest): Promise<DeviceResponse | null> => {
    try {
      console.log('📱 Updating device:', deviceId);
      
      const device = await notificationService.updateDevice(deviceId, request);
      
      // Update current device if it's the same
      if (currentDevice?.deviceId === deviceId) {
        setCurrentDevice(device);
      }
      
      // Update token if changed
      if (request.expoPushToken) {
        setExpoPushToken(request.expoPushToken);
      }
      
      console.log('✅ Device updated successfully');
      return device;
    } catch (error) {
      console.error('❌ Error updating device:', error);
      setError(error instanceof Error ? error.message : 'Failed to update device');
      return null;
    }
  }, [currentDevice]);

  const removeDevice = useCallback(async (deviceId: number): Promise<boolean> => {
    try {
      console.log('🗑️ Removing device:', deviceId);
      
      await notificationService.removeDevice(deviceId);
      
      // Clear current device if it's the same
      if (currentDevice?.deviceId === deviceId) {
        setCurrentDevice(null);
        setExpoPushToken(null);
      }
      
      console.log('✅ Device removed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error removing device:', error);
      setError(error instanceof Error ? error.message : 'Failed to remove device');
      return false;
    }
  }, [currentDevice]);

  const unregisterCurrentDevice = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🗑️ Unregistering current device...');
      
      await notificationService.unregisterCurrentDevice();
      
      setCurrentDevice(null);
      setExpoPushToken(null);
      
      console.log('✅ Current device unregistered successfully');
      return true;
    } catch (error) {
      console.error('❌ Error unregistering current device:', error);
      setError(error instanceof Error ? error.message : 'Failed to unregister device');
      return false;
    }
  }, []);

  const getUserDevices = useCallback(async (targetUserId?: number): Promise<DeviceResponse[]> => {
    try {
      const searchUserId = targetUserId || userId || notificationService.getCurrentUserId();
      
      if (!searchUserId) {
        setError('No user ID available to fetch devices');
        return [];
      }

      console.log('📱 Getting devices for user:', searchUserId);
      
      const devices = await notificationService.getUserDevices(searchUserId);
      setUserDevices(devices);
      
      console.log('✅ Found devices:', devices.length);
      return devices;
    } catch (error) {
      console.error('❌ Error getting user devices:', error);
      setError(error instanceof Error ? error.message : 'Failed to get devices');
      return [];
    }
  }, [userId]);

  // ===== NOTIFICATION SENDING =====

  const sendNotification = useCallback(async (request: SendNotificationRequest): Promise<NotificationSendResult[]> => {
    if (isSending) return [];

    try {
      setIsSending(true);
      setError(null);

      console.log('📤 Sending notification...');
      const results = await notificationService.sendNotification(request);
      
      console.log('✅ Notification sent successfully');
      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send notification';
      console.error('❌ Error sending notification:', error);
      setError(errorMessage);
      return [];
    } finally {
      setIsSending(false);
    }
  }, [isSending]);

  const sendBulkNotification = useCallback(async (request: SendBulkNotificationRequest): Promise<BulkNotificationResponse | null> => {
    if (isSending) return null;

    try {
      setIsSending(true);
      setError(null);

      console.log('📤 Sending bulk notification to', request.userIds.length, 'users...');
      const result = await notificationService.sendBulkNotification(request);
      
      console.log('✅ Bulk notification sent successfully');
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send bulk notification';
      console.error('❌ Error sending bulk notification:', error);
      setError(errorMessage);
      return null;
    } finally {
      setIsSending(false);
    }
  }, [isSending]);

  // ===== CONVENIENCE NOTIFICATION METHODS =====

  const sendBookingNotification = useCallback(async (
    targetUserId: number,
    type: 'new' | 'confirmed' | 'completed' | 'cancelled',
    bookingId: string,
    customerName?: string
  ): Promise<NotificationSendResult[]> => {
    try {
      return await notificationService.sendBookingNotification(targetUserId, type, bookingId, customerName);
    } catch (error) {
      console.error('❌ Error sending booking notification:', error);
      setError(error instanceof Error ? error.message : 'Failed to send booking notification');
      return [];
    }
  }, []);

  const sendMessageNotification = useCallback(async (
    targetUserId: number,
    senderName: string,
    messageContent: string,
    conversationId: string
  ): Promise<NotificationSendResult[]> => {
    try {
      return await notificationService.sendMessageNotification(targetUserId, senderName, messageContent, conversationId);
    } catch (error) {
      console.error('❌ Error sending message notification:', error);
      setError(error instanceof Error ? error.message : 'Failed to send message notification');
      return [];
    }
  }, []);

  const sendPaymentNotification = useCallback(async (
    targetUserId: number,
    type: 'success' | 'failed',
    paymentId: string,
    amount?: number
  ): Promise<NotificationSendResult[]> => {
    try {
      return await notificationService.sendPaymentNotification(targetUserId, type, paymentId, amount);
    } catch (error) {
      console.error('❌ Error sending payment notification:', error);
      setError(error instanceof Error ? error.message : 'Failed to send payment notification');
      return [];
    }
  }, []);

  // ===== NOTIFICATION LISTENERS =====

  const setupNotificationListeners = useCallback(() => {
    console.log('🔊 Setting up notification listeners...');

    // Listen for notifications received while app is running
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('🔔 Foreground notification received:', notification);
      setLastNotificationReceived(notification);
      
      // Update last used timestamp
      if (expoPushToken) {
        notificationService.updateLastUsed(expoPushToken).catch(console.warn);
      }
      
      // Custom foreground handling can be added here
      handleForegroundNotification(notification);
    });

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 Notification tapped:', response);
      setLastNotificationTapped(response);
      
      // Handle navigation
      handleNotificationNavigation(response.notification);
    });

    console.log('✅ Notification listeners set up successfully');
  }, [expoPushToken]);

  const cleanupNotificationListeners = useCallback(() => {
    console.log('🧹 Cleaning up notification listeners...');
    
    if (notificationListener.current) {
      Notifications.removeNotificationSubscription(notificationListener.current);
      notificationListener.current = null;
    }
    
    if (responseListener.current) {
      Notifications.removeNotificationSubscription(responseListener.current);
      responseListener.current = null;
    }
    
    console.log('✅ Notification listeners cleaned up');
  }, []);

  // ===== NOTIFICATION HANDLING =====

  const handleForegroundNotification = useCallback((notification: Notifications.Notification) => {
    const data = notification.request.content.data as NotificationData;
    
    console.log('🔔 Handling foreground notification:', {
      title: notification.request.content.title,
      body: notification.request.content.body,
      type: data?.type,
      screen: data?.screen,
    });

    // Here you can add custom logic for foreground notifications
    // For example: show in-app banner, update UI state, etc.
    
    // Example: Auto-dismiss system announcements after 5 seconds
    if (data?.type === NotificationType.SYSTEM_ANNOUNCEMENT) {
      setTimeout(() => {
        console.log('🔕 Auto-dismissing system announcement');
      }, 5000);
    }
  }, []);

  const handleNotificationNavigation = useCallback((notification: Notifications.Notification) => {
    const data = notification.request.content.data as NotificationData;
    
    console.log('🧭 Handling notification navigation:', {
      screen: data?.screen,
      type: data?.type,
      additionalData: data,
    });

    try {
      if (!data?.screen) {
        console.log('📱 No screen specified, navigating to Notifications');
        navigation.navigate('Notifications' as never);
        return;
      }

      // switch (data.screen) {
      //   case 'BookingDetail':
      //     if (data.bookingId) {
      //       navigation.navigate('BookingDetailScreen' as never, { 
      //         bookingId: parseInt(data.bookingId) 
      //       } as never);
      //     } else {
      //       // Navigate to appropriate tab based on user role
      //       navigation.navigate('CustomerMain' as never, { 
      //         screen: 'Booking' 
      //       } as never);
      //     }
      //     break;

      //   case 'ChatScreen':
      //     if (data.conversationId) {
      //       navigation.navigate('ChatScreen' as never, { 
      //         conversationId: parseInt(data.conversationId),
      //         title: 'Conversation'
      //       } as never);
      //     } else {
      //       // Navigate to Messages tab
      //       navigation.navigate('CustomerMain' as never, { 
      //         screen: 'Messages' 
      //       } as never);
      //     }
      //     break;

      //   case 'PaymentDetail':
      //     if (data.paymentId) {
      //       // Navigate to PaymentWaitingScreen with payment data
      //       navigation.navigate('PaymentWaitingScreen' as never, {
      //         payment: {
      //           id: parseInt(data.paymentId),
      //           paymentId: parseInt(data.paymentId),
      //           // Add minimal required payment data
      //         }
      //       } as never);
      //     } else {
      //       // Navigate to wallet/payment section
      //       navigation.navigate('WalletScreen' as never);
      //     }
      //     break;

      //   case 'EventDetail':
      //     if (data.eventId) {
      //       navigation.navigate('EventDetailScreen' as never, { 
      //         eventId: data.eventId 
      //       } as never);
      //     } else {
      //       // Navigate to events tab
      //       navigation.navigate('VenueOwnerMain' as never, { 
      //         screen: 'VenueOwnerEvents' 
      //       } as never);
      //     }
      //     break;

      //   case 'EventApplications':
      //     if (data.eventId) {
      //       navigation.navigate('VenueOwnerEventApplications' as never, { 
      //         eventId: parseInt(data.eventId),
      //         eventName: 'Event Applications'
      //       } as never);
      //     } else {
      //       navigation.navigate('VenueOwnerMain' as never, { 
      //         screen: 'VenueOwnerEvents' 
      //       } as never);
      //     }
      //     break;

      //   case 'Profile':
      //     if (data.userId) {
      //       navigation.navigate('ViewProfileUserScreen' as never, { 
      //         userId: parseInt(data.userId) 
      //       } as never);
      //     } else {
      //       // Navigate to profile tab based on user role
      //       navigation.navigate('CustomerMain' as never, { 
      //         screen: 'Profile' 
      //       } as never);
      //     }
      //     break;

      //   case 'PhotoDelivery':
      //     if (data.bookingId) {
      //       navigation.navigate('PhotoDeliveryScreen' as never, {
      //         bookingId: parseInt(data.bookingId),
      //         customerName: data.customerName || 'Customer'
      //       } as never);
      //     } else {
      //       navigation.navigate('PhotographerMain' as never, { 
      //         screen: 'OrderManagementScreen' 
      //       } as never);
      //     }
      //     break;

      //   case 'Notifications':
      //     // Navigate to home since there's no dedicated notifications screen
      //     navigation.navigate('CustomerMain' as never, { 
      //       screen: 'CustomerHomeScreen' 
      //     } as never);
      //     break;

      //   case 'Home':
      //     // Navigate to appropriate home screen
      //     navigation.navigate('CustomerMain' as never, { 
      //       screen: 'CustomerHomeScreen' 
      //     } as never);
      //     break;

      //   default:
      //     console.log('📱 Unknown screen, navigating to Home');
      //     navigation.navigate('CustomerMain' as never, { 
      //       screen: 'CustomerHomeScreen' 
      //     } as never);
      //     break;
      // }
    } catch (error) {
      console.error('❌ Error navigating from notification:', error);
      // Fallback to notifications screen
      try {
        navigation.navigate('Notifications' as never);
      } catch (fallbackError) {
        console.error('❌ Fallback navigation also failed:', fallbackError);
      }
    }
  }, [navigation]);

  // ===== APP STATE MANAGEMENT =====

  const setupAppStateListener = useCallback(() => {
    console.log('📱 Setting up app state listener...');
    
    appStateListener.current = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      console.log('📱 App state changed to:', nextAppState);
      
      if (nextAppState === 'active') {
        // App came to foreground - refresh token if needed
        if (autoRefresh && expoPushToken) {
          refreshToken().catch(console.warn);
        }
        
        // Update last used timestamp
        if (expoPushToken) {
          notificationService.updateLastUsed(expoPushToken).catch(console.warn);
        }
      }
    });
    
    console.log('✅ App state listener set up');
  }, [autoRefresh, expoPushToken, refreshToken]);

  const cleanupAppStateListener = useCallback(() => {
    console.log('🧹 Cleaning up app state listener...');
    
    if (appStateListener.current) {
      appStateListener.current.remove();
      appStateListener.current = null;
    }
    
    console.log('✅ App state listener cleaned up');
  }, []);

  // ===== UTILITY METHODS =====

  const validateToken = useCallback(async (token?: string): Promise<TokenValidationResult> => {
    const targetToken = token || expoPushToken;
    
    if (!targetToken) {
      return {
        isValid: false,
        message: 'No token available to validate'
      };
    }

    try {
      return await notificationService.validateToken(targetToken);
    } catch (error) {
      console.error('❌ Error validating token:', error);
      return {
        isValid: false,
        message: error instanceof Error ? error.message : 'Token validation failed'
      };
    }
  }, [expoPushToken]);

  const cleanupTokens = useCallback(async (): Promise<CleanupResult | null> => {
    try {
      return await notificationService.cleanupTokens();
    } catch (error) {
      console.error('❌ Error cleaning up tokens:', error);
      setError(error instanceof Error ? error.message : 'Failed to cleanup tokens');
      return null;
    }
  }, []);

  const testNotification = useCallback(async (
    title?: string,
    body?: string
  ): Promise<NotificationSendResult[] | null> => {
    try {
      return await notificationService.testNotification(title, body);
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      setError(error instanceof Error ? error.message : 'Failed to send test notification');
      return null;
    }
  }, []);

  const scheduleLocalNotification = useCallback(async (
    title: string,
    body: string,
    data?: NotificationData,
    delay: number = 1
  ): Promise<string | null> => {
    try {
      console.log('📅 Scheduling local notification...');
      
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: delay,
        },
      });
      
      console.log('✅ Local notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('❌ Error scheduling local notification:', error);
      setError(error instanceof Error ? error.message : 'Failed to schedule notification');
      return null;
    }
  }, []);

  const cancelAllLocalNotifications = useCallback(async (): Promise<void> => {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('✅ All local notifications cancelled');
    } catch (error) {
      console.error('❌ Error cancelling local notifications:', error);
    }
  }, []);

  // ===== USER SESSION MANAGEMENT =====

  const loginUser = useCallback(async (newUserId: number, autoRegisterDevice: boolean = true): Promise<boolean> => {
    try {
      console.log('👤 User logging in:', newUserId);
      
      // Set user ID in service
      notificationService.setUserId(newUserId);
      
      // Auto-register device if enabled and token available
      if (autoRegisterDevice && expoPushToken) {
        const device = await registerCurrentDevice(expoPushToken);
        if (!device) {
          console.warn('⚠️ Failed to register device for new user');
          return false;
        }
      }
      
      // Refresh user devices
      await getUserDevices(newUserId);
      
      console.log('✅ User login completed successfully');
      return true;
    } catch (error) {
      console.error('❌ Error during user login:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete user login');
      return false;
    }
  }, [expoPushToken, registerCurrentDevice, getUserDevices]);

  const logoutUser = useCallback(async (unregisterDevice: boolean = true): Promise<void> => {
    try {
      console.log('👤 User logging out...');
      
      // Unregister current device if requested
      if (unregisterDevice && currentDevice) {
        await unregisterCurrentDevice();
      }
      
      // Clear service state
      notificationService.clearUserId();
      
      // Clear hook state
      setCurrentDevice(null);
      setUserDevices([]);
      setError(null);
      
      console.log('✅ User logout completed successfully');
    } catch (error) {
      console.error('❌ Error during user logout:', error);
      // Don't set error for logout - it's not critical
    }
  }, [currentDevice, unregisterCurrentDevice]);

  // ===== AUTO REFRESH EFFECT =====

  useEffect(() => {
    if (!autoRefresh || !expoPushToken || !currentDevice) {
      return;
    }

    console.log('🔄 Setting up auto refresh...');
    
    const interval = setInterval(async () => {
      try {
        setIsRefreshing(true);
        
        // Refresh token
        await refreshToken();
        
        // Refresh user devices
        if (userId) {
          await getUserDevices(userId);
        }
        
        console.log('🔄 Auto refresh completed');
      } catch (error) {
        console.warn('⚠️ Auto refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }, refreshInterval);

    return () => {
      console.log('🔄 Clearing auto refresh interval');
      clearInterval(interval);
    };
  }, [autoRefresh, expoPushToken, currentDevice, userId, refreshInterval, refreshToken, getUserDevices]);

  // ===== INITIALIZATION EFFECT =====

  useEffect(() => {
    if (userId && autoRegister) {
      initialize();
    }
  }, [userId, autoRegister, initialize]);

  // ===== CLEANUP EFFECT =====

  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up notification hook...');
      cleanupNotificationListeners();
      cleanupAppStateListener();
    };
  }, [cleanupNotificationListeners, cleanupAppStateListener]);

  // ===== STATUS GETTERS =====

  const isInitialized = useCallback((): boolean => {
    return !!(expoPushToken && permissionStatus.granted);
  }, [expoPushToken, permissionStatus.granted]);

  const isDeviceRegistered = useCallback((): boolean => {
    return !!(currentDevice && currentDevice.isActive);
  }, [currentDevice]);

  const canSendNotifications = useCallback((): boolean => {
    return !!(permissionStatus.granted && expoPushToken && notificationService.getCurrentUserId());
  }, [permissionStatus.granted, expoPushToken]);

  const getDebugInfo = useCallback(() => {
    return {
      // Hook state
      isInitialized: isInitialized(),
      isDeviceRegistered: isDeviceRegistered(),
      canSendNotifications: canSendNotifications(),
      hasToken: !!expoPushToken,
      hasCurrentDevice: !!currentDevice,
      permissionGranted: permissionStatus.granted,
      deviceCount: userDevices.length,
      
      // Service state
      ...notificationService.getDebugInfo(),
      
      // Last notifications
      lastReceived: lastNotificationReceived,
      lastTapped: lastNotificationTapped,
      
      // Loading states
      isInitializing,
      isRegistering,
      isSending,
      isRefreshing,
      
      // Error state
      error,
      
      // Configuration
      autoRegister,
      autoRefresh,
      refreshInterval,
    };
  }, [
    isInitialized, isDeviceRegistered, canSendNotifications, expoPushToken, currentDevice,
    permissionStatus.granted, userDevices.length, lastNotificationReceived, lastNotificationTapped,
    isInitializing, isRegistering, isSending, isRefreshing, error,
    autoRegister, autoRefresh, refreshInterval
  ]);

  // ===== RETURN HOOK API =====

  return {
    // ===== CORE STATE =====
    expoPushToken,
    currentDevice,
    userDevices,
    permissionStatus,
    notificationSettings,
    
    // ===== LOADING STATES =====
    isInitializing,
    isRegistering,
    isSending,
    isRefreshing,
    error,
    
    // ===== INITIALIZATION =====
    initialize,
    
    // ===== PERMISSION MANAGEMENT =====
    requestPermission,
    checkPermission,
    
    // ===== TOKEN MANAGEMENT =====
    getExpoPushToken,
    refreshToken,
    
    // ===== DEVICE MANAGEMENT =====
    registerDevice,
    registerCurrentDevice,
    updateDevice,
    removeDevice,
    unregisterCurrentDevice,
    getUserDevices,
    
    // ===== NOTIFICATION SENDING =====
    sendNotification,
    sendBulkNotification,
    sendBookingNotification,
    sendMessageNotification,
    sendPaymentNotification,
    
    // ===== UTILITY METHODS =====
    validateToken,
    cleanupTokens,
    testNotification,
    scheduleLocalNotification,
    cancelAllLocalNotifications,
    
    // ===== USER SESSION =====
    loginUser,
    logoutUser,
    
    // ===== STATUS GETTERS =====
    isInitialized,
    isDeviceRegistered,
    canSendNotifications,
    
    // ===== DEBUG =====
    getDebugInfo,
    lastNotificationReceived,
    lastNotificationTapped,
    
    // ===== NAVIGATION HANDLER =====
    handleNotificationNavigation,
    
    // ===== SETTINGS =====
    setNotificationSettings,
    
    // ===== MANUAL CONTROLS =====
    setError,
    clearError: () => setError(null),
  };
};