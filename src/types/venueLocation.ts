// types/venueLocation.ts

import { LocationOwner } from "./venueOwner";

// Location Type enum
export type LocationType = "Registered" | "External";

// Availability Status enum
export type AvailabilityStatus = "Available" | "Unavailable" | "Maintenance";

// Verification Status enum
export type LocationVerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | null;

// Base Location DTO for API requests
export interface LocationDto {
  locationOwnerId: number;
  name: string;
  address: string;
  description?: string;
  amenities?: string;
  hourlyRate?: number;
  capacity?: number;
  indoor?: boolean;
  outdoor?: boolean;
  availabilityStatus?: string;
  featuredStatus?: boolean;
  verificationStatus?: string;
}

// Image interface (basic structure)
export interface LocationImage {
  id: number;
  url: string;
  locationId: number;
  isPrimary: boolean;
  caption?: string;
  createdAt: string;
}

// Booking interface (basic structure)
export interface LocationBooking {
  id: number;
  locationId: number;
  // Add other booking fields as needed
}

// Advertisement interface (basic structure)
export interface LocationAdvertisement {
  id: number;
  locationId: number;
  // Add other advertisement fields as needed
}

// Full Location entity from API response
export interface VenueLocation {
  locationId: number;
  locationOwnerId: number;
  name: string;
  address: string;
  description?: string;
  amenities?: string;
  hourlyRate?: number;
  capacity?: number;
  indoor?: boolean;
  outdoor?: boolean;
  availabilityStatus: string;
  featuredStatus?: boolean;
  verificationStatus?: string;
  locationType: LocationType;
  externalPlaceId?: string;
  createdAt: string;
  updatedAt: string;
  latitude?: number;
  longitude?: number;

  // Nested relationships
  locationOwner?: LocationOwner;
  images?: LocationImage[];
  bookings?: LocationBooking[];
  advertisements?: LocationAdvertisement[];
  photographerEventLocations?: any[]; // Define later if needed
}

// Request types for API calls
export interface CreateLocationRequest {
  locationOwnerId: number;
  name: string;
  address: string;
  description?: string;
  amenities?: string;
  hourlyRate?: number;
  capacity?: number;
  indoor?: boolean;
  outdoor?: boolean;
  availabilityStatus?: string;
  featuredStatus?: boolean;
  verificationStatus?: string;
  locationType?: LocationType;
  externalPlaceId?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateLocationRequest {
  name?: string;
  address?: string;
  description?: string;
  amenities?: string;
  hourlyRate?: number;
  capacity?: number;
  indoor?: boolean;
  outdoor?: boolean;
  availabilityStatus?: string;
  featuredStatus?: boolean;
  verificationStatus?: string;
  latitude?: number;
  longitude?: number;
}

// Filter/Query interfaces
export interface LocationFilters {
  locationOwnerId?: number;
  availabilityStatus?: AvailabilityStatus;
  locationType?: LocationType;
  indoor?: boolean;
  outdoor?: boolean;
  minHourlyRate?: number;
  maxHourlyRate?: number;
  minCapacity?: number;
  maxCapacity?: number;
}
