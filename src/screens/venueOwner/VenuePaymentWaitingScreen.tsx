// screens/VenuePaymentWaitingScreen.tsx
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
  BackHandler,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getResponsiveSize } from "../../utils/responsive";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { AntDesign, MaterialIcons, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import type { RouteProp } from "@react-navigation/native";
import type { RootStackNavigationProp } from "../../navigation/types";
import { usePayment } from "../../hooks/usePayment";
import { useVenueWallet } from "../../hooks/useVenueWallet";
import { EnhancedQRDisplay } from "../../components/EnhancedQRDisplay";
import { handleDeepLink } from "../../config/deepLinks";

// 🏢 VENUE-SPECIFIC: Simple venue payment data structure
interface VenuePaymentData {
  booking?: {
    id: number;
    photographerName: string;
    date: string;
    time: string;
    location: string;
    totalAmount: number;
  };
  payment?: {
    id: number;
    paymentId: number;
    orderCode: string;
    externalTransactionId: string;
    amount: number;
    totalAmount: number;
    status: string;
    paymentUrl: string;
    qrCode: string;
    bin: string;
    accountNumber: string;
    description: string;
    currency: string;
    paymentLinkId: string;
    expiredAt: string | null;
    payOSData: any;
  };
  isVenueOwner?: boolean;
  returnToVenueHome?: boolean;
  onPaymentSuccess?: () => void;
}

type VenuePaymentWaitingRouteParams = VenuePaymentData;
type VenuePaymentWaitingScreenRouteProp = RouteProp<
  { VenuePaymentWaitingScreen: VenuePaymentWaitingRouteParams },
  "VenuePaymentWaitingScreen"
>;

export default function VenuePaymentWaitingScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<VenuePaymentWaitingScreenRouteProp>();
  const { booking, payment, onPaymentSuccess } = route.params;

  // 🏢 VENUE WALLET HOOK
  const { fetchWalletBalance, formatCurrency } = useVenueWallet();

  // 🏢 VENUE-SPECIFIC: Simplified states
  const [isHandlingSuccess, setIsHandlingSuccess] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes

  // Payment polling states
  const [isPolling, setIsPolling] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>("Pending");
  const [statusCheckCount, setStatusCheckCount] = useState(0);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);

  // 🏢 VENUE-SPECIFIC: More aggressive polling for venue owners
  const maxPollingAttempts = 40; // 3.3 minutes
  const pollingInterval = 3000; // 3 seconds
  const earlyPollingInterval = 2000; // 2 seconds for first minute
  const fastPollingDuration = 60000; // 60 seconds

  // Cancel states
  const [isCancelling, setIsCancelling] = useState(false);

  // Refs
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const pollingStartTimeRef = useRef<number>(Date.now());

  const { getPayment, cancelPayment, loadingPayment } = usePayment();

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Helper functions
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

  // 🏢 VENUE-SPECIFIC: Navigate back to VenueOwnerHome
  const navigateToVenueHome = useCallback(() => {
    if (hasNavigated) {
      console.log("🛡️ Navigation already triggered, skipping...");
      return;
    }

    setHasNavigated(true);
    stopCountdown();
    stopPolling();

    console.log("🏢 Navigating back to VenueOwnerHome...");
    navigation.reset({
      index: 0,
      routes: [
        {
          name: "VenueOwnerMain",
          params: { screen: "VenueOwnerHome" },
        },
      ],
    });
  }, [hasNavigated, navigation, stopCountdown, stopPolling]);

  // 🏢 VENUE-SPECIFIC: Handle payment success
  const handlePaymentSuccess = useCallback(async () => {
    if (isHandlingSuccess) {
      console.log("🛡️ Already handling success, skipping duplicate call...");
      return;
    }

    if (hasNavigated) {
      console.log("🛡️ Already navigated, skipping success handling...");
      return;
    }

    console.log(
      "🎉 Venue wallet top-up successful! Starting success handling..."
    );
    setIsHandlingSuccess(true);

    try {
      // 🏢 VENUE: Refresh wallet balance
      console.log("🏢 Refreshing venue wallet balance...");
      await fetchWalletBalance();

      // Trigger parent success callback
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }

      // Show success modal
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
      setIsHandlingSuccess(false);
    }
  }, [isHandlingSuccess, hasNavigated, fetchWalletBalance, onPaymentSuccess]);

  // 🏢 VENUE-SPECIFIC: Back button protection
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (
          isPaymentComplete &&
          (paymentStatus === "Success" ||
            paymentStatus === "Paid" ||
            paymentStatus === "Completed")
        ) {
          // Allow navigation if payment is successful
          navigateToVenueHome();
          return true;
        } else {
          // Payment not completed, show confirmation
          Alert.alert(
            "Xác nhận hủy nạp tiền",
            "Bạn có chắc muốn hủy giao dịch nạp tiền này?",
            [
              { text: "Ở lại", style: "cancel" },
              {
                text: "Hủy giao dịch",
                style: "destructive",
                onPress: async () => {
                  await handleCancelPayment();
                  navigateToVenueHome();
                },
              },
            ]
          );
          return true;
        }
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => subscription.remove();
    }, [paymentStatus, isPaymentComplete, navigateToVenueHome])
  );

  // Navigation listener for back button in header
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (
        isPaymentComplete &&
        (paymentStatus === "Success" ||
          paymentStatus === "Paid" ||
          paymentStatus === "Completed")
      ) {
        // Allow navigation if payment is successful
        return;
      }

      e.preventDefault(); // Block default back action
      Alert.alert(
        "Xác nhận hủy nạp tiền",
        "Bạn có chắc muốn hủy giao dịch nạp tiền này?",
        [
          { text: "Không", style: "cancel" },
          {
            text: "Có",
            style: "destructive",
            onPress: async () => {
              await handleCancelPayment();
              navigation.dispatch(e.data.action);
            },
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, isPaymentComplete, paymentStatus]);

  // 🏢 VENUE-SPECIFIC: Handle cancel payment
  const handleCancelPayment = useCallback(
    async (isAutoCancel: boolean = false) => {
      if (isCancelling || hasNavigated) return;

      try {
        setIsCancelling(true);

        const apiPaymentId = payment?.paymentId || payment?.id;

        // Check if payment exists
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
                "Giao dịch đã bị hủy",
                "Giao dịch nạp tiền không còn tồn tại trên hệ thống.",
                [{ text: "Đóng", onPress: () => navigateToVenueHome() }]
              );
            } else {
              setTimeout(() => navigateToVenueHome(), 1000);
            }
            return;
          }
          throw error;
        }

        // Check if can cancel
        if (
          ["Cancelled", "Completed", "Paid", "Success"].includes(
            existingPayment?.status || ""
          )
        ) {
          throw new Error(
            `Không thể hủy giao dịch với trạng thái: ${existingPayment?.status}`
          );
        }

        // Cancel payment
        const cancelSuccess = await cancelPayment(payment?.id);

        if (cancelSuccess) {
          setPaymentStatus("Cancelled");
          setIsPaymentComplete(true);
          stopPolling();
          stopCountdown();

          if (!isAutoCancel) {
            Alert.alert(
              "Đã hủy giao dịch",
              "Giao dịch nạp tiền đã được hủy thành công.",
              [{ text: "Đóng", onPress: () => navigateToVenueHome() }]
            );
          } else {
            setTimeout(() => navigateToVenueHome(), 1000);
          }
        } else {
          throw new Error("Không thể hủy giao dịch");
        }
      } catch (error) {
        console.error("❌ Error cancelling payment:", error);
        Alert.alert(
          "Lỗi hủy giao dịch",
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra khi hủy giao dịch. Vui lòng thử lại.",
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
      payment?.paymentId,
      payment?.id,
      getPayment,
      cancelPayment,
      isCancelling,
      hasNavigated,
      stopPolling,
      stopCountdown,
      navigateToVenueHome,
    ]
  );

  // Check payment status
  const checkPaymentStatus = useCallback(async () => {
    const apiPaymentId = payment?.paymentId || payment?.id;

    if (!apiPaymentId || isPaymentComplete || isHandlingSuccess) {
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
      stopPolling();
      return;
    }

    try {
      console.log(
        `🏢 Checking venue payment status for ID: ${apiPaymentId} (attempt ${
          statusCheckCount + 1
        })`
      );

      const updatedPayment = await getPayment(apiPaymentId);

      if (updatedPayment && isMountedRef.current) {
        const newStatus = updatedPayment.status;
        console.log(`🏢 Venue payment status: ${paymentStatus} → ${newStatus}`);

        if (newStatus !== paymentStatus) {
          setPaymentStatus(newStatus);
        }

        // Check success
        const successStatuses = [
          "Success",
          "Paid",
          "Completed",
          "PAID",
          "SUCCESS",
          "COMPLETED",
        ];
        if (successStatuses.includes(newStatus)) {
          console.log("🎉 Venue payment SUCCESS detected!");
          setIsPaymentComplete(true);
          stopPolling();
          stopCountdown();

          if (!isHandlingSuccess) {
            await handlePaymentSuccess();
          }
          return;
        }

        // Check failure
        const failureStatuses = [
          "Cancelled",
          "Failed",
          "Expired",
          "CANCELLED",
          "FAILED",
          "EXPIRED",
        ];
        if (failureStatuses.includes(newStatus)) {
          console.log("❌ Venue payment FAILED detected:", newStatus);
          setIsPaymentComplete(true);
          stopPolling();
          stopCountdown();

          setTimeout(() => {
            if (isMountedRef.current && !hasNavigated) {
              Alert.alert(
                "Nạp tiền thất bại",
                `Giao dịch nạp tiền đã thất bại (${newStatus}). Vui lòng thử lại.`,
                [
                  { text: "Thử lại", onPress: () => navigateToVenueHome() },
                  { text: "Đóng", style: "cancel" },
                ]
              );
            }
          }, 500);
          return;
        }

        setStatusCheckCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error("❌ Error checking venue payment status:", error);

      if (
        error instanceof Error &&
        error.message.includes("Payment not found")
      ) {
        if (statusCheckCount < 10) {
          setStatusCheckCount((prev) => prev + 1);
          return;
        }

        setPaymentStatus("Expired");
        setIsPaymentComplete(true);
        stopPolling();
        stopCountdown();

        setTimeout(() => {
          if (isMountedRef.current && !hasNavigated) {
            Alert.alert(
              "Giao dịch đã hết hạn",
              "Giao dịch không còn tồn tại trên hệ thống.",
              [
                {
                  text: "Tạo giao dịch mới",
                  onPress: () => navigateToVenueHome(),
                },
                { text: "Đóng", style: "cancel" },
              ]
            );
          }
        }, 500);
        return;
      }

      setStatusCheckCount((prev) => prev + 1);

      if (statusCheckCount >= maxPollingAttempts - 3) {
        stopPolling();

        if (!hasNavigated) {
          Alert.alert(
            "Lỗi kết nối",
            "Không thể kiểm tra trạng thái giao dịch. Vui lòng thử lại.",
            [
              {
                text: "Thử lại",
                onPress: () => {
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
    navigateToVenueHome,
    handlePaymentSuccess,
  ]);

  // Start polling
  const startPolling = useCallback(() => {
    const apiPaymentId = payment?.paymentId || payment?.id;

    if (isPolling || !apiPaymentId || isPaymentComplete || isHandlingSuccess) {
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

    // Schedule next checks
    const scheduleNextCheck = () => {
      if (!isMountedRef.current || isPaymentComplete || isHandlingSuccess) {
        stopPolling();
        return;
      }

      if (statusCheckCount >= maxPollingAttempts) {
        stopPolling();
        return;
      }

      const elapsedTime = Date.now() - pollingStartTimeRef.current;
      const currentInterval =
        elapsedTime < fastPollingDuration
          ? earlyPollingInterval
          : pollingInterval;

      pollingIntervalRef.current = setTimeout(() => {
        checkPaymentStatus();
        scheduleNextCheck();
      }, currentInterval);
    };

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

  // App state monitoring
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      console.log("🏢 Venue app state changed:", nextAppState);

      if (
        nextAppState === "active" &&
        paymentStatus === "Pending" &&
        !isHandlingSuccess
      ) {
        console.log("🏢 Venue app became active, checking payment status...");
        setTimeout(() => {
          if (
            isMountedRef.current &&
            !isPaymentComplete &&
            !isHandlingSuccess
          ) {
            checkPaymentStatus();
          }
        }, 500);
      }
    });

    return () => subscription?.remove();
  }, [paymentStatus, isPaymentComplete, isHandlingSuccess, checkPaymentStatus]);

  // Deep link handling
  useEffect(() => {
    const handleURL = (event: { url: string }) => {
      const result = handleDeepLink(event.url);

      if (result.type === "PAYMENT_SUCCESS") {
        console.log("🏢 Venue deep link success detected");
        setPaymentStatus("Success");
        setIsPaymentComplete(true);
        stopPolling();
        stopCountdown();

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
          "Đã hủy giao dịch",
          "Bạn đã hủy giao dịch từ ứng dụng banking."
        );
      }
    };

    const subscription = Linking.addEventListener("url", handleURL);
    return () => subscription?.remove();
  }, [
    stopPolling,
    stopCountdown,
    handlePaymentSuccess,
    isHandlingSuccess,
    hasNavigated,
  ]);

  // Component initialization
  useEffect(() => {
    console.log("🏢 VenuePaymentWaitingScreen mounted");

    const apiPaymentId = payment?.paymentId || payment?.id;
    if (!apiPaymentId) {
      Alert.alert(
        "Lỗi dữ liệu thanh toán",
        "Không tìm thấy paymentId để gọi API.",
        [{ text: "Quay lại", onPress: () => navigateToVenueHome() }]
      );
      return;
    }

    if (payment?.status && payment.status !== paymentStatus) {
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
              "Phiên giao dịch đã hết hạn. Giao dịch sẽ được hủy tự động.",
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

  // Auto start polling
  useEffect(() => {
    const apiPaymentId = payment?.paymentId || payment?.id;

    if (
      apiPaymentId &&
      !isPolling &&
      (paymentStatus === "Pending" || paymentStatus === "PENDING") &&
      !isPaymentComplete &&
      !isHandlingSuccess
    ) {
      console.log("🏢 Auto-starting venue polling...");
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

  // 🏢 VENUE-SPECIFIC: Status message
  const statusMessage = useMemo(() => {
    switch (paymentStatus) {
      case "Success":
      case "Paid":
      case "Completed":
        return {
          title: "🎉 Nạp tiền thành công!",
          subtitle: "Số dư ví Venue Owner đã được cập nhật",
        };
      case "Cancelled":
        return {
          title: "❌ Đã hủy giao dịch",
          subtitle: "Giao dịch nạp tiền đã được hủy",
        };
      case "Failed":
      case "Expired":
        return {
          title: "❌ Nạp tiền thất bại",
          subtitle: "Vui lòng thử lại hoặc sử dụng phương thức khác",
        };
      default:
        return {
          title: "⏳ Đang chờ thanh toán",
          subtitle: isPolling
            ? "Vui lòng đợi trong giây lát"
            : "Vui lòng quét mã QR để thanh toán",
        };
    }
  }, [paymentStatus, isPolling]);

  // Status Icon
  const StatusIcon = React.memo(() => {
    const getStatusIcon = () => {
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
            <Ionicons
              name="wallet-outline"
              size={getResponsiveSize(60)}
              color="#8B5CF6"
            />
          );
      }
    };

    const getStatusStyle = () => {
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
    if (payment?.paymentUrl) {
      Linking.openURL(payment.paymentUrl).catch(() => {
        Alert.alert("Lỗi", "Không thể mở link thanh toán");
      });
    } else {
      Alert.alert("Lỗi", "Không có link thanh toán");
    }
  }, [payment?.paymentUrl]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      "Hủy giao dịch",
      "Bạn có chắc chắn muốn hủy giao dịch nạp tiền này?",
      [
        { text: "Tiếp tục thanh toán", style: "cancel" },
        {
          text: "Hủy giao dịch",
          style: "destructive",
          onPress: () => handleCancelPayment(false),
        },
      ]
    );
  }, [handleCancelPayment]);

  const handleManualStatusCheck = useCallback(async () => {
    const apiPaymentId = payment?.paymentId || payment?.id;
    if (!apiPaymentId || loadingPayment || isHandlingSuccess) return;

    try {
      await checkPaymentStatus();
    } catch (error) {
      Alert.alert("Lỗi", "Không thể kiểm tra trạng thái giao dịch");
    }
  }, [
    payment?.paymentId,
    payment?.id,
    loadingPayment,
    isHandlingSuccess,
    checkPaymentStatus,
  ]);

  // 🏢 VENUE-SPECIFIC: Success Modal
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

          <Text style={styles.successModalTitle}>Nạp tiền thành công!</Text>

          <Text style={styles.successModalMessage}>
            Giao dịch nạp tiền đã được xử lý thành công. Số dư ví Venue Owner
            của bạn đã được cập nhật.
          </Text>

          <View style={styles.venueDetails}>
            <Text style={styles.venueDetailsTitle}>Chi tiết giao dịch:</Text>
            <Text style={styles.venueDetailItem}>
              💰 Số tiền nạp:{" "}
              {formatCurrency(payment?.amount || payment?.totalAmount || 0)}
            </Text>
            <Text style={styles.venueDetailItem}>
              🏷️ Mã giao dịch: {payment?.orderCode}
            </Text>
            <Text style={styles.venueDetailItem}>
              📅 Thời gian: {new Date().toLocaleString("vi-VN")}
            </Text>
            <Text style={styles.venueDetailItem}>
              🏢 Loại tài khoản: Venue Owner
            </Text>
            <Text style={styles.venueDetailItem}>
              🦄 Phương thức: Chuyển khoản ngân hàng
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setShowSuccessModal(false);
              navigateToVenueHome();
            }}
            style={styles.completeButton}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["#8B5CF6", "#A855F7"]}
              style={styles.completeButtonGradient}
            >
              <Text style={styles.completeButtonText}>Về trang chủ</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  ));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B5CF6" />

      {/* 🏢 VENUE-SPECIFIC: Purple header for venue owner */}
      <LinearGradient colors={["#8B5CF6", "#A855F7"]} style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            stopCountdown();
            stopPolling();
            navigateToVenueHome();
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

        <Text style={styles.headerTitle}>Nạp tiền ví - Venue Owner</Text>
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
              Mã giao dịch: {payment?.orderCode}
            </Text>
            {/* Time left display */}
            {paymentStatus === "Pending" && timeLeft > 0 && (
              <Text style={styles.timeLeft}>
                Thời gian còn lại: {formatTime(timeLeft)}
              </Text>
            )}
          </View>
        </View>

        {/* Enhanced QR Display */}
        {(paymentStatus === "Pending" || paymentStatus === "PENDING") &&
          !isPaymentComplete &&
          payment?.qrCode && (
            <View style={styles.qrSection}>
              <EnhancedQRDisplay
                paymentData={payment}
                amount={payment.amount || payment.totalAmount}
                orderCode={
                  payment.orderCode || payment.externalTransactionId || ""
                }
                onOpenPaymentURL={handleOpenPaymentURL}
              />
            </View>
          )}

        {/* Fallback QR info */}
        {(paymentStatus === "Pending" || paymentStatus === "PENDING") &&
          !isPaymentComplete &&
          !payment?.qrCode &&
          payment?.paymentUrl && (
            <View style={styles.qrSection}>
              <View style={styles.qrFallback}>
                <Ionicons
                  name="qr-code"
                  size={getResponsiveSize(80)}
                  color="#8B5CF6"
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
                    colors={["#8B5CF6", "#A855F7"]}
                    style={styles.openPaymentGradient}
                  >
                    <MaterialIcons
                      name="open-in-new"
                      size={getResponsiveSize(20)}
                      color="#fff"
                    />
                    <Text style={styles.openPaymentText}>
                      Mở ứng dụng thanh toán
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}

        {/* 🏢 VENUE-SPECIFIC: Venue Wallet Info */}
        <View style={styles.venueCard}>
          <Text style={styles.venueCardTitle}>Thông tin nạp tiền ví</Text>

          <View style={styles.venueInfo}>
            <View style={styles.venueRow}>
              <Text style={styles.venueLabel}>Loại tài khoản:</Text>
              <Text style={styles.venueValue}>Venue Owner</Text>
            </View>

            <View style={styles.venueRow}>
              <Text style={styles.venueLabel}>Loại giao dịch:</Text>
              <Text style={styles.venueValue}>Nạp tiền ví điện tử</Text>
            </View>

            <View style={styles.venueRow}>
              <Text style={styles.venueLabel}>Thời gian tạo:</Text>
              <Text style={styles.venueValue}>
                {new Date().toLocaleString("vi-VN")}
              </Text>
            </View>

            <View style={styles.venueRow}>
              <Text style={styles.venueLabel}>Phương thức:</Text>
              <Text style={styles.venueValue}>Chuyển khoản ngân hàng</Text>
            </View>

            <View style={[styles.venueRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Số tiền nạp:</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(payment?.amount || payment?.totalAmount || 0)}
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
              onPress={navigateToVenueHome}
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
                <Text style={styles.actionText}>Về trang chủ</Text>
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
                {loadingPayment || isHandlingSuccess
                  ? "Đang kiểm tra..."
                  : "Kiểm tra trạng thái"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Test complete button (for testing only) */}
          {paymentStatus === "Pending" && __DEV__ && (
            <TouchableOpacity
              onPress={async () => {
                setIsPaymentComplete(true);
                setPaymentStatus("Success");
                stopPolling();
                stopCountdown();
                if (!isHandlingSuccess) {
                  handlePaymentSuccess();
                }
              }}
              style={styles.testCompleteButton}
              activeOpacity={0.8}
            >
              <Text style={styles.testCompleteText}>
                🧪 Test Complete Venue Payment
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
                <Text style={styles.cancelActionText}>Hủy giao dịch</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Success Modal */}
      <SuccessModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },

  // Header - 🏢 VENUE PURPLE THEME
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: getResponsiveSize(10),
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
    backgroundColor: "rgba(139, 92, 246, 0.1)", // Purple for venue
    borderWidth: 3,
    borderColor: "#8B5CF6",
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
    color: "#8B5CF6", // Purple for venue
    fontWeight: "bold",
    marginTop: getResponsiveSize(8),
  },
  timeLeft: {
    fontSize: getResponsiveSize(14),
    color: "#FF9800",
    fontWeight: "600",
    marginTop: getResponsiveSize(8),
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

  // 🏢 VENUE-SPECIFIC: Venue Card
  venueCard: {
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
  venueCardTitle: {
    fontSize: getResponsiveSize(18),
    fontWeight: "bold",
    color: "#333",
    marginBottom: getResponsiveSize(16),
  },
  venueInfo: {
    gap: getResponsiveSize(12),
  },
  venueRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  venueLabel: {
    fontSize: getResponsiveSize(14),
    color: "#666",
    flex: 1,
  },
  venueValue: {
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
    color: "#8B5CF6", // Purple for venue
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
    backgroundColor: "#8B5CF6", // Purple for venue
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

  // 🏢 VENUE-SPECIFIC: Success Modal
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
  venueDetails: {
    backgroundColor: "#f8f9fa",
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(16),
    width: "100%",
    marginBottom: getResponsiveSize(24),
  },
  venueDetailsTitle: {
    fontSize: getResponsiveSize(16),
    fontWeight: "bold",
    color: "#333",
    marginBottom: getResponsiveSize(12),
  },
  venueDetailItem: {
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
