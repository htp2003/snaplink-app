import React, { useState, useEffect } from "react";
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
} from "react-native";
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

const { width: screenWidth } = Dimensions.get("window");

type EventDetailScreenRouteProp = RouteProp<
  RootStackParamList,
  "EventDetailScreen"
>;

interface EventDetailScreenProps {}

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
  const [selectedPhotographer, setSelectedPhotographer] = useState<any>(null);
  const [isLiked, setIsLiked] = useState(false);

  // Refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  // Format functions
  const formatPrice = (price: number | undefined): string => {
    if (price === undefined || isNaN(price)) return "Liên hệ";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
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
    return Math.round(
      ((event.originalPrice - event.discountedPrice) / event.originalPrice) *
        100
    );
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

  // Handle booking
const handleJoinEvent = async () => {

  console.log("🚀 Button clicked!"); // Debug
  console.log("User:", user);
  console.log("Selected photographer:", selectedPhotographer);
  console.log("Event:", event);
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

  if (!selectedPhotographer) {
    Alert.alert('Chọn photographer', 'Vui lòng chọn photographer để tiếp tục');
    return;
  }

  if (!event) return;

  // ✅ Navigate to BookingEvent screen (đã có trong navigator)
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
    preSelectedPhotographer: {
      eventPhotographerId: selectedPhotographer.eventPhotographerId,
      photographerId: selectedPhotographer.photographerId,
      photographerName: selectedPhotographer.photographer?.fullName || 'Event Photographer',
      profileImage: selectedPhotographer.photographer?.profileImage,
      specialRate: selectedPhotographer.specialRate,
    }
  });
};

  const openMap = () => {
    if (!event?.location?.address) return;

    const url = `https://maps.google.com/?q=${encodeURIComponent(
      event.location.address
    )}`;
    Linking.openURL(url);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center">
        <Text className="text-gray-600">Đang tải...</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View className="flex-1 bg-gray-50 justify-center items-center px-5">
        <Text className="text-red-500 text-lg font-bold text-center mb-2">
          Lỗi tải thông tin sự kiện
        </Text>
        <Text className="text-gray-600 text-center mb-5">
          {error || "Không tìm thấy sự kiện"}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-pink-500 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-bold">← Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const slotsRemaining = getSlotsRemaining();
  const discount = calculateDiscount();
  const timeUntil = getTimeUntilEvent();

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="absolute top-0 left-0 right-0 z-20 pt-12 px-5 pb-5">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 bg-black/20 rounded-full items-center justify-center backdrop-blur-md"
          >
            <AntDesign name="arrowleft" size={20} color="white" />
          </TouchableOpacity>

          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => setIsLiked(!isLiked)}
              className="w-10 h-10 bg-black/20 rounded-full items-center justify-center backdrop-blur-md"
            >
              <AntDesign
                name={isLiked ? "heart" : "hearto"}
                size={20}
                color={isLiked ? "#ff6b6b" : "white"}
              />
            </TouchableOpacity>
            <TouchableOpacity className="w-10 h-10 bg-black/20 rounded-full items-center justify-center backdrop-blur-md">
              <Feather name="more-horizontal" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <View className="relative h-72">
          <LinearGradient
            colors={["#667eea", "#764ba2"]}
            style={{ width: "100%", height: "100%" }}
            className="justify-center items-center"
          >
            <Text className="text-white text-5xl">📸</Text>
          </LinearGradient>

          {/* Event Badges */}
          <View className="absolute top-4 left-4 flex-row gap-2">
            {timeUntil.includes("giờ") && (
              <View className="bg-red-500/90 px-3 py-1.5 rounded-full">
                <Text className="text-white text-xs font-bold">🔥 HOT</Text>
              </View>
            )}
            {discount > 0 && (
              <View className="bg-green-500/90 px-3 py-1.5 rounded-full">
                <Text className="text-white text-xs font-bold">
                  💰 -{discount}%
                </Text>
              </View>
            )}
          </View>

          {/* Slots Indicator */}
          <View className="absolute bottom-4 left-4 bg-white/90 px-3 py-2 rounded-full flex-row items-center gap-1">
            <Text className="text-red-500">👥</Text>
            <Text className="text-gray-800 font-semibold text-xs">
              Còn {slotsRemaining} chỗ
            </Text>
          </View>
        </View>

        {/* Content */}
        <View className="px-6 pt-6">
          {/* Event Header */}
          <View className="mb-6">
            <Text className="text-amber-500 text-xs font-semibold uppercase tracking-wide mb-2">
              {formatDate(event.startDate)} • {formatTimeRange()}
            </Text>
            <Text className="text-gray-900 text-2xl font-bold mb-2 leading-tight">
              {event.name}
            </Text>
            <TouchableOpacity
              onPress={openMap}
              className="flex-row items-center gap-2 mb-4"
            >
              <Feather name="map-pin" size={16} color="#6b7280" />
              <Text className="text-gray-500 text-sm flex-1">
                {event.location?.name || "Địa điểm sẽ được thông báo"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Price Section */}
          <View className="bg-gray-50 rounded-2xl p-5 mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-3">
                <Text className="text-gray-900 text-2xl font-bold">
                  {formatPrice(event.discountedPrice || event.originalPrice)}
                </Text>
                {event.originalPrice &&
                  event.discountedPrice &&
                  event.originalPrice > event.discountedPrice && (
                    <Text className="text-gray-400 text-lg line-through">
                      {formatPrice(event.originalPrice)}
                    </Text>
                  )}
              </View>
              {discount > 0 && (
                <View className="bg-green-100 px-2 py-1 rounded-lg">
                  <Text className="text-green-600 text-xs font-semibold">
                    Tiết kiệm {discount}%
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-gray-500 text-sm">
              Giá đã bao gồm tài liệu và chứng chỉ
            </Text>
          </View>

          {/* Stats Grid */}
          <View className="flex-row gap-4 mb-6">
            <View className="flex-1 bg-gray-50 rounded-xl p-4 items-center">
              <View className="w-8 h-8 bg-gray-200 rounded-full mb-2 items-center justify-center">
                <Text>👥</Text>
              </View>
              <Text className="text-gray-900 text-lg font-bold">
                {event.totalBookingsCount}/{event.maxBookingsPerSlot}
              </Text>
              <Text className="text-gray-500 text-xs">Đã đăng ký</Text>
            </View>

            <View className="flex-1 bg-gray-50 rounded-xl p-4 items-center">
              <View className="w-8 h-8 bg-gray-200 rounded-full mb-2 items-center justify-center">
                <Text>📷</Text>
              </View>
              <Text className="text-gray-900 text-lg font-bold">
                {event.approvedPhotographersCount || photographers.length}
              </Text>
              <Text className="text-gray-500 text-xs">Thợ ảnh</Text>
            </View>

            <View className="flex-1 bg-gray-50 rounded-xl p-4 items-center">
              <View className="w-8 h-8 bg-gray-200 rounded-full mb-2 items-center justify-center">
                <Text>⭐</Text>
              </View>
              <Text className="text-gray-900 text-lg font-bold">4.9</Text>
              <Text className="text-gray-500 text-xs">Đánh giá</Text>
            </View>
          </View>

          {/* Urgency Bar */}
          {timeUntil.includes("giờ") && (
            <View className="bg-amber-100 border border-amber-200 rounded-xl p-3 mb-6 flex-row items-center gap-2">
              <Text>⚡</Text>
              <Text className="text-amber-800 text-sm font-semibold">
                {timeUntil}
              </Text>
            </View>
          )}

          {/* About Section */}
          <View className="mb-8">
            <Text className="text-gray-900 text-lg font-bold mb-3">
              Về sự kiện này
            </Text>
            <Text className="text-gray-700 leading-relaxed">
              {event.description ||
                "Tham gia workshop chụp ảnh cưới chuyên nghiệp với các nhiếp ảnh gia hàng đầu. Học cách bắt trọn những khoảnh khắc đẹp nhất trong ngày trọng đại. Bao gồm lý thuyết, thực hành và tips từ các chuyên gia."}
            </Text>
          </View>

          {/* Location Section */}
          {event.location && (
            <View className="mb-8">
              <Text className="text-gray-900 text-lg font-bold mb-3">
                Địa điểm
              </Text>
              <TouchableOpacity
                onPress={openMap}
                className="bg-gray-50 rounded-xl p-4 flex-row items-center gap-3"
              >
                <View className="w-15 h-15 bg-gray-200 rounded-lg" />
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold mb-1">
                    {event.location.name}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    {event.location.address}
                  </Text>
                </View>
                <Text className="text-blue-500 text-sm font-semibold">
                  Xem bản đồ
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Timeline */}
          <View className="mb-8">
            <Text className="text-gray-900 text-lg font-bold mb-3">
              Lịch trình
            </Text>
            <View className="relative pl-6">
              <View className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-200" />

              <View className="relative mb-5">
                <View className="absolute -left-8 top-1 w-4 h-4 bg-green-500 rounded-full border-3 border-white shadow-sm" />
                <Text className="text-green-500 text-xs font-semibold mb-1">
                  {formatTime(event.startDate)} -{" "}
                  {new Date(
                    new Date(event.startDate).getTime() + 15 * 60000
                  ).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
                <Text className="text-gray-700 text-sm">
                  Check-in và giới thiệu
                </Text>
              </View>

              <View className="relative mb-5">
                <View className="absolute -left-8 top-1 w-4 h-4 bg-green-500 rounded-full border-3 border-white shadow-sm" />
                <Text className="text-green-500 text-xs font-semibold mb-1">
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
                <Text className="text-gray-700 text-sm">
                  Nội dung chính của workshop
                </Text>
              </View>

              <View className="relative">
                <View className="absolute -left-8 top-1 w-4 h-4 bg-green-500 rounded-full border-3 border-white shadow-sm" />
                <Text className="text-green-500 text-xs font-semibold mb-1">
                  {new Date(
                    new Date(event.endDate).getTime() - 15 * 60000
                  ).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  - {formatTime(event.endDate)}
                </Text>
                <Text className="text-gray-700 text-sm">Thực hành và Q&A</Text>
              </View>
            </View>
          </View>

          {/* Photographers */}
          {photographers.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-gray-900 text-lg font-bold">
                  Thợ ảnh tham gia ({photographers.length})
                </Text>
                <TouchableOpacity>
                  <Text className="text-blue-500 text-sm font-semibold">
                    Xem tất cả
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row flex-wrap gap-3">
                {photographers.slice(0, 4).map((photographer) => (
                  <TouchableOpacity
                    key={photographer.eventPhotographerId}
                    onPress={() => setSelectedPhotographer(photographer)}
                    className={`bg-white border rounded-xl p-3 items-center flex-1 min-w-[45%] ${
                      selectedPhotographer?.eventPhotographerId ===
                      photographer.eventPhotographerId
                        ? "border-pink-500 bg-pink-50"
                        : "border-gray-200"
                    }`}
                  >
                    <View className="w-12 h-12 bg-gray-200 rounded-full mb-2" />
                    <Text className="text-gray-900 font-semibold text-sm text-center mb-1">
                      {photographer.photographer?.fullName}
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Text className="text-amber-500 text-xs">⭐</Text>
                      <Text className="text-gray-600 text-xs">
                        {photographer.photographer?.rating}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {!selectedPhotographer && (
                <Text className="text-amber-600 text-sm mt-2">
                  💡 Chọn một photographer để tiếp tục đăng ký
                </Text>
              )}
            </View>
          )}

          {/* Reviews Preview */}
          <View className="mb-32">
            <Text className="text-gray-900 text-lg font-bold mb-3">
              Đánh giá (156)
            </Text>
            <View className="bg-gray-50 rounded-xl p-4">
              <View className="mb-4 pb-4 border-b border-gray-200">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-gray-900 font-semibold text-sm">
                    Nguyễn Thị Lan
                  </Text>
                  <View className="flex-row">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Text key={star} className="text-amber-500 text-xs">
                        ⭐
                      </Text>
                    ))}
                  </View>
                </View>
                <Text className="text-gray-700 text-sm leading-relaxed">
                  Workshop rất bổ ích, học được nhiều tip hay từ các thợ ảnh
                  chuyên nghiệp!
                </Text>
              </View>

              <View>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-gray-900 font-semibold text-sm">
                    Trần Văn Nam
                  </Text>
                  <View className="flex-row">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Text key={star} className="text-amber-500 text-xs">
                        ⭐
                      </Text>
                    ))}
                  </View>
                </View>
                <Text className="text-gray-700 text-sm leading-relaxed">
                  Chất lượng tuyệt vời, đáng đồng tiền bát gạo. Sẽ tham gia thêm
                  các workshop khác.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* CTA Section */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-5">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-gray-900 text-xl font-bold">
            {formatPrice(event.discountedPrice || event.originalPrice)}
          </Text>
          <Text className="text-red-500 text-sm font-semibold">
            Chỉ còn {slotsRemaining} chỗ!
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleJoinEvent}
          disabled={
            bookingLoading || slotsRemaining === 0 || !selectedPhotographer
          }
          style={{
            backgroundColor:
              bookingLoading || slotsRemaining === 0 || !selectedPhotographer
                ? "#d1d5db"
                : "#f59e0b",
            borderRadius: 12,
            paddingVertical: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Text
            style={{
              color: "white",
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            {bookingLoading
              ? "Đang đăng ký..."
              : slotsRemaining === 0
              ? "Hết chỗ"
              : "Tham gia ngay"}
          </Text>
          {!bookingLoading && slotsRemaining > 0 && (
            <Text style={{ color: "white", fontSize: 16 }}>🚀</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default EventDetailScreen;
