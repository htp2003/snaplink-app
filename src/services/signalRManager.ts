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

      console.log('🔑 Token found, connecting to:', SIGNALR_HUB_URL);

      // Create connection - FIX: Allow fallback transports
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(SIGNALR_HUB_URL, {
          accessTokenFactory: () => token,
          // FIX: Don't force WebSockets only, allow fallback
          // transport: signalR.HttpTransportType.WebSockets,
          skipNegotiation: false, // Enable transport negotiation
          headers: {
            'Authorization': `Bearer ${token}` // Explicit header
          }
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
        .configureLogging(signalR.LogLevel.Debug) // More detailed logging
        .build();

      // Setup event handlers
      this.setupEventHandlers();

      console.log('🚀 Starting SignalR connection...');
      // Start connection
      await this.hubConnection.start();
      this.isConnected = true;
      this.reconnectAttempts = 0;

      console.log('✅ SignalR connected successfully, state:', this.hubConnection.state);

      // Register user with hub
      await this.registerUser(userId);

      // Notify connection status
      this.eventHandlers.onConnectionStatusChanged?.(true);
      return true;

    } catch (error) {
      console.error('❌ SignalR initialization failed:', error);
      this.isConnected = false;
      this.eventHandlers.onConnectionStatusChanged?.(false);
      
      // Try fallback connection
      return await this.tryFallbackConnection(userId);
    }
  }

  /**
   * Try fallback connection with different transport
   */
  private async tryFallbackConnection(userId: number): Promise<boolean> {
    try {
      console.log('🔄 Trying fallback connection...');
      
      const token = await this.getAuthToken();
      if (!token) return false;

      // Create fallback connection with ServerSentEvents
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(SIGNALR_HUB_URL, {
          accessTokenFactory: () => token,
          transport: signalR.HttpTransportType.ServerSentEvents,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Debug)
        .build();

      this.setupEventHandlers();
      await this.hubConnection.start();
      this.isConnected = true;

      console.log('✅ Fallback connection successful');
      await this.registerUser(userId);
      this.eventHandlers.onConnectionStatusChanged?.(true);
      return true;

    } catch (error) {
      console.error('❌ Fallback connection failed:', error);
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
      console.log('📨 NEW MESSAGE RECEIVED via SignalR:', JSON.stringify(message, null, 2));
      this.eventHandlers.onMessageReceived?.(message);
    });

    // User registered
    this.hubConnection.on('UserRegistered', (userId: number) => {
      console.log('👤 User registered successfully:', userId);
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
      console.log('➕ New conversation:', JSON.stringify(conversation, null, 2));
      this.eventHandlers.onNewConversation?.(conversation);
    });

    // Conversation updated
    this.hubConnection.on('ConversationUpdated', (conversation: ConversationResponse) => {
      console.log('✏️ Conversation updated:', JSON.stringify(conversation, null, 2));
      this.eventHandlers.onConversationUpdated?.(conversation);
    });

    // Message status changed
    this.hubConnection.on('MessageStatusChanged', (messageId: number, status: string) => {
      console.log('📝 Message status changed:', messageId, status);
      this.eventHandlers.onMessageStatusChanged?.(messageId, status);
    });

    // Connection lifecycle
    this.hubConnection.onreconnecting((error) => {
      console.log('🔄 SignalR reconnecting...', error?.message);
      this.isConnected = false;
      this.eventHandlers.onConnectionStatusChanged?.(false);
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('✅ SignalR reconnected with ID:', connectionId);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Re-register user
      if (this.currentUserId) {
        this.registerUser(this.currentUserId);
      }
      
      this.eventHandlers.onConnectionStatusChanged?.(true);
    });

    this.hubConnection.onclose((error) => {
      console.log('❌ SignalR connection closed:', error?.message);
      this.isConnected = false;
      this.eventHandlers.onConnectionStatusChanged?.(false);
    });
  }

  /**
   * Register user with hub
   */
  private async registerUser(userId: number): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      console.warn('⚠️ Cannot register user - connection not ready, state:', this.hubConnection?.state);
      return;
    }

    try {
      console.log('📤 Registering user with hub:', userId);
      await this.hubConnection.invoke('RegisterUser', userId);
      console.log('✅ User registered with hub successfully:', userId);
    } catch (error) {
      console.error('❌ Failed to register user:', error);
      throw error; // Re-throw to handle in caller
    }
  }

  /**
   * Join conversation for real-time updates
   */
  async joinConversation(conversationId: number): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      console.warn('⚠️ Cannot join conversation - not connected, state:', this.hubConnection?.state);
      return;
    }

    try {
      console.log('📤 Joining conversation:', conversationId);
      await this.hubConnection.invoke('JoinConversation', conversationId);
      console.log('✅ Joined conversation successfully:', conversationId);
    } catch (error) {
      console.error('❌ Failed to join conversation:', error);
    }
  }

  /**
   * Leave conversation
   */
  async leaveConversation(conversationId: number): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) return;

    try {
      await this.hubConnection.invoke('LeaveConversation', conversationId);
      console.log('✅ Left conversation:', conversationId);
    } catch (error) {
      console.error('❌ Failed to leave conversation:', error);
    }
  }

  /**
   * Send message to conversation (if hub supports direct send)
   */
  async sendMessageToConversation(conversationId: number, messageData: any): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      console.warn('⚠️ Cannot send message - not connected');
      return;
    }

    try {
      console.log('📤 Sending message via SignalR:', conversationId, messageData);
      await this.hubConnection.invoke('SendMessageToConversation', conversationId, messageData);
      console.log('✅ Message sent via SignalR');
    } catch (error) {
      console.error('❌ Failed to send message via SignalR:', error);
    }
  }

  /**
   * Send message to user directly
   */
  async sendMessageToUser(recipientUserId: number, messageData: any): Promise<void> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      console.warn('⚠️ Cannot send message - not connected');
      return;
    }

    try {
      console.log('📤 Sending direct message via SignalR:', recipientUserId, messageData);
      await this.hubConnection.invoke('SendMessageToUser', recipientUserId, messageData);
      console.log('✅ Direct message sent via SignalR');
    } catch (error) {
      console.error('❌ Failed to send direct message via SignalR:', error);
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
  getStatus(): { isConnected: boolean; state?: string; connectionId?: string } {
    return {
      isConnected: this.isConnected,
      state: this.hubConnection?.state || 'Disconnected',
      connectionId: this.hubConnection?.connectionId || 'None'
    };
  }

  /**
   * Manual reconnect
   */
  async reconnect(): Promise<boolean> {
    console.log('🔄 Manual reconnect attempt...');
    
    if (this.hubConnection) {
      await this.stop();
    }

    if (this.currentUserId) {
      return await this.initialize(this.currentUserId, this.eventHandlers);
    }

    return false;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      console.log('❌ Connection test failed - not connected');
      return false;
    }

    try {
      // Test with a simple ping if available
      await this.hubConnection.invoke('Ping');
      console.log('✅ Connection test successful');
      return true;
    } catch (error) {
      console.log('⚠️ Connection test method not available, but connection seems active');
      return true; // Still consider connected
    }
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
      if (token) {
        console.log('🔑 Auth token found (length):', token.length);
        return token;
      } else {
        console.warn('⚠️ No auth token in AsyncStorage');
        return null;
      }
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
      return null;
    }
  }
}

// Export singleton
export const signalRManager = new SignalRManager();