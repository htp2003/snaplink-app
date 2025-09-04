// screens/venueOwner/VenueOwnerEventDetailScreen.tsx
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
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useVenueOwnerEvent } from "../../hooks/useVenueOwnerEvent";
import { useVenueOwnerEventImages } from "../../hooks/useVenueOwnerEventImages";
import {
  VenueOwnerEvent,
  EventStatus,
  ApplicationStatus,
} from "../../types/VenueOwnerEvent";

const { width: screenWidth } = Dimensions.get("window");

interface EventDetailScreenProps {
  navigation: any;
  route: {
    params: {
      eventId: number;
      eventName?: string;
    };
  };
}

const VenueOwnerEventDetailScreen: React.FC<EventDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { eventId, eventName } = route.params;

  // Hooks
  const {
    selectedEvent,
    applications,
    bookings,
    statistics,
    loading,
    error,
    getEventById,
    updateEventStatus,
    deleteEvent,
    getEventApplications,
    getEventBookings,
    getEventStatistics,
    respondToApplication,
    clearError,
  } = useVenueOwnerEvent();

  const {
    images,
    primaryImage,
    loading: imagesLoading,
    refresh: refreshImages,
  } = useVenueOwnerEventImages(eventId);

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Status options
  const statusOptions = [
    {
      value: "Draft",
      label: "Bản nháp",
      color: "bg-yellow-100 text-yellow-800",
    },
    {
      value: "Open",
      label: "Đang mở đăng ký",
      color: "bg-blue-100 text-blue-800",
    },
    {
      value: "Active",
      label: "Đang diễn ra",
      color: "bg-green-100 text-green-800",
    },
    { value: "Closed", label: "Đã đóng", color: "bg-gray-100 text-gray-800" },
    { value: "Cancelled", label: "Đã hủy", color: "bg-red-100 text-red-800" },
  ];

  // Load data on mount
  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      await Promise.all([
        getEventById(eventId),
        getEventApplications(eventId),
        getEventBookings(eventId),
        getEventStatistics(eventId),
      ]);
    } catch (error) {
      console.error("❌ Load event data error:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadEventData(), refreshImages()]);
    } catch (error) {
      console.error("❌ Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Status management
  const handleStatusChange = async (newStatus: EventStatus) => {
    setShowStatusModal(false);

    if (!selectedEvent || selectedEvent.status === newStatus) return;

    try {
      const success = await updateEventStatus(eventId, newStatus);
      if (success) {
        Alert.alert("Thành công", "Trạng thái sự kiện đã được cập nhật");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái sự kiện");
    }
  };

  // Event management
  const handleEditEvent = () => {
    navigation.navigate("VenueOwnerEditEvent", { eventId });
  };

  const handleDeleteEvent = () => {
    Alert.alert(
      "Xóa sự kiện",
      "Bạn có chắc chắn muốn xóa sự kiện này? Hành động này không thể hoàn tác.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const success = await deleteEvent(eventId);
              if (success) {
                Alert.alert("Thành công", "Sự kiện đã được xóa", [
                  { text: "OK", onPress: () => navigation.goBack() },
                ]);
              }
            } catch (error) {
              Alert.alert("Lỗi", "Không thể xóa sự kiện");
            }
          },
        },
      ]
    );
  };

  // Application management
  const handleApplicationResponse = async (
    photographerId: number,
    status: ApplicationStatus,
    rejectionReason?: string
  ) => {
    try {
      const success = await respondToApplication(
        eventId,
        photographerId,
        status,
        rejectionReason
      );

      if (success) {
        Alert.alert("Thành công", "Phản hồi đã được gửi");
        // Refresh applications
        getEventApplications(eventId);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể gửi phản hồi");
    }
  };

  // Image management
  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setShowImageModal(true);
  };

  const handleManageImages = () => {
    navigation.navigate("VenueOwnerEventImages", {
      eventId,
      eventName: selectedEvent?.name || eventName,
    });
  };

  // Helper functions
  const getStatusStyle = (status: string) => {
    const statusOption = statusOptions.find((opt) => opt.value === status);
    return statusOption?.color || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const statusOption = statusOptions.find((opt) => opt.value === status);
    return statusOption?.label || status;
  };

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
      hour12: true,
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const getEventDuration = () => {
    if (!selectedEvent) return "";

    const startDate = new Date(selectedEvent.startDate);
    const endDate = new Date(selectedEvent.endDate);

    // Kiểm tra xem có cùng ngày không
    const isSameDay = startDate.toDateString() === endDate.toDateString();

    if (isSameDay) {
      return `${formatDate(selectedEvent.startDate)} • ${formatTime(
        selectedEvent.startDate
      )} - ${formatTime(selectedEvent.endDate)}`;
    } else {
      return `${formatDateTime(selectedEvent.startDate)} - ${formatDateTime(
        selectedEvent.endDate
      )}`;
    }
  };

  // Loading state
  if (loading && !selectedEvent) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">
            Đang tải thông tin sự kiện...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !selectedEvent) {
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

  // Not found state
  if (!selectedEvent) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-gray-100 p-4 rounded-full mb-4">
            <Ionicons name="calendar-outline" size={32} color="#6B7280" />
          </View>
          <Text className="text-gray-900 font-medium mb-2 text-center">
            Không tìm thấy sự kiện
          </Text>
          <Text className="text-gray-500 text-center mb-4">
            Sự kiện không tồn tại hoặc đã bị xóa
          </Text>
          <TouchableOpacity
            className="bg-blue-500 px-6 py-3 rounded-lg"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-white font-semibold">Quay lại</Text>
          </TouchableOpacity>
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
              {selectedEvent.name}
            </Text>
          </TouchableOpacity>

          <View className="flex-row space-x-2">
            <TouchableOpacity
              onPress={handleEditEvent}
              className="p-2 bg-blue-50 rounded-lg"
            >
              <Ionicons name="pencil" size={20} color="#3B82F6" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowStatusModal(true)}
              className="p-2 bg-green-50 rounded-lg"
            >
              <Ionicons name="flag" size={20} color="#10B981" />
            </TouchableOpacity>

            {/* <TouchableOpacity
              onPress={handleDeleteEvent}
              className="p-2 bg-red-50 rounded-lg"
            >
              <Ionicons name="trash" size={20} color="#EF4444" />
            </TouchableOpacity> */}
          </View>
        </View>
      </View>

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
        {/* Event Images */}
        {images.length > 0 && (
          <View className="bg-white mb-4">
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              className="h-64"
            >
              {images.map((image, index) => (
                <TouchableOpacity
                  key={image.id}
                  onPress={() => handleImagePress(index)}
                  style={{ width: screenWidth }}
                >
                  <Image
                    source={{ uri: image.url }}
                    className="w-full h-full"
                    resizeMode="cover"
                  />
                  {image.isPrimary && (
                    <View className="absolute top-4 left-4 bg-blue-500 px-3 py-1 rounded-full">
                      <Text className="text-white text-sm font-medium">
                        Ảnh chính
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {images.length > 1 && (
              <View className="absolute bottom-4 self-center flex-row">
                {images.map((_, index) => (
                  <View
                    key={index}
                    className={`w-2 h-2 rounded-full mx-1 ${index === 0 ? "bg-white" : "bg-white/50"
                      }`}
                  />
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={handleManageImages}
              className="absolute top-4 right-4 bg-black bg-opacity-50 p-2 rounded-lg"
            >
              <Ionicons name="images" size={20} color="white" />
            </TouchableOpacity>
          </View>
        )}

        {/* Event Info */}
        <View className="bg-white p-4 mb-4">
          <View className="flex-row justify-between items-start mb-4">
            <View className="flex-1 mr-4">
              <Text className="text-2xl font-bold text-gray-900 mb-3">
                {selectedEvent.name}
              </Text>

              {/* Location */}
              <View className="flex-row items-center mb-3">
                <View className="bg-blue-100 p-2 rounded-lg mr-3">
                  <Ionicons name="location-outline" size={18} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500">Địa điểm</Text>
                  <Text className="text-gray-900 font-medium">
                    {selectedEvent.location?.name || "Địa điểm không xác định"}
                  </Text>
                </View>
              </View>

              {/* Date & Time */}
              <View className="flex-row items-center mb-3">
                <View className="bg-green-100 p-2 rounded-lg mr-3">
                  <Ionicons name="time-outline" size={18} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm text-gray-500">Thời gian</Text>
                  <Text className="text-gray-900 font-medium">
                    {getEventDuration()}
                  </Text>
                </View>
              </View>

              {/* Additional time info if multi-day event */}
              {new Date(selectedEvent.startDate).toDateString() !==
                new Date(selectedEvent.endDate).toDateString() && (
                  <View className="bg-blue-50 p-3 rounded-lg mb-3">
                    <View className="space-y-2">
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-blue-600">Bắt đầu:</Text>
                        <Text className="text-sm font-medium text-blue-900">
                          {formatDateTime(selectedEvent.startDate)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-sm text-blue-600">Kết thúc:</Text>
                        <Text className="text-sm font-medium text-blue-900">
                          {formatDateTime(selectedEvent.endDate)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
            </View>

            {/* Status Badge */}
            <View
              className={`px-3 py-2 rounded-full ${getStatusStyle(
                selectedEvent.status
              )}`}
            >
              <Text className="text-sm font-medium">
                {getStatusLabel(selectedEvent.status)}
              </Text>
            </View>
          </View>

          {/* Description */}
          {selectedEvent.description && (
            <View className="mb-4">
              <Text className="text-sm text-gray-500 mb-2">Mô tả sự kiện</Text>
              <Text className="text-gray-700 leading-5">
                {selectedEvent.description}
              </Text>
            </View>
          )}

          {/* Pricing */}
          {(selectedEvent.originalPrice || selectedEvent.discountedPrice) && (
            <View className="mb-4">
              <Text className="text-sm text-gray-500 mb-2">Giá cả</Text>
              <View className="flex-row items-center space-x-4">
                {selectedEvent.originalPrice &&
                  selectedEvent.discountedPrice && (
                    <>
                      <Text className="text-gray-500 line-through">
                        {formatCurrency(selectedEvent.originalPrice)}
                      </Text>
                      <Text className="text-red-600 font-semibold text-lg">
                        {formatCurrency(selectedEvent.discountedPrice)}
                      </Text>
                      <View className="bg-red-100 px-2 py-1 rounded">
                        <Text className="text-red-800 text-xs font-medium">
                          Giảm{" "}
                          {Math.round(
                            ((selectedEvent.originalPrice -
                              selectedEvent.discountedPrice) /
                              selectedEvent.originalPrice) *
                            100
                          )}
                          %
                        </Text>
                      </View>
                    </>
                  )}
                {selectedEvent.discountedPrice &&
                  !selectedEvent.originalPrice && (
                    <Text className="text-green-600 font-semibold text-lg">
                      {formatCurrency(selectedEvent.discountedPrice)}
                    </Text>
                  )}
                {selectedEvent.originalPrice &&
                  !selectedEvent.discountedPrice && (
                    <Text className="text-gray-900 font-semibold text-lg">
                      {formatCurrency(selectedEvent.originalPrice)}
                    </Text>
                  )}
              </View>
            </View>
          )}

          {/* Capacity Info */}
          <View className="bg-gray-50 p-4 rounded-lg">
            <Text className="text-sm text-gray-500 mb-3">Sức chứa</Text>
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-sm text-gray-500">
                  Nhiếp ảnh gia tối đa
                </Text>
                <Text className="text-lg font-semibold text-gray-900">
                  {selectedEvent.maxPhotographers}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-500">
                  Booking/slot tối đa
                </Text>
                <Text className="text-lg font-semibold text-gray-900">
                  {selectedEvent.maxBookingsPerSlot}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Statistics */}
        {statistics && (
          <View className="bg-white p-4 mb-4">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Thống kê
            </Text>

            <View className="space-y-3">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Tổng đăng ký</Text>
                <Text className="font-semibold text-gray-900">
                  {statistics.totalApplications}
                </Text>
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Đã duyệt</Text>
                <Text className="font-semibold text-green-600">
                  {statistics.approvedApplications}
                </Text>
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Đang chờ</Text>
                <Text className="font-semibold text-yellow-600">
                  {statistics.pendingApplications}
                </Text>
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-gray-600">Tổng booking</Text>
                <Text className="font-semibold text-blue-600">
                  {statistics.totalBookings}
                </Text>
              </View>

              <View className="flex-row justify-between items-center border-t border-gray-200 pt-3">
                <Text className="text-gray-600 font-medium">
                  Doanh thu ước tính
                </Text>
                <Text className="font-semibold text-green-600 text-lg">
                  {formatCurrency(statistics.totalRevenue)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View className="bg-white p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Quản lý
          </Text>

          <View className="space-y-3">
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("VenueOwnerEventApplications", { eventId })
              }
              className="flex-row items-center justify-between p-3 bg-blue-50 rounded-lg"
            >
              <View className="flex-row items-center">
                <Ionicons name="people-outline" size={20} color="#3B82F6" />
                <Text className="ml-3 font-medium text-blue-900">
                  Đăng ký tham gia
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-blue-600 font-semibold mr-2">
                  {applications.length}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate("VenueOwnerEventBookings", { eventId })
              }
              className="flex-row items-center justify-between p-3 bg-green-50 rounded-lg"
            >
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={20} color="#10B981" />
                <Text className="ml-3 font-medium text-green-900">
                  Booking sự kiện
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-green-600 font-semibold mr-2">
                  {bookings.length}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#10B981" />
              </View>
            </TouchableOpacity>

            {images.length === 0 && (
              <TouchableOpacity
                onPress={handleManageImages}
                className="flex-row items-center justify-between p-3 bg-purple-50 rounded-lg"
              >
                <View className="flex-row items-center">
                  <Ionicons name="images-outline" size={20} color="#8B5CF6" />
                  <Text className="ml-3 font-medium text-purple-900">
                    Thêm ảnh sự kiện
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Event Ideas */}
        <View className="mx-4 mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Gợi ý cải thiện
          </Text>

          <View className="space-y-3">
            {!selectedEvent.description && (
              <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <View className="flex-row items-center">
                  <View className="bg-orange-100 p-3 rounded-full mr-4">
                    <Ionicons name="create-outline" size={20} color="#F59E0B" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium">
                      Thêm mô tả sự kiện
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      Mô tả chi tiết giúp thu hút khách hàng
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {images.length === 0 && (
              <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <View className="flex-row items-center">
                  <View className="bg-purple-100 p-3 rounded-full mr-4">
                    <Ionicons name="images-outline" size={20} color="#8B5CF6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium">
                      Thêm ảnh sự kiện
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      Ảnh đẹp sẽ thu hút nhiều photographer đăng ký
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <View className="flex-row items-center">
                <View className="bg-green-100 p-3 rounded-full mr-4">
                  <Ionicons
                    name="megaphone-outline"
                    size={20}
                    color="#10B981"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">
                    Chia sẻ sự kiện
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Chia sẻ trên mạng xã hội để tăng lượt đăng ký
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="h-6" />
      </ScrollView>

      {/* Status Change Modal */}
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
          <Pressable className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-gray-900">
                Thay đổi trạng thái
              </Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="space-y-2">
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() =>
                    handleStatusChange(option.value as EventStatus)
                  }
                  className={`p-4 rounded-lg ${selectedEvent.status === option.value
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-gray-50"
                    }`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                      <View
                        className={`px-3 py-1 rounded-full ${option.color}`}
                      >
                        <Text className="text-sm font-medium">
                          {option.label}
                        </Text>
                      </View>
                    </View>
                    {selectedEvent.status === option.value && (
                      <Ionicons name="checkmark" size={20} color="#3B82F6" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Image Gallery Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <Pressable
          className="flex-1 bg-black"
          onPress={() => setShowImageModal(false)}
        >
          <SafeAreaView className="flex-1">
            <View className="absolute top-12 right-4 z-10">
              <TouchableOpacity
                onPress={() => setShowImageModal(false)}
                className="bg-black/50 p-2 rounded-full"
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              className="flex-1"
              contentOffset={{ x: selectedImageIndex * screenWidth, y: 0 }}
            >
              {images.map((image, index) => (
                <View
                  key={image.id}
                  style={{ width: screenWidth }}
                  className="justify-center items-center"
                >
                  <Image
                    source={{ uri: image.url }}
                    className="w-full h-full"
                    resizeMode="contain"
                  />
                </View>
              ))}
            </ScrollView>

            <View className="absolute bottom-8 self-center">
              <Text className="text-white text-center">
                {selectedImageIndex + 1} / {images.length}
              </Text>
            </View>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default VenueOwnerEventDetailScreen;
