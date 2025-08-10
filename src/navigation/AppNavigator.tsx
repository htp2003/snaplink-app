import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { RootStackParamList } from "./types";

// Import các stack cho từng role
import CustomerStack from "./CustomerStack";
import PhotographerStack from "./PhotographerStack";
import VenueOwnerStack from "./VenueOwnerStack";

// Screens
import LayoutPage from "../screens/LayoutPage";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import StepContainer from "../components/Step/StepContainer";
import ViewAllPhotographers from "../screens/customer/ViewAllPhotographers";
import ViewAllLocations from "../screens/customer/ViewAllLocations";
import SubscriptionScreen from "../screens/photographer/SubscriptionScreen";
import SubscriptionManagementScreen from "../screens/photographer/SubscriptionManagementScreen";
import BookingScreen from "../screens/customer/BookingScreen";
import OrderDetailScreen from "../screens/customer/OrderDetailScreen";
import PhotographerCardDetail from "../screens/customer/PhotographerCardDetail";
import LocationCardDetail from "../screens/customer/LocationCardDetail";
import RoleSelectionScreen from "../screens/RoleSelectionScreen";
import PhotographerHomeScreen from "../screens/photographer/PhotographerHomeScreen";
import RecentlyViewedScreen from "../screens/customer/RecentlyViewedScreen";
import PhotographerEventScreen from "../screens/photographer/PhotographerEventScreen";
import VenueManagementScreen from "../screens/venueOwner/VenueManagementScreen";
import ManageAvailabilityScreen from "../screens/photographer/ManageAvailabilityScreen";
import ProfileUserScreen from "../screens/customer/ProfileUserScreen";
import ViewProfileUserScreen from "../screens/customer/ViewProfileUserScreen";
import ProfilePhotographerScreen from "../screens/photographer/ProfilePhotographerScreen";
import ViewProfilePhotographerScreen from "../screens/photographer/ViewProfilePhotographerScreen";
import EditProfilePhotographerScreen from "../screens/photographer/EditProfilePhotographerScreen";
import OrderManagementScreen from "../screens/photographer/OrderManagementScreen";
import VenueOwnerProfileScreen from "../screens/venueOwner/VenueOwnerProfileScreen";
import EmailVerificationScreen from "../screens/EmailVerificationScreen";
import EditProfileUserScreen from "../screens/customer/EditProifileUserScreen";
import OrderHistoryScreen from "../screens/customer/OrderHistoryScreen";
import PortfolioScreen from "../screens/photographer/PortfolioScreen";
import PaymentWaitingScreen from "../screens/customer/PaymentWaitingScreen ";

import BookingDetailScreen from "../screens/customer/BookingDetailScreen";

import PhotoDeliveryScreen from "../screens/photographer/PhotoDeliveryScreen";
import ChatScreen from "../screens/customer/ChatScreen";
import MessagesScreen from "../screens/customer/MessagesScreen";
import WalletScreen from "../screens/customer/WalletScreen";

// VenueOwner Event Screens
import VenueOwnerEventDetailScreen from "../screens/venueOwner/VenueOwnerEventDetailScreen";
import VenueOwnerCreateEventScreen from "../screens/venueOwner/VenueOwnerCreateEventScreen";
import VenueOwnerEventImagesScreen from "../screens/venueOwner/VenueOwnerEventImagesScreen";
import ForgotPasswordScreen from "../screens/ForgotPasswordScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Layout"
      screenOptions={{
        headerShown: false,
      }}
    >
      {/* Màn hình chọn role */}
      <Stack.Screen name="StepContainer" component={StepContainer} />
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />

      {/* Các stack cho từng role */}
      <Stack.Screen name="CustomerMain" component={CustomerStack} />
      <Stack.Screen name="PhotographerMain" component={PhotographerStack} />
      <Stack.Screen name="VenueOwnerMain" component={VenueOwnerStack} />

      {/* Các màn hình chung */}
      <Stack.Screen name="Layout" component={LayoutPage} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen
        name="EmailVerification"
        component={EmailVerificationScreen}
      />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen}/>

      {/* Các màn hình dành riêng cho Customer */}
      <Stack.Screen
        name="PhotographerCardDetail"
        component={PhotographerCardDetail}
      />
      <Stack.Screen name="LocationCardDetail" component={LocationCardDetail} />
      <Stack.Screen
        name="ViewAllPhotographers"
        component={ViewAllPhotographers}
      />
      <Stack.Screen name="ViewAllLocations" component={ViewAllLocations} />
      <Stack.Screen name="ProfileUserScreen" component={ProfileUserScreen} />
      <Stack.Screen
        name="ViewProfileUserScreen"
        component={ViewProfileUserScreen}
      />
      <Stack.Screen name="Booking" component={BookingScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen
        name="EditProfileUserScreen"
        component={EditProfileUserScreen}
      />
      <Stack.Screen name="OrderHistoryScreen" component={OrderHistoryScreen} />
      <Stack.Screen
        name="PaymentWaitingScreen"
        component={PaymentWaitingScreen}
      />
      <Stack.Screen
        name="BookingDetailScreen"
        component={BookingDetailScreen}
      />
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
      <Stack.Screen name="NewChatScreen" component={MessagesScreen} />

      {/* Các màn hình dành riêng cho Photographer */}
      <Stack.Screen
        name="EditProfilePhotographer"
        component={EditProfilePhotographerScreen}
      />
      <Stack.Screen
        name="ProfilePhotographerScreen"
        component={ProfilePhotographerScreen}
      />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen
        name="SubscriptionManagement"
        component={SubscriptionManagementScreen}
      />
      <Stack.Screen
        name="PhotographerHomeScreen"
        component={PhotographerHomeScreen}
      />
      <Stack.Screen
        name="RecentlyViewedScreen"
        component={RecentlyViewedScreen}
      />
      <Stack.Screen
        name="ViewProfilePhotographerScreen"
        component={ViewProfilePhotographerScreen}
      />
      <Stack.Screen
        name="PhotographerEventScreen"
        component={PhotographerEventScreen}
      />
      <Stack.Screen
        name="OrderManagementScreen"
        component={OrderManagementScreen}
      />
      <Stack.Screen
        name="ManageAvailabilityScreen"
        component={ManageAvailabilityScreen}
      />
      <Stack.Screen name="PortfolioScreen" component={PortfolioScreen} />
      <Stack.Screen
        name="PhotoDeliveryScreen"
        component={PhotoDeliveryScreen}
      />
      <Stack.Screen name="WalletScreen" component={WalletScreen} />

      {/* Các màn hình dành riêng cho VenueOwner */}
      <Stack.Screen
        name="VenueOwnerProfile"
        component={VenueOwnerProfileScreen}
      />
      <Stack.Screen name="VenueManagement" component={VenueManagementScreen} />

      {/* VenueOwner Event Management Screens */}
      <Stack.Screen
        name="VenueOwnerEventDetail"
        component={VenueOwnerEventDetailScreen}
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="VenueOwnerCreateEvent"
        component={VenueOwnerCreateEventScreen}
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="VenueOwnerEventImages"
        component={VenueOwnerEventImagesScreen}
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;
