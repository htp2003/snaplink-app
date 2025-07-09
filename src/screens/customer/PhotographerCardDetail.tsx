import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StatusBar, Dimensions, Alert, ActivityIndicator, FlatList, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { getResponsiveSize } from '../../utils/responsive';
import { useFavorites, FavoriteItem } from '../../hooks/useFavorites';
import { usePhotographerDetail } from '../../hooks/usePhotographerDetail';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { photographerService } from '../../services/photographerService';
import { PhotographerImage } from '../../types/photographerImage';
import PhotographerReviews from '../../components/Photographer/PhotographerReviews';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ProfileCardDetailRouteProp = RouteProp<RootStackParamList, 'PhotographerCardDetail'>;

const { width, height } = Dimensions.get('window');

export default function PhotographerCardDetail() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ProfileCardDetailRouteProp>();
  const { photographerId } = route.params;

  // State management
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [photographerImages, setPhotographerImages] = useState<string[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Hooks
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { trackView } = useRecentlyViewed();
  const { photographerDetail, loading, error, fetchPhotographerById } = usePhotographerDetail();

  // Fetch photographer details
  useEffect(() => {
    if (photographerId) {
      fetchPhotographerById(photographerId);
    }
  }, [photographerId]);

  // Fetch photographer images từ PhotographerImage API
  const fetchPhotographerImages = async () => {
    if (!photographerId) return;
    
    try {
      setLoadingImages(true);
      const images = await photographerService.getImages(parseInt(photographerId));
      
      // Process images array
      let imageArray: PhotographerImage[] = [];
      if (Array.isArray(images)) {
        imageArray = images;
      } else if (images && Array.isArray((images as any).$values)) {
        imageArray = (images as any).$values;
      }

      // Extract image URLs
      const imageUrls = imageArray.map(img => img.imageUrl);
      setPhotographerImages(imageUrls);
      
    } catch (error) {
      console.error('Error fetching photographer images:', error);
      setPhotographerImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  useEffect(() => {
    fetchPhotographerImages();
  }, [photographerId]);

  // Track recently viewed
  useEffect(() => {
    if (photographerDetail) {
      trackView({
        id: photographerDetail.photographerId.toString(),
        type: 'photographer',
        data: {
          id: photographerDetail.photographerId.toString(),
          fullName: photographerDetail.fullName || 'Unknown Photographer',
          avatar: photographerDetail.profileImage || '',
          cardImage: null,
          images: photographerImages,
          styles: Array.isArray(photographerDetail.styles)
            ? photographerDetail.styles
            : (photographerDetail.styles && '$values' in photographerDetail.styles)
              ? (photographerDetail.styles as any).$values
              : [photographerDetail.specialty || 'Photography'],
          rating: photographerDetail.rating,
          hourlyRate: photographerDetail.hourlyRate,
          availabilityStatus: photographerDetail.availabilityStatus,
          specialty: photographerDetail.specialty,
        }
      });
    }
  }, [photographerDetail, photographerImages]);

  // Handle error
  useEffect(() => {
    if (error) {
      Alert.alert(
        'Lỗi',
        `Không thể tải thông tin photographer: ${error}`,
        [
          { text: 'Thử lại', onPress: () => fetchPhotographerById(photographerId) },
          { text: 'Quay lại', onPress: () => navigation.goBack() }
        ]
      );
    }
  }, [error]);

  // Handle favorite toggle
  const handleToggleFavorite = () => {
    if (!photographerDetail) return;

    const favoriteItem: FavoriteItem = {
      id: photographerDetail.photographerId.toString(),
      type: 'photographer',
      data: {
        id: photographerDetail.photographerId.toString(),
        fullName: photographerDetail.fullName || 'Unknown',
        avatar: photographerDetail.profileImage || '',
        cardImage: null,
        images: photographerImages,
        styles: Array.isArray(photographerDetail.styles)
          ? photographerDetail.styles
          : (photographerDetail.styles && '$values' in photographerDetail.styles)
            ? (photographerDetail.styles as any).$values
            : [],
        rating: photographerDetail.rating,
        hourlyRate: photographerDetail.hourlyRate,
        availabilityStatus: photographerDetail.availabilityStatus
      }
    };

    if (isFavorite(photographerDetail.photographerId.toString())) {
      removeFavorite(photographerDetail.photographerId.toString());
    } else {
      addFavorite(favoriteItem);
    }
  };

  // Render stars for rating
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={getResponsiveSize(16)} color="#d97706" />);
    }
    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={getResponsiveSize(16)} color="#d97706" />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={getResponsiveSize(16)} color="#d1d5db" />);
    }
    return stars;
  };

  // Handle image viewable changes
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentImageIndex(viewableItems[0].index);
    }
  }).current;

  // Render image item
  const renderImageItem = ({ item }: { item: string }) => (
    <View style={{ width }}>
      <Image
        source={{ uri: item }}
        style={{ 
          width, 
          height: height * 0.6 + 50,
          marginTop: -50
        }}
        resizeMode="cover"
        onError={(error) => {
          console.log('Failed to load photographer image:', item, error);
        }}
      />
    </View>
  );

  // Handle status bar style change
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      if (value > getResponsiveSize(160)) {
        StatusBar.setBarStyle('dark-content');
      } else {
        StatusBar.setBarStyle('light-content');
      }
    });
    return () => scrollY.removeListener(listener);
  }, [scrollY]);

  // Loading state
  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#d97706" />
        <Text className="text-stone-600 mt-4 text-lg">Đang tải...</Text>
      </View>
    );
  }

  // Not found state
  if (!photographerDetail) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-6">
        <Ionicons name="person-remove-outline" size={80} color="#9ca3af" />
        <Text className="text-stone-900 text-2xl font-bold mt-6 text-center">
          Không tìm thấy thợ chụp ảnh
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mt-8 px-8 py-4 bg-amber-500 rounded-2xl"
        >
          <Text className="text-white font-bold text-lg">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      <View className="flex-1">
        {/* Fixed Header Controls */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: 'rgba(255,255,255,0)',
            opacity: scrollY.interpolate({
              inputRange: [0, getResponsiveSize(120), getResponsiveSize(180)],
              outputRange: [1, 0.5, 0],
              extrapolate: 'clamp',
            }),
          }}
        >
          <SafeAreaView>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: getResponsiveSize(56),
                paddingHorizontal: getResponsiveSize(16),
              }}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{
                  width: getResponsiveSize(40),
                  height: getResponsiveSize(40),
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                  borderRadius: getResponsiveSize(20),
                }}
              >
                <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="white" />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={{
                    width: getResponsiveSize(40),
                    height: getResponsiveSize(40),
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: getResponsiveSize(20),
                    marginRight: getResponsiveSize(8),
                  }}
                >
                  <Ionicons name="share-outline" size={getResponsiveSize(22)} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleToggleFavorite}
                  style={{
                    width: getResponsiveSize(40),
                    height: getResponsiveSize(40),
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    borderRadius: getResponsiveSize(20),
                  }}
                >
                  <Ionicons
                    name={isFavorite(photographerDetail.photographerId.toString()) ? 'heart' : 'heart-outline'}
                    size={getResponsiveSize(22)}
                    color={isFavorite(photographerDetail.photographerId.toString()) ? '#ef4444' : 'white'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>

        {/* Dynamic Header */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 101,
            backgroundColor: 'white',
            borderBottomWidth: 1,
            borderBottomColor: '#eee',
            opacity: scrollY.interpolate({
              inputRange: [getResponsiveSize(300), getResponsiveSize(340)],
              outputRange: [0, 1],
              extrapolate: 'clamp',
            }),
          }}
        >
          <SafeAreaView>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: getResponsiveSize(56),
                paddingHorizontal: getResponsiveSize(16),
              }}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{
                  width: getResponsiveSize(40),
                  height: getResponsiveSize(40),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="#222" />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text
                  style={{
                    fontWeight: 'bold',
                    fontSize: getResponsiveSize(16),
                    color: '#222',
                  }}
                  numberOfLines={1}
                >
                  {photographerDetail?.fullName || 'Photographer Detail'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={{
                    width: getResponsiveSize(40),
                    height: getResponsiveSize(40),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="share-outline" size={getResponsiveSize(22)} color="#222" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleToggleFavorite}
                  style={{
                    width: getResponsiveSize(40),
                    height: getResponsiveSize(40),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={isFavorite(photographerDetail.photographerId.toString()) ? 'heart' : 'heart-outline'}
                    size={getResponsiveSize(22)}
                    color={isFavorite(photographerDetail.photographerId.toString()) ? '#ef4444' : '#222'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>

        {/* Scrollable Content */}
        <Animated.ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={1}
          contentContainerStyle={{ paddingTop: 0 }}
        >
          {/* Photographer Images Gallery */}
          <View style={{
            height: height * 0.6,
            overflow: 'hidden',
            marginTop: -50,
            zIndex: 1,
            backgroundColor: '#eee',
          }}>
            {loadingImages ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#d97706" />
                <Text className="text-stone-600 mt-2">Đang tải ảnh...</Text>
              </View>
            ) : photographerImages.length > 0 ? (
              <>
                <FlatList
                  ref={flatListRef}
                  data={photographerImages}
                  renderItem={renderImageItem}
                  keyExtractor={(item, index) => index.toString()}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                />
                {/* Image Counter */}
                <View
                  className="absolute bg-black/50 backdrop-blur-sm rounded-full"
                  style={{
                    bottom: getResponsiveSize(90),
                    right: getResponsiveSize(16),
                    paddingHorizontal: getResponsiveSize(12),
                    paddingVertical: getResponsiveSize(4),
                    zIndex: 50,
                  }}
                >
                  <Text
                    className="text-white font-medium"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    {currentImageIndex + 1} / {photographerImages.length}
                  </Text>
                </View>
              </>
            ) : (
              <View className="flex-1 justify-center items-center">
                <Ionicons name="camera-outline" size={getResponsiveSize(60)} color="#9ca3af" />
                <Text className="text-stone-600 mt-4 text-center">
                  Chưa có ảnh từ photographer
                </Text>
              </View>
            )}
          </View>

          {/* Content Section */}
          <View
            className="bg-white relative"
            style={{
              borderTopLeftRadius: getResponsiveSize(32),
              borderTopRightRadius: getResponsiveSize(32),
              marginTop: -getResponsiveSize(80),
              zIndex: 10,
            }}
          >
            <View style={{ paddingHorizontal: getResponsiveSize(24), paddingTop: getResponsiveSize(24) }}>
              {/* Header Info */}
              <View className="items-center mb-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="camera-outline" size={getResponsiveSize(20)} color="#666" />
                  <Text
                    className="text-stone-900 font-bold ml-2"
                    style={{ fontSize: getResponsiveSize(24) }}
                  >
                    {photographerDetail?.fullName || 'Photographer'}
                  </Text>
                </View>
                
                <Text
                  className="text-stone-600 text-center mb-2"
                  style={{ fontSize: getResponsiveSize(16) }}
                >
                  {photographerDetail?.specialty || 'Chuyên gia nhiếp ảnh'}
                </Text>

                <Text
                  className="text-stone-600 text-center"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  {photographerDetail?.yearsExperience || 0} năm kinh nghiệm • {photographerDetail?.equipment || 'Thiết bị chuyên nghiệp'}
                </Text>
              </View>

              {/* Rating Section */}
              <View
                className="flex-row items-center justify-between pb-6 border-b border-stone-200"
                style={{ marginBottom: getResponsiveSize(24) }}
              >
                <View className="items-center">
                  <Text
                    className="text-stone-900 font-bold"
                    style={{ fontSize: getResponsiveSize(28) }}
                  >
                    {photographerDetail?.rating?.toFixed(2).replace('.', ',') || '4,81'}
                  </Text>
                  <View className="flex-row mt-1">
                    {renderStars(photographerDetail?.rating || 4.81)}
                  </View>
                </View>

                <View className="items-center">
                  <Ionicons name="medal-outline" size={getResponsiveSize(32)} color="#d97706" />
                  <Text
                    className="text-stone-700 font-medium mt-1"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    Được khách yêu thích
                  </Text>
                </View>

                <View className="items-center">
                  <Text
                    className="text-stone-900 font-bold"
                    style={{ fontSize: getResponsiveSize(28) }}
                  >
                    {photographerDetail?.ratingCount || '79'}
                  </Text>
                  <Text
                    className="text-stone-600"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    đánh giá
                  </Text>
                </View>
              </View>

              {/* Photographer Info */}
              <View
                className="flex-row items-center pb-6 border-b border-stone-200"
                style={{ marginBottom: getResponsiveSize(24) }}
              >
                <Image
                  source={{ uri: photographerDetail?.profileImage || 'https://via.placeholder.com/60' }}
                  style={{
                    width: getResponsiveSize(56),
                    height: getResponsiveSize(56)
                  }}
                  className="rounded-full mr-4"
                />
                <View className="flex-1">
                  <Text
                    className="text-stone-900 font-semibold"
                    style={{ fontSize: getResponsiveSize(18) }}
                  >
                    Photographer: {photographerDetail?.fullName || 'Professional'}
                  </Text>
                  <Text
                    className="text-stone-600"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    {photographerDetail?.yearsExperience || 0} năm kinh nghiệm • {photographerDetail?.availabilityStatus || 'Available'}
                  </Text>
                </View>
                
                {/* Verification Badge */}
                {photographerDetail?.verificationStatus === 'verified' && (
                  <View className="ml-2">
                    <Ionicons name="checkmark-circle" size={getResponsiveSize(20)} color="#10b981" />
                  </View>
                )}
              </View>

              {/* Services Section */}
              <View
                className="pb-6 border-b border-stone-200"
                style={{ marginBottom: getResponsiveSize(24) }}
              >
                {/* Equipment */}
                {photographerDetail?.equipment && (
                  <View className="flex-row" style={{ marginBottom: getResponsiveSize(20) }}>
                    <Ionicons name="camera-outline" size={getResponsiveSize(24)} color="#57534e" />
                    <View className="ml-4 flex-1">
                      <Text
                        className="text-stone-900 font-semibold"
                        style={{ fontSize: getResponsiveSize(16), marginBottom: getResponsiveSize(4) }}
                      >
                        Thiết bị chuyên nghiệp
                      </Text>
                      <Text
                        className="text-stone-600 leading-6"
                        style={{ fontSize: getResponsiveSize(14) }}
                      >
                        {photographerDetail.equipment}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Specialty */}
                {photographerDetail?.specialty && (
                  <View className="flex-row" style={{ marginBottom: getResponsiveSize(20) }}>
                    <Ionicons name="star-outline" size={getResponsiveSize(24)} color="#57534e" />
                    <View className="ml-4 flex-1">
                      <Text
                        className="text-stone-900 font-semibold"
                        style={{ fontSize: getResponsiveSize(16), marginBottom: getResponsiveSize(4) }}
                      >
                        Chuyên môn
                      </Text>
                      <Text
                        className="text-stone-600 leading-6"
                        style={{ fontSize: getResponsiveSize(14) }}
                      >
                        {photographerDetail.specialty}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Portfolio Website */}
                {photographerDetail?.portfolioUrl && (
                  <View className="flex-row" style={{ marginBottom: getResponsiveSize(20) }}>
                    <Ionicons name="link-outline" size={getResponsiveSize(24)} color="#57534e" />
                    <View className="ml-4 flex-1">
                      <Text
                        className="text-stone-900 font-semibold"
                        style={{ fontSize: getResponsiveSize(16), marginBottom: getResponsiveSize(4) }}
                      >
                        Portfolio Website
                      </Text>
                      <Text
                        className="text-stone-600 leading-6"
                        style={{ fontSize: getResponsiveSize(14) }}
                      >
                        Xem thêm tác phẩm tại website cá nhân
                      </Text>
                    </View>
                  </View>
                )}

                {/* Photographer Images */}
                <View className="flex-row">
                  <Ionicons name="images-outline" size={getResponsiveSize(24)} color="#57534e" />
                  <View className="ml-4 flex-1">
                    <Text
                      className="text-stone-900 font-semibold"
                      style={{ fontSize: getResponsiveSize(16), marginBottom: getResponsiveSize(4) }}
                    >
                      Ảnh từ photographer
                    </Text>
                    <Text
                      className="text-stone-600 leading-6"
                      style={{ fontSize: getResponsiveSize(14) }}
                    >
                      {photographerImages.length > 0 
                        ? `${photographerImages.length} ảnh được upload bởi photographer.`
                        : 'Đang cập nhật ảnh mới nhất.'
                      }
                    </Text>
                  </View>
                </View>
              </View>  
            </View>
          </View>
          
          {/* Reviews Section */}
          <PhotographerReviews
            photographerId={photographerDetail?.photographerId || photographerId}
            currentRating={photographerDetail?.rating}
            totalReviews={photographerDetail?.ratingCount}
          />
          <View style={{ height: getResponsiveSize(32) }} />
        </Animated.ScrollView>

        {/* Booking Button */}
        <SafeAreaView style={{ backgroundColor: 'white' }}>
          <View
            className="bg-white px-6 border-t border-stone-200"
            style={{ paddingVertical: getResponsiveSize(16) }}
          >
            <TouchableOpacity
              onPress={() => navigation.navigate('Booking', {
                photographerId: photographerDetail?.photographerId?.toString() || '',
                photographerName: photographerDetail?.fullName || 'Photographer',
                hourlyRate: photographerDetail?.hourlyRate
              })}
              disabled={photographerDetail?.availabilityStatus?.toLowerCase() === 'unavailable'}
              className={`rounded-2xl items-center ${photographerDetail?.availabilityStatus?.toLowerCase() === 'unavailable'
                ? 'bg-stone-300'
                : 'bg-pink-500'
                }`}
              style={{ paddingVertical: getResponsiveSize(16) }}
            >
              <Text
                className="text-white font-bold"
                style={{ fontSize: getResponsiveSize(18) }}
              >
                {photographerDetail?.availabilityStatus?.toLowerCase() === 'unavailable' 
                  ? 'Không khả dụng' 
                  : `Đặt lịch - ₫${(photographerDetail?.hourlyRate || 0).toLocaleString('vi-VN')}/giờ`
                }
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}