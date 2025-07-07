
import { useState, useEffect } from 'react';
import { photographerStyleService, StyleRecommendation, RecommendedPhotographer } from '../services/photographerStyleService';
import { PhotographerData } from './usePhotographers';

export const photographerStyleRecommendations = (userId: number) => {
  const [styleRecommendations, setStyleRecommendations] = useState<StyleRecommendation[]>([]);
  const [recommendedPhotographers, setRecommendedPhotographers] = useState<PhotographerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transform recommended photographer to match PhotographerData interface
  const transformRecommendedPhotographer = (photographer: RecommendedPhotographer, styleNames: string[]): PhotographerData => {
    return {
      id: photographer.photographerId.toString(),
      fullName: photographer.fullName,
      avatar: photographer.profileImage || 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&auto=format&fit=crop&q=80',
      images: photographer.profileImage ? [photographer.profileImage] : [],
      styles: styleNames,
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
      
      let recommendations: StyleRecommendation[] = [];
      if (Array.isArray(data)) {
        recommendations = data;
      } else if (data && Array.isArray((data as any).$values)) {
        recommendations = (data as any).$values;
      }

      setStyleRecommendations(recommendations);

      // Flatten all recommended photographers from all styles
      const allPhotographers: PhotographerData[] = [];
      const photographerMap = new Map<number, PhotographerData>();

      recommendations.forEach(style => {
        let photographers: RecommendedPhotographer[] = [];
        
        if (Array.isArray(style.recommendedPhotographers)) {
          photographers = style.recommendedPhotographers;
        } else if (style.recommendedPhotographers && Array.isArray((style.recommendedPhotographers as any).$values)) {
          photographers = (style.recommendedPhotographers as any).$values;
        }

        photographers.forEach(photographer => {
          const existing = photographerMap.get(photographer.photographerId);
          if (existing) {
            // Merge styles if photographer already exists
            const newStyles = [...existing.styles];
            if (!newStyles.includes(style.styleName)) {
              newStyles.push(style.styleName);
            }
            existing.styles = newStyles;
          } else {
            // Add new photographer
            const transformedPhotographer = transformRecommendedPhotographer(
              photographer, 
              [style.styleName]
            );
            photographerMap.set(photographer.photographerId, transformedPhotographer);
            allPhotographers.push(transformedPhotographer);
          }
        });
      });

      setRecommendedPhotographers(allPhotographers);
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
    if (userId) {
      fetchStyleRecommendations();
    }
  }, [userId]);

  return {
    styleRecommendations,
    recommendedPhotographers,
    loading,
    error,
    refreshRecommendations,
    fetchStyleRecommendations,
  };
};