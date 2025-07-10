import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';

// Hook and Component
import { usePhotographers } from '../../hooks/usePhotographers';
import { useLocations } from '../../hooks/useLocations';
import { useFavorites } from '../../hooks/useFavorites';
import PhotographerCard from '../../components/Photographer/PhotographerCard';
import LocationCard from '../../components/LocationCard/LocationCard';
import { useNavigation } from '@react-navigation/native';
import CategoryTabs, { CategoryItem } from '../../components/CategoryTabs';
import { SearchBar } from '../../components/SearchBar';
import { useCurrentUserId } from '../../hooks/useAuth';
import { photographerStyleRecommendations } from '../../hooks/useStyleRecommendations';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CustomerHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState('photographers');
  const [textWidths, setTextWidths] = useState<{ [key: string]: number }>({});

  const currentUserId = useCurrentUserId();

  const {
    photographers,
    loading: photographersLoading,
    error: photographersError,
    fetchFeaturedPhotographers,
  } = usePhotographers();

  const {
    recommendedPhotographers,
    loading: recommendationsLoading,
    error: recommendationsError,
    refreshRecommendations,
  } = photographerStyleRecommendations(currentUserId || 0);

  const {
    locations,
    loading: locationsLoading,
    error: locationsError,
    refreshLocations
  } = useLocations();

  const { isFavorite, toggleFavorite } = useFavorites();

  useEffect(() => {
    fetchFeaturedPhotographers();
  }, []);

  // Categories for top navigation
  const categories: CategoryItem[] = [
    { id: 'photographers', icon: 'camera', label: 'Thợ chụp ảnh' },
    { id: 'locations', icon: 'location', label: 'Địa điểm' },
    { id: 'services', icon: 'construct', label: 'Dịch vụ' }
  ];

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === 'locations' && locations.length === 0) {
      refreshLocations();
    }
  };

  // Hàm để lưu độ rộng của text
  const handleTextLayout = (categoryId: string, event: any) => {
    const { width } = event.nativeEvent.layout;
    setTextWidths(prev => ({
      ...prev,
      [categoryId]: width
    }));
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="white" barStyle="dark-content" />

      {/* Search Bar - Fixed at top */}
      <SearchBar />

      {/* Category Icons - Close to search bar */}
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryPress={handleCategoryPress}
      />

      {/* Main Content */}
      <ScrollView 
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: getResponsiveSize(100) }}
      >
        {/* Photographers Section */}
        {selectedCategory === 'photographers' && (
          <>
            <View className="px-6 py-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xl font-semibold text-stone-900">
                  Thợ chụp ảnh được yêu thích
                </Text>
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => navigation.navigate('ViewAllPhotographers', {
                    type: 'featured',
                    title: 'Thợ chụp ảnh được yêu thích'
                  })}
                >
                  <Ionicons name="chevron-forward" size={20} color="#57534e" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {photographersLoading ? (
                  [1, 2, 3].map((_, index) => (
                    <View
                      key={`loading-${index}`}
                      className="w-64 h-72 bg-stone-100 rounded-2xl mr-3"
                    />
                  ))
                ) : photographers.length > 0 ? (
                  photographers.map((photographer) => (
                    <View
                      key={photographer.id}
                      style={{ width: getResponsiveSize(260), marginRight: 12 }}
                    >
                      <PhotographerCard
                        id={photographer.id}
                        fullName={photographer.fullName}
                        avatar={photographer.avatar}
                        images={photographer.images}
                        styles={photographer.styles}
                        rating={photographer.rating}
                        hourlyRate={photographer.hourlyRate}
                        availabilityStatus={photographer.availabilityStatus}
                        onBooking={() => navigation.navigate('Booking', {
                          photographerId: photographer.id,
                          photographerName: photographer.fullName,
                          hourlyRate: photographer.hourlyRate
                        })}
                        isFavorite={isFavorite(photographer.id, 'photographer')}
                        onFavoriteToggle={() => toggleFavorite({
                          id: photographer.id,
                          type: 'photographer',
                          data: photographer
                        })}
                      />
                    </View>
                  ))
                ) : (
                  <View className="flex-1 items-center justify-center py-8">
                    <Text className="text-stone-500 text-center">
                      Không có thợ chụp ảnh nào
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>



            {/*Photographer by style */}
            <View className="px-6 py-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xl font-semibold text-stone-900">
                  Thợ chụp ảnh theo Style của bạn
                </Text>
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => navigation.navigate('ViewAllPhotographers', {
                    type: 'recommendations',
                    title: 'Thợ chụp ảnh theo Style của bạn',
                    userId: currentUserId
                  })}
                >
                  <Ionicons name="chevron-forward" size={20} color="#57534e" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {photographersLoading ? (
                  [1, 2, 3].map((_, index) => (
                    <View
                      key={`loading-recommendations-${index}`}
                      className="w-64 h-72 bg-stone-100 rounded-2xl mr-3"
                    />
                  ))
                ) : recommendedPhotographers.length > 0 ? (
                  recommendedPhotographers.map((photographer) => (
                    <View
                      key={`recommended-${photographer.id}`}
                      style={{ width: getResponsiveSize(260), marginRight: 12 }}
                    >
                      <PhotographerCard
                        id={photographer.id}
                        fullName={photographer.fullName}
                        avatar={photographer.avatar}
                        images={photographer.images}
                        styles={photographer.styles}
                        rating={photographer.rating}
                        hourlyRate={photographer.hourlyRate}
                        availabilityStatus={photographer.availabilityStatus}
                        onBooking={() => navigation.navigate('Booking', {
                          photographerId: photographer.id,
                          photographerName: photographer.fullName,
                          hourlyRate: photographer.hourlyRate
                        })}
                        isFavorite={isFavorite(photographer.id, 'photographer')}
                        onFavoriteToggle={() => toggleFavorite({
                          id: photographer.id,
                          type: 'photographer',
                          data: photographer
                        })}
                      />
                    </View>
                  ))
                ) : (
                  <View className="flex-1 items-center justify-center py-8">
                  <Text className="text-stone-500 text-center">
                    {recommendationsError 
                      ? 'Không thể tải gợi ý theo style' 
                      : !currentUserId 
                      ? 'Vui lòng đăng nhập để xem gợi ý'
                      : 'Chưa có gợi ý theo style'}
                  </Text>
                  {recommendationsError && currentUserId && (
                    <TouchableOpacity
                      className="mt-2 px-4 py-2 bg-stone-200 rounded-lg"
                      onPress={refreshRecommendations}
                    >
                      <Text className="text-stone-700">Thử lại</Text>
                    </TouchableOpacity>
                  )}
                </View>
                )}
              </ScrollView>
            </View>
          </>
        )}

        {/* Other categories content */}
        {selectedCategory === 'locations' && (
          <>
            {/* Locations Section */}
            <View className="px-6 py-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xl font-semibold text-stone-900">
                  Địa điểm được yêu thích
                </Text>
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => navigation.navigate('ViewAllLocations')}
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
                  [1, 2, 3].map((_, index) => (
                    <View
                      key={`loading-${index}`}
                      className="w-64 h-72 bg-stone-100 rounded-2xl mr-3"
                    />
                  ))
                ) : locations.length > 0 ? (
                  locations.map((location) => (
                    <View
                      key={location.locationId}
                      style={{ width: getResponsiveSize(260), marginRight: 12 }}
                    >
                      <LocationCard
                        locationId={location.locationId}
                        name={location.name}
                        images={location.images}
                        address={location.address}
                        hourlyRate={location.hourlyRate}
                        capacity={location.capacity}
                        availabilityStatus={location.availabilityStatus}
                        styles={location.styles}
                        isFavorite={isFavorite(location.id, 'location')}
                        onFavoriteToggle={() => toggleFavorite({
                          id: location.id,
                          type: 'location',
                          data: location
                        })}
                      />
                    </View>
                  ))
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
        )}

        {selectedCategory === 'services' && (
          <>
            <Text className="text-xl font-semibold text-stone-900 mb-4">
              Dịch vụ khác
            </Text>
            <View className="h-48 bg-stone-100 rounded-2xl flex items-center justify-center">
              <Text className="text-stone-500">Đang phát triển...</Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}