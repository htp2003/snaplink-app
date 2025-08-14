import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ImageBackground, Animated } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { getResponsiveSize } from "../../utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LocationEvent } from "../../types/event";
import { LinearGradient } from 'expo-linear-gradient';

type HotEventBannerProps = {
  event: LocationEvent | null;
  loading?: boolean;
  onPress?: () => void;
};

const HotEventBanner: React.FC<HotEventBannerProps> = ({
  event,
  loading = false,
  onPress,
}) => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [pulseAnim] = useState(new Animated.Value(1));

  // Pulse animation for hot indicator
  useEffect(() => {
    const pulse = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]);

    const loop = Animated.loop(pulse);
    loop.start();

    return () => loop.stop();
  }, [pulseAnim]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (event) {
        // Navigate to event detail screen
      navigation.navigate("EventDetailScreen", { eventId: event.eventId.toString() });
    }
  };

  if (loading) {
    return (
      <View 
        className="mx-6 mb-4 rounded-2xl overflow-hidden"
        style={{ height: getResponsiveSize(180) }}
      >
        <View className="flex-1 bg-stone-200 animate-pulse">
          <View className="absolute inset-0 bg-gradient-to-r from-stone-300 to-stone-200" />
          <View 
            className="absolute bottom-4 left-4 bg-stone-300 rounded"
            style={{ width: 100, height: 20 }}
          />
          <View 
            className="absolute bottom-4 right-4 bg-stone-300 rounded-full"
            style={{ width: 80, height: 32 }}
          />
        </View>
      </View>
    );
  }

  if (!event) {
    return null;
  }

  // Calculate urgency metrics
  const slotsLeft = event.maxBookingsPerSlot - event.totalBookingsCount;
  const bookingRate = event.totalBookingsCount / event.maxBookingsPerSlot;
  const now = new Date();
  const eventDate = new Date(event.startDate);
  const hoursUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const daysUntilEvent = Math.ceil(hoursUntilEvent / 24);

  // Format price
  const formatPrice = () => {
    if (event.discountedPrice && event.originalPrice) {
      const discountPercent = Math.round(((event.originalPrice - event.discountedPrice) / event.originalPrice) * 100);
      return {
        current: `₫${event.discountedPrice.toLocaleString()}`,
        original: `₫${event.originalPrice.toLocaleString()}`,
        discount: discountPercent
      };
    } else if (event.originalPrice) {
      return {
        current: `₫${event.originalPrice.toLocaleString()}`,
        original: null,
        discount: 0
      };
    }
    return {
      current: "Liên hệ",
      original: null,
      discount: 0
    };
  };

  const priceInfo = formatPrice();
  const eventImage = event.primaryImage?.url || event.images?.[0]?.url;

  // Determine urgency message
  const getUrgencyMessage = () => {
    if (slotsLeft <= 3 && slotsLeft > 0) {
      return `🔥 Chỉ còn ${slotsLeft} chỗ trống!`;
    }
    if (daysUntilEvent <= 2 && daysUntilEvent > 0) {
      return `⚡ Sự kiện bắt đầu trong ${daysUntilEvent} ngày!`;
    }
    if (bookingRate > 0.8) {
      return `🚀 ${Math.round(bookingRate * 100)}% đã được đặt!`;
    }
    if (priceInfo.discount > 0) {
      return `💰 Giảm ${priceInfo.discount}% - Thời gian có hạn!`;
    }
    return "🔥 Sự kiện HOT - Đăng ký ngay!";
  };

  const urgencyMessage = getUrgencyMessage();

  return (
    <TouchableOpacity
      className="mx-6 mb-4 rounded-2xl overflow-hidden"
      style={{ height: getResponsiveSize(180) }}
      onPress={handlePress}
      activeOpacity={0.9}
    >
      {/* Background Image or Gradient */}
      {eventImage ? (
        <ImageBackground
          source={{ uri: eventImage }}
          style={{ flex: 1 }}
          resizeMode="cover"
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.3)']}
            style={{ flex: 1 }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Content */}
            <View className="flex-1 justify-between p-5">
              {/* Top Section */}
              <View>
                <Animated.View
                  style={{
                    transform: [{ scale: pulseAnim }],
                    alignSelf: 'flex-start'
                  }}
                >
                  <View className="bg-red-500/90 backdrop-blur-sm rounded-full px-3 py-1">
                    <Text
                      className="text-white font-bold text-center"
                      style={{ fontSize: getResponsiveSize(12) }}
                    >
                      HOT EVENT
                    </Text>
                  </View>
                </Animated.View>

                <Text
                  className="text-white font-bold mt-2"
                  style={{ fontSize: getResponsiveSize(20) }}
                  numberOfLines={2}
                >
                  {event.name}
                </Text>

                <Text
                  className="text-white/90 mt-1"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  {urgencyMessage}
                </Text>
              </View>

              {/* Bottom Section */}
              <View className="flex-row items-end justify-between">
                <View>
                  {event.locationName && (
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="location-outline" size={14} color="white" />
                      <Text
                        className="text-white/90 ml-1"
                        style={{ fontSize: getResponsiveSize(12) }}
                      >
                        {event.locationName}
                      </Text>
                    </View>
                  )}

                  <View className="flex-row items-center">
                    <Text
                      className="text-white font-bold"
                      style={{ fontSize: getResponsiveSize(18) }}
                    >
                      {priceInfo.current}
                    </Text>
                    {priceInfo.original && (
                      <Text
                        className="text-white/70 line-through ml-2"
                        style={{ fontSize: getResponsiveSize(14) }}
                      >
                        {priceInfo.original}
                      </Text>
                    )}
                  </View>
                </View>

                <TouchableOpacity
                  className="bg-white rounded-full flex-row items-center"
                  style={{
                    paddingHorizontal: getResponsiveSize(20),
                    paddingVertical: getResponsiveSize(12),
                  }}
                  onPress={handlePress}
                >
                  <Text
                    className="text-red-500 font-bold mr-1"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    Tham gia
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </ImageBackground>
      ) : (
        <LinearGradient
          colors={['#ff6b6b', '#ee5a24']}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Decorative circles */}
          <View className="absolute -right-8 -top-8 w-20 h-20 bg-white/10 rounded-full" />
          <View className="absolute -right-4 top-12 w-12 h-12 bg-white/10 rounded-full" />
          <View className="absolute -left-6 -bottom-6 w-16 h-16 bg-white/10 rounded-full" />

          {/* Content */}
          <View className="flex-1 justify-between p-5">
            {/* Top Section */}
            <View>
              <Animated.View
                style={{
                  transform: [{ scale: pulseAnim }],
                  alignSelf: 'flex-start'
                }}
              >
                <View className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                  <Text
                    className="text-white font-bold text-center"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    HOT EVENT
                  </Text>
                </View>
              </Animated.View>

              <Text
                className="text-white font-bold mt-2"
                style={{ fontSize: getResponsiveSize(20) }}
                numberOfLines={2}
              >
                {event.name}
              </Text>

              <Text
                className="text-white/90 mt-1"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                {urgencyMessage}
              </Text>
            </View>

            {/* Bottom Section */}
            <View className="flex-row items-end justify-between">
              <View>
                {event.locationName && (
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="location-outline" size={14} color="white" />
                    <Text
                      className="text-white/90 ml-1"
                      style={{ fontSize: getResponsiveSize(12) }}
                    >
                      {event.locationName}
                    </Text>
                  </View>
                )}

                <View className="flex-row items-center">
                  <Text
                    className="text-white font-bold"
                    style={{ fontSize: getResponsiveSize(18) }}
                  >
                    {priceInfo.current}
                  </Text>
                  {priceInfo.original && (
                    <Text
                      className="text-white/70 line-through ml-2"
                      style={{ fontSize: getResponsiveSize(14) }}
                    >
                      {priceInfo.original}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                className="bg-white rounded-full flex-row items-center"
                style={{
                  paddingHorizontal: getResponsiveSize(20),
                  paddingVertical: getResponsiveSize(12),
                }}
                onPress={handlePress}
              >
                <Text
                  className="text-orange-500 font-bold mr-1"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  Tham gia
                </Text>
                <Ionicons name="arrow-forward" size={16} color="#ea580c" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      )}
    </TouchableOpacity>
  );
};

export default HotEventBanner;