import React, { useMemo, useCallback } from "react";
import { View } from "react-native";
import { useCustomerEventDiscovery, useHotEvents } from "src/hooks/useEvent";
import { LocationEvent } from "src/types/event";
import { HotEventBanner, EventSection } from "../Event";
import { getResponsiveSize } from "src/utils/responsive";

interface EventsTabProps {
  navigation: any;
}

// Event utility functions
const isEventExpired = (endDate: string): boolean => {
  const now = new Date();
  const eventEnd = new Date(endDate);
  return eventEnd < now;
};

const isEventUpcoming = (startDate: string): boolean => {
  const now = new Date();
  const eventStart = new Date(startDate);
  const hoursUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilEvent > 0 && hoursUntilEvent <= (7 * 24);
};

const isEventFeatured = (event: LocationEvent): boolean => {
  const bookingRate = event.totalBookingsCount / event.maxBookingsPerSlot;
  const hasDiscount = event.discountedPrice && event.originalPrice && event.discountedPrice < event.originalPrice;
  return bookingRate > 0.5 || hasDiscount || false;
};

const removeDuplicateEvents = (events: LocationEvent[]): LocationEvent[] => {
  const seen = new Set();
  return events.filter(event => {
    if (seen.has(event.eventId)) {
      return false;
    }
    seen.add(event.eventId);
    return true;
  });
};

const EventsTab: React.FC<EventsTabProps> = ({ navigation }) => {
  // Events hooks
  const { hotEvents, loading: hotLoading } = useHotEvents();
  const {
    allEvents,
    featuredEvents,
    upcomingEvents,
    loading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents
  } = useCustomerEventDiscovery();

  // Render loading skeleton for event cards
  const renderLoadingSkeleton = useCallback(() => 
    [1, 2, 3].map((_, index) => (
      <View
        key={`event-loading-${index}`}
        style={{ 
          width: getResponsiveSize(280), 
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
    )), []
  );

  // Render hot event banner loading skeleton
  const renderHotEventBannerSkeleton = useCallback(() => (
    <View 
      style={{
        marginHorizontal: 16,
        marginVertical: 16,
        height: getResponsiveSize(180),
        backgroundColor: '#f5f5f4',
        borderRadius: 20,
      }}
    >
      {/* Banner image skeleton */}
      <View 
        style={{
          width: '100%',
          height: getResponsiveSize(140),
          backgroundColor: '#e7e5e4',
          borderRadius: 20,
          marginBottom: 12,
        }}
      />
      
      {/* Banner content skeleton */}
      <View style={{ paddingHorizontal: 16 }}>
        <View 
          style={{
            width: '70%',
            height: 18,
            backgroundColor: '#e7e5e4',
            borderRadius: 9,
            marginBottom: 8,
          }}
        />
        <View 
          style={{
            width: '50%',
            height: 14,
            backgroundColor: '#e7e5e4',
            borderRadius: 7,
          }}
        />
      </View>
    </View>
  ), []);

  // Processed events memo
  const processedEvents = useMemo(() => {
    if (!allEvents || allEvents.length === 0) {
      return {
        validEvents: [],
        hotEventsFiltered: [],
        featuredEventsFiltered: [],
        upcomingEventsFiltered: []
      };
    }

    const validEvents = allEvents.filter(event => !isEventExpired(event.endDate));
    const hotEventsFiltered = hotEvents.filter(event => !isEventExpired(event.endDate));
    const hotEventIds = new Set(hotEventsFiltered.map(e => e.eventId));
    const featuredEventsFiltered = removeDuplicateEvents(
      validEvents.filter(event =>
        isEventFeatured(event) && !hotEventIds.has(event.eventId)
      )
    );
    const featuredEventIds = new Set(featuredEventsFiltered.map(e => e.eventId));
    const upcomingEventsFiltered = removeDuplicateEvents(
      validEvents.filter(event =>
        isEventUpcoming(event.startDate) &&
        !hotEventIds.has(event.eventId) &&
        !featuredEventIds.has(event.eventId)
      )
    );

    return {
      validEvents: removeDuplicateEvents(validEvents),
      hotEventsFiltered,
      featuredEventsFiltered,
      upcomingEventsFiltered
    };
  }, [allEvents, hotEvents]);

  // Event handlers
  const handleEventPress = useCallback((event: any) => {
    navigation.navigate("EventDetailScreen", {
      eventId: event.eventId.toString()
    });
  }, [navigation]);

  const handleEventSeeAll = useCallback(() => {
    console.log("Navigate to events list");
  }, []);

  return (
    <>
      {/* Hot Event Banner with Loading */}
      {hotLoading ? (
        renderHotEventBannerSkeleton()
      ) : (
        <HotEventBanner
          event={processedEvents.hotEventsFiltered[0] || null}
          loading={hotLoading}
          onPress={processedEvents.hotEventsFiltered[0] ? () => handleEventPress(processedEvents.hotEventsFiltered[0]) : undefined}
        />
      )}

      {/* Featured Events Section */}
      <EventSection
        title="Sự kiện nổi bật"
        subtitle="Những workshop được yêu thích nhất"
        events={processedEvents.featuredEventsFiltered}
        loading={eventsLoading}
        error={eventsError}
        onEventPress={handleEventPress}
        onSeeAllPress={handleEventSeeAll}
        onRetry={refetchEvents}
        emptyMessage="Hiện tại chưa có sự kiện nổi bật nào"
        renderLoadingSkeleton={renderLoadingSkeleton}
      />

      {/* Upcoming Events Section */}
      <EventSection
        title="Sự kiện sắp diễn ra"
        subtitle="Đăng ký ngay để không bị lỡ"
        events={processedEvents.upcomingEventsFiltered}
        loading={eventsLoading}
        error={eventsError}
        onEventPress={handleEventPress}
        onSeeAllPress={handleEventSeeAll}
        onRetry={refetchEvents}
        emptyMessage="Hiện tại chưa có sự kiện sắp diễn ra"
        renderLoadingSkeleton={renderLoadingSkeleton}
      />

      {/* All Events Section */}
      <EventSection
        title="Tất cả sự kiện"
        subtitle="Khám phá thêm nhiều workshop thú vị"
        events={processedEvents.validEvents}
        loading={eventsLoading}
        error={eventsError}
        onEventPress={handleEventPress}
        onSeeAllPress={handleEventSeeAll}
        onRetry={refetchEvents}
        emptyMessage="Hiện tại chưa có sự kiện nào"
        renderLoadingSkeleton={renderLoadingSkeleton}
      />
    </>
  );
};

export default EventsTab;