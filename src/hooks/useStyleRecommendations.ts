import { useState, useEffect } from 'react';
import { photographerStyleService, RecommendedPhotographer } from '../services/photographerStyleService';
import { PhotographerData } from './usePhotographers';

export const photographerStyleRecommendations = (userId: number) => {
  const [recommendedPhotographers, setRecommendedPhotographers] = useState<PhotographerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transform recommended photographer to match PhotographerData interface
  const transformRecommendedPhotographer = (photographer: RecommendedPhotographer): PhotographerData => {
    return {
      id: photographer.photographerId.toString(),
      fullName: photographer.fullName,
      avatar: photographer.profileImage,
      styles: [photographer.specialty], 
      rating: photographer.rating,
      hourlyRate: photographer.hourlyRate,
      availabilityStatus: photographer.availabilityStatus,
      specialty: photographer.specialty,
    };
  };

  const fetchStyleRecommendations = async () => {
    if (!userId) {
      setLoading(false);
      setError('No user ID available');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const data = await photographerStyleService.getPhotographerRecommendations(userId, 10);
      console.log('Style recommendations raw data:', data);
      
      let photographers: RecommendedPhotographer[] = [];
      if (Array.isArray(data)) {
        photographers = data;
      } else if (data && Array.isArray((data as any).$values)) {
        photographers = (data as any).$values;
      }

      const transformedPhotographers = photographers.map(photographer => 
        transformRecommendedPhotographer(photographer)
      );

      setRecommendedPhotographers(transformedPhotographers);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch style recommendations');
      console.error('Error fetching style recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshRecommendations = () => {
    fetchStyleRecommendations();
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!userId || !isMounted) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const data = await photographerStyleService.getPhotographerRecommendations(userId, 10);
        
        if (!isMounted) return; // Kiểm tra component còn mounted không
        
        console.log('Style recommendations raw data:', data);
        
        let photographers: RecommendedPhotographer[] = [];
        if (Array.isArray(data)) {
          photographers = data;
        } else if (data && Array.isArray((data as any).$values)) {
          photographers = (data as any).$values;
        }

        const transformedPhotographers = photographers.map(photographer => 
          transformRecommendedPhotographer(photographer)
        );

        if (isMounted) {
          setRecommendedPhotographers(transformedPhotographers);
        }

      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch style recommendations');
          console.error('Error fetching style recommendations:', err);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [userId]);

  return {
    recommendedPhotographers,
    loading,
    error,
    refreshRecommendations,
    fetchStyleRecommendations,
  };
};