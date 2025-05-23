import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { getResponsiveSize } from '../utils/responsive';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

export default function ProfileCardDetail() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState('photos'); // 'photos' or 'chat'
  
  // Mock data
  const photographerData = {
    name: 'David Silva',
    avatar: require('../../assets/slider2.png'),
    favorited: '150k',
    booked: '150k',
    description: 'Professional photographer specializing in landscape and portrait photography with over 10 years of experience.',
    photos: [
      require('../../assets/slider1.png'),
      require('../../assets/slider2.png'),
      require('../../assets/slider3.png'),
      require('../../assets/slider4.png'),
      require('../../assets/slider1.png'),
      require('../../assets/slider2.png'),
    ]
  };

  return (
    <SafeAreaView className="flex-1 bg-black">
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">{photographerData.name}</Text>
        <TouchableOpacity
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
            borderRadius: getResponsiveSize(15),
            padding: getResponsiveSize(5),
          }}
          onPress={() => {/* Toggle favorite */}}
        >
          <Ionicons 
            name="heart-outline" 
            size={getResponsiveSize(24)} 
            color="white" 
          />
        </TouchableOpacity>
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Info */}
        <View className="flex-row px-4 mt-4">
          {/* Avatar on left */}
          <Image 
            source={photographerData.avatar} 
            className="rounded-full"
            style={{ width: getResponsiveSize(100), height: getResponsiveSize(100) }}
          />
          
          {/* Stats on right */}
          <View className="flex-1 flex-row justify-center items-start gap-5">
            <View className="mb-4">
              <Text className="text-white text-xl font-bold">{photographerData.favorited}</Text>
              <Text className="text-white text-sm">Favorited</Text>
            </View>
            <View>
              <Text className="text-white text-xl font-bold">{photographerData.booked}</Text>
              <Text className="text-white text-sm">Booked</Text>
            </View>
          </View>
        </View>
        
        {/* Description */}
        <View className="px-4 mt-6">
          <Text className="text-white text-lg font-bold mb-2">Description</Text>
          <Text className="text-gray-300">{photographerData.description}</Text>
        </View>
        
        {/* Tabs */}
        <View className="flex-row mt-6 border-b border-gray-800">
          <TouchableOpacity 
            className="flex-1 items-center py-3"
            style={{ borderBottomWidth: activeTab === 'photos' ? 2 : 0, borderBottomColor: '#32FAE9' }}
            onPress={() => setActiveTab('photos')}
          >
            <Ionicons 
              name="images-outline" 
              size={getResponsiveSize(24)} 
              color={activeTab === 'photos' ? '#32FAE9' : 'white'} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            className="flex-1 items-center py-3"
            style={{ borderBottomWidth: activeTab === 'chat' ? 2 : 0, borderBottomColor: '#32FAE9' }}
            onPress={() => setActiveTab('chat')}
          >
            <Ionicons 
              name="chatbubble-outline" 
              size={getResponsiveSize(24)} 
              color={activeTab === 'chat' ? '#32FAE9' : 'white'} 
            />
          </TouchableOpacity>
        </View>
        
        {/* Photos Grid */}
        {activeTab === 'photos' && (
          <View className="flex-row flex-wrap px-1 mt-2">
            {photographerData.photos.map((photo, index) => (
              <View 
                key={index} 
                style={{ 
                  width: (width - getResponsiveSize(16)) / 2, 
                  height: (width - getResponsiveSize(16)) / 2,
                  padding: getResponsiveSize(4)
                }}
              >
                <Image 
                  source={photo} 
                  className="rounded-lg"
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              </View>
            ))}
          </View>
        )}
        
        {/* Chat Tab Content (placeholder) */}
        {activeTab === 'chat' && (
          <View className="items-center justify-center py-10">
            <Ionicons name="chatbubbles-outline" size={getResponsiveSize(50)} color="#32FAE9" />
            <Text className="text-white text-lg mt-4">Chat with {photographerData.name}</Text>
            <Text className="text-gray-400 text-center mt-2 px-10">
              Send a message to discuss your photography needs and booking details.
            </Text>
            <TouchableOpacity className="bg-[#32FAE9] px-6 py-3 rounded-full mt-6">
              <Text className="text-black font-bold">Start Chat</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Bottom padding */}
        <View style={{ height: getResponsiveSize(100) }} />
      </ScrollView>
    </SafeAreaView>
  );
}