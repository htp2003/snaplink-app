// types/notification.ts - COMPLETE NOTIFICATION TYPES (API-based)

export enum NotificationType {
  NEW_BOOKING = 'NEW_BOOKING',
  BOOKING_STATUS_UPDATE = 'BOOKING_STATUS_UPDATE', 
  NEW_MESSAGE = 'NEW_MESSAGE',
  PAYMENT_UPDATE = 'PAYMENT_UPDATE',
  NEW_APPLICATION = 'NEW_APPLICATION',
  APPLICATION_RESPONSE = 'APPLICATION_RESPONSE',
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',
  PHOTO_DELIVERY = 'PHOTO_DELIVERY',
  EVENT_REMINDER = 'EVENT_REMINDER',
  WITHDRAWAL_UPDATE = 'WITHDRAWAL_UPDATE'
}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
  DELETED = 'DELETED'
}

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL', 
  HIGH = 'HIGH'
}

// ===== API REQUEST/RESPONSE TYPES =====

export interface CreateNotificationRequest {
  userId: number;         
  title: string;          
  content: string;          
  notificationType: string; 
  readStatus?: boolean;     
  referenceId?: number;     
}

export interface UpdateNotificationRequest {
  userId?: number;
  title?: string;
  content?: string;
  notificationType?: NotificationType;
  referenceId?: number;
  readStatus?: boolean;
}

export interface NotificationResponse {
  motificationId: number;
  userId: number;
  title: string;
  content: string;
  notificationType: NotificationType;
  readStatus: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ===== NOTIFICATION DATA TYPES =====

export interface NotificationData {
  screen?: string;
  bookingId?: string;
  conversationId?: string;
  paymentId?: string;
  eventId?: string;
  userId?: string;
  type?: NotificationType;
  status?: string;
  [key: string]: any;
}

export interface NotificationListResponse {
  notifications: NotificationResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ===== NAVIGATION DATA TYPES =====

export interface BookingNotificationData extends NotificationData {
  screen: 'BookingDetail';
  bookingId: string;
  type: NotificationType.NEW_BOOKING | NotificationType.BOOKING_STATUS_UPDATE;
  status?: 'confirmed' | 'completed' | 'cancelled';
}

export interface MessageNotificationData extends NotificationData {
  screen: 'ChatScreen';
  conversationId: string;
  type: NotificationType.NEW_MESSAGE;
}

export interface PaymentNotificationData extends NotificationData {
  screen: 'PaymentDetail';
  paymentId: string;
  type: NotificationType.PAYMENT_UPDATE;
  status: 'success' | 'failed' | 'cancelled';
}

export interface EventNotificationData extends NotificationData {
  screen: 'EventDetail' | 'EventApplications';
  eventId: string;
  type: NotificationType.NEW_APPLICATION | NotificationType.APPLICATION_RESPONSE;
  status?: 'approved' | 'rejected';
}

export interface SystemNotificationData extends NotificationData {
  screen?: 'Notifications' | 'Home';
  type: NotificationType.SYSTEM_ANNOUNCEMENT;
}

// ===== NOTIFICATION TEMPLATES =====

export interface NotificationTemplate {
  title: string;
  content: string;
  notificationType: NotificationType;
  referenceId?: number;
}

export interface NotificationTemplates {
  newBooking: (customerName: string, bookingId: number) => NotificationTemplate;
  bookingConfirmed: (bookingId: number) => NotificationTemplate;
  bookingCompleted: (bookingId: number) => NotificationTemplate;
  newMessage: (senderName: string, messageContent: string, conversationId: number) => NotificationTemplate;
  paymentSuccess: (amount: number, paymentId: number) => NotificationTemplate;
  paymentFailed: (paymentId: number) => NotificationTemplate;
  newApplication: (photographerName: string, eventId: number) => NotificationTemplate;
  applicationApproved: (eventId: number) => NotificationTemplate;
  applicationRejected: (eventId: number, reason?: string) => NotificationTemplate;
  photoDelivered: (bookingId: number, photoCount: number) => NotificationTemplate;
  withdrawalUpdate: (amount: number, status: string) => NotificationTemplate;
}

// ===== ERROR HANDLING TYPES =====

export interface NotificationError {
  code: string;
  message: string;
  details?: string;
}

export interface ApiResponse<T = any> {
  error: number;
  message: string;
  data?: T;
}

// ===== UTILITY TYPES =====

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  types: {
    [K in NotificationType]: boolean;
  };
  doNotDisturb: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;   // HH:mm format
  };
}

export interface NotificationStats {
  totalCount: number;
  unreadCount: number;
  readCount: number;
  typeBreakdown: {
    [K in NotificationType]: number;
  };
}

// ===== HOOK OPTIONS =====

export interface UseNotificationOptions {
  userId?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  pageSize?: number;
}

