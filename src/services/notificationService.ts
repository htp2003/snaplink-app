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

  // Helper method to get notifications by user ID
  getByUserId: async (userId: number): Promise<NotificationApiResponse[]> => {
    const result = await notificationService.getAll();
    const notifications = Array.isArray(result) ? result : result.$values;
    return notifications.filter(notification => notification.userId === userId);
  },

  // Helper method to mark as read
  markAsRead: (id: number): Promise<NotificationData> => 
    apiClient.put<NotificationData>(ENDPOINTS.UPDATE(id), { readStatus: true }),

  // Helper method to get unread count for user
  getUnreadCount: async (userId: number): Promise<number> => {
    const notifications = await notificationService.getByUserId(userId);
    return notifications.filter(n => !n.readStatus).length;
  },
};