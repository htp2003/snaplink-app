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
import { handleDeepLink} from './src/config/deepLinks'; // ⭐ THÊM

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