// hooks/useChat.ts - Updated with better SignalR integration

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { chatService } from "../services/chatService";
import {
  signalRManager,
  SignalREventHandlers,
} from "../services/signalRManager";
import {
  Message,
  Conversation,
  ConversationParticipant,
  SendMessageRequest,
  SendMessageResponse,
  CreateConversationRequest,
  PhotographerSearchResult,
  ChatSearchResult,
  SearchPhotographersParams,
  UseChatOptions,
  UseConversationOptions,
  ChatValidationErrors,
  MessageType,
  MessageStatus,
  ConversationType,
  ConversationStatus,
  ChatError,
} from "../types/chat";

// ===== MAIN CHAT HOOK =====

export const useChat = (options: UseChatOptions = {}) => {
  const {
    userId,
    autoRefresh = false,
    refreshInterval = 30000,
    enableRealtime = true,
    maxConversations = 100,
    maxMessagesPerConversation = 500,
  } = options;

  // ===== STATES =====
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    useState<Conversation | null>(null);
  const [searchResults, setSearchResults] = useState<ChatSearchResult>({
    conversations: [],
    photographers: [],
    totalResults: 0,
  });

  // Loading states
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);

  // Error states
  const [error, setError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // UI states
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchMode, setIsSearchMode] = useState(false);

  // ✅ SignalR states
  const [isSignalRConnected, setIsSignalRConnected] = useState(false);
  const [signalRError, setSignalRError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  const [connectionAttempts, setConnectionAttempts] = useState(0);

  // Refs for cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const signalRInitializedRef = useRef(false);

  // ✅ FIXED: Stable SignalR handlers with better error handling
  const signalRHandlers: SignalREventHandlers = useMemo(
    () => ({
      onMessageReceived: (message) => {
        console.log("🔥 REAL-TIME MESSAGE RECEIVED in useChat:", message);

        try {
          const normalizedMessage =
            chatService.normalizeMessageResponse(message);

          // Update conversations list with new message
          setConversations((prev) => {
            const updated = prev.map((conv) => {
              if (conv.conversationId === normalizedMessage.conversationId) {
                console.log(
                  "✅ Updating conversation with new message:",
                  conv.conversationId
                );
                return {
                  ...conv,
                  lastMessage: normalizedMessage,
                  updatedAt: new Date().toISOString(),
                  unreadCount: conv.unreadCount + 1,
                };
              }
              return conv;
            });

            // Sort conversations by last message time
            return updated.sort((a, b) => {
              const aTime = a.lastMessage?.createdAt || a.createdAt;
              const bTime = b.lastMessage?.createdAt || b.createdAt;
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            });
          });

          // If conversation doesn't exist, refresh list will be handled by caller
          const existingConv = conversations.find(
            (c) => c.conversationId === normalizedMessage.conversationId
          );
          if (!existingConv && normalizedMessage.conversationId) {
            console.log("🔄 New conversation detected, refresh needed");
          }
        } catch (error) {
          console.error("❌ Error handling received message:", error);
        }
      },

      onNewConversation: (conversation) => {
        console.log("➕ New conversation created via SignalR:", conversation);

        try {
          const normalizedConversation =
            chatService.normalizeConversationResponse(conversation);

          setConversations((prev) => {
            const exists = prev.find(
              (c) => c.conversationId === normalizedConversation.conversationId
            );
            if (!exists) {
              console.log("✅ Adding new conversation to list");
              return [normalizedConversation, ...prev].slice(
                0,
                maxConversations
              );
            }
            return prev;
          });
        } catch (error) {
          console.error("❌ Error handling new conversation:", error);
        }
      },

      onConversationUpdated: (conversation) => {
        console.log("✏️ Conversation updated via SignalR:", conversation);

        try {
          const normalizedConversation =
            chatService.normalizeConversationResponse(conversation);

          setConversations((prev) =>
            prev.map((conv) =>
              conv.conversationId === normalizedConversation.conversationId
                ? normalizedConversation
                : conv
            )
          );

          setCurrentConversation((prev) =>
            prev?.conversationId === normalizedConversation.conversationId
              ? normalizedConversation
              : prev
          );
        } catch (error) {
          console.error("❌ Error handling conversation update:", error);
        }
      },

      onMessageStatusChanged: (messageId, status) => {
        console.log("📝 Message status changed:", messageId, status);
        // Handle in individual conversation hooks
      },

      onUserOnlineStatusChanged: (userId, isOnline) => {
        console.log("👤 User online status:", userId, isOnline);

        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          if (isOnline) {
            newSet.add(userId);
          } else {
            newSet.delete(userId);
          }
          return newSet;
        });
      },

      onConnectionStatusChanged: (isConnected) => {
        console.log("🔌 SignalR status changed:", isConnected);
        setIsSignalRConnected(isConnected);
        setConnectionAttempts((prev) => (isConnected ? 0 : prev + 1));

        if (isConnected) {
          setSignalRError(null);
          console.log("✅ SignalR connected successfully");
        } else {
          setSignalRError("Connection lost. Attempting to reconnect...");
        }
      },
    }),
    [conversations, maxConversations]
  );

  // ✅ ENHANCED: Better SignalR initialization
  const initializeSignalR = useCallback(async () => {
    if (!enableRealtime || !userId || signalRInitializedRef.current) {
      return;
    }

    try {
      console.log("🔌 Initializing SignalR for userId:", userId);
      setSignalRError(null);
      setConnectionAttempts((prev) => prev + 1);

      const success = await signalRManager.initialize(userId, signalRHandlers);

      if (success) {
        console.log("✅ SignalR initialized successfully");
        signalRInitializedRef.current = true;
      } else {
        throw new Error("Failed to initialize SignalR");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "SignalR initialization failed";
      console.error("❌ SignalR initialization error:", err);
      setSignalRError(errorMessage);
      signalRInitializedRef.current = false;
    }
  }, [enableRealtime, userId, signalRHandlers]);

  // ✅ Update SignalR handlers when they change
  useEffect(() => {
    if (signalRInitializedRef.current) {
      console.log("🔄 Updating SignalR event handlers...");
      signalRManager.updateEventHandlers(signalRHandlers);
    }
  }, [signalRHandlers]);

  // ✅ Join/leave conversation for real-time updates
  const joinConversationRealtime = useCallback(
    async (conversationId: number) => {
      if (!enableRealtime || !isSignalRConnected) {
        console.log("⚠️ Cannot join conversation - SignalR not connected");
        return;
      }

      try {
        await signalRManager.joinConversation(conversationId);
        console.log(
          "🏠 Joined conversation for real-time updates:",
          conversationId
        );
      } catch (err) {
        console.error("❌ Failed to join conversation for real-time:", err);
      }
    },
    [enableRealtime, isSignalRConnected]
  );

  const leaveConversationRealtime = useCallback(
    async (conversationId: number) => {
      if (!enableRealtime || !isSignalRConnected) {
        return;
      }

      try {
        await signalRManager.leaveConversation(conversationId);
        console.log("🚪 Left conversation real-time updates:", conversationId);
      } catch (err) {
        console.error("❌ Failed to leave conversation real-time:", err);
      }
    },
    [enableRealtime, isSignalRConnected]
  );

  // ===== CONVERSATION METHODS =====

  const loadConversations = useCallback(
    async (page: number = 1, pageSize: number = 20): Promise<boolean> => {
      try {
        setLoadingConversations(true);
        setError(null);

        console.log("📋 Loading conversations...");

        const response = await chatService.getConversations(page, pageSize);

        const normalizedConversations =
          response.conversations?.map((conv) =>
            chatService.normalizeConversationResponse(conv)
          ) || [];

        // Sort by last message time
        const sortedConversations = normalizedConversations.sort((a, b) => {
          const aTime = a.lastMessage?.createdAt || a.createdAt;
          const bTime = b.lastMessage?.createdAt || b.createdAt;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

        setConversations((prev) => {
          if (page === 1) {
            return sortedConversations.slice(0, maxConversations);
          } else {
            const combined = [...prev, ...sortedConversations];
            const unique = combined.filter(
              (conv, index, arr) =>
                arr.findIndex(
                  (c) => c.conversationId === conv.conversationId
                ) === index
            );
            return unique.slice(0, maxConversations);
          }
        });

        console.log("✅ Conversations loaded:", sortedConversations.length);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load conversations";
        setError(errorMessage);
        console.error("❌ Error loading conversations:", err);
        return false;
      } finally {
        setLoadingConversations(false);
      }
    },
    [maxConversations]
  );

  const refreshConversations = useCallback(async (): Promise<void> => {
    await loadConversations(1, 20);
  }, [loadConversations]);

  const getConversation = useCallback(
    async (conversationId: number): Promise<Conversation | null> => {
      try {
        console.log("📋 Getting conversation:", conversationId);

        const response = await chatService.getConversation(conversationId);
        const conversation =
          chatService.normalizeConversationResponse(response);

        setCurrentConversation(conversation);

        // Join conversation for real-time updates
        await joinConversationRealtime(conversationId);

        // Update conversations list if this conversation exists there
        setConversations((prev) =>
          prev.map((conv) =>
            conv.conversationId === conversationId ? conversation : conv
          )
        );

        return conversation;
      } catch (err) {
        console.error("❌ Error getting conversation:", err);
        return null;
      }
    },
    [joinConversationRealtime]
  );

  const createConversation = useCallback(
    async (
      conversationData: CreateConversationRequest
    ): Promise<Conversation | null> => {
      try {
        setCreatingConversation(true);
        setError(null);

        console.log("➕ Creating conversation:", conversationData);

        const response = await chatService.createConversation(conversationData);

        if (response.success && response.conversation) {
          const newConversation = chatService.normalizeConversationResponse(
            response.conversation
          );

          setConversations((prev) =>
            [newConversation, ...prev].slice(0, maxConversations)
          );
          setCurrentConversation(newConversation);

          await joinConversationRealtime(newConversation.conversationId);

          return newConversation;
        } else {
          throw new Error(response.message || "Failed to create conversation");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create conversation";
        setError(errorMessage);
        console.error("❌ Error creating conversation:", err);
        return null;
      } finally {
        setCreatingConversation(false);
      }
    },
    [maxConversations, joinConversationRealtime]
  );

  const createDirectConversation = useCallback(
    async (
      otherUserId: number,
      otherUserName: string
    ): Promise<Conversation | null> => {
      try {
        console.log("💬 Creating direct conversation with user:", otherUserId);

        // First check if conversation already exists
        try {
          const existingConv = await chatService.getDirectConversation(
            otherUserId
          );
          const conversation =
            chatService.normalizeConversationResponse(existingConv);
          setCurrentConversation(conversation);

          await joinConversationRealtime(conversation.conversationId);

          return conversation;
        } catch {
          // Conversation doesn't exist, create new one
          return await createConversation({
            title: `Chat with ${otherUserName}`,
            type: ConversationType.DIRECT,
            participantIds: [otherUserId],
            status: ConversationStatus.ACTIVE,
          });
        }
      } catch (err) {
        console.error("❌ Error creating direct conversation:", err);
        return null;
      }
    },
    [createConversation, joinConversationRealtime]
  );

  // ===== MESSAGE METHODS =====

  const sendMessage = useCallback(
    async (
      messageData: SendMessageRequest,
      optimistic: boolean = true
    ): Promise<Message | null> => {
      try {
        setSendingMessage(true);
        setError(null);

        console.log("💬 Sending message:", messageData);

        // Validate message
        const validation = chatService.validateMessageContent(
          messageData.content
        );
        if (!validation.isValid) {
          throw new Error(validation.error);
        }

        let optimisticMessage: Message | undefined;

        // Add optimistic message to UI
        if (optimistic && messageData.conversationId) {
          optimisticMessage = {
            messageId: Date.now(),
            senderId: userId || 0,
            recipientId: messageData.recipientId,
            conversationId: messageData.conversationId,
            content: messageData.content,
            createdAt: new Date().toISOString(),
            messageType: messageData.messageType || MessageType.TEXT,
            status: MessageStatus.SENDING,
            isOptimistic: true,
            localId: `local_${Date.now()}`,
          };

          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.conversationId === messageData.conversationId) {
                return {
                  ...conv,
                  lastMessage: optimisticMessage,
                  updatedAt: new Date().toISOString(),
                };
              }
              return conv;
            })
          );
        }

        // Send message to server
        const response = await chatService.sendMessage(messageData);

        if (response.success && response.messageData) {
          const sentMessage = chatService.normalizeMessageResponse(
            response.messageData
          );

          console.log("✅ Message sent successfully:", sentMessage);
          console.log("🚀 Real-time delivery should be active for other users");

          // Update conversations list with real message
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.conversationId === sentMessage.conversationId) {
                return {
                  ...conv,
                  lastMessage: sentMessage,
                  updatedAt: new Date().toISOString(),
                };
              }
              return conv;
            })
          );

          // If conversation was created, update current conversation
          if (response.conversationId && !messageData.conversationId) {
            await getConversation(response.conversationId);
          }

          return sentMessage;
        } else {
          throw new Error(response.message || "Failed to send message");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        setError(errorMessage);
        console.error("❌ Error sending message:", err);

        // Mark optimistic message as failed
        if (messageData.conversationId) {
          setConversations((prev) =>
            prev.map((conv) => {
              if (
                conv.conversationId === messageData.conversationId &&
                conv.lastMessage?.isOptimistic
              ) {
                return {
                  ...conv,
                  lastMessage: {
                    ...conv.lastMessage,
                    status: MessageStatus.FAILED,
                  },
                };
              }
              return conv;
            })
          );
        }

        return null;
      } finally {
        setSendingMessage(false);
      }
    },
    [userId, getConversation]
  );

  const sendDirectMessage = useCallback(
    async (
      recipientId: number,
      content: string,
      recipientName: string
    ): Promise<Message | null> => {
      try {
        console.log("💬 Sending direct message to:", recipientId);

        let conversation = currentConversation;

        if (!conversation || conversation.type !== ConversationType.DIRECT) {
          conversation = await createDirectConversation(
            recipientId,
            recipientName
          );
          if (!conversation) {
            throw new Error("Failed to create or find conversation");
          }
        }

        return await sendMessage({
          recipientId,
          content,
          messageType: MessageType.TEXT,
          conversationId: conversation.conversationId,
        });
      } catch (err) {
        console.error("❌ Error sending direct message:", err);
        return null;
      }
    },
    [currentConversation, createDirectConversation, sendMessage]
  );

  // ===== SEARCH METHODS =====

  const searchConversationsAndPhotographers = useCallback(
    async (query: string): Promise<void> => {
      try {
        setLoadingSearch(true);
        setSearchError(null);

        if (!query || query.trim() === "") {
          setSearchResults({
            conversations: [],
            photographers: [],
            totalResults: 0,
          });
          setIsSearchMode(false);
          return;
        }

        console.log("🔍 Searching:", query);
        setIsSearchMode(true);

        const results = await chatService.searchConversationsAndPhotographers(
          query.trim()
        );
        setSearchResults(results);

        console.log("✅ Search results:", {
          conversations: results.conversations.length,
          photographers: results.photographers.length,
          total: results.totalResults,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Search failed";
        setSearchError(errorMessage);
        console.error("❌ Search error:", err);
      } finally {
        setLoadingSearch(false);
      }
    },
    []
  );

  const searchPhotographers = useCallback(
    async (
      params: SearchPhotographersParams
    ): Promise<PhotographerSearchResult[]> => {
      try {
        setLoadingSearch(true);
        setSearchError(null);

        console.log("🔍 Searching photographers:", params);

        const photographers = await chatService.searchPhotographers(params);

        console.log("✅ Photographers found:", photographers.length);
        return photographers;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Photographer search failed";
        setSearchError(errorMessage);
        console.error("❌ Photographer search error:", err);
        return [];
      } finally {
        setLoadingSearch(false);
      }
    },
    []
  );

  const debouncedSearch = useCallback(
    (query: string, delay: number = 500) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      searchTimeoutRef.current = setTimeout(() => {
        searchConversationsAndPhotographers(query);
      }, delay);
    },
    [searchConversationsAndPhotographers]
  );

  const handleSearchQueryChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      debouncedSearch(query);
    },
    [debouncedSearch]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults({
      conversations: [],
      photographers: [],
      totalResults: 0,
    });
    setIsSearchMode(false);
    setSearchError(null);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  // ===== UTILITY METHODS =====

  const validateMessageData = useCallback(
    (messageData: SendMessageRequest): ChatValidationErrors => {
      const errors: ChatValidationErrors = {};

      if (!messageData.content || messageData.content.trim() === "") {
        errors.content = "Message content is required";
      } else if (messageData.content.length > 1000) {
        errors.content = "Message too long (max 1000 characters)";
      }

      if (!messageData.recipientId || messageData.recipientId <= 0) {
        errors.recipientId = "Valid recipient is required";
      }

      return errors;
    },
    []
  );

  const getConversationByParticipant = useCallback(
    (userId: number): Conversation | null => {
      return (
        conversations.find(
          (conv) =>
            conv.type === ConversationType.DIRECT &&
            conv.participants.some((p) => p.userId === userId)
        ) || null
      );
    },
    [conversations]
  );

  const getTotalUnreadCount = useCallback((): number => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  }, [conversations]);

  const markConversationAsRead = useCallback(
    async (conversationId: number): Promise<void> => {
      try {
        setConversations((prev) =>
          prev.map((conv) =>
            conv.conversationId === conversationId
              ? { ...conv, unreadCount: 0 }
              : conv
          )
        );

        console.log("✅ Conversation marked as read locally:", conversationId);
      } catch (err) {
        console.error("❌ Error marking conversation as read:", err);
      }
    },
    []
  );

  // ✅ Real-time utility methods
  const isUserOnline = useCallback(
    (userId: number): boolean => {
      return onlineUsers.has(userId);
    },
    [onlineUsers]
  );

  const getSignalRStatus = useCallback(() => {
    return signalRManager.getStatus();
  }, []);

  const reconnectSignalR = useCallback(async () => {
    if (userId) {
      signalRInitializedRef.current = false;
      setConnectionAttempts(0);
      await initializeSignalR();
    }
  }, [userId, initializeSignalR]);

  const testReceiveMessage = useCallback(() => {
    const testMessage = {
      messageId: Date.now(),
      senderId: 999,
      recipientId: userId || 0,
      conversationId: conversations[0]?.conversationId || 1,
      content: "🧪 Test real-time message from useChat hook",
      createdAt: new Date().toISOString(),
      messageType: "Text",
      status: "sent",
      senderName: "Test User",
      senderProfileImage: undefined,
    };

    console.log("🧪 Testing message reception manually...");
    signalRHandlers.onMessageReceived?.(testMessage);
  }, [userId, conversations, signalRHandlers]);

  const clearError = useCallback(() => {
    setError(null);
    setSearchError(null);
    setSignalRError(null);
  }, []);

  // ===== EFFECTS =====

  // Initialize SignalR when userId is available
  useEffect(() => {
    if (userId && enableRealtime) {
      console.log("🚀 Initializing SignalR for userId:", userId);
      initializeSignalR();
    }

    return () => {
      if (signalRInitializedRef.current) {
        console.log("🔌 Cleaning up SignalR...");
        signalRManager.stop();
        signalRInitializedRef.current = false;
        setIsSignalRConnected(false);
      }
    };
  }, [userId, enableRealtime, initializeSignalR]);

  // Auto refresh conversations
  useEffect(() => {
    if (!autoRefresh) return;

    refreshIntervalRef.current = setInterval(() => {
      console.log("🔄 Auto refreshing conversations...");
      refreshConversations();
    }, refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, refreshConversations]);

  // Load conversations on mount
  useEffect(() => {
    if (userId) {
      loadConversations();
    }
  }, [userId, loadConversations]);

  // Leave conversation when currentConversation changes
  useEffect(() => {
    return () => {
      if (currentConversation && enableRealtime) {
        leaveConversationRealtime(currentConversation.conversationId);
      }
    };
  }, [currentConversation, enableRealtime, leaveConversationRealtime]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // ===== RETURN VALUES =====

  return {
    // ===== DATA =====
    conversations,
    currentConversation,
    searchResults,
    searchQuery,

    // ===== LOADING STATES =====
    loadingConversations,
    loadingSearch,
    sendingMessage,
    creatingConversation,

    // ===== ERROR STATES =====
    error,
    searchError,
    signalRError,

    // ===== UI STATES =====
    isSearchMode,

    // ✅ Real-time states
    isSignalRConnected,
    onlineUsers,
    connectionAttempts,

    // ===== CONVERSATION METHODS =====
    loadConversations,
    refreshConversations,
    getConversation,
    createConversation,
    createDirectConversation,
    setCurrentConversation,

    // ===== MESSAGE METHODS =====
    sendMessage,
    sendDirectMessage,

    // ===== SEARCH METHODS =====
    searchConversationsAndPhotographers,
    searchPhotographers,
    handleSearchQueryChange,
    clearSearch,

    // ===== UTILITY METHODS =====
    validateMessageData,
    getConversationByParticipant,
    getTotalUnreadCount,
    markConversationAsRead,
    clearError,

    // ✅ Real-time utility methods
    isUserOnline,
    getSignalRStatus,
    reconnectSignalR,
    joinConversationRealtime,
    leaveConversationRealtime,
    testReceiveMessage,

    // ===== SETTER METHODS =====
    setConversations,
    setError,
    setSearchError,
  };
};

// ===== INDIVIDUAL CONVERSATION HOOK (Enhanced) =====

export const useConversation = (options: UseConversationOptions) => {
  const {
    conversationId,
    autoMarkAsRead = true,
    loadHistoryOnMount = true,
    maxMessages = 500,
    enableTypingIndicator = true,
    enableRealtime = true,
  } = options;

  // ===== STATES =====
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Typing indicator
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ✅ SignalR handlers for individual conversation
  const conversationSignalRHandlers: SignalREventHandlers = useMemo(
    () => ({
      onMessageReceived: (message) => {
        const normalizedMessage = chatService.normalizeMessageResponse(message);

        if (normalizedMessage.conversationId === conversationId) {
          console.log(
            "📨 Adding real-time message to conversation:",
            normalizedMessage
          );

          setMessages((prev) => {
            const exists = prev.find(
              (m) => m.messageId === normalizedMessage.messageId
            );
            if (exists) {
              console.log("⚠️ Message already exists, skipping...");
              return prev;
            }

            const newMessages = [...prev, normalizedMessage].slice(
              -maxMessages
            );
            console.log(
              "✅ Added real-time message. Total messages:",
              newMessages.length
            );
            return newMessages;
          });
        }
      },
    }),
    [conversationId, maxMessages]
  );

  // Initialize SignalR for this conversation
  useEffect(() => {
    if (enableRealtime && conversationId) {
      console.log("🔌 Setting up real-time for conversation:", conversationId);

      signalRManager.updateEventHandlers(conversationSignalRHandlers);
      signalRManager.joinConversation(conversationId);

      return () => {
        console.log(
          "🚪 Leaving conversation real-time updates:",
          conversationId
        );
        signalRManager.leaveConversation(conversationId);
      };
    }
  }, [enableRealtime, conversationId, conversationSignalRHandlers]);

  // ===== MESSAGE METHODS =====

  const loadMessages = useCallback(
    async (page: number = 1, pageSize: number = 20): Promise<boolean> => {
      try {
        setLoadingMessages(true);
        setError(null);

        console.log(
          "💬 Loading messages for conversation:",
          conversationId,
          "page:",
          page
        );

        const response = await chatService.getConversationMessages(
          conversationId,
          page,
          pageSize
        );

        const normalizedMessages =
          response.messages?.map((msg) =>
            chatService.normalizeMessageResponse(msg)
          ) || [];

        const sortedMessages = normalizedMessages.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        setMessages((prev) => {
          if (page === 1) {
            return sortedMessages.slice(-maxMessages);
          } else {
            const combined = [...sortedMessages, ...prev];
            return combined.slice(-maxMessages);
          }
        });

        setHasMoreMessages(response.hasMore);
        setCurrentPage(page);

        console.log(
          "✅ Messages loaded:",
          sortedMessages.length,
          "hasMore:",
          response.hasMore
        );
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load messages";
        setError(errorMessage);
        console.error("❌ Error loading messages:", err);
        return false;
      } finally {
        setLoadingMessages(false);
      }
    },
    [conversationId, maxMessages]
  );

  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (!hasMoreMessages || loadingMessages) return;
    await loadMessages(currentPage + 1);
  }, [hasMoreMessages, loadingMessages, currentPage, loadMessages]);

  // Other methods remain the same...
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load conversation and messages on mount
  useEffect(() => {
    if (conversationId && loadHistoryOnMount) {
      loadMessages();
    }
  }, [conversationId, loadHistoryOnMount, loadMessages]);

  return {
    // ===== DATA =====
    messages,
    conversation,

    // ===== LOADING STATES =====
    loadingMessages,
    sendingMessage,

    // ===== PAGINATION =====
    hasMoreMessages,
    currentPage,

    // ===== ERROR STATE =====
    error,

    // ===== TYPING INDICATOR =====
    isTyping,
    typingUsers,

    // ===== MESSAGE METHODS =====
    loadMessages,
    loadMoreMessages,

    // ===== UTILITY METHODS =====
    clearError,

    // ===== SETTER METHODS =====
    setMessages,
    setError,
  };
};
