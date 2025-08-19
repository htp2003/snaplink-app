import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { getResponsiveSize } from "../../utils/responsive";
import { useFavorites, FavoriteItem } from "../../hooks/useFavorites";
import { usePhotographerDetail } from "../../hooks/usePhotographerDetail";
import { useRecentlyViewed } from "../../hooks/useRecentlyViewed";
import PhotographerReviews from "../../components/Photographer/PhotographerReviews";
import { usePhotographerReviews } from "../../hooks/usePhotographerReviews";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ProfileCardDetailRouteProp = RouteProp<
  RootStackParamList,
  "PhotographerCardDetail"
>;

const { width, height } = Dimensions.get("window");

// 🆕 Default fallback images
const DEFAULT_PROFILE_IMAGE = "https://via.placeholder.com/150/cccccc/666666?text=No+Photo";
const DEFAULT_GALLERY_IMAGE = "https://via.placeholder.com/400x600/f5f5f5/999999?text=No+Images";

// 🆕 Image error handler component
const SafeImage = ({
  source,
  style,
  resizeMode = "cover",
  fallbackSource,
  onError,
  ...props
}: any) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    onError && onError();
  }, [onError]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Use fallback if error or no source
  const imageSource = hasError || !source?.uri
    ? (fallbackSource || { uri: DEFAULT_PROFILE_IMAGE })
    : source;

  return (
    <View style={style}>
      <Image
        source={imageSource}
        style={style}
        resizeMode={resizeMode}
        onError={handleError}
        onLoad={handleLoad}
        {...props}
      />
      {isLoading && !hasError && (
        <View style={[style, { position: 'absolute', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }]}>
          <ActivityIndicator size="small" color="#d97706" />
        </View>
      )}
    </View>
  );
};

