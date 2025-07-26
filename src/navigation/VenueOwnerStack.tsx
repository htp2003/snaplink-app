// navigation/VenueOwnerStack.tsx
import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { VenueOwnerTabParamList } from "./types";
import { customTabScreenOptions } from "./tabBarOptions";
import { Ionicons } from "@expo/vector-icons";

// Import screens
import VenueOwnerHomeScreen from "../screens/venueOwner/VenueOwnerHomeScreen";
import VenueManagementScreen from "../screens/venueOwner/VenueManagementScreen";
import VenueOwnerProfileScreen from "../screens/venueOwner/VenueOwnerProfileScreen";
import VenueOwnerEventsScreen from "../screens/venueOwner/VenueOwnerEventsScreen";

const Tab = createBottomTabNavigator<VenueOwnerTabParamList>();

const VenueOwnerStack = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        ...customTabScreenOptions,
        tabBarHideOnKeyboard: true,
      }}
      safeAreaInsets={{ bottom: 0 }}
    >
      <Tab.Screen
        name="VenueOwnerHomeScreen"
        component={VenueOwnerHomeScreen}
        options={{
          tabBarLabel: "Ví",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name="wallet-outline"
              size={26}
              color={focused ? "#FF5A5F" : "#717171"}
            />
          ),
        }}
      />

      <Tab.Screen
        name="VenueManagement"
        component={VenueManagementScreen}
        options={{
          tabBarLabel: "Địa điểm",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name="business-outline"
              size={26}
              color={focused ? "#FF5A5F" : "#717171"}
            />
          ),
        }}
      />

      <Tab.Screen
        name="VenueOwnerProfile"
        component={VenueOwnerProfileScreen}
        options={{
          tabBarLabel: "Hồ sơ",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name="person-outline"
              size={26}
              color={focused ? "#FF5A5F" : "#717171"}
            />
          ),
        }}
      />

      <Tab.Screen
        name="VenueOwnerEvents"
        component={VenueOwnerEventsScreen}
        options={{
          tabBarLabel: "Sự kiện",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name="calendar-outline"
              size={26}
              color={focused ? "#FF5A5F" : "#717171"}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default VenueOwnerStack;
