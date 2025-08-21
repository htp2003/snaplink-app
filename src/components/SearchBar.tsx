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
// 🆕 Import đúng types
import { RootStackParamList, GooglePlaceDisplay } from "../navigation/types";
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
      const hasPermission = await locationService.gps.requestPermission();
      setHasLocationPermission(hasPermission);

      if (hasPermission) {
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


  // 🔧 FIXED: handleNearbySearch - CHỈ DÙNG GOOGLE PLACES
  const handleNearbySearch = async () => {
    try {
      setIsLoading(true);
      console.log('🔍 Searching nearby Google Places only...');

      if (!currentLocation) {
        Alert.alert('Lỗi', 'Không thể xác định vị trí hiện tại. Vui lòng thử lại.');
        return;
      }

      // 🎯 CHỈ TÌM KIẾM GOOGLE PLACES - BỎ APP LOCATIONS
      console.log('🌍 Searching Google Places near you...');

      try {
        const googlePlaces = await searchNearbyPlaces(currentLocation, {
          radius: 5000, 
          maxResults: 20,
          includedTypes: [
            'cafe',                
            'restaurant',      
            'park',               
            'tourist_attraction', 
            'art_gallery'        
          ]
        });

        console.log('🌍 Google Places found:', googlePlaces.length);

        const formattedResults: SearchResult[] = [];

        // 🌍 CHỈ XỬ LÝ GOOGLE PLACES
        googlePlaces.forEach((place, index) => {
          console.log(`🌍 Google place ${index}:`, {
            placeId: place.placeId,
            name: place.name,
            hasCoordinates: !!(place.latitude && place.longitude),
            distance: place.distance
          });

          formattedResults.push({
            id: `nearby_google_${place.placeId}`,
            type: "google_place",
            name: place.name, // 🆕 Bỏ icon 🌍 để clean hơn
            address: place.address,
            rating: place.rating,
            distance: place.distance,
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

        // Sort by distance
        formattedResults.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        const limitedResults = formattedResults.slice(0, 15);

        console.log('📊 Final nearby results:', {
          googlePlaces: limitedResults.length,
          firstFew: limitedResults.slice(0, 3).map(r => ({
            name: r.name,
            distance: r.distance,
            type: r.type
          }))
        });

        // Update UI
        setResults(limitedResults);
        setQuery("Địa điểm gần bạn");

        setTimeout(() => {
          setShowResults(true);
          expandResults();
        }, 0);

        // Call callback if provided  
        if (onNearbyResults) {
          onNearbyResults({
            appLocations: [], // 🚫 Không có app locations
            googlePlaces: googlePlaces
          });
        }

      } catch (googleError) {
        console.error('❌ Google Places search failed:', googleError);
        Alert.alert(
          'Lỗi tìm kiếm',
          'Không thể tìm kiếm địa điểm từ Google Maps. Vui lòng thử lại.',
          [{ text: 'OK' }]
        );
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
    console.log('📍 HandleLocationSelect called:', result.type);
    console.log('📊 Full result data:', {
      type: result.type,
      id: result.id,
      name: result.name,
      dataKeys: Object.keys(result.data),
      hasLocationId: result.type === 'app_location' ? !!result.data.locationId : 'N/A'
    });

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
        return;
      }
    }

    // Handle callback
    if (onLocationSelect) {
      console.log('🔄 Using onLocationSelect callback');
      onLocationSelect(result);
      return;
    }

    // 🔧 FIXED: Direct navigation với proper error handling
    try {
      switch (result.type) {
        case "app_location":
          console.log('🏢 Processing app_location...');

          // 🔍 Kiểm tra locationId
          const locationId = result.data.locationId;
          console.log('🔍 LocationId check:', {
            exists: !!locationId,
            type: typeof locationId,
            value: locationId
          });

          if (!locationId) {
            console.error('❌ Missing locationId for app_location');
            console.log('📊 Available data:', result.data);

            Alert.alert(
              'Lỗi dữ liệu',
              'Địa điểm này thiếu thông tin ID. Vui lòng thử địa điểm khác.',
              [{ text: 'OK' }]
            );
            return;
          }

          console.log('🚀 Navigating to app location...');
          navigation.navigate("LocationCardDetail", {
            locationId: locationId.toString(),
            // 🚫 Không truyền externalLocation cho app location
          });
          console.log('✅ App location navigation successful');
          break;

        case "google_place":
          console.log('🌍 Processing Google place...');

          // 🔧 FIXED: Tạo GooglePlaceDisplay object đúng format
          const externalLocation: GooglePlaceDisplay = {
            placeId: result.data.placeId,
            name: result.data.name,
            address: result.data.address,
            latitude: result.data.latitude,
            longitude: result.data.longitude,
            rating: result.data.rating,
            types: result.data.types || [],
            photoReference: result.data.photoReference,
          };

          console.log('🔍 External location data:', {
            placeId: externalLocation.placeId,
            hasCoordinates: !!(externalLocation.latitude && externalLocation.longitude),
            name: externalLocation.name
          });

          // Nếu thiếu tọa độ, thử fetch
          if (!externalLocation.latitude || !externalLocation.longitude) {
            console.warn('⚠️ Missing coordinates, trying to fetch details...');
            setIsLoading(true);

            try {
              const details = await directGooglePlaces.getPlaceDetails(externalLocation.placeId);

              if (details && details.latitude && details.longitude) {
                console.log('✅ Successfully fetched missing coordinates:', details);

                // Cập nhật coordinates
                externalLocation.latitude = details.latitude;
                externalLocation.longitude = details.longitude;

                navigation.navigate("LocationCardDetail", {
                  // 🚫 Không truyền locationId cho external location
                  externalLocation: externalLocation,
                });
                console.log('✅ Google place navigation with fetched coordinates');
              } else {
                console.error('❌ Could not fetch coordinates');
                Alert.alert(
                  'Địa điểm không khả dụng',
                  'Không thể xác định vị trí chính xác của địa điểm này. Vui lòng thử địa điểm khác.',
                  [{ text: 'OK' }]
                );
                return;
              }
            } catch (error) {
              console.error('❌ Failed to fetch place details:', error);
              Alert.alert(
                'Lỗi kết nối',
                'Không thể tải thông tin địa điểm. Vui lòng kiểm tra kết nối mạng và thử lại.',
                [{ text: 'OK' }]
              );
              return;
            } finally {
              setIsLoading(false);
            }
          } else {
            // ✅ Có đầy đủ coordinates
            console.log('🚀 Navigating to Google place with full data...');
            navigation.navigate("LocationCardDetail", {
              // 🚫 Không truyền locationId cho external location
              externalLocation: externalLocation,
            });
            console.log('✅ Google place navigation successful');
          }
          break;

        case "current_location":
          console.log('📍 Handling current location selection');
          Alert.alert(
            "Vị trí hiện tại",
            "Tìm kiếm địa điểm gần bạn?",
            [
              { text: "Hủy", style: "cancel" },
              { text: "Tìm kiếm", onPress: handleNearbySearch }
            ]
          );
          return; // Don't clean up for this case

        default:
          console.warn('❓ Unknown result type:', result.type);
          Alert.alert('Lỗi', 'Loại địa điểm không được hỗ trợ.');
          return;
      }

      // ✅ Clean up AFTER successful navigation
      console.log('🧹 Cleaning up search state...');
      setTimeout(() => {
        setQuery("");
        setShowResults(false);
        collapseResults();
        inputRef.current?.blur();
        console.log('✅ Search state cleaned up');
      }, 500);

    } catch (navigationError: any) {
      console.error('❌ Navigation failed:', navigationError);
      Alert.alert(
        'Lỗi điều hướng',
        `Không thể mở trang chi tiết. Lỗi: ${navigationError.message}`,
        [{ text: 'OK' }]
      );
    }
  }, [navigation, onLocationSelect, initializeGPS, handleNearbySearch]);

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

    // 🆕 Kiểm tra địa điểm có đầy đủ thông tin không
    const hasCompleteInfo = item.type === 'app_location' ||
      (item.type === 'google_place' && item.data.latitude && item.data.longitude);

    // 🆕 Địa điểm thiếu thông tin nhưng vẫn có thể thử fetch
    const canTryFetch = item.type === 'google_place' &&
      (!item.data.latitude || !item.data.longitude) &&
      item.data.placeId;

    return (
      <TouchableOpacity
        className={`flex-row items-center px-4 py-3 border-b border-gray-100 ${isDisabled ? 'opacity-50' :
            !hasCompleteInfo && !canTryFetch ? 'opacity-60' : ''
          }`}
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
                  ? hasCompleteInfo ? "location" : "location-outline"
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
                  ? hasCompleteInfo ? "#4285F4" : "#F59E0B" // 🆕 Màu cam cho địa điểm thiếu thông tin
                  : "#10B981"
            }
          />
        </View>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="font-medium text-gray-900 flex-1" numberOfLines={1}>
              {item.name}
            </Text>
            {/* 🆕 Badge cho địa điểm thiếu thông tin */}
            {!hasCompleteInfo && canTryFetch && (
              <View className="ml-2 px-2 py-1 bg-orange-100 rounded-full">
                <Text className="text-xs text-orange-600 font-medium">
                  Tải thêm
                </Text>
              </View>
            )}
          </View>

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
              {/* 🆕 Hiển thị trạng thái */}
              {!hasCompleteInfo && canTryFetch && (
                <Text className="text-xs text-orange-500 ml-2">
                  • Nhấn để tải vị trí
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Arrow or Loading */}
        <View className="ml-2">
          {item.data.action === 'loading' ? (
            <ActivityIndicator size="small" color="#9CA3AF" />
          ) : !hasCompleteInfo && canTryFetch ? (
            <Ionicons name="download-outline" size={16} color="#F59E0B" />
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
            className={`p-2 mr-2 rounded-lg ${gpsStatus === 'available'
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