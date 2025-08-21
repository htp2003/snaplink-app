import { apiClient } from "./base";
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import {
  RegisterDeviceRequest,
  UpdateDeviceRequest,
  DeviceResponse,
  SendNotificationRequest,
  SendBulkNotificationRequest,
  NotificationSendResult,
  BulkNotificationResponse,
  TokenValidationResult,
  CleanupResult,
  NotificationApiResponse,
  NotificationType,
  AutoNotificationTemplate,
  DeviceType,
  NotificationPriority
} from "../types/notification";

// ===== API ENDPOINTS =====
const NOTIFICATION_ENDPOINTS = {
  // Device Management
  REGISTER_DEVICE: '/api/PushNotification/register-device',
  UPDATE_DEVICE: (deviceId: number) => `/api/PushNotification/device/${deviceId}`,
  DELETE_DEVICE: (deviceId: number) => `/api/PushNotification/device/${deviceId}`,
  DELETE_DEVICE_BY_TOKEN: (expoPushToken: string) => `/api/PushNotification/device/token/${encodeURIComponent(expoPushToken)}`,
  GET_DEVICE_BY_TOKEN: (expoPushToken: string) => `/api/PushNotification/device/token/${encodeURIComponent(expoPushToken)}`,
  GET_USER_DEVICES: (userId: number) => `/api/PushNotification/user/${userId}/devices`,
  UPDATE_LAST_USED: (expoPushToken: string) => `/api/PushNotification/device/token/${encodeURIComponent(expoPushToken)}/last-used`,

  // Notification Sending
  SEND_NOTIFICATION: '/api/PushNotification/send',
  SEND_BULK_NOTIFICATION: '/api/PushNotification/send-bulk',

  // Utility
  VALIDATE_TOKEN: '/api/PushNotification/validate-token',
  CLEANUP_TOKENS: '/api/PushNotification/cleanup-tokens',
} as const;

export class NotificationService {
  private userId: number | null = null;
  private currentDeviceId: number | null = null;
  private currentExpoPushToken: string | null = null;

  // ===== INITIALIZATION =====
  
  setUserId(userId: number): void {
    this.userId = userId;
    console.log('🔑 NotificationService: User ID set to', userId);
  }

  clearUserId(): void {
    this.userId = null;
    this.currentDeviceId = null;
    this.currentExpoPushToken = null;
    console.log('🔑 NotificationService: User session cleared');
  }

  getCurrentUserId(): number | null {
    return this.userId;
  }

  // ===== DEVICE MANAGEMENT =====

  /**
   * Register a new device for push notifications
   */
  async registerDevice(request: RegisterDeviceRequest): Promise<DeviceResponse> {
    try {
      console.log('📱 Registering device with request:', {
        userId: request.userId,
        deviceType: request.deviceType,
        tokenLength: request.expoPushToken?.length,
        deviceName: request.deviceName,
      });

      // Validate required fields
      if (!request.userId || !request.expoPushToken || !request.deviceType) {
        throw new Error('Missing required fields: userId, expoPushToken, deviceType');
      }

      // Validate Expo push token format
      if (!this.validateExpoPushTokenFormat(request.expoPushToken)) {
        throw new Error('Invalid Expo push token format');
      }

      const response = await apiClient.post<NotificationApiResponse<DeviceResponse>>(
        NOTIFICATION_ENDPOINTS.REGISTER_DEVICE,
        request
      );

      // Handle API response format with proper typing
      const deviceData = this.extractResponseData<DeviceResponse>(response);
      
      // Store current device info
      this.currentDeviceId = deviceData.deviceId;
      this.currentExpoPushToken = deviceData.expoPushToken;
      this.userId = deviceData.userId;

      console.log('✅ Device registered successfully:', {
        deviceId: deviceData.deviceId,
        userId: deviceData.userId,
        isActive: deviceData.isActive,
      });

      return deviceData;
    } catch (error) {
      console.error('❌ Error registering device:', error);
      throw this.handleNotificationError(error, 'Failed to register device');
    }
  }

