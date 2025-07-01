// services/api/photographer.ts
import { CreatePhotographerRequest, Photographer, Review, UpdatePhotographerRequest } from '../types';
import { apiClient } from './base';


// Photographer endpoints
const ENDPOINTS = {
  ALL: '/api/Photographer',
  BY_ID: (id: number) => `/api/Photographer/${id}`,
  DETAIL: (id: number) => `/api/Photographer/${id}/detail`,
  BY_SPECIALTY: (specialty: string) => `/api/Photographer/specialty/${specialty}`,
  AVAILABLE: '/api/Photographer/available',
  FEATURED: '/api/Photographer/featured',
  UPDATE_AVAILABILITY: (id: number) => `/api/Photographer/${id}/availability`,
  UPDATE_RATING: (id: number) => `/api/Photographer/${id}/rating`,
  VERIFY: (id: number) => `/api/Photographer/${id}/verify`,
  REVIEWS: (photographerId: number) => `/api/Review/photographer/${photographerId}`,
  AVERAGE_RATING: (photographerId: number) => `/api/Review/photographer/${photographerId}/average-rating`,
};

export const photographerService = {
  // Get all photographers
  getAll: (): Promise<Photographer[]> => 
    apiClient.get<Photographer[]>(ENDPOINTS.ALL),

  // Get photographer by ID
  getById: (id: number): Promise<Photographer> => 
    apiClient.get<Photographer>(ENDPOINTS.BY_ID(id)),

  // Get photographer detail
  getDetail: (id: number): Promise<Photographer> => 
    apiClient.get<Photographer>(ENDPOINTS.DETAIL(id)),

  // Get photographers by specialty
  getBySpecialty: (specialty: string): Promise<Photographer[]> => 
    apiClient.get<Photographer[]>(ENDPOINTS.BY_SPECIALTY(specialty)),

  // Get available photographers
  getAvailable: (): Promise<Photographer[]> => 
    apiClient.get<Photographer[]>(ENDPOINTS.AVAILABLE),

  // Get featured photographers
  getFeatured: (): Promise<Photographer[]> => 
    apiClient.get<Photographer[]>(ENDPOINTS.FEATURED),

  // Create photographer
  create: (data: CreatePhotographerRequest): Promise<Photographer> => 
    apiClient.post<Photographer>(ENDPOINTS.ALL, data),

  // Update photographer
  update: (id: number, data: UpdatePhotographerRequest): Promise<Photographer> => 
    apiClient.put<Photographer>(ENDPOINTS.BY_ID(id), data),

  // Delete photographer
  delete: (id: number): Promise<void> => 
    apiClient.delete<void>(ENDPOINTS.BY_ID(id)),

  // Update availability
  updateAvailability: (id: number, status: string): Promise<void> => 
    apiClient.patch<void>(ENDPOINTS.UPDATE_AVAILABILITY(id), status),

  // Update rating
  updateRating: (id: number, rating: number): Promise<void> => 
    apiClient.patch<void>(ENDPOINTS.UPDATE_RATING(id), rating),

  // Verify photographer
  verify: (id: number, status: string): Promise<void> => 
    apiClient.patch<void>(ENDPOINTS.VERIFY(id), status),

  // Get photographer reviews
  getReviews: (photographerId: number): Promise<Review[]> => 
    apiClient.get<Review[]>(ENDPOINTS.REVIEWS(photographerId)),

  // Get average rating
  getAverageRating: (photographerId: number): Promise<number> => 
    apiClient.get<number>(ENDPOINTS.AVERAGE_RATING(photographerId)),
};