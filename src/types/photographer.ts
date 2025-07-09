import { PhotographerImage } from './photographerImage';

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
  profileImage?: string; // Avatar của photographer
  bio?: string;
  createAt?: string;
  updateAt?: string;
  status?: string;
  styles?: string[]; // Array of style names
  // Note: images field exists in API response but is deprecated (empty array)
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
  styleIds?: number[];
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
  styleIds?: number[];
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
  images?: PhotographerImage[];
  primaryImage?: PhotographerImage;
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
  bookingId?: number;
  reviewerId?: number;
  revieweeId?: number;
  revieweeType?: string;
  updatedAt?: string;
}

export interface PhotographerStats {
  totalBookings: number;
  averageRating: number;
  totalReviews: number;
  favoriteCount: number;
}

export interface RecommendedPhotographer {
  photographerId: number;
  fullName: string;
  specialty: string;
  hourlyRate: number;
  rating: number;
  availabilityStatus: string;
  profileImage: string;
  verificationStatus: string;
}

export interface StyleRecommendation {
  styleId: number;
  styleName: string;
  styleDescription: string;
  photographerCount: number;
  recommendedPhotographers: RecommendedPhotographer[];
}

// Extended interface for photographer with images (from PhotographerImage API)
export interface PhotographerWithImages extends Photographer {
  images: string[];
  primaryImage?: PhotographerImage;
}

