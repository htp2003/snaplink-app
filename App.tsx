import React, { useEffect } from 'react';
import { Linking, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import "./global.css"
import { ProfileProvider } from './src/context/ProfileContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PortalProvider } from '@gorhom/portal';
import { NavigationContainer } from '@react-navigation/native'; 
import { AuthProvider } from './src/hooks/useAuth';
import { handleDeepLink} from './src/config/deepLinks';

// 🔥 NEW: PUSH NOTIFICATION IMPORTS

import { useAuth } from './src/hooks/useAuth';
import { useNotifications } from 'src/hooks/useNotification';
import { notificationService } from 'src/services/notificationService';
import { useNotificationNavigation } from 'src/hooks/useNotificationNavigation';

// 🎯 SUPPRESS IMAGE-RELATED ERRORS - Add this at the top
LogBox.ignoreLogs([
  // Image API errors
  'Error fetching primary photographer image',
  'Error fetching photographer images',
  'Error fetching location images', 
  'Error fetching event images',
  'Failed to fetch images',
  'Warning: useInsertionEffect must not schedule updates',
  'useInsertionEffect must not schedule updates',
  
  // Network and 404 errors
  'Network request failed',
  'Request failed with status code 404',
  '404',
  
  // Generic fetch errors
  /fetch.*error/i,
  /error.*fetch/i,
  /image.*404/i,
  /404.*image/i,
  
  // API response errors
  'Unable to resolve module',
  'Warning: Image',
  'Warning: Failed to fetch',
  
  // Other common non-critical warnings
  'Require cycle',
  'Remote debugger',
  
  // 🔥 EXPO NOTIFICATIONS WARNINGS
  'Expo push token',
  'Notification',
  'Constants.expoConfig',
]);

// 🎯 ADDITIONAL: Override console.error for image-related errors in development
if (__DEV__) {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  console.error = (...args: any[]) => {
    const message = args.join(' ').toLowerCase();
    
    // Check if it's an image-related error we want to suppress
    const shouldSuppress = 
      message.includes('image') ||
      message.includes('404') ||
      message.includes('fetch') ||
      message.includes('photographer image') ||
      message.includes('primary image') ||
      message.includes('network request failed');
    
    if (!shouldSuppress) {
      originalConsoleError.apply(console, args);
    } else {
      // Silent log for debugging if needed
      console.log('🖼️ [Suppressed Error]:', args[0]);
    }
  };
  
  console.warn = (...args: any[]) => {
    const message = args.join(' ').toLowerCase();
    
    const shouldSuppress = 
      message.includes('image') ||
      message.includes('404') ||
      message.includes('fetch');
    
    if (!shouldSuppress) {
      originalConsoleWarn.apply(console, args);
    }
  };
}

// 🔥 NEW: NOTIFICATION-AWARE APP CONTENT
function AppContent() {
  const { user, isAuthenticated } = useAuth();
  
  // 🔥 Setup push notifications
  const {
    expoPushToken,
    isRegistered,
    isLoading: notificationLoading,
    error: notificationError,
    setNavigationHandler
  } = useNotifications({
    userId: user?.id,
    autoRegister: true,
    autoRefresh: true
  });

  // 🔥 Setup notification navigation
  const handleNotificationNavigation = useNotificationNavigation();

  useEffect(() => {
    // 🔥 Setup auth token for notification service
    const setupNotificationAuth = async () => {
      try {
        // Get token from AsyncStorage or auth context
        const token = await AsyncStorage.getItem('token');
        if (token && isAuthenticated) {
          notificationService.setAuthToken(token);
          console.log('✅ Notification service auth token set');
        }
      } catch (error) {
        console.warn('⚠️ Failed to setup notification auth:', error);
      }
    };

    setupNotificationAuth();
  }, [isAuthenticated]);

  useEffect(() => {
    // 🔥 Set navigation handler for notifications
    if (setNavigationHandler) {
      setNavigationHandler(handleNotificationNavigation);
    }
  }, [setNavigationHandler, handleNotificationNavigation]);

  // 🔥 Log notification status in development
  useEffect(() => {
    if (__DEV__) {
      console.log('🔔 Notification Status:', {
        isAuthenticated,
        userId: user?.id,
        hasToken: !!expoPushToken,
        isRegistered,
        isLoading: notificationLoading,
        error: notificationError
      });
    }
  }, [isAuthenticated, user?.id, expoPushToken, isRegistered, notificationLoading, notificationError]);

  return <AppNavigator />;
}

export default function App() {
  useEffect(() => {
    // Handle deep link when app is closed and opened via link
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
         const result = handleDeepLink(initialUrl);
        
        // TODO: Navigate based on result.type
      }
    };

    // Handle deep link when app is already running
    const handleURL = (event: { url: string }) => {
      const result = handleDeepLink(event.url);
    };

    handleInitialURL();
    
    const subscription = Linking.addEventListener('url', handleURL);
    
    // 🎯 Log that error suppression is active
    console.log('🖼️ Image error suppression configured');
    // 🔥 Log Expo Notifications initialization
    console.log('🔔 Expo Notification system starting...');
    
    return () => subscription?.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <PortalProvider>
          <SafeAreaProvider>
            <ProfileProvider>
              <NavigationContainer>
                {/* 🔥 NEW: Wrap with notification-aware content */}
                <AppContent />
              </NavigationContainer>
            </ProfileProvider>
          </SafeAreaProvider>
        </PortalProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}