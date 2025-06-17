import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PhotographerTabParamList } from './types';
import { customTabScreenOptions } from './tabBarOptions';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Placeholder screens - Cần tạo các màn hình này sau
import ProfileScreen from '../screens/photographer/ProfileScreen';
import PhotographerHomeScreen from '../screens/photographer/PhotographerHomeScreen';
import OrderManagementScreen from '../screens/photographer/OrderManagementScreen';

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
            <Icon 
              name="account-balance-wallet" 
              size={focused ? 26 : 24} 
              color={color} 
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
            <Icon 
              name="assignment" 
              size={focused ? 26 : 24} 
              color={color} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Hồ sơ',
          tabBarIcon: ({ focused, color, size }) => (
            <Icon 
              name="person" 
              size={focused ? 26 : 24} 
              color={color} 
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default PhotographerStack;