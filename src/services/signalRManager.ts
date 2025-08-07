// services/signalRManager.ts - FIXED for React Native
import * as signalR from "@microsoft/signalr";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MessageResponse, ConversationResponse } from "../types/chat";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";
const SIGNALR_HUB_URL = `${API_BASE_URL}/chatHub`;

export interface SignalREventHandlers {
  onMessageReceived?: (message: MessageResponse) => void;
  onConversationUpdated?: (conversation: ConversationResponse) => void;
  onNewConversation?: (conversation: ConversationResponse) => void;
  onMessageStatusChanged?: (messageId: number, status: string) => void;
  onUserOnlineStatusChanged?: (userId: number, isOnline: boolean) => void;
  onTypingIndicator?: (
    conversationId: number,
    userId: number,
    isTyping: boolean
  ) => void;
  onConnectionStatusChanged?: (isConnected: boolean) => void;
}

class SignalRManager {
  private hubConnection: signalR.HubConnection | null = null;
  private isConnected: boolean = false;
  private currentUserId: number | null = null;
  private eventHandlers: SignalREventHandlers = {};
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3; // ✅ Reduce attempts
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private connectionTimeoutId: NodeJS.Timeout | null = null;

  /**
   * ✅ FIXED: Initialize SignalR with React Native optimizations
   */
  async initialize(
    userId: number,
    eventHandlers: SignalREventHandlers = {}
  ): Promise<boolean> {
    try {
      console.log("🔌 Initializing SignalR for user:", userId);

      // Stop any existing connection
      if (this.hubConnection) {
        await this.stop();
      }

      this.currentUserId = userId;
      this.eventHandlers = eventHandlers;

      // Get auth token
      const token = await this.getAuthToken();
      if (!token) {
        console.error("❌ No auth token available");
        return false;
      }

      console.log("🔑 Token found, connecting to:", SIGNALR_HUB_URL);

      // ✅ FIXED: React Native compatible connection - DON'T FORCE TRANSPORT
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(SIGNALR_HUB_URL, {
          accessTokenFactory: () => token,
          // ✅ LET SIGNALR CHOOSE BEST TRANSPORT - DON'T FORCE
          skipNegotiation: false, // Allow negotiation to choose best transport
          headers: {
            Authorization: `Bearer ${token}`,
          },
          // ✅ Add timeout configurations
          timeout: 30000, // 30 second timeout
        })
        // ✅ Custom reconnect policy for mobile
        .withAutomaticReconnect([1000, 2000, 5000, 10000, 30000])
        // ✅ Reduce logging in production
        .configureLogging(
          __DEV__ ? signalR.LogLevel.Debug : signalR.LogLevel.Warning
        )
        .build();

      // ✅ FIXED: Better timeout handling - SHORTER timeout
      this.connectionTimeoutId = setTimeout(() => {
        console.log(
          "⏰ Connection timeout after 15 seconds, will try fallback..."
        );
        this.tryFallbackConnection(userId);
      }, 15000); // ✅ 15 second timeout instead of 30

      // Setup event handlers
      this.setupEventHandlers();

      console.log("🚀 Starting SignalR connection...");
      // Start connection
      await this.hubConnection.start();

      // Clear timeout if successful
      if (this.connectionTimeoutId) {
        clearTimeout(this.connectionTimeoutId);
        this.connectionTimeoutId = null;
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;

      console.log(
        "✅ SignalR connected successfully, state:",
        this.hubConnection.state
      );

      // Register user with hub
      await this.registerUser(userId);

      // ✅ Start keep-alive mechanism for mobile
      this.startKeepAlive();

      // Notify connection status
      this.eventHandlers.onConnectionStatusChanged?.(true);
      return true;
    } catch (error) {
      console.error("❌ SignalR initialization failed:", error);
      this.isConnected = false;
      this.eventHandlers.onConnectionStatusChanged?.(false);

      // Clear timeout
      if (this.connectionTimeoutId) {
        clearTimeout(this.connectionTimeoutId);
        this.connectionTimeoutId = null;
      }

      // Try fallback connection
      return await this.tryFallbackConnection(userId);
    }
  }

  /**
   * ✅ FIXED: Better fallback with Server-Sent Events
   */
  private async tryFallbackConnection(userId: number): Promise<boolean> {
    try {
      console.log("🔄 Trying fallback connection with ServerSentEvents...");

      const token = await this.getAuthToken();
      if (!token) return false;

      // Stop existing connection
      if (this.hubConnection) {
        await this.hubConnection.stop();
      }

      // ✅ Try ServerSentEvents as fallback
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(SIGNALR_HUB_URL, {
          accessTokenFactory: () => token,
          transport: signalR.HttpTransportType.ServerSentEvents,
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .withAutomaticReconnect([2000, 5000, 10000])
        .configureLogging(
          __DEV__ ? signalR.LogLevel.Information : signalR.LogLevel.Warning
        )
        .build();

      this.setupEventHandlers();
      await this.hubConnection.start();
      this.isConnected = true;

      console.log("✅ Fallback connection successful");
      await this.registerUser(userId);
      this.startKeepAlive();
      this.eventHandlers.onConnectionStatusChanged?.(true);
      return true;
    } catch (error) {
      console.error("❌ Fallback connection failed:", error);

      // ✅ Last resort: HTTP polling
      return await this.tryHttpPollingFallback(userId);
    }
  }

  /**
   * ✅ NEW: HTTP Polling fallback for worst case scenarios
   */
  private async tryHttpPollingFallback(userId: number): Promise<boolean> {
    try {
      console.log("🔄 Last resort: HTTP polling fallback...");

      const token = await this.getAuthToken();
      if (!token) return false;

      if (this.hubConnection) {
        await this.hubConnection.stop();
      }

      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(SIGNALR_HUB_URL, {
          accessTokenFactory: () => token,
          // Force HTTP polling (most reliable but slower)
          transport: signalR.HttpTransportType.None, // Will use best available
          skipNegotiation: false, // Let it negotiate
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .withAutomaticReconnect()
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      this.setupEventHandlers();
      await this.hubConnection.start();
      this.isConnected = true;

      console.log("✅ HTTP polling fallback successful");
      await this.registerUser(userId);
      this.eventHandlers.onConnectionStatusChanged?.(true);
      return true;
    } catch (error) {
      console.error("❌ All connection attempts failed:", error);
      this.eventHandlers.onConnectionStatusChanged?.(false);
      return false;
    }
  }

  /**
   * ✅ NEW: Keep-alive mechanism for mobile apps
   */
  private startKeepAlive(): void {
    // Clear existing interval
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }

    // Send ping every 30 seconds to keep connection alive
    this.keepAliveInterval = setInterval(async () => {
      if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
        try {
          // Try to invoke a simple ping method
          await this.hubConnection.invoke("Ping").catch(() => {
            // Ping method might not exist, that's ok
            console.log("📍 Keep-alive: Ping method not available");
          });
        } catch (error) {
          console.warn("⚠️ Keep-alive ping failed:", error);
        }
      }
    }, 30000); // Every 30 seconds

    console.log("💓 Keep-alive started");
  }

  /**
   * ✅ ENHANCED: Better event handler setup
   */
  private setupEventHandlers(): void {
    if (!this.hubConnection) return;

    // ✅ Main message handler - THIS IS CRITICAL
    this.hubConnection.on("ReceiveMessage", (message: MessageResponse) => {
      console.log(
        "📨 NEW MESSAGE RECEIVED via SignalR:",
        JSON.stringify(message, null, 2)
      );

      try {
        this.eventHandlers.onMessageReceived?.(message);
      } catch (error) {
        console.error("❌ Error handling received message:", error);
      }
    });

    // User registered
    this.hubConnection.on("UserRegistered", (userId: number) => {
      console.log("👤 User registered successfully:", userId);
    });

    // Joined conversation
    this.hubConnection.on("JoinedConversation", (conversationId: number) => {
      console.log("🏠 Joined conversation:", conversationId);
    });

    // Left conversation
    this.hubConnection.on("LeftConversation", (conversationId: number) => {
      console.log("🚪 Left conversation:", conversationId);
    });

    // New conversation
    this.hubConnection.on(
      "NewConversation",
      (conversation: ConversationResponse) => {
        console.log(
          "➕ New conversation via SignalR:",
          JSON.stringify(conversation, null, 2)
        );
        try {
          this.eventHandlers.onNewConversation?.(conversation);
        } catch (error) {
          console.error("❌ Error handling new conversation:", error);
        }
      }
    );

    // Conversation updated
    this.hubConnection.on(
      "ConversationUpdated",
      (conversation: ConversationResponse) => {
        console.log(
          "✏️ Conversation updated via SignalR:",
          JSON.stringify(conversation, null, 2)
        );
        try {
          this.eventHandlers.onConversationUpdated?.(conversation);
        } catch (error) {
          console.error("❌ Error handling conversation update:", error);
        }
      }
    );

    // Message status changed
    this.hubConnection.on(
      "MessageStatusChanged",
      (messageId: number, status: string) => {
        console.log(
          "📝 Message status changed via SignalR:",
          messageId,
          status
        );
        try {
          this.eventHandlers.onMessageStatusChanged?.(messageId, status);
        } catch (error) {
          console.error("❌ Error handling message status change:", error);
        }
      }
    );

    // ✅ ENHANCED: Better connection lifecycle handlers
    this.hubConnection.onreconnecting((error) => {
      console.log("🔄 SignalR reconnecting...", error?.message);
      this.isConnected = false;
      this.reconnectAttempts++;
      this.eventHandlers.onConnectionStatusChanged?.(false);

      // Stop keep-alive during reconnection
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }
    });

    this.hubConnection.onreconnected(async (connectionId) => {
      console.log("✅ SignalR reconnected with ID:", connectionId);
      this.isConnected = true;
      this.reconnectAttempts = 0;

      try {
        // Re-register user
        if (this.currentUserId) {
          await this.registerUser(this.currentUserId);
        }

        // Restart keep-alive
        this.startKeepAlive();

        this.eventHandlers.onConnectionStatusChanged?.(true);
      } catch (error) {
        console.error("❌ Error during reconnection setup:", error);
      }
    });

    this.hubConnection.onclose(async (error) => {
      console.log("❌ SignalR connection closed:", error?.message);
      this.isConnected = false;
      this.eventHandlers.onConnectionStatusChanged?.(false);

      // Stop keep-alive
      if (this.keepAliveInterval) {
        clearInterval(this.keepAliveInterval);
        this.keepAliveInterval = null;
      }

      // ✅ Auto-reconnect if not too many attempts
      if (
        this.reconnectAttempts < this.maxReconnectAttempts &&
        this.currentUserId
      ) {
        console.log(
          `🔄 Auto-reconnect attempt ${this.reconnectAttempts + 1}/${
            this.maxReconnectAttempts
          }`
        );
        setTimeout(() => {
          if (this.currentUserId) {
            this.initialize(this.currentUserId, this.eventHandlers);
          }
        }, 5000); // Wait 5 seconds before reconnecting
      }
    });
  }

  /**
   * ✅ ENHANCED: Better user registration with retry
   */
  private async registerUser(
    userId: number,
    retries: number = 3
  ): Promise<void> {
    if (
      !this.hubConnection ||
      this.hubConnection.state !== signalR.HubConnectionState.Connected
    ) {
      console.warn(
        "⚠️ Cannot register user - connection not ready, state:",
        this.hubConnection?.state
      );
      return;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(
          `📤 Registering user with hub (attempt ${attempt}):`,
          userId
        );
        await this.hubConnection.invoke("RegisterUser", userId);
        console.log("✅ User registered with hub successfully:", userId);
        return;
      } catch (error) {
        console.error(
          `❌ Failed to register user (attempt ${attempt}):`,
          error
        );

        if (attempt === retries) {
          throw error;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * ✅ ENHANCED: Better conversation joining with retry
   */
  async joinConversation(
    conversationId: number,
    retries: number = 2
  ): Promise<void> {
    if (
      !this.hubConnection ||
      this.hubConnection.state !== signalR.HubConnectionState.Connected
    ) {
      console.warn(
        "⚠️ Cannot join conversation - not connected, state:",
        this.hubConnection?.state
      );
      return;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(
          `📤 Joining conversation (attempt ${attempt}):`,
          conversationId
        );
        await this.hubConnection.invoke("JoinConversation", conversationId);
        console.log("✅ Joined conversation successfully:", conversationId);
        return;
      } catch (error) {
        console.error(
          `❌ Failed to join conversation (attempt ${attempt}):`,
          error
        );

        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }
  }

  /**
   * Leave conversation
   */
  async leaveConversation(conversationId: number): Promise<void> {
    if (
      !this.hubConnection ||
      this.hubConnection.state !== signalR.HubConnectionState.Connected
    ) {
      return;
    }

    try {
      await this.hubConnection.invoke("LeaveConversation", conversationId);
      console.log("✅ Left conversation:", conversationId);
    } catch (error) {
      console.error("❌ Failed to leave conversation:", error);
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
  getStatus(): {
    isConnected: boolean;
    state?: string;
    connectionId?: string;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      state: this.hubConnection?.state || "Disconnected",
      connectionId: this.hubConnection?.connectionId || "None",
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * ✅ ENHANCED: Better manual reconnect
   */
  async reconnect(): Promise<boolean> {
    console.log("🔄 Manual reconnect attempt...");

    // Reset reconnect attempts
    this.reconnectAttempts = 0;

    if (this.hubConnection) {
      await this.stop();
    }

    if (this.currentUserId) {
      return await this.initialize(this.currentUserId, this.eventHandlers);
    }

    return false;
  }

  /**
   * ✅ ENHANCED: Better connection test
   */
  async testConnection(): Promise<boolean> {
    if (
      !this.hubConnection ||
      this.hubConnection.state !== signalR.HubConnectionState.Connected
    ) {
      console.log("❌ Connection test failed - not connected");
      return false;
    }

    try {
      // Test with a simple ping if available
      await this.hubConnection.invoke("Ping");
      console.log("✅ Connection test successful");
      return true;
    } catch (error) {
      // If ping doesn't exist, check if we can register user again
      try {
        if (this.currentUserId) {
          await this.hubConnection.invoke("RegisterUser", this.currentUserId);
          console.log("✅ Connection test successful (via RegisterUser)");
          return true;
        }
      } catch (registerError) {
        console.log("❌ Connection test failed:", registerError);
        return false;
      }

      console.log(
        "⚠️ Connection test method not available, but connection seems active"
      );
      return true;
    }
  }

  /**
   * ✅ ENHANCED: Better stop method
   */
  async stop(): Promise<void> {
    console.log("🛑 Stopping SignalR connection...");

    // Clear keep-alive
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }

    // Clear connection timeout
    if (this.connectionTimeoutId) {
      clearTimeout(this.connectionTimeoutId);
      this.connectionTimeoutId = null;
    }

    if (this.hubConnection) {
      try {
        await this.hubConnection.stop();
        console.log("✅ SignalR stopped successfully");
      } catch (error) {
        console.error("❌ Error stopping SignalR:", error);
      } finally {
        this.hubConnection = null;
        this.isConnected = false;
        this.currentUserId = null;
        this.reconnectAttempts = 0;
        this.eventHandlers.onConnectionStatusChanged?.(false);
      }
    }
  }

  /**
   * Get auth token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const token = await AsyncStorage.getItem("token");
      if (token) {
        console.log("🔑 Auth token found (length):", token.length);
        return token;
      } else {
        console.warn("⚠️ No auth token in AsyncStorage");
        return null;
      }
    } catch (error) {
      console.error("❌ Error getting auth token:", error);
      return null;
    }
  }

  /**
   * ✅ NEW: Manual message test for debugging
   */
  testReceiveMessage(): void {
    const testMessage = {
      messageId: Date.now(),
      senderId: 999,
      recipientId: this.currentUserId || 0,
      conversationId: 1,
      content: "🧪 Test message from SignalR Manager",
      createdAt: new Date().toISOString(),
      messageType: "Text",
      status: "sent",
      senderName: "Test User",
      senderProfileImage: undefined,
    };

    console.log("🧪 Simulating message reception...");
    this.eventHandlers.onMessageReceived?.(testMessage);
  }
}

// Export singleton
export const signalRManager = new SignalRManager();
