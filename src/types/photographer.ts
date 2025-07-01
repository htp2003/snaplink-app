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