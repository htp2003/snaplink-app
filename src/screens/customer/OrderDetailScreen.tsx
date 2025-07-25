// OrderDetailScreen.tsx - FIXED VERSION

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  StyleSheet,
  ActivityIndicator
} from 'react-native';
import { getResponsiveSize } from '../../utils/responsive';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AntDesign, Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackNavigationProp } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { useBooking } from '../../hooks/useBooking';
import { usePayment } from '../../hooks/usePayment';
import type { BookingResponse, CreatePaymentLinkRequest, PriceCalculationResponse } from '../../types/booking';
import { PaymentFlowData } from '../../types/payment';

interface LocationParam {
  id: number;
  name: string;
  hourlyRate?: number;
  imageUrl?: string;
}

interface PhotographerParam {
  photographerId: number;
  fullName: string;
  profileImage?: string;
  hourlyRate: number;
}

type OrderDetailRouteParams = {
  bookingId: number;
  photographer: PhotographerParam;
  selectedDate: string;
  selectedStartTime: string;
  selectedEndTime: string;
  selectedLocation?: LocationParam;
  specialRequests?: string;
  priceCalculation: PriceCalculationResponse;
};

type OrderDetailScreenRouteProp = RouteProp<{ OrderDetail: OrderDetailRouteParams }, 'OrderDetail'>;

