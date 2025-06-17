import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native'
import React, { useState, useCallback } from 'react'
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, PhotographerTabParamList } from '../../navigation/types';
import { CompositeScreenProps } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';

type Props = CompositeScreenProps<
  BottomTabScreenProps<PhotographerTabParamList, 'OrderManagementScreen'>,
  NativeStackScreenProps<RootStackParamList>
>;

interface Order {
  id: string;
  customerName: string;
  customerAvatar?: string;
  customerPhone: string;
  serviceType: string;
  location: string;
  date: string;
  time: string;
  duration: number; // hours
  price: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'completed' | 'in-progress';
  description: string;
  createdAt: string;
  specialRequests?: string;
  equipmentNeeded?: string[];
}

export default function OrderManagementScreen({ navigation, route }: Props) {
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'completed'>('pending');
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([
    {
      id: '1',
      customerName: 'Nguyễn Văn A',
      customerPhone: '0901234567',
      serviceType: 'Chụp ảnh cưới',
      location: 'Landmark 81, Q.1, TP.HCM',
      date: '2025-06-20',
      time: '09:00',
      duration: 4,
      price: 2500000,
      status: 'pending',
      description: 'Chụp ảnh cưới ngoại cảnh tại Landmark 81, cần 100 ảnh chỉnh sửa',
      createdAt: '2025-06-17T10:30:00',
      specialRequests: 'Cần có ảnh chụp từ trên cao, thích phong cách vintage',
      equipmentNeeded: ['Drone', 'Lens 85mm', 'Flash']
    },
    {
      id: '2',
      customerName: 'Trần Thị B',
      customerPhone: '0987654321',
      serviceType: 'Chụp ảnh profile',
      location: 'Studio ABC, Q.3, TP.HCM',
      date: '2025-06-18',
      time: '14:00',
      duration: 2,
      price: 800000,
      status: 'confirmed',
      description: 'Chụp ảnh profile công việc, cần 20 ảnh được chỉnh sửa chuyên nghiệp',
      createdAt: '2025-06-15T15:20:00',
      specialRequests: 'Phong cách tối giản, ánh sáng tự nhiên'
    },
    {
      id: '3',
      customerName: 'Lê Văn C',
      customerPhone: '0912345678',
      serviceType: 'Chụp ảnh sự kiện',
      location: 'Khách sạn Rex, Q.1, TP.HCM',
      date: '2025-06-15',
      time: '18:00',
      duration: 6,
      price: 3500000,
      status: 'completed',
      description: 'Chụp ảnh tiệc cưới, cần ghi lại toàn bộ sự kiện',
      createdAt: '2025-06-10T09:15:00'
    },
    {
      id: '4',
      customerName: 'Phạm Thị D',
      customerPhone: '0923456789',
      serviceType: 'Chụp ảnh gia đình',
      location: 'Công viên Tao Đàn, Q.1, TP.HCM',
      date: '2025-06-19',
      time: '16:00',
      duration: 2,
      price: 1200000,
      status: 'pending',
      description: 'Chụp ảnh gia đình 4 người, phong cách tự nhiên',
      createdAt: '2025-06-16T11:45:00',
      specialRequests: 'Có trẻ nhỏ 3 tuổi, cần kiên nhẫn'
    }
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(date);
    return `${dateObj.toLocaleDateString('vi-VN')} lúc ${time}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'in-progress': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ xác nhận';
      case 'confirmed': return 'Đã xác nhận';
      case 'completed': return 'Hoàn thành';
      case 'rejected': return 'Đã hủy';
      case 'in-progress': return 'Đang thực hiện';
      default: return 'Không xác định';
    }
  };

  const filteredOrders = orders.filter(order => {
    switch (activeTab) {
      case 'pending': return order.status === 'pending';
      case 'confirmed': return order.status === 'confirmed' || order.status === 'in-progress';
      case 'completed': return order.status === 'completed' || order.status === 'rejected';
      default: return true;
    }
  });

  const handleConfirmOrder = (orderId: string) => {
    Alert.alert(
      'Xác nhận đơn hàng',
      'Bạn có chắc chắn muốn nhận đơn hàng này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: () => {
            setOrders(prev => prev.map(order =>
              order.id === orderId ? { ...order, status: 'confirmed' as const } : order
            ));
            Alert.alert('Thành công', 'Đã xác nhận đơn hàng!');
          }
        }
      ]
    );
  };

  const handleRejectOrder = (orderId: string) => {
    Alert.alert(
      'Hủy đơn hàng',
      'Bạn có chắc chắn muốn hủy đơn hàng này?\nHành động này không thể hoàn tác.',
      [
        { text: 'Quay lại', style: 'cancel' },
        {
          text: 'Hủy đơn',
          style: 'destructive',
          onPress: () => {
            setOrders(prev => prev.map(order =>
              order.id === orderId ? { ...order, status: 'rejected' as const } : order
            ));
            Alert.alert('Đã hủy', 'Đơn hàng đã được hủy.');
          }
        }
      ]
    );
  };

  const handleViewDetails = (order: Order) => {
    Alert.alert(
      `Chi tiết đơn hàng #${order.id}`,
      `Khách hàng: ${order.customerName}\nSĐT: ${order.customerPhone}\n\nDịch vụ: ${order.serviceType}\nĐịa điểm: ${order.location}\nThời gian: ${formatDateTime(order.date, order.time)}\nThời lượng: ${order.duration} giờ\n\nGiá: ${formatCurrency(order.price)}\n\nMô tả: ${order.description}${order.specialRequests ? `\n\nYêu cầu đặc biệt: ${order.specialRequests}` : ''}${order.equipmentNeeded ? `\n\nThiết bị cần: ${order.equipmentNeeded.join(', ')}` : ''}`,
      [
        { text: 'Đóng', style: 'cancel' },
        { text: 'Gọi khách hàng', onPress: () => Alert.alert('Gọi', `Đang gọi ${order.customerPhone}`) }
      ]
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate API call
    setTimeout(() => {
      setRefreshing(false);
      Alert.alert('Đã cập nhật', 'Danh sách đơn hàng đã được làm mới');
    }, 1000);
  }, []);

  const getTabCount = (tab: string) => {
    return orders.filter(order => {
      switch (tab) {
        case 'pending': return order.status === 'pending';
        case 'confirmed': return order.status === 'confirmed' || order.status === 'in-progress';
        case 'completed': return order.status === 'completed' || order.status === 'rejected';
        default: return 0;
      }
    }).length;
  };

  return (
    <View className='flex-1 bg-black'>
      {/* Header */}
      <View className='px-6 pt-12 pb-6'>
        <View className='flex-row justify-between items-center mb-6'>
          <Text className='text-white text-xl font-bold'>Quản lý đơn hàng</Text>
          <TouchableOpacity className='p-2'>
            <Icon name="filter-list" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View className='flex-row rounded-xl p-1' style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255, 255, 255, 0.2)',
        }}>
          {[
            { key: 'pending', label: 'Chờ xác nhận', count: getTabCount('pending') },
            { key: 'confirmed', label: 'Đã nhận', count: getTabCount('confirmed') },
            { key: 'completed', label: 'Hoàn thành', count: getTabCount('completed') }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              className={`flex-1 py-3 px-4 rounded-lg ${
                activeTab === tab.key ? 'bg-white' : ''
              }`}
              onPress={() => setActiveTab(tab.key as any)}
            >
              <Text className={`text-center font-medium ${
                activeTab === tab.key ? 'text-black' : 'text-white'
              }`}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View className={`absolute -top-1 -right-1 w-5 h-5 rounded-full items-center justify-center ${
                  activeTab === tab.key ? 'bg-red-500' : 'bg-red-400'
                }`}>
                  <Text className='text-white text-xs font-bold'>{tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Orders List */}
      <ScrollView 
        className='flex-1 px-6'
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />
        }
      >
        {filteredOrders.length === 0 ? (
          <View className='items-center justify-center py-20'>
            <Icon name="inbox" size={60} color="rgba(255, 255, 255, 0.3)" />
            <Text className='text-white text-lg mt-4 opacity-60'>
              Không có đơn hàng nào
            </Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <View
              key={order.id}
              className='mb-4 rounded-xl p-4'
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.15)',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              {/* Order Header */}
              <View className='flex-row justify-between items-start mb-3'>
                <View className='flex-1'>
                  <Text className='text-white font-bold text-lg mb-1'>
                    {order.customerName}
                  </Text>
                  <Text className='text-white opacity-70 text-sm'>
                    Đơn hàng #{order.id}
                  </Text>
                </View>
                <View className={`px-3 py-1 rounded-full ${getStatusColor(order.status)}`}>
                  <Text className='text-xs font-medium'>
                    {getStatusText(order.status)}
                  </Text>
                </View>
              </View>

              {/* Service Info */}
              <View className='mb-4'>
                <View className='flex-row items-center mb-2'>
                  <Icon name="photo-camera" size={16} color="white" />
                  <Text className='text-white ml-2 font-medium'>{order.serviceType}</Text>
                </View>
                <View className='flex-row items-center mb-2'>
                  <Icon name="location-on" size={16} color="white" />
                  <Text className='text-white ml-2 opacity-80 flex-1'>{order.location}</Text>
                </View>
                <View className='flex-row items-center mb-2'>
                  <Icon name="schedule" size={16} color="white" />
                  <Text className='text-white ml-2 opacity-80'>
                    {formatDateTime(order.date, order.time)} ({order.duration}h)
                  </Text>
                </View>
                <View className='flex-row items-center'>
                  <Icon name="payments" size={16} color="#10B981" />
                  <Text className='text-green-300 ml-2 font-bold text-lg'>
                    {formatCurrency(order.price)}
                  </Text>
                </View>
              </View>

              {/* Description */}
              <Text className='text-white opacity-80 text-sm mb-4 leading-5'>
                {order.description}
              </Text>

              {/* Action Buttons */}
              <View className='flex-row justify-between'>
                <TouchableOpacity
                  className='flex-1 mr-2 py-3 rounded-lg items-center'
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                  onPress={() => handleViewDetails(order)}
                >
                  <Text className='text-white font-medium'>Chi tiết</Text>
                </TouchableOpacity>

                {order.status === 'pending' && (
                  <>
                    <TouchableOpacity
                      className='flex-1 mx-1 py-3 rounded-lg items-center'
                      style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                        borderWidth: 1,
                        borderColor: 'rgba(239, 68, 68, 0.3)',
                      }}
                      onPress={() => handleRejectOrder(order.id)}
                    >
                      <Text className='text-red-300 font-medium'>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className='flex-1 ml-2 py-3 rounded-lg items-center'
                      style={{
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        borderWidth: 1,
                        borderColor: 'rgba(16, 185, 129, 0.3)',
                      }}
                      onPress={() => handleConfirmOrder(order.id)}
                    >
                      <Text className='text-green-300 font-medium'>Nhận đơn</Text>
                    </TouchableOpacity>
                  </>
                )}

                {order.status === 'confirmed' && (
                  <TouchableOpacity
                    className='flex-1 ml-2 py-3 rounded-lg items-center'
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.2)',
                      borderWidth: 1,
                      borderColor: 'rgba(59, 130, 246, 0.3)',
                    }}
                    onPress={() => Alert.alert('Liên hệ', `Gọi ${order.customerPhone}`)}
                  >
                    <Text className='text-blue-300 font-medium'>Liên hệ</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  )
}