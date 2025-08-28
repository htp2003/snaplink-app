import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  FlatList,
  Animated,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, GooglePlaceDisplay } from '../../navigation/types';
import { getResponsiveSize } from '../../utils/responsive';
import { useFavorites, FavoriteItem } from '../../hooks/useFavorites';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';
import { useLocationDetail } from '../../hooks/useLocationDetail';
import LocationReviews from '../../components/Location/LocationReviews';
import { useLocationReviews } from '../../hooks/useLocationReviews';
import { directGooglePlaces } from '../../services/directGooglePlacesService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type LocationCardDetailRouteProp = RouteProp<RootStackParamList, 'LocationCardDetail'>;

const { width, height } = Dimensions.get('window');

export default function LocationCardDetail() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<LocationCardDetailRouteProp>();
  const { locationId, externalLocation } = route.params;

  // ✅ FIXED: Use useMemo to avoid hook conflicts
  const isExternalLocation = useMemo(() => !!externalLocation, []);
  const externalLocationData = useMemo(() => externalLocation || null, []);

  // State
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // 🆕 OPTIMIZED: External photo loading state
  const [externalPhotos, setExternalPhotos] = useState<{
    urls: string[];
    loading: boolean;
    error: string | null;
    loaded: boolean;
  }>({
    urls: [],
    loading: false,
    error: null,
    loaded: false
  });

  const [addressValidation, setAddressValidation] = useState<{
    isValid: boolean;
    coordinates?: { lat: number; lng: number };
    displayName?: string;
  } | null>(null);

  const [hasTrackedView, setHasTrackedView] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { trackView } = useRecentlyViewed();

  // Hooks for app locations only
  const {
    locationDetail,
    loading,
    error,
    fetchLocationById,
    galleryImages,
    loadingImages,
    imageError
  } = useLocationDetail();

  const {
    averageRating,
    totalReviews: reviewCount,
  } = useLocationReviews(
    isExternalLocation ? 0 : (locationDetail?.locationId || parseInt(locationId || '0')),
    isExternalLocation ? externalLocationData?.rating : locationDetail?.rating,
    isExternalLocation ? 0 : locationDetail?.ratingCount
  );

  // ✅ FIXED: Single initialization useEffect
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      if (isExternalLocation && externalLocationData) {
        console.log('🌐 External location mode:', externalLocationData.name);

        // Set coordinates for external location
        if (externalLocationData.latitude && externalLocationData.longitude && isMounted) {
          setAddressValidation({
            isValid: true,
            coordinates: {
              lat: externalLocationData.latitude,
              lng: externalLocationData.longitude
            },
            displayName: externalLocationData.address
          });
        }

        // 🆕 OPTIMIZED: Load photos only when component mounts
        await loadExternalPhotos();

      } else if (!isExternalLocation && locationId && isMounted) {
        console.log('🏢 App location mode:', locationId);
        fetchLocationById(locationId);
      }
    };

    initialize();
    return () => { isMounted = false; };
  }, []);

  // 🆕 OPTIMIZED: Load external photos function
  const loadExternalPhotos = useCallback(async () => {
    if (!isExternalLocation || !externalLocationData?.placeId || externalPhotos.loaded) {
      return;
    }

    console.log('📸 Loading photos for external location:', externalLocationData.name);

    setExternalPhotos(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 🎯 Use optimized photo loading from service
      const photoUrls = await directGooglePlaces.getPlacePhotos(externalLocationData.placeId, {
        maxWidth: 800,
        maxHeight: 600,
        maxPhotos: 5 // Load multiple photos for gallery
      });

      console.log('✅ External photos loaded:', {
        count: photoUrls.length,
        apiUsage: directGooglePlaces.getApiUsage()
      });

      setExternalPhotos({
        urls: photoUrls,
        loading: false,
        error: null,
        loaded: true
      });

    } catch (error) {
      console.error('❌ Failed to load external photos:', error);
      setExternalPhotos(prev => ({
        ...prev,
        loading: false,
        error: 'Không thể tải ảnh địa điểm',
        loaded: true
      }));
    }
  }, [isExternalLocation, externalLocationData?.placeId, externalPhotos.loaded]);

  // Address validation for app locations
  useEffect(() => {
    if (isExternalLocation || !locationDetail?.address) return;

    let isMounted = true;

    const validateAddress = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const address = locationDetail.address || '';
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=vn&addressdetails=1`,
          { headers: { 'User-Agent': 'SnapLinkApp/1.0' } }
        );

        if (!response.ok || !isMounted) return;

        const data = await response.json();
        if (data && Array.isArray(data) && data.length > 0 && isMounted) {
          const result = data[0];
          setAddressValidation({
            isValid: true,
            coordinates: { lat: parseFloat(result.lat), lng: parseFloat(result.lon) },
            displayName: result.display_name
          });
        } else if (isMounted) {
          setAddressValidation({ isValid: false });
        }
      } catch (error) {
        console.error('Address validation failed:', error);
        if (isMounted) setAddressValidation({ isValid: false });
      }
    };

    const timer = setTimeout(validateAddress, 500);
    return () => { isMounted = false; clearTimeout(timer); };
  }, [isExternalLocation, locationDetail?.address]);

  // Track view for app locations
  useEffect(() => {
    if (!isExternalLocation && locationDetail && !hasTrackedView) {
      const trackData = {
        id: locationDetail.locationId.toString(),
        type: 'location' as const,
        data: {
          id: locationDetail.locationId.toString(),
          locationId: locationDetail.locationId,
          name: locationDetail.name || 'Unknown Location',
          avatar: locationDetail.ownerAvatar || '',
          images: galleryImages || [],
          styles: getAmenities(),
          address: locationDetail.address,
          hourlyRate: locationDetail.hourlyRate,
          capacity: locationDetail.capacity,
          availabilityStatus: locationDetail.availabilityStatus
        }
      };
      trackView(trackData);
      setHasTrackedView(true);
    }
  }, [isExternalLocation, locationDetail?.locationId, hasTrackedView]);

  // Error handling
  useEffect(() => {
    if (error && !isExternalLocation) {
      Alert.alert('Lỗi', `Không thể tải thông tin địa điểm: ${error}`, [
        { text: 'Thử lại', onPress: () => fetchLocationById(locationId!) },
        { text: 'Quay lại', onPress: () => navigation.goBack() }
      ]);
    }
  }, [error, isExternalLocation]);

  // Status bar
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      StatusBar.setBarStyle(value > getResponsiveSize(160) ? 'dark-content' : 'light-content');
    });
    return () => scrollY.removeListener(listener);
  }, [scrollY]);

  // Helper functions
  const getAmenities = useCallback((): string[] => {
    if (isExternalLocation) {
      return externalLocationData?.types || ['External Location'];
    }
    if (locationDetail?.amenities) {
      return locationDetail.amenities.split(',').map(a => a.trim());
    }
    const amenities = [];
    if (locationDetail?.indoor) amenities.push('Indoor');
    if (locationDetail?.outdoor) amenities.push('Outdoor');
    return amenities.length > 0 ? amenities : ['Studio Space'];
  }, [isExternalLocation, externalLocationData?.types, locationDetail]);

  const openMapsApp = async (lat: number, lng: number, address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const urls = {
      googleMaps: `https://maps.google.com/maps?q=${lat},${lng}`,
      appleMaps: `http://maps.apple.com/?ll=${lat},${lng}&q=${encodedAddress}`,
      universal: `geo:${lat},${lng}?q=${lat},${lng}(${encodedAddress})`
    };

    try {
      let urlToOpen = urls.googleMaps;
      if (Platform.OS === 'ios') {
        const canOpenAppleMaps = await Linking.canOpenURL(urls.appleMaps);
        if (canOpenAppleMaps) urlToOpen = urls.appleMaps;
      }
      const canOpen = await Linking.canOpenURL(urlToOpen);
      await Linking.openURL(canOpen ? urlToOpen : urls.universal);
    } catch (error) {
      Alert.alert('Không thể mở bản đồ', 'Vui lòng cài đặt ứng dụng bản đồ trên thiết bị của bạn.');
    }
  };

  const getStaticMapUrl = (lat: number, lng: number, zoom: number = 15) => {
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
    return `https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/${zoom}/${x}/${y}@2x.png`;
  };

  const handleToggleFavorite = useCallback(() => {
    if (isExternalLocation) {
      const favoriteItem: FavoriteItem = {
        id: externalLocationData!.placeId,
        type: 'location',
        data: {
          id: externalLocationData!.placeId,
          locationId: 0,
          name: externalLocationData!.name,
          avatar: '',
          images: externalPhotos.urls, // 🆕 Use loaded photos
          styles: externalLocationData!.types || [],
          address: externalLocationData!.address,
          hourlyRate: 0,
          availabilityStatus: 'external'
        }
      };

      if (isFavorite(externalLocationData!.placeId, 'location')) {
        removeFavorite(externalLocationData!.placeId, 'location');
      } else {
        addFavorite(favoriteItem);
      }
    } else if (locationDetail) {
      const favoriteItem: FavoriteItem = {
        id: locationDetail.locationId.toString(),
        type: 'location',
        data: {
          id: locationDetail.locationId.toString(),
          locationId: locationDetail.locationId,
          name: locationDetail.name || 'Unknown Location',
          avatar: locationDetail.ownerAvatar || '',
          images: galleryImages || [],
          styles: getAmenities(),
          address: locationDetail.address,
          hourlyRate: locationDetail.hourlyRate,
          availabilityStatus: locationDetail.availabilityStatus
        }
      };

      if (isFavorite(locationDetail.locationId.toString(), 'location')) {
        removeFavorite(locationDetail.locationId.toString(), 'location');
      } else {
        addFavorite(favoriteItem);
      }
    }
  }, [isExternalLocation, externalLocationData, externalPhotos.urls, locationDetail, galleryImages, getAmenities, isFavorite, addFavorite, removeFavorite]);

  const renderStars = (rating: number = 0) => {
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

  const renderImageItem = ({ item }: { item: string }) => (
    <View style={{ width }}>
      <Image
        source={{ uri: item }}
        style={{ width, height: height * 0.6 + 50, marginTop: -50 }}
        resizeMode="cover"
        onError={() => console.log('Failed to load image:', item)}
      />
    </View>
  );

  const handleBookLocation = () => {
    if (externalLocationData && (!externalLocationData.latitude || !externalLocationData.longitude)) {
      Alert.alert(
        'Địa điểm không hợp lệ',
        'Địa điểm này thiếu thông tin tọa độ. Vui lòng chọn một địa điểm cụ thể khác.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    if (isExternalLocation) {
      if (!externalLocationData) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin địa điểm');
        return;
      }

      const locationData = {
        placeId: externalLocationData.placeId,
        name: externalLocationData.name || 'Unknown Location',
        address: externalLocationData.address || '',
        description: '',
        latitude: Number(externalLocationData.latitude),
        longitude: Number(externalLocationData.longitude),
        types: Array.isArray(externalLocationData.types)
          ? externalLocationData.types.join(',')
          : (externalLocationData.types || ''),
        hourlyRate: 0,
      };

      (navigation as any).navigate('Booking', { location: locationData });

    } else {
      if (!locationDetail?.locationId) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin địa điểm');
        return;
      }
      const locationData = {
        locationId: locationDetail.locationId,
        name: locationDetail.name || 'Unknown Location',
        address: locationDetail.address || '',
        hourlyRate: locationDetail.hourlyRate || 0,
        imageUrl: galleryImages?.[0] || '',
        capacity: locationDetail.capacity || 0,
        styles: getAmenities(),
        indoor: locationDetail.indoor || false,
        outdoor: locationDetail.outdoor || false,
        latitude: locationDetail.latitude,
        longitude: locationDetail.longitude,
      };
      (navigation as any).navigate('Booking', { location: locationData });
    }
  };

  // 🆕 OPTIMIZED: Get current images based on location type
  const getCurrentImages = useCallback(() => {
    if (isExternalLocation) {
      return externalPhotos.urls;
    } else {
      return galleryImages || [];
    }
  }, [isExternalLocation, externalPhotos.urls, galleryImages]);

  // 🆕 OPTIMIZED: Get loading state
  const getImageLoadingState = useCallback(() => {
    if (isExternalLocation) {
      return {
        loading: externalPhotos.loading,
        error: externalPhotos.error,
        hasImages: externalPhotos.urls.length > 0
      };
    } else {
      return {
        loading: loadingImages,
        error: imageError,
        hasImages: galleryImages && galleryImages.length > 0
      };
    }
  }, [isExternalLocation, externalPhotos, loadingImages, imageError, galleryImages]);

  // Loading state
  if (!isExternalLocation && loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-stone-600 mt-4 text-lg">Đang tải...</Text>
      </View>
    );
  }

  // No data state
  if (!isExternalLocation && !locationDetail) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-6">
        <Ionicons name="location-outline" size={80} color="#9ca3af" />
        <Text className="text-stone-900 text-2xl font-bold mt-6 text-center">Không tìm thấy địa điểm</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-8 px-8 py-4 bg-emerald-500 rounded-2xl">
          <Text className="text-white font-bold text-lg">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Display data
  const displayData = isExternalLocation ? {
    name: externalLocationData?.name || 'External Location',
    address: externalLocationData?.address || '',
    rating: externalLocationData?.rating || 0,
    types: externalLocationData?.types || [],
  } : {
    name: locationDetail?.name || 'Studio Location',
    address: locationDetail?.address || '',
    rating: averageRating,
    types: getAmenities(),
  };

  const itemId = isExternalLocation ? externalLocationData!.placeId : locationDetail!.locationId.toString();
  const currentImages = getCurrentImages();
  const imageState = getImageLoadingState();
  const safeLocationId = locationDetail?.locationId || (locationId ? parseInt(locationId) : 0)

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
                    name={isFavorite(itemId) ? 'heart' : 'heart-outline'}
                    size={getResponsiveSize(22)}
                    color={isFavorite(itemId) ? '#ef4444' : 'white'}
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
                  {displayData.name}
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
                    name={isFavorite(itemId) ? 'heart' : 'heart-outline'}
                    size={getResponsiveSize(22)}
                    color={isFavorite(itemId) ? '#ef4444' : '#222'}
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
          {/* 🆕 OPTIMIZED: Location Images Gallery */}
          <View style={{
            height: height * 0.6,
            overflow: 'hidden',
            marginTop: -50,
            zIndex: 1,
            backgroundColor: '#eee',
          }}>
            {imageState.loading ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#10b981" />
                <Text className="text-stone-600 mt-2">
                  {isExternalLocation ? 'Đang tải ảnh từ Google Places...' : 'Đang tải ảnh từ Image API...'}
                </Text>
                {isExternalLocation && (
                  <Text className="text-stone-400 mt-1 text-sm">
                    API Usage: {directGooglePlaces.getApiUsage().photos} photos calls
                  </Text>
                )}
              </View>
            ) : imageState.hasImages ? (
              <>
                <FlatList
                  ref={flatListRef}
                  data={currentImages}
                  renderItem={renderImageItem}
                  keyExtractor={(item, index) => `${item}-${index}`}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
                />
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
                    {currentImageIndex + 1} / {currentImages.length}
                  </Text>
                </View>
                {/* 🆕 Photo source indicator */}
                <View
                  className="absolute bg-blue-500/80 backdrop-blur-sm rounded-full"
                  style={{
                    bottom: getResponsiveSize(90),
                    left: getResponsiveSize(16),
                    paddingHorizontal: getResponsiveSize(8),
                    paddingVertical: getResponsiveSize(4),
                    zIndex: 50,
                  }}
                >
                  <Text
                    className="text-white font-medium"
                    style={{ fontSize: getResponsiveSize(11) }}
                  >
                    {isExternalLocation ? '📸 Google' : '🏢 Internal'}
                  </Text>
                </View>
              </>
            ) : (
              <View className="flex-1 justify-center items-center">
                <Ionicons name="images-outline" size={getResponsiveSize(60)} color="#9ca3af" />
                <Text className="text-stone-600 mt-4 text-center">
                  {isExternalLocation ? 'Chưa có ảnh từ Google Places' : 'Chưa có ảnh địa điểm từ Image API'}
                </Text>
                {imageState.error && (
                  <Text className="text-red-500 mt-2 text-center text-sm">
                    {imageState.error}
                  </Text>
                )}
                {isExternalLocation && !externalPhotos.loaded && (
                  <TouchableOpacity 
                    className="mt-4 px-4 py-2 bg-blue-500 rounded-lg"
                    onPress={loadExternalPhotos}
                  >
                    <Text className="text-white font-medium">Tải ảnh</Text>
                  </TouchableOpacity>
                )}
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
                  <Ionicons name="location-outline" size={getResponsiveSize(20)} color="#666" />
                  <Text
                    className="text-stone-900 font-bold ml-2"
                    style={{ fontSize: getResponsiveSize(24) }}
                  >
                    {displayData.name}
                  </Text>
                </View>

                <Text
                  className="text-stone-600 text-center mb-2"
                  style={{ fontSize: getResponsiveSize(16) }}
                >
                  {displayData.address}
                </Text>

                {/* 🆕 Show different info for external vs internal locations */}
                {isExternalLocation ? (
                  <View className="flex-row items-center">
                    {displayData.rating > 0 && (
                      <>
                        <View className="flex-row items-center mr-4">
                          <Ionicons name="star" size={getResponsiveSize(16)} color="#d97706" />
                          <Text className="text-stone-600 ml-1" style={{ fontSize: getResponsiveSize(14) }}>
                            {displayData.rating.toFixed(1)}
                          </Text>
                        </View>
                      </>
                    )}
                    <Text className="text-stone-600" style={{ fontSize: getResponsiveSize(14) }}>
                      {displayData.types.slice(0, 2).join(' • ')}
                    </Text>
                  </View>
                ) : (
                  <Text
                    className="text-stone-600 text-center"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    Sức chứa {locationDetail?.capacity || 0} người • {getAmenities().join(' • ')}
                  </Text>
                )}
              </View>

              {/* Rating Section - Only for internal locations */}
              {!isExternalLocation && (
                <View
                  className="flex-row items-center justify-between pb-6 border-b border-stone-200"
                  style={{ marginBottom: getResponsiveSize(24) }}
                >
                  <View className="items-center">
                    <Text
                      className="text-stone-900 font-bold"
                      style={{ fontSize: getResponsiveSize(28) }}
                    >
                      {averageRating > 0
                        ? averageRating.toFixed(2).replace(".", ",")
                        : "0"
                      }
                    </Text>
                    <View className="flex-row mt-1">
                      {renderStars(averageRating || 0)}
                    </View>
                  </View>

                  <View className="items-center">
                    <Ionicons name="location" size={getResponsiveSize(32)} color="#10b981" />
                    <Text
                      className="text-stone-700 font-medium mt-1"
                      style={{ fontSize: getResponsiveSize(12) }}
                    >
                      Địa điểm ưa thích
                    </Text>
                  </View>

                  <View className="items-center">
                    <Text
                      className="text-stone-900 font-bold"
                      style={{ fontSize: getResponsiveSize(28) }}
                    >
                      {reviewCount || "0"}
                    </Text>
                    <Text
                      className="text-stone-600"
                      style={{ fontSize: getResponsiveSize(12) }}
                    >
                      đánh giá
                    </Text>
                  </View>
                </View>
              )}

              {/* External Location Info Section */}
              {isExternalLocation && (
                <View
                  className="pb-6 border-b border-stone-200"
                  style={{ marginBottom: getResponsiveSize(24) }}
                >
                  <View className="flex-row items-center mb-4">
                    <Ionicons name="information-circle-outline" size={getResponsiveSize(24)} color="#57534e" />
                    <Text
                      className="text-stone-900 font-semibold ml-4"
                      style={{ fontSize: getResponsiveSize(18) }}
                    >
                      Thông tin địa điểm
                    </Text>
                  </View>

                  {displayData.rating > 0 && (
                    <View className="flex-row items-center mb-3">
                      <Ionicons name="star" size={getResponsiveSize(20)} color="#d97706" />
                      <Text
                        className="text-stone-700 ml-3"
                        style={{ fontSize: getResponsiveSize(16) }}
                      >
                        {displayData.rating.toFixed(1)} sao trên Google
                      </Text>
                    </View>
                  )}

                  <View className="flex-row items-center mb-3">
                    <Ionicons name="business-outline" size={getResponsiveSize(20)} color="#57534e" />
                    <Text
                      className="text-stone-700 ml-3"
                      style={{ fontSize: getResponsiveSize(16) }}
                    >
                      Loại: {displayData.types.slice(0, 3).join(', ')}
                    </Text>
                  </View>

                  <View className="flex-row items-center">
                    <Ionicons name="location" size={getResponsiveSize(20)} color="#57534e" />
                    <Text
                      className="text-stone-700 ml-3"
                      style={{ fontSize: getResponsiveSize(16) }}
                    >
                      Từ Google Places • Địa điểm công cộng
                    </Text>
                  </View>
                </View>
              )}

              {/* Owner Info - Only for internal locations */}
              {!isExternalLocation && (
                <View
                  className="flex-row items-center pb-6 border-b border-stone-200"
                  style={{ marginBottom: getResponsiveSize(24) }}
                >
                  {/* Owner Avatar */}
                  {locationDetail?.ownerAvatar ? (
                    <Image
                      source={{ uri: locationDetail.ownerAvatar }}
                      style={{
                        width: getResponsiveSize(56),
                        height: getResponsiveSize(56),
                        borderRadius: getResponsiveSize(28),
                        marginRight: getResponsiveSize(16)
                      }}
                    />
                  ) : (
                    <View
                      style={{
                        width: getResponsiveSize(56),
                        height: getResponsiveSize(56),
                        borderRadius: getResponsiveSize(28),
                        backgroundColor: '#f5f5f4',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: getResponsiveSize(16)
                      }}
                    >
                      <Ionicons name="business-outline" size={getResponsiveSize(28)} color="#10b981" />
                    </View>
                  )}

                  <View className="flex-1">
                    <Text
                      className="text-stone-900 font-semibold"
                      style={{ fontSize: getResponsiveSize(18) }}
                    >
                      {locationDetail?.locationOwner?.businessName ||
                        locationDetail?.ownerProfile?.fullName ||
                        'Professional Studio'}
                    </Text>
                    <Text
                      className="text-stone-600"
                      style={{ fontSize: getResponsiveSize(14) }}
                    >
                      {locationDetail?.availabilityStatus || 'Available'} • {locationDetail?.locationOwner?.verificationStatus || 'Verified'}
                    </Text>
                  </View>

                  {(locationDetail?.verificationStatus === 'Verified' ||
                    locationDetail?.locationOwner?.verificationStatus === 'Verified') && (
                      <View className="ml-2">
                        <Ionicons name="checkmark-circle" size={getResponsiveSize(20)} color="#10b981" />
                      </View>
                    )}
                </View>
              )}

              {/* Location Features Section */}
              <View
                className="pb-6 border-b border-stone-200"
                style={{ marginBottom: getResponsiveSize(24) }}
              >
                {/* Description - Only for internal locations */}
                {!isExternalLocation && locationDetail?.description && (
                  <View className="flex-row" style={{ marginBottom: getResponsiveSize(20) }}>
                    <Ionicons name="document-text-outline" size={getResponsiveSize(24)} color="#57534e" />
                    <View className="ml-4 flex-1">
                      <Text
                        className="text-stone-900 font-semibold"
                        style={{ fontSize: getResponsiveSize(16), marginBottom: getResponsiveSize(4) }}
                      >
                        Mô tả địa điểm
                      </Text>
                      <Text
                        className="text-stone-600 leading-6"
                        style={{ fontSize: getResponsiveSize(14) }}
                      >
                        {locationDetail.description}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Amenities/Types */}
                <View className="flex-row" style={{ marginBottom: getResponsiveSize(20) }}>
                  <Ionicons name="checkmark-circle-outline" size={getResponsiveSize(24)} color="#57534e" />
                  <View className="ml-4 flex-1">
                    <Text
                      className="text-stone-900 font-semibold"
                      style={{ fontSize: getResponsiveSize(16), marginBottom: getResponsiveSize(4) }}
                    >
                      {isExternalLocation ? 'Loại hình' : 'Tiện nghi'}
                    </Text>
                    <Text
                      className="text-stone-600 leading-6"
                      style={{ fontSize: getResponsiveSize(14) }}
                    >
                      {getAmenities().join(', ')}
                    </Text>
                  </View>
                </View>

                {/* Space Type - Only for internal locations */}
                {!isExternalLocation && (
                  <View className="flex-row" style={{ marginBottom: getResponsiveSize(20) }}>
                    <Ionicons name="business-outline" size={getResponsiveSize(24)} color="#57534e" />
                    <View className="ml-4 flex-1">
                      <Text
                        className="text-stone-900 font-semibold"
                        style={{ fontSize: getResponsiveSize(16), marginBottom: getResponsiveSize(4) }}
                      >
                        Loại không gian
                      </Text>
                      <Text
                        className="text-stone-600 leading-6"
                        style={{ fontSize: getResponsiveSize(14) }}
                      >
                        {locationDetail?.indoor && locationDetail?.outdoor
                          ? 'Cả trong nhà và ngoài trời'
                          : locationDetail?.indoor
                            ? 'Trong nhà'
                            : locationDetail?.outdoor
                              ? 'Ngoài trời'
                              : 'Studio chuyên nghiệp'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Capacity - Only for internal locations */}
                {!isExternalLocation && (
                  <View className="flex-row" style={{ marginBottom: getResponsiveSize(20) }}>
                    <Ionicons name="people-outline" size={getResponsiveSize(24)} color="#57534e" />
                    <View className="ml-4 flex-1">
                      <Text
                        className="text-stone-900 font-semibold"
                        style={{ fontSize: getResponsiveSize(16), marginBottom: getResponsiveSize(4) }}
                      >
                        Sức chứa
                      </Text>
                      <Text
                        className="text-stone-600 leading-6"
                        style={{ fontSize: getResponsiveSize(14) }}
                      >
                        Tối đa {locationDetail?.capacity || 0} người cùng lúc.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Photos Info */}
                <View className="flex-row">
                  <Ionicons name="images-outline" size={getResponsiveSize(24)} color="#57534e" />
                  <View className="ml-4 flex-1">
                    <Text
                      className="text-stone-900 font-semibold"
                      style={{ fontSize: getResponsiveSize(16), marginBottom: getResponsiveSize(4) }}
                    >
                      Ảnh địa điểm
                    </Text>
                    <Text
                      className="text-stone-600 leading-6"
                      style={{ fontSize: getResponsiveSize(14) }}
                    >
                      {isExternalLocation 
                        ? externalPhotos.urls.length > 0
                          ? `${externalPhotos.urls.length} ảnh từ Google Places.`
                          : 'Đang cập nhật ảnh mới nhất từ Google Places.'
                        : galleryImages && galleryImages.length > 0
                          ? `${galleryImages.length} ảnh được upload cho địa điểm này.`
                          : 'Đang cập nhật ảnh mới nhất từ Image API.'
                      }
                    </Text>
                  </View>
                </View>
              </View>

              {/* Location Map Section */}
              <View
                className="pb-6 border-b border-stone-200"
                style={{ marginBottom: getResponsiveSize(24) }}
              >
                <View className="flex-row items-center mb-6">
                  <Ionicons name="map-outline" size={getResponsiveSize(24)} color="#57534e" />
                  <Text
                    className="text-stone-900 font-semibold ml-4"
                    style={{ fontSize: getResponsiveSize(24) }}
                  >
                    Nơi bạn sẽ đến
                  </Text>
                </View>

                <View
                  className="bg-stone-100 rounded-2xl overflow-hidden"
                  style={{ height: getResponsiveSize(220) }}
                >
                  {addressValidation?.isValid && addressValidation.coordinates ? (
                    <TouchableOpacity
                      className="flex-1 relative"
                      onPress={() => {
                        Alert.alert(
                          'Mở bản đồ',
                          'Bạn muốn mở vị trí này trong ứng dụng bản đồ?',
                          [
                            { text: 'Hủy', style: 'cancel' },
                            {
                              text: 'Mở',
                              onPress: () => {
                                const { lat, lng } = addressValidation.coordinates!;
                                const address = isExternalLocation 
                                  ? externalLocationData?.address || 'Location'
                                  : locationDetail?.address || 'Location';
                                openMapsApp(lat, lng, address);
                              }
                            }
                          ]
                        );
                      }}
                    >
                      <Image
                        source={{
                          uri: getStaticMapUrl(
                            addressValidation.coordinates.lat,
                            addressValidation.coordinates.lng,
                            15
                          )
                        }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />

                      <View
                        className="absolute"
                        style={{
                          top: '45%',
                          left: '47%',
                          transform: [{ translateX: -16 }, { translateY: -16 }]
                        }}
                      >
                        <View
                          className="bg-emerald-500 rounded-full items-center justify-center shadow-lg"
                          style={{
                            width: getResponsiveSize(32),
                            height: getResponsiveSize(32),
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.3,
                            shadowRadius: 4,
                            elevation: 5,
                          }}
                        >
                          <Ionicons name="location" size={getResponsiveSize(20)} color="white" />
                        </View>
                      </View>

                      <View
                        className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-sm"
                        style={{
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 1 },
                          shadowOpacity: 0.1,
                          shadowRadius: 2,
                          elevation: 2,
                        }}
                      >
                        <View className="flex-row items-center">
                          <Ionicons name="map" size={getResponsiveSize(14)} color="#10b981" />
                          <Text
                            className="text-stone-800 font-semibold ml-1"
                            style={{ fontSize: getResponsiveSize(11) }}
                          >
                            Nhấn để mở Maps
                          </Text>
                        </View>
                      </View>

                      <View
                        className="absolute bottom-2 right-2 bg-black/70 rounded px-2 py-1"
                      >
                        <Text
                          className="text-white"
                          style={{ fontSize: getResponsiveSize(9) }}
                        >
                          © OpenStreetMap
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View className="flex-1 items-center justify-center">
                      <Ionicons
                        name={addressValidation === null ? "map-outline" : "location-outline"}
                        size={getResponsiveSize(40)}
                        color="#9ca3af"
                      />
                      <Text className="text-stone-500 mt-2 text-center">
                        {addressValidation === null
                          ? 'Đang kiểm tra địa chỉ...'
                          : 'Không thể xác thực địa chỉ'
                        }
                      </Text>
                      {addressValidation === null && (
                        <ActivityIndicator size="small" color="#10b981" style={{ marginTop: 8 }} />
                      )}

                      {(isExternalLocation ? externalLocationData?.address : locationDetail?.address) && (
                        <Text className="text-stone-400 mt-2 text-center text-xs">
                          {isExternalLocation ? externalLocationData?.address : locationDetail?.address}
                        </Text>
                      )}
                    </View>
                  )}
                </View>

                {/* Address Info */}
                <View className="mt-4 p-4 bg-stone-50 rounded-xl">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text
                        className="text-stone-900 font-medium"
                        style={{ fontSize: getResponsiveSize(14) }}
                      >
                        📍 {(isExternalLocation ? externalLocationData?.address : locationDetail?.address) || 'Chưa có địa chỉ cụ thể'}
                      </Text>
                      {addressValidation?.displayName && (
                        <Text
                          className="text-stone-600 mt-1"
                          style={{ fontSize: getResponsiveSize(12) }}
                        >
                          {addressValidation.displayName}
                        </Text>
                      )}
                      {addressValidation?.coordinates && (
                        <Text
                          className="text-stone-500 mt-1"
                          style={{ fontSize: getResponsiveSize(11) }}
                        >
                          🌐 {addressValidation.coordinates.lat.toFixed(6)}, {addressValidation.coordinates.lng.toFixed(6)}
                        </Text>
                      )}
                    </View>

                    <View className="ml-2">
                      {addressValidation === null ? (
                        <View className="flex-row items-center bg-blue-100 px-3 py-1 rounded-full">
                          <ActivityIndicator size="small" color="#3b82f6" />
                          <Text
                            className="text-blue-700 font-medium ml-2"
                            style={{ fontSize: getResponsiveSize(11) }}
                          >
                            Đang kiểm tra
                          </Text>
                        </View>
                      ) : addressValidation.isValid ? (
                        <View className="flex-row items-center bg-emerald-100 px-3 py-1 rounded-full">
                          <Ionicons name="checkmark-circle" size={getResponsiveSize(14)} color="#10b981" />
                          <Text
                            className="text-emerald-700 font-medium ml-1"
                            style={{ fontSize: getResponsiveSize(11) }}
                          >
                            Đã xác thực
                          </Text>
                        </View>
                      ) : (
                        <View className="flex-row items-center bg-amber-100 px-3 py-1 rounded-full">
                          <Ionicons name="warning" size={getResponsiveSize(14)} color="#f59e0b" />
                          <Text
                            className="text-amber-700 font-medium ml-1"
                            style={{ fontSize: getResponsiveSize(11) }}
                          >
                            Cần xác minh
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {addressValidation?.isValid && (
                    <View className="mt-3 pt-3 border-t border-stone-200">
                      <Text
                        className="text-stone-500"
                        style={{ fontSize: getResponsiveSize(11) }}
                      >
                        Powered by OpenStreetMap • Free & Accurate
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>

          {/* 🆕 Reviews Section - Only for internal locations */}
          {!isExternalLocation && (
            <LocationReviews 
              locationId={safeLocationId}
              currentRating={locationDetail?.rating}
              totalReviews={locationDetail?.ratingCount}
            />
          )}

          <View style={{ height: getResponsiveSize(32) }} />
        </Animated.ScrollView>

        {/* Action Buttons */}
        <SafeAreaView style={{ backgroundColor: 'white' }}>
          <View
            className="bg-white px-6 border-t border-stone-200"
            style={{ paddingVertical: getResponsiveSize(16) }}
          >
            <View className="flex-row space-x-3">
              {/* Book Location Button */}
              <TouchableOpacity
                className="flex-1 bg-emerald-500 rounded-2xl items-center"
                style={{ paddingVertical: getResponsiveSize(16) }}
                onPress={handleBookLocation}
              >
                <Text
                  className="text-white font-bold"
                  style={{ fontSize: getResponsiveSize(16) }}
                >
                  {isExternalLocation ? 'Đặt lịch tại đây' : 'Đặt lịch tại đây'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}
