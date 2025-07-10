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
    const notificationDate = new Date(dateString);
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

  const getNotificationIcon = (type: string): string => {
    const defaultAvatar = 'https://randomuser.me/api/portraits/women/1.jpg';
    
    switch (type.toLowerCase()) {
      case 'booking':
        return notification.user.profileImage || defaultAvatar;
      case 'payment':
        return notification.user.profileImage || defaultAvatar;
      case 'message':
        return notification.user.profileImage || defaultAvatar;
      case 'review':
        return notification.user.profileImage || defaultAvatar;
      default:
        return notification.user.profileImage || defaultAvatar;
    }
  };

  const getNotificationTypeColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'booking':
        return '#4CAF50';
      case 'payment':
        return '#2196F3';
      case 'message':
        return '#FF9800';
      case 'review':
        return '#9C27B0';
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

  return (
    <TouchableOpacity 
      onPress={handlePress}
      style={{
        backgroundColor: notification.readStatus ? "#111" : "#1a1a1a",
        marginTop: getResponsiveSize(12),
        borderRadius: getResponsiveSize(12),
        padding: getResponsiveSize(16),
        borderLeftWidth: notification.readStatus ? 0 : 3,
        borderLeftColor: getNotificationTypeColor(notification.notificationType),
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        {/* Avatar */}
        <Image
          source={{ uri: getNotificationIcon(notification.notificationType) }}
          style={{
            width: getResponsiveSize(44),
            height: getResponsiveSize(44),
            borderRadius: getResponsiveSize(22),
            marginRight: getResponsiveSize(12)
          }}
        />
        
        {/* Content */}
        <View style={{ flex: 1 }}>
          {/* Title */}
          <Text 
            style={{ 
              color: '#fff', 
              fontSize: getResponsiveSize(15),
              fontWeight: '600',
              marginBottom: getResponsiveSize(4)
            }}
          >
            {notification.title}
          </Text>
          
          {/* Message Content */}
          <Text 
            style={{ 
              color: '#ccc', 
              fontSize: getResponsiveSize(13),
              lineHeight: getResponsiveSize(18),
              marginBottom: getResponsiveSize(8)
            }}
            numberOfLines={2}
          >
            {notification.content}
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
                color: '#888', 
                fontSize: getResponsiveSize(12) 
              }}
            >
              {formatTimeAgo(notification.createdAt)}
            </Text>
            
            {/* Type and Read Status */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View 
                style={{
                  backgroundColor: getNotificationTypeColor(notification.notificationType),
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
                  {notification.notificationType.toUpperCase()}
                </Text>
              </View>
              
              {/* Unread indicator */}
              {!notification.readStatus && (
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
  );
};

export default NotificationItem;