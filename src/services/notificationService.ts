// services/NotificationService.ts

import {
  RegisterDeviceRequest,
  UpdateDeviceRequest,
  SendNotificationRequest,
  SendBulkNotificationRequest,
  DeviceResponse,
  NotificationSendResult,
  BulkNotificationResponse,
  TokenValidationResult,
  CleanupResult,
  NotificationApiResponse,
  NotificationType,
  NotificationPriority
} from '../types/notification';

// Base API configuration
const API_BASE_URL = 'https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net'; 
const ENDPOINTS = {
  REGISTER_DEVICE: '/PushNotification/register-device',
  UPDATE_DEVICE: '/PushNotification/device',
  DELETE_DEVICE_BY_ID: '/PushNotification/device',
  DELETE_DEVICE_BY_TOKEN: '/PushNotification/device/token',
  GET_DEVICE_BY_TOKEN: '/PushNotification/device/token',
  GET_USER_DEVICES: '/PushNotification/user',
  SEND_NOTIFICATION: '/PushNotification/send',
  SEND_BULK_NOTIFICATION: '/PushNotification/send-bulk',
  UPDATE_LAST_USED: '/PushNotification/device/token',
  VALIDATE_TOKEN: '/PushNotification/validate-token',
  CLEANUP_TOKENS: '/PushNotification/cleanup-tokens'
};

export class NotificationService {
  private static instance: NotificationService;
  private authToken: string | null = null;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Set authentication token
  public setAuthToken(token: string) {
    this.authToken = token;
  }

  // Get default headers
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  // Generic API call method
  private async apiCall<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<NotificationApiResponse<T>> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  // ===== DEVICE MANAGEMENT =====

