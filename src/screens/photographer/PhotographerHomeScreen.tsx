import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, PhotographerTabParamList } from '../../navigation/types';
import { CompositeScreenProps } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = CompositeScreenProps<
  BottomTabScreenProps<PhotographerTabParamList, 'PhotographerHomeScreen'>,
  NativeStackScreenProps<RootStackParamList>
>;

interface Transaction {
  id: string;
  type: 'income' | 'withdrawal';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  customerName?: string;
}

export default function PhotographerHomeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [balance, setBalance] = useState(2450000); // Số dư hiện tại (VND)
  const [pendingAmount, setPendingAmount] = useState(350000); // Số tiền đang chờ xử lý
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: '1',
      type: 'income',
      amount: 500000,
      description: 'Thanh toán chụp ảnh cưới',
      date: '2025-06-15',
      status: 'completed',
      customerName: 'Nguyễn Văn A'
    },
    {
      id: '2',
      type: 'withdrawal',
      amount: 200000,
      description: 'Rút tiền về tài khoản ngân hàng',
      date: '2025-06-14',
      status: 'completed'
    },
    {
      id: '3',
      type: 'income',
      amount: 350000,
      description: 'Thanh toán chụp ảnh profile',
      date: '2025-06-13',
      status: 'pending',
      customerName: 'Trần Thị B'
    },
    {
      id: '4',
      type: 'income',
      amount: 800000,
      description: 'Thanh toán chụp ảnh sự kiện',
      date: '2025-06-12',
      status: 'completed',
      customerName: 'Công ty XYZ'
    }
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const handleWithdraw = () => {
    if (balance < 100000) {
      Alert.alert('Thông báo', 'Số dư tối thiểu để rút tiền là 100,000 VND');
      return;
    }
    
    Alert.alert(
      'Rút tiền',
      'Bạn có muốn rút tiền về tài khoản ngân hàng đã liên kết?',
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Xác nhận', 
          onPress: () => {
            // Navigate to withdrawal screen or show withdrawal form
            Alert.alert('Thành công', 'Yêu cầu rút tiền đã được gửi!');
          }
        }
      ]
    );
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (type === 'income') {
      return status === 'pending' ? 'time-outline' : 'arrow-down-outline';
    }
    return 'arrow-up-outline';
  };

  const getTransactionColor = (type: string, status: string) => {
    if (status === 'pending') return '#F59E0B';
    if (status === 'failed') return '#EF4444';
    return type === 'income' ? '#10B981' : '#EF4444';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Hoàn thành';
      case 'pending': return 'Đang xử lý';
      case 'failed': return 'Thất bại';
      default: return '';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'completed': return '#DCFCE7';
      case 'pending': return '#FEF3C7';
      case 'failed': return '#FEE2E2';
      default: return '#F3F4F6';
    }
  };

  const getStatusTextColor = (status: string) => {
    switch (status) {
      case 'completed': return '#166534';
      case 'pending': return '#92400E';
      case 'failed': return '#991B1B';
      default: return '#374151';
    }
  };

  const getTransactionIconBg = (type: string, status: string) => {
    if (status === 'pending') return '#FEF3C7';
    if (status === 'failed') return '#FEE2E2';
    return type === 'income' ? '#DCFCE7' : '#FEE2E2';
  };

  return (
    <ScrollView 
      style={{ flex: 1, backgroundColor: '#F7F7F7' }}
      contentContainerStyle={{ 
        paddingBottom: 120 + insets.bottom // Tab height + safe area
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={{ 
        backgroundColor: '#F7F7F7', 
        paddingHorizontal: 20, 
        paddingTop: insets.top + 20, 
        paddingBottom: 20 
      }}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 20 
        }}>
          <Text style={{ color: '#000000', fontSize: 32, fontWeight: 'bold' }}>
            Ví của tôi
          </Text>
          <TouchableOpacity style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#FFFFFF',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <Ionicons name="notifications-outline" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <Text style={{ color: '#666666', fontSize: 14, marginBottom: 8 }}>
            Số dư khả dụng
          </Text>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#000000', marginBottom: 16 }}>
            {formatCurrency(balance)}
          </Text>
          
          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 20 
          }}>
            <View>
              <Text style={{ color: '#666666', fontSize: 12, marginBottom: 4 }}>
                Đang chờ xử lý
              </Text>
              <Text style={{ color: '#F59E0B', fontWeight: '600', fontSize: 16 }}>
                {formatCurrency(pendingAmount)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#666666', fontSize: 12, marginBottom: 4 }}>
                Tổng thu nhập tháng này
              </Text>
              <Text style={{ color: '#10B981', fontWeight: '600', fontSize: 16 }}>
                {formatCurrency(1650000)}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={{
              backgroundColor: '#FF385C',
              borderRadius: 8,
              paddingVertical: 12,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={handleWithdraw}
          >
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
              Rút tiền
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 16,
            flex: 0.48,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="trending-up" size={20} color="#10B981" />
              <Text style={{ color: '#666666', fontSize: 14, marginLeft: 8 }}>
                Hôm nay
              </Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000000' }}>
              {formatCurrency(150000)}
            </Text>
          </View>
          
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 16,
            flex: 0.48,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="camera-outline" size={20} color="#6B73FF" />
              <Text style={{ color: '#666666', fontSize: 14, marginLeft: 8 }}>
                Booking hoàn thành
              </Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000000' }}>
              12
            </Text>
          </View>
        </View>
      </View>

      {/* Recent Transactions */}
      <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: 12 
        }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000' }}>
            Giao dịch gần đây
          </Text>
          <TouchableOpacity>
            <Text style={{ color: '#FF385C', fontWeight: '500', fontSize: 14 }}>
              Xem tất cả
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          {transactions.map((transaction, index) => (
            <View 
              key={transaction.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderBottomWidth: index !== transactions.length - 1 ? 1 : 0,
                borderBottomColor: '#F0F0F0'
              }}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: getTransactionIconBg(transaction.type, transaction.status),
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}>
                <Ionicons 
                  name={getTransactionIcon(transaction.type, transaction.status)} 
                  size={20} 
                  color={getTransactionColor(transaction.type, transaction.status)} 
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '500', color: '#000000', marginBottom: 4 }}>
                  {transaction.description}
                </Text>
                {transaction.customerName && (
                  <Text style={{ color: '#666666', fontSize: 14, marginBottom: 4 }}>
                    Từ: {transaction.customerName}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: '#999999', fontSize: 12 }}>
                    {new Date(transaction.date).toLocaleDateString('vi-VN')}
                  </Text>
                  <View style={{
                    marginLeft: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 12,
                    backgroundColor: getStatusBgColor(transaction.status)
                  }}>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: '500',
                      color: getStatusTextColor(transaction.status)
                    }}>
                      {getStatusText(transaction.status)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={{
                fontWeight: 'bold',
                textAlign: 'right',
                color: getTransactionColor(transaction.type, transaction.status)
              }}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 12 }}>
          Thao tác nhanh
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 16,
            flex: 0.31,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <Ionicons name="card-outline" size={24} color="#6B73FF" />
            <Text style={{ 
              color: '#000000', 
              fontWeight: '500', 
              marginTop: 8, 
              textAlign: 'center',
              fontSize: 12
            }}>
              Thông tin{'\n'}tài khoản
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 16,
            flex: 0.31,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <Ionicons name="time-outline" size={24} color="#F59E0B" />
            <Text style={{ 
              color: '#000000', 
              fontWeight: '500', 
              marginTop: 8, 
              textAlign: 'center',
              fontSize: 12
            }}>
              Lịch sử{'\n'}giao dịch
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 16,
            flex: 0.31,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <Ionicons name="headset-outline" size={24} color="#10B981" />
            <Text style={{ 
              color: '#000000', 
              fontWeight: '500', 
              marginTop: 8, 
              textAlign: 'center',
              fontSize: 12
            }}>
              Hỗ trợ{'\n'}khách hàng
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}