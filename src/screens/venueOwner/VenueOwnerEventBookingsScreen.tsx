// screens/venueOwner/VenueOwnerEventBookingsScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useVenueOwnerEvent } from "../../hooks/useVenueOwnerEvent";
import { EventBooking } from "../../types/VenueOwnerEvent";

interface BookingsScreenProps {
  navigation: any;
  route: {
    params: {
      eventId: number;
      eventName?: string;
    };
  };
}

type FilterPeriod = "all" | "today" | "week" | "month";
type SortOption = "date" | "amount" | "photographer";

const VenueOwnerEventBookingsScreen: React.FC<BookingsScreenProps> = ({
  navigation,
  route,
}) => {
  const { eventId, eventName } = route.params;

  // Hooks
  const { bookings, loading, error, getEventBookings, clearError } =
    useVenueOwnerEvent();

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("all");
  const [sortOption, setSortOption] = useState<SortOption>("date");
  const [showSortModal, setShowSortModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<EventBooking | null>(
    null
  );
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Load data on mount
  useEffect(() => {
    loadBookings();
  }, [eventId]);

  const loadBookings = async () => {
    try {
      await getEventBookings(eventId);
    } catch (error) {
      console.error("❌ Load bookings error:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadBookings();
    } catch (error) {
      console.error("❌ Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Filter and sort bookings
  const getFilteredAndSortedBookings = () => {
    let filtered = [...bookings];

    // Apply time filter
    const now = new Date();
    switch (filterPeriod) {
      case "today":
        filtered = filtered.filter((booking) => {
          const bookingDate = new Date(booking.startDatetime);
          return bookingDate.toDateString() === now.toDateString();
        });
        break;
      case "week":
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter((booking) => {
          const bookingDate = new Date(booking.startDatetime);
          return bookingDate >= weekAgo;
        });
        break;
      case "month":
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter((booking) => {
          const bookingDate = new Date(booking.startDatetime);
          return bookingDate >= monthAgo;
        });
        break;
    }

    // Apply sort
    switch (sortOption) {
      case "date":
        filtered.sort(
          (a, b) =>
            new Date(b.startDatetime).getTime() -
            new Date(a.startDatetime).getTime()
        );
        break;
      case "amount":
        filtered.sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0));
        break;
      case "photographer":
        filtered.sort((a, b) =>
          (a.photographer?.fullName || "").localeCompare(
            b.photographer?.fullName || ""
          )
        );
        break;
    }

    return filtered;
  };

  const filteredBookings = getFilteredAndSortedBookings();

  // Calculate statistics
  const statistics = {
    totalBookings: bookings.length,
    totalRevenue: bookings.reduce(
      (sum, booking) => sum + (booking.totalAmount || 0),
      0
    ),
    averageAmount:
      bookings.length > 0
        ? bookings.reduce(
            (sum, booking) => sum + (booking.totalAmount || 0),
            0
          ) / bookings.length
        : 0,
    completedBookings: bookings.filter(
      (booking) => booking.status === "completed"
    ).length,
    upcomingBookings: bookings.filter((booking) => {
      const bookingDate = new Date(booking.startDatetime);
      return bookingDate > new Date() && booking.status === "confirmed";
    }).length,
  };

  // Handle booking detail
  const handleBookingPress = (booking: EventBooking) => {
    setSelectedBooking(booking);
    setShowBookingModal(true);
  };

  // Helper functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case "confirmed":
        return "Đã xác nhận";
      case "pending":
        return "Chờ xác nhận";
      case "completed":
        return "Hoàn thành";
      case "cancelled":
        return "Đã hủy";
      default:
        return status || "Không xác định";
    }
  };

  const getDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
    return `${diffHours}h`;
  };

  // Filter options
  const filterOptions = [
    { value: "all", label: "Tất cả" },
    { value: "today", label: "Hôm nay" },
    { value: "week", label: "7 ngày" },
    { value: "month", label: "30 ngày" },
  ];

  const sortOptions = [
    { value: "date", label: "Ngày đặt", icon: "calendar-outline" },
    { value: "amount", label: "Giá tiền", icon: "cash-outline" },
    { value: "photographer", label: "Nhiếp ảnh gia", icon: "person-outline" },
  ];

  // Loading state
  if (loading && bookings.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">
            Đang tải danh sách đặt lịch...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-row items-center flex-1 mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
            <Text
              className="ml-2 text-lg font-medium text-gray-900"
              numberOfLines={1}
            >
              Booking sự kiện
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowSortModal(true)}
            className="bg-blue-50 p-2 rounded-lg"
          >
            <Ionicons name="funnel-outline" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {eventName && (
          <Text className="text-gray-600 mt-1" numberOfLines={1}>
            {eventName}
          </Text>
        )}
      </View>

      {/* Statistics */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <View className="flex-row justify-between">
          <View className="flex-1">
            <Text className="text-sm text-gray-500">Tổng booking</Text>
            <Text className="text-xl font-bold text-gray-900">
              {statistics.totalBookings}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm text-gray-500">Doanh thu</Text>
            <Text className="text-xl font-bold text-green-600">
              {formatCurrency(statistics.totalRevenue)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm text-gray-500">Sắp tới</Text>
            <Text className="text-xl font-bold text-blue-600">
              {statistics.upcomingBookings}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between mt-3">
          <View className="flex-1">
            <Text className="text-sm text-gray-500">Hoàn thành</Text>
            <Text className="text-lg font-semibold text-gray-900">
              {statistics.completedBookings}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm text-gray-500">Trung bình</Text>
            <Text className="text-lg font-semibold text-gray-900">
              {formatCurrency(statistics.averageAmount)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm text-gray-500">Hiển thị</Text>
            <Text className="text-lg font-semibold text-blue-600">
              {filteredBookings.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-3">
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setFilterPeriod(option.value as FilterPeriod)}
                className={`px-4 py-2 rounded-full border ${
                  filterPeriod === option.value
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Text
                  className={`font-medium ${
                    filterPeriod === option.value
                      ? "text-blue-700"
                      : "text-gray-600"
                  }`}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Bookings List */}
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
        {filteredBookings.length === 0 ? (
          <View className="flex-1 justify-center items-center py-12">
            <View className="bg-gray-100 p-4 rounded-full mb-4">
              <Ionicons name="calendar-outline" size={32} color="#6B7280" />
            </View>
            <Text className="text-gray-900 font-medium mb-2">
              Chưa có booking nào
            </Text>
            <Text className="text-gray-500 text-center">
              {filterPeriod === "all"
                ? "Chưa có ai đặt lịch trong sự kiện này"
                : `Không có booking nào trong khoảng thời gian "${
                    filterOptions.find((f) => f.value === filterPeriod)?.label
                  }"`}
            </Text>
          </View>
        ) : (
          <View className="p-4 space-y-4">
            {filteredBookings.map((booking) => (
              <TouchableOpacity
                key={booking.eventBookingId}
                onPress={() => handleBookingPress(booking)}
                className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden"
              >
                <View className="p-4">
                  {/* Booking Header */}
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-row items-center flex-1 mr-4">
                      {/* Customer Info */}
                      <Image
                        source={{
                          uri:
                            booking.customer?.profileImage ||
                            "https://via.placeholder.com/50",
                        }}
                        className="w-12 h-12 rounded-full"
                      />
                      <View className="ml-3 flex-1">
                        <Text className="text-lg font-semibold text-gray-900">
                          {booking.customer?.fullName || "Khách hàng"}
                        </Text>
                        <Text className="text-gray-500">
                          {booking.customer?.phoneNumber || "Chưa có SĐT"}
                        </Text>
                      </View>
                    </View>

                    {/* Status Badge */}
                    <View
                      className={`px-3 py-1 rounded-full ${getStatusColor(
                        booking.status
                      )}`}
                    >
                      <Text className="text-sm font-medium">
                        {getStatusLabel(booking.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Photographer Info */}
                  <View className="flex-row items-center mb-3 bg-gray-50 p-3 rounded-lg">
                    <Ionicons name="camera-outline" size={16} color="#6B7280" />
                    <Text className="ml-2 text-gray-700 font-medium">
                      {booking.photographer?.fullName || "Nhiếp ảnh gia"}
                    </Text>
                    {booking.photographer?.rating && (
                      <View className="flex-row items-center ml-auto">
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text className="ml-1 text-sm text-gray-600">
                          {booking.photographer.rating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Booking Details */}
                  <View className="space-y-2">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text className="ml-2 text-gray-600">
                          {formatDate(booking.startDatetime)}
                        </Text>
                      </View>
                      <Text className="text-gray-600">
                        {formatTime(booking.startDatetime)} -{" "}
                        {formatTime(booking.endDatetime)}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons
                          name="time-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text className="ml-2 text-gray-600">Thời lượng</Text>
                      </View>
                      <Text className="text-gray-600">
                        {getDuration(
                          booking.startDatetime,
                          booking.endDatetime
                        )}
                      </Text>
                    </View>

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Ionicons
                          name="cash-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text className="ml-2 text-gray-600">Tổng tiền</Text>
                      </View>
                      <Text className="text-lg font-semibold text-green-600">
                        {formatCurrency(booking.totalAmount || 0)}
                      </Text>
                    </View>

                    {booking.specialRequests && (
                      <View className="bg-blue-50 p-3 rounded-lg mt-2">
                        <Text className="text-blue-800 font-medium mb-1">
                          Yêu cầu đặc biệt:
                        </Text>
                        <Text className="text-blue-700">
                          {booking.specialRequests}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Booking Actions */}
                  <View className="flex-row space-x-3 mt-4">
                    <TouchableOpacity
                      onPress={() => {
                        // Navigate to customer profile
                        navigation.navigate("ViewProfileUserScreen", {
                          userId: booking.userId,
                        });
                      }}
                      className="flex-1 bg-blue-50 py-2 rounded-lg"
                    >
                      <Text className="text-blue-700 font-medium text-center">
                        Xem khách hàng
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        // Navigate to photographer profile
                        navigation.navigate("PhotographerCardDetail", {
                          photographerId:
                            booking.eventPhotographerId.toString(),
                        });
                      }}
                      className="flex-1 bg-purple-50 py-2 rounded-lg"
                    >
                      <Text className="text-purple-700 font-medium text-center">
                        Xem nhiếp ảnh gia
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View className="h-6" />
      </ScrollView>

      {/* Sort Modal */}
      <Modal
        visible={showSortModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowSortModal(false)}
        >
          <Pressable className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-gray-900">
                Sắp xếp theo
              </Text>
              <TouchableOpacity onPress={() => setShowSortModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="space-y-2">
              {sortOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    setSortOption(option.value as SortOption);
                    setShowSortModal(false);
                  }}
                  className={`p-4 rounded-lg ${
                    sortOption === option.value
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-gray-50"
                  }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={
                          sortOption === option.value ? "#3B82F6" : "#6B7280"
                        }
                      />
                      <Text
                        className={`ml-3 font-medium ${
                          sortOption === option.value
                            ? "text-blue-700"
                            : "text-gray-600"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </View>
                    {sortOption === option.value && (
                      <Ionicons name="checkmark" size={20} color="#3B82F6" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Booking Detail Modal */}
      <Modal
        visible={showBookingModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBookingModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowBookingModal(false)}
        >
          <Pressable className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-gray-900">
                Chi tiết booking
              </Text>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedBooking && (
              <ScrollView className="flex-1">
                {/* Customer Info */}
                <View className="bg-gray-50 p-4 rounded-lg mb-4">
                  <Text className="text-lg font-semibold text-gray-900 mb-3">
                    Thông tin khách hàng
                  </Text>
                  <View className="flex-row items-center mb-3">
                    <Image
                      source={{
                        uri:
                          selectedBooking.customer?.profileImage ||
                          "https://via.placeholder.com/50",
                      }}
                      className="w-12 h-12 rounded-full"
                    />
                    <View className="ml-3">
                      <Text className="text-lg font-medium text-gray-900">
                        {selectedBooking.customer?.fullName || "Khách hàng"}
                      </Text>
                      <Text className="text-gray-500">
                        {selectedBooking.customer?.phoneNumber || "Chưa có SĐT"}
                      </Text>
                    </View>
                  </View>
                  {selectedBooking.customer?.email && (
                    <Text className="text-gray-600">
                      Email: {selectedBooking.customer.email}
                    </Text>
                  )}
                </View>

                {/* Photographer Info */}
                <View className="bg-blue-50 p-4 rounded-lg mb-4">
                  <Text className="text-lg font-semibold text-gray-900 mb-3">
                    Nhiếp ảnh gia
                  </Text>
                  <View className="flex-row items-center mb-3">
                    <Image
                      source={{
                        uri:
                          selectedBooking.photographer?.profileImage ||
                          "https://via.placeholder.com/50",
                      }}
                      className="w-12 h-12 rounded-full"
                    />
                    <View className="ml-3">
                      <Text className="text-lg font-medium text-gray-900">
                        {selectedBooking.photographer?.fullName ||
                          "Nhiếp ảnh gia"}
                      </Text>
                      {selectedBooking.photographer?.rating && (
                        <View className="flex-row items-center">
                          <Ionicons name="star" size={16} color="#F59E0B" />
                          <Text className="ml-1 text-gray-600">
                            {selectedBooking.photographer.rating.toFixed(1)} (
                            {selectedBooking.photographer.ratingCount || 0} đánh
                            giá)
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Booking Details */}
                <View className="bg-green-50 p-4 rounded-lg mb-4">
                  <Text className="text-lg font-semibold text-gray-900 mb-3">
                    Chi tiết đặt lịch
                  </Text>

                  <View className="space-y-3">
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Mã booking:</Text>
                      <Text className="font-medium text-gray-900">
                        #{selectedBooking.eventBookingId}
                      </Text>
                    </View>

                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Ngày chụp:</Text>
                      <Text className="font-medium text-gray-900">
                        {formatDate(selectedBooking.startDatetime)}
                      </Text>
                    </View>

                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Thời gian:</Text>
                      <Text className="font-medium text-gray-900">
                        {formatTime(selectedBooking.startDatetime)} -{" "}
                        {formatTime(selectedBooking.endDatetime)}
                      </Text>
                    </View>

                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Thời lượng:</Text>
                      <Text className="font-medium text-gray-900">
                        {getDuration(
                          selectedBooking.startDatetime,
                          selectedBooking.endDatetime
                        )}
                      </Text>
                    </View>

                    <View className="flex-row justify-between">
                      <Text className="text-gray-600">Trạng thái:</Text>
                      <View
                        className={`px-2 py-1 rounded ${getStatusColor(
                          selectedBooking.status
                        )}`}
                      >
                        <Text className="text-sm font-medium">
                          {getStatusLabel(selectedBooking.status)}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center border-t border-green-200 pt-3">
                      <Text className="text-gray-600 font-medium">
                        Tổng tiền:
                      </Text>
                      <Text className="text-xl font-bold text-green-600">
                        {formatCurrency(selectedBooking.totalAmount || 0)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Special Requests */}
                {selectedBooking.specialRequests && (
                  <View className="bg-yellow-50 p-4 rounded-lg mb-4">
                    <Text className="text-lg font-semibold text-gray-900 mb-2">
                      Yêu cầu đặc biệt
                    </Text>
                    <Text className="text-gray-700">
                      {selectedBooking.specialRequests}
                    </Text>
                  </View>
                )}

                {/* Timestamps */}
                <View className="bg-gray-50 p-4 rounded-lg">
                  <Text className="text-lg font-semibold text-gray-900 mb-3">
                    Lịch sử
                  </Text>
                  <View className="space-y-2">
                    <Text className="text-gray-600">
                      Đặt lịch: {formatDateTime(selectedBooking.createdAt)}
                    </Text>
                    {selectedBooking.updatedAt &&
                      selectedBooking.updatedAt !==
                        selectedBooking.createdAt && (
                        <Text className="text-gray-600">
                          Cập nhật: {formatDateTime(selectedBooking.updatedAt)}
                        </Text>
                      )}
                  </View>
                </View>
              </ScrollView>
            )}

            {/* Action Buttons */}
            <View className="flex-row space-x-3 mt-4">
              <TouchableOpacity
                onPress={() => setShowBookingModal(false)}
                className="flex-1 bg-gray-100 py-3 rounded-lg"
              >
                <Text className="text-gray-700 font-semibold text-center">
                  Đóng
                </Text>
              </TouchableOpacity>

              {selectedBooking && (
                <TouchableOpacity
                  onPress={() => {
                    setShowBookingModal(false);
                    // Navigate to booking detail screen
                    navigation.navigate("BookingDetailScreen", {
                      bookingId: selectedBooking.eventBookingId,
                    });
                  }}
                  className="flex-1 bg-blue-500 py-3 rounded-lg"
                >
                  <Text className="text-white font-semibold text-center">
                    Xem chi tiết
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default VenueOwnerEventBookingsScreen;
