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
  listeners.forEach((listener) => listener());
};

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(globalFavorites);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Subscribe to global changes - ĐƠN GIẢN HÓA
  useEffect(() => {
    const listener = () => {
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
    const [type, id] = key.split("-");
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
      } else {
        globalFavorites = [];
        setFavorites([]);
      }
      setError(null);
    } catch (err) {
      console.error("Error loading favorites:", err);
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
    } catch (err) {
      console.error("Error saving favorites:", err);
      throw err; // Re-throw để caller có thể handle
    }
  };

  // Add an item to favorites
  const addFavorite = useCallback(async (item: FavoriteItem) => {
    try {
      // Validate input
      if (!item || !item.id || !item.type) {
        console.error("Invalid favorite item:", item);
        return false;
      }

      // Check if already exists to prevent duplicates
      const uniqueKey = createUniqueKey(item.type, item.id);
      const exists = globalFavorites.some(
        (fav) => createUniqueKey(fav.type, fav.id) === uniqueKey
      );

      if (!exists) {
        const newFavorites = [...globalFavorites, item];
        await saveFavorites(newFavorites);
        return true;
      } else {
        console.warn(`Item already exists in favorites: ${uniqueKey}`);
        return false;
      }
    } catch (error) {
      console.error("Error adding favorite:", error);
      return false;
    }
  }, []);

  // Remove an item from favorites
  const removeFavorite = useCallback(
    async (id: string, type?: "photographer" | "location") => {
      try {
        // Validate input
        if (!id) {
          console.error("Invalid id for removeFavorite:", id);
          return false;
        }

        let newFavorites: FavoriteItem[];

        if (type) {
          // Remove specific type-id combination
          const uniqueKey = createUniqueKey(type, id);
          newFavorites = globalFavorites.filter(
            (item) => createUniqueKey(item.type, item.id) !== uniqueKey
          );
        } else {
          // Backward compatibility: remove by id only
          newFavorites = globalFavorites.filter((item) => item.id !== id);
        }

        await saveFavorites(newFavorites);
        return true;
      } catch (error) {
        console.error("Error removing favorite:", error);
        return false;
      }
    },
    []
  );

  // Check if an item is in favorites
  const isFavorite = useCallback(
    (id: string, type?: "photographer" | "location") => {
      try {
        // Validate input
        if (!id) {
          return false;
        }

        if (type) {
          // Check specific type-id combination
          const uniqueKey = createUniqueKey(type, id);
          return globalFavorites.some(
            (item) => createUniqueKey(item.type, item.id) === uniqueKey
          );
        } else {
          // Backward compatibility: check by id only
          return globalFavorites.some((item) => item.id === id);
        }
      } catch (error) {
        console.error("Error checking isFavorite:", error);
        return false;
      }
    },
    []
  );

  // Toggle favorite status - FIXED VERSION
  const toggleFavorite = useCallback(
    (item: FavoriteItem) => {
      // KHÔNG return Promise để tránh Text rendering issues
      const performToggle = async () => {
        try {
          // Validate input
          if (!item || !item.id || !item.type) {
            console.error("Invalid item for toggleFavorite:", item);
            return;
          }

          const isCurrentlyFavorite = isFavorite(item.id, item.type);

          if (isCurrentlyFavorite) {
            await removeFavorite(item.id, item.type);
            console.log(`Removed ${item.type} ${item.id} from favorites`);
          } else {
            await addFavorite(item);
            console.log(`Added ${item.type} ${item.id} to favorites`);
          }
        } catch (error) {
          console.error("Error in toggleFavorite:", error);
        }
      };

      // Execute async operation without returning Promise
      performToggle();
      
      // Return void explicitly
      return;
    },
    [isFavorite, removeFavorite, addFavorite]
  );

  // Alternative toggleFavorite that returns Promise if needed
  const toggleFavoriteAsync = useCallback(
    async (item: FavoriteItem): Promise<boolean> => {
      try {
        // Validate input
        if (!item || !item.id || !item.type) {
          console.error("Invalid item for toggleFavoriteAsync:", item);
          return false;
        }

        const isCurrentlyFavorite = isFavorite(item.id, item.type);

        if (isCurrentlyFavorite) {
          return await removeFavorite(item.id, item.type);
        } else {
          return await addFavorite(item);
        }
      } catch (error) {
        console.error("Error in toggleFavoriteAsync:", error);
        return false;
      }
    },
    [isFavorite, removeFavorite, addFavorite]
  );

  // Get favorites by type
  const getFavoritesByType = useCallback(
    (type: "photographer" | "location") => {
      return globalFavorites.filter((item) => item.type === type);
    },
    []
  );

  // Get favorite photographers
  const getFavoritePhotographers = useCallback(() => {
    return getFavoritesByType("photographer").map(
      (item) => item.data as PhotographerData
    );
  }, [getFavoritesByType]);

  // Get favorite locations
  const getFavoriteLocations = useCallback(() => {
    return getFavoritesByType("location").map(
      (item) => item.data as LocationData
    );
  }, [getFavoritesByType]);

  // Force refresh
  const refetch = useCallback(async () => {
    await loadFavorites();
  }, []);

  return {
    favorites: globalFavorites, 
    loading,
    error,
    addFavorite,
    removeFavorite,
    isFavorite,
    toggleFavorite, 
    toggleFavoriteAsync, 
    getFavoritesByType,
    getFavoritePhotographers,
    getFavoriteLocations,
    refetch,
  };
}