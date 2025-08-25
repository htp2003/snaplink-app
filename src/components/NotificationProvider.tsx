// components/NotificationProvider.tsx - ✅ USING SINGLETON MANAGER

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../hooks/useNotification';

import { 
  NotificationType,
  type SystemNotificationData,
  type NotificationData 
} from '../types/notification';
import { notificationManager } from './NotificationManager';

interface NotificationProviderProps {
  children: React.ReactNode;
}

const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  
  // ✅ FIX: Use refs to track initialization state and prevent multiple calls
  const initializationAttempted = useRef(false);
  const currentUserId = useRef<number | null>(null);
  const isInitializing = useRef(false);
  
  const [initializationStatus, setInitializationStatus] = useState<'idle' | 'initializing' | 'success' | 'error'>('idle');
  const [initError, setInitError] = useState<string | null>(null);
  
  // ✅ FIX: Only create notification hook once with stable options
  const notificationOptions = useRef({
    userId: undefined as number | undefined,
    autoRegister: true,
    autoRefresh: true,
    refreshInterval: 60000,
  });

  // ✅ FIX: Update options only when needed
  if (user?.id !== currentUserId.current) {
    notificationOptions.current.userId = user?.id;
    currentUserId.current = user?.id || null;
  }

  const notification = useNotification(notificationOptions.current);

  // Debug log user state - ✅ OPTIMIZED: Only log when values actually change
  const prevUserData = useRef({ isAuthenticated: false, userId: null as number | null, authLoading: true });
  
  useEffect(() => {
    const currentUserData = {
      isAuthenticated,
      userId: user?.id || null,
      authLoading,
    };
    
    // Only log if something actually changed
    if (
      currentUserData.isAuthenticated !== prevUserData.current.isAuthenticated ||
      currentUserData.userId !== prevUserData.current.userId ||
      currentUserData.authLoading !== prevUserData.current.authLoading
    ) {
      console.log('🔔 NotificationProvider: Auth state changed', {
        isAuthenticated,
        userId: user?.id,
        authLoading,
        hasExpoPushToken: !!notification.expoPushToken,
        isNotificationInitialized: notification.isInitialized(),
      });
      
      prevUserData.current = currentUserData;
    }
  }, [isAuthenticated, user?.id, authLoading, notification.expoPushToken, notification.isInitialized]);

  // ✅ FIX: Use notification manager for initialization
  const initializeNotifications = useCallback(async () => {
    if (authLoading) {
      console.log('🔔 Auth still loading, waiting...');
      return;
    }

    if (!isAuthenticated || !user?.id) {
      console.log('🔔 User not authenticated, skipping notification init');
      setInitializationStatus('idle');
      return;
    }

    // Use singleton manager to prevent multiple initialization
    if (notificationManager.getIsInitializing()) {
      console.log('🔔 NotificationManager is already initializing');
      return;
    }

    try {
      setInitializationStatus('initializing');
      setInitError(null);
      
      console.log('🔔 Using NotificationManager for user:', user.id);
      
      // Use singleton manager
      const success = await notificationManager.initializeForUser(user.id);
      
      if (success) {
        // Now use the hook to actually register device
        const hookInitialized = await notification.initialize();
        
        if (hookInitialized) {
          const loginSuccess = await notification.loginUser(user.id, true);
          
          if (loginSuccess) {
            console.log('✅ Notification system fully initialized');
            setInitializationStatus('success');
          } else {
            setInitializationStatus('error');
            setInitError('Failed to register device');
          }
        } else {
          setInitializationStatus('error');
          setInitError('Failed to initialize notification hook');
        }
      } else {
        setInitializationStatus('error');
        setInitError('Failed to initialize notification manager');
      }
    } catch (error) {
      console.error('❌ Notification initialization error:', error);
      setInitializationStatus('error');
      setInitError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [isAuthenticated, user?.id, authLoading, notification]); // ✅ FIX: Stable dependencies

  // ✅ FIX: Initialize notifications - but only when conditions change meaningfully
  useEffect(() => {
    initializeNotifications();
  }, [initializeNotifications]);

  // ✅ FIX: Handle user logout - with better cleanup logic
  useEffect(() => {
    const handleLogout = async () => {
      if (!isAuthenticated && initializationStatus === 'success') {
        console.log('🔔 User logged out, cleaning up notifications...');
        
        try {
          await notification.logoutUser(true);
          setInitializationStatus('idle');
          setInitError(null);
          initializationAttempted.current = false;
          currentUserId.current = null;
          console.log('✅ Notification cleanup completed');
        } catch (error) {
          console.error('❌ Error during notification cleanup:', error);
        }
      }
    };

    handleLogout();
  }, [isAuthenticated, initializationStatus, notification]);

  // ✅ FIX: Memoized permission handler
  const handleRequestPermission = useCallback(() => {
    Alert.alert(
      'Bật thông báo',
      'Bạn có muốn nhận thông báo về booking, tin nhắn và cập nhật quan trọng không?',
      [
        { text: 'Để sau', style: 'cancel' },
        { 
          text: 'Bật thông báo', 
          onPress: async () => {
            const result = await notification.requestPermission();
            if (!result.granted) {
              Alert.alert(
                'Không thể bật thông báo',
                'Vui lòng vào Settings để bật thông báo cho SnapLink'
              );
            }
          }
        }
      ]
    );
  }, [notification]);

  // ✅ FIX: Memoized test notification handler
  const handleTestNotification = useCallback(() => {
    if (!__DEV__) return;

    Alert.alert(
      'Test Notification',
      'Chọn loại test notification:',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Local Test', 
          onPress: () => {
            const testData: SystemNotificationData = {
              screen: 'Home',
              type: NotificationType.SYSTEM_ANNOUNCEMENT
            };

            notification.scheduleLocalNotification(
              'Test Local Notification',
              'Đây là thông báo test local từ SnapLink!',
              testData
            );
          }
        },
        { 
          text: 'Server Test', 
          onPress: async () => {
            if (user?.id) {
              try {
                await notification.testNotification(
                  'Test Server Notification',
                  'Đây là thông báo test từ server!'
                );
                Alert.alert('Success', 'Test notification sent!');
              } catch (error) {
                Alert.alert('Error', 'Failed to send test notification');
                console.error('Test notification error:', error);
              }
            }
          }
        }
      ]
    );
  }, [notification, user?.id]);

  // ✅ FIX: Memoized debug info to prevent constant re-renders
  const debugInfo = useCallback(() => {
    if (!__DEV__) return null;

    return notification.getDebugInfo();
  }, [notification.expoPushToken, notification.currentDevice, notification.error, initializationStatus]);

  // ✅ FIX: Memoized debug render
  const renderDebugInfo = useCallback(() => {
    if (!__DEV__) return null;

    const debug = debugInfo();
    if (!debug) return null;
    
    return (
      <View style={styles.debugContainer}>
        <Text style={styles.debugTitle}>🔔 Notification Status</Text>
        <Text style={styles.debugText}>
          Status: {initializationStatus.toUpperCase()}
        </Text>
        <Text style={styles.debugText}>
          Permission: {notification.permissionStatus.granted ? 'GRANTED' : 'DENIED'}
        </Text>
        <Text style={styles.debugText}>
          Token: {notification.expoPushToken ? 'AVAILABLE' : 'NONE'}
        </Text>
        <Text style={styles.debugText}>
          Device: {notification.currentDevice ? 'REGISTERED' : 'NOT REGISTERED'}
        </Text>
        <Text style={styles.debugText}>
          User: {user?.id || 'NOT LOGGED IN'}
        </Text>
        <Text style={styles.debugText}>
          Initialized: {debug?.isInitialized ? 'YES' : 'NO'}
        </Text>
        <Text style={styles.debugText}>
          Can Send: {debug?.canSendNotifications ? 'YES' : 'NO'}
        </Text>
        {initError && (
          <Text style={styles.errorText}>
            Error: {initError}
          </Text>
        )}
        {notification.error && (
          <Text style={styles.errorText}>
            Hook Error: {notification.error}
          </Text>
        )}
      </View>
    );
  }, [debugInfo, initializationStatus, notification.permissionStatus.granted, notification.expoPushToken, notification.currentDevice, user?.id, initError, notification.error]);

  // ✅ FIX: Check conditions before showing banner
  const showPermissionBanner = notification.isInitialized() && 
    !notification.permissionStatus.granted && 
    !authLoading && 
    isAuthenticated;

  const showTestButton = __DEV__ && 
    notification.permissionStatus.granted && 
    !authLoading && 
    isAuthenticated;

  return (
    <View style={styles.container}>
      {children}
      
      {/* Permission Banner */}
      {showPermissionBanner && (
        <View style={styles.permissionBanner}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>🔔 Bật thông báo</Text>
            <Text style={styles.bannerText}>
              Nhận thông báo về booking mới và tin nhắn
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.enableButton}
            onPress={handleRequestPermission}
          >
            <Text style={styles.enableButtonText}>Bật</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Test Button for Development */}
      {showTestButton && (
        <TouchableOpacity 
          style={styles.testButton}
          onPress={handleTestNotification}
        >
          <Text style={styles.testButtonText}>📱 Test Notifications</Text>
        </TouchableOpacity>
      )}

      {/* Debug Info */}
      {renderDebugInfo()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 20, // Safe area
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bannerContent: {
    flex: 1,
  },
  bannerTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerText: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
  },
  enableButton: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  enableButtonText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  testButton: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  testButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugContainer: {
    position: 'absolute',
    top: 50,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 12,
    borderRadius: 8,
    maxWidth: 300,
    zIndex: 9999,
  },
  debugTitle: {
    color: '#ffd43b',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  debugText: {
    color: 'white',
    fontSize: 10,
    lineHeight: 14,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 9,
    marginTop: 4,
  },
});

export default NotificationProvider;