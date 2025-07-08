import { apiClient } from './base';

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
  

  
  const ENDPOINTS = {
    USER_RECOMMENDATIONS: (userId: number, count: number = 10) => 
      `/api/UserStyle/user/${userId}/photographers?count=${count}`,
  };

  export const photographerStyleService = {
    // Get style recommendations for user
    getPhotographerRecommendations: (userId: number, count: number = 10): Promise<RecommendedPhotographer[]> => 
      apiClient.get<RecommendedPhotographer[]>(ENDPOINTS.USER_RECOMMENDATIONS(userId, count)),
  };