// services/ExpoNotificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

interface NavigationRef {
  navigate: (screen: string, params?: any) => void;
}

interface NotificationData {
  screen?: string;
  bookingId?: string;
  conversationId?: string;
  userId?: string;
  [key: string]: any;
}

// Configure how notifications are handled when received
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class ExpoNotificationService {
  private expoPushToken: string | null = null;
  private navigation: NavigationRef | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  // Khởi tạo service
  async initialize(): Promise<void> {
    try {
      // Register for push notifications
      const token = await this.registerForPushNotificationsAsync();
      if (token) {
        this.expoPushToken = token;
        console.log('✅ Expo Push Token:', token);
        
        // Send token to server
        await this.sendTokenToServer(token);
        
        // Setup listeners
        this.setupNotificationListeners();
        
        console.log('🔔 ExpoNotificationService initialized successfully');
      } else {
        console.log('❌ Failed to get push token');
      }
    } catch (error) {
      console.error('❌ Error initializing ExpoNotificationService:', error);
    }
  }

  // Request permissions and get push token
  async registerForPushNotificationsAsync(): Promise<string | null> {
    let token: string | null = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ Failed to get push token for push notification!');
        return null;
      }
      
      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
        if (!projectId) {
          throw new Error('Project ID not found');
        }
        
        token = (await Notifications.getExpoPushTokenAsync({
          projectId,
        })).data;
        
        console.log('🎯 Expo Push Token:', token);
      } catch (e) {
        console.error('❌ Error getting Expo push token:', e);
        token = null;
      }
    } else {
      console.log('❌ Must use physical device for Push Notifications');
    }

    return token;
  }

  // Request permission manually
  async requestPermission(): Promise<boolean> {
    try {
      if (!Device.isDevice) {
        console.log('❌ Must use physical device for Push Notifications');
        return false;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status === 'granted') {
        console.log('✅ Notification permission granted');
        
        // Get new token if permission granted
        const token = await this.registerForPushNotificationsAsync();
        if (token) {
          this.expoPushToken = token;
          await this.sendTokenToServer(token);
        }
        return true;
      } else {
        console.log('❌ Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting permission:', error);
      return false;
    }
  }

  // Send token to server
  async sendTokenToServer(token: string): Promise<void> {
    try {
      // TODO: Replace with your actual API endpoint
      const API_BASE_URL = 'YOUR_API_BASE_URL';
      
      const response = await fetch(`${API_BASE_URL}/api/notification/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_AUTH_TOKEN'
        },
        body: JSON.stringify({
          expoPushToken: token,
          deviceType: Platform.OS,
          deviceId: 'unique-device-id',
          // userId: userID
        })
      });

      if (response.ok) {
        console.log('✅ Token sent to server successfully');
      } else {
        console.log('❌ Failed to send token to server');
      }
    } catch (error) {
      console.error('❌ Error sending token to server:', error);
    }
  }

  // Setup notification listeners
  setupNotificationListeners(): void {
    // Listen for notifications received while app is running
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Foreground notification:', notification);
      // Handle foreground notification display
      // Expo automatically shows the notification, but you can customize behavior here
    });

    // Listen for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 Notification tapped:', response);
      this.handleNotificationNavigation(response.notification);
    });
  }

  // Handle navigation when notification is tapped
  handleNotificationNavigation(notification: Notifications.Notification): void {
    const data = notification.request.content.data as NotificationData;
    
    if (!this.navigation) {
      console.log('❌ Navigation not set');
      return;
    }

    try {
      if (data?.screen) {
        switch (data.screen) {
          case 'BookingDetail':
            this.navigation.navigate('BookingDetail', { 
              bookingId: data.bookingId 
            });
            break;
          case 'ChatScreen':
            this.navigation.navigate('ChatScreen', { 
              conversationId: data.conversationId 
            });
            break;
          case 'Profile':
            this.navigation.navigate('Profile', { 
              userId: data.userId 
            });
            break;
          default:
            this.navigation.navigate('Notifications');
            break;
        }
      } else {
        this.navigation.navigate('Notifications');
      }
    } catch (error) {
      console.error('❌ Error navigating:', error);
    }
  }

  // Set navigation reference
  setNavigation(navigationRef: NavigationRef): void {
    this.navigation = navigationRef;
  }

  // Get current token
  getCurrentToken(): string | null {
    return this.expoPushToken;
  }

  // Get new token
  async getExpoPushToken(): Promise<string | null> {
    return await this.registerForPushNotificationsAsync();
  }

  // Cleanup when user logs out
  async unsubscribe(): Promise<void> {
    try {
      // Remove listeners
      if (this.notificationListener) {
        Notifications.removeNotificationSubscription(this.notificationListener);
      }
      if (this.responseListener) {
        Notifications.removeNotificationSubscription(this.responseListener);
      }
      
      this.expoPushToken = null;
      console.log('✅ Expo notification cleanup completed');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  // Schedule local notification (for testing)
  async scheduleLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 1,
        },
      });
      console.log('✅ Local notification scheduled');
    } catch (error) {
      console.error('❌ Error scheduling local notification:', error);
    }
  }
}

// Export singleton instance
export default new ExpoNotificationService();