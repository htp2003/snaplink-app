import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { PhotographerData } from "./usePhotographers";
import { LocationData } from "./useLocations";

const FAVORITES_STORAGE_KEY = "snaplink_favorites";

export interface FavoriteItem {
  id: string;
  type: "photographer" | "location";
  data: PhotographerData | LocationData;
}

// Global state để đồng bộ cross screens
let globalFavorites: FavoriteItem[] = [];
let listeners: Set<() => void> = new Set();

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(globalFavorites);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Subscribe to global changes - ĐƠN GIẢN HÓA
  useEffect(() => {
    const listener = () => {
      console.log('Global favorites changed, updating local state');
      setFavorites([...globalFavorites]);
    };
    
    listeners.add(listener);
    
    // Initial sync
    setFavorites([...globalFavorites]);
    
    return () => {
      listeners.delete(listener);
    };
  }, []); // Empty deps - chỉ setup một lần

  useEffect(() => {
    // CHỈ load nếu chưa có data
    if (globalFavorites.length === 0) {
      loadFavorites();
    } else {
      setLoading(false);
      setFavorites([...globalFavorites]);
    }
  }, []); // Chỉ chạy một lần khi mount

  // Create unique key by combining type and id
  const createUniqueKey = (type: string, id: string) => `${type}-${id}`;
  
  // Parse unique key back to type and id
  const parseUniqueKey = (key: string) => {
    const [type, id] = key.split('-');
    return { type, id };
  };

  // Load favorites from AsyncStorage
  const loadFavorites = async () => {
    try {
      setLoading(true);
      const stored = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        globalFavorites = parsed;
        setFavorites(parsed);
        console.log('Loaded favorites:', parsed.length);
      } else {
        globalFavorites = [];
        setFavorites([]);
      }
      setError(null);
    } catch (err) {
      console.error('Error loading favorites:', err);
      setError(err instanceof Error ? err : new Error("Unknown error"));
      globalFavorites = [];
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  };

  // Save favorites to AsyncStorage and update global state
  const saveFavorites = async (newFavorites: FavoriteItem[]) => {
    try {
      await AsyncStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(newFavorites)
      );
      
      // Update global state
      globalFavorites = newFavorites;
      setFavorites([...newFavorites]);
      
      // Notify all components
      notifyListeners();
      
      console.log('Saved favorites:', newFavorites.length);
    } catch (err) {
      console.error("Error saving favorites:", err);
    }
  };

  // Add an item to favorites
  const addFavorite = useCallback(async (item: FavoriteItem) => {
    console.log('Adding favorite:', item.type, item.id);
    
    // Check if already exists to prevent duplicates
    const uniqueKey = createUniqueKey(item.type, item.id);
    const exists = globalFavorites.some(fav => createUniqueKey(fav.type, fav.id) === uniqueKey);
    
    if (!exists) {
      const newFavorites = [...globalFavorites, item];
      await saveFavorites(newFavorites);
      console.log(`✅ Added ${item.type} ${item.id} to favorites`);
    } else {
      console.log(`⚠️ ${item.type} ${item.id} already in favorites`);
    }
  }, []);

  // Remove an item from favorites
  const removeFavorite = useCallback(async (id: string, type?: "photographer" | "location") => {
    console.log('Removing favorite:', type, id);
    
    let newFavorites: FavoriteItem[];
    
    if (type) {
      // Remove specific type-id combination
      const uniqueKey = createUniqueKey(type, id);
      newFavorites = globalFavorites.filter(item => createUniqueKey(item.type, item.id) !== uniqueKey);
    } else {
      // Backward compatibility: remove by id only
      newFavorites = globalFavorites.filter((item) => item.id !== id);
    }
    
    await saveFavorites(newFavorites);
    console.log(`✅ Removed ${type || 'any'} ${id} from favorites`);
  }, []);

  // Check if an item is in favorites
  const isFavorite = useCallback((id: string, type?: "photographer" | "location") => {
    if (type) {
      // Check specific type-id combination
      const uniqueKey = createUniqueKey(type, id);
      return globalFavorites.some(item => createUniqueKey(item.type, item.id) === uniqueKey);
    } else {
      // Backward compatibility: check by id only
      return globalFavorites.some((item) => item.id === id);
    }
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (item: FavoriteItem) => {
    const isCurrentlyFavorite = isFavorite(item.id, item.type);
    
    if (isCurrentlyFavorite) {
      await removeFavorite(item.id, item.type);
    } else {
      await addFavorite(item);
    }
  }, [isFavorite, removeFavorite, addFavorite]);

  // Get favorites by type
  const getFavoritesByType = useCallback((type: "photographer" | "location") => {
    return globalFavorites.filter(item => item.type === type);
  }, []);

  // Get favorite photographers
  const getFavoritePhotographers = useCallback(() => {
    return getFavoritesByType("photographer").map(item => item.data as PhotographerData);
  }, [getFavoritesByType]);

  // Get favorite locations
  const getFavoriteLocations = useCallback(() => {
    return getFavoritesByType("location").map(item => item.data as LocationData);
  }, [getFavoritesByType]);

  // Force refresh
  const refetch = useCallback(async () => {
    console.log('🔄 Force refreshing favorites...');
    await loadFavorites();
  }, []);

  return {
    favorites: globalFavorites, // Always return global state
    loading,
    error,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    getFavoritesByType,
    getFavoritePhotographers,
    getFavoriteLocations,
    refetch,
  };
}