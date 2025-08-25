// services/NotificationService.ts - Part 1: Core Service & CRUD Operations

import {
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationResponse,
  NotificationListResponse,
  NotificationQuery,
  NotificationStats,
  ApiResponse,
  NotificationType,
  NotificationTemplate
} from '../types/notification';

// Base API configuration
const API_BASE_URL = 'https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net/api'; 
const ENDPOINTS = {
  GET_ALL_NOTIFICATIONS: '/Notification/GetAllNotifications',
  GET_NOTIFICATION_BY_ID: '/Notification/GetNotificationById',
  GET_NOTIFICATIONS_BY_USER_ID: '/Notification/GetNotificationsByUserId',
  CREATE_NOTIFICATION: '/Notification/CreateNotification',
  UPDATE_NOTIFICATION: '/Notification/UpdateNotification',
  DELETE_NOTIFICATION: '/Notification/DeleteNotification'
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
    console.log('🔑 Notification Service: Auth token set');
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
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      console.log('🌐 API Call:', url);
      console.log('🔒 Headers:', this.getHeaders());

      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      console.log('📊 Response Status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ API Success:', data);
      
      return {
        error: 0,
        message: 'Success',
        data: data
      };
    } catch (error) {
      console.error('💥 API call failed:', error);
      return {
        error: 1,
        message: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  // ===== BASIC CRUD OPERATIONS =====

  /**
   * Lấy tất cả notifications
   */
  public async getAllNotifications(): Promise<ApiResponse<NotificationResponse[]>> {
    console.log('📥 Getting all notifications...');
    return this.apiCall<NotificationResponse[]>(ENDPOINTS.GET_ALL_NOTIFICATIONS);
  }

  /**
   * Lấy notification theo ID
   */
  public async getNotificationById(id: number): Promise<ApiResponse<NotificationResponse>> {
    console.log('🔍 Getting notification by ID:', id);
    return this.apiCall<NotificationResponse>(`${ENDPOINTS.GET_NOTIFICATION_BY_ID}/${id}`);
  }
  
    /**
   * Lấy notification theo userID
   */
  public async getNotificationsByUserId(userId: number): Promise<ApiResponse<NotificationResponse[]>> {
    console.log('🔍 Getting notifications by userID:', userId);
    return this.apiCall<NotificationResponse[]>(`${ENDPOINTS.GET_NOTIFICATIONS_BY_USER_ID}/${userId}`);
  }

  /**
   * Tạo notification mới
   */
  public async createNotification(request: CreateNotificationRequest): Promise<ApiResponse<NotificationResponse>> {
    console.log('📝 Creating notification:', request);
    
    const payload = {
      userId: request.userId,
      title: request.title,
      content: request.content,
      notificationType: request.notificationType,
      readStatus: request.readStatus || false
    };

    console.log('📤 Payload:', payload);
    return this.apiCall<NotificationResponse>(ENDPOINTS.CREATE_NOTIFICATION, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Cập nhật notification
   */
  public async updateNotification(id: number, request: UpdateNotificationRequest): Promise<ApiResponse<NotificationResponse>> {
    console.log('✏️ Updating notification:', id, request);
    return this.apiCall<NotificationResponse>(`${ENDPOINTS.UPDATE_NOTIFICATION}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  /**
   * Xóa notification
   */
  public async deleteNotification(id: number): Promise<ApiResponse<void>> {
    console.log('🗑️ Deleting notification:', id);
    return this.apiCall<void>(`${ENDPOINTS.DELETE_NOTIFICATION}/${id}`, {
      method: 'DELETE',
    });
  }

  // ===== USER-SPECIFIC OPERATIONS =====

  /**
   * Lấy notifications của user hiện tại (filtered)
   */
  public async getUserNotifications(
    userId: number, 
    query: NotificationQuery = {}
  ): Promise<ApiResponse<NotificationListResponse>> {
    try {
      console.log('👤 Getting user notifications for userId:', userId, 'with query:', query);
      
      // 🔥 FIXED: Use the new endpoint directly
      const response = await this.getNotificationsByUserId(userId);
      
      if (response.error !== 0 || !response.data) {
        console.error('❌ Failed to get user notifications:', response.message);
        return {
          error: response.error,
          message: response.message,
          data: undefined
        };
      }
  
      console.log('📦 Total user notifications from API:', response.data.length);
  
      let notifications = response.data;
  
      // Apply filters
      if (query.notificationType) {
        notifications = notifications.filter(n => n.notificationType === query.notificationType);
        console.log(`🏷️ After type filter (${query.notificationType}):`, notifications.length);
      }
      
      if (query.readStatus !== undefined) {
        notifications = notifications.filter(n => n.readStatus === query.readStatus);
        console.log(`👁️ After read status filter (${query.readStatus}):`, notifications.length);
      }
  
      if (query.dateFrom) {
        const fromDate = new Date(query.dateFrom);
        notifications = notifications.filter(n => new Date(n.createdAt) >= fromDate);
        console.log(`📅 After date from filter (${query.dateFrom}):`, notifications.length);
      }
  
      if (query.dateTo) {
        const toDate = new Date(query.dateTo);
        notifications = notifications.filter(n => new Date(n.createdAt) <= toDate);
        console.log(`📅 After date to filter (${query.dateTo}):`, notifications.length);
      }
  
      // Sort by createdAt desc
      notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
      // Apply pagination
      const page = query.page || 1;
      const pageSize = query.pageSize || 20;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      
      const paginatedNotifications = notifications.slice(startIndex, endIndex);
      
      console.log(`📄 Pagination - Page ${page}, PageSize ${pageSize}, Total: ${notifications.length}, Returned: ${paginatedNotifications.length}`);
      
      const result = {
        notifications: paginatedNotifications,
        totalCount: notifications.length,
        page,
        pageSize,
        hasMore: endIndex < notifications.length
      };
  
      return {
        error: 0,
        message: 'Success',
        data: result
      };
    } catch (error) {
      console.error('💥 Failed to get user notifications:', error);
      return {
        error: 1,
        message: 'Failed to get user notifications',
        data: undefined
      };
    }
  }

  /**
   * Lấy số lượng notifications chưa đọc
   */
  public async getUnreadCount(userId: number): Promise<ApiResponse<number>> {
    try {
      console.log('🔢 Getting unread count for userId:', userId);
      
      const response = await this.getAllNotifications();
      
      if (response.error !== 0 || !response.data) {
        console.error('❌ Failed to get notifications for unread count:', response.message);
        return { error: response.error, message: response.message, data: 0 };
      }

      const unreadCount = response.data.filter(n => 
        n.userId === userId && !n.readStatus
      ).length;

      console.log('🔢 Unread count:', unreadCount);

      return {
        error: 0,
        message: 'Success',
        data: unreadCount
      };
    } catch (error) {
      console.error('💥 Failed to get unread count:', error);
      return {
        error: 1,
        message: 'Failed to get unread count',
        data: 0
      };
    }
  }

  /**
   * Đánh dấu notification đã đọc
   */
  public async markAsRead(id: number): Promise<ApiResponse<NotificationResponse>> {
    console.log('👁️ Marking notification as read:', id);
    return this.updateNotification(id, { readStatus: true });
  }

  /**
   * Đánh dấu tất cả notifications của user đã đọc
   */
  public async markAllAsRead(userId: number): Promise<ApiResponse<number>> {
    try {
      console.log('👁️‍🗨️ Marking all notifications as read for userId:', userId);
      
      const response = await this.getAllNotifications();
      
      if (response.error !== 0 || !response.data) {
        console.error('❌ Failed to get notifications for mark all read:', response.message);
        return { error: response.error, message: response.message, data: 0 };
      }

      const unreadNotifications = response.data.filter(n => 
        n.userId === userId && !n.readStatus
      );

      console.log('📊 Found unread notifications:', unreadNotifications.length);

      let successCount = 0;
      
      for (const notification of unreadNotifications) {
        const updateResult = await this.markAsRead(Number(notification.motificationId));
        if (updateResult.error === 0) {
          successCount++;
        }
      }

      console.log('✅ Successfully marked as read:', successCount);

      return {
        error: 0,
        message: `Marked ${successCount} notifications as read`,
        data: successCount
      };
    } catch (error) {
      console.error('💥 Failed to mark all as read:', error);
      return {
        error: 1,
        message: 'Failed to mark all as read',
        data: 0
      };
    }
  }

  /**
   * Xóa tất cả notifications đã đọc của user
   */
  public async deleteReadNotifications(userId: number): Promise<ApiResponse<number>> {
    try {
      console.log('🗑️ Deleting read notifications for userId:', userId);
      
      const response = await this.getAllNotifications();
      
      if (response.error !== 0 || !response.data) {
        console.error('❌ Failed to get notifications for delete read:', response.message);
        return { error: response.error, message: response.message, data: 0 };
      }

      const readNotifications = response.data.filter(n => 
        n.userId === userId && n.readStatus
      );

      console.log('📊 Found read notifications to delete:', readNotifications.length);

      let successCount = 0;
      
      for (const notification of readNotifications) {
        const deleteResult = await this.deleteNotification(Number(notification.motificationId));
        if (deleteResult.error === 0) {
          successCount++;
        }
      }

      console.log('✅ Successfully deleted:', successCount);

      return {
        error: 0,
        message: `Deleted ${successCount} notifications`,
        data: successCount
      };
    } catch (error) {
      console.error('💥 Failed to delete read notifications:', error);
      return {
        error: 1,
        message: 'Failed to delete read notifications',
        data: 0
      };
    }
  }

  /**
   * Lấy thống kê notifications của user
   */
  public async getNotificationStats(userId: number): Promise<ApiResponse<NotificationStats>> {
    try {
      console.log('📊 Getting notification stats for userId:', userId);
      
      const response = await this.getAllNotifications();
      
      if (response.error !== 0 || !response.data) {
        console.error('❌ Failed to get notifications for stats:', response.message);
        return { error: response.error, message: response.message };
      }

      const userNotifications = response.data.filter(n => n.userId === userId);
      
      console.log('📈 User notifications for stats:', userNotifications.length);
      
      const stats: NotificationStats = {
        totalCount: userNotifications.length,
        unreadCount: userNotifications.filter(n => !n.readStatus).length,
        readCount: userNotifications.filter(n => n.readStatus).length,
        typeBreakdown: {} as any
      };

      // Initialize type breakdown
      Object.values(NotificationType).forEach(type => {
        stats.typeBreakdown[type] = 0;
      });

      // Count by type
      userNotifications.forEach(notification => {
        stats.typeBreakdown[notification.notificationType]++;
      });

      console.log('📊 Stats calculated:', stats);

      return {
        error: 0,
        message: 'Success',
        data: stats
      };
    } catch (error) {
      console.error('💥 Failed to get notification stats:', error);
      return {
        error: 1,
        message: 'Failed to get notification stats'
      };
    }
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if service has auth token
   */
  public hasAuthToken(): boolean {
    const hasToken = this.authToken !== null && this.authToken !== '';
    console.log('🔑 Has auth token:', hasToken);
    return hasToken;
  }

  /**
   * Clear auth token
   */
  public clearAuthToken(): void {
    console.log('🔑 Clearing auth token');
    this.authToken = null;
  }

  /**
   * Test connection với backend
   */
  public async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing connection...');
      const response = await this.getAllNotifications();
      const isConnected = response.error === 0;
      console.log('🔍 Connection test result:', isConnected);
      return isConnected;
    } catch (error) {
      console.log('❌ Connection test failed:', error);
      return false;
    }
  }
}
export const notificationService = NotificationService.getInstance();

// ===== NOTIFICATION TEMPLATES =====

export class NotificationTemplates {
  /**
   * Template cho booking mới
   */
  static newBooking(customerName: string, bookingId: number): NotificationTemplate {
    return {
      title: 'Booking Request Mới! 📅',
      content: `Bạn có một booking request từ ${customerName}`,
      notificationType: NotificationType.NEW_BOOKING,
      referenceId: bookingId
    };
  }

  /**
   * Template cho booking được confirm
   */
  static bookingConfirmed(bookingId: number, photographerName?: string): NotificationTemplate {
    return {
      title: 'Booking Được Xác Nhận! ✅',
      content: photographerName 
        ? `${photographerName} đã xác nhận booking của bạn`
        : 'Booking của bạn đã được xác nhận',
      notificationType: NotificationType.BOOKING_STATUS_UPDATE,
      referenceId: bookingId
    };
  }

  /**
   * Template cho booking hoàn thành
   */
  static bookingCompleted(bookingId: number): NotificationTemplate {
    return {
      title: 'Booking Hoàn Thành! 🎉',
      content: 'Chúc mừng! Booking của bạn đã hoàn thành thành công',
      notificationType: NotificationType.BOOKING_STATUS_UPDATE,
      referenceId: bookingId
    };
  }

  /**
   * Template cho booking bị hủy
   */
  static bookingCancelled(bookingId: number, reason?: string): NotificationTemplate {
    return {
      title: 'Booking Bị Hủy ❌',
      content: reason 
        ? `Booking của bạn đã bị hủy: ${reason}`
        : 'Booking của bạn đã bị hủy',
      notificationType: NotificationType.BOOKING_STATUS_UPDATE,
      referenceId: bookingId
    };
  }

  /**
   * Template cho tin nhắn mới
   */
  static newMessage(senderName: string, messagePreview: string, conversationId: number): NotificationTemplate {
    const preview = messagePreview.length > 50 ? `${messagePreview.substring(0, 50)}...` : messagePreview;
    return {
      title: `Tin nhắn từ ${senderName} 💬`,
      content: preview,
      notificationType: NotificationType.NEW_MESSAGE,
      referenceId: conversationId
    };
  }

  /**
   * Template cho payment thành công
   */
  static paymentSuccess(amount: number, paymentId: number): NotificationTemplate {
    return {
      title: 'Thanh Toán Thành Công! 💳',
      content: `Bạn đã thanh toán thành công ${amount.toLocaleString('vi-VN')} VNĐ`,
      notificationType: NotificationType.PAYMENT_UPDATE,
      referenceId: paymentId
    };
  }

  /**
   * Template cho payment thất bại
   */
  static paymentFailed(paymentId: number): NotificationTemplate {
    return {
      title: 'Thanh Toán Thất Bại! ❌',
      content: 'Có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại',
      notificationType: NotificationType.PAYMENT_UPDATE,
      referenceId: paymentId
    };
  }

  /**
   * Template cho application mới
   */
  static newApplication(photographerName: string, eventId: number, eventName?: string): NotificationTemplate {
    return {
      title: 'Đăng Ký Event Mới! 📝',
      content: eventName 
        ? `${photographerName} đã đăng ký tham gia event "${eventName}"`
        : `${photographerName} đã đăng ký tham gia event của bạn`,
      notificationType: NotificationType.NEW_APPLICATION,
      referenceId: eventId
    };
  }

  /**
   * Template cho application được approve
   */
  static applicationApproved(eventId: number, eventName?: string): NotificationTemplate {
    return {
      title: 'Đăng Ký Được Chấp Nhận! 🎉',
      content: eventName 
        ? `Bạn đã được chấp nhận tham gia event "${eventName}"`
        : 'Đăng ký của bạn đã được chấp nhận',
      notificationType: NotificationType.APPLICATION_RESPONSE,
      referenceId: eventId
    };
  }

  /**
   * Template cho application bị reject
   */
  static applicationRejected(eventId: number, reason?: string): NotificationTemplate {
    return {
      title: 'Đăng Ký Bị Từ Chối 😔',
      content: reason 
        ? `Đăng ký của bạn bị từ chối: ${reason}`
        : 'Đăng ký của bạn không được chấp nhận lần này',
      notificationType: NotificationType.APPLICATION_RESPONSE,
      referenceId: eventId
    };
  }

  /**
   * Template cho photo delivery
   */
  static photoDelivered(bookingId: number, photoCount: number): NotificationTemplate {
    return {
      title: 'Ảnh Đã Được Giao! 📸',
      content: `Photographer đã giao ${photoCount} ảnh cho booking của bạn`,
      notificationType: NotificationType.PHOTO_DELIVERY,
      referenceId: bookingId
    };
  }

  /**
   * Template cho withdrawal update
   */
  static withdrawalUpdate(amount: number, status: string): NotificationTemplate {
    const statusText = status === 'approved' ? 'được chấp nhận' : 
                      status === 'rejected' ? 'bị từ chối' : 
                      status === 'completed' ? 'đã hoàn thành' : 'được cập nhật';
    
    return {
      title: 'Cập Nhật Rút Tiền! 💰',
      content: `Yêu cầu rút ${amount.toLocaleString('vi-VN')} VNĐ ${statusText}`,
      notificationType: NotificationType.WITHDRAWAL_UPDATE
    };
  }

  /**
   * Template cho system announcement
   */
  static systemAnnouncement(title: string, content: string): NotificationTemplate {
    return {
      title: `📢 ${title}`,
      content,
      notificationType: NotificationType.SYSTEM_ANNOUNCEMENT
    };
  }

  /**
   * Template cho event reminder
   */
  static eventReminder(eventName: string, eventId: number, reminderTime: string): NotificationTemplate {
    return {
      title: 'Nhắc Nhở Sự Kiện! ⏰',
      content: `Sự kiện "${eventName}" sẽ diễn ra ${reminderTime}`,
      notificationType: NotificationType.EVENT_REMINDER,
      referenceId: eventId
    };
  }
}

// ===== AUTO NOTIFICATION HELPER =====

export class AutoNotificationHelper {
  private service = notificationService;

  /**
   * Tự động tạo notification cho booking mới
   */
  async notifyNewBooking(photographerId: number, customerName: string, bookingId: number): Promise<boolean> {
    try {
      console.log('🔔 Auto notify new booking:', { photographerId, customerName, bookingId });
      
      const template = NotificationTemplates.newBooking(customerName, bookingId);
      const result = await this.service.createNotification({
        userId: photographerId,
        ...template
      });
      
      console.log('🔔 New booking notification result:', result);
      return result.error === 0;
    } catch (error) {
      console.error('💥 Failed to create new booking notification:', error);
      return false;
    }
  }

  /**
   * Tự động tạo notification cho booking được confirm
   */
  async notifyBookingConfirmed(customerId: number, bookingId: number, photographerName?: string): Promise<boolean> {
    try {
      console.log('🔔 Auto notify booking confirmed:', { customerId, bookingId, photographerName });
      
      const template = NotificationTemplates.bookingConfirmed(bookingId, photographerName);
      const result = await this.service.createNotification({
        userId: customerId,
        ...template
      });
      
      console.log('🔔 Booking confirmed notification result:', result);
      return result.error === 0;
    } catch (error) {
      console.error('💥 Failed to create booking confirmed notification:', error);
      return false;
    }
  }

  /**
   * Tự động tạo notification cho booking hoàn thành
   */
  async notifyBookingCompleted(customerId: number, bookingId: number): Promise<boolean> {
    try {
      console.log('🔔 Auto notify booking completed:', { customerId, bookingId });
      
      const template = NotificationTemplates.bookingCompleted(bookingId);
      const result = await this.service.createNotification({
        userId: customerId,
        ...template
      });
      
      console.log('🔔 Booking completed notification result:', result);
      return result.error === 0;
    } catch (error) {
      console.error('💥 Failed to create booking completed notification:', error);
      return false;
    }
  }

  /**
   * Tự động tạo notification cho booking bị hủy
   */
  async notifyBookingCancelled(userId: number, bookingId: number, reason?: string): Promise<boolean> {
    try {
      console.log('🔔 Auto notify booking cancelled:', { userId, bookingId, reason });
      
      const template = NotificationTemplates.bookingCancelled(bookingId, reason);
      const result = await this.service.createNotification({
        userId,
        ...template
      });
      
      console.log('🔔 Booking cancelled notification result:', result);
      return result.error === 0;
    } catch (error) {
      console.error('💥 Failed to create booking cancelled notification:', error);
      return false;
    }
  }

  /**
   * Tự động tạo notification cho tin nhắn mới
   */
  async notifyNewMessage(
    recipientId: number, 
    senderName: string, 
    messageContent: string, 
    conversationId: number
  ): Promise<boolean> {
    try {
      console.log('🔔 Auto notify new message:', { recipientId, senderName, conversationId });
      
      const template = NotificationTemplates.newMessage(senderName, messageContent, conversationId);
      const result = await this.service.createNotification({
        userId: recipientId,
        ...template
      });
      
      console.log('🔔 New message notification result:', result);
      return result.error === 0;
    } catch (error) {
      console.error('💥 Failed to create new message notification:', error);
      return false;
    }
  }

  /**
   * Tự động tạo notification cho payment
   */
  async notifyPaymentUpdate(
    userId: number, 
    amount: number, 
    paymentId: number, 
    success: boolean
  ): Promise<boolean> {
    try {
      console.log('🔔 Auto notify payment update:', { userId, amount, paymentId, success });
      
      const template = success 
        ? NotificationTemplates.paymentSuccess(amount, paymentId)
        : NotificationTemplates.paymentFailed(paymentId);
      
      const result = await this.service.createNotification({
        userId,
        ...template
      });
      
      console.log('🔔 Payment update notification result:', result);
      return result.error === 0;
    } catch (error) {
      console.error('💥 Failed to create payment notification:', error);
      return false;
    }
  }

  /**
   * Tự động tạo notification cho application mới
   */
  async notifyNewApplication(
    locationOwnerId: number,
    photographerName: string,
    eventId: number,
    eventName?: string
  ): Promise<boolean> {
    try {
      console.log('🔔 Auto notify new application:', { locationOwnerId, photographerName, eventId, eventName });
      
      const template = NotificationTemplates.newApplication(photographerName, eventId, eventName);
      const result = await this.service.createNotification({
        userId: locationOwnerId,
        ...template
      });
      
      console.log('🔔 New application notification result:', result);
      return result.error === 0;
    } catch (error) {
      console.error('💥 Failed to create new application notification:', error);
      return false;
    }
  }

  /**
   * Tự động tạo notification cho application response
   */
  async notifyApplicationResponse(
    photographerId: number,
    eventId: number,
    approved: boolean,
    eventName?: string,
    rejectionReason?: string
  ): Promise<boolean> {
    try {
      console.log('🔔 Auto notify application response:', { photographerId, eventId, approved, eventName, rejectionReason });
      
      const template = approved 
        ? NotificationTemplates.applicationApproved(eventId, eventName)
        : NotificationTemplates.applicationRejected(eventId, rejectionReason);
      
      const result = await this.service.createNotification({
        userId: photographerId,
        ...template
      });
      
      console.log('🔔 Application response notification result:', result);
      return result.error === 0;
    } catch (error) {
      console.error('💥 Failed to create application response notification:', error);
      return false;
    }
  }

  /**
   * Tự động tạo notification cho photo delivery
   */
  async notifyPhotoDelivered(customerId: number, bookingId: number, photoCount: number): Promise<boolean> {
    try {
      console.log('🔔 Auto notify photo delivered:', { customerId, bookingId, photoCount });
      
      const template = NotificationTemplates.photoDelivered(bookingId, photoCount);
      const result = await this.service.createNotification({
        userId: customerId,
        ...template
      });
      
      console.log('🔔 Photo delivered notification result:', result);
      return result.error === 0;
    } catch (error) {
      console.error('💥 Failed to create photo delivery notification:', error);
      return false;
    }
  }

  /**
   * Tự động tạo notification cho withdrawal update
   */
  async notifyWithdrawalUpdate(userId: number, amount: number, status: string): Promise<boolean> {
    try {
      console.log('🔔 Auto notify withdrawal update:', { userId, amount, status });
      
      const template = NotificationTemplates.withdrawalUpdate(amount, status);
      const result = await this.service.createNotification({
        userId,
        ...template
      });
      
      console.log('🔔 Withdrawal update notification result:', result);
      return result.error === 0;
    } catch (error) {
      console.error('💥 Failed to create withdrawal notification:', error);
      return false;
    }
  }

  /**
   * Tự động tạo system announcement cho tất cả users
   */
  async notifySystemAnnouncement(userIds: number[], title: string, content: string): Promise<number> {
    let successCount = 0;
    console.log('🔔 Auto notify system announcement to', userIds.length, 'users:', { title, content });
    
    const template = NotificationTemplates.systemAnnouncement(title, content);

    for (const userId of userIds) {
      try {
        const result = await this.service.createNotification({
          userId,
          ...template
        });
        if (result.error === 0) {
          successCount++;
        }
      } catch (error) {
        console.error(`💥 Failed to create system notification for user ${userId}:`, error);
      }
    }

    console.log('🔔 System announcement notification results:', { total: userIds.length, success: successCount });
    return successCount;
  }

  /**
   * Tự động tạo event reminder
   */
  async notifyEventReminder(
    userIds: number[], 
    eventName: string, 
    eventId: number, 
    reminderTime: string
  ): Promise<number> {
    let successCount = 0;
    console.log('🔔 Auto notify event reminder to', userIds.length, 'users:', { eventName, eventId, reminderTime });
    
    const template = NotificationTemplates.eventReminder(eventName, eventId, reminderTime);

    for (const userId of userIds) {
      try {
        const result = await this.service.createNotification({
          userId,
          ...template
        });
        if (result.error === 0) {
          successCount++;
        }
      } catch (error) {
        console.error(`💥 Failed to create event reminder for user ${userId}:`, error);
      }
    }

    console.log('🔔 Event reminder notification results:', { total: userIds.length, success: successCount });
    return successCount;
  }

  /**
   * Bulk create notifications cho nhiều users cùng lúc
   */
  async bulkNotifyUsers(
    userIds: number[],
    template: NotificationTemplate
  ): Promise<{total: number, success: number, failed: number}> {
    const result = {
      total: userIds.length,
      success: 0,
      failed: 0
    };

    console.log('🔔 Bulk notify', userIds.length, 'users with template:', template.title);

    for (const userId of userIds) {
      try {
        const response = await this.service.createNotification({
          userId,
          ...template
        });
        
        if (response.error === 0) {
          result.success++;
        } else {
          result.failed++;
        }
      } catch (error) {
        console.error(`💥 Failed to create notification for user ${userId}:`, error);
        result.failed++;
      }
    }

    console.log('🔔 Bulk notification results:', result);
    return result;
  }

  /**
   * Tự động clean up old notifications (older than specified days)
   */
  async cleanupOldNotifications(userId: number, olderThanDays: number = 30): Promise<number> {
    try {
      console.log('🧹 Cleaning up old notifications for user:', userId, 'older than', olderThanDays, 'days');
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      const response = await this.service.getUserNotifications(userId, {
        dateTo: cutoffDate.toISOString(),
        readStatus: true, // Only delete read notifications
        pageSize: 1000 // Get a large batch
      });

      if (response.error !== 0 || !response.data) {
        console.error('❌ Failed to get old notifications:', response.message);
        return 0;
      }

      let deletedCount = 0;
      const oldNotifications = response.data.notifications;

      for (const notification of oldNotifications) {
        try {
          const deleteResult = await this.service.deleteNotification(Number(notification.motificationId));
          if (deleteResult.error === 0) {
            deletedCount++;
          }
        } catch (error) {
          console.error(`💥 Failed to delete notification ${notification.motificationId}:`, error);
        }
      }

      console.log('🧹 Cleanup completed:', deletedCount, 'notifications deleted');
      return deletedCount;
    } catch (error) {
      console.error('💥 Failed to cleanup old notifications:', error);
      return 0;
    }
  }
}

// Export helper instance
export const autoNotificationHelper = new AutoNotificationHelper();