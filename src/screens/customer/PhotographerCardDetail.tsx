import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StatusBar, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { getResponsiveSize } from '../../utils/responsive';
import { useFavorites, FavoriteItem } from '../../hooks/useFavorites';
import { usePhotographerDetail } from '../../hooks/usePhotographerDetail';
import { LinearGradient } from 'expo-linear-gradient';


type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ProfileCardDetailRouteProp = RouteProp<RootStackParamList, 'PhotographerCardDetail'>;

const { width } = Dimensions.get('window');

export default function ProfileCardDetail() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ProfileCardDetailRouteProp>();
  const { photographerId } = route.params;

  const [activeTab, setActiveTab] = useState('about'); // 'photos' or 'reviews'
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { photographerDetail, loading, error, fetchPhotographerById } = usePhotographerDetail();
  
  useEffect(() => {
    if (photographerId) {
      console.log('PhotographerCardDetail mounted with photographerId:', photographerId);
      fetchPhotographerById(photographerId);
    }
  }, [photographerId]);

  useEffect(() => {
    if (error) {
      Alert.alert(
        'Error',
        `Failed to load photographer details: ${error}`,
        [
          {
            text: 'Retry',
            onPress: () => fetchPhotographerById(photographerId)
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
    if (!photographerDetail) return;
    
    const favoriteItem: FavoriteItem = {
      id: photographerDetail.photographerId.toString(),
      type: 'photographer',
      data: {
        id: photographerDetail.photographerId.toString(),
        fullName: photographerDetail.fullName || 'Unknown',
        avatar: photographerDetail.profileImage || '',
        images: photographerDetail.portfolioUrl ? [photographerDetail.portfolioUrl] : [],
        styles: Array.isArray(photographerDetail.styles)
        ? photographerDetail.styles
        : (photographerDetail.styles && '$values' in photographerDetail.styles)
          ? (photographerDetail.styles as any).$values
          : [],
        rating: photographerDetail.rating,
        hourlyRate: photographerDetail.hourlyRate,
        availabilityStatus: photographerDetail.availabilityStatus
      }
    };
    
    if (isFavorite(photographerDetail.photographerId.toString())) {
      removeFavorite(photographerDetail.photographerId.toString());
    } else {
      addFavorite(favoriteItem);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons key={i} name="star" size={getResponsiveSize(18)} color="#facc15" />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <Ionicons key="half" name="star-half" size={getResponsiveSize(18)} color="#facc15" />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons key={`empty-${i}`} name="star-outline" size={getResponsiveSize(18)} color="#d1d5db" />
      );
    }
    
    return stars;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };
  const getPortfolioImages = () => {
    if (photographerDetail?.portfolioUrl) {
      return [photographerDetail.portfolioUrl];
    } else if (photographerDetail?.profileImage) {
      return [photographerDetail.profileImage];
    }
    // Return placeholder images
    return [
      'https://via.placeholder.com/300x300?text=Portfolio+1',
      'https://via.placeholder.com/300x300?text=Portfolio+2',
      'https://via.placeholder.com/300x300?text=Portfolio+3',
      'https://via.placeholder.com/300x300?text=Portfolio+4',
    ];
  };

  // Get availability status color
  const getAvailabilityColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'available':
        return '#10B981'; // green
      case 'busy':
        return '#F59E0B'; // yellow
      case 'unavailable':
        return '#EF4444'; // red
      default:
        return '#6B7280'; // gray
    }
  };
               

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 bg-black justify-center items-center">
        <ActivityIndicator size="large" color="#32FAE9" />
        <Text className="text-white mt-4 text-lg">Loading photographer...</Text>
      </View>
    );
  }

  if (!photographerDetail) {
    return (
      <View className="flex-1 bg-black justify-center items-center px-6">
        <Ionicons name="person-remove-outline" size={80} color="#666" />
        <Text className="text-white text-2xl font-bold mt-6 text-center">
          Photographer Not Found
        </Text>
        <Text className="text-gray-400 text-center mt-3 leading-6">
          The photographer you're looking for might have been removed or doesn't exist.
        </Text>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="mt-8 px-8 py-4 bg-blue-500 rounded-2xl"
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
              name={isFavorite(photographerDetail.photographerId.toString()) ? 'heart' : 'heart-outline'}
              size={24}
              color={isFavorite(photographerDetail.photographerId.toString()) ? '#FF3B30' : 'white'}
            />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View className="items-center px-6 pb-6">
          <View className="relative mb-4">
            <Image
              source={{ uri: photographerDetail.profileImage || 'https://via.placeholder.com/150' }}
              style={{ width: 120, height: 120 }}
              className="rounded-full"
            />
            
            {/* Status Badges */}
            <View className="absolute -bottom-2 -right-2 flex-row">
              {photographerDetail.verificationStatus?.toLowerCase() === 'verified' && (
                <View className="w-8 h-8 bg-green-500 rounded-full items-center justify-center mr-1">
                  <Ionicons name="checkmark" size={16} color="white" />
                </View>
              )}
              {photographerDetail.featuredStatus && (
                <View className="w-8 h-8 bg-yellow-500 rounded-full items-center justify-center">
                  <Ionicons name="star" size={16} color="white" />
                </View>
              )}
            </View>
          </View>

          <Text className="text-white text-2xl font-bold text-center mb-2">
            {photographerDetail.fullName}
          </Text>
          
          <Text className="text-[#32FAE9] text-lg font-medium mb-4">
            {photographerDetail.specialty || 'Professional Photographer'}
          </Text>

          {/* Rating Section */}
          {photographerDetail.rating && (
            <View className="flex-row items-center mb-6">
              <View className="flex-row mr-3">
                {renderStars(photographerDetail.rating)}
              </View>
              <Text className="text-white text-lg font-semibold">
                {photographerDetail.rating.toFixed(1)}
              </Text>
              <Text className="text-gray-400 ml-1">
                ({photographerDetail.ratingCount || 0} reviews)
              </Text>
            </View>
          )}

          {/* Stats Row */}
          <View className="flex-row justify-around w-full bg-gray-900 rounded-2xl py-4 px-6">
            <View className="items-center">
              <Text className="text-white text-xl font-bold">
                {photographerDetail.yearsExperience || 0}
              </Text>
              <Text className="text-gray-400 text-sm">Years Exp</Text>
            </View>
            
            <View className="items-center">
              <View className="flex-row items-center">
                <View 
                  className="w-4 h-4 rounded-full mr-2"
                  style={{ backgroundColor: getAvailabilityColor(photographerDetail.availabilityStatus) }}
                />
                <Text 
                  className="text-base font-semibold capitalize"
                  style={{ color: getAvailabilityColor(photographerDetail.availabilityStatus) }}
                >
                  {photographerDetail.availabilityStatus}
                </Text>
              </View>
              <Text className="text-gray-400 text-sm mt-1">Status</Text>
            </View>
            
            <View className="items-center">
              <Text className="text-white text-xl font-bold">
                ${photographerDetail.hourlyRate || 0}
              </Text>
              <Text className="text-gray-400 text-sm">Per Hour</Text>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View className="flex-row bg-gray-900 mx-4 rounded-2xl p-1 mb-4">
          {[
            { key: 'about', label: 'About', icon: 'person-outline' },
            { key: 'portfolio', label: 'Portfolio', icon: 'images-outline' },
            { key: 'reviews', label: 'Reviews', icon: 'chatbubble-outline' }
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
          {/* About Tab - Hiển thị mặc định */}
          {activeTab === 'about' && (
            <View>
              {/* Bio */}
              {photographerDetail.bio && (
                <View className="bg-gray-900 rounded-2xl p-6 mb-4">
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="information-circle-outline" size={20} color="#32FAE9" />
                    <Text className="text-[#32FAE9] text-lg font-bold ml-2">About Me</Text>
                  </View>
                  <Text className="text-gray-300 text-base leading-6">
                    {photographerDetail.bio}
                  </Text>
                </View>
              )}

              {/* Skills & Styles */}
              {photographerDetail.styles && Array.isArray(photographerDetail.styles) && photographerDetail.styles.length > 0 && (
                <View className="bg-gray-900 rounded-2xl p-6 mb-4">
                  <View className="flex-row items-center mb-4">
                    <Ionicons name="brush-outline" size={20} color="#32FAE9" />
                    <Text className="text-[#32FAE9] text-lg font-bold ml-2">Specialties</Text>
                  </View>
                  <View className="flex-row flex-wrap gap-3">
                    {photographerDetail.styles.map((style, index) => (
                      <View
                        key={index}
                        className="bg-[#32FAE9]/20 border border-[#32FAE9]/30 px-4 py-2 rounded-full"
                      >
                        <Text className="text-[#32FAE9] font-medium">{style}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Contact Info */}
              <View className="bg-gray-900 rounded-2xl p-6 mb-4">
                <View className="flex-row items-center mb-4">
                  <Ionicons name="call-outline" size={20} color="#32FAE9" />
                  <Text className="text-[#32FAE9] text-lg font-bold ml-2">Contact</Text>
                </View>
                
                {photographerDetail.email && (
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="mail-outline" size={18} color="#666" />
                    <Text className="text-white ml-3">{photographerDetail.email}</Text>
                  </View>
                )}
                
                {photographerDetail.phoneNumber && (
                  <View className="flex-row items-center mb-3">
                    <Ionicons name="call-outline" size={18} color="#666" />
                    <Text className="text-white ml-3">{photographerDetail.phoneNumber}</Text>
                  </View>
                )}
                
                {photographerDetail.portfolioUrl && (
                  <TouchableOpacity className="flex-row items-center">
                    <Ionicons name="globe-outline" size={18} color="#666" />
                    <Text className="text-[#32FAE9] ml-3 underline">
                      Portfolio Website
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Portfolio Tab */}
          {activeTab === 'portfolio' && (
            <View className="mb-4">
              <View className="flex-row flex-wrap gap-2">
                {getPortfolioImages().map((photo, index) => (
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

          {/* Reviews Tab */}
          {activeTab === 'reviews' && (
            <View className="mb-4">
              {photographerDetail.reviews && photographerDetail.reviews.length > 0 ? (
                photographerDetail.reviews.map(review => (
                  <View key={review.id} className="bg-gray-900 rounded-2xl p-6 mb-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row">
                        {renderStars(review.rating)}
                      </View>
                      <Text className="text-gray-400 text-sm">
                        {formatDate(review.createdAt)}
                      </Text>
                    </View>
                    
                    {review.comment && (
                      <Text className="text-gray-300 text-base leading-6 mb-4">
                        {review.comment}
                      </Text>
                    )}
                    
                    <View className="flex-row items-center">
                      <Image 
                        source={{ uri: review.reviewer?.profilePictureUrl || 'https://via.placeholder.com/40' }}
                        className="w-10 h-10 rounded-full mr-3"
                      />
                      <Text className="text-white font-semibold">
                        {review.reviewer?.fullName || 'Anonymous'}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <View className="items-center py-12">
                  <Ionicons name="chatbubbles-outline" size={64} color="#666" />
                  <Text className="text-white text-xl font-bold mt-4">No Reviews Yet</Text>
                  <Text className="text-gray-400 text-center mt-2">
                    This photographer hasn't received any reviews yet.
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Floating Book Button */}
        <View className="px-4 pb-6">
          <TouchableOpacity
            onPress={() => navigation.navigate('Booking', { 
              photographerId: photographerDetail.photographerId.toString(),
              photographerName: photographerDetail.fullName || 'Photographer',
              hourlyRate: photographerDetail.hourlyRate 
            })}
            disabled={photographerDetail.availabilityStatus?.toLowerCase() === 'unavailable'}
            style={{
              opacity: photographerDetail.availabilityStatus?.toLowerCase() === 'unavailable' ? 0.5 : 1
            }}
          >
            <LinearGradient
              colors={['#32FAE9', '#4F46E5']}
              className="py-4 rounded-2xl items-center"
            >
              <Text className="text-white font-bold text-lg">
                {photographerDetail.availabilityStatus?.toLowerCase() === 'unavailable' ? 'Unavailable' : 'Book Now'}
              </Text>
              {photographerDetail.hourlyRate && (
                <Text className="text-white/80 text-sm mt-1">
                  ${photographerDetail.hourlyRate}/hour
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}