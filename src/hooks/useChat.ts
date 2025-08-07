// hooks/useChat.ts - Fixed Chat Logic Hook with SignalR

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { chatService } from '../services/chatService';
import { signalRManager, SignalREventHandlers } from '../services/signalRManager';
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
  ChatError
} from '../types/chat';

// ===== MAIN CHAT HOOK =====

export const useChat = (options: UseChatOptions = {}) => {
  const { 
    userId, 
    autoRefresh = false, 
    refreshInterval = 30000, // 30 seconds
    enableRealtime = true, // ✅ Enabled by default
    maxConversations = 100,
    maxMessagesPerConversation = 500
  } = options;

  // ===== STATES =====
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [searchResults, setSearchResults] = useState<ChatSearchResult>({
    conversations: [],
    photographers: [],
    totalResults: 0
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchMode, setIsSearchMode] = useState(false);

  // ✅ NEW: SignalR states
  const [isSignalRConnected, setIsSignalRConnected] = useState(false);
  const [signalRError, setSignalRError] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<number>>(new Set());
  
  // Refs for cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const signalRInitializedRef = useRef(false);

  // ✅ FIXED: Memoized SignalR Event Handlers to prevent recreation
  const signalRHandlers: SignalREventHandlers = useMemo(() => ({
    onMessageReceived: (message) => {
      console.log('🔥 REAL-TIME MESSAGE RECEIVED IN useChat:', message);
      console.log('🔥 Message details:', JSON.stringify(message, null, 2));
      
      const normalizedMessage = chatService.normalizeMessageResponse(message);
      
      // Update conversations list with new message
      setConversations(prev => {
        console.log('📋 Updating conversations with new message...');
        const updated = prev.map(conv => {
          if (conv.conversationId === normalizedMessage.conversationId) {
            console.log('✅ Found matching conversation:', conv.conversationId);
            return {
              ...conv,
              lastMessage: normalizedMessage,
              updatedAt: new Date().toISOString(),
              unreadCount: conv.unreadCount + 1 // Increment unread count
            };
          }
          return conv;
        });
        
        console.log('📋 Conversations updated:', updated.length);
        return updated;
      });
      
      // If we have a conversation that doesn't exist in our list, refresh conversations
      const existingConv = conversations.find(c => c.conversationId === normalizedMessage.conversationId);
      if (!existingConv && normalizedMessage.conversationId) {
        console.log('🔄 New conversation detected, refreshing list...');
        loadConversations(1, 20);
      }
    },

    onNewConversation: (conversation) => {
      console.log('➕ New conversation created via SignalR:', conversation);
      
      const normalizedConversation = chatService.normalizeConversationResponse(conversation);
      
      // Add new conversation to the top of the list
      setConversations(prev => {
        const exists = prev.find(c => c.conversationId === normalizedConversation.conversationId);
        if (!exists) {
          console.log('✅ Adding new conversation to list');
          return [normalizedConversation, ...prev].slice(0, maxConversations);
        }
        console.log('⚠️ Conversation already exists, skipping');
        return prev;
      });
    },

    onConversationUpdated: (conversation) => {
      console.log('✏️ Conversation updated via SignalR:', conversation);
      
      const normalizedConversation = chatService.normalizeConversationResponse(conversation);
      
      // Update existing conversation
      setConversations(prev => prev.map(conv => 
        conv.conversationId === normalizedConversation.conversationId 
          ? normalizedConversation 
          : conv
      ));
      
      // Update current conversation if it matches
      setCurrentConversation(prev => 
        prev?.conversationId === normalizedConversation.conversationId 
          ? normalizedConversation 
          : prev
      );
    },

    onMessageStatusChanged: (messageId, status) => {
      console.log('📝 Message status changed via SignalR:', messageId, status);
      
      // This would be handled by individual conversation hooks
      // But we can update conversations list if needed
    },

    onUserOnlineStatusChanged: (userId, isOnline) => {
      console.log('👤 User online status changed:', userId, isOnline);
      
      setOnlineUsers(prev => {
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
      console.log('🔌 SignalR connection status changed:', isConnected);
      setIsSignalRConnected(isConnected);
      
      if (!isConnected) {
        setSignalRError('Connection lost. Attempting to reconnect...');
      } else {
        setSignalRError(null);
        console.log('✅ SignalR reconnected successfully');
      }
    }
  }), [conversations, maxConversations]); // ✅ Add dependencies

  // ✅ FIXED: Initialize SignalR with proper handlers
  const initializeSignalR = useCallback(async () => {
    if (!enableRealtime || !userId || signalRInitializedRef.current) {
      return;
    }

    try {
      console.log('🔌 Initializing SignalR for chat...');
      setSignalRError(null);
      
      const success = await signalRManager.initialize(userId, signalRHandlers);
      
      if (success) {
        console.log('✅ SignalR initialized successfully');
        setIsSignalRConnected(true);
        signalRInitializedRef.current = true;
      } else {
        throw new Error('Failed to initialize SignalR');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'SignalR initialization failed';
      console.error('❌ SignalR initialization error:', err);
      setSignalRError(errorMessage);
      setIsSignalRConnected(false);
    }
  }, [enableRealtime, userId, signalRHandlers]);

  // ✅ FIXED: Update handlers when they change
  useEffect(() => {
    if (isSignalRConnected) {
      console.log('🔄 Updating SignalR event handlers...');
      signalRManager.updateEventHandlers(signalRHandlers);
    }
  }, [signalRHandlers, isSignalRConnected]);

  // ✅ NEW: Join conversation for real-time updates
  const joinConversationRealtime = useCallback(async (conversationId: number) => {
    if (!enableRealtime || !isSignalRConnected) {
      console.log('⚠️ Cannot join conversation - SignalR not connected');
      return;
    }

    try {
      await signalRManager.joinConversation(conversationId);
      console.log('🏠 Joined conversation for real-time updates:', conversationId);
    } catch (err) {
      console.error('❌ Failed to join conversation for real-time:', err);
    }
  }, [enableRealtime, isSignalRConnected]);

  // ✅ NEW: Leave conversation real-time updates
  const leaveConversationRealtime = useCallback(async (conversationId: number) => {
    if (!enableRealtime || !isSignalRConnected) {
      return;
    }

    try {
      await signalRManager.leaveConversation(conversationId);
      console.log('🚪 Left conversation real-time updates:', conversationId);
    } catch (err) {
      console.error('❌ Failed to leave conversation real-time:', err);
    }
  }, [enableRealtime, isSignalRConnected]);

  // ===== CONVERSATION METHODS (Enhanced) =====

  const loadConversations = useCallback(async (page: number = 1, pageSize: number = 20): Promise<boolean> => {
    try {
      setLoadingConversations(true);
      setError(null);

      console.log('📋 Loading conversations...');
      
      const response = await chatService.getConversations(page, pageSize);
      
      const normalizedConversations = response.conversations?.map(conv => 
        chatService.normalizeConversationResponse(conv)
      ) || [];
      
      // Sort by last message time
      const sortedConversations = normalizedConversations.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.createdAt;
        const bTime = b.lastMessage?.createdAt || b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(prev => {
        if (page === 1) {
          return sortedConversations.slice(0, maxConversations);
        } else {
          // Append new conversations, remove duplicates, and limit
          const combined = [...prev, ...sortedConversations];
          const unique = combined.filter((conv, index, arr) => 
            arr.findIndex(c => c.conversationId === conv.conversationId) === index
          );
          return unique.slice(0, maxConversations);
        }
      });

      console.log('✅ Conversations loaded:', sortedConversations.length);
      return true;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load conversations';
      setError(errorMessage);
      console.error('❌ Error loading conversations:', err);
      return false;
    } finally {
      setLoadingConversations(false);
    }
  }, [maxConversations]);

  const refreshConversations = useCallback(async (): Promise<void> => {
    await loadConversations(1, 20);
  }, [loadConversations]);

  const getConversation = useCallback(async (conversationId: number): Promise<Conversation | null> => {
    try {
      console.log('📋 Getting conversation:', conversationId);
      
      const response = await chatService.getConversation(conversationId);
      const conversation = chatService.normalizeConversationResponse(response);
      
      setCurrentConversation(conversation);
      
      // ✅ Join conversation for real-time updates
      await joinConversationRealtime(conversationId);
      
      // Update conversations list if this conversation exists there
      setConversations(prev => prev.map(conv => 
        conv.conversationId === conversationId ? conversation : conv
      ));
      
      return conversation;
      
    } catch (err) {
      console.error('❌ Error getting conversation:', err);
      return null;
    }
  }, [joinConversationRealtime]);

  const createConversation = useCallback(async (
    conversationData: CreateConversationRequest
  ): Promise<Conversation | null> => {
    try {
      setCreatingConversation(true);
      setError(null);

      console.log('➕ Creating conversation:', conversationData);
      
      const response = await chatService.createConversation(conversationData);
      
      if (response.success && response.conversation) {
        const newConversation = chatService.normalizeConversationResponse(response.conversation);
        
        // Add to conversations list
        setConversations(prev => [newConversation, ...prev].slice(0, maxConversations));
        setCurrentConversation(newConversation);
        
        // ✅ Join conversation for real-time updates
        await joinConversationRealtime(newConversation.conversationId);
        
        return newConversation;
      } else {
        throw new Error(response.message || 'Failed to create conversation');
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMessage);
      console.error('❌ Error creating conversation:', err);
      return null;
    } finally {
      setCreatingConversation(false);
    }
  }, [maxConversations, joinConversationRealtime]);

  const createDirectConversation = useCallback(async (otherUserId: number, otherUserName: string): Promise<Conversation | null> => {
    try {
      console.log('💬 Creating direct conversation with user:', otherUserId);
      
      // First check if conversation already exists
      try {
        const existingConv = await chatService.getDirectConversation(otherUserId);
        const conversation = chatService.normalizeConversationResponse(existingConv);
        setCurrentConversation(conversation);
        
        // ✅ Join conversation for real-time updates
        await joinConversationRealtime(conversation.conversationId);
        
        return conversation;
      } catch {
        // Conversation doesn't exist, create new one
        return await createConversation({
          title: `Chat with ${otherUserName}`,
          type: ConversationType.DIRECT,
          participantIds: [otherUserId],
          status: ConversationStatus.ACTIVE
        });
      }
      
    } catch (err) {
      console.error('❌ Error creating direct conversation:', err);
      return null;
    }
  }, [createConversation, joinConversationRealtime]);

  // ===== MESSAGE METHODS (No changes needed - just debugging) =====

  const sendMessage = useCallback(async (
    messageData: SendMessageRequest,
    optimistic: boolean = true
  ): Promise<Message | null> => {
    try {
      setSendingMessage(true);
      setError(null);

      console.log('💬 Sending message:', messageData);

      // Validate message
      const validation = chatService.validateMessageContent(messageData.content);
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
          localId: `local_${Date.now()}`
        };

        // Update conversations list with optimistic message
        setConversations(prev => prev.map(conv => {
          if (conv.conversationId === messageData.conversationId) {
            return {
              ...conv,
              lastMessage: optimisticMessage,
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        }));
      }

      // Send message to server
      const response = await chatService.sendMessage(messageData);

      if (response.success && response.messageData) {
        const sentMessage = chatService.normalizeMessageResponse(response.messageData);

        console.log('✅ Message sent successfully:', sentMessage);
        console.log('🚀 Server should now broadcast via SignalR to other users');

        // Update conversations list with real message
        setConversations(prev => prev.map(conv => {
          if (conv.conversationId === sentMessage.conversationId) {
            return {
              ...conv,
              lastMessage: sentMessage,
              updatedAt: new Date().toISOString()
            };
          }
          return conv;
        }));

        // If conversation was created, update current conversation
        if (response.conversationId && !messageData.conversationId) {
          await getConversation(response.conversationId);
        }

        return sentMessage;
      } else {
        throw new Error(response.message || 'Failed to send message');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      console.error('❌ Error sending message:', err);

      // Mark optimistic message as failed
      if (messageData.conversationId) {
        setConversations(prev => prev.map(conv => {
          if (conv.conversationId === messageData.conversationId && conv.lastMessage?.isOptimistic) {
            return {
              ...conv,
              lastMessage: {
                ...conv.lastMessage,
                status: MessageStatus.FAILED
              }
            };
          }
          return conv;
        }));
      }

      return null;
    } finally {
      setSendingMessage(false);
    }
  }, [userId, getConversation]);

  const sendDirectMessage = useCallback(async (
    recipientId: number,
    content: string,
    recipientName: string
  ): Promise<Message | null> => {
    try {
      console.log('💬 Sending direct message to:', recipientId);

      // First, find or create direct conversation
      let conversation = currentConversation;
      
      if (!conversation || conversation.type !== ConversationType.DIRECT) {
        conversation = await createDirectConversation(recipientId, recipientName);
        if (!conversation) {
          throw new Error('Failed to create or find conversation');
        }
      }

      // Send message
      return await sendMessage({
        recipientId,
        content,
        messageType: MessageType.TEXT,
        conversationId: conversation.conversationId
      });

    } catch (err) {
      console.error('❌ Error sending direct message:', err);
      return null;
    }
  }, [currentConversation, createDirectConversation, sendMessage]);

  // ===== SEARCH METHODS (No changes) =====

  const searchConversationsAndPhotographers = useCallback(async (query: string): Promise<void> => {
    try {
      setLoadingSearch(true);
      setSearchError(null);

      if (!query || query.trim() === '') {
        setSearchResults({
          conversations: [],
          photographers: [],
          totalResults: 0
        });
        setIsSearchMode(false);
        return;
      }

      console.log('🔍 Searching:', query);
      setIsSearchMode(true);

      const results = await chatService.searchConversationsAndPhotographers(query.trim());
      setSearchResults(results);

      console.log('✅ Search results:', {
        conversations: results.conversations.length,
        photographers: results.photographers.length,
        total: results.totalResults
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setSearchError(errorMessage);
      console.error('❌ Search error:', err);
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  const searchPhotographers = useCallback(async (params: SearchPhotographersParams): Promise<PhotographerSearchResult[]> => {
    try {
      setLoadingSearch(true);
      setSearchError(null);

      console.log('🔍 Searching photographers:', params);

      const photographers = await chatService.searchPhotographers(params);
      
      console.log('✅ Photographers found:', photographers.length);
      return photographers;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Photographer search failed';
      setSearchError(errorMessage);
      console.error('❌ Photographer search error:', err);
      return [];
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  const debouncedSearch = useCallback((query: string, delay: number = 500) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchConversationsAndPhotographers(query);
    }, delay);
  }, [searchConversationsAndPhotographers]);

  const handleSearchQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  }, [debouncedSearch]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults({
      conversations: [],
      photographers: [],
      totalResults: 0
    });
    setIsSearchMode(false);
    setSearchError(null);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  }, []);

  // ===== UTILITY METHODS (Enhanced) =====

  const validateMessageData = useCallback((messageData: SendMessageRequest): ChatValidationErrors => {
    const errors: ChatValidationErrors = {};

    if (!messageData.content || messageData.content.trim() === '') {
      errors.content = 'Message content is required';
    } else if (messageData.content.length > 1000) {
      errors.content = 'Message too long (max 1000 characters)';
    }

    if (!messageData.recipientId || messageData.recipientId <= 0) {
      errors.recipientId = 'Valid recipient is required';
    }

    return errors;
  }, []);

  const getConversationByParticipant = useCallback((userId: number): Conversation | null => {
    return conversations.find(conv => 
      conv.type === ConversationType.DIRECT &&
      conv.participants.some(p => p.userId === userId)
    ) || null;
  }, [conversations]);

  const getTotalUnreadCount = useCallback((): number => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  }, [conversations]);

  const markConversationAsRead = useCallback(async (conversationId: number): Promise<void> => {
    try {
      // Update local state immediately
      setConversations(prev => prev.map(conv => 
        conv.conversationId === conversationId 
          ? { ...conv, unreadCount: 0 }
          : conv
      ));

      // Mark messages as read on server would be handled by individual message hook
      console.log('✅ Conversation marked as read locally:', conversationId);

    } catch (err) {
      console.error('❌ Error marking conversation as read:', err);
    }
  }, []);

  // ✅ NEW: Real-time utility methods
  const isUserOnline = useCallback((userId: number): boolean => {
    return onlineUsers.has(userId);
  }, [onlineUsers]);

  const getSignalRStatus = useCallback(() => {
    return signalRManager.getStatus();
  }, []);

  const reconnectSignalR = useCallback(async () => {
    if (userId) {
      signalRInitializedRef.current = false;
      await initializeSignalR();
    }
  }, [userId, initializeSignalR]);

  // ✅ NEW: Manual test message receiver
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
      senderProfileImage: undefined
    };
    
    console.log('🧪 Testing message reception manually...');
    signalRHandlers.onMessageReceived?.(testMessage);
  }, [userId, conversations, signalRHandlers]);

  const clearError = useCallback(() => {
    setError(null);
    setSearchError(null);
    setSignalRError(null);
  }, []);

  // ===== EFFECTS =====

  // ✅ Initialize SignalR when userId is available
  useEffect(() => {
    if (userId && enableRealtime) {
      console.log('🚀 Initializing SignalR for userId:', userId);
      initializeSignalR();
    }

    // Cleanup SignalR on unmount or userId change
    return () => {
      if (signalRInitializedRef.current) {
        console.log('🔌 Cleaning up SignalR...');
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
      console.log('🔄 Auto refreshing conversations...');
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

  // ✅ Leave conversation when currentConversation changes
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
    testReceiveMessage, // ✅ For testing
    
    // ===== SETTER METHODS =====
    setConversations,
    setError,
    setSearchError,
  };
};

// ===== INDIVIDUAL CONVERSATION HOOK (Enhanced with SignalR) =====

export const useConversation = (options: UseConversationOptions) => {
  const { 
    conversationId,
    autoMarkAsRead = true,
    loadHistoryOnMount = true,
    maxMessages = 500,
    enableTypingIndicator = true,
    enableRealtime = true
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

  // ✅ FIXED: Memoized SignalR handlers for conversation
  const signalRHandlers: SignalREventHandlers = useMemo(() => ({
    onMessageReceived: (message) => {
      const normalizedMessage = chatService.normalizeMessageResponse(message);
      
      // Only add message if it belongs to current conversation
      if (normalizedMessage.conversationId === conversationId) {
        console.log('📨 Adding real-time message to conversation:', normalizedMessage);
        
        setMessages(prev => {
          // Check if message already exists (to prevent duplicates)
          const exists = prev.find(m => m.messageId === normalizedMessage.messageId);
          if (exists) {
            console.log('⚠️ Message already exists, skipping...');
            return prev;
          }
          
          // Add new message and maintain max limit
          const newMessages = [...prev, normalizedMessage].slice(-maxMessages);
          console.log('✅ Added real-time message. Total messages:', newMessages.length);
          return newMessages;
        });
      }
    }
  }), [conversationId, maxMessages]);

  // ✅ Initialize SignalR for this conversation
  useEffect(() => {
    if (enableRealtime && conversationId) {
      console.log('🔌 Setting up real-time for conversation:', conversationId);
      
      // Update SignalR handlers to include our conversation-specific handlers
      signalRManager.updateEventHandlers(signalRHandlers);
      
      // Join conversation for real-time updates
      signalRManager.joinConversation(conversationId);
      
      return () => {
        // Leave conversation when component unmounts
        console.log('🚪 Leaving conversation real-time updates:', conversationId);
        signalRManager.leaveConversation(conversationId);
      };
    }
  }, [enableRealtime, conversationId, signalRHandlers]);

  // ===== MESSAGE METHODS =====

  const loadMessages = useCallback(async (page: number = 1, pageSize: number = 20): Promise<boolean> => {
    try {
      setLoadingMessages(true);
      setError(null);

      console.log('💬 Loading messages for conversation:', conversationId, 'page:', page);

      const response = await chatService.getConversationMessages(conversationId, page, pageSize);
      
      const normalizedMessages = response.messages?.map(msg => 
        chatService.normalizeMessageResponse(msg)
      ) || [];

      // Sort messages by creation time (oldest first)
      const sortedMessages = normalizedMessages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setMessages(prev => {
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

      console.log('✅ Messages loaded:', sortedMessages.length, 'hasMore:', response.hasMore);
      return true;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load messages';
      setError(errorMessage);
      console.error('❌ Error loading messages:', err);
      return false;
    } finally {
      setLoadingMessages(false);
    }
  }, [conversationId, maxMessages]);

  const loadMoreMessages = useCallback(async (): Promise<void> => {
    if (!hasMoreMessages || loadingMessages) return;
    await loadMessages(currentPage + 1);
  }, [hasMoreMessages, loadingMessages, currentPage, loadMessages]);

  const sendMessage = useCallback(async (
    content: string,
    messageType: MessageType = MessageType.TEXT
  ): Promise<Message | null> => {
    try {
      setSendingMessage(true);
      setError(null);

      if (!conversation) {
        throw new Error('No conversation selected');
      }

      // Get recipient from conversation participants
      const recipient = conversation.participants.find(p => p.userId !== conversation.otherParticipant?.userId);
      if (!recipient) {
        throw new Error('No recipient found');
      }

      console.log('💬 Sending message in conversation:', conversationId);

      // Add optimistic message
      const optimisticMessage: Message = {
        messageId: Date.now(),
        senderId: conversation.otherParticipant?.userId || 0, // Current user ID
        recipientId: recipient.userId,
        conversationId,
        content,
        createdAt: new Date().toISOString(),
        messageType,
        status: MessageStatus.SENDING,
        isOptimistic: true,
        localId: `local_${Date.now()}`
      };

      setMessages(prev => [...prev, optimisticMessage].slice(-maxMessages));

      // Send to server
      const response = await chatService.sendMessage({
        recipientId: recipient.userId,
        content,
        messageType,
        conversationId
      });

      if (response.success && response.messageData) {
        const sentMessage = chatService.normalizeMessageResponse(response.messageData);

        // Replace optimistic message with real message
        setMessages(prev => prev.map(msg => 
          msg.localId === optimisticMessage.localId ? sentMessage : msg
        ));

        console.log('✅ Message sent, real-time delivery active');
        return sentMessage;
      } else {
        throw new Error(response.message || 'Failed to send message');
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      console.error('❌ Error sending message:', err);

      // Mark optimistic message as failed
      setMessages(prev => prev.map(msg => 
        msg.isOptimistic && msg.localId ? { ...msg, status: MessageStatus.FAILED } : msg
      ));

      return null;
    } finally {
      setSendingMessage(false);
    }
  }, [conversation, conversationId, maxMessages]);

  const markMessagesAsRead = useCallback(async (): Promise<void> => {
    if (!autoMarkAsRead || messages.length === 0) return;

    try {
      // Find unread messages
      const unreadMessages = messages.filter(msg => 
        msg.status !== MessageStatus.READ && 
        msg.senderId !== conversation?.otherParticipant?.userId // Don't mark own messages
      );

      if (unreadMessages.length === 0) return;

      console.log('👀 Marking messages as read:', unreadMessages.length);

      // Mark messages as read on server
      for (const message of unreadMessages) {
        try {
          await chatService.markMessageAsRead(message.messageId);
        } catch (err) {
          console.warn('⚠️ Failed to mark message as read:', message.messageId, err);
        }
      }

      // Update local state
      setMessages(prev => prev.map(msg => 
        unreadMessages.some(unread => unread.messageId === msg.messageId)
          ? { ...msg, status: MessageStatus.READ, readAt: new Date().toISOString() }
          : msg
      ));

    } catch (err) {
      console.error('❌ Error marking messages as read:', err);
    }
  }, [autoMarkAsRead, messages, conversation]);

  // ===== CONVERSATION METHODS =====

  const loadConversation = useCallback(async (): Promise<void> => {
    try {
      console.log('📋 Loading conversation:', conversationId);

      const response = await chatService.getConversation(conversationId);
      const conv = chatService.normalizeConversationResponse(response);
      
      setConversation(conv);

    } catch (err) {
      console.error('❌ Error loading conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
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

  const retryFailedMessage = useCallback(async (localId: string): Promise<void> => {
    const failedMessage = messages.find(msg => msg.localId === localId && msg.status === MessageStatus.FAILED);
    if (!failedMessage) return;

    await sendMessage(failedMessage.content, failedMessage.messageType);
  }, [messages, sendMessage]);

  const deleteMessage = useCallback(async (messageId: number): Promise<void> => {
    try {
      await chatService.deleteMessage(messageId);
      setMessages(prev => prev.filter(msg => msg.messageId !== messageId));
      console.log('✅ Message deleted:', messageId);
    } catch (err) {
      console.error('❌ Error deleting message:', err);
      setError('Failed to delete message');
    }
  }, []);

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