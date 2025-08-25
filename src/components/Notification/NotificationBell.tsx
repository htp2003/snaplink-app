// components/Notification/NotificationBadge.tsx - Badge hiển thị số thông báo chưa đọc

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { getResponsiveSize } from '../../utils/responsive';
import { useNotificationContext } from 'src/context/NotificationProvider';

interface NotificationBadgeProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  textColor?: string;
  onPress?: () => void;
  showZero?: boolean;
  maxCount?: number;
  style?: any;
  iconName?: keyof typeof Feather.glyphMap;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({
  size = 'medium',
  color = '#E91E63',
  textColor = '#FFFFFF',
  onPress,
  showZero = false,
  maxCount = 99,
  style,
  iconName = 'bell'
}) => {
  const { unreadCount = 0, isLoading } = useNotificationContext();

  // Size configuration
  const sizeConfig = {
    small: {
      iconSize: 18,
      badgeSize: 16,
      fontSize: 10,
      badgeOffset: { top: -6, right: -6 }
    },
    medium: {
      iconSize: 24,
      badgeSize: 20,
      fontSize: 12,
      badgeOffset: { top: -8, right: -8 }
    },
    large: {
      iconSize: 28,
      badgeSize: 24,
      fontSize: 14,
      badgeOffset: { top: -10, right: -10 }
    }
  };

  const config = sizeConfig[size];
  const shouldShowBadge = unreadCount > 0 || (showZero && unreadCount === 0);
  const displayCount = unreadCount > maxCount ? `${maxCount}+` : unreadCount.toString();

  const BadgeContent = () => (
    <View style={[styles.container, style]}>
      {/* Bell Icon */}
      <Feather
        name={iconName}
        size={getResponsiveSize(config.iconSize)}
        color={unreadCount > 0 ? color : '#666'}
      />
      
      {/* Badge */}
      {shouldShowBadge && (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: color,
              minWidth: getResponsiveSize(config.badgeSize),
              height: getResponsiveSize(config.badgeSize),
              borderRadius: getResponsiveSize(config.badgeSize / 2),
              top: getResponsiveSize(config.badgeOffset.top),
              right: getResponsiveSize(config.badgeOffset.right),
            }
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color: textColor,
                fontSize: getResponsiveSize(config.fontSize),
              }
            ]}
            numberOfLines={1}
          >
            {displayCount}
          </Text>
        </View>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <View
          style={[
            styles.loadingIndicator,
            {
              top: getResponsiveSize(config.badgeOffset.top),
              right: getResponsiveSize(config.badgeOffset.right),
              width: getResponsiveSize(config.badgeSize),
              height: getResponsiveSize(config.badgeSize),
              borderRadius: getResponsiveSize(config.badgeSize / 2),
            }
          ]}
        >
          <View style={styles.pulse} />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[styles.touchable, style]}
        activeOpacity={0.7}
      >
        <BadgeContent />
      </TouchableOpacity>
    );
  }

  return <BadgeContent />;
};

// Animated Badge với hiệu ứng
export const AnimatedNotificationBadge: React.FC<NotificationBadgeProps> = (props) => {
  const { unreadCount } = useNotificationContext();
  const [prevCount, setPrevCount] = React.useState(unreadCount);
  const [isAnimating, setIsAnimating] = React.useState(false);

  React.useEffect(() => {
    if (unreadCount !== prevCount) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
        setPrevCount(unreadCount);
      }, 300);
    }
  }, [unreadCount, prevCount]);

  return (
    <View style={isAnimating && styles.animatingContainer}>
      <NotificationBadge {...props} />
    </View>
  );
};

// Badge cho Tab Navigator
export const TabNotificationBadge: React.FC<{
  focused?: boolean;
  onPress?: () => void;
}> = ({ focused, onPress }) => {
  const { unreadCount } = useNotificationContext();

  return (
    <NotificationBadge
      size="small"
      color={focused ? '#E91E63' : '#666'}
      onPress={onPress}
      iconName="bell"
      style={{
        opacity: focused ? 1 : 0.6,
      }}
    />
  );
};

// Badge đơn giản chỉ hiển thị số
export const SimpleNotificationBadge: React.FC<{
  count?: number;
  maxCount?: number;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  textColor?: string;
}> = ({
  count,
  maxCount = 99,
  size = 'medium',
  color = '#E91E63',
  textColor = '#FFFFFF'
}) => {
  const { unreadCount } = useNotificationContext();
  const displayCount = (count ?? unreadCount) > maxCount ? `${maxCount}+` : (count ?? unreadCount).toString();
  const shouldShow = (count ?? unreadCount) > 0;

  const sizeConfig = {
    small: { badgeSize: 16, fontSize: 10 },
    medium: { badgeSize: 20, fontSize: 12 },
    large: { badgeSize: 24, fontSize: 14 }
  };

  const config = sizeConfig[size];

  if (!shouldShow) return null;

  return (
    <View
      style={[
        styles.simpleBadge,
        {
          backgroundColor: color,
          minWidth: getResponsiveSize(config.badgeSize),
          height: getResponsiveSize(config.badgeSize),
          borderRadius: getResponsiveSize(config.badgeSize / 2),
        }
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: textColor,
            fontSize: getResponsiveSize(config.fontSize),
          }
        ]}
      >
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  touchable: {
    padding: 4,
  },
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  badgeText: {
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  loadingIndicator: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(233, 30, 99, 0.3)',
  },
  pulse: {
    width: '60%',
    height: '60%',
    backgroundColor: '#E91E63',
    borderRadius: 50,
    opacity: 0.6,
  },
  animatingContainer: {
    transform: [{ scale: 1.1 }],
  },
  simpleBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
});

export default NotificationBadge;