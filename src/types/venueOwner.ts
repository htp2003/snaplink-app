// Base DTO structure from API
export interface LocationOwnerDto {
  userId: number;
  businessName?: string;
  businessAddress?: string;
  businessRegistrationNumber?: string;
  verificationStatus?: string;
}

// User data structure from API response
export interface UserData {
  userId: number;
  userName: string;
  email: string;
  phoneNumber?: string;
  fullName: string;
  profileImage?: string;
  bio?: string;
  createAt: string;
  updateAt: string;
  status: string;
  isVerified: boolean;
  // ... other fields we don't need for now
}

// Full LocationOwner entity from API (uses locationOwnerId instead of id)
export interface LocationOwner extends LocationOwnerDto {
  locationOwnerId: number; // API uses this field name instead of 'id'
  locations?: any[]; // We'll define this later when needed
  user?: UserData; // Full user object
  createdAt?: string;
  updatedAt?: string;

  // Add computed property for easier access
  get id(): number;
}

// Request types
export interface CreateLocationOwnerRequest {
  userId: number;
  businessName?: string;
  businessAddress?: string;
  businessRegistrationNumber?: string;
}

export interface UpdateLocationOwnerRequest {
  businessName?: string;
  businessAddress?: string;
  businessRegistrationNumber?: string;
}

// Verification status enum
export type VerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "unverified";
