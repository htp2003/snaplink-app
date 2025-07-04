
export interface UserProfile {
    $id: string;
    userId: number;
    userName: string;
    email: string;
    passwordHash: string;
    phoneNumber: string;
    fullName: string;
    profileImage: string;
    bio: string;
    createAt: string;
    updateAt: string;
    status: string;
    administrators: {
      $id: string;
      $values: UserAdministrator[];
    };
    bookings: {
      $id: string;
      $values: UserBooking[];
    };
    complaintReportedUsers: {
      $id: string;
      $values: UserComplaintReported[];
    };
    complaintReporters: {
      $id: string;
      $values: UserComplaintReporter[];
    };
    locationOwners: {
      $id: string;
      $values: UserLocationOwner[];
    };
    messagessRecipients: {
      $id: string;
      $values: UserMessageRecipient[];
    };
    messagessSenders: {
      $id: string;
      $values: UserMessageSender[];
    };
    moderators: {
      $id: string;
      $values: UserModerator[];
    };
    notifications: {
      $id: string;
      $values: UserNotification[];
    };
    photographers: {
      $id: string;
      $values: UserPhotographer[];
    };
    premiumSubscriptions: {
      $id: string;
      $values: UserPremiumSubscription[];
    };
    transactions: {
      $id: string;
      $values: UserTransaction[];
    };
    userRoles: {
      $id: string;
      $values: UserRole[];
    };
    userStyles: {
      $id: string;
      $values: UserStyle[];
    };
  }
  
  export interface UserAdministrator {
    id: number;
    userId: number;
    adminLevel: string;
    permissions: string;
    assignedDate: string;
  }
  
  export interface UserBooking {
    id: number;
    userId: number;
    photographerId: number;
    locationId: number;
    bookingDate: string;
    startTime: string;
    endTime: string;
    status: string;
    totalAmount: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    // Extended fields for display
    photographerName?: string;
    service?: string;
    rating?: number;
    locationName?: string;
  }
  
  export interface UserComplaintReported {
    id: number;
    reporterId: number;
    reportedUserId: number;
    complaintType: string;
    description: string;
    status: string;
    createdAt: string;
  }
  
  export interface UserComplaintReporter {
    id: number;
    reporterId: number;
    reportedUserId: number;
    complaintType: string;
    description: string;
    status: string;
    createdAt: string;
  }
  
  export interface UserLocationOwner {
    id: number;
    userId: number;
    businessName: string;
    businessAddress: string;
    businessRegistrationNumber: string;
    verificationStatus: string;
    createdAt: string;
  }
  
  export interface UserMessageRecipient {
    id: number;
    senderId: number;
    recipientId: number;
    content: string;
    messageType: string;
    isRead: boolean;
    createdAt: string;
  }
  
  export interface UserMessageSender {
    id: number;
    senderId: number;
    recipientId: number;
    content: string;
    messageType: string;
    isRead: boolean;
    createdAt: string;
  }
  
  export interface UserModerator {
    id: number;
    userId: number;
    moderatorLevel: string;
    assignedDate: string;
    permissions: string;
  }
  
  export interface UserNotification {
    id: number;
    userId: number;
    title: string;
    content: string;
    notificationType: string;
    referenceId?: number;
    readStatus: boolean;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface UserPhotographer {
    id: number;
    userId: number;
    yearsExperience: number;
    equipment: string;
    specialty: string;
    portfolioUrl: string;
    hourlyRate: number;
    availabilityStatus: string;
    rating: number;
    ratingSum: number;
    ratingCount: number;
    featuredStatus: boolean;
    verificationStatus: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface UserPremiumSubscription {
    id: number;
    userId: number;
    planName: string;
    planType: string;
    startDate: string;
    endDate: string;
    status: string;
    amount: number;
    features: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface UserTransaction {
    id: number;
    userId: number;
    bookingId?: number;
    amount: number;
    transactionDate: string;
    status: string;
    description: string;
    transactionType: string;
    paymentMethod: string;
    referenceId?: string;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface UserRole {
    id: number;
    userId: number;
    roleId: number;
    roleName: string;
    assignedDate: string;
    isActive: boolean;
  }
  
  export interface UserStyle {
    id: number;
    userId: number;
    styleId: number;
    styleName: string;
    assignedDate: string;
  }
  
  // DTOs for API requests
  export interface CreateUserDto {
    userName: string;
    email: string;
    passwordHash: string;
    fullName: string;
    phoneNumber: string;
    bio?: string;
    profileImage?: string;
  }
  
  export interface UpdateUserDto {
    userId: number;
    fullName?: string;
    phoneNumber?: string;
    passwordHash?: string;
    bio?: string;
    profileImage?: string;
  }
  
  // Response types
  export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: string[];
  }
  
  export interface PaginatedResponse<T> {
    data: T[];
    totalCount: number;
    pageNumber: number;
    pageSize: number;
    totalPages: number;
  }
  
  // Helper types for statistics
  export interface CustomerStats {
    totalBookings: number;
    completedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    totalSpent: number;
    averageBookingValue: number;
    memberSince: string;
    hasActiveSubscription: boolean;
    subscriptionType?: string;
    subscriptionExpiresAt?: string;
    unreadNotifications: number;
    favoritePhotographers: number;
    totalReviews: number;
    averageRatingGiven: number;
  }
  
  // Status enums
  export enum UserStatus {
    ACTIVE = 'Active',
    INACTIVE = 'Inactive',
    SUSPENDED = 'Suspended',
    BANNED = 'Banned'
  }
  
  export enum BookingStatus {
    PENDING = 'Pending',
    CONFIRMED = 'Confirmed',
    COMPLETED = 'Completed',
    CANCELLED = 'Cancelled',
    REFUNDED = 'Refunded'
  }
  
  export enum TransactionStatus {
    PENDING = 'Pending',
    COMPLETED = 'Completed',
    FAILED = 'Failed',
    REFUNDED = 'Refunded',
    CANCELLED = 'Cancelled'
  }
  
  export enum TransactionType {
    BOOKING_PAYMENT = 'BookingPayment',
    SUBSCRIPTION_PAYMENT = 'SubscriptionPayment',
    REFUND = 'Refund',
    BONUS = 'Bonus',
    PENALTY = 'Penalty'
  }
  
  export enum NotificationType {
    BOOKING = 'Booking',
    PAYMENT = 'Payment',
    REVIEW = 'Review',
    SYSTEM = 'System',
    PROMOTION = 'Promotion',
    REMINDER = 'Reminder'
  }
  
  export enum VerificationStatus {
    PENDING = 'Pending',
    VERIFIED = 'Verified',
    REJECTED = 'Rejected',
    EXPIRED = 'Expired'
  }