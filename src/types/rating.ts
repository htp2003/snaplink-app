// types/rating.ts - Rating Types and Interfaces

export interface RatingResponse {
  id: number;
  bookingId: number;
  reviewerUserId: number;
  photographerId?: number | null;
  locationId?: number | null;
  score: number;
  comment?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  
  // Populated fields from API
  reviewerName?: string;
  photographerName?: string;
  locationName?: string;
  bookingDate?: string;
}

export interface CreateRatingRequest {
  bookingId: number;
  reviewerUserId: number;
  photographerId?: number | null; 
  locationId?: number | null;     
  score: number;                  
  comment?: string | null;
}

export interface UpdateRatingRequest {
  score: number;
  comment?: string | null;
}

// Rating target type for validation
export type RatingTarget = 'photographer' | 'location';

export interface RatingTargetInfo {
  type: RatingTarget;
  id: number;
  name?: string;
}

// Hook options
export interface UseRatingOptions {
  userId?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// Validation errors
export interface RatingValidationErrors {
  bookingId?: string;
  reviewerUserId?: string;
  target?: string;
  score?: string;
  comment?: string;
  general?: string;
}

// API responses
export interface RatingAPIResponse {
  error: number;
  message: string;
  data?: RatingResponse | RatingResponse[];
}

export interface CreateRatingResult {
  success: boolean;
  rating?: RatingResponse;
  error?: string;
}

export interface UpdateRatingResult {
  success: boolean;
  rating?: RatingResponse;
  error?: string;
}

// Rating statistics
export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// Rating filters
export interface RatingFilters {
  photographerId?: number;
  locationId?: number;
  bookingId?: number;
  reviewerUserId?: number;
  minScore?: number;
  maxScore?: number;
  hasComment?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

// Paginated rating response
export interface PaginatedRatingResponse {
  ratings: RatingResponse[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Rating submission data for UI forms
export interface RatingSubmissionData {
  target: RatingTargetInfo;
  bookingId: number;
  score: number;
  comment?: string;
}

// Constants
export const RATING_SCORES = {
  MIN: 1,
  MAX: 5,
  DEFAULT: 5
} as const;

export const RATING_LABELS = {
  1: 'Rất tệ',
  2: 'Tệ', 
  3: 'Bình thường',
  4: 'Tốt',
  5: 'Xuất sắc'
} as const;

export const RATING_COLORS = {
  1: '#f44336', // Red
  2: '#ff9800', // Orange  
  3: '#ffeb3b', // Yellow
  4: '#8bc34a', // Light Green
  5: '#4caf50'  // Green
} as const;