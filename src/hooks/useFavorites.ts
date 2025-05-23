import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { Profile } from "./useProfiles";
import { Location } from "./useLocations";

const FAVORITES_STORAGE_KEY = "snaplink_favorites";

export interface FavoriteItem {
  id: string;
  type: "profile" | "location";
  data: Profile | Location;
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

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
    const newFavorites = [...favorites, item];
    setFavorites(newFavorites);
    await saveFavorites(newFavorites);
  };

  // Remove an item from favorites
  const removeFavorite = async (id: string) => {
    const newFavorites = favorites.filter((item) => item.id !== id);
    setFavorites(newFavorites);
    await saveFavorites(newFavorites);
  };
  // Check if an item is in favorites
  const isFavorite = (id: string) => {
    return favorites.some((item) => item.id === id);
  };

  // Toggle favorite status
  const toggleFavorite = async (item: FavoriteItem) => {
    if (isFavorite(item.id)) {
      await removeFavorite(item.id);
    } else {
      await addFavorite(item);
    }
  };

  return {
    favorites,
    loading,
    error,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite,
    refetch: loadFavorites,
  };
}
