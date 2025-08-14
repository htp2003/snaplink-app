// types/photographerEvent.ts

// ========== CORE ENUMS ==========

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

export enum BookingStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  CANCELLED = 'Cancelled',
  COMPLETED = 'Completed'
}

// ========== BASE INTERFACES ==========

export interface Location {
  locationId: number;
  name: string;
  address: string;
  description?: string;
  latitude?: number;
  longitude?: number;
}

export interface User {
  userId: number;
  fullName: string;
  email: string;
  phoneNumber?: string;
  profileImage?: string;
  bio?: string;
}

export interface Photographer {
  photographerId: number;
  userId: number;
  fullName?: string;
  profileImage?: string;
  rating?: number;
  verificationStatus?: string;
  hourlyRate?: number;
  specialtyStyles?: string[];
  yearsExperience?: number;
  equipment?: string;
}

export interface EventImage {
  id: number;
  url: string;
  eventId?: number;
  isPrimary: boolean;
  caption?: string;
  createdAt: string;
}

// ========== CORE EVENT INTERFACE ==========

export interface LocationEvent {
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
  updatedAt?: string;
  
  // Relationship data
  location?: Location;
  images?: EventImage[];
  primaryImage?: EventImage;
  
  // Computed counts from API
  approvedPhotographersCount: number;
  totalBookingsCount: number;
  pendingApplicationsCount?: number;
  
  // Status flags
  isActive?: boolean;
  isUpcoming?: boolean;
  isFeatured?: boolean;
  
  // Flattened location data (from API response)
  locationName?: string;
  locationAddress?: string;
  locationLatitude?: number;
  locationLongitude?: number;
}

// ========== ENHANCED EVENT FOR UI ==========

export interface EnhancedLocationEvent extends LocationEvent {
  // Calculated fields for display
  isHot?: boolean;
  isTrending?: boolean;
  slotsAvailable?: number;
  bookingRate?: number; // 0-1
  daysUntilStart?: number;
  hoursUntilStart?: number;
  hasEarlyBirdDiscount?: boolean;
  discountPercentage?: number;
  
  // Competition & social proof
  competitorCount?: number;
  recentBookingsCount?: number; // last 24h
  popularityScore?: number; // calculated ranking
  
  // For customer view
  recommendedPhotographers?: Photographer[];
  priceRange?: {
    min: number;
    max: number;
    average: number;
  };
  
  // Urgency indicators
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  urgencyReasons?: string[]; // ["Few slots left", "Early bird ending"]
}

// ========== EVENT APPLICATION (PHOTOGRAPHER SIDE) ==========

export interface EventApplication {
  eventApplicationId?: number;
  eventPhotographerId?: number; // From API response
  eventId: number;
  photographerId: number;
  specialRate?: number;
  status: ApplicationStatus;
  appliedAt: string;
  respondedAt?: string;
  approvedAt?: string;
  rejectionReason?: string;
  
  // Flattened event info from API
  eventName?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventStatus?: string;
  eventLocationName?: string;
  eventDiscountedPrice?: number;
  eventOriginalPrice?: number;
  
  // Flattened photographer info from API
  photographerName?: string;
  photographerProfileImage?: string;
  photographerRating?: number;
  
  // Nested objects (might not be included)
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
  approvedAt?: string;
  rejectionReason?: string;
  
  // Nested data
  photographer?: Photographer;
  event?: LocationEvent;
}

// ========== EVENT BOOKING (CUSTOMER SIDE) ==========

export interface EventBooking {
  eventBookingId: number;
  eventId: number;
  eventPhotographerId: number; // Which approved photographer user chose
  userId: number;
  startDatetime: string;
  endDatetime: string;
  specialRequests?: string;
  status: BookingStatus;
  totalPrice?: number;
  paymentStatus?: string;
  createdAt: string;
  updatedAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
  
  // Nested relationship data
  event?: LocationEvent;
  photographer?: Photographer;
  user?: User;
  
  // Flattened data from API
  eventName?: string;
  eventStartDate?: string;
  eventEndDate?: string;
  eventLocationName?: string;
  eventLocationAddress?: string;
  photographerName?: string;
  photographerProfileImage?: string;
  photographerRating?: number;
  customerName?: string;
  customerProfileImage?: string;
}

// ========== REQUEST TYPES ==========

export interface EventApplicationRequest {
  eventId: number;
  photographerId: number;
  specialRate?: number;
}

export interface EventBookingRequest {
  eventId: number;
  eventPhotographerId: number; // Must be from approved photographers
  userId: number;
  startDatetime: string;
  endDatetime: string;
  specialRequests?: string;
}

