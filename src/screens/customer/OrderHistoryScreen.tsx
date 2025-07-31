import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Use existing service and types
import { bookingService } from '../../services/bookingService';
import { BookingResponse, BookingStatus } from '../../types/booking';

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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const pageSize = 10;

  // Fetch bookings from API
  const fetchBookings = async (pageNum: number = 1, isRefresh: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Use existing bookingService
      const response = await bookingService.getUserBookings(userId, pageNum, pageSize);
      
      // Handle response structure from your service
      const bookingsData = response.bookings || response.data || [];
      
      if (isRefresh || pageNum === 1) {
        setBookings(bookingsData);
      } else {
        setBookings(prev => [...prev, ...bookingsData]);
      }

      // Check if has more data based on your API response structure
      const totalCount = response.totalCount || 0;
      const currentTotal = (pageNum - 1) * pageSize + bookingsData.length;
      setHasMore(currentTotal < totalCount);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Không thể tải danh sách đơn hàng');
      
      if (pageNum === 1) {
        setBookings([]);
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
    fetchBookings(1, true);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchBookings(nextPage);
    }
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return '#4CAF50';
      case BookingStatus.PENDING:
        return '#FF9800';
      case BookingStatus.CANCELLED:
        return '#F44336';
      case BookingStatus.COMPLETED:
        return '#2196F3';
      case BookingStatus.IN_PROGRESS:
        return '#9C27B0';
      case BookingStatus.EXPIRED:
        return '#757575';
      default:
        return '#9E9E9E';
    }
  };

  const getStatusText = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return 'Đã xác nhận';
      case BookingStatus.PENDING:
        return 'Chờ xác nhận';
      case BookingStatus.CANCELLED:
        return 'Đã hủy';
      case BookingStatus.COMPLETED:
        return 'Hoàn thành';
      case BookingStatus.IN_PROGRESS:
        return 'Đang thực hiện';
      case BookingStatus.EXPIRED:
        return 'Đã hết hạn';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const renderBookingItem = ({ item }: { item: BookingResponse }) => (
    <TouchableOpacity
      style={{
        backgroundColor: '#FFFFFF',
        marginHorizontal: 16,
        marginVertical: 8,
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
      onPress={() => {
        // Navigate to booking detail
        navigation.navigate('BookingDetailScreen', { 
          bookingId: item.id || item.bookingId 
        });
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#000000', flex: 1 }}>
          Đơn hàng #{item.id || item.bookingId}
        </Text>
        <View
          style={{
            backgroundColor: getStatusColor(item.status),
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '500' }}>
            {getStatusText(item.status)}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
        <Ionicons name="calendar-outline" size={16} color="#666666" />
        <Text style={{ marginLeft: 8, fontSize: 14, color: '#666666' }}>
          {formatDate(item.startDatetime)} - {formatDate(item.endDatetime)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Ionicons name="cash-outline" size={16} color="#666666" />
        <Text style={{ marginLeft: 8, fontSize: 14, color: '#666666' }}>
          {formatPrice(item.totalAmount || 0)}
        </Text>
      </View>

      {/* Show photographer info if available */}
      {item.photographer && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Ionicons name="camera-outline" size={16} color="#666666" />
          <Text style={{ marginLeft: 8, fontSize: 14, color: '#666666' }}>
            {item.photographer.fullName}
          </Text>
        </View>
      )}

      {/* Show location info if available */}
      {item.location ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Ionicons name="location-outline" size={16} color="#666666" />
          <Text style={{ marginLeft: 8, fontSize: 14, color: '#666666' }}>
            {item.location.name}
          </Text>
        </View>
      ) : item.externalLocation && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Ionicons name="location-outline" size={16} color="#666666" />
          <Text style={{ marginLeft: 8, fontSize: 14, color: '#666666' }}>
            {item.externalLocation.name}
          </Text>
        </View>
      )}

      {item.specialRequests && (
        <Text style={{ fontSize: 12, color: '#999999', fontStyle: 'italic', marginBottom: 8 }}>
          Yêu cầu: {item.specialRequests}
        </Text>
      )}

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
        <Ionicons name="chevron-forward" size={20} color="#C0C0C0" />
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
      <Ionicons name="document-text-outline" size={64} color="#C0C0C0" />
      <Text style={{ fontSize: 18, color: '#666666', marginTop: 16, textAlign: 'center' }}>
        Chưa có đơn hàng nào
      </Text>
      <Text style={{ fontSize: 14, color: '#999999', marginTop: 8, textAlign: 'center' }}>
        Các đơn hàng của bạn sẽ hiển thị ở đây
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 }}>
      <Ionicons name="alert-circle-outline" size={64} color="#FF385C" />
      <Text style={{ fontSize: 18, color: '#FF385C', marginTop: 16, textAlign: 'center' }}>
        {error}
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: '#FF385C',
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 8,
          marginTop: 16,
        }}
        onPress={() => fetchBookings(1)}
      >
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '500' }}>
          Thử lại
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#FF385C" />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: '#FFFFFF',
            paddingTop: insets.top,
            paddingBottom: 16,
            paddingHorizontal: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#F0F0F0',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{ marginRight: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#000000' }}>
              Đơn hàng của tôi
            </Text>
          </View>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF385C" />
          <Text style={{ marginTop: 16, color: '#666666' }}>Đang tải...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          paddingTop: insets.top,
          paddingBottom: 16,
          paddingHorizontal: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#F0F0F0',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#000000' }}>
            Đơn hàng của tôi
          </Text>
        </View>
      </View>

      {/* Content */}
      {error ? (
        renderError()
      ) : (
        <FlatList
          data={bookings}
          renderItem={renderBookingItem}
          keyExtractor={(item) => (item.id || item.bookingId)?.toString() || Math.random().toString()}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#FF385C']}
              tintColor="#FF385C"
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={{
            paddingTop: 8,
            paddingBottom: insets.bottom + 20,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default OrderHistoryScreen;