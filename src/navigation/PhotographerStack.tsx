import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PhotographerTabParamList } from './types';
import { customTabScreenOptions } from './tabBarOptions';

// Placeholder screens - Cần tạo các màn hình này sau
import ProfileScreen from '../screens/photographer/ProfileScreen';
import PhotographerHomeScreen from '../screens/photographer/PhotographerHomeScreen';



const Tab = createBottomTabNavigator<PhotographerTabParamList>();

const PhotographerStack = () => {
  return (
    <Tab.Navigator screenOptions={customTabScreenOptions}>
      <Tab.Screen name="PhotographerHomeScreen" component={PhotographerHomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default PhotographerStack;
