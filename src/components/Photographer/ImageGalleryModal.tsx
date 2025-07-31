import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  Dimensions,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert,
  Share,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { ImageResponse } from '../../types/image';

const { width, height } = Dimensions.get('window');

interface ImageGalleryModalProps {
  visible: boolean;
  images: ImageResponse[];
  initialIndex: number;
  onClose: () => void;
  onDelete?: (imageId: number) => void;
  onSetPrimary?: (imageId: number) => void;
  canEdit?: boolean;
}

const ImageGalleryModal: React.FC<ImageGalleryModalProps> = ({
  visible,
  images,
  initialIndex,
  onClose,
  onDelete,
  onSetPrimary,
  canEdit = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  // Animation values for zoom
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const currentImage = images[currentIndex];

  const resetZoom = () => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true }),
    ]).start();
  };

  const handleImageTap = () => {
    setIsToolbarVisible(!isToolbarVisible);
  };

  const handleShare = async () => {
    try {
      if (currentImage?.url) {
        await Share.share({
          url: currentImage.url,
          message: 'Check out this photo from my portfolio!',
        });
      }
    } catch (error) {
      console.error('Error sharing image:', error);
    }
  };

  const handleDownload = async () => {
    try {
      setDownloading(true);
      
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need permission to save photos to your device.');
        return;
      }

      if (currentImage?.url) {
        // Download the image
        const fileUri = FileSystem.documentDirectory + `portfolio_image_${currentImage.id}.jpg`;
        const downloadResult = await FileSystem.downloadAsync(currentImage.url, fileUri);
        
        // Save to media library
        await MediaLibrary.saveToLibraryAsync(downloadResult.uri);
        
        Alert.alert('Success', 'Image saved to your photo library!');
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Error', 'Failed to save image. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = () => {
    if (!canEdit || !onDelete || !currentImage) return;
    
    Alert.alert(
      'Delete Image',
      'Are you sure you want to delete this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(currentImage.id);
            if (images.length <= 1) {
              onClose();
            } else if (currentIndex >= images.length - 1) {
              setCurrentIndex(Math.max(0, currentIndex - 1));
            }
          },
        },
      ]
    );
  };

  const handleSetPrimary = () => {
    if (!canEdit || !onSetPrimary || !currentImage) return;
    onSetPrimary(currentImage.id);
  };

  const renderImageItem = ({ item, index }: { item: ImageResponse; index: number }) => (
    <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleImageTap}
        style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
      >
        <Animated.View
          style={{
            transform: [
              { scale },
              { translateX },
              { translateY },
            ],
          }}
        >
          <Image
            source={{ uri: item.url }}
            style={{
              width: width - 40,
              height: width - 40,
              maxHeight: height - 200,
            }}
            resizeMode="contain"
          />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );

  const renderThumbnails = () => (
    <View style={{
      position: 'absolute',
      bottom: 100,
      left: 0,
      right: 0,
      height: 80,
    }}>
      <FlatList
        data={images}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          alignItems: 'center',
        }}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            onPress={() => {
              setCurrentIndex(index);
              flatListRef.current?.scrollToIndex({ index, animated: true });
            }}
            style={{
              width: 60,
              height: 60,
              borderRadius: 8,
              marginRight: 10,
              overflow: 'hidden',
              borderWidth: index === currentIndex ? 2 : 0,
              borderColor: '#FFFFFF',
            }}
          >
            <Image
              source={{ uri: item.url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      animationType="fade"
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.95)',
      }}>
        <SafeAreaView style={{ flex: 1 }}>
          <StatusBar barStyle="light-content" hidden={!isToolbarVisible} />
          
          {/* Top Toolbar */}
          {isToolbarVisible && (
            <Animated.View style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              zIndex: 1000,
              paddingTop: 50,
              paddingHorizontal: 20,
              paddingBottom: 20,
              backgroundColor: 'rgba(0,0,0,0.8)',
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                
                <View style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 15,
                }}>
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: '600',
                  }}>
                    {currentIndex + 1} / {images.length}
                  </Text>
                </View>
                
                <TouchableOpacity
                  onPress={handleShare}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name="share-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Image Carousel */}
          <FlatList
            ref={flatListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={initialIndex}
            onScrollToIndexFailed={() => {}}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentIndex(index);
              resetZoom();
            }}
            renderItem={renderImageItem}
            keyExtractor={(item) => item.id.toString()}
          />

          {/* Bottom Toolbar */}
          {isToolbarVisible && (
            <Animated.View style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingHorizontal: 20,
              paddingBottom: 30,
              paddingTop: 20,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
            }}>
              {/* Image Info */}
              <View style={{
                alignItems: 'center',
                marginBottom: 20,
              }}>
                {currentImage?.isPrimary && (
                  <View style={{
                    backgroundColor: '#FFD700',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 6,
                    marginBottom: 8,
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: 'bold',
                      color: '#000000',
                    }}>
                      PRIMARY IMAGE
                    </Text>
                  </View>
                )}
                
                {currentImage?.caption && (
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 16,
                    textAlign: 'center',
                    marginBottom: 4,
                  }}>
                    {currentImage.caption}
                  </Text>
                )}
                
                <Text style={{
                  color: '#CCCCCC',
                  fontSize: 12,
                }}>
                  Added {new Date(currentImage?.createdAt || '').toLocaleDateString()}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <TouchableOpacity
                  onPress={handleDownload}
                  disabled={downloading}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 20,
                    marginHorizontal: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons 
                    name={downloading ? "hourglass" : "download-outline"} 
                    size={16} 
                    color="#FFFFFF" 
                  />
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 14,
                    fontWeight: '600',
                    marginLeft: 6,
                  }}>
                    {downloading ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>

                {canEdit && onSetPrimary && !currentImage?.isPrimary && (
                  <TouchableOpacity
                    onPress={handleSetPrimary}
                    style={{
                      backgroundColor: 'rgba(255, 215, 0, 0.3)',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 20,
                      marginHorizontal: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="star-outline" size={16} color="#FFD700" />
                    <Text style={{
                      color: '#FFD700',
                      fontSize: 14,
                      fontWeight: '600',
                      marginLeft: 6,
                    }}>
                      Set Primary
                    </Text>
                  </TouchableOpacity>
                )}

                {canEdit && onDelete && (
                  <TouchableOpacity
                    onPress={handleDelete}
                    style={{
                      backgroundColor: 'rgba(255, 59, 92, 0.3)',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: 20,
                      marginHorizontal: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FF385C" />
                    <Text style={{
                      color: '#FF385C',
                      fontSize: 14,
                      fontWeight: '600',
                      marginLeft: 6,
                    }}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}

          {/* Thumbnails */}
          {isToolbarVisible && images.length > 1 && renderThumbnails()}
        </SafeAreaView>
      </View>
    </Modal>
  );
};

export default ImageGalleryModal;