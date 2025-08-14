import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { getResponsiveSize } from "../../utils/responsive";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AntDesign, Feather, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackNavigationProp } from "../../navigation/types";
import { useAuth } from "../../hooks/useAuth";
import { useBooking } from "../../hooks/useBooking";
import { usePayment } from "../../hooks/usePayment";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { PaymentFlowData } from "../../types/payment";
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ✅ ENHANCED: Route params structure for Event Booking
type OrderEventDetailRouteParams = {

  eventBookingResponse?: {
    eventBookingId: number;   
    bookingId: number; 
    eventPrice: number;
    booking: {                
      bookingId: number;         
      userId: number;          
      photographerId: number;
      totalPrice: number;
      status: string;
      // ... other booking fields
    };
    event: any;
    eventPhotographer: any;
  };


  eventBookingId?: number;      
  bookingId?: number;            
  eventPrice?: number;       
  bookingResponse?: any; 


  event: {
    eventId: number;
    name: string;
    startDate: string;
    endDate: string;
    locationName?: string;
    discountedPrice?: number;
    originalPrice?: number;
    description?: string;
    primaryImage?: string;
  };

  // Selected photographer
  photographer: {
    eventPhotographerId: number;
    photographerId: number;
    fullName: string;
    profileImage?: string;
    specialRate?: number;
    rating?: number;
    verificationStatus?: string;
  };

  // Booking time details
  bookingTimes?: {
    startTime: string;
    endTime: string;
    startDatetime: string;
    endDatetime: string;
  };

  // Special requests
  specialRequests?: string;
};

type OrderEventDetailScreenRouteProp = RouteProp<
  { OrderEventDetail: OrderEventDetailRouteParams },
  "OrderEventDetail"
>;

