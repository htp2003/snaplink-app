import React from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getResponsiveSize } from "../../utils/responsive";
import { LocationEvent } from "../../types/event";
import EventCarousel from "./EventCarousel";

type EventSectionProps = {
  title: string;
  subtitle?: string;
  events: LocationEvent[];
  loading?: boolean;
  error?: string | null;
  showSeeAll?: boolean;
  onSeeAllPress?: () => void;
  onEventPress?: (event: LocationEvent) => void;
  onFavoriteToggle?: (event: LocationEvent) => void; 
  isFavorite?: (eventId: number) => boolean; 
  onRetry?: () => void;
  showPrice?: boolean;
  showPhotographerCount?: boolean;
  compact?: boolean;
  cardWidth?: number;
  emptyMessage?: string;
  renderCustomEmpty?: () => React.ReactNode;
  renderLoadingSkeleton?: () => React.ReactElement[]; // NEW: Loading skeleton prop
};

const EventSection: React.FC<EventSectionProps> = ({
  title,
  subtitle,
  events,
  loading = false,
  error = null,
  showSeeAll = true,
  onSeeAllPress,
  onEventPress,
  onFavoriteToggle,
  isFavorite,
  onRetry,
  showPrice = true,
  showPhotographerCount = true,
  compact = false,
  cardWidth = 260,
  emptyMessage,
  renderCustomEmpty,
  renderLoadingSkeleton, // NEW: Loading skeleton prop
}) => {

  const renderHeader = () => (
    <View 
      className="flex-row items-center justify-between mb-4"
      style={{ paddingHorizontal: getResponsiveSize(24) }}
    >
      <View className="flex-1">
        <Text
          className="text-stone-900 font-bold"
          style={{ fontSize: getResponsiveSize(20) }}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            className="text-stone-600 mt-1"
            style={{ fontSize: getResponsiveSize(14) }}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {showSeeAll && onSeeAllPress && !loading && (
        <TouchableOpacity
          className="flex-row items-center"
          onPress={onSeeAllPress}
        >
          <Text
            className="text-stone-600 mr-1"
            style={{ fontSize: getResponsiveSize(14) }}
          >
            Xem tất cả
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#57534e" />
        </TouchableOpacity>
      )}
    </View>
  );

  const renderError = () => (
    <View 
      className="flex-1 items-center justify-center py-8"
      style={{ paddingHorizontal: getResponsiveSize(24) }}
    >
      <View 
        className="bg-red-50 rounded-full mb-4"
        style={{
          width: getResponsiveSize(64),
          height: getResponsiveSize(64),
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Ionicons 
          name="alert-circle-outline" 
          size={getResponsiveSize(32)} 
          color="#ef4444" 
        />
      </View>
      
      <Text
        className="text-red-500 text-center font-medium mb-3"
        style={{ fontSize: getResponsiveSize(16) }}
      >
        Không thể tải sự kiện
      </Text>
      
      <Text
        className="text-stone-600 text-center mb-4"
        style={{ fontSize: getResponsiveSize(14) }}
      >
        {error || "Đã xảy ra lỗi khi tải dữ liệu"}
      </Text>
      
      {onRetry && (
        <TouchableOpacity
          className="bg-red-500 rounded-full"
          style={{
            paddingHorizontal: getResponsiveSize(20),
            paddingVertical: getResponsiveSize(10),
          }}
          onPress={onRetry}
        >
          <Text
            className="text-white font-semibold"
            style={{ fontSize: getResponsiveSize(14) }}
          >
            Thử lại
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderEmpty = () => {
    if (renderCustomEmpty) {
      return renderCustomEmpty();
    }

    return (
      <View 
        className="flex-1 items-center justify-center py-8"
        style={{ paddingHorizontal: getResponsiveSize(24) }}
      >
        <View 
          className="bg-stone-100 rounded-full mb-4"
          style={{
            width: getResponsiveSize(64),
            height: getResponsiveSize(64),
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Ionicons 
            name="calendar-outline" 
            size={getResponsiveSize(32)} 
            color="#6b7280" 
          />
        </View>
        
        <Text
          className="text-stone-900 text-center font-medium mb-2"
          style={{ fontSize: getResponsiveSize(16) }}
        >
          Chưa có sự kiện
        </Text>
        
        <Text
          className="text-stone-600 text-center"
          style={{ fontSize: getResponsiveSize(14) }}
        >
          {emptyMessage || "Hiện tại chưa có sự kiện nào trong danh mục này"}
        </Text>
      </View>
    );
  };

  // NEW: Render loading skeleton
  const renderLoadingState = () => {
    if (renderLoadingSkeleton) {
      return (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ 
            paddingLeft: getResponsiveSize(24),
            paddingRight: getResponsiveSize(16) 
          }}
        >
          {renderLoadingSkeleton()}
        </ScrollView>
      );
    }

    // Fallback default loading skeleton if no custom one provided
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingLeft: getResponsiveSize(24),
          paddingRight: getResponsiveSize(16) 
        }}
      >
        {[1, 2, 3].map((_, index) => (
          <View
            key={`default-loading-${index}`}
            style={{ 
              width: getResponsiveSize(cardWidth), 
              height: getResponsiveSize(200),
              marginRight: 12,
              backgroundColor: '#f5f5f4',
              borderRadius: 16,
            }}
          >
            {/* Event image skeleton */}
            <View 
              style={{
                width: '100%',
                height: getResponsiveSize(120),
                backgroundColor: '#e7e5e4',
                borderRadius: 16,
                marginBottom: 12,
              }}
            />
            
            {/* Event title skeleton */}
            <View 
              style={{
                width: '80%',
                height: 16,
                backgroundColor: '#e7e5e4',
                borderRadius: 8,
                marginHorizontal: 12,
                marginBottom: 8,
              }}
            />
            
            {/* Event details skeleton */}
            <View 
              style={{
                width: '60%',
                height: 12,
                backgroundColor: '#e7e5e4',
                borderRadius: 6,
                marginHorizontal: 12,
                marginBottom: 6,
              }}
            />
            
            {/* Event price skeleton */}
            <View 
              style={{
                width: '40%',
                height: 14,
                backgroundColor: '#e7e5e4',
                borderRadius: 7,
                marginHorizontal: 12,
              }}
            />
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderContent = () => {
    if (error) {
      return renderError();
    }

    // NEW: Show loading skeleton when loading
    if (loading) {
      return renderLoadingState();
    }

    if (!events || events.length === 0) {
      return renderEmpty();
    }

    return (
      <EventCarousel
        events={events}
        loading={loading}
        onEventPress={onEventPress}
        onFavoriteToggle={onFavoriteToggle}
        isFavorite={isFavorite}
        showPrice={showPrice}
        showPhotographerCount={showPhotographerCount}
        compact={compact}
        cardWidth={cardWidth}
      />
    );
  };

  return (
    <View style={{ marginBottom: getResponsiveSize(32) }}>
      {renderHeader()}
      {renderContent()}
    </View>
  );
};

export default EventSection;