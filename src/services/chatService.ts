import { apiClient } from "./base";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Message,
  MessageResponse,
  Conversation,
  ConversationResponse,
  ConversationParticipant,
  SendMessageRequest,
  SendMessageResponse,
  CreateConversationRequest,
  CreateConversationResponse,
  MarkMessageAsReadRequest,
  AddParticipantRequest,
  RemoveParticipantRequest,
  GetMessagesResponse,
  GetConversationsResponse,
  PhotographerSearchResult,
  ChatSearchResult,
  SearchPhotographersParams,
  ChatUser,
  MessageType,
  MessageStatus,
  ConversationType,
  ConversationStatus,
  UserRole,
} from "../types/chat";

// ===== API ENDPOINTS =====
const CHAT_ENDPOINTS = {
  // Messages
  SEND_MESSAGE: "/api/Chat/send-message",
  GET_MESSAGE: (messageId: number) => `/api/chat/messages/${messageId}`,
  DELETE_MESSAGE: (messageId: number) => `/api/chat/messages/${messageId}`,
  MARK_READ: (messageId: number) => `/api/chat/messages/${messageId}/mark-read`,

  // Conversations
  CREATE_CONVERSATION: "/api/chat/conversations",
  GET_CONVERSATIONS: "/api/chat/conversations",
  GET_CONVERSATION: (conversationId: number) =>
    `/api/chat/conversations/${conversationId}`,
  UPDATE_CONVERSATION: (conversationId: number) =>
    `/api/chat/conversations/${conversationId}`,
  DELETE_CONVERSATION: (conversationId: number) =>
    `/api/chat/conversations/${conversationId}`,
  GET_CONVERSATION_MESSAGES: (conversationId: number) =>
    `/api/chat/conversations/${conversationId}/messages`,

  // Participants
  ADD_PARTICIPANT: (conversationId: number) =>
    `/api/chat/conversations/${conversationId}/participants`,
  REMOVE_PARTICIPANT: (conversationId: number) =>
    `/api/chat/conversations/${conversationId}/participants`,
  GET_PARTICIPANTS: (conversationId: number) =>
    `/api/chat/conversations/${conversationId}/participants`,
  LEAVE_CONVERSATION: (conversationId: number) =>
    `/api/chat/conversations/${conversationId}/leave`,

  // Utilities
  GET_UNREAD_COUNT: (conversationId: number) =>
    `/api/chat/conversations/${conversationId}/unread-count`,
  IS_PARTICIPANT: (conversationId: number) =>
    `/api/chat/conversations/${conversationId}/is-participant`,
  GET_DIRECT_CONVERSATION: "/api/chat/direct-conversation",

  // Search (using existing photographer endpoints)
  SEARCH_PHOTOGRAPHERS: "/api/Photographer",
  GET_PHOTOGRAPHER_DETAIL: (photographerId: number) =>
    `/api/Photographer/${photographerId}`,
  GET_ALL_PHOTOGRAPHERS: "/api/Photographer",
} as const;

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";
export class ChatService {
  // ===== MESSAGE METHODS =====
  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem("token");