export default function OrderEventDetailScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<OrderEventDetailScreenRouteProp>();
  const params = route.params;

  // Auth hook
  const { user, isAuthenticated } = useAuth();

  // ✅ Use existing hooks for consistency
  const { getBookingById, confirmBooking } = useBooking();
  const { 
    createEventPayment,
    creatingPayment, 
    error: paymentError 
  } = usePayment();

  // ✅ Payment method state
  type PaymentMethod = "bank_qr" | "snaplink_wallet";
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("bank_qr");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWalletSuccessModal, setShowWalletSuccessModal] = useState(false);

  // ✅ Booking state
  const [regularBooking, setRegularBooking] = useState<any>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);


  // Test token 
  useEffect(() => {
    const debugToken = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          console.log('🔐 ===== TOKEN DEBUG =====');
          console.log('🔐 Token exists:', !!token);
          console.log('🔐 Token length:', token.length);
          
          // Try to decode JWT token
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              const now = Math.floor(Date.now() / 1000);
              const exp = payload.exp;
              const iat = payload.iat;
              
              console.log('🔐 Token issued at:', new Date(iat * 1000));
              console.log('🔐 Token expires at:', new Date(exp * 1000));
              console.log('🔐 Current time:', new Date());
              console.log('🔐 Time until expiry:', (exp - now), 'seconds');
              console.log('🔐 Is expired:', exp < now);
              
              // Check if token will expire soon (within 5 minutes)
              const expiresIn = exp - now;
              if (expiresIn < 300) { // 5 minutes
                console.warn('⚠️ Token will expire soon!', expiresIn, 'seconds');
              }
            }
          } catch (decodeError) {
            console.log('🔐 Token is not JWT format');
          }
          console.log('🔐 ===== TOKEN DEBUG END =====');
        }
      } catch (error) {
        console.error('❌ Error debugging token:', error);
      }
    };
    
    debugToken();
  }, []);

  useEffect(() => {
    const loadRegularBooking = async () => {
      const bookingId = params.eventBookingResponse?.bookingId;
      
      if (bookingId) {
        try {
          setLoadingBooking(true);
          console.log("🔄 Loading regular booking for event booking ID:", bookingId);
          
          const bookingData = await getBookingById(bookingId);
          
          if (bookingData) {
            setRegularBooking(bookingData);
            console.log("✅ Regular booking loaded for event:", bookingData);
          } else {
            console.warn("⚠️ No regular booking data returned");
            console.log("Will use fallback price calculation");
          }
        } catch (error) {
          console.error("❌ Error loading regular booking:", error);
          console.log("Will use fallback price calculation");
        } finally {
          setLoadingBooking(false);
        }
      } else {
        setLoadingBooking(false);
        console.log("No booking ID found, will use fallback price");
      }
    };

    loadRegularBooking();
  }, [params.eventBookingResponse?.bookingId, params.eventBookingId, getBookingById]);


  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Vui lòng đăng nhập để tiếp tục thanh toán",
        [
          {
            text: "Đăng nhập",
            onPress: () => navigation.navigate("Login"),
          },
          {
            text: "Hủy",
            style: "cancel",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [isAuthenticated, navigation]);

  // Validate params
  if (!params || !params.event || !params.photographer) {
    return (
      <View style={styles.errorContainer}>
        <MaterialIcons name="error" size={getResponsiveSize(48)} color="#EF5350" />
        <Text style={styles.errorTitle}>Thông tin không hợp lệ</Text>
        <Text style={styles.errorSubtitle}>Vui lòng quay lại và thử lại</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
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

  if (loadingBooking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
        <Text style={styles.loadingText}>Đang tải thông tin booking...</Text>
      </View>
    );
  }

  // ✅ Helper functions
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch {
      return "Ngày không hợp lệ";
    }
  };

  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } catch {
      return "Giờ không hợp lệ";
    }
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined || isNaN(amount) || amount < 0) return "0 ₫";
    try {
      return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${amount.toLocaleString()} ₫`;
    }
  };

  const calculateDurationFromTimes = (startTime: string, endTime: string): number => {
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    return Math.max(0, (endMinutes - startMinutes) / 60);
  };

  // ✅ Calculate fallback price if no booking data
  const calculateFallbackPrice = (): number => {
    const eventBaseFee = params.event.discountedPrice || params.event.originalPrice || 0;
    const photographerRate = params.photographer.specialRate || 0;
    const duration = params.bookingTimes ? 
      calculateDurationFromTimes(params.bookingTimes.startTime, params.bookingTimes.endTime) : 1;
    
    return eventBaseFee + (photographerRate * duration);
  };

  // ✅ Calculate pricing - use regular booking data if available, otherwise fallback
  const totalPrice = params.eventPrice || 
    params.eventBookingResponse?.eventPrice ||
    regularBooking?.totalPrice || 
    calculateFallbackPrice();

  const durationHours = regularBooking?.durationHours || 
    (params.bookingTimes ? calculateDurationFromTimes(params.bookingTimes.startTime, params.bookingTimes.endTime) : 1);

  // ✅ Get the booking ID for payment (critical for API)
  const getBookingIdForPayment = (): number => {
    console.log('🎯 Getting booking ID for payment...');
    
    // Collect all possible sources
    const sources = [
      { name: 'eventBookingResponse.booking.bookingId', value: params.eventBookingResponse?.booking?.bookingId },
      { name: 'eventBookingResponse.bookingId', value: params.eventBookingResponse?.bookingId },
      { name: 'bookingResponse.booking.bookingId', value: params.bookingResponse?.booking?.bookingId },
      { name: 'bookingResponse.bookingId', value: params.bookingResponse?.bookingId },
      { name: 'params.bookingId', value: params.bookingId },
      { name: 'regularBooking.bookingId', value: regularBooking?.bookingId },
    ];
    
    console.log('📋 All booking ID sources:', sources);
    
    // Try each source in priority order
    for (const source of sources) {
      if (source.value && typeof source.value === 'number' && source.value > 0) {
        console.log(`✅ FOUND booking ID from ${source.name}:`, source.value);
        return source.value;
      } else {
        console.log(`❌ ${source.name}:`, source.value, '(invalid)');
      }
    }
    
    // ⚠️ FALLBACK: Nếu không tìm thấy regular booking ID nào, temporarily dùng eventBookingId
    const fallbackId = params.eventBookingId;
    if (fallbackId && typeof fallbackId === 'number' && fallbackId > 0) {
      console.warn('⚠️ FALLBACK: Using eventBookingId as last resort:', fallbackId);
      console.warn('⚠️ This might cause issues - eventBookingId is not regular booking ID');
      return fallbackId;
    }
    
    console.error('❌ NO BOOKING ID FOUND AT ALL!');
    console.error('💡 Debug info:', {
      hasParams: !!params,
      paramsKeys: params ? Object.keys(params) : [],
      hasRegularBooking: !!regularBooking,
    });
    
    return 0; // ✅ FIXED: Always return a number
  };

  // ✅ ENHANCED: Payment handler using shared payment flow
  const handlePayment = async () => {
    if (isProcessing) return;

    if (!user?.id) {
      Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
      return;
    }

    if (!isAuthenticated) {
      console.error('❌ User not authenticated');
      Alert.alert("Lỗi xác thực", "Vui lòng đăng nhập lại");
      navigation.navigate("Login");
      return;
    }

    try {
      // Import AsyncStorage nếu chưa có

      
      const token = await AsyncStorage.getItem('token');
      console.log('🔐 Auth token exists:', !!token);
      console.log('🔐 Auth token length:', token?.length || 0);
      
      if (!token) {
        console.error('❌ No auth token found');
        Alert.alert("Phiên đăng nhập hết hạn", "Vui lòng đăng nhập lại", [
          { text: "Đăng nhập", onPress: () => navigation.navigate("Login") }
        ]);
        return;
      }
    } catch (error) {
      console.error('❌ Error checking auth token:', error);
    }
  
    console.log('🔐 ===== AUTH CHECK END =====');

    const bookingId = getBookingIdForPayment();
    
    if (!bookingId) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin booking để thanh toán");
      return;
    }

    setIsProcessing(true);

    try {
      if (selectedPaymentMethod === "snaplink_wallet") {
        console.log("💳 Processing wallet payment for event booking:", bookingId);

        const confirmSuccess = await confirmBooking(bookingId);

        if (!confirmSuccess) {
          throw new Error("Không thể xác nhận booking và trừ tiền từ ví");
        }

        setShowWalletSuccessModal(true);
      } else {
        // ✅ QR Payment - create payment using shared flow
        console.log("🏦 Processing bank QR payment for event booking:", bookingId);

        // ✅ Use existing payment creation method
        const paymentResult = await createEventPayment(
          user.id,
          bookingId,
          `Tham gia sự kiện - ${params.event.name}`,
          {
            date: formatDate(params.event.startDate),
            startTime: formatTime(params.event.startDate),
            endTime: formatTime(params.event.endDate),
            location: params.event.locationName,
            photographerName: params.photographer.fullName
          }
        );
        if (!paymentResult) {
          throw new Error(paymentError || "Không thể tạo thanh toán");
        }

        console.log("✅ Event payment created:", paymentResult);

        // ✅ Navigate with enhanced PaymentFlowData for event booking
        const paymentData: PaymentFlowData = {
          booking: {
            id: bookingId,
            photographerName: params.photographer.fullName,
            date: formatDate(params.event.startDate),
            time: `${formatTime(params.event.startDate)}-${formatTime(params.event.endDate)}`,
            location: params.event.locationName,
            totalAmount: totalPrice,
          },
          payment: {
            // ✅ Primary fields
            paymentId: paymentResult.paymentId,
            externalTransactionId: paymentResult.externalTransactionId || "",
            customerId: user.id,
            customerName: user.fullName || user.email || "Unknown",
            totalAmount: totalPrice,
            status: paymentResult.status || "Pending",
            bookingId: bookingId,
            photographerName: params.photographer.fullName,
            locationName: params.event.locationName || "",

            // ✅ Legacy compatibility
            id: paymentResult.paymentId,
            paymentUrl: paymentResult.paymentUrl || "",
            orderCode: paymentResult.orderCode || "",
            amount: totalPrice,
            qrCode: paymentResult.qrCode || "",
          },
          user: {
            name: user.fullName || user.email || "Unknown",
            email: user.email || "No email",
          },
        };

        // ✅ Navigate to shared PaymentWaitingScreen
        navigation.navigate("PaymentWaitingScreen", paymentData);
      }
    } catch (err) {
      console.error("❌ Event payment processing error:", err);

      const errorMessage = err instanceof Error ? err.message : "Có lỗi xảy ra khi xử lý thanh toán";
      const errorTitle = selectedPaymentMethod === "snaplink_wallet" ? "Lỗi thanh toán ví" : "Lỗi thanh toán";

      Alert.alert(errorTitle, errorMessage, [
        {
          text: "Thử lại",
          onPress: () => handlePayment(),
        },
        {
          text: "Đóng",
          style: "cancel",
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E91E63" />

      {/* ✅ ENHANCED: Header with gradient */}
      <LinearGradient colors={["#E91E63", "#F06292"]} style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <AntDesign name="arrowleft" size={getResponsiveSize(24)} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác nhận tham gia sự kiện</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ✅ ENHANCED: Event Hero Card */}
        <View style={styles.eventHeroCard}>
          <LinearGradient
            colors={["#E91E63", "#F06292", "#CE93D8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.eventHeroGradient}
          >
            <View style={styles.eventHeroContent}>
              <View style={styles.eventBadge}>
                <MaterialIcons name="event" size={getResponsiveSize(16)} color="#fff" />
                <Text style={styles.eventBadgeText}>SỰ KIỆN ĐẶC BIỆT</Text>
              </View>

              <Text style={styles.eventHeroTitle}>{params.event.name}</Text>

              <View style={styles.eventHeroDetails}>
                <View style={styles.eventHeroDetailItem}>
                  <Feather name="calendar" size={getResponsiveSize(16)} color="#fff" />
                  <Text style={styles.eventHeroDetailText}>
                    {formatDate(params.event.startDate)}
                  </Text>
                </View>

                <View style={styles.eventHeroDetailItem}>
                  <Feather name="clock" size={getResponsiveSize(16)} color="#fff" />
                  <Text style={styles.eventHeroDetailText}>
                    {formatTime(params.event.startDate)} - {formatTime(params.event.endDate)}
                  </Text>
                </View>

                {params.event.locationName && (
                  <View style={styles.eventHeroDetailItem}>
                    <Feather name="map-pin" size={getResponsiveSize(16)} color="#fff" />
                    <Text style={styles.eventHeroDetailText} numberOfLines={2}>
                      {params.event.locationName}
                    </Text>
                  </View>
                )}
              </View>

              {/* ✅ Price highlight */}
              <View style={styles.priceHighlight}>
                <Text style={styles.priceLabel}>Giá tham gia</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.currentPrice}>{formatCurrency(totalPrice)}</Text>
                  {params.event.originalPrice && params.event.discountedPrice &&
                    params.event.originalPrice > params.event.discountedPrice && (
                      <Text style={styles.originalPrice}>
                        {formatCurrency(params.event.originalPrice)}
                      </Text>
                    )}
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ✅ ENHANCED: Photographer Card */}
        <View style={styles.photographerCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons name="camera" size={getResponsiveSize(20)} color="#E91E63" />
            </View>
            <Text style={styles.cardTitle}>Photographer đã chọn</Text>
          </View>

          <View style={styles.photographerInfo}>
            <View style={styles.photographerImageContainer}>
              <Image
                source={{
                  uri: params.photographer.profileImage ||
                    "https://via.placeholder.com/80x80/f0f0f0/999?text=P",
                }}
                style={styles.photographerImage}
                defaultSource={{
                  uri: "https://via.placeholder.com/80x80/f0f0f0/999?text=P",
                }}
              />
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={getResponsiveSize(16)} color="#4CAF50" />
              </View>
            </View>

            <View style={styles.photographerDetails}>
              <Text style={styles.photographerName} numberOfLines={2}>
                {params.photographer.fullName}
              </Text>

              {params.photographer.specialRate && (
                <View style={styles.specialRateContainer}>
                  <MaterialIcons name="star" size={getResponsiveSize(16)} color="#FFD700" />
                  <Text style={styles.specialRateText}>
                    Giá đặc biệt: {formatCurrency(params.photographer.specialRate)}/giờ
                  </Text>
                </View>
              )}

              <View style={styles.photographerStats}>
                <View style={styles.statItem}>
                  <MaterialIcons name="timer" size={getResponsiveSize(14)} color="#666" />
                  <Text style={styles.statText}>{durationHours} giờ</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <MaterialIcons name="event-available" size={getResponsiveSize(14)} color="#666" />
                  <Text style={styles.statText}>Đã phê duyệt</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ✅ ENHANCED: Payment Method Card */}
        <View style={styles.paymentCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <MaterialIcons name="payment" size={getResponsiveSize(20)} color="#E91E63" />
            </View>
            <Text style={styles.cardTitle}>Chọn phương thức thanh toán</Text>
          </View>

          <View style={styles.paymentMethods}>
            {/* Bank QR Payment */}
            <TouchableOpacity
              onPress={() => setSelectedPaymentMethod("bank_qr")}
              style={[
                styles.paymentMethod,
                selectedPaymentMethod === "bank_qr" && styles.paymentMethodSelected
              ]}
            >
              <View style={[
                styles.paymentMethodIcon,
                selectedPaymentMethod === "bank_qr" && styles.paymentMethodIconSelected
              ]}>
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={getResponsiveSize(24)}
                  color={selectedPaymentMethod === "bank_qr" ? "#fff" : "#666"}
                />
              </View>

              <View style={styles.paymentMethodContent}>
                <Text style={[
                  styles.paymentMethodTitle,
                  selectedPaymentMethod === "bank_qr" && styles.paymentMethodTitleSelected
                ]}>
                  Quét mã ngân hàng
                </Text>
                <Text style={styles.paymentMethodSubtitle}>
                  Thanh toán qua QR code ngân hàng
                </Text>
              </View>

              <View style={[
                styles.radioButton,
                selectedPaymentMethod === "bank_qr" && styles.radioButtonSelected
              ]}>
                {selectedPaymentMethod === "bank_qr" && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>

            {/* SnapLink Wallet Payment */}
            <TouchableOpacity
              onPress={() => setSelectedPaymentMethod("snaplink_wallet")}
              style={[
                styles.paymentMethod,
                selectedPaymentMethod === "snaplink_wallet" && styles.paymentMethodSelected
              ]}
            >
              <View style={[
                styles.paymentMethodIcon,
                selectedPaymentMethod === "snaplink_wallet" && styles.paymentMethodIconSelected
              ]}>
                <MaterialCommunityIcons
                  name="wallet"
                  size={getResponsiveSize(24)}
                  color={selectedPaymentMethod === "snaplink_wallet" ? "#fff" : "#666"}
                />
              </View>

              <View style={styles.paymentMethodContent}>
                <Text style={[
                  styles.paymentMethodTitle,
                  selectedPaymentMethod === "snaplink_wallet" && styles.paymentMethodTitleSelected
                ]}>
                  Ví SnapLink
                </Text>
                <Text style={styles.paymentMethodSubtitle}>
                  Thanh toán từ ví SnapLink của bạn
                </Text>
              </View>

              <View style={[
                styles.radioButton,
                selectedPaymentMethod === "snaplink_wallet" && styles.radioButtonSelected
              ]}>
                {selectedPaymentMethod === "snaplink_wallet" && (
                  <View style={styles.radioButtonInner} />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ✅ ENHANCED: Price Summary Card */}
        <View style={styles.priceCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIcon}>
              <MaterialIcons name="receipt" size={getResponsiveSize(20)} color="#E91E63" />
            </View>
            <Text style={styles.cardTitle}>Chi phí dự kiến</Text>
          </View>

          <View style={styles.priceBreakdown}>
            <View style={styles.priceItem}>
              <Text style={styles.priceItemLabel}>Phí tham gia sự kiện ({durationHours}h)</Text>
              <Text style={styles.priceItemValue}>{formatCurrency(totalPrice)}</Text>
            </View>

            {params.event.originalPrice && params.event.discountedPrice &&
              params.event.originalPrice > params.event.discountedPrice && (
                <View style={styles.priceItem}>
                  <Text style={styles.discountLabel}>Giảm giá sự kiện</Text>
                  <Text style={styles.discountValue}>
                    -{formatCurrency(params.event.originalPrice - params.event.discountedPrice)}
                  </Text>
                </View>
              )}

            <View style={styles.priceDivider} />

            <View style={styles.totalPriceItem}>
              <Text style={styles.totalPriceLabel}>Tổng cộng</Text>
              <Text style={styles.totalPriceValue}>{formatCurrency(totalPrice)}</Text>
            </View>
          </View>
        </View>

        {/* ✅ Booking Info Card */}
        {regularBooking && (
          <View style={styles.bookingInfoCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIcon}>
                <MaterialIcons name="info" size={getResponsiveSize(20)} color="#E91E63" />
              </View>
              <Text style={styles.cardTitle}>Thông tin booking</Text>
            </View>

            <View style={styles.bookingInfoContent}>
              <View style={styles.bookingInfoItem}>
                <Text style={styles.bookingInfoLabel}>Booking ID:</Text>
                <Text style={styles.bookingInfoValue}>{regularBooking.bookingId}</Text>
              </View>
              <View style={styles.bookingInfoItem}>
                <Text style={styles.bookingInfoLabel}>Trạng thái:</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>{regularBooking.status}</Text>
                </View>
              </View>
              <View style={styles.bookingInfoItem}>
                <Text style={styles.bookingInfoLabel}>Thời lượng:</Text>
                <Text style={styles.bookingInfoValue}>{durationHours} giờ</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ✅ ENHANCED: Bottom Payment Button */}
      <View style={styles.bottomContainer}>
        <View style={styles.pricePreview}>
          <Text style={styles.pricePreviewLabel}>Tổng thanh toán</Text>
          <Text style={styles.pricePreviewValue}>{formatCurrency(totalPrice)}</Text>
        </View>

        <TouchableOpacity
          onPress={handlePayment}
          activeOpacity={0.8}
          style={[styles.paymentButton, isProcessing && styles.paymentButtonDisabled]}
          disabled={isProcessing}
        >
          <LinearGradient
            colors={isProcessing ? ["#d1d5db", "#d1d5db"] : ["#E91E63", "#F06292"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.paymentButtonGradient}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color="#666" style={{ marginRight: 8 }} />
                <Text style={styles.paymentButtonTextDisabled}>Đang xử lý...</Text>
              </>
            ) : (
              <>
                <MaterialIcons
                  name="payment"
                  size={getResponsiveSize(20)}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.paymentButtonText}>
                  {selectedPaymentMethod === "snaplink_wallet"
                    ? `Thanh toán ${formatCurrency(totalPrice)}`
                    : `Thanh toán ${formatCurrency(totalPrice)}`}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* ✅ Wallet Success Modal */}
      {showWalletSuccessModal && (
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Success Icon */}
              <View style={styles.successIcon}>
                <MaterialIcons name="check-circle" size={getResponsiveSize(80)} color="#4CAF50" />
              </View>

              {/* Title */}
              <Text style={styles.modalTitle}>Tham gia sự kiện thành công! 🎉</Text>

              {/* Message */}
              <Text style={styles.modalMessage}>
                {totalPrice > 0
                  ? `Đã thanh toán thành công ${formatCurrency(totalPrice)} từ ví SnapLink. Booking sự kiện của bạn đã được xác nhận.`
                  : "Bạn đã đăng ký tham gia sự kiện thành công!"
                }
              </Text>

              {/* Event Details */}
              <View style={styles.modalDetails}>
                <Text style={styles.modalDetailsTitle}>Chi tiết tham gia sự kiện:</Text>
                <Text style={styles.modalDetailItem}>🎉 {params.event.name}</Text>
                <Text style={styles.modalDetailItem}>📸 {params.photographer.fullName}</Text>
                <Text style={styles.modalDetailItem}>📅 {formatDate(params.event.startDate)}</Text>
                <Text style={styles.modalDetailItem}>
                  ⏰ {formatTime(params.event.startDate)} - {formatTime(params.event.endDate)}
                </Text>
                {params.event.locationName && (
                  <Text style={styles.modalDetailItem}>📍 {params.event.locationName}</Text>
                )}
                {totalPrice > 0 && (
                  <Text style={styles.modalDetailItem}>💰 {formatCurrency(totalPrice)}</Text>
                )}
              </View>

              {/* Complete Button */}
              <TouchableOpacity
                onPress={() => {
                  setShowWalletSuccessModal(false);
                  navigation.reset({
                    index: 0,
                    routes: [
                      {
                        name: "CustomerMain",
                        params: { screen: "CustomerHomeScreen" },
                      },
                    ],
                  });
                }}
                style={styles.modalButton}
              >
                <LinearGradient
                  colors={["#4CAF50", "#66BB6A"]}
                  style={styles.modalButtonGradient}
                >
                  <Text style={styles.modalButtonText}>Hoàn tất</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: getResponsiveSize(50),
    paddingBottom: getResponsiveSize(20),
  },
  backButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(8),
  },
  headerTitle: {
    fontSize: getResponsiveSize(18),
    fontWeight: "bold",
    color: "#fff",
  },
  headerSpacer: {
    width: getResponsiveSize(40),
  },

  // Content
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: getResponsiveSize(120),
  },

  // Event Hero Card
  eventHeroCard: {
    marginHorizontal: getResponsiveSize(20),
    marginTop: getResponsiveSize(16),
    borderRadius: getResponsiveSize(20),
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  eventHeroGradient: {
    padding: getResponsiveSize(24),
  },
  eventHeroContent: {
    alignItems: "center",
  },
  eventBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(6),
    borderRadius: getResponsiveSize(20),
    marginBottom: getResponsiveSize(16),
  },
  eventBadgeText: {
    color: "#fff",
    fontSize: getResponsiveSize(12),
    fontWeight: "bold",
    marginLeft: getResponsiveSize(4),
  },
  eventHeroTitle: {
    fontSize: getResponsiveSize(24),
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: getResponsiveSize(20),
    lineHeight: getResponsiveSize(32),
  },
  eventHeroDetails: {
    alignItems: "center",
    marginBottom: getResponsiveSize(20),
    gap: getResponsiveSize(8),
  },
  eventHeroDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(8),
    borderRadius: getResponsiveSize(20),
    minWidth: getResponsiveSize(200),
    justifyContent: "center",
  },
  eventHeroDetailText: {
    color: "#fff",
    fontSize: getResponsiveSize(14),
    fontWeight: "500",
    marginLeft: getResponsiveSize(8),
    textAlign: "center",
    flex: 1,
  },
  priceHighlight: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(16),
    alignItems: "center",
    minWidth: "100%",
  },
  priceLabel: {
    color: "#fff",
    fontSize: getResponsiveSize(14),
    fontWeight: "500",
    marginBottom: getResponsiveSize(8),
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: getResponsiveSize(8),
  },
  currentPrice: {
    color: "#fff",
    fontSize: getResponsiveSize(20),
    fontWeight: "bold",
  },
  originalPrice: {
    color: "rgba(255,255,255,0.7)",
    fontSize: getResponsiveSize(16),
    textDecorationLine: "line-through",
  },

  // Common Card Styles
  photographerCard: {
    backgroundColor: "#fff",
    marginHorizontal: getResponsiveSize(20),
    marginTop: getResponsiveSize(16),
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(20),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  paymentCard: {
    backgroundColor: "#fff",
    marginHorizontal: getResponsiveSize(20),
    marginTop: getResponsiveSize(16),
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(20),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  priceCard: {
    backgroundColor: "#fff",
    marginHorizontal: getResponsiveSize(20),
    marginTop: getResponsiveSize(16),
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(20),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookingInfoCard: {
    backgroundColor: "#fff",
    marginHorizontal: getResponsiveSize(20),
    marginTop: getResponsiveSize(16),
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(20),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: getResponsiveSize(16),
  },
  cardIcon: {
    backgroundColor: "#E91E63",
    borderRadius: getResponsiveSize(8),
    padding: getResponsiveSize(8),
    marginRight: getResponsiveSize(12),
  },
  cardTitle: {
    fontSize: getResponsiveSize(16),
    fontWeight: "bold",
    color: "#333",
  },

  // Photographer Card
  photographerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  photographerImageContainer: {
    position: "relative",
    marginRight: getResponsiveSize(16),
  },
  photographerImage: {
    width: getResponsiveSize(70),
    height: getResponsiveSize(70),
    borderRadius: getResponsiveSize(35),
    backgroundColor: "#f0f0f0",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#fff",
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(2),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  photographerDetails: {
    flex: 1,
  },
  photographerName: {
    fontSize: getResponsiveSize(18),
    fontWeight: "bold",
    color: "#333",
    marginBottom: getResponsiveSize(8),
  },
  specialRateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: getResponsiveSize(8),
  },
  specialRateText: {
    fontSize: getResponsiveSize(14),
    color: "#E91E63",
    fontWeight: "600",
    marginLeft: getResponsiveSize(4),
  },
  photographerStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: getResponsiveSize(12),
    color: "#666",
    marginLeft: getResponsiveSize(4),
  },
  statDivider: {
    width: 1,
    height: getResponsiveSize(12),
    backgroundColor: "#e0e0e0",
    marginHorizontal: getResponsiveSize(12),
  },

  // Payment Methods
  paymentMethods: {
    gap: getResponsiveSize(12),
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    padding: getResponsiveSize(16),
    borderRadius: getResponsiveSize(12),
    borderWidth: 2,
    borderColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  paymentMethodSelected: {
    borderColor: "#E91E63",
    backgroundColor: "#FFF0F5",
  },
  paymentMethodIcon: {
    width: getResponsiveSize(48),
    height: getResponsiveSize(48),
    borderRadius: getResponsiveSize(24),
    backgroundColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: getResponsiveSize(12),
  },
  paymentMethodIconSelected: {
    backgroundColor: "#E91E63",
  },
  paymentMethodContent: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: getResponsiveSize(16),
    fontWeight: "bold",
    color: "#333",
    marginBottom: getResponsiveSize(4),
  },
  paymentMethodTitleSelected: {
    color: "#E91E63",
  },
  paymentMethodSubtitle: {
    fontSize: getResponsiveSize(13),
    color: "#666",
  },
  radioButton: {
    width: getResponsiveSize(20),
    height: getResponsiveSize(20),
    borderRadius: getResponsiveSize(10),
    borderWidth: 2,
    borderColor: "#e0e0e0",
    alignItems: "center",
    justifyContent: "center",
  },
  radioButtonSelected: {
    borderColor: "#E91E63",
  },
  radioButtonInner: {
    width: getResponsiveSize(10),
    height: getResponsiveSize(10),
    borderRadius: getResponsiveSize(5),
    backgroundColor: "#E91E63",
  },

  // Price Breakdown
  priceBreakdown: {
    gap: getResponsiveSize(12),
  },
  priceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceItemLabel: {
    fontSize: getResponsiveSize(14),
    color: "#666",
    flex: 1,
  },
  priceItemValue: {
    fontSize: getResponsiveSize(14),
    fontWeight: "600",
    color: "#333",
  },
  discountLabel: {
    fontSize: getResponsiveSize(14),
    color: "#4CAF50",
    flex: 1,
  },
  discountValue: {
    fontSize: getResponsiveSize(14),
    fontWeight: "600",
    color: "#4CAF50",
  },
  priceDivider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: getResponsiveSize(8),
  },
  totalPriceItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: getResponsiveSize(8),
  },
  totalPriceLabel: {
    fontSize: getResponsiveSize(16),
    fontWeight: "bold",
    color: "#333",
  },
  totalPriceValue: {
    fontSize: getResponsiveSize(18),
    fontWeight: "bold",
    color: "#E91E63",
  },

  // Booking Info
  bookingInfoContent: {
    gap: getResponsiveSize(12),
  },
  bookingInfoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingInfoLabel: {
    fontSize: getResponsiveSize(14),
    color: "#666",
  },
  bookingInfoValue: {
    fontSize: getResponsiveSize(14),
    fontWeight: "600",
    color: "#333",
  },
  statusBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: getResponsiveSize(8),
    paddingVertical: getResponsiveSize(4),
    borderRadius: getResponsiveSize(6),
  },
  statusText: {
    fontSize: getResponsiveSize(12),
    fontWeight: "600",
    color: "#FF9800",
  },

  // Bottom Container
  bottomContainer: {
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingHorizontal: getResponsiveSize(20),
    paddingVertical: getResponsiveSize(16),
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pricePreview: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: getResponsiveSize(12),
  },
  pricePreviewLabel: {
    fontSize: getResponsiveSize(16),
    fontWeight: "600",
    color: "#333",
  },
  pricePreviewValue: {
    fontSize: getResponsiveSize(18),
    fontWeight: "bold",
    color: "#E91E63",
  },
  paymentButton: {
    borderRadius: getResponsiveSize(12),
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  paymentButtonDisabled: {
    elevation: 0,
    shadowOpacity: 0,
  },
  paymentButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: getResponsiveSize(16),
    paddingHorizontal: getResponsiveSize(20),
  },
  paymentButtonText: {
    color: "#fff",
    fontSize: getResponsiveSize(16),
    fontWeight: "bold",
  },
  paymentButtonTextDisabled: {
    color: "#666",
    fontSize: getResponsiveSize(16),
    fontWeight: "bold",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: getResponsiveSize(20),
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(24),
    alignItems: "center",
    width: "100%",
    maxWidth: getResponsiveSize(360),
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  successIcon: {
    marginBottom: getResponsiveSize(20),
  },
  modalTitle: {
    fontSize: getResponsiveSize(24),
    fontWeight: "bold",
    color: "#333",
    marginBottom: getResponsiveSize(12),
    textAlign: "center",
  },
  modalMessage: {
    fontSize: getResponsiveSize(16),
    color: "#666",
    textAlign: "center",
    lineHeight: getResponsiveSize(24),
    marginBottom: getResponsiveSize(24),
  },
  modalDetails: {
    backgroundColor: "#f8f9fa",
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(16),
    width: "100%",
    marginBottom: getResponsiveSize(24),
  },
  modalDetailsTitle: {
    fontSize: getResponsiveSize(16),
    fontWeight: "bold",
    color: "#333",
    marginBottom: getResponsiveSize(12),
  },
  modalDetailItem: {
    fontSize: getResponsiveSize(14),
    color: "#666",
    marginBottom: getResponsiveSize(6),
    lineHeight: getResponsiveSize(20),
  },
  modalButton: {
    width: "100%",
    borderRadius: getResponsiveSize(12),
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalButtonGradient: {
    paddingVertical: getResponsiveSize(16),
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: getResponsiveSize(16),
    fontWeight: "bold",
  },

  // Error & Loading States
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    paddingHorizontal: getResponsiveSize(40),
  },
  errorTitle: {
    fontSize: getResponsiveSize(20),
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginTop: getResponsiveSize(16),
    marginBottom: getResponsiveSize(8),
  },
  errorSubtitle: {
    fontSize: getResponsiveSize(16),
    color: "#666",
    textAlign: "center",
    marginBottom: getResponsiveSize(24),
  },
  errorButton: {
    backgroundColor: "#E91E63",
    paddingHorizontal: getResponsiveSize(24),
    paddingVertical: getResponsiveSize(12),
    borderRadius: getResponsiveSize(8),
  },
  errorButtonText: {
    color: "#fff",
    fontSize: getResponsiveSize(16),
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
  },
  loadingText: {
    fontSize: getResponsiveSize(16),
    fontWeight: "600",
    color: "#333",
    marginTop: getResponsiveSize(16),
  },
});