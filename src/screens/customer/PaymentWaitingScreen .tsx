import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Linking,
  Modal,
  AppState, 
} from "react-native";
import { getResponsiveSize } from "../../utils/responsive";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackNavigationProp } from "../../navigation/types";
import { usePayment } from "../../hooks/usePayment";
import { useBooking } from "../../hooks/useBooking"; 
import type { PaymentFlowData } from "../../types/payment";
import { EnhancedQRDisplay } from "../../components/EnhancedQRDisplay";
import { handleDeepLink } from "../../config/deepLinks";

type PaymentWaitingRouteParams = PaymentFlowData;
type PaymentWaitingScreenRouteProp = RouteProp<
  { PaymentWaiting: PaymentWaitingRouteParams },
  "PaymentWaiting"
>;

export default function PaymentWaitingScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<PaymentWaitingScreenRouteProp>();
  const { booking, payment, user } = route.params;

  // ✅ FIXED: Safe type checking for booking hook
  const bookingHook = useBooking();
  const confirmBooking = bookingHook?.confirmBooking;
  const confirming = bookingHook?.confirming || false;

  // ✅ NEW: Protection states to prevent duplicate actions
  const [isHandlingSuccess, setIsHandlingSuccess] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes

  // Payment polling states
  const [isPolling, setIsPolling] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("Pending");
  const [statusCheckCount, setStatusCheckCount] = useState(0);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  
  // ✅ OPTIMIZED: More aggressive polling for faster detection
  const maxPollingAttempts = 60; // 5 minutes
  const pollingInterval = 3000; // 3 seconds
  const earlyPollingInterval = 1000; // 1 second for first minute
  const fastPollingDuration = 60000; // 60 seconds

  // Cancel states
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirmingBooking, setIsConfirmingBooking] = useState(false);

  // Refs
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const pollingStartTimeRef = useRef<number>(Date.now());

  const {
    getPayment,
    cancelPayment,
    loadingPayment,
    getCurrentPaymentId,
    getCurrentOrderCode,
    getPaymentDebugInfo,
  } = usePayment();

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // ✅ FIXED: Safe navigation with duplicate protection
  const navigateToHome = useCallback(() => {
    if (hasNavigated) {
      console.log("🛡️ Navigation already triggered, skipping...");
      return;
    }
    
    setHasNavigated(true);
    stopCountdown();
    stopPolling();
    
    console.log("🏠 Navigating to home...");
    navigation.reset({
      index: 0,
      routes: [
        {
          name: "CustomerMain",
          params: { screen: "CustomerHomeScreen" },
        },
      ],
    });
  }, [hasNavigated, navigation, stopCountdown, stopPolling]);

  // ✅ FIXED: Enhanced handlePaymentSuccess with protection
  const handlePaymentSuccess = useCallback(async () => {
    if (isHandlingSuccess) {
      console.log("🛡️ Already handling success, skipping duplicate call...");
      return;
    }

    if (hasNavigated) {
      console.log("🛡️ Already navigated, skipping success handling...");
      return;
    }

    console.log("🎉 Payment successful! Starting success handling...");
    setIsHandlingSuccess(true);

    try {
      // ✅ SAFE: Check if confirmBooking is available
      if (!confirmBooking) {
        console.warn("⚠️ confirmBooking method not available, showing success directly");
        setTimeout(() => {
          if (isMountedRef.current && !hasNavigated) {
            setShowSuccessModal(true);
          }
        }, 1000);
        return;
      }

      setIsConfirmingBooking(true);
      
      // ✅ SAFE: Confirm the booking with proper error handling
      try {
        const confirmSuccess = await confirmBooking(booking.id);
        
        if (confirmSuccess) {
          console.log("✅ Booking confirmed successfully");
        } else {
          console.warn("⚠️ Booking confirmation failed, but payment succeeded");
        }
      } catch (confirmError) {
        console.error("❌ Error confirming booking:", confirmError);
        // Continue to show success since payment worked
      }
      
      // Show success modal after confirmation attempt
      setTimeout(() => {
        if (isMountedRef.current && !hasNavigated) {
          setShowSuccessModal(true);
        }
      }, 1000);
      
    } catch (error) {
      console.error("❌ Error in handlePaymentSuccess:", error);
      // Still show success since payment worked
      setTimeout(() => {
        if (isMountedRef.current && !hasNavigated) {
          setShowSuccessModal(true);
        }
      }, 1000);
    } finally {
      setIsConfirmingBooking(false);
      setIsHandlingSuccess(false);
    }
  }, [isHandlingSuccess, hasNavigated, confirmBooking, booking.id]);

  // ✅ FIXED: Enhanced back button protection
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isPaymentComplete && (paymentStatus === "Success" || paymentStatus === "Paid" || paymentStatus === "Completed")) {
        // Allow navigation if payment is successful
        return;
      }

      e.preventDefault(); // Block default back action
      Alert.alert(
        "Xác nhận hủy thanh toán",
        "Bạn có chắc muốn hủy thanh toán này?",
        [
          { text: "Không", style: "cancel" },
          {
            text: "Có",
            style: "destructive",
            onPress: async () => {
              await handleCancelPayment();
              navigation.dispatch(e.data.action);
            }
          }
        ]
      );
    });
  
    return unsubscribe;
  }, [navigation, isPaymentComplete, paymentStatus]);

  // Handle cancel payment
  const handleCancelPayment = useCallback(
    async (isAutoCancel: boolean = false) => {
      if (isCancelling || hasNavigated) return;

      try {
        setIsCancelling(true);

        const apiPaymentId = payment.paymentId || payment.id;

        let existingPayment;
        try {
          existingPayment = await getPayment(apiPaymentId);
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes("Payment not found")
          ) {
            setPaymentStatus("Cancelled");
            setIsPaymentComplete(true);
            stopPolling();
            stopCountdown();

            if (!isAutoCancel) {
              Alert.alert(
                "Payment đã bị hủy",
                "Payment không còn tồn tại trên hệ thống. Có thể đã được hủy trước đó.",
                [{ text: "Đóng", onPress: () => navigation.goBack() }]
              );
            } else {
              setTimeout(() => navigation.goBack(), 1000);
            }
            return;
          }
          throw error;
        }

        if (
          ["Cancelled", "Completed", "Paid", "Success"].includes(
            existingPayment?.status || ""
          )
        ) {
          throw new Error(
            `Không thể hủy payment với trạng thái: ${existingPayment?.status}`
          );
        }

        const cancelSuccess = await cancelPayment(booking.id);

        if (cancelSuccess) {
          setPaymentStatus("Cancelled");
          setIsPaymentComplete(true);
          stopPolling();
          stopCountdown();

          if (!isAutoCancel) {
            Alert.alert(
              "Đã hủy thanh toán",
              "Thanh toán đã được hủy thành công. Booking cũng sẽ bị hủy.",
              [{ text: "Đóng", onPress: () => navigation.goBack() }]
            );
          } else {
            setTimeout(() => navigation.goBack(), 1000);
          }
        } else {
          console.error("❌ Cancel payment returned false");
          Alert.alert(
            "Lỗi",
            "Không thể hủy thanh toán. Vui lòng thử lại hoặc liên hệ hỗ trợ.",
            [
              {
                text: "Thử lại",
                onPress: () => handleCancelPayment(isAutoCancel),
              },
              { text: "Đóng", style: "cancel" },
            ]
          );
        }
      } catch (error) {
        console.error("❌ Error cancelling payment:", error);
        Alert.alert(
          "Lỗi hủy thanh toán",
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra khi hủy thanh toán. Vui lòng thử lại.",
          [
            {
              text: "Thử lại",
              onPress: () => handleCancelPayment(isAutoCancel),
            },
            { text: "Đóng", style: "cancel" },
          ]
        );
      } finally {
        setIsCancelling(false);
      }
    },
    [
      booking.id,
      payment.paymentId,
      payment.id,
      getPayment,
      cancelPayment,
      isCancelling,
      hasNavigated,
      stopPolling,
      stopCountdown,
      navigation,
    ]
  );

  // ✅ ENHANCED: Check payment status with better error handling
  const checkPaymentStatus = useCallback(async () => {
    const apiPaymentId = payment?.paymentId || payment?.id;

    if (!apiPaymentId || isPaymentComplete || isHandlingSuccess) {
      console.log("🛑 Skipping status check:", { 
        apiPaymentId: !!apiPaymentId, 
        isPaymentComplete, 
        isHandlingSuccess 
      });
      return;
    }

    const finalStatuses = [
      "Success",
      "Paid", 
      "Completed",
      "Cancelled",
      "Failed",
      "Expired",
    ];
    
    if (finalStatuses.includes(paymentStatus)) {
      console.log("🛑 Status already final:", paymentStatus);
      setIsPaymentComplete(true);
      stopPolling();
      return;
    }

    try {
      console.log(`🔄 Checking payment status for ID: ${apiPaymentId} (attempt ${statusCheckCount + 1})`);
      
      const updatedPayment = await getPayment(apiPaymentId);
      console.log("📦 Payment response:", {
        id: updatedPayment?.id,
        paymentId: updatedPayment?.paymentId,
        status: updatedPayment?.status,
        orderCode: updatedPayment?.orderCode,
        amount: updatedPayment?.amount,
        totalAmount: updatedPayment?.totalAmount,
      });

      if (updatedPayment && isMountedRef.current) {
        const newStatus = updatedPayment.status;
        console.log(`📊 Status check: ${paymentStatus} → ${newStatus}`);

        if (newStatus !== paymentStatus) {
          console.log(`🔄 Payment status changed: ${paymentStatus} → ${newStatus}`);
          setPaymentStatus(newStatus);
        }

        // ✅ ENHANCED: Check multiple success variations
        const successStatuses = ["Success", "Paid", "Completed", "PAID", "SUCCESS", "COMPLETED"];
        if (successStatuses.includes(newStatus)) {
          console.log("🎉 Payment SUCCESS detected!");
          setIsPaymentComplete(true);
          stopPolling();
          stopCountdown();
          
          // ✅ SAFE: Only call handlePaymentSuccess if not already handling
          if (!isHandlingSuccess) {
            await handlePaymentSuccess();
          }
          return;
        }

        // ✅ ENHANCED: Check multiple failure variations
        const failureStatuses = ["Cancelled", "Failed", "Expired", "CANCELLED", "FAILED", "EXPIRED"];
        if (failureStatuses.includes(newStatus)) {
          console.log("❌ Payment FAILED detected:", newStatus);
          setIsPaymentComplete(true);
          stopPolling();
          stopCountdown();

          setTimeout(() => {
            if (isMountedRef.current && !hasNavigated) {
              Alert.alert(
                "Thanh toán thất bại",
                `Thanh toán của bạn đã thất bại (${newStatus}). Vui lòng thử lại.`,
                [
                  { text: "Thử lại", onPress: () => navigation.goBack() },
                  { text: "Đóng", style: "cancel" },
                ]
              );
            }
          }, 500);
          return;
        }

        setStatusCheckCount((prev) => prev + 1);
      } else {
        console.warn("⚠️ No payment data received or component unmounted");
      }
    } catch (error) {
      console.error("❌ Error checking payment status:", error);

      if (
        error instanceof Error &&
        error.message.includes("Payment not found")
      ) {
        console.log("💀 Payment not found with paymentId:", apiPaymentId);

        // ✅ OPTIMIZED: Be more lenient in early checks
        if (statusCheckCount < 10) {
          console.log(`⏳ Early attempt ${statusCheckCount + 1}/10, continuing...`);
          setStatusCheckCount((prev) => prev + 1);
          return;
        }

        console.log("⏰ Payment expired after 10 attempts");
        setPaymentStatus("Expired");
        setIsPaymentComplete(true);
        stopPolling();
        stopCountdown();

        setTimeout(() => {
          if (isMountedRef.current && !hasNavigated) {
            Alert.alert(
              "Payment đã hết hạn",
              "Payment không còn tồn tại trên hệ thống. Có thể đã hết hạn hoặc bị xóa.",
              [
                { text: "Tạo payment mới", onPress: () => navigation.goBack() },
                { text: "Đóng", style: "cancel" },
              ]
            );
          }
        }, 500);
        return;
      }

      setStatusCheckCount((prev) => prev + 1);

      // ✅ OPTIMIZED: Stop after reasonable attempts
      if (statusCheckCount >= maxPollingAttempts - 3) {
        console.log("🚫 Max polling attempts reached, stopping...");
        stopPolling();

        if (!hasNavigated) {
          Alert.alert(
            "Lỗi kết nối",
            "Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại.",
            [
              {
                text: "Thử lại",
                onPress: () => {
                  console.log("🔄 Restarting polling...");
                  setStatusCheckCount(0);
                  setIsPaymentComplete(false);
                  pollingStartTimeRef.current = Date.now();
                  startPolling();
                },
              },
              { text: "Đóng", style: "cancel" },
            ]
          );
        }
      }
    }
  }, [
    payment?.paymentId,
    payment?.id,
    paymentStatus,
    statusCheckCount,
    isPaymentComplete,
    isHandlingSuccess,
    hasNavigated,
    getPayment,
    stopPolling,
    stopCountdown,
    navigation,
    handlePaymentSuccess,
  ]);

  // ✅ OPTIMIZED: Smart polling with adaptive intervals
  const startPolling = useCallback(() => {
    const apiPaymentId = payment?.paymentId || payment?.id;

    if (isPolling || !apiPaymentId || isPaymentComplete || isHandlingSuccess) {
      console.log("🛑 Polling conditions not met:", {
        isPolling,
        hasPaymentId: !!apiPaymentId,
        isComplete: isPaymentComplete,
        isHandlingSuccess,
      });
      return;
    }

    const finalStatuses = [
      "Success",
      "Paid",
      "Completed", 
      "Cancelled",
      "Failed",
      "Expired",
    ];
    
    if (finalStatuses.includes(paymentStatus)) {
      setIsPaymentComplete(true);
      return;
    }

    setIsPolling(true);
    setStatusCheckCount(0);
    pollingStartTimeRef.current = Date.now();

    // Check immediately
    checkPaymentStatus();

    // ✅ OPTIMIZED: Adaptive polling intervals
    const scheduleNextCheck = () => {
      if (!isMountedRef.current || isPaymentComplete || isHandlingSuccess) {
        stopPolling();
        return;
      }

      if (statusCheckCount >= maxPollingAttempts) {
        stopPolling();

        if (isMountedRef.current && !hasNavigated) {
          Alert.alert(
            "Hết thời gian chờ",
            "Đã hết thời gian chờ xác nhận thanh toán. Vui lòng kiểm tra lại.",
            [
              {
                text: "Kiểm tra lại",
                onPress: () => {
                  setStatusCheckCount(0);
                  setIsPaymentComplete(false);
                  if (paymentStatus === "Pending") {
                    startPolling();
                  }
                },
              },
              { text: "Đóng", style: "cancel" },
            ]
          );
        }
        return;
      }

      // ✅ OPTIMIZED: Use faster polling for first 30 seconds
      const elapsedTime = Date.now() - pollingStartTimeRef.current;
      const currentInterval = elapsedTime < fastPollingDuration 
        ? earlyPollingInterval 
        : pollingInterval;

      pollingIntervalRef.current = setTimeout(() => {
        checkPaymentStatus();
        scheduleNextCheck();
      }, currentInterval);
    };

    // Start the adaptive polling cycle
    scheduleNextCheck();
  }, [
    isPolling,
    payment?.paymentId,
    payment?.id,
    paymentStatus,
    statusCheckCount,
    isPaymentComplete,
    isHandlingSuccess,
    hasNavigated,
    checkPaymentStatus,
    stopPolling,
  ]);

  // ✅ FIXED: App state monitoring for background polling
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      console.log("📱 App state changed:", nextAppState);
      
      if (nextAppState === "active" && paymentStatus === "Pending" && !isHandlingSuccess) {
        console.log("🔄 App became active, checking payment status...");
        // Check immediately when app becomes active
        setTimeout(() => {
          if (isMountedRef.current && !isPaymentComplete && !isHandlingSuccess) {
            checkPaymentStatus();
          }
        }, 500);
      }
    });

    return () => subscription?.remove();
  }, [paymentStatus, isPaymentComplete, isHandlingSuccess, checkPaymentStatus]);

  // ✅ FIXED: Deep link handling with proper state management
  useEffect(() => {
    const handleURL = (event: { url: string }) => {
      const result = handleDeepLink(event.url);

      if (result.type === "PAYMENT_SUCCESS") {
        console.log("🔗 Deep link success detected");
        setPaymentStatus("Success");
        setIsPaymentComplete(true);
        stopPolling();
        stopCountdown();
        
        // ✅ SAFE: Let the status check handle the success logic
        if (!isHandlingSuccess) {
          setTimeout(() => {
            if (isMountedRef.current && !hasNavigated) {
              handlePaymentSuccess();
            }
          }, 500);
        }
      } else if (result.type === "PAYMENT_CANCEL") {
        setPaymentStatus("Cancelled");
        setIsPaymentComplete(true);
        stopPolling();
        stopCountdown();
        Alert.alert(
          "Thanh toán đã bị hủy",
          "Bạn đã hủy thanh toán từ ứng dụng banking."
        );
      }
    };

    const subscription = Linking.addEventListener("url", handleURL);
    return () => subscription?.remove();
  }, [stopPolling, stopCountdown, handlePaymentSuccess, isHandlingSuccess, hasNavigated]);

  // Component initialization
  useEffect(() => {
    console.log("💳 PaymentWaitingScreen mounted");
    console.log("💳 Payment data structure check:", {
      paymentId: payment.paymentId,
      id: payment.id,
      externalTransactionId: payment.externalTransactionId,
      orderCode: payment.orderCode,
      totalAmount: payment.totalAmount,
      amount: payment.amount,
      status: payment.status,
      apiCallId: payment.paymentId || payment.id,
    });

    const apiPaymentId = payment.paymentId || payment.id;
    if (!apiPaymentId) {
      console.error("❌ CRITICAL: No database paymentId found!");
      Alert.alert(
        "Lỗi dữ liệu payment",
        "Không tìm thấy paymentId để gọi API. Dữ liệu payment không hợp lệ.",
        [{ text: "Quay lại", onPress: () => navigation.goBack() }]
      );
      return;
    }

    if (payment.status && payment.status !== paymentStatus) {
      setPaymentStatus(payment.status);
    }

    isMountedRef.current = true;

    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (isMountedRef.current && !isPaymentComplete && !hasNavigated) {
            Alert.alert(
              "Hết thời gian",
              "Phiên thanh toán đã hết hạn. Payment sẽ được hủy tự động.",
              [
                {
                  text: "Đóng",
                  onPress: async () => {
                    await handleCancelPayment(true);
                  },
                },
              ]
            );
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      isMountedRef.current = false;
      stopCountdown();
      stopPolling();
    };
  }, []);

  // ✅ ENHANCED: Auto start polling immediately
  useEffect(() => {
    const apiPaymentId = payment?.paymentId || payment?.id;

    if (
      apiPaymentId &&
      !isPolling &&
      (paymentStatus === "Pending" || paymentStatus === "PENDING") &&
      !isPaymentComplete &&
      !isHandlingSuccess
    ) {
      console.log("🚀 Auto-starting polling immediately...");
      startPolling();
    }
  }, [
    payment?.paymentId,
    payment?.id,
    isPolling,
    paymentStatus,
    isPaymentComplete,
    isHandlingSuccess,
    startPolling,
  ]);

  // Stop polling when payment status changes to final
  useEffect(() => {
    const finalStatuses = [
      "Success",
      "Paid", 
      "Completed",
      "Cancelled",
      "Failed",
      "Expired",
    ];
    if (finalStatuses.includes(paymentStatus) && !isPaymentComplete) {
      setIsPaymentComplete(true);
      stopPolling();
    }
  }, [paymentStatus, isPaymentComplete, stopPolling]);

  // Pulse animation
  useEffect(() => {
    if (isPaymentComplete) return;

    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isMountedRef.current && !isPaymentComplete) {
          pulse();
        }
      });
    };
    pulse();
  }, [pulseAnim, isPaymentComplete]);

  // Status message
  const statusMessage = useMemo(() => {
    if (isConfirmingBooking) {
      return {
        title: "🔄 Đang xác nhận booking...",
        subtitle: "Vui lòng đợi trong giây lát",
      };
    }

    switch (paymentStatus) {
      case "Success":
      case "Paid":
      case "Completed":
        return {
          title: "🎉 Thanh toán thành công!",
          subtitle: "Booking của bạn đã được xác nhận",
        };
      case "Cancelled":
        return {
          title: "❌ Đã hủy thanh toán",
          subtitle: "Thanh toán đã được hủy",
        };
      case "Failed":
      case "Expired":
        return {
          title: "❌ Thanh toán thất bại",
          subtitle: "Vui lòng thử lại hoặc sử dụng phương thức khác",
        };
      default:
        return {
          title: "⏳ Đang chờ thanh toán",
          subtitle: isPolling
            ? "Vui lòng đợi trong giây lát"
            : "Vui lòng đợi trong giây lát",
        };
    }
  }, [paymentStatus, isPolling, isConfirmingBooking]);

  // Status Icon
  const StatusIcon = React.memo(() => {
    const getStatusIcon = () => {
      if (isConfirmingBooking) {
        return (
          <ActivityIndicator
            size={getResponsiveSize(60)}
            color="#E91E63"
          />
        );
      }

      switch (paymentStatus) {
        case "Success":
        case "Paid":
        case "Completed":
          return (
            <MaterialIcons
              name="check-circle"
              size={getResponsiveSize(60)}
              color="#4CAF50"
            />
          );
        case "Cancelled":
        case "Failed":
        case "Expired":
          return (
            <MaterialIcons
              name="error"
              size={getResponsiveSize(60)}
              color="#F44336"
            />
          );
        default:
          return (
            <MaterialIcons
              name="payment"
              size={getResponsiveSize(60)}
              color="#FF9800"
            />
          );
      }
    };

    const getStatusStyle = () => {
      if (isConfirmingBooking) {
        return [styles.statusIconContainer, styles.processingIcon];
      }

      switch (paymentStatus) {
        case "Success":
        case "Paid":
        case "Completed":
          return [styles.statusIconContainer, styles.successIcon];
        case "Cancelled":
        case "Failed":
        case "Expired":
          return [styles.statusIconContainer, styles.failedIcon];
        default:
          return [styles.statusIconContainer, styles.pendingIcon];
      }
    };

    return (
      <Animated.View
        style={[getStatusStyle(), { transform: [{ scale: pulseAnim }] }]}
      >
        {getStatusIcon()}
      </Animated.View>
    );
  });

  // Handle actions
  const handleOpenPaymentURL = useCallback(() => {
    if (payment.paymentUrl) {
      Linking.openURL(payment.paymentUrl).catch(() => {
        Alert.alert("Lỗi", "Không thể mở link thanh toán");
      });
    } else {
      Alert.alert("Lỗi", "Không có link thanh toán");
    }
  }, [payment.paymentUrl]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      "Hủy thanh toán",
      "Bạn có chắc chắn muốn hủy thanh toán? Booking sẽ bị hủy và không thể khôi phục.",
      [
        { text: "Tiếp tục thanh toán", style: "cancel" },
        {
          text: "Hủy thanh toán",
          style: "destructive",
          onPress: () => handleCancelPayment(false),
        },
      ]
    );
  }, [handleCancelPayment]);

  const handlePaymentComplete = useCallback(() => {
    if (isHandlingSuccess || hasNavigated) return;

    setIsPaymentComplete(true);
    setPaymentStatus("Success");
    stopPolling();
    stopCountdown();
    
    // ✅ SAFE: Auto-confirm booking on manual completion
    if (!isHandlingSuccess) {
      handlePaymentSuccess();
    }
  }, [isHandlingSuccess, hasNavigated, stopPolling, stopCountdown, handlePaymentSuccess]);

  const handleManualStatusCheck = useCallback(async () => {
    const apiPaymentId = payment?.paymentId || payment?.id;
    if (!apiPaymentId || loadingPayment || isHandlingSuccess) return;

    try {
      await checkPaymentStatus();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể kiểm tra trạng thái thanh toán");
    }
  }, [payment?.paymentId, payment?.id, loadingPayment, isHandlingSuccess, checkPaymentStatus]);

  // Success Modal Component
  const SuccessModal = React.memo(() => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showSuccessModal}
      onRequestClose={() => setShowSuccessModal(false)}
    >
      <View style={styles.successModalOverlay}>
        <View style={styles.successModalContent}>
          <View style={styles.successIconWrapper}>
            <MaterialIcons
              name="check-circle"
              size={getResponsiveSize(80)}
              color="#4CAF50"
            />
          </View>

          <Text style={styles.successModalTitle}>Đặt lịch thành công!</Text>

          <Text style={styles.successModalMessage}>
            Booking của bạn đã được xác nhận và thanh toán thành công.
            Photographer sẽ liên hệ với bạn sớm nhất.
          </Text>

          <View style={styles.bookingDetails}>
            <Text style={styles.bookingDetailsTitle}>Chi tiết booking:</Text>
            <Text style={styles.bookingDetailItem}>
              📸 {booking.photographerName}
            </Text>
            <Text style={styles.bookingDetailItem}>📅 {booking.date}</Text>
            <Text style={styles.bookingDetailItem}>⏰ {booking.time}</Text>
            {booking.location && (
              <Text style={styles.bookingDetailItem}>
                📍 {booking.location}
              </Text>
            )}
            <Text style={styles.bookingDetailItem}>
              💰 {formatCurrency(booking.totalAmount)}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setShowSuccessModal(false);
              navigateToHome();
            }}
            style={styles.completeButton}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#4CAF50", "#66BB6A"]}
              style={styles.completeButtonGradient}
            >
              <Text style={styles.completeButtonText}>Hoàn tất</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  ));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#E91E63" />

      {/* Header */}
      <LinearGradient colors={["#E91E63", "#F06292"]} style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            stopCountdown();
            stopPolling();
            navigation.goBack();
          }}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <AntDesign
            name="arrowleft"
            size={getResponsiveSize(24)}
            color="#fff"
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Thanh toán</Text>
        <View style={styles.helpButton} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Status Section */}
        <View style={styles.statusSection}>
          <StatusIcon />

          <View style={styles.statusMessageContainer}>
            <Text style={styles.statusTitle}>{statusMessage.title}</Text>
            <Text style={styles.statusSubtitle}>{statusMessage.subtitle}</Text>
            <Text style={styles.orderCode}>
              Mã đơn hàng: {payment.orderCode}
            </Text>
            {/* ✅ NEW: Booking confirmation indicator */}
            {isConfirmingBooking && (
              <View style={styles.confirmingIndicator}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.confirmingText}>
                  Đang xác nhận booking...
                </Text>
              </View>
            )}
            {/* ✅ NEW: Time left display */}
            {paymentStatus === "Pending" && timeLeft > 0 && (
              <Text style={styles.timeLeft}>
                Thời gian còn lại: {formatTime(timeLeft)}
              </Text>
            )}
          </View>
        </View>

        {/* Enhanced QR Display - ✅ FIX: Make sure QR always shows when pending */}
        {(paymentStatus === "Pending" || paymentStatus === "PENDING") && 
         !isPaymentComplete && 
         payment.qrCode && (
          <View style={styles.qrSection}>
            <EnhancedQRDisplay
              paymentData={payment}
              amount={payment.amount || payment.totalAmount || booking.totalAmount}
              orderCode={payment.orderCode || payment.externalTransactionId || ""}
              onOpenPaymentURL={handleOpenPaymentURL}
            />
          </View>
        )}

        {/* ✅ FALLBACK: Show basic QR info if EnhancedQRDisplay fails */}
        {(paymentStatus === "Pending" || paymentStatus === "PENDING") && 
         !isPaymentComplete && 
         !payment.qrCode && 
         payment.paymentUrl && (
          <View style={styles.qrSection}>
            <View style={styles.qrFallback}>
              <MaterialIcons 
                name="qr-code" 
                size={getResponsiveSize(80)} 
                color="#E91E63" 
              />
              <Text style={styles.qrFallbackTitle}>Thanh toán QR</Text>
              <Text style={styles.qrFallbackSubtitle}>
                Nhấn nút bên dưới để mở ứng dụng banking
              </Text>
              <TouchableOpacity
                onPress={handleOpenPaymentURL}
                style={styles.openPaymentButton}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#E91E63", "#F06292"]}
                  style={styles.openPaymentGradient}
                >
                  <MaterialIcons 
                    name="open-in-new" 
                    size={getResponsiveSize(20)} 
                    color="#fff" 
                  />
                  <Text style={styles.openPaymentText}>Mở ứng dụng thanh toán</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Booking Info */}
        <View style={styles.bookingCard}>
          <Text style={styles.bookingCardTitle}>Thông tin booking</Text>

          <View style={styles.bookingInfo}>
            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>Photographer:</Text>
              <Text style={styles.bookingValue}>
                {booking.photographerName}
              </Text>
            </View>

            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>Ngày giờ:</Text>
              <Text style={styles.bookingValue}>
                {booking.date} • {booking.time}
              </Text>
            </View>

            {booking.location && (
              <View style={styles.bookingRow}>
                <Text style={styles.bookingLabel}>Địa điểm:</Text>
                <Text style={styles.bookingValue}>{booking.location}</Text>
              </View>
            )}

            <View style={[styles.bookingRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(booking.totalAmount)}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Actions */}
        <View style={styles.actionsContainer}>
          {/* Success button */}
          {(paymentStatus === "Success" ||
            paymentStatus === "Paid" ||
            paymentStatus === "Completed") && (
            <TouchableOpacity
              onPress={navigateToHome}
              style={styles.primaryAction}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#4CAF50", "#66BB6A"]}
                style={styles.actionGradient}
              >
                <MaterialIcons
                  name="check"
                  size={getResponsiveSize(24)}
                  color="#fff"
                />
                <Text style={styles.actionText}>Hoàn tất</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Manual status check button */}
          {paymentStatus === "Pending" && (
            <TouchableOpacity
              onPress={handleManualStatusCheck}
              style={styles.checkStatusAction}
              activeOpacity={0.7}
              disabled={loadingPayment || isHandlingSuccess}
            >
              {loadingPayment || isHandlingSuccess ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <MaterialIcons
                  name="refresh"
                  size={getResponsiveSize(20)}
                  color="#666"
                />
              )}
              <Text style={styles.checkStatusText}>
                {loadingPayment || isHandlingSuccess ? "Đang kiểm tra..." : "Kiểm tra trạng thái"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Test complete button (for testing only) */}
          {paymentStatus === "Pending" && __DEV__ && (
            <TouchableOpacity
              onPress={handlePaymentComplete}
              style={styles.testCompleteButton}
              activeOpacity={0.8}
            >
              <Text style={styles.testCompleteText}>
                🧪 Test Complete Payment
              </Text>
            </TouchableOpacity>
          )}

          {/* Cancel button */}
          {paymentStatus === "Pending" && (
            <TouchableOpacity
              onPress={handleCancel}
              style={[
                styles.cancelAction,
                isCancelling && styles.cancelActionDisabled,
              ]}
              activeOpacity={0.7}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color="#999"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.cancelActionText}>Đang hủy...</Text>
                </>
              ) : (
                <Text style={styles.cancelActionText}>Hủy thanh toán</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Success Modal */}
      <SuccessModal />
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
    fontSize: getResponsiveSize(20),
    fontWeight: "bold",
    color: "#fff",
  },
  helpButton: {
    width: getResponsiveSize(40),
    height: getResponsiveSize(40),
  },

  // Content
  content: {
    flex: 1,
  },

  // Status Section
  statusSection: {
    alignItems: "center",
    paddingVertical: getResponsiveSize(30),
    paddingHorizontal: getResponsiveSize(20),
  },
  statusIconContainer: {
    width: getResponsiveSize(120),
    height: getResponsiveSize(120),
    borderRadius: getResponsiveSize(60),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: getResponsiveSize(24),
  },
  pendingIcon: {
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    borderWidth: 3,
    borderColor: "#FF9800",
  },
  successIcon: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderWidth: 3,
    borderColor: "#4CAF50",
  },
  failedIcon: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderWidth: 3,
    borderColor: "#F44336",
  },
  processingIcon: {
    backgroundColor: "rgba(233, 30, 99, 0.1)",
    borderWidth: 3,
    borderColor: "#E91E63",
  },
  statusMessageContainer: {
    alignItems: "center",
    marginBottom: getResponsiveSize(20),
  },
  statusTitle: {
    fontSize: getResponsiveSize(22),
    fontWeight: "bold",
    color: "#333",
    marginBottom: getResponsiveSize(8),
    textAlign: "center",
  },
  statusSubtitle: {
    fontSize: getResponsiveSize(16),
    color: "#666",
    textAlign: "center",
    lineHeight: getResponsiveSize(24),
  },
  orderCode: {
    fontSize: getResponsiveSize(14),
    color: "#E91E63",
    fontWeight: "bold",
    marginTop: getResponsiveSize(8),
  },
  timeLeft: {
    fontSize: getResponsiveSize(14),
    color: "#FF9800",
    fontWeight: "600",
    marginTop: getResponsiveSize(8),
  },
  confirmingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(8),
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: getResponsiveSize(20),
  },
  confirmingText: {
    marginLeft: getResponsiveSize(8),
    fontSize: getResponsiveSize(12),
    color: "#4CAF50",
    fontWeight: "500",
  },

  // QR Section
  qrSection: {
    backgroundColor: "#fff",
    marginHorizontal: getResponsiveSize(20),
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(20),
    marginBottom: getResponsiveSize(20),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // QR Fallback styles
  qrFallback: {
    alignItems: "center",
    paddingVertical: getResponsiveSize(20),
  },
  qrFallbackTitle: {
    fontSize: getResponsiveSize(18),
    fontWeight: "bold",
    color: "#333",
    marginTop: getResponsiveSize(16),
    marginBottom: getResponsiveSize(8),
  },
  qrFallbackSubtitle: {
    fontSize: getResponsiveSize(14),
    color: "#666",
    textAlign: "center",
    marginBottom: getResponsiveSize(20),
    lineHeight: getResponsiveSize(20),
  },
  openPaymentButton: {
    borderRadius: getResponsiveSize(12),
    overflow: "hidden",
    width: "100%",
  },
  openPaymentGradient: {
    paddingVertical: getResponsiveSize(16),
    paddingHorizontal: getResponsiveSize(24),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: getResponsiveSize(8),
  },
  openPaymentText: {
    color: "#fff",
    fontSize: getResponsiveSize(16),
    fontWeight: "600",
  },

  // Booking Card
  bookingCard: {
    backgroundColor: "#fff",
    marginHorizontal: getResponsiveSize(20),
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(20),
    marginBottom: getResponsiveSize(20),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookingCardTitle: {
    fontSize: getResponsiveSize(18),
    fontWeight: "bold",
    color: "#333",
    marginBottom: getResponsiveSize(16),
  },
  bookingInfo: {
    gap: getResponsiveSize(12),
  },
  bookingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  bookingLabel: {
    fontSize: getResponsiveSize(14),
    color: "#666",
    flex: 1,
  },
  bookingValue: {
    fontSize: getResponsiveSize(14),
    color: "#333",
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: getResponsiveSize(12),
    marginTop: getResponsiveSize(12),
  },
  totalLabel: {
    fontSize: getResponsiveSize(16),
    fontWeight: "bold",
    color: "#333",
  },
  totalValue: {
    fontSize: getResponsiveSize(18),
    fontWeight: "bold",
    color: "#E91E63",
  },

  // Actions
  actionsContainer: {
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(40),
    gap: getResponsiveSize(12),
  },
  primaryAction: {
    borderRadius: getResponsiveSize(16),
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionGradient: {
    paddingVertical: getResponsiveSize(16),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: getResponsiveSize(8),
  },
  actionText: {
    color: "#fff",
    fontSize: getResponsiveSize(16),
    fontWeight: "bold",
  },
  checkStatusAction: {
    backgroundColor: "#f8f9fa",
    borderRadius: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(12),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  checkStatusText: {
    color: "#666",
    fontSize: getResponsiveSize(14),
    fontWeight: "500",
  },
  testCompleteButton: {
    backgroundColor: "#4CAF50",
    borderRadius: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(12),
    alignItems: "center",
    justifyContent: "center",
  },
  testCompleteText: {
    color: "#fff",
    fontSize: getResponsiveSize(14),
    fontWeight: "600",
  },
  cancelAction: {
    backgroundColor: "transparent",
    paddingVertical: getResponsiveSize(12),
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  cancelActionText: {
    color: "#999",
    fontSize: getResponsiveSize(14),
    textDecorationLine: "underline",
  },
  cancelActionDisabled: {
    opacity: 0.5,
  },

  // Success Modal
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: getResponsiveSize(20),
  },
  successModalContent: {
    backgroundColor: "#fff",
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(24),
    alignItems: "center",
    width: "100%",
    maxWidth: getResponsiveSize(360),
  },
  successIconWrapper: {
    marginBottom: getResponsiveSize(20),
  },
  successModalTitle: {
    fontSize: getResponsiveSize(24),
    fontWeight: "bold",
    color: "#333",
    marginBottom: getResponsiveSize(12),
    textAlign: "center",
  },
  successModalMessage: {
    fontSize: getResponsiveSize(16),
    color: "#666",
    textAlign: "center",
    lineHeight: getResponsiveSize(24),
    marginBottom: getResponsiveSize(24),
  },
  bookingDetails: {
    backgroundColor: "#f8f9fa",
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(16),
    width: "100%",
    marginBottom: getResponsiveSize(24),
  },
  bookingDetailsTitle: {
    fontSize: getResponsiveSize(16),
    fontWeight: "bold",
    color: "#333",
    marginBottom: getResponsiveSize(12),
  },
  bookingDetailItem: {
    fontSize: getResponsiveSize(14),
    color: "#666",
    marginBottom: getResponsiveSize(6),
    lineHeight: getResponsiveSize(20),
  },
  completeButton: {
    borderRadius: getResponsiveSize(12),
    overflow: "hidden",
    width: "100%",
  },
  completeButtonGradient: {
    paddingVertical: getResponsiveSize(16),
    alignItems: "center",
    justifyContent: "center",
  },
  completeButtonText: {
    color: "#fff",
    fontSize: getResponsiveSize(16),
    fontWeight: "bold",
  },
});