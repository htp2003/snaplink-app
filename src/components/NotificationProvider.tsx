// components/NotificationProvider.tsx - Fixed with correct imports

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../hooks/useNotification';
import { 
  NotificationType,
  type SystemNotificationData,
  type NotificationData 
} from '../types/notification';

interface NotificationProviderProps {
  children: React.ReactNode;
}

const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [initializationStatus, setInitializationStatus] = useState<'idle' | 'initializing' | 'success' | 'error'>('idle');
  const [initError, setInitError] = useState<string | null>(null);
  
  // 🔥 Use notification hook with proper types
  const notification = useNotification({
    userId: user?.id || undefined,
    autoRegister: true,
    autoRefresh: true,
    refreshInterval: 60000, // 1 minute
  });

  // Debug log user state
  useEffect(() => {
    console.log('🔔 NotificationProvider: Auth state changed', {
      isAuthenticated,
      userId: user?.id,
      authLoading,
      hasExpoPushToken: !!notification.expoPushToken,
      isNotificationInitialized: notification.isInitialized(),
    });
  }, [isAuthenticated, user?.id, authLoading, notification.expoPushToken]);

  // Initialize notification system when user logs in
  useEffect(() => {
    const initializeNotifications = async () => {
      if (authLoading) {
        console.log('🔔 Auth still loading, waiting...');
        return;
      }

      if (!isAuthenticated || !user?.id) {
        console.log('🔔 User not authenticated, skipping notification init');
        setInitializationStatus('idle');
        return;
      }

      if (initializationStatus === 'initializing') {
        console.log('🔔 Already initializing, skipping...');
        return;
      }

      try {
        setInitializationStatus('initializing');
        setInitError(null);
        
        console.log('🔔 Starting notification initialization for user:', user.id);
        
        // Initialize notification system
        const success = await notification.initialize();
        
        if (success) {
          console.log('✅ Notification system initialized successfully');
          
          // Login user to notification service (this will register device)
          const loginSuccess = await notification.loginUser(user.id, true);
          
          if (loginSuccess) {
            console.log('✅ User logged into notification service successfully');
            setInitializationStatus('success');
          } else {
            console.warn('⚠️ Failed to login user to notification service');
            setInitializationStatus('error');
            setInitError('Failed to register device for notifications');
          }
        } else {
          console.error('❌ Failed to initialize notification system');
          setInitializationStatus('error');
          setInitError('Failed to initialize push notifications');
        }
      } catch (error) {
        console.error('❌ Notification initialization error:', error);
        setInitializationStatus('error');
        setInitError(error instanceof Error ? error.message : 'Unknown initialization error');
      }
    };

    initializeNotifications();
  }, [isAuthenticated, user?.id, authLoading, initializationStatus]);

  // Handle user logout
  useEffect(() => {
    const handleLogout = async () => {
      if (!isAuthenticated && initializationStatus === 'success') {
        console.log('🔔 User logged out, cleaning up notifications...');
        
        try {
          await notification.logoutUser(true); // Unregister device
          setInitializationStatus('idle');
          setInitError(null);
          console.log('✅ Notification cleanup completed');
        } catch (error) {
          console.error('❌ Error during notification cleanup:', error);
        }
      }
    };

    handleLogout();
  }, [isAuthenticated, initializationStatus]);

  // Show permission banner if no permission
  const showPermissionBanner = notification.isInitialized() && !notification.permissionStatus.granted;

  const handleRequestPermission = () => {
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
  };

  // Test notification function with proper types
  const handleTestNotification = () => {
    if (!__DEV__) return;

    Alert.alert(
      'Test Notification',
      'Chọn loại test notification:',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Local Test', 
          onPress: () => {
            // ✅ Use proper typed data
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
                // ✅ Call test notification method from hook
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
  };

  // Debug notification system status
  const renderDebugInfo = () => {
    if (!__DEV__) return null;

    const debugInfo = notification.getDebugInfo();
    
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
          Initialized: {debugInfo?.isInitialized ? 'YES' : 'NO'}
        </Text>
        <Text style={styles.debugText}>
          Can Send: {debugInfo?.canSendNotifications ? 'YES' : 'NO'}
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
  };

  // Handle notification tapped (when app opens from notification)
  useEffect(() => {
    const handleNotificationTapped = (notificationData: NotificationData) => {
      console.log('🔔 Notification tapped in provider:', notificationData);
      
      // The useNotification hook already handles navigation
      // This is just for additional provider-level logic if needed
    };

    // The hook handles notification responses internally
    // We can add additional logic here if needed

    return () => {
      // Cleanup if needed
    };
  }, [notification]);

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
      {__DEV__ && notification.permissionStatus.granted && (
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