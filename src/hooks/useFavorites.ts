import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { PhotographerData } from "./usePhotographers";
import { LocationData } from "./useLocations";

const FAVORITES_STORAGE_KEY = "snaplink_favorites";

export interface FavoriteItem {
  id: string;
  type: "photographer" | "location";
  data: PhotographerData | LocationData;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

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
      await new Promise((resolve) => setTimeout(resolve, 500));
      const favorites = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      if (favorites) {
        setFavorites(JSON.parse(favorites));
      } else {
        setFavorites([]);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  // Save favorites to AsyncStorage
  const saveFavorites = async (newFavorites: FavoriteItem[]) => {
    try {
      await AsyncStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(newFavorites)
      );
    } catch (err) {
      console.error("Error saving favorites:", err);
    }
  };

  // Add an item to favorites
  const addFavorite = async (item: FavoriteItem) => {
    // Check if already exists to prevent duplicates
    const uniqueKey = createUniqueKey(item.type, item.id);
    const exists = favorites.some(fav => createUniqueKey(fav.type, fav.id) === uniqueKey);
    
    if (!exists) {
      const newFavorites = [...favorites, item];
      setFavorites(newFavorites);
      await saveFavorites(newFavorites);
      console.log(`Added ${item.type} ${item.id} to favorites`);
    }
  };

  // Remove an item from favorites
  const removeFavorite = async (id: string, type?: "photographer" | "location") => {
    let newFavorites: FavoriteItem[];
    
    if (type) {
      // Remove specific type-id combination
      const uniqueKey = createUniqueKey(type, id);
      newFavorites = favorites.filter(item => createUniqueKey(item.type, item.id) !== uniqueKey);
    } else {
      // Backward compatibility: remove by id only (will remove all matching ids regardless of type)
      newFavorites = favorites.filter((item) => item.id !== id);
    }
    
    setFavorites(newFavorites);
    await saveFavorites(newFavorites);
    console.log(`Removed ${type || 'any'} ${id} from favorites`);
  };

  // Check if an item is in favorites
  const isFavorite = (id: string, type?: "photographer" | "location") => {
    if (type) {
      // Check specific type-id combination
      const uniqueKey = createUniqueKey(type, id);
      return favorites.some(item => createUniqueKey(item.type, item.id) === uniqueKey);
    } else {
      // Backward compatibility: check by id only
      return favorites.some((item) => item.id === id);
    }
  };

  // Toggle favorite status
  const toggleFavorite = async (item: FavoriteItem) => {
    const isCurrentlyFavorite = isFavorite(item.id, item.type);
    
    if (isCurrentlyFavorite) {
      await removeFavorite(item.id, item.type);
    } else {
      await addFavorite(item);
    }
  };

  // Get favorites by type
  const getFavoritesByType = (type: "photographer" | "location") => {
    return favorites.filter(item => item.type === type);
  };

  // Get favorite photographers
  const getFavoritePhotographers = () => {
    return getFavoritesByType("photographer").map(item => item.data as PhotographerData);
  };

  // Get favorite locations
  const getFavoriteLocations = () => {
    return getFavoritesByType("location").map(item => item.data as LocationData);
  };

  return {
    favorites,
    loading,
    error,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    getFavoritesByType,
    getFavoritePhotographers,
    getFavoriteLocations,
    refetch: loadFavorites,
  };
}