export default function PhotographerCardDetail() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ProfileCardDetailRouteProp>();
  const { photographerId } = route.params;

  // State management
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasTrackedView, setHasTrackedView] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Hooks
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { trackView } = useRecentlyViewed();
  const {
    photographerDetail,
    loading,
    error,
    fetchPhotographerById,
    images: photographerImages,
    imageResponses,
    primaryImage,
    primaryImageUrl,
    loadingImages,
    imageError,
  } = usePhotographerDetail();

  const {
    reviews,
    averageRating,
    totalReviews,
    loading: reviewsLoading,
    error: reviewsError,
    refreshReviews
  } = usePhotographerReviews(photographerId);

  // 🆕 Enhanced image processing with error handling
  const processedImages = useMemo(() => {
    console.log('🖼️ Processing images:', {
      photographerImages,
      imageError,
      loadingImages
    });

    // If loading, return empty array
    if (loadingImages) {
      return [];
    }

    // If there's an error or no images, return default
    if (imageError || !photographerImages || photographerImages.length === 0) {
      console.log('🖼️ No images available, using default');
      return [DEFAULT_GALLERY_IMAGE];
    }

    // Filter out broken images and return valid ones
    const validImages = photographerImages.filter((img: string) =>
      img && typeof img === 'string' && !imageLoadErrors.has(img)
    );

    console.log('🖼️ Valid images:', validImages.length);

    return validImages.length > 0 ? validImages : [DEFAULT_GALLERY_IMAGE];
  }, [photographerImages, imageError, loadingImages, imageLoadErrors]);

  // 🆕 Handle image load errors
  const handleImageError = useCallback((imageUrl: string) => {
    console.log('❌ Image failed to load:', imageUrl);
    setImageLoadErrors(prev => new Set([...prev, imageUrl]));
  }, []);

  // 🆕 Safe profile image
  const profileImageSource = useMemo(() => {
    const profileUrl = photographerDetail?.profileImage;
    return profileUrl && !imageLoadErrors.has(profileUrl)
      ? { uri: profileUrl }
      : { uri: DEFAULT_PROFILE_IMAGE };
  }, [photographerDetail?.profileImage, imageLoadErrors]);

  // Fetch photographer details
  useEffect(() => {
    if (photographerId) {
      fetchPhotographerById(photographerId);
    }
  }, [photographerId, fetchPhotographerById]);

  // Track view data with safe fallbacks
  const trackViewData = useMemo(() => {
    if (!photographerDetail) return null;

    return {
      id: photographerDetail.photographerId.toString(),
      type: "photographer" as const,
      data: {
        id: photographerDetail.photographerId.toString(),
        fullName: photographerDetail.fullName || "Unknown Photographer",
        avatar: photographerDetail.profileImage || DEFAULT_PROFILE_IMAGE,
        cardImage: processedImages[0] || DEFAULT_GALLERY_IMAGE,
        images: processedImages,
        styles: Array.isArray(photographerDetail.styles)
          ? photographerDetail.styles
          : photographerDetail.styles && "$values" in photographerDetail.styles
            ? (photographerDetail.styles as any).$values
            : [photographerDetail.specialty || "Photography"],
        rating: photographerDetail.rating,
        hourlyRate: photographerDetail.hourlyRate,
        availabilityStatus: photographerDetail.availabilityStatus,
        specialty: photographerDetail.specialty,
      },
    };
  }, [photographerDetail, processedImages]);

  // Track recently viewed
  useEffect(() => {
    if (trackViewData && !hasTrackedView) {
      trackView(trackViewData);
      setHasTrackedView(true);
    }
  }, [trackViewData, hasTrackedView, trackView]);

  // 🆕 Enhanced error handling - only show alerts for critical errors
  useEffect(() => {
    if (error && !error.includes('404') && !error.includes('image')) {
      Alert.alert("Lỗi", `Không thể tải thông tin photographer: ${error}`, [
        {
          text: "Thử lại",
          onPress: () => fetchPhotographerById(photographerId),
        },
        { text: "Quay lại", onPress: () => navigation.goBack() },
      ]);
    }
  }, [error, photographerId, fetchPhotographerById, navigation]);

  // 🆕 Silent image error logging
  useEffect(() => {
    if (imageError) {
      console.warn('🖼️ Image loading issue (handled gracefully):', imageError);
    }
  }, [imageError]);

  // Favorite item setup
  const favoriteItem = useMemo((): FavoriteItem | null => {
    if (!photographerDetail) return null;

    return {
      id: photographerDetail.photographerId.toString(),
      type: "photographer",
      data: {
        id: photographerDetail.photographerId.toString(),
        fullName: photographerDetail.fullName || "Unknown",
        avatar: photographerDetail.profileImage || DEFAULT_PROFILE_IMAGE,
        images: processedImages,
        styles: Array.isArray(photographerDetail.styles)
          ? photographerDetail.styles
          : photographerDetail.styles && "$values" in photographerDetail.styles
            ? (photographerDetail.styles as any).$values
            : [],
        rating: photographerDetail.rating,
        hourlyRate: photographerDetail.hourlyRate,
        availabilityStatus: photographerDetail.availabilityStatus,
      },
    };
  }, [photographerDetail, processedImages]);

  const handleToggleFavorite = useCallback(() => {
    if (!favoriteItem) return;

    const photographerIdStr = favoriteItem.id;
    if (isFavorite(photographerIdStr)) {
      removeFavorite(photographerIdStr);
    } else {
      addFavorite(favoriteItem);
    }
  }, [favoriteItem, isFavorite, addFavorite, removeFavorite]);

  // Render stars
  const renderStars = useCallback((rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Ionicons
          key={i}
          name="star"
          size={getResponsiveSize(16)}
          color="#d97706"
        />
      );
    }
    if (hasHalfStar) {
      stars.push(
        <Ionicons
          key="half"
          name="star-half"
          size={getResponsiveSize(16)}
          color="#d97706"
        />
      );
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={getResponsiveSize(16)}
          color="#d1d5db"
        />
      );
    }
    return stars;
  }, []);

  // Handle image viewable changes
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentImageIndex(viewableItems[0].index);
    }
  }).current;

  // 🆕 Enhanced render image item with error handling
  const renderImageItem = useCallback(
    ({ item }: { item: string }) => (
      <View style={{ width }}>
        <SafeImage
          source={{ uri: item }}
          style={{
            width,
            height: height * 0.6 + 50,
            marginTop: -50,
          }}
          resizeMode="cover"
          fallbackSource={{ uri: DEFAULT_GALLERY_IMAGE }}
          onError={() => handleImageError(item)}
        />
      </View>
    ),
    [handleImageError]
  );

  // Status bar handling
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      if (value > getResponsiveSize(160)) {
        StatusBar.setBarStyle("dark-content");
      } else {
        StatusBar.setBarStyle("light-content");
      }
    });
    return () => scrollY.removeListener(listener);
  }, [scrollY]);

  // Navigation handlers
  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleBooking = useCallback(() => {
    if (!photographerDetail) return;

    navigation.navigate("Booking", {
      photographer: {
        ...photographerDetail,
        photographerId: Number(photographerDetail.photographerId),
        userId: String(photographerDetail.userId),
        fullName: photographerDetail.fullName || "Unknown Photographer",
        profileImage: photographerDetail.profileImage || DEFAULT_PROFILE_IMAGE,
        hourlyRate: photographerDetail.hourlyRate || 0,
        specialty: photographerDetail.specialty || "Photography",
        yearsExperience: photographerDetail.yearsExperience,
        equipment: photographerDetail.equipment,
        availabilityStatus: photographerDetail.availabilityStatus,
        rating: photographerDetail.rating,
        verificationStatus: photographerDetail.verificationStatus,
        bio: photographerDetail.bio,
        phoneNumber: photographerDetail.phoneNumber,
        email: photographerDetail.email,
        styles: photographerDetail.styles,
      },
    });
  }, [navigation, photographerDetail]);

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
          onPress={handleGoBack}
          className="mt-8 px-8 py-4 bg-amber-500 rounded-2xl"
        >
          <Text className="text-white font-bold text-lg">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPhotographerFavorite = photographerDetail
    ? isFavorite(photographerDetail.photographerId.toString())
    : false;
  const isUnavailable =
    photographerDetail?.availabilityStatus?.toLowerCase() === "unavailable";

  return (
    <View className="flex-1 bg-white">
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <View className="flex-1">
        {/* Fixed Header Controls */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            backgroundColor: "rgba(255,255,255,0)",
            opacity: scrollY.interpolate({
              inputRange: [0, getResponsiveSize(120), getResponsiveSize(180)],
              outputRange: [1, 0.5, 0],
              extrapolate: "clamp",
            }),
          }}
        >
          <SafeAreaView>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                height: getResponsiveSize(56),
                paddingHorizontal: getResponsiveSize(16),
              }}
            >
              <TouchableOpacity
                onPress={handleGoBack}
                style={{
                  width: getResponsiveSize(40),
                  height: getResponsiveSize(40),
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.3)",
                  borderRadius: getResponsiveSize(20),
                }}
              >
                <Ionicons
                  name="arrow-back"
                  size={getResponsiveSize(24)}
                  color="white"
                />
              </TouchableOpacity>
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  style={{
                    width: getResponsiveSize(40),
                    height: getResponsiveSize(40),
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    borderRadius: getResponsiveSize(20),
                    marginRight: getResponsiveSize(8),
                  }}
                >
                  <Ionicons
                    name="share-outline"
                    size={getResponsiveSize(22)}
                    color="white"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleToggleFavorite}
                  style={{
                    width: getResponsiveSize(40),
                    height: getResponsiveSize(40),
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(0,0,0,0.3)",
                    borderRadius: getResponsiveSize(20),
                  }}
                >
                  <Ionicons
                    name={isPhotographerFavorite ? "heart" : "heart-outline"}
                    size={getResponsiveSize(22)}
                    color={isPhotographerFavorite ? "#ef4444" : "white"}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </Animated.View>

        {/* Dynamic Header */}
        <Animated.View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 101,
            backgroundColor: "white",
            borderBottomWidth: 1,
            borderBottomColor: "#eee",
            opacity: scrollY.interpolate({
              inputRange: [getResponsiveSize(300), getResponsiveSize(340)],
              outputRange: [0, 1],
              extrapolate: "clamp",
            }),
          }}
        >
          <SafeAreaView>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                height: getResponsiveSize(56),
                paddingHorizontal: getResponsiveSize(16),
              }}
            >
              <TouchableOpacity
                onPress={handleGoBack}
                style={{
                  width: getResponsiveSize(40),
                  height: getResponsiveSize(40),
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="arrow-back"
                  size={getResponsiveSize(24)}
                  color="#222"
                />
              </TouchableOpacity>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  style={{
                    fontWeight: "bold",
                    fontSize: getResponsiveSize(16),
                    color: "#222",
                  }}
                  numberOfLines={1}
                >
                  {photographerDetail?.fullName || "Photographer Detail"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TouchableOpacity
                  style={{
                    width: getResponsiveSize(40),
                    height: getResponsiveSize(40),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name="share-outline"
                    size={getResponsiveSize(22)}
                    color="#222"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleToggleFavorite}
                  style={{
                    width: getResponsiveSize(40),
                    height: getResponsiveSize(40),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons
                    name={isPhotographerFavorite ? "heart" : "heart-outline"}
                    size={getResponsiveSize(22)}
                    color={isPhotographerFavorite ? "#ef4444" : "#222"}
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
          {/* 🆕 Enhanced Image Gallery with Error Handling */}
          <View
            style={{
              height: height * 0.6,
              overflow: "hidden",
              marginTop: -50,
              zIndex: 1,
              backgroundColor: "#f5f5f5",
            }}
          >
            {loadingImages ? (
              <View className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#d97706" />
                <Text className="text-stone-600 mt-2">
                  Đang tải ảnh...
                </Text>
              </View>
            ) : (
              <>
                <FlatList
                  ref={flatListRef}
                  data={processedImages}
                  renderItem={renderImageItem}
                  keyExtractor={(item, index) => `${item}-${index}`}
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
                    {currentImageIndex + 1} / {processedImages.length}
                  </Text>
                </View>
                {/* 🆕 Status indicator */}
                <View
                  className="absolute bg-amber-500 rounded-full"
                  style={{
                    bottom: getResponsiveSize(90),
                    left: getResponsiveSize(16),
                    paddingHorizontal: getResponsiveSize(8),
                    paddingVertical: getResponsiveSize(4),
                    zIndex: 50,
                  }}
                >
                  <Text
                    className="text-white font-medium text-xs"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    {photographerImages && photographerImages.length > 0 && processedImages[0] !== DEFAULT_GALLERY_IMAGE
                      ? primaryImage ? "Ảnh chính" : "Bộ sưu tập"
                      : "Ảnh mặc định"
                    }
                  </Text>
                </View>
              </>
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
            <View
              style={{
                paddingHorizontal: getResponsiveSize(24),
                paddingTop: getResponsiveSize(24),
              }}
            >
              {/* Header Info */}
              <View className="items-center mb-4">
                <View className="flex-row items-center mb-2">
                  <Ionicons
                    name="camera-outline"
                    size={getResponsiveSize(20)}
                    color="#666"
                  />
                  <Text
                    className="text-stone-900 font-bold ml-2"
                    style={{ fontSize: getResponsiveSize(24) }}
                  >
                    {photographerDetail?.fullName || "Photographer"}
                  </Text>
                </View>

                <Text
                  className="text-stone-600 text-center mb-2"
                  style={{ fontSize: getResponsiveSize(16) }}
                >
                  {photographerDetail?.specialty || "Chuyên gia nhiếp ảnh"}
                </Text>

                <Text
                  className="text-stone-600 text-center"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  {photographerDetail?.yearsExperience || 0} năm kinh nghiệm • {" "}
                  {photographerDetail?.equipment || "Thiết bị chuyên nghiệp"}
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
                    {averageRating > 0
                      ? averageRating.toFixed(1).replace(".", ",")
                      : "0"
                    }
                  </Text>
                  <View className="flex-row mt-1">
                    {renderStars(averageRating)}
                  </View>
                </View>

                <View className="items-center">
                  <Ionicons
                    name="medal-outline"
                    size={getResponsiveSize(32)}
                    color="#d97706"
                  />
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
                    {totalReviews}
                  </Text>
                  <Text
                    className="text-stone-600"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    đánh giá
                  </Text>
                </View>
              </View>

              {/* 🆕 Enhanced Photographer Info with Safe Image */}
              <View
                className="flex-row items-center pb-6 border-b border-stone-200"
                style={{ marginBottom: getResponsiveSize(24) }}
              >
                <SafeImage
                  source={profileImageSource}
                  style={{
                    width: getResponsiveSize(56),
                    height: getResponsiveSize(56),
                    borderRadius: getResponsiveSize(28),
                  }}
                  resizeMode="cover"
                  onError={() => handleImageError(photographerDetail?.profileImage || '')}
                />
                <View className="flex-1 ml-4">
                  <Text
                    className="text-stone-900 font-semibold"
                    style={{ fontSize: getResponsiveSize(18) }}
                  >
                    Photographer:{" "}
                    {photographerDetail?.fullName || "Professional"}
                  </Text>
                  <Text
                    className="text-stone-600"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    {photographerDetail?.yearsExperience || 0} năm kinh nghiệm • {" "}
                    {photographerDetail?.availabilityStatus || "Available"}
                  </Text>
                </View>

                {/* Verification Badge */}
                {photographerDetail?.verificationStatus === "verified" && (
                  <View className="ml-2">
                    <Ionicons
                      name="checkmark-circle"
                      size={getResponsiveSize(20)}
                      color="#10b981"
                    />
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
                  <View
                    className="flex-row"
                    style={{ marginBottom: getResponsiveSize(20) }}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={getResponsiveSize(24)}
                      color="#57534e"
                    />
                    <View className="ml-4 flex-1">
                      <Text
                        className="text-stone-900 font-semibold"
                        style={{
                          fontSize: getResponsiveSize(16),
                          marginBottom: getResponsiveSize(4),
                        }}
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
                  <View
                    className="flex-row"
                    style={{ marginBottom: getResponsiveSize(20) }}
                  >
                    <Ionicons
                      name="star-outline"
                      size={getResponsiveSize(24)}
                      color="#57534e"
                    />
                    <View className="ml-4 flex-1">
                      <Text
                        className="text-stone-900 font-semibold"
                        style={{
                          fontSize: getResponsiveSize(16),
                          marginBottom: getResponsiveSize(4),
                        }}
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
                  <View
                    className="flex-row"
                    style={{ marginBottom: getResponsiveSize(20) }}
                  >
                    <Ionicons
                      name="link-outline"
                      size={getResponsiveSize(24)}
                      color="#57534e"
                    />
                    <View className="ml-4 flex-1">
                      <Text
                        className="text-stone-900 font-semibold"
                        style={{
                          fontSize: getResponsiveSize(16),
                          marginBottom: getResponsiveSize(4),
                        }}
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

                {/* 🆕 Enhanced Images Info with Status */}
                <View className="flex-row">
                  <Ionicons
                    name="images-outline"
                    size={getResponsiveSize(24)}
                    color="#57534e"
                  />
                  <View className="ml-4 flex-1">
                    <Text
                      className="text-stone-900 font-semibold"
                      style={{
                        fontSize: getResponsiveSize(16),
                        marginBottom: getResponsiveSize(4),
                      }}
                    >
                      Bộ sưu tập ảnh
                    </Text>
                    <Text
                      className="text-stone-600 leading-6"
                      style={{ fontSize: getResponsiveSize(14) }}
                    >
                      {(() => {
                        if (loadingImages) {
                          return "Đang tải ảnh từ photographer...";
                        }

                        if (imageError && imageError.includes('404')) {
                          return "Photographer chưa upload ảnh nào. Ảnh hiển thị là ảnh mặc định.";
                        }

                        if (!photographerImages || photographerImages.length === 0) {
                          return "Chưa có ảnh được upload. Hiển thị ảnh mặc định.";
                        }

                        const validImageCount = photographerImages.filter((img: string) =>
                          img && !imageLoadErrors.has(img)
                        ).length;

                        if (validImageCount === 0) {
                          return "Một số ảnh không thể tải được. Hiển thị ảnh mặc định.";
                        }

                        return `${validImageCount} ảnh được upload bởi photographer.${primaryImage ? " Có ảnh chính được đánh dấu." : ""
                          }`;
                      })()}
                    </Text>

                    {/* 🆕 Image Status Indicator */}
                    {imageError && imageError.includes('404') && (
                      <View className="mt-2 px-3 py-1 bg-amber-100 rounded-full self-start">
                        <Text className="text-amber-700 text-xs font-medium">
                          Đang cập nhật ảnh mới
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Reviews Section */}
          <PhotographerReviews
            photographerId={
              photographerDetail?.photographerId || parseInt(photographerId)
            }
            currentRating={photographerDetail?.rating}
            totalReviews={photographerDetail?.ratingCount}
          />
          <View style={{ height: getResponsiveSize(32) }} />
        </Animated.ScrollView>

        {/* Booking Button */}
        <SafeAreaView style={{ backgroundColor: "white" }}>
          <View
            className="bg-white px-6 border-t border-stone-200"
            style={{ paddingVertical: getResponsiveSize(16) }}
          >
            <TouchableOpacity
              onPress={handleBooking}
              disabled={isUnavailable}
              className={`rounded-2xl items-center ${isUnavailable ? "bg-stone-300" : "bg-pink-500"
                }`}
              style={{ paddingVertical: getResponsiveSize(16) }}
            >
              <Text
                className="text-white font-bold"
                style={{ fontSize: getResponsiveSize(18) }}
              >
                {isUnavailable
                  ? "Không khả dụng"
                  : `Đặt lịch - ₫${(
                    photographerDetail?.hourlyRate || 0
                  ).toLocaleString("vi-VN")}/giờ`}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}