import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LocationCard from '../../components/LocationCard/LocationCard';
import { getResponsiveSize } from '../../utils/responsive';
import { useLocations } from '../../hooks/useLocations';
import { useFavorites } from '../../hooks/useFavorites';

type Props = NativeStackScreenProps<RootStackParamList, 'ViewAllLocations'>;

export default function ViewAllLocations({ navigation }: Props) {
  const { locations, loading } = useLocations();
  const { isFavorite, toggleFavorite } = useFavorites();

  return (
    <SafeAreaView className='flex-1 bg-black'>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      
      {/* Header with back button and title */}
      <View className="flex-row items-center px-4 py-3">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-4">All Locations</Text>
      </View>
      
      {/* Main Content - Scrollable */}
      <ScrollView 
        className='flex-1 px-4' 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: getResponsiveSize(20) }}
      >
        {loading ? (
          <View className="flex-1 justify-center items-center pt-10">
            <Text className="text-white">Loading...</Text>
          </View>
        ) : (
          <View className="flex-1">
            {locations.map((location) => (
              <View 
                key={location.id}
                style={{ marginBottom: getResponsiveSize(20) }}
              >
                <LocationCard 
                  locationId={Number(location.id)}
                  name={location.name}
                  images={location.images}
                  styles={location.styles}
                  isFavorite={isFavorite(location.id)}
                  onFavoriteToggle={() => toggleFavorite({
                    id: location.id,
                    type: 'location',
                    data: location
                  })}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}