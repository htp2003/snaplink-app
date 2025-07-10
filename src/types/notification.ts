export interface NotificationData {
    motificationId: number;
    userId: number;
    title: string;
    content: string;
    notificationType: string;
    referenceId: number;
    readStatus: boolean;
    createdAt: string;
    user: {
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
      administrators: any[];
      bookings: any[];
      complaintReportedUsers: any[];
      complaintReporters: any[];
      locationOwners: any[];
      messagessRecipients: any[];
      messagessSenders: any[];
      moderators: any[];
      notifications: any[];
      photographers: any[];
      premiumSubscriptions: any[];
      transactions: any[];
      userRoles: any[];
      userStyles: any[];
    };
  }
  
  export interface NotificationDto {
    userId: number;
    title: string;
    content: string;
    notificationType: string;
    referenceId?: number;
    readStatus?: boolean;
  }
  
  export interface UpdateNotificationDto {
    title?: string;
    content?: string;
    notificationType?: string;
    referenceId?: number;
    readStatus?: boolean;
  }
  
  export interface NotificationApiResponse extends NotificationData {}