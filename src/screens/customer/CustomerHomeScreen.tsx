import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  SafeAreaView,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, GooglePlaceDisplay } from "../../navigation/types";
import { Ionicons } from "@expo/vector-icons";
import { getResponsiveSize } from "../../utils/responsive";

// Hooks and Components
import {
  usePhotographers,
  PhotographerData,
} from "../../hooks/usePhotographers";
import { useLocations } from "../../hooks/useLocations";
import { useFavorites } from "../../hooks/useFavorites";
import PhotographerCard from "../../components/Photographer/PhotographerCard";
import LocationCard from "../../components/Location/LocationCard";
import { useNavigation } from "@react-navigation/native";
import CategoryTabs, { CategoryItem } from "../../components/CategoryTabs";
import { SearchBar } from "../../components/SearchBar";
import { useCurrentUserId } from "../../hooks/useAuth";
import { photographerStyleRecommendations } from "../../hooks/useStyleRecommendations";

// Event
import { HotEventBanner, EventSection } from "../../components/Event";
import { useCustomerEventDiscovery, useHotEvents } from "../../hooks/useEvent";
import { LocationEvent } from "../../types/event";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

export default function CustomerHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState<string>("locations");
  const currentUserId = useCurrentUserId();

  // 📍 Enhanced Locations Hook with GPS
  const {
    locations,
    loading: locationsLoading,
    error: locationsError,
    nearbyAppLocations,
    refreshLocations,
  } = useLocations();

  // Photographers hooks
  const featuredPhotographersHook = usePhotographers();
  const {
    photographers: featuredPhotographers,
    loading: featuredLoading,
    error: featuredError,
    fetchFeaturedPhotographers,
  } = featuredPhotographersHook;

  const [allPhotographers, setAllPhotographers] = useState<PhotographerData[]>([]);
  const [allLoading, setAllLoading] = useState<boolean>(false);
  const [allError, setAllError] = useState<string | null>(null);

  // Style recommendations
  const styleRecommendationsHook = photographerStyleRecommendations(currentUserId || 0);
  const {
    recommendedPhotographers,
    loading: recommendationsLoading,
    error: recommendationsError,
    refreshRecommendations,
  } = styleRecommendationsHook;

  const { isFavorite, toggleFavorite } = useFavorites();

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

  // Categories memo
  const categories = useMemo(
    (): CategoryItem[] => [
      { id: "locations", icon: "location", label: "Địa điểm" },
      { id: "photographers", icon: "camera", label: "Thợ chụp ảnh" },
      { id: "events", icon: "time-outline", label: "Sự kiện" },
    ],
    []
  );

  // 🆕 Handle nearby results from SearchBar
  const handleNearbyResults = useCallback((results: { appLocations: any[]; googlePlaces: any[] }) => {
    console.log('📍 Received nearby results from SearchBar:', {
      appLocations: results.appLocations.length,
      googlePlaces: results.googlePlaces.length
    });

  }, []);

  // Category press handler
  const handleCategoryPress = useCallback(
    (categoryId: string) => {
      setSelectedCategory(categoryId);
    },
    []
  );

  // Event handlers
  const handleEventPress = useCallback((event: any) => {
    navigation.navigate("EventDetailScreen", {
      eventId: event.eventId.toString()
    });
  }, [navigation]);

  const handleEventSeeAll = useCallback(() => {
    console.log("Navigate to events list");
  }, []);

  // API response processing
  const processApiResponse = (apiResponse: any): any[] => {
    if (Array.isArray(apiResponse)) {
      return apiResponse;
    }
    if (apiResponse && Array.isArray((apiResponse as any).$values)) {
      return (apiResponse as any).$values;
    }
    if (apiResponse && typeof apiResponse === "object") {
      return [apiResponse];
    }
    console.warn("Unexpected API response format:", apiResponse);
    return [];
  };

  // Transform photographer data
  const transformPhotographerData = (photographer: any): PhotographerData => {
    const photographerId = photographer.photographerId || photographer.id;
    const userInfo = photographer.user || photographer;

    return {
      id: photographerId ? photographerId.toString() : "unknown",
      fullName: userInfo.fullName || photographer.fullName || "Unknown Photographer",
      avatar: userInfo.profileImage || photographer.profileImage || "",
      styles: Array.isArray(photographer.styles) ? photographer.styles : ["Professional Photography"],
      rating: photographer.rating,
      hourlyRate: photographer.hourlyRate,
      availabilityStatus: photographer.availabilityStatus || "available",
      yearsExperience: photographer.yearsExperience,
      equipment: photographer.equipment,
      verificationStatus: photographer.verificationStatus,
      specialty: photographer.specialty || "Professional Photographer",
    };
  };

  // Fetch all photographers
  const fetchAllPhotographersSeparately = useCallback(async () => {
    if (allLoading) return;

    try {
      setAllLoading(true);
      setAllError(null);

      const { photographerService } = await import("../../services/photographerService");
      const response = await photographerService.getAll();

      const photographersArray = processApiResponse(response);
      const transformedData: PhotographerData[] = [];

      for (const photographer of photographersArray) {
        if (photographer && (photographer.photographerId !== undefined || photographer.id !== undefined)) {
          try {
            const transformed = transformPhotographerData(photographer);
            transformedData.push(transformed);
          } catch (error) {
            console.error("Error transforming photographer:", error);
          }
        }
      }

      setAllPhotographers(transformedData);
    } catch (err) {
      console.error("Error fetching all photographers:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch all photographers";
      setAllError(errorMessage);
      setAllPhotographers([]);
    } finally {
      setAllLoading(false);
    }
  }, [allLoading]);

  // Render photographer card
  const renderPhotographerCard = useCallback(
    (photographer: PhotographerData) => (
      <View
        key={photographer.id}
        style={{ width: getResponsiveSize(260), marginRight: 12 }}
      >
        <PhotographerCard
          id={photographer.id}
          fullName={photographer.fullName}
          avatar={photographer.avatar}
          styles={photographer.styles}
          rating={photographer.rating}
          hourlyRate={photographer.hourlyRate}
          availabilityStatus={photographer.availabilityStatus}
          yearsExperience={photographer.yearsExperience}
          equipment={photographer.equipment}
          verificationStatus={photographer.verificationStatus}
          onBooking={() => {
            if (photographer.id === undefined) {
              console.error("Photographer ID is undefined");
              return;
            }
            navigation.navigate("Booking", {
              photographer: {
                photographerId: Number(photographer.id),
                fullName: photographer.fullName || "",
                hourlyRate: photographer.hourlyRate || 0,
                profileImage: photographer.avatar || "",
              },
            });
          }}
          isFavorite={isFavorite(photographer.id, "photographer")}
          onFavoriteToggle={() => {
            const favoriteItem = {
              id: photographer.id,
              type: "photographer" as const,
              data: photographer,
            };
            toggleFavorite(favoriteItem);
          }}
        />
      </View>
    ),
    [navigation, isFavorite, toggleFavorite]
  );

  // Render location card
  const renderLocationCard = useCallback(
    (location: any, showDistance: boolean = false) => (
      <View
        key={location.id || location.locationId || Math.random()}
        style={{ width: getResponsiveSize(260), marginRight: 12 }}
      >
        <LocationCard
          locationId={location.locationId}
          name={location.name || "Địa điểm chưa có tên"}
          images={location.images || []}
          address={location.address || ""}
          hourlyRate={location.hourlyRate}
          capacity={location.capacity}
          availabilityStatus={location.availabilityStatus || "unknown"}
          styles={location.styles || []}
          isFavorite={isFavorite(location.id || location.locationId, "location")}
          onFavoriteToggle={() =>
            toggleFavorite({
              id: location.id || location.locationId,
              type: "location",
              data: location,
            })
          }
          distance={showDistance && location.distance ? Number(location.distance) : undefined}
          rating={location.rating ? Number(location.rating) : undefined}
          source={location.source || "internal"}
        />
      </View>
    ),
    [isFavorite, toggleFavorite]
  );

  // Render loading skeleton
  const renderLoadingSkeleton = useCallback(
    () =>
      [1, 2, 3].map((_, index) => (
        <View
          key={`loading-${index}`}
          className="w-64 h-72 bg-stone-100 rounded-2xl mr-3"
        />
      )),
    []
  );

  // Render error state
  const renderErrorState = useCallback(
    (error: string, retryFunction: () => void) => (
      <View className="flex-1 items-center justify-center py-8">
        <Text className="text-red-500 text-center">
          {`⚠️ ${error}`}
        </Text>
        <TouchableOpacity
          onPress={retryFunction}
          className="mt-2 bg-red-500 px-4 py-2 rounded"
        >
          <Text className="text-white">Thử lại</Text>
        </TouchableOpacity>
      </View>
    ),
    []
  );

  // Initialize data on mount
  useEffect(() => {
    fetchFeaturedPhotographers();
    fetchAllPhotographersSeparately();
  }, []); 

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar backgroundColor="white" barStyle="dark-content" />
  
      {/* Enhanced Search Bar */}
      <View className="bg-white border-b border-gray-100">
        <View className="pt-2 pb-4">
          <SearchBar
            onLocationSelect={(result) => {
              if (result.type === 'app_location') {
                navigation.navigate('LocationCardDetail', {
                  locationId: result.data.locationId.toString(),
                });
              } else if (result.type === 'google_place') {
                navigation.navigate('LocationCardDetail', {
                  locationId: undefined,
                  externalLocation: {
                    placeId: result.data.placeId,
                    name: result.data.name,
                    address: result.data.address,
                    latitude: result.data.latitude,
                    longitude: result.data.longitude,
                    rating: result.data.rating,
                    types: result.data.types || [],
                    photoReference: undefined,
                  } as GooglePlaceDisplay,
                });
              }
            }}
            onNearbyResults={handleNearbyResults}
            showGPSOptions={true}
          />
        </View>
      </View>
  
      {/* Category Tabs */}
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryPress={handleCategoryPress}
      />
  
      {/* Main Content */}
      <ScrollView
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: getResponsiveSize(100) }}
      >
        {/* PHOTOGRAPHERS SECTIONS */}
        {selectedCategory === "photographers" && (
          <>
            {/* Featured Photographers */}
            <View className="px-6 py-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xl font-semibold text-stone-900">
                  Thợ chụp ảnh nổi bật
                </Text>
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() =>
                    navigation.navigate("ViewAllPhotographers", {
                      type: "featured",
                      title: "Thợ chụp ảnh nổi bật",
                    })
                  }
                >
                  <Ionicons name="chevron-forward" size={20} color="#57534e" />
                </TouchableOpacity>
              </View>
  
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {featuredLoading ? (
                  renderLoadingSkeleton()
                ) : featuredError ? (
                  renderErrorState(featuredError, fetchFeaturedPhotographers)
                ) : featuredPhotographers.length > 0 ? (
                  featuredPhotographers.map(renderPhotographerCard)
                ) : (
                  <View className="flex-1 items-center justify-center py-8">
                    <Text className="text-stone-500 text-center">
                      Chưa có thợ chụp ảnh nổi bật
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
  
            {/* All Photographers */}
            <View className="px-6 py-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xl font-semibold text-stone-900">
                  Tất cả thợ chụp ảnh
                </Text>
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() =>
                    navigation.navigate("ViewAllPhotographers", {
                      type: "all",
                      title: "Tất cả thợ chụp ảnh",
                    })
                  }
                >
                  <Ionicons name="chevron-forward" size={20} color="#57534e" />
                </TouchableOpacity>
              </View>
  
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {allLoading ? (
                  renderLoadingSkeleton()
                ) : allError ? (
                  renderErrorState(allError, fetchAllPhotographersSeparately)
                ) : allPhotographers.length > 0 ? (
                  allPhotographers.map(renderPhotographerCard)
                ) : (
                  <View className="flex-1 items-center justify-center py-8">
                    <Text className="text-stone-500 text-center">
                      Không có thợ chụp ảnh nào
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
  
            {/* Style Recommendations */}
            <View className="px-6 py-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xl font-semibold text-stone-900">
                  Thợ chụp ảnh theo Style của bạn
                </Text>
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() =>
                    navigation.navigate("ViewAllPhotographers", {
                      type: "recommendations",
                      title: "Thợ chụp ảnh theo Style của bạn",
                      userId: currentUserId,
                    })
                  }
                >
                  <Ionicons name="chevron-forward" size={20} color="#57534e" />
                </TouchableOpacity>
              </View>
  
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {recommendationsLoading ? (
                  renderLoadingSkeleton()
                ) : recommendationsError ? (
                  <View className="flex-1 items-center justify-center py-8">
                    <Text className="text-red-500 text-center">
                      ⚠️ Không thể tải gợi ý theo style
                    </Text>
                    {currentUserId && (
                      <TouchableOpacity
                        className="mt-2 bg-blue-500 px-4 py-2 rounded"
                        onPress={refreshRecommendations}
                      >
                        <Text className="text-white">Thử lại</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : recommendedPhotographers.length > 0 ? (
                  recommendedPhotographers.map(renderPhotographerCard)
                ) : (
                  <View className="flex-1 items-center justify-center py-8">
                    <Text className="text-stone-500 text-center">
                      {!currentUserId
                        ? "Vui lòng đăng nhập để xem gợi ý theo style"
                        : "Chưa có gợi ý theo style cho bạn"}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </>
        )}
  
        {/* LOCATIONS SECTIONS */}
        {selectedCategory === "locations" && (
          <>
            {/* Favorite Locations */}
            <View className="px-6 py-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xl font-semibold text-stone-900">
                  Địa điểm được yêu thích
                </Text>
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => navigation.navigate("ViewAllLocations")}
                >
                  <Ionicons name="chevron-forward" size={20} color="#57534e" />
                </TouchableOpacity>
              </View>
  
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {locationsLoading ? (
                  renderLoadingSkeleton()
                ) : locations.length > 0 ? (
                  locations
                    .filter(location => location.locationId !== undefined && location.locationId !== null)
                    .map(location => renderLocationCard(location, false))
                ) : (
                  <View className="flex-1 items-center justify-center py-8">
                    <Text className="text-stone-500 text-center">
                      Không có địa điểm nào
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
  
            {/* Nearby App Locations */}
            {nearbyAppLocations.length > 0 && (
              <View className="px-6 py-4">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center">
                    <Ionicons name="navigate" size={20} color="#10B981" />
                    <Text className="ml-2 text-xl font-semibold text-stone-900">
                      Địa điểm gần bạn
                    </Text>
                  </View>
                </View>
  
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: 16 }}
                >
                  {nearbyAppLocations
                    .filter(location => location && (location.id || location.locationId))
                    .map(location => renderLocationCard(location, true))}
                </ScrollView>
              </View>
            )}
          </>
        )}
  
        {/* EVENTS SECTIONS */}
        {selectedCategory === "events" && (
          <>
            <HotEventBanner
              event={processedEvents.hotEventsFiltered[0] || null}
              loading={hotLoading}
              onPress={processedEvents.hotEventsFiltered[0] ? () => handleEventPress(processedEvents.hotEventsFiltered[0]) : undefined}
            />
  
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
            />
  
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
            />
  
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
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
  }