import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocations } from "src/hooks/useLocations";
import { useFavorites } from "src/hooks/useFavorites";
import { getResponsiveSize } from "src/utils/responsive";
import LocationCard from "../Location/LocationCard";

interface LocationsTabProps {
  navigation: any;
}

const LocationsTab: React.FC<LocationsTabProps> = ({ navigation }) => {
  const {
    locations,
    loading: locationsLoading,
    error: locationsError,
    // 🆕 MAIN CHANGE: Sử dụng registered nearby thay vì nearbyAppLocations
    registeredNearbyLocations,
    nearbyLoading,
    nearbyError,
    fetchRegisteredNearbyLocations,
    refreshLocations,
  } = useLocations();

  const { isFavorite, toggleFavorite } = useFavorites();

  // Render location card
  const renderLocationCard = (location: any, showDistance: boolean = false) => (
    <View
      key={location.id || location.locationId || Math.random()}
      style={{ width: getResponsiveSize(260), marginRight: 12 }}
    >
      <LocationCard
        locationId={location.locationId}
        name={location.name || "Địa điểm chưa có tên"}
        images={location.images || []}
        address={location.address || ""}
        hourlyRate={location.hourlyRate}
        capacity={location.capacity}
        availabilityStatus={location.availabilityStatus || "unknown"}
        styles={location.styles || []}
        isFavorite={isFavorite(location.id || location.locationId, "location")}
        onFavoriteToggle={() =>
          toggleFavorite({
            id: location.id || location.locationId,
            type: "location",
            data: location,
          })
        }
        distance={showDistance && location.distance ? Number(location.distance) : undefined}
        rating={location.rating ? Number(location.rating) : undefined}
        source={location.source || "internal"}
        latitude={location.latitude}
        longitude={location.longitude}
      />
    </View>
  );

  // Render loading skeleton
  const renderLoadingSkeleton = () =>
    [1, 2, 3].map((_, index) => (
      <View
        key={`loading-${index}`}
        className="w-64 h-72 bg-stone-100 rounded-2xl mr-3"
      />
    ));

  // 🆕 Render error state với retry button
  const renderErrorState = (error: string, retryFunction: () => void) => (
    <View className="flex-1 items-center justify-center py-8">
      <Text className="text-red-500 text-center mb-2">
        ⚠️ {error}
      </Text>
      <TouchableOpacity
        onPress={retryFunction}
        className="bg-red-500 px-4 py-2 rounded-lg"
      >
        <Text className="text-white font-medium">Thử lại</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      {/* 🆕 THAY ĐỔI CHÍNH: Địa điểm gần bạn (thay vì yêu thích) */}
      <View className="px-6 py-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <Ionicons name="navigate" size={20} color="#10B981" />
            <Text className="ml-2 text-xl font-semibold text-stone-900">
              Địa điểm gần bạn
            </Text>
          </View>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => navigation.navigate("ViewAllLocations", { type: "nearby" })}
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
            renderErrorState(nearbyError, fetchRegisteredNearbyLocations)
          ) : registeredNearbyLocations.length > 0 ? (
            registeredNearbyLocations
              .filter(location => location.locationId !== undefined && location.locationId !== null)
              .map(location => renderLocationCard(location, true)) // 🎯 showDistance = true
          ) : (
            <View className="flex-1 items-center justify-center py-8">
              <View className="items-center">
                <Ionicons name="location-outline" size={48} color="#9CA3AF" />
                <Text className="text-stone-500 text-center mt-2 mb-3">
                  Không tìm thấy địa điểm nào gần bạn
                </Text>
                <TouchableOpacity
                  onPress={fetchRegisteredNearbyLocations}
                  className="bg-blue-500 px-4 py-2 rounded-lg"
                >
                  <Text className="text-white font-medium">🔍 Tìm kiếm lại</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </View>

      {/* Tất cả địa điểm (giữ nguyên) */}
      <View className="px-6 py-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-xl font-semibold text-stone-900">
            Tất cả địa điểm
          </Text>
          <TouchableOpacity
            className="flex-row items-center"
            onPress={() => navigation.navigate("ViewAllLocations", { type: "all" })}
          >
            <Ionicons name="chevron-forward" size={20} color="#57534e" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          {locationsLoading ? (
            renderLoadingSkeleton()
          ) : locationsError ? (
            renderErrorState(locationsError, refreshLocations)
          ) : locations.length > 0 ? (
            locations
              .filter(location => location.locationId !== undefined && location.locationId !== null)
              .map(location => renderLocationCard(location, false)) // showDistance = false
          ) : (
            <View className="flex-1 items-center justify-center py-8">
              <Text className="text-stone-500 text-center">
                Không có địa điểm nào
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
};

export default LocationsTab;