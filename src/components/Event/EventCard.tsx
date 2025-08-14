import React, { useState } from "react";
import { View, Image, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { getResponsiveSize } from "../../utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LocationEvent } from "../../types/event";


type EventCardProps = {
  event: LocationEvent;
  onPress?: () => void;
  onFavoriteToggle?: () => void;
  isFavorite?: boolean;
  showPrice?: boolean;
  showPhotographerCount?: boolean;
  compact?: boolean;
};

const EventCard: React.FC<EventCardProps> = ({
  event,
  onPress,
  onFavoriteToggle,
  isFavorite = false,
  showPrice = true,
  showPhotographerCount = true,
  compact = false,
}) => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [imageError, setImageError] = useState(false);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // ✅ FIXED: Navigate to EventDetailScreen with correct eventId
      navigation.navigate("EventDetailScreen", { 
        eventId: event.eventId.toString() 
      });
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleFavoriteToggle = () => {
    try {
      if (onFavoriteToggle) {
        onFavoriteToggle();
      }
    } catch (error) {
      console.error('Error toggling event favorite:', error);
    }
  };

  // Format date display
  const formatEventDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const startMonth = start.toLocaleDateString('vi-VN', { month: 'short' });
    const startDay = start.getDate();
    const startTime = start.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    return `${startDay} ${startMonth} • ${startTime}`;
  };

  // Format price display
  const formatPrice = () => {
    if (event.discountedPrice && event.originalPrice) {
      return {
        current: `₫${event.discountedPrice.toLocaleString()}`,
        original: `₫${event.originalPrice.toLocaleString()}`,
        hasDiscount: true,
        discountPercent: Math.round(((event.originalPrice - event.discountedPrice) / event.originalPrice) * 100)
      };
    } else if (event.originalPrice) {
      return {
        current: `₫${event.originalPrice.toLocaleString()}`,
        original: null,
        hasDiscount: false,
        discountPercent: 0
      };
    }
    return {
      current: "Liên hệ",
      original: null,
      hasDiscount: false,
      discountPercent: 0
    };
  };

  // Calculate slots availability
  const slotsAvailable = event.maxBookingsPerSlot - event.totalBookingsCount;
  const bookingRate = event.totalBookingsCount / event.maxBookingsPerSlot;

  // Determine event urgency/status
  const getEventBadge = () => {
    const now = new Date();
    const eventDate = new Date(event.startDate);
    const daysUntilEvent = (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (bookingRate > 0.8) {
      return { text: "🔥 HOT", color: "#ef4444", bgColor: "rgba(239, 68, 68, 0.9)" };
    }
    if (event.discountedPrice && event.originalPrice && event.discountedPrice < event.originalPrice) {
      return { text: "💰 SALE", color: "#10b981", bgColor: "rgba(16, 185, 129, 0.9)" };
    }
    if (daysUntilEvent <= 3 && daysUntilEvent > 0) {
      return { text: "⚡ SỚM", color: "#f59e0b", bgColor: "rgba(245, 158, 11, 0.9)" };
    }
    if (event.status === 'Active') {
      return { text: "✨ MỚI", color: "#3b82f6", bgColor: "rgba(59, 130, 246, 0.9)" };
    }
    return null;
  };

  const badge = getEventBadge();
  const priceInfo = formatPrice();
  const cardHeight = compact ? 200 : 240;

  // Get event image
  const eventImage = event.primaryImage?.url || 
                    event.images?.[0]?.url || 
                    'https://via.placeholder.com/260x240/e5e7eb/6b7280?text=Event+Image';

  return (
    <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
      {/* Event Image */}
      <TouchableOpacity onPress={handlePress} className="relative">
        <Image
          source={{ uri: imageError ? 'https://via.placeholder.com/260x240/e5e7eb/6b7280?text=No+Image' : eventImage }}
          style={{ width: "100%", height: getResponsiveSize(cardHeight) }}
          className="bg-stone-200"
          resizeMode="cover"
          onError={handleImageError}
        />

        {/* Event Badge */}
        {badge && (
          <View
            className="absolute top-3 left-3 rounded-full"
            style={{
              backgroundColor: badge.bgColor,
              paddingHorizontal: getResponsiveSize(8),
              paddingVertical: getResponsiveSize(4),
            }}
          >
            <Text
              className="text-white font-semibold"
              style={{ fontSize: getResponsiveSize(12) }}
            >
              {badge.text}
            </Text>
          </View>
        )}

        {/* Favorite Button - Only show if onFavoriteToggle provided */}
        {onFavoriteToggle && (
          <TouchableOpacity
            className="absolute top-3 right-3 bg-black/20 rounded-full"
            style={{ padding: getResponsiveSize(8) }}
            onPress={handleFavoriteToggle}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={getResponsiveSize(24)}
              color={isFavorite ? "#ef4444" : "white"}
            />
          </TouchableOpacity>
        )}

        {/* Slots indicator */}
        {slotsAvailable <= 5 && slotsAvailable > 0 && (
          <View
            className="absolute bottom-3 left-3 bg-white/90 rounded-full flex-row items-center"
            style={{
              paddingHorizontal: getResponsiveSize(8),
              paddingVertical: getResponsiveSize(4),
            }}
          >
            <Ionicons
              name="people-outline"
              size={getResponsiveSize(14)}
              color="#ef4444"
            />
            <Text
              className="text-red-500 font-medium ml-1"
              style={{ fontSize: getResponsiveSize(12) }}
            >
              Còn {slotsAvailable} chỗ
            </Text>
          </View>
        )}

        {/* Location indicator */}
        <View
          className="absolute bottom-3 right-3 bg-white/90 rounded-full flex-row items-center"
          style={{
            paddingHorizontal: getResponsiveSize(8),
            paddingVertical: getResponsiveSize(4),
          }}
        >
          <Ionicons
            name="location-outline"
            size={getResponsiveSize(14)}
            color="#6b7280"
          />
        </View>
      </TouchableOpacity>

      {/* Event Content */}
      <View style={{ padding: getResponsiveSize(16) }}>
        {/* Date and Status */}
        <View style={{ marginBottom: getResponsiveSize(8) }}>
          <Text
            className="text-amber-600 font-semibold"
            style={{ fontSize: getResponsiveSize(12) }}
          >
            {formatEventDate(event.startDate, event.endDate)}
          </Text>
        </View>

        {/* Event Name */}
        <View style={{ marginBottom: getResponsiveSize(8) }}>
          <Text
            className="text-stone-900 font-bold leading-tight"
            style={{ fontSize: getResponsiveSize(16) }}
            numberOfLines={2}
          >
            {event.name}
          </Text>
          {event.locationName && (
            <Text
              className="text-stone-600 mt-1"
              style={{ fontSize: getResponsiveSize(14) }}
              numberOfLines={1}
            >
              📍 {event.locationName}
            </Text>
          )}
        </View>

        {/* Event Stats */}
        <View
          className="flex-row items-center justify-between"
          style={{ marginBottom: getResponsiveSize(12) }}
        >
          {showPhotographerCount && (
            <View className="flex-row items-center">
              <Ionicons
                name="camera-outline"
                size={getResponsiveSize(14)}
                color="#6b7280"
              />
              <Text
                className="text-stone-600 ml-1"
                style={{ fontSize: getResponsiveSize(13) }}
              >
                {event.approvedPhotographersCount} thợ ảnh
              </Text>
            </View>
          )}

          <View className="flex-row items-center">
            <Ionicons
              name="people-outline"
              size={getResponsiveSize(14)}
              color="#6b7280"
            />
            <Text
              className="text-stone-600 ml-1"
              style={{ fontSize: getResponsiveSize(13) }}
            >
              {event.totalBookingsCount}/{event.maxBookingsPerSlot}
            </Text>
          </View>
        </View>

        {/* Price and Join Button */}
        {showPrice && (
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text
                  className="text-stone-900 font-bold"
                  style={{ fontSize: getResponsiveSize(16) }}
                >
                  {priceInfo.current}
                </Text>
                {priceInfo.hasDiscount && priceInfo.original && (
                  <Text
                    className="text-stone-500 line-through ml-2"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    {priceInfo.original}
                  </Text>
                )}
              </View>
              {priceInfo.hasDiscount && (
                <Text
                  className="text-green-600 font-medium"
                  style={{ fontSize: getResponsiveSize(12) }}
                >
                  Tiết kiệm {priceInfo.discountPercent}%
                </Text>
              )}
            </View>

            <TouchableOpacity
              className="bg-amber-500 rounded-full"
              style={{
                paddingHorizontal: getResponsiveSize(16),
                paddingVertical: getResponsiveSize(8),
              }}
              onPress={handlePress}
              activeOpacity={0.8}
            >
              <Text
                className="text-white font-semibold"
                style={{ fontSize: getResponsiveSize(12) }}
              >
                Tham gia
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

export default EventCard;