import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";

export type RootStackParamList = {
    Step: undefined;
    CustomerMain: { screen?: keyof CustomerTabParamList } | undefined;
    PhotographerMain: { screen?: keyof PhotographerTabParamList } | undefined;
    VenueOwnerMain: { screen?: keyof VenueOwnerTabParamList } | undefined;
    Layout: undefined;
    Login: undefined;
    Register: undefined;
    
    // Photographer screens
    EditProfile: undefined;
    Subscription: undefined;
    SubscriptionManagement: undefined;
    
    // Customer  screens
    ProfileCardDetail: undefined;
    ViewAllPhotographers: undefined;
    ViewAllLocations: undefined;
    ProfilePhoto: undefined;
    Booking: undefined;

};

export type CustomerTabParamList = {
    CustomerHomeScreen: undefined;
    Booking: undefined;
    Profile: undefined;
}

export type PhotographerTabParamList = {
    PhotographerHomeScreen: undefined;
    Profile: undefined;
}

export type VenueOwnerTabParamList = {
    Venues: undefined;
    Bookings: undefined;
    Profile: undefined;
}

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>

export type CustomerTabNavigationProp = BottomTabNavigationProp<CustomerTabParamList>
export type PhotographerTabNavigationProp = BottomTabNavigationProp<PhotographerTabParamList>
export type VenueOwnerTabNavigationProp = BottomTabNavigationProp<VenueOwnerTabParamList>