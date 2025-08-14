import { Booking } from './../types/booking';
// navigation/types.ts
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { PriceCalculationResponse } from "../types/booking";
import { PaymentFlowData } from "../types/payment";

// Thêm interface cho external location data
export interface ExternalLocationData {
  id: string;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  distanceInKm: number;
  type?: string;
  rating?: number;
  source: "internal" | "external";
  locationId?: number;
  externalId?: string;
  hourlyRate?: number;
  availabilityStatus?: string;
}

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
  ChangePasswordScreen: undefined;
  ForgotPassword: undefined;
  // Photographer screens
  EditProfilePhotographer: undefined;
  SubscriptionManagement: undefined;
  ViewProfilePhotographerScreen: undefined;
  PhotographerHomeScreen: undefined;
  FavoritedBottomSheet: undefined;
  RecentlyViewedScreen: undefined;
  ProfilePhotographerScreen: undefined;
  OrderManagementScreen: undefined;
  ManageAvailabilityScreen: undefined;
  PortfolioScreen: undefined;
  PaymentWaitingScreen: PaymentFlowData;
  WalletScreen: undefined;


  PhotoDeliveryScreen: {
    bookingId: number;
    customerName: string;
  };

  PhotographerEventScreen: {
    photographerId: number;
  };
  EventDetailScreen: { eventId: string;}

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
  ChatScreen: {
    conversationId: number;
    title: string;
    otherUser?: {
      userId: number;
      userName: string;
      userFullName: string;
      userProfileImage?: string;
    };
  };
  NewChatScreen: undefined;
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
      locationId?: number;
      name: string;
      address?: string;
      hourlyRate?: number;
    };
    selectedExternalLocation?: ExternalLocationData | null;
    specialRequests?: string;
    priceCalculation: PriceCalculationResponse;
  };
BookingEvent: {
    event: {
      eventId: number;
      name: string;
      startDate: string;
      endDate: string;
      locationName?: string;
      discountedPrice?: number;
      originalPrice?: number;
      description?: string;
    };
    preSelectedPhotographer?: {
      eventPhotographerId: number;
      photographerId: number;
      photographerName?: string;
      profileImage?: string;
      specialRate?: number;
    };
  };
  OrderEventDetail: {
    eventBookingId: number;
    photographer: {
      eventPhotographerId: number;
      fullName: string;
      profileImage?: string;
      specialRate?: number; 
    };
    event: {
      eventId: number;
      name: string;
      startDate: string;
      endDate: string;
      locationName?: string;
      discountedPrice?: number;
      originalPrice?: number;
      description?: string;
    };
    selectedDate?: string;
    selectedStartTime?: string;
    selectedEndTime?: string;
    specialRequests?: string;
    priceCalculation?: {
      totalPrice: number;
      photographerFee: number;
      locationFee: number;
      duration: number;
      breakdown: {
        baseRate: number;
        locationRate: number;
        additionalFees: any[];
      };
    };
    bookingTimes?: {
      startTime: string;      
      endTime: string;       
      startDatetime?: string; 
      endDatetime?: string;   
    };
  };

  ViewProfileUserScreen: { userId: number };

  // Venue Owner screens
  VenueOwnerHomeScreen: undefined;
  VenueManagement: undefined;
  VenueOwnerProfile: undefined;
  VenueOwnerEvents: undefined;
  EditVenueScreen: { venueId?: number };
  VenueDetailScreen: { venueId: number };
  VenueOwnerSubscription: undefined;

  // VenueOwner Event Management screens
  VenueOwnerEventDetail: {
    eventId: number;
    eventName?: string;
  };
  VenueOwnerCreateEvent: {
    locationId?: number;
  };
  VenueOwnerEventImages: {
    eventId: number;
    eventName?: string;
  };
  VenueOwnerEditEvent: {
    eventId: number;
  };
  VenueOwnerEventApplications: {
    eventId: number;
    eventName?: string;
  };
  VenueOwnerEventBookings: {
    eventId: number;
    eventName?: string;
  };
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
  Messages: undefined;
};

export type VenueOwnerTabParamList = {
  VenueOwnerHomeScreen: undefined;
  VenueManagement: undefined;
  VenueOwnerProfile: undefined;
  VenueOwnerEvents: undefined;
};

export type RootStackNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

export type CustomerTabNavigationProp =
  BottomTabNavigationProp<CustomerTabParamList>;
export type PhotographerTabNavigationProp =
  BottomTabNavigationProp<PhotographerTabParamList>;
export type VenueOwnerTabNavigationProp =
  BottomTabNavigationProp<VenueOwnerTabParamList>;
