import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import "./global.css"
import { ProfileProvider } from './src/context/ProfileContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PortalProvider } from '@gorhom/portal';
import { NavigationContainer } from '@react-navigation/native'; // Thêm dòng này

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PortalProvider>
        <SafeAreaProvider>
          <ProfileProvider>
            <NavigationContainer>
              <AppNavigator />
            </NavigationContainer>
          </ProfileProvider>
        </SafeAreaProvider>
      </PortalProvider>
    </GestureHandlerRootView>
  );
}