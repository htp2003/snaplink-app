import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CustomerTabParamList } from './types';
import CustomerHomeScreen from '../screens/customer/CustomerHomeScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import FavoritesScreen from '../screens/customer/FavoritesScreen';
import SnapLinkScreen from '../screens/customer/SnapLinkScreen';
import MessagesScreen from '../screens/customer/MessagesScreen';
import { customTabScreenOptions, snapLinkIconStyle } from './tabBarOptions';
import { View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
      <Tab.Screen
        name="CustomerHomeScreen"
        component={CustomerHomeScreen}
        options={{
          tabBarLabel: 'Khám phá',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon name="magnify" size={26} color={focused ? '#FF5A5F' : '#717171'} />
          ),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarLabel: 'Yêu thích',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon name="heart-outline" size={26} color={focused ? '#FF5A5F' : '#717171'} />
          ),
        }}
      />
      <Tab.Screen
        name="SnapLink"
        component={SnapLinkScreen}
        options={{
          tabBarLabel: 'SnapLink',
          tabBarIcon: ({ focused }) => (
            <View style={snapLinkIconStyle}>
              <Icon name="camera" size={24} color="white" />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          tabBarLabel: 'Tin nhắn',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon name="message-outline" size={26} color={focused ? '#FF5A5F' : '#717171'} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Hồ sơ',
          tabBarIcon: ({ color, size, focused }) => (
            <Icon name="account-outline" size={26} color={focused ? '#FF5A5F' : '#717171'} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default CustomerStack;