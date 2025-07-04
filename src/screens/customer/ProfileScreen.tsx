import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import { getResponsiveSize } from '../../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { useCustomerProfile } from '../../hooks/useCustomerProfile';
import { useFavorites } from '../../hooks/useFavorites';
import ProfileMiniCard from '../../components/ProifileCard/ProfileMiniCard';
import { PhotographerData } from '../../hooks/usePhotographers';

const CustomerProfileScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('History');
  
  const {
    user,
    stats,
    loading,
    refreshing,
    error,
    refresh,
    clearError,
    getRecentBookings,
    getRecentTransactions,
    getUnreadNotifications,
    formatDate,
    hasActiveSubscription,
    getActiveSubscription,
    getMembershipDuration,
    isProfileComplete,
    getProfileCompletionPercentage,
    updateProfile,
    updateProfileImage
  } = useCustomerProfile();

  const { favorites, loading: favoritesLoading, isFavorite, toggleFavorite, refetch } = useFavorites();

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      refresh();
      refetch(); // Refresh favorites when screen is focused
    }, [])
  );

  // Handle refresh
  const onRefresh = useCallback(() => {
    refresh();
    refetch();
  }, [refresh, refetch]);

  // Handle profile update
  const handleUpdateProfile = useCallback(async () => {
    try {
      Alert.alert(
        "Update Profile",
        "Feature coming soon!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "OK", onPress: () => navigation.navigate('EditProfile') }
        ]
      );
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
    }
  }, [navigation]);

  // Handle retry
  const handleRetry = useCallback(() => {
    clearError();
    refresh();
  }, [clearError, refresh]);

  // Render star rating
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

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '#32FAE9';
      case 'pending':
      case 'confirmed':
        return '#FFD700';
      case 'cancelled':
        return '#FF6B6B';
      default:
        return '#666';
    }
  };

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator size="large" color="#32FAE9" />
        <Text className="text-white mt-4">Loading profile...</Text>
      </View>
    );
  }

  // Error state
  if (error) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-4">
        <Ionicons name="alert-circle-outline" size={getResponsiveSize(48)} color="#FF6B6B" />
        <Text className="text-white text-center mt-4 mb-6">{error}</Text>
        <TouchableOpacity
          onPress={handleRetry}
          className="bg-[#32FAE9] px-6 py-3 rounded-lg"
        >
          <Text className="text-black font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!user || !stats) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-white">No user data available</Text>
      </View>
    );
  }

  const recentBookings = getRecentBookings(5);
  const recentTransactions = getRecentTransactions(5);
  const activeSubscription = getActiveSubscription();
  const unreadNotifications = getUnreadNotifications().length;

  return (
    <ScrollView 
      className="flex-1 bg-black"
      contentContainerStyle={{ 
        paddingBottom: 120 + insets.bottom
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#32FAE9" />
      }
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
          }} className="bg-gray-700 mb-3 relative">
            {user.profileImage ? (
              <Image 
                source={{ uri: user.profileImage }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full items-center justify-center">
                <Ionicons name="person" size={getResponsiveSize(35)} color="#32FAE9" />
              </View>
            )}
            
            {/* Profile completion indicator */}
            {!isProfileComplete() && (
              <View style={{
                position: 'absolute',
                top: -2,
                right: -2,
                backgroundColor: '#FFD700',
                borderRadius: getResponsiveSize(10),
                width: getResponsiveSize(20),
                height: getResponsiveSize(20),
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Text style={{ fontSize: getResponsiveSize(8), color: 'black', fontWeight: 'bold' }}>
                  {getProfileCompletionPercentage()}%
                </Text>
              </View>
            )}
            
            {/* Clickable overlay for profile image update */}
            <TouchableOpacity 
              style={{ 
                position: 'absolute', 
                bottom: 0, 
                right: 0, 
                backgroundColor: '#32FAE9',
                borderRadius: getResponsiveSize(15),
                width: getResponsiveSize(30),
                height: getResponsiveSize(30),
                justifyContent: 'center',
                alignItems: 'center'
              }}
              onPress={handleUpdateProfile}
            >
              <Ionicons name="camera" size={getResponsiveSize(16)} color="black" />
            </TouchableOpacity>
          </View>
          
          <Text style={{ fontSize: getResponsiveSize(22) }} className="font-bold text-white mb-1">
            {user.fullName}
          </Text>
          <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-400">
            {user.email}
          </Text>
          
          {/* Member Badge */}
          <View className="flex-row items-center mt-2">
            <View style={{
              backgroundColor: 'rgba(50, 250, 233, 0.15)',
              borderRadius: getResponsiveSize(12),
              paddingHorizontal: getResponsiveSize(12),
              paddingVertical: getResponsiveSize(4),
              marginRight: getResponsiveSize(8),
              borderWidth: 1,
              borderColor: '#32FAE9'
            }}>
              <Text style={{ fontSize: getResponsiveSize(12) }} className="text-[#32FAE9] font-medium">
                Member for {getMembershipDuration()}
              </Text>
            </View>
            
            {hasActiveSubscription() && (
              <View style={{
                backgroundColor: 'rgba(255, 215, 0, 0.15)',
                borderRadius: getResponsiveSize(12),
                paddingHorizontal: getResponsiveSize(12),
                paddingVertical: getResponsiveSize(4),
                borderWidth: 1,
                borderColor: '#FFD700'
              }}>
                <Text style={{ fontSize: getResponsiveSize(12) }} className="text-[#FFD700] font-medium">
                  {activeSubscription?.planName || 'Premium'}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Customer Stats Section */}
        <View className="flex-row justify-around w-full mb-6">
          <View className="items-center px-3">
            <Text style={{ fontSize: getResponsiveSize(20) }} className="font-bold text-white">
              {stats.totalBookings}
            </Text>
            <Text style={{ fontSize: getResponsiveSize(12) }} className="text-gray-400 font-medium">
              Bookings
            </Text>
          </View>
          
          <View className="items-center px-3">
            <Text style={{ fontSize: getResponsiveSize(20) }} className="font-bold text-white">
              {stats.favoritePhotographers}
            </Text>
            <Text style={{ fontSize: getResponsiveSize(12) }} className="text-gray-400 font-medium">
              Favorites
            </Text>
          </View>
          
          <View className="items-center px-3">
            <Text style={{ fontSize: getResponsiveSize(20) }} className="font-bold text-white">
              ${stats.totalSpent.toFixed(0)}
            </Text>
            <Text style={{ fontSize: getResponsiveSize(12) }} className="text-gray-400 font-medium">
              Total Spent
            </Text>
          </View>
          
          <View className="items-center px-3">
            <Text style={{ fontSize: getResponsiveSize(20) }} className="font-bold text-white">
              {unreadNotifications}
            </Text>
            <Text style={{ fontSize: getResponsiveSize(12) }} className="text-gray-400 font-medium">
              Notifications
            </Text>
          </View>
        </View>
      </View>

      {/* Profile Completion Alert */}
      {!isProfileComplete() && (
        <View style={{ 
          marginHorizontal: getResponsiveSize(20), 
          marginBottom: getResponsiveSize(16),
          backgroundColor: 'rgba(255, 215, 0, 0.1)',
          borderRadius: getResponsiveSize(12),
          padding: getResponsiveSize(12),
          borderWidth: 1,
          borderColor: '#FFD700'
        }}>
          <View className="flex-row items-center">
            <Ionicons name="warning-outline" size={getResponsiveSize(20)} color="#FFD700" />
            <Text style={{ fontSize: getResponsiveSize(14), marginLeft: getResponsiveSize(8) }} className="text-white flex-1">
              Complete your profile ({getProfileCompletionPercentage()}%) to unlock all features
            </Text>
          </View>
        </View>
      )}

      {/* Action Buttons */}
      <View style={{ paddingHorizontal: getResponsiveSize(20) }} className="mb-6">
        <View className="flex-row gap-2 mb-3">
          <TouchableOpacity 
            onPress={handleUpdateProfile} 
            style={{ 
              flex: 1,
              paddingVertical: getResponsiveSize(12),
              borderRadius: getResponsiveSize(20)
            }} 
            className="flex-row items-center justify-center bg-[#32FAE9]"
          >
            <Ionicons name="create-outline" size={getResponsiveSize(18)} color="black" />
            <Text style={{ fontSize: getResponsiveSize(13) }} className="text-black ml-1 font-bold">
              Edit Profile
            </Text>
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
        
        <TouchableOpacity 
          className="flex-1 items-center py-3"
          style={{ borderBottomWidth: activeTab === 'Transactions' ? 2 : 0, borderBottomColor: '#32FAE9' }}
          onPress={() => setActiveTab('Transactions')}
        >
          <Ionicons 
            name="card-outline" 
            size={getResponsiveSize(22)} 
            color={activeTab === 'Transactions' ? '#32FAE9' : '#666'} 
          />
          <Text style={{ 
            fontSize: getResponsiveSize(11), 
            color: activeTab === 'Transactions' ? '#32FAE9' : '#666',
            marginTop: getResponsiveSize(3)
          }} className="font-medium">
            Transactions
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
                      Booking #{booking.id}
                    </Text>
                    <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-400">
                      {booking.notes || 'Photography Service'}
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
                    {formatDate(booking.bookingDate)}
                  </Text>
                  <Text style={{ fontSize: getResponsiveSize(14) }} className="text-[#32FAE9] font-semibold">
                    ${booking.totalAmount.toFixed(2)}
                  </Text>
                </View>
                
                {booking.rating && (
                  <View className="flex-row items-center mt-2">
                    <Text style={{ fontSize: getResponsiveSize(12) }} className="text-gray-400 mr-2">
                      Your rating:
                    </Text>
                    <View className="flex-row">
                      {renderStarRating(booking.rating)}
                    </View>
                  </View>
                )}
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
              
              <Text style={{ fontSize: getResponsiveSize(18) }} className="text-white font-semibold mb-2">
                No bookings yet
              </Text>
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
              <Text style={{ color: 'white', marginTop: 12 }}>Loading favorites...</Text>
            </View>
          ) : (() => {
            const favoritePhotographers = favorites.filter(item => item.type === 'photographer');
            return favoritePhotographers.length > 0 ? (
              favoritePhotographers.map(item => {
                const photographer = item.data as PhotographerData;
                const avatar = Array.isArray(photographer.images) && photographer.images.length > 0 ? photographer.images[0] : undefined;
                return (
                  <ProfileMiniCard
                    key={item.id}
                    id={item.id}
                    fullName={photographer.fullName}
                    avatar={avatar}
                    styles={photographer.styles}
                    isFavorite={isFavorite(item.id)}
                    isBooked={!!user?.bookings?.$values?.some(b => b.photographerId?.toString() === item.id)}
                    onFavoriteToggle={() => toggleFavorite(item)}
                    onPress={() => {
                      navigation.navigate('PhotographerCardDetail', { photographerId: item.id });
                    }}    
                  />
                );
              })
            ) : (
              <View className="items-center py-8">
                <View style={{
                  width: getResponsiveSize(65),
                  height: getResponsiveSize(65),
                  borderRadius: getResponsiveSize(32.5),
                  backgroundColor: 'rgba(50, 250, 233, 0.2)',
                  marginBottom: getResponsiveSize(16),
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Ionicons name="heart-outline" size={getResponsiveSize(32)} color="#32FAE9" />
                </View>
                <Text style={{ fontSize: getResponsiveSize(18) }} className="text-white font-semibold mb-2">
                  No favorites yet
                </Text>
                <Text style={{ fontSize: getResponsiveSize(13), color: '#aaa', textAlign: 'center', paddingHorizontal: getResponsiveSize(24) }}>
                  Your favorite photographers will appear here
                </Text>
              </View>
            );
          })()}

        </View>
      )}

      {/* Transactions Tab Content */}
      {activeTab === 'Transactions' && (
        <View style={{ paddingHorizontal: getResponsiveSize(20), paddingTop: getResponsiveSize(20) }}>
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <TouchableOpacity 
                key={transaction.id} 
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: getResponsiveSize(12),
                  padding: getResponsiveSize(16),
                  marginBottom: getResponsiveSize(12),
                  borderWidth: 1,
                  borderColor: 'rgba(255, 255, 255, 0.1)'
                }}
                onPress={() => {
                  Alert.alert(
                    "Transaction Details",
                    `Amount: ${transaction.amount}\nDate: ${formatDate(transaction.transactionDate)}\nStatus: ${transaction.status}\nType: ${transaction.transactionType}`,
                    [{ text: "OK" }]
                  );
                }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1">
                    <Text style={{ fontSize: getResponsiveSize(16) }} className="text-white font-semibold">
                      {transaction.description}
                    </Text>
                    <Text style={{ fontSize: getResponsiveSize(12) }} className="text-gray-400">
                      {formatDate(transaction.transactionDate)} • {transaction.transactionType}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text style={{ 
                      fontSize: getResponsiveSize(16), 
                      color: transaction.amount > 0 ? '#32FAE9' : '#FF6B6B' 
                    }} className="font-semibold">
                      {transaction.amount > 0 ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                    </Text>
                    <Text style={{ 
                      fontSize: getResponsiveSize(11), 
                      color: getStatusColor(transaction.status) 
                    }} className="font-medium">
                      {transaction.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
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
                <Ionicons name="card-outline" size={getResponsiveSize(32)} color="#32FAE9" />
              </View>
              
              <Text style={{ fontSize: getResponsiveSize(18) }} className="text-white font-semibold mb-2">
                No transactions yet
              </Text>
              <Text style={{ fontSize: getResponsiveSize(13) }} className="text-gray-400 text-center px-8">
                Your payment history will appear here
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