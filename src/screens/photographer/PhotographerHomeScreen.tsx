import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native'
import React, { useState, useEffect } from 'react'
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, PhotographerTabParamList } from '../../navigation/types';
import { CompositeScreenProps } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
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
      return status === 'pending' ? 'pending' : 'arrow-downward';
    }
    return 'arrow-upward';
  };

  const getTransactionColor = (type: string, status: string) => {
    if (status === 'pending') return 'text-yellow-300';
    if (status === 'failed') return 'text-red-300';
    return type === 'income' ? 'text-green-300' : 'text-red-300';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Hoàn thành';
      case 'pending': return 'Đang xử lý';
      case 'failed': return 'Thất bại';
      default: return '';
    }
  };

  return (
    <ScrollView 
      className='flex-1 bg-black'
      contentContainerStyle={{ 
        paddingBottom: 120 + insets.bottom // Tab height + safe area
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className='bg-black px-6 pt-12 pb-8'>
        <View className='flex-row justify-between items-center mb-6'>
          <Text className='text-white text-xl font-bold'>Ví của tôi</Text>
          <TouchableOpacity className='p-2'>
            <Icon name="notifications" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Balance Card - Glass Effect */}
        <View className='rounded-xl p-6' style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.2)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 15,
          elevation: 12,
        }}>
          <Text className='text-white text-sm mb-2 opacity-80'>Số dư khả dụng</Text>
          <Text className='text-3xl font-bold text-white mb-4'>
            {formatCurrency(balance)}
          </Text>
          
          <View className='flex-row justify-between items-center mb-4'>
            <View>
              <Text className='text-white text-xs opacity-70'>Đang chờ xử lý</Text>
              <Text className='text-orange-300 font-semibold'>
                {formatCurrency(pendingAmount)}
              </Text>
            </View>
            <View>
              <Text className='text-white text-xs opacity-70'>Tổng thu nhập tháng này</Text>
              <Text className='text-green-300 font-semibold'>
                {formatCurrency(1650000)}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            className='rounded-lg py-3 items-center'
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderWidth: 1,
              borderColor: 'rgba(255, 255, 255, 0.3)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.25,
              shadowRadius: 8,
              elevation: 6,
            }}
            onPress={handleWithdraw}
          >
            <Text className='text-white font-semibold text-base'>Rút tiền</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats */}
      <View className='px-6 py-4'>
        <View className='flex-row justify-between'>
          <View className='rounded-lg p-4 flex-1 mr-2' style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.15)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 6,
          }}>
            <View className='flex-row items-center mb-2'>
              <Icon name="trending-up" size={20} color="#10B981" />
              <Text className='text-white text-sm ml-2 opacity-80'>Hôm nay</Text>
            </View>
            <Text className='text-lg font-bold text-white'>
              {formatCurrency(150000)}
            </Text>
          </View>
          
          <View className='rounded-lg p-4 flex-1 ml-2' style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.15)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 6,
          }}>
            <View className='flex-row items-center mb-2'>
              <Icon name="photo-camera" size={20} color="#ffffff" />
              <Text className='text-white text-sm ml-2 opacity-80'>Booking hoàn thành</Text>
            </View>
            <Text className='text-lg font-bold text-white'>12</Text>
          </View>
        </View>
      </View>

      {/* Recent Transactions */}
      <View className='px-6 pb-6'>
        <View className='flex-row justify-between items-center mb-4'>
          <Text className='text-lg font-bold text-white'>Giao dịch gần đây</Text>
          <TouchableOpacity>
            <Text className='text-white font-medium'>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <View className='rounded-lg' style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.15)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 8,
        }}>
          {transactions.map((transaction, index) => (
            <View 
              key={transaction.id}
              className={`flex-row items-center p-4 ${
                index !== transactions.length - 1 ? 'border-b border-gray-100' : ''
              }`}
              style={{
                borderBottomColor: index !== transactions.length - 1 ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
              }}
            >
              <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                transaction.type === 'income' 
                  ? transaction.status === 'pending' 
                    ? 'bg-yellow-100' 
                    : 'bg-green-100'
                  : 'bg-red-100'
              }`}>
                <Icon 
                  name={getTransactionIcon(transaction.type, transaction.status)} 
                  size={20} 
                  color={
                    transaction.status === 'pending' 
                      ? '#D97706' 
                      : transaction.type === 'income' 
                        ? '#10B981' 
                        : '#EF4444'
                  } 
                />
              </View>

              <View className='flex-1'>
                <Text className='font-medium text-white mb-1'>
                  {transaction.description}
                </Text>
                {transaction.customerName && (
                  <Text className='text-white text-sm mb-1 opacity-70'>
                    Từ: {transaction.customerName}
                  </Text>
                )}
                <View className='flex-row items-center'>
                  <Text className='text-white text-sm opacity-60'>
                    {new Date(transaction.date).toLocaleDateString('vi-VN')}
                  </Text>
                  <View className={`ml-2 px-2 py-1 rounded-full ${
                    transaction.status === 'completed' ? 'bg-green-100' :
                    transaction.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                  }`}>
                    <Text className={`text-xs font-medium ${
                      transaction.status === 'completed' ? 'text-green-800' :
                      transaction.status === 'pending' ? 'text-yellow-800' : 'text-red-800'
                    }`}>
                      {getStatusText(transaction.status)}
                    </Text>
                  </View>
                </View>
              </View>

              <Text className={`font-bold text-right ${getTransactionColor(transaction.type, transaction.status)}`}>
                {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Actions */}
      <View className='px-6 pb-8'>
        <Text className='text-lg font-bold text-white mb-4'>Thao tác nhanh</Text>
        <View className='flex-row justify-between'>
          <TouchableOpacity className='rounded-lg p-4 flex-1 mr-2 items-center' style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.15)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 6,
          }}>
            <Icon name="account-balance" size={24} color="#ffffff" />
            <Text className='text-white font-medium mt-2 text-center'>
              Thông tin{'\n'}tài khoản
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity className='rounded-lg p-4 flex-1 mx-1 items-center' style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.15)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 6,
          }}>
            <Icon name="history" size={24} color="#ffffff" />
            <Text className='text-white font-medium mt-2 text-center'>
              Lịch sử{'\n'}giao dịch
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity className='rounded-lg p-4 flex-1 ml-2 items-center' style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.15)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 10,
            elevation: 6,
          }}>
            <Icon name="support-agent" size={24} color="#10B981" />
            <Text className='text-white font-medium mt-2 text-center'>
              Hỗ trợ{'\n'}khách hàng
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}