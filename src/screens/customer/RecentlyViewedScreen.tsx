import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Image,
  Dimensions,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// Hooks and Components
import { useRecentlyViewed } from "../../hooks/useRecentlyViewed";
import { useFavorites } from "../../hooks/useFavorites";
import { getResponsiveSize } from "../../utils/responsive";
import { RootStackParamList } from "../../navigation/types";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get("window");
const cardWidth = (width - 48) / 2; // 2 cards per row

export default function RecentlyViewedScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const {
    recentlyViewed,
    loading,
    error,
    getRecentlyViewedPhotographers,
    getRecentlyViewedLocations,
    getTimeAgo,
    refetch,
    removeFromRecentlyViewed,
  } = useRecentlyViewed();

  const { isFavorite, toggleFavorite } = useFavorites();

  // Get all recent items
  const recentPhotographers = useMemo(
    () => getRecentlyViewedPhotographers(),
    [recentlyViewed]
  );
  const recentLocations = useMemo(
    () => getRecentlyViewedLocations(),
    [recentlyViewed]
  );

  const allRecentItems = useMemo(() => {
    return [...recentPhotographers, ...recentLocations].sort(
      (a, b) => new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
    );
  }, [recentPhotographers, recentLocations]);

  const hasRecentItems = allRecentItems.length > 0;

  // Group by date
  const groupedItems = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayItems = allRecentItems.filter((item) => {
      const itemDate = new Date(item.viewedAt);
      return itemDate.toDateString() === today.toDateString();
    });

    const yesterdayItems = allRecentItems.filter((item) => {
      const itemDate = new Date(item.viewedAt);
      return itemDate.toDateString() === yesterday.toDateString();
    });

    const olderItems = allRecentItems.filter((item) => {
      const itemDate = new Date(item.viewedAt);
      return (
        itemDate.toDateString() !== today.toDateString() &&
        itemDate.toDateString() !== yesterday.toDateString()
      );
    });

    return { todayItems, yesterdayItems, olderItems };
  }, [allRecentItems]);

  // Auto tắt edit mode khi không còn recent items
  useEffect(() => {
    if (!hasRecentItems && editMode) {
      setEditMode(false);
    }
  }, [hasRecentItems, editMode]);

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error("Error refreshing recently viewed:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle edit mode với validation
  const toggleEditMode = () => {
    if (hasRecentItems) {
      setEditMode(!editMode);
    } else {
      setEditMode(false);
    }
  };

  // Handle remove recent item
  const handleRemoveRecent = (
    id: string,
    type: "photographer" | "location"
  ) => {
    Alert.alert(
      "Xác nhận xóa",
      "Bạn có chắc muốn xóa khỏi danh sách đã xem gần đây?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => removeFromRecentlyViewed(id, type),
        },
      ]
    );
  };

  // Handle favorite toggle
  const handleFavoriteToggle = (item: any) => {
    const isLocation = item.locationId !== undefined;
    const actualItem = item.data || item;

    const favoriteItem = {
      id: isLocation ? actualItem.locationId?.toString() : actualItem.id,
      type: isLocation ? ("location" as const) : ("photographer" as const),
      data: actualItem,
    };

    toggleFavorite(favoriteItem);
  };

  // Render item card
  const renderRecentCard = (item: any, index: number) => {
    const isLocation = item.locationId !== undefined;
    const actualItem = item.data || item;

    const id = isLocation
      ? actualItem.locationId?.toString() || actualItem.id
      : actualItem.id;
    const name = isLocation ? actualItem.name : actualItem.fullName;
    const subtitle = isLocation
      ? actualItem.address
      : actualItem.styles?.[0] || actualItem.specialty || "Photographer";
    const imageUri = actualItem.images?.[0] || actualItem.avatar;
    const rating = isLocation ? null : actualItem.rating;

    return (
      <TouchableOpacity
        key={`recent-${id}-${index}`}
        className="mb-6"
        onPress={() => {
          if (editMode) {
            handleRemoveRecent(id, isLocation ? "location" : "photographer");
            return;
          }

          if (isLocation) {
            navigation.navigate("LocationCardDetail", { locationId: id });
          } else {
            navigation.navigate("PhotographerCardDetail", {
              photographerId: id,
            });
          }
        }}
        style={{ width: cardWidth }}
      >
        {/* Image container */}
        <View className="relative">
          <Image
            source={{ uri: imageUri }}
            style={{
              width: "100%",
              height: cardWidth * 0.75,
              borderRadius: 12,
            }}
            className="bg-stone-200"
            resizeMode="cover"
          />

          {/* Edit mode remove button */}
          {editMode && (
            <TouchableOpacity
              className="absolute top-2 left-2 bg-white rounded-full w-6 h-6 items-center justify-center shadow-sm"
              onPress={() =>
                handleRemoveRecent(id, isLocation ? "location" : "photographer")
              }
            >
              <Ionicons name="close" size={16} color="black" />
            </TouchableOpacity>
          )}

          {/* Heart button */}
          {!editMode && (
            <TouchableOpacity
              className="absolute top-3 right-3"
              onPress={() => handleFavoriteToggle(item)}
            >
              <Ionicons
                name={
                  isFavorite(id, isLocation ? "location" : "photographer")
                    ? "heart"
                    : "heart-outline"
                }
                size={24}
                color={
                  isFavorite(id, isLocation ? "location" : "photographer")
                    ? "#ef4444"
                    : "white"
                }
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Content */}
        <View className="mt-3">
          <Text
            className="text-stone-900 font-semibold"
            style={{ fontSize: getResponsiveSize(16) }}
            numberOfLines={1}
          >
            {name || "Unnamed"}
          </Text>
          <Text
            className="text-stone-600 mt-1"
            style={{ fontSize: getResponsiveSize(14) }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>

          {/* Rating and price row */}
          <View className="flex-row items-center justify-between mt-2">
            {/* Guests info or rating */}
            <View className="flex-row items-center">
              {rating ? (
                <>
                  <Ionicons name="star" size={12} color="#d97706" />
                  <Text
                    className="text-stone-700 font-medium ml-1"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    {rating.toFixed(2)}
                  </Text>
                </>
              ) : isLocation ? (
                <Text
                  className="text-stone-600"
                  style={{ fontSize: getResponsiveSize(12) }}
                >
                  {actualItem.capacity || 1} giường
                </Text>
              ) : null}
            </View>

            {/* Price */}
            {actualItem.hourlyRate && (
              <Text
                className="text-stone-700 font-medium"
                style={{ fontSize: getResponsiveSize(12) }}
              >
                ₫{actualItem.hourlyRate.toLocaleString()}/giờ
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render date section
  const renderDateSection = (title: string, items: any[]) => {
    if (items.length === 0) return null;

    return (
      <View className="mb-8">
        <Text
          className="text-stone-900 font-bold mb-4"
          style={{ fontSize: getResponsiveSize(18) }}
        >
          {title}
        </Text>
        <View className="flex-row flex-wrap justify-between">
          {items.map((item, index) => renderRecentCard(item, index))}
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="white" barStyle="dark-content" />

      {/* Header */}
      <SafeAreaView className="bg-white border-b border-stone-100">
        <View
          className="flex-row items-center justify-between px-6 py-3"
          style={{ minHeight: getResponsiveSize(44) }}
        >
          <TouchableOpacity
            className="mr-3 p-2 bg-stone-100 rounded-full"
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={getResponsiveSize(24)}
              color="#1c1917"
            />
          </TouchableOpacity>

          {/* Edit button - CHỈ hiển thị khi có recent items */}
          {hasRecentItems && !loading && (
            <TouchableOpacity
              className="bg-stone-100 rounded-full px-6 py-3"
              onPress={toggleEditMode}
            >
              <Text
                className="text-stone-700 font-medium"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                {editMode ? "Hoàn tất" : "Chỉnh sửa"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View className="px-6">
          <Text
            className="text-stone-900 font-bold"
            style={{ fontSize: getResponsiveSize(30) }}
          >
            Đã xem gần đây
          </Text>
        </View>
      </SafeAreaView>

      {/* Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#10b981"]}
            tintColor="#10b981"
          />
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: getResponsiveSize(100),
        }}
      >
        {/* Error State */}
        {error && (
          <View className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <Text className="text-red-700 text-center font-medium">
              Có lỗi xảy ra khi tải dữ liệu
            </Text>
            <TouchableOpacity
              className="mt-2 self-center px-4 py-2 bg-red-100 rounded-lg"
              onPress={onRefresh}
            >
              <Text className="text-red-700 font-medium">Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading State */}
        {loading ? (
          <View className="flex-row flex-wrap justify-between">
            {[1, 2, 3, 4, 5, 6].map((_, idx) => (
              <View
                key={idx}
                className="bg-stone-100 rounded-xl mb-6"
                style={{ width: cardWidth, height: cardWidth * 0.75 }}
              />
            ))}
          </View>
        ) : allRecentItems.length > 0 ? (
          <>
            {/* Today */}
            {renderDateSection("Hôm nay", groupedItems.todayItems)}

            {/* Yesterday */}
            {renderDateSection("Hôm qua", groupedItems.yesterdayItems)}

            {/* Older */}
            {renderDateSection("Trước đó", groupedItems.olderItems)}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