  /**
   * Đăng ký device mới với backend
   */
  public async registerDevice(request: RegisterDeviceRequest): Promise<NotificationApiResponse<DeviceResponse>> {
    return this.apiCall<DeviceResponse>(ENDPOINTS.REGISTER_DEVICE, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Cập nhật thông tin device
   */
  public async updateDevice(deviceId: number, request: UpdateDeviceRequest): Promise<NotificationApiResponse<void>> {
    return this.apiCall<void>(`${ENDPOINTS.UPDATE_DEVICE}/${deviceId}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  /**
   * Xóa device theo ID
   */
  public async deleteDevice(deviceId: number): Promise<NotificationApiResponse<void>> {
    return this.apiCall<void>(`${ENDPOINTS.DELETE_DEVICE_BY_ID}/${deviceId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Xóa device theo token
   */
  public async deleteDeviceByToken(expoPushToken: string): Promise<NotificationApiResponse<void>> {
    return this.apiCall<void>(`${ENDPOINTS.DELETE_DEVICE_BY_TOKEN}/${encodeURIComponent(expoPushToken)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Lấy thông tin device theo token
   */
  public async getDeviceByToken(expoPushToken: string): Promise<NotificationApiResponse<DeviceResponse>> {
    return this.apiCall<DeviceResponse>(`${ENDPOINTS.GET_DEVICE_BY_TOKEN}/${encodeURIComponent(expoPushToken)}`);
  }

  /**
   * Lấy danh sách devices của user
   */
  public async getUserDevices(userId: number): Promise<NotificationApiResponse<DeviceResponse[]>> {
    return this.apiCall<DeviceResponse[]>(`${ENDPOINTS.GET_USER_DEVICES}/${userId}/devices`);
  }

  // ===== NOTIFICATION SENDING =====

  /**
   * Gửi notification cho 1 user
   */
  public async sendNotification(request: SendNotificationRequest): Promise<NotificationSendResult> {
    const response = await this.apiCall<NotificationSendResult>(ENDPOINTS.SEND_NOTIFICATION, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return response.data || { success: false, message: 'Unknown error' };
  }

  /**
   * Gửi notification cho nhiều users
   */
  public async sendBulkNotification(request: SendBulkNotificationRequest): Promise<BulkNotificationResponse> {
    const response = await this.apiCall<BulkNotificationResponse>(ENDPOINTS.SEND_BULK_NOTIFICATION, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return response.data || { 
      message: 'Unknown error', 
      totalSent: 0, 
      totalFailed: request.userIds.length,
      errors: ['Unknown error occurred'] 
    };
  }

  // ===== TOKEN MANAGEMENT =====

  /**
   * Cập nhật last used time cho device
   */
  public async updateLastUsed(expoPushToken: string): Promise<NotificationApiResponse<void>> {
    return this.apiCall<void>(`${ENDPOINTS.UPDATE_LAST_USED}/${encodeURIComponent(expoPushToken)}/last-used`, {
      method: 'PUT',
    });
  }

  /**
   * Validate push token
   */
  public async validateToken(expoPushToken: string): Promise<TokenValidationResult> {
    try {
      const response = await this.apiCall<TokenValidationResult>(ENDPOINTS.VALIDATE_TOKEN, {
        method: 'POST',
        body: JSON.stringify(expoPushToken),
      });

      return response.data || { isValid: false, message: 'Unknown error' };
    } catch (error) {
      return { isValid: false, message: 'Token validation failed' };
    }
  }

  /**
   * Cleanup invalid tokens (Admin only)
   */
  public async cleanupTokens(): Promise<CleanupResult> {
    const response = await this.apiCall<CleanupResult>(ENDPOINTS.CLEANUP_TOKENS, {
      method: 'POST',
    });

    return response.data || { message: 'Unknown error', deletedCount: 0 };
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if service has auth token
   */
  public hasAuthToken(): boolean {
    return this.authToken !== null && this.authToken !== '';
  }

  /**
   * Clear auth token
   */
  public clearAuthToken(): void {
    this.authToken = null;
  }

  /**
   * Test connection với backend
   */
  public async testConnection(): Promise<boolean> {
    try {
      // Thử call một endpoint đơn giản
      await this.apiCall('/test', { method: 'GET' });
      return true;
    } catch (error) {
      console.log('Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// ===== NOTIFICATION TEMPLATES =====

export class NotificationTemplates {
  /**
   * Template cho booking mới
   */
  static newBooking(customerName: string, bookingId: string): Omit<SendNotificationRequest, 'userId'> {
    return {
      title: 'Booking Request Mới! 📅',
      body: `Bạn có một booking request từ ${customerName}`,
      data: {
        screen: 'BookingDetailScreen',
        bookingId,
        type: NotificationType.NEW_BOOKING
      },
      sound: 'default',
      priority: NotificationPriority.HIGH
    };
  }

  /**
   * Template cho booking được confirm
   */
  static bookingConfirmed(bookingId: string, photographerName: string): Omit<SendNotificationRequest, 'userId'> {
    return {
      title: 'Booking Được Xác Nhận! ✅',
      body: `${photographerName} đã xác nhận booking của bạn`,
      data: {
        screen: 'BookingDetailScreen',
        bookingId,
        type: NotificationType.BOOKING_STATUS_UPDATE,
        status: 'confirmed'
      },
      sound: 'default',
      priority: NotificationPriority.HIGH
    };
  }

  /**
   * Template cho tin nhắn mới
   */
  static newMessage(senderName: string, messagePreview: string, conversationId: string): Omit<SendNotificationRequest, 'userId'> {
    return {
      title: `Tin nhắn từ ${senderName} 💬`,
      body: messagePreview.length > 50 ? `${messagePreview.substring(0, 50)}...` : messagePreview,
      data: {
        screen: 'ChatScreen',
        conversationId,
        type: NotificationType.NEW_MESSAGE
      },
      sound: 'default',
      priority: NotificationPriority.NORMAL
    };
  }

  /**
   * Template cho payment thành công
   */
  static paymentSuccess(amount: number, paymentId: string): Omit<SendNotificationRequest, 'userId'> {
    return {
      title: 'Thanh Toán Thành Công! 💳',
      body: `Bạn đã thanh toán thành công ${amount.toLocaleString('vi-VN')} VNĐ`,
      data: {
        screen: 'PaymentWaitingScreen',
        paymentId,
        type: NotificationType.PAYMENT_UPDATE,
        status: 'success'
      },
      sound: 'default',
      priority: NotificationPriority.HIGH
    };
  }

  /**
   * Template cho application được approve
   */
  static applicationApproved(eventId: string, eventName: string): Omit<SendNotificationRequest, 'userId'> {
    return {
      title: 'Đăng Ký Được Chấp Nhận! 🎉',
      body: `Bạn đã được chấp nhận tham gia event "${eventName}"`,
      data: {
        screen: 'EventDetailScreen',
        eventId,
        type: NotificationType.APPLICATION_RESPONSE,
        status: 'approved'
      },
      sound: 'default',
      priority: NotificationPriority.HIGH
    };
  }

  /**
   * Template cho photo delivery
   */
  static photoDelivered(bookingId: string, photoCount: number): Omit<SendNotificationRequest, 'userId'> {
    return {
      title: 'Ảnh Đã Được Giao! 📸',
      body: `Photographer đã giao ${photoCount} ảnh cho booking của bạn`,
      data: {
        screen: 'PhotoDeliveryScreen',
        bookingId,
        type: NotificationType.PHOTO_DELIVERY
      },
      sound: 'default',
      priority: NotificationPriority.NORMAL
    };
  }
}

// ===== AUTO NOTIFICATION HELPER =====

export class AutoNotificationHelper {
  private service: NotificationService;

  constructor() {
    this.service = NotificationService.getInstance();
  }

  /**
   * Gửi notification khi có booking mới
   */
  async notifyNewBooking(photographerId: number, customerName: string, bookingId: string): Promise<boolean> {
    try {
      const template = NotificationTemplates.newBooking(customerName, bookingId);
      const result = await this.service.sendNotification({
        ...template,
        userId: photographerId
      });
      return result.success;
    } catch (error) {
      console.error('Failed to send new booking notification:', error);
      return false;
    }
  }

  /**
   * Gửi notification khi booking được confirm
   */
  async notifyBookingConfirmed(customerId: number, photographerName: string, bookingId: string): Promise<boolean> {
    try {
      const template = NotificationTemplates.bookingConfirmed(bookingId, photographerName);
      const result = await this.service.sendNotification({
        ...template,
        userId: customerId
      });
      return result.success;
    } catch (error) {
      console.error('Failed to send booking confirmed notification:', error);
      return false;
    }
  }

  /**
   * Gửi notification cho tin nhắn mới
   */
  async notifyNewMessage(recipientId: number, senderName: string, messageContent: string, conversationId: string): Promise<boolean> {
    try {
      const template = NotificationTemplates.newMessage(senderName, messageContent, conversationId);
      const result = await this.service.sendNotification({
        ...template,
        userId: recipientId
      });
      return result.success;
    } catch (error) {
      console.error('Failed to send new message notification:', error);
      return false;
    }
  }
}

export const autoNotificationHelper = new AutoNotificationHelper();