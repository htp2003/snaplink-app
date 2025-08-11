import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { RootStackNavigationProp } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { usePhotographerImages } from '../../hooks/useImages';
import { photographerService } from '../../services/photographerService';
import UploadImageModal from '../../components/Photographer/UploadImageModal';
import PortfolioStats from '../../components/Photographer/PortfolioStats';

const { width, height } = Dimensions.get('window');

interface PortfolioScreenProps {}

const PortfolioScreen: React.FC<PortfolioScreenProps> = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { getCurrentUserId } = useAuth();
  const [photographerId, setPhotographerId] = useState<number | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string>('');
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = new Animated.Value(0);

  const {
    images,
    loading,
    error,
    refresh,
    createImage,
    deleteImage,
    setPrimaryImage,
  } = usePhotographerImages(photographerId || 0);

  useEffect(() => {
    loadPhotographerData();
  }, []);

  const loadPhotographerData = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) return;

      const photographer = await photographerService.findPhotographerByUserId(userId);
      if (photographer) {
        setPhotographerId(photographer.photographerId);
      }
    } catch (error) {
      console.error('Error loading photographer data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need access to your photo library to upload images.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImageUri(result.assets[0].uri);
      setIsUploadModalVisible(true);
    }
  };

  const handleUpload = async (caption: string, isPrimary: boolean) => {
    if (!photographerId || !selectedImageUri) return;

    try {
      setIsUploading(true);

      const fileName = selectedImageUri.split('/').pop() || 'image.jpg';
      const file = {
        uri: selectedImageUri,
        type: 'image/jpeg',
        name: fileName,
      } as any;

      const result = await createImage(file, isPrimary, caption);

      if (result) {
        setIsUploadModalVisible(false);
        setSelectedImageUri('');
        Alert.alert('Success', 'Image added to your portfolio!');
      } else {
        Alert.alert('Error', 'Failed to upload image. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'An error occurred while uploading.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = (imageId: number, imageName: string) => {
    Alert.alert(
      'Delete Image',
      `Are you sure you want to remove "${imageName}" from your portfolio?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteImage(imageId);
            if (success) {
              Alert.alert('Success', 'Image removed from portfolio.');
            } else {
              Alert.alert('Error', 'Failed to delete image.');
            }
          },
        },
      ]
    );
  };

  const handleSetPrimary = async (imageId: number) => {
    const success = await setPrimaryImage(imageId);
    if (success) {
      Alert.alert('Success', 'Set as profile image.');
    } else {
      Alert.alert('Error', 'Failed to set as profile image.');
    }
  };

  // Professional Header with Clean Typography
  const renderHeader = () => (
    <View style={{
      paddingHorizontal: 24,
      paddingVertical: 20,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E8E8E8',
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            padding: 8,
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#1A1A1A',
            letterSpacing: 0.5,
          }}>
            PORTFOLIO
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={pickImage}
          style={{
            backgroundColor: '#1A1A1A',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 4,
          }}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: '500',
              letterSpacing: 0.8,
            }}>
              THÊM
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Minimalist Stats Component
  const renderStats = () => {
    if (images.length === 0) return null;
    
    const primaryImage = images.find(img => img.isPrimary);
    
    return (
      <View style={{
        paddingHorizontal: 24,
        paddingVertical: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{
              fontSize: 14,
              color: '#8A8A8A',
              marginBottom: 4,
              letterSpacing: 0.5,
            }}>
              HÌNH ẢNH
            </Text>
            <Text style={{
              fontSize: 24,
              fontWeight: '300',
              color: '#1A1A1A',
            }}>
              {images.length}
            </Text>
          </View>
          
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{
              fontSize: 14,
              color: '#8A8A8A',
              marginBottom: 4,
              letterSpacing: 0.5,
            }}>
              HÌNH ẢNH CHÍNH
            </Text>
            <Text style={{
              fontSize: 16,
              fontWeight: '400',
              color: primaryImage ? '#1A1A1A' : '#C8C8C8',
            }}>
              {primaryImage ? 'SET' : 'NOT SET'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Professional Empty State
  const renderEmptyState = () => (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      backgroundColor: '#FAFAFA',
    }}>
      <View style={{
        width: 80,
        height: 80,
        borderRadius: 2,
        backgroundColor: '#E8E8E8',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
      }}>
        <Ionicons name="camera-outline" size={32} color="#B8B8B8" />
      </View>
      
      <Text style={{
        fontSize: 20,
        fontWeight: '300',
        color: '#1A1A1A',
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: 0.5,
      }}>
        Xây Dựng Danh Mục Của Bạn
      </Text>
      
      <Text style={{
        fontSize: 15,
        color: '#8A8A8A',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 22,
        maxWidth: 280,
      }}>
        Trưng bày những tác phẩm tốt nhất của bạn để thu hút khách hàng và phát triển doanh nghiệp nhiếp ảnh của bạn
      </Text>
      
      <TouchableOpacity
        style={{
          backgroundColor: '#1A1A1A',
          paddingHorizontal: 32,
          paddingVertical: 12,
          borderRadius: 2,
        }}
        onPress={pickImage}
      >
        <Text style={{
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: '500',
          letterSpacing: 0.8,
        }}>
          THÊM HÌNH ẢNH ĐẦU TIÊN
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Professional Masonry Grid Layout
  const renderMasonryGrid = () => {
    const leftColumn: React.ReactNode[] = [];
    const rightColumn: React.ReactNode[] = [];
    
    images.forEach((image, index) => {
      const item = (
        <TouchableOpacity
          key={image.id}
          style={{
            marginBottom: 16,
            backgroundColor: '#FFFFFF',
            borderRadius: 2,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={() => {
            // Navigate to fullscreen view
          }}
          delayPressIn={100}
        >
          <Image
            source={{ uri: image.url }}
            style={{
              width: '100%',
              height: Math.random() * 100 + 180, // Random height for masonry effect
            }}
            resizeMode="cover"
          />
          
          {/* Overlay Controls */}
          <View style={{
            position: 'absolute',
            top: 0,
            right: 0,
            left: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0)',
          }}>
            {/* Primary Badge */}
            {image.isPrimary && (
              <View style={{
                position: 'absolute',
                top: 12,
                left: 12,
                backgroundColor: '#FFFFFF',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 2,
              }}>
                <Text style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: '#1A1A1A',
                  letterSpacing: 0.5,
                }}>
                  HÌNH ẢNH CHÍNH
                </Text>
              </View>
            )}
            
            {/* Action Buttons */}
            <View style={{
              position: 'absolute',
              top: 12,
              right: 12,
              flexDirection: 'column',
            }}>
              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
                onPress={() => handleSetPrimary(image.id)}
              >
                <Ionicons 
                  name={image.isPrimary ? "star" : "star-outline"} 
                  size={16} 
                  color="#1A1A1A" 
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(220, 53, 69, 0.9)',
                  width: 32,
                  height: 32,
                  borderRadius: 2,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => handleDeleteImage(image.id, image.caption || `Image ${index + 1}`)}
              >
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Image Caption */}
          {image.caption && (
            <View style={{
              padding: 16,
              backgroundColor: '#FFFFFF',
            }}>
              <Text style={{
                fontSize: 14,
                color: '#1A1A1A',
                fontWeight: '400',
                lineHeight: 20,
              }}>
                {image.caption}
              </Text>
              <Text style={{
                fontSize: 12,
                color: '#8A8A8A',
                marginTop: 4,
                letterSpacing: 0.3,
              }}>
                {new Date(image.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );

      // Distribute items between left and right columns
      if (index % 2 === 0) {
        leftColumn.push(item);
      } else {
        rightColumn.push(item);
      }
    });

    return (
      <View style={{
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 20,
        backgroundColor: '#FAFAFA',
      }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          {leftColumn}
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          {rightColumn}
        </View>
      </View>
    );
  };

  if (!photographerId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="camera-outline" size={60} color="#C8C8C8" />
          <Text style={{
            fontSize: 18,
            color: '#8A8A8A',
            marginTop: 20,
            textAlign: 'center',
            fontWeight: '300',
          }}>
            Photographer profile not found
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#1A1A1A',
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 2,
              marginTop: 20,
            }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{
              color: '#FFFFFF',
              fontSize: 14,
              fontWeight: '500',
              letterSpacing: 0.5,
            }}>
              GO BACK
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" />
      
      {renderHeader()}

      {loading ? (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#FAFAFA'
        }}>
          <ActivityIndicator size="large" color="#1A1A1A" />
          <Text style={{ 
            marginTop: 16, 
            color: '#8A8A8A',
            fontSize: 14,
            fontWeight: '300'
          }}>
            Loading portfolio...
          </Text>
        </View>
      ) : error ? (
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center',
          backgroundColor: '#FAFAFA'
        }}>
          <Ionicons name="alert-circle-outline" size={48} color="#DC3545" />
          <Text style={{ 
            marginTop: 16, 
            color: '#8A8A8A', 
            textAlign: 'center',
            fontSize: 14
          }}>
            {error}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#1A1A1A',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 2,
              marginTop: 16,
            }}
            onPress={refresh}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontWeight: '500',
              fontSize: 14,
              letterSpacing: 0.5
            }}>
              THỬ LẠI
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1A1A1A']}
              tintColor="#1A1A1A"
            />
          }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {renderStats()}

          {images.length === 0 ? (
            renderEmptyState()
          ) : (
            renderMasonryGrid()
          )}

          <View style={{ height: 40, backgroundColor: '#FAFAFA' }} />
        </Animated.ScrollView>
      )}

      <UploadImageModal
        visible={isUploadModalVisible}
        onClose={() => {
          setIsUploadModalVisible(false);
          setSelectedImageUri('');
        }}
        onUpload={handleUpload}
        imageUri={selectedImageUri}
        isUploading={isUploading}
      />
    </SafeAreaView>
  );
};

export default PortfolioScreen;