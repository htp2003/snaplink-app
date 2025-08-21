// hooks/useChat.ts - Chat Logic Hook

import { useState, useCallback, useEffect, useRef } from "react";
import { chatService } from "../services/chatService";
import {
  signalRManager,
  SignalREventHandlers,
} from "../services/signalRManager";
import { useAuth } from "../hooks/useAuth";
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
    refreshInterval = 30000, // 30 seconds
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

  // Refs for cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ===== CONVERSATION METHODS =====

  const loadConversations = useCallback(
    async (page: number = 1, pageSize: number = 20): Promise<boolean> => {
      try {
        setLoadingConversations(true);
        setError(null);

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
            // Append new conversations, remove duplicates, and limit
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
        const response = await chatService.getConversation(conversationId);
        const conversation =
          chatService.normalizeConversationResponse(response);

        setCurrentConversation(conversation);

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
    []
  );

  const createConversation = useCallback(
    async (
      conversationData: CreateConversationRequest
    ): Promise<Conversation | null> => {
      try {
        setCreatingConversation(true);
        setError(null);

        const response = await chatService.createConversation(conversationData);

        if (response.success && response.conversation) {
          const newConversation = chatService.normalizeConversationResponse(
            response.conversation
          );

          // Add to conversations list
          setConversations((prev) =>
            [newConversation, ...prev].slice(0, maxConversations)
          );
          setCurrentConversation(newConversation);

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
    [maxConversations]
  );

  const createDirectConversation = useCallback(
    async (
      otherUserId: number,
      otherUserName: string
    ): Promise<Conversation | null> => {
      try {
        // First check if conversation already exists
        try {
          const existingConv = await chatService.getDirectConversation(
            otherUserId
          );
          const conversation =
            chatService.normalizeConversationResponse(existingConv);
          setCurrentConversation(conversation);
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
    [createConversation]
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
            messageId: Date.now(), // Temporary ID
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

          // Update conversations list with optimistic message
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
        // First, find or create direct conversation
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

        // Send message
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

        setIsSearchMode(true);

        const results = await chatService.searchConversationsAndPhotographers(
          query.trim()
        );
        setSearchResults(results);
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

        const photographers = await chatService.searchPhotographers(params);

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
        // Update local state immediately
        setConversations((prev) =>
          prev.map((conv) =>
            conv.conversationId === conversationId
              ? { ...conv, unreadCount: 0 }
              : conv
          )
        );
      } catch (err) {
        console.error("❌ Error marking conversation as read:", err);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
    setSearchError(null);
  }, []);

  // ===== EFFECTS =====

  // Auto refresh conversations
  useEffect(() => {
    if (!autoRefresh) return;

    refreshIntervalRef.current = setInterval(() => {
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

    // ===== UI STATES =====
    isSearchMode,

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

    // ===== SETTER METHODS =====
    setConversations,
    setError,
    setSearchError,
  };
};

// ===== INDIVIDUAL CONVERSATION HOOK =====

export const useConversation = (options: UseConversationOptions) => {
  const {
    conversationId,
    autoMarkAsRead = true,
    loadHistoryOnMount = true,
    maxMessages = 500,
    enableTypingIndicator = true,
    enableRealtime = true,
  } = options;
  const { getCurrentUserId } = useAuth();

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

  // ===== MESSAGE METHODS =====

  const loadMessages = useCallback(
    async (page: number = 1, pageSize: number = 20): Promise<boolean> => {
      try {
        setLoadingMessages(true);
        setError(null);

        const response = await chatService.getConversationMessages(
          conversationId,
          page,
          pageSize
        );

        const normalizedMessages =
          response.messages?.map((msg) =>
            chatService.normalizeMessageResponse(msg)
          ) || [];

        // Sort messages by creation time (oldest first)
        const sortedMessages = normalizedMessages.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        setMessages((prev) => {
          if (page === 1) {
            return sortedMessages.slice(-maxMessages); // Keep only latest messages
          } else {
            // Prepend older messages
            const combined = [...sortedMessages, ...prev];
            return combined.slice(-maxMessages); // Keep only latest messages
          }
        });

        setHasMoreMessages(response.hasMore);
        setCurrentPage(page);

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

  // ✅ FIXED useConversation sendMessage method

  const sendMessage = useCallback(
    async (
      content: string,
      messageType: MessageType = MessageType.TEXT
    ): Promise<Message | null> => {
      try {
        setSendingMessage(true);
        setError(null);

        if (!conversation) {
          throw new Error("No conversation selected");
        }

        // ✅ FIX 1: Get recipient from conversation data or participants
        let recipientId: number;

        if (conversation.otherParticipant?.userId) {
          // From conversation data
          recipientId = conversation.otherParticipant.userId;
        } else if (
          conversation.participants &&
          conversation.participants.length >= 2
        ) {
          // ✅ FIX 2: Fallback - find participant that is not current user
          const currentUserId = getCurrentUserId(); // Assuming this is available

          const recipient = conversation.participants.find(
            (p) => p.userId !== currentUserId
          );

          if (recipient) {
            recipientId = recipient.userId;
          } else {
            throw new Error(
              "Could not find recipient - all participants are current user"
            );
          }
        } else {
          // ✅ FIX 3: Last resort - use first participant if available
          if (
            conversation.participants &&
            conversation.participants.length > 0
          ) {
            recipientId = conversation.participants[0].userId;
          } else {
            console.error(
              "❌ No participants found in conversation:",
              conversation
            );
            throw new Error(
              "No recipient found - conversation has no participants"
            );
          }
        }

        // ✅ Validate recipient ID
        if (!recipientId || recipientId <= 0) {
          throw new Error(`Invalid recipient ID: ${recipientId}`);
        }

        // ✅ Create optimistic message with correct IDs
        const optimisticMessage: Message = {
          messageId: Date.now(),
          senderId: getCurrentUserId() || 0, // Current user is sender
          recipientId: recipientId, // Validated recipient
          conversationId,
          content,
          createdAt: new Date().toISOString(),
          messageType,
          status: MessageStatus.SENT,
          isOptimistic: true,
          localId: `local_${Date.now()}`,
        };

        setMessages((prev) => [...prev, optimisticMessage].slice(-maxMessages));

        // ✅ Send to server with validated data
        const response = await chatService.sendMessage({
          recipientId: recipientId,
          content,
          messageType,
          conversationId,
        });

        if (response.success && response.messageData) {
          const sentMessage = chatService.normalizeMessageResponse(
            response.messageData
          );

          // Replace optimistic message with real message
          setMessages((prev) =>
            prev.map((msg) =>
              msg.localId === optimisticMessage.localId ? sentMessage : msg
            )
          );

          return sentMessage;
        } else {
          console.error("❌ SendMessage API failed:", response);
          throw new Error(response.message || "Failed to send message");
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to send message";
        console.error("❌ Error sending message:", {
          error: errorMessage,
          conversation: conversation
            ? {
                id: conversation.conversationId,
                participantsCount: conversation.participants?.length,
                hasOtherParticipant: !!conversation.otherParticipant,
              }
            : null,
        });

        setError(errorMessage);

        // Mark optimistic message as failed
        setMessages((prev) =>
          prev.map((msg) =>
            msg.isOptimistic && msg.localId
              ? { ...msg, status: MessageStatus.FAILED }
              : msg
          )
        );

        return null;
      } finally {
        setSendingMessage(false);
      }
    },
    [conversation, conversationId, maxMessages, getCurrentUserId]
  );

  // ✅ FIX markMessagesAsRead trong useConversation hook

  const markMessagesAsRead = useCallback(
    async (messageIds?: number[]): Promise<void> => {
      if (!autoMarkAsRead) return;

      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) {
          console.warn("⚠️ No current user ID, cannot mark messages as read");
          return;
        }

        let messagesToMark: Message[];

        if (messageIds) {
          // Mark specific messages
          messagesToMark = messages.filter((msg) =>
            messageIds.includes(msg.messageId)
          );
        } else {
          // Mark all unread messages
          messagesToMark = messages.filter(
            (msg) =>
              msg.status !== MessageStatus.READ &&
              msg.senderId !== currentUserId // ✅ FIX: Don't mark own messages as read
          );
        }

        if (messagesToMark.length === 0) {
          return;
        }

        // Mark messages as read on server
        // const markPromises = messagesToMark.map(async (message) => {
        //   try {
        //     // ✅ Only mark messages from other users
        //     if (message.senderId === currentUserId) {
        //       return;
        //     }

        //     await chatService.markMessageAsRead(message.messageId);
        //   } catch (err) {
        //     console.warn(
        //       "⚠️ Failed to mark message as read:",
        //       message.messageId,
        //       err
        //     );
        //     // Don't throw, continue with other messages
        //   }
        // });

        // await Promise.allSettled(markPromises);

        // Update local state for successfully marked messages
        setMessages((prev) =>
          prev.map((msg) => {
            const shouldUpdate = messagesToMark.some(
              (marked) =>
                marked.messageId === msg.messageId &&
                marked.senderId !== currentUserId // Only update non-own messages
            );

            if (shouldUpdate) {
              return {
                ...msg,
                status: MessageStatus.READ,
                readAt: new Date().toISOString(),
              };
            }

            return msg;
          })
        );
      } catch (err) {
        console.error("❌ Error in markMessagesAsRead:", err);
      }
    },
    [autoMarkAsRead, messages, getCurrentUserId]
  );

  // ===== CONVERSATION METHODS =====

  const loadConversation = useCallback(async (): Promise<void> => {
    try {
      const response = await chatService.getConversation(conversationId);
      const conv = chatService.normalizeConversationResponse(response);

      setConversation(conv);
    } catch (err) {
      console.error("❌ Error loading conversation:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load conversation"
      );
    }
  }, [conversationId]);

  // ===== TYPING INDICATOR =====

  const startTyping = useCallback(() => {
    if (!enableTypingIndicator) return;

    setIsTyping(true);

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 3000); // Stop typing after 3 seconds of inactivity
  }, [enableTypingIndicator]);

  const stopTyping = useCallback(() => {
    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
  }, []);

  // ===== UTILITY METHODS =====

  const retryFailedMessage = useCallback(
    async (localId: string): Promise<void> => {
      const failedMessage = messages.find(
        (msg) => msg.localId === localId && msg.status === MessageStatus.FAILED
      );
      if (!failedMessage) return;

      await sendMessage(failedMessage.content, failedMessage.messageType);
    },
    [messages, sendMessage]
  );

  const deleteMessage = useCallback(
    async (messageId: number): Promise<void> => {
      try {
        await chatService.deleteMessage(messageId);
        setMessages((prev) =>
          prev.filter((msg) => msg.messageId !== messageId)
        );
      } catch (err) {
        console.error("❌ Error deleting message:", err);
        setError("Failed to delete message");
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ===== EFFECTS =====

  // Load conversation and messages on mount
  useEffect(() => {
    if (conversationId && loadHistoryOnMount) {
      loadConversation();
      loadMessages();
    }
  }, [conversationId, loadHistoryOnMount, loadConversation, loadMessages]);

  

  // Mark messages as read when messages change
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        markMessagesAsRead();
      }, 1000); // Delay to avoid excessive API calls

      return () => clearTimeout(timer);
    }
  }, [messages, markMessagesAsRead]);

  // Cleanup typing timeout
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

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
    sendMessage,
    markMessagesAsRead,
    retryFailedMessage,
    deleteMessage,

    // ===== CONVERSATION METHODS =====
    loadConversation,

    // ===== TYPING METHODS =====
    startTyping,
    stopTyping,

    // ===== UTILITY METHODS =====
    clearError,

    // ===== SETTER METHODS =====
    setMessages,
    setError,
  };
};
