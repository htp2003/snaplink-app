import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { VenueOwnerTabParamList } from './types';
import { customTabScreenOptions } from './tabBarOptions';

import VenueOwnerHomeScreen from '../screens/venueOwner/venueOwnerHomeScreen';



const Tab = createBottomTabNavigator<VenueOwnerTabParamList>();

const VenueOwnerStack = () => {
  return (
    <Tab.Navigator screenOptions={customTabScreenOptions}>
      <Tab.Screen name="Venues" component={VenueOwnerHomeScreen} />
      {/* <Tab.Screen name="Bookings" component={BookingsScreen} /> */}
      {/* <Tab.Screen name="Profile" component={ProfileScreen} /> */}
    </Tab.Navigator>
  );
};

export default VenueOwnerStack;
