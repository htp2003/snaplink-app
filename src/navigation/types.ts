// navigation/types.ts (Add venue owner types)
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { PriceCalculationResponse } from "../types/booking";
import { PaymentFlowData } from "../types/payment";

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
  EmailVerification: {
    email: string;
  };
  // Photographer screens
  EditProfilePhotographer: undefined;
  Subscription: undefined;
  SubscriptionManagement: undefined;
  ViewProfilePhotographerScreen: undefined;
  PhotographerHomeScreen: undefined;
  FavoritedBottomSheet: undefined;
  RecentlyViewedScreen: undefined;
  ProfilePhotographerScreen: undefined;
  OrderManagementScreen: undefined;
  ManageAvailabilityScreen: undefined;

  PaymentWaitingScreen: PaymentFlowData;

  PhotographerEventScreen: {
    photographerId: number;
  };

  // Customer screens
  PhotographerCardDetail: { photographerId: string };
  LocationCardDetail: { locationId: string };
  ViewAllPhotographers: {
    type?: "featured" | "recommendations" | "all";
    title?: string;
    userId?: number | null;
  };
  ViewAllLocations: undefined;
  ProfileUserScreen: undefined;
  EditProfileUserScreen: undefined;
  OrderHistoryScreen: { userId: number };
  BookingDetailScreen: { bookingId: number };
  Booking: {
    photographer: {
      photographerId: number;
      id?: string;
      userId?: string;
      fullName: string;
      name?: string;
      profileImage?: string;
      avatar?: string;
      hourlyRate: number;
      specialty?: string;
      yearsExperience?: number;
      equipment?: string;
      availabilityStatus?: string;
      rating?: number;
      verificationStatus?: string;
      email?: string;
      phoneNumber?: string;
      bio?: string;
      styles?: string[];
    };
    editMode?: boolean;
    existingBookingId?: number;
    existingBookingData?: {
      selectedDate: string;
      selectedStartTime: string;
      selectedEndTime: string;
      selectedLocation?: {
        id: number;
        name: string;
        hourlyRate?: number;
      };
      specialRequests?: string;
    };
  };
  OrderDetail: {
    bookingId: number;
    photographer: {
      photographerId: number;
      fullName: string;
      profileImage?: string;
      hourlyRate: number;
    };
    selectedDate: string;
    selectedStartTime: string;
    selectedEndTime: string;
    selectedLocation?: {
      id: number;
      name: string;
      hourlyRate?: number;
    };
    specialRequests?: string;
    priceCalculation: PriceCalculationResponse;
  };
  ViewProfileUserScreen: { userId: number };

  // Venue Owner screens
  VenueOwnerHomeScreen: undefined;
  VenueManagement: undefined;
  VenueOwnerProfile: undefined;
  VenueOwnerEvents: undefined;
  EditVenueScreen: { venueId?: number };
  VenueDetailScreen: { venueId: number };
};

export type CustomerTabParamList = {
  CustomerHomeScreen: undefined;
  Favorites: undefined;
  SnapLink: undefined;
  Messages: undefined;
  Booking: undefined;
  Profile: undefined;
};

export type PhotographerTabParamList = {
  PhotographerHomeScreen: undefined;
  Profile: undefined;
  OrderManagementScreen: undefined;
  PhotographerEventScreen: {
    photographerId: number;
  };
};

export type VenueOwnerTabParamList = {
  VenueOwnerHomeScreen: undefined; // Ví
  VenueManagement: undefined; // Quản lý venue
  VenueOwnerProfile: undefined; // Hồ sơ
  VenueOwnerEvents: undefined; // Sự kiện
};

export type RootStackNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

export type CustomerTabNavigationProp =
  BottomTabNavigationProp<CustomerTabParamList>;
export type PhotographerTabNavigationProp =
  BottomTabNavigationProp<PhotographerTabParamList>;
export type VenueOwnerTabNavigationProp =
  BottomTabNavigationProp<VenueOwnerTabParamList>;
