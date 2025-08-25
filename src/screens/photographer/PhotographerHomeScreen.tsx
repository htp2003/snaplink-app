import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  RootStackParamList,
  PhotographerTabParamList,
} from "../../navigation/types";
import { CompositeScreenProps } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWithdrawalRequests } from "../../hooks/useWithdrawal";
// Import hooks và services
import {
  useTransactionHistory,
  useWallet,
  useTransactionStats,
} from "../../hooks/useTransaction";
import transactionService from "../../services/transactionService";
import { usePhotographerAuth } from "../../hooks/usePhotographerAuth";
import WithdrawalRequestsCard from "../../components/WithdrawalRequestCard";
// Import component mới
import WalletTopUpModal from "../../components/WalletTopUpModal";
import { WithdrawalRequest } from "src/types/withdrawal";

import { useNotifications } from "../../hooks/useNotification";
import { notificationService } from "src/services/notificationService";
import { NotificationPriority, NotificationType } from "src/types/notification";

type Props = CompositeScreenProps<
  BottomTabScreenProps<PhotographerTabParamList, "PhotographerHomeScreen">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function PhotographerHomeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { userId, photographerId, isPhotographer, hasPhotographerProfile } =
    usePhotographerAuth();
  const shouldFetchData = userId && photographerId && hasPhotographerProfile;

  const {
    expoPushToken,
    isRegistered,
    isLoading,
    error,
    permissionStatus,
    requestPermissions,
    registerDevice,
    updateLastUsed
  } = useNotifications({
    userId: userId || undefined,
    autoRegister: true,
    autoRefresh: true,
    refreshInterval: 60000,
  });

  

  // State for top-up modal
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  // ✅ ADD: Notification status state
  const [showNotificationStatus, setShowNotificationStatus] = useState(__DEV__);

  useEffect(() => {
    const initNotifications = async () => {
      if (userId && isPhotographer && hasPhotographerProfile) {
        console.log('🔔 Initializing photographer notifications...', {
          userId,
          photographerId,
          isPhotographer,
          hasPhotographerProfile,
        });
        
        try {
          if (userId) {
            const success = await registerDevice(userId);
            if (success) {
              console.log('✅ Photographer notification system ready');
            } else {
              console.warn('⚠️ Failed to register photographer notifications');
            }
          }
        } catch (error) {
          console.error('❌ Error initializing photographer notifications:', error);
        }
      }
    };
  
    initNotifications();
  }, [userId, isPhotographer, hasPhotographerProfile, photographerId, registerDevice]);

  const renderNotificationStatus = () => {
    if (!__DEV__ || !showNotificationStatus) return null;
  
    const hasToken = !!expoPushToken;
    const hasPermission = permissionStatus?.granted || false;
  
    return (
      <View
        style={{
          backgroundColor: isRegistered ? '#10B981' : '#F59E0B',
          margin: 16,
          borderRadius: 8,
          padding: 12,
          marginBottom: 8,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
              🔔 Trạng thái nhận thông báo
            </Text>
            <Text style={{ color: 'white', fontSize: 12, marginTop: 2 }}>
              {isRegistered 
                ? '✅ Sẵn sàng nhận thông báo booking mới'
                : '⚠️ Chưa thể nhận thông báo - cần kích hoạt'
              }
            </Text>
            
            {/* Debug info */}
            <Text style={{ color: 'white', fontSize: 10, marginTop: 4, opacity: 0.8 }}>
              Permission: {hasPermission ? 'OK' : 'NO'} • Token: {hasToken ? 'OK' : 'NO'} • Registered: {isRegistered ? 'YES' : 'NO'}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={() => setShowNotificationStatus(false)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 12,
              padding: 4,
            }}
          >
            <Text style={{ color: 'white', fontSize: 12 }}>✕</Text>
          </TouchableOpacity>
        </View>
  
        {/* Action button if not ready */}
        {!isRegistered && (
          <TouchableOpacity
            onPress={async () => {
              try {
                if (!hasPermission) {
                  await requestPermissions();
                }
                if (userId) {
                  await registerDevice(userId);
                }
              } catch (error) {
                console.error('Error fixing notification:', error);
              }
            }}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 6,
              padding: 8,
              marginTop: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
              🔧 Kích hoạt thông báo
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ✅ ADD: Test notification function
  const handleTestNotification = async () => {
    if (!__DEV__ || !userId) return;
    
    try {
      await notificationService.sendNotification({
        userId: userId,
        title: 'Test Photographer Notification',
        body: `Test từ Photographer ${userId} - HomeScreen test`,
        data: {
          screen: 'PhotographerMain',
          tab: 'PhotographerHomeScreen',
          type: NotificationType.SYSTEM_ANNOUNCEMENT,
          isTest: true
        },
        sound: 'default',
        priority: NotificationPriority.HIGH,
      });
      
      Alert.alert("Test thành công", "Notification đã được gửi!");
    } catch (error) {
      console.error("Test notification failed:", error);
      Alert.alert("Test thất bại", `Không thể gửi notification: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const {
    transactions,
    loading: transactionsLoading,
    refreshing: transactionsRefreshing,
    error: transactionsError,
    refreshTransactions,
  } = useTransactionHistory(shouldFetchData ? photographerId : 0, 5); // pageSize = 5 cho home screen

  // Hook khác cho wallet và stats
  const {
    balance,
    loading: balanceLoading,
    refreshBalance,
  } = useWallet(shouldFetchData ? userId : 0);

  const {
    stats,
    loading: statsLoading,
    refreshStats,
  } = useTransactionStats(shouldFetchData ? photographerId : 0);

  const {
    requests: withdrawalRequests,
    loading: withdrawalLoading,
    error: withdrawalError,
    refreshRequests: refreshWithdrawals,
  } = useWithdrawalRequests(!!shouldFetchData);
  // Hàm refresh tất cả data
  const onRefresh = async () => {
    try {
      await Promise.all([
        refreshTransactions(),
        refreshBalance(),
        refreshStats(),
        refreshWithdrawals(),
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Handle top-up success
  const handleTopUpSuccess = () => {
    // Refresh balance after successful top-up
    refreshBalance();
    Alert.alert(
      "Thành công",
      "Nạp tiền thành công! Số dư của bạn sẽ được cập nhật trong vài phút.",
      [{ text: "OK" }]
    );
  };

  // Handle withdraw
  const handleWithdraw = () => {
    if (balance.availableBalance < 10000) {
      Alert.alert("Thông báo", "Số dư tối thiểu để rút tiền là 10,000 VND");
      return;
    }

    // Navigate trực tiếp đến WithdrawalScreen
    navigation.navigate("WithdrawalScreen");
  };

  // Handle view all withdrawal requests
  const handleViewAllWithdrawals = () => {
    // Navigate to withdrawal history screen
    console.log("Navigate to withdrawal history");
  };

  // Handle withdrawal request press
  const handleWithdrawalRequestPress = (request: WithdrawalRequest) => {
    // Navigate to withdrawal detail screen
    console.log("Navigate to withdrawal detail:", request.id);
  };

  // Handle top-up
  const handleTopUp = () => {
    setShowTopUpModal(true);
  };

  // Get transaction color based on type and status
  const getTransactionColor = (displayType: string, status: string) => {
    if (status.toLowerCase() === "pending") return "#F59E0B";
    if (
      status.toLowerCase() === "failed" ||
      status.toLowerCase() === "cancelled"
    )
      return "#EF4444";
    return displayType === "income" ? "#10B981" : "#EF4444";
  };

  // Render recent transactions section
  const renderRecentTransactions = () => {
    return (
      <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "600", color: "#000000" }}>
            Giao dịch gần đây
          </Text>
          <TouchableOpacity>
            <Text style={{ color: "#FF385C", fontWeight: "500", fontSize: 14 }}>
              Xem tất cả
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          {/* Loading state */}
          {transactionsLoading && transactions.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <ActivityIndicator size="small" color="#FF385C" />
              <Text style={{ color: "#666666", marginTop: 8 }}>
                Đang tải giao dịch...
              </Text>
            </View>
          ) : /* Error state */
          transactionsError ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text
                style={{ color: "#666666", marginTop: 12, textAlign: "center" }}
              >
                Không thể tải giao dịch
              </Text>
              <TouchableOpacity
                style={{ marginTop: 8 }}
                onPress={refreshTransactions}
              >
                <Text style={{ color: "#FF385C", fontWeight: "500" }}>
                  Thử lại
                </Text>
              </TouchableOpacity>
            </View>
          ) : /* Empty state */
          transactions.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Ionicons name="receipt-outline" size={48} color="#CCCCCC" />
              <Text
                style={{ color: "#666666", marginTop: 12, textAlign: "center" }}
              >
                Chưa có giao dịch nào
              </Text>
            </View>
          ) : (
            /* Transactions list */
            transactions.map((transaction, index) => (
              <TouchableOpacity
                key={transaction.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 16,
                  borderBottomWidth: index !== transactions.length - 1 ? 1 : 0,
                  borderBottomColor: "#F0F0F0",
                }}
                // onPress={() => {
                //   // Navigate to transaction detail
                //   navigateToTransactionDetail(transaction.id);
                // }}
              >
                {/* Transaction Icon */}
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: transaction.iconBgColor,
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name={transaction.iconName as any}
                    size={20}
                    color={getTransactionColor(
                      transaction.displayType,
                      transaction.status
                    )}
                  />
                </View>

                {/* Transaction Details */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontWeight: "500",
                      color: "#000000",
                      marginBottom: 4,
                    }}
                  >
                    {transaction.description}
                  </Text>

                  {/* Customer name if available */}
                  {transaction.customerName && (
                    <Text
                      style={{
                        color: "#666666",
                        fontSize: 14,
                        marginBottom: 4,
                      }}
                    >
                      Từ: {transaction.customerName}
                    </Text>
                  )}

                  {/* Date and Status */}
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ color: "#999999", fontSize: 12 }}>
                      {transaction.formattedDate}
                    </Text>
                    <View
                      style={{
                        marginLeft: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 12,
                        backgroundColor: transaction.statusBgColor,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "500",
                          color: transaction.statusColor,
                        }}
                      >
                        {transactionService.getStatusText(transaction.status)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Amount and Arrow */}
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={{
                      fontWeight: "bold",
                      textAlign: "right",
                      color: getTransactionColor(
                        transaction.displayType,
                        transaction.status
                      ),
                      fontSize: 16,
                    }}
                  >
                    {transaction.displayType === "income" ? "+" : "-"}
                    {transaction.formattedAmount}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color="#CCCCCC"
                    style={{ marginTop: 4 }}
                  />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>
    );
  };

  // Show loading for initial screen load
  if (transactionsLoading && balanceLoading && statsLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F7F7F7",
        }}
      >
        <ActivityIndicator size="large" color="#FF385C" />
        <Text style={{ marginTop: 16, color: "#666666" }}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: "#F7F7F7" }}
        contentContainerStyle={{
          paddingBottom: 120 + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={transactionsRefreshing}
            onRefresh={onRefresh}
            colors={["#FF385C"]}
            tintColor="#FF385C"
          />
        }
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: "#F7F7F7",
            paddingHorizontal: 20,
            paddingTop: insets.top + 20,
            paddingBottom: 20,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <Text
              style={{ color: "#000000", fontSize: 32, fontWeight: "bold" }}
            >
              Ví của tôi
            </Text>
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#FFFFFF",
                justifyContent: "center",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#000000"
              />
            </TouchableOpacity>
          </View>

          {/* ✅ ADD: Notification Status Banner */}
          {renderNotificationStatus()}

          {/* ✅ ADD: Test Notification Button (DEV only) */}
          {__DEV__ && (
            <TouchableOpacity
              onPress={handleTestNotification}
              style={{
                backgroundColor: '#6B73FF',
                borderRadius: 8,
                padding: 12,
                marginBottom: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                🧪 Test Notification System
              </Text>
            </TouchableOpacity>
          )}

          {/* Balance Card */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text style={{ color: "#666666", fontSize: 14, marginBottom: 8 }}>
              Số dư khả dụng
            </Text>
            {balanceLoading ? (
              <ActivityIndicator
                size="small"
                color="#FF385C"
                style={{ marginBottom: 16 }}
              />
            ) : (
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: "bold",
                  color: "#000000",
                  marginBottom: 16,
                }}
              >
                {formatCurrency(balance.availableBalance)}
              </Text>
            )}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <View>
                <Text
                  style={{ color: "#666666", fontSize: 12, marginBottom: 4 }}
                >
                  Đang chờ xử lý
                </Text>
                {statsLoading ? (
                  <ActivityIndicator size="small" color="#F59E0B" />
                ) : (
                  <Text
                    style={{
                      color: "#F59E0B",
                      fontWeight: "600",
                      fontSize: 16,
                    }}
                  >
                    {formatCurrency(stats.pendingAmount)}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text
                  style={{ color: "#666666", fontSize: 12, marginBottom: 4 }}
                >
                  Tổng thu nhập tháng này
                </Text>
                {statsLoading ? (
                  <ActivityIndicator size="small" color="#10B981" />
                ) : (
                  <Text
                    style={{
                      color: "#10B981",
                      fontWeight: "600",
                      fontSize: 16,
                    }}
                  >
                    {formatCurrency(stats.monthlyIncome)}
                  </Text>
                )}
              </View>
            </View>

            {/* Action Buttons Row */}
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <TouchableOpacity
                style={{
                  backgroundColor: "#10B981",
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  flex: 0.48,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={handleTopUp}
                disabled={balanceLoading}
              >
                <Ionicons
                  name="add-circle-outline"
                  size={20}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}
                >
                  Nạp tiền
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: "#FF385C",
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  flex: 0.48,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={handleWithdraw}
                disabled={balanceLoading}
              >
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={20}
                  color="#FFFFFF"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}
                >
                  Rút tiền
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                flex: 0.48,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="trending-up" size={20} color="#10B981" />
                <Text style={{ color: "#666666", fontSize: 14, marginLeft: 8 }}>
                  Hôm nay
                </Text>
              </View>
              {statsLoading ? (
                <ActivityIndicator size="small" color="#10B981" />
              ) : (
                <Text
                  style={{ fontSize: 18, fontWeight: "bold", color: "#000000" }}
                >
                  {formatCurrency(stats.todayIncome)}
                </Text>
              )}
            </View>

            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                flex: 0.48,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Ionicons name="camera-outline" size={20} color="#6B73FF" />
                <Text style={{ color: "#666666", fontSize: 14, marginLeft: 8 }}>
                  Booking hoàn thành
                </Text>
              </View>
              {statsLoading ? (
                <ActivityIndicator size="small" color="#6B73FF" />
              ) : (
                <Text
                  style={{ fontSize: 18, fontWeight: "bold", color: "#000000" }}
                >
                  {stats.completedBookings}
                </Text>
              )}
            </View>
          </View>
        </View>
        <WithdrawalRequestsCard
          requests={withdrawalRequests}
          loading={withdrawalLoading}
          error={withdrawalError}
          onRefresh={refreshWithdrawals}
          onViewAll={handleViewAllWithdrawals}
          onRequestPress={handleWithdrawalRequestPress}
        />
        {/* Recent Transactions - SỬ DỤNG HOOK ĐÃ TẠO */}
        {renderRecentTransactions()}

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#000000",
              marginBottom: 12,
            }}
          >
            Thao tác nhanh
          </Text>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <TouchableOpacity
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                flex: 0.31,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Ionicons name="card-outline" size={24} color="#6B73FF" />
              <Text
                style={{
                  color: "#000000",
                  fontWeight: "500",
                  marginTop: 8,
                  textAlign: "center",
                  fontSize: 12,
                }}
              >
                Thông tin{"\n"}tài khoản
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                flex: 0.31,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              // onPress={handleViewAllTransactions}
            >
              <Ionicons name="time-outline" size={24} color="#F59E0B" />
              <Text
                style={{
                  color: "#000000",
                  fontWeight: "500",
                  marginTop: 8,
                  textAlign: "center",
                  fontSize: 12,
                }}
              >
                Lịch sử{"\n"}giao dịch
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 16,
                flex: 0.31,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Ionicons name="headset-outline" size={24} color="#10B981" />
              <Text
                style={{
                  color: "#000000",
                  fontWeight: "500",
                  marginTop: 8,
                  textAlign: "center",
                  fontSize: 12,
                }}
              >
                Hỗ trợ{"\n"}khách hàng
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Top-up Modal */}
      <WalletTopUpModal
        visible={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onSuccess={handleTopUpSuccess}
      />
    </>
  );
}
