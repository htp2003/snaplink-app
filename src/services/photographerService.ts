import { 
  CreatePhotographerRequest, 
  Photographer, 
  PhotographerWithImages,
  Review, 
  UpdatePhotographerRequest, 
  PhotographerProfile, 
  PhotographerStyle, 
  PhotographerStats
} from '../types/photographer';
import { 
  PhotographerImage,
  CreatePhotographerImageRequest,
  UpdatePhotographerImageRequest
} from '../types/photographerImage';
import { apiClient } from './base';

// Photographer endpoints
const ENDPOINTS = {
  ALL: '/api/Photographer',
  BY_ID: (id: number) => `/api/Photographer/${id}`,
  DETAIL: (id: number) => `/api/Photographer/${id}/detail`,
  BY_SPECIALTY: (specialty: string) => `/api/Photographer/specialty/${specialty}`,
  BY_STYLE: (styleName: string) => `/api/Photographer/style/${styleName}`,
  AVAILABLE: '/api/Photographer/available',
  FEATURED: '/api/Photographer/featured',
  UPDATE_AVAILABILITY: (id: number) => `/api/Photographer/${id}/availability`,
  UPDATE_RATING: (id: number) => `/api/Photographer/${id}/rating`,
  VERIFY: (id: number) => `/api/Photographer/${id}/verify`,
  STYLES: (id: number) => `/api/Photographer/${id}/styles`,
  ADD_STYLE: (id: number, styleId: number) => `/api/Photographer/${id}/styles/${styleId}`,
  REMOVE_STYLE: (id: number, styleId: number) => `/api/Photographer/${id}/styles/${styleId}`,
  REVIEWS: (photographerId: number) => `/api/Review/photographer/${photographerId}`,
  AVERAGE_RATING: (photographerId: number) => `/api/Review/photographer/${photographerId}/average-rating`,
  
  // PhotographerImage endpoints
  IMAGES: (photographerId: number) => `/api/PhotographerImage/photographer/${photographerId}`,
  PRIMARY_IMAGE: (photographerId: number) => `/api/PhotographerImage/photographer/${photographerId}/primary`,
  IMAGE_BY_ID: (id: number) => `/api/PhotographerImage/${id}`,
  ALL_IMAGES: '/api/PhotographerImage/all',
  CREATE_IMAGE: '/api/PhotographerImage',
  UPDATE_IMAGE: '/api/PhotographerImage',
  DELETE_IMAGE: (id: number) => `/api/PhotographerImage/${id}`,
  SET_PRIMARY: (id: number) => `/api/PhotographerImage/${id}/set-primary`,
};

