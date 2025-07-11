import { apiClient } from "./base";
import { NotificationData, NotificationDto, UpdateNotificationDto, NotificationApiResponse } from "../types";

const ENDPOINTS = {
  ALL: "/api/Notification/GetAllNotifications",
  BY_ID: (id: number) => `/api/Notification/GetNotificationById/${id}`,
  CREATE: "/api/Notification/CreateNotification",
  UPDATE: (id: number) => `/api/Notification/UpdateNotification/${id}`,
  DELETE: (id: number) => `/api/Notification/DeleteNotification/${id}`,
};

export const notificationService = {
  // Get all notifications - might return array or object with $values
  getAll: (): Promise<NotificationApiResponse[] | { $values: NotificationApiResponse[] }> => 
    apiClient.get<NotificationApiResponse[] | { $values: NotificationApiResponse[] }>(ENDPOINTS.ALL),

  // Get notification by ID
  getById: (id: number): Promise<NotificationApiResponse> => 
    apiClient.get<NotificationApiResponse>(ENDPOINTS.BY_ID(id)),

  // Create notification
  create: (data: NotificationDto): Promise<NotificationData> => 
    apiClient.post<NotificationData>(ENDPOINTS.CREATE, data),

  // Update notification
  update: (id: number, data: UpdateNotificationDto): Promise<NotificationData> => 
    apiClient.put<NotificationData>(ENDPOINTS.UPDATE(id), data),

  // Delete notification
  delete: (id: number): Promise<void> => 
    apiClient.delete<void>(ENDPOINTS.DELETE(id)),

  // Helper method to get notifications by user ID with null safety
  getByUserId: async (userId: number): Promise<NotificationApiResponse[]> => {
    try {
      const result = await notificationService.getAll();
      const notifications = Array.isArray(result) ? result : result.$values || [];
      
      // Filter and ensure data integrity
      return notifications
        .filter(notification => notification && notification.userId === userId)
        .map(notification => ({
          ...notification,
          // Ensure required fields have default values
          notificationType: notification.notificationType || 'general',
          title: notification.title || 'Thông báo',
          content: notification.content || '',
          readStatus: notification.readStatus || false,
          createdAt: notification.createdAt || new Date().toISOString(),
          user: notification.user || {}
        }));
    } catch (error) {
      console.error('Error fetching notifications by user ID:', error);
      return [];
    }
  },

  // Helper method to mark as read with complete data
  markAsRead: async (id: number): Promise<NotificationData | null> => {
    try {
      console.log(`Marking notification ${id} as read...`);
      
      // First, get the current notification data
      const currentNotification = await notificationService.getById(id);
      console.log('Current notification data:', currentNotification);
      
      // Create complete NotificationDto with all required fields
      const updateData = {
        userId: currentNotification.userId,
        title: currentNotification.title,
        content: currentNotification.content,
        notificationType: currentNotification.notificationType,
        referenceId: currentNotification.referenceId,
        readStatus: true // Only change this field
      };
      
      console.log('Update data:', updateData);
      
      const response = await apiClient.put<NotificationData>(ENDPOINTS.UPDATE(id), updateData);
      console.log(`Successfully marked notification ${id} as read`);
      return response;
    } catch (error) {
      console.error(`Error marking notification ${id} as read:`, error);
      
      // If it's a JSON parse error, the API might still have processed the request
      // Let's try to continue gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('JSON Parse error')) {
        console.log('JSON parse error, but request might have succeeded');
        return null;
      }
      
      throw error;
    }
  },

  // Remove the PATCH method since it doesn't exist
  // markAsReadPatch: ...
  getUnreadCount: async (userId: number): Promise<number> => {
    try {
      const notifications = await notificationService.getByUserId(userId);
      return notifications.filter(n => n && !n.readStatus).length;
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  },
};