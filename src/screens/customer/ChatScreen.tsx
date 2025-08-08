// ChatScreen.tsx - Fixed với SignalR Real-time

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
import { useConversation } from "../../hooks/useChat";
import { signalRManager } from "../../services/signalRManager"; // ✅ THÊM SignalR
import { useAuth } from "../../hooks/useAuth"; // ✅ THÊM để lấy userId

import {
  Message,
  MessageType,
  MessageStatus,
  ConversationParticipant,
  MessageResponse, // ✅ THÊM type cho SignalR
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

  const { conversationId, title, otherUser } = route.params;

  // ✅ THÊM AUTH để lấy current user ID
  const { getCurrentUserId } = useAuth();
  const currentUserId = getCurrentUserId();

  // ===== HOOKS =====
  const {
    messages,
    conversation,
    loadingMessages,
    sendingMessage,
    hasMoreMessages,
    error,
    isTyping,
    sendMessage,
    loadMoreMessages,
    markMessagesAsRead,
    startTyping,
    stopTyping,
    clearError,
    setMessages, // ✅ CẦN để update messages real-time
  } = useConversation({
    conversationId,
    autoMarkAsRead: true,
    loadHistoryOnMount: true,
    enableTypingIndicator: true,
    enableRealtime: true,
  });

  // ===== LOCAL STATES =====
  const [messageText, setMessageText] = useState("");
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // ✅ THÊM SignalR states
  const [isSignalRConnected, setIsSignalRConnected] = useState(false);
  const [realtimeMessageCount, setRealtimeMessageCount] = useState(0);

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSignalRSetup = useRef(false);

  // ✅ THÊM SignalR SETUP cho ChatScreen
  useEffect(() => {
    const setupChatSignalR = async () => {
      if (!currentUserId || !conversationId || isSignalRSetup.current) return;

      // Kiểm tra xem SignalR đã được khởi tạo chưa
      const status = signalRManager.getStatus();

      if (!status.isConnected) {
        const connected = await signalRManager.initialize(currentUserId, {});
        if (!connected) {
          console.error("❌ Failed to connect SignalR in ChatScreen");
          Alert.alert(
            "Connection Issue",
            "Real-time messages may not work properly."
          );
          return;
        }
      }

      // ✅ JOIN CONVERSATION để nhận real-time messages
      try {
        await signalRManager.joinConversation(conversationId);
      } catch (error) {
        console.error("❌ Failed to join conversation:", error);
      }

      // ✅ SETUP EVENT HANDLERS cho ChatScreen
      signalRManager.updateEventHandlers({
        onMessageReceived: (message: MessageResponse) => {
          // Chỉ xử lý message thuộc conversation này
          if (message.conversationId !== conversationId) {
            return;
          }

          setRealtimeMessageCount((prev) => prev + 1);

          // ✅ UPDATE MESSAGES LIST với message mới
          if (setMessages) {
            setMessages((prevMessages: Message[]) => {
              // ✅ Kiểm tra duplicate bằng messageId VÀ content VÀ timestamp
              const existingMessage = prevMessages.find(
                (m) =>
                  m.messageId === message.messageId ||
                  (m.content === message.content &&
                    m.senderId === message.senderId &&
                    Math.abs(
                      new Date(m.createdAt).getTime() -
                        new Date(message.createdAt).getTime()
                    ) < 5000) // 5 seconds tolerance
              );

              if (existingMessage) {
                return prevMessages;
              }

              // Convert MessageResponse to Message
              const newMessage: Message = {
                messageId: message.messageId,
                localId: undefined, // Real messages don't have localId
                senderId: message.senderId,
                recipientId: message.recipientId || currentUserId,
                conversationId: message.conversationId!,
                content: message.content,
                messageType:
                  (message.messageType as MessageType) || MessageType.TEXT,
                status:
                  (message.status as MessageStatus) || MessageStatus.DELIVERED,
                createdAt: message.createdAt,
                readAt: message.readAt,
                senderName: message.senderName,
                senderProfileImage: message.senderProfileImage,
              };

              // ✅ Remove any optimistic messages với same content từ current user
              const filteredMessages = prevMessages.filter((msg) => {
                if (
                  msg.isOptimistic &&
                  msg.senderId === message.senderId &&
                  msg.content === message.content
                ) {
                  console.log("🗑️ Removing optimistic message:", msg.localId);
                  return false;
                }
                return true;
              });

              // Thêm message mới vào cuối danh sách
              const updatedMessages = [...filteredMessages, newMessage];

              // Sort by createdAt để đảm bảo thứ tự đúng
              const sortedMessages = updatedMessages.sort(
                (a, b) =>
                  new Date(a.createdAt).getTime() -
                  new Date(b.createdAt).getTime()
              );

              // Auto scroll to bottom khi có message mới
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);

              return sortedMessages;
            });
          }
        },

        onConnectionStatusChanged: (connected: boolean) => {
          setIsSignalRConnected(connected);

          if (!connected) {
            Alert.alert(
              "Connection Lost",
              "Real-time messages may be delayed. The app will try to reconnect automatically."
            );
          }
        },

        onMessageStatusChanged: (messageId: number, status: string) => {
          // Update message status in the list
          if (setMessages) {
            setMessages((prevMessages: Message[]) => {
              return prevMessages.map((msg) => {
                if (msg.messageId === messageId) {
                  return {
                    ...msg,
                    status: status as MessageStatus,
                    readAt:
                      status === "read" ? new Date().toISOString() : msg.readAt,
                  };
                }
                return msg;
              });
            });
          }
        },
      });

      setIsSignalRConnected(true);
      isSignalRSetup.current = true;
    };

    setupChatSignalR();

    // Cleanup khi leave screen
    return () => {
      if (isSignalRSetup.current) {
        // Leave conversation khi rời screen
        signalRManager.leaveConversation(conversationId).catch(console.error);
        isSignalRSetup.current = false;
      }
    };
  }, [currentUserId, conversationId, setMessages, markMessagesAsRead]);

  // ===== EXISTING HANDLERS (unchanged) =====

  const handleProfilePress = useCallback(() => {
    if (otherUser) {
      console.log("👤 View profile for user:", otherUser.userId);
    }
  }, [otherUser]);

  // ===== EFFECTS =====

  // Set navigation title with SignalR status
  useEffect(() => {
    navigation.setOptions({
      title: title || "Chat",
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* ✅ THÊM SignalR status indicator */}
          {__DEV__ && (
            <View
              style={{
                marginRight: 12,
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: isSignalRConnected ? "#4CAF50" : "#FF9800",
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: 8,
              }}
            ></View>
          )}

          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleProfilePress}
          >
            <Text style={styles.headerButtonText}>Profile</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, title, handleProfilePress, isSignalRConnected]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Handle typing indicator
  useEffect(() => {
    if (messageText.length > 0) {
      startTyping();

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

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

  // ===== ENHANCED SEND MESSAGE HANDLER =====

  const handleSendMessage = useCallback(async () => {
    if (!messageText.trim() || sendingMessage) return;

    const textToSend = messageText.trim();
    setMessageText("");

    try {
      // ✅ Gửi message qua API
      const sentMessage = await sendMessage(textToSend, MessageType.TEXT);

      if (sentMessage) {
        // ✅ MANUAL SIGNALR BROADCAST - FIX CHO BACKEND THIẾU
        try {
          // Convert Message to MessageResponse format
          const messageForSignalR: MessageResponse = {
            messageId: sentMessage.messageId,
            senderId: sentMessage.senderId,
            recipientId: sentMessage.recipientId,
            conversationId: sentMessage.conversationId!,
            content: sentMessage.content,
            createdAt: sentMessage.createdAt,
            messageType: sentMessage.messageType as any,
            status: sentMessage.status as any,
            readAt: sentMessage.readAt,
            senderName: sentMessage.senderName,
            senderProfileImage: sentMessage.senderProfileImage,
          };

          // Broadcast to conversation group
          if (isSignalRConnected) {
            await signalRManager.sendMessageToConversation(
              conversationId,
              messageForSignalR
            );
          } else {
            console.warn("⚠️ SignalR not connected, cannot broadcast");
          }
        } catch (broadcastError) {
          console.warn("⚠️ Manual SignalR broadcast failed:", broadcastError);
          // Don't fail the whole operation, message is already sent to API
        }
      } else {
        console.error("❌ Failed to send message via API");
        setMessageText(textToSend);
        Alert.alert("Error", "Failed to send message. Please try again.");
      }
    } catch (err) {
      console.error("❌ Error sending message:", err);
      setMessageText(textToSend);
      Alert.alert("Error", "Failed to send message. Please try again.");
    }
  }, [
    messageText,
    sendingMessage,
    sendMessage,
    conversationId,
    currentUserId,
    isSignalRConnected,
  ]);

  // ===== REST OF HANDLERS (unchanged) =====

  const handleLoadMore = useCallback(async () => {
    if (!hasMoreMessages || isLoadingMore || loadingMessages) return;

    setIsLoadingMore(true);
    await loadMoreMessages();
    setIsLoadingMore(false);
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
    clearError();
  }, [clearError]);

  // ===== RENDER METHODS (mostly unchanged, chỉ fix currentUser logic) =====

  const renderMessage = useCallback(
    ({ item: message, index }: { item: Message; index: number }) => {
      // ✅ FIX: So sánh với current user ID thay vì otherUser
      const isCurrentUser = message.senderId === currentUserId;
      const isLastMessage = index === messages.length - 1;
      const showAvatar =
        !isCurrentUser &&
        (isLastMessage || messages[index + 1]?.senderId !== message.senderId);
      const showTimestamp =
        index === 0 ||
        new Date(message.createdAt).getTime() -
          new Date(messages[index - 1].createdAt).getTime() >
          300000; // 5 minutes

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
              <View
                style={[
                  styles.avatarContainer,
                  !showAvatar && styles.avatarPlaceholder,
                ]}
              >
                {showAvatar && (
                  <Image
                    source={{
                      uri:
                        otherUser?.userProfileImage ||
                        "https://via.placeholder.com/32x32",
                    }}
                    style={styles.messageAvatar}
                  />
                )}
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
    [messages, otherUser, handleRetryMessage, currentUserId]
  );

  // ===== REST OF RENDER METHODS (unchanged) =====

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
  }, [
    loadingMessages,
    messages.length,
    otherUser,
    isSignalRConnected,
    realtimeMessageCount,
  ]);

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
          keyExtractor={(item, index) => {
            if (item.localId) {
              return `local_${item.localId}`;
            } else {
              return `message_${item.messageId}_${item.createdAt}_${index}`;
            }
          }}
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

        {/* Message Input với SignalR status */}
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

// ===== UTILITY FUNCTIONS (unchanged) =====

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

// ===== STYLES (unchanged) =====

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
  avatarPlaceholder: {
    // Empty space for alignment when no avatar
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
    marginLeft: 40, // Account for avatar space
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
  typingDot1: {
    // Animation would be added here
  },
  typingDot2: {
    // Animation would be added here
  },
  typingDot3: {
    // Animation would be added here
  },

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
