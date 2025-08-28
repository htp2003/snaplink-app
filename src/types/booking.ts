import type { PaymentResponse, CreatePaymentLinkRequest } from './payment';

export interface CreateBookingRequest {
  photographerId: number;
  locationId?: number;
  externalLocation?: ExternalLocationRequest;
  startDatetime: string; 
  endDatetime: string;   
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

}

export interface ExternalLocationResponse extends ExternalLocationRequest {
  id: number;
  createdAt?: string;
  updatedAt?: string;
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
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
  escrowBalance: number;
  // Extended fields
  photographer?: {
    photographerId: number;
    fullName: string;
    profileImage: string;
    hourlyRate: number;
  };
  location?: {
    id: number;
    locationId: number;
    name: string;
    address: string;
    hourlyRate?: number;
  };
}

// Simple response for API that only returns boolean
export interface SimpleAvailabilityResponse {
  available: boolean;
}

export interface PriceCalculationResponse {
  totalPrice: number;
  photographerFee: number;
  locationFee?: number;
  serviceFee?: number;
  duration: number; 
  breakdown: {
    baseRate: number;
    locationRate?: number;
    additionalFees?: {
      name: string;
      address: string;
      hourlyRate: number;
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

// 📝 UPDATED: Added UNDER_REVIEW status
export enum BookingStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  IN_PROGRESS = 'In Progress',
  COMPLETED = 'Completed',
  CANCELLED = 'Cancelled',
  EXPIRED = 'Expired',
  UNDER_REVIEW = 'Under_Review'
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

export interface CheckAvailabilityResponse {
  available: boolean;
  conflictingBookings?: any[];
  suggestedTimes?: string[];
  message?: string;
}

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

// 📝 UPDATED: Added Under_Review for photographer status
export type BookingStatusPhotographer = 
  | 'Pending' 
  | 'Confirmed' 
  | 'Cancelled' 
  | 'Completed' 
  | 'InProgress'
  | 'Under_Review'
  | 'Complaints'


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
  userName: string;
  customerPhone: string;
  customerEmail: string;
  serviceType: string;
  locationName: string;
  locationAddress: string;
  date: string;
  time: string;
  duration: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'in-progress' | 'under-review'; 
  description: string;
  createdAt: string;
  specialRequests?: string;
  hasPayment: boolean;
  paymentStatus: string;
  paymentAmount: number | null;
  pricePerHour: number;
}

// ===== TRANSACTION & WALLET TYPES =====
export interface TransactionResponse {
  id: number;
  userId: number;
  amount: number;
  type: string;
  status: string;
  description: string;
  bookingId?: number;
  createdAt: string;
}

export interface WalletBalanceResponse {
  userId: number;
  balance: number;
  currency: string;
}

// ===== RE-EXPORT PAYMENT TYPES for backward compatibility =====
export type { PaymentResponse, CreatePaymentLinkRequest };