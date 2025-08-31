import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
  Linking,
  StatusBar,
  ActivityIndicator,
  FlatList,
  Animated,
  Platform
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import {
  AntDesign,
  Feather,
  MaterialIcons,
  Ionicons,
} from "@expo/vector-icons";
import type {
  RootStackNavigationProp,
  RootStackParamList,
} from "../../navigation/types";
import {
  useEventDetail,
  useApprovedPhotographers,
  useEventBooking,
} from "../../hooks/usePhotographerEvent";
import { useAuth } from "../../hooks/useAuth";
import { getResponsiveSize } from '../../utils/responsive';
import { useRecentlyViewed } from '../../hooks/useRecentlyViewed';

const { width, height } = Dimensions.get("window");

type EventDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  "EventDetailScreen"
>;

interface EventDetailScreenProps { }

const EventDetailScreen: React.FC<EventDetailScreenProps> = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<EventDetailScreenRouteProp>();
  const { eventId } = route.params;

  const { user } = useAuth();
  const { event, loading, error, refetch } = useEventDetail(parseInt(eventId));
  const { photographers, loading: photographersLoading } =
    useApprovedPhotographers(event ? event.eventId : null);

  const { bookEvent, loading: bookingLoading } = useEventBooking();

  const [refreshing, setRefreshing] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Get images from API - handle empty array
  const eventImages = event?.images || [];
  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };



  // Format functions
  const formatPrice = (price: number | undefined | null): string => {
    if (price === undefined || price === null || isNaN(price)) {
      return "Liên hệ";
    }

    if (price === 0) {
      return "Miễn phí";
    }

    try {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(price);
    } catch (error) {
      return `${price.toLocaleString('vi-VN')}₫`;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return "HÔM NAY";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "NGÀY MAI";
    } else {
      return date
        .toLocaleDateString("vi-VN", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })
        .toUpperCase();
    }
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTimeRange = (): string => {
    if (!event) return "";
    return `${formatTime(event.startDate)} - ${formatTime(event.endDate)}`;
  };

  const calculateDiscount = (): number => {
    if (!event?.originalPrice || !event?.discountedPrice) return 0;

    const original = event.originalPrice;
    const discounted = event.discountedPrice;

    if (typeof original !== 'number' || typeof discounted !== 'number') return 0;
    if (original <= 0 || discounted < 0) return 0;
    if (discounted >= original) return 0;

    return Math.round(((original - discounted) / original) * 100);
  };

  const getTimeUntilEvent = (): string => {
    if (!event) return "";
    const now = new Date();
    const eventDate = new Date(event.startDate);
    const diffInHours = Math.round(
      (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 0) return "Đã bắt đầu";
    if (diffInHours < 24) return `Bắt đầu trong ${diffInHours} giờ nữa!`;

    const diffInDays = Math.round(diffInHours / 24);
    return `Bắt đầu trong ${diffInDays} ngày nữa`;
  };

  const getSlotsRemaining = (): number => {
    if (!event) return 0;
    return Math.max(
      0,
      (event.maxBookingsPerSlot || 0) - (event.totalBookingsCount || 0)
    );
  };

  const getCurrentPrice = (): number | null => {
    if (!event) return null;

    const discounted = event.discountedPrice;
    const original = event.originalPrice;

    if (typeof discounted === 'number' && !isNaN(discounted)) {
      return discounted;
    }

    if (typeof original === 'number' && !isNaN(original)) {
      return original;
    }

    return null;
  };

  const getOriginalPrice = (): number | null => {
    if (!event) return null;

    const original = event.originalPrice;
    if (typeof original === 'number' && !isNaN(original)) {
      return original;
    }

    return null;
  };

  const hasDiscount = (): boolean => {
    const current = getCurrentPrice();
    const original = getOriginalPrice();

    return (
      typeof current === 'number' &&
      typeof original === 'number' &&
      original > current &&
      original > 0
    );
  };


  // Handle booking
  const handleJoinEvent = async () => {
    if (!user) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập để tham gia sự kiện',
        [
          { text: 'Đăng nhập', onPress: () => navigation.navigate('Login') },
          { text: 'Hủy', style: 'cancel' }
        ]
      );
      return;
    }

    if (!event) return;

    console.log("🚀 Navigating to BookingEvent with data:", {
      event: {
        eventId: event.eventId,
        name: event.name,
        startDate: event.startDate, // ← Kiểm tra giá trị này
        endDate: event.endDate,     // ← Kiểm tra giá trị này
        locationName: event.location?.name,
        discountedPrice: event.discountedPrice,
        originalPrice: event.originalPrice,
        description: event.description,
      },
    });

    navigation.navigate('BookingEvent', {
      event: {
        eventId: event.eventId,
        name: event.name,
        startDate: event.startDate,
        endDate: event.endDate,
        locationName: event.location?.name,
        discountedPrice: event.discountedPrice,
        originalPrice: event.originalPrice,
        description: event.description,
      },
    });
  };

  const openMap = () => {
    if (!event?.location?.address) return;

    const url = `https://maps.google.com/?q=${encodeURIComponent(
      event.location.address
    )}`;
    Linking.openURL(url);
  };

  // Image gallery handlers
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentImageIndex(viewableItems[0].index);
    }
  }).current;

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
      />
    </View>
  );

  // Status bar effect
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

  if (loading) {
    return (
      <View className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text className="text-stone-600 mt-4 text-lg">Đang tải...</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View className="flex-1 bg-white justify-center items-center px-6">
        <Ionicons name="calendar-outline" size={80} color="#9ca3af" />
        <Text className="text-stone-900 text-2xl font-bold mt-6 text-center">
          Không tìm thấy sự kiện
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

  const slotsRemaining = getSlotsRemaining();
  const discount = calculateDiscount();
  const timeUntil = getTimeUntilEvent();
  const currentPrice = getCurrentPrice();
  const originalPrice = getOriginalPrice();
  const showDiscount = hasDiscount();

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
                  {event?.name || 'Event Detail'}
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
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Event Images Gallery */}
          <View style={{
            height: height * 0.6,
            overflow: 'hidden',
            marginTop: -50,
            zIndex: 1,
            backgroundColor: '#eee',
          }}>
            {eventImages.length > 0 ? (
              <>
                <FlatList
                  ref={flatListRef}
                  data={eventImages.map(img => img.url).filter(Boolean)}
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
                    {currentImageIndex + 1} / {eventImages.length}
                  </Text>
                </View>
              </>
            ) : (
              <View className="flex-1 justify-center items-center">
                <Ionicons name="images-outline" size={getResponsiveSize(60)} color="#9ca3af" />
                <Text className="text-stone-600 mt-4 text-center">
                  Chưa có ảnh sự kiện
                </Text>
                <Text className="text-stone-400 mt-2 text-center text-sm">
                  Ảnh sẽ được cập nhật sớm
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

              {/* Event Header */}
              <View className="items-center mb-6">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="calendar-outline" size={getResponsiveSize(20)} color="#666" />
                  <Text
                    className="text-stone-900 font-bold ml-2"
                    style={{ fontSize: getResponsiveSize(24) }}
                  >
                    {event?.name || 'Workshop Event'}
                  </Text>
                </View>

                <Text
                  className="text-amber-500 font-semibold text-center mb-2"
                  style={{ fontSize: getResponsiveSize(16) }}
                >
                  {formatDate(event.startDate)} • {formatTimeRange()}
                </Text>

                <TouchableOpacity
                  onPress={openMap}
                  className="flex-row items-center"
                >
                  <Ionicons name="location-outline" size={getResponsiveSize(16)} color="#666" />
                  <Text
                    className="text-stone-600 text-center ml-1"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    {event.location?.name || "Địa điểm sẽ được thông báo"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Price & Discount Section */}
              <View
                className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 mb-6"
                style={{
                  borderWidth: 1,
                  borderColor: '#fef3c7',
                }}
              >
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-3">
                    <Text
                      className="text-stone-900 font-bold"
                      style={{ fontSize: getResponsiveSize(28) }}
                    >
                      {formatPrice(currentPrice)}
                    </Text>
                    {showDiscount && (
                      <Text
                        className="text-stone-400 line-through"
                        style={{ fontSize: getResponsiveSize(18) }}
                      >
                        {formatPrice(originalPrice)}
                      </Text>
                    )}
                  </View>
                  {showDiscount && (
                    <View className="bg-emerald-100 px-3 py-2 rounded-full">
                      <Text className="text-emerald-600 text-sm font-semibold">
                        Tiết kiệm {discount}%
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-stone-600" style={{ fontSize: getResponsiveSize(14) }}>
                  {currentPrice === 0 ? "Sự kiện miễn phí cho tất cả thành viên" : "Giá đã bao gồm tài liệu và chứng chỉ"}
                </Text>
              </View>

              {/* Stats Grid */}
              <View
                className="flex-row gap-4 pb-6 border-b border-stone-200"
                style={{ marginBottom: getResponsiveSize(24) }}
              >
                <View className="flex-1 bg-stone-50 rounded-xl p-4 items-center">
                  <View
                    className="bg-amber-100 rounded-full items-center justify-center mb-2"
                    style={{
                      width: getResponsiveSize(40),
                      height: getResponsiveSize(40),
                    }}
                  >
                    <Ionicons name="people" size={getResponsiveSize(20)} color="#f59e0b" />
                  </View>
                  <Text
                    className="text-stone-900 font-bold"
                    style={{ fontSize: getResponsiveSize(18) }}
                  >
                    {event.totalBookingsCount}/{event.maxBookingsPerSlot}
                  </Text>
                  <Text
                    className="text-stone-600"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    Đã đăng ký
                  </Text>
                </View>

                <View className="flex-1 bg-stone-50 rounded-xl p-4 items-center">
                  <View
                    className="bg-blue-100 rounded-full items-center justify-center mb-2"
                    style={{
                      width: getResponsiveSize(40),
                      height: getResponsiveSize(40),
                    }}
                  >
                    <Ionicons name="camera" size={getResponsiveSize(20)} color="#3b82f6" />
                  </View>
                  <Text
                    className="text-stone-900 font-bold"
                    style={{ fontSize: getResponsiveSize(18) }}
                  >
                    {event.approvedPhotographersCount || photographers.length}
                  </Text>
                  <Text
                    className="text-stone-600"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    Thợ ảnh
                  </Text>
                </View>

                <View className="flex-1 bg-stone-50 rounded-xl p-4 items-center">
                  <View
                    className="bg-red-100 rounded-full items-center justify-center mb-2"
                    style={{
                      width: getResponsiveSize(40),
                      height: getResponsiveSize(40),
                    }}
                  >
                    <Ionicons name="time" size={getResponsiveSize(20)} color="#ef4444" />
                  </View>
                  <Text
                    className="text-stone-900 font-bold"
                    style={{ fontSize: getResponsiveSize(18) }}
                  >
                    {slotsRemaining}
                  </Text>
                  <Text
                    className="text-stone-600"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    Chỗ còn lại
                  </Text>
                </View>
              </View>

              {/* Urgency Banner */}
              {timeUntil.includes("giờ") && (
                <View
                  className="bg-amber-100 border border-amber-200 rounded-xl p-4 mb-6 flex-row items-center"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <View
                    className="bg-amber-500 rounded-full items-center justify-center mr-3"
                    style={{
                      width: getResponsiveSize(32),
                      height: getResponsiveSize(32),
                    }}
                  >
                    <Ionicons name="flash" size={getResponsiveSize(18)} color="white" />
                  </View>
                  <Text className="text-amber-800 font-semibold flex-1" style={{ fontSize: getResponsiveSize(14) }}>
                    ⚡ {timeUntil}
                  </Text>
                </View>
              )}

              {/* About Section */}
              <View
                className="pb-6 border-b border-stone-200"
                style={{ marginBottom: getResponsiveSize(24) }}
              >
                <View className="flex-row items-center mb-4">
                  <Ionicons name="document-text-outline" size={getResponsiveSize(24)} color="#57534e" />
                  <Text
                    className="text-stone-900 font-semibold ml-4"
                    style={{ fontSize: getResponsiveSize(20) }}
                  >
                    Về sự kiện này
                  </Text>
                </View>
                <Text
                  className="text-stone-700 leading-6"
                  style={{ fontSize: getResponsiveSize(15) }}
                >
                  {event.description ||
                    "Tham gia workshop chụp ảnh cưới chuyên nghiệp với các nhiếp ảnh gia hàng đầu. Học cách bắt trọn những khoảnh khắc đẹp nhất trong ngày trọng đại. Bao gồm lý thuyết, thực hành và tips từ các chuyên gia."}
                </Text>
              </View>

              {/* Location Section */}
              {event.location && (
                <View
                  className="pb-6 border-b border-stone-200"
                  style={{ marginBottom: getResponsiveSize(24) }}
                >
                  <View className="flex-row items-center mb-4">
                    <Ionicons name="location-outline" size={getResponsiveSize(24)} color="#57534e" />
                    <Text
                      className="text-stone-900 font-semibold ml-4"
                      style={{ fontSize: getResponsiveSize(20) }}
                    >
                      Địa điểm
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={openMap}
                    className="bg-stone-50 rounded-xl p-4"
                  >
                    <View className="flex-row items-center">
                      <View
                        className="bg-emerald-100 rounded-lg items-center justify-center mr-4"
                        style={{
                          width: getResponsiveSize(48),
                          height: getResponsiveSize(48),
                        }}
                      >
                        <Ionicons name="business" size={getResponsiveSize(24)} color="#10b981" />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-stone-900 font-semibold mb-1"
                          style={{ fontSize: getResponsiveSize(16) }}
                        >
                          {event.location.name}
                        </Text>
                        <Text
                          className="text-stone-600"
                          style={{ fontSize: getResponsiveSize(14) }}
                        >
                          {event.location.address}
                        </Text>
                      </View>
                      <View className="bg-blue-100 px-3 py-2 rounded-lg">
                        <Text className="text-blue-600 text-sm font-semibold">
                          Xem bản đồ
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              {/* Timeline */}
              <View
                className="pb-6 border-b border-stone-200"
                style={{ marginBottom: getResponsiveSize(24) }}
              >
                <View className="flex-row items-center mb-4">
                  <Ionicons name="time-outline" size={getResponsiveSize(24)} color="#57534e" />
                  <Text
                    className="text-stone-900 font-semibold ml-4"
                    style={{ fontSize: getResponsiveSize(20) }}
                  >
                    Lịch trình
                  </Text>
                </View>
                <View className="relative pl-6">
                  <View className="absolute left-2 top-0 bottom-0 w-0.5 bg-stone-200" />

                  <View className="relative mb-5">
                    <View className="absolute -left-8 top-1 w-4 h-4 bg-emerald-500 rounded-full border-3 border-white shadow-sm" />
                    <Text className="text-emerald-500 text-sm font-semibold mb-1">
                      {formatTime(event.startDate)} -{" "}
                      {new Date(
                        new Date(event.startDate).getTime() + 15 * 60000
                      ).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    <Text
                      className="text-stone-700"
                      style={{ fontSize: getResponsiveSize(14) }}
                    >
                      Check-in và giới thiệu
                    </Text>
                  </View>

                  <View className="relative mb-5">
                    <View className="absolute -left-8 top-1 w-4 h-4 bg-emerald-500 rounded-full border-3 border-white shadow-sm" />
                    <Text className="text-emerald-500 text-sm font-semibold mb-1">
                      {new Date(
                        new Date(event.startDate).getTime() + 15 * 60000
                      ).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      -{" "}
                      {new Date(
                        new Date(event.endDate).getTime() - 15 * 60000
                      ).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                    <Text
                      className="text-stone-700"
                      style={{ fontSize: getResponsiveSize(14) }}
                    >
                      Nội dung chính của workshop
                    </Text>
                  </View>

                  <View className="relative">
                    <View className="absolute -left-8 top-1 w-4 h-4 bg-emerald-500 rounded-full border-3 border-white shadow-sm" />
                    <Text className="text-emerald-500 text-sm font-semibold mb-1">
                      {new Date(
                        new Date(event.endDate).getTime() - 15 * 60000
                      ).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      - {formatTime(event.endDate)}
                    </Text>
                    <Text
                      className="text-stone-700"
                      style={{ fontSize: getResponsiveSize(14) }}
                    >
                      Thực hành và Q&A
                    </Text>
                  </View>
                </View>
              </View>

              {/* Photographers Status */}
              <View
                className="pb-6 border-b border-stone-200"
                style={{ marginBottom: getResponsiveSize(24) }}
              >
                <View className="flex-row items-center mb-4">
                  <Ionicons name="camera-outline" size={getResponsiveSize(24)} color="#57534e" />
                  <Text
                    className="text-stone-900 font-semibold ml-4"
                    style={{ fontSize: getResponsiveSize(20) }}
                  >
                    Thợ ảnh tham gia
                  </Text>
                </View>

                {photographersLoading ? (
                  <View className="bg-stone-50 rounded-xl p-6 items-center">
                    <ActivityIndicator size="small" color="#f59e0b" />
                    <Text className="text-stone-600 mt-2">Đang kiểm tra thợ ảnh...</Text>
                  </View>
                ) : photographers.length > 0 ? (
                  <View className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <View className="flex-row items-center mb-2">
                      <View
                        className="bg-emerald-100 rounded-full items-center justify-center mr-3"
                        style={{
                          width: getResponsiveSize(32),
                          height: getResponsiveSize(32),
                        }}
                      >
                        <Ionicons name="checkmark" size={getResponsiveSize(18)} color="#10b981" />
                      </View>
                      <Text className="text-emerald-800 font-semibold flex-1">
                        Có {photographers.length} thợ ảnh sẵn sàng
                      </Text>
                    </View>
                    <Text className="text-emerald-700 text-sm">
                      Bạn sẽ chọn thợ ảnh trong bước tiếp theo
                    </Text>
                  </View>
                ) : (
                  <View className="bg-red-50 rounded-xl p-4 border border-red-200">
                    <View className="flex-row items-center mb-2">
                      <View
                        className="bg-red-100 rounded-full items-center justify-center mr-3"
                        style={{
                          width: getResponsiveSize(32),
                          height: getResponsiveSize(32),
                        }}
                      >
                        <Ionicons name="close" size={getResponsiveSize(18)} color="#ef4444" />
                      </View>
                      <Text className="text-red-800 font-semibold flex-1">
                        Chưa có thợ ảnh tham gia
                      </Text>
                    </View>
                    <Text className="text-red-700 text-sm">
                      Sự kiện này chưa có thợ ảnh. Vui lòng quay lại sau.
                    </Text>
                  </View>
                )}
              </View>

            </View>
          </View>

          <View style={{ height: getResponsiveSize(120) }} />
        </Animated.ScrollView>

        {/* Bottom CTA Section */}
        <SafeAreaView style={{ backgroundColor: 'white' }}>
          <View
            className="bg-white px-6 border-t border-stone-200"
            style={{ paddingVertical: getResponsiveSize(16) }}
          >
            <View className="flex-row items-center justify-between mb-4">
              <View>
                <Text
                  className="text-stone-900 font-bold"
                  style={{ fontSize: getResponsiveSize(20) }}
                >
                  {formatPrice(currentPrice)}
                </Text>
                {showDiscount && (
                  <Text
                    className="text-stone-400 line-through"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    {formatPrice(originalPrice)}
                  </Text>
                )}
              </View>
              <View className="items-end">
                <Text
                  className="text-red-500 font-semibold"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  Chỉ còn {slotsRemaining} chỗ!
                </Text>
                {timeUntil.includes("giờ") && (
                  <Text
                    className="text-amber-600"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    {timeUntil}
                  </Text>
                )}
              </View>
            </View>

            <TouchableOpacity
              onPress={handleJoinEvent}
              disabled={
                loading ||
                slotsRemaining === 0 ||
                photographers.length === 0 ||  
                photographersLoading  
              }
              className={`rounded-2xl items-center justify-center ${loading ||
                  slotsRemaining === 0 ||
                  photographers.length === 0 ||
                  photographersLoading
                  ? "bg-stone-300"
                  : "bg-amber-500"
                }`}
              style={{
                paddingVertical: getResponsiveSize(16),
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View className="flex-row items-center">
                {loading ? (
                  <ActivityIndicator size="small" color="white" style={{ marginRight: 8 }} />
                ) : (
                  <Ionicons
                    name="calendar"
                    size={getResponsiveSize(20)}
                    color="white"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text
                  className="text-white font-bold"
                  style={{ fontSize: getResponsiveSize(16) }}
                >
                  {loading
                    ? "Đang tải..."
                    : slotsRemaining === 0
                      ? "Hết chỗ"
                      : photographers.length === 0
                        ? "Chưa có thợ ảnh"
                        : photographersLoading
                          ? "Đang kiểm tra..."
                          : "Tham gia ngay"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
};

export default EventDetailScreen;