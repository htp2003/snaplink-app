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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ProfileCardDetailRouteProp = RouteProp<RootStackParamList, 'PhotographerCardDetail'>;

const { width, height } = Dimensions.get('window');
const HEADER_SWITCH_SCROLL = getResponsiveSize(180);

export default function PhotographerCardDetail() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ProfileCardDetailRouteProp>();
  const { photographerId } = route.params;

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { trackView } = useRecentlyViewed();
  const { photographerDetail, loading, error, fetchPhotographerById } = usePhotographerDetail();

  useEffect(() => {
    if (photographerId) {
      fetchPhotographerById(photographerId);
    }
  }, [photographerId]);


  // Track recently viewed khi có data
  useEffect(() => {
    if (photographerDetail) {
      console.log('Tracking photographer view:', photographerDetail.photographerId);
      
      // Track view với data structure phù hợp
      trackView({
        id: photographerDetail.photographerId.toString(),
        type: 'photographer',
        data: {
          id: photographerDetail.photographerId.toString(),
          fullName: photographerDetail.fullName || 'Unknown Photographer',
          avatar: photographerDetail.profileImage || '',
          images: photographerDetail.portfolioUrl ? [photographerDetail.portfolioUrl] : [],
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
  }, [photographerDetail, trackView]);

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



  const handleToggleFavorite = () => {
    if (!photographerDetail) return;

    const favoriteItem: FavoriteItem = {
      id: photographerDetail.photographerId.toString(),
      type: 'photographer',
      data: {
        id: photographerDetail.photographerId.toString(),
        fullName: photographerDetail.fullName || 'Unknown',
        avatar: photographerDetail.profileImage || '',
        images: photographerDetail.portfolioUrl ? [photographerDetail.portfolioUrl] : [],
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

  // Lấy hình ảnh portfolio để hiển thị slider
  const getPortfolioImages = () => {
    const fallbackImages = [
      'https://images.unsplash.com/photo-1554048612-b6eb0d27b92e?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1494790108755-2616b612b494?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&h=600&fit=crop',
    ];

    if (photographerDetail?.portfolioUrl) {
      return [photographerDetail.portfolioUrl, ...fallbackImages.slice(1)];
    }
    return fallbackImages;
  };

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

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentImageIndex(viewableItems[0].index);
    }
  }).current;

  // Render ảnh với chiều cao tràn viền
  const renderImageItem = ({ item }: { item: string }) => (
    <View style={{ width }}>
      <Image
        source={{ uri: item }}
        style={{ 
          width, 
          height: height * 0.6 + 50, // Tăng chiều cao để bù trừ marginTop
          marginTop: -50 // Đẩy lên trên để tràn qua status bar
        }}
        resizeMode="cover"
      />
    </View>
  );

  // Đổi StatusBar icon màu theo scroll (trắng/đen)
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

  const portfolioImages = getPortfolioImages();

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Container chính - KHÔNG có SafeAreaView để ảnh tràn viền */}
      <View className="flex-1">
        {/* Fixed Header Controls ban đầu - với SafeAreaView */}
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

        {/* Header động khi cuộn */}
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

        {/* Nội dung có thể cuộn */}
        <Animated.ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={1}
          contentContainerStyle={{ paddingTop: 0 }} // Không có padding để ảnh tràn viền
        >
          {/* Phần hình ảnh - TRÀN VIỀN */}
          <View style={{
            height: height * 0.6, // Giảm chiều cao một chút
            overflow: 'hidden',
            marginTop: -50, // Đẩy lên trên để tràn qua status bar
            zIndex: 1,
            backgroundColor: '#eee',
          }}>
            <FlatList
              ref={flatListRef}
              data={portfolioImages}
              renderItem={({ item }) => (
                <View style={{ width }}>
                  <Image
                    source={{ uri: item }}
                    style={{ 
                      width, 
                      height: height * 0.6,
                      marginTop: -50
                    }}
                    resizeMode="cover"
                  />
                </View>
              )}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            />

            {/* Bộ đếm hình ảnh - điều chỉnh vị trí */}
            <View
              className="absolute bg-black/50 backdrop-blur-sm rounded-full"
              style={{
                bottom: getResponsiveSize(90), // Tăng cao hơn nữa để không bị content che
                right: getResponsiveSize(16),
                paddingHorizontal: getResponsiveSize(12),
                paddingVertical: getResponsiveSize(4),
                zIndex: 50, // Z-index cao để không bị che
              }}
            >
              <Text
                className="text-white font-medium"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                {currentImageIndex + 1} / {portfolioImages.length}
              </Text>
            </View>
          </View>

          {/* Phần nội dung overlap lên ảnh */}
          <View
            className="bg-white relative"
            style={{
              borderTopLeftRadius: getResponsiveSize(32),
              borderTopRightRadius: getResponsiveSize(32),
              marginTop: -getResponsiveSize(80), // Giữ nguyên overlap 80 như bạn đã điều chỉnh
              zIndex: 10, // Thấp hơn bộ đếm
            }}
          >
            <View style={{ paddingHorizontal: getResponsiveSize(24), paddingTop: getResponsiveSize(24) }}>
              {/* Icon và tiêu đề từ API */}
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

              {/* Phần đánh giá */}
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

              {/* Thông tin Photographer */}
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
                
                {/* Badge verification nếu có */}
                {photographerDetail?.verificationStatus === 'verified' && (
                  <View className="ml-2">
                    <Ionicons name="checkmark-circle" size={getResponsiveSize(20)} color="#10b981" />
                  </View>
                )}
              </View>

              {/* Dịch vụ và kỹ năng từ API */}
              <View
                className="pb-6 border-b border-stone-200"
                style={{ marginBottom: getResponsiveSize(24) }}
              >
                {/* Dịch vụ 1 - Equipment */}
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

                {/* Dịch vụ 2 - Specialty */}
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

                {/* Dịch vụ 3 - Portfolio */}
                {photographerDetail?.portfolioUrl && (
                  <View className="flex-row">
                    <Ionicons name="images-outline" size={getResponsiveSize(24)} color="#57534e" />
                    <View className="ml-4 flex-1">
                      <Text
                        className="text-stone-900 font-semibold"
                        style={{ fontSize: getResponsiveSize(16), marginBottom: getResponsiveSize(4) }}
                      >
                        Portfolio chuyên nghiệp
                      </Text>
                      <Text
                        className="text-stone-600 leading-6"
                        style={{ fontSize: getResponsiveSize(14) }}
                      >
                        Xem thêm các tác phẩm đã hoàn thành với chất lượng cao.
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Highlight status */}
              <View
                className="bg-stone-50 rounded-2xl border-l-4 border-pink-500 flex-row items-center"
                style={{
                  padding: getResponsiveSize(16),
                  marginBottom: getResponsiveSize(32)
                }}
              >
                <Text style={{ fontSize: getResponsiveSize(20), marginRight: getResponsiveSize(12) }}>
                  {photographerDetail?.featuredStatus ? '⭐' : photographerDetail?.availabilityStatus === 'available' ? '📸' : '💎'}
                </Text>
                <Text
                  className="text-stone-800 font-medium flex-1"
                  style={{ fontSize: getResponsiveSize(16) }}
                >
                  {photographerDetail?.featuredStatus 
                    ? 'Photographer nổi bật! Được đánh giá cao bởi khách hàng'
                    : photographerDetail?.availabilityStatus === 'available'
                    ? 'Có thể đặt lịch ngay! Photographer đang sẵn sàng nhận booking'
                    : 'Photographer được yêu thích! Thường xuyên được đặt lịch'
                  }
                </Text>
              </View>
            </View>
          </View>
        </Animated.ScrollView>

        {/* Nút đặt phòng cố định - với SafeAreaView */}
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