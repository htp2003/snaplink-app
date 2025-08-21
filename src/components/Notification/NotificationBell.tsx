// components/NotificationBell.tsx
import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../../hooks/useNotification';

interface NotificationBellProps {
  onPress: () => void;
  userId: number;
  size?: number;
  color?: string;
  backgroundColor?: string;
  style?: any;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  onPress,
  userId,
  size = 24,
  color = '#000000',
  backgroundColor = '#F7F7F7',
  style
}) => {
  const { unreadCount, loading } = useNotifications(userId);

  return (
    <TouchableOpacity
      style={[{
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative'
      }, style]}
      onPress={onPress}
      disabled={loading}
    >
      <Ionicons 
        name="notifications-outline" 
        size={size} 
        color={color} 
      />
      
      {/* Unread Count Badge */}
      {unreadCount > 0 && (
        <View style={{
          position: 'absolute',
          top: 6,
          right: 6,
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: '#FF385C',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 4,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.3,
          shadowRadius: 2,
          elevation: 3,
        }}>
          <Text style={{
            color: '#fff',
            fontSize: 10,
            fontWeight: '600',
            textAlign: 'center',
            lineHeight: 12
          }}>
            {unreadCount > 99 ? '99+' : unreadCount.toString()}
          </Text>
        </View>
      )}
      
      {/* Loading indicator */}
      {loading && (
        <View style={{
          position: 'absolute',
          top: 8,
          right: 8,
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: '#FFA500',
        }} />
      )}
    </TouchableOpacity>
  );
};

export default NotificationBell;