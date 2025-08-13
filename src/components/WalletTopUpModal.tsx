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
  Linking,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePayment } from '../hooks/usePayment';
import type { CreateWalletTopUpRequest } from '../types/payment';
import { DEEP_LINKS } from '../config/deepLinks';

interface WalletTopUpModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void; // Callback để refresh balance
}

export default function WalletTopUpModal({ visible, onClose, onSuccess }: WalletTopUpModalProps) {
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
      // ✅ Use short description like booking pattern
      const request: CreateWalletTopUpRequest = {
        productName: 'Nạp tiền ví SnapLink', // Shorter product name (20 chars)
        description: `Nạp tiền ${amount.toLocaleString('vi-VN')}đ`, // Short description (~16 chars)
        amount: amount,
        successUrl: DEEP_LINKS.PAYMENT_SUCCESS,
        cancelUrl: DEEP_LINKS.PAYMENT_CANCEL
      };

      // Log để debug description length
      console.log('📝 Wallet top-up request:', {
        productName: request.productName,
        description: request.description,
        descriptionLength: request.description.length, // Should be < 25
        amount: request.amount
      });

      const response = await createWalletTopUp(request);
      
      if (response) {
        // Get payment URL from response
        const paymentUrl = response.data?.payOSData?.checkoutUrl || response.data?.payOSData?.paymentUrl;
        
        if (paymentUrl) {
          // Open payment URL in browser
          const supported = await Linking.canOpenURL(paymentUrl);
          
          if (supported) {
            await Linking.openURL(paymentUrl);
            
            // Close modal and show success message
            onClose();
            
            Alert.alert(
              'Đang xử lý thanh toán',
              'Vui lòng hoàn thành thanh toán trong trình duyệt. Số dư sẽ được cập nhật sau khi thanh toán thành công.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    onSuccess(); // Refresh balance
                  }
                }
              ]
            );
          } else {
            throw new Error('Không thể mở liên kết thanh toán');
          }
        } else {
          throw new Error('Không nhận được URL thanh toán');
        }
      }
    } catch (error) {
      console.error('Top-up error:', error);
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo yêu cầu nạp tiền'
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
      <View style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5E5'
        }}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000' }}>
            Nạp tiền vào ví
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={{ flex: 1 }}>
          {/* Current amount display */}
          <View style={{
            backgroundColor: '#FFFFFF',
            margin: 16,
            borderRadius: 12,
            padding: 20,
            alignItems: 'center'
          }}>
            <Text style={{ color: '#666666', fontSize: 16, marginBottom: 8 }}>
              Số tiền nạp
            </Text>
            <Text style={{
              fontSize: 32,
              fontWeight: 'bold',
              color: '#FF385C',
              marginBottom: 8
            }}>
              {getCurrentAmount() > 0 ? formatCurrency(getCurrentAmount()) : '0 VND'}
            </Text>
            <Text style={{ color: '#999999', fontSize: 12, textAlign: 'center' }}>
              Số tiền tối thiểu: 5,000 VND{'\n'}
              Số tiền tối đa: 10,000,000 VND
            </Text>
          </View>

          {/* Quick amount selection */}
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#000000',
              marginBottom: 12
            }}>
              Chọn nhanh số tiền
            </Text>
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'space-between'
            }}>
              {quickAmounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={{
                    width: '48%',
                    backgroundColor: selectedAmount === amount ? '#FF385C' : '#FFFFFF',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 12,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: selectedAmount === amount ? '#FF385C' : '#E5E5E5'
                  }}
                  onPress={() => handleAmountSelect(amount)}
                >
                  <Text style={{
                    fontWeight: '600',
                    color: selectedAmount === amount ? '#FFFFFF' : '#000000'
                  }}>
                    {formatAmount(amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom amount input */}
          <View style={{ paddingHorizontal: 16, marginBottom: 40 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#000000',
              marginBottom: 12
            }}>
              Hoặc nhập số tiền khác
            </Text>
            <View style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: customAmount ? '#FF385C' : '#E5E5E5',
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16
            }}>
              <TextInput
                style={{
                  flex: 1,
                  paddingVertical: 16,
                  fontSize: 16,
                  color: '#000000'
                }}
                placeholder="Nhập số tiền"
                placeholderTextColor="#999999"
                value={customAmount}
                onChangeText={handleCustomAmountChange}
                keyboardType="numeric"
                maxLength={8} // Max 10M = 8 digits
              />
              <Text style={{ color: '#666666', marginLeft: 8 }}>VND</Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom button */}
        <View style={{
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 16,
          paddingVertical: 20,
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5'
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: getCurrentAmount() > 0 ? '#FF385C' : '#CCCCCC',
              borderRadius: 8,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center'
            }}
            onPress={handleTopUp}
            disabled={getCurrentAmount() === 0 || creatingWalletTopUp}
          >
            {creatingWalletTopUp ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="card-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
            )}
            <Text style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '600'
            }}>
              {creatingWalletTopUp ? 'Đang xử lý...' : 'Nạp tiền'}
            </Text>
          </TouchableOpacity>

          {/* Payment methods info */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 12
          }}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
            <Text style={{
              color: '#666666',
              fontSize: 12,
              marginLeft: 4
            }}>
              Thanh toán an toàn qua PayOS
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}