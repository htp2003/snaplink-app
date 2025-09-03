import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Import hooks và types
import { useWithdrawalRequests, useWithdrawalLimits, useWithdrawalForm } from '../hooks/useWithdrawal';
import { useWallet } from '../hooks/useTransaction';
import { usePhotographerAuth } from '../hooks/usePhotographerAuth';
import { CreateWithdrawalRequest, VIETNAM_BANKS } from '../types/withdrawal';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'WithdrawalScreen'>;

export default function WithdrawalScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { userId } = usePhotographerAuth();
  
  // Hooks
  const { balance, refreshBalance } = useWallet(userId || 0);
  const { limits } = useWithdrawalLimits(!!userId);
  const { createRequest } = useWithdrawalRequests(!!userId);
  const { errors, validateForm, clearFieldError } = useWithdrawalForm();

  // Form state
  const [formData, setFormData] = useState<CreateWithdrawalRequest>({
    amount: 0,
    bankAccountNumber: '',
    bankAccountName: '',
    bankName: ''
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [showBankPicker, setShowBankPicker] = useState(false);

  // Format currency input
  const formatCurrencyInput = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    
    // Convert to number and format
    const number = parseInt(digits);
    return new Intl.NumberFormat('vi-VN').format(number);
  };

  // Parse currency input back to number
  const parseCurrencyInput = (value: string): number => {
    const digits = value.replace(/\D/g, '');
    return digits ? parseInt(digits) : 0;
  };

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  // Handle form input changes
  const handleInputChange = (field: keyof CreateWithdrawalRequest, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  // Handle amount input
  const handleAmountChange = (value: string) => {
    const numericValue = parseCurrencyInput(value);
    handleInputChange('amount', numericValue);
  };

  // Handle bank selection
  const handleBankSelect = (bankName: string) => {
    handleInputChange('bankName', bankName);
    setShowBankPicker(false);
  };

  // Handle withdrawal submission
  const handleSubmit = async () => {
    if (!validateForm(formData, balance.availableBalance)) {
      return;
    }

    try {
      setLoading(true);
      
      await createRequest(formData);
      
      Alert.alert(
        'Thành công',
        'Yêu cầu rút tiền đã được tạo thành công. Chúng tôi sẽ xử lý trong vòng 24 giờ.',
        [
          {
            text: 'OK',
            onPress: () => {
              refreshBalance();
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Lỗi',
        error.message || 'Có lỗi xảy ra khi tạo yêu cầu rút tiền',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Quick amount buttons
  const quickAmounts = [10000, 500000, 1000000, 2000000];

  // Render bank picker modal
  const renderBankPicker = () => (
    <Modal
      visible={showBankPicker}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBankPicker(false)}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
      }}>
        <View style={{
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '70%'
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#F0F0F0'
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000' }}>
              Chọn ngân hàng
            </Text>
            <TouchableOpacity onPress={() => setShowBankPicker(false)}>
              <Ionicons name="close" size={24} color="#666666" />
            </TouchableOpacity>
          </View>

          {/* Bank list */}
          <FlatList
            data={VIETNAM_BANKS}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F5F5F5',
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
                onPress={() => handleBankSelect(item.name)}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#F0F0F0',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12
                }}>
                  <Text style={{ fontWeight: 'bold', color: '#666666' }}>
                    {item.code.substring(0, 2)}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, color: '#000000' }}>
                  {item.name}
                </Text>
                {formData.bankName === item.name && (
                  <Ionicons name="checkmark" size={20} color="#10B981" style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#F7F7F7' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={{
          backgroundColor: '#FFFFFF',
          paddingTop: insets.top,
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#F0F0F0'
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginTop: 16
          }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#F5F5F5',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 16
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: '600', color: '#000000' }}>
              Rút tiền
            </Text>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Balance Info */}
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <Text style={{ color: '#666666', fontSize: 14, marginBottom: 8 }}>
              Số dư khả dụng
            </Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#10B981', marginBottom: 8 }}>
              {formatCurrency(balance.availableBalance)}
            </Text>
          </View>

          {/* Amount Input */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#000000', marginBottom: 12 }}>
              Số tiền muốn rút
            </Text>
            
            <TextInput
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                fontSize: 18,
                fontWeight: '600',
                color: '#000000',
                borderWidth: errors.amount ? 2 : 1,
                borderColor: errors.amount ? '#EF4444' : '#E5E5E5',
                textAlign: 'right'
              }}
              placeholder="0"
              placeholderTextColor="#CCCCCC"
              value={formData.amount > 0 ? formatCurrencyInput(formData.amount.toString()) : ''}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
            />
            
            {errors.amount && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
                {errors.amount}
              </Text>
            )}

            {/* Quick amount buttons */}
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              marginTop: 12,
              gap: 8
            }}>
              {quickAmounts
                .filter(amount => amount <= balance.availableBalance)
                .map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={{
                    backgroundColor: formData.amount === amount ? '#FF385C' : '#F5F5F5',
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 8
                  }}
                  onPress={() => handleInputChange('amount', amount)}
                >
                  <Text style={{
                    color: formData.amount === amount ? '#FFFFFF' : '#666666',
                    fontSize: 12,
                    fontWeight: '500'
                  }}>
                    {formatCurrency(amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Bank Info */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#000000', marginBottom: 12 }}>
              Thông tin tài khoản ngân hàng
            </Text>

            {/* Bank Name */}
            <TouchableOpacity
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 12,
                borderWidth: errors.bankName ? 2 : 1,
                borderColor: errors.bankName ? '#EF4444' : '#E5E5E5',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              onPress={() => setShowBankPicker(true)}
            >
              <Text style={{
                color: formData.bankName ? '#000000' : '#CCCCCC',
                fontSize: 16
              }}>
                {formData.bankName || 'Chọn ngân hàng'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666666" />
            </TouchableOpacity>

            {errors.bankName && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 8 }}>
                {errors.bankName}
              </Text>
            )}

            {/* Account Number */}
            <TextInput
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: '#000000',
                marginBottom: 12,
                borderWidth: errors.bankAccountNumber ? 2 : 1,
                borderColor: errors.bankAccountNumber ? '#EF4444' : '#E5E5E5'
              }}
              placeholder="Số tài khoản"
              placeholderTextColor="#CCCCCC"
              value={formData.bankAccountNumber}
              onChangeText={(value) => handleInputChange('bankAccountNumber', value)}
              keyboardType="numeric"
            />

            {errors.bankAccountNumber && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginBottom: 8 }}>
                {errors.bankAccountNumber}
              </Text>
            )}

            {/* Account Name */}
            <TextInput
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                fontSize: 16,
                color: '#000000',
                borderWidth: errors.bankAccountName ? 2 : 1,
                borderColor: errors.bankAccountName ? '#EF4444' : '#E5E5E5'
              }}
              placeholder="Tên chủ tài khoản"
              placeholderTextColor="#CCCCCC"
              value={formData.bankAccountName}
              onChangeText={(value) => handleInputChange('bankAccountName', value)}
              autoCapitalize="words"
            />

            {errors.bankAccountName && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
                {errors.bankAccountName}
              </Text>
            )}
          </View>

          {/* Warning */}
          <View style={{
            backgroundColor: '#FEF3C7',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'flex-start'
          }}>
            <Ionicons name="warning" size={20} color="#F59E0B" style={{ marginRight: 12, marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#92400E', fontSize: 14, fontWeight: '500', marginBottom: 4 }}>
                Lưu ý quan trọng
              </Text>
              <Text style={{ color: '#92400E', fontSize: 12, lineHeight: 18 }}>
                • Thời gian xử lý: 1-3 ngày làm việc{'\n'}
                • Kiểm tra kỹ thông tin tài khoản trước khi gửi{'\n'}
                • Không thể hủy sau khi đã gửi yêu cầu{'\n'}
                • Phí giao dịch có thể được tính bởi ngân hàng
              </Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={{
              backgroundColor: formData.amount > 0 && formData.bankName && formData.bankAccountNumber && formData.bankAccountName 
                ? '#FF385C' : '#CCCCCC',
              borderRadius: 12,
              padding: 16,
              alignItems: 'center',
              marginBottom: 20
            }}
            onPress={handleSubmit}
            disabled={loading || !formData.amount || !formData.bankName || !formData.bankAccountNumber || !formData.bankAccountName}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                Tạo yêu cầu rút tiền
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bank Picker Modal */}
      {renderBankPicker()}
    </>
  );
}