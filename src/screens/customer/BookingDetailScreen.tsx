import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import services and hooks
import { bookingService } from '../../services/bookingService';
import { usePhotoDelivery } from '../../hooks/usePhotoDelivery';
import photoDeliveryService from '../../services/photoDeliveryService';
import { BookingResponse, BookingStatus } from '../../types/booking';
import { PhotoDeliveryData } from '../../types/photoDelivery';

interface RouteParams {
  bookingId: number;
}

const BookingDetailScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { bookingId } = route.params as RouteParams;

  // State for booking details
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // State for photo delivery
  const [photoDelivery, setPhotoDelivery] = useState<PhotoDeliveryData | null>(null);
  const [deliveryLoading, setDeliveryLoading] = useState(true);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Fetch booking details
  const fetchBookingDetails = async () => {
    try {
      setLoadingBooking(true);
      const bookingData = await bookingService.getBookingById(bookingId);
      setBooking(bookingData);
      setBookingError(null);
    } catch (error: any) {
      console.error('Error fetching booking details:', error);
      setBookingError('Không thể tải thông tin đơn hàng');
    } finally {
      setLoadingBooking(false);
    }
  };

  // Fetch photo delivery details
  const fetchPhotoDelivery = async () => {
    try {
      setDeliveryLoading(true);
      setDeliveryError(null);
      const deliveryData = await photoDeliveryService.getPhotoDeliveryByBooking(bookingId);
      setPhotoDelivery(deliveryData);
    } catch (error: any) {
      console.error('Error fetching photo delivery:', error);
      setDeliveryError('Chưa có thông tin về ảnh chụp');
    } finally {
      setDeliveryLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDetails();
    fetchPhotoDelivery();
  }, [bookingId]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchBookingDetails(),
      fetchPhotoDelivery(),
    ]);
    setRefreshing(false);
  };

  // Handle open Google Drive link
  const handleOpenDriveLink = async (driveLink: string) => {
    try {
      const supported = await Linking.canOpenURL(driveLink);
      if (supported) {
        await Linking.openURL(driveLink);
      } else {
        Alert.alert('Lỗi', 'Không thể mở link Google Drive');
      }
    } catch (error) {
      console.error('Error opening drive link:', error);
      Alert.alert('Lỗi', 'Không thể mở link Google Drive');
    }
  };

  // Handle confirm received photos
  const handleConfirmReceived = async () => {
    if (!booking || !photoDelivery) return;

    Alert.alert(
      'Xác nhận nhận ảnh',
      'Bạn đã xem và nhận được ảnh chụp? Sau khi xác nhận, đơn hàng sẽ được hoàn tất.',
      [
        {
          text: 'Chưa nhận',
          style: 'cancel',
        },
        {
          text: 'Đã nhận ảnh',
          onPress: async () => {
            try {
              setUpdating(true);
              // Complete the booking
              await bookingService.completeBooking(booking.id || booking.bookingId);

              // Update photo delivery status to "Delivered"
              await photoDeliveryService.updatePhotoDelivery(
                photoDelivery.photoDeliveryId,
                {
                  status: 'Delivered'
                }
              );


              // Refresh both booking and photo delivery data
              await Promise.all([
                fetchBookingDetails(),
                fetchPhotoDelivery()
              ]);

              Alert.alert(
                'Thành công',
                'Cảm ơn bạn đã xác nhận! Đơn hàng đã được hoàn thành.',
                [{ text: 'OK' }]
              );
            } catch (error: any) {
              console.error('Error completing booking:', error);
              Alert.alert('Lỗi', 'Không thể hoàn thành đơn hàng');
            } finally {
              setUpdating(false);
            }
          },
        },
      ]
    );
  };

  // Utility functions
  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case BookingStatus.CONFIRMED:
        return 'bg-green-500';
      case BookingStatus.PENDING:
        return 'bg-orange-500';
      case BookingStatus.CANCELLED:
        return 'bg-red-500';
      case BookingStatus.COMPLETED:
        return 'bg-green-500';
      case BookingStatus.IN_PROGRESS:
        return 'bg-purple-500';
      case BookingStatus.EXPIRED:
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
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

  const getDeliveryStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-orange-500';
      case 'uploaded':
        return 'bg-blue-500';
      case 'delivered':
        return 'bg-green-500';
      case 'expired':
        return 'bg-red-500';
      case 'notrequired':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getDeliveryStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Đang chuẩn bị ảnh';
      case 'uploaded':
        return 'Ảnh đã sẵn sàng';
      case 'delivered':
        return 'Đã giao ảnh';
      case 'expired':
        return 'Đã hết hạn';
      case 'notrequired':
        return 'Không yêu cầu';
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

  const canConfirmReceived = () => {
    return (
      booking &&
      photoDelivery &&
      photoDelivery.driveLink &&
      photoDelivery.status.toLowerCase() !== 'delivered' &&
      (booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.IN_PROGRESS)
    );
  };

  const isExpired = () => {
    if (!photoDelivery?.expiresAt) return false;
    return new Date(photoDelivery.expiresAt) < new Date();
  };

  const getDaysUntilExpiry = () => {
    if (!photoDelivery?.expiresAt) return null;
    
    const expiryDate = new Date(photoDelivery.expiresAt);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Loading state
  if (loadingBooking) {
    return (
      <View className="flex-1 bg-gray-50">
        <View 
          className="bg-white px-4 pb-4 border-b border-gray-200"
          style={{ paddingTop: insets.top }}
        >
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
            <Text className="text-xl font-semibold text-black ml-4">Chi tiết đơn hàng</Text>
          </View>
        </View>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF385C" />
          <Text className="mt-4 text-gray-600">Đang tải...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (bookingError) {
    return (
      <View className="flex-1 bg-gray-50">
        <View 
          className="bg-white px-4 pb-4 border-b border-gray-200"
          style={{ paddingTop: insets.top }}
        >
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
            <Text className="text-xl font-semibold text-black ml-4">Chi tiết đơn hàng</Text>
          </View>
        </View>
        <View className="flex-1 justify-center items-center px-10">
          <Ionicons name="alert-circle-outline" size={64} color="#FF385C" />
          <Text className="text-lg text-red-500 mt-4 text-center">{bookingError}</Text>
          <TouchableOpacity 
            className="bg-red-500 px-6 py-3 rounded-lg mt-4"
            onPress={fetchBookingDetails}
          >
            <Text className="text-white text-base font-medium">Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!booking) {
    return null;
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View 
        className="bg-white px-4 pb-4 border-b border-gray-200"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text className="text-xl font-semibold text-black ml-4">Chi tiết đơn hàng</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1 p-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#FF385C']}
            tintColor="#FF385C"
          />
        }
      >
        {/* Booking Info Card */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-black flex-1">
              Đơn hàng #{booking.id || booking.bookingId}
            </Text>
            <View className={`px-2 py-1 rounded-full ${getStatusColor(booking.status)}`}>
              <Text className="text-white text-xs font-medium">{getStatusText(booking.status)}</Text>
            </View>
          </View>

          <View className="flex-row items-start mb-3">
            <Ionicons name="calendar-outline" size={20} color="#666666" />
            <View className="flex-1 ml-3">
              <Text className="text-sm text-gray-600 mb-1">Thời gian chụp</Text>
              <Text className="text-base text-black font-medium">
                {formatDate(booking.startDatetime)} - {formatDate(booking.endDatetime)}
              </Text>
            </View>
          </View>

          {booking.photographer && (
            <View className="flex-row items-start mb-3">
              <Ionicons name="camera-outline" size={20} color="#666666" />
              <View className="flex-1 ml-3">
                <Text className="text-sm text-gray-600 mb-1">Photographer</Text>
                <Text className="text-base text-black font-medium">{booking.photographer.fullName}</Text>
              </View>
            </View>
          )}

          {(booking.location || booking.externalLocation) && (
            <View className="flex-row items-start mb-3">
              <Ionicons name="location-outline" size={20} color="#666666" />
              <View className="flex-1 ml-3">
                <Text className="text-sm text-gray-600 mb-1">Địa điểm</Text>
                <Text className="text-base text-black font-medium">
                  {booking.location?.name || booking.externalLocation?.name}
                </Text>
                {(booking.location?.address || booking.externalLocation?.address) && (
                  <Text className="text-sm text-gray-500 mt-1">
                    {booking.location?.address || booking.externalLocation?.address}
                  </Text>
                )}
              </View>
            </View>
          )}

          <View className="flex-row items-start mb-3">
            <Ionicons name="cash-outline" size={20} color="#666666" />
            <View className="flex-1 ml-3">
              <Text className="text-sm text-gray-600 mb-1">Tổng tiền</Text>
              <Text className="text-base text-black font-medium">{formatPrice(booking.paymentAmount || 0)}</Text>
            </View>
          </View>

          {booking.specialRequests && (
            <View className="flex-row items-start">
              <Ionicons name="document-text-outline" size={20} color="#666666" />
              <View className="flex-1 ml-3">
                <Text className="text-sm text-gray-600 mb-1">Yêu cầu đặc biệt</Text>
                <Text className="text-base text-black font-medium">{booking.specialRequests}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Photo Delivery Card */}
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <Text className="text-lg font-semibold text-black mb-4">Ảnh chụp</Text>
          
          {deliveryLoading ? (
            <View className="flex-row items-center py-5">
              <ActivityIndicator size="small" color="#FF385C" />
              <Text className="ml-3 text-gray-600">Đang tải thông tin ảnh...</Text>
            </View>
          ) : !photoDelivery ? (
            <View className="items-center py-10">
              <Ionicons name="camera-outline" size={48} color="#C0C0C0" />
              <Text className="text-lg text-gray-300 mt-4">Chưa có ảnh</Text>
              <Text className="text-sm text-gray-400 mt-2 text-center">
                Photographer sẽ upload ảnh sau khi hoàn thành chụp
              </Text>
            </View>
          ) : (
            <>
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-base text-black font-medium">Trạng thái:</Text>
                <View className={`px-2 py-1 rounded-full ${getDeliveryStatusColor(photoDelivery.status)}`}>
                  <Text className="text-white text-xs font-medium">
                    {getDeliveryStatusText(photoDelivery.status)}
                  </Text>
                </View>
              </View>

              {photoDelivery.deliveryMethod && (
                <View className="flex-row items-center mb-2">
                  <Ionicons name="cloud-outline" size={20} color="#666666" />
                  <Text className="ml-2 text-sm text-gray-600">
                    Phương thức: {photoDelivery.deliveryMethod}
                  </Text>
                </View>
              )}

              {photoDelivery.photoCount && (
                <View className="flex-row items-center mb-2">
                  <Ionicons name="images-outline" size={20} color="#666666" />
                  <Text className="ml-2 text-sm text-gray-600">
                    Số lượng ảnh: {photoDelivery.photoCount} ảnh
                  </Text>
                </View>
              )}

              {photoDelivery.driveFolderName && (
                <View className="flex-row items-center mb-2">
                  <Ionicons name="folder-outline" size={20} color="#666666" />
                  <Text className="ml-2 text-sm text-gray-600">
                    Thư mục: {photoDelivery.driveFolderName}
                  </Text>
                </View>
              )}

              {photoDelivery.notes && (
                <View className="flex-row items-center mb-2">
                  <Ionicons name="document-text-outline" size={20} color="#666666" />
                  <Text className="ml-2 text-sm text-gray-600">
                    Ghi chú: {photoDelivery.notes}
                  </Text>
                </View>
              )}

              {photoDelivery.uploadedAt && (
                <View className="flex-row items-center mb-2">
                  <Ionicons name="cloud-upload-outline" size={20} color="#666666" />
                  <Text className="ml-2 text-sm text-gray-600">
                    Ngày upload: {formatDate(photoDelivery.uploadedAt)}
                  </Text>
                </View>
              )}

              {photoDelivery.expiresAt && (
                <View className="flex-row items-center mb-2">
                  <Ionicons 
                    name="time-outline" 
                    size={20} 
                    color={isExpired() ? "#F44336" : "#666666"} 
                  />
                  <Text className={`ml-2 text-sm ${isExpired() ? 'text-red-500' : 'text-gray-600'}`}>
                    {isExpired() 
                      ? "Đã hết hạn tải ảnh"
                      : `Hết hạn sau ${getDaysUntilExpiry()} ngày`
                    }
                  </Text>
                </View>
              )}

              {/* Google Drive Link */}
              {photoDelivery.driveLink && (
                <TouchableOpacity
                  className="bg-blue-500 flex-row items-center justify-center py-3 rounded-lg mt-4"
                  onPress={() => handleOpenDriveLink(photoDelivery.driveLink!)}
                >
                  <Ionicons name="link-outline" size={24} color="#FFFFFF" />
                  <Text className="text-white text-base font-semibold ml-2">
                    Xem ảnh trên Google Drive
                  </Text>
                </TouchableOpacity>
              )}

              {/* Confirm Button - Chỉ hiện khi status là Pending và có drive link */}
              {canConfirmReceived() && (
                <TouchableOpacity
                  className={`bg-green-500 flex-row items-center justify-center py-3 rounded-lg mt-3 ${updating ? 'opacity-60' : ''}`}
                  onPress={handleConfirmReceived}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
                  )}
                  <Text className="text-white text-base font-semibold ml-2">
                    {updating ? 'Đang xử lý...' : 'Xác nhận đã nhận ảnh'}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Already Completed */}
              {booking.status === BookingStatus.COMPLETED && (
                <View className="flex-row items-center bg-green-50 p-3 rounded-lg mt-4">
                  <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                  <View className="flex-1 ml-2">
                    <Text className="text-green-600 text-base font-medium">Đơn hàng đã hoàn thành</Text>
                    <Text className="text-green-600 text-xs mt-1">
                      Cảm ơn bạn đã sử dụng dịch vụ
                    </Text>
                  </View>
                </View>
              )}

              {/* Expired */}
              {isExpired() && (
                <View className="flex-row items-center bg-red-50 p-3 rounded-lg mt-4">
                  <Ionicons name="alert-circle" size={24} color="#F44336" />
                  <View className="flex-1 ml-2">
                    <Text className="text-red-500 text-base font-medium">Link tải ảnh đã hết hạn</Text>
                    <Text className="text-red-500 text-xs mt-1">
                      Vui lòng liên hệ photographer để được hỗ trợ
                    </Text>
                  </View>
                </View>
              )}

              {/* Pending State */}
              {photoDelivery.status.toLowerCase() === 'pending' && (
                <View className="flex-row items-center bg-orange-50 p-3 rounded-lg mt-4">
                  <Ionicons name="time-outline" size={24} color="#FF9800" />
                  <View className="flex-1 ml-2">
                    <Text className="text-orange-600 text-base font-medium">Đang chuẩn bị ảnh</Text>
                    <Text className="text-orange-600 text-xs mt-1">
                      Photographer đang xử lý và sẽ upload ảnh sớm nhất có thể
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default BookingDetailScreen;