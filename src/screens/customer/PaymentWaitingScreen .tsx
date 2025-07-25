// PaymentWaitingScreen.tsx - COMPLETE VERSION WITH CANCEL API

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
  const [paymentStatus, setPaymentStatus] = useState<string>('PENDING');
  const [statusCheckCount, setStatusCheckCount] = useState(0);
  const [isPaymentComplete, setIsPaymentComplete] = useState(false);
  const maxPollingAttempts = 60; // 5 phút với interval 5s

  // Cancel states
  const [isCancelling, setIsCancelling] = useState(false);

  // Refs
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Hooks
  const { 
    handlePaymentSuccess, 
    getPayment, 
    cancelPayment,
    loadingPayment 
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

  // Handle cancel payment with API call
  const handleCancelPayment = useCallback(async (isAutoCancel: boolean = false) => {
    if (isCancelling) return;

    try {
      setIsCancelling(true);
      console.log('❌ Cancelling payment:', payment.id);

      // Call API to cancel payment
      const cancelSuccess = await cancelPayment(payment.id);
      
      if (cancelSuccess) {
        console.log('✅ Payment cancelled successfully');
        
        // Update local state
        setPaymentStatus('CANCELLED');
        setIsPaymentComplete(true);
        stopPolling();
        stopCountdown();

        // Show success message for manual cancel
        if (!isAutoCancel) {
          Alert.alert(
            'Đã hủy thanh toán',
            'Thanh toán đã được hủy thành công. Booking cũng sẽ bị hủy.',
            [
              {
                text: 'Đóng',
                onPress: () => navigation.goBack()
              }
            ]
          );
        } else {
          // Auto navigation for timeout cancel
          setTimeout(() => {
            navigation.goBack();
          }, 1000);
        }
      } else {
        console.error('❌ Failed to cancel payment');
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
        'Lỗi',
        'Có lỗi xảy ra khi hủy thanh toán. Vui lòng thử lại.',
        [
          { text: 'Thử lại', onPress: () => handleCancelPayment(isAutoCancel) },
          { text: 'Đóng', style: 'cancel' }
        ]
      );
    } finally {
      setIsCancelling(false);
    }
  }, [payment.id, cancelPayment, isCancelling, stopPolling, stopCountdown, navigation]);

  const checkPaymentStatus = useCallback(async () => {
    if (!payment?.id || isPaymentComplete) return;

    const finalStatuses = ['PAID', 'COMPLETED', 'SUCCESS', 'CANCELLED', 'FAILED', 'EXPIRED'];
    if (finalStatuses.includes(paymentStatus)) {
      setIsPaymentComplete(true);
      stopPolling();
      return;
    }

    try {
      console.log(`🔄 Checking payment status attempt ${statusCheckCount + 1}/${maxPollingAttempts}`);

      const updatedPayment = await getPayment(payment.id);
      if (updatedPayment && isMountedRef.current) {
        const newStatus = updatedPayment.status;
        console.log(`📊 Payment status: ${paymentStatus} → ${newStatus}`);

        if (newStatus !== paymentStatus) {
          setPaymentStatus(newStatus);
        }

        if (newStatus === 'PAID' || newStatus === 'COMPLETED' || newStatus === 'SUCCESS') {
          console.log('✅ Payment completed successfully!');
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

        if (newStatus === 'CANCELLED' || newStatus === 'FAILED' || newStatus === 'EXPIRED') {
          console.log('❌ Payment failed or cancelled');
          setIsPaymentComplete(true);
          stopPolling();
          stopCountdown();

          setTimeout(() => {
            if (isMountedRef.current) {
              Alert.alert(
                'Thanh toán thất bại',
                'Thanh toán của bạn đã thất bại hoặc bị hủy. Vui lòng thử lại.',
                [
                  {
                    text: 'Thử lại',
                    onPress: () => navigation.goBack()
                  },
                  {
                    text: 'Đóng',
                    style: 'cancel'
                  }
                ]
              );
            }
          }, 500);
          return;
        }
      }
      setStatusCheckCount(prev => prev + 1);
    } catch (error) {
      console.error('❌ Error checking payment status:', error);
    }
  }, [payment?.id, paymentStatus, statusCheckCount, isPaymentComplete, getPayment, stopPolling, stopCountdown, navigation]);

  // Start polling logic
  const startPolling = useCallback(() => {
    if (isPolling || !payment?.id || isPaymentComplete) {
      console.log('🛑 Polling conditions not met:', {
        isPolling,
        hasPaymentId: !!payment?.id,
        isComplete: isPaymentComplete
      });
      return;
    }

    const finalStatuses = ['PAID', 'COMPLETED', 'SUCCESS', 'CANCELLED', 'FAILED', 'EXPIRED'];
    if (finalStatuses.includes(paymentStatus)) {
      console.log('🛑 Payment already finalized, not starting polling');
      setIsPaymentComplete(true);
      return;
    }

    console.log('🔄 Starting payment status polling...');
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
                  if (paymentStatus === 'PENDING') {
                    startPolling();
                  }
                }
              },
              {
                text: 'Đóng',
                style: 'cancel'
              }
            ]
          );
        }
        return;
      }

      checkPaymentStatus();
    }, 5000);

  }, [isPolling, payment?.id, paymentStatus, statusCheckCount, isPaymentComplete, checkPaymentStatus, stopPolling]);

  // Component initialization
  useEffect(() => {
    console.log('💳 PaymentWaitingScreen mounted');
    console.log('💳 Payment data:', {
      id: payment.id,
      orderCode: payment.orderCode,
      hasQR: !!payment.qrCode,
      qrCodeLength: payment.qrCode?.length,
      paymentUrl: payment.paymentUrl,
      amount: payment.amount
    });

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

  // Auto start polling
  useEffect(() => {
    if (payment?.id && !isPolling && paymentStatus === 'PENDING' && !isPaymentComplete) {
      const startTimeout = setTimeout(() => {
        if (isMountedRef.current && paymentStatus === 'PENDING' && !isPolling && !isPaymentComplete) {
          startPolling();
        }
      }, 3000);

      return () => clearTimeout(startTimeout);
    }
  }, [payment?.id, isPolling, paymentStatus, isPaymentComplete, startPolling]);

  // Stop polling when payment status changes to final
  useEffect(() => {
    const finalStatuses = ['PAID', 'COMPLETED', 'SUCCESS', 'CANCELLED', 'FAILED', 'EXPIRED'];
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

  // Status message
  const statusMessage = useMemo(() => {
    switch (paymentStatus) {
      case 'PAID':
      case 'COMPLETED':
      case 'SUCCESS':
        return {
          title: '🎉 Thanh toán thành công!',
          subtitle: 'Booking của bạn đã được xác nhận'
        };
      case 'CANCELLED':
        return {
          title: '❌ Đã hủy thanh toán',
          subtitle: 'Thanh toán đã được hủy'
        };
      case 'FAILED':
      case 'EXPIRED':
        return {
          title: '❌ Thanh toán thất bại',
          subtitle: 'Vui lòng thử lại hoặc sử dụng phương thức khác'
        };
      default:
        return {
          title: '⏳ Đang chờ thanh toán',
          subtitle: isPolling
        };
    }
  }, [paymentStatus, isPolling]);

  // Status Icon
  const StatusIcon = React.memo(() => {
    const getStatusIcon = () => {
      switch (paymentStatus) {
        case 'PAID':
        case 'COMPLETED':
        case 'SUCCESS':
          return <MaterialIcons name="check-circle" size={getResponsiveSize(60)} color="#4CAF50" />;
        case 'CANCELLED':
        case 'FAILED':
        case 'EXPIRED':
          return <MaterialIcons name="error" size={getResponsiveSize(60)} color="#F44336" />;
        default:
          return <MaterialIcons name="payment" size={getResponsiveSize(60)} color="#FF9800" />;
      }
    };

    const getStatusStyle = () => {
      switch (paymentStatus) {
        case 'PAID':
        case 'COMPLETED':
        case 'SUCCESS':
          return [styles.statusIconContainer, styles.successIcon];
        case 'CANCELLED':
        case 'FAILED':
        case 'EXPIRED':
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

  const handlePaymentComplete = useCallback(async () => {
    try {
      await handlePaymentSuccess({
        id: payment.id.toString(),
        orderCode: payment.orderCode,
        status: 'success'
      });

      setIsPaymentComplete(true);
      setPaymentStatus('SUCCESS');
      stopPolling();
      stopCountdown();
      setShowSuccessModal(true);
    } catch (error) {
      console.error('❌ Error handling payment success:', error);
    }
  }, [payment.id, payment.orderCode, handlePaymentSuccess, stopPolling, stopCountdown]);

  const handleManualStatusCheck = useCallback(async () => {
    if (!payment?.id || loadingPayment) return;

    try {
      await checkPaymentStatus();
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể kiểm tra trạng thái thanh toán');
    }
  }, [payment?.id, loadingPayment, checkPaymentStatus]);

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
              navigation.reset({
                index: 0,
                routes: [{ name: 'CustomerMain', params: { screen: 'CustomerHomeScreen' } }],
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
          {(paymentStatus === 'SUCCESS' || paymentStatus === 'PAID' || paymentStatus === 'COMPLETED') && (
            <TouchableOpacity
              onPress={() => {
                stopCountdown();
                stopPolling();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'CustomerMain', params: { screen: 'CustomerHomeScreen' } }],
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