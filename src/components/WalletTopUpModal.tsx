// components/WalletTopUpModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePayment } from '../hooks/usePayment';
import type { CreateWalletTopUpRequest } from '../types/payment';
import type { RootStackNavigationProp } from '../navigation/types';
import { DEEP_LINKS } from '../config/deepLinks';

interface WalletTopUpModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback để refresh balance
}

interface PayOSResponse {
  error: number;
  message: string;
  data: {
    paymentId: number;
    payOSData: {
      bin: string;
      accountNumber: string;
      amount: number;
      description: string;
      orderCode: string;
      currency: string;
      paymentLinkId: string;
      status: string;
      expiredAt: string | null;
      checkoutUrl: string;
      qrCode: string; // VietQR text format
    };
  };
}

export default function WalletTopUpModal({ visible, onClose, onSuccess }: WalletTopUpModalProps) {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');

  // Sử dụng hook mở rộng
  const {
    createWalletTopUp,
    creatingWalletTopUp,
    getQuickAmounts,
    formatAmount,
    validateTopUpAmount,
    error
  } = usePayment();

  const quickAmounts = getQuickAmounts();

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (text: string) => {
    // Remove non-numeric characters
    const numericText = text.replace(/[^0-9]/g, '');
    setCustomAmount(numericText);
    setSelectedAmount(null);
  };

  const getCurrentAmount = (): number => {
    if (selectedAmount) return selectedAmount;
    return parseInt(customAmount) || 0;
  };

  const handleTopUp = async () => {
    const amount = getCurrentAmount();
    
    // Validate amount
    const validation = validateTopUpAmount(amount);
    if (!validation.isValid) {
      Alert.alert('Lỗi', validation.error);
      return;
    }

    try {
      const request: CreateWalletTopUpRequest = {
        productName: 'Nạp tiền ví SnapLink',
        description: `Nap tien ${amount.toLocaleString('vi-VN')}d`,
        amount: amount,
        successUrl: DEEP_LINKS.PAYMENT_SUCCESS,
        cancelUrl: DEEP_LINKS.PAYMENT_CANCEL
      };

      console.log('🔍 Wallet top-up request:', {
        productName: request.productName,
        description: request.description,
        descriptionLength: request.description.length,
        amount: request.amount
      });

      const response = await createWalletTopUp(request) as PayOSResponse;
      
      if (response && response.data) {
        // Close modal first
        onClose();
        resetForm();

        // 🎯 Map PayOS response to PaymentFlowData format for PaymentWaitingScreen
        const paymentFlowData = {
          // Mock booking data for wallet top-up
          booking: {
            id: response.data.paymentId, // Use paymentId as booking ID
            photographerName: 'SnapLink Wallet', // System name
            date: new Date().toLocaleDateString('vi-VN'),
            time: new Date().toLocaleTimeString('vi-VN', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: false
            }),
            location: 'Nạp tiền ví điện tử',
            totalAmount: response.data.payOSData.amount,
          },
          // Map PayOS data to payment format
          payment: {
            // Core payment IDs
            id: response.data.paymentId,
            paymentId: response.data.paymentId,
            
            // Payment codes and identifiers
            orderCode: response.data.payOSData.orderCode.toString(),
            externalTransactionId: response.data.payOSData.paymentLinkId,
            
            // Amount information
            amount: response.data.payOSData.amount,
            totalAmount: response.data.payOSData.amount,
            
            // Payment status and URLs
            status: response.data.payOSData.status,
            paymentUrl: response.data.payOSData.checkoutUrl,
            
            // 🎯 QR Code data - this is what PaymentWaitingScreen needs
            qrCode: response.data.payOSData.qrCode,
            
            // Additional PayOS data for EnhancedQRDisplay compatibility
            bin: response.data.payOSData.bin,
            accountNumber: response.data.payOSData.accountNumber,
            description: response.data.payOSData.description,
            currency: response.data.payOSData.currency,
            paymentLinkId: response.data.payOSData.paymentLinkId,
            expiredAt: response.data.payOSData.expiredAt,
            
            // For EnhancedQRDisplay component compatibility
            payOSData: response.data.payOSData,
          },
        };

        console.log('🚀 Navigating to PaymentWaiting with data:', {
          bookingId: paymentFlowData.booking.id,
          paymentId: paymentFlowData.payment.id,
          amount: paymentFlowData.payment.amount,
          hasQrCode: !!paymentFlowData.payment.qrCode,
          qrCodeLength: paymentFlowData.payment.qrCode?.length,
        });

        navigation.navigate('PaymentWaitingScreenWallet', paymentFlowData);
        
    
        const unsubscribe = navigation.addListener('focus', () => {
          console.log('📱 Returned to previous screen, refreshing balance...');
          onSuccess();
          unsubscribe();
        });

      } else {
        throw new Error('Không nhận được dữ liệu thanh toán từ server');
      }
    } catch (error) {
      console.error('💥 Top-up error:', error);
      Alert.alert(
        'Lỗi thanh toán',
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo yêu cầu nạp tiền. Vui lòng thử lại.',
        [{ text: 'Đóng' }]
      );
    }
  };

  const resetForm = () => {
    setSelectedAmount(null);
    setCustomAmount('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Helper to format currency as VND
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nạp tiền vào ví</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={{ flex: 1 }}>
          {/* Current amount display */}
          <View style={styles.amountDisplay}>
            <Text style={styles.amountLabel}>Số tiền nạp</Text>
            <Text style={styles.amountValue}>
              {getCurrentAmount() > 0 ? formatCurrency(getCurrentAmount()) : '0 VND'}
            </Text>
            <Text style={styles.amountNote}>
              Số tiền tối thiểu: 5,000 VND{'\n'}
              Số tiền tối đa: 10,000,000 VND
            </Text>
          </View>

          {/* Quick amount selection */}
          <View style={styles.quickAmountSection}>
            <Text style={styles.sectionTitle}>Chọn nhanh số tiền</Text>
            <View style={styles.quickAmountGrid}>
              {quickAmounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.quickAmountButton,
                    selectedAmount === amount && styles.quickAmountButtonSelected
                  ]}
                  onPress={() => handleAmountSelect(amount)}
                >
                  <Text style={[
                    styles.quickAmountText,
                    selectedAmount === amount && styles.quickAmountTextSelected
                  ]}>
                    {formatAmount(amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom amount input */}
          <View style={styles.customAmountSection}>
            <Text style={styles.sectionTitle}>Hoặc nhập số tiền khác</Text>
            <View style={[
              styles.customAmountInput,
              customAmount && styles.customAmountInputFocused
            ]}>
              <TextInput
                style={styles.textInput}
                placeholder="Nhập số tiền"
                placeholderTextColor="#999999"
                value={customAmount}
                onChangeText={handleCustomAmountChange}
                keyboardType="numeric"
                maxLength={8}
              />
              <Text style={styles.currencyLabel}>VND</Text>
            </View>
          </View>

          {/* Payment Flow Info */}
          <View style={styles.paymentFlow}>
            <View style={styles.paymentFlowHeader}>
              <Ionicons name="information-circle-outline" size={20} color="#2196F3" />
              <Text style={styles.paymentFlowTitle}>Quy trình thanh toán</Text>
            </View>
            
            <View style={styles.flowSteps}>
              <View style={styles.flowStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <Text style={styles.stepText}>Nhấn "Nạp tiền" để tạo mã QR</Text>
              </View>
              
              <View style={styles.flowStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>Quét mã QR bằng ứng dụng banking</Text>
              </View>
              
              <View style={styles.flowStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <Text style={styles.stepText}>Xác nhận thanh toán trong ứng dụng</Text>
              </View>
              
              <View style={styles.flowStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>4</Text>
                </View>
                <Text style={styles.stepText}>Số dư ví được cập nhật tự động</Text>
              </View>
            </View>

            <View style={styles.securityNote}>
              <Ionicons name="shield-checkmark" size={16} color="#10B981" />
              <Text style={styles.securityText}>
                Giao dịch được bảo mật bởi PayOS
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom button */}
        <View style={styles.bottomButton}>
          <TouchableOpacity
            style={[
              styles.topUpButton,
              getCurrentAmount() > 0 ? styles.topUpButtonEnabled : styles.topUpButtonDisabled
            ]}
            onPress={handleTopUp}
            disabled={getCurrentAmount() === 0 || creatingWalletTopUp}
          >
            {creatingWalletTopUp ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.topUpButtonText}>
              {creatingWalletTopUp ? 'Đang tạo mã QR...' : 'Tạo mã QR nạp tiền'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  
  // Amount Selection Styles
  amountDisplay: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  amountLabel: {
    color: '#666666',
    fontSize: 16,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF385C',
    marginBottom: 8,
  },
  amountNote: {
    color: '#999999',
    fontSize: 12,
    textAlign: 'center',
  },
  quickAmountSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 12,
  },
  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAmountButton: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  quickAmountButtonSelected: {
    backgroundColor: '#FF385C',
    borderColor: '#FF385C',
  },
  quickAmountText: {
    fontWeight: '600',
    color: '#000000',
  },
  quickAmountTextSelected: {
    color: '#FFFFFF',
  },
  customAmountSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  customAmountInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  customAmountInputFocused: {
    borderColor: '#FF385C',
  },
  textInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#000000',
  },
  currencyLabel: {
    color: '#666666',
    marginLeft: 8,
  },

  // Payment Flow Info
  paymentFlow: {
    backgroundColor: '#F8F9FF',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  paymentFlowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentFlowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565C0',
    marginLeft: 8,
  },
  flowSteps: {
    marginBottom: 16,
  },
  flowStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 14,
    color: '#1565C0',
    flex: 1,
    lineHeight: 20,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E3F2FD',
  },
  securityText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 6,
    fontWeight: '500',
  },

  // Bottom Button
  bottomButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  topUpButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  topUpButtonEnabled: {
    backgroundColor: '#FF385C',
  },
  topUpButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  topUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentInfo: {
    marginTop: 12,
    alignItems: 'center',
  },
  paymentInfoText: {
    color: '#666666',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
});