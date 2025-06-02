import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

// Import các stack cho từng role
import CustomerStack from './CustomerStack';
import PhotographerStack from './PhotographerStack';
import VenueOwnerStack from './VenueOwnerStack';

// Screens
import LayoutPage from '../screens/LayoutPage';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import StepContainer from '../components/Step/StepContainer';
import ProfileCardDetail from '../screens/customer/ProfileCardDetail';
import ViewAllPhotographers from '../screens/customer/ViewAllPhotographers';
import ViewAllLocations from '../screens/customer/ViewAllLocations';
import ProfileScreen from '../screens/photographer/ProfileScreen';
import EditProfileScreen from '../screens/photographer/EditProfileScreen';
import SubscriptionScreen from '../screens/photographer/SubscriptionScreen';
import SubscriptionManagementScreen from '../screens/photographer/SubscriptionManagementScreen';
import BookingScreen from '../screens/BookingScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Layout"
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Màn hình chọn role */}
        <Stack.Screen name="Step" component={StepContainer} />
        
        {/* Các stack cho từng role */}
        <Stack.Screen name="CustomerMain" component={CustomerStack} />
        <Stack.Screen name="PhotographerMain" component={PhotographerStack} />
        <Stack.Screen name="VenueOwnerMain" component={VenueOwnerStack} />
        
        {/* Các màn hình chung */}
        <Stack.Screen name="Layout" component={LayoutPage} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        
        {/* Các màn hình dành riêng cho Customer */}
        <Stack.Screen name="ProfileCardDetail" component={ProfileCardDetail} />
        <Stack.Screen name="ViewAllPhotographers" component={ViewAllPhotographers} />
        <Stack.Screen name="ViewAllLocations" component={ViewAllLocations} />
        <Stack.Screen name="ProfilePhoto" component={ProfileScreen} />
        {/* <Stack.Screen name="Booking" component={BookingScreen} /> */}

        {/* Các màn hình dành riêng cho Photographer */}
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="SubscriptionManagement" component={SubscriptionManagementScreen} />



        {/* Các màn hình dành riêng cho VenueOwner */}
        
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;