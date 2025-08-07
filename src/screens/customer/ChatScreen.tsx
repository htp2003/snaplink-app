// ChatScreen.tsx - Fixed to use useChat hook instead of useConversation

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  SafeAreaView,
  Dimensions,
  StyleSheet,
} from "react-native";
import { useRoute, useNavigation, RouteProp } from "@react-navigation/native";
import { useChat } from "../../hooks/useChat"; // ✅ Use useChat instead of useConversation
import { useAuth } from "../../hooks/useAuth";
import { chatService } from "../../services/chatService";

import {
  Message,
  MessageType,
  MessageStatus,
  ConversationParticipant,
} from "../../types/chat";

// Screen dimensions
const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Route params type
type ChatScreenRouteProp = RouteProp<
  {
    ChatScreen: {
      conversationId: number;
      title: string;
      otherUser?: ConversationParticipant;
    };
  },
  "ChatScreen"
>;

const ChatScreen = () => {
  const route = useRoute<ChatScreenRouteProp>();
  const navigation = useNavigation();
  const { getCurrentUserId } = useAuth();

  const { conversationId, title, otherUser } = route.params;
  const currentUserId = getCurrentUserId();

  // ===== USE CHAT HOOK =====
  const {
    conversations,
    getConversationById,
    sendMessageToConversation,
    isSignalRConnected,
  } = useChat({
    userId: currentUserId || 0,
    autoRefresh: true,
    enableRealtime: true,
  });

  // ===== LOCAL STATES =====
  const [messageText, setMessageText] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentPage = useRef(1);

  // ===== LOAD MESSAGES =====
  const loadMessages = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        if (page === 1) {
          setLoadingMessages(true);
        } else {
          setIsLoadingMore(true);
        }

        const response = await chatService.getConversationMessages(
          conversationId,
          page,
          20
        );

        if (response.messages) {
          const normalizedMessages = response.messages.map((msg) =>
            chatService.normalizeMessageResponse(msg)
          );

          if (append) {
            setMessages((prev) => [...normalizedMessages, ...prev]);
          } else {
            setMessages(normalizedMessages);
          }

          setHasMoreMessages(response.hasMore);
          currentPage.current = page;
        }
      } catch (err) {
        console.error("❌ Error loading messages:", err);
        setError("Failed to load messages");
      } finally {
        setLoadingMessages(false);
        setIsLoadingMore(false);
      }
    },
    [conversationId]
  );

  // ===== LOAD MORE MESSAGES =====
  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || isLoadingMore) return;

    await loadMessages(currentPage.current + 1, true);
  }, [hasMoreMessages, isLoadingMore, loadMessages]);

  // ===== SEND MESSAGE =====
  const sendMessage = useCallback(
    async (content: string, messageType: MessageType = MessageType.TEXT) => {
      if (!content.trim() || sendingMessage) return null;

      const tempMessage: Message = {
        messageId: Date.now(), // Temporary ID
        localId: `temp_${Date.now()}`,
        senderId: currentUserId || 0,
        conversationId: conversationId,
        content: content.trim(),
        createdAt: new Date().toISOString(),
        messageType,
        status: MessageStatus.SENDING,
        senderName: "You",
      };

      // Add temporary message to UI
      setMessages((prev) => [...prev, tempMessage]);

      try {
        setSendingMessage(true);

        const response = await chatService.sendMessage({
          recipientId: otherUser?.userId || 0,
          content: content.trim(),
          messageType,
          conversationId,
        });

        if (response.success && response.messageData) {
          // Replace temporary message with real message
          const realMessage = chatService.normalizeMessageResponse(
            response.messageData
          );

          setMessages((prev) =>
            prev.map((msg) =>
              msg.localId === tempMessage.localId ? realMessage : msg
            )
          );

          // Send via SignalR if connected
          if (isSignalRConnected && sendMessageToConversation) {
            try {
              await sendMessageToConversation(conversationId, realMessage);
            } catch (signalRError) {
              console.warn("⚠️ SignalR send failed:", signalRError);
            }
          }

          return realMessage;
        } else {
          throw new Error(response.message || "Failed to send message");
        }
      } catch (err) {
        console.error("❌ Error sending message:", err);

        // Mark message as failed
        setMessages((prev) =>
          prev.map((msg) =>
            msg.localId === tempMessage.localId
              ? { ...msg, status: MessageStatus.FAILED }
              : msg
          )
        );

        return null;
      } finally {
        setSendingMessage(false);
      }
    },
    [
      conversationId,
      currentUserId,
      otherUser,
      sendingMessage,
      isSignalRConnected,
      sendMessageToConversation,
    ]
  );

  // ===== TYPING HANDLERS (SIMPLIFIED) =====
  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      console.log("👀 Started typing");
    }
  }, [isTyping]);

  const stopTyping = useCallback(() => {
    if (isTyping) {
      setIsTyping(false);
      console.log("👀 Stopped typing");
    }
  }, [isTyping]);

  // ===== MARK AS READ =====
  const markMessagesAsRead = useCallback(async () => {
    try {
      const unreadMessages = messages.filter(
        (msg) =>
          msg.senderId !== currentUserId && msg.status !== MessageStatus.READ
      );

      for (const message of unreadMessages.slice(-5)) {
        // Mark last 5 unread messages
        await chatService.markMessageAsRead(message.messageId);
      }
    } catch (err) {
      console.warn("⚠️ Failed to mark messages as read:", err);
    }
  }, [messages, currentUserId]);

  // ===== EFFECTS =====

  // Load messages on mount
  useEffect(() => {
    loadMessages(1);
  }, [loadMessages]);

  // Mark messages as read when component mounts or messages change
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        markMessagesAsRead();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [messages, markMessagesAsRead]);

  // Set navigation title
  useEffect(() => {
    navigation.setOptions({
      title: title || "Chat",
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleProfilePress}
        >
          <Text style={styles.headerButtonText}>Profile</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, title]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Handle typing indicator with timeout
  useEffect(() => {
    if (messageText.length > 0) {
      startTyping();

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping();
      }, 2000);
    } else {
      stopTyping();
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [messageText, startTyping, stopTyping]);

  // ===== HANDLERS =====

  const handleProfilePress = useCallback(() => {
    if (otherUser) {
      console.log("👤 View profile for user:", otherUser.userId);
    }
  }, [otherUser]);

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || sendingMessage) return;

    const textToSend = messageText.trim();
    setMessageText(""); // Clear input immediately

    const sentMessage = await sendMessage(textToSend, MessageType.TEXT);

    if (!sentMessage) {
      // Restore message text if sending failed
      setMessageText(textToSend);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  }, [messageText, sendingMessage, sendMessage]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMoreMessages || isLoadingMore || loadingMessages) return;
    await loadMoreMessages();
  }, [hasMoreMessages, isLoadingMore, loadingMessages, loadMoreMessages]);

  const handleMessageTextChange = useCallback((text: string) => {
    setMessageText(text);
  }, []);

  const handleRetryMessage = useCallback(
    async (messageId: number) => {
      const failedMessage = messages.find(
        (msg: Message) =>
          msg.messageId === messageId && msg.status === MessageStatus.FAILED
      );
      if (failedMessage) {
        await sendMessage(failedMessage.content, failedMessage.messageType);
      }
    },
    [messages, sendMessage]
  );

  const handleErrorDismiss = useCallback(() => {
    setError(null);
  }, []);

  // ===== RENDER METHODS =====

  const renderMessage = useCallback(
    ({ item: message, index }: { item: Message; index: number }) => {
      const isCurrentUser = message.senderId === currentUserId;
      const isLastMessage = index === messages.length - 1;
      const showTimestamp =
        index === 0 ||
        new Date(message.createdAt).getTime() -
          new Date(messages[index - 1].createdAt).getTime() >
          300000;

      return (
        <View style={styles.messageContainer}>
          {/* Timestamp separator */}
          {showTimestamp && (
            <View style={styles.timestampContainer}>
              <Text style={styles.timestampText}>
                {formatMessageTimestamp(message.createdAt)}
              </Text>
            </View>
          )}

          {/* Message bubble */}
          <View
            style={[
              styles.messageBubbleContainer,
              isCurrentUser
                ? styles.currentUserContainer
                : styles.otherUserContainer,
            ]}
          >
            {/* Avatar for other user */}
            {!isCurrentUser && (
              <View style={styles.avatarContainer}>
                <Image
                  source={{
                    uri:
                      otherUser?.userProfileImage ||
                      "https://via.placeholder.com/32x32",
                  }}
                  style={styles.messageAvatar}
                />
              </View>
            )}

            {/* Message content */}
            <View
              style={[
                styles.messageBubble,
                isCurrentUser
                  ? styles.currentUserBubble
                  : styles.otherUserBubble,
                message.status === MessageStatus.FAILED &&
                  styles.failedMessageBubble,
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  isCurrentUser ? styles.currentUserText : styles.otherUserText,
                ]}
              >
                {message.content}
              </Text>

              {/* Message status */}
              <View style={styles.messageFooter}>
                <Text
                  style={[
                    styles.messageTime,
                    isCurrentUser
                      ? styles.currentUserTime
                      : styles.otherUserTime,
                  ]}
                >
                  {formatMessageTime(message.createdAt)}
                </Text>

                {isCurrentUser && (
                  <View style={styles.messageStatusContainer}>
                    {message.status === MessageStatus.SENDING && (
                      <ActivityIndicator size="small" color="#999" />
                    )}
                    {message.status === MessageStatus.SENT && (
                      <Text style={styles.messageStatusIcon}>✓</Text>
                    )}
                    {message.status === MessageStatus.DELIVERED && (
                      <Text style={styles.messageStatusIcon}>✓✓</Text>
                    )}
                    {message.status === MessageStatus.READ && (
                      <Text
                        style={[
                          styles.messageStatusIcon,
                          styles.readStatusIcon,
                        ]}
                      >
                        ✓✓
                      </Text>
                    )}
                    {message.status === MessageStatus.FAILED && (
                      <TouchableOpacity
                        onPress={() => handleRetryMessage(message.messageId)}
                      >
                        <Text style={styles.failedStatusIcon}>⚠️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      );
    },
    [messages, otherUser, currentUserId, handleRetryMessage]
  );

  const renderLoadMoreHeader = useCallback(() => {
    if (!hasMoreMessages) return null;

    return (
      <View style={styles.loadMoreContainer}>
        {isLoadingMore ? (
          <ActivityIndicator size="small" color="#007AFF" />
        ) : (
          <TouchableOpacity
            onPress={handleLoadMore}
            style={styles.loadMoreButton}
          >
            <Text style={styles.loadMoreText}>Load older messages</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [hasMoreMessages, isLoadingMore, handleLoadMore]);

  const renderTypingIndicator = useCallback(() => {
    if (!isTyping) return null;

    return (
      <View style={styles.typingContainer}>
        <View style={styles.typingBubble}>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, styles.typingDot1]} />
            <View style={[styles.typingDot, styles.typingDot2]} />
            <View style={[styles.typingDot, styles.typingDot3]} />
          </View>
        </View>
      </View>
    );
  }, [isTyping]);

  const renderEmptyState = useCallback(() => {
    if (loadingMessages || messages.length > 0) return null;

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>💬</Text>
        <Text style={styles.emptyStateTitle}>Start the conversation</Text>
        <Text style={styles.emptyStateText}>
          Send a message to {otherUser?.userFullName || "get started"}
        </Text>
      </View>
    );
  }, [loadingMessages, messages.length, otherUser]);

  const renderErrorState = useCallback(() => {
    if (!error) return null;

    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.errorDismissButton}
          onPress={handleErrorDismiss}
        >
          <Text style={styles.errorDismissText}>Dismiss</Text>
        </TouchableOpacity>
      </View>
    );
  }, [error, handleErrorDismiss]);

  // ===== MAIN RENDER =====

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Error State */}
      {renderErrorState()}

      {/* Messages List */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) =>
            `message_${item.messageId}_${item.localId || ""}`
          }
          renderItem={renderMessage}
          ListHeaderComponent={renderLoadMoreHeader}
          ListEmptyComponent={renderEmptyState}
          ListFooterComponent={renderTypingIndicator}
          contentContainerStyle={[
            styles.messagesList,
            messages.length === 0 && styles.emptyMessagesList,
          ]}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          showsVerticalScrollIndicator={false}
          inverted={false}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton}>
              <Text style={styles.attachIcon}>📎</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder="Type a message..."
              value={messageText}
              onChangeText={handleMessageTextChange}
              multiline
              maxLength={1000}
              editable={!sendingMessage}
              blurOnSubmit={false}
            />

            <TouchableOpacity
              style={[
                styles.sendButton,
                (messageText.trim().length === 0 || sendingMessage) &&
                  styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={messageText.trim().length === 0 || sendingMessage}
            >
              {sendingMessage ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.sendIcon}>✈️</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// ===== UTILITY FUNCTIONS =====

const formatMessageTimestamp = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  } else {
    return date.toLocaleDateString();
  }
};

const formatMessageTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

// ===== STYLES =====

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  // Header Styles
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: "#007AFF",
    fontSize: 16,
  },

  // Layout Styles
  keyboardAvoidingView: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyMessagesList: {
    flexGrow: 1,
    justifyContent: "center",
  },

  // Load More Styles
  loadMoreContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  loadMoreButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
  },
  loadMoreText: {
    color: "#007AFF",
    fontSize: 14,
  },

  // Message Styles
  messageContainer: {
    marginVertical: 2,
  },
  timestampContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  timestampText: {
    fontSize: 12,
    color: "#8E8E93",
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageBubbleContainer: {
    flexDirection: "row",
    marginVertical: 1,
  },
  currentUserContainer: {
    justifyContent: "flex-end",
  },
  otherUserContainer: {
    justifyContent: "flex-start",
  },
  avatarContainer: {
    width: 32,
    height: 32,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  messageAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#f0f0f0",
  },
  messageBubble: {
    maxWidth: SCREEN_WIDTH * 0.75,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginVertical: 1,
  },
  currentUserBubble: {
    backgroundColor: "#007AFF",
    marginLeft: "auto",
  },
  otherUserBubble: {
    backgroundColor: "#E5E5EA",
  },
  failedMessageBubble: {
    backgroundColor: "#FF3B30",
    opacity: 0.8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  currentUserText: {
    color: "#ffffff",
  },
  otherUserText: {
    color: "#000000",
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 2,
  },
  currentUserTime: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  otherUserTime: {
    color: "#8E8E93",
  },
  messageStatusContainer: {
    marginLeft: 4,
  },
  messageStatusIcon: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.7)",
  },
  readStatusIcon: {
    color: "#34C759",
  },
  failedStatusIcon: {
    fontSize: 14,
  },

  // Typing Indicator Styles
  typingContainer: {
    flexDirection: "row",
    paddingVertical: 8,
  },
  typingBubble: {
    backgroundColor: "#E5E5EA",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginLeft: 40,
  },
  typingDots: {
    flexDirection: "row",
    alignItems: "center",
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#8E8E93",
    marginHorizontal: 1,
  },
  typingDot1: {},
  typingDot2: {},
  typingDot3: {},

  // Input Styles
  inputContainer: {
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: "#f8f8f8",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
  },
  attachButton: {
    padding: 4,
    marginRight: 8,
  },
  attachIcon: {
    fontSize: 18,
    color: "#8E8E93",
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    maxHeight: 100,
    color: "#000000",
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: "#C7C7CC",
  },
  sendIcon: {
    fontSize: 16,
    color: "#ffffff",
  },

  // Empty State Styles
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000000",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 22,
  },

  // Error Styles
  errorContainer: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  errorText: {
    color: "#ffffff",
    fontSize: 14,
    flex: 1,
  },
  errorDismissButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  errorDismissText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
});

export default ChatScreen;
