import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PhotographerTabParamList } from './types';
import { customTabScreenOptions } from './tabBarOptions';
import { Ionicons } from '@expo/vector-icons';

// Placeholder screens - Cần tạo các màn hình này sau

import PhotographerHomeScreen from '../screens/photographer/PhotographerHomeScreen';
import OrderManagementScreen from '../screens/photographer/OrderManagementScreen';
import ProfilePhotographerScreen from '../screens/photographer/ProfilePhotographerScreen';
import MessagesScreen from '../screens/customer/MessagesScreen';
import PhotographerEventScreen from '../screens/photographer/PhotographerEventScreen';
const Tab = createBottomTabNavigator<PhotographerTabParamList>();

const PhotographerStack = () => {
  return (
    <Tab.Navigator 
      screenOptions={{
        ...customTabScreenOptions,
        tabBarHideOnKeyboard: true,
      }}
      safeAreaInsets={{ bottom: 0 }}
    >
      <Tab.Screen 
        name="PhotographerHomeScreen" 
        component={PhotographerHomeScreen}
        options={{
          tabBarLabel: 'Ví',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name="wallet-outline" 
              size={26} color={focused ? '#FF5A5F' : '#717171'} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="OrderManagementScreen" 
        component={OrderManagementScreen}
        options={{
          tabBarLabel: 'Đơn hàng',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons 
              name="clipboard-outline" 
              size={26} color={focused ? '#FF5A5F' : '#717171'} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfilePhotographerScreen}
        options={{
          tabBarLabel: 'Hồ sơ',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name="person-outline"
              size={26} color={focused ? '#FF5A5F' : '#717171'}
            />
          ),
        }}
      />
      <Tab.Screen
              name="Messages"
              component={MessagesScreen}
              options={{
                tabBarLabel: 'Tin nhắn',
                tabBarIcon: ({ color, size, focused }) => (
                  <Ionicons name="chatbox-outline" size={26} color={focused ? '#FF5A5F' : '#717171'} />
                ),
              }}
            />
      <Tab.Screen
              name="PhotographerEventScreen"
              component={PhotographerEventScreen}
              options={{
                tabBarLabel: 'Sự kiện',
                tabBarIcon: ({ color, size, focused }) => (
                  <Ionicons name="calendar-outline" size={26} color={focused ? '#FF5A5F' : '#717171'} />
                ),
              }}
            />
    </Tab.Navigator>
  );
};

export default PhotographerStack;