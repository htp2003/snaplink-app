import React, { useEffect, useState, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCurrentUserId } from "src/hooks/useAuth";
import { PhotographerData, usePhotographers } from "src/hooks/usePhotographers";
import { useFavorites } from "src/hooks/useFavorites";
import { getResponsiveSize } from "src/utils/responsive";
import PhotographerCard from "../Photographer/PhotographerCard";

interface PhotographersTabProps {
  navigation: any;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
}

const PhotographersTab: React.FC<PhotographersTabProps> = ({ 
  navigation, 
  userLocation 
}) => {
  const currentUserId = useCurrentUserId();

  // Photographers hooks với tất cả các API mới
  const {
    // Nearby photographers
    nearbyPhotographers,
    nearbyLoading,
    nearbyError,
    fetchNearbyPhotographers,
    refreshNearbyPhotographers,
    
    // Popular photographers
    popularPhotographers,
    popularLoading,
    popularError,
    fetchPopularPhotographers,
    refreshPopularPhotographers,
    
    // User style photographers
    userStylePhotographers,
    userStyleLoading,
    userStyleError,
    fetchPhotographersByUserStyles,
    refreshUserStylePhotographers,
  } = usePhotographers();

  const { isFavorite, toggleFavorite } = useFavorites();

  // Render photographer card
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

  // Render loading skeleton
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

  // Render error state
  const renderErrorState = useCallback(
    (error: string, retryFunction: () => void) => (
      <View className="flex-1 items-center justify-center py-8">
        <Text className="text-red-500 text-center">
          {`⚠️ ${error}`}
        </Text>
        <TouchableOpacity
          onPress={retryFunction}
          className="mt-2 bg-red-500 px-4 py-2 rounded"
        >
          <Text className="text-white">Thử lại</Text>
        </TouchableOpacity>
      </View>
    ),
    []
  );

  // Render empty state
  const renderEmptyState = useCallback(
    (message: string) => (
      <View className="flex-1 items-center justify-center py-8">
        <Text className="text-stone-500 text-center">
          {message}
        </Text>
      </View>
    ),
    []
  );

  // Initialize data on mount
  useEffect(() => {
    // Fetch nearby photographers nếu có location
    if (userLocation) {
      fetchNearbyPhotographers(
        userLocation.latitude, 
        userLocation.longitude, 
        10 // 10km radius
      );
    }

    // Fetch popular photographers
    fetchPopularPhotographers(
      userLocation?.latitude, 
      userLocation?.longitude, 
      1, // page
      10 // pageSize
    );

    // Fetch photographers by user styles nếu user đã login
    if (currentUserId) {
      fetchPhotographersByUserStyles(
        userLocation?.latitude, 
        userLocation?.longitude
      );
    }
  }, [
    userLocation, 
    currentUserId, 
    fetchNearbyPhotographers, 
    fetchPopularPhotographers, 
    fetchPhotographersByUserStyles
  ]);

  return (
    <>
      {/* Nearby Photographers - chỉ hiển thị khi có location */}
      {userLocation && (
        <View className="px-6 py-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-semibold text-stone-900">
              📍 Thợ chụp ảnh gần bạn
            </Text>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() =>
                navigation.navigate("ViewAllPhotographers", {
                  type: "nearby",
                  title: "Thợ chụp ảnh gần bạn",
                  latitude: userLocation.latitude,
                  longitude: userLocation.longitude,
                })
              }
            >
              <Ionicons name="chevron-forward" size={20} color="#57534e" />
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 16 }}
          >
            {nearbyLoading ? (
              renderLoadingSkeleton()
            ) : nearbyError ? (
              renderErrorState(nearbyError, () => 
                refreshNearbyPhotographers(
                  userLocation.latitude, 
                  userLocation.longitude, 
                  10
                )
              )
            ) : nearbyPhotographers.length > 0 ? (
              nearbyPhotographers.map(renderPhotographerCard)
            ) : (
              renderEmptyState("Không có thợ chụp ảnh nào gần bạn")
            )}
          </ScrollView>
        </View>
      )}

      {/* Popular Photographers */}
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
                latitude: userLocation?.latitude,
                longitude: userLocation?.longitude,
              })
            }
          >
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
            renderErrorState(popularError, () =>
              refreshPopularPhotographers(
                userLocation?.latitude,
                userLocation?.longitude,
                1,
                10
              )
            )
          ) : popularPhotographers.length > 0 ? (
            popularPhotographers.map(renderPhotographerCard)
          ) : (
            renderEmptyState("Chưa có thợ chụp ảnh phổ biến")
          )}
        </ScrollView>
      </View>

      {/* User Style Photographers - chỉ hiển thị khi user đã login */}
      {currentUserId && (
        <View className="px-6 py-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-semibold text-stone-900">
              ✨ Thợ chụp ảnh theo Style của bạn
            </Text>
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() =>
                navigation.navigate("ViewAllPhotographers", {
                  type: "user-styles",
                  title: "Thợ chụp ảnh theo Style của bạn",
                  userId: currentUserId,
                  latitude: userLocation?.latitude,
                  longitude: userLocation?.longitude,
                })
              }
            >
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
              renderErrorState(userStyleError, () =>
                refreshUserStylePhotographers(
                  userLocation?.latitude,
                  userLocation?.longitude
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

      {/* Message khi user chưa login */}
      {!currentUserId && (
        <View className="px-6 py-4">
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <Text className="text-blue-800 text-center mb-2">
              🔐 Đăng nhập để xem gợi ý cá nhân hóa
            </Text>
            <Text className="text-blue-600 text-center text-sm">
              Khi đăng nhập, bạn sẽ thấy thợ chụp ảnh gần bạn và theo style yêu thích
            </Text>
            <TouchableOpacity
              className="bg-blue-500 mt-3 py-2 px-4 rounded-lg"
              onPress={() => navigation.navigate("Login")}
            >
              <Text className="text-white text-center font-medium">
                Đăng nhập ngay
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );
};

export default PhotographersTab;