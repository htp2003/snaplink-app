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
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { AntDesign, Feather, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackNavigationProp } from "../../navigation/types";
import { useAuth } from "../../hooks/useAuth";
import { useBooking } from "../../hooks/useBooking";
import { usePayment } from "../../hooks/usePayment";
import { useWallet } from "../../hooks/useWallet";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { PaymentFlowData } from "../../types/payment";
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Route params structure for Event Booking
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

  photographer: {
    eventPhotographerId: number;
    photographerId: number;
    fullName: string;
    profileImage?: string;
    specialRate?: number;
    rating?: number;
    verificationStatus?: string;
  };

  bookingTimes?: {
    startTime: string;
    endTime: string;
    startDatetime: string;
    endDatetime: string;
  };

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

  // Wallet hook
  const {
    walletBalance,
    loading: balanceLoading,
    refreshWalletData,
  } = useWallet();

  const shouldFetchWallet = isAuthenticated && user?.id;

  // Booking và Payment hooks
  const { getBookingById, confirmBooking } = useBooking();
  const {
    createEventPayment,
    creatingPayment,
    error: paymentError
  } = usePayment();

  // Payment method state
  type PaymentMethod = "bank_qr" | "snaplink_wallet";
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>("bank_qr");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWalletSuccessModal, setShowWalletSuccessModal] = useState(false);

  // Booking state
  const [regularBooking, setRegularBooking] = useState<any>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);

  // Test token 
  useEffect(() => {
    const debugToken = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          console.log('Token exists:', !!token);
          console.log('Token length:', token.length);

          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const payload = JSON.parse(atob(parts[1]));
              const now = Math.floor(Date.now() / 1000);
              const exp = payload.exp;
              const iat = payload.iat;

              console.log('Token issued at:', new Date(iat * 1000));
              console.log('Token expires at:', new Date(exp * 1000));
              console.log('Current time:', new Date());
              console.log('Time until expiry:', (exp - now), 'seconds');
              console.log('Is expired:', exp < now);

              const expiresIn = exp - now;
              if (expiresIn < 300) {
                console.warn('Token will expire soon!', expiresIn, 'seconds');
              }
            }
          } catch (decodeError) {
            console.log('Token is not JWT format');
          }
        }
      } catch (error) {
        console.error('Error debugging token:', error);
      }
    };

    debugToken();
  }, []);

  // Load regular booking data
  useEffect(() => {
    const loadRegularBooking = async () => {
      const bookingId = params.eventBookingResponse?.bookingId;

      if (bookingId) {
        try {
          setLoadingBooking(true);
          console.log("Loading regular booking for event booking ID:", bookingId);

          const bookingData = await getBookingById(bookingId);

          if (bookingData) {
            setRegularBooking(bookingData);
            console.log("Regular booking loaded for event:", bookingData);
          } else {
            console.warn("No regular booking data returned");
            console.log("Will use fallback price calculation");
          }
        } catch (error) {
          console.error("Error loading regular booking:", error);
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

  // Refresh wallet data khi màn hình được focus
  useFocusEffect(
    React.useCallback(() => {
      if (shouldFetchWallet) {
        refreshWalletData();
      }
    }, [shouldFetchWallet, refreshWalletData])
  );

  // Validate params
  if (!params || !params.event || !params.photographer) {
    return (
      <View className="flex-1 items-center justify-center">
        <MaterialIcons name="error" size={getResponsiveSize(48)} color="#EF5350" />
        <Text className="text-xl font-bold">Thông tin không hợp lệ</Text>
        <Text className="text-gray-600">Vui lòng quay lại và thử lại</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isAuthenticated || !user?.id) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#E91E63" />
        <Text className="text-xl font-bold">Đang kiểm tra xác thực...</Text>
      </View>
    );
  }

  if (loadingBooking) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#E91E63" />
        <Text className="text-xl font-bold">Đang tải thông tin booking...</Text>
      </View>
    );
  }

  // Helper functions
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

  // Calculate fallback price if no booking data
  const calculateFallbackPrice = (): number => {
    const eventBaseFee = params.event.discountedPrice || params.event.originalPrice || 0;
    const photographerRate = params.photographer.specialRate || 0;
    const duration = params.bookingTimes ?
      calculateDurationFromTimes(params.bookingTimes.startTime, params.bookingTimes.endTime) : 1;

    return eventBaseFee + (photographerRate * duration);
  };

  // Calculate pricing - use regular booking data if available, otherwise fallback
  const totalPrice = params.eventPrice ||
    params.eventBookingResponse?.eventPrice ||
    regularBooking?.totalPrice ||
    calculateFallbackPrice();

  const durationHours = regularBooking?.durationHours ||
    (params.bookingTimes ? calculateDurationFromTimes(params.bookingTimes.startTime, params.bookingTimes.endTime) : 1);

  // Kiểm tra số dư ví có đủ để thanh toán không
  const isWalletBalanceSufficient = useMemo(() => {
    if (!shouldFetchWallet || balanceLoading || !walletBalance) return false;
    return walletBalance.balance >= totalPrice;
  }, [shouldFetchWallet, walletBalance, balanceLoading, totalPrice]);

  // Auto-deselect wallet payment nếu số dư không đủ
  useEffect(() => {
    if (selectedPaymentMethod === "snaplink_wallet" && shouldFetchWallet && !balanceLoading && !isWalletBalanceSufficient) {
      setSelectedPaymentMethod("bank_qr");
    }
  }, [selectedPaymentMethod, shouldFetchWallet, balanceLoading, isWalletBalanceSufficient]);

  // Get the booking ID for payment
  const getBookingIdForPayment = (): number => {
    console.log('Getting booking ID for payment...');

    const sources = [
      { name: 'eventBookingResponse.booking.bookingId', value: params.eventBookingResponse?.booking?.bookingId },
      { name: 'eventBookingResponse.bookingId', value: params.eventBookingResponse?.bookingId },
      { name: 'bookingResponse.booking.bookingId', value: params.bookingResponse?.booking?.bookingId },
      { name: 'bookingResponse.bookingId', value: params.bookingResponse?.bookingId },
      { name: 'params.bookingId', value: params.bookingId },
      { name: 'regularBooking.bookingId', value: regularBooking?.bookingId },
    ];

    console.log('All booking ID sources:', sources);

    for (const source of sources) {
      if (source.value && typeof source.value === 'number' && source.value > 0) {
        console.log(`FOUND booking ID from ${source.name}:`, source.value);
        return source.value;
      } else {
        console.log(`${source.name}:`, source.value, '(invalid)');
      }
    }

    const fallbackId = params.eventBookingId;
    if (fallbackId && typeof fallbackId === 'number' && fallbackId > 0) {
      console.warn('FALLBACK: Using eventBookingId as last resort:', fallbackId);
      console.warn('This might cause issues - eventBookingId is not regular booking ID');
      return fallbackId;
    }

    console.error('NO BOOKING ID FOUND AT ALL!');
    console.error('Debug info:', {
      hasParams: !!params,
      paramsKeys: params ? Object.keys(params) : [],
      hasRegularBooking: !!regularBooking,
    });

    return 0;
  };

  // Payment handler using shared payment flow
  const handlePayment = async () => {
    if (isProcessing) return;

    if (!user?.id) {
      Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
      return;
    }

    if (!isAuthenticated) {
      console.error('User not authenticated');
      Alert.alert("Lỗi xác thực", "Vui lòng đăng nhập lại");
      navigation.navigate("Login");
      return;
    }

    // Kiểm tra số dư ví trước khi xử lý thanh toán
    if (selectedPaymentMethod === "snaplink_wallet" && !isWalletBalanceSufficient) {
      Alert.alert(
        "Số dư không đủ", 
        `Số dư ví hiện tại: ${formatCurrency(walletBalance?.balance || 0)}\nSố tiền cần thanh toán: ${formatCurrency(totalPrice)}\n\nVui lòng nạp thêm tiền hoặc chọn phương thức thanh toán khác.`,
        [
          {
            text: "Nạp tiền",
            onPress: () => navigation.navigate("WalletScreen")
          },
          {
            text: "Chọn phương thức khác", 
            onPress: () => setSelectedPaymentMethod("bank_qr")
          }
        ]
      );
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      console.log('Auth token exists:', !!token);
      console.log('Auth token length:', token?.length || 0);

      if (!token) {
        console.error('No auth token found');
        Alert.alert("Phiên đăng nhập hết hạn", "Vui lòng đăng nhập lại", [
          { text: "Đăng nhập", onPress: () => navigation.navigate("Login") }
        ]);
        return;
      }
    } catch (error) {
      console.error('Error checking auth token:', error);
    }

    const bookingId = getBookingIdForPayment();

    if (!bookingId) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin booking để thanh toán");
      return;
    }

    setIsProcessing(true);

    try {
      if (selectedPaymentMethod === "snaplink_wallet") {
        console.log("Processing wallet payment for event booking:", bookingId);

        const confirmSuccess = await confirmBooking(bookingId);

        if (!confirmSuccess) {
          throw new Error("Không thể xác nhận booking và trừ tiền từ ví");
        }

        setShowWalletSuccessModal(true);
      } else {
        // QR Payment - create payment using shared flow
        console.log("Processing bank QR payment for event booking:", bookingId);

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

        console.log("Event payment created:", paymentResult);

        // Navigate with enhanced PaymentFlowData for event booking
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
            paymentId: paymentResult.paymentId,
            externalTransactionId: paymentResult.externalTransactionId || "",
            customerId: user.id,
            customerName: user.fullName || user.email || "Unknown",
            totalAmount: totalPrice,
            status: paymentResult.status || "Pending",
            bookingId: bookingId,
            photographerName: params.photographer.fullName,
            locationName: params.event.locationName || "",
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

        navigation.navigate("PaymentWaitingScreen", paymentData);
      }
    } catch (err) {
      console.error("Event payment processing error:", err);

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
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="light-content" backgroundColor="#E91E63" />

      {/* Header with gradient */}
      <LinearGradient 
        colors={["#E91E63", "#F06292"]} 
        className="flex-row items-center justify-between"
        style={{
          paddingHorizontal: getResponsiveSize(20),
          paddingTop: getResponsiveSize(50),
          paddingBottom: getResponsiveSize(20),
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-white bg-opacity-20 rounded-xl"
          style={{ padding: getResponsiveSize(8) }}
          activeOpacity={0.8}
        >
          <AntDesign name="arrowleft" size={getResponsiveSize(24)} color="#fff" />
        </TouchableOpacity>
        <Text 
          className="text-white font-bold"
          style={{ fontSize: getResponsiveSize(18) }}
        >
          Xác nhận tham gia sự kiện
        </Text>
        <View style={{ width: getResponsiveSize(40) }} />
      </LinearGradient>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: getResponsiveSize(120) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Hero Card */}
        <View
          className="rounded-2xl overflow-hidden shadow-lg"
          style={{
            marginHorizontal: getResponsiveSize(20),
            marginTop: getResponsiveSize(16),
            elevation: 8,
          }}
        >
          <LinearGradient
            colors={["#E91E63", "#F06292", "#CE93D8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: getResponsiveSize(24) }}
          >
            <View className="items-center">
              <View className="flex-row items-center bg-white bg-opacity-20 px-3 py-1.5 rounded-full mb-4">
                <MaterialIcons name="event" size={getResponsiveSize(16)} color="#fff" />
                <Text 
                  className="text-white font-bold ml-1"
                  style={{ fontSize: getResponsiveSize(12) }}
                >
                  SỰ KIỆN ĐẶC BIỆT
                </Text>
              </View>

              <Text 
                className="text-white font-bold text-center mb-5"
                style={{ 
                  fontSize: getResponsiveSize(24),
                  lineHeight: getResponsiveSize(32) 
                }}
              >
                {params.event.name}
              </Text>

              <View className="items-center mb-5 gap-2">
                <View className="flex-row items-center bg-white bg-opacity-15 px-3 py-2 rounded-full min-w-50 justify-center">
                  <Feather name="calendar" size={getResponsiveSize(16)} color="#fff" />
                  <Text 
                    className="text-white font-medium ml-2 text-center flex-1"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    {formatDate(params.event.startDate)}
                  </Text>
                </View>

                <View className="flex-row items-center bg-white bg-opacity-15 px-3 py-2 rounded-full min-w-50 justify-center">
                  <Feather name="clock" size={getResponsiveSize(16)} color="#fff" />
                  <Text 
                    className="text-white font-medium ml-2 text-center flex-1"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    {formatTime(params.event.startDate)} - {formatTime(params.event.endDate)}
                  </Text>
                </View>

                {params.event.locationName && (
                  <View className="flex-row items-center bg-white bg-opacity-15 px-3 py-2 rounded-full min-w-50 justify-center">
                    <Feather name="map-pin" size={getResponsiveSize(16)} color="#fff" />
                    <Text 
                      className="text-white font-medium ml-2 text-center flex-1"
                      style={{ fontSize: getResponsiveSize(14) }}
                      numberOfLines={2}
                    >
                      {params.event.locationName}
                    </Text>
                  </View>
                )}
              </View>

              {/* Price highlight */}
              <View 
                className="bg-white bg-opacity-20 rounded-2xl p-4 items-center w-full"
              >
                <Text 
                  className="text-white font-medium mb-2"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  Giá tham gia
                </Text>
                <View className="flex-row items-center gap-2">
                  <Text 
                    className="text-white font-bold"
                    style={{ fontSize: getResponsiveSize(20) }}
                  >
                    {formatCurrency(totalPrice)}
                  </Text>
                  {params.event.originalPrice && params.event.discountedPrice &&
                    params.event.originalPrice > params.event.discountedPrice && (
                      <Text 
                        className="text-white text-opacity-70 line-through"
                        style={{ fontSize: getResponsiveSize(16) }}
                      >
                        {formatCurrency(params.event.originalPrice)}
                      </Text>
                    )}
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Photographer Card */}
        <View
          className="bg-white rounded-2xl shadow-sm"
          style={{
            marginHorizontal: getResponsiveSize(20),
            marginTop: getResponsiveSize(16),
            padding: getResponsiveSize(20),
            elevation: 3,
          }}
        >
          <View 
            className="flex-row items-center"
            style={{ marginBottom: getResponsiveSize(16) }}
          >
            <View 
              className="bg-pink-600 rounded-lg"
              style={{
                padding: getResponsiveSize(8),
                marginRight: getResponsiveSize(12),
              }}
            >
              <MaterialCommunityIcons name="camera" size={getResponsiveSize(20)} color="#fff" />
            </View>
            <Text 
              className="font-bold text-gray-800"
              style={{ fontSize: getResponsiveSize(16) }}
            >
              Photographer đã chọn
            </Text>
          </View>

          <View className="flex-row items-center">
            <View 
              className="relative"
              style={{ marginRight: getResponsiveSize(16) }}
            >
              <Image
                source={{
                  uri: params.photographer.profileImage ||
                    "https://via.placeholder.com/80x80/f0f0f0/999?text=P",
                }}
                className="bg-gray-100"
                style={{
                  width: getResponsiveSize(70),
                  height: getResponsiveSize(70),
                  borderRadius: getResponsiveSize(35),
                }}
                defaultSource={{
                  uri: "https://via.placeholder.com/80x80/f0f0f0/999?text=P",
                }}
              />
              <View 
                className="absolute -bottom-0.5 -right-0.5 bg-white rounded-xl shadow-sm"
                style={{ padding: getResponsiveSize(2) }}
              >
                <MaterialIcons name="verified" size={getResponsiveSize(16)} color="#4CAF50" />
              </View>
            </View>

            <View className="flex-1">
              <Text 
                className="font-bold text-gray-800"
                style={{
                  fontSize: getResponsiveSize(18),
                  marginBottom: getResponsiveSize(8),
                }}
                numberOfLines={2}
              >
                {params.photographer.fullName}
              </Text>

              {params.photographer.specialRate && (
                <View 
                  className="flex-row items-center"
                  style={{ marginBottom: getResponsiveSize(8) }}
                >
                  <MaterialIcons name="star" size={getResponsiveSize(16)} color="#FFD700" />
                  <Text 
                    className="text-pink-600 font-semibold ml-1"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    Giá đặc biệt: {formatCurrency(params.photographer.specialRate)}/giờ
                  </Text>
                </View>
              )}

              <View className="flex-row items-center">
                <View className="flex-row items-center">
                  <MaterialIcons name="timer" size={getResponsiveSize(14)} color="#666" />
                  <Text 
                    className="text-gray-600 ml-1"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    {durationHours} giờ
                  </Text>
                </View>
                <View 
                  className="bg-gray-300"
                  style={{
                    width: 1,
                    height: getResponsiveSize(12),
                    marginHorizontal: getResponsiveSize(12),
                  }}
                />
                <View className="flex-row items-center">
                  <MaterialIcons name="event-available" size={getResponsiveSize(14)} color="#666" />
                  <Text 
                    className="text-gray-600 ml-1"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    Đã phê duyệt
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Payment Method Card */}
        <View
          className="bg-white rounded-2xl shadow-sm"
          style={{
            marginHorizontal: getResponsiveSize(20),
            marginTop: getResponsiveSize(16),
            padding: getResponsiveSize(20),
            elevation: 3,
          }}
        >
          <View 
            className="flex-row items-center"
            style={{ marginBottom: getResponsiveSize(16) }}
          >
            <View 
              className="bg-pink-600 rounded-lg"
              style={{
                padding: getResponsiveSize(8),
                marginRight: getResponsiveSize(12),
              }}
            >
              <MaterialIcons name="payment" size={getResponsiveSize(20)} color="#fff" />
            </View>
            <Text 
              className="font-bold text-gray-800"
              style={{ fontSize: getResponsiveSize(16) }}
            >
              Chọn phương thức thanh toán
            </Text>
          </View>

          <View style={{ gap: getResponsiveSize(12) }}>
            {/* Bank QR Payment */}
            <TouchableOpacity
              onPress={() => setSelectedPaymentMethod("bank_qr")}
              className={`flex-row items-center rounded-xl border-2 ${
                selectedPaymentMethod === "bank_qr"
                  ? "bg-pink-50 border-pink-600"
                  : "bg-gray-50 border-gray-200"
              }`}
              style={{ padding: getResponsiveSize(16) }}
            >
              <View
                className={`rounded-full items-center justify-center ${
                  selectedPaymentMethod === "bank_qr"
                    ? "bg-pink-600"
                    : "bg-gray-200"
                }`}
                style={{
                  width: getResponsiveSize(48),
                  height: getResponsiveSize(48),
                  marginRight: getResponsiveSize(12),
                }}
              >
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={getResponsiveSize(24)}
                  color={selectedPaymentMethod === "bank_qr" ? "#fff" : "#666"}
                />
              </View>

              <View className="flex-1">
                <Text
                  className={`font-bold ${
                    selectedPaymentMethod === "bank_qr"
                      ? "text-pink-600"
                      : "text-gray-800"
                  }`}
                  style={{ 
                    fontSize: getResponsiveSize(16),
                    marginBottom: getResponsiveSize(4),
                  }}
                >
                  Quét mã ngân hàng
                </Text>
                <Text 
                  className="text-gray-600"
                  style={{ fontSize: getResponsiveSize(13) }}
                >
                  Thanh toán qua QR code ngân hàng
                </Text>
              </View>

              <View
                className={`rounded-full border-2 items-center justify-center ${
                  selectedPaymentMethod === "bank_qr"
                    ? "border-pink-600"
                    : "border-gray-300"
                }`}
                style={{
                  width: getResponsiveSize(20),
                  height: getResponsiveSize(20),
                }}
              >
                {selectedPaymentMethod === "bank_qr" && (
                  <View
                    className="bg-pink-600 rounded-full"
                    style={{
                      width: getResponsiveSize(10),
                      height: getResponsiveSize(10),
                    }}
                  />
                )}
              </View>
            </TouchableOpacity>

            {/* SnapLink Wallet Payment */}
            <TouchableOpacity
              onPress={() => shouldFetchWallet && isWalletBalanceSufficient && setSelectedPaymentMethod("snaplink_wallet")}
              className={`flex-row items-center rounded-xl border-2 ${
                selectedPaymentMethod === "snaplink_wallet"
                  ? "bg-pink-50 border-pink-600"
                  : !shouldFetchWallet || !isWalletBalanceSufficient 
                    ? "bg-gray-100 border-gray-200"
                    : "bg-gray-50 border-gray-200"
              }`}
              style={{ 
                padding: getResponsiveSize(16),
                opacity: shouldFetchWallet && isWalletBalanceSufficient ? 1 : 0.6
              }}
              disabled={!shouldFetchWallet || !isWalletBalanceSufficient}
            >
              <View
                className={`rounded-full items-center justify-center ${
                  selectedPaymentMethod === "snaplink_wallet"
                    ? "bg-pink-600"
                    : !shouldFetchWallet || !isWalletBalanceSufficient
                      ? "bg-gray-300"
                      : "bg-gray-200"
                }`}
                style={{
                  width: getResponsiveSize(48),
                  height: getResponsiveSize(48),
                  marginRight: getResponsiveSize(12),
                }}
              >
                <MaterialCommunityIcons
                  name="wallet"
                  size={getResponsiveSize(24)}
                  color={
                    selectedPaymentMethod === "snaplink_wallet" ? "#fff" :
                    (!shouldFetchWallet || !isWalletBalanceSufficient) ? "#999" : "#666"
                  }
                />
              </View>

              <View className="flex-1">
                <Text
                  className={`font-bold ${
                    selectedPaymentMethod === "snaplink_wallet"
                      ? "text-pink-600"
                      : !shouldFetchWallet || !isWalletBalanceSufficient
                        ? "text-gray-400"
                        : "text-gray-800"
                  }`}
                  style={{ 
                    fontSize: getResponsiveSize(16),
                    marginBottom: getResponsiveSize(4),
                  }}
                >
                  Ví SnapLink
                </Text>
                
                {/* Hiển thị số dư */}
                {!shouldFetchWallet ? (
                  <Text 
                    className="text-gray-400"
                    style={{ fontSize: getResponsiveSize(13) }}
                  >
                    Cần đăng nhập
                  </Text>
                ) : balanceLoading ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator size="small" color="#666" />
                    <Text 
                      className="text-gray-600 ml-2"
                      style={{ fontSize: getResponsiveSize(13) }}
                    >
                      Đang tải...
                    </Text>
                  </View>
                ) : (
                  <Text
                    className={isWalletBalanceSufficient ? "text-green-600 font-medium" : "text-red-500 font-medium"}
                    style={{ fontSize: getResponsiveSize(13) }}
                  >
                    Số dư: {formatCurrency(walletBalance?.balance || 0)}
                    {shouldFetchWallet && !isWalletBalanceSufficient && " (Không đủ)"}
                  </Text>
                )}
              </View>

              <View
                className={`rounded-full border-2 items-center justify-center ${
                  selectedPaymentMethod === "snaplink_wallet" && shouldFetchWallet && isWalletBalanceSufficient
                    ? "border-pink-600"
                    : "border-gray-300"
                }`}
                style={{
                  width: getResponsiveSize(20),
                  height: getResponsiveSize(20),
                }}
              >
                {selectedPaymentMethod === "snaplink_wallet" && shouldFetchWallet && isWalletBalanceSufficient && (
                  <View
                    className="bg-pink-600 rounded-full"
                    style={{
                      width: getResponsiveSize(10),
                      height: getResponsiveSize(10),
                    }}
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Price Summary Card */}
        <View
          className="bg-white rounded-2xl shadow-sm"
          style={{
            marginHorizontal: getResponsiveSize(20),
            marginTop: getResponsiveSize(16),
            padding: getResponsiveSize(20),
            elevation: 3,
          }}
        >
          <View 
            className="flex-row items-center"
            style={{ marginBottom: getResponsiveSize(16) }}
          >
            <View 
              className="bg-pink-600 rounded-lg"
              style={{
                padding: getResponsiveSize(8),
                marginRight: getResponsiveSize(12),
              }}
            >
              <MaterialIcons name="receipt" size={getResponsiveSize(20)} color="#fff" />
            </View>
            <Text 
              className="font-bold text-gray-800"
              style={{ fontSize: getResponsiveSize(16) }}
            >
              Chi phí dự kiến
            </Text>
          </View>

          <View style={{ gap: getResponsiveSize(12) }}>
            <View className="flex-row justify-between items-center">
              <Text 
                className="text-gray-600 flex-1"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                Phí tham gia sự kiện ({durationHours}h)
              </Text>
              <Text 
                className="font-semibold text-gray-800"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                {formatCurrency(totalPrice)}
              </Text>
            </View>

            {params.event.originalPrice && params.event.discountedPrice &&
              params.event.originalPrice > params.event.discountedPrice && (
                <View className="flex-row justify-between items-center">
                  <Text 
                    className="text-green-600 flex-1"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    Giảm giá sự kiện
                  </Text>
                  <Text 
                    className="font-semibold text-green-600"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    -{formatCurrency(params.event.originalPrice - params.event.discountedPrice)}
                  </Text>
                </View>
              )}

            <View 
              className="bg-gray-200"
              style={{
                height: 1,
                marginVertical: getResponsiveSize(8),
              }}
            />

            <View className="flex-row justify-between items-center pt-2">
              <Text 
                className="font-bold text-gray-800"
                style={{ fontSize: getResponsiveSize(16) }}
              >
                Tổng cộng
              </Text>
              <Text 
                className="font-bold text-pink-600"
                style={{ fontSize: getResponsiveSize(18) }}
              >
                {formatCurrency(totalPrice)}
              </Text>
            </View>
          </View>
        </View>

        {/* Booking Info Card */}
        {regularBooking && (
          <View
            className="bg-white rounded-2xl shadow-sm"
            style={{
              marginHorizontal: getResponsiveSize(20),
              marginTop: getResponsiveSize(16),
              padding: getResponsiveSize(20),
              elevation: 3,
            }}
          >
            <View 
              className="flex-row items-center"
              style={{ marginBottom: getResponsiveSize(16) }}
            >
              <View 
                className="bg-pink-600 rounded-lg"
                style={{
                  padding: getResponsiveSize(8),
                  marginRight: getResponsiveSize(12),
                }}
              >
                <MaterialIcons name="info" size={getResponsiveSize(20)} color="#fff" />
              </View>
              <Text 
                className="font-bold text-gray-800"
                style={{ fontSize: getResponsiveSize(16) }}
              >
                Thông tin booking
              </Text>
            </View>

            <View style={{ gap: getResponsiveSize(12) }}>
              <View className="flex-row justify-between items-center">
                <Text 
                  className="text-gray-600"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  Booking ID:
                </Text>
                <Text 
                  className="font-semibold text-gray-800"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  {regularBooking.bookingId}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text 
                  className="text-gray-600"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  Trạng thái:
                </Text>
                <View className="bg-orange-50 px-2 py-1 rounded-md">
                  <Text 
                    className="text-orange-600 font-semibold"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    {regularBooking.status}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between items-center">
                <Text 
                  className="text-gray-600"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  Thời lượng:
                </Text>
                <Text 
                  className="font-semibold text-gray-800"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  {durationHours} giờ
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Payment Button */}
      <View 
        className="bg-white border-t border-gray-200 shadow-lg"
        style={{
          paddingHorizontal: getResponsiveSize(20),
          paddingVertical: getResponsiveSize(16),
          elevation: 8,
        }}
      >
        <View 
          className="flex-row justify-between items-center"
          style={{ marginBottom: getResponsiveSize(12) }}
        >
          <Text 
            className="font-semibold text-gray-800"
            style={{ fontSize: getResponsiveSize(16) }}
          >
            Tổng thanh toán
          </Text>
          <Text 
            className="font-bold text-pink-600"
            style={{ fontSize: getResponsiveSize(18) }}
          >
            {formatCurrency(totalPrice)}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handlePayment}
          activeOpacity={0.8}
          className="rounded-xl overflow-hidden shadow-lg"
          disabled={isProcessing}
          style={{
            elevation: isProcessing ? 0 : 4,
          }}
        >
          <LinearGradient
            colors={isProcessing ? ["#d1d5db", "#d1d5db"] : ["#E91E63", "#F06292"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            className="flex-row items-center justify-center"
            style={{
              paddingVertical: getResponsiveSize(16),
              paddingHorizontal: getResponsiveSize(20),
            }}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color="#666" style={{ marginRight: 8 }} />
                <Text 
                  className="text-gray-600 font-bold"
                  style={{ fontSize: getResponsiveSize(16) }}
                >
                  Đang xử lý...
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons
                  name="payment"
                  size={getResponsiveSize(20)}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text 
                  className="text-white font-bold"
                  style={{ fontSize: getResponsiveSize(16) }}
                >
                  Thanh toán {formatCurrency(totalPrice)}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Wallet Success Modal */}
      {showWalletSuccessModal && (
        <View style={StyleSheet.absoluteFill}>
          <View className="flex-1 bg-black bg-opacity-60 justify-center items-center px-5">
            <View 
              className="bg-white rounded-2xl p-6 items-center w-full shadow-2xl"
              style={{ 
                maxWidth: getResponsiveSize(360),
                elevation: 20,
              }}
            >
              <View style={{ marginBottom: getResponsiveSize(20) }}>
                <MaterialIcons name="check-circle" size={getResponsiveSize(80)} color="#4CAF50" />
              </View>

              <Text 
                className="font-bold text-gray-800 text-center mb-3"
                style={{ fontSize: getResponsiveSize(24) }}
              >
                Tham gia sự kiện thành công!
              </Text>

              <Text 
                className="text-gray-600 text-center mb-6"
                style={{ 
                  fontSize: getResponsiveSize(16),
                  lineHeight: getResponsiveSize(24),
                }}
              >
                {totalPrice > 0
                  ? `Đã thanh toán thành công ${formatCurrency(totalPrice)} từ ví SnapLink. Booking sự kiện của bạn đã được xác nhận.`
                  : "Bạn đã đăng ký tham gia sự kiện thành công!"
                }
              </Text>

              <View 
                className="bg-gray-50 rounded-xl p-4 w-full mb-6"
              >
                <Text 
                  className="font-bold text-gray-800 mb-3"
                  style={{ fontSize: getResponsiveSize(16) }}
                >
                  Chi tiết tham gia sự kiện:
                </Text>
                <Text 
                  className="text-gray-600 mb-1.5"
                  style={{ 
                    fontSize: getResponsiveSize(14),
                    lineHeight: getResponsiveSize(20),
                  }}
                >
                  {params.event.name}
                </Text>
                <Text 
                  className="text-gray-600 mb-1.5"
                  style={{ 
                    fontSize: getResponsiveSize(14),
                    lineHeight: getResponsiveSize(20),
                  }}
                >
                  {params.photographer.fullName}
                </Text>
                <Text 
                  className="text-gray-600 mb-1.5"
                  style={{ 
                    fontSize: getResponsiveSize(14),
                    lineHeight: getResponsiveSize(20),
                  }}
                >
                  {formatDate(params.event.startDate)}
                </Text>
                <Text 
                  className="text-gray-600 mb-1.5"
                  style={{ 
                    fontSize: getResponsiveSize(14),
                    lineHeight: getResponsiveSize(20),
                  }}
                >
                  {formatTime(params.event.startDate)} - {formatTime(params.event.endDate)}
                </Text>
                {params.event.locationName && (
                  <Text 
                    className="text-gray-600 mb-1.5"
                    style={{ 
                      fontSize: getResponsiveSize(14),
                      lineHeight: getResponsiveSize(20),
                    }}
                  >
                    {params.event.locationName}
                  </Text>
                )}
                {totalPrice > 0 && (
                  <Text 
                    className="text-gray-600"
                    style={{ 
                      fontSize: getResponsiveSize(14),
                      lineHeight: getResponsiveSize(20),
                    }}
                  >
                    {formatCurrency(totalPrice)}
                  </Text>
                )}
              </View>

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
                className="w-full rounded-xl overflow-hidden shadow-lg"
                style={{ elevation: 4 }}
              >
                <LinearGradient
                  colors={["#4CAF50", "#66BB6A"]}
                  className="py-4 items-center justify-center"
                >
                  <Text 
                    className="text-white font-bold"
                    style={{ fontSize: getResponsiveSize(16) }}
                  >
                    Hoàn tất
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
