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

  // ✅ FIXED: Move ALL hooks to the top, before any conditional logic
  // Auth hook
  const { user, isAuthenticated } = useAuth();

  // Wallet hook
  const {
    walletBalance,
    loading: balanceLoading,
    refreshWalletData,
  } = useWallet();

  // Booking và Payment hooks
    const {
      getBookingById,
      confirmBooking,
      confirming,
      updateBooking, 
      updating, 
    } = useBooking();
  const {
    createEventPayment,
    creatingPayment,
    error: paymentError
  } = usePayment();

  // ✅ All state hooks at the top
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"bank_qr" | "snaplink_wallet">("bank_qr");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWalletSuccessModal, setShowWalletSuccessModal] = useState(false);
  const [regularBooking, setRegularBooking] = useState<any>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);

   const [isCancelling, setIsCancelling] = useState(false);

  // ✅ Derived values using useMemo to prevent unnecessary re-calculations
  const shouldFetchWallet = useMemo(() => isAuthenticated && user?.id, [isAuthenticated, user?.id]);
  
  const isValidParams = useMemo(() => {
    return params && params.event && params.photographer;
  }, [params]);

  const isUserReady = useMemo(() => {
    return isAuthenticated && user?.id;
  }, [isAuthenticated, user?.id]);

  // ✅ All useEffect hooks
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
      if (!isValidParams) return;
      
      const bookingId = params?.eventBookingResponse?.bookingId;

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
  }, [params?.eventBookingResponse?.bookingId, params?.eventBookingId, getBookingById, isValidParams]);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated && isValidParams) {
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
  }, [isAuthenticated, navigation, isValidParams]);

  // Refresh wallet data khi màn hình được focus
  useFocusEffect(
    React.useCallback(() => {
      if (shouldFetchWallet) {
        refreshWalletData();
      }
    }, [shouldFetchWallet, refreshWalletData])
  );

  // ✅ Calculate pricing - use regular booking data if available, otherwise fallback
  const totalPrice = useMemo(() => {
    return params?.eventPrice ||
      params?.eventBookingResponse?.eventPrice ||
      regularBooking?.totalPrice ||
      (() => {
        const eventBaseFee = params?.event?.discountedPrice || params?.event?.originalPrice || 0;
        const photographerRate = params?.photographer?.specialRate || 0;
        const duration = params?.bookingTimes ?
          (() => {
            const [startHour, startMinute] = params.bookingTimes!.startTime.split(":").map(Number);
            const [endHour, endMinute] = params.bookingTimes!.endTime.split(":").map(Number);
            const startMinutes = startHour * 60 + startMinute;
            const endMinutes = endHour * 60 + endMinute;
            return Math.max(0, (endMinutes - startMinutes) / 60);
          })() : 1;
        return eventBaseFee + (photographerRate * duration);
      })();
  }, [params, regularBooking]);

  const durationHours = useMemo(() => {
    return regularBooking?.durationHours ||
      (params?.bookingTimes ? (() => {
        const [startHour, startMinute] = params.bookingTimes!.startTime.split(":").map(Number);
        const [endHour, endMinute] = params.bookingTimes!.endTime.split(":").map(Number);
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        return Math.max(0, (endMinutes - startMinutes) / 60);
      })() : 1);
  }, [regularBooking, params?.bookingTimes]);

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

  // Get the booking ID for payment
  const getBookingIdForPayment = (): number => {
    console.log('Getting booking ID for payment...');

    const sources = [
      { name: 'eventBookingResponse.booking.bookingId', value: params?.eventBookingResponse?.booking?.bookingId },
      { name: 'eventBookingResponse.bookingId', value: params?.eventBookingResponse?.bookingId },
      { name: 'bookingResponse.booking.bookingId', value: params?.bookingResponse?.booking?.bookingId },
      { name: 'bookingResponse.bookingId', value: params?.bookingResponse?.bookingId },
      { name: 'params.bookingId', value: params?.bookingId },
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

    const fallbackId = params?.eventBookingId;
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
          `Tham gia sự kiện - ${params?.event?.name}`,
          {
            date: formatDate(params?.event?.startDate || ""),
            startTime: formatTime(params?.event?.startDate || ""),
            endTime: formatTime(params?.event?.endDate || ""),
            location: params?.event?.locationName,
            photographerName: params?.photographer?.fullName
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
            photographerName: params?.photographer?.fullName || "",
            date: formatDate(params?.event?.startDate || ""),
            time: `${formatTime(params?.event?.startDate || "")}-${formatTime(params?.event?.endDate || "")}`,
            location: params?.event?.locationName,
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
            photographerName: params?.photographer?.fullName || "",
            locationName: params?.event?.locationName || "",
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

  // ✅ Now handle conditional rendering AFTER all hooks are declared
  if (!isValidParams) {
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

  if (!isUserReady) {
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

  const handleCancelBooking = async () => {
    if (!params.bookingId || isCancelling) return;
    
    try {
      setIsCancelling(true);
      await updateBooking(params.bookingId, { status: 'Cancelled' });
      console.log(`✅ Cancelled booking ${params.bookingId} when going back`);
    } catch (error) {
      console.error('❌ Error cancelling booking on back:', error);
      // Không hiển thị alert để không làm gián đoạn navigation
    } finally {
      setIsCancelling(false);
    }
  };

  const handleGoBack = () => {
      Alert.alert(
        'Hủy đặt lịch',
        'Bạn có muốn hủy đặt lịch này và quay lại không?',
        [
          {
            text: 'Ở lại',
            style: 'cancel',
          },
          {
            text: 'Hủy đặt lịch',
            style: 'destructive',
            onPress: async () => {
              await handleCancelBooking();
              navigation.goBack();
            },
          },
        ]
      );
    };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header - Similar to OrderDetailScreen */}
      <View
        className="flex-row items-center justify-between bg-white border-b border-gray-100"
        style={{
          paddingHorizontal: getResponsiveSize(20),
          paddingTop: getResponsiveSize(50),
          paddingBottom: getResponsiveSize(20),
        }}
      >
        <TouchableOpacity
          onPress={handleGoBack}
          className="bg-gray-100 rounded-lg"
          style={{ padding: getResponsiveSize(8) }}
          activeOpacity={0.7}
          disabled={isCancelling}
        >
          <AntDesign
            name="arrowleft"
            size={getResponsiveSize(24)}
            color="#333"
          />
        </TouchableOpacity>
        <Text
          className="font-bold text-gray-800"
          style={{ fontSize: getResponsiveSize(18) }}
        >
          Xác nhận tham gia sự kiện
        </Text>
        <View style={{ width: getResponsiveSize(40) }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: getResponsiveSize(120) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Event Info Card */}
        <View
          className="bg-white rounded-xl shadow-sm"
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
              className="bg-pink-50 rounded-lg"
              style={{
                padding: getResponsiveSize(8),
                marginRight: getResponsiveSize(12),
              }}
            >
              <MaterialIcons
                name="event"
                size={getResponsiveSize(18)}
                color="#E91E63"
              />
            </View>
            <Text
              className="font-bold text-gray-800"
              style={{ fontSize: getResponsiveSize(16) }}
            >
              Thông tin sự kiện
            </Text>
          </View>

          <View
            className="bg-pink-50 rounded-lg overflow-hidden"
          >
            <View style={{ padding: getResponsiveSize(16) }}>
              <Text
                className="font-bold text-gray-800 text-center"
                style={{
                  fontSize: getResponsiveSize(20),
                  marginBottom: getResponsiveSize(12),
                }}
                numberOfLines={2}
              >
                {params.event.name}
              </Text>

              <View style={{ gap: getResponsiveSize(8) }}>
                <View className="flex-row items-center justify-center">
                  <Feather name="calendar" size={getResponsiveSize(16)} color="#666" />
                  <Text
                    className="text-gray-600 ml-2"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    {formatDate(params.event.startDate)}
                  </Text>
                </View>

                <View className="flex-row items-center justify-center">
                  <Feather name="clock" size={getResponsiveSize(16)} color="#666" />
                  <Text
                    className="text-gray-600 ml-2"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    {formatTime(params.event.startDate)} - {formatTime(params.event.endDate)}
                  </Text>
                </View>

                {params.event.locationName && (
                  <View className="flex-row items-center justify-center">
                    <Feather name="map-pin" size={getResponsiveSize(16)} color="#666" />
                    <Text
                      className="text-gray-600 ml-2 text-center"
                      style={{
                        fontSize: getResponsiveSize(14),
                        maxWidth: getResponsiveSize(250),
                      }}
                      numberOfLines={2}
                    >
                      {params.event.locationName}
                    </Text>
                  </View>
                )}

                {/* Event Price */}
                <View
                  className="bg-white rounded-lg mt-3"
                  style={{ padding: getResponsiveSize(12) }}
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-gray-600"
                      style={{ fontSize: getResponsiveSize(14) }}
                    >
                      Phí tham gia sự kiện:
                    </Text>
                    <View className="flex-row items-center">
                      <Text
                        className="font-bold text-pink-600"
                        style={{ fontSize: getResponsiveSize(16) }}
                      >
                        {formatCurrency(params.event.discountedPrice || params.event.originalPrice)}
                      </Text>
                      {params.event.originalPrice && params.event.discountedPrice &&
                        params.event.originalPrice > params.event.discountedPrice && (
                          <Text
                            className="text-gray-400 line-through ml-2"
                            style={{ fontSize: getResponsiveSize(12) }}
                          >
                            {formatCurrency(params.event.originalPrice)}
                          </Text>
                        )}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Photographer Card - Same as OrderDetailScreen style */}
        <View
          className="bg-white rounded-xl shadow-sm"
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
              className="bg-pink-50 rounded-lg"
              style={{
                padding: getResponsiveSize(8),
                marginRight: getResponsiveSize(12),
              }}
            >
              <Feather
                name="user"
                size={getResponsiveSize(18)}
                color="#E91E63"
              />
            </View>
            <Text
              className="font-bold text-gray-800"
              style={{ fontSize: getResponsiveSize(16) }}
            >
              Photographer đã chọn
            </Text>
          </View>

          <View className="flex-row items-center">
            <Image
              source={{
                uri: params.photographer.profileImage ||
                  "https://via.placeholder.com/80x80/f0f0f0/999?text=P",
              }}
              className="bg-gray-100"
              style={{
                width: getResponsiveSize(60),
                height: getResponsiveSize(60),
                borderRadius: getResponsiveSize(30),
                marginRight: getResponsiveSize(16),
              }}
              defaultSource={{
                uri: "https://via.placeholder.com/80x80/f0f0f0/999?text=P",
              }}
            />
            <View className="flex-1">
              <Text
                className="font-bold text-gray-800"
                style={{
                  fontSize: getResponsiveSize(16),
                  marginBottom: getResponsiveSize(4),
                }}
                numberOfLines={2}
              >
                {params.photographer.fullName}
              </Text>
              {params.photographer.specialRate && (
                <Text
                  className="font-semibold text-pink-600"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  Giá đặc biệt: {formatCurrency(params.photographer.specialRate)}/giờ
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Time Details Card */}
        {params.bookingTimes && (
          <View
            className="bg-white rounded-xl shadow-sm"
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
                className="bg-pink-50 rounded-lg"
                style={{
                  padding: getResponsiveSize(8),
                  marginRight: getResponsiveSize(12),
                }}
              >
                <Feather
                  name="clock"
                  size={getResponsiveSize(18)}
                  color="#E91E63"
                />
              </View>
              <Text
                className="font-bold text-gray-800"
                style={{ fontSize: getResponsiveSize(16) }}
              >
                Thời gian làm việc
              </Text>
            </View>

            <View style={{ gap: getResponsiveSize(12) }}>
              <View className="flex-row justify-between items-center">
                <Text
                  className="text-gray-600 font-medium"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  Giờ bắt đầu:
                </Text>
                <Text
                  className="font-semibold text-gray-800"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  {params.bookingTimes.startTime}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text
                  className="text-gray-600 font-medium"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  Giờ kết thúc:
                </Text>
                <Text
                  className="font-semibold text-gray-800"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  {params.bookingTimes.endTime}
                </Text>
              </View>
              <View className="flex-row justify-between items-center">
                <Text
                  className="text-gray-600 font-medium"
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

        {/* Payment Method Card - Same style as OrderDetailScreen */}
        <View
          className="bg-white rounded-xl shadow-sm"
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
              className="bg-pink-50 rounded-lg"
              style={{
                padding: getResponsiveSize(8),
                marginRight: getResponsiveSize(12),
              }}
            >
              <MaterialIcons
                name="payment"
                size={getResponsiveSize(18)}
                color="#E91E63"
              />
            </View>
            <Text
              className="font-bold text-gray-800"
              style={{ fontSize: getResponsiveSize(16) }}
            >
              Chọn phương thức thanh toán
            </Text>
          </View>

          {/* Payment Method Options */}
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
                    : "bg-gray-100"
                }`}
                style={{
                  width: getResponsiveSize(40),
                  height: getResponsiveSize(40),
                  marginRight: getResponsiveSize(12),
                }}
              >
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={getResponsiveSize(20)}
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
                  style={{ fontSize: getResponsiveSize(16) }}
                >
                  Quét mã ngân hàng
                </Text>
                <Text
                  className="text-gray-600"
                  style={{
                    fontSize: getResponsiveSize(13),
                    marginTop: getResponsiveSize(2),
                  }}
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
                      : "bg-gray-100"
                }`}
                style={{
                  width: getResponsiveSize(40),
                  height: getResponsiveSize(40),
                  marginRight: getResponsiveSize(12),
                }}
              >
                <MaterialCommunityIcons
                  name="wallet"
                  size={getResponsiveSize(20)}
                  color={
                    selectedPaymentMethod === "snaplink_wallet"
                      ? "#fff"
                      : !shouldFetchWallet || !isWalletBalanceSufficient
                        ? "#999"
                        : "#666"
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
                  style={{ fontSize: getResponsiveSize(16) }}
                >
                  Ví SnapLink
                </Text>
                
                {!shouldFetchWallet ? (
                  <Text
                    className="text-gray-400"
                    style={{ 
                      fontSize: getResponsiveSize(13),
                      marginTop: getResponsiveSize(2),
                    }}
                  >
                    Cần đăng nhập
                  </Text>
                ) : balanceLoading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <ActivityIndicator size="small" color="#666" />
                    <Text
                      className="text-gray-600"
                      style={{ 
                        fontSize: getResponsiveSize(12),
                        marginLeft: getResponsiveSize(8),
                      }}
                    >
                      Đang tải...
                    </Text>
                  </View>
                ) : (
                  <Text
                    className={`${
                      isWalletBalanceSufficient ? "text-green-600" : "text-red-500"
                    }`}
                    style={{
                      fontSize: getResponsiveSize(13),
                      marginTop: getResponsiveSize(2),
                      fontWeight: '500'
                    }}
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

        {/* Price Breakdown Card */}
        <View
          className="bg-white rounded-xl shadow-sm"
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
              className="bg-pink-50 rounded-lg"
              style={{
                padding: getResponsiveSize(8),
                marginRight: getResponsiveSize(12),
              }}
            >
              <MaterialIcons
                name="receipt"
                size={getResponsiveSize(18)}
                color="#E91E63"
              />
            </View>
            <Text
              className="font-bold text-gray-800"
              style={{ fontSize: getResponsiveSize(16) }}
            >
              Chi phí dự kiến
            </Text>
          </View>

          <View style={{ gap: getResponsiveSize(12) }}>
            {/* Event Fee */}
            <View className="flex-row justify-between items-center">
              <Text
                className="text-gray-600 flex-1"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                Phí tham gia sự kiện
              </Text>
              <Text
                className="font-semibold text-gray-800"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                {formatCurrency(params.event.discountedPrice || params.event.originalPrice)}
              </Text>
            </View>

            {/* Photographer Fee */}
            {params.photographer.specialRate && (
              <View className="flex-row justify-between items-center">
                <Text
                  className="text-gray-600 flex-1"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  Phí Photographer ({durationHours}h)
                </Text>
                <Text
                  className="font-semibold text-gray-800"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  {formatCurrency(params.photographer.specialRate * durationHours)}
                </Text>
              </View>
            )}

            {/* Discount */}
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

            <View className="flex-row justify-between items-center">
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
      </ScrollView>

      {/* Bottom Action Buttons - Similar to OrderDetailScreen */}
      <View
        className="bg-white border-t border-gray-100"
        style={{
          paddingHorizontal: getResponsiveSize(20),
          paddingVertical: getResponsiveSize(16),
          paddingBottom: getResponsiveSize(30),
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
          className="rounded-xl overflow-hidden"
          disabled={isProcessing}
        >
          <LinearGradient
            colors={isProcessing ? ["#d1d5db", "#d1d5db"] : ["#E91E63", "#F06292"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingVertical: getResponsiveSize(15),
              paddingHorizontal: getResponsiveSize(16),
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator
                  size="small"
                  color="#666"
                  style={{ marginRight: getResponsiveSize(8) }}
                />
                <Text
                  className="text-gray-600 font-bold"
                  style={{ fontSize: getResponsiveSize(15) }}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                >
                  Đang xử lý...
                </Text>
              </>
            ) : (
              <>
                <MaterialIcons
                  name="payment"
                  size={getResponsiveSize(18)}
                  color="#fff"
                  style={{ marginRight: getResponsiveSize(6) }}
                />
                <Text
                  className="text-white font-bold"
                  style={{ fontSize: getResponsiveSize(15) }}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                >
                  Tham gia sự kiện & Thanh toán
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Wallet Success Modal - Same as OrderDetailScreen */}
      {showWalletSuccessModal && (
        <View style={StyleSheet.absoluteFill}>
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.6)",
              justifyContent: "center",
              alignItems: "center",
              paddingHorizontal: getResponsiveSize(20),
            }}
          >
            <View
              style={{
                backgroundColor: "#fff",
                borderRadius: getResponsiveSize(20),
                padding: getResponsiveSize(24),
                alignItems: "center",
                width: "100%",
                maxWidth: getResponsiveSize(360),
              }}
            >
              <View style={{ marginBottom: getResponsiveSize(20) }}>
                <MaterialIcons
                  name="check-circle"
                  size={getResponsiveSize(80)}
                  color="#4CAF50"
                />
              </View>

              <Text
                style={{
                  fontSize: getResponsiveSize(24),
                  fontWeight: "bold",
                  color: "#333",
                  marginBottom: getResponsiveSize(12),
                  textAlign: "center",
                }}
              >
                Tham gia sự kiện thành công!
              </Text>

              <Text
                style={{
                  fontSize: getResponsiveSize(16),
                  color: "#666",
                  textAlign: "center",
                  lineHeight: getResponsiveSize(24),
                  marginBottom: getResponsiveSize(24),
                }}
              >
                {totalPrice > 0
                  ? `Đã thanh toán thành công ${formatCurrency(totalPrice)} từ ví SnapLink. Booking sự kiện của bạn đã được xác nhận.`
                  : "Bạn đã đăng ký tham gia sự kiện thành công!"
                }
              </Text>

              <View
                style={{
                  backgroundColor: "#f8f9fa",
                  borderRadius: getResponsiveSize(12),
                  padding: getResponsiveSize(16),
                  width: "100%",
                  marginBottom: getResponsiveSize(24),
                }}
              >
                <Text
                  style={{
                    fontSize: getResponsiveSize(16),
                    fontWeight: "bold",
                    color: "#333",
                    marginBottom: getResponsiveSize(12),
                  }}
                >
                  Chi tiết tham gia sự kiện:
                </Text>
                <Text
                  style={{
                    fontSize: getResponsiveSize(14),
                    color: "#666",
                    marginBottom: getResponsiveSize(6),
                    lineHeight: getResponsiveSize(20),
                  }}
                >
                  {params.event.name}
                </Text>
                <Text
                  style={{
                    fontSize: getResponsiveSize(14),
                    color: "#666",
                    marginBottom: getResponsiveSize(6),
                    lineHeight: getResponsiveSize(20),
                  }}
                >
                  {params.photographer.fullName}
                </Text>
                <Text
                  style={{
                    fontSize: getResponsiveSize(14),
                    color: "#666",
                    marginBottom: getResponsiveSize(6),
                    lineHeight: getResponsiveSize(20),
                  }}
                >
                  {formatDate(params.event.startDate)}
                </Text>
                <Text
                  style={{
                    fontSize: getResponsiveSize(14),
                    color: "#666",
                    marginBottom: getResponsiveSize(6),
                    lineHeight: getResponsiveSize(20),
                  }}
                >
                  {formatTime(params.event.startDate)} - {formatTime(params.event.endDate)}
                </Text>
                {params.event.locationName && (
                  <Text
                    style={{
                      fontSize: getResponsiveSize(14),
                      color: "#666",
                      marginBottom: getResponsiveSize(6),
                      lineHeight: getResponsiveSize(20),
                    }}
                  >
                    {params.event.locationName}
                  </Text>
                )}
                {totalPrice > 0 && (
                  <Text
                    style={{
                      fontSize: getResponsiveSize(14),
                      color: "#666",
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
                style={{
                  width: "100%",
                  borderRadius: getResponsiveSize(12),
                  overflow: "hidden",
                }}
              >
                <LinearGradient
                  colors={["#4CAF50", "#66BB6A"]}
                  style={{
                    paddingVertical: getResponsiveSize(16),
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: getResponsiveSize(16),
                      fontWeight: "bold",
                    }}
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
