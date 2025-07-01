import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StatusBar, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { getResponsiveSize } from '../../utils/responsive';
import { useFavorites, FavoriteItem } from '../../hooks/useFavorites';
import { useLocationDetail } from '../../hooks/useLocationDetail';
import { LinearGradient } from 'expo-linear-gradient';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type LocationCardDetailRouteProp = RouteProp<RootStackParamList, 'LocationCardDetail'>;

const { width, height } = Dimensions.get('window');

export default function LocationCardDetail() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LocationCardDetailRouteProp>();
  const { locationId } = route.params;
  
  const [activeTab, setActiveTab] = useState('about');
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { locationDetail, loading, error, fetchLocationById } = useLocationDetail();

  useEffect(() => {
    if (locationId) {
      console.log('LocationCardDetail mounted with locationId:', locationId);
      fetchLocationById(locationId);
    }
  }, [locationId]);

  useEffect(() => {
    if (error) {
      Alert.alert(
        'Error',
        `Failed to load location details: ${error}`,
        [
          {
            text: 'Retry',
            onPress: () => fetchLocationById(locationId)
          },
          {
            text: 'Go Back',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  }, [error]);

  const handleToggleFavorite = () => {
    if (!locationDetail) return;
    
    const favoriteItem: FavoriteItem = {
      id: locationDetail.locationId.toString(),
      type: 'location',
      data: {
        id: locationDetail.locationId.toString(),
        locationId: locationDetail.locationId,
        name: locationDetail.name || 'Unknown Location',
        avatar: '',
        images: getGalleryImages(),
        styles: getAmenities(),
        address: locationDetail.address,
        hourlyRate: locationDetail.hourlyRate,
        availabilityStatus: locationDetail.availabilityStatus
      }
    };
    
    if (isFavorite(locationDetail.locationId.toString(), 'location')) {
      removeFavorite(locationDetail.locationId.toString(), 'location');
    } else {
      addFavorite(favoriteItem);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getGalleryImages = () => {
    if (locationDetail?.locationImages?.$values && locationDetail.locationImages.$values.length > 0) {
      return locationDetail.locationImages.$values.map(img => img.imageUrl);
    }
    // Return placeholder images
    return [
      'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400',
      'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=400',
      'https://images.unsplash.com/photo-1540518614846-7eded47c9eb8?w=400',
      'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400',
      'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400',
      'https://images.unsplash.com/photo-1542744173-05336fcc7ad4?w=400',
    ];
  };

  const getAmenities = () => {
    if (locationDetail?.amenities) {
      return locationDetail.amenities.split(',').map(a => a.trim());
    }
    const amenities = [];
    if (locationDetail?.indoor) amenities.push('Indoor');
    if (locationDetail?.outdoor) amenities.push('Outdoor');
    return amenities.length > 0 ? amenities : ['Studio Space'];
  };

  const getAvailabilityColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'available': return '#10B981';
      case 'busy': return '#F59E0B';
      case 'unavailable': return '#EF4444';
      default: return '#6B7280';
    }
  };

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#32FAE9" />
        <Text className="text-white mt-4 text-lg">Loading location details...</Text>
      </View>
    );
  }

  if (!locationDetail) {
    return (
      <View className="flex-1 bg-black justify-center items-center px-6">
        <Ionicons name="location-outline" size={80} color="#666" />
        <Text className="text-white text-2xl font-bold mt-6 text-center">
          Location Not Found
        </Text>
        <Text className="text-gray-400 text-center mt-3 leading-6">
          The location you're looking for might have been removed or doesn't exist.
        </Text>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="mt-8 px-8 py-4 bg-green-500 rounded-2xl"
        >
          <Text className="text-white font-bold text-lg">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" backgroundColor="black" />
      
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-4">
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            className="w-12 h-12 bg-gray-800 rounded-2xl items-center justify-center"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={handleToggleFavorite}
            className="w-12 h-12 bg-gray-800 rounded-2xl items-center justify-center"
          >
            <Ionicons
              name={isFavorite(locationDetail.locationId.toString()) ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite(locationDetail.locationId.toString()) ? '#FF3B30' : 'white'}
            />
          </TouchableOpacity>
        </View>

        {/* Location Header */}
        <View className="items-center px-6 pb-6">
          <View className="relative mb-4">
            <View
              style={{ width: 120, height: 120 }}
              className="rounded-full bg-gray-800 items-center justify-center"
            >
              <Ionicons name="location" size={60} color="#32FAE9" />
            </View>
            
            {/* Status Badges */}
            <View className="absolute -bottom-2 -right-2 flex-row">
              {locationDetail.verificationStatus?.toLowerCase() === 'verified' && (
                <View className="w-8 h-8 bg-green-500 rounded-full items-center justify-center mr-1">
                  <Ionicons name="checkmark" size={16} color="white" />
                </View>
              )}
              {locationDetail.featuredStatus && (
                <View className="w-8 h-8 bg-yellow-500 rounded-full items-center justify-center">
                  <Ionicons name="star" size={16} color="white" />
                </View>
              )}
            </View>
          </View>

          <Text className="text-white text-2xl font-bold text-center mb-2">
            {locationDetail.name}
          </Text>
          
          {locationDetail.address && (
            <Text className="text-gray-400 text-base text-center mb-4">
              {locationDetail.address}
            </Text>
          )}

          {/* Stats Row */}
          <View className="flex-row justify-around w-full bg-gray-900 rounded-2xl py-4 px-6">
            <View className="items-center">
              <Text className="text-white text-xl font-bold">
                {locationDetail.capacity || 0}
              </Text>
              <Text className="text-gray-400 text-sm">Capacity</Text>
            </View>
            
            <View className="items-center">
              <View className="flex-row items-center">
                <View 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: getAvailabilityColor(locationDetail.availabilityStatus) }}
                />
                <Text 
                  className="text-sm font-semibold capitalize"
                  style={{ color: getAvailabilityColor(locationDetail.availabilityStatus) }}
                >
                  {locationDetail.availabilityStatus}
                </Text>
              </View>
              <Text className="text-gray-400 text-sm">Status</Text>
            </View>
            
            <View className="items-center">
              <Text className="text-white text-xl font-bold">
                ${locationDetail.hourlyRate || 0}
              </Text>
              <Text className="text-gray-400 text-sm">Per Hour</Text>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View className="flex-row bg-gray-900 mx-4 rounded-2xl p-1 mb-4">
          {[
            { key: 'about', label: 'About', icon: 'information-circle-outline' },
            { key: 'gallery', label: 'Gallery', icon: 'images-outline' },
            { key: 'owner', label: 'Owner', icon: 'person-outline' }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 flex-row items-center justify-center py-3 rounded-xl ${
                activeTab === tab.key ? 'bg-[#32FAE9]' : ''
              }`}
            >
              <Ionicons
                name={tab.icon as any}
                size={18}
                color={activeTab === tab.key ? 'black' : 'white'}
              />
              <Text className={`ml-2 font-semibold text-sm ${
                activeTab === tab.key ? 'text-black' : 'text-white'
              }`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content Area */}
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {/* About Tab */}
          {activeTab === 'about' && (
            <View>
              {/* Description */}
              {locationDetail.description && (
                <View className="bg-gray-900 rounded-2xl p-6 mb-4">
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="document-text-outline" size={20} color="#32FAE9" />
                    <Text className="text-[#32FAE9] text-lg font-bold ml-2">Description</Text>
                  </View>
                  <Text className="text-gray-300 text-base leading-6">
                    {locationDetail.description}
                  </Text>
                </View>
              )}

              {/* Amenities */}
              {getAmenities().length > 0 && (
                <View className="bg-gray-900 rounded-2xl p-6 mb-4">
                  <View className="flex-row items-center mb-4">
                    <Ionicons name="checkmark-circle-outline" size={20} color="#32FAE9" />
                    <Text className="text-[#32FAE9] text-lg font-bold ml-2">Amenities</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-3">
                    {getAmenities().map((amenity, index) => (
                      <View
                        key={index}
                        className="bg-[#32FAE9]/20 border border-[#32FAE9]/30 px-4 py-2 rounded-full"
                      >
                        <Text className="text-[#32FAE9] font-medium">{amenity}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Space Type */}
              <View className="bg-gray-900 rounded-2xl p-6 mb-4">
                <View className="flex-row items-center mb-4">
                  <Ionicons name="business-outline" size={20} color="#32FAE9" />
                  <Text className="text-[#32FAE9] text-lg font-bold ml-2">Space Details</Text>
                </View>
                
                <View className="space-y-3">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-400">Indoor Space</Text>
                    <View className="flex-row items-center">
                      <Ionicons 
                        name={locationDetail.indoor ? "checkmark-circle" : "close-circle"} 
                        size={20} 
                        color={locationDetail.indoor ? "#10B981" : "#EF4444"} 
                      />
                      <Text className={`ml-2 ${locationDetail.indoor ? 'text-green-400' : 'text-red-400'}`}>
                        {locationDetail.indoor ? 'Available' : 'Not Available'}
                      </Text>
                    </View>
                  </View>
                  
                  <View className="flex-row items-center justify-between">
                    <Text className="text-gray-400">Outdoor Space</Text>
                    <View className="flex-row items-center">
                      <Ionicons 
                        name={locationDetail.outdoor ? "checkmark-circle" : "close-circle"} 
                        size={20} 
                        color={locationDetail.outdoor ? "#10B981" : "#EF4444"} 
                      />
                      <Text className={`ml-2 ${locationDetail.outdoor ? 'text-green-400' : 'text-red-400'}`}>
                        {locationDetail.outdoor ? 'Available' : 'Not Available'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Gallery Tab */}
          {activeTab === 'gallery' && (
            <View className="mb-4">
              <View className="flex-row flex-wrap gap-2">
                {getGalleryImages().map((photo, index) => (
                  <View
                    key={index}
                    className="rounded-2xl overflow-hidden"
                    style={{
                      width: (width - 24) / 2,
                      height: (width - 24) / 2,
                    }}
                  >
                    <Image
                      source={{ uri: photo }}
                      className="w-full h-full"
                      resizeMode="cover"
                    />
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Owner Tab */}
          {activeTab === 'owner' && (
            <View className="mb-4">
              {locationDetail.locationOwner ? (
                <View className="bg-gray-900 rounded-2xl p-6">
                  <View className="flex-row items-center mb-4">
                    <Ionicons name="business-outline" size={20} color="#32FAE9" />
                    <Text className="text-[#32FAE9] text-lg font-bold ml-2">Business Information</Text>
                  </View>
                  
                  {locationDetail.locationOwner.businessName && (
                    <View className="mb-3">
                      <Text className="text-gray-400 text-sm">Business Name</Text>
                      <Text className="text-white text-base">{locationDetail.locationOwner.businessName}</Text>
                    </View>
                  )}
                  
                  {locationDetail.locationOwner.businessAddress && (
                    <View className="mb-3">
                      <Text className="text-gray-400 text-sm">Business Address</Text>
                      <Text className="text-white text-base">{locationDetail.locationOwner.businessAddress}</Text>
                    </View>
                  )}
                  
                  {locationDetail.locationOwner.businessRegistrationNumber && (
                    <View className="mb-3">
                      <Text className="text-gray-400 text-sm">Registration Number</Text>
                      <Text className="text-white text-base">{locationDetail.locationOwner.businessRegistrationNumber}</Text>
                    </View>
                  )}
                  
                  {locationDetail.locationOwner.verificationStatus && (
                    <View className="flex-row items-center">
                      <Ionicons 
                        name={locationDetail.locationOwner.verificationStatus === 'Verified' ? "shield-checkmark" : "shield-outline"} 
                        size={20} 
                        color={locationDetail.locationOwner.verificationStatus === 'Verified' ? "#10B981" : "#F59E0B"} 
                      />
                      <Text className={`ml-2 font-semibold ${locationDetail.locationOwner.verificationStatus === 'Verified' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {locationDetail.locationOwner.verificationStatus}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View className="items-center py-12">
                  <Ionicons name="person-outline" size={64} color="#666" />
                  <Text className="text-white text-xl font-bold mt-4">No Owner Information</Text>
                  <Text className="text-gray-400 text-center mt-2">
                    Owner details are not available for this location.
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}