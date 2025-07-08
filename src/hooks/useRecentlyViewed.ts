import { useEffect, useState } from "react";
import { LocationData } from "./useLocations";
import { PhotographerData } from "./usePhotographers";
import AsyncStorage from "@react-native-async-storage/async-storage";

const RECENTLY_VIEWED_STORAGE_KEY = "snaplink_recently_viewed";
const MAX_RECENT_ITEMS = 20; // Giới hạn số lượng items lưu

export interface RecentlyViewedItem {
  id: string;
  type: "photographer" | "location";
  data: PhotographerData | LocationData;
  viewedAt: string;
}

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadRecentlyViewed();
  }, []);

  // Load recently viewed from AsyncStorage
  const loadRecentlyViewed = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Sort by viewedAt desc (newest first)
        const sorted = parsed.sort(
          (a: RecentlyViewedItem, b: RecentlyViewedItem) =>
            new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
        );
        setRecentlyViewed(sorted);
      } else {
        setRecentlyViewed([]);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
      setRecentlyViewed([]);
    } finally {
      setLoading(false);
    }
  };

  // Save recently viewed to AsyncStorage
  const saveRecentlyViewed = async (
    newRecentlyViewed: RecentlyViewedItem[]
  ) => {
    try {
      await AsyncStorage.setItem(
        RECENTLY_VIEWED_STORAGE_KEY,
        JSON.stringify(newRecentlyViewed)
      );
    } catch (err) {
      console.error("Error saving recently viewed:", err);
    }
  };
   // Track a view (add to recently viewed)
   const trackView = async (item: Omit<RecentlyViewedItem, 'viewedAt'>) => {
    try {
      const viewedItem: RecentlyViewedItem = {
        ...item,
        viewedAt: new Date().toISOString()
      };

      // Remove existing item with same id and type (to avoid duplicates)
      const filteredItems = recentlyViewed.filter(
        existing => !(existing.id === item.id && existing.type === item.type)
      );

      // Add new item at the beginning
      const updatedItems = [viewedItem, ...filteredItems].slice(0, MAX_RECENT_ITEMS);
      
      setRecentlyViewed(updatedItems);
      await saveRecentlyViewed(updatedItems);
      
      console.log(`Tracked view: ${item.type} ${item.id}`);
    } catch (err) {
      console.error("Error tracking view:", err);
    }
  };

  // Remove an item from recently viewed
  const removeFromRecentlyViewed = async (id: string, type: "photographer" | "location") => {
    try {
      const updatedItems = recentlyViewed.filter(
        item => !(item.id === id && item.type === type)
      );
      
      setRecentlyViewed(updatedItems);
      await saveRecentlyViewed(updatedItems);
      
      console.log(`Removed from recently viewed: ${type} ${id}`);
    } catch (err) {
      console.error("Error removing from recently viewed:", err);
    }
  };

  // Clear all recently viewed
  const clearRecentlyViewed = async () => {
    try {
      setRecentlyViewed([]);
      await AsyncStorage.removeItem(RECENTLY_VIEWED_STORAGE_KEY);
      console.log("Cleared all recently viewed items");
    } catch (err) {
      console.error("Error clearing recently viewed:", err);
    }
  };

  // Get recently viewed by type
  const getRecentlyViewedByType = (type: "photographer" | "location") => {
    return recentlyViewed.filter(item => item.type === type);
  };

  // Get recently viewed photographers
  const getRecentlyViewedPhotographers = () => {
    return getRecentlyViewedByType("photographer").map(item => ({
      ...item.data as PhotographerData,
      viewedAt: item.viewedAt
    }));
  };

  // Get recently viewed locations
  const getRecentlyViewedLocations = () => {
    return getRecentlyViewedByType("location").map(item => ({
      ...item.data as LocationData,
      viewedAt: item.viewedAt
    }));
  };

  // Check if an item was recently viewed
  const isRecentlyViewed = (id: string, type: "photographer" | "location") => {
    return recentlyViewed.some(item => item.id === id && item.type === type);
  };

  // Get formatted time ago
  const getTimeAgo = (viewedAt: string) => {
    const now = new Date();
    const viewed = new Date(viewedAt);
    const diffMs = now.getTime() - viewed.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Vừa xem";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return viewed.toLocaleDateString('vi-VN');
  };

  return {
    recentlyViewed,
    loading,
    error,
    trackView,
    removeFromRecentlyViewed,
    clearRecentlyViewed,
    getRecentlyViewedByType,
    getRecentlyViewedPhotographers,
    getRecentlyViewedLocations,
    isRecentlyViewed,
    getTimeAgo,
    refetch: loadRecentlyViewed,
  };
}