export const photographerService = {
  // Get all photographers
  getAll: (): Promise<Photographer[]> => 
    apiClient.get<Photographer[]>(ENDPOINTS.ALL),

  // Get photographer by ID
  getById: (id: number): Promise<Photographer> => 
    apiClient.get<Photographer>(ENDPOINTS.BY_ID(id)),

  // Get photographer detail (with user info)
  getDetail: (id: number): Promise<PhotographerProfile> => 
    apiClient.get<PhotographerProfile>(ENDPOINTS.DETAIL(id)),

  // Get photographers by specialty
  getBySpecialty: (specialty: string): Promise<Photographer[]> => 
    apiClient.get<Photographer[]>(ENDPOINTS.BY_SPECIALTY(specialty)),

  // Get photographers by style
  getByStyle: (styleName: string): Promise<Photographer[]> => 
    apiClient.get<Photographer[]>(ENDPOINTS.BY_STYLE(styleName)),

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

  // Get photographer styles
  getStyles: (id: number): Promise<PhotographerStyle[]> => 
    apiClient.get<PhotographerStyle[]>(ENDPOINTS.STYLES(id)),

  // Add style to photographer
  addStyle: (photographerId: number, styleId: number): Promise<void> => 
    apiClient.post<void>(ENDPOINTS.ADD_STYLE(photographerId, styleId)),

  // Remove style from photographer
  removeStyle: (photographerId: number, styleId: number): Promise<void> => 
    apiClient.delete<void>(ENDPOINTS.REMOVE_STYLE(photographerId, styleId)),

  // Get photographer reviews
  getReviews: (photographerId: number): Promise<Review[]> => 
    apiClient.get<Review[]>(ENDPOINTS.REVIEWS(photographerId)),

  // Get average rating
  getAverageRating: (photographerId: number): Promise<{ averageRating: number }> => 
    apiClient.get<{ averageRating: number }>(ENDPOINTS.AVERAGE_RATING(photographerId)),

  // === PHOTOGRAPHER IMAGE METHODS ===

  // Get all images for a photographer
  getImages: (photographerId: number): Promise<PhotographerImage[]> => 
    apiClient.get<PhotographerImage[]>(ENDPOINTS.IMAGES(photographerId)),

  // Get primary image for a photographer
  getPrimaryImage: (photographerId: number): Promise<PhotographerImage> => 
    apiClient.get<PhotographerImage>(ENDPOINTS.PRIMARY_IMAGE(photographerId)),

  // Get image by ID
  getImageById: (id: number): Promise<PhotographerImage> => 
    apiClient.get<PhotographerImage>(ENDPOINTS.IMAGE_BY_ID(id)),

  // Get all images (admin)
  getAllImages: (): Promise<PhotographerImage[]> => 
    apiClient.get<PhotographerImage[]>(ENDPOINTS.ALL_IMAGES),

  // Create new image
  createImage: (data: CreatePhotographerImageRequest): Promise<PhotographerImage> => 
    apiClient.post<PhotographerImage>(ENDPOINTS.CREATE_IMAGE, data),

  // Update image
  updateImage: (data: UpdatePhotographerImageRequest): Promise<PhotographerImage> => 
    apiClient.put<PhotographerImage>(ENDPOINTS.UPDATE_IMAGE, data),

  // Delete image
  deleteImage: (id: number): Promise<void> => 
    apiClient.delete<void>(ENDPOINTS.DELETE_IMAGE(id)),

  // Set image as primary
  setPrimaryImage: (id: number): Promise<void> => 
    apiClient.patch<void>(ENDPOINTS.SET_PRIMARY(id)),

  // === PROFILE SPECIFIC METHODS ===

  // Get complete photographer profile with stats and images
  getProfileData: async (id: number): Promise<{
    photographer: PhotographerProfile;
    stats: PhotographerStats;
    reviews: Review[];
    styles: PhotographerStyle[];
    images: PhotographerImage[];
    primaryImage?: PhotographerImage;
  }> => {
    try {
      const [photographer, reviews, styles, ratingResponse, images, primaryImage] = await Promise.all([
        photographerService.getDetail(id),
        photographerService.getReviews(id).catch(() => [] as Review[]),
        photographerService.getStyles(id).catch(() => [] as PhotographerStyle[]),
        photographerService.getAverageRating(id).catch(() => ({ averageRating: 0 })),
        photographerService.getImages(id).catch(() => [] as PhotographerImage[]),
        photographerService.getPrimaryImage(id).catch(() => undefined)
      ]);

      // Calculate stats
      const stats: PhotographerStats = {
        totalBookings: photographer.ratingCount || 0,
        averageRating: ratingResponse.averageRating || photographer.rating || 0,
        totalReviews: reviews.length,
        favoriteCount: 0, // TODO: Add favorite endpoint when available
      };

      return {
        photographer,
        stats,
        reviews,
        styles,
        images,
        primaryImage
      };
    } catch (error) {
      console.error('Error fetching profile data:', error);
      throw error;
    }
  },

  // Get photographer statistics
  getStats: async (id: number): Promise<PhotographerStats> => {
    try {
      const [reviews, ratingResponse, photographer] = await Promise.all([
        photographerService.getReviews(id).catch(() => [] as Review[]),
        photographerService.getAverageRating(id).catch(() => ({ averageRating: 0 })),
        photographerService.getDetail(id)
      ]);

      return {
        totalBookings: photographer.ratingCount || 0,
        averageRating: ratingResponse.averageRating || photographer.rating || 0,
        totalReviews: reviews.length,
        favoriteCount: 0, // TODO: Add favorite endpoint
      };
    } catch (error) {
      console.error('Error fetching photographer stats:', error);
      return {
        totalBookings: 0,
        averageRating: 0,
        totalReviews: 0,
        favoriteCount: 0,
      };
    }
  },

  // Update photographer profile (including user info)
  updateProfile: async (id: number, data: {
    photographer?: UpdatePhotographerRequest;
    user?: {
      fullName?: string;
      bio?: string;
      phoneNumber?: string;
      profileImage?: string;
    };
  }): Promise<PhotographerProfile> => {
    try {
      // Update photographer data if provided
      if (data.photographer) {
        await photographerService.update(id, data.photographer);
      }

      // TODO: Update user data if provided (need user update endpoint)
      // if (data.user && photographer.userId) {
      //   await userService.update(photographer.userId, data.user);
      // }

      // Return updated profile
      return photographerService.getDetail(id);
    } catch (error) {
      console.error('Error updating photographer profile:', error);
      throw error;
    }
  },

  // === HELPER METHODS FOR IMAGES ===

  // Get photographer with images from PhotographerImage API
  getPhotographerWithImages: async (id: number): Promise<PhotographerWithImages> => {
    try {
      const [photographer, images, primaryImage] = await Promise.all([
        photographerService.getById(id),
        photographerService.getImages(id).catch(() => [] as PhotographerImage[]),
        photographerService.getPrimaryImage(id).catch(() => undefined)
      ]);

      // Convert PhotographerImage[] to string[] for compatibility
      let imageArray: PhotographerImage[] = [];
      if (Array.isArray(images)) {
        imageArray = images;
      } else if (images && Array.isArray((images as any).$values)) {
        imageArray = (images as any).$values;
      }

      const imageUrls = imageArray.map(img => img.imageUrl);

      return {
        ...photographer,
        images: imageUrls,
        primaryImage
      };
    } catch (error) {
      console.error('Error fetching photographer with images:', error);
      throw error;
    }
  },
};