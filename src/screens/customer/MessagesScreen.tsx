// MessagesScreen.tsx - Fixed to use useChat SignalR only
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Image,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useChat } from '../../hooks/useChat';
// ❌ REMOVED: import { signalRManager } from '../../services/signalRManager';
import { getResponsiveSize } from '../../utils/responsive';
import { useAuth } from '../../hooks/useAuth';
import { RootStackParamList } from '../../navigation/types';
import { 
  Conversation, 
  ConversationType, 
  PhotographerSearchResult,
  MessageResponse,
  ConversationResponse 
} from '../../types/chat';

type MessagesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function MessagesScreen() {
  const navigation = useNavigation<MessagesScreenNavigationProp>();

  // ===== AUTH CONTEXT =====
  const { user, isAuthenticated, isLoading: authLoading, getCurrentUserId } = useAuth();
  const userId = getCurrentUserId() || 0;

  // ✅ SIMPLIFIED: Use useChat hook's SignalR instead of managing it separately
  const {
    conversations,
    searchResults,
    searchQuery,
    loadingConversations,
    loadingSearch,
    error,
    searchError,
    isSearchMode,
    refreshConversations,
    handleSearchQueryChange,
    clearSearch,
    createDirectConversation,
    getTotalUnreadCount,
    clearError,
    // ✅ NEW: Use SignalR states from useChat hook
    isSignalRConnected,
    signalRError,
    getSignalRStatus,
    reconnectSignalR,
    testReceiveMessage,
    joinConversationRealtime,
  } = useChat({
    userId: userId,
    autoRefresh: true,
    refreshInterval: 30000,
    enableRealtime: true, // ✅ This will handle SignalR automatically
  });

  // ===== LOCAL STATES =====
  const [refreshing, setRefreshing] = useState(false);
  const [realtimeMessageCount, setRealtimeMessageCount] = useState(0);

  // ✅ REMOVED: All SignalR initialization code - it's now handled by useChat hook

  // ===== EXISTING AUTH CHECKS =====
  if (authLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text 
          className="text-gray-500 mt-4"
          style={{ fontSize: getResponsiveSize(16) }}
        >
          Loading user info...
        </Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated || !userId) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text 
          className="text-xl font-bold text-black mb-4"
          style={{ fontSize: getResponsiveSize(20) }}
        >
          Please login to continue
        </Text>
        <TouchableOpacity 
          className="bg-blue-500 px-6 py-3 rounded-2xl"
          onPress={() => navigation.navigate('Login')}
        >
          <Text 
            className="text-white font-semibold"
            style={{ fontSize: getResponsiveSize(16) }}
          >
            Go to Login
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ===== EXISTING EFFECTS =====
  useFocusEffect(
    useCallback(() => {
      refreshConversations();
      
      // Reset realtime message count when screen is focused
      setRealtimeMessageCount(0);
    }, [refreshConversations])
  );

  // ✅ NEW: Track real-time message updates from useChat
  useEffect(() => {
    // Count conversations that have been updated recently
    const recentUpdates = conversations.filter(conv => {
      const updateTime = new Date(conv.updatedAt || conv.createdAt).getTime();
      const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
      return updateTime > fiveMinutesAgo;
    }).length;
    
    setRealtimeMessageCount(recentUpdates);
  }, [conversations]);

  // ===== NEW: SignalR Debug Functions =====
  const handleSignalRDebug = useCallback(() => {
    const status = getSignalRStatus();
    
    Alert.alert(
      'SignalR Status',
      `Connected: ${isSignalRConnected}\nState: ${status.state}\nUser ID: ${userId}\nError: ${signalRError || 'None'}\nConversations: ${conversations.length}`,
      [
        { text: 'OK' },
        { text: 'Test Message', onPress: testReceiveMessage },
        { text: 'Reconnect', onPress: reconnectSignalR }
      ]
    );
  }, [isSignalRConnected, signalRError, userId, conversations.length, getSignalRStatus, testReceiveMessage, reconnectSignalR]);

  // ===== EXISTING HANDLERS =====
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshConversations();
    setRefreshing(false);
  }, [refreshConversations]);

  const handleSearchChange = useCallback((text: string) => {
    handleSearchQueryChange(text);
  }, [handleSearchQueryChange]);

  const handleClearSearch = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  const handleConversationPress = useCallback(async (conversation: Conversation) => {
    console.log('💬 Opening conversation:', conversation.conversationId);
    
    if (!conversation.otherParticipant) {
      console.warn('No other participant found in conversation');
      return;
    }

    // ✅ FIXED: Use joinConversationRealtime from useChat hook
    if (isSignalRConnected) {
      try {
        await joinConversationRealtime(conversation.conversationId);
        console.log('✅ Joined conversation for real-time updates via useChat');
      } catch (error) {
        console.warn('⚠️ Failed to join conversation for real-time:', error);
      }
    }

    navigation.navigate('ChatScreen', {
      conversationId: conversation.conversationId,
      title: conversation.title || 'Chat',
      otherUser: {
        userId: conversation.otherParticipant.userId,
        userName: conversation.otherParticipant.userName || 'User',
        userFullName: conversation.otherParticipant.userFullName || 'User',
        userProfileImage: conversation.otherParticipant.userProfileImage
      }
    });
  }, [navigation, isSignalRConnected, joinConversationRealtime]);

  const handlePhotographerPress = useCallback(async (photographer: PhotographerSearchResult) => {
    console.log('📸 Starting chat with photographer:', photographer.userId);
    
    try {
      if (photographer.hasExistingConversation && photographer.existingConversationId) {
        // ✅ FIXED: Use joinConversationRealtime from useChat hook
        if (isSignalRConnected) {
          await joinConversationRealtime(photographer.existingConversationId);
        }

        navigation.navigate('ChatScreen', {
          conversationId: photographer.existingConversationId,
          title: `Chat with ${photographer.fullName}`,
          otherUser: {
            userId: photographer.userId,
            userName: photographer.userName,
            userFullName: photographer.fullName,
            userProfileImage: photographer.profileImage
          }
        });
      } else {
        const conversation = await createDirectConversation(
          photographer.userId,
          photographer.fullName || photographer.userName
        );
        
        if (conversation) {
          // ✅ FIXED: Use joinConversationRealtime from useChat hook
          if (isSignalRConnected) {
            await joinConversationRealtime(conversation.conversationId);
          }

          navigation.navigate('ChatScreen', {
            conversationId: conversation.conversationId,
            title: `Chat with ${photographer.fullName}`,
            otherUser: {
              userId: photographer.userId,
              userName: photographer.userName,
              userFullName: photographer.fullName,
              userProfileImage: photographer.profileImage
            }
          });
        } else {
          Alert.alert('Error', 'Could not start conversation with photographer');
        }
      }
    } catch (err) {
      console.error('❌ Error starting conversation:', err);
      Alert.alert('Error', 'Could not start conversation. Please try again.');
    }
  }, [navigation, createDirectConversation, isSignalRConnected, joinConversationRealtime]);

  const handleNewChatPress = useCallback(() => {
    navigation.navigate('NewChatScreen');
  }, [navigation]);

  const handleErrorDismiss = useCallback(() => {
    clearError();
  }, [clearError]);

  // ===== ENHANCED SIGNALR STATUS COMPONENT =====
  const renderSignalRStatus = useCallback(() => {
    return (
      <View style={{
        position: 'absolute',
        top: 50,
        right: 16,
        backgroundColor: isSignalRConnected ? 'rgba(76, 175, 80, 0.9)' : 'rgba(255, 152, 0, 0.9)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 1000
      }}>
        <TouchableOpacity onPress={handleSignalRDebug}>
          <Text style={{ 
            color: 'white', 
            fontSize: getResponsiveSize(10),
            fontWeight: 'bold'
          }}>
            {isSignalRConnected ? '🟢 LIVE' : '🟡 OFFLINE'} | RT: {realtimeMessageCount}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [isSignalRConnected, realtimeMessageCount, handleSignalRDebug]);

  // ===== EXISTING RENDER METHODS (Enhanced with better SignalR integration) =====
  const renderConversationItem = useCallback(({ item }: { item: Conversation }) => {
    const otherParticipant = item.otherParticipant;
    const lastMessage = item.lastMessage;
    const timeAgo = lastMessage ? formatTimeAgo(lastMessage.createdAt) : formatTimeAgo(item.createdAt);

    return (
      <TouchableOpacity
        className="px-4 py-3 bg-white border-b border-gray-100 active:bg-gray-50"
        onPress={() => handleConversationPress(item)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          {/* Avatar */}
          <View className="relative mr-3">
            <Image
              source={{ 
                uri: otherParticipant?.userProfileImage || 'https://via.placeholder.com/50x50'
              }}
              className="rounded-full bg-gray-100"
              style={{ 
                width: getResponsiveSize(48), 
                height: getResponsiveSize(48) 
              }}
            />
            {item.unreadCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-5 h-5 items-center justify-center border-2 border-white">
                <Text 
                  className="text-white font-bold"
                  style={{ fontSize: getResponsiveSize(11) }}
                >
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
            {/* ✅ ENHANCED: Show online indicator when SignalR is connected */}
            {(item.isOnline || isSignalRConnected) && (
              <View className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            )}
          </View>

          {/* Message Info */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text 
                className="font-semibold text-black flex-1" 
                numberOfLines={1}
                style={{ fontSize: getResponsiveSize(16) }}
              >
                {otherParticipant?.userFullName || otherParticipant?.userName || item.title}
              </Text>
              <View className="flex-row items-center">
                <Text 
                  className="text-gray-500 ml-2"
                  style={{ fontSize: getResponsiveSize(14) }}
                >
                  {timeAgo}
                </Text>
                {/* ✅ ENHANCED: Real-time indicator shows when connected */}
                {isSignalRConnected && (
                  <View className="w-2 h-2 bg-green-500 rounded-full ml-2" />
                )}
              </View>
            </View>
            
            <Text 
              className={`${item.unreadCount > 0 ? 'font-semibold text-black' : 'text-gray-500'}`}
              numberOfLines={1}
              style={{ fontSize: getResponsiveSize(14) }}
            >
              {lastMessage?.content || 'No messages yet'}
            </Text>
          </View>

          {/* Group Indicator */}
          {item.type === ConversationType.GROUP && (
            <View className="ml-2">
              <Text style={{ fontSize: getResponsiveSize(16) }}>👥</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [handleConversationPress, isSignalRConnected]);

  const renderPhotographerItem = useCallback(({ item }: { item: PhotographerSearchResult }) => {
    return (
      <TouchableOpacity
        className="px-4 py-3 bg-white border-b border-gray-100 active:bg-gray-50"
        onPress={() => handlePhotographerPress(item)}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center">
          {/* Avatar */}
          <View className="relative mr-3">
            <Image
              source={{ 
                uri: item.profileImage || 'https://via.placeholder.com/50x50'
              }}
              className="rounded-full bg-gray-100"
              style={{ 
                width: getResponsiveSize(48), 
                height: getResponsiveSize(48) 
              }}
            />
            {item.isVerified && (
              <View className="absolute -top-0.5 -right-0.5 bg-green-500 rounded-lg w-4 h-4 items-center justify-center border-2 border-white">
                <Text 
                  className="text-white font-bold"
                  style={{ fontSize: getResponsiveSize(10) }}
                >
                  ✓
                </Text>
              </View>
            )}
            {item.isOnline && (
              <View className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            )}
          </View>

          {/* Photographer Info */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text 
                className="font-semibold text-black flex-1" 
                numberOfLines={1}
                style={{ fontSize: getResponsiveSize(16) }}
              >
                {item.fullName}
              </Text>
              {item.rating && item.rating > 0 && (
                <View className="flex-row items-center">
                  <Text 
                    className="font-semibold text-orange-500"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    ⭐ {item.rating.toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
            
            <Text 
              className="text-gray-500" 
              numberOfLines={1}
              style={{ fontSize: getResponsiveSize(14) }}
            >
              {item.specialization} • {item.location}
            </Text>
          </View>

          {/* Existing Chat Indicator */}
          {item.hasExistingConversation && (
            <View className="ml-2">
              <Text style={{ fontSize: getResponsiveSize(16) }}>💬</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [handlePhotographerPress]);

  const renderSearchHeader = useCallback(() => {
    if (!isSearchMode || searchResults.totalResults === 0) return null;

    return (
      <View className="p-3 bg-gray-50 border-b border-gray-200">
        <Text 
          className="text-gray-500 text-center"
          style={{ fontSize: getResponsiveSize(14) }}
        >
          Found {searchResults.totalResults} results for "{searchQuery}"
        </Text>
      </View>
    );
  }, [isSearchMode, searchResults.totalResults, searchQuery]);

  const renderEmptyState = useCallback(() => {
    if (loadingConversations || loadingSearch) return null;

    const isSearchEmpty = isSearchMode && searchResults.totalResults === 0 && searchQuery.length > 0;
    const isConversationsEmpty = !isSearchMode && conversations.length === 0;

    if (isSearchEmpty) {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: getResponsiveSize(64) }}>🔍</Text>
          <Text 
            className="font-bold text-black mb-2 text-center mt-4"
            style={{ fontSize: getResponsiveSize(20) }}
          >
            No results found
          </Text>
          <Text 
            className="text-gray-500 text-center leading-6"
            style={{ fontSize: getResponsiveSize(16) }}
          >
            Try different keywords or browse photographers below
          </Text>
        </View>
      );
    }

    if (isConversationsEmpty) {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <Text style={{ fontSize: getResponsiveSize(64) }}>💬</Text>
          <Text 
            className="font-bold text-black mb-2 text-center mt-4"
            style={{ fontSize: getResponsiveSize(20) }}
          >
            No conversations yet
          </Text>
          <Text 
            className="text-gray-500 text-center leading-6 mb-6"
            style={{ fontSize: getResponsiveSize(16) }}
          >
            Start a conversation with a photographer to begin chatting
          </Text>
          <TouchableOpacity 
            className="bg-blue-500 rounded-2xl"
            style={{
              paddingHorizontal: getResponsiveSize(24),
              paddingVertical: getResponsiveSize(12),
            }}
            onPress={handleNewChatPress}
          >
            <Text 
              className="text-white font-semibold"
              style={{ fontSize: getResponsiveSize(16) }}
            >
              Find Photographers
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  }, [
    loadingConversations,
    loadingSearch,
    isSearchMode,
    searchResults.totalResults,
    searchQuery,
    conversations.length,
    handleNewChatPress
  ]);

  const renderErrorState = useCallback(() => {
    const currentError = error || searchError || signalRError; // ✅ Include SignalR error
    if (!currentError) return null;

    return (
      <View className="bg-red-500 px-4 py-3 flex-row items-center justify-between">
        <Text 
          className="text-white flex-1"
          style={{ fontSize: getResponsiveSize(14) }}
        >
          {currentError}
        </Text>
        <TouchableOpacity 
          className="rounded"
          style={{
            paddingHorizontal: getResponsiveSize(12),
            paddingVertical: getResponsiveSize(6),
          }}
          onPress={handleErrorDismiss}
        >
          <Text 
            className="text-white font-semibold"
            style={{ fontSize: getResponsiveSize(14) }}
          >
            Dismiss
          </Text>
        </TouchableOpacity>
      </View>
    );
  }, [error, searchError, signalRError, handleErrorDismiss]); // ✅ Include SignalR error

  // ===== MAIN RENDER =====
  const totalUnreadCount = getTotalUnreadCount();
  const flatListData = isSearchMode ? [
    ...searchResults.conversations.map(conv => ({ type: 'conversation', data: conv })),
    ...searchResults.photographers.map(photographer => ({ type: 'photographer', data: photographer }))
  ] : conversations.map(conv => ({ type: 'conversation', data: conv }));

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* ✅ ENHANCED: SignalR Status Indicator (Always visible) */}
      {renderSignalRStatus()}
      
      {/* Header - Enhanced with better connection status */}
      <View className="flex-row items-center justify-between border-b border-gray-100"
        style={{
          paddingHorizontal: getResponsiveSize(16),
          paddingVertical: getResponsiveSize(12),
        }}
      >
        <View className="flex-row items-center">
          <Text 
            className="font-bold text-black"
            style={{ fontSize: getResponsiveSize(24) }}
          >
            Messages
          </Text>
          {totalUnreadCount > 0 && (
            <View className="bg-red-500 rounded-full min-w-5 h-5 items-center justify-center"
              style={{ marginLeft: getResponsiveSize(8) }}
            >
              <Text 
                className="text-white font-bold"
                style={{ fontSize: getResponsiveSize(12) }}
              >
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </Text>
            </View>
          )}
          {/* ✅ ENHANCED: Real-time indicator with status from useChat */}
          {isSignalRConnected && (
            <View className="ml-2 flex-row items-center">
              <View className="w-2 h-2 bg-green-500 rounded-full mr-1" />
              <Text 
                className="text-green-600 text-xs font-semibold"
                style={{ fontSize: getResponsiveSize(10) }}
              >
                LIVE
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity 
          className="bg-blue-500 rounded-full items-center justify-center"
          style={{ 
            width: getResponsiveSize(40), 
            height: getResponsiveSize(40),
          }}
          onPress={handleNewChatPress}
        >
          <Text 
            className="text-white"
            style={{ fontSize: getResponsiveSize(18) }}
          >
            ✏️
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="bg-white"
        style={{
          paddingHorizontal: getResponsiveSize(16),
          paddingVertical: getResponsiveSize(12),
        }}
      >
        <View className="flex-row items-center bg-gray-50 rounded-2xl"
          style={{
            paddingHorizontal: getResponsiveSize(12),
            height: getResponsiveSize(40),
          }}
        >
          <Text 
            className="text-gray-400"
            style={{ 
              fontSize: getResponsiveSize(16),
              marginRight: getResponsiveSize(8)
            }}
          >
            🔍
          </Text>
          <TextInput
            className="flex-1 text-black"
            style={{ fontSize: getResponsiveSize(16) }}
            placeholder="Search conversations or photographers..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={handleSearchChange}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              className="rounded"
              style={{ padding: getResponsiveSize(4) }}
              onPress={handleClearSearch}
            >
              <Text 
                className="text-gray-400"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Error State */}
      {renderErrorState()}

      {/* Content */}
      <View className="flex-1">
        {/* Search Results Header */}
        {renderSearchHeader()}

        {/* Loading State */}
        {(loadingConversations || loadingSearch) && (
          <View className="items-center"
            style={{ padding: getResponsiveSize(32) }}
          >
            <ActivityIndicator size="large" color="#007AFF" />
            <Text 
              className="text-gray-500"
              style={{ 
                marginTop: getResponsiveSize(12),
                fontSize: getResponsiveSize(16) 
              }}
            >
              {loadingSearch ? 'Searching...' : 'Loading conversations...'}
            </Text>
          </View>
        )}

        {/* Conversations/Search Results List */}
        <FlatList
          data={flatListData}
          keyExtractor={(item, index) => {
            if (item.type === 'conversation') {
              const conversation = item.data as Conversation;
              return `conversation_${conversation.conversationId}_${index}`;
            } else {
              const photographer = item.data as PhotographerSearchResult;
              return `photographer_${photographer.photographerId}_${index}`;
            }
          }}
          renderItem={({ item }) => {
            if (item.type === 'conversation') {
              const conversation = item.data as Conversation;
              return renderConversationItem({ item: conversation });
            } else {
              const photographer = item.data as PhotographerSearchResult;
              return renderPhotographerItem({ item: photographer });
            }
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#007AFF']}
              tintColor="#007AFF"
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerStyle={flatListData.length === 0 ? { flexGrow: 1 } : {}}
        />
      </View>
    </SafeAreaView>
  );
};

// ===== UTILITY FUNCTIONS =====
const formatTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d`;
  
  return date.toLocaleDateString();
};