// hooks/usePhotographerProfile.ts
import { useState, useEffect, useCallback } from 'react';
import { photographerService } from '../services/photographerService';
import { 
  Photographer, 
  PhotographerProfile, 
  PhotographerStats, 
  PhotographerStyle,
  Review,
  UpdatePhotographerRequest 
} from '../types/photographer';

export const usePhotographerProfile = (photographerId?: number) => {
  const [photographer, setPhotographer] = useState<PhotographerProfile | null>(null);
  const [stats, setStats] = useState<PhotographerStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [styles, setStyles] = useState<PhotographerStyle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  

  // Fetch complete photographer profile data
  const fetchPhotographerProfile = useCallback(async (id: number) => {
    try {
      setLoading(true);
      setError(null);

      // Try different API strategies since /detail endpoint returns 404
      console.log('🔍 Fetching photographer data for ID:', id);

      const [
        photographerData,
        reviewsData,
        stylesData,
        ratingData
      ] = await Promise.allSettled([
        // Use basic getById instead of getDetail since detail returns 404
        photographerService.getById(id).catch(async () => {
          console.log('📋 getById failed, trying getDetail...');
          return photographerService.getDetail(id);
        }),
        photographerService.getReviews(id).catch(() => {
          console.log('📝 Reviews failed, using empty array');
          return [] as Review[];
        }),
        photographerService.getStyles(id).catch(() => {
          console.log('🎨 Styles failed, using empty array');
          return [] as PhotographerStyle[];
        }),
        photographerService.getAverageRating(id).catch(() => {
          console.log('⭐ Rating failed, using default');
          return { averageRating: 0 };
        })
      ]);

      // Handle photographer data
      if (photographerData.status === 'fulfilled') {
        console.log('✅ Photographer data:', photographerData.value);
        // Ensure the value is of type PhotographerProfile
        if ('id' in photographerData.value) {
          setPhotographer(photographerData.value as PhotographerProfile);
        } else {
          // If missing required fields, set to null or handle accordingly
          setPhotographer(null);
        }
      } else {
        console.error('❌ Failed to fetch photographer:', photographerData.reason);
        throw new Error('Không thể tải thông tin photographer');
      }

      // Handle reviews
      const reviews = reviewsData.status === 'fulfilled' ? reviewsData.value : [];
      console.log('📝 Reviews count:', reviews.length);
      setReviews(reviews);

      // Handle styles
      const styles = stylesData.status === 'fulfilled' ? stylesData.value : [];
      console.log('🎨 Styles count:', styles.length);
      setStyles(styles);

      // Handle rating data - check different response formats
      let averageRating = 0;
      if (ratingData.status === 'fulfilled') {
        const ratingResponse = ratingData.value;
        console.log('⭐ Rating response:', ratingResponse);
        
        // Handle different response formats
        if (typeof ratingResponse === 'number') {
          averageRating = ratingResponse;
        } else if (ratingResponse && typeof ratingResponse === 'object') {
          averageRating = ratingResponse.averageRating || 0;
        }
      }

      // Calculate stats
      const photographer = photographerData.status === 'fulfilled' ? photographerData.value : null;
      const statsData: PhotographerStats = {
        totalBookings: photographer?.ratingCount || 0,
        averageRating: averageRating || photographer?.rating || 0,
        totalReviews: reviews.length,
        favoriteCount: 0, // TODO: Add favorite endpoint when available
      };

      console.log('📊 Calculated stats:', statsData);
      setStats(statsData);

    } catch (err: any) {
      console.error('❌ Error in fetchPhotographerProfile:', err);
      setError(err.message || 'Không thể tải thông tin photographer');
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh data with pull-to-refresh
  const refresh = useCallback(async () => {
    if (!photographerId) return;
    
    try {
      setRefreshing(true);
      setError(null);
      await fetchPhotographerProfile(photographerId);
    } catch (err) {
      console.error('Error refreshing photographer profile data:', err);
    } finally {
      setRefreshing(false);
    }
  }, [photographerId, fetchPhotographerProfile]);

  // Update photographer information
  const updatePhotographer = useCallback(async (data: UpdatePhotographerRequest) => {
    if (!photographerId) return;

    try {
      setLoading(true);
      setError(null);
      
      const updatedPhotographer = await photographerService.update(photographerId, data);
      
      // Refresh to get complete updated data
      await fetchPhotographerProfile(photographerId);
      
      return updatedPhotographer;
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật thông tin');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [photographerId, fetchPhotographerProfile]);

  // Update availability status
  const updateAvailability = useCallback(async (status: string) => {
    if (!photographerId) return;

    try {
      setError(null);
      await photographerService.updateAvailability(photographerId, status);
      
      // Update local state immediately for better UX
      if (photographer) {
        setPhotographer(prev => prev ? { ...prev, availabilityStatus: status } : null);
      }
      
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật trạng thái');
      throw err;
    }
  }, [photographerId, photographer]);

  // Add style to photographer
  const addStyle = useCallback(async (styleId: number) => {
    if (!photographerId) return;

    try {
      setError(null);
      await photographerService.addStyle(photographerId, styleId);
      
      // Refresh styles
      const updatedStyles = await photographerService.getStyles(photographerId);
      setStyles(updatedStyles);
      
    } catch (err: any) {
      setError(err.message || 'Không thể thêm chuyên môn');
      throw err;
    }
  }, [photographerId]);

  // Remove style from photographer
  const removeStyle = useCallback(async (styleId: number) => {
    if (!photographerId) return;

    try {
      setError(null);
      await photographerService.removeStyle(photographerId, styleId);
      
      // Refresh styles
      const updatedStyles = await photographerService.getStyles(photographerId);
      setStyles(updatedStyles);
      
    } catch (err: any) {
      setError(err.message || 'Không thể xóa chuyên môn');
      throw err;
    }
  }, [photographerId]);

  // Update profile (photographer + user data)
  const updateProfile = useCallback(async (data: {
    photographer?: UpdatePhotographerRequest;
    user?: {
      fullName?: string;
      bio?: string;
      phoneNumber?: string;
      profileImage?: string;
    };
  }) => {
    if (!photographerId) return;

    try {
      setLoading(true);
      setError(null);
      
      await photographerService.updateProfile(photographerId, data);
      
      // Refresh complete profile
      await fetchPhotographerProfile(photographerId);
      
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật hồ sơ');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [photographerId, fetchPhotographerProfile]);

  // Initial load
  useEffect(() => {
    if (photographerId) {
      fetchPhotographerProfile(photographerId);
    }
  }, [photographerId, fetchPhotographerProfile]);

  // Helper function to parse styles array
  const parseStyles = useCallback((stylesData: any): PhotographerStyle[] => {
    if (!stylesData) return [];
    
    // Handle different response formats
    if (Array.isArray(stylesData)) {
      return stylesData;
    }
    
    // Handle $values format from API
    if (stylesData.$values && Array.isArray(stylesData.$values)) {
      return stylesData.$values;
    }
    
    return [];
  }, []);

  return {
    // Data
    photographer,
    stats,
    reviews,
    styles: parseStyles(styles),
    
    // Loading states
    loading,
    error,
    refreshing,
    
    // Actions
    refresh,
    updatePhotographer,
    updateAvailability,
    updateProfile,
    addStyle,
    removeStyle,
    
    // Computed values for easy access
    isAvailable: photographer?.availabilityStatus?.toLowerCase() === 'available',
    isVerified: photographer?.verificationStatus?.toLowerCase() === 'verified',
    isFeatured: photographer?.featuredStatus === true,
    
    // User info with multiple fallback strategies
    displayName:  photographer?.user?.fullName || 'Photographer',
    avatar: photographer?.user?.profileImage,
    email: photographer?.user?.email,
    phone: photographer?.user?.phoneNumber,
    bio: photographer?.user?.bio,
    
    // Photographer specific info
    specialty: photographer?.specialty,
    hourlyRate: photographer?.hourlyRate,
    yearsExperience: photographer?.yearsExperience,
    equipment: photographer?.equipment,
    portfolioUrl: photographer?.portfolioUrl,
    
    // Stats
    totalRating: stats?.averageRating || 0,
    totalBookings: stats?.totalBookings || 0,
    totalReviews: stats?.totalReviews || 0,
    favoriteCount: stats?.favoriteCount || 0,
    
    // Formatted values
    formattedRating: (stats?.averageRating || 0).toFixed(1),
    formattedHourlyRate: photographer?.hourlyRate ? `${photographer.hourlyRate.toLocaleString()}đ/giờ` : null,
    experienceText: photographer?.yearsExperience ? `${photographer.yearsExperience} năm kinh nghiệm` : null,
  };
};