  /**
   * Update device information
   */
  async updateDevice(deviceId: number, request: UpdateDeviceRequest): Promise<DeviceResponse> {
    try {
      console.log('📱 Updating device:', deviceId, request);

      if (!deviceId || deviceId <= 0) {
        throw new Error('Invalid device ID');
      }

      const response = await apiClient.put<NotificationApiResponse<DeviceResponse>>(
        NOTIFICATION_ENDPOINTS.UPDATE_DEVICE(deviceId),
        request
      );

      const deviceData = this.extractResponseData<DeviceResponse>(response);

      // Update stored token if changed
      if (request.expoPushToken) {
        this.currentExpoPushToken = request.expoPushToken;
      }

      console.log('✅ Device updated successfully:', deviceData.deviceId);
      return deviceData;
    } catch (error) {
      console.error('❌ Error updating device:', error);
      throw this.handleNotificationError(error, 'Failed to update device');
    }
  }

  /**
   * Remove device by device ID
   */
  async removeDevice(deviceId: number): Promise<void> {
    try {
      console.log('🗑️ Removing device:', deviceId);

      if (!deviceId || deviceId <= 0) {
        throw new Error('Invalid device ID');
      }

      await apiClient.delete(NOTIFICATION_ENDPOINTS.DELETE_DEVICE(deviceId));

      // Clear stored device info if this is current device
      if (this.currentDeviceId === deviceId) {
        this.currentDeviceId = null;
        this.currentExpoPushToken = null;
      }

      console.log('✅ Device removed successfully:', deviceId);
    } catch (error) {
      console.error('❌ Error removing device:', error);
      throw this.handleNotificationError(error, 'Failed to remove device');
    }
  }

  /**
   * Remove device by Expo push token
   */
  async removeDeviceByToken(expoPushToken: string): Promise<void> {
    try {
      console.log('🗑️ Removing device by token:', expoPushToken.substring(0, 20) + '...');

      if (!expoPushToken || !this.validateExpoPushTokenFormat(expoPushToken)) {
        throw new Error('Invalid Expo push token');
      }

      await apiClient.delete(NOTIFICATION_ENDPOINTS.DELETE_DEVICE_BY_TOKEN(expoPushToken));

      // Clear stored device info if this is current token
      if (this.currentExpoPushToken === expoPushToken) {
        this.currentDeviceId = null;
        this.currentExpoPushToken = null;
      }

      console.log('✅ Device removed by token successfully');
    } catch (error) {
      console.error('❌ Error removing device by token:', error);
      throw this.handleNotificationError(error, 'Failed to remove device by token');
    }
  }

  /**
   * Get device info by Expo push token
   */
  async getDeviceByToken(expoPushToken: string): Promise<DeviceResponse> {
    try {
      console.log('🔍 Getting device by token:', expoPushToken.substring(0, 20) + '...');

      if (!expoPushToken || !this.validateExpoPushTokenFormat(expoPushToken)) {
        throw new Error('Invalid Expo push token');
      }

      const response = await apiClient.get<NotificationApiResponse<DeviceResponse>>(
        NOTIFICATION_ENDPOINTS.GET_DEVICE_BY_TOKEN(expoPushToken)
      );

      const deviceData = this.extractResponseData<DeviceResponse>(response);
      console.log('✅ Device found:', deviceData.deviceId);
      
      return deviceData;
    } catch (error) {
      console.error('❌ Error getting device by token:', error);
      throw this.handleNotificationError(error, 'Failed to get device info');
    }
  }

  /**
   * Get all devices for a user
   */
  async getUserDevices(userId: number): Promise<DeviceResponse[]> {
    try {
      console.log('📱 Getting devices for user:', userId);

      if (!userId || userId <= 0) {
        throw new Error('Invalid user ID');
      }

      const response = await apiClient.get<NotificationApiResponse<DeviceResponse[]>>(
        NOTIFICATION_ENDPOINTS.GET_USER_DEVICES(userId)
      );

      const devicesData = this.extractResponseData<DeviceResponse[]>(response) || [];
      console.log('✅ Found devices:', devicesData.length);
      
      return devicesData;
    } catch (error) {
      console.error('❌ Error getting user devices:', error);
      throw this.handleNotificationError(error, 'Failed to get user devices');
    }
  }

  /**
   * Update last used timestamp for device
   */
  async updateLastUsed(expoPushToken: string): Promise<void> {
    try {
      if (!expoPushToken || !this.validateExpoPushTokenFormat(expoPushToken)) {
        return; // Silently fail for invalid tokens
      }

      await apiClient.put(NOTIFICATION_ENDPOINTS.UPDATE_LAST_USED(expoPushToken));
      console.log('✅ Last used timestamp updated');
    } catch (error) {
      // Don't throw for this operation - it's not critical
      console.warn('⚠️ Failed to update last used timestamp:', error);
    }
  }

