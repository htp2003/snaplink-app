import React, { useEffect } from 'react';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import "./global.css"
import { ProfileProvider } from './src/context/ProfileContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PortalProvider } from '@gorhom/portal';
import { NavigationContainer } from '@react-navigation/native'; 
import { AuthProvider } from './src/hooks/useAuth';
import { handleDeepLink, logDeepLinkInfo } from './src/config/deepLinks'; // ⭐ THÊM

export default function App() {
  useEffect(() => {
    // ⭐ THÊM: Log debug info khi app start
    logDeepLinkInfo();

    // Handle deep link when app is closed and opened via link
    const handleInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('📱 App opened with URL:', initialUrl);
        const result = handleDeepLink(initialUrl);
        console.log('📱 Deep link result:', result);
        // TODO: Navigate based on result.type
      }
    };

    // Handle deep link when app is already running
    const handleURL = (event: { url: string }) => {
      console.log('📱 Deep link while app running:', event.url);
      const result = handleDeepLink(event.url);
      console.log('📱 Deep link result:', result);
      // TODO: Navigate based on result.type
    };

    handleInitialURL();
    
    const subscription = Linking.addEventListener('url', handleURL);
    
    return () => subscription?.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <PortalProvider>
          <SafeAreaProvider>
            <ProfileProvider>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </ProfileProvider>
          </SafeAreaProvider>
        </PortalProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}