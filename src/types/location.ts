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
  }
  
  export interface LocationOwner {
    locationOwnerId: number;
    userId: number;
    businessName?: string;
    businessAddress?: string;
    businessRegistrationNumber?: string;
    verificationStatus?: string;
  }
  
  export interface LocationOwnerDto {
    userId: number;
    businessName?: string;
    businessAddress?: string;
    businessRegistrationNumber?: string;
    verificationStatus?: string;
  }