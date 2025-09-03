import React, { useState } from 'react';
import {
    Text,
  Modal,
  View,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Share,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImageUtils } from '../utils/imageUtils';

interface ImageViewerModalProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
  title?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ImageViewerModal({
  visible,
  imageUrl,
  onClose,
  title = 'Ảnh xác nhận',
}: ImageViewerModalProps) {
  const insets = useSafeAreaInsets();
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageScale, setImageScale] = useState(1);

  // Process image URL for better compatibility
  const processedImageUrl = ImageUtils.processImageUrl(imageUrl);

  // Handle image load start
  const handleImageLoadStart = () => {
    setImageLoading(true);
    setImageError(false);
  };

  // Handle image load end
  const handleImageLoadEnd = () => {
    setImageLoading(false);
  };

  // Handle image error
  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  // Handle share image
  const handleShareImage = async () => {
    try {
      await Share.share({
        url: processedImageUrl,
        message: `${title}: ${processedImageUrl}`,
      });
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Lỗi', 'Không thể chia sẻ ảnh');
    }
  };

  // Handle open in browser
  const handleOpenInBrowser = async () => {
    try {
      await ImageUtils.openImageInBrowser(processedImageUrl);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể mở ảnh trong trình duyệt');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={{ flex: 1, backgroundColor: '#000000' }}>
        {/* Header */}
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            paddingTop: insets.top + 10,
            paddingHorizontal: 16,
            paddingBottom: 16,
            backgroundColor: 'rgba(0,0,0,0.7)',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={handleShareImage}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                <Ionicons name="share-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleOpenInBrowser}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="open-outline" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Image Container */}
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 20,
          }}
        >
          {imageError ? (
            /* Error State */
            <View style={{ alignItems: 'center' }}>
              <Ionicons name="image-outline" size={80} color="#666666" />
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: 16,
                  marginTop: 16,
                  textAlign: 'center',
                }}
              >
                Không thể tải ảnh
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setImageError(false);
                  setImageLoading(true);
                }}
                style={{
                  backgroundColor: '#FF385C',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8,
                  marginTop: 16,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '500' }}>
                  Thử lại
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Image Display */
            <TouchableOpacity
              activeOpacity={1}
              style={{
                width: screenWidth,
                height: screenHeight - (insets.top + insets.bottom + 80),
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Image
                source={{ uri: processedImageUrl }}
                style={{
                  width: '100%',
                  height: '100%',
                  transform: [{ scale: imageScale }],
                }}
                contentFit="contain"
                onLoadStart={handleImageLoadStart}
                onLoadEnd={handleImageLoadEnd}
                onError={handleImageError}
                transition={300}
              />

              {/* Loading Indicator */}
              {imageLoading && (
                <View
                  style={{
                    position: 'absolute',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      marginTop: 16,
                    }}
                  >
                    Đang tải ảnh...
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Bottom Info */}
        {!imageError && (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingBottom: insets.bottom + 16,
              paddingHorizontal: 16,
              paddingTop: 16,
              backgroundColor: 'rgba(0,0,0,0.7)',
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
                textAlign: 'center',
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                color: '#CCCCCC',
                fontSize: 12,
                textAlign: 'center',
                marginTop: 4,
              }}
            >
              Nhấn nút chia sẻ hoặc mở trong trình duyệt để xem tùy chọn khác
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}