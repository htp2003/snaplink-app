// types/notification.ts - COMPLETE PUSH NOTIFICATION TYPES

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

export enum DeviceType {
  IOS = 'ios',
  ANDROID = 'android'
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal', 
  HIGH = 'high'
}

// ===== DEVICE MANAGEMENT TYPES =====

export interface RegisterDeviceRequest {
  userId: number;
  expoPushToken: string;
  deviceType: DeviceType;
  deviceId?: string;
  deviceName?: string;
  appVersion?: string;
  osVersion?: string;
}

export interface UpdateDeviceRequest {
  expoPushToken?: string;
  deviceName?: string;
  appVersion?: string;
  osVersion?: string;
  isActive?: boolean;
}

export interface DeviceResponse {
  deviceId: number;
  userId: number;
  expoPushToken: string;
  deviceType: string;
  deviceId_External?: string;
  deviceName?: string;
  appVersion?: string;
  osVersion?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
}

// ===== NOTIFICATION SENDING TYPES =====

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

export interface SendNotificationRequest {
  userId: number;
  title: string;
  body: string;
  data?: NotificationData;
  sound?: string;
  priority?: NotificationPriority;
}

export interface SendBulkNotificationRequest {
  userIds: number[];
  title: string;
  body: string;
  data?: NotificationData;
  sound?: string;
  priority?: NotificationPriority;
}

export interface NotificationSendResult {
  success: boolean;
  message: string;
  data?: any;
}

export interface BulkNotificationResponse {
  message: string;
  totalSent: number;
  totalFailed: number;
  errors: string[];
}

// ===== NOTIFICATION NAVIGATION DATA TYPES =====

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

// ===== AUTOMATIC NOTIFICATION TEMPLATES =====

export interface AutoNotificationTemplate {
  title: string;
  body: string;
  data: NotificationData;
  sound?: string;
  priority?: NotificationPriority;
}

export interface AutoNotificationTemplates {
  newBooking: (customerName: string, bookingId: string) => AutoNotificationTemplate;
  bookingConfirmed: (bookingId: string) => AutoNotificationTemplate;
  bookingCompleted: (bookingId: string) => AutoNotificationTemplate;
  newMessage: (senderName: string, messageContent: string, conversationId: string) => AutoNotificationTemplate;
  paymentSuccess: (amount: number, paymentId: string) => AutoNotificationTemplate;
  paymentFailed: (paymentId: string) => AutoNotificationTemplate;
  newApplication: (photographerName: string, eventId: string) => AutoNotificationTemplate;
  applicationApproved: (eventId: string) => AutoNotificationTemplate;
  applicationRejected: (eventId: string, reason?: string) => AutoNotificationTemplate;
}

// ===== ERROR HANDLING TYPES =====

export interface NotificationError {
  code: string;
  message: string;
  details?: string;
}

export interface DeviceValidationError {
  field: string;
  message: string;
}

// ===== UTILITY TYPES =====

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: 'granted' | 'denied' | 'undetermined';
}

export interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  badge: boolean;
  types: {
    [K in NotificationType]: boolean;
  };
  doNotDisturb: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;   // HH:mm format
  };
}

export interface TokenValidationResult {
  isValid: boolean;
  message: string;
}

export interface CleanupResult {
  message: string;
  deletedCount: number;
}

// ===== HOOK OPTIONS =====

export interface UseNotificationOptions {
  userId?: number;
  autoRegister?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// ===== NAVIGATION TYPES =====

export interface NotificationNavigationHandler {
  (notification: NotificationData): void;
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

export const isBookingNotification = (data: NotificationData): data is BookingNotificationData => {
  return data.type === NotificationType.NEW_BOOKING || 
         data.type === NotificationType.BOOKING_STATUS_UPDATE;
};

export const isMessageNotification = (data: NotificationData): data is MessageNotificationData => {
  return data.type === NotificationType.NEW_MESSAGE;
};

export const isPaymentNotification = (data: NotificationData): data is PaymentNotificationData => {
  return data.type === NotificationType.PAYMENT_UPDATE;
};

export const isEventNotification = (data: NotificationData): data is EventNotificationData => {
  return data.type === NotificationType.NEW_APPLICATION || 
         data.type === NotificationType.APPLICATION_RESPONSE;
};

export const isSystemNotification = (data: NotificationData): data is SystemNotificationData => {
  return data.type === NotificationType.SYSTEM_ANNOUNCEMENT;
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

// ===== VALIDATION HELPERS =====

export const validateExpoPushToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;
  
  // Expo push token format: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
  return /^ExponentPushToken\[[a-zA-Z0-9_-]+\]$/.test(token);
};

export const validateDeviceType = (deviceType: string): deviceType is DeviceType => {
  return Object.values(DeviceType).includes(deviceType as DeviceType);
};

export const validateNotificationPriority = (priority: string): priority is NotificationPriority => {
  return Object.values(NotificationPriority).includes(priority as NotificationPriority);
};

// ===== DEFAULT VALUES =====

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  sound: true,
  vibration: true,
  badge: true,
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

// ===== RESPONSE WRAPPER TYPES =====

export interface NotificationApiResponse<T = any> {
  error: number;
  message: string;
  data?: T;
}

export interface PaginatedNotificationResponse<T = any> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}