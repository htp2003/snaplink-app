import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CustomerTabParamList } from './types';
import { customTabScreenOptions } from './tabBarOptions';

// Placeholder screens - Cần tạo các màn hình này sau
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import Icon from 'react-native-vector-icons/MaterialIcons';
import ProfileScreen from '../screens/customer/ProfileScreen';

const Tab = createBottomTabNavigator<CustomerTabParamList>();

const CustomerStack = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        ...customTabScreenOptions,
        tabBarHideOnKeyboard: true,
      }}
      safeAreaInsets={{ bottom: 0 }}
    >
      <Tab.Screen name="CustomerHomeScreen" component={CustomerHomeScreen} options={{
        tabBarLabel: 'Trang Chủ',
        tabBarIcon: ({ focused, color, size }) => (
          <Icon
            name="home"
            size={focused ? 26 : 24}
            color={color}
          />
        ),
      }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{
        tabBarLabel: 'Hồ sơ',
        tabBarIcon: ({ focused, color, size }) => (
          <Icon
            name="person"
            size={focused ? 26 : 24}
            color={color}
          />
        ),
      }} />
    </Tab.Navigator>
  );
};

export default CustomerStack;