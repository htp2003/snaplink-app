// components/Notification/NotificationModal.tsx - Modal hiển thị thông báo (Tailwind CSS) - FIXED

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather, AntDesign } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';
import { useNotificationContext } from '../../context/NotificationProvider';
// 🔥 FIXED: Import useNotificationNavigation hook properly
import { useNotificationNavigation } from '../../hooks/useNotification';
import { 
  NotificationResponse, 
  NotificationType,
  getNotificationTypeColor,
  getNotificationTypeIcon,
  getNotificationTypeName,
  formatNotificationTime
} from '../../types/notification';

const { width, height } = Dimensions.get('window');

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

const NotificationModal: React.FC<NotificationModalProps> = ({ visible, onClose }) => {
  const navigation = useNavigation();
  const notificationContext = useNotificationContext();
  
  // Use the notification navigation hook
  const handleNotificationNavigation = useNotificationNavigation(navigation);
  
  // Filter state
  const [selectedFilter, setSelectedFilter] = useState<'all' | NotificationType>('all');
  const [showOnlyUnread, setShowOnlyUnread] = useState(false);

  // Get notifications data from context
  const {
    notifications,
    unreadCount,
    isLoading,
    isRefreshing,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = notificationContext;

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    // ✅ CORRECTED: Use motificationId as primary field
    const notificationId = notification.motificationId;
    if (!notificationId) {
      console.warn('⚠️ Found notification missing ID:', notification);
      return false;
    }
    
    if (selectedFilter !== 'all' && notification.notificationType !== selectedFilter) {
      return false;
    }
    if (showOnlyUnread && notification.readStatus) {
      return false;
    }
    return true;
  });
  

  // Load notifications when modal opens
  useEffect(() => {
    if (visible) {
      refreshNotifications();
    }
  }, [visible, refreshNotifications]);

  // Handle notification press
  const handleNotificationPress = useCallback(async (notification: NotificationResponse) => {
    try {
      // ✅ CORRECTED: Use motificationId as primary field
      const notificationId = notification.motificationId;
      
      if (!notificationId) {
        console.error('❌ Cannot handle notification without ID:', notification);
        return;
      }
      
      // Mark as read if unread
      if (!notification.readStatus) {
        await markAsRead(Number(notificationId));
      }
      
      // Close modal first
      onClose();
      
      // Navigate based on notification type
      handleNotificationNavigation(notification);
    } catch (error) {
      console.error('❌ Error handling notification press:', error);
    }
  }, [markAsRead, handleNotificationNavigation, onClose]);

  // Handle delete notification
  const handleDeleteNotification = useCallback((notification: NotificationResponse) => {
    Alert.alert(
      'Xóa thông báo',
      'Bạn có chắc chắn muốn xóa thông báo này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteNotification(Number(notification.motificationId));
              if (!success) {
                Alert.alert('Lỗi', 'Không thể xóa thông báo. Vui lòng thử lại.');
              }
            } catch (error) {
              console.error('❌ Error deleting notification:', error);
              Alert.alert('Lỗi', 'Có lỗi xảy ra khi xóa thông báo.');
            }
          }
        }
      ]
    );
  }, [deleteNotification]);

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(() => {
    if (unreadCount === 0) {
      Alert.alert('Thông báo', 'Không có thông báo chưa đọc nào.');
      return;
    }

    Alert.alert(
      'Đánh dấu đã đọc tất cả',
      `Đánh dấu ${unreadCount} thông báo chưa đọc là đã đọc?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đồng ý',
          onPress: async () => {
            try {
              const success = await markAllAsRead();
              if (!success) {
                Alert.alert('Lỗi', 'Không thể đánh dấu tất cả là đã đọc.');
              }
            } catch (error) {
              console.error('❌ Error marking all as read:', error);
              Alert.alert('Lỗi', 'Có lỗi xảy ra.');
            }
          }
        }
      ]
    );
  }, [unreadCount, markAllAsRead]);

  // Render notification item
  const renderNotificationItem = ({ item }: { item: NotificationResponse }) => {
    const isUnread = !item.readStatus;
    const typeColor = getNotificationTypeColor(item.notificationType);
    const typeIcon = getNotificationTypeIcon(item.notificationType);
    const typeName = getNotificationTypeName(item.notificationType);
    const timeString = formatNotificationTime(item.createdAt);

    return (
      <TouchableOpacity
        className={`mx-4 mb-3 bg-white rounded-2xl p-4 flex-row ${
          isUnread ? 'border-l-4 border-pink-500 bg-pink-50' : ''
        }`}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 2,
        }}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        {/* Left side - Icon and indicator */}
        <View className="mr-3 items-center">
          <View 
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: typeColor + '20' }}
          >
            <Feather
              name={typeIcon as any}
              size={getResponsiveSize(18)}
              color={typeColor}
            />
          </View>
          {isUnread && (
            <View 
              className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
              style={{ backgroundColor: typeColor }}
            />
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          {/* Header Row */}
          <View className="flex-row justify-between items-start mb-1">
            <Text
              className={`flex-1 text-base mr-2 ${
                isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-800'
              }`}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text className="text-xs text-gray-500 ml-2">
              {timeString}
            </Text>
          </View>
          
          {/* Content */}
          <Text
            className={`text-sm mb-2 ${
              isUnread ? 'text-gray-700' : 'text-gray-600'
            }`}
            numberOfLines={2}
          >
            {item.content}
          </Text>

          {/* Footer Row */}
          <View className="flex-row justify-between items-center">
            <Text className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
              {typeName}
            </Text>
            
            {/* Action buttons */}
            <View className="flex-row space-x-2">
              {isUnread && (
                <TouchableOpacity
                  className="p-1"
                  onPress={async (e) => {
                    e.stopPropagation();
                    await markAsRead(Number(item.motificationId));
                  }}
                >
                  <Feather name="eye" size={getResponsiveSize(12)} color="#666" />
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                className="p-1"
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeleteNotification(item);
                }}
              >
                <Feather name="trash-2" size={getResponsiveSize(12)} color="#F44336" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render filter buttons
  const renderFilterButtons = () => {
    const filters: { key: 'all' | NotificationType; label: string; icon: string }[] = [
      { key: 'all', label: 'Tất cả', icon: 'list' },
      { key: NotificationType.NEW_BOOKING, label: 'Booking', icon: 'calendar' },
      { key: NotificationType.NEW_MESSAGE, label: 'Tin nhắn', icon: 'message-circle' },
      { key: NotificationType.PAYMENT_UPDATE, label: 'Thanh toán', icon: 'credit-card' },
    ];

    return (
      <View className="px-4 mb-4">
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) => {
            const id = item.key || index;
            return id ? id.toString() : index.toString();
          }}
          renderItem={({ item }) => {
            const isSelected = selectedFilter === item.key;
            const count = item.key === 'all' 
              ? filteredNotifications.length 
              : filteredNotifications.filter(n => n.notificationType === item.key).length;

            return (
              <TouchableOpacity
                className={`mr-3 px-4 py-2 rounded-full flex-row items-center ${
                  isSelected 
                    ? 'bg-pink-500' 
                    : 'bg-gray-100'
                }`}
                onPress={() => setSelectedFilter(item.key)}
              >
                <Feather
                  name={item.icon as any}
                  size={getResponsiveSize(14)}
                  color={isSelected ? '#FFFFFF' : '#666'}
                />
                <Text
                  className={`ml-1 text-sm ${
                    isSelected ? 'text-white font-medium' : 'text-gray-600'
                  }`}
                >
                  {item.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View className="flex-1 justify-center items-center px-6">
      <Feather name="bell-off" size={getResponsiveSize(64)} color="#CCC" />
      <Text className="text-xl font-semibold text-gray-400 mt-4 text-center">
        {selectedFilter === 'all' ? 'Chưa có thông báo' : 'Không có thông báo loại này'}
      </Text>
      <Text className="text-gray-400 text-center mt-2">
        {selectedFilter === 'all' 
          ? 'Các thông báo mới sẽ hiển thị ở đây' 
          : 'Thay đổi bộ lọc để xem thông báo khác'
        }
      </Text>
    </View>
  );

  // Render header
  const renderHeader = () => (
    <View className="flex-row justify-between items-center px-5 py-4 border-b border-gray-200">
      <View>
        <Text className="text-2xl font-bold text-gray-900">Thông báo</Text>
        {unreadCount > 0 && (
          <Text className="text-sm text-pink-500 mt-1">
            {unreadCount} thông báo chưa đọc
          </Text>
        )}
      </View>
      
      <View className="flex-row items-center space-x-3">
        {unreadCount > 0 && (
          <TouchableOpacity
            className="bg-pink-500 px-3 py-2 rounded-full"
            onPress={handleMarkAllAsRead}
          >
            <Text className="text-white text-xs font-medium">Đọc tất cả</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          className="w-8 h-8 rounded-full bg-gray-100 justify-center items-center"
          onPress={onClose}
        >
          <AntDesign name="close" size={getResponsiveSize(16)} color="#666" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="dark-content" />
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Header */}
        {renderHeader()}

        {/* Filter Buttons */}
        {renderFilterButtons()}

        {/* Content */}
        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#E91E63" />
            <Text className="text-gray-500 mt-3">Đang tải thông báo...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 justify-center items-center px-6">
            <Feather name="alert-circle" size={getResponsiveSize(48)} color="#F44336" />
            <Text className="text-xl font-semibold text-gray-800 mt-4 text-center">
              Có lỗi xảy ra
            </Text>
            <Text className="text-gray-500 text-center mt-2 mb-6">
              {error}
            </Text>
            <TouchableOpacity
              className="bg-pink-500 px-6 py-3 rounded-full"
              onPress={() => refreshNotifications()}
            >
              <Text className="text-white font-medium">Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : filteredNotifications.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredNotifications}
            keyExtractor={(item, index) => {
              const notificationId = item.motificationId;
              return notificationId ? notificationId.toString() : index.toString();
            }}
            renderItem={renderNotificationItem}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refreshNotifications}
                colors={['#E91E63']}
                tintColor="#E91E63"
              />
            }
            contentContainerStyle={{
              paddingTop: 16,
              paddingBottom: 32,
            }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
};

export default NotificationModal;