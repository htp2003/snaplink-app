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
import PhotographerCard from '../../components/ProifileCard/PhotographerCard';
import LocationCard from '../../components/LocationCard/LocationCard';
import { useNavigation } from '@react-navigation/native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CustomerHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState('photographers');
  const [textWidths, setTextWidths] = useState<{[key: string]: number}>({});

  const {
    photographers,
    loading: photographersLoading,
    error: photographersError,
    fetchFeaturedPhotographers,
  } = usePhotographers();

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
  const categories = [
    { 
      id: 'photographers', 
      icon: 'camera', 
      label: 'Thợ chụp ảnh',
      isSelected: selectedCategory === 'photographers'
    },
    { 
      id: 'locations', 
      icon: 'location', 
      label: 'Địa điểm',
      isSelected: selectedCategory === 'locations'
    },
    { 
      id: 'services', 
      icon: 'construct', 
      label: 'Dịch vụ',
      isSelected: selectedCategory === 'services'
    }
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
      <SafeAreaView className="bg-white">
        <View className="px-6 py-4 pb-2">
          <TouchableOpacity 
            className="bg-stone-100 rounded-full px-6 py-4 flex-row items-center"
          >
            <Ionicons name="search" size={20} color="#78716c" />
            <Text className="text-stone-600 font-medium ml-3 flex-1">Bắt đầu tìm kiếm</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Category Icons - Close to search bar */}
      <View className="bg-white border-b border-stone-100 px-6 pt-1 pb-3">
        <View className="flex-row justify-between items-start">
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              className="flex-col items-center flex-1"
              onPress={() => handleCategoryPress(category.id)}
            >
              {/* Icon Container */}
              <View className="items-center mb-2">
                <View 
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    category.isSelected ? 'bg-amber-100' : 'bg-stone-100'
                  }`}
                >
                  <Ionicons 
                    name={category.icon as any} 
                    size={32} 
                    color={category.isSelected ? '#d97706' : '#57534e'} 
                  />
                </View>
              </View>
              
              {/* Text label with underline for selected */}
              <View className="items-center relative">
                <Text 
                  className={`text-sm font-medium text-center ${
                    category.isSelected 
                      ? 'text-black' 
                      : 'text-gray-400'
                  }`}
                  style={{ marginBottom: getResponsiveSize(6) }}
                  onLayout={(event) => handleTextLayout(category.id, event)}
                >
                  {category.label}
                </Text>
                {category.isSelected && (
                  <View 
                  className="absolute bottom-0 bg-black rounded-full"
                  style={{ 
                    width: textWidths[category.id] || getResponsiveSize(30), 
                    height: getResponsiveSize(3),
                    bottom: -getResponsiveSize(2), 
                  }}
                />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
                  onPress={() => navigation.navigate('ViewAllPhotographers')}
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

            {/* Coming Soon Section */}
            <View className="px-6 py-6 mb-20">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xl font-semibold text-stone-900">
                  Địa điểm được yêu thích
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#57534e" />
              </View>
              
              <View className="h-48 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center">
                <View className="items-center">
                  <Ionicons name="camera" size={48} color="#d97706" />
                  <Text className="text-stone-700 font-medium mt-3">Coming soon...</Text>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Other categories content */}
        {selectedCategory === 'locations' && (
          <View className="px-6 py-6">
            <Text className="text-xl font-semibold text-stone-900 mb-4">
              Tất cả địa điểm
            </Text>
          </View>
        )}

        {selectedCategory === 'services' && (
          <View className="px-6 py-6">
            <Text className="text-xl font-semibold text-stone-900 mb-4">
              Dịch vụ khác
            </Text>
            <View className="h-48 bg-stone-100 rounded-2xl flex items-center justify-center">
              <Text className="text-stone-500">Đang phát triển...</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}