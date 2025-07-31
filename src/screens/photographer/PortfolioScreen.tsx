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
const ITEM_SIZE = (width - 60) / 2;
const LARGE_ITEM_SIZE = width - 40;

interface PortfolioScreenProps {}

const PortfolioScreen: React.FC<PortfolioScreenProps> = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { getCurrentUserId } = useAuth();
  const [photographerId, setPhotographerId] = useState<number | null>(null);
  const [selectedImageUri, setSelectedImageUri] = useState<string>('');
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
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
        'Quyền truy cập',
        'Ứng dụng cần quyền truy cập thư viện ảnh để upload ảnh.',
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
      aspect: [1, 1],
      quality: 0.8,
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
        Alert.alert('Thành công', 'Ảnh đã được thêm vào portfolio!');
      } else {
        Alert.alert('Lỗi', 'Không thể upload ảnh. Vui lòng thử lại.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi upload ảnh.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = (imageId: number, imageName: string) => {
    Alert.alert(
      'Xóa ảnh',
      `Bạn có chắc chắn muốn xóa ảnh "${imageName}" không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteImage(imageId);
            if (success) {
              Alert.alert('Thành công', 'Ảnh đã được xóa.');
            } else {
              Alert.alert('Lỗi', 'Không thể xóa ảnh.');
            }
          },
        },
      ]
    );
  };

  const handleSetPrimary = async (imageId: number) => {
    const success = await setPrimaryImage(imageId);
    if (success) {
      Alert.alert('Thành công', 'Đã đặt làm ảnh đại diện.');
    } else {
      Alert.alert('Lỗi', 'Không thể đặt làm ảnh đại diện.');
    }
  };

  const renderHeader = () => (
    <Animated.View style={{
      paddingHorizontal: 20,
      paddingVertical: 15,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
      transform: [{
        translateY: scrollY.interpolate({
          inputRange: [0, 100],
          outputRange: [0, -50],
          extrapolate: 'clamp',
        })
      }]
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#F7F7F7',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#000000',
        }}>
          Portfolio của tôi
        </Text>
        
        <View style={{ flexDirection: 'row' }}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#F7F7F7',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 10,
            }}
          >
            <Ionicons 
              name={viewMode === 'grid' ? 'list-outline' : 'grid-outline'} 
              size={20} 
              color="#000000" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={pickImage}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#000000',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="add" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );

  const renderEmptyState = () => (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 100,
      paddingHorizontal: 40,
    }}>
      <View style={{
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30,
      }}>
        <Ionicons name="camera-outline" size={60} color="#CCCCCC" />
      </View>
      
      <Text style={{
        fontSize: 24,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 10,
        textAlign: 'center',
      }}>
        Tạo Portfolio đầu tiên
      </Text>
      
      <Text style={{
        fontSize: 16,
        color: '#666666',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 24,
      }}>
        Thêm những bức ảnh đẹp nhất của bạn để thu hút khách hàng và tăng cơ hội được đặt lịch
      </Text>
      
      <TouchableOpacity
        style={{
          backgroundColor: '#000000',
          paddingHorizontal: 30,
          paddingVertical: 15,
          borderRadius: 25,
          flexDirection: 'row',
          alignItems: 'center',
        }}
        onPress={pickImage}
      >
        <Ionicons name="camera" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
          Thêm ảnh đầu tiên
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderGridView = () => (
    <View style={{
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 20,
      paddingTop: 20,
    }}>
      {images.map((image, index) => (
        <TouchableOpacity
          key={image.id}
          style={{
            width: ITEM_SIZE,
            height: ITEM_SIZE,
            marginBottom: 20,
            marginRight: index % 2 === 0 ? 20 : 0,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: '#F5F5F5',
          }}
          onPress={() => {
            // Navigate to image detail or fullscreen view
          }}
        >
          <Image
            source={{ uri: image.url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          
          {image.isPrimary && (
            <View style={{
              position: 'absolute',
              top: 8,
              left: 8,
              backgroundColor: '#FFD700',
              paddingHorizontal: 6,
              paddingVertical: 2,
              borderRadius: 4,
            }}>
              <Text style={{
                fontSize: 10,
                fontWeight: 'bold',
                color: '#000000',
              }}>
                ĐẠI DIỆN
              </Text>
            </View>
          )}
          
          <View style={{
            position: 'absolute',
            top: 8,
            right: 8,
            flexDirection: 'row',
          }}>
            <TouchableOpacity
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                width: 28,
                height: 28,
                borderRadius: 14,
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: 4,
              }}
              onPress={() => handleSetPrimary(image.id)}
            >
              <Ionicons name="star-outline" size={14} color="#FFFFFF" />
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                backgroundColor: 'rgba(255, 0, 0, 0.6)',
                width: 28,
                height: 28,
                borderRadius: 14,
                justifyContent: 'center',
                alignItems: 'center',
                marginLeft: 4,
              }}
              onPress={() => handleDeleteImage(image.id, image.caption || `Ảnh ${index + 1}`)}
            >
              <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderListView = () => (
    <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
      {images.map((image, index) => (
        <View
          key={image.id}
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            marginBottom: 16,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Image
            source={{ uri: image.url }}
            style={{ width: '100%', height: 200 }}
            resizeMode="cover"
          />
          
          <View style={{ padding: 15 }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#000000',
                flex: 1,
              }}>
                {image.caption || `Ảnh ${index + 1}`}
              </Text>
              
              {image.isPrimary && (
                <View style={{
                  backgroundColor: '#FFD700',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 4,
                }}>
                  <Text style={{
                    fontSize: 10,
                    fontWeight: 'bold',
                    color: '#000000',
                  }}>
                    ĐẠI DIỆN
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={{
              fontSize: 12,
              color: '#999999',
              marginBottom: 12,
            }}>
              Thêm vào {new Date(image.createdAt).toLocaleDateString('vi-VN')}
            </Text>
            
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#F8F8F8',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 15,
                  marginRight: 10,
                }}
                onPress={() => handleSetPrimary(image.id)}
              >
                <Ionicons name="star-outline" size={14} color="#666666" />
                <Text style={{
                  fontSize: 12,
                  color: '#666666',
                  marginLeft: 4,
                }}>
                  Đặt đại diện
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFE5E5',
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 15,
                }}
                onPress={() => handleDeleteImage(image.id, image.caption || `Ảnh ${index + 1}`)}
              >
                <Ionicons name="trash-outline" size={14} color="#FF6B6B" />
                <Text style={{
                  fontSize: 12,
                  color: '#FF6B6B',
                  marginLeft: 4,
                }}>
                  Xóa
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  if (!photographerId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="camera-outline" size={80} color="#CCCCCC" />
          <Text style={{
            fontSize: 18,
            color: '#666666',
            marginTop: 20,
            textAlign: 'center',
          }}>
            Bạn chưa là nhiếp ảnh gia
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#000000',
              paddingHorizontal: 30,
              paddingVertical: 12,
              borderRadius: 25,
              marginTop: 20,
            }}
            onPress={() => navigation.goBack()}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
              Quay lại
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
      <StatusBar barStyle="dark-content" />
      
      {renderHeader()}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={{ marginTop: 10, color: '#666666' }}>Đang tải portfolio...</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={60} color="#FF6B6B" />
          <Text style={{ marginTop: 10, color: '#666666', textAlign: 'center' }}>
            {error}
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: '#000000',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 20,
              marginTop: 15,
            }}
            onPress={refresh}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#000000']}
            />
          }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        >
          {images.length > 0 && (
            <PortfolioStats 
              images={images} 
              showViewAll={false}
            />
          )}

          {images.length === 0 ? (
            renderEmptyState()
          ) : viewMode === 'grid' ? (
            renderGridView()
          ) : (
            renderListView()
          )}

          <View style={{ height: 100 }} />
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