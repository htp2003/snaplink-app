import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import ProfileCard from '../../components/ProifileCard/PhotographerCard';
import LocationCard from '../../components/LocationCard/LocationCard';
import { getResponsiveSize } from '../../utils/responsive';
import { useFavorites } from '../../hooks/useFavorites';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import PhotographerCard from '../../components/ProifileCard/PhotographerCard';
import { PhotographerData } from '../../hooks/usePhotographers';
import { LocationData } from '../../hooks/useLocations';

// Type guard for PhotographerData
function isPhotographerData(data: PhotographerData | LocationData): data is PhotographerData {
  return (data as PhotographerData).fullName !== undefined;
}
// Type guard for LocationData
function isLocationData(data: PhotographerData | LocationData): data is LocationData {
  return (data as LocationData).address !== undefined;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function FavoriteContent() {
  const navigation = useNavigation<NavigationProp>();
  const { favorites, loading, toggleFavorite, refetch, isFavorite } = useFavorites();

  // Đồng bộ lại danh sách favorites mỗi khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <Text className="text-white text-lg">Loading...</Text>
      </View>
    );
  }

  // Empty state - cải thiện logic kiểm tra
  const validFavorites = favorites?.filter(item => {
    // Kiểm tra từng type riêng biệt để tránh TypeScript error
    if (item.type === 'photographer') {
      return isPhotographerData(item.data);
    }
    if (item.type === 'location') {
      return isLocationData(item.data);
    }
    return false;
  }) || [];
  
  const isEmpty = validFavorites.length === 0;
  
  if (isEmpty) {
    return (
      <View className="flex-1 justify-center items-center bg-black px-4">
        <Text className="text-white text-xl font-semibold mb-4">
          No favorites yet
        </Text>
        <Text className="text-gray-400 text-center text-base leading-6">
          Add photographers or locations to your favorites to see them here
        </Text>
      </View>
    );
  }

  // Content state
  return (
    <View className="flex-1 bg-black">
      {/* Danh sách các mục yêu thích */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingTop: getResponsiveSize(16),
          paddingBottom: getResponsiveSize(20) 
        }}
        className="px-4"
      >
        {favorites.map((item, index) => {
          // Create unique key combining type and id
          const uniqueKey = `${item.type}-${item.id}-${index}`;
          let content = null;

          if (item.type === 'photographer' && isPhotographerData(item.data)) {
            const photographer = item.data as PhotographerData;
            content = (
              <PhotographerCard
                id={item.id}
                fullName={photographer.fullName}
                avatar={photographer.avatar}
                images={photographer.images}
                styles={photographer.styles}
                rating={photographer.rating}
                hourlyRate={photographer.hourlyRate}
                availabilityStatus={photographer.availabilityStatus}
                onBooking={() => navigation.navigate('Booking', {
                  photographerId: item.id,
                  photographerName: photographer.fullName,
                  hourlyRate: photographer.hourlyRate
                })}
                isFavorite={isFavorite(item.id, item.type)}
                onFavoriteToggle={() => toggleFavorite({
                  id: item.id,
                  type: item.type,
                  data: item.data
                })}
              />
            );
          } else if (item.type === 'location' && isLocationData(item.data)) {
            const location = item.data as LocationData;
            content = (
              <LocationCard
                id={item.id}
                name={location.name}
                avatar={location.avatar}
                images={location.images}
                styles={location.styles}
                address={location.address}
                hourlyRate={location.hourlyRate}
                capacity={location.capacity}
                availabilityStatus={location.availabilityStatus}
                isFavorite={isFavorite(item.id, 'location')}
                onFavoriteToggle={() => toggleFavorite(item)}
              />
            );
          } else {
            return null;
          }

          return (
            <View
              key={uniqueKey}
              style={{ marginBottom: getResponsiveSize(16) }}
            >
              {content}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}