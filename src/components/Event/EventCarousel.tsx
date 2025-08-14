import React, { useRef } from "react";
import { View, ScrollView, Animated } from "react-native";
import { getResponsiveSize } from "../../utils/responsive";
import { LocationEvent } from "../../types/event";
import EventCard from "./EventCard";
import { Ionicons } from "@expo/vector-icons";

type EventCarouselProps = {
  events: LocationEvent[];
  loading?: boolean;
  onEventPress?: (event: LocationEvent) => void;
  onFavoriteToggle?: (event: LocationEvent) => void; // Optional
  isFavorite?: (eventId: number) => boolean; // Optional
  showPrice?: boolean;
  showPhotographerCount?: boolean;
  compact?: boolean;
  cardWidth?: number;
};

const EventCarousel: React.FC<EventCarouselProps> = ({
  events,
  loading = false,
  onEventPress,
  onFavoriteToggle,
  isFavorite,
  showPrice = true,
  showPhotographerCount = true,
  compact = false,
  cardWidth = 260,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);

  const renderLoadingSkeleton = () => {
    return [1, 2, 3].map((_, index) => (
      <View
        key={`loading-${index}`}
        style={{ 
          width: getResponsiveSize(cardWidth), 
          marginRight: getResponsiveSize(12) 
        }}
      >
        <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
          {/* Image skeleton */}
          <View 
            className="bg-stone-200 animate-pulse"
            style={{ 
              width: "100%", 
              height: getResponsiveSize(compact ? 200 : 240) 
            }}
          />
          
          {/* Content skeleton */}
          <View style={{ padding: getResponsiveSize(16) }}>
            {/* Date skeleton */}
            <View 
              className="bg-stone-200 rounded animate-pulse"
              style={{ 
                width: "60%", 
                height: getResponsiveSize(12),
                marginBottom: getResponsiveSize(8)
              }}
            />
            
            {/* Title skeleton */}
            <View 
              className="bg-stone-200 rounded animate-pulse"
              style={{ 
                width: "90%", 
                height: getResponsiveSize(16),
                marginBottom: getResponsiveSize(4)
              }}
            />
            <View 
              className="bg-stone-200 rounded animate-pulse"
              style={{ 
                width: "70%", 
                height: getResponsiveSize(16),
                marginBottom: getResponsiveSize(12)
              }}
            />
            
            {/* Location skeleton */}
            <View 
              className="bg-stone-200 rounded animate-pulse"
              style={{ 
                width: "80%", 
                height: getResponsiveSize(14),
                marginBottom: getResponsiveSize(12)
              }}
            />
            
            {/* Stats skeleton */}
            <View 
              className="flex-row justify-between"
              style={{ marginBottom: getResponsiveSize(12) }}
            >
              <View 
                className="bg-stone-200 rounded animate-pulse"
                style={{ 
                  width: "40%", 
                  height: getResponsiveSize(13)
                }}
              />
              <View 
                className="bg-stone-200 rounded animate-pulse"
                style={{ 
                  width: "30%", 
                  height: getResponsiveSize(13)
                }}
              />
            </View>
            
            {/* Price and button skeleton */}
            <View className="flex-row justify-between items-center">
              <View 
                className="bg-stone-200 rounded animate-pulse"
                style={{ 
                  width: "50%", 
                  height: getResponsiveSize(16)
                }}
              />
              <View 
                className="bg-stone-200 rounded-full animate-pulse"
                style={{ 
                  width: getResponsiveSize(80), 
                  height: getResponsiveSize(32)
                }}
              />
            </View>
          </View>
        </View>
      </View>
    ));
  };

  const renderEmptyState = () => (
    <View 
      className="flex-1 items-center justify-center py-8"
      style={{ paddingHorizontal: getResponsiveSize(24) }}
    >
      <View 
        className="bg-stone-100 rounded-full mb-4 items-center justify-center"
        style={{
          width: getResponsiveSize(64),
          height: getResponsiveSize(64),
        }}
      >
        <Ionicons 
          name="calendar-outline" 
          size={getResponsiveSize(32)} 
          color="#9ca3af" 
        />
      </View>
      
      <View 
        className="bg-stone-200 rounded mb-2 animate-pulse"
        style={{ 
          width: getResponsiveSize(120), 
          height: getResponsiveSize(16) 
        }}
      />
      <View 
        className="bg-stone-200 rounded animate-pulse"
        style={{ 
          width: getResponsiveSize(180), 
          height: getResponsiveSize(14) 
        }}
      />
    </View>
  );

  const handleEventPress = (event: LocationEvent) => {
    if (onEventPress) {
      onEventPress(event);
    }
  };

  const handleFavoriteToggle = (event: LocationEvent) => {
    try {
      if (onFavoriteToggle) {
        onFavoriteToggle(event);
      }
    } catch (error) {
      console.error('Error toggling favorite in carousel:', error);
    }
  };

  // Show loading state
  if (loading) {
    return (
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingLeft: getResponsiveSize(24),
          paddingRight: getResponsiveSize(40)
        }}
        decelerationRate="fast"
        snapToInterval={getResponsiveSize(cardWidth + 12)}
        snapToAlignment="start"
        scrollEventThrottle={16}
      >
        {renderLoadingSkeleton()}
      </ScrollView>
    );
  }

  // Show empty state
  if (!events || events.length === 0) {
    return renderEmptyState();
  }

  // Render events carousel
  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ 
        paddingLeft: getResponsiveSize(24),
        paddingRight: getResponsiveSize(40)
      }}
      decelerationRate="fast"
      snapToInterval={getResponsiveSize(cardWidth + 12)}
      snapToAlignment="start"
      scrollEventThrottle={16}
      bounces={true}
      alwaysBounceHorizontal={false}
    >
      {events.map((event, index) => (
        <View
          key={event.eventId || `event-${index}`}
          style={{ 
            width: getResponsiveSize(cardWidth), 
            marginRight: getResponsiveSize(12)
          }}
        >
          <EventCard
            event={event}
            onPress={() => handleEventPress(event)}
            onFavoriteToggle={() => handleFavoriteToggle(event)}
            isFavorite={isFavorite ? isFavorite(event.eventId) : false}
            showPrice={showPrice}
            showPhotographerCount={showPhotographerCount}
            compact={compact}
          />
        </View>
      ))}
    </ScrollView>
  );
};

export default EventCarousel;