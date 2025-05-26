import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../navigation/types';
import { getResponsiveSize } from '../utils/responsive';

const ProfileScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [activeTab, setActiveTab] = useState('Photos');

  const tabs = ['Photos', 'Reviews'];
  return (
    <ScrollView className="flex-1 bg-black">
      {/* Profile Header */}
      <View style={{ padding: getResponsiveSize(20) }} className="items-center">
        <Text style={{ fontSize: getResponsiveSize(24) }} className="font-bold text-white mb-1 mt-10">Tuấn Dương Quá</Text>
        <Text style={{ fontSize: getResponsiveSize(16) }} className="text-gray-300 mb-5">@tuanduongqua</Text>
        
        <View className="flex-row justify-around w-full ">
          <View className="items-center">
            <View style={{ 
              width: getResponsiveSize(60), 
              height: getResponsiveSize(60),
              borderRadius: getResponsiveSize(30)
            }} className="bg-gray-400" />
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
        <Text style={{ fontSize: getResponsiveSize(12) }} className="text-white text-wrap mb-5">Share photos on your page</Text>
      </View>

      {/* Action Buttons */}
      <View style={{ paddingHorizontal: getResponsiveSize(20) }} className="flex-wrap justify-around mb-8">
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={{ 
          paddingVertical: getResponsiveSize(10),
          paddingHorizontal: getResponsiveSize(20),
          borderRadius: getResponsiveSize(20)
        }} className="flex-row items-center bg-blue-500">
          <Ionicons name="create-outline" size={getResponsiveSize(24)} color="#fff" />
          <Text style={{ fontSize: getResponsiveSize(12) }} className="text-white ml-2 font-bold">Edit Profile</Text>
        </TouchableOpacity>
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
          <View className="items-center ">
            <Text style={{ fontSize: getResponsiveSize(18) }} className="text-white mb-2.5 mt-5">No photo yet</Text>
              <Text style={{ fontSize: getResponsiveSize(16) }} className="text-white text-center mb-5">Share photos on your page</Text>
              <TouchableOpacity style={{ 
                paddingVertical: getResponsiveSize(10),
                paddingHorizontal: getResponsiveSize(20),
                borderRadius: getResponsiveSize(20)
              }} className="flex-row items-center bg-[#5A8FF2]">
                <Ionicons name="cloud-upload-outline" size={getResponsiveSize(24)} color="#fff" />
                <Text style={{ fontSize: getResponsiveSize(16) }} className="text-white ml-2">Upload</Text> 
                </TouchableOpacity>           
          </View>
        )}
        
        {/* Chat Tab Content (placeholder) */}
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