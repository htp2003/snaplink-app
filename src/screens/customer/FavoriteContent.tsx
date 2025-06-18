import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import ProfileCard from '../../components/ProifileCard/ProfileCard';
import LocationCard from '../../components/LocationCard/LocationCard';
import { getResponsiveSize } from '../../utils/responsive';
import { useFavorites } from '../../hooks/useFavorites';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function FavoriteContent() {
  const navigation = useNavigation<NavigationProp>();
  const { favorites, loading, toggleFavorite, refetch } = useFavorites();


  // Đồng bộ lại danh sách favorites mỗi khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-white">Loading...</Text>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text className="text-white text-lg">No favorites yet</Text>
        <Text className="text-gray-400 text-center mt-2 px-8">
          Add photographers or locations to your favorites to see them here
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Danh sách các mục yêu thích */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: getResponsiveSize(16) }}
      >
        {favorites.map((item) => (
          <View 
            key={item.id}
            style={{ marginBottom: getResponsiveSize(16) }}
          >
            {item.type === 'profile' ? (
              <ProfileCard 
                id={item.id}
                name={item.data.name}
                avatar={item.data.avatar}
                images={item.data.images}
                styles={item.data.styles}
                onBooking={() => navigation.navigate('Booking')}
                isFavorite={true}
                onFavoriteToggle={() => toggleFavorite(item)}
              />
            ) : (
              <LocationCard 
                name={item.data.name}
                avatar={item.data.avatar}
                images={item.data.images}
                styles={item.data.styles}
                isFavorite={true}
                onFavoriteToggle={() => toggleFavorite(item)}
              />
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}