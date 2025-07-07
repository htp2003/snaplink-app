export interface Photographer {
    $id?: string;
    photographerId: number;
    userId?: number;
    yearsExperience?: number;
    equipment?: string;
    specialty?: string;
    portfolioUrl?: string;
    hourlyRate?: number;
    availabilityStatus?: string;
    rating?: number;
    ratingSum?: number;
    ratingCount?: number;
    featuredStatus?: boolean;
    verificationStatus?: string;
    userName?: string;
    email?: string;
    phoneNumber?: string;
    fullName?: string;
    profileImage?: string;
    bio?: string;
    createAt?: string;
    updateAt?: string;
    status?: string;
    styles?: { $id: string; $values: string[] } | string[];
  }
  
  
  export interface CreatePhotographerRequest {
    userId: number;
    yearsExperience?: number;
    equipment?: string;
    specialty?: string;
    portfolioUrl?: string;
    hourlyRate?: number;
    availabilityStatus?: string;
    rating?: number;
    ratingSum?: number;
    ratingCount?: number;
    featuredStatus?: boolean;
    verificationStatus?: string;
  }
  
  export interface UpdatePhotographerRequest {
    yearsExperience?: number;
    equipment?: string;
    specialty?: string;
    portfolioUrl?: string;
    hourlyRate?: number;
    availabilityStatus?: string;
    rating?: number;
    ratingSum?: number;
    ratingCount?: number;
    featuredStatus?: boolean;
    verificationStatus?: string;
  }

  export interface PhotographerProfile {
  id: number;
  userId: number;
  photographerId: number;
  user?: {
    id: number;
    fullName: string;
    email: string;
    phoneNumber: string;
    profileImage?: string;
    bio?: string;
  };
  yearsExperience?: number;
  equipment?: string;
  specialty?: string;
  portfolioUrl?: string;
  hourlyRate?: number;
  availabilityStatus?: string;
  rating?: number;
  ratingSum?: number;
  ratingCount?: number;
  featuredStatus?: boolean;
  verificationStatus?: string;
  styles?: PhotographerStyle[];
  reviews?: Review[];
}

export interface PhotographerStyle {
  id: number;
  name: string;
  description?: string;
}

export interface Review {
  id: number;
  rating: number;
  comment?: string;
  reviewerName?: string;
  createdAt: string;
}

export interface PhotographerStats {
  totalBookings: number;
  averageRating: number;
  totalReviews: number;
  favoriteCount: number;
}