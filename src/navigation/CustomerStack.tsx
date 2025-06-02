import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CustomerTabParamList } from './types';
import { customTabScreenOptions } from './tabBarOptions';

// Customer Screens
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import BookingScreen from '../screens/BookingScreen';
// import ProfileScreen from '../screens/photographer/ProfileScreen';
import ProfileCardDetail from '../screens/customer/ProfileCardDetail';
import ViewAllPhotographers from '../screens/customer/ViewAllPhotographers';
import ViewAllLocations from '../screens/customer/ViewAllLocations';

const Tab = createBottomTabNavigator<CustomerTabParamList>();

const CustomerStack = () => {
  return (
    <Tab.Navigator screenOptions={customTabScreenOptions}>
      <Tab.Screen name="CustomerHomeScreen" component={CustomerHomeScreen} />
      <Tab.Screen name="Booking" component={BookingScreen} />
      {/* <Tab.Screen name="Profile" component={ProfileScreen} /> */}
    </Tab.Navigator>
  );
};

export default CustomerStack;