// types/photographerEvent.types.ts

export interface CreatePhotographerEventRequest {
  title?: string;
  description?: string;
  originalPrice?: number;
  discountedPrice?: number;
  discountPercentage?: number;
  startDate?: string; // ISO datetime string
  endDate?: string; // ISO datetime string
  maxBookings?: number;
  locationIds?: number[];
}

export interface Location {
  locationId: number;
  locationOwnerId: number;
  name: string;
  address: string;
  description: string;
  amenities: string | null;
  hourlyRate: number;
  capacity: number;
  indoor: boolean;
  outdoor: boolean;
  availabilityStatus: string;
  featuredStatus: boolean;
  verificationStatus: string | null;
  locationType: string;
  externalPlaceId: string;
  createdAt: string;
  updatedAt: string;
  advertisements: any[];
  bookings: any[];
  locationOwner: LocationOwner;
  photographerEventLocations: any[];
  images: any[];
}

export interface LocationOwner {
  locationOwnerId: number;
  userId: number;
  businessName: string;
  businessAddress: string;
  businessRegistrationNumber: string | null;
  verificationStatus: string | null;
  locations: any[];
  user: any;
}

export interface PhotographerEvent {
  id: number;
  photographerId: number;
  title: string;
  description: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  startDate: string;
  endDate: string;
  maxBookings: number;
  currentBookings: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  statusCode: number;
}

export interface CreateEventFormData {
  title: string;
  description: string;
  originalPrice: string;
  discountedPrice: string;
  discountPercentage: string;
  startDate: Date | null;
  endDate: Date | null;
  maxBookings: string;
  selectedLocationIds: number[];
}