export default function OrderDetailScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<OrderDetailScreenRouteProp>();
  const params = route.params;

  // Auth hook
  const { user, isAuthenticated } = useAuth();

  const { 
    getBookingById, 
    loading: loadingBooking 
  } = useBooking();

  const { 
    createPaymentForBooking, 
    creatingPayment, 
    error: paymentError 
  } = usePayment();

  // State để lưu booking đã tạo
  const [currentBooking, setCurrentBooking] = useState<BookingResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load booking data khi component mount
  useEffect(() => {
    const loadBookingData = async () => {
      if (params.bookingId && !currentBooking) {
        try {
          console.log('🔍 Loading booking data for ID:', params.bookingId);
          const bookingData = await getBookingById(params.bookingId);
          
          if (bookingData) {
            setCurrentBooking(bookingData);
            console.log('✅ Booking loaded successfully:', {
              id: bookingData.id,
              status: bookingData.status,
              totalAmount: bookingData.totalAmount
            });
          } else {
            console.warn('⚠️ No booking data returned');
            Alert.alert('Cảnh báo', 'Không thể tải thông tin booking');
          }
        } catch (error) {
          console.error('❌ Error loading booking:', error);
          Alert.alert('Lỗi', 'Không thể tải thông tin booking');
        }
      }
    };

    loadBookingData();
  }, [params.bookingId, currentBooking, getBookingById]);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập để đặt lịch chụp ảnh',
        [
          {
            text: 'Đăng nhập',
            onPress: () => navigation.navigate('Login')
          },
          {
            text: 'Hủy',
            style: 'cancel',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  }, [isAuthenticated, navigation]);

  // Validate params
  if (!params || !params.photographer || !params.selectedDate) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={getResponsiveSize(48)} color="#EF5350" />
        <Text style={styles.errorTitle}>Thông tin không hợp lệ</Text>
        <Text style={styles.errorMessage}>Vui lòng quay lại và thử lại</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isAuthenticated || !user?.id) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
        <Text style={styles.loadingText}>Đang kiểm tra xác thực...</Text>
      </View>
    );
  }

  const selectedDate = new Date(params.selectedDate);

  // Helper functions
  const formatDate = (date: Date) => {
    try {
      return date.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Ngày không hợp lệ';
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || isNaN(amount) || amount < 0) return '0 ₫';
    try {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${amount.toLocaleString()} ₫`;
    }
  };

  const calculateDuration = () => {
    try {
      if (!params.selectedStartTime || !params.selectedEndTime) return 0;

      const [startHour, startMinute] = params.selectedStartTime.split(':').map(Number);
      const [endHour, endMinute] = params.selectedEndTime.split(':').map(Number);

      if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
        return 0;
      }

      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      return Math.max(0, (endMinutes - startMinutes) / 60);
    } catch {
      return 0;
    }
  };

  // Calculate pricing details
  const pricingDetails = useMemo(() => {
    const duration = params.priceCalculation?.duration || calculateDuration();
    const photographerFee = params.priceCalculation?.photographerFee || 0;
    const locationFee = params.priceCalculation?.locationFee || 0;
    const serviceFee = params.priceCalculation?.serviceFee || 0;
    const totalPrice = params.priceCalculation?.totalPrice || 0;

    return {
      duration: Math.round(duration * 10) / 10,
      photographerFee,
      locationFee,
      serviceFee,
      totalPrice
    };
  }, [params.priceCalculation, params.selectedStartTime, params.selectedEndTime]);

  const handleEditBooking = () => {
    if (!params) {
      Alert.alert('Lỗi', 'Không có dữ liệu để chỉnh sửa');
      return;
    }

    const editData = {
      selectedDate: params.selectedDate,
      selectedStartTime: params.selectedStartTime,
      selectedEndTime: params.selectedEndTime,
      selectedLocation: params.selectedLocation,
      specialRequests: params.specialRequests
    };

    console.log('🔄 Navigating to edit mode with data:', editData);

    navigation.navigate('Booking', {
      photographer: params.photographer,
      editMode: true,
      existingBookingId: params.bookingId,
      existingBookingData: editData
    });
  };

  // ✅ FIX: Improved payment handling
  const handleBookNow = async () => {
    if (isProcessing || creatingPayment) return;

    // Validation checks
    if (!user?.id) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập lại');
      return;
    }

    if (!params.bookingId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin booking');
      return;
    }

    if (!params.photographer?.fullName) {
      Alert.alert('Lỗi', 'Thông tin photographer không hợp lệ');
      return;
    }

    setIsProcessing(true);

    try {
      console.log('💳 Creating payment for booking:', params.bookingId);

      // Create payment using service
      const paymentResult = await createPaymentForBooking(
        user.id,
        params.bookingId,
        params.photographer.fullName,
        {
          date: formatDate(selectedDate),
          startTime: params.selectedStartTime,
          endTime: params.selectedEndTime,
          location: params.selectedLocation?.name
        }
      );

      if (!paymentResult) {
        throw new Error(paymentError || 'Không thể tạo thanh toán');
      }

      console.log('✅ Payment created successfully:', paymentResult);

      // ✅ FIX: Use orderCode (numeric) for tracking
      const paymentId = paymentResult.id; // This is now orderCode (number)

      // ✅ FIX: Ensure QR code is properly passed
      const qrCode = paymentResult.qrCode;
      if (!qrCode) {
        console.warn('⚠️ No QR code in payment response');
      }

      // Prepare navigation data
      const navigationData: PaymentFlowData = {
        booking: {
          id: params.bookingId,
          photographerName: params.photographer.fullName,
          date: formatDate(selectedDate),
          time: `${params.selectedStartTime}-${params.selectedEndTime}`,
          location: params.selectedLocation?.name,
          totalAmount: pricingDetails.totalPrice
        },
        payment: {
          id: paymentId, // ✅ FIX: This is now numeric orderCode
          paymentUrl: paymentResult.paymentUrl || '',
          orderCode: paymentResult.orderCode || '',
          amount: paymentResult.amount || pricingDetails.totalPrice,
          qrCode: qrCode // ✅ FIX: Ensure QR code is passed
        },
        user: {
          name: user.fullName || user.email || 'Unknown',
          email: user.email || 'No email'
        }
      };

      console.log('🔄 Navigating to PaymentWaiting with data:', {
        paymentId: navigationData.payment.id,
        hasQR: !!navigationData.payment.qrCode,
        qrLength: navigationData.payment.qrCode?.length,
        paymentUrl: navigationData.payment.paymentUrl
      });

      // Navigate to payment screen
      navigation.navigate('PaymentWaitingScreen', navigationData);

    } catch (err) {
      console.error('❌ Payment creation error:', err);
      
      let errorMessage = 'Có lỗi xảy ra khi tạo thanh toán';
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }

      Alert.alert('Lỗi thanh toán', errorMessage, [
        {
          text: 'Thử lại',
          onPress: () => handleBookNow()
        },
        {
          text: 'Đóng',
          style: 'cancel'
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <AntDesign name="arrowleft" size={getResponsiveSize(24)} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận đặt lịch</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photographer Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <Feather name="user" size={getResponsiveSize(18)} color="#E91E63" />
            </View>
            <Text style={styles.cardTitle}>Photographer</Text>
          </View>

          <View style={styles.photographerContainer}>
            <Image
              source={{
                uri: params.photographer.profileImage || 'https://via.placeholder.com/80x80/f0f0f0/999?text=Avatar'
              }}
              style={styles.photographerAvatar}
              defaultSource={{ uri: 'https://via.placeholder.com/80x80/f0f0f0/999?text=Avatar' }}
            />
            <View style={styles.photographerInfo}>
              <Text style={styles.photographerName} numberOfLines={2}>
                {params.photographer.fullName}
              </Text>
              <Text style={styles.photographerRate}>
                {formatCurrency(params.photographer.hourlyRate)}/giờ
              </Text>
            </View>
          </View>
        </View>

        {/* Date & Time Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <Feather name="calendar" size={getResponsiveSize(18)} color="#E91E63" />
            </View>
            <Text style={styles.cardTitle}>Thời gian</Text>
          </View>

          <View style={styles.timeInfoContainer}>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Ngày:</Text>
              <Text style={styles.timeValue}>{formatDate(selectedDate)}</Text>
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Giờ:</Text>
              <Text style={styles.timeValue}>
                {params.selectedStartTime} - {params.selectedEndTime}
              </Text>
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeLabel}>Thời lượng:</Text>
              <Text style={styles.timeValue}>{pricingDetails.duration} giờ</Text>
            </View>
          </View>
        </View>

        {/* Location Card (if selected) */}
        {params.selectedLocation && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrapper}>
                <Feather name="map-pin" size={getResponsiveSize(18)} color="#E91E63" />
              </View>
              <Text style={styles.cardTitle}>Địa điểm</Text>
            </View>

            <View style={styles.locationContainer}>
              {params.selectedLocation.imageUrl && (
                <Image
                  source={{
                    uri: params.selectedLocation.imageUrl
                  }}
                  style={styles.locationImage}
                />
              )}
              <View style={styles.locationInfo}>
                <Text style={styles.locationName} numberOfLines={2}>
                  {params.selectedLocation.name}
                </Text>
                {params.selectedLocation.hourlyRate && (
                  <Text style={styles.locationPrice}>
                    {formatCurrency(params.selectedLocation.hourlyRate)}/giờ
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Special Requests Card */}
        {params.specialRequests && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrapper}>
                <Feather name="edit-3" size={getResponsiveSize(18)} color="#E91E63" />
              </View>
              <Text style={styles.cardTitle}>Yêu cầu đặc biệt</Text>
            </View>

            <View style={styles.requestsContainer}>
              <Text style={styles.requestsText}>{params.specialRequests}</Text>
            </View>
          </View>
        )}

        {/* Price Breakdown Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconWrapper}>
              <MaterialIcons name="receipt" size={getResponsiveSize(18)} color="#E91E63" />
            </View>
            <Text style={styles.cardTitle}>Chi phí dự kiến</Text>
          </View>

          <View style={styles.priceContainer}>
            {/* Photographer Fee */}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>
                Phí Photographer ({pricingDetails.duration}h)
              </Text>
              <Text style={styles.priceValue}>
                {formatCurrency(pricingDetails.photographerFee)}
              </Text>
            </View>

            {/* Location Fee */}
            {pricingDetails.locationFee > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>
                  Phí địa điểm ({pricingDetails.duration}h)
                </Text>
                <Text style={styles.priceValue}>
                  {formatCurrency(pricingDetails.locationFee)}
                </Text>
              </View>
            )}

            {/* Service Fee */}
            {pricingDetails.serviceFee > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Phí dịch vụ</Text>
                <Text style={styles.priceValue}>
                  {formatCurrency(pricingDetails.serviceFee)}
                </Text>
              </View>
            )}

            {/* Divider */}
            <View style={styles.priceDivider} />

            {/* Total */}
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(pricingDetails.totalPrice)}
              </Text>
            </View>
          </View>

          {/* Note about payment */}
          <View style={styles.paymentNote}>
            <MaterialIcons name="info" size={getResponsiveSize(16)} color="#FF9800" />
            <Text style={styles.paymentNoteText}>
              Bạn sẽ thanh toán ngay sau khi xác nhận booking
            </Text>
          </View>
        </View>

        {/* ✅ THÊM: Hiển thị thông tin booking đã load */}
        {currentBooking && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrapper}>
                <MaterialIcons name="info" size={getResponsiveSize(18)} color="#4CAF50" />
              </View>
              <Text style={styles.cardTitle}>Trạng thái Booking</Text>
            </View>
            <View style={styles.bookingStatusContainer}>
              <Text style={styles.bookingStatusText}>
                Booking #{currentBooking.id} - {currentBooking.status}
              </Text>
              <Text style={styles.bookingAmountText}>
                Tổng tiền: {formatCurrency(currentBooking.totalAmount)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActions}>
        {/* Edit Button */}
        <TouchableOpacity
          onPress={handleEditBooking}
          activeOpacity={0.7}
          style={styles.editButton}
        >
          <Feather name="edit-3" size={getResponsiveSize(18)} color="#666" />
          <Text style={styles.editButtonText}>Chỉnh sửa</Text>
        </TouchableOpacity>

        {/* Confirm Button */}
        <TouchableOpacity
          onPress={handleBookNow}
          activeOpacity={0.8}
          style={styles.confirmButton}
        >
          <LinearGradient
            colors={["#E91E63", "#F06292"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.confirmButtonGradient}
          >
            {(isProcessing) ? (
              <>
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: getResponsiveSize(8) }} />
                <Text style={styles.confirmButtonText}>Đang xử lý...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="payment" size={getResponsiveSize(20)} color="#fff" style={{ marginRight: getResponsiveSize(8) }} />
                <Text style={styles.confirmButtonText}>Đặt lịch & Thanh toán</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    color: '#333',
    marginTop: getResponsiveSize(16),
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: getResponsiveSize(40),
  },
  errorTitle: {
    fontSize: getResponsiveSize(20),
    fontWeight: 'bold',
    color: '#333',
    marginTop: getResponsiveSize(16),
    marginBottom: getResponsiveSize(8),
  },
  errorMessage: {
    fontSize: getResponsiveSize(16),
    color: '#666',
    textAlign: 'center',
    marginBottom: getResponsiveSize(24),
  },
  errorButton: {
    backgroundColor: '#E91E63',
    paddingHorizontal: getResponsiveSize(24),
    paddingVertical: getResponsiveSize(12),
    borderRadius: getResponsiveSize(8),
  },
  errorButtonText: {
    color: '#fff',
    fontSize: getResponsiveSize(16),
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: getResponsiveSize(50),
    paddingBottom: getResponsiveSize(20),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: getResponsiveSize(10),
    padding: getResponsiveSize(8),
  },
  headerTitle: {
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
    color: '#333',
  },

  // Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: getResponsiveSize(120),
  },

  // Card styles
  card: {
    backgroundColor: '#fff',
    marginHorizontal: getResponsiveSize(20),
    marginTop: getResponsiveSize(16),
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(16),
  },
  iconWrapper: {
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
    padding: getResponsiveSize(8),
    borderRadius: getResponsiveSize(8),
    marginRight: getResponsiveSize(12),
  },
  cardTitle: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    color: '#333',
  },

  // Photographer section
  photographerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photographerAvatar: {
    width: getResponsiveSize(60),
    height: getResponsiveSize(60),
    borderRadius: getResponsiveSize(30),
    marginRight: getResponsiveSize(16),
    backgroundColor: '#f0f0f0',
  },
  photographerInfo: {
    flex: 1,
  },
  photographerName: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: getResponsiveSize(4),
  },
  photographerRate: {
    fontSize: getResponsiveSize(14),
    color: '#E91E63',
    fontWeight: '600',
  },

  // Time section
  timeInfoContainer: {
    gap: getResponsiveSize(12),
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: getResponsiveSize(14),
    color: '#666',
    fontWeight: '500',
  },
  timeValue: {
    fontSize: getResponsiveSize(14),
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
    flex: 1,
    marginLeft: getResponsiveSize(16),
  },

  // Location section
  locationContainer: {
    borderRadius: getResponsiveSize(8),
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  locationImage: {
    width: '100%',
    height: getResponsiveSize(120),
    backgroundColor: '#f0f0f0',
  },
  locationInfo: {
    padding: getResponsiveSize(12),
  },
  locationName: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: getResponsiveSize(4),
  },
  locationPrice: {
    fontSize: getResponsiveSize(14),
    color: '#E91E63',
    fontWeight: '600',
  },

  // Special requests section
  requestsContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: getResponsiveSize(8),
    padding: getResponsiveSize(16),
  },
  requestsText: {
    fontSize: getResponsiveSize(14),
    color: '#333',
    lineHeight: getResponsiveSize(20),
  },

  // Price section
  priceContainer: {
    gap: getResponsiveSize(12),
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: getResponsiveSize(14),
    color: '#666',
    flex: 1,
  },
  priceValue: {
    fontSize: getResponsiveSize(14),
    fontWeight: '600',
    color: '#333',
  },
  priceDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: getResponsiveSize(8),
  },
  totalLabel: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
    color: '#E91E63',
  },

  // Payment note
  paymentNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: getResponsiveSize(8),
    padding: getResponsiveSize(12),
    marginTop: getResponsiveSize(16),
  },
  paymentNoteText: {
    fontSize: getResponsiveSize(13),
    color: '#F57C00',
    marginLeft: getResponsiveSize(8),
    flex: 1,
  },

  // Booking status section
  bookingStatusContainer: {
    gap: getResponsiveSize(8),
  },
  bookingStatusText: {
    fontSize: getResponsiveSize(16),
    fontWeight: '600',
    color: '#333',
  },
  bookingAmountText: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    color: '#4CAF50',
  },

  // Bottom actions
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveSize(20),
    paddingVertical: getResponsiveSize(16),
    paddingBottom: getResponsiveSize(8),
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(12),
    backgroundColor: '#f8f9fa',
    borderRadius: getResponsiveSize(8),
    flex: 1,
    marginRight: getResponsiveSize(12),
  },
  editButtonText: {
    color: '#666',
    fontWeight: '500',
    marginLeft: getResponsiveSize(8),
    fontSize: getResponsiveSize(16),
  },
  confirmButton: {
    flex: 2,
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: getResponsiveSize(15),
    paddingHorizontal: getResponsiveSize(20),
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
  },
});