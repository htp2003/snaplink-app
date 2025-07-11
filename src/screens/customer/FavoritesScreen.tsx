import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Alert,
  Image,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Hooks and Components
import { useFavorites } from '../../hooks/useFavorites';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { getResponsiveSize } from '../../utils/responsive';
import { RootStackParamList } from '../../navigation/types';
import RecentGridPreview from '../../components/RecentGridPreview';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 cards per row with 16px padding each side + 16px gap

export default function FavoritesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const {
    favorites,
    loading: favoritesLoading,
    error: favoritesError,
    removeFavorite,
    getFavoritePhotographers,
    getFavoriteLocations,
    refetch: refetchFavorites
  } = useFavorites();

  const {
    recentlyViewed,
    loading: recentlyLoading,
    error: recentlyError,
    removeFromRecentlyViewed,
    clearRecentlyViewed,
    getRecentlyViewedPhotographers,
    getRecentlyViewedLocations,
    getTimeAgo,
    refetch: refetchRecently
  } = useRecentlyViewed();

  // Get data
  const favoritePhotographers = useMemo(() => getFavoritePhotographers(), [favorites]);
  const favoriteLocations = useMemo(() => getFavoriteLocations(), [favorites]);
  const recentPhotographers = useMemo(() => getRecentlyViewedPhotographers(), [recentlyViewed]);
  const recentLocations = useMemo(() => getRecentlyViewedLocations(), [recentlyViewed]);

  // Combine and sort recent items
  const allRecentItems = useMemo(() => {
    return [...recentPhotographers, ...recentLocations].sort((a, b) =>
      new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
    );
  }, [recentPhotographers, recentLocations]);

  // Group recent items by date
  const groupedRecentItems = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayItems = allRecentItems.filter(item => {
      const itemDate = new Date(item.viewedAt);
      return itemDate.toDateString() === today.toDateString();
    });

    const yesterdayItems = allRecentItems.filter(item => {
      const itemDate = new Date(item.viewedAt);
      return itemDate.toDateString() === yesterday.toDateString();
    });

    const olderItems = allRecentItems.filter(item => {
      const itemDate = new Date(item.viewedAt);
      return itemDate.toDateString() !== today.toDateString() &&
        itemDate.toDateString() !== yesterday.toDateString();
    });

    return { todayItems, yesterdayItems, olderItems };
  }, [allRecentItems]);

  // Combine all favorites
  const allFavorites = useMemo(() => {
    return [...favoritePhotographers, ...favoriteLocations];
  }, [favoritePhotographers, favoriteLocations]);

  const hasFavoriteItems = allFavorites.length > 0;
  const hasRecentItems = allRecentItems.length > 0;

  // Debug logs
  React.useEffect(() => {
    console.log('=== FavoritesScreen Debug ===');
    console.log('hasFavoriteItems:', hasFavoriteItems);
    console.log('hasRecentItems:', hasRecentItems);
    console.log('allFavorites:', allFavorites.length);
    console.log('allRecentItems:', allRecentItems.length);
    console.log('editMode:', editMode);
  }, [hasFavoriteItems, hasRecentItems, allFavorites.length, allRecentItems.length, editMode]);

  // Auto tắt edit mode khi không còn favorites
  React.useEffect(() => {
    if (!hasFavoriteItems && editMode) {
      console.log('No favorites left, turning off edit mode');
      setEditMode(false);
    }
  }, [hasFavoriteItems, editMode]);

  // Initial data load
  React.useEffect(() => {
    const initialRefresh = async () => {
      try {
        await Promise.all([refetchFavorites(), refetchRecently()]);
        console.log('Initial data loaded');
      } catch (error) {
        console.error('Error initial refresh:', error);
      }
    };

    initialRefresh();
  }, []);

  // Handle refresh
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchFavorites(), refetchRecently()]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle edit mode with validation
  const toggleEditMode = () => {
    if (hasFavoriteItems) {
      setEditMode(!editMode);
    } else {
      // Nếu không có favorites thì không cho vào edit mode
      setEditMode(false);
    }
  };

  // Handle remove favorite item
  const handleRemoveFavorite = (id: string, type: 'photographer' | 'location') => {
    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc muốn xóa khỏi danh sách yêu thích?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => removeFavorite(id, type)
        }
      ]
    );
  };

  // Render grid card (2x2 layout)
  const renderGridCard = (item: any, section: 'recent' | 'favorite', itemIndex: number) => {
    const isLocation = item.locationId !== undefined || (item.data && item.data.locationId !== undefined);
    const actualItem = item.data || item;

    const id = isLocation ? (actualItem.locationId?.toString() || actualItem.id) : actualItem.id;
    const name = isLocation ? actualItem.name : actualItem.fullName;
    const subtitle = isLocation ? actualItem.address : (actualItem.styles?.[0] || actualItem.specialty || 'Photographer');
    const imageUri = actualItem.images?.[0] || actualItem.avatar;

    const uniqueKey = `${section}-${isLocation ? 'location' : 'photographer'}-${id}-${itemIndex}`;

    const fallbackImage = isLocation
      ? 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop'
      : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face';

    return (
      <TouchableOpacity
        key={uniqueKey}
        className="mb-4"
        onPress={() => {
          if (editMode && section === 'favorite') return;

          if (isLocation) {
            navigation.navigate('LocationCardDetail', { locationId: id });
          } else {
            navigation.navigate('PhotographerCardDetail', { photographerId: id });
          }
        }}
        style={{ width: cardWidth }}
      >
        {/* Image container */}
        <View className="relative">
          <Image
            source={{ uri: imageUri || fallbackImage }}
            style={{
              width: '100%',
              height: cardWidth * 0.75,
              borderRadius: 12
            }}
            className="bg-stone-200"
            resizeMode="cover"
          />

          {/* Remove button in edit mode - CHỈ cho favorites */}
          {editMode && section === 'favorite' && (
            <TouchableOpacity
              className="absolute top-2 left-2 bg-white rounded-full w-6 h-6 items-center justify-center shadow-sm"
              onPress={() => handleRemoveFavorite(id, isLocation ? 'location' : 'photographer')}
            >
              <Ionicons name="close" size={14} color="black" />
            </TouchableOpacity>
          )}

          {/* Time badge for recent items */}
          {section === 'recent' && item.viewedAt && (
            <View className="absolute bottom-2 left-2 bg-black/60 rounded-full px-2 py-1">
              <Text className="text-white text-xs font-medium">
                {getTimeAgo(item.viewedAt)}
              </Text>
            </View>
          )}
        </View>

        {/* Content - CHỈ hiển thị text cho favorites */}
        {section === 'favorite' && (
          <View className="mt-2">
            <Text
              className="text-stone-900 font-semibold"
              style={{ fontSize: getResponsiveSize(14) }}
              numberOfLines={1}
            >
              {name || 'Unnamed'}
            </Text>
            <Text
              className="text-stone-600 mt-1"
              style={{ fontSize: getResponsiveSize(12) }}
              numberOfLines={1}
            >
              {subtitle}
            </Text>

            {/* Price for locations */}
            {isLocation && actualItem.hourlyRate && (
              <Text
                className="text-emerald-600 font-medium mt-1"
                style={{ fontSize: getResponsiveSize(12) }}
              >
                ₫{actualItem.hourlyRate.toLocaleString()}/giờ
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="white" barStyle="dark-content" />

      {/* Header */}
      <SafeAreaView className="bg-white">
        {/* Edit button container - LUÔN có để giữ spacing consistent */}
        <View className="flex-row justify-end px-4 pt-2 pb-2" style={{ minHeight: getResponsiveSize(44) }}>
          {hasFavoriteItems && !favoritesLoading && (
            <TouchableOpacity
              onPress={toggleEditMode}
              className="bg-stone-100 rounded-full px-6 py-3"
            >
              <Text
                className="text-stone-700 font-medium"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                {editMode ? 'Hoàn tất' : 'Chỉnh sửa'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Title - với spacing consistent */}
        <View className="px-4 pb-4">
          <Text
            className="text-stone-900 font-bold"
            style={{ fontSize: getResponsiveSize(28) }}
          >
            Danh sách Yêu thích
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
            colors={['#10b981']}
            tintColor="#10b981"
          />
        }
        contentContainerStyle={{
          paddingBottom: getResponsiveSize(100)
        }}
      >
        {/* Error State */}
        {(favoritesError || recentlyError) && (
          <View className="mx-4 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
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
        {(favoritesLoading || recentlyLoading) ? (
          <View className="px-4">
            <View className="bg-stone-100 rounded h-6 w-32 mb-4" />
            <View className="flex-row flex-wrap justify-between">
              {[1, 2, 3, 4].map((_, idx) => (
                <View
                  key={idx}
                  className="bg-stone-100 rounded-xl mb-4"
                  style={{ width: cardWidth, height: cardWidth * 0.75 }}
                />
              ))}
            </View>
          </View>
        ) : (
          <>
            {/* Recent items ảnh TRƯỚC, text SAU */}
            {hasRecentItems && (
              <View className="mb-6 px-4">
                {/* Hiển thị 4 ảnh recent items đầu tiên */}
                <View className="flex-row flex-wrap justify-between mb-4">
                  <RecentGridPreview
                   items={allRecentItems.slice(0, 4).map(item => ({
                    image:
                      // Nếu là location thì lấy images[0], nếu là photographer thì lấy avatar hoặc images[0]
                      'images' in item && Array.isArray(item.images) && item.images.length > 0
                        ? item.images[0]
                        : 'avatar' in item && item.avatar
                        ? item.avatar
                        : undefined
                  }))}
                    onPress={() => navigation.navigate('RecentlyViewedScreen')}
                    size={getResponsiveSize(160)}
                  />
                </View>

                {/* Text "Đã xem gần đây" với nút xem thêm */}
                <TouchableOpacity
                  onPress={() => navigation.navigate('RecentlyViewedScreen')}
                  className="mb-2"
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-stone-900 font-bold"
                      style={{ fontSize: getResponsiveSize(18) }}
                    >
                      Đã xem gần đây
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Date sections */}
                {groupedRecentItems.todayItems.length > 0 && (
                  <Text
                    className="text-stone-500 font-medium"
                    style={{ fontSize: getResponsiveSize(15) }}
                  >
                    Hôm nay
                  </Text>                )}

                {groupedRecentItems.yesterdayItems.length > 0 && (
                  <View>
                    <Text
                      className="text-stone-500 font-medium"
                      style={{ fontSize: getResponsiveSize(15) }}
                    >
                      Hôm qua
                    </Text>
                    <View className="flex-row flex-wrap justify-between mt-2 mb-4">
                      {groupedRecentItems.yesterdayItems.map((item, idx) =>
                        renderGridCard(item, 'recent', idx)
                      )}
                    </View>
                  </View>
                )}

                {groupedRecentItems.olderItems.length > 0 && (
                  <View>
                    <Text
                      className="text-stone-500 font-medium"
                      style={{ fontSize: getResponsiveSize(15) }}
                    >
                      Trước đó
                    </Text>
                    <View className="flex-row flex-wrap justify-between mt-2 mb-4">
                      {groupedRecentItems.olderItems.map((item, idx) =>
                        renderGridCard(item, 'recent', idx)
                      )}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Nếu không có recent items */}
            {!hasRecentItems && (
              <View className="mb-6 px-4">
                <View className="items-center py-8">
                  <Text
                    className="text-stone-500 text-center"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    Chưa có mục nào được xem gần đây
                  </Text>
                </View>

                <View className="mb-2">
                  <Text
                    className="text-stone-900 font-bold"
                    style={{ fontSize: getResponsiveSize(18) }}
                  >
                    Đã xem gần đây
                  </Text>
                </View>
              </View>
            )}

            {/* Favorites Section - có text description */}
            {hasFavoriteItems && (
              <View className="px-4">
                <View className="flex-row flex-wrap justify-between">
                  {allFavorites.map((item, index) =>
                    renderGridCard(item, 'favorite', index)
                  )}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}