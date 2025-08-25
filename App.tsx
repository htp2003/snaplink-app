// App.tsx - UPDATED với Notification System

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

// 🔥 NEW: NOTIFICATION IMPORTS
import { NotificationProvider } from './src/context/NotificationProvider';

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
  
  // 🔥 NOTIFICATION WARNINGS
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
    // 🔥 Log Notification system initialization
    console.log('📱 Notification system starting...');
    
    return () => subscription?.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        {/* 🔥 NEW: Wrap toàn bộ app với NotificationProvider */}
        <NotificationProvider>
          <PortalProvider>
            <SafeAreaProvider>
              <ProfileProvider>
                <NavigationContainer>
                  <AppNavigator />
                </NavigationContainer>
              </ProfileProvider>
            </SafeAreaProvider>
          </PortalProvider>
        </NotificationProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}