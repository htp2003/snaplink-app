import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../navigation/types';
import { getResponsiveSize } from '../utils/responsive';
import { useProfile } from '../context/ProfileContext';

const ProfileScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [activeTab, setActiveTab] = useState('Photos');
  const { profileData, hasActiveSubscription } = useProfile();
  const tabs = ['Photos', 'Reviews'];

  const handleUploadPress = () => {
    if (!hasActiveSubscription()) {
      navigation.navigate('Subscription');
      return;
    }
    // Handle upload logic here
  };

  return (
    <ScrollView className="flex-1 bg-black">
      {/* Profile Header */}
      <View style={{ padding: getResponsiveSize(20) }} className="items-center">
        <Text style={{ fontSize: getResponsiveSize(24) }} className="font-bold text-white mb-1 mt-10">{`${profileData.firstName} ${profileData.lastName}`}</Text>
        <Text style={{ fontSize: getResponsiveSize(16) }} className="text-gray-300 mb-5">{`${profileData.email}`}</Text>
        
        <View className="flex-row justify-around w-full">
          <View className="items-center">
            <View style={{ 
              width: getResponsiveSize(60), 
              height: getResponsiveSize(60),
              borderRadius: getResponsiveSize(30),
              overflow: 'hidden'
            }} className="bg-gray-400">
              {profileData.avatar ? (
                <Image 
                  source={{ uri: profileData.avatar }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <Ionicons name="person" size={getResponsiveSize(30)} color="white" />
                </View>
              )}
            </View>
          </View>
          <View className="items-center">
            <Text style={{ fontSize: getResponsiveSize(18) }} className="font-bold text-white">150k</Text>
            <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-500 font-semibold">Favorited</Text>
          </View>
          <View className="items-center">
            <Text style={{ fontSize: getResponsiveSize(18) }} className="font-bold text-white">150k</Text>
            <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-500 font-semibold">Booked</Text>
          </View>
          <View className="items-center">
            <Text style={{ fontSize: getResponsiveSize(18) }} className="font-bold text-white">4.8/5</Text>
            <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-500 font-semibold">Rating</Text>
          </View>
        </View>
      </View>

      {/* Categories Section */}
      <View style={{ paddingHorizontal: getResponsiveSize(20) }} className="mb-5">
        <View className="flex-row justify-between">
          <TouchableOpacity style={{ 
            width: getResponsiveSize(110),
            height: getResponsiveSize(40),
            borderRadius: getResponsiveSize(20)
          }} className="bg-white/10 items-center justify-center">
            <Text style={{ fontSize: getResponsiveSize(14) }} className="text-white">Portrait</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ 
            width: getResponsiveSize(110),
            height: getResponsiveSize(40),
            borderRadius: getResponsiveSize(20),
            borderWidth: getResponsiveSize(1),
          }} className="bg-white/10 items-center justify-center">
            <Text style={{ fontSize: getResponsiveSize(14) }} className="text-white">Wedding</Text>
          </TouchableOpacity>

          <TouchableOpacity style={{ 
            width: getResponsiveSize(110),
            height: getResponsiveSize(40),
            borderRadius: getResponsiveSize(20)
          }} className="bg-white/10 items-center justify-center">
            <Text style={{ fontSize: getResponsiveSize(14) }} className="text-white">Fashion</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* About Section */}
      <View style={{ paddingHorizontal: getResponsiveSize(20) }} className="mb-5">
        <Text style={{ fontSize: getResponsiveSize(12) }} className="text-white text-wrap mb-5">{`${profileData.about}`}</Text>
      </View>

      {/* Action Buttons */}
      <View style={{ paddingHorizontal: getResponsiveSize(20) }} className="flex-row justify-between mb-8">
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={{ 
          paddingVertical: getResponsiveSize(10),
          paddingHorizontal: getResponsiveSize(20),
          borderRadius: getResponsiveSize(20)
        }} className="flex-row items-center bg-[#32FAE9]">
          <Ionicons name="create-outline" size={getResponsiveSize(24)} color="black" />
          <Text style={{ fontSize: getResponsiveSize(12) }} className="text-black ml-2 font-bold">Edit Profile</Text>
        </TouchableOpacity>
        <View className="flex-row gap-2">
          {hasActiveSubscription() ? (
            <TouchableOpacity 
              onPress={() => navigation.navigate('SubscriptionManagement')}
              style={{ 
                paddingVertical: getResponsiveSize(10),
                paddingHorizontal: getResponsiveSize(20),
                borderRadius: getResponsiveSize(20)
              }} 
              className="flex-row items-center bg-[#32FAE9]"
            >
              <Ionicons name="settings-outline" size={getResponsiveSize(24)} color="black" />
              <Text style={{ fontSize: getResponsiveSize(12) }} className="text-black ml-2 font-bold">Manage Plan</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              onPress={() => navigation.navigate('Subscription')}
              style={{ 
                paddingVertical: getResponsiveSize(10),
                paddingHorizontal: getResponsiveSize(20),
                borderRadius: getResponsiveSize(20)
              }} 
              className="flex-row items-center bg-[#32FAE9]"
            >
              <Ionicons name="star" size={getResponsiveSize(24)} color="black" />
              <Text style={{ fontSize: getResponsiveSize(12) }} className="text-black ml-2 font-bold">Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View className="flex-row mt-6 border-b border-gray-800">
        <TouchableOpacity 
          className="flex-1 items-center py-3"
          style={{ borderBottomWidth: activeTab === 'Photos' ? 2 : 0, borderBottomColor: '#32FAE9' }}
          onPress={() => setActiveTab('Photos')}
        >
          <Ionicons 
            name="images-outline" 
            size={getResponsiveSize(24)} 
            color={activeTab === 'Photos' ? '#32FAE9' : 'white'} 
          />
        </TouchableOpacity>
        <TouchableOpacity 
          className="flex-1 items-center py-3"
          style={{ borderBottomWidth: activeTab === 'Reviews' ? 2 : 0, borderBottomColor: '#32FAE9' }}
          onPress={() => setActiveTab('Reviews')}
        >
          <Ionicons 
            name="star-outline" 
            size={getResponsiveSize(24)} 
            color={activeTab === 'Reviews' ? '#32FAE9' : 'white'} 
          />
        </TouchableOpacity>
      </View>
        
      {/* Photos Grid */}
      {activeTab === 'Photos' && (
        <View className="items-center">
          <Text style={{ fontSize: getResponsiveSize(18) }} className="text-white mb-2.5 mt-5">No photo yet</Text>
          <Text style={{ fontSize: getResponsiveSize(16) }} className="text-white text-center mb-5">Share photos on your page</Text>
          <TouchableOpacity 
            onPress={handleUploadPress}
            style={{ 
              paddingVertical: getResponsiveSize(10),
              paddingHorizontal: getResponsiveSize(20),
              borderRadius: getResponsiveSize(20)
            }} 
            className="flex-row items-center bg-[#5A8FF2]"
          >
            <Ionicons name="cloud-upload-outline" size={getResponsiveSize(24)} color="#fff" />
            <Text style={{ fontSize: getResponsiveSize(16) }} className="text-white ml-2">Upload</Text> 
          </TouchableOpacity>           
        </View>
      )}
        
      {/* Reviews Tab Content */}
      {activeTab === 'Reviews' && (
        <View className="items-center justify-center py-10">
          <Ionicons name="star-outline" size={getResponsiveSize(50)} color="#32FAE9" />
          <Text className="text-gray-400 text-center mt-2 px-10">
            You have no reviews yet.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

export default ProfileScreen;