export interface CreateLocationEventRequest {
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

export interface UpdateLocationEventRequest {
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

// ========== STATISTICS & ANALYTICS ==========

export interface EventStatistics {
  eventId: number;
  eventName: string;
  
  // Application stats
  totalApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  pendingApplications: number;
  withdrawnApplications: number;
  
  // Booking stats
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  completedBookings: number;
  
  // Capacity & availability
  maxSlots: number;
  availableSlots: number;
  occupancyRate: number; // 0-1
  
  // Financial
  totalRevenue: number;
  averageBookingValue: number;
  discountGiven?: number;
  
  // Performance metrics
  applicationToApprovalRate: number;
  bookingToCompletionRate: number;
  cancellationRate: number;
  
  // Time metrics
  averageApplicationResponseTime?: number; // hours
  averageBookingTime?: number; // hours from event creation
  
  // Recent activity (last 24h)
  recentApplications: number;
  recentBookings: number;
  recentCancellations: number;
}

export interface EventActivity {
  eventId: number;
  bookingCount: number;
  photographerCount: number;
  recentBookings: number; // last 24h
  recentApplications: number; // last 24h
  trendingScore: number; // calculated score 0-100
  velocityScore: number; // booking speed indicator
}

// ========== FILTERING & SEARCH ==========

export interface EventFilters {
  searchTerm?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export interface CustomerEventFilters extends EventFilters {
  // Price filters
  minPrice?: number;
  maxPrice?: number;
  hasDiscount?: boolean;
  
  // Status filters
  eventStatus?: EventStatus[];
  onlyAvailable?: boolean; // has available slots
  
  // Date filters
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  
  // Location filters
  locationIds?: number[];
  maxDistance?: number; // km from user location
  
  // Photographer filters
  photographerRequired?: boolean;
  minPhotographerRating?: number;
  photographerStyleIds?: number[];
  
  // Event features
  eventTypes?: string[]; // workshop, meetup, competition
  minDuration?: number; // hours
  maxDuration?: number; // hours
  
  // Sorting
  sortBy?: 'date' | 'price' | 'popularity' | 'discount' | 'distance' | 'rating';
  sortOrder?: 'asc' | 'desc';
  
  // UI filters
  onlyFeatured?: boolean;
  onlyHot?: boolean;
  onlyTrending?: boolean;
}

export interface PhotographerEventFilters extends EventFilters {
  // Application status
  applicationStatus?: ApplicationStatus[];
  canApply?: boolean; // not applied yet and eligible
  
  // Event characteristics
  minRate?: number;
  maxRate?: number;
  eventTypes?: string[];
  
  // Competition level
  maxCompetitors?: number;
  minSlots?: number;
  
  // Sorting
  sortBy?: 'date' | 'rate' | 'competition' | 'distance';
  sortOrder?: 'asc' | 'desc';
}

// ========== HOT EVENTS LOGIC ==========

export interface HotEventCriteria {
  minBookingRate: number; // 0.7 = 70% booked
  maxDaysUntilStart: number; // 7 days
  minRecentActivity: number; // bookings in last 24h
  requiresDiscount: boolean;
  minPhotographerCount: number;
  maxSlotsRemaining: number;
}

export interface EventTrendingMetrics {
  bookingVelocity: number; // bookings per hour
  applicationVelocity: number; // applications per hour
  socialEngagement: number; // views, favorites, shares
  competitionLevel: number; // photographer interest
  urgencyScore: number; // time + availability pressure
  overallTrendingScore: number; // 0-100
}

// ========== API RESPONSE WRAPPERS ==========

export interface ApiResponse<T> {
  error: number; // 0 = success, 1+ = error
  message: string;
  data: T;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// ========== EVENT CATEGORIES FOR UI ==========

export interface EventCategory {
  id: string;
  name: string;
  icon: string;
  description?: string;
  color?: string;
  count?: number;
  featured?: boolean;
}

export interface EventSection {
  id: string;
  title: string;
  subtitle?: string;
  type: 'carousel' | 'grid' | 'banner' | 'timeline';
  events: EnhancedLocationEvent[];
  showSeeAll?: boolean;
  loading?: boolean;
  error?: string;
}

// ========== NOTIFICATION TYPES ==========

export interface EventNotification {
  id: string;
  type: 'application_approved' | 'application_rejected' | 'booking_confirmed' | 
        'booking_cancelled' | 'event_starting_soon' | 'slot_available' | 'price_drop';
  eventId: number;
  userId: number;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

// ========== ERROR TYPES ==========

export interface EventError {
  code: string;
  message: string;
  details?: Record<string, any>;
  retryable?: boolean;
}

// ========== EXPORT ALL ==========
