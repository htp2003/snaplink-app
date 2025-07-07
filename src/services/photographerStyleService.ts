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
  
  export interface StyleRecommendation {
    styleId: number;
    styleName: string;
    styleDescription: string;
    photographerCount: number;
    recommendedPhotographers: RecommendedPhotographer[];
  }
  
  const ENDPOINTS = {
    USER_RECOMMENDATIONS: (userId: number, count: number = 10) => 
      `/api/UserStyle/user/${userId}/recommendations?count=${count}`,
  };
  
  export const photographerStyleService = {
    // Get style recommendations for user
    getPhotographerRecommendations: (userId: number, count: number = 10): Promise<StyleRecommendation[]> => 
      apiClient.get<StyleRecommendation[]>(ENDPOINTS.USER_RECOMMENDATIONS(userId, count)),
  };