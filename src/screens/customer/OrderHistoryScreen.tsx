import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Use existing service and types
import { bookingService } from "../../services/bookingService";
import { BookingResponse, BookingStatus } from "../../types/booking";

interface RouteParams {
  userId: number;
}

const OrderHistoryScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { userId } = route.params as RouteParams;

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ PAGINATION STATE
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const pageSize = 10; // ✅ GIẢM xuống 15 cho UX tốt hơn

  // Fetch bookings from API
  const fetchBookings = async (
    pageNum: number = 1,
    isRefresh: boolean = false
  ) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const response = await bookingService.getUserBookings(
        userId,
        pageNum,
        pageSize
      );

      const bookingsData = response.bookings || response.data || [];

      if (isRefresh || pageNum === 1) {
        setBookings(bookingsData);
        setTotalCount(response.totalCount || 0);
      } else {
        setBookings((prev) => [...prev, ...bookingsData]);
      }

      // ✅ TÍNH TOÁN hasMore chính xác
      const currentTotal = (pageNum - 1) * pageSize + bookingsData.length;
      const apiTotalCount = response.totalCount || 0;
      setHasMore(
        currentTotal < apiTotalCount && bookingsData.length === pageSize
      );

      setError(null);
    } catch (err) {
      console.error("❌ Error fetching bookings:", err);
      setError("Không thể tải danh sách đơn hàng");

      if (pageNum === 1) {
        setBookings([]);
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings(1);
  }, [userId]);

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    fetchBookings(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      const nextPage = page + 1;

      setPage(nextPage);
      fetchBookings(nextPage);
    }
  };

  // ✅ STATUS STYLING - giữ nguyên code cũ
  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.PENDING:
        return "bg-orange-500";
      case BookingStatus.CONFIRMED:
        return "bg-blue-500";
      case BookingStatus.IN_PROGRESS:
        return "bg-purple-500";
      case BookingStatus.COMPLETED:
        return "bg-green-500";
      case BookingStatus.CANCELLED:
        return "bg-red-500";
      case BookingStatus.EXPIRED:
        return "bg-gray-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusText = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.PENDING:
        return "Chờ xác nhận";
      case BookingStatus.CONFIRMED:
        return "Đã xác nhận";
      case BookingStatus.IN_PROGRESS:
        return "Đang thực hiện";
      case BookingStatus.COMPLETED:
        return "Hoàn thành";
      case BookingStatus.CANCELLED:
        return "Đã hủy";
      case BookingStatus.EXPIRED:
        return "Đã hết hạn";
      default:
        return status;
    }
  };

  const getStatusIcon = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.PENDING:
        return "time-outline";
      case BookingStatus.CONFIRMED:
        return "checkmark-circle-outline";
      case BookingStatus.IN_PROGRESS:
        return "play-circle-outline";
      case BookingStatus.COMPLETED:
        return "checkmark-done-circle";
      case BookingStatus.CANCELLED:
        return "close-circle-outline";
      case BookingStatus.EXPIRED:
        return "alert-circle-outline";
      default:
        return "help-circle-outline";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const renderBookingItem = ({ item }: { item: BookingResponse }) => {
    return (
      <TouchableOpacity
        className="bg-white mx-4 my-2 rounded-xl p-4 shadow-sm border border-gray-100"
        onPress={() => {
          navigation.navigate("BookingDetailScreen", {
            bookingId: item.id || item.bookingId,
          });
        }}
      >
        {/* Header with booking ID and status */}
        <View className="flex-row justify-between items-start mb-3">
          <Text className="text-lg font-semibold text-black flex-1">
            Đơn hàng #{item.id || item.bookingId}
          </Text>
          <View
            className={`flex-row items-center px-3 py-1.5 rounded-full ${getStatusColor(
              item.status
            )}`}
          >
            <Ionicons
              name={getStatusIcon(item.status)}
              size={14}
              color="#FFFFFF"
              style={{ marginRight: 4 }}
            />
            <Text className="text-white text-xs font-medium ml-1">
              {getStatusText(item.status)}
            </Text>
          </View>
        </View>

        {/* Booking time */}
        <View className="flex-row items-center mb-2">
          <Ionicons name="calendar-outline" size={18} color="#6B7280" />
          <Text className="ml-3 text-sm text-gray-600 mb-1">
            Thời gian chụp:{" "}
            <Text className="text-sm font-medium text-gray-800">
              {formatDate(item.startDatetime)} đến{" "}
              {formatDate(item.endDatetime)}
            </Text>
          </Text>
        </View>

        {/* Photographer info */}
        {item.photographer && (
          <View className="flex-row items-center mb-2">
            <Ionicons name="camera-outline" size={18} color="#6B7280" />
            <Text className="ml-3 text-sm text-gray-600">
              Photographer:{" "}
              <Text className="font-medium text-gray-800">
                {item.photographer.fullName}
              </Text>
            </Text>
          </View>
        )}

        {/* Location info */}
        {item.location ? (
          <View className="flex-row items-center mb-2">
            <Ionicons name="location-outline" size={18} color="#6B7280" />
            <Text className="ml-3 text-sm text-gray-600">
              Địa điểm:{" "}
              <Text className="font-medium text-gray-800">
                {item.location.name}
              </Text>
            </Text>
          </View>
        ) : (
          item.externalLocation && (
            <View className="flex-row items-center mb-2">
              <Ionicons name="location-outline" size={18} color="#6B7280" />
              <Text className="ml-3 text-sm text-gray-600">
                Địa điểm:{" "}
                <Text className="font-medium text-gray-800">
                  {item.externalLocation.name}
                </Text>
              </Text>
            </View>
          )
        )}

        {/* Price */}
        <View className="flex-row items-center mb-3">
          <Ionicons name="cash-outline" size={18} color="#6B7280" />
          <Text className="ml-3 text-base font-semibold text-gray-800">
            {formatPrice(item.totalPrice || 0)}
          </Text>
        </View>

        {/* Special requests */}
        {item.specialRequests && (
          <View className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
            <Text className="text-xs text-blue-700">
              <Text className="font-medium">Yêu cầu đặc biệt:</Text>{" "}
              {item.specialRequests}
            </Text>
          </View>
        )}

        {/* View details indicator */}
        <View className="flex-row justify-end items-center mt-3 pt-2 border-t border-gray-100">
          <Text className="text-xs text-gray-500 mr-2">Xem chi tiết</Text>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center py-16">
      <View className="bg-gray-100 rounded-full p-6 mb-4">
        <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
      </View>
      <Text className="text-xl font-medium text-gray-700 mb-2">
        Chưa có đơn hàng nào
      </Text>
      <Text className="text-sm text-gray-500 text-center px-8">
        Các đơn hàng của bạn sẽ hiển thị ở đây sau khi bạn đặt lịch chụp ảnh
      </Text>
    </View>
  );

  const renderError = () => (
    <View className="flex-1 justify-center items-center py-16 px-8">
      <View className="bg-red-100 rounded-full p-6 mb-4">
        <Ionicons name="alert-circle-outline" size={48} color="#DC2626" />
      </View>
      <Text className="text-xl font-medium text-red-600 mb-2 text-center">
        {error}
      </Text>
      <TouchableOpacity
        className="bg-red-500 px-6 py-3 rounded-lg mt-4"
        onPress={handleRefresh}
      >
        <Text className="text-white text-base font-medium">Thử lại</Text>
      </TouchableOpacity>
    </View>
  );

  // ✅ FOOTER với pagination info
  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#FF385C" />
          <Text className="text-sm text-gray-500 mt-2">Đang tải thêm...</Text>
        </View>
      );
    }

    if (!hasMore && bookings.length > 0) {
      return (
        <View className="py-6 items-center">
          <View className="flex-row items-center">
            <View className="h-px bg-gray-300 flex-1" />
            <Text className="text-sm text-gray-500 mx-4">
              Đã hiển thị tất cả {bookings.length} đơn hàng
            </Text>
            <View className="h-px bg-gray-300 flex-1" />
          </View>
        </View>
      );
    }

    return null;
  };

  // ✅ HEADER với counter
  const renderHeader = () => (
    <View
      className="bg-white px-4 pb-4 border-b border-gray-200"
      style={{ paddingTop: insets.top }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-black">
            Đơn hàng của tôi
          </Text>
        </View>
        {/* ✅ COUNTER */}
        {totalCount > 0 && (
          <View className="bg-gray-100 px-3 py-1 rounded-full">
            <Text className="text-sm text-gray-600 font-medium">
              {bookings.length}/{totalCount}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        {renderHeader()}
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF385C" />
          <Text className="mt-4 text-gray-600 text-base">
            Đang tải danh sách đơn hàng...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {renderHeader()}

      {/* Content */}
      {error ? (
        renderError()
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) =>
            (item.id || item.bookingId)?.toString() || Math.random().toString()
          }
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#FF385C"]}
              tintColor="#FF385C"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3} // ✅ GIẢM threshold để tải sớm hơn
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: insets.bottom + 20,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          // ✅ PERFORMANCE OPTIMIZATION
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={15}
          windowSize={10}
        />
      )}
    </View>
  );
};

export default OrderHistoryScreen;
