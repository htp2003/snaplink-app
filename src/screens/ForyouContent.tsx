import React from 'react';
import { View, Text } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import { useNavigation } from '@react-navigation/native';
import { useProfiles } from '../hooks/useProfiles';
import { useLocations } from '../hooks/useLocations';

import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView } from 'react-native';
import ProfileCard from '../components/ProifileCard/ProfileCard';
import { getResponsiveSize } from '../utils/responsive';
import LocationCard from '../components/LocationCard/LocationCard';
import { useFavorites } from '../hooks/useFavorites';






type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ForyouContent() {
    const navigation = useNavigation<NavigationProp>();
    const {profiles, loading: profilesLoading} = useProfiles();
    const {locations, loading: locationsLoading} = useLocations();
    const { isFavorite, toggleFavorite } = useFavorites();

    if ( profilesLoading || locationsLoading ) {
        return (
            <View className='flex-1 items-center justify-center'>
                <Text className='text-white'>Loading...</Text>
            </View>
        )
    }
    
  return (
    <View className='flex-1'>
        {/* Photographers Section */}
        <View className="mt-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-white text-xl font-bold">Featured Photographers</Text>
          <TouchableOpacity 
            className="flex-row items-center"
            onPress={() => navigation.navigate('ViewAllPhotographers')}
          >
            <Text className="text-white mr-1">View all</Text>
            <Ionicons name="chevron-forward" size={getResponsiveSize(16)} color="white" />
          </TouchableOpacity>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: getResponsiveSize(16) }}
        >
          {profiles.map((profile) => (
            <View 
              key={profile.id}
              style={{ width: getResponsiveSize(300), marginRight: getResponsiveSize(12) }}
            >
              <ProfileCard 
                name={profile.name}
                avatar={profile.avatar}
                images={profile.images}
                styles={profile.styles}
                onBooking={() => navigation.navigate('Booking')}
                isFavorite={isFavorite(profile.id)}
                onFavoriteToggle={() => toggleFavorite({
                  id: profile.id,
                  type: 'profile',
                  data: profile
                })}
              />
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Location Section */}
      <View className="mt-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-white text-xl font-bold">Featured Locations</Text>
          <TouchableOpacity 
            className="flex-row items-center"
            onPress={() => navigation.navigate('ViewAllLocations')}
          >
            <Text className="text-white mr-1">View all</Text>
            <Ionicons name="chevron-forward" size={getResponsiveSize(16)} color="white" />
          </TouchableOpacity>
        </View>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: getResponsiveSize(16) }}
        >
          {locations.map((location) => (
            <View 
              key={location.id}
              style={{ width: getResponsiveSize(300), marginRight: getResponsiveSize(12) }}
            >
              <LocationCard 
                name={location.name}
                avatar={location.avatar}
                images={location.images}
                styles={location.styles}
                onBooking={() => navigation.navigate('Booking')}
                isFavorite={isFavorite(location.id)}
                onFavoriteToggle={() => toggleFavorite({
                  id: location.id,
                  type: 'location',
                  data: location
                })}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  )
}