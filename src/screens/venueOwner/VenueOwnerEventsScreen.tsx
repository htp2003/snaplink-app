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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useVenueOwnerEvent } from "../../hooks/useVenueOwnerEvent";
import { useVenueOwnerLocation } from "../../hooks/useVenueOwnerLocation";
import { VenueOwnerEvent, EventStatus } from "../../types/VenueOwnerEvent";
import { VenueLocation } from "../../types/venueLocation";
import { venueOwnerProfileService } from "../../services/venueOwnerProfileService";

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

      // JWT có 3 phần: header.payload.signature
      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      // Decode base64 payload (phần thứ 2)
      const payload = parts[1];

      // Add padding if needed for base64 decode
      const paddedPayload =
        payload + "=".repeat((4 - (payload.length % 4)) % 4);

      // Decode base64
      const decodedPayload = atob(paddedPayload);

      // Parse JSON
      const payloadObj = JSON.parse(decodedPayload);

      // Extract user ID
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

      // 1. Get current user ID from JWT token
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        console.error("❌ Could not get current user ID from JWT");
        showErrorAlert("Không thể xác thực người dùng");
        return;
      }

      console.log("👤 Current user ID:", currentUserId);

      // 2. Get LocationOwner record by userId to get locationOwnerId
      console.log("🏢 Getting LocationOwner for userId:", currentUserId);
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

      // 3. Get locations using locationOwnerId (not userId!)
      console.log(
        "📍 Getting locations for locationOwnerId:",
        locationOwner.locationOwnerId
      );
      const locations = await getLocationsByOwnerId(
        locationOwner.locationOwnerId
      );

      console.log("🔍 Locations detail:", JSON.stringify(locations, null, 2));
      console.log("✅ Locations count:", locations.length);

      // Store locations for filtering
      setUserLocations(locations);

      // Check từng location
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

      // 4. Get events cho tất cả locations
      const locationIds = locations.map((location) => location.locationId);
      console.log("📅 Getting events for locations:", locationIds);

      // Debug: Try getting events for each location individually
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
      // Get current user and locationOwner info again
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) return;

      const locationOwner =
        await venueOwnerProfileService.getLocationOwnerByUserId(currentUserId);
      if (!locationOwner) return;

      const locations = await getLocationsByOwnerId(
        locationOwner.locationOwnerId
      );
      const locationIds = locations.map((location) => location.locationId);

      // Update locations for filtering
      setUserLocations(locations);

      await refreshEvents(undefined, locationIds);
    } catch (error) {
      console.error("❌ Refresh error:", error);
    }
  };

  // Filter events based on selected filters
  const getFilteredEvents = (): VenueOwnerEvent[] => {
    let filteredEvents = [...events];

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

  // Get events count by location for dashboard
  const getLocationEventCounts = () => {
    return userLocations.map((location) => ({
      ...location,
      eventCount: events.filter(
        (event) => event.locationId === location.locationId
      ).length,
      activeEventCount: events.filter(
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
    console.log("📍 Navigating to detail with eventId:", event.eventId);

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
    // Check if user has locations first
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

  const filteredEvents = getFilteredEvents();
  const locationEventCounts = getLocationEventCounts();

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
          />
        }
      >
        {/* Header */}
        <View className="bg-white px-4 py-6">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Sự kiện</Text>
              <Text className="text-gray-600 mt-1">
                Quản lý sự kiện và khuyến mãi
              </Text>
            </View>
            <TouchableOpacity
              className="bg-blue-500 p-3 rounded-full"
              onPress={handleCreateEvent}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Dashboard Summary */}
          {dashboardData && (
            <View className="mt-6">
              <View className="flex-row space-x-4">
                <View className="flex-1 bg-blue-50 p-4 rounded-lg">
                  <Text className="text-blue-800 font-semibold text-lg">
                    {dashboardData.summary.totalEvents}
                  </Text>
                  <Text className="text-blue-600 text-sm">Tổng sự kiện</Text>
                </View>
                <View className="flex-1 bg-green-50 p-4 rounded-lg">
                  <Text className="text-green-800 font-semibold text-lg">
                    {dashboardData.summary.activeEvents}
                  </Text>
                  <Text className="text-green-600 text-sm">Đang hoạt động</Text>
                </View>
                <View className="flex-1 bg-orange-50 p-4 rounded-lg">
                  <Text className="text-orange-800 font-semibold text-lg">
                    {formatCurrency(dashboardData.summary.totalRevenue)}
                  </Text>
                  <Text className="text-orange-600 text-sm">Doanh thu</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Locations Overview */}
        {userLocations.length > 1 && (
          <View className="px-4 mt-4">
            <Text className="text-lg font-semibold text-gray-900 mb-3">
              Tổng quan địa điểm
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-3">
                {locationEventCounts.map((location) => (
                  <TouchableOpacity
                    key={location.locationId}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 min-w-40"
                    onPress={() =>
                      handleLocationFilter({
                        locationId: location.locationId,
                        locationName: location.name,
                      })
                    }
                  >
                    <Text
                      className="font-medium text-gray-900 text-sm"
                      numberOfLines={2}
                    >
                      {location.name}
                    </Text>
                    <View className="flex-row justify-between items-center mt-2">
                      <View>
                        <Text className="text-blue-600 font-semibold">
                          {location.eventCount}
                        </Text>
                        <Text className="text-xs text-gray-500">Sự kiện</Text>
                      </View>
                      <View>
                        <Text className="text-green-600 font-semibold">
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
              className="flex-1 bg-white px-4 py-3 rounded-lg border border-gray-200 flex-row items-center justify-between"
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
              className="flex-1 bg-white px-4 py-3 rounded-lg border border-gray-200 flex-row items-center justify-between"
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

          {/* Active Filters Display */}
          {(selectedLocationFilter.locationId ||
            selectedStatusFilter.status) && (
            <View className="flex-row items-center mt-3">
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
        </View>

        {/* Events List */}
        <View className="px-4 mt-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900">
              Sự kiện ({filteredEvents.length})
            </Text>
          </View>

          {filteredEvents.length > 0 ? (
            <View className="space-y-4 mb-6">
              {filteredEvents.map((event) => {
                const statusStyle = getEventStatusColor(event.status);

                return (
                  <TouchableOpacity
                    key={event.eventId}
                    className="bg-white rounded-lg shadow-sm border border-gray-100 p-4"
                    onPress={() => handleEventPress(event)}
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1 mr-2">
                        <Text className="text-lg font-semibold text-gray-900">
                          {event.name}
                        </Text>
                        {/* Location Name */}
                        <View className="flex-row items-center mt-1">
                          <Ionicons
                            name="location-outline"
                            size={14}
                            color="#6B7280"
                          />
                          <Text className="ml-1 text-sm text-gray-500 font-medium">
                            {getLocationName(event.locationId)}
                          </Text>
                        </View>
                      </View>
                      <View
                        className={`px-3 py-1 rounded-full ${statusStyle.bg}`}
                      >
                        <View className="flex-row items-center">
                          <View
                            className={`w-2 h-2 rounded-full mr-2 ${statusStyle.dot}`}
                          />
                          <Text
                            className={`text-xs font-medium ${statusStyle.text}`}
                          >
                            {getEventStatusText(event.status)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {event.description && (
                      <Text className="text-gray-600 mb-3">
                        {event.description}
                      </Text>
                    )}

                    <View className="flex-row items-center justify-between mb-2">
                      <View className="flex-row items-center">
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text className="ml-2 text-sm text-gray-500">
                          {formatDate(event.startDate)} -{" "}
                          {formatDate(event.endDate)}
                        </Text>
                      </View>

                      {event.discountedPrice && event.originalPrice && (
                        <View className="flex-row items-center">
                          <Text className="text-xs text-gray-400 line-through mr-2">
                            {formatCurrency(event.originalPrice)}
                          </Text>
                          <Text className="text-sm font-medium text-red-600">
                            {formatCurrency(event.discountedPrice)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Event Stats */}
                    <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
                      <View className="flex-row items-center">
                        <Ionicons
                          name="people-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text className="ml-1 text-sm text-gray-500">
                          {event.approvedPhotographersCount || 0} nhiếp ảnh gia
                        </Text>
                      </View>

                      <View className="flex-row items-center">
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text className="ml-1 text-sm text-gray-500">
                          {event.totalBookingsCount || 0} booking
                        </Text>
                      </View>

                      <View className="flex-row items-center">
                        <Ionicons
                          name="eye-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text className="ml-1 text-sm text-gray-500">
                          {event.totalApplicationsCount || 0} đăng ký
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
              <View className="items-center">
                <View className="bg-gray-100 p-4 rounded-full mb-4">
                  <Ionicons name="calendar-outline" size={32} color="#6B7280" />
                </View>
                <Text className="text-gray-900 font-medium mb-2">
                  {selectedLocationFilter.locationId ||
                  selectedStatusFilter.status
                    ? "Không tìm thấy sự kiện phù hợp"
                    : "Chưa có sự kiện nào"}
                </Text>
                <Text className="text-gray-500 text-center mb-4">
                  {selectedLocationFilter.locationId ||
                  selectedStatusFilter.status
                    ? "Thử thay đổi bộ lọc để xem thêm sự kiện"
                    : "Tạo sự kiện để thu hút khách hàng đến địa điểm của bạn"}
                </Text>
                {!selectedLocationFilter.locationId &&
                  !selectedStatusFilter.status && (
                    <TouchableOpacity
                      className="bg-blue-500 px-6 py-3 rounded-lg"
                      onPress={handleCreateEvent}
                    >
                      <Text className="text-white font-semibold">
                        Tạo sự kiện
                      </Text>
                    </TouchableOpacity>
                  )}
              </View>
            </View>
          )}
        </View>

        {/* Event Ideas */}
        <View className="mx-4 mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Ý tưởng sự kiện
          </Text>

          <View className="space-y-3">
            <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <View className="flex-row items-center">
                <View className="bg-yellow-100 p-3 rounded-full mr-4">
                  <Ionicons name="star-outline" size={20} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">
                    Khuyến mãi cuối tuần
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Giảm giá đặc biệt cho các ngày cuối tuần
                  </Text>
                </View>
              </View>
            </View>

            <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <View className="flex-row items-center">
                <View className="bg-pink-100 p-3 rounded-full mr-4">
                  <Ionicons name="heart-outline" size={20} color="#EC4899" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">
                    Gói Valentine
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Ưu đãi đặc biệt cho các cặp đôi
                  </Text>
                </View>
              </View>
            </View>

            <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <View className="flex-row items-center">
                <View className="bg-green-100 p-3 rounded-full mr-4">
                  <Ionicons name="camera-outline" size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">
                    Workshop chụp ảnh
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Tổ chức lớp học chụp ảnh tại địa điểm
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="h-6" />
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
                className={`p-4 rounded-lg mb-2 ${
                  selectedLocationFilter.locationId === null
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
                      className={`ml-3 font-medium ${
                        selectedLocationFilter.locationId === null
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
                    className={`p-4 rounded-lg mb-2 ${
                      isSelected
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
                            className={`font-medium ${
                              isSelected ? "text-blue-600" : "text-gray-700"
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
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color="#3B82F6"
                          />
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
                    className={`p-4 rounded-lg mb-2 ${
                      isSelected
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
                          className={`ml-3 font-medium ${
                            isSelected ? "text-blue-600" : "text-gray-700"
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
                          <Ionicons
                            name="checkmark"
                            size={20}
                            color="#3B82F6"
                          />
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