      return token;
    } catch (error) {
      console.error("❌ Error getting token from AsyncStorage:", error);
      return null;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: "DELETE" });
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit
  ): Promise<T> {
    const token = await this.getAuthToken();

    if (!token) {
      throw new Error("No authentication token found. Please login again.");
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ ChatService API Error:", {
        status: response.status,
        statusText: response.statusText,
        body: errorData,
      });
      throw new Error(`API Error: ${response.status} - ${errorData}`);
    }

    return response.json();
  }

  async sendMessage(
    messageData: SendMessageRequest
  ): Promise<SendMessageResponse> {
    try {
      // Validate input
      if (!messageData.recipientId || messageData.recipientId <= 0) {
        throw new Error("Recipient ID is required");
      }

      if (!messageData.content || messageData.content.trim() === "") {
        throw new Error("Message content cannot be empty");
      }

      if (messageData.content.length > 1000) {
        throw new Error("Message content too long (max 1000 characters)");
      }

      // Prepare payload
      const payload = {
        recipientId: messageData.recipientId,
        content: messageData.content.trim(),
        // messageType: messageData.messageType || "Text", 
        // conversationId: messageData.conversationId || undefined,
      };

      // ✅ USE UNIFIED makeRequest method instead of apiClient
      const response = await this.post<SendMessageResponse>(
        CHAT_ENDPOINTS.SEND_MESSAGE,
        payload
      );

      return response;
    } catch (error) {
      console.error("❌ ChatService.sendMessage error:", error);
      throw error;
    }
  }

  async getMessage(messageId: number): Promise<MessageResponse> {
    try {
      if (!messageId || messageId <= 0) {
        throw new Error("Invalid message ID");
      }

      const response = await apiClient.get<MessageResponse>(
        CHAT_ENDPOINTS.GET_MESSAGE(messageId)
      );

      return response;
    } catch (error) {
      console.error("❌ Error fetching message:", error);
      throw error;
    }
  }

  async deleteMessage(messageId: number): Promise<void> {
    try {
      if (!messageId || messageId <= 0) {
        throw new Error("Invalid message ID");
      }

      await apiClient.delete(CHAT_ENDPOINTS.DELETE_MESSAGE(messageId));
    } catch (error) {
      console.error("❌ Error deleting message:", error);
      throw error;
    }
  }

  async markMessageAsRead(messageId: number): Promise<void> {
    try {
      if (!messageId || messageId <= 0) {
        throw new Error("Invalid message ID");
      }

      const payload: MarkMessageAsReadRequest = {
        messageId,
      };

      const response = await this.post(
        CHAT_ENDPOINTS.MARK_READ(messageId),
        payload
      );
    } catch (error) {
      console.error("❌ Error marking message as read:", {
        messageId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  // ===== CONVERSATION METHODS =====

  async getConversations(
    page: number = 1,
    pageSize: number = 20
  ): Promise<GetConversationsResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const response = await apiClient.get<GetConversationsResponse>(
        `${CHAT_ENDPOINTS.GET_CONVERSATIONS}?${params}`
      );

      return response;
    } catch (error) {
      console.error("❌ Error fetching conversations:", error);
      throw error;
    }
  }

  async getConversation(conversationId: number): Promise<ConversationResponse> {
    try {
      if (!conversationId || conversationId <= 0) {
        throw new Error("Invalid conversation ID");
      }

      const response = await apiClient.get<ConversationResponse>(
        CHAT_ENDPOINTS.GET_CONVERSATION(conversationId)
      );

      return response;
    } catch (error) {
      console.error("❌ Error fetching conversation:", error);
      throw error;
    }
  }

  async getConversationMessages(
    conversationId: number,
    page: number = 1,
    pageSize: number = 20
  ): Promise<GetMessagesResponse> {
    try {
      if (!conversationId || conversationId <= 0) {
        throw new Error("Invalid conversation ID");
      }

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const response = await apiClient.get<GetMessagesResponse>(
        `${CHAT_ENDPOINTS.GET_CONVERSATION_MESSAGES(conversationId)}?${params}`
      );

      return response;
    } catch (error) {
      console.error("❌ Error fetching conversation messages:", error);
      throw error;
    }
  }

  async createConversation(
    conversationData: CreateConversationRequest
  ): Promise<CreateConversationResponse> {
    try {
      // Validate input
      if (!conversationData.title || conversationData.title.trim() === "") {
        throw new Error("Conversation title is required");
      }

      if (
        !conversationData.participantIds ||
        conversationData.participantIds.length === 0
      ) {
        throw new Error("At least one participant is required");
      }

      if (conversationData.participantIds.some((id) => id <= 0)) {
        throw new Error("Invalid participant IDs");
      }

      const payload = {
        title: conversationData.title.trim(),
        type: conversationData.type || ConversationType.DIRECT,
        participantIds: conversationData.participantIds,
        status: conversationData.status || ConversationStatus.ACTIVE,
      };

      const response = await apiClient.post<CreateConversationResponse>(
        CHAT_ENDPOINTS.CREATE_CONVERSATION,
        payload
      );

      return response;
    } catch (error) {
      console.error("❌ Error creating conversation:", error);
      throw error;
    }
  }

  async updateConversation(
    conversationId: number,
    title?: string,
    status?: string
  ): Promise<void> {
    try {
      if (!conversationId || conversationId <= 0) {
        throw new Error("Invalid conversation ID");
      }

      const params = new URLSearchParams();
      if (title) params.append("title", title);
      if (status) params.append("status", status);

      await apiClient.put(
        `${CHAT_ENDPOINTS.UPDATE_CONVERSATION(conversationId)}?${params}`
      );
    } catch (error) {
      console.error("❌ Error updating conversation:", error);
      throw error;
    }
  }

  async deleteConversation(conversationId: number): Promise<void> {
    try {
      if (!conversationId || conversationId <= 0) {
        throw new Error("Invalid conversation ID");
      }

      await apiClient.delete(
        CHAT_ENDPOINTS.DELETE_CONVERSATION(conversationId)
      );
    } catch (error) {
      console.error("❌ Error deleting conversation:", error);
      throw error;
    }
  }

  // ===== PARTICIPANT METHODS =====

  async addParticipant(participantData: AddParticipantRequest): Promise<void> {
    try {
      if (
        !participantData.conversationId ||
        participantData.conversationId <= 0
      ) {
        throw new Error("Invalid conversation ID");
      }

      if (!participantData.userId || participantData.userId <= 0) {
        throw new Error("Invalid user ID");
      }

      await apiClient.post(
        CHAT_ENDPOINTS.ADD_PARTICIPANT(participantData.conversationId),
        participantData
      );
    } catch (error) {
      console.error("❌ Error adding participant:", error);
      throw error;
    }
  }

  async removeParticipant(
    participantData: RemoveParticipantRequest
  ): Promise<void> {
    try {
      if (
        !participantData.conversationId ||
        participantData.conversationId <= 0
      ) {
        throw new Error("Invalid conversation ID");
      }

      if (!participantData.userId || participantData.userId <= 0) {
        throw new Error("Invalid user ID");
      }

      await apiClient.delete(
        CHAT_ENDPOINTS.REMOVE_PARTICIPANT(participantData.conversationId)
      );
    } catch (error) {
      console.error("❌ Error removing participant:", error);
      throw error;
    }
  }

  async getParticipants(
    conversationId: number
  ): Promise<ConversationParticipant[]> {
    try {
      if (!conversationId || conversationId <= 0) {
        throw new Error("Invalid conversation ID");
      }

      const response = await apiClient.get<ConversationParticipant[]>(
        CHAT_ENDPOINTS.GET_PARTICIPANTS(conversationId)
      );

      return response;
    } catch (error) {
      console.error("❌ Error fetching participants:", error);
      throw error;
    }
  }

  async leaveConversation(conversationId: number): Promise<void> {
    try {
      if (!conversationId || conversationId <= 0) {
        throw new Error("Invalid conversation ID");
      }

      await apiClient.post(CHAT_ENDPOINTS.LEAVE_CONVERSATION(conversationId));
    } catch (error) {
      console.error("❌ Error leaving conversation:", error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  async getUnreadCount(conversationId: number): Promise<number> {
    try {
      if (!conversationId || conversationId <= 0) {
        throw new Error("Invalid conversation ID");
      }

      const response = await apiClient.get<number>(
        CHAT_ENDPOINTS.GET_UNREAD_COUNT(conversationId)
      );

      return response;
    } catch (error) {
      console.error("❌ Error getting unread count:", error);
      throw error;
    }
  }

  async isParticipant(conversationId: number): Promise<boolean> {
    try {
      if (!conversationId || conversationId <= 0) {
        throw new Error("Invalid conversation ID");
      }

      const response = await apiClient.get<boolean>(
        CHAT_ENDPOINTS.IS_PARTICIPANT(conversationId)
      );

      return response;
    } catch (error) {
      console.error("❌ Error checking participant status:", error);
      throw error;
    }
  }

  async getDirectConversation(
    otherUserId: number
  ): Promise<ConversationResponse> {
    try {
      if (!otherUserId || otherUserId <= 0) {
        throw new Error("Invalid user ID");
      }

      const params = new URLSearchParams({
        otherUserId: otherUserId.toString(),
      });

      const response = await apiClient.get<ConversationResponse>(
        `${CHAT_ENDPOINTS.GET_DIRECT_CONVERSATION}?${params}`
      );

      return response;
    } catch (error) {
      console.error("❌ Error getting direct conversation:", error);
      throw error;
    }
  }

  // ===== SEARCH METHODS =====

  async searchPhotographers(
    params: SearchPhotographersParams
  ): Promise<PhotographerSearchResult[]> {
    try {
      if (!params.query || params.query.trim() === "") {
        throw new Error("Search query is required");
      }

      // Use existing photographer search endpoint
      const searchParams = new URLSearchParams({
        search: params.query.trim(),
        page: (params.page || 1).toString(),
        pageSize: (params.pageSize || 20).toString(),
      });

      if (params.location) searchParams.append("location", params.location);
      if (params.specialization)
        searchParams.append("specialization", params.specialization);
      if (params.minRating)
        searchParams.append("minRating", params.minRating.toString());

      const response = await apiClient.get<any[]>(
        `${CHAT_ENDPOINTS.SEARCH_PHOTOGRAPHERS}?${searchParams}`
      );

      // Transform photographer data to chat search result format
      const photographers: PhotographerSearchResult[] = response.map(
        (photographer) => ({
          userId: photographer.userId,
          photographerId: photographer.id || photographer.photographerId,
          userName: photographer.userName || photographer.user?.userName || "",
          fullName: photographer.fullName || photographer.user?.fullName || "",
          profileImage:
            photographer.profileImage || photographer.user?.profileImage,
          specialization: photographer.specialization || "Photography",
          rating: photographer.rating || 0,
          location: photographer.location || photographer.address,
          isVerified:
            photographer.verificationStatus === "verified" ||
            photographer.isVerified ||
            false,
          isOnline: false, // Will be updated by real-time service
          hasExistingConversation: false, // Will be checked separately
          existingConversationId: undefined,
        })
      );

      return photographers;
    } catch (error) {
      console.error("❌ Error searching photographers:", error);
      throw error;
    }
  }

  async getAllPhotographers(
    page: number = 1,
    pageSize: number = 20
  ): Promise<PhotographerSearchResult[]> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      const response = await apiClient.get<any[]>(
        `${CHAT_ENDPOINTS.GET_ALL_PHOTOGRAPHERS}?${params}`
      );

      // Transform photographer data
      const photographers: PhotographerSearchResult[] = response.map(
        (photographer) => ({
          userId: photographer.userId,
          photographerId: photographer.id || photographer.photographerId,
          userName: photographer.userName || photographer.user?.userName || "",
          fullName: photographer.fullName || photographer.user?.fullName || "",
          profileImage:
            photographer.profileImage || photographer.user?.profileImage,
          specialization: photographer.specialization || "Photography",
          rating: photographer.rating || 0,
          location: photographer.location || photographer.address,
          isVerified:
            photographer.verificationStatus === "verified" ||
            photographer.isVerified ||
            false,
          isOnline: false,
          hasExistingConversation: false,
          existingConversationId: undefined,
        })
      );

      return photographers;
    } catch (error) {
      console.error("❌ Error getting all photographers:", error);
      throw error;
    }
  }

  async searchConversationsAndPhotographers(
    query: string
  ): Promise<ChatSearchResult> {
    try {
      if (!query || query.trim() === "") {
        return {
          conversations: [],
          photographers: [],
          totalResults: 0,
        };
      }

      const trimmedQuery = query.trim();

      // Search in conversations (by title or participant name)
      const conversationsResponse = await this.getConversations(1, 50); // Get more for filtering
      const filteredConversations =
        conversationsResponse.conversations
          ?.filter((conv) => {
            const titleMatch = conv.title
              ?.toLowerCase()
              .includes(trimmedQuery.toLowerCase());
            const participantMatch = conv.participants?.some(
              (p) =>
                p.userName
                  ?.toLowerCase()
                  .includes(trimmedQuery.toLowerCase()) ||
                p.userFullName
                  ?.toLowerCase()
                  .includes(trimmedQuery.toLowerCase())
            );
            return titleMatch || participantMatch;
          })
          .map(this.normalizeConversationResponse) || [];

      // Search photographers
      const photographers = await this.searchPhotographers({
        query: trimmedQuery,
        page: 1,
        pageSize: 20,
      });

      // Check for existing conversations with found photographers
      const photographersWithConversations = await Promise.all(
        photographers.map(async (photographer) => {
          try {
            const directConv = await this.getDirectConversation(
              photographer.userId
            );
            return {
              ...photographer,
              hasExistingConversation: true,
              existingConversationId: directConv.conversationId,
            };
          } catch {
            return photographer; // No existing conversation
          }
        })
      );

      const result: ChatSearchResult = {
        conversations: filteredConversations,
        photographers: photographersWithConversations,
        totalResults:
          filteredConversations.length + photographersWithConversations.length,
      };

      return result;
    } catch (error) {
      console.error("❌ Error in combined search:", error);
      throw error;
    }
  }

  // ===== DATA NORMALIZATION METHODS =====

  normalizeMessageResponse(messageResponse: MessageResponse): Message {
    return {
      messageId: messageResponse.messageId,
      senderId: messageResponse.senderId,
      recipientId: messageResponse.recipientId,
      conversationId: messageResponse.conversationId,
      content: messageResponse.content,
      createdAt: messageResponse.createdAt,
      messageType:
        (messageResponse.messageType as MessageType) || MessageType.TEXT,
      status: (messageResponse.status as MessageStatus) || MessageStatus.SENT,
      readAt: messageResponse.readAt,
      senderName: messageResponse.senderName,
      senderProfileImage: messageResponse.senderProfileImage,
    };
  }

  normalizeConversationResponse(
    conversationResponse: ConversationResponse
  ): Conversation {
    const participants = conversationResponse.participants || [];

    // For direct conversations, identify the other participant
    let otherParticipant: ConversationParticipant | undefined;
    if (
      conversationResponse.type === ConversationType.DIRECT &&
      participants.length === 2
    ) {
      // This would need current user ID - should be passed from hook/component
      otherParticipant = participants[0]; // Simplified for now
    }

    return {
      conversationId: conversationResponse.conversationId,
      title: conversationResponse.title || "",
      createdAt: conversationResponse.createdAt,
      updatedAt: conversationResponse.updatedAt,
      status:
        (conversationResponse.status as ConversationStatus) ||
        ConversationStatus.ACTIVE,
      type:
        (conversationResponse.type as ConversationType) ||
        ConversationType.DIRECT,
      participants: participants,
      lastMessage: conversationResponse.lastMessage
        ? this.normalizeMessageResponse(conversationResponse.lastMessage)
        : undefined,
      unreadCount: conversationResponse.unreadCount || 0,
      otherParticipant,
      isOnline: false, // Will be updated by real-time service
      lastSeen: undefined,
    };
  }

  // ===== UTILITY METHODS =====

  validateMessageContent(content: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!content || content.trim() === "") {
      return { isValid: false, error: "Message content cannot be empty" };
    }

    if (content.length > 1000) {
      return {
        isValid: false,
        error: "Message too long (max 1000 characters)",
      };
    }

    return { isValid: true };
  }

  validateConversationTitle(title: string): {
    isValid: boolean;
    error?: string;
  } {
    if (!title || title.trim() === "") {
      return { isValid: false, error: "Conversation title cannot be empty" };
    }

    if (title.length > 100) {
      return { isValid: false, error: "Title too long (max 100 characters)" };
    }

    return { isValid: true };
  }

  getMessageStatusIcon(status: MessageStatus): string {
    switch (status) {
      case MessageStatus.SENDING:
        return "⏳";
      case MessageStatus.SENT:
        return "✓";
      case MessageStatus.DELIVERED:
        return "✓✓";
      case MessageStatus.READ:
        return "✓✓";
      case MessageStatus.FAILED:
        return "⚠️";
      default:
        return "";
    }
  }

  getConversationTypeIcon(type: ConversationType): string {
    switch (type) {
      case ConversationType.DIRECT:
        return "💬";
      case ConversationType.GROUP:
        return "👥";
      default:
        return "💬";
    }
  }

  formatLastSeen(lastSeen: string): string {
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now.getTime() - lastSeenDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return lastSeenDate.toLocaleDateString();
  }

  formatMessageTime(createdAt: string): string {
    const messageDate = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - messageDate.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d`;

    return messageDate.toLocaleDateString();
  }

  // ===== MOCK DATA FOR DEVELOPMENT =====

  generateMockConversations(count: number = 10): Conversation[] {
    const mockConversations: Conversation[] = [];

    for (let i = 1; i <= count; i++) {
      const isGroup = i % 4 === 0; // Every 4th conversation is a group

      mockConversations.push({
        conversationId: i,
        title: isGroup
          ? `Wedding Planning Team ${i}`
          : `John Photographer ${i}`,
        createdAt: new Date(Date.now() - i * 86400000).toISOString(), // i days ago
        status: ConversationStatus.ACTIVE,
        type: isGroup ? ConversationType.GROUP : ConversationType.DIRECT,
        participants: [
          {
            conversationParticipantId: i * 10,
            conversationId: i,
            userId: 100 + i,
            joinedAt: new Date(Date.now() - i * 86400000).toISOString(),
            isActive: true,
            userName: `photographer${i}`,
            userFullName: `John Photographer ${i}`,
            userProfileImage: `https://picsum.photos/50/50?random=${i}`,
          },
        ],
        lastMessage: {
          messageId: i * 100,
          senderId: 100 + i,
          conversationId: i,
          content: `This is the last message in conversation ${i}`,
          createdAt: new Date(Date.now() - i * 3600000).toISOString(), // i hours ago
          messageType: MessageType.TEXT,
          status: MessageStatus.READ,
          senderName: `John Photographer ${i}`,
        },
        unreadCount: i % 3 === 0 ? i % 5 : 0, // Some conversations have unread messages
        isOnline: i % 3 === 0,
        lastSeen: new Date(Date.now() - i * 1800000).toISOString(), // i * 30 minutes ago
      });
    }

    return mockConversations;
  }

  generateMockPhotographers(count: number = 20): PhotographerSearchResult[] {
    const specializations = [
      "Wedding",
      "Portrait",
      "Event",
      "Fashion",
      "Landscape",
      "Street",
    ];
    const locations = [
      "Ho Chi Minh City",
      "Hanoi",
      "Da Nang",
      "Can Tho",
      "Hue",
    ];

    const mockPhotographers: PhotographerSearchResult[] = [];

    for (let i = 1; i <= count; i++) {
      mockPhotographers.push({
        userId: 200 + i,
        photographerId: 300 + i,
        userName: `photographer${i}`,
        fullName: `Photographer Name ${i}`,
        profileImage: `https://picsum.photos/60/60?random=${200 + i}`,
        specialization: specializations[i % specializations.length],
        rating: 3.5 + (i % 5) * 0.3, // Rating between 3.5 and 5.0
        location: locations[i % locations.length],
        isVerified: i % 3 === 0, // Every 3rd photographer is verified
        isOnline: i % 4 === 0, // Every 4th photographer is online
        hasExistingConversation: i % 5 === 0, // Every 5th has existing conversation
        existingConversationId: i % 5 === 0 ? 1000 + i : undefined,
      });
    }

    return mockPhotographers;
  }

  // ===== DEVELOPMENT METHODS =====

  async testChatConnection(): Promise<{ success: boolean; message: string }> {
    try {
      // Try to fetch conversations
      const response = await this.getConversations(1, 1);

      return {
        success: true,
        message: `Chat connection successful. Found ${response.totalCount} conversations.`,
      };
    } catch (error) {
      console.error("🧪 Chat connection test failed:", error);

      return {
        success: false,
        message: `Chat connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  async testSendMessage(
    recipientId: number,
    testMessage: string = "Test message"
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const response = await this.sendMessage({
        recipientId,
        content: testMessage,
        messageType: MessageType.TEXT,
      });

      return {
        success: response.success,
        message: response.message || "Message sent successfully",
        data: response,
      };
    } catch (error) {
      console.error("🧪 Send message test failed:", error);

      return {
        success: false,
        message: `Send message failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }
}

// Export singleton instance
export const chatService = new ChatService();
