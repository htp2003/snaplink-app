// services/signalRManager.ts
import * as signalR from '@microsoft/signalr';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MessageResponse, ConversationResponse } from '../types/chat';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net';
const SIGNALR_HUB_URL = `${API_BASE_URL}/chatHub`;

export interface SignalREventHandlers {
  onMessageReceived?: (message: MessageResponse) => void;
  onConversationUpdated?: (conversation: ConversationResponse) => void;
  onNewConversation?: (conversation: ConversationResponse) => void;
  onMessageStatusChanged?: (messageId: number, status: string) => void;
  onUserOnlineStatusChanged?: (userId: number, isOnline: boolean) => void;
  onTypingIndicator?: (conversationId: number, userId: number, isTyping: boolean) => void;
  onConnectionStatusChanged?: (isConnected: boolean) => void;
}

class SignalRManager {
  private hubConnection: signalR.HubConnection | null = null;
  private isConnected: boolean = false;
  private currentUserId: number | null = null;
  private eventHandlers: SignalREventHandlers = {};
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  /**
   * Initialize SignalR connection
   */
  async initialize(userId: number, eventHandlers: SignalREventHandlers = {}): Promise<boolean> {
    try {
      console.log('🔌 Initializing SignalR for user:', userId);
      
      this.currentUserId = userId;
      this.eventHandlers = eventHandlers;
      
      // Get auth token
      const token = await this.getAuthToken();
      if (!token) {
        console.error('❌ No auth token available');
        return false;
      }

      // Create connection
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(SIGNALR_HUB_URL, {
          accessTokenFactory: () => token,
          transport: signalR.HttpTransportType.WebSockets,
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Setup event handlers
      this.setupEventHandlers();

      // Start connection
      await this.hubConnection.start();
      this.isConnected = true;
      this.reconnectAttempts = 0;

      console.log('✅ SignalR connected successfully');

      // Register user with hub
      await this.registerUser(userId);

      // Notify connection status
      this.eventHandlers.onConnectionStatusChanged?.(true);
      return true;

    } catch (error) {
      console.error('❌ SignalR initialization failed:', error);
      this.isConnected = false;
      this.eventHandlers.onConnectionStatusChanged?.(false);
      return false;
    }
  }

  /**
   * Setup SignalR event handlers
   */
  private setupEventHandlers(): void {
    if (!this.hubConnection) return;

    // Receive new message - QUAN TRỌNG NHẤT!
    this.hubConnection.on('ReceiveMessage', (message: MessageResponse) => {
      console.log('📨 NEW MESSAGE RECEIVED via SignalR:', message);
      this.eventHandlers.onMessageReceived?.(message);
    });

    // User registered
    this.hubConnection.on('UserRegistered', (userId: number) => {
      console.log('👤 User registered:', userId);
    });

    // Joined conversation
    this.hubConnection.on('JoinedConversation', (conversationId: number) => {
      console.log('🏠 Joined conversation:', conversationId);
    });

    // Left conversation
    this.hubConnection.on('LeftConversation', (conversationId: number) => {
      console.log('🚪 Left conversation:', conversationId);
    });

    // New conversation
    this.hubConnection.on('NewConversation', (conversation: ConversationResponse) => {
      console.log('➕ New conversation:', conversation);
      this.eventHandlers.onNewConversation?.(conversation);
    });

    // Conversation updated
    this.hubConnection.on('ConversationUpdated', (conversation: ConversationResponse) => {
      console.log('✏️ Conversation updated:', conversation);
      this.eventHandlers.onConversationUpdated?.(conversation);
    });

    // Message status changed
    this.hubConnection.on('MessageStatusChanged', (messageId: number, status: string) => {
      console.log('📝 Message status changed:', messageId, status);
      this.eventHandlers.onMessageStatusChanged?.(messageId, status);
    });

    // Connection lifecycle
    this.hubConnection.onreconnecting(() => {
      console.log('🔄 SignalR reconnecting...');
      this.isConnected = false;
      this.eventHandlers.onConnectionStatusChanged?.(false);
    });

    this.hubConnection.onreconnected(() => {
      console.log('✅ SignalR reconnected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Re-register user
      if (this.currentUserId) {
        this.registerUser(this.currentUserId);
      }
      
      this.eventHandlers.onConnectionStatusChanged?.(true);
    });

    this.hubConnection.onclose(() => {
      console.log('❌ SignalR connection closed');
      this.isConnected = false;
      this.eventHandlers.onConnectionStatusChanged?.(false);
    });
  }

  /**
   * Register user with hub
   */
  private async registerUser(userId: number): Promise<void> {
    if (!this.hubConnection || !this.isConnected) return;

    try {
      await this.hubConnection.invoke('RegisterUser', userId);
      console.log('✅ User registered with hub:', userId);
    } catch (error) {
      console.error('❌ Failed to register user:', error);
    }
  }

  /**
   * Join conversation for real-time updates
   */
  async joinConversation(conversationId: number): Promise<void> {
    if (!this.hubConnection || !this.isConnected) {
      console.warn('⚠️ Cannot join conversation - not connected');
      return;
    }

    try {
      await this.hubConnection.invoke('JoinConversation', conversationId);
      console.log('✅ Joined conversation:', conversationId);
    } catch (error) {
      console.error('❌ Failed to join conversation:', error);
    }
  }

  /**
   * Leave conversation
   */
  async leaveConversation(conversationId: number): Promise<void> {
    if (!this.hubConnection || !this.isConnected) return;

    try {
      await this.hubConnection.invoke('LeaveConversation', conversationId);
      console.log('✅ Left conversation:', conversationId);
    } catch (error) {
      console.error('❌ Failed to leave conversation:', error);
    }
  }

  /**
   * Update event handlers
   */
  updateEventHandlers(handlers: SignalREventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  /**
   * Get connection status
   */
  getStatus(): { isConnected: boolean; state?: string } {
    return {
      isConnected: this.isConnected,
      state: this.hubConnection?.state || 'Disconnected'
    };
  }

  /**
   * Stop connection
   */
  async stop(): Promise<void> {
    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
        this.isConnected = false;
        this.currentUserId = null;
        this.hubConnection = null;
        console.log('✅ SignalR stopped');
        this.eventHandlers.onConnectionStatusChanged?.(false);
      } catch (error) {
        console.error('❌ Error stopping SignalR:', error);
      }
    }
  }

  /**
   * Get auth token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem('token');
      return token;
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
      return null;
    }
  }
}

// Export singleton
export const signalRManager = new SignalRManager();