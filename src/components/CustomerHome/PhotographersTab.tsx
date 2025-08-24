// PhotographersTab.tsx - With Built-in GPS
import React, { useEffect, useCallback, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from 'expo-location';
import { useCurrentUserId } from "src/hooks/useAuth";
import { PhotographerData, usePhotographers } from "src/hooks/usePhotographers";
import { useFavorites } from "src/hooks/useFavorites";
import { getResponsiveSize } from "src/utils/responsive";
import PhotographerCard from "../Photographer/PhotographerCard";

interface PhotographersTabProps {
  navigation: any;
  userLocation?: {  // Keep this optional for backward compatibility
    latitude: number;
    longitude: number;
  };
}

const PhotographersTab: React.FC<PhotographersTabProps> = ({ 
  navigation, 
  userLocation: propUserLocation  // Rename to avoid conflict
}) => {
  const currentUserId = useCurrentUserId();

  // 📍 Built-in GPS state
  const [internalLocation, setInternalLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 🎯 Hook với tất cả các loại photographers
  const {
    recommendedPhotographers,
    recommendedLoading,
    recommendedError,
    fetchRecommendedPhotographers,
    refreshRecommendedPhotographers,
    
    popularPhotographers,
    popularLoading,
    popularError,
    fetchPopularPhotographers,
    refreshPopularPhotographers,
    
    userStylePhotographers,
    userStyleLoading,
    userStyleError,
    fetchPhotographersByUserStyles,
    refreshUserStylePhotographers,
  } = usePhotographers();

  const { isFavorite, toggleFavorite } = useFavorites();

  // 📍 Get current location function
  const getCurrentLocation = useCallback(async () => {
    if (locationLoading) return;
    
    try {
      setLocationLoading(true);
      setLocationError(null);
      console.log('📍 PhotographersTab: Getting current location...');

      // Request permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('❌ PhotographersTab: Location permission denied');
        setLocationError('Location permission denied');
        return null;
      }

      console.log('✅ PhotographersTab: Location permission granted');
      
      // Get current position
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      console.log('📍 PhotographersTab: Got location:', { latitude, longitude });
      
      // Validate coordinates
      if (latitude === 0 && longitude === 0) {
        console.warn('⚠️ PhotographersTab: Got invalid coordinates (0,0)');
        setLocationError('Invalid location coordinates');
        return null;
      }

      const validLocation = { latitude, longitude };
      setInternalLocation(validLocation);
      return validLocation;

    } catch (error) {
      console.error('❌ PhotographersTab: Error getting location:', error);
      setLocationError('Failed to get location');
      return null;
    } finally {
      setLocationLoading(false);
    }
  }, [locationLoading]);

  // 🎯 Determine which location to use (internal GPS > prop > null)
  const effectiveLocation = internalLocation || propUserLocation || null;

  // 🔧 Render photographer card
  const renderPhotographerCard = useCallback(
    (photographer: PhotographerData) => (
      <View
        key={photographer.id}
        style={{ width: getResponsiveSize(260), marginRight: 12 }}
      >
        <PhotographerCard
          id={photographer.id}
          fullName={photographer.fullName}
          avatar={photographer.avatar}
          styles={photographer.styles}
          rating={photographer.rating}
          hourlyRate={photographer.hourlyRate}
          availabilityStatus={photographer.availabilityStatus}
          yearsExperience={photographer.yearsExperience}
          equipment={photographer.equipment}
          verificationStatus={photographer.verificationStatus}
          onBooking={() => {
            if (photographer.id === undefined) {
              console.error("Photographer ID is undefined");
              return;
            }
            navigation.navigate("Booking", {
              photographer: {
                photographerId: Number(photographer.id),
                fullName: photographer.fullName || "",
                hourlyRate: photographer.hourlyRate || 0,
                profileImage: photographer.avatar || "",
              },
            });
          }}
          isFavorite={isFavorite(photographer.id, "photographer")}
          onFavoriteToggle={() => {
            const favoriteItem = {
              id: photographer.id,
              type: "photographer" as const,
              data: photographer,
            };
            toggleFavorite(favoriteItem);
          }}
        />
      </View>
    ),
    [navigation, isFavorite, toggleFavorite]
  );

  // 🔧 Render loading skeleton
  const renderLoadingSkeleton = useCallback(
    () =>
      [1, 2, 3].map((_, index) => (
        <View
          key={`loading-${index}`}
          className="w-64 h-72 bg-stone-100 rounded-2xl mr-3"
        />
      )),
    []
  );

  // 🔧 Render error state
  const renderErrorState = useCallback(
    (error: string, retryFunction: () => void) => (
      <View className="flex-1 items-center justify-center py-8">
        <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
        <Text className="text-red-500 text-center mt-2 px-4">
          {error}
        </Text>
        <TouchableOpacity
          onPress={retryFunction}
          className="mt-4 bg-red-500 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-medium">Thử lại</Text>
        </TouchableOpacity>
      </View>
    ),
    []
  );

  // 🔧 Render empty state
  const renderEmptyState = useCallback(
    (message: string) => (
      <View className="flex-1 items-center justify-center py-8">
        <Ionicons name="camera-outline" size={48} color="#9ca3af" />
        <Text className="text-stone-500 text-center mt-2 px-4">
          {message}
        </Text>
      </View>
    ),
    []
  );

  // 🎯 Initialize: Get location first, then fetch data
  useEffect(() => {
    console.log('📱 PhotographersTab mounted');
    
    // Get location first
    getCurrentLocation().then((location) => {
      const finalLocation = location || propUserLocation || null;
      
      console.log('📍 Final location for API calls:', finalLocation);
      
      // 🎯 Fetch RECOMMENDED photographers
      console.log('🎯 Fetching RECOMMENDED photographers');
      fetchRecommendedPhotographers(
        finalLocation?.latitude,
        finalLocation?.longitude,
        50,  // radiusKm
        20   // maxResults
      );

      // 🔥 Fetch POPULAR photographers
      console.log('🔥 Fetching POPULAR photographers');
      fetchPopularPhotographers(
        finalLocation?.latitude,
        finalLocation?.longitude,
        1,  // page
        10  // pageSize
      );

      // ✨ Fetch photographers by USER STYLES
      if (currentUserId) {
        console.log('✨ Fetching photographers by USER STYLES for user:', currentUserId);
        fetchPhotographersByUserStyles(
          finalLocation?.latitude,
          finalLocation?.longitude
        );
      } else {
        console.log('👤 User not logged in, skipping user style photographers');
      }
    });
  }, [
    currentUserId, 
    fetchRecommendedPhotographers,
    fetchPopularPhotographers, 
    fetchPhotographersByUserStyles
  ]); // Removed location dependencies to avoid re-fetching


  return (
    <>
      {/* 🎯 RECOMMENDED PHOTOGRAPHERS */}
      <View className="px-6 py-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Text className="text-xl font-semibold text-stone-900">
              ⭐ Đề xuất dành cho bạn
            </Text>
            {locationLoading && (
              <View className="ml-2">
                <Ionicons name="location-outline" size={16} color="#0ea5e9" />
              </View>
            )}
          </View>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() =>
              navigation.navigate("ViewAllPhotographers", {
                type: "recommended",
                title: "Đề xuất dành cho bạn",
                latitude: effectiveLocation?.latitude,
                longitude: effectiveLocation?.longitude,
                location: effectiveLocation,
              })
            }
          >
            <Text className="text-stone-600 text-sm mr-1">Xem tất cả</Text>
            <Ionicons name="chevron-forward" size={20} color="#57534e" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {recommendedLoading ? (
            renderLoadingSkeleton()
          ) : recommendedError ? (
            renderErrorState(
              `Không thể tải photographer đề xuất: ${recommendedError}`, 
              () => refreshRecommendedPhotographers(
                effectiveLocation?.latitude ?? 0, 
                effectiveLocation?.longitude ?? 0,
                50, 
                20  
              )
            )
          ) : recommendedPhotographers.length > 0 ? (
            recommendedPhotographers.map(renderPhotographerCard)
          ) : (
            renderEmptyState("Chưa có đề xuất nào dành cho bạn")
          )}
        </ScrollView>
      </View>

      {/* 🔥 POPULAR PHOTOGRAPHERS */}
      <View className="px-6 py-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xl font-semibold text-stone-900">
            🔥 Thợ chụp ảnh phổ biến
          </Text>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() =>
              navigation.navigate("ViewAllPhotographers", {
                type: "popular",
                title: "Thợ chụp ảnh phổ biến",
                latitude: effectiveLocation?.latitude,
                longitude: effectiveLocation?.longitude,
              })
            }
          >
            <Text className="text-stone-600 text-sm mr-1">Xem tất cả</Text>
            <Ionicons name="chevron-forward" size={20} color="#57534e" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {popularLoading ? (
            renderLoadingSkeleton()
          ) : popularError ? (
            renderErrorState(
              `Không thể tải photographer phổ biến: ${popularError}`, 
              () => refreshPopularPhotographers(
                effectiveLocation?.latitude,
                effectiveLocation?.longitude,
                1,  // page
                10  // pageSize
              )
            )
          ) : popularPhotographers.length > 0 ? (
            popularPhotographers.map(renderPhotographerCard)
          ) : (
            renderEmptyState("Chưa có thợ chụp ảnh phổ biến")
          )}
        </ScrollView>
      </View>

      {/* ✨ USER STYLE PHOTOGRAPHERS - Chỉ hiển thị khi user đã login */}
      {currentUserId && (
        <View className="px-6 py-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-semibold text-stone-900">
              ✨ Thợ chụp ảnh theo Style
            </Text>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() =>
                navigation.navigate("ViewAllPhotographers", {
                  type: "user-styles",
                  title: "Thợ chụp ảnh theo Style của bạn",
                  userId: currentUserId,
                  latitude: effectiveLocation?.latitude,
                  longitude: effectiveLocation?.longitude,
                })
              }
            >
              <Text className="text-stone-600 text-sm mr-1">Xem tất cả</Text>
              <Ionicons name="chevron-forward" size={20} color="#57534e" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {userStyleLoading ? (
              renderLoadingSkeleton()
            ) : userStyleError ? (
              renderErrorState(
                `Không thể tải photographer theo style: ${userStyleError}`, 
                () => refreshUserStylePhotographers(
                  effectiveLocation?.latitude,
                  effectiveLocation?.longitude
                )
              )
            ) : userStylePhotographers.length > 0 ? (
              userStylePhotographers.map(renderPhotographerCard)
            ) : (
              renderEmptyState(
                "Chưa có gợi ý theo style cho bạn. Hãy cập nhật style yêu thích trong profile!"
              )
            )}
          </ScrollView>
        </View>
      )}

      {/* 👤 MESSAGE KHI USER CHƯA LOGIN */}
      {!currentUserId && (
        <View className="px-6 py-4">
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <View className="flex-row items-center justify-center mb-2">
              <Ionicons name="person-outline" size={24} color="#2563eb" />
              <Text className="text-blue-800 font-medium ml-2">
                Đăng nhập để xem gợi ý cá nhân hóa
              </Text>
            </View>
            <Text className="text-blue-600 text-center text-sm mb-4">
              Khi đăng nhập, bạn sẽ thấy thợ chụp ảnh theo style yêu thích
            </Text>
            <TouchableOpacity
              className="bg-blue-500 py-3 px-6 rounded-lg flex-row items-center justify-center"
              onPress={() => navigation.navigate("Login")}
            >
              <Ionicons name="log-in-outline" size={20} color="white" />
              <Text className="text-white font-medium ml-2">
                Đăng nhập ngay
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 📍 LOCATION STATUS */}
      {locationError && !effectiveLocation && (
        <View className="px-6 py-4">
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <View className="flex-row items-center justify-center mb-2">
              <Ionicons name="location-outline" size={24} color="#d97706" />
              <Text className="text-amber-800 font-medium ml-2">
                Không thể lấy vị trí
              </Text>
            </View>
            <Text className="text-amber-700 text-center text-sm mb-4">
              {locationError}. Đề xuất sẽ dựa trên thông tin chung.
            </Text>
            <TouchableOpacity
              className="bg-amber-500 py-3 px-6 rounded-lg flex-row items-center justify-center"
              onPress={getCurrentLocation}
            >
              <Ionicons name="refresh" size={20} color="white" />
              <Text className="text-white font-medium ml-2">
                Thử lại
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
};

export default PhotographersTab;