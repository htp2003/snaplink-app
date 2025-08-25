// hooks/useNotificationNavigation.ts
import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NotificationData, NotificationType } from '../types/notification';
import { 
  RootStackNavigationProp, 
  CustomerTabParamList, 
  PhotographerTabParamList, 
  VenueOwnerTabParamList 
} from '../navigation/types';

/**
 * Custom hook để xử lý navigation từ push notifications
 * 
 * @description
 * Hook này đóng vai trò như một "smart router" cho push notifications:
 * - Parse notification data
 * - Navigate đến đúng screen với đúng params
 * - Handle error cases và missing data
 * - Convert string IDs sang number type-safe
 * 
 * @usage
 * ```typescript
 * const handleNotificationNavigation = useNotificationNavigation();
 * setNavigationHandler(handleNotificationNavigation);
 * ```
 */
export const useNotificationNavigation = () => {
  const navigation = useNavigation<RootStackNavigationProp>();

  const handleNotificationNavigation = useCallback((data: NotificationData) => {
    console.log('🧭 [NotificationNavigation] Processing:', {
      screen: data.screen,
      type: data.type,
      hasBookingId: !!data.bookingId,
      hasUserId: !!data.userId,
      hasEventId: !!data.eventId,
      rawData: data
    });
    
    try {
      // ===== UTILITY FUNCTIONS =====
      
      /**
       * Safely parse string/number to number
       */
      const parseId = (id: string | number | undefined): number => {
        if (typeof id === 'number') return id;
        if (typeof id === 'string') {
          const parsed = parseInt(id, 10);
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };

      /**
       * Validate required ID and show error if missing
       */
      const validateRequiredId = (id: any, fieldName: string, screenName: string): number => {
        const parsedId = parseId(id);
        if (parsedId <= 0) {
          console.warn(`⚠️ ${screenName}: Missing or invalid ${fieldName}:`, id);
          Alert.alert(
            'Lỗi điều hướng',
            `Không thể mở ${screenName}: Thiếu thông tin ${fieldName}`,
            [{ text: 'OK' }]
          );
          return 0;
        }
        return parsedId;
      };

      // ===== MAIN NAVIGATION LOGIC =====

      if (!data.screen) {
        console.warn('⚠️ [NotificationNavigation] No screen specified in data');
        // Fallback: Navigate to appropriate home based on notification type
        if (data.type === NotificationType.NEW_BOOKING || data.type === NotificationType.BOOKING_STATUS_UPDATE) {
          navigation.navigate('PhotographerMain', { screen: 'OrderManagementScreen' });
        }
        return;
      }

      switch (data.screen) {
        // ===== BOOKING RELATED =====
        case 'BookingDetailScreen': {
          const bookingId = validateRequiredId(data.bookingId, 'bookingId', 'BookingDetail');
          if (bookingId > 0) {
            console.log('📅 Navigating to BookingDetailScreen:', bookingId);
            navigation.navigate('BookingDetailScreen', { bookingId });
          }
          break;
        }

        // ===== CHAT RELATED =====
        case 'ChatScreen': {
          const conversationId = validateRequiredId(data.conversationId, 'conversationId', 'Chat');
          if (conversationId > 0) {
            console.log('💬 Navigating to ChatScreen:', conversationId);
            
            // Build otherUser object if we have customer/photographer info
            let otherUser = undefined;
            if (data.customerId || data.photographerId) {
              const userId = parseId(data.customerId || data.photographerId);
              const userName = data.customerName || data.photographerName || 'User';
              const userImage = data.customerImage || data.photographerImage;
              
              if (userId > 0) {
                otherUser = {
                  userId,
                  userName,
                  userFullName: userName,
                  userProfileImage: userImage
                };
              }
            }

            navigation.navigate('ChatScreen', { 
              conversationId,
              title: data.customerName || data.photographerName || 'Chat',
              otherUser
            });
          }
          break;
        }

        // ===== PAYMENT RELATED =====
        case 'PaymentWaitingScreen': {
          const paymentId = validateRequiredId(data.paymentId, 'paymentId', 'Payment');
          if (paymentId > 0) {
            console.log('💳 Navigating to PaymentWaitingScreen:', paymentId);
            navigation.navigate('PaymentWaitingScreen', {
              paymentId: paymentId,
              externalTransactionId: data.externalTransactionId || '',
              customerId: parseId(data.customerId) || 0,
              customerName: data.customerName || 'Customer',
              totalAmount: parseId(data.totalAmount || data.amount) || 0,
              status: data.status || 'pending',
              bookingId: parseId(data.bookingId) || 0,
              photographerName: data.photographerName || 'Photographer',
              locationName: data.locationName || 'Location',
              paymentUrl: data.paymentUrl || '',
              orderCode: data.orderCode,
              bin: data.bin,
              accountNumber: data.accountNumber,
              currency: data.currency,
              paymentLinkId: data.paymentLinkId,
              expiredAt: data.expiredAt,
              qrCode: data.qrCode,
              onPaymentSuccess: () => {
                console.log('✅ Payment success callback from notification');
              }
            });
          }
          break;
        }

        case 'VenuePaymentWaitingScreen': {
          const paymentId = validateRequiredId(data.paymentId, 'paymentId', 'Venue Payment');
          if (paymentId > 0) {
            console.log('🏢 Navigating to VenuePaymentWaitingScreen:', paymentId);
            
            // Build booking object if available
            let booking = undefined;
            if (data.bookingId) {
              booking = {
                id: parseId(data.bookingId),
                photographerName: data.photographerName || 'Photographer',
                date: data.bookingDate || new Date().toISOString(),
                time: `${data.startTime || '00:00'} - ${data.endTime || '00:00'}`,
                location: data.locationName || 'Location',
                totalAmount: parseId(data.totalAmount || data.amount) || 0
              };
            }

            navigation.navigate('VenuePaymentWaitingScreen', {
              booking,
              payment: {
                id: paymentId,
                paymentId: paymentId,
                orderCode: data.orderCode || '',
                externalTransactionId: data.externalTransactionId || '',
                amount: parseId(data.amount) || 0,
                totalAmount: parseId(data.totalAmount || data.amount) || 0,
                status: data.status || 'pending',
                paymentUrl: data.paymentUrl || '',
                qrCode: data.qrCode || '',
                bin: data.bin || '',
                accountNumber: data.accountNumber || '',
                description: data.description || 'Venue Payment',
                currency: data.currency || 'VND',
                paymentLinkId: data.paymentLinkId || '',
                expiredAt: data.expiredAt || null,
                payOSData: data.payOSData || {}
              },
              isVenueOwner: true,
              returnToVenueHome: true,
              onPaymentSuccess: () => {
                console.log('✅ Venue payment success callback from notification');
              }
            });
          }
          break;
        }

        // ===== EVENT RELATED =====
        case 'EventDetailScreen': {
          if (data.eventId) {
            console.log('🎪 Navigating to EventDetailScreen:', data.eventId);
            navigation.navigate('EventDetailScreen', { 
              eventId: data.eventId.toString()
            });
          } else {
            console.warn('⚠️ EventDetailScreen: Missing eventId');
            Alert.alert('Lỗi', 'Không thể mở chi tiết sự kiện: Thiếu thông tin ID', [{ text: 'OK' }]);
          }
          break;
        }

        case 'VenueOwnerEventApplications': {
          const eventId = validateRequiredId(data.eventId, 'eventId', 'Event Applications');
          if (eventId > 0) {
            console.log('📝 Navigating to VenueOwnerEventApplications:', eventId);
            navigation.navigate('VenueOwnerEventApplications', { 
              eventId,
              eventName: data.eventName 
            });
          }
          break;
        }

        case 'VenueOwnerEventDetail': {
          const eventId = validateRequiredId(data.eventId, 'eventId', 'Venue Event Detail');
          if (eventId > 0) {
            console.log('🏢 Navigating to VenueOwnerEventDetail:', eventId);
            navigation.navigate('VenueOwnerEventDetail', { 
              eventId,
              eventName: data.eventName 
            });
          }
          break;
        }

        // ===== PHOTO DELIVERY =====
        case 'PhotoDeliveryScreen': {
          const bookingId = validateRequiredId(data.bookingId, 'bookingId', 'Photo Delivery');
          if (bookingId > 0) {
            console.log('📸 Navigating to PhotoDeliveryScreen:', bookingId);
            navigation.navigate('PhotoDeliveryScreen', { 
              bookingId,
              customerName: data.customerName || 'Customer'
            });
          }
          break;
        }

        // ===== PROFILE RELATED =====
        case 'ViewProfileUserScreen': {
          const userId = validateRequiredId(data.userId, 'userId', 'User Profile');
          if (userId > 0) {
            console.log('👤 Navigating to ViewProfileUserScreen:', userId);
            navigation.navigate('ViewProfileUserScreen', { userId });
          }
          break;
        }

        // ===== WALLET & FINANCIAL =====
        case 'WalletScreen': {
          console.log('💰 Navigating to WalletScreen');
          navigation.navigate('WalletScreen');
          break;
        }

        case 'WithdrawalScreen': {
          console.log('🏦 Navigating to WithdrawalScreen');
          navigation.navigate('WithdrawalScreen');
          break;
        }

        // ===== TAB NAVIGATION =====
        case 'CustomerMain': {
          // Type-safe tab screen selection
          const validScreens: (keyof CustomerTabParamList)[] = [
            'CustomerHomeScreen', 'Favorites', 'SnapLink', 'Messages', 'Booking', 'Profile'
          ];
          
          const targetScreen = (typeof data.tab === 'string' && 
            validScreens.includes(data.tab as keyof CustomerTabParamList)) 
            ? data.tab as keyof CustomerTabParamList 
            : 'CustomerHomeScreen';
            
          console.log('🏠 Navigating to CustomerMain:', targetScreen);
          navigation.navigate('CustomerMain', { screen: targetScreen });
          break;
        }

        case 'PhotographerMain': {
          // Type-safe tab screen selection
          const validScreens: (keyof PhotographerTabParamList)[] = [
            'PhotographerHomeScreen', 'Profile', 'OrderManagementScreen', 'PhotographerEventScreen', 'Messages'
          ];
          
          const targetScreen = (typeof data.tab === 'string' && 
            validScreens.includes(data.tab as keyof PhotographerTabParamList)) 
            ? data.tab as keyof PhotographerTabParamList 
            : 'PhotographerHomeScreen';
            
          console.log('📷 Navigating to PhotographerMain:', targetScreen);
          
          // Handle special case for PhotographerEventScreen
          if (targetScreen === 'PhotographerEventScreen') {
            const photographerId = parseId(data.photographerId || data.userId);
            if (photographerId > 0) {
              // Navigate directly to PhotographerEventScreen with params (not through tab)
              navigation.navigate('PhotographerEventScreen', { photographerId });
            } else {
              // Fallback to tab home if no photographerId
              navigation.navigate('PhotographerMain', { screen: 'PhotographerHomeScreen' });
            }
          } else {
            navigation.navigate('PhotographerMain', { screen: targetScreen });
          }
          break;
        }

        case 'VenueOwnerMain': {
          // Type-safe tab screen selection
          const validScreens: (keyof VenueOwnerTabParamList)[] = [
            'VenueOwnerHomeScreen', 'VenueManagement', 'VenueOwnerProfile', 'VenueOwnerEvents'
          ];
          
          const targetScreen = (typeof data.tab === 'string' && 
            validScreens.includes(data.tab as keyof VenueOwnerTabParamList)) 
            ? data.tab as keyof VenueOwnerTabParamList 
            : 'VenueOwnerHomeScreen';
            
          console.log('🏢 Navigating to VenueOwnerMain:', targetScreen);
          navigation.navigate('VenueOwnerMain', { screen: targetScreen });
          break;
        }

        // ===== FALLBACK =====
        default: {
          console.warn('⚠️ [NotificationNavigation] Unknown screen:', data.screen);
          
          // Try to navigate based on notification type as fallback
          switch (data.type) {
            case NotificationType.NEW_BOOKING:
            case NotificationType.BOOKING_STATUS_UPDATE:
              console.log('🔄 Fallback: Navigating to PhotographerMain > OrderManagement');
              navigation.navigate('PhotographerMain', { screen: 'OrderManagementScreen' });
              break;
              
            case NotificationType.NEW_MESSAGE:
              console.log('🔄 Fallback: Navigating to Messages');
              navigation.navigate('CustomerMain', { screen: 'Messages' });
              break;
              
            case NotificationType.PAYMENT_UPDATE:
              console.log('🔄 Fallback: Navigating to WalletScreen');
              navigation.navigate('WalletScreen');
              break;
              
            default:
              console.log('🔄 Fallback: Staying on current screen');
              Alert.alert(
                'Thông báo',
                'Đã nhận được thông báo mới. Vui lòng kiểm tra ứng dụng.',
                [{ text: 'OK' }]
              );
          }
          break;
        }
      }
    } catch (error) {
      console.error('❌ [NotificationNavigation] Error:', error);
      
      // Show user-friendly error
      Alert.alert(
        'Lỗi điều hướng',
        'Có lỗi xảy ra khi mở thông báo. Vui lòng thử lại.',
        [
          { 
            text: 'OK',
            onPress: () => {
              // Fallback to home screen based on user role or notification type
              if (data.type === NotificationType.NEW_BOOKING) {
                navigation.navigate('PhotographerMain');
              } else {
                navigation.navigate('CustomerMain');
              }
            }
          }
        ]
      );
    }
  }, [navigation]);
  
  return handleNotificationNavigation;
};

// ===== EXPORT ADDITIONAL UTILITIES =====

/**
 * Helper function để validate notification data trước khi navigate
 */
export const validateNotificationData = (data: NotificationData): boolean => {
  if (!data) {
    console.warn('⚠️ [validateNotificationData] No data provided');
    return false;
  }

  if (!data.screen && !data.type) {
    console.warn('⚠️ [validateNotificationData] No screen or type specified');
    return false;
  }

  // Validate required fields based on screen type
  const requiredFields: Record<string, string[]> = {
    'BookingDetailScreen': ['bookingId'],
    'ChatScreen': ['conversationId'],
    'PaymentWaitingScreen': ['paymentId'],
    'EventDetailScreen': ['eventId'],
    'PhotoDeliveryScreen': ['bookingId'],
    'ViewProfileUserScreen': ['userId']
  };

  if (data.screen && requiredFields[data.screen]) {
    const missing = requiredFields[data.screen].filter(field => !data[field]);
    if (missing.length > 0) {
      console.warn(`⚠️ [validateNotificationData] Missing required fields for ${data.screen}:`, missing);
      return false;
    }
  }

  return true;
};

/**
 * Helper function để log notification navigation events (for analytics)
 */
export const logNotificationNavigation = (data: NotificationData, success: boolean) => {
  if (__DEV__) {
    console.log(`📊 [NotificationNavigation] ${success ? 'SUCCESS' : 'FAILED'}:`, {
      screen: data.screen,
      type: data.type,
      hasRequiredData: validateNotificationData(data),
      timestamp: new Date().toISOString()
    });
  }

  // TODO: Integrate with analytics service (Firebase, etc.)
  // analytics.track('notification_navigation', {
  //   screen: data.screen,
  //   type: data.type,
  //   success
  // });
};