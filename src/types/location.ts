export interface Location {
  locationId: number;
  locationOwnerId: number;
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
  createdAt?: string;
  updatedAt?: string;
  // Add missing fields that exist in API response
  locationImages?: LocationImage[] | { $values: LocationImage[] };
  advertisements?: any[];
  locationOwner?: LocationOwner;
}

export interface LocationDto {
  locationOwnerId: number;
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
  locationImages?: LocationImage[];
}

export interface LocationOwner {
  locationOwnerId: number;
  userId: number;
  businessName?: string;
  businessAddress?: string;
  businessRegistrationNumber?: string;
  verificationStatus?: string;
  locations?: Location[];
  user?: {
    id: number;
    fullName: string;
    email?: string;
    phoneNumber?: string;
  };
}

export interface LocationOwnerDto {
  userId: number;
  businessName?: string;
  businessAddress?: string;
  businessRegistrationNumber?: string;
  verificationStatus?: string;
}

export interface LocationImage {
  locationImageId?: number;
  id?: number;
  locationId?: number;
  imageUrl: string;
  url?: string; // Alternative field name
  description?: string;
}

export interface LocationData {
  // ... các trường khác
  locationImages: LocationImage[];
}

// API Response interfaces to match actual structure
export interface LocationApiResponse extends Location {
  locationImages: LocationImage[];
  advertisements: any[];
  locationOwner: LocationOwner;
}