export interface Review {
    id: number;
    bookingId: number;
    reviewerId: number;
    revieweeId: number;
    revieweeType: string;
    rating: number;
    comment?: string;
    createdAt: string;
    updatedAt?: string;
    reviewer?: {
      id: number;
      fullName: string;
      profilePictureUrl?: string;
    };
  }
  
  export interface CreateReviewRequest {
    bookingId: number;
    reviewerId: number;
    revieweeId: number;
    revieweeType: string;
    rating: number;
    comment?: string;
  }
  
  export interface UpdateReviewRequest {
    rating?: number;
    comment?: string;
  }