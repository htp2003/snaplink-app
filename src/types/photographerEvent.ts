// types/photographerEvent.ts

export interface LocationEvent {
  eventId: number;
  locationId: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  discountedPrice?: number;
  originalPrice?: number;
  maxPhotographers?: number;
  maxBookingsPerSlot?: number;
  status: EventStatus;
  createdAt?: string;
  updatedAt?: string;
  location?: Location;
  images?: EventImage[];
  primaryImage?: EventImage;
  approvedPhotographersCount: number;
  totalBookingsCount: number;
  isActive?: boolean;
  isUpcoming?: boolean;
  locationName?: string;
  locationAddress?: string;
}

export interface Location {
  locationId: number;
  name: string;
  address: string;
  description?: string;
}

export interface EventImage {
  id: number;
  url: string;
  eventId?: number;
  isPrimary: boolean;
  caption?: string;
  createdAt: string;
}

export interface EventApplication {
  eventApplicationId?: number; // Có thể không có trong response
  eventPhotographerId?: number; // Từ API response
  eventId: number;
  photographerId: number;
  specialRate: number;
  status: ApplicationStatus;
  appliedAt: string;
  respondedAt?: string;
  approvedAt?: string; // Từ API response
  rejectionReason?: string;
  // Flattened event info từ API
  eventName?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventStatus?: string;
  // Flattened photographer info từ API
  photographerName?: string;
  photographerProfileImage?: string;
  photographerRating?: number;
  // Nested objects (có thể không có)
  event?: LocationEvent;
  photographer?: Photographer;
}

export interface EventPhotographer {
  eventPhotographerId: number;
  eventId: number;
  photographerId: number;
  specialRate?: number;
  status: ApplicationStatus;
  appliedAt: string;
  respondedAt?: string;
  rejectionReason?: string;
  photographer?: Photographer;
}

export interface Photographer {
  photographerId: number;
  userId: number;
  fullName?: string;
  profileImage?: string;
  rating?: number;
  verificationStatus?: string;
}

// Enums
export enum EventStatus {
  DRAFT = 'Draft',
  OPEN = 'Open',
  ACTIVE = 'Active',
  CLOSED = 'Closed',
  CANCELLED = 'Cancelled'
}

export enum ApplicationStatus {
  APPLIED = 'Applied',
  APPROVED = 'Approved',
  REJECTED = 'Rejected',
  WITHDRAWN = 'Withdrawn'
}

// Request Types for Photographer Flow
export interface EventApplicationRequest {
  eventId: number;
  photographerId: number;
  specialRate?: number;
}

export interface ApiResponse<T> {
  error: number;
  message: string;
  data: T;
}

// Filter Types
export interface EventFilters {
  searchTerm?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}