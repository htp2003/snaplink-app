// hooks/useSubscriptionStatus.ts

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

interface Subscription {
  premiumSubscriptionId: number;
  packageId: number;
  paymentId?: number;
  userId: number;
  photographerId: number;
  locationId?: number;
  startDate: string;
  endDate: string;
  status: string;
  packageName: string;
  applicableTo: string;
}

interface SubscriptionStatusData {
  hasActiveSubscription: boolean;
  activeSubscription: Subscription | null;
  isLoading: boolean;
  error: string | null;
  checkSubscriptionStatus: () => Promise<void>;
  refreshSubscriptionStatus: () => Promise<void>; // 🆕 Thêm method refresh
}

export const useSubscriptionStatus = (photographerId: number | null): SubscriptionStatusData => {
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthToken = async () => {
    return await AsyncStorage.getItem('token');
  };

  const makeApiRequest = async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    const token = await getAuthToken();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  };

  const checkSubscriptionStatus = useCallback(async () => {
    if (!photographerId) {
      console.log('🚫 No photographerId, setting hasActiveSubscription to false');
      setHasActiveSubscription(false);
      setActiveSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔍 Checking subscription status for photographerId:', photographerId);
      setIsLoading(true);
      setError(null);

      const subscriptions = await makeApiRequest<Subscription[]>(`/api/Subscription/Photographer/${photographerId}`);
      
      console.log('📊 Received subscriptions:', subscriptions.length);
      
      if (Array.isArray(subscriptions)) {
        // Find active subscriptions
        const activeSubscriptions = subscriptions.filter(sub => sub.status === 'Active');
        console.log('🟢 Active subscriptions found:', activeSubscriptions.length);
        
        if (activeSubscriptions.length > 0) {
          // Get the latest active subscription (by startDate)
          const latestActive = activeSubscriptions.sort((a, b) => 
            new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
          )[0];
          
          console.log('🎯 Latest active subscription:', {
            id: latestActive.premiumSubscriptionId,
            packageName: latestActive.packageName,
            endDate: latestActive.endDate
          });

          // Check if subscription is still valid (not expired)
          const endDate = new Date(latestActive.endDate);
          const now = new Date();
          const isExpired = endDate.getTime() < now.getTime();

          if (!isExpired) {
            setHasActiveSubscription(true);
            setActiveSubscription(latestActive);
            console.log('✅ Has active subscription:', latestActive.packageName);
          } else {
            setHasActiveSubscription(false);
            setActiveSubscription(null);
            console.log('⏰ Subscription expired on:', endDate.toLocaleDateString());
          }
        } else {
          setHasActiveSubscription(false);
          setActiveSubscription(null);
          console.log('❌ No active subscriptions found');
        }
      } else {
        console.log('⚠️ Invalid subscriptions response format');
        setHasActiveSubscription(false);
        setActiveSubscription(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check subscription status';
      console.error('💥 Error checking subscription status:', errorMessage);
      setError(errorMessage);
      setHasActiveSubscription(false);
      setActiveSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [photographerId]);

  // 🆕 Refresh method that can be called manually
  const refreshSubscriptionStatus = useCallback(async () => {
    console.log('🔄 Manually refreshing subscription status...');
    await checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  useEffect(() => {
    checkSubscriptionStatus();
  }, [checkSubscriptionStatus]);

  return {
    hasActiveSubscription,
    activeSubscription,
    isLoading,
    error,
    checkSubscriptionStatus,
    refreshSubscriptionStatus, // 🆕 Export refresh method
  };
};