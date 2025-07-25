// types/booking.ts
export interface CreateBookingRequest {
    photographerId: number;
    locationId?: number;
    externalLocation?: ExternalLocationRequest;
    startDatetime: string; // ISO datetime string
    endDatetime: string;   // ISO datetime string
    specialRequests?: string;
  }
  
  export interface UpdateBookingRequest {
    startDatetime?: string;
    endDatetime?: string;
    specialRequests?: string;
    status?: string;
  }
  
  export interface ExternalLocationRequest {
    placeId: string;
    name: string;
    address: string;
    description?: string;
    latitude?: number;
    longitude?: number;
    photoReference?: string;
    types?: string;
  }
  
  export interface BookingResponse {
    id: number;
    bookingId: number;
    userId: number;
    photographerId: number;
    locationId?: number;
    externalLocation?: ExternalLocationResponse;
    startDatetime: string;
    endDatetime: string;
    specialRequests?: string;
    status: BookingStatus;
    totalAmount: number;
    createdAt: string;
    updatedAt: string;
    // Extended fields
    photographer?: {
      photographerId: number;
      fullName: string;
      profileImage: string;
      hourlyRate: number;
    };
    location?: {
      locationId: number;
      name: string;
      address: string;
      hourlyRate?: number;
    };
  }
  
  export interface ExternalLocationResponse extends ExternalLocationRequest {
    id: number;
  }
  
  export interface AvailabilityResponse {
    available: boolean;
    conflictingBookings?: BookingResponse[];
    suggestedTimes?: string[];
    message?: string;
  }
  
  // Alternative simple response for API that only returns boolean
  export interface SimpleAvailabilityResponse {
    available: boolean;
  }
  
  export interface PriceCalculationResponse {
    totalPrice: number;
    photographerFee: number;
    locationFee?: number;
    serviceFee?: number;
    duration: number; // in hours
    breakdown: {
      baseRate: number;
      locationRate?: number;
      additionalFees?: {
        name: string;
        amount: number;
      }[];
    };
  }
  
  export interface BookingListResponse {
    bookings: BookingResponse[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }
  
  export enum BookingStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
    EXPIRED = 'expired'
  }
  
  export interface BookingFilters {
    status?: BookingStatus;
    startDate?: string;
    endDate?: string;
    photographerId?: number;
    userId?: number;
    page?: number;
    pageSize?: number;
  }
  
  // Hook interfaces
  export interface UseBookingOptions {
    userId?: number;
    photographerId?: number;
    autoFetch?: boolean;
  }
  
  export interface BookingFormData {
    photographerId: number;
    selectedDate: Date;
    selectedStartTime: string;
    selectedEndTime: string;
    selectedLocation?: any; // From useLocations
    specialRequests: string;
    useExternalLocation: boolean;
    externalLocation?: ExternalLocationRequest;
  }
  
  export interface BookingValidationErrors {
    photographer?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    general?: string;
  }

  // types/booking.ts

export interface Booking {
  bookingId: number;
  userId: number;
  userName: string;
  userEmail: string;
  photographerId: number;
  photographerName: string;
  photographerEmail: string;
  locationId: number;
  locationName: string;
  locationAddress: string;
  startDatetime: string;
  endDatetime: string;
  status: BookingStatusPhotographer;
  specialRequests: string | null;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  hasPayment: boolean;
  paymentStatus: string;
  paymentAmount: number | null;
  durationHours: number;
  pricePerHour: number;
}

export type BookingStatusPhotographer = 
  | 'Pending' 
  | 'Confirmed' 
  | 'Cancelled' 
  | 'Completed' 
  | 'InProgress';

export interface BookingListResponse {
  error: number;
  message: string;
  data: {
    bookings: Booking[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface BookingQueryParams {
  page?: number;
  pageSize?: number;
}

export interface UpdateBookingStatusRequest {
  bookingId: number;
  status: BookingStatusPhotographer;
}

export interface ApiResponse<T> {
  error: number;
  message: string;
  data: T;
}

// Mapped types for UI
export interface BookingCardData {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  serviceType: string;
  location: string;
  locationAddress: string;
  date: string;
  time: string;
  duration: number;
  price: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'in-progress';
  description: string;
  createdAt: string;
  specialRequests?: string;
  hasPayment: boolean;
  paymentStatus: string;
  paymentAmount: number | null;
  pricePerHour: number;
}