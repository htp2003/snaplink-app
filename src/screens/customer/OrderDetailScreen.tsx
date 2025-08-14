// OrderDetailScreen.tsx - FIXED VERSION

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
import type {
  BookingResponse,
  CreatePaymentLinkRequest,
  PriceCalculationResponse,
} from "../../types/booking";
import { PaymentFlowData } from "../../types/payment";
import { MaterialCommunityIcons } from "@expo/vector-icons";

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

type OrderDetailScreenRouteProp = RouteProp<
  { OrderDetail: OrderDetailRouteParams },
  "OrderDetail"
>;

export default function OrderDetailScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<OrderDetailScreenRouteProp>();
  const params = route.params;

  // Auth hook
  const { user, isAuthenticated } = useAuth();

  const {
    getBookingById,
    loading: loadingBooking,
    confirmBooking,
    confirming,
  } = useBooking();

  const {
    createPaymentForBooking,
    creatingPayment,
    error: paymentError,
  } = usePayment();

  const [showWalletSuccessModal, setShowWalletSuccessModal] = useState(false);

  // ===== THÊM STATE CHO PAYMENT METHOD =====
  type PaymentMethod = "bank_qr" | "snaplink_wallet";
  // Thêm state sau các state hiện tại
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("bank_qr");

  // State để lưu booking đã tạo
  const [currentBooking, setCurrentBooking] = useState<BookingResponse | null>(
    null
  );
  const [isProcessing, setIsProcessing] = useState(false);

  // Load booking data khi component mount
  useEffect(() => {
    const loadBookingData = async () => {
      if (params.bookingId && !currentBooking) {
        try {
          const bookingData = await getBookingById(params.bookingId);

          if (bookingData) {
            setCurrentBooking(bookingData);
          } else {
            console.warn("⚠️ No booking data returned");
            Alert.alert("Cảnh báo", "Không thể tải thông tin booking");
          }
        } catch (error) {
          console.error("❌ Error loading booking:", error);
          Alert.alert("Lỗi", "Không thể tải thông tin booking");
        }
      }
    };

    loadBookingData();
  }, [params.bookingId, currentBooking, getBookingById]);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Vui lòng đăng nhập để đặt lịch chụp ảnh",
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
  if (!params || !params.photographer || !params.selectedDate) {
    return (
      <View
        className="flex-1 justify-center items-center bg-gray-50"
        style={{ paddingHorizontal: getResponsiveSize(40) }}
      >
        <MaterialIcons
          name="error"
          size={getResponsiveSize(48)}
          color="#EF5350"
        />
        <Text
          className="font-bold text-gray-800 text-center"
          style={{
            fontSize: getResponsiveSize(20),
            marginTop: getResponsiveSize(16),
            marginBottom: getResponsiveSize(8),
          }}
        >
          Thông tin không hợp lệ
        </Text>
        <Text
          className="text-gray-600 text-center"
          style={{
            fontSize: getResponsiveSize(16),
            marginBottom: getResponsiveSize(24),
          }}
        >
          Vui lòng quay lại và thử lại
        </Text>
        <TouchableOpacity
          className="bg-pink-600 rounded-lg"
          style={{
            paddingHorizontal: getResponsiveSize(24),
            paddingVertical: getResponsiveSize(12),
          }}
          onPress={() => navigation.goBack()}
        >
          <Text
            className="text-white font-semibold"
            style={{ fontSize: getResponsiveSize(16) }}
          >
            Quay lại
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isAuthenticated || !user?.id) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#E91E63" />
        <Text
          className="font-bold text-gray-800"
          style={{
            fontSize: getResponsiveSize(16),
            marginTop: getResponsiveSize(16),
          }}
        >
          Đang kiểm tra xác thực...
        </Text>
      </View>
    );
  }

  const selectedDate = new Date(params.selectedDate);

  // Helper functions
  const formatDate = (date: Date) => {
    try {
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

  const calculateDuration = () => {
    try {
      if (!params.selectedStartTime || !params.selectedEndTime) return 0;

      const [startHour, startMinute] = params.selectedStartTime
        .split(":")
        .map(Number);
      const [endHour, endMinute] = params.selectedEndTime
        .split(":")
        .map(Number);

      if (
        isNaN(startHour) ||
        isNaN(startMinute) ||
        isNaN(endHour) ||
        isNaN(endMinute)
      ) {
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
      totalPrice,
    };
  }, [
    params.priceCalculation,
    params.selectedStartTime,
    params.selectedEndTime,
  ]);

  const handleEditBooking = () => {
    if (!params) {
      Alert.alert("Lỗi", "Không có dữ liệu để chỉnh sửa");
      return;
    }

    const editData = {
      selectedDate: params.selectedDate,
      selectedStartTime: params.selectedStartTime,
      selectedEndTime: params.selectedEndTime,
      selectedLocation: params.selectedLocation,
      specialRequests: params.specialRequests,
    };

    navigation.navigate("Booking", {
      photographer: params.photographer,
      editMode: true,
      existingBookingId: params.bookingId,
      existingBookingData: editData,
    });
  };

  // ✅ FIX: Improved payment handling
  const handleBookNow = async () => {
    if (isProcessing || creatingPayment) return;

    // Validation checks
    if (!user?.id) {
      Alert.alert("Lỗi", "Vui lòng đăng nhập lại");
      return;
    }

    if (!params.bookingId) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin booking");
      return;
    }

    if (!params.photographer?.fullName) {
      Alert.alert("Lỗi", "Thông tin photographer không hợp lệ");
      return;
    }

    setIsProcessing(true);

    try {
      // ===== XỬ LÝ THEO PAYMENT METHOD =====
      if (selectedPaymentMethod === "snaplink_wallet") {
        // ===== WALLET PAYMENT FLOW =====
        console.log(
          "💳 Processing wallet payment for booking:",
          params.bookingId
        );

        // Confirm booking - Backend sẽ tự động trừ tiền từ ví
        const confirmSuccess = await confirmBooking(params.bookingId);

        if (!confirmSuccess) {
          throw new Error("Không thể xác nhận booking và trừ tiền từ ví");
        }

        setShowWalletSuccessModal(true);
      } else {
        // ===== BANK QR PAYMENT FLOW (EXISTING LOGIC) =====
        console.log(
          "🏦 Processing bank QR payment for booking:",
          params.bookingId
        );

        // Create payment using service
        const paymentResult = await createPaymentForBooking(
          user.id,
          params.bookingId,
          params.photographer.fullName,
          {
            date: formatDate(selectedDate),
            startTime: params.selectedStartTime,
            endTime: params.selectedEndTime,
            location: params.selectedLocation?.name,
          }
        );

        if (!paymentResult) {
          throw new Error(paymentError || "Không thể tạo thanh toán");
        }

        // Get payment details
        const paymentId = paymentResult.id;
        const qrCode = paymentResult.qrCode;

        if (!qrCode) {
          console.warn("⚠️ No QR code in payment response");
        }

        // Prepare navigation data for payment screen
        const navigationData: PaymentFlowData = {
          booking: {
            id: params.bookingId,
            photographerName: params.photographer.fullName,
            date: formatDate(selectedDate),
            time: `${params.selectedStartTime}-${params.selectedEndTime}`,
            location: params.selectedLocation?.name,
            totalAmount: pricingDetails.totalPrice,
          },
          payment: {
            paymentId: paymentId,
            id: paymentId,
            externalTransactionId: paymentResult.externalTransactionId || "",
            customerId: user.id,
            customerName: user.fullName || user.email || "Unknown",
            totalAmount: pricingDetails.totalPrice,
            status: paymentResult.status || "Pending",
            bookingId: params.bookingId,
            photographerName: params.photographer.fullName,
            locationName: params.selectedLocation?.name || "",
            paymentUrl: paymentResult.paymentUrl || "",
            orderCode: paymentResult.orderCode || "",
            amount: paymentResult.amount || pricingDetails.totalPrice,
            qrCode: qrCode || "",
          },
          user: {
            name: user.fullName || user.email || "Unknown",
            email: user.email || "No email",
          },
        };

        // Navigate to payment screen
        navigation.navigate("PaymentWaitingScreen", navigationData);
      }
    } catch (err) {
      console.error("❌ Payment processing error:", err);

      let errorMessage = "Có lỗi xảy ra khi xử lý thanh toán";

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      }

      // Show different error messages based on payment method
      const errorTitle =
        selectedPaymentMethod === "snaplink_wallet"
          ? "Lỗi thanh toán ví"
          : "Lỗi thanh toán";

      Alert.alert(errorTitle, errorMessage, [
        {
          text: "Thử lại",
          onPress: () => handleBookNow(),
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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View
        className="flex-row items-center justify-between bg-white border-b border-gray-100"
        style={{
          paddingHorizontal: getResponsiveSize(20),
          paddingTop: getResponsiveSize(50),
          paddingBottom: getResponsiveSize(20),
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="bg-gray-100 rounded-lg"
          style={{ padding: getResponsiveSize(8) }}
          activeOpacity={0.7}
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
          Xác nhận đặt lịch
        </Text>
        <View style={{ width: getResponsiveSize(40) }} />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: getResponsiveSize(120) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Photographer Info Card */}
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
              Photographer
            </Text>
          </View>

          <View className="flex-row items-center">
            <Image
              source={{
                uri:
                  params.photographer.profileImage ||
                  "https://via.placeholder.com/80x80/f0f0f0/999?text=Avatar",
              }}
              className="bg-gray-100"
              style={{
                width: getResponsiveSize(60),
                height: getResponsiveSize(60),
                borderRadius: getResponsiveSize(30),
                marginRight: getResponsiveSize(16),
              }}
              defaultSource={{
                uri: "https://via.placeholder.com/80x80/f0f0f0/999?text=Avatar",
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
              <Text
                className="font-semibold text-pink-600"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                {formatCurrency(params.photographer.hourlyRate)}/giờ
              </Text>
            </View>
          </View>
        </View>

        {/* Date & Time Card */}
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
                name="calendar"
                size={getResponsiveSize(18)}
                color="#E91E63"
              />
            </View>
            <Text
              className="font-bold text-gray-800"
              style={{ fontSize: getResponsiveSize(16) }}
            >
              Thời gian
            </Text>
          </View>

          <View style={{ gap: getResponsiveSize(12) }}>
            <View className="flex-row justify-between items-center">
              <Text
                className="text-gray-600 font-medium"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                Ngày:
              </Text>
              <Text
                className="font-semibold text-gray-800 text-right flex-1"
                style={{
                  fontSize: getResponsiveSize(14),
                  marginLeft: getResponsiveSize(16),
                }}
              >
                {formatDate(selectedDate)}
              </Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text
                className="text-gray-600 font-medium"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                Giờ:
              </Text>
              <Text
                className="font-semibold text-gray-800 text-right flex-1"
                style={{
                  fontSize: getResponsiveSize(14),
                  marginLeft: getResponsiveSize(16),
                }}
              >
                {params.selectedStartTime} - {params.selectedEndTime}
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
                className="font-semibold text-gray-800 text-right flex-1"
                style={{
                  fontSize: getResponsiveSize(14),
                  marginLeft: getResponsiveSize(16),
                }}
              >
                {pricingDetails.duration} giờ
              </Text>
            </View>
          </View>
        </View>

        {/* Location Card (if selected) */}
        {params?.selectedLocation && (
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
                  name="map-pin"
                  size={getResponsiveSize(18)}
                  color="#E91E63"
                />
              </View>
              <Text
                className="font-bold text-gray-800"
                style={{ fontSize: getResponsiveSize(16) }}
              >
                Địa điểm
              </Text>
            </View>

            <View className="bg-gray-50 rounded-lg overflow-hidden">
              {params.selectedLocation.imageUrl && (
                <Image
                  source={{
                    uri: params.selectedLocation.imageUrl,
                  }}
                  className="bg-gray-100"
                  style={{
                    width: "100%",
                    height: getResponsiveSize(120),
                  }}
                />
              )}
              <View style={{ padding: getResponsiveSize(12) }}>
                <Text
                  className="font-bold text-gray-800"
                  style={{
                    fontSize: getResponsiveSize(16),
                    marginBottom: getResponsiveSize(4),
                  }}
                  numberOfLines={2}
                >
                  {params.selectedLocation.name}
                </Text>
                {typeof params.selectedLocation.hourlyRate === "number" && (
                  <Text
                    className="font-semibold text-pink-600"
                    style={{ fontSize: getResponsiveSize(14) }}
                  >
                    {params.selectedLocation.hourlyRate > 0
                      ? `${formatCurrency(
                        params.selectedLocation.hourlyRate
                      )}/giờ`
                      : "Miễn phí"}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Special Requests Card */}
        {params.specialRequests && (
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
                  name="edit-3"
                  size={getResponsiveSize(18)}
                  color="#E91E63"
                />
              </View>
              <Text
                className="font-bold text-gray-800"
                style={{ fontSize: getResponsiveSize(16) }}
              >
                Yêu cầu đặc biệt
              </Text>
            </View>

            <View
              className="bg-gray-50 rounded-lg"
              style={{ padding: getResponsiveSize(16) }}
            >
              <Text
                className="text-gray-800"
                style={{
                  fontSize: getResponsiveSize(14),
                  lineHeight: getResponsiveSize(20),
                }}
              >
                {params.specialRequests}
              </Text>
            </View>
          </View>
        )}

        {/* Payment Method Card */}
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
              className={`flex-row items-center rounded-xl border-2 ${selectedPaymentMethod === "bank_qr"
                ? "bg-pink-50 border-pink-600"
                : "bg-gray-50 border-gray-200"
                }`}
              style={{ padding: getResponsiveSize(16) }}
            >
              {/* Icon */}
              <View
                className={`rounded-full items-center justify-center ${selectedPaymentMethod === "bank_qr"
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

              {/* Content */}
              <View className="flex-1">
                <Text
                  className={`font-bold ${selectedPaymentMethod === "bank_qr"
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

              {/* Radio Button */}
              <View
                className={`rounded-full border-2 items-center justify-center ${selectedPaymentMethod === "bank_qr"
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
              onPress={() => setSelectedPaymentMethod("snaplink_wallet")}
              className={`flex-row items-center rounded-xl border-2 ${selectedPaymentMethod === "snaplink_wallet"
                ? "bg-pink-50 border-pink-600"
                : "bg-gray-50 border-gray-200"
                }`}
              style={{ padding: getResponsiveSize(16) }}
            >
              {/* Icon */}
              <View
                className={`rounded-full items-center justify-center ${selectedPaymentMethod === "snaplink_wallet"
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
                  name="wallet"
                  size={getResponsiveSize(20)}
                  color={
                    selectedPaymentMethod === "snaplink_wallet"
                      ? "#fff"
                      : "#666"
                  }
                />
              </View>

              {/* Content */}
              <View className="flex-1">
                <Text
                  className={`font-bold ${selectedPaymentMethod === "snaplink_wallet"
                    ? "text-pink-600"
                    : "text-gray-800"
                    }`}
                  style={{ fontSize: getResponsiveSize(16) }}
                >
                  Ví SnapLink
                </Text>
                <Text
                  className="text-gray-600"
                  style={{
                    fontSize: getResponsiveSize(13),
                    marginTop: getResponsiveSize(2),
                  }}
                >
                  Thanh toán từ ví SnapLink của bạn
                </Text>
              </View>

              {/* Radio Button */}
              <View
                className={`rounded-full border-2 items-center justify-center ${selectedPaymentMethod === "snaplink_wallet"
                  ? "border-pink-600"
                  : "border-gray-300"
                  }`}
                style={{
                  width: getResponsiveSize(20),
                  height: getResponsiveSize(20),
                }}
              >
                {selectedPaymentMethod === "snaplink_wallet" && (
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
            {/* Photographer Fee */}
            <View className="flex-row justify-between items-center">
              <Text
                className="text-gray-600 flex-1"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                Phí Photographer ({pricingDetails.duration}h)
              </Text>
              <Text
                className="font-semibold text-gray-800"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                {formatCurrency(pricingDetails.photographerFee)}
              </Text>
            </View>

            {/* Location Fee */}
            {pricingDetails.locationFee > 0 && (
              <View className="flex-row justify-between items-center">
                <Text
                  className="text-gray-600 flex-1"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  Phí địa điểm ({pricingDetails.duration}h)
                </Text>
                <Text
                  className="font-semibold text-gray-800"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  {formatCurrency(pricingDetails.locationFee)}
                </Text>
              </View>
            )}

            {/* Service Fee */}
            {pricingDetails.serviceFee > 0 && (
              <View className="flex-row justify-between items-center">
                <Text
                  className="text-gray-600 flex-1"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  Phí dịch vụ
                </Text>
                <Text
                  className="font-semibold text-gray-800"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  {formatCurrency(pricingDetails.serviceFee)}
                </Text>
              </View>
            )}

            {/* Divider */}
            <View
              className="bg-gray-200"
              style={{
                height: 1,
                marginVertical: getResponsiveSize(8),
              }}
            />

            {/* Total */}
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
                {formatCurrency(pricingDetails.totalPrice)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>


      {/* Bottom Action Buttons */}
      <View
        className="bg-white border-t border-gray-100"
        style={{
          paddingHorizontal: getResponsiveSize(20),
          paddingVertical: getResponsiveSize(16),
          paddingBottom: getResponsiveSize(30),
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: getResponsiveSize(10),
          }}
        >
          {/* Edit Button */}
          <TouchableOpacity
            onPress={handleEditBooking}
            activeOpacity={0.7}
            className="bg-gray-50 rounded-lg"
            style={{
              paddingHorizontal: getResponsiveSize(20),
              paddingVertical: getResponsiveSize(15),
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              width: getResponsiveSize(120), 
            }}
          >
            <Feather name="edit-3" size={getResponsiveSize(18)} color="#666" />
            <Text
              className="text-gray-600 font-medium"
              style={{
                marginLeft: getResponsiveSize(6),
                fontSize: getResponsiveSize(15),
              }}
            >
              Chỉnh sửa
            </Text>
          </TouchableOpacity>

          {/* Confirm Button - Takes remaining space */}
          <TouchableOpacity
            onPress={handleBookNow}
            activeOpacity={0.8}
            className="rounded-xl overflow-hidden"
            style={{
              flex: 1, 
            }}
          >
            <LinearGradient
              colors={["#E91E63", "#F06292"]}
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
                    color="#fff"
                    style={{ marginRight: getResponsiveSize(8) }}
                  />
                  <Text
                    className="text-white font-bold"
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
                    Đặt lịch & Thanh toán
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Wallet Success Modal */}
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
              {/* Success Icon */}
              <View style={{ marginBottom: getResponsiveSize(20) }}>
                <MaterialIcons
                  name="check-circle"
                  size={getResponsiveSize(80)}
                  color="#4CAF50"
                />
              </View>

              {/* Title */}
              <Text
                style={{
                  fontSize: getResponsiveSize(24),
                  fontWeight: "bold",
                  color: "#333",
                  marginBottom: getResponsiveSize(12),
                  textAlign: "center",
                }}
              >
                Đặt lịch thành công! 🎉
              </Text>

              {/* Message */}
              <Text
                style={{
                  fontSize: getResponsiveSize(16),
                  color: "#666",
                  textAlign: "center",
                  lineHeight: getResponsiveSize(24),
                  marginBottom: getResponsiveSize(24),
                }}
              >
                Đã thanh toán thành công{" "}
                {formatCurrency(pricingDetails.totalPrice)} từ ví SnapLink.
                Booking của bạn đã được xác nhận.
              </Text>

              {/* Booking Details */}
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
                  Chi tiết booking:
                </Text>
                <Text
                  style={{
                    fontSize: getResponsiveSize(14),
                    color: "#666",
                    marginBottom: getResponsiveSize(6),
                    lineHeight: getResponsiveSize(20),
                  }}
                >
                  📸 {params.photographer.fullName}
                </Text>
                <Text
                  style={{
                    fontSize: getResponsiveSize(14),
                    color: "#666",
                    marginBottom: getResponsiveSize(6),
                    lineHeight: getResponsiveSize(20),
                  }}
                >
                  📅 {formatDate(selectedDate)}
                </Text>
                <Text
                  style={{
                    fontSize: getResponsiveSize(14),
                    color: "#666",
                    marginBottom: getResponsiveSize(6),
                    lineHeight: getResponsiveSize(20),
                  }}
                >
                  ⏰ {params.selectedStartTime} - {params.selectedEndTime}
                </Text>
                {params.selectedLocation && (
                  <Text
                    style={{
                      fontSize: getResponsiveSize(14),
                      color: "#666",
                      marginBottom: getResponsiveSize(6),
                      lineHeight: getResponsiveSize(20),
                    }}
                  >
                    📍 {params.selectedLocation.name}
                  </Text>
                )}
                <Text
                  style={{
                    fontSize: getResponsiveSize(14),
                    color: "#666",
                    lineHeight: getResponsiveSize(20),
                  }}
                >
                  💰 {formatCurrency(pricingDetails.totalPrice)}
                </Text>
              </View>

              {/* Complete Button */}
              <TouchableOpacity
                onPress={() => {
                  setShowWalletSuccessModal(false);
                  // Navigate to CustomerMain stack with CustomerHomeScreen tab
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
