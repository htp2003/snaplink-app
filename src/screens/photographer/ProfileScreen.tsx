import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import { getResponsiveSize } from '../../utils/responsive';
import { useProfile } from '../../context/ProfileContext';
import FavoritedModal from '../../components/FavoritedModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ProfileScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('Photos');
  const { profileData, hasActiveSubscription } = useProfile();
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  const favoritedUsers = [
    { id: '1', name: 'John Doe', avatar: 'https://example.com/avatar1.jpg' },
    { id: '2', name: 'Jane Smith', avatar: 'https://example.com/avatar2.jpg' },
    { id: '3', name: 'Mike Johnson' },
  ];

  const handleUploadPress = () => {
    if (!hasActiveSubscription()) {
      navigation.navigate('Subscription');
      return;
    }
    // Handle upload logic here
  };

  const handleFavoritedPress = () => {
    console.log("Opening favorited modal");
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    console.log("Closing favorited modal");
    setIsModalVisible(false);
  };

  return (
    <>
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
          </View>
          
          {/* Stats Section */}
          <View className="flex-row justify-around w-full mb-6">
            <TouchableOpacity 
              className="items-center px-3"
              onPress={handleFavoritedPress}
            >
              <Text style={{ fontSize: getResponsiveSize(20) }} className="font-bold text-white">150k</Text>
              <Text style={{ fontSize: getResponsiveSize(12) }} className="text-gray-400 font-medium">Favorited</Text>
            </TouchableOpacity>
            
            <View className="items-center px-3">
              <Text style={{ fontSize: getResponsiveSize(20) }} className="font-bold text-white">150k</Text>
              <Text style={{ fontSize: getResponsiveSize(12) }} className="text-gray-400 font-medium">Booked</Text>
            </View>
            
            <View className="items-center px-3">
              <Text style={{ fontSize: getResponsiveSize(20) }} className="font-bold text-white">4.8</Text>
              <View className="flex-row items-center">
                <Ionicons name="star" size={getResponsiveSize(14)} color="#FFD700" />
                <Text style={{ fontSize: getResponsiveSize(12) }} className="text-gray-400 font-medium ml-1">Rating</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Categories Section */}
        <View style={{ paddingHorizontal: getResponsiveSize(20) }} className="mb-6">
          <Text style={{ fontSize: getResponsiveSize(16) }} className="text-white font-semibold mb-3">Specialties</Text>
          <View className="flex-row justify-between">
            <TouchableOpacity style={{ 
              flex: 0.32,
              height: getResponsiveSize(38),
              borderRadius: getResponsiveSize(19),
              backgroundColor: 'rgba(50, 250, 233, 0.15)',
              borderWidth: 1,
              borderColor: '#32FAE9'
            }} className="items-center justify-center">
              <Text style={{ fontSize: getResponsiveSize(13) }} className="text-[#32FAE9] font-medium">Portrait</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ 
              flex: 0.32,
              height: getResponsiveSize(38),
              borderRadius: getResponsiveSize(19),
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }} className="items-center justify-center">
              <Text style={{ fontSize: getResponsiveSize(13) }} className="text-white font-medium">Wedding</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{ 
              flex: 0.32,
              height: getResponsiveSize(38),
              borderRadius: getResponsiveSize(19),
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }} className="items-center justify-center">
              <Text style={{ fontSize: getResponsiveSize(13) }} className="text-white font-medium">Fashion</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* About Section */}
        <View style={{ paddingHorizontal: getResponsiveSize(20) }} className="mb-6">
          <Text style={{ fontSize: getResponsiveSize(16) }} className="text-white font-semibold mb-2">About</Text>
          <Text style={{ fontSize: getResponsiveSize(14), lineHeight: getResponsiveSize(20) }} className="text-gray-300">
            {profileData.about}
          </Text>
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
              <Ionicons name="share-outline" size={getResponsiveSize(18)} color="#32FAE9" />
            </TouchableOpacity>
          </View>
          
          {/* Subscription Section */}
          <View style={{
            backgroundColor: hasActiveSubscription() ? 'rgba(50, 250, 233, 0.1)' : 'rgba(90, 143, 242, 0.1)',
            borderRadius: getResponsiveSize(12),
            borderWidth: 1,
            borderColor: hasActiveSubscription() ? '#32FAE9' : '#5A8FF2',
            padding: getResponsiveSize(14)
          }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text style={{ fontSize: getResponsiveSize(14) }} className="text-white font-semibold mb-1">
                  {hasActiveSubscription() ? 'Premium Plan' : 'Upgrade to Premium'}
                </Text>
                <Text style={{ fontSize: getResponsiveSize(12) }} className="text-gray-400">
                  {hasActiveSubscription() ? 'Manage your subscription' : 'Unlock premium features'}
                </Text>
              </View>
              
              <TouchableOpacity 
                onPress={() => navigation.navigate(hasActiveSubscription() ? 'SubscriptionManagement' : 'Subscription')}
                style={{ 
                  paddingVertical: getResponsiveSize(8),
                  paddingHorizontal: getResponsiveSize(16),
                  borderRadius: getResponsiveSize(16),
                  backgroundColor: hasActiveSubscription() ? '#32FAE9' : '#5A8FF2'
                }} 
              >
                <View className="flex-row items-center">
                  <Ionicons 
                    name={hasActiveSubscription() ? "settings-outline" : "star"} 
                    size={getResponsiveSize(16)} 
                    color={hasActiveSubscription() ? "black" : "white"} 
                  />
                  <Text style={{ 
                    fontSize: getResponsiveSize(11), 
                    color: hasActiveSubscription() ? "black" : "white"
                  }} className="ml-1 font-bold">
                    {hasActiveSubscription() ? 'Manage' : 'Upgrade'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tab Navigation */}
        <View className="flex-row border-b border-gray-800 mx-4">
          <TouchableOpacity 
            className="flex-1 items-center py-3"
            style={{ borderBottomWidth: activeTab === 'Photos' ? 2 : 0, borderBottomColor: '#32FAE9' }}
            onPress={() => setActiveTab('Photos')}
          >
            <Ionicons 
              name="images-outline" 
              size={getResponsiveSize(22)} 
              color={activeTab === 'Photos' ? '#32FAE9' : '#666'} 
            />
            <Text style={{ 
              fontSize: getResponsiveSize(11), 
              color: activeTab === 'Photos' ? '#32FAE9' : '#666',
              marginTop: getResponsiveSize(3)
            }} className="font-medium">
              Photos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className="flex-1 items-center py-3"
            style={{ borderBottomWidth: activeTab === 'Reviews' ? 2 : 0, borderBottomColor: '#32FAE9' }}
            onPress={() => setActiveTab('Reviews')}
          >
            <Ionicons 
              name="star-outline" 
              size={getResponsiveSize(22)} 
              color={activeTab === 'Reviews' ? '#32FAE9' : '#666'} 
            />
            <Text style={{ 
              fontSize: getResponsiveSize(11), 
              color: activeTab === 'Reviews' ? '#32FAE9' : '#666',
              marginTop: getResponsiveSize(3)
            }} className="font-medium">
              Reviews
            </Text>
          </TouchableOpacity>
        </View>
          
        {/* Photos Tab Content */}
        {activeTab === 'Photos' && (
          <View className="items-center py-8">
            <View style={{
              width: getResponsiveSize(65),
              height: getResponsiveSize(65),
              borderRadius: getResponsiveSize(32.5),
              backgroundColor: 'rgba(90, 143, 242, 0.2)',
              marginBottom: getResponsiveSize(16)
            }} className="items-center justify-center">
              <Ionicons name="images-outline" size={getResponsiveSize(32)} color="#5A8FF2" />
            </View>
            
            <Text style={{ fontSize: getResponsiveSize(18) }} className="text-white font-semibold mb-2">No photos yet</Text>
            <Text style={{ fontSize: getResponsiveSize(13) }} className="text-gray-400 text-center mb-6 px-8">
              Share your best work with the community
            </Text>
            
            <TouchableOpacity 
              onPress={handleUploadPress}
              style={{ 
                paddingVertical: getResponsiveSize(12),
                paddingHorizontal: getResponsiveSize(24),
                borderRadius: getResponsiveSize(20)
              }} 
              className="flex-row items-center bg-[#5A8FF2]"
            >
              <Ionicons name="cloud-upload-outline" size={getResponsiveSize(18)} color="#fff" />
              <Text style={{ fontSize: getResponsiveSize(14) }} className="text-white ml-2 font-medium">Upload Photos</Text> 
            </TouchableOpacity>           
          </View>
        )}
          
        {/* Reviews Tab Content */}
        {activeTab === 'Reviews' && (
          <View className="items-center py-8">
            <View style={{
              width: getResponsiveSize(65),
              height: getResponsiveSize(65),
              borderRadius: getResponsiveSize(32.5),
              backgroundColor: 'rgba(50, 250, 233, 0.2)',
              marginBottom: getResponsiveSize(16)
            }} className="items-center justify-center">
              <Ionicons name="star-outline" size={getResponsiveSize(32)} color="#32FAE9" />
            </View>
            
            <Text style={{ fontSize: getResponsiveSize(18) }} className="text-white font-semibold mb-2">No reviews yet</Text>
            <Text style={{ fontSize: getResponsiveSize(13) }} className="text-gray-400 text-center px-8">
              Your reviews from clients will appear here
            </Text>
          </View>
        )}
        
        {/* Bottom Spacing */}
        <View style={{ height: getResponsiveSize(30) }} />
      </ScrollView>

      {/* Modal */}
      <FavoritedModal 
        visible={isModalVisible}
        favoritedUsers={favoritedUsers}
        onClose={handleModalClose}
      />
    </>
  );
};

export default ProfileScreen;