// components/NotificationItem.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { NotificationApiResponse } from '../../types';
import { getResponsiveSize } from '../../utils/responsive';

interface NotificationItemProps {
  notification: NotificationApiResponse;
  onPress: (notification: NotificationApiResponse) => void;
  onMarkAsRead?: (id: number) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({ 
  notification, 
  onPress,
  onMarkAsRead 
}) => {
  const formatTimeAgo = (dateString: string): string => {
    const now = new Date();

    let notificationDate = new Date(dateString);

    if (!dateString.endsWith('Z') && !dateString.includes('+')) {
      const timezoneOffset = now.getTimezoneOffset() * 60000;
      notificationDate = new Date(notificationDate.getTime() - timezoneOffset);
    }
    
    const diffInMs = now.getTime() - notificationDate.getTime();
    
    const minutes = Math.floor(diffInMs / (1000 * 60));
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    const days = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) {
      return 'Vừa xong';
    } else if (minutes < 60) {
      return `${minutes} phút trước`;
    } else if (hours < 24) {
      return `${hours} giờ trước`;
    } else {
      return `${days} ngày trước`;
    }
  };

  const getNotificationIcon = (type: string | null | undefined): string => {
    const defaultAvatar = 'https://randomuser.me/api/portraits/women/1.jpg';
    
    if (!type) {
      return notification.user?.profileImage || defaultAvatar;
    }
    
    switch (type.toLowerCase()) {
      case 'booking':
        return notification.user?.profileImage || defaultAvatar;
      case 'payment':
        return notification.user?.profileImage || defaultAvatar;
      case 'message':
        return notification.user?.profileImage || defaultAvatar;
      case 'review':
        return notification.user?.profileImage || defaultAvatar;
      default:
        return notification.user?.profileImage || defaultAvatar;
    }
  };

  const getNotificationTypeColor = (type: string | null | undefined): string => {
    if (!type) {
      return '#FF385C';
    }
    
    switch (type.toLowerCase()) {
      case 'booking':
        return '#4CAF50';
      case 'payment':
        return '#2196F3';
      case 'message':
        return '#FF9800';
      case 'review':
        return '#9C27B0';
      case 'eventbooking':
        return '#8BC34A';
      case 'event':
        return '#FF5722';
      default:
        return '#FF385C';
    }
  };

  const handlePress = () => {
    onPress(notification);
    if (!notification.readStatus && onMarkAsRead) {
      onMarkAsRead(notification.motificationId);
    }
  };

  // Safe access to notification properties with debugging
  const title = notification.title || 'Thông báo';
  const content = notification.content || null;
  const notificationType = notification.notificationType || 'general';
  const createdAt = notification.createdAt || new Date().toISOString();
  const readStatus = notification.readStatus || false;

  return (
    <View>
      <TouchableOpacity 
        onPress={handlePress}
        style={{
          backgroundColor: readStatus ? "#F9F9F9" : "#FFFFFF",
          padding: getResponsiveSize(16),
          // Remove marginBottom to avoid spacing issues
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {/* Avatar */}
          <Image
            source={{ uri: getNotificationIcon(notificationType) }}
            style={{
              width: getResponsiveSize(44),
              height: getResponsiveSize(44),
              borderRadius: getResponsiveSize(22),
              marginRight: getResponsiveSize(12)
            }}
          />
          
          {/* Content */}
          <View style={{ flex: 1 }}>
            {/* Title - Always show */}
            <Text 
              style={{ 
                color: '#000', 
                fontSize: getResponsiveSize(15),
                fontWeight: readStatus ? '500' : '600',
                marginBottom: getResponsiveSize(4)
              }}
            >
              {title}
            </Text>
            
            {/* Content - Show if exists, otherwise show fallback */}
            <Text 
              style={{ 
                color: content ? '#666' : '#999', 
                fontSize: getResponsiveSize(13),
                lineHeight: getResponsiveSize(18),
                marginBottom: getResponsiveSize(8),
                fontStyle: content ? 'normal' : 'italic'
              }}
              numberOfLines={2}
            >
              {content || 'Thông báo từ hệ thống'}
            </Text>
            
            {/* Footer Info */}
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              {/* Time */}
              <Text 
                style={{ 
                  color: '#999', 
                  fontSize: getResponsiveSize(12) 
                }}
              >
                {formatTimeAgo(createdAt)}
              </Text>
              
              {/* Type and Read Status */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View 
                  style={{
                    backgroundColor: getNotificationTypeColor(notificationType),
                    paddingHorizontal: getResponsiveSize(6),
                    paddingVertical: getResponsiveSize(2),
                    borderRadius: getResponsiveSize(4),
                    marginRight: getResponsiveSize(8)
                  }}
                >
                  <Text 
                    style={{ 
                      color: '#fff', 
                      fontSize: getResponsiveSize(10),
                      fontWeight: '500'
                    }}
                  >
                    {notificationType.toUpperCase()}
                  </Text>
                </View>
                
                {/* Unread indicator */}
                {!readStatus && (
                  <View style={{
                    width: getResponsiveSize(8),
                    height: getResponsiveSize(8),
                    borderRadius: getResponsiveSize(4),
                    backgroundColor: '#FF385C'
                  }} />
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      
      {/* Separator Line */}
      <View style={{
        height: 1,
        backgroundColor: '#F0F0F0',
        marginHorizontal: getResponsiveSize(16),
      }} />
    </View>
  );
};

export default NotificationItem;