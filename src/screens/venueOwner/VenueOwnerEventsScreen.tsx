// screens/venueOwner/VenueOwnerEventsScreen.tsx
import React, { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
  Image,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useVenueOwnerEvent } from "../../hooks/useVenueOwnerEvent";
import { useVenueOwnerLocation } from "../../hooks/useVenueOwnerLocation";
import { VenueOwnerEvent, EventStatus } from "../../types/VenueOwnerEvent";
import { VenueLocation } from "../../types/venueLocation";
import { venueOwnerProfileService } from "../../services/venueOwnerProfileService";

const { width: screenWidth } = Dimensions.get('window');

interface LocationFilter {
  locationId: number | null;
  locationName: string;
}

interface StatusFilter {
  status: EventStatus | null;
  statusName: string;
}

export default function VenueOwnerEventsScreen() {
  const {
    dashboardData,
    events,
    loading,
    error,
    refreshing,
    getDashboardData,
    refreshEvents,
    clearError,
    showErrorAlert,
    getEventsByLocationId,
  } = useVenueOwnerEvent();

  const navigation = useNavigation();

  const { getLocationsByOwnerId, loading: locationsLoading } =
    useVenueOwnerLocation();

  // Show past events toggle
  const [showPastEvents, setShowPastEvents] = useState(false);

  // Filter states
  const [userLocations, setUserLocations] = useState<VenueLocation[]>([]);
  const [selectedLocationFilter, setSelectedLocationFilter] =
    useState<LocationFilter>({
      locationId: null,
      locationName: "Tất cả địa điểm",
    });
  const [selectedStatusFilter, setSelectedStatusFilter] =
    useState<StatusFilter>({
      status: null,
      statusName: "Tất cả trạng thái",
    });
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Filter options
  const statusFilters: StatusFilter[] = [
    { status: null, statusName: "Tất cả trạng thái" },
    { status: "Draft", statusName: "Bản nháp" },
    { status: "Open", statusName: "Đang mở đăng ký" },
    { status: "Active", statusName: "Đang diễn ra" },
    { status: "Closed", statusName: "Đã đóng" },
    { status: "Cancelled", statusName: "Đã hủy" },
  ];

  // Load event data when component mounts
  useEffect(() => {
    loadEventData();
  }, []);

  const getCurrentUserId = async (): Promise<number | null> => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.log("ℹ️ No token found");
        return null;
      }

      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const payload = parts[1];
      const paddedPayload =
        payload + "=".repeat((4 - (payload.length % 4)) % 4);
      const decodedPayload = atob(paddedPayload);
      const payloadObj = JSON.parse(decodedPayload);

      const userIdStr =
        payloadObj[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
        ];
      const userId = parseInt(userIdStr, 10);

      console.log("✅ Current user ID from JWT:", userId);
      return userId;
    } catch (error) {
      console.error("❌ Error extracting user ID from JWT:", error);
      return null;
    }
  };

  const loadEventData = async () => {
    try {
      console.log("🏗️ Loading event data for venue owner...");

      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        console.error("❌ Could not get current user ID from JWT");
        showErrorAlert("Không thể xác thực người dùng");
        return;
      }

      console.log("👤 Current user ID:", currentUserId);

      const locationOwner =
        await venueOwnerProfileService.getLocationOwnerByUserId(currentUserId);

      if (!locationOwner) {
        console.log(
          "ℹ️ No LocationOwner record found for userId:",
          currentUserId
        );
        showErrorAlert("Bạn chưa đăng ký làm chủ địa điểm");
        return;
      }

      console.log("✅ LocationOwner found:", {
        locationOwnerId: locationOwner.locationOwnerId,
        userId: locationOwner.userId,
        businessName: locationOwner.businessName,
      });

      const locations = await getLocationsByOwnerId(
        locationOwner.locationOwnerId
      );

      console.log("🏗 Locations detail:", JSON.stringify(locations, null, 2));
      console.log("✅ Locations count:", locations.length);

      setUserLocations(locations);

      locations.forEach((loc, index) => {
        console.log(`Location ${index + 1}:`, {
          locationId: loc.locationId,
          locationOwnerId: loc.locationOwnerId,
          name: loc.name,
        });
      });

      if (locations.length === 0) {
        console.log(
          "ℹ️ No locations found for locationOwnerId:",
          locationOwner.locationOwnerId
        );
        return;
      }

      const locationIds = locations.map((location) => location.locationId);
      console.log("📅 Getting events for locations:", locationIds);

      for (const locationId of locationIds) {
        console.log(`🎯 Getting events for location ${locationId}...`);
        try {
          const locationEvents = await getEventsByLocationId(locationId);
          console.log(
            `✅ Location ${locationId} has ${locationEvents.length} events:`,
            locationEvents.map((e) => ({
              id: e.eventId,
              name: e.name,
              status: e.status,
            }))
          );
        } catch (err) {
          console.error(
            `❌ Error getting events for location ${locationId}:`,
            err
          );
        }
      }

      await getDashboardData(locationIds);
      console.log("✅ Dashboard data loaded successfully");
    } catch (error) {
      console.error("❌ Error loading event data:", error);
      showErrorAlert("Không thể tải dữ liệu sự kiện");
    }
  };

  const handleRefresh = async () => {
    try {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) return;

      const locationOwner =
        await venueOwnerProfileService.getLocationOwnerByUserId(currentUserId);
      if (!locationOwner) return;

      const locations = await getLocationsByOwnerId(
        locationOwner.locationOwnerId
      );
      const locationIds = locations.map((location) => location.locationId);

      setUserLocations(locations);

      await refreshEvents(undefined, locationIds);
    } catch (error) {
      console.error("❌ Refresh error:", error);
    }
  };

  // Check if event is in the past based on end date
  const isEventInPast = (event: VenueOwnerEvent): boolean => {
    const now = new Date();
    const eventEnd = new Date(event.endDate);
    return eventEnd < now;
  };

  // Filter events based on selected filters and past events toggle
  const getFilteredEvents = (): VenueOwnerEvent[] => {
    let filteredEvents = [...events];

    // Filter by past events toggle (default: hide past events)
    if (!showPastEvents) {
      filteredEvents = filteredEvents.filter((event) => !isEventInPast(event));
    }

    // Filter by location
    if (selectedLocationFilter.locationId) {
      filteredEvents = filteredEvents.filter(
        (event) => event.locationId === selectedLocationFilter.locationId
      );
    }

    // Filter by status
    if (selectedStatusFilter.status) {
      filteredEvents = filteredEvents.filter(
        (event) => event.status === selectedStatusFilter.status
      );
    }

    return filteredEvents;
  };

  // Get location name by locationId
  const getLocationName = (locationId: number): string => {
    const location = userLocations.find((loc) => loc.locationId === locationId);
    return location?.name || "Địa điểm không xác định";
  };

  // Get events count by location (only current events for overview)
  const getLocationEventCounts = () => {
    const currentEvents = events.filter((event) => !isEventInPast(event));

    return userLocations.map((location) => ({
      ...location,
      eventCount: currentEvents.filter(
        (event) => event.locationId === location.locationId
      ).length,
      activeEventCount: currentEvents.filter(
        (event) =>
          event.locationId === location.locationId &&
          (event.status === "Active" || event.status === "Open")
      ).length,
    }));
  };

  const getEventStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          dot: "bg-green-500",
        };
      case "open":
        return {
          bg: "bg-blue-100",
          text: "text-blue-800",
          dot: "bg-blue-500",
        };
      case "draft":
        return {
          bg: "bg-yellow-100",
          text: "text-yellow-800",
          dot: "bg-yellow-500",
        };
      case "closed":
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          dot: "bg-gray-500",
        };
      case "cancelled":
        return {
          bg: "bg-red-100",
          text: "text-red-800",
          dot: "bg-red-500",
        };
      default:
        return {
          bg: "bg-gray-100",
          text: "text-gray-800",
          dot: "bg-gray-500",
        };
    }
  };

  const getEventStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "Đang diễn ra";
      case "open":
        return "Đang mở đăng ký";
      case "draft":
        return "Bản nháp";
      case "closed":
        return "Đã đóng";
      case "cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const handleEventPress = (event: VenueOwnerEvent) => {
    console.log("🎯 Event pressed:", event.name);
    console.log("🔍 Navigating to detail with eventId:", event.eventId);

    try {
      navigation.navigate("VenueOwnerEventDetail", {
        eventId: event.eventId,
        eventName: event.name,
      });
    } catch (error) {
      console.error("❌ Navigation error:", error);
      Alert.alert("Lỗi", "Không thể mở chi tiết sự kiện");
    }
  };

  const handleCreateEvent = () => {
    console.log("➕ Create event pressed");
    if (userLocations.length === 0) {
      Alert.alert(
        "Chưa có địa điểm",
        "Bạn cần tạo ít nhất một địa điểm trước khi tạo sự kiện",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Tạo địa điểm",
            onPress: () => navigation.navigate("VenueManagement"),
          },
        ]
      );
      return;
    }

    navigation.navigate("VenueOwnerCreateEvent");
  };

  const handleLocationFilter = (location: LocationFilter) => {
    setSelectedLocationFilter(location);
    setShowLocationModal(false);
  };

  const handleStatusFilter = (status: StatusFilter) => {
    setSelectedStatusFilter(status);
    setShowStatusModal(false);
  };

  // Get event cover image or fallback
  const getEventCoverImage = (event: VenueOwnerEvent): string => {
    // If event has primaryImage, use it
    if (event.primaryImage?.url) {
      return event.primaryImage.url;
    }

    // Fallback to a default event image or location image
    return "https://images.unsplash.com/photo-1511578314322-379afb476865?w=400&h=250&fit=crop&q=80";
  };

  const filteredEvents = getFilteredEvents();
  const locationEventCounts = getLocationEventCounts();

  // Count past events
  const pastEventsCount = events.filter(isEventInPast).length;

  // Loading state
  if (loading || locationsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">Đang tải sự kiện...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-red-100 p-4 rounded-full mb-4">
            <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
          </View>
          <Text className="text-gray-900 font-medium mb-2 text-center">
            Có lỗi xảy ra
          </Text>
          <Text className="text-gray-500 text-center mb-4">{error}</Text>
          <TouchableOpacity
            className="bg-blue-500 px-6 py-3 rounded-lg"
            onPress={() => {
              clearError();
              loadEventData();
            }}
          >
            <Text className="text-white font-semibold">Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
          />
        }
      >
        {/* Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-100">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Sự kiện</Text>
              <Text className="text-gray-600 mt-1">
                Quản lý sự kiện và khuyến mãi
              </Text>
            </View>
            <TouchableOpacity
              className="bg-blue-500 p-3 rounded-full shadow-sm"
              onPress={handleCreateEvent}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Dashboard Summary */}
          {dashboardData && (
            <View className="mt-6">
              <View className="flex-row space-x-3">
                <View className="flex-1 bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <Text className="text-blue-800 font-bold text-xl">
                    {dashboardData.summary.totalEvents}
                  </Text>
                  <Text className="text-blue-600 text-sm font-medium mt-1">
                    Tổng sự kiện
                  </Text>
                </View>
                <View className="flex-1 bg-green-50 p-4 rounded-xl border border-green-100">
                  <Text className="text-green-800 font-bold text-xl">
                    {dashboardData.summary.activeEvents}
                  </Text>
                  <Text className="text-green-600 text-sm font-medium mt-1">
                    Đang hoạt động
                  </Text>
                </View>
                <View className="flex-1 bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <Text className="text-orange-800 font-bold text-base" numberOfLines={1}>
                    {formatCurrency(dashboardData.summary.totalRevenue)}
                  </Text>
                  <Text className="text-orange-600 text-sm font-medium mt-1">
                    Doanh thu
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Locations Overview */}
        {userLocations.length > 1 && (
          <View className="px-4 mt-6">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Tổng quan địa điểm
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-4">
                {locationEventCounts.map((location) => (
                  <TouchableOpacity
                    key={location.locationId}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 min-w-[160px]"
                    onPress={() =>
                      handleLocationFilter({
                        locationId: location.locationId,
                        locationName: location.name,
                      })
                    }
                  >
                    <Text
                      className="font-semibold text-gray-900 text-sm"
                      numberOfLines={2}
                    >
                      {location.name}
                    </Text>
                    <View className="flex-row justify-between items-center mt-3">
                      <View>
                        <Text className="text-blue-600 font-bold text-lg">
                          {location.eventCount}
                        </Text>
                        <Text className="text-xs text-gray-500">Sự kiện</Text>
                      </View>
                      <View>
                        <Text className="text-green-600 font-bold text-lg">
                          {location.activeEventCount}
                        </Text>
                        <Text className="text-xs text-gray-500">Hoạt động</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Filters */}
        <View className="px-4 mt-6">
          <View className="flex-row space-x-3">
            {/* Location Filter */}
            <TouchableOpacity
              className="flex-1 bg-white px-4 py-3 rounded-xl border border-gray-200 flex-row items-center justify-between shadow-sm"
              onPress={() => setShowLocationModal(true)}
            >
              <View className="flex-row items-center flex-1">
                <Ionicons name="location-outline" size={16} color="#6B7280" />
                <Text className="ml-2 text-gray-700 flex-1" numberOfLines={1}>
                  {selectedLocationFilter.locationName}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>

            {/* Status Filter */}
            <TouchableOpacity
              className="flex-1 bg-white px-4 py-3 rounded-xl border border-gray-200 flex-row items-center justify-between shadow-sm"
              onPress={() => setShowStatusModal(true)}
            >
              <View className="flex-row items-center flex-1">
                <Ionicons name="flag-outline" size={16} color="#6B7280" />
                <Text className="ml-2 text-gray-700 flex-1" numberOfLines={1}>
                  {selectedStatusFilter.statusName}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Active Filters Display & Past Events Toggle */}
          <View className="mt-4">
            {/* Active Filters */}
            {(selectedLocationFilter.locationId ||
              selectedStatusFilter.status) && (
                <View className="flex-row items-center mb-3">
                  <Text className="text-sm text-gray-500 mr-2">
                    Bộ lọc hiện tại:
                  </Text>
                  <View className="flex-row space-x-2">
                    {selectedLocationFilter.locationId && (
                      <TouchableOpacity
                        className="bg-blue-100 px-3 py-1 rounded-full flex-row items-center"
                        onPress={() =>
                          handleLocationFilter({
                            locationId: null,
                            locationName: "Tất cả địa điểm",
                          })
                        }
                      >
                        <Text className="text-blue-800 text-xs mr-1">
                          {selectedLocationFilter.locationName}
                        </Text>
                        <Ionicons name="close" size={12} color="#1E40AF" />
                      </TouchableOpacity>
                    )}
                    {selectedStatusFilter.status && (
                      <TouchableOpacity
                        className="bg-purple-100 px-3 py-1 rounded-full flex-row items-center"
                        onPress={() =>
                          handleStatusFilter({
                            status: null,
                            statusName: "Tất cả trạng thái",
                          })
                        }
                      >
                        <Text className="text-purple-800 text-xs mr-1">
                          {selectedStatusFilter.statusName}
                        </Text>
                        <Ionicons name="close" size={12} color="#7C3AED" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

            {/* Past Events Toggle */}
            {pastEventsCount > 0 && (
              <View className="flex-row justify-between items-center bg-white px-4 py-3 rounded-xl border border-gray-200 shadow-sm">
                <View>
                  <Text className="text-sm text-gray-700 font-medium">
                    Hiển thị sự kiện cũ
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {pastEventsCount} sự kiện đã kết thúc
                  </Text>
                </View>
                <TouchableOpacity
                  className={`w-12 h-6 rounded-full p-1 ${showPastEvents ? "bg-blue-500" : "bg-gray-300"
                    }`}
                  onPress={() => setShowPastEvents(!showPastEvents)}
                >
                  <View
                    className={`w-4 h-4 rounded-full bg-white transform transition-transform ${showPastEvents ? "translate-x-6" : "translate-x-0"
                      }`}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Events List */}
        <View className="px-4 mt-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900">
              Sự kiện ({filteredEvents.length})
            </Text>
          </View>

          {filteredEvents.length > 0 ? (
            <View className="space-y-4">
              {filteredEvents.map((event) => {
                const statusStyle = getEventStatusColor(event.status);
                const isPastEvent = isEventInPast(event);
                const coverImage = getEventCoverImage(event);

                return (
                  <TouchableOpacity
                    key={event.eventId}
                    className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden ${isPastEvent ? "opacity-75" : ""
                      }`}
                    onPress={() => handleEventPress(event)}
                    style={{ marginBottom: 16 }}
                  >
                    {/* Event Cover Image */}
                    <View className="relative">
                      <Image
                        source={{ uri: coverImage }}
                        className="w-full h-48 bg-gray-200"
                        resizeMode="cover"
                      />

                      {/* Status Badge */}
                      <View className="absolute top-3 right-3">
                        <View className={`px-3 py-1.5 rounded-full ${statusStyle.bg}`}>
                          <View className="flex-row items-center">
                            <View className={`w-2 h-2 rounded-full mr-2 ${statusStyle.dot}`} />
                            <Text className={`text-xs font-medium ${statusStyle.text}`}>
                              {getEventStatusText(event.status)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Past Event Indicator */}
                      {isPastEvent && (
                        <View className="absolute top-3 left-3">
                          <View className="bg-gray-900/80 px-3 py-1.5 rounded-full">
                            <Text className="text-xs text-white font-medium">
                              Đã kết thúc
                            </Text>
                          </View>
                        </View>
                      )}

                      {/* Gradient Overlay */}
                      <View className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                    </View>

                    {/* Event Content */}
                    <View className="p-4">
                      {/* Event Title & Location */}
                      <View className="mb-3">
                        <Text className="text-lg font-bold text-gray-900 mb-1" numberOfLines={2}>
                          {event.name}
                        </Text>
                        <View className="flex-row items-center">
                          <Ionicons name="location-outline" size={14} color="#6B7280" />
                          <Text className="ml-1 text-sm text-gray-500 font-medium" numberOfLines={1}>
                            {getLocationName(event.locationId)}
                          </Text>
                        </View>
                      </View>

                      {/* Description - Only show first line */}
                      {event.description && (
                        <Text className="text-gray-600 text-sm mb-3" numberOfLines={1}>
                          {event.description}
                        </Text>
                      )}

                      {/* Date & Price */}
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-row items-center">
                          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                          <Text className="ml-2 text-sm text-gray-500 font-medium">
                            {formatDate(event.startDate)} - {formatDate(event.endDate)}
                          </Text>
                        </View>

                        {event.discountedPrice && event.originalPrice && (
                          <View className="flex-row items-center">
                            <Text className="text-xs text-gray-400 line-through mr-2">
                              {formatCurrency(event.originalPrice)}
                            </Text>
                            <Text className="text-sm font-bold text-red-600">
                              {formatCurrency(event.discountedPrice)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Event Stats */}
                      <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
                        <View className="flex-row items-center">
                          <Ionicons name="people-outline" size={16} color="#6B7280" />
                          <Text className="ml-1 text-sm text-gray-500 font-medium">
                            {event.approvedPhotographersCount || 0} nhiếp ảnh gia
                          </Text>
                        </View>

                        <View className="flex-row items-center">
                          <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                          <Text className="ml-1 text-sm text-gray-500 font-medium">
                            {event.totalBookingsCount || 0} booking
                          </Text>
                        </View>

                        <View className="flex-row items-center">
                          <Ionicons name="eye-outline" size={16} color="#6B7280" />
                          <Text className="ml-1 text-sm text-gray-500 font-medium">
                            {event.totalApplicationsCount || 0} đăng ký
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <View className="items-center">
                <View className="bg-gray-100 p-6 rounded-full mb-4">
                  <Ionicons name="calendar-outline" size={40} color="#6B7280" />
                </View>
                <Text className="text-gray-900 font-semibold text-lg mb-2">
                  {selectedLocationFilter.locationId ||
                    selectedStatusFilter.status
                    ? "Không tìm thấy sự kiện phù hợp"
                    : "Chưa có sự kiện nào"}
                </Text>
                <Text className="text-gray-500 text-center mb-6 leading-6">
                  {selectedLocationFilter.locationId ||
                    selectedStatusFilter.status
                    ? "Thử thay đổi bộ lọc để xem thêm sự kiện"
                    : "Tạo sự kiện để thu hút khách hàng đến địa điểm của bạn"}
                </Text>
                {!selectedLocationFilter.locationId &&
                  !selectedStatusFilter.status && (
                    <TouchableOpacity
                      className="bg-blue-500 px-6 py-3 rounded-xl shadow-sm"
                      onPress={handleCreateEvent}
                    >
                      <Text className="text-white font-semibold">
                        Tạo sự kiện đầu tiên
                      </Text>
                    </TouchableOpacity>
                  )}
              </View>
            </View>
          )}
        </View>

        {/* Event Ideas - Only show when no current events and no filters */}
        {filteredEvents.length === 0 &&
          !selectedLocationFilter.locationId &&
          !selectedStatusFilter.status &&
          !showPastEvents && (
            <View className="mx-4 mt-6">
              <Text className="text-lg font-semibold text-gray-900 mb-4">
                Ý tưởng sự kiện
              </Text>

              <View className="space-y-3">
                <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <View className="flex-row items-center">
                    <View className="bg-yellow-100 p-3 rounded-full mr-4">
                      <Ionicons name="star-outline" size={24} color="#F59E0B" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold text-base">
                        Khuyến mãi cuối tuần
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        Giảm giá đặc biệt cho các ngày cuối tuần
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <View className="flex-row items-center">
                    <View className="bg-pink-100 p-3 rounded-full mr-4">
                      <Ionicons name="heart-outline" size={24} color="#EC4899" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold text-base">
                        Gói Valentine
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        Ưu đãi đặc biệt cho các cặp đôi
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                  <View className="flex-row items-center">
                    <View className="bg-green-100 p-3 rounded-full mr-4">
                      <Ionicons name="camera-outline" size={24} color="#10B981" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold text-base">
                        Workshop chụp ảnh
                      </Text>
                      <Text className="text-gray-500 text-sm mt-1">
                        Tổ chức lớp học chụp ảnh tại địa điểm
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}
      </ScrollView>

      {/* Location Filter Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowLocationModal(false)}
        >
          <Pressable className="bg-white rounded-t-3xl p-6 max-h-96">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-gray-900">
                Chọn địa điểm
              </Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                className={`p-4 rounded-xl mb-3 ${selectedLocationFilter.locationId === null
                    ? "bg-blue-50 border border-blue-200"
                    : "bg-gray-50"
                  }`}
                onPress={() =>
                  handleLocationFilter({
                    locationId: null,
                    locationName: "Tất cả địa điểm",
                  })
                }
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons
                      name="apps-outline"
                      size={20}
                      color={
                        selectedLocationFilter.locationId === null
                          ? "#3B82F6"
                          : "#6B7280"
                      }
                    />
                    <Text
                      className={`ml-3 font-medium ${selectedLocationFilter.locationId === null
                          ? "text-blue-600"
                          : "text-gray-700"
                        }`}
                    >
                      Tất cả địa điểm
                    </Text>
                  </View>
                  {selectedLocationFilter.locationId === null && (
                    <Ionicons name="checkmark" size={20} color="#3B82F6" />
                  )}
                </View>
                <Text className="text-sm text-gray-500 ml-8 mt-1">
                  Hiển thị sự kiện từ tất cả {userLocations.length} địa điểm
                </Text>
              </TouchableOpacity>

              {userLocations.map((location) => {
                const eventCount = events.filter(
                  (e) => e.locationId === location.locationId
                ).length;
                const isSelected =
                  selectedLocationFilter.locationId === location.locationId;

                return (
                  <TouchableOpacity
                    key={location.locationId}
                    className={`p-4 rounded-xl mb-3 ${isSelected
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-gray-50"
                      }`}
                    onPress={() =>
                      handleLocationFilter({
                        locationId: location.locationId,
                        locationName: location.name,
                      })
                    }
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <Ionicons
                          name="location-outline"
                          size={20}
                          color={isSelected ? "#3B82F6" : "#6B7280"}
                        />
                        <View className="ml-3 flex-1">
                          <Text
                            className={`font-medium ${isSelected ? "text-blue-600" : "text-gray-700"
                              }`}
                            numberOfLines={1}
                          >
                            {location.name}
                          </Text>
                          <Text
                            className="text-sm text-gray-500"
                            numberOfLines={1}
                          >
                            {location.address}
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center ml-2">
                        <View className="bg-gray-200 px-2 py-1 rounded-full mr-2">
                          <Text className="text-xs text-gray-600 font-medium">
                            {eventCount} sự kiện
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark" size={20} color="#3B82F6" />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Status Filter Modal */}
      <Modal
        visible={showStatusModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStatusModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowStatusModal(false)}
        >
          <Pressable className="bg-white rounded-t-3xl p-6 max-h-96">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-gray-900">
                Chọn trạng thái
              </Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {statusFilters.map((statusFilter) => {
                const eventCount = statusFilter.status
                  ? events.filter((e) => e.status === statusFilter.status)
                    .length
                  : events.length;
                const isSelected =
                  selectedStatusFilter.status === statusFilter.status;

                return (
                  <TouchableOpacity
                    key={statusFilter.status || "all"}
                    className={`p-4 rounded-xl mb-3 ${isSelected
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-gray-50"
                      }`}
                    onPress={() => handleStatusFilter(statusFilter)}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons
                          name={
                            statusFilter.status
                              ? "flag-outline"
                              : "apps-outline"
                          }
                          size={20}
                          color={isSelected ? "#3B82F6" : "#6B7280"}
                        />
                        <Text
                          className={`ml-3 font-medium ${isSelected ? "text-blue-600" : "text-gray-700"
                            }`}
                        >
                          {statusFilter.statusName}
                        </Text>
                      </View>
                      <View className="flex-row items-center">
                        <View className="bg-gray-200 px-2 py-1 rounded-full mr-2">
                          <Text className="text-xs text-gray-600 font-medium">
                            {eventCount} sự kiện
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark" size={20} color="#3B82F6" />
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}