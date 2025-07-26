export interface VenueOwner {
  id: number;
  userId: number;
  businessName: string;
  businessLicense: string;
  taxCode: string;
  subscriptionType: "free" | "premium" | "pro";
  subscriptionExpires?: string;
  monthlyFeaturedVenues: number;
  featuredUsedThisMonth: number;
  totalVenues: number;
  totalBookings: number;
  totalEarnings: number;
  averageRating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
}

export interface Venue {
  id: number;
  ownerId: number;
  name: string;
  description: string;
  address: string;
  district: string;
  city: string;
  latitude?: number;
  longitude?: number;
  venueType:
    | "cafe"
    | "studio"
    | "garden"
    | "rooftop"
    | "beach"
    | "park"
    | "indoor"
    | "outdoor";
  capacity: number;
  hourlyRate: number;
  minBookingHours: number;
  maxBookingHours: number;
  amenities: string[];
  rules?: string;
  cancellationPolicy?: string;
  isActive: boolean;
  isFeatured: boolean;
  featuredUntil?: string;
  totalBookings: number;
  averageRating: number;
  totalReviews: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VenueImage {
  id: number;
  venueId: number;
  imageUrl: string;
  title?: string;
  description?: string;
  isCover: boolean;
  orderIndex: number;
  createdAt: string;
}

export interface VenueAvailability {
  id: number;
  venueId: number;
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  createdAt: string;
}

export interface VenueBooking {
  id: number;
  bookingCode: string;
  userId: number;
  photographerId: number;
  venueId: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  numberOfPeople: number;
  specialRequests?: string;
  photographerFee: number;
  venueFee: number;
  totalAmount: number;
  status:
    | "pending"
    | "confirmed"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "refunded";
  cancellationReason?: string;
  cancelledBy?: "user" | "photographer" | "venue_owner" | "admin";
  cancelledAt?: string;
  confirmedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VenueAnalytics {
  totalBookings: number;
  totalRevenue: number;
  averageRating: number;
  completionRate: number;
  monthlyData: {
    month: string;
    bookings: number;
    revenue: number;
  }[];
  bookingsByTime: {
    timeSlot: string;
    count: number;
  }[];
  topPhotographers: {
    photographerId: number;
    photographerName: string;
    bookings: number;
    revenue: number;
  }[];
}

// Create/Update DTOs
export interface CreateVenueOwnerDto {
  userId: number;
  businessName: string;
  businessAddress: string;
  businessRegistrationNumber: string;
  verificationStatus?: string;
}

export interface UpdateVenueOwnerDto {
  businessName?: string;
  businessAddress?: string;
  businessRegistrationNumber?: string;
  verificationStatus?: string;
}

export interface CreateVenueDto {
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

export interface UpdateVenueDto {
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
}
