import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { getResponsiveSize } from '../utils/responsive';
import { useFavorites, FavoriteItem } from '../hooks/useFavorites';
import { Profile } from '../hooks/useProfiles';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');

export default function ProfileCardDetail() {
  const navigation = useNavigation<NavigationProp>();
  const [activeTab, setActiveTab] = useState('photos'); // 'photos' or 'reviews'
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  
  const handleToggleFavorite = () => {
    const favoriteItem: FavoriteItem = {
      id: photographerData.id,
      type: 'profile',
      data: photographerData
    };
    
    if (isFavorite(photographerData.id)) {
      removeFavorite(photographerData.id);
    } else {
      addFavorite(favoriteItem);
    }
  };

  // Mock reviews data
  const reviews = [
    {
      id: 1,
      rating: 5,
      title: 'Tuyệt vời!',
      body: 'Nhiếp ảnh gia rất chuyên nghiệp và thân thiện.',
      avatar: require('../../assets/slider2.png'),
      name: 'Nguyễn Văn A',
      date: '28/05/2025'
    },
    {
      id: 2,
      rating: 4,
      title: 'Hài lòng',
      body: 'Ảnh đẹp, giao ảnh nhanh.',
      avatar: require('../../assets/slider1.png'),
      name: 'Trần Thị B',
      date: '25/05/2025'
    }
  ];

  // Mock data
  const photographerData: Profile = {
    id: '1',
    name: 'David Silva',
    avatar: require('../../assets/slider2.png'),
    images: [
      require('../../assets/slider1.png'),
      require('../../assets/slider2.png'),
      require('../../assets/slider3.png'),
      require('../../assets/slider4.png'),
      require('../../assets/slider1.png'),
      require('../../assets/slider2.png'),
    ],
    styles: ['Portrait', 'Landscape'],
    favorited: '150k',
    booked: '150k',
    description: 'Professional photographer specializing in landscape and portrait photography with over 10 years of experience.',
    rating: 4.8,
    photos: [ // Thêm trường photos để tương thích với code cũ
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
      <View style={{ paddingHorizontal: getResponsiveSize(16), paddingVertical: getResponsiveSize(12) }} className="flex-row justify-between items-center">
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
          onPress={handleToggleFavorite}
        >
          <Ionicons
            name={isFavorite(photographerData.id) ? 'heart' : 'heart-outline'}
            size={getResponsiveSize(24)}
            color={isFavorite(photographerData.id) ? '#FF3B30' : 'white'}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ padding: getResponsiveSize(20) }} className="items-center">
          <View className="flex-row justify-around w-full">
            <View className="items-center">
              <Image
                source={typeof photographerData.avatar === 'string' ? { uri: photographerData.avatar } : photographerData.avatar}
                className="rounded-full"
                style={{ width: getResponsiveSize(100), height: getResponsiveSize(100) }}
              />
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

        {/* Description */}
        <View style={{ paddingHorizontal: getResponsiveSize(40) }}>
          <Text style={{ fontSize: getResponsiveSize(18) }} className="font-bold text-white mb-2">Description</Text>
          <Text style={{ fontSize: getResponsiveSize(16) }} className="text-gray-300">{photographerData.description}</Text>
        </View>

        {/* Tabs */}
        <View className="flex-row mt-6 border-b border-gray-800">
          <TouchableOpacity
            className="flex-1 items-center"
            style={{
              paddingVertical: getResponsiveSize(12),
              borderBottomWidth: activeTab === 'photos' ? 2 : 0,
              borderBottomColor: '#32FAE9'
            }}
            onPress={() => setActiveTab('photos')}
          >
            <Ionicons
              name="images-outline"
              size={getResponsiveSize(24)}
              color={activeTab === 'photos' ? '#32FAE9' : 'white'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 items-center"
            style={{
              paddingVertical: getResponsiveSize(12),
              borderBottomWidth: activeTab === 'reviews' ? 2 : 0,
              borderBottomColor: '#32FAE9'
            }}
            onPress={() => setActiveTab('reviews')}
          >
            <Ionicons
              name="chatbubble-outline"
              size={getResponsiveSize(24)}
              color={activeTab === 'reviews' ? '#32FAE9' : 'white'}
            />
          </TouchableOpacity>
        </View>

          {/* Photos Grid */}
          {activeTab === 'photos' && (
            <View className="flex-row flex-wrap px-1 mt-2">
              {photographerData.photos?.map((photo, index) => (
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

        {/* Reviews Tab Content */}
        {activeTab === 'reviews' && (
          <View style={{ paddingVertical: getResponsiveSize(24), paddingHorizontal: getResponsiveSize(8) }}>
            {reviews.map(review => (
              <View key={review.id} style={{ backgroundColor: '#1f2937', borderRadius: getResponsiveSize(16), padding: getResponsiveSize(16), marginBottom: getResponsiveSize(16), shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>
                {/* Stars */}
                <View style={{ flexDirection: 'row', marginBottom: getResponsiveSize(8) }}>
                  {[1,2,3,4,5].map(i => (
                    <Ionicons
                      key={i}
                      name={i <= review.rating ? 'star' : 'star-outline'}
                      size={getResponsiveSize(18)}
                      color={i <= review.rating ? '#facc15' : '#d1d5db'}
                    />
                  ))}
                </View>
                {/* Title & Body */}
                <Text style={{ fontWeight: 'bold', fontSize: getResponsiveSize(18), marginBottom: getResponsiveSize(4), color: '#ffffff' }}>{review.title}</Text>
                <Text style={{ fontSize: getResponsiveSize(15), color: '#f3f4f6', marginBottom: getResponsiveSize(12) }}>{review.body}</Text>
                {/* Reviewer */}
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#374151', borderRadius: getResponsiveSize(12), padding: getResponsiveSize(8), gap: getResponsiveSize(8) }}>
                  <Image source={review.avatar} style={{ width: getResponsiveSize(32), height: getResponsiveSize(32), borderRadius: 9999, marginRight: getResponsiveSize(8) }} />
                  <View>
                    <Text style={{ fontWeight: 'bold', color: '#e5e7eb', fontSize: getResponsiveSize(15) }}>{review.name}</Text>
                    <Text style={{ color: '#9ca3af', fontSize: getResponsiveSize(13) }}>{review.date}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Bottom padding */}
        <View style={{ height: getResponsiveSize(100) }} />
      </ScrollView>
    </SafeAreaView>
  );
}