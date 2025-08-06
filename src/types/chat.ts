export enum MessageType {
    TEXT = 'text',
    IMAGE = 'image',
    VOICE = 'voice',
    BOOKING = 'booking',
    SYSTEM = 'system'
}

export enum MessageStatus {
    SENDING = 'sending',
    SENT = 'sent',
    DELIVERED = 'delivered',
    READ = 'read',
    FAILED = 'failed'
}

export enum ConversationType {
    DIRECT = 'direct',
    GROUP = 'group'
}

export enum ConversationStatus {
    ACTIVE = 'active',
    ARCHIVED = 'archived',
    BLOCKED = 'blocked',
    DELETED = 'deleted'
}

export enum ParticipantRole {
    ADMIN = 'admin',
    MEMBER = 'member',
    MODERATOR = 'moderator'
  }
  
  export enum UserRole {
    CUSTOMER = 'customer',
    PHOTOGRAPHER = 'photographer',
    LOCATION_OWNER = 'location_owner',
    ADMIN = 'admin'
  }
  
  // ===== MESSAGE INTERFACES =====
  
  export interface Message {
    messageId: number;
    senderId: number;
    recipientId?: number;
    conversationId?: number;
    content: string;
    createdAt: string;
    messageType: MessageType;
    status: MessageStatus;
    readAt?: string;
    senderName?: string;
    senderProfileImage?: string;
    
    // UI states (local only)
    isOptimistic?: boolean; // For optimistic updates
    localId?: string; // Temporary ID for sending messages
  }
  
  export interface MessageResponse {
    messageId: number;
    senderId: number;
    recipientId?: number;
    conversationId?: number;
    content: string;
    createdAt: string;
    messageType?: string;
    status?: string;
    readAt?: string;
    senderName?: string;
    senderProfileImage?: string;
  }
  
  // ===== CONVERSATION INTERFACES =====
  
  export interface ConversationParticipant {
    conversationParticipantId: number;
    conversationId: number;
    userId: number;
    joinedAt: string;
    leftAt?: string;
    role?: ParticipantRole;
    isActive: boolean;
    userName?: string;
    userProfileImage?: string;
    userFullName?: string;
  }
  
  export interface Conversation {
    conversationId: number;
    title: string;
    createdAt: string;
    updatedAt?: string;
    status: ConversationStatus;
    type: ConversationType;
    participants: ConversationParticipant[];
    lastMessage?: Message;
    unreadCount: number;
    
    // UI helpers
    otherParticipant?: ConversationParticipant; // For direct messages
    isOnline?: boolean;
    lastSeen?: string;
  }
  
  export interface ConversationResponse {
    conversationId: number;
    title?: string;
    createdAt: string;
    updatedAt?: string;
    status?: string;
    type?: string;
    participants?: ConversationParticipant[];
    lastMessage?: MessageResponse;
    unreadCount: number;
  }
  
  // ===== USER/PHOTOGRAPHER INTERFACES =====
  
  export interface ChatUser {
    userId: number;
    userName: string;
    fullName?: string;
    profileImage?: string;
    role: UserRole;
    isOnline?: boolean;
    lastSeen?: string;
    
    // For photographers
    photographerId?: number;
    specialization?: string;
    rating?: number;
    location?: string;
    isVerified?: boolean;
  }
  
  export interface PhotographerSearchResult {
    userId: number;
    photographerId: number;
    userName: string;
    fullName: string;
    profileImage?: string;
    specialization?: string;
    rating?: number;
    location?: string;
    isVerified: boolean;
    isOnline?: boolean;
    
    // For search context
    hasExistingConversation?: boolean;
    existingConversationId?: number;
  }
  
  // ===== REQUEST/RESPONSE INTERFACES =====
  
  export interface SendMessageRequest {
    recipientId: number;
    content: string;
    messageType?: MessageType;
    conversationId?: number;
  }
  
  export interface SendMessageResponse {
    success: boolean;
    message?: string;
    messageData?: MessageResponse;
    conversationId?: number;
  }
  
  export interface CreateConversationRequest {
    title: string;
    type: ConversationType;
    participantIds: number[];
    status?: ConversationStatus;
  }
  
  export interface CreateConversationResponse {
    success: boolean;
    message?: string;
    conversation?: ConversationResponse;
  }
  
  export interface MarkMessageAsReadRequest {
    messageId: number;
  }
  
  export interface AddParticipantRequest {
    conversationId: number;
    userId: number;
    role?: ParticipantRole;
  }
  
  export interface RemoveParticipantRequest {
    conversationId: number;
    userId: number;
  }
  
  // ===== PAGINATION INTERFACES =====
  
  export interface GetMessagesResponse {
    messages: MessageResponse[];
    totalCount: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }
  
  export interface GetConversationsResponse {
    conversations: ConversationResponse[];
    totalCount: number;
    page: number;
    pageSize: number;
  }
  
  // ===== SEARCH INTERFACES =====
  
  export interface ChatSearchResult {
    conversations: Conversation[];
    photographers: PhotographerSearchResult[];
    totalResults: number;
  }
  
  export interface SearchPhotographersParams {
    query: string;
    page?: number;
    pageSize?: number;
    location?: string;
    specialization?: string;
    minRating?: number;
  }
  
  // ===== HOOK OPTIONS =====
  
  export interface UseChatOptions {
    userId?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
    enableRealtime?: boolean;
    maxConversations?: number;
    maxMessagesPerConversation?: number;
  }
  
  export interface UseConversationOptions {
    conversationId: number;
    autoMarkAsRead?: boolean;
    loadHistoryOnMount?: boolean;
    maxMessages?: number;
    enableTypingIndicator?: boolean;
  }
  
  // ===== ERROR TYPES =====
  
  export interface ChatError {
    code: string;
    message: string;
    details?: string;
    timestamp: string;
  }
  
  export interface ChatValidationErrors {
    content?: string;
    recipientId?: string;
    conversationId?: string;
    title?: string;
    participantIds?: string;
  }
  
  // ===== TYPING INDICATOR =====
  
  export interface TypingIndicator {
    conversationId: number;
    userId: number;
    userName: string;
    isTyping: boolean;
    timestamp: string;
  }
  
  // ===== REAL-TIME EVENTS =====
  
  export interface ChatEvent {
    type: 'message_received' | 'message_read' | 'user_typing' | 'user_online' | 'conversation_updated';
    data: any;
    timestamp: string;
  }
  
  export interface MessageReceivedEvent {
    message: Message;
    conversationId: number;
  }
  
  export interface MessageReadEvent {
    messageId: number;
    conversationId: number;
    readBy: number;
    readAt: string;
  }
  
  export interface UserTypingEvent {
    conversationId: number;
    userId: number;
    userName: string;
    isTyping: boolean;
  }
  
  export interface UserOnlineEvent {
    userId: number;
    isOnline: boolean;
    lastSeen?: string;
  }
  
  // ===== STORAGE TYPES =====
  
  export interface ChatStorageData {
    conversations: Conversation[];
    lastSync: string;
    userId: number;
  }
  
  export interface MessageDraft {
    conversationId: number;
    content: string;
    timestamp: string;
  }
  
  // ===== BOOKING INTEGRATION =====
  
  export interface BookingChatContext {
    bookingId: number;
    photographerId: number;
    customerId: number;
    bookingDate: string;
    location?: string;
    status: string;
  }
  
  // ===== QUICK ACTIONS =====
  
  export interface QuickAction {
    id: string;
    label: string;
    icon: string;
    action: 'call' | 'view_profile' | 'view_booking' | 'share_location' | 'schedule_meeting';
    data?: any;
  }
  
  // ===== CHAT SETTINGS =====
  
  export interface ChatSettings {
    notifications: boolean;
    soundEnabled: boolean;
    readReceipts: boolean;
    typingIndicators: boolean;
    autoDownloadImages: boolean;
    theme: 'light' | 'dark' | 'auto';
  }
  
  // ===== UTILITY TYPES =====
  
  export type ConversationWithMessages = Conversation & {
    messages: Message[];
    hasMoreMessages: boolean;
    isLoadingMessages: boolean;
  };
  
  export type MessageWithSender = Message & {
    sender: ChatUser;
  };
  
  export type ConversationListItem = Pick<Conversation, 
    'conversationId' | 'title' | 'type' | 'unreadCount' | 'lastMessage'
  > & {
    otherParticipant?: Pick<ConversationParticipant, 'userName' | 'userProfileImage' | 'userFullName'>;
    lastMessageTime: string;
    isOnline?: boolean;
    isPinned?: boolean;
    isMuted?: boolean;
  };
  
  // ===== CONSTANTS =====
  
  export const CHAT_CONSTANTS = {
    MAX_MESSAGE_LENGTH: 1000,
    MAX_CONVERSATION_TITLE_LENGTH: 100,
    DEFAULT_MESSAGES_PER_PAGE: 20,
    DEFAULT_CONVERSATIONS_PER_PAGE: 20,
    TYPING_TIMEOUT: 3000, 
    MESSAGE_RETRY_ATTEMPTS: 3,
    RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 2000, 
  } as const;
  
  export const MESSAGE_STATUS_COLORS = {
    [MessageStatus.SENDING]: '#9E9E9E',
    [MessageStatus.SENT]: '#9E9E9E', 
    [MessageStatus.DELIVERED]: '#4CAF50',
    [MessageStatus.READ]: '#2196F3',
    [MessageStatus.FAILED]: '#F44336',
  } as const;
  
  export const CONVERSATION_STATUS_COLORS = {
    [ConversationStatus.ACTIVE]: '#4CAF50',
    [ConversationStatus.ARCHIVED]: '#9E9E9E',
    [ConversationStatus.BLOCKED]: '#F44336',
    [ConversationStatus.DELETED]: '#757575',
  } as const;
    
