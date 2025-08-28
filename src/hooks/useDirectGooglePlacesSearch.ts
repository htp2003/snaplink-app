import { useState, useCallback } from "react";
import {
  directGooglePlacesService,
  GooglePlaceResult,
} from "../services/directGooglePlacesService";
import { LocationCoordinates } from "../types/locationTypes";

interface UseDirectGooglePlacesSearchReturn {
  // State
  searchResults: GooglePlaceResult[];
  loading: boolean;
  error: string | null;

  // Actions
  searchPlaces: (
    query: string,
    location?: LocationCoordinates
  ) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
}

export const useDirectGooglePlacesSearch =
  (): UseDirectGooglePlacesSearchReturn => {
    const [searchResults, setSearchResults] = useState<GooglePlaceResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const clearError = useCallback(() => {
      setError(null);
    }, []);

    const clearResults = useCallback(() => {
      setSearchResults([]);
      setError(null);
    }, []);

    const searchPlaces = useCallback(
      async (query: string, location?: LocationCoordinates): Promise<void> => {
        if (!query.trim()) {
          setError("Vui lòng nhập từ khóa tìm kiếm");
          return;
        }

        try {
          setLoading(true);
          setError(null);

          // Call the service
          const results = await directGooglePlacesService.searchNearby({
            query,
            latitude: location?.latitude,
            longitude: location?.longitude,
            radius: 50000, // 50km radius
            maxResultCount: 20,
          });

          setSearchResults(results);

          if (results.length === 0) {
            setError("Không tìm thấy địa điểm nào phù hợp");
          }
        } catch (err) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Có lỗi xảy ra khi tìm kiếm địa điểm";

          console.error("Google Places search error:", err);
          setError(errorMessage);
          setSearchResults([]);
        } finally {
          setLoading(false);
        }
      },
      []
    );

    return {
      // State
      searchResults,
      loading,
      error,

      // Actions
      searchPlaces,
      clearResults,
      clearError,
    };
  };