// ===== PAGINATION =====

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface NotificationFilters {
  notificationType?: NotificationType;
  readStatus?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export interface NotificationQuery extends PaginationParams, NotificationFilters {}

// ===== NAVIGATION TYPES =====

export interface NotificationNavigationHandler {
  (notification: NotificationResponse): void;
}

export interface NavigationScreenParams {
  BookingDetailScreen: { bookingId: number };
  ChatScreen: { 
    conversationId: number;
    title: string;
    otherUser?: {
      userId: number;
      userName: string;
      userFullName: string;
      userProfileImage?: string;
    };
  };
  PaymentWaitingScreen: {
    payment: {
      id: number;
      paymentId: number;
      [key: string]: any;
    };
  };
  EventDetailScreen: { eventId: string };
  VenueOwnerEventApplications: { 
    eventId: number;
    eventName?: string;
  };
  ViewProfileUserScreen: { userId: number };
  PhotoDeliveryScreen: {
    bookingId: number;
    customerName: string;
  };
  CustomerMain: { screen?: string };
  PhotographerMain: { screen?: string };
  VenueOwnerMain: { screen?: string };
  WalletScreen: undefined;
}

// ===== TYPE GUARDS =====

export const isBookingNotification = (notification: NotificationResponse): boolean => {
  return notification.notificationType === NotificationType.NEW_BOOKING || 
         notification.notificationType === NotificationType.BOOKING_STATUS_UPDATE;
};

export const isMessageNotification = (notification: NotificationResponse): boolean => {
  return notification.notificationType === NotificationType.NEW_MESSAGE;
};

export const isPaymentNotification = (notification: NotificationResponse): boolean => {
  return notification.notificationType === NotificationType.PAYMENT_UPDATE;
};

export const isEventNotification = (notification: NotificationResponse): boolean => {
  return notification.notificationType === NotificationType.NEW_APPLICATION || 
         notification.notificationType === NotificationType.APPLICATION_RESPONSE;
};

export const isSystemNotification = (notification: NotificationResponse): boolean => {
  return notification.notificationType === NotificationType.SYSTEM_ANNOUNCEMENT;
};

// ===== UTILITY FUNCTIONS =====

export const getNotificationTypeColor = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.NEW_BOOKING:
    case NotificationType.NEW_APPLICATION:
      return '#4CAF50'; // Green
    case NotificationType.BOOKING_STATUS_UPDATE:
      return '#2196F3'; // Blue
    case NotificationType.NEW_MESSAGE:
      return '#FF9800'; // Orange
    case NotificationType.PAYMENT_UPDATE:
      return '#9C27B0'; // Purple
    case NotificationType.APPLICATION_RESPONSE:
      return '#607D8B'; // Blue Grey
    case NotificationType.SYSTEM_ANNOUNCEMENT:
      return '#795548'; // Brown
    case NotificationType.PHOTO_DELIVERY:
      return '#E91E63'; // Pink
    case NotificationType.EVENT_REMINDER:
      return '#FFC107'; // Amber
    case NotificationType.WITHDRAWAL_UPDATE:
      return '#00BCD4'; // Cyan
    default:
      return '#757575'; // Grey
  }
};

export const getNotificationTypeIcon = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.NEW_BOOKING:
      return 'calendar-plus';
    case NotificationType.BOOKING_STATUS_UPDATE:
      return 'calendar-check';
    case NotificationType.NEW_MESSAGE:
      return 'message-circle';
    case NotificationType.PAYMENT_UPDATE:
      return 'credit-card';
    case NotificationType.NEW_APPLICATION:
      return 'user-plus';
    case NotificationType.APPLICATION_RESPONSE:
      return 'user-check';
    case NotificationType.SYSTEM_ANNOUNCEMENT:
      return 'megaphone';
    case NotificationType.PHOTO_DELIVERY:
      return 'camera';
    case NotificationType.EVENT_REMINDER:
      return 'bell';
    case NotificationType.WITHDRAWAL_UPDATE:
      return 'dollar-sign';
    default:
      return 'bell';
  }
};

export const getNotificationTypeName = (type: NotificationType): string => {
  switch (type) {
    case NotificationType.NEW_BOOKING:
      return 'Booking mới';
    case NotificationType.BOOKING_STATUS_UPDATE:
      return 'Cập nhật booking';
    case NotificationType.NEW_MESSAGE:
      return 'Tin nhắn mới';
    case NotificationType.PAYMENT_UPDATE:
      return 'Cập nhật thanh toán';
    case NotificationType.NEW_APPLICATION:
      return 'Đăng ký mới';
    case NotificationType.APPLICATION_RESPONSE:
      return 'Phản hồi đăng ký';
    case NotificationType.SYSTEM_ANNOUNCEMENT:
      return 'Thông báo hệ thống';
    case NotificationType.PHOTO_DELIVERY:
      return 'Giao ảnh';
    case NotificationType.EVENT_REMINDER:
      return 'Nhắc nhở sự kiện';
    case NotificationType.WITHDRAWAL_UPDATE:
      return 'Cập nhật rút tiền';
    default:
      return 'Thông báo';
  }
};

export const formatNotificationTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60);
    return diffInMinutes <= 0 ? 'Vừa xong' : `${diffInMinutes} phút trước`;
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)} giờ trước`;
  } else if (diffInHours < 48) {
    return 'Hôm qua';
  } else {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
};

// ===== DEFAULT VALUES =====

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  sound: true,
  vibration: true,
  types: {
    [NotificationType.NEW_BOOKING]: true,
    [NotificationType.BOOKING_STATUS_UPDATE]: true,
    [NotificationType.NEW_MESSAGE]: true,
    [NotificationType.PAYMENT_UPDATE]: true,
    [NotificationType.NEW_APPLICATION]: true,
    [NotificationType.APPLICATION_RESPONSE]: true,
    [NotificationType.SYSTEM_ANNOUNCEMENT]: true,
    [NotificationType.PHOTO_DELIVERY]: true,
    [NotificationType.EVENT_REMINDER]: true,
    [NotificationType.WITHDRAWAL_UPDATE]: true,
  },
  doNotDisturb: {
    enabled: false,
    startTime: '22:00',
    endTime: '07:00',
  },
};

export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_REFRESH_INTERVAL = 30000; // 30 seconds