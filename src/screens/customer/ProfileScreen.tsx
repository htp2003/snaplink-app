import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import { getResponsiveSize } from '../../utils/responsive';
import { useProfile } from '../../context/ProfileContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFavorites } from '../../hooks/useFavorites';
import ProfileMiniCard from '../../components/ProifileCard/ProfileMiniCard';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';


const CustomerProfileScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('History');
  const { profileData, hasActiveSubscription } = useProfile();
  const { favorites, loading: favoritesLoading, isFavorite, toggleFavorite, refetch } = useFavorites();

  // Đồng bộ lại danh sách favorites mỗi khi màn hình được focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  // Mock data for customer
  const customerStats = {
    totalBookings: 24,
    favoritePhotographers: 8,
    totalSpent: 2500,
    memberSince: '2023'
  };

  const recentBookings = [
    {
      id: '1',
      photographerName: 'John Smith',
      service: 'Portrait Session',
      date: '2024-06-15',
      status: 'Completed',
      rating: 5,
      image: 'https://example.com/photo1.jpg'
    },
    {
      id: '2',
      photographerName: 'Sarah Johnson',
      service: 'Wedding Photography',
      date: '2024-06-10',
      status: 'Completed',
      rating: 4,
      image: 'https://example.com/photo2.jpg'
    },
    {
      id: '3',
      photographerName: 'Mike Davis',
      service: 'Event Photography',
      date: '2024-06-01',
      status: 'Pending Review',
      rating: null,
      image: 'https://example.com/photo3.jpg'
    }
  ];

  const renderStarRating = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={getResponsiveSize(12)}
          color="#FFD700"
        />
      );
    }
    return stars;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return '#32FAE9';
      case 'Pending Review':
        return '#FFD700';
      case 'Cancelled':
        return '#FF6B6B';
      default:
        return '#666';
    }
  };

  return (
    <ScrollView 
      className="flex-1 bg-black"
      contentContainerStyle={{ 
        paddingBottom: 120 + insets.bottom
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Header */}
      <View style={{ paddingTop: getResponsiveSize(50), paddingHorizontal: getResponsiveSize(20) }} className="items-center">
        {/* Avatar Section */}
        <View className="items-center mb-5">
          <View style={{ 
            width: getResponsiveSize(85), 
            height: getResponsiveSize(85),
            borderRadius: getResponsiveSize(42.5),
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: '#32FAE9'
          }} className="bg-gray-700 mb-3">
            {profileData.avatar ? (
              <Image 
                source={{ uri: profileData.avatar }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full items-center justify-center">
                <Ionicons name="person" size={getResponsiveSize(35)} color="#32FAE9" />
              </View>
            )}
          </View>
          
          <Text style={{ fontSize: getResponsiveSize(22) }} className="font-bold text-white mb-1">
            {`${profileData.firstName} ${profileData.lastName}`}
          </Text>
          <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-400">
            {`${profileData.email}`}
          </Text>
          
          {/* Member Badge */}
          <View style={{
            backgroundColor: 'rgba(50, 250, 233, 0.15)',
            borderRadius: getResponsiveSize(12),
            paddingHorizontal: getResponsiveSize(12),
            paddingVertical: getResponsiveSize(4),
            marginTop: getResponsiveSize(8),
            borderWidth: 1,
            borderColor: '#32FAE9'
          }}>
            <Text style={{ fontSize: getResponsiveSize(12) }} className="text-[#32FAE9] font-medium">
              Member since {customerStats.memberSince}
            </Text>
          </View>
        </View>
        
        {/* Customer Stats Section */}
        <View className="flex-row justify-around w-full mb-6">
          <View className="items-center px-3">
            <Text style={{ fontSize: getResponsiveSize(20) }} className="font-bold text-white">{customerStats.totalBookings}</Text>
            <Text style={{ fontSize: getResponsiveSize(12) }} className="text-gray-400 font-medium">Bookings</Text>
          </View>
          
          <View className="items-center px-3">
            <Text style={{ fontSize: getResponsiveSize(20) }} className="font-bold text-white">{customerStats.favoritePhotographers}</Text>
            <Text style={{ fontSize: getResponsiveSize(12) }} className="text-gray-400 font-medium">Favorites</Text>
          </View>
          
          <View className="items-center px-3">
            <Text style={{ fontSize: getResponsiveSize(20) }} className="font-bold text-white">${customerStats.totalSpent}</Text>
            <Text style={{ fontSize: getResponsiveSize(12) }} className="text-gray-400 font-medium">Total Spent</Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={{ paddingHorizontal: getResponsiveSize(20) }} className="mb-6">
        <View className="flex-row gap-2 mb-3">
          <TouchableOpacity 
            onPress={() => navigation.navigate('EditProfile')} 
            style={{ 
              flex: 1,
              paddingVertical: getResponsiveSize(12),
              borderRadius: getResponsiveSize(20)
            }} 
            className="flex-row items-center justify-center bg-[#32FAE9]"
          >
            <Ionicons name="create-outline" size={getResponsiveSize(18)} color="black" />
            <Text style={{ fontSize: getResponsiveSize(13) }} className="text-black ml-1 font-bold">Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={{ 
              paddingVertical: getResponsiveSize(12),
              paddingHorizontal: getResponsiveSize(16),
              borderRadius: getResponsiveSize(20),
              borderWidth: 1.5,
              borderColor: '#32FAE9'
            }} 
            className="items-center justify-center"
          >
            <Ionicons name="settings-outline" size={getResponsiveSize(18)} color="#32FAE9" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row border-b border-gray-800 mx-4">
        <TouchableOpacity 
          className="flex-1 items-center py-3"
          style={{ borderBottomWidth: activeTab === 'History' ? 2 : 0, borderBottomColor: '#32FAE9' }}
          onPress={() => setActiveTab('History')}
        >
          <Ionicons 
            name="time-outline" 
            size={getResponsiveSize(22)} 
            color={activeTab === 'History' ? '#32FAE9' : '#666'} 
          />
          <Text style={{ 
            fontSize: getResponsiveSize(11), 
            color: activeTab === 'History' ? '#32FAE9' : '#666',
            marginTop: getResponsiveSize(3)
          }} className="font-medium">
            History
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="flex-1 items-center py-3"
          style={{ borderBottomWidth: activeTab === 'Favorites' ? 2 : 0, borderBottomColor: '#32FAE9' }}
          onPress={() => setActiveTab('Favorites')}
        >
          <Ionicons 
            name="heart-outline" 
            size={getResponsiveSize(22)} 
            color={activeTab === 'Favorites' ? '#32FAE9' : '#666'} 
          />
          <Text style={{ 
            fontSize: getResponsiveSize(11), 
            color: activeTab === 'Favorites' ? '#32FAE9' : '#666',
            marginTop: getResponsiveSize(3)
          }} className="font-medium">
            Favorites
          </Text>
        </TouchableOpacity>
      </View>
        
      {/* History Tab Content */}
      {activeTab === 'History' && (
        <View style={{ paddingHorizontal: getResponsiveSize(20), paddingTop: getResponsiveSize(20) }}>
          {recentBookings.length > 0 ? (
            recentBookings.map((booking) => (
              <View key={booking.id} style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: getResponsiveSize(12),
                padding: getResponsiveSize(16),
                marginBottom: getResponsiveSize(12),
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)'
              }}>
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-1">
                    <Text style={{ fontSize: getResponsiveSize(16) }} className="text-white font-semibold">
                      {booking.photographerName}
                    </Text>
                    <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-400">
                      {booking.service}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: `${getStatusColor(booking.status)}20`,
                    paddingHorizontal: getResponsiveSize(8),
                    paddingVertical: getResponsiveSize(4),
                    borderRadius: getResponsiveSize(8),
                    borderWidth: 1,
                    borderColor: getStatusColor(booking.status)
                  }}>
                    <Text style={{ 
                      fontSize: getResponsiveSize(11), 
                      color: getStatusColor(booking.status) 
                    }} className="font-medium">
                      {booking.status}
                    </Text>
                  </View>
                </View>
                
                <View className="flex-row items-center justify-between">
                  <Text style={{ fontSize: getResponsiveSize(12) }} className="text-gray-500">
                    {booking.date}
                  </Text>
                  {booking.rating && (
                    <View className="flex-row items-center">
                      {renderStarRating(booking.rating)}
                    </View>
                  )}
                </View>
              </View>
            ))
          ) : (
            <View className="items-center py-8">
              <View style={{
                width: getResponsiveSize(65),
                height: getResponsiveSize(65),
                borderRadius: getResponsiveSize(32.5),
                backgroundColor: 'rgba(50, 250, 233, 0.2)',
                marginBottom: getResponsiveSize(16)
              }} className="items-center justify-center">
                <Ionicons name="time-outline" size={getResponsiveSize(32)} color="#32FAE9" />
              </View>
              
              <Text style={{ fontSize: getResponsiveSize(18) }} className="text-white font-semibold mb-2">No bookings yet</Text>
              <Text style={{ fontSize: getResponsiveSize(13) }} className="text-gray-400 text-center px-8">
                Start booking amazing photographers for your events
              </Text>
            </View>
          )}
        </View>
      )}
        
      {/* Favorites Tab Content */}
      {activeTab === 'Favorites' && (
        <View style={{ paddingHorizontal: getResponsiveSize(20), paddingTop: getResponsiveSize(20) }}>
          {favoritesLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <ActivityIndicator color="#FF6B6B" size="large" />
              <Text style={{ color: 'white', marginTop: 12 }}>Đang tải danh sách yêu thích...</Text>
            </View>
          ) : favorites.length > 0 ? (
            favorites.map(item => item.type === 'profile' ? (
              <ProfileMiniCard
                key={item.id}
                id={item.id}
                name={item.data.name}
                avatar={item.data.avatar}
                styles={item.data.styles}
                isFavorite={isFavorite(item.id)}
                onFavoriteToggle={() => toggleFavorite(item)}
                onPress={() => {
                    navigation.navigate('Booking');
                  }}    
              />
            ) : null)
          ) : (
            <View className="items-center py-8">
              <View style={{
                width: getResponsiveSize(65),
                height: getResponsiveSize(65),
                borderRadius: getResponsiveSize(32.5),
                backgroundColor: 'rgba(255, 107, 107, 0.2)',
                marginBottom: getResponsiveSize(16)
              }} className="items-center justify-center">
                <Ionicons name="heart-outline" size={getResponsiveSize(32)} color="#FF6B6B" />
              </View>
              <Text style={{ fontSize: getResponsiveSize(18) }} className="text-white font-semibold mb-2">No favorites yet</Text>
              <Text style={{ fontSize: getResponsiveSize(13) }} className="text-gray-400 text-center px-8">
                Heart photographers you love to save them here
              </Text>
            </View>
          )}
        </View>
      )}
      
      {/* Bottom Spacing */}
      <View style={{ height: getResponsiveSize(30) }} />
    </ScrollView>
  );
};

export default CustomerProfileScreen;