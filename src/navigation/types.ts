import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { PriceCalculationResponse } from "../types/booking";
import { PaymentFlowData } from "../types/payment";

// 🆕 NEW: Google Places display format (for UI components)
export interface GooglePlaceDisplay {
  placeId: string;
  name: string;
  address: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  types?: string[]; // Array format from Google API
  photoReference?: string;
}

// 🆕 NEW: Booking API external location format (for API calls)
export interface BookingExternalLocation {
  placeId: string;
  name: string;
  address: string;
  description?: string; // Optional for booking API
  latitude?: number;
  longitude?: number;
  types?: string; // String format for API (join array)
}

// 🔧 UPDATED: Enhanced ExternalLocationData (for backward compatibility)
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

// Existing interfaces (unchanged)
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

// 🏢 VENUE PAYMENT DATA INTERFACE
export interface VenuePaymentData {
  booking?: {
    id: number;
    photographerName: string;
    date: string;
    time: string;
    location: string;
    totalAmount: number;
  };
  payment?: {
    id: number;
    paymentId: number;
    orderCode: string;
    externalTransactionId: string;
    amount: number;
    totalAmount: number;
    status: string;
    paymentUrl: string;
    qrCode: string;
    bin: string;
    accountNumber: string;
    description: string;
    currency: string;
    paymentLinkId: string;
    expiredAt: string | null;
    payOSData: any;
  };
  isVenueOwner?: boolean;
  returnToVenueHome?: boolean;
  onPaymentSuccess?: () => void;
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
  WithdrawalScreen: undefined;

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
  PaymentWaitingScreenWallet: PaymentFlowData;

  // 🏢 VENUE OWNER PAYMENT SCREEN
  VenuePaymentWaitingScreen: VenuePaymentData;

  PhotoDeliveryScreen: {
    bookingId: number;
    customerName: string;
  };

  PhotographerEventScreen: {
    photographerId: number;
  };
  EventDetailScreen: { eventId: string };

  // Customer screens
  PhotographerCardDetail: { photographerId: string };

  LocationCardDetail: {
    locationId?: string;
    externalLocation?: GooglePlaceDisplay;
  };

  ViewAllPhotographers: {
    type?: "recommended" | "popular" | "user-styles" | "all";
    title?: string;
    userId?: number | null;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
  ViewAllLocations:
    | {
        type?: "nearby" | "all";
      }
    | undefined;
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

  // 🔧 FIXED: Booking - Updated external location type
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
    location?: {
      locationId: number;
      name: string;
      address?: string;
      hourlyRate?: number;
      imageUrl?: string;
      capacity?: number;
      styles?: string[];
      indoor?: boolean;
      outdoor?: boolean;
    };

    // 🆕 NEW: Use booking API format
    externalLocation?: BookingExternalLocation;

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
  VenueOwnerTransaction: undefined;
  VenueOwnerCreateLocation: undefined;

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

// 🔄 HELPER FUNCTIONS

// Convert Google Places display format to booking API format
export const convertToBookingExternalLocation = (
  googlePlace: GooglePlaceDisplay
): BookingExternalLocation => {
  return {
    placeId: googlePlace.placeId,
    name: googlePlace.name,
    address: googlePlace.address,
    description: undefined, // Can add description later if needed
    latitude: googlePlace.latitude,
    longitude: googlePlace.longitude,
    types: googlePlace.types?.join(","), // Convert array to string
  };
};

// Convert booking external location to display format
export const convertToGooglePlaceDisplay = (
  bookingLocation: BookingExternalLocation
): GooglePlaceDisplay => {
  return {
    placeId: bookingLocation.placeId,
    name: bookingLocation.name,
    address: bookingLocation.address,
    latitude: bookingLocation.latitude,
    longitude: bookingLocation.longitude,
    types: bookingLocation.types?.split(","), // Convert string to array
    rating: undefined,
    photoReference: undefined,
  };
};

// Type guards for LocationCardDetail params
export type LocationCardDetailParams = {
  locationId?: string;
  externalLocation?: GooglePlaceDisplay;
};

export const isAppLocation = (
  params: LocationCardDetailParams
): params is { locationId: string } => {
  return !!params.locationId && !params.externalLocation;
};

export const isExternalLocation = (
  params: LocationCardDetailParams
): params is {
  externalLocation: GooglePlaceDisplay;
} => {
  return !!params.externalLocation && !params.locationId;
};

// Type guards for Booking params
export type BookingParams = RootStackParamList["Booking"];

export const hasAppLocation = (params: BookingParams): boolean => {
  return !!params.location && !params.externalLocation;
};

export const hasExternalLocation = (params: BookingParams): boolean => {
  return !!params.externalLocation && !params.location;
};
