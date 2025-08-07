import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Modal
} from 'react-native';
import { getResponsiveSize } from '../../utils/responsive';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackNavigationProp } from '../../navigation/types';
import { usePayment } from '../../hooks/usePayment';
import type { PaymentFlowData } from '../../types/payment';
import { EnhancedQRDisplay } from '../../components/EnhancedQRDisplay';
import { handleDeepLink } from '../../config/deepLinks';

type PaymentWaitingRouteParams = PaymentFlowData;
type PaymentWaitingScreenRouteProp = RouteProp<{ PaymentWaiting: PaymentWaitingRouteParams }, 'PaymentWaiting'>;

export default function PaymentWaitingScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<PaymentWaitingScreenRouteProp>();
  const { booking, payment, user } = route.params;

  // State management
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 minutes

  // Payment polling states
  const [isPolling, setIsPolling] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('Pending'); // ✅ NEW: Use correct initial status
  const [statusCheckCount, setStatusCheckCount] = useState(0);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const maxPollingAttempts = 60; // 5 phút với interval 5s

  // Cancel states
  const [isCancelling, setIsCancelling] = useState(false);

  // Refs
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const { 
    getPayment, 
    cancelPayment,
    loadingPayment,
    getCurrentPaymentId,
    getCurrentOrderCode,
    getPaymentDebugInfo
  } = usePayment();

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stopCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    console.log('⏹️ Stopping payment status polling');
    setIsPolling(false);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // ✅ UPDATED: Handle cancel payment with new API structure
  const handleCancelPayment = useCallback(async (isAutoCancel: boolean = false) => {
    if (isCancelling) return;

    try {
      setIsCancelling(true);
      console.log('❌ Cancelling payment for booking:', booking.id);

      // ✅ NEW: Use paymentId (database primary key) for checking
      const apiPaymentId = payment.paymentId || payment.id;
      console.log('🔍 Payment info:', { 
        paymentId: apiPaymentId,                           // Database primary key
        externalTransactionId: payment.externalTransactionId, // PayOS orderCode
        orderCode: payment.orderCode,                      // Legacy field
        bookingId: booking.id 
      });

      // Check if payment exists before cancelling
      console.log('🔍 Checking if payment exists before cancelling...');
      
      let existingPayment;
      try {
        existingPayment = await getPayment(apiPaymentId);
      } catch (error) {
        if (error instanceof Error && error.message.includes('Payment not found')) {
          console.log('💀 Payment not found - may already be cancelled or expired');
          
          // ✅ Handle missing payment gracefully
          setPaymentStatus('Cancelled');
          setIsPaymentComplete(true);
          stopPolling();
          stopCountdown();
          
          if (!isAutoCancel) {
            Alert.alert(
              'Payment đã bị hủy',
              'Payment không còn tồn tại trên hệ thống. Có thể đã được hủy trước đó.',
              [{ text: 'Đóng', onPress: () => navigation.goBack() }]
            );
          } else {
            setTimeout(() => navigation.goBack(), 1000);
          }
          return;
        }
        throw error;
      }
      
      console.log('✅ Payment exists, current status:', existingPayment?.status);
      
      // ✅ NEW: Check status with correct casing
      if (['Cancelled', 'Completed', 'Paid', 'Success'].includes(existingPayment?.status || '')) {
        throw new Error(`Không thể hủy payment với trạng thái: ${existingPayment?.status}`);
      }

      // Call API to cancel payment
      const cancelSuccess = await cancelPayment(booking.id);
      
      if (cancelSuccess) {
        console.log('✅ Payment cancelled successfully');
        
        // Update local state with correct status format
        setPaymentStatus('Cancelled');
        setIsPaymentComplete(true);
        stopPolling();
        stopCountdown();

        if (!isAutoCancel) {
          Alert.alert(
            'Đã hủy thanh toán',
            'Thanh toán đã được hủy thành công. Booking cũng sẽ bị hủy.',
            [{ text: 'Đóng', onPress: () => navigation.goBack() }]
          );
        } else {
          setTimeout(() => navigation.goBack(), 1000);
        }
      } else {
        console.error('❌ Cancel payment returned false');
        Alert.alert(
          'Lỗi',
          'Không thể hủy thanh toán. Vui lòng thử lại hoặc liên hệ hỗ trợ.',
          [
            { text: 'Thử lại', onPress: () => handleCancelPayment(isAutoCancel) },
            { text: 'Đóng', style: 'cancel' }
          ]
        );
      }
      
    } catch (error) {
      console.error('❌ Error cancelling payment:', error);
      Alert.alert(
        'Lỗi hủy thanh toán',
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi hủy thanh toán. Vui lòng thử lại.',
        [
          { text: 'Thử lại', onPress: () => handleCancelPayment(isAutoCancel) },
          { text: 'Đóng', style: 'cancel' }
        ]
      );
    } finally {
      setIsCancelling(false);
    }
  }, [booking.id, payment.paymentId, payment.id, payment.externalTransactionId, payment.orderCode, getPayment, cancelPayment, isCancelling, stopPolling, stopCountdown, navigation]);

  // ✅ UPDATED: Check payment status with new API structure
  const checkPaymentStatus = useCallback(async () => {
    // ✅ CRITICAL: Use paymentId (database primary key) for API calls
    const apiPaymentId = payment?.paymentId || payment?.id;
    
    if (!apiPaymentId || isPaymentComplete) return;

    // ✅ NEW: Use correct status values with proper casing
    const finalStatuses = ['Success', 'Paid', 'Completed', 'Cancelled', 'Failed', 'Expired'];
    if (finalStatuses.includes(paymentStatus)) {
      setIsPaymentComplete(true);
      stopPolling();
      return;
    }

    try {
      console.log(`🔄 Checking payment status attempt ${statusCheckCount + 1}/${maxPollingAttempts}`);
      console.log('🔍 Using paymentId (database) for API call:', apiPaymentId);
      console.log('🔍 Current orderCode (display):', payment.externalTransactionId || payment.orderCode);

      const updatedPayment = await getPayment(apiPaymentId);
      
      if (updatedPayment && isMountedRef.current) {
        const newStatus = updatedPayment.status;
        console.log(`📊 Payment status: ${paymentStatus} → ${newStatus}`);

        // ✅ NEW: Log full payment info for debugging
        if (__DEV__) {
          console.log('🔍 Updated payment details:', {
            paymentId: updatedPayment.paymentId,
            externalTransactionId: updatedPayment.externalTransactionId,
            status: updatedPayment.status,
            totalAmount: updatedPayment.totalAmount,
            customerName: updatedPayment.customerName,
            photographerName: updatedPayment.photographerName,
            updatedAt: updatedPayment.updatedAt
          });
        }

        if (newStatus !== paymentStatus) {
          setPaymentStatus(newStatus);
        }

        // ✅ NEW: Success case with correct status values
        if (newStatus === 'Success' || newStatus === 'Paid' || newStatus === 'Completed') {
          console.log('🎉 PAYMENT SUCCESS!');
          setIsPaymentComplete(true);
          stopPolling();
          stopCountdown();
          setTimeout(() => {
            if (isMountedRef.current) {
              setShowSuccessModal(true);
            }
          }, 500);
          return;
        }

        // ✅ NEW: Failure case with correct status values
        if (newStatus === 'Cancelled' || newStatus === 'Failed' || newStatus === 'Expired') {
          console.log('❌ PAYMENT FAILED!');
          setIsPaymentComplete(true);
          stopPolling();
          stopCountdown();

          setTimeout(() => {
            if (isMountedRef.current) {
              Alert.alert(
                'Thanh toán thất bại',
                'Thanh toán của bạn đã thất bại hoặc bị hủy. Vui lòng thử lại.',
                [
                  { text: 'Thử lại', onPress: () => navigation.goBack() },
                  { text: 'Đóng', style: 'cancel' }
                ]
              );
            }
          }, 500);
          return;
        }
        
        setStatusCheckCount(prev => prev + 1);
      }
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
      
      // ✅ NEW: Enhanced error handling for payment not found
      if (error instanceof Error && error.message.includes('Payment not found')) {
        console.log('💀 Payment not found with paymentId:', apiPaymentId);
        console.log('💡 This should be database primary key, not orderCode');
        
        // Check if this is early attempts (payment might be processing)
        if (statusCheckCount < 5) {
          console.log('🔄 Early attempts - continuing to poll...');
          setStatusCheckCount(prev => prev + 1);
          return;
        }
        
        // After several attempts, treat as expired
        console.log('⏰ Payment not found after multiple attempts - treating as expired');
        setPaymentStatus('Expired');
        setIsPaymentComplete(true);
        stopPolling();
        stopCountdown();
        
        setTimeout(() => {
          if (isMountedRef.current) {
            Alert.alert(
              'Payment đã hết hạn',
              'Payment không còn tồn tại trên hệ thống. Có thể đã hết hạn hoặc bị xóa.',
              [
                { text: 'Tạo payment mới', onPress: () => navigation.goBack() },
                { text: 'Đóng', style: 'cancel' }
              ]
            );
          }
        }, 500);
        return;
      }
      
      // Other errors - continue polling but count attempts
      setStatusCheckCount(prev => prev + 1);
      
      // Stop after too many errors
      if (statusCheckCount >= maxPollingAttempts - 5) {
        console.log('❌ Too many errors - stopping polling');
        stopPolling();
        
        Alert.alert(
          'Lỗi kết nối',
          'Không thể kiểm tra trạng thái thanh toán. Vui lòng thử lại.',
          [
            {
              text: 'Thử lại',
              onPress: () => {
                setStatusCheckCount(0);
                setIsPaymentComplete(false);
                startPolling();
              }
            },
            { text: 'Đóng', style: 'cancel' }
          ]
        );
      }
    }
  }, [payment?.paymentId, payment?.id, payment?.externalTransactionId, payment?.orderCode, paymentStatus, statusCheckCount, isPaymentComplete, getPayment, stopPolling, stopCountdown, navigation]);

  // ✅ UPDATED: Start polling with correct paymentId
  const startPolling = useCallback(() => {
    const apiPaymentId = payment?.paymentId || payment?.id;
    
    if (isPolling || !apiPaymentId || isPaymentComplete) {
      console.log('🛑 Polling conditions not met:', {
        isPolling,
        hasPaymentId: !!apiPaymentId,
        isComplete: isPaymentComplete
      });
      return;
    }

    // ✅ NEW: Use correct final status values
    const finalStatuses = ['Success', 'Paid', 'Completed', 'Cancelled', 'Failed', 'Expired'];
    if (finalStatuses.includes(paymentStatus)) {
      console.log('🛑 Payment already finalized, not starting polling');
      setIsPaymentComplete(true);
      return;
    }

    console.log('🔄 Starting payment status polling...');
    console.log('🔄 Using paymentId for polling:', apiPaymentId);
    setIsPolling(true);
    setStatusCheckCount(0);

    // Check immediately
    checkPaymentStatus();

    // Then check every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current || isPaymentComplete) {
        console.log('🛑 Component unmounted or payment complete, stopping polling');
        stopPolling();
        return;
      }

      if (statusCheckCount >= maxPollingAttempts) {
        console.log('⏰ Maximum polling attempts reached');
        stopPolling();

        if (isMountedRef.current) {
          Alert.alert(
            'Hết thời gian chờ',
            'Đã hết thời gian chờ xác nhận thanh toán. Vui lòng kiểm tra lại.',
            [
              {
                text: 'Kiểm tra lại',
                onPress: () => {
                  setStatusCheckCount(0);
                  setIsPaymentComplete(false);
                  if (paymentStatus === 'Pending') {
                    startPolling();
                  }
                }
              },
              { text: 'Đóng', style: 'cancel' }
            ]
          );
        }
        return;
      }

      checkPaymentStatus();
    }, 5000);

  }, [isPolling, payment?.paymentId, payment?.id, paymentStatus, statusCheckCount, isPaymentComplete, checkPaymentStatus, stopPolling]);

  // ✅ NEW: Handle deep links
  useEffect(() => {
    const handleURL = (event: { url: string }) => {
      const result = handleDeepLink(event.url);
      
      if (result.type === 'PAYMENT_SUCCESS') {
        console.log('✅ Payment success via deep link');
        setPaymentStatus('Success');
        setIsPaymentComplete(true);
        stopPolling();
        stopCountdown();
        setTimeout(() => {
          if (isMountedRef.current) {
            setShowSuccessModal(true);
          }
        }, 500);
      } else if (result.type === 'PAYMENT_CANCEL') {
        console.log('❌ Payment cancelled via deep link');
        setPaymentStatus('Cancelled');
        setIsPaymentComplete(true);
        stopPolling();
        stopCountdown();
        Alert.alert('Thanh toán đã bị hủy', 'Bạn đã hủy thanh toán từ ứng dụng banking.');
      }
    };

    const subscription = Linking.addEventListener('url', handleURL);
    return () => subscription?.remove();
  }, [stopPolling, stopCountdown]);

  // ✅ UPDATED: Component initialization with enhanced debug info
  useEffect(() => {
    console.log('💳 PaymentWaitingScreen mounted');
    console.log('💳 Payment data structure check:', {
      // Database IDs
      paymentId: payment.paymentId,                      // Database primary key (13)
      id: payment.id,                                    // Should be same as paymentId
      
      // PayOS/Display IDs  
      externalTransactionId: payment.externalTransactionId, // PayOS orderCode (8668026703)
      orderCode: payment.orderCode,                      // Legacy field, should be same as externalTransactionId
      
      // Amounts
      totalAmount: payment.totalAmount,                  // New API field (5050)
      amount: payment.amount,                            // Legacy field, should be same as totalAmount
      
      // Status and info
      status: payment.status,                            // "Success", "Pending", etc.
      customerName: payment.customerName,                // "Phan Van Doi"
      photographerName: payment.photographerName,        // "Alice Smith"
      locationName: payment.locationName,                // "Central Park Studio"
      
      // Types validation
      paymentIdType: typeof payment.paymentId,
      idType: typeof payment.id,
      externalTransactionIdType: typeof payment.externalTransactionId,
      orderCodeType: typeof payment.orderCode,
      
      // API call validation
      apiCallId: payment.paymentId || payment.id,        // This will be used for /api/Payment/{id}
      
      // Other fields
      hasQR: !!payment.qrCode,
      qrCodeLength: payment.qrCode?.length,
      paymentUrl: payment.paymentUrl,
    });

    // ✅ CRITICAL: Validate we have the correct database ID for API calls
    const apiPaymentId = payment.paymentId || payment.id;
    if (!apiPaymentId) {
      console.error('❌ CRITICAL: No database paymentId found!');
      console.error('Available payment fields:', Object.keys(payment));
      Alert.alert(
        'Lỗi dữ liệu payment',
        'Không tìm thấy paymentId để gọi API. Dữ liệu payment không hợp lệ.',
        [{ text: 'Quay lại', onPress: () => navigation.goBack() }]
      );
      return;
    }

    // ✅ INFO: Show what ID will be used for API calls
    console.log('✅ Will use paymentId for API calls:', apiPaymentId);
    console.log('💡 API endpoint will be: /api/Payment/' + apiPaymentId);
    console.log('🎯 OrderCode for display:', payment.externalTransactionId || payment.orderCode);

    // ✅ NEW: Set initial status from payment data if available
    if (payment.status && payment.status !== paymentStatus) {
      console.log('🔄 Setting initial payment status from payment data:', payment.status);
      setPaymentStatus(payment.status);
    }

    isMountedRef.current = true;

    // Start countdown
    countdownIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (isMountedRef.current && !isPaymentComplete) {
            Alert.alert(
              'Hết thời gian',
              'Phiên thanh toán đã hết hạn. Payment sẽ được hủy tự động.',
              [
                { 
                  text: 'Đóng', 
                  onPress: async () => {
                    await handleCancelPayment(true); // Auto cancel on timeout
                  }
                }
              ]
            );
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      console.log('💳 PaymentWaitingScreen unmounting');
      isMountedRef.current = false;
      stopCountdown();
      stopPolling();
    };
  }, []);

  // ✅ UPDATED: Auto start polling with correct paymentId
  useEffect(() => {
    const apiPaymentId = payment?.paymentId || payment?.id;
    
    if (apiPaymentId && !isPolling && paymentStatus === 'Pending' && !isPaymentComplete) {
      const startTimeout = setTimeout(() => {
        if (isMountedRef.current && paymentStatus === 'Pending' && !isPolling && !isPaymentComplete) {
          startPolling();
        }
      }, 3000);

      return () => clearTimeout(startTimeout);
    }
  }, [payment?.paymentId, payment?.id, isPolling, paymentStatus, isPaymentComplete, startPolling]);

  // ✅ UPDATED: Stop polling when payment status changes to final
  useEffect(() => {
    const finalStatuses = ['Success', 'Paid', 'Completed', 'Cancelled', 'Failed', 'Expired'];
    if (finalStatuses.includes(paymentStatus) && !isPaymentComplete) {
      console.log('🛑 Payment finalized, stopping polling due to status change');
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

  // ✅ UPDATED: Status message with correct status values
  const statusMessage = useMemo(() => {
    switch (paymentStatus) {
      case 'Success':        // ✅ NEW: Capital S
      case 'Paid':
      case 'Completed':
        return {
          title: '🎉 Thanh toán thành công!',
          subtitle: 'Booking của bạn đã được xác nhận'
        };
      case 'Cancelled':      // ✅ NEW: Capital C
        return {
          title: '❌ Đã hủy thanh toán',
          subtitle: 'Thanh toán đã được hủy'
        };
      case 'Failed':         // ✅ NEW: Capital F
      case 'Expired':        // ✅ NEW: Capital E
        return {
          title: '❌ Thanh toán thất bại',
          subtitle: 'Vui lòng thử lại hoặc sử dụng phương thức khác'
        };
      default:
        return {
          title: '⏳ Đang chờ thanh toán',
          subtitle: isPolling ? 'Đang kiểm tra trạng thái thanh toán...' : 'Vui lòng thực hiện thanh toán'
        };
    }
  }, [paymentStatus, isPolling]);

  // ✅ UPDATED: Status Icon with correct status values
  const StatusIcon = React.memo(() => {
    const getStatusIcon = () => {
      switch (paymentStatus) {
        case 'Success':
        case 'Paid':
        case 'Completed':
          return <MaterialIcons name="check-circle" size={getResponsiveSize(60)} color="#4CAF50" />;
        case 'Cancelled':
        case 'Failed':
        case 'Expired':
          return <MaterialIcons name="error" size={getResponsiveSize(60)} color="#F44336" />;
        default:
          return <MaterialIcons name="payment" size={getResponsiveSize(60)} color="#FF9800" />;
      }
    };

    const getStatusStyle = () => {
      switch (paymentStatus) {
        case 'Success':
        case 'Paid':
        case 'Completed':
          return [styles.statusIconContainer, styles.successIcon];
        case 'Cancelled':
        case 'Failed':
        case 'Expired':
          return [styles.statusIconContainer, styles.failedIcon];
        default:
          return [styles.statusIconContainer, styles.pendingIcon];
      }
    };

    return (
      <Animated.View style={[getStatusStyle(), { transform: [{ scale: pulseAnim }] }]}>
        {getStatusIcon()}
      </Animated.View>
    );
  });

  // Handle actions
  const handleOpenPaymentURL = useCallback(() => {
    if (payment.paymentUrl) {
      Linking.openURL(payment.paymentUrl).catch(() => {
        Alert.alert('Lỗi', 'Không thể mở link thanh toán');
      });
    } else {
      Alert.alert('Lỗi', 'Không có link thanh toán');
    }
  }, [payment.paymentUrl]);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Hủy thanh toán',
      'Bạn có chắc chắn muốn hủy thanh toán? Booking sẽ bị hủy và không thể khôi phục.',
      [
        { text: 'Tiếp tục thanh toán', style: 'cancel' },
        {
          text: 'Hủy thanh toán',
          style: 'destructive',
          onPress: () => handleCancelPayment(false)
        }
      ]
    );
  }, [handleCancelPayment]);

  // ✅ UPDATED: Simplified handlePaymentComplete
  const handlePaymentComplete = useCallback(() => {
    console.log('✅ Payment completed manually');
    setIsPaymentComplete(true);
    setPaymentStatus('Success');
    stopPolling();
    stopCountdown();
    setShowSuccessModal(true);
  }, [stopPolling, stopCountdown]);

  const handleManualStatusCheck = useCallback(async () => {
    const apiPaymentId = payment?.paymentId || payment?.id;
    if (!apiPaymentId || loadingPayment) return;

    try {
      await checkPaymentStatus();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể kiểm tra trạng thái thanh toán');
    }
  }, [payment?.paymentId, payment?.id, loadingPayment, checkPaymentStatus]);

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
            <MaterialIcons name="check-circle" size={getResponsiveSize(80)} color="#4CAF50" />
          </View>

          <Text style={styles.successModalTitle}>Đặt lịch thành công!</Text>

          <Text style={styles.successModalMessage}>
            Booking của bạn đã được xác nhận và thanh toán thành công.
            Photographer sẽ liên hệ với bạn sớm nhất.
          </Text>

          <View style={styles.bookingDetails}>
            <Text style={styles.bookingDetailsTitle}>Chi tiết booking:</Text>
            <Text style={styles.bookingDetailItem}>📸 {booking.photographerName}</Text>
            <Text style={styles.bookingDetailItem}>📅 {booking.date}</Text>
            <Text style={styles.bookingDetailItem}>⏰ {booking.time}</Text>
            {booking.location && (
              <Text style={styles.bookingDetailItem}>📍 {booking.location}</Text>
            )}
            <Text style={styles.bookingDetailItem}>💰 {formatCurrency(booking.totalAmount)}</Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setShowSuccessModal(false);
              stopCountdown();
              stopPolling();
              // ✅ SỬA: Navigation về CustomerHomeScreen
              navigation.reset({
                index: 0,
                routes: [{ 
                  name: 'CustomerMain', 
                  params: { screen: 'CustomerHomeScreen' } 
                }],
              });
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
      <LinearGradient
        colors={["#E91E63", "#F06292"]}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => {
            stopCountdown();
            stopPolling();
            navigation.goBack();
          }}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <AntDesign name="arrowleft" size={getResponsiveSize(24)} color="#fff" />
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
            <Text style={styles.orderCode}>Mã đơn hàng: {payment.orderCode}</Text>

            {/* ✅ THÊM: Time left display */}
            {paymentStatus === 'PENDING' && timeLeft > 0 && (
              <Text style={styles.timeLeft}>
                Thời gian còn lại: {formatTime(timeLeft)}
              </Text>
            )}

            {/* ✅ THÊM: Polling indicator */}
            {isPolling && paymentStatus === 'PENDING' && (
              <View style={styles.pollingIndicator}>
                <ActivityIndicator size="small" color="#E91E63" />
                <Text style={styles.pollingText}>
                  Đang kiểm tra ({statusCheckCount}/{maxPollingAttempts})
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Enhanced QR Display */}
        {paymentStatus === 'PENDING' && !isPaymentComplete && (
          <View style={styles.qrSection}>
            <EnhancedQRDisplay
              paymentData={payment}
              amount={payment.amount || booking.totalAmount}
              orderCode={payment.orderCode || ''}
              onOpenPaymentURL={handleOpenPaymentURL}
            />
          </View>
        )}

        {/* Booking Info */}
        <View style={styles.bookingCard}>
          <Text style={styles.bookingCardTitle}>Thông tin booking</Text>

          <View style={styles.bookingInfo}>
            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>Photographer:</Text>
              <Text style={styles.bookingValue}>{booking.photographerName}</Text>
            </View>

            <View style={styles.bookingRow}>
              <Text style={styles.bookingLabel}>Ngày giờ:</Text>
              <Text style={styles.bookingValue}>{booking.date} • {booking.time}</Text>
            </View>

            {booking.location && (
              <View style={styles.bookingRow}>
                <Text style={styles.bookingLabel}>Địa điểm:</Text>
                <Text style={styles.bookingValue}>{booking.location}</Text>
              </View>
            )}

            <View style={[styles.bookingRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Tổng thanh toán:</Text>
              <Text style={styles.totalValue}>{formatCurrency(booking.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Actions */}
        <View style={styles.actionsContainer}>
          {/* ✅ SỬA: Success button navigation */}
          {(paymentStatus === 'SUCCESS' || paymentStatus === 'PAID' || paymentStatus === 'COMPLETED') && (
            <TouchableOpacity
              onPress={() => {
                stopCountdown();
                stopPolling();
                navigation.reset({
                  index: 0,
                  routes: [{ 
                    name: 'CustomerMain', 
                    params: { screen: 'CustomerHomeScreen' } 
                  }],
                });
              }}
              style={styles.primaryAction}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["#4CAF50", "#66BB6A"]}
                style={styles.actionGradient}
              >
                <MaterialIcons name="check" size={getResponsiveSize(24)} color="#fff" />
                <Text style={styles.actionText}>Hoàn tất</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Manual status check button */}
          {paymentStatus === 'PENDING' && (
            <TouchableOpacity
              onPress={handleManualStatusCheck}
              style={styles.checkStatusAction}
              activeOpacity={0.7}
              disabled={loadingPayment}
            >
              {loadingPayment ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <MaterialIcons name="refresh" size={getResponsiveSize(20)} color="#666" />
              )}
              <Text style={styles.checkStatusText}>
                {loadingPayment ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái'}
              </Text>
            </TouchableOpacity>
          )}

          {/* ✅ THÊM: Test complete button (for testing only) */}
          {paymentStatus === 'PENDING' && __DEV__ && (
            <TouchableOpacity
              onPress={handlePaymentComplete}
              style={styles.testCompleteButton}
              activeOpacity={0.8}
            >
              <Text style={styles.testCompleteText}>🧪 Test Complete Payment</Text>
            </TouchableOpacity>
          )}

          {/* Cancel button - now fixed */}
          {paymentStatus === 'PENDING' && (
            <TouchableOpacity
              onPress={handleCancel}
              style={[styles.cancelAction, isCancelling && styles.cancelActionDisabled]}
              activeOpacity={0.7}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <ActivityIndicator size="small" color="#999" style={{ marginRight: 8 }} />
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
    backgroundColor: '#f8f9fa',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: getResponsiveSize(50),
    paddingBottom: getResponsiveSize(20),
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(8),
  },
  headerTitle: {
    fontSize: getResponsiveSize(20),
    fontWeight: 'bold',
    color: '#fff',
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
    alignItems: 'center',
    paddingVertical: getResponsiveSize(30),
    paddingHorizontal: getResponsiveSize(20),
  },
  statusIconContainer: {
    width: getResponsiveSize(120),
    height: getResponsiveSize(120),
    borderRadius: getResponsiveSize(60),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: getResponsiveSize(24),
  },
  pendingIcon: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderWidth: 3,
    borderColor: '#FF9800',
  },
  successIcon: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 3,
    borderColor: '#4CAF50',
  },
  failedIcon: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderWidth: 3,
    borderColor: '#F44336',
  },
  statusMessageContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
  },
  statusTitle: {
    fontSize: getResponsiveSize(22),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: getResponsiveSize(8),
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: getResponsiveSize(16),
    color: '#666',
    textAlign: 'center',
    lineHeight: getResponsiveSize(24),
  },
  orderCode: {
    fontSize: getResponsiveSize(14),
    color: '#E91E63',
    fontWeight: 'bold',
    marginTop: getResponsiveSize(8),
  },
  timeLeft: {
    fontSize: getResponsiveSize(14),
    color: '#FF9800',
    fontWeight: '600',
    marginTop: getResponsiveSize(8),
  },
  pollingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(8),
    backgroundColor: 'rgba(233, 30, 99, 0.1)',
    borderRadius: getResponsiveSize(20),
  },
  pollingText: {
    marginLeft: getResponsiveSize(8),
    fontSize: getResponsiveSize(12),
    color: '#E91E63',
    fontWeight: '500',
  },

  // QR Section
  qrSection: {
    backgroundColor: '#fff',
    marginHorizontal: getResponsiveSize(20),
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(20),
    marginBottom: getResponsiveSize(20),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // Booking Card
  bookingCard: {
    backgroundColor: '#fff',
    marginHorizontal: getResponsiveSize(20),
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(20),
    marginBottom: getResponsiveSize(20),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bookingCardTitle: {
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: getResponsiveSize(16),
  },
  bookingInfo: {
    gap: getResponsiveSize(12),
  },
  bookingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bookingLabel: {
    fontSize: getResponsiveSize(14),
    color: '#666',
    flex: 1,
  },
  bookingValue: {
    fontSize: getResponsiveSize(14),
    color: '#333',
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: getResponsiveSize(12),
    marginTop: getResponsiveSize(12),
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

  // Actions
  actionsContainer: {
    paddingHorizontal: getResponsiveSize(20),
    paddingBottom: getResponsiveSize(40),
    gap: getResponsiveSize(12),
  },
  primaryAction: {
    borderRadius: getResponsiveSize(16),
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionGradient: {
    paddingVertical: getResponsiveSize(16),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: getResponsiveSize(8),
  },
  actionText: {
    color: '#fff',
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
  },
  checkStatusAction: {
    backgroundColor: '#f8f9fa',
    borderRadius: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(12),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: getResponsiveSize(8),
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  checkStatusText: {
    color: '#666',
    fontSize: getResponsiveSize(14),
    fontWeight: '500',
  },
  testCompleteButton: {
    backgroundColor: '#4CAF50',
    borderRadius: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  testCompleteText: {
    color: '#fff',
    fontSize: getResponsiveSize(14),
    fontWeight: '600',
  },
  cancelAction: {
    backgroundColor: 'transparent',
    paddingVertical: getResponsiveSize(12),
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelActionText: {
    color: '#999',
    fontSize: getResponsiveSize(14),
    textDecorationLine: 'underline',
  },
  cancelActionDisabled: {
    opacity: 0.5,
  },

  // Success Modal
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSize(20),
  },
  successModalContent: {
    backgroundColor: '#fff',
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(24),
    alignItems: 'center',
    width: '100%',
    maxWidth: getResponsiveSize(360),
  },
  successIconWrapper: {
    marginBottom: getResponsiveSize(20),
  },
  successModalTitle: {
    fontSize: getResponsiveSize(24),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: getResponsiveSize(12),
    textAlign: 'center',
  },
  successModalMessage: {
    fontSize: getResponsiveSize(16),
    color: '#666',
    textAlign: 'center',
    lineHeight: getResponsiveSize(24),
    marginBottom: getResponsiveSize(24),
  },
  bookingDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(16),
    width: '100%',
    marginBottom: getResponsiveSize(24),
  },
  bookingDetailsTitle: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: getResponsiveSize(12),
  },
  bookingDetailItem: {
    fontSize: getResponsiveSize(14),
    color: '#666',
    marginBottom: getResponsiveSize(6),
    lineHeight: getResponsiveSize(20),
  },
  completeButton: {
    borderRadius: getResponsiveSize(12),
    overflow: 'hidden',
    width: '100%',
  },
  completeButtonGradient: {
    paddingVertical: getResponsiveSize(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
  },
});