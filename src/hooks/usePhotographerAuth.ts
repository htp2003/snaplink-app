// hooks/usePhotographerAuth.ts

import { useState, useEffect } from 'react';
import { useAuth, User } from './useAuth';
import { usePhotographerProfile } from './usePhotographerProfile';

interface PhotographerAuthData {
  userId: number | null;
  photographerId: number | null;
  user: User | null;
  isPhotographer: boolean;
  isLoading: boolean;
  error: string | null;
  hasPhotographerProfile: boolean;
}

/**
 * Custom hook để lấy userId và photographerId cho photographer screens
 * Tự động check role và load photographer profile
 */
export const usePhotographerAuth = (): PhotographerAuthData => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { photographer, findByUserId, loading: profileLoading, error: profileError } = usePhotographerProfile();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPhotographerData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Wait for auth to finish loading
        if (authLoading) {
          return;
        }

        // Check if user is authenticated
        if (!isAuthenticated || !user) {
          setError('User not authenticated');
          return;
        }

        // Check if user has photographer role (case insensitive)
        const isPhotographer = user.roles?.some(role => 
          role.toLowerCase() === 'photographer'
        ) || false;
        
        console.log('🔍 Role check debug:', {
          userRoles: user.roles,
          isPhotographer,
          checkingFor: 'photographer (case insensitive)'
        });
        
        if (!isPhotographer) {
          setError('User is not a photographer');
          return;
        }

        // Try to load photographer profile
        console.log('🔍 Loading photographer profile for userId:', user.id);
        await findByUserId(user.id);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load photographer data';
        console.error('❌ Error in usePhotographerAuth:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    loadPhotographerData();
  }, [user, isAuthenticated, authLoading, findByUserId]);

  // Update loading state when profile is loading
  useEffect(() => {
    setIsLoading(authLoading || profileLoading);
  }, [authLoading, profileLoading]);

  // Update error state when profile error occurs
  useEffect(() => {
    if (profileError) {
      setError(profileError);
    }
  }, [profileError]);

  // Determine photographerId
  const photographerId = photographer?.photographerId || user?.photographerId || null;
  
  // Check if user has photographer role (case insensitive)
  const isPhotographer = user?.roles?.some(role => 
    role.toLowerCase() === 'photographer'
  ) || false;
  
  // Check if user has photographer profile
  const hasPhotographerProfile = photographer !== null;

  console.log('🔍 usePhotographerAuth state:', {
    userId: user?.id,
    photographerId,
    isPhotographer,
    hasPhotographerProfile,
    isLoading,
    error
  });

  return {
    userId: user?.id || null,
    photographerId,
    user,
    isPhotographer,
    isLoading,
    error,
    hasPhotographerProfile,
  };
};