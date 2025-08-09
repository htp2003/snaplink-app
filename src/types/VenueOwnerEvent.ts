// types/VenueOwnerEvent.ts

// Event Status enum
export type EventStatus = "Draft" | "Open" | "Active" | "Closed" | "Cancelled";

// Application Status enum
export type ApplicationStatus =
  | "Applied"
  | "Approved"
  | "Rejected"
  | "Withdrawn";

// Booking Status enum
export type EventBookingStatus =
  | "Pending"
  | "Confirmed"
  | "Completed"
  | "Cancelled";

// Basic Location info for events
export interface EventLocation {
  locationId: number;
  name: string;
  address: string;
}

// Basic Photographer info for applications
export interface EventPhotographer {
  photographerId: number;
  userId: number;
  fullName: string;
  profileImage?: string;
  rating?: number;
  yearsExperience?: number;
  hourlyRate?: number;
}

// Event Image
export interface EventImage {
  id: number;
  url: string;
  eventId: number;
  isPrimary: boolean;
  caption?: string;
  createdAt: string;
}

// Main Event entity
export interface VenueOwnerEvent {
  eventId: number;
  locationId: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  discountedPrice?: number;
  originalPrice?: number;
  maxPhotographers: number;
  maxBookingsPerSlot: number;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;

  // Nested data
  location?: EventLocation;
  images?: EventImage[];
  primaryImage?: EventImage;

  // Counts (from API)
  approvedPhotographersCount?: number;
  totalBookingsCount?: number;
  totalApplicationsCount?: number;
  pendingApplicationsCount?: number;
}

// Event Application
export interface EventApplication {
  eventId: number;
  photographerId: number;
  specialRate?: number;
  status: ApplicationStatus;
  appliedAt: string;
  respondedAt?: string;
  rejectionReason?: string;

  // Nested data
  photographer?: EventPhotographer;
  event?: VenueOwnerEvent;
}

// Event Booking
export interface EventBooking {
  eventBookingId: number;
  eventId: number;
  eventPhotographerId: number;
  userId: number;
  startDatetime: string;
  endDatetime: string;
  specialRequests?: string;
  status: EventBookingStatus;
  totalAmount?: number;
  createdAt: string;
  updatedAt: string;

  // Nested data
  event?: VenueOwnerEvent;
  photographer?: EventPhotographer;
  customer?: {
    userId: number;
    fullName: string;
    profileImage?: string;
  };
}

// Event Statistics
export interface EventStatistics {
  eventId: number;
  eventName: string;
  eventStartDate: string;
  eventEndDate: string;
  eventStatus: EventStatus;
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
}

// Multi-location Events Dashboard Data
export interface VenueOwnerEventsDashboard {
  locations: {
    locationId: number;
    locationName: string;
    events: VenueOwnerEvent[];
    activeEventsCount: number;
    upcomingEventsCount: number;
    totalRevenue: number;
  }[];
  summary: {
    totalLocations: number;
    totalEvents: number;
    activeEvents: number;
    upcomingEvents: number;
    totalRevenue: number;
    totalBookings: number;
  };
}

// Request types for API calls
export interface CreateEventRequest {
  locationId: number;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  discountedPrice?: number;
  originalPrice?: number;
  maxPhotographers: number;
  maxBookingsPerSlot: number;
}

export interface UpdateEventRequest {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  discountedPrice?: number;
  originalPrice?: number;
  maxPhotographers?: number;
  maxBookingsPerSlot?: number;
  status?: EventStatus;
}

export interface EventApplicationResponse {
  eventId: number;
  photographerId: number;
  status: ApplicationStatus;
  rejectionReason?: string;
}

// Filter/Query interfaces
export interface EventFilters {
  locationId?: number;
  status?: EventStatus;
  startDate?: string;
  endDate?: string;
  searchTerm?: string;
}

export interface ApplicationFilters {
  eventId?: number;
  status?: ApplicationStatus;
  photographerId?: number;
}

export interface BookingFilters {
  eventId?: number;
  status?: EventBookingStatus;
  userId?: number;
  startDate?: string;
  endDate?: string;
}

// API Response wrappers
export interface EventApiResponse {
  error: number;
  message: string;
  data: VenueOwnerEvent;
}

export interface EventsApiResponse {
  error: number;
  message: string;
  data: VenueOwnerEvent[];
}

export interface ApplicationsApiResponse {
  error: number;
  message: string;
  data: EventApplication[];
}

export interface BookingsApiResponse {
  error: number;
  message: string;
  data: EventBooking[];
}

export interface StatisticsApiResponse {
  error: number;
  message: string;
  data: EventStatistics;
}
