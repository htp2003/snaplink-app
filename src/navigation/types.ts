import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";


export interface Location {
    id: number;
    name: string;
    address: string;
    imageUrl: string;
    rating: number;
    distance: string;
  }
  
  export interface Photographer {
    id: number;
    name: string;
    specialty: string;
    avatar: string;
    hourlyRate: number;
  }

export type RootStackParamList = {
    StepContainer: undefined;
    RoleSelection: undefined;
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
    Profile: undefined;
    PhotographerHomeScreen: undefined;
    FavoritedBottomSheet: undefined;
    OrderManagementScreen: undefined;
    RecentlyViewedScreen: undefined;
    // Customer  screens
    PhotographerCardDetail: { photographerId: string };
    LocationCardDetail: { locationId: string };
    ViewAllPhotographers: undefined;
    ViewAllLocations: undefined;
    ProfilePhoto: undefined;
    Booking: {
        photographerId: string;
        photographerName: string;
        hourlyRate?: number;
      };
    OrderDetail: {
        photographer: Photographer;
        selectedDate: string;
        selectedTimes: string[];
        selectedLocation: Location;
        totalHours: number;
        totalPrice: number;
    };
   

};

export type CustomerTabParamList = {
    CustomerHomeScreen: undefined;
    Favorites: undefined;
    SnapLink: undefined;
    Messages: undefined;
    Booking: undefined;
    Profile: undefined;
}

export type PhotographerTabParamList = {
    PhotographerHomeScreen: undefined;
    Profile: undefined;
    OrderManagementScreen: undefined;
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