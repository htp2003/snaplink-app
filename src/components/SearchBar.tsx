// components/SearchBar.tsx - FIXED VERSION with Direct Google Places API
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { getResponsiveSize } from "../utils/responsive";
import { locationService } from "../services/locationService";
import { searchPlacesForSearchBar, searchNearbyPlaces, directGooglePlaces } from "../services/directGooglePlacesService";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// 🔍 Search result interfaces
interface SearchResult {
  id: string;
  type: 'app_location' | 'google_place' | 'current_location' | 'nearby_places';
  name: string;
  address: string;
  distance?: number;
  rating?: number;
  data: any;
}

interface SearchBarProps {
  onLocationSelect?: (result: SearchResult) => void;
  placeholder?: string;
  autoFocus?: boolean;
  style?: any;
  // 🆕 GPS related props
  onNearbyResults?: (results: { appLocations: any[]; googlePlaces: any[] }) => void;
  showGPSOptions?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  onLocationSelect,
  placeholder = "Tìm kiếm địa điểm...",
  autoFocus = false,
  style,
  onNearbyResults,
  showGPSOptions = true,
}) => {
  const navigation = useNavigation<NavigationProp>();

  // 🔍 Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // 🆕 GPS state
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'unknown' | 'loading' | 'available' | 'denied' | 'error'>('unknown');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  // 📱 UI state
  const [isExpanded, setIsExpanded] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;

  // ⏱️ Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<TextInput>(null);

  // 🆕 Initialize GPS on mount
  useEffect(() => {
    if (showGPSOptions) {
      initializeGPS();
    }
  }, [showGPSOptions]);

  // 🆕 Initialize GPS function
  const initializeGPS = async () => {
    try {
      setGpsStatus('loading');
      
      // Check and request permission
      const hasPermission = await locationService.gps.requestPermission();
      setHasLocationPermission(hasPermission);
      
      if (hasPermission) {
        // Get current location
        const location = await locationService.gps.getCurrentLocation();
        if (location) {
          setCurrentLocation(location);
          setGpsStatus('available');
          console.log('✅ GPS initialized:', location);
        } else {
          setGpsStatus('error');
        }
      } else {
        setGpsStatus('denied');
      }
    } catch (error) {
      console.error('❌ GPS initialization error:', error);
      setGpsStatus('error');
    }
  };

  // 🆕 Get default results when focusing (includes GPS options)
  const getDefaultResults = useCallback((): SearchResult[] => {
    const defaultResults: SearchResult[] = [];

    if (showGPSOptions) {
      // Current location option
      if (gpsStatus === 'available' && currentLocation) {
        defaultResults.push({
          id: "current_location",
          type: "current_location",
          name: "📍 Vị trí hiện tại",
          address: `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`,
          data: currentLocation,
        });
      }

      // Nearby places option
      if (gpsStatus === 'available') {
        defaultResults.push({
          id: "nearby_places",
          type: "nearby_places", 
          name: "🔍 Địa điểm gần bạn",
          address: "Tìm kiếm các địa điểm xung quanh vị trí hiện tại",
          data: { action: 'search_nearby' },
        });
      }

      // GPS loading state
      if (gpsStatus === 'loading') {
        defaultResults.push({
          id: "gps_loading",
          type: "current_location",
          name: "📡 Đang định vị...",
          address: "Vui lòng chờ trong giây lát",
          data: { action: 'loading' },
        });
      }

      // GPS permission denied
      if (gpsStatus === 'denied') {
        defaultResults.push({
          id: "gps_denied",
          type: "current_location",
          name: "🔒 Cần quyền truy cập vị trí",
          address: "Nhấn để bật định vị và tìm địa điểm gần bạn",
          data: { action: 'request_permission' },
        });
      }

      // GPS error
      if (gpsStatus === 'error') {
        defaultResults.push({
          id: "gps_error",
          type: "current_location",
          name: "⚠️ Lỗi GPS",
          address: "Nhấn để thử lại định vị",
          data: { action: 'retry_gps' },
        });
      }
    }

    return defaultResults;
  }, [showGPSOptions, gpsStatus, currentLocation]);

  // 🔍 Debounced search function
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (searchQuery.trim().length < 2) {
        // Show default results when query is empty
        const defaultResults = getDefaultResults();
        setResults(defaultResults);
        
        // Batch state updates to avoid useInsertionEffect warning
        setTimeout(() => {
          if (defaultResults.length > 0) {
            setShowResults(true);
            expandResults();
          }
        }, 0);
        return;
      }

      setIsLoading(true);
      try {
        console.log("🔍 Performing search for:", searchQuery);

        const searchResults = await searchPlacesForSearchBar(searchQuery, currentLocation);
        const formattedResults: SearchResult[] = [];

        // Add app locations (if any)
        searchResults.appLocations.forEach((location, index) => {
          formattedResults.push({
            id: `app_${location.locationId || index}`,
            type: "app_location",
            name: location.name,
            address: location.address || "",
            distance: location.distanceInKm,
            data: location,
          });
        });

        // Add Google Places
        searchResults.googlePlaces.forEach((place, index) => {
          formattedResults.push({
            id: `google_${place.placeId}`,
            type: "google_place",
            name: place.name,
            address: place.address,
            rating: place.rating,
            distance: currentLocation && place.latitude && place.longitude
              ? locationService.gps.calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                place.latitude,
                place.longitude
              )
              : place.distance, // Use distance from direct API if available
            data: {
              placeId: place.placeId,
              name: place.name,
              address: place.address,
              latitude: place.latitude,
              longitude: place.longitude,
              rating: place.rating,
              types: place.types,
              photoReference: place.photoReference,
            },
          });
        });

        // Sort by distance if available
        formattedResults.sort((a, b) => {
          if (a.distance !== undefined && b.distance !== undefined) {
            return a.distance - b.distance;
          }
          return 0;
        });

        const limitedResults = formattedResults.slice(0, 8);
        setResults(limitedResults);
        
        // Batch state updates to avoid useInsertionEffect warning
        setTimeout(() => {
          setShowResults(true);
          expandResults();
        }, 0);

      } catch (error) {
        console.error("Search error:", error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [currentLocation, getDefaultResults]
  );

  // 🔍 Handle search input change
  const handleSearchChange = (text: string) => {
    setQuery(text);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(text);
    }, 300);
  };

  // 🆕 FIXED: Handle nearby search using direct Google Places API
  const handleNearbySearch = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Searching nearby locations using direct Google Places API...');
      
      if (!currentLocation) {
        Alert.alert('Lỗi', 'Không thể xác định vị trí hiện tại. Vui lòng thử lại.');
        return;
      }

      // 🆕 Use direct Google Places API for nearby search
      const [appLocationsResult, googlePlacesResult] = await Promise.allSettled([
        // Search app locations
        locationService.getNearbyAppLocations(5),
        // Search Google Places using direct API
        searchNearbyPlaces(currentLocation, {
          radius: 5000, // 5km
          maxResults: 15,
          includedTypes: [
            'tourist_attraction',
            'park',
            'museum',
            'cafe',
            'restaurant',
            'art_gallery',
            'church',
            'shopping_mall',
            'amusement_park'
          ]
        })
      ]);

      const formattedResults: SearchResult[] = [];

      // Process app locations
      if (appLocationsResult.status === 'fulfilled' && appLocationsResult.value.appLocations) {
        appLocationsResult.value.appLocations.forEach((location, index) => {
          formattedResults.push({
            id: `nearby_app_${location.locationId || index}`,
            type: "app_location",
            name: `🏢 ${location.name}`,
            address: location.address || "",
            distance: location.distanceInKm,
            data: location,
          });
        });
      }

      // Process Google Places
      if (googlePlacesResult.status === 'fulfilled' && googlePlacesResult.value) {
        googlePlacesResult.value.forEach((place, index) => {
          formattedResults.push({
            id: `nearby_google_${place.placeId}`,
            type: "google_place", 
            name: `🌍 ${place.name}`,
            address: place.address,
            rating: place.rating,
            distance: place.distance, // Distance already calculated by direct API
            data: {
              placeId: place.placeId,
              name: place.name,
              address: place.address,
              latitude: place.latitude,
              longitude: place.longitude,
              rating: place.rating,
              types: place.types,
              photoReference: place.photoReference,
            },
          });
        });
      }

      // Sort by distance
      formattedResults.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      const limitedResults = formattedResults.slice(0, 12);
      
      // ✅ Batch state updates to avoid useInsertionEffect warning
      setResults(limitedResults);
      setQuery("Địa điểm gần bạn");
      
      setTimeout(() => {
        setShowResults(true);
        expandResults();
      }, 0);

      console.log('✅ Nearby search completed:', {
        appLocations: appLocationsResult.status === 'fulfilled' ? appLocationsResult.value.appLocations.length : 0,
        googlePlaces: googlePlacesResult.status === 'fulfilled' ? googlePlacesResult.value.length : 0,
        totalResults: formattedResults.length
      });

      // Call callback if provided
      if (onNearbyResults) {
        onNearbyResults({
          appLocations: appLocationsResult.status === 'fulfilled' ? appLocationsResult.value.appLocations : [],
          googlePlaces: googlePlacesResult.status === 'fulfilled' ? googlePlacesResult.value : []
        });
      }
      
    } catch (error) {
      console.error('❌ Nearby search error:', error);
      Alert.alert('Lỗi', 'Không thể tìm kiếm địa điểm gần bạn. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔍 Handle location selection
  const handleLocationSelect = useCallback(async (result: SearchResult) => {
    console.log('🔍 HandleLocationSelect called:', result.type);
    
    // Handle special GPS actions
    if (result.type === 'current_location' || result.type === 'nearby_places') {
      if (result.data.action === 'search_nearby') {
        await handleNearbySearch();
        return;
      } else if (result.data.action === 'request_permission') {
        await initializeGPS();
        return;
      } else if (result.data.action === 'retry_gps') {
        await initializeGPS();
        return;
      } else if (result.data.action === 'loading') {
        return; // Do nothing for loading state
      }
    }

    // Handle normal location selection
    if (onLocationSelect) {
      onLocationSelect(result);
      return;
    }

    // Direct navigation without state changes
    switch (result.type) {
      case "app_location":
        navigation.navigate("LocationCardDetail", {
          locationId: result.data.locationId.toString(),
        });
        break;

      case "google_place":
        if (!result.data.latitude || !result.data.longitude) {
          Alert.alert(
            'Địa điểm không hợp lệ',
            'Địa điểm này thiếu thông tin tọa độ. Vui lòng chọn địa điểm khác.',
            [{ text: 'OK' }]
          );
          return;
        }
        navigation.navigate("LocationCardDetail", {
          locationId: undefined,
          externalLocation: {
            placeId: result.data.placeId,
            name: result.data.name,
            address: result.data.address,
            latitude: result.data.latitude, 
            longitude: result.data.longitude, 
            rating: result.data.rating,
            types: result.data.types || [],
            photoReference: result.data.photoReference,
          },
        });
        break;

      case "current_location":
        Alert.alert(
          "Vị trí hiện tại", 
          "Tìm kiếm địa điểm gần bạn?",
          [
            { text: "Hủy", style: "cancel" },
            { text: "Tìm kiếm", onPress: handleNearbySearch }
          ]
        );
        return; // Don't clear for this case
    }

    // Clean up AFTER navigation
    setTimeout(() => {
      setQuery("");
      setShowResults(false);
      collapseResults();
      inputRef.current?.blur();
    }, 500);
  }, [navigation, onLocationSelect, initializeGPS]);

  // 🎨 Animation functions
  const expandResults = () => {
    setIsExpanded(true);
    Animated.timing(animatedHeight, {
      toValue: getResponsiveSize(300),
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const collapseResults = () => {
    Animated.timing(animatedHeight, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      setIsExpanded(false);
    });
  };

  // 🆕 Handle focus - show default results with GPS options
  const handleFocus = () => {
    const defaultResults = getDefaultResults();
    if (query.length === 0) {
      setResults(defaultResults);
      if (defaultResults.length > 0) {
        // Use setTimeout to batch state updates
        setTimeout(() => {
          setShowResults(true);
          expandResults();
        }, 0);
      }
    } else if (query.length > 1) {
      // Use setTimeout to batch state updates
      setTimeout(() => {
        setShowResults(true);
        expandResults();
      }, 0);
    }
  };

  // 🎯 Handle current location button press (kept for backward compatibility)
  const handleCurrentLocationPress = async () => {
    if (gpsStatus === 'available') {
      await handleNearbySearch();
    } else {
      await initializeGPS();
    }
  };

  // 🎨 Render search result item
  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    const isGPSAction = item.type === 'current_location' || item.type === 'nearby_places';
    const isDisabled = item.data.action === 'loading';

    return (
      <TouchableOpacity
        className={`flex-row items-center px-4 py-3 border-b border-gray-100 ${isDisabled ? 'opacity-50' : ''}`}
        onPress={() => !isDisabled && handleLocationSelect(item)}
        activeOpacity={isDisabled ? 1 : 0.7}
        disabled={isDisabled}
      >
        {/* Icon */}
        <View className="mr-3">
          <Ionicons
            name={
              item.type === "current_location" || item.type === "nearby_places"
                ? item.data.action === 'loading' 
                  ? "radio-outline"
                  : item.data.action === 'search_nearby'
                    ? "search"
                    : "navigate"
                : item.type === "google_place"
                  ? "location"
                  : "business"
            }
            size={20}
            color={
              isGPSAction
                ? item.data.action === 'loading'
                  ? "#9CA3AF"
                  : item.data.action === 'request_permission' || item.data.action === 'retry_gps'
                    ? "#EF4444"
                    : "#10B981"
                : item.type === "google_place"
                  ? "#4285F4"
                  : "#10B981"
            }
          />
        </View>

        {/* Content */}
        <View className="flex-1">
          <Text className="font-medium text-gray-900" numberOfLines={1}>
            {item.name}
          </Text>
          <Text className="text-sm text-gray-500" numberOfLines={2}>
            {item.address}
          </Text>

          {/* Distance and Rating */}
          {!isGPSAction && (
            <View className="flex-row items-center mt-1">
              {item.distance !== undefined && (
                <Text className="text-xs text-blue-500 mr-3">
                  {item.distance < 1
                    ? `${(item.distance * 1000).toFixed(0)}m`
                    : `${item.distance.toFixed(1)}km`}
                </Text>
              )}
              {item.rating && (
                <View className="flex-row items-center">
                  <Ionicons name="star" size={12} color="#FCD34D" />
                  <Text className="text-xs text-gray-600 ml-1">
                    {item.rating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Arrow or Loading */}
        <View className="ml-2">
          {item.data.action === 'loading' ? (
            <ActivityIndicator size="small" color="#9CA3AF" />
          ) : (
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="relative z-50" style={style}>
      {/* Search Input Container */}
      <View className="flex-row items-center bg-white mx-4 mt-2 mb-2 rounded-xl shadow-sm border border-gray-200">
        {/* Search Icon */}
        <View className="pl-4">
          <Ionicons name="search" size={20} color="#9CA3AF" />
        </View>

        {/* Text Input */}
        <TextInput
          ref={inputRef}
          className="flex-1 px-3 py-3 text-gray-900"
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={query}
          onChangeText={handleSearchChange}
          onFocus={handleFocus}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          autoFocus={autoFocus}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View className="pr-2">
            <ActivityIndicator size="small" color="#4285F4" />
          </View>
        )}

        {/* GPS Status Button */}
        {showGPSOptions && (
          <TouchableOpacity
            className={`p-2 mr-2 rounded-lg ${
              gpsStatus === 'available' 
                ? 'bg-green-50' 
                : gpsStatus === 'loading'
                  ? 'bg-blue-50'
                  : 'bg-gray-50'
            }`}
            onPress={handleCurrentLocationPress}
            activeOpacity={0.7}
          >
            {gpsStatus === 'loading' ? (
              <ActivityIndicator size={20} color="#4285F4" />
            ) : (
              <Ionicons 
                name={
                  gpsStatus === 'available' 
                    ? "navigate" 
                    : gpsStatus === 'denied' || gpsStatus === 'error'
                      ? "navigate-outline"
                      : "radio-outline"
                } 
                size={20} 
                color={
                  gpsStatus === 'available' 
                    ? "#10B981" 
                    : gpsStatus === 'denied' || gpsStatus === 'error'
                      ? "#EF4444"
                      : "#9CA3AF"
                } 
              />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Search Results */}
      {showResults && (
        <Animated.View
          className="absolute top-16 left-4 right-4 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden"
          style={{
            height: animatedHeight,
          }}
        >
          {results.length > 0 ? (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={renderSearchResult}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            />
          ) : (
            <View className="flex-1 items-center justify-center py-4">
              <Text className="text-gray-500 text-center">
                {query.length > 0 ? "Không tìm thấy kết quả" : "Nhập từ khóa để tìm kiếm"}
              </Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Overlay to close results */}
      {showResults && (
        <TouchableOpacity
          className="absolute inset-0 z-40"
          style={{
            top: 80,
            backgroundColor: "rgba(0,0,0,0.1)",
            height: getResponsiveSize(600),
          }}
          onPress={() => {
            setShowResults(false);
            collapseResults();
          }}
          activeOpacity={1}
        />
      )}
    </View>
  );
};

export default SearchBar;