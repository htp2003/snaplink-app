import React, { useRef, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Modal, 
  Animated, 
  Dimensions 
} from 'react-native';
import { Gesture, GestureDetector, State } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../utils/responsive';

interface FavoritedUser {
  id: string;
  name: string;
  avatar?: string;
}

interface FavoritedModalProps {
  visible: boolean;
  favoritedUsers: FavoritedUser[];
  onClose: () => void;
}

const FavoritedModal = ({ visible, favoritedUsers, onClose }: FavoritedModalProps) => {
  const screenHeight = Dimensions.get('window').height;
  const translateY = useRef(new Animated.Value(0)).current as any;
  const offsetY = useRef(new Animated.Value(0)).current as any;

  const panGesture = Gesture.Pan()
  .onStart(() => {
    // Lưu vị trí hiện tại khi bắt đầu kéo
    offsetY.setValue(translateY._value);
})
  .onUpdate((event) => {
    translateY.setValue(offsetY._value + event.translationY);
  })
  .onEnd((event) => {
    const { translationY, velocityY } = event;
    const currentTranslateY = translateY._value;
    
    if (currentTranslateY > 150 || velocityY > 500) {
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onClose();
        translateY.setValue(0);
        offsetY.setValue(0);
      });
    } else {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  });

  const renderUserItem = (user: FavoritedUser) => (
    <TouchableOpacity 
      key={user.id}
      className="flex-row items-center py-4 border-b border-gray-800"
      style={{ paddingVertical: getResponsiveSize(16) }}
    >
      <View style={{ 
        width: getResponsiveSize(60), 
        height: getResponsiveSize(60),
        borderRadius: getResponsiveSize(30),
        overflow: 'hidden'
      }} className="bg-gray-400 mr-4">
        {user.avatar ? (
          <Image 
            source={{ uri: user.avatar }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Ionicons name="person" size={getResponsiveSize(30)} color="white" />
          </View>
        )}
      </View>
      <View className="flex-1">
        <Text style={{ fontSize: getResponsiveSize(18) }} className="text-white font-semibold">
          {user.name}
        </Text>
        <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-400 mt-1">
          Favorited your profile
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#666" />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View className="items-center justify-center py-20">
      <Ionicons name="heart-outline" size={getResponsiveSize(80)} color="#32FAE9" />
      <Text style={{ fontSize: getResponsiveSize(18) }} className="text-white font-semibold mt-4">
        No favorites yet
      </Text>
      <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-400 text-center mt-2 px-8">
        When people favorite your profile, they'll appear here
      </Text>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <View style={{ flex: 1, backgroundColor: '#1A1A1A' }}>
        <GestureDetector gesture={panGesture}>
        <Animated.View 
          style={{
            flex: 1,
            transform: [{ translateY }],
          }}
        >
          {/* Header với handle indicator */}
          <View style={{ 
            paddingTop: 50,
            paddingBottom: 20,
            alignItems: 'center',
            borderBottomWidth: 1,
            borderBottomColor: '#333'
          }}>
            {/* Handle indicator */}
            <View style={{
              width: 40,
              height: 5,
              backgroundColor: '#32FAE9',
              borderRadius: 3,
              marginBottom: 20
            }} />
            
            <View className="flex-row justify-between items-center w-full px-4">
              <Text style={{ fontSize: getResponsiveSize(24) }} className="text-white font-bold">
                People who favorited you
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={28} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Content */}
          <ScrollView 
            className="flex-1 px-4"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 50 }}
          >
            {favoritedUsers.length > 0 ? (
              favoritedUsers.map(renderUserItem)
            ) : (
              renderEmptyState()
            )}
          </ScrollView>
        </Animated.View>
      </GestureDetector>
      </View>
    </Modal>
  );
};

export default FavoritedModal;