  // ===== NOTIFICATION SENDING =====

  /**
   * Send notification to a specific user
   */
  async sendNotification(request: SendNotificationRequest): Promise<NotificationSendResult[]> {
    try {
      console.log('📤 Sending notification to user:', request.userId, {
        title: request.title,
        type: request.data?.type,
      });

      // Validate required fields
      if (!request.userId || !request.title || !request.body) {
        throw new Error('Missing required fields: userId, title, body');
      }

      const response = await apiClient.post<NotificationApiResponse<NotificationSendResult[]>>(
        NOTIFICATION_ENDPOINTS.SEND_NOTIFICATION,
        request
      );

      const results = this.extractResponseData<NotificationSendResult[]>(response) || [];
      console.log('✅ Notification sent, results:', results.length);
      
      return results;
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      throw this.handleNotificationError(error, 'Failed to send notification');
    }
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkNotification(request: SendBulkNotificationRequest): Promise<BulkNotificationResponse> {
    try {
      console.log('📤 Sending bulk notification to users:', request.userIds.length, {
        title: request.title,
        type: request.data?.type,
      });

      // Validate required fields
      if (!request.userIds?.length || !request.title || !request.body) {
        throw new Error('Missing required fields: userIds, title, body');
      }

      const response = await apiClient.post<NotificationApiResponse<BulkNotificationResponse>>(
        NOTIFICATION_ENDPOINTS.SEND_BULK_NOTIFICATION,
        request
      );

      const result = this.extractResponseData<BulkNotificationResponse>(response);
      console.log('✅ Bulk notification sent:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error sending bulk notification:', error);
      throw this.handleNotificationError(error, 'Failed to send bulk notification');
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Validate Expo push token format
   */
  async validateToken(expoPushToken: string): Promise<TokenValidationResult> {
    try {
      console.log('🔍 Validating token:', expoPushToken.substring(0, 20) + '...');

      const response = await apiClient.post<NotificationApiResponse<TokenValidationResult>>(
        NOTIFICATION_ENDPOINTS.VALIDATE_TOKEN,
        expoPushToken
      );

      const result = this.extractResponseData<TokenValidationResult>(response);
      console.log('✅ Token validation result:', result.isValid);
      
      return result;
    } catch (error) {
      console.error('❌ Error validating token:', error);
      return {
        isValid: false,
        message: error instanceof Error ? error.message : 'Token validation failed'
      };
    }
  }

  /**
   * Cleanup inactive tokens (Admin only)
   */
  async cleanupTokens(): Promise<CleanupResult> {
    try {
      console.log('🧹 Cleaning up inactive tokens...');

      const response = await apiClient.post<NotificationApiResponse<CleanupResult>>(
        NOTIFICATION_ENDPOINTS.CLEANUP_TOKENS
      );

      const result = this.extractResponseData<CleanupResult>(response);
      console.log('✅ Cleanup completed:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Error cleaning up tokens:', error);
      throw this.handleNotificationError(error, 'Failed to cleanup tokens');
    }
  }

  // ===== DEVICE INFO HELPERS =====

  /**
   * Get current device information for registration
   */
  getCurrentDeviceInfo(): Partial<RegisterDeviceRequest> {
    try {
      const deviceInfo: Partial<RegisterDeviceRequest> = {
        deviceType: Platform.OS as DeviceType,
        deviceId: Constants.installationId || Device.osInternalBuildId || 'unknown',
        appVersion: Constants.expoConfig?.version || '1.0.0',
        osVersion: Device.osVersion || Platform.Version.toString(),
      };

      // Get device name
      if (Device.deviceName) {
        deviceInfo.deviceName = Device.deviceName;
      } else if (Device.brand && Device.modelName) {
        deviceInfo.deviceName = `${Device.brand} ${Device.modelName}`;
      } else {
        deviceInfo.deviceName = Platform.OS === 'ios' ? 'iPhone' : 'Android Device';
      }

      console.log('📱 Current device info:', deviceInfo);
      return deviceInfo;
    } catch (error) {
      console.error('❌ Error getting device info:', error);
      return {
        deviceType: Platform.OS as DeviceType,
        deviceId: 'unknown',
        deviceName: Platform.OS === 'ios' ? 'iPhone' : 'Android Device',
        appVersion: '1.0.0',
        osVersion: '1.0',
      };
    }
  }

  /**
   * Create device registration request with current device info
   */
  createDeviceRegistrationRequest(
    userId: number,
    expoPushToken: string,
    overrides?: Partial<RegisterDeviceRequest>
  ): RegisterDeviceRequest {
    const deviceInfo = this.getCurrentDeviceInfo();
    
    return {
      userId,
      expoPushToken,
      ...deviceInfo,
      ...overrides,
    } as RegisterDeviceRequest;
  }

  // ===== AUTOMATIC NOTIFICATION TEMPLATES =====

  /**
   * Get automatic notification templates
   */
  getAutoNotificationTemplates() {
    return {
      newBooking: (customerName: string, bookingId: string): AutoNotificationTemplate => ({
        title: 'Booking mới!',
        body: `Bạn có booking mới từ ${customerName}`,
        data: {
          screen: 'BookingDetail',
          bookingId,
          type: NotificationType.NEW_BOOKING,
        },
        sound: 'default',
        priority: NotificationPriority.HIGH,
      }),

      bookingConfirmed: (bookingId: string): AutoNotificationTemplate => ({
        title: 'Booking đã được xác nhận',
        body: 'Photographer đã xác nhận booking của bạn',
        data: {
          screen: 'BookingDetail',
          bookingId,
          type: NotificationType.BOOKING_STATUS_UPDATE,
          status: 'confirmed',
        },
        sound: 'default',
        priority: NotificationPriority.HIGH,
      }),

      bookingCompleted: (bookingId: string): AutoNotificationTemplate => ({
        title: 'Booking đã hoàn thành',
        body: 'Booking của bạn đã hoàn thành thành công',
        data: {
          screen: 'BookingDetail',
          bookingId,
          type: NotificationType.BOOKING_STATUS_UPDATE,
          status: 'completed',
        },
        sound: 'default',
        priority: NotificationPriority.NORMAL,
      }),

      newMessage: (senderName: string, messageContent: string, conversationId: string): AutoNotificationTemplate => ({
        title: 'Tin nhắn mới',
        body: `${senderName}: ${messageContent.substring(0, 50)}${messageContent.length > 50 ? '...' : ''}`,
        data: {
          screen: 'ChatScreen',
          conversationId,
          type: NotificationType.NEW_MESSAGE,
        },
        sound: 'default',
        priority: NotificationPriority.NORMAL,
      }),

      paymentSuccess: (amount: number, paymentId: string): AutoNotificationTemplate => ({
        title: 'Thanh toán thành công',
        body: `Bạn đã thanh toán thành công ${amount.toLocaleString('vi-VN')} VND`,
        data: {
          screen: 'PaymentDetail',
          paymentId,
          type: NotificationType.PAYMENT_UPDATE,
          status: 'success',
        },
        sound: 'default',
        priority: NotificationPriority.HIGH,
      }),

      paymentFailed: (paymentId: string): AutoNotificationTemplate => ({
        title: 'Thanh toán thất bại',
        body: 'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.',
        data: {
          screen: 'PaymentDetail',
          paymentId,
          type: NotificationType.PAYMENT_UPDATE,
          status: 'failed',
        },
        sound: 'default',
        priority: NotificationPriority.HIGH,
      }),

      newApplication: (photographerName: string, eventId: string): AutoNotificationTemplate => ({
        title: 'Đơn đăng ký mới',
        body: `${photographerName} đã đăng ký tham gia sự kiện của bạn`,
        data: {
          screen: 'EventApplications',
          eventId,
          type: NotificationType.NEW_APPLICATION,
        },
        sound: 'default',
        priority: NotificationPriority.NORMAL,
      }),

      applicationApproved: (eventId: string): AutoNotificationTemplate => ({
        title: 'Đơn đăng ký được chấp nhận',
        body: 'Đơn đăng ký sự kiện của bạn đã được chấp nhận',
        data: {
          screen: 'EventDetail',
          eventId,
          type: NotificationType.APPLICATION_RESPONSE,
          status: 'approved',
        },
        sound: 'default',
        priority: NotificationPriority.HIGH,
      }),

      applicationRejected: (eventId: string, reason?: string): AutoNotificationTemplate => ({
        title: 'Đơn đăng ký bị từ chối',
        body: reason || 'Đơn đăng ký sự kiện của bạn đã bị từ chối',
        data: {
          screen: 'EventDetail',
          eventId,
          type: NotificationType.APPLICATION_RESPONSE,
          status: 'rejected',
        },
        sound: 'default',
        priority: NotificationPriority.NORMAL,
      }),
    };
  }

  // ===== CONVENIENCE METHODS =====

  /**
   * Register current device for logged-in user
   */
  async registerCurrentDevice(expoPushToken: string, userId?: number): Promise<DeviceResponse> {
    const targetUserId = userId || this.userId;
    
    if (!targetUserId) {
      throw new Error('No user ID provided and no user logged in');
    }

    const request = this.createDeviceRegistrationRequest(targetUserId, expoPushToken);
    return await this.registerDevice(request);
  }

  /**
   * Update current device token
   */
  async updateCurrentDeviceToken(newExpoPushToken: string): Promise<DeviceResponse | null> {
    if (!this.currentDeviceId) {
      console.warn('⚠️ No current device ID - registering new device instead');
      return null;
    }

    const request: UpdateDeviceRequest = {
      expoPushToken: newExpoPushToken,
      appVersion: Constants.expoConfig?.version || '1.0.0',
    };

    return await this.updateDevice(this.currentDeviceId, request);
  }

  /**
   * Unregister current device
   */
  async unregisterCurrentDevice(): Promise<void> {
    if (this.currentExpoPushToken) {
      await this.removeDeviceByToken(this.currentExpoPushToken);
    } else if (this.currentDeviceId) {
      await this.removeDevice(this.currentDeviceId);
    }
  }

  /**
   * Check if current device is registered
   */
  async isCurrentDeviceRegistered(): Promise<boolean> {
    try {
      if (!this.currentExpoPushToken) {
        return false;
      }

      const device = await this.getDeviceByToken(this.currentExpoPushToken);
      return device.isActive;
    } catch (error) {
      return false;
    }
  }

  // ===== QUICK NOTIFICATION METHODS =====

  /**
   * Send booking notification
   */
  async sendBookingNotification(
    userId: number, 
    type: 'new' | 'confirmed' | 'completed' | 'cancelled',
    bookingId: string,
    customerName?: string
  ): Promise<NotificationSendResult[]> {
    const templates = this.getAutoNotificationTemplates();
    
    let template: AutoNotificationTemplate;
    
    switch (type) {
      case 'new':
        if (!customerName) throw new Error('Customer name required for new booking notification');
        template = templates.newBooking(customerName, bookingId);
        break;
      case 'confirmed':
        template = templates.bookingConfirmed(bookingId);
        break;
      case 'completed':
        template = templates.bookingCompleted(bookingId);
        break;
      case 'cancelled':
        template = {
          title: 'Booking đã bị hủy',
          body: 'Booking của bạn đã bị hủy',
          data: {
            screen: 'BookingDetail',
            bookingId,
            type: NotificationType.BOOKING_STATUS_UPDATE,
            status: 'cancelled',
          },
          sound: 'default',
          priority: NotificationPriority.NORMAL,
        };
        break;
      default:
        throw new Error(`Unknown booking notification type: ${type}`);
    }

    const request: SendNotificationRequest = {
      userId,
      title: template.title,
      body: template.body,
      data: template.data,
      sound: template.sound,
      priority: template.priority,
    };

    return await this.sendNotification(request);
  }

  /**
   * Send message notification
   */
  async sendMessageNotification(
    userId: number,
    senderName: string,
    messageContent: string,
    conversationId: string
  ): Promise<NotificationSendResult[]> {
    const template = this.getAutoNotificationTemplates().newMessage(
      senderName,
      messageContent,
      conversationId
    );

    const request: SendNotificationRequest = {
      userId,
      title: template.title,
      body: template.body,
      data: template.data,
      sound: template.sound,
      priority: template.priority,
    };

    return await this.sendNotification(request);
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(
    userId: number,
    type: 'success' | 'failed',
    paymentId: string,
    amount?: number
  ): Promise<NotificationSendResult[]> {
    const templates = this.getAutoNotificationTemplates();
    
    const template = type === 'success' && amount 
      ? templates.paymentSuccess(amount, paymentId)
      : templates.paymentFailed(paymentId);

    const request: SendNotificationRequest = {
      userId,
      title: template.title,
      body: template.body,
      data: template.data,
      sound: template.sound,
      priority: template.priority,
    };

    return await this.sendNotification(request);
  }

  // ===== VALIDATION HELPERS =====

  /**
   * Validate Expo push token format
   */
  private validateExpoPushTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    return /^ExponentPushToken\[[a-zA-Z0-9_-]+\]$/.test(token);
  }

  /**
   * Extract data from API response
   */
  private extractResponseData<T>(response: any): T {
    // Handle new API response format: { error: 0, message: "...", data: {...} }
    if (response.error === 0 && response.data !== undefined) {
      return response.data as T;
    }
    // Handle direct data response
    else if (response.data !== undefined) {
      return response.data as T;
    }
    // Handle raw response
    else {
      return response as T;
    }
  }

  /**
   * Handle and format notification errors
   */
  private handleNotificationError(error: unknown, defaultMessage: string): Error {
    if (error instanceof Error) {
      return error;
    }
    
    if (typeof error === 'string') {
      return new Error(error);
    }
    
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as any;
      if (errorObj.message) {
        return new Error(errorObj.message);
      }
      if (errorObj.error) {
        return new Error(errorObj.error);
      }
    }
    
    return new Error(defaultMessage);
  }

  // ===== TESTING & DEBUG METHODS =====

  /**
   * Test notification with current user
   */
  async testNotification(
    title: string = 'Test Notification',
    body: string = 'This is a test notification from SnapLink'
  ): Promise<NotificationSendResult[] | null> {
    if (!this.userId) {
      console.error('❌ No user logged in for test notification');
      return null;
    }

    try {
      const request: SendNotificationRequest = {
        userId: this.userId,
        title,
        body,
        data: {
          screen: 'Notifications',
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          testNotification: true,
        },
        sound: 'default',
        priority: NotificationPriority.NORMAL,
      };

      console.log('🧪 Sending test notification...');
      const result = await this.sendNotification(request);
      console.log('✅ Test notification sent:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Test notification failed:', error);
      return null;
    }
  }

  /**
   * Get service debug info
   */
  getDebugInfo() {
    return {
      userId: this.userId,
      currentDeviceId: this.currentDeviceId,
      hasCurrentToken: !!this.currentExpoPushToken,
      tokenLength: this.currentExpoPushToken?.length || 0,
      platform: Platform.OS,
      appVersion: Constants.expoConfig?.version,
      deviceInfo: this.getCurrentDeviceInfo(),
    };
  }

  /**
   * Validate service configuration
   */
  validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.userId) {
      errors.push('No user ID set');
    }

    if (!this.currentExpoPushToken) {
      errors.push('No Expo push token available');
    } else if (!this.validateExpoPushTokenFormat(this.currentExpoPushToken)) {
      errors.push('Invalid Expo push token format');
    }

    if (!Device.isDevice) {
      errors.push('Running on simulator - push notifications not supported');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // ===== BULK OPERATIONS =====

  /**
   * Send system announcement to all users
   */
  async sendSystemAnnouncement(
    userIds: number[],
    title: string,
    body: string,
    data?: any
  ): Promise<BulkNotificationResponse> {
    const request: SendBulkNotificationRequest = {
      userIds,
      title,
      body,
      data: {
        screen: 'Notifications',
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        ...data,
      },
      sound: 'default',
      priority: NotificationPriority.NORMAL,
    };

    return await this.sendBulkNotification(request);
  }

  /**
   * Send event reminders to multiple users
   */
  async sendEventReminders(
    userIds: number[],
    eventName: string,
    eventId: string,
    reminderTime: string
  ): Promise<BulkNotificationResponse> {
    const request: SendBulkNotificationRequest = {
      userIds,
      title: 'Nhắc nhở sự kiện',
      body: `Sự kiện "${eventName}" sẽ diễn ra ${reminderTime}`,
      data: {
        screen: 'EventDetail',
        eventId,
        type: NotificationType.EVENT_REMINDER,
      },
      sound: 'default',
      priority: NotificationPriority.NORMAL,
    };

    return await this.sendBulkNotification(request);
  }

  // ===== CURRENT STATE GETTERS =====

  getCurrentDeviceId(): number | null {
    return this.currentDeviceId;
  }

  getCurrentExpoPushToken(): string | null {
    return this.currentExpoPushToken;
  }

  isUserLoggedIn(): boolean {
    return this.userId !== null;
  }

  hasValidToken(): boolean {
    return this.currentExpoPushToken !== null && 
           this.validateExpoPushTokenFormat(this.currentExpoPushToken);
  }
}

// Export singleton instance
export const notificationService = new NotificationService();