import { View, Text, ScrollView, TouchableOpacity, Alert, RefreshControl, ActivityIndicator } from 'react-native'
import React, { useState, useEffect } from 'react'
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, PhotographerTabParamList } from '../../navigation/types';
import { CompositeScreenProps } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBookings } from '../../hooks/useBookingPhotographer';
import { usePhotoDelivery } from '../../hooks/usePhotoDelivery';
import { BookingCardData } from '../../types/booking';
import { usePhotographerAuth } from '../../hooks/usePhotographerAuth';
// ✅ ADD THESE IMPORTS:
import { useChat } from '../../hooks/useChat';
import { useAuth } from '../../hooks/useAuth';

type Props = CompositeScreenProps<
  BottomTabScreenProps<PhotographerTabParamList, 'OrderManagementScreen'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function OrderManagementScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'confirmed' | 'completed'>('confirmed');
  
  // ✅ ADD AUTH CONTEXT:
  const { getCurrentUserId, user } = useAuth();
  const currentUserId = getCurrentUserId();
  
  // ✅ GET REAL PHOTOGRAPHER ID:
  const { 
      userId, 
      photographerId, 
      isPhotographer, 
      isLoading: authLoading, 
      error: authError,
      hasPhotographerProfile 
    } = usePhotographerAuth();
  
  const {
    loading,
    refreshing,
    error,
    refreshBookings,
    acceptBooking,
    rejectBooking,
    completeBooking,
    getBookingsByStatus,
    getBookingCounts,
    hasMorePages,
    loadMoreBookings,
    bookings, // Raw bookings data
    getBookingsForUI, // UI transformed data
  } = useBookings(photographerId ?? 0);

  // Photo Delivery hook
  const {
    hasPhotoDelivery,
    getPhotoDeliveryForBooking,
    refreshPhotoDeliveries,
  } = usePhotoDelivery(photographerId ?? 0);

  // ✅ ADD CHAT HOOK:
  const {
    createDirectConversation,
    error: chatError,
    creatingConversation,
    isSignalRConnected,
  signalRError,
  getSignalRStatus,
  testReceiveMessage, // ✅ Test function
    conversations, // ✅ For debugging
  } = useChat({
    userId: currentUserId || 0,
    autoRefresh: false,
    enableRealtime: true,
  });

  // Debug logs
  // useEffect(() => {
  //   console.log('=== OrderManagementScreen Debug ===');
  //   console.log('Photographer ID:', photographerId);
  //   console.log('Current User ID:', currentUserId); // ✅ ADD
  //   console.log('Active Tab:', activeTab);
  //   console.log('Loading:', loading);
  //   console.log('Error:', error);
  //   console.log('Chat Error:', chatError); // ✅ ADD
  //   console.log('Raw bookings:', bookings);
  //   console.log('UI bookings:', getBookingsForUI());
  //   console.log('Booking counts:', getBookingCounts());
  //   console.log('Filtered orders for activeTab:', getBookingsByStatus(activeTab));
  //   console.log('=== SignalR Debug Info ===');
  // console.log('SignalR Connected:', isSignalRConnected);
  // console.log('SignalR Error:', signalRError);
  // console.log('SignalR Status:', getSignalRStatus());
  // console.log('Current User ID:', currentUserId);
  // console.log('=========================');
  // }, [bookings, activeTab, loading, error, chatError, getBookingsForUI, getBookingCounts, getBookingsByStatus, currentUserId, isSignalRConnected, signalRError]); // ✅ ADD DEPS

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
      case 'pending': return { bg: '#FEF3C7', text: '#D97706' };
      case 'confirmed': return { bg: '#DBEAFE', text: '#2563EB' };
      case 'completed': return { bg: '#D1FAE5', text: '#059669' };
      case 'rejected': return { bg: '#FEE2E2', text: '#DC2626' };
      case 'in-progress': return { bg: '#E9D5FF', text: '#7C3AED' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
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

  const filteredOrders = getBookingsByStatus(activeTab);
  const bookingCounts = getBookingCounts();

  // Debug filtered orders
  console.log('Filtered orders for render:', filteredOrders);
  console.log('Filtered orders length:', filteredOrders.length);

  const handleCompleteOrder = async (bookingId: string) => {
    Alert.alert(
      'Hoàn thành đơn hàng',
      'Xác nhận đơn hàng này đã hoàn thành?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Hoàn thành',
          onPress: async () => {
            const success = await completeBooking(parseInt(bookingId));
            if (success) {
              // Success alert is handled in the hook
            }
          }
        }
      ]
    );
  };

  const handlePhotoDelivery = (order: BookingCardData) => {
    const bookingId = parseInt(order.id);
    
    // Navigate to PhotoDeliveryScreen
    navigation.navigate('PhotoDeliveryScreen', {
      bookingId: bookingId,
      customerName: order.userName,
    });
  };

  // ✅ ADD NEW CHAT FUNCTION:
  const handleContactCustomer = async (order: BookingCardData) => {
    if (!currentUserId) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập lại để sử dụng tính năng chat.');
      return;
    }

    try {
      console.log('💬 Starting chat with customer:', {
        customerName: order.userName,
        customerEmail: order.customerEmail,
        bookingId: order.id,
        currentUserId
      });

      // Get customer userId from booking
      const rawBooking = bookings.find(b => b.bookingId.toString() === order.id);
      
      if (!rawBooking || !rawBooking.userId) {
        Alert.alert(
          'Thông báo',
          'Chat chưa khả dụng cho đơn hàng này. Bạn có muốn liên hệ qua email?',
          [
            { text: 'Hủy', style: 'cancel' },
            { 
              text: 'Gửi Email', 
              onPress: () => Alert.alert('Liên hệ Email', `Email: ${order.customerEmail}`) 
            }
          ]
        );
        return;
      }

      const customerId = rawBooking.userId;
      const customerName = order.userName|| order.userName || 'Khách hàng';

      console.log('✅ Found customer data:', { customerId, customerName });

      // Create or get direct conversation with customer
      const conversation = await createDirectConversation(
        customerId,
        customerName
      );

      if (conversation) {
        console.log('✅ Conversation created/found:', conversation.conversationId);

        // Navigate to chat screen
        navigation.navigate('ChatScreen', {
          conversationId: conversation.conversationId,
          title: `Chat với ${customerName}`,
          otherUser: {
            userId: customerId,
            userName: customerName,
            userFullName: customerName,
            userProfileImage: undefined
          }
        });
      } else {
        throw new Error('Could not create conversation');
      }
    } catch (err) {
      console.error('❌ Error creating conversation:', err);
      
      Alert.alert(
        'Không thể kết nối chat',
        'Bạn có muốn liên hệ qua email thay thế?',
        [
          { text: 'Hủy', style: 'cancel' },
          { 
            text: 'Gửi Email', 
            onPress: () => Alert.alert('Liên hệ Email', `Email: ${order.customerEmail}`) 
          }
        ]
      );
    }
  };

  const getPhotoDeliveryButtonText = (order: BookingCardData): string => {
    const bookingId = parseInt(order.id);
    const hasDelivery = hasPhotoDelivery(bookingId);
    
    if (hasDelivery) {
      const delivery = getPhotoDeliveryForBooking(bookingId);
      if (delivery?.status.toLowerCase() === 'delivered') {
        return 'Đã gửi ảnh';
      }
      return 'Cập nhật ảnh';
    }
    
    return 'Gửi ảnh';
  };

  const getPhotoDeliveryButtonStyle = (order: BookingCardData) => {
    const bookingId = parseInt(order.id);
    const hasDelivery = hasPhotoDelivery(bookingId);
    
    if (hasDelivery) {
      const delivery = getPhotoDeliveryForBooking(bookingId);
      if (delivery?.status.toLowerCase() === 'delivered') {
        return {
          backgroundColor: '#F3F4F6',
          textColor: '#6B7280'
        };
      }
      return {
        backgroundColor: '#FEF3E2',
        textColor: '#F59E0B'
      };
    }
    
    return {
      backgroundColor: '#D1FAE5',
      textColor: '#059669'
    };
  };

  // ✅ UPDATE VIEW DETAILS TO USE CHAT:
  const handleViewDetails = (order: BookingCardData) => {
    const paymentInfo = order.hasPayment 
      ? `\n\nThông tin thanh toán:\nTrạng thái: ${order.paymentStatus}\nSố tiền: ${order.paymentAmount ? formatCurrency(order.paymentAmount) : 'Chưa có'}`
      : '\n\nChưa có thông tin thanh toán';

    Alert.alert(
      `Chi tiết đơn hàng #${order.id}`,
      `Khách hàng: ${order.userName}\nEmail: ${order.customerEmail}\n\nDịch vụ: ${order.serviceType}\nĐịa điểm: ${order.locationName}\nĐịa chỉ: ${order.locationAddress}\nThời gian: ${formatDateTime(order.date, order.time)}\nThời lượng: ${order.duration} giờ\n\nGiá: ${formatCurrency(order.price)}\nGiá/giờ: ${formatCurrency(order.pricePerHour)}\n\nMô tả: ${order.description}${order.specialRequests ? `\n\nYêu cầu đặc biệt: ${order.specialRequests}` : ''}${paymentInfo}`,
      [
        { text: 'Đóng', style: 'cancel' },
        { 
          text: 'Liên hệ khách hàng', 
          onPress: () => handleContactCustomer(order) // ✅ USE CHAT FUNCTION
        }
      ]
    );
  };

  const getTabCount = (tab: string) => {
    switch (tab) {
      case 'confirmed': return bookingCounts.confirmed;
      case 'completed': return bookingCounts.completed;
      default: return 0;
    }
  };

  const onScroll = ({ nativeEvent }: any) => {
    if (hasMorePages && !loading) {
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
      const paddingToBottom = 20;
      
      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
        loadMoreBookings();
      }
    }
  };

  // Show loading for initial screen load
  if (loading && filteredOrders.length === 0) {
    console.log('Showing loading screen');
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#F7F7F7' 
      }}>
        <ActivityIndicator size="large" color="#FF385C" />
        <Text style={{ marginTop: 16, color: '#666666' }}>Đang tải đơn hàng...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
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
            Quản lý đơn hàng
          </Text>
          {/* ✅ UPDATE HEADER WITH CHAT BUTTON: */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* Chat button */}
            <TouchableOpacity 
              style={{
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
              }}
              onPress={() => navigation.navigate('NewChatScreen')}
            >
              <Ionicons 
                name="chatbubble-outline" 
                size={24} 
                color="#000000" 
              />
            </TouchableOpacity>

            {/* Refresh button */}
            <TouchableOpacity 
              style={{
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
              }}
              onPress={async () => {
                await refreshBookings();
                await refreshPhotoDeliveries();
              }}
              disabled={refreshing}
            >
              <Ionicons 
                name={refreshing ? "reload" : "filter"} 
                size={24} 
                color="#000000" 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 4,
          flexDirection: 'row',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          {[
            { key: 'confirmed', label: 'Đã nhận', count: getTabCount('confirmed') },
            { key: 'completed', label: 'Hoàn thành', count: getTabCount('completed') }
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor: activeTab === tab.key ? '#FF385C' : 'transparent',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => {
                console.log('Tab changed to:', tab.key);
                setActiveTab(tab.key as any);
              }}
            >
              <Text style={{
                fontWeight: '600',
                color: activeTab === tab.key ? '#FFFFFF' : '#666666',
                marginRight: tab.count > 0 ? 8 : 0
              }}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View style={{
                  backgroundColor: activeTab === tab.key ? '#FFFFFF' : '#FF385C',
                  borderRadius: 10,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  minWidth: 20,
                  alignItems: 'center',
                }}>
                  <Text style={{
                    color: activeTab === tab.key ? '#FF385C' : '#FFFFFF',
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Debug Info - Remove in production */}
      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        <Text style={{ fontSize: 12, color: '#666' }}>
          Debug: Raw bookings: {bookings.length}, UI bookings: {getBookingsForUI().length}, Filtered: {filteredOrders.length}
        </Text>
        {bookings.length > 0 && (
          <Text style={{ fontSize: 12, color: '#666' }}>
            First booking status: {bookings[0]?.status}
          </Text>
        )}
        {/* ✅ ADD CHAT DEBUG INFO: */}
        {chatError && (
          <Text style={{ fontSize: 12, color: '#ff0000' }}>
            Chat Error: {chatError}
          </Text>
        )}
      </View>

      {/* Error State */}
      {(error || chatError) && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{
            backgroundColor: '#FEE2E2',
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: '#FECACA'
          }}>
            <Text style={{ color: '#DC2626', textAlign: 'center', marginBottom: 12 }}>
              {error || chatError}
            </Text>
            <TouchableOpacity 
              style={{
                backgroundColor: '#DC2626',
                borderRadius: 8,
                paddingVertical: 8,
                paddingHorizontal: 16,
                alignSelf: 'center'
              }}
              onPress={refreshBookings}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

     {/* ✅ ENHANCED DEBUG INFO */}
      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        <View style={{
          backgroundColor: isSignalRConnected ? '#D1FAE5' : '#FEE2E2',
          borderRadius: 8,
          padding: 12,
          marginBottom: 8,
        }}>
          <Text style={{ 
            fontSize: 12, 
            color: isSignalRConnected ? '#059669' : '#DC2626',
            fontWeight: '600'
          }}>
            SignalR: {isSignalRConnected ? 'Connected ✅' : 'Disconnected ❌'}
          </Text>
          {signalRError && (
            <Text style={{ fontSize: 12, color: '#DC2626', marginTop: 4 }}>
              Error: {signalRError}
            </Text>
          )}
          <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Conversations: {conversations.length} | User ID: {currentUserId}
          </Text>
        </View>
        
        <Text style={{ fontSize: 12, color: '#666' }}>
          Debug: Raw bookings: {bookings.length}, UI bookings: {getBookingsForUI().length}, Filtered: {filteredOrders.length}
        </Text>
        {bookings.length > 0 && (
          <Text style={{ fontSize: 12, color: '#666' }}>
            First booking status: {bookings[0]?.status}
          </Text>
        )}
        {chatError && (
          <Text style={{ fontSize: 12, color: '#ff0000' }}>
            Chat Error: {chatError}
          </Text>
        )}
      </View>

      {/* Error State */}
      {(error || chatError) && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{
            backgroundColor: '#FEE2E2',
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: '#FECACA'
          }}>
            <Text style={{ color: '#DC2626', textAlign: 'center', marginBottom: 12 }}>
              {error || chatError}
            </Text>
            <TouchableOpacity 
              style={{
                backgroundColor: '#DC2626',
                borderRadius: 8,
                paddingVertical: 8,
                paddingHorizontal: 16,
                alignSelf: 'center'
              }}
              onPress={refreshBookings}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Orders List */}
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingHorizontal: 20,
          paddingBottom: 120 + insets.bottom 
        }}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={async () => {
              await refreshBookings();
              await refreshPhotoDeliveries();
            }} 
            colors={['#FF385C']}
            tintColor="#FF385C"
          />
        }
        onScroll={onScroll}
        scrollEventThrottle={400}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.length === 0 ? (
          <View style={{ 
            alignItems: 'center', 
            justifyContent: 'center', 
            paddingVertical: 80,
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            marginTop: 20
          }}>
            <Ionicons name="receipt-outline" size={64} color="#CCCCCC" />
            <Text style={{ 
              color: '#666666', 
              fontSize: 18, 
              fontWeight: '500',
              marginTop: 16,
              textAlign: 'center'
            }}>
              {loading ? 'Đang tải...' : `Không có đơn hàng ${activeTab === 'confirmed' ? 'đã nhận' : 'hoàn thành'}`}
            </Text>
            {bookings.length > 0 && (
              <Text style={{ 
                color: '#666666', 
                fontSize: 14,
                marginTop: 8,
                textAlign: 'center'
              }}>
                Tổng {bookings.length} đơn hàng, nhưng không có đơn nào ở trạng thái này
              </Text>
            )}
          </View>
        ) : (
          <>
            {filteredOrders.map((order, index) => {
              console.log(`Rendering order ${index}:`, order);
              return (
                <View
                  key={order.id}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  {/* Order Header */}
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between', 
                    alignItems: 'flex-start', 
                    marginBottom: 12 
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ 
                        fontSize: 18, 
                        fontWeight: 'bold', 
                        color: '#000000',
                        marginBottom: 4 
                      }}>
                        {order.userName}
                      </Text>
                      <Text style={{ color: '#666666', fontSize: 14 }}>
                        Đơn hàng #{order.id}
                      </Text>
                    </View>
                    <View style={{
                      backgroundColor: getStatusColor(order.status).bg,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 20,
                    }}>
                      <Text style={{
                        color: getStatusColor(order.status).text,
                        fontSize: 12,
                        fontWeight: '600'
                      }}>
                        {getStatusText(order.status)}
                      </Text>
                    </View>
                  </View>

                  {/* Payment Status */}
                  {order.hasPayment && (
                    <View style={{
                      backgroundColor: '#D1FAE5',
                      borderRadius: 8,
                      padding: 12,
                      marginBottom: 12,
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}>
                      <Ionicons name="card" size={16} color="#059669" />
                      <Text style={{ 
                        color: '#059669', 
                        fontSize: 14, 
                        fontWeight: '600',
                        marginLeft: 8 
                      }}>
                        Đã thanh toán: {order.paymentStatus}
                      </Text>
                    </View>
                  )}

                  {/* Service Info */}
                  <View style={{ marginBottom: 16 }}>
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      marginBottom: 8 
                    }}>
                      <Ionicons name="camera" size={16} color="#666666" />
                      <Text style={{ 
                        color: '#000000', 
                        fontWeight: '600', 
                        marginLeft: 8,
                        flex: 1 
                      }}>
                        {order.serviceType}
                      </Text>
                    </View>
                    
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      marginBottom: 8 
                    }}>
                      <Ionicons name="location" size={16} color="#666666" />
                      <Text style={{ 
                        color: '#666666', 
                        marginLeft: 8,
                        flex: 1 
                      }}>
                        {order.locationName}
                      </Text>
                    </View>
                    
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      marginBottom: 8 
                    }}>
                      <Ionicons name="time" size={16} color="#666666" />
                      <Text style={{ 
                        color: '#666666', 
                        marginLeft: 8,
                        flex: 1 
                      }}>
                        {formatDateTime(order.date, order.time)} ({order.duration}h)
                      </Text>
                    </View>
                    
                    <View style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center', 
                      justifyContent: 'space-between'
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="cash" size={16} color="#10B981" />
                        <Text style={{ 
                          color: '#10B981', 
                          fontWeight: 'bold', 
                          fontSize: 18,
                          marginLeft: 8 
                        }}>
                          {formatCurrency(order.price)}
                        </Text>
                      </View>
                      <Text style={{ 
                        color: '#10B981', 
                        fontSize: 14,
                        opacity: 0.8 
                      }}>
                        {formatCurrency(order.pricePerHour)}/giờ
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  <Text style={{ 
                    color: '#666666', 
                    fontSize: 14, 
                    lineHeight: 20,
                    marginBottom: 16 
                  }}>
                    {order.description}
                  </Text>

                  {/* ✅ UPDATE ACTION BUTTONS WITH CHAT: */}
                  <View style={{ 
                    flexDirection: 'row', 
                    justifyContent: 'space-between',
                    gap: 12 
                  }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: 8,
                        backgroundColor: '#F3F4F6',
                        alignItems: 'center',
                      }}
                      onPress={() => handleViewDetails(order)}
                    >
                      <Text style={{ 
                        color: '#374151', 
                        fontWeight: '600' 
                      }}>
                        Chi tiết
                      </Text>
                    </TouchableOpacity>

                    {order.status === 'confirmed' && (
                      <>
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 8,
                            backgroundColor: '#DBEAFE',
                            alignItems: 'center',
                          }}
                          onPress={() => handleContactCustomer(order)} // ✅ USE CHAT FUNCTION
                          disabled={creatingConversation}
                        >
                          {creatingConversation ? (
                            <ActivityIndicator size="small" color="#2563EB" />
                          ) : (
                            <Text style={{ 
                              color: '#2563EB', 
                              fontWeight: '600' 
                            }}>
                              Liên hệ
                            </Text>
                          )}
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 8,
                            backgroundColor: getPhotoDeliveryButtonStyle(order).backgroundColor,
                            alignItems: 'center',
                          }}
                          onPress={() => handlePhotoDelivery(order)}
                          disabled={(() => {
                            const bookingId = parseInt(order.id);
                            const delivery = getPhotoDeliveryForBooking(bookingId);
                            return delivery?.status.toLowerCase() === 'delivered';
                          })()}
                        >
                          <Text style={{ 
                            color: getPhotoDeliveryButtonStyle(order).textColor, 
                            fontWeight: '600' 
                          }}>
                            {getPhotoDeliveryButtonText(order)}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {(order.status === 'completed' || order.status === 'rejected') && (
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 8,
                          backgroundColor: '#DBEAFE',
                          alignItems: 'center',
                        }}
                        onPress={() => handleContactCustomer(order)} // ✅ USE CHAT FUNCTION
                        disabled={creatingConversation}
                      >
                        {creatingConversation ? (
                          <ActivityIndicator size="small" color="#2563EB" />
                        ) : (
                          <Text style={{ 
                            color: '#2563EB', 
                            fontWeight: '600' 
                          }}>
                            Liên hệ khách hàng
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            {/* Loading more indicator */}
            {loading && filteredOrders.length > 0 && (
              <View style={{ 
                paddingVertical: 20, 
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                marginBottom: 16
              }}>
                <ActivityIndicator size="small" color="#FF385C" />
                <Text style={{ 
                  color: '#666666', 
                  marginTop: 8,
                  fontSize: 14 
                }}>
                  Đang tải thêm...
                </Text>
              </View>
            )}

            {/* End of list indicator */}
            {!hasMorePages && filteredOrders.length > 0 && (
              <View style={{ 
                paddingVertical: 20, 
                alignItems: 'center' 
              }}>
                <Text style={{ 
                  color: '#999999', 
                  fontSize: 14 
                }}>
                  Đã hiển thị tất cả đơn hàng
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  )
}