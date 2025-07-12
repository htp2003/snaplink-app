// services/userService.ts

import { 
  UserProfile, 
  CreateUserDto, 
  UpdateUserDto, 
  CustomerStats,
  BookingStatus,
  TransactionStatus,
  NotificationType,
  UserBooking,
  UserTransaction,
  UserNotification
} from '../types/userProfile';
import { apiClient } from './base';

// User endpoints
const ENDPOINTS = {
  ALL: '/api/User/all',
  BY_ID: (id: number) => `/api/User/${id}`,
  BY_ROLE: (roleName: string) => `/api/User/by-role/${roleName}`,
  CREATE_ADMIN: '/api/User/create-admin',
  CREATE_USER: '/api/User/create-user',
  CREATE_PHOTOGRAPHER: '/api/User/create-photographer',
  CREATE_LOCATION_OWNER: '/api/User/create-locationowner',
  CREATE_MODERATOR: '/api/User/create-moderator',
  UPDATE: '/api/User/update',
  DELETE: (id: number) => `/api/User/delete/${id}`,
};

export class UserService {

  
  // Get all users
  async getAllUsers(): Promise<UserProfile[]> {
    return apiClient.get<UserProfile[]>(ENDPOINTS.ALL);
  }

  // Get user by ID
  async getUserById(userId: number): Promise<UserProfile> {
    console.log('🔍 userService.getUserById called with:', userId);
    console.log('🔍 API endpoint will be:', ENDPOINTS.BY_ID(userId));
    
    try {
      const result = await apiClient.get<UserProfile>(ENDPOINTS.BY_ID(userId));
      console.log('✅ API response:', result);
      return result;
    } catch (error) {
      console.error('❌ userService.getUserById error:', error);
      throw error;
    }
  }

  // Get users by role
  async getUsersByRole(roleName: string): Promise<UserProfile[]> {
    return apiClient.get<UserProfile[]>(ENDPOINTS.BY_ROLE(roleName));
  }

  // Create admin user
  async createAdmin(userData: CreateUserDto): Promise<UserProfile> {
    return apiClient.post<UserProfile>(ENDPOINTS.CREATE_ADMIN, userData);
  }

  // Create regular user
  async createUser(userData: CreateUserDto): Promise<UserProfile> {
    return apiClient.post<UserProfile>(ENDPOINTS.CREATE_USER, userData);
  }

  // Create photographer user
  async createPhotographer(userData: CreateUserDto): Promise<UserProfile> {
    return apiClient.post<UserProfile>(ENDPOINTS.CREATE_PHOTOGRAPHER, userData);
  }

  // Create location owner user
  async createLocationOwner(userData: CreateUserDto): Promise<UserProfile> {
    return apiClient.post<UserProfile>(ENDPOINTS.CREATE_LOCATION_OWNER, userData);
  }

  // Create moderator user
  async createModerator(userData: CreateUserDto): Promise<UserProfile> {
    return apiClient.post<UserProfile>(ENDPOINTS.CREATE_MODERATOR, userData);
  }

  // Update user
  async updateUser(userData: UpdateUserDto): Promise<UserProfile> {
    return apiClient.put<UserProfile>(ENDPOINTS.UPDATE, userData);
  }

  // Delete user
  async deleteUser(userId: number): Promise<void> {
    return apiClient.delete<void>(ENDPOINTS.DELETE(userId));
  }

  // Helper methods for profile management
  async updateProfile(userId: number, updates: {
    fullName?: string;
    phoneNumber?: string;
    bio?: string;
    profileImage?: string;
  }): Promise<UserProfile> {
    return this.updateUser({
      userId,
      ...updates,
    });
  }

  async changePassword(userId: number, newPassword: string): Promise<UserProfile> {
    return this.updateUser({
      userId,
      passwordHash: newPassword,
    });
  }

  async updateProfileImage(userId: number, imageUri: string): Promise<UserProfile> {
    return this.updateUser({
      userId,
      profileImage: imageUri,
    });
  }

  // Statistics and analytics methods
  calculateUserStats(user: UserProfile): CustomerStats {
    const bookings = user.bookings?.$values || [];
    const transactions = user.transactions?.$values || [];
    const premiumSubscriptions = user.premiumSubscriptions?.$values || [];
    const notifications = user.notifications?.$values || [];
    
    // Booking statistics
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => 
      b.status === BookingStatus.COMPLETED
    ).length;
    const pendingBookings = bookings.filter(b => 
      b.status === BookingStatus.PENDING
    ).length;
    const cancelledBookings = bookings.filter(b => 
      b.status === BookingStatus.CANCELLED
    ).length;

    // Financial statistics
    const completedTransactions = transactions.filter(t => 
      t.status === TransactionStatus.COMPLETED
    );
    const totalSpent = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
    const averageBookingValue = completedBookings > 0 ? totalSpent / completedBookings : 0;

    // Membership info
    const memberSince = new Date(user.createAt).getFullYear().toString();
    const activeSubscription = premiumSubscriptions.find(sub => 
      sub.status.toLowerCase() === 'active' && new Date(sub.endDate) > new Date()
    );
    const hasActiveSubscription = !!activeSubscription;

    // Notification statistics
    const unreadNotifications = notifications.filter(n => !n.readStatus).length;

    // Additional metrics
    const favoritePhotographers = user.photographers?.$values?.length || 0;
    const totalReviews = 0; // Would need to implement review counting
    const averageRatingGiven = 0; // Would need to implement rating calculation

    return {
      totalBookings,
      completedBookings,
      pendingBookings,
      cancelledBookings,
      totalSpent,
      averageBookingValue,
      memberSince,
      hasActiveSubscription,
      subscriptionType: activeSubscription?.planName,
      subscriptionExpiresAt: activeSubscription?.endDate,
      unreadNotifications,
      favoritePhotographers,
      totalReviews,
      averageRatingGiven,
    };
  }

  // User role and permission helpers
  getUserRoles(user: UserProfile): string[] {
    return user.userRoles?.$values?.map(role => role.roleName) || [];
  }

  getUserStyles(user: UserProfile): string[] {
    return user.userStyles?.$values?.map(style => style.styleName) || [];
  }

  hasRole(user: UserProfile, roleName: string): boolean {
    return this.getUserRoles(user).includes(roleName);
  }

  isPhotographer(user: UserProfile): boolean {
    return this.hasRole(user, 'Photographer') || (user.photographers?.$values?.length || 0) > 0;
  }

  isLocationOwner(user: UserProfile): boolean {
    return this.hasRole(user, 'LocationOwner') || (user.locationOwners?.$values?.length || 0) > 0;
  }

  isAdmin(user: UserProfile): boolean {
    return this.hasRole(user, 'Admin') || (user.administrators?.$values?.length || 0) > 0;
  }

  isModerator(user: UserProfile): boolean {
    return this.hasRole(user, 'Moderator') || (user.moderators?.$values?.length || 0) > 0;
  }

  // Booking helpers
  getRecentBookings(user: UserProfile, limit: number = 10): UserBooking[] {
    const bookings = user.bookings?.$values || [];
    return bookings
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  getBookingsByStatus(user: UserProfile, status: BookingStatus): UserBooking[] {
    const bookings = user.bookings?.$values || [];
    return bookings.filter(booking => booking.status === status);
  }

  // Transaction helpers
  getRecentTransactions(user: UserProfile, limit: number = 10): UserTransaction[] {
    const transactions = user.transactions?.$values || [];
    return transactions
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  getTransactionsByStatus(user: UserProfile, status: TransactionStatus): UserTransaction[] {
    const transactions = user.transactions?.$values || [];
    return transactions.filter(transaction => transaction.status === status);
  }

  // Notification helpers
  getUnreadNotifications(user: UserProfile): UserNotification[] {
    const notifications = user.notifications?.$values || [];
    return notifications.filter(notification => !notification.readStatus);
  }

  getNotificationsByType(user: UserProfile, type: NotificationType): UserNotification[] {
    const notifications = user.notifications?.$values || [];
    return notifications.filter(notification => notification.notificationType === type);
  }

  // Subscription helpers
  getActiveSubscription(user: UserProfile) {
    const subscriptions = user.premiumSubscriptions?.$values || [];
    return subscriptions.find(sub => 
      sub.status.toLowerCase() === 'active' && new Date(sub.endDate) > new Date()
    );
  }

  hasActiveSubscription(user: UserProfile): boolean {
    return !!this.getActiveSubscription(user);
  }

  // Verification helpers
  isVerified(user: UserProfile): boolean {
    return user.status === 'Active';
  }

  getVerificationStatus(user: UserProfile): string {
    return user.status;
  }

  // Profile completion helpers
  getProfileCompletionPercentage(user: UserProfile): number {
    const fields = [
      user.fullName,
      user.email,
      user.phoneNumber,
      user.bio,
      user.profileImage,
    ];
    
    const completedFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  }

  isProfileComplete(user: UserProfile): boolean {
    return this.getProfileCompletionPercentage(user) >= 80;
  }

  // Date helpers
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Time calculations
  getMembershipDuration(user: UserProfile): number {
    const createdAt = new Date(user.createAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  getMembershipDurationFormatted(user: UserProfile): string {
    const days = this.getMembershipDuration(user);
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    
    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} ${months > 0 ? `${months} month${months > 1 ? 's' : ''}` : ''}`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''}`;
    } else {
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  }
}

// Export singleton instance
export const userService = new UserService();