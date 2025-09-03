import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useWithdrawalRequests } from '../../hooks/useWithdrawal';
import {
  useWallet,
  useTransactionStats,
  useUserTransactionHistory,
} from '../../hooks/useTransaction';
import transactionService from '../../services/transactionService';
import WalletTopUpModal from '../../components/WalletTopUpModal';
import WithdrawalRequestsCard from '../../components/WithdrawalRequestCard';
import { WithdrawalRequest } from '../../types/withdrawal';

const WalletScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { getCurrentUserId } = useAuth();
const userId = getCurrentUserId();
  const shouldFetchData = !!userId;

  // State for top-up modal
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  const {
    transactions,
    loading: transactionsLoading,
    refreshing: transactionsRefreshing,
    error: transactionsError,
    refreshTransactions,
  } = useUserTransactionHistory(shouldFetchData ? userId : 0, 5); // pageSize = 5 cho home screen

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
  } = useTransactionStats(shouldFetchData ? userId : 0);

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

  const handleGoBack = () => {
    navigation.goBack();
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

                  {/* Photographer/Service provider name if available */}
                  {transaction.customerName && (
                    <Text
                      style={{
                        color: "#666666",
                        fontSize: 14,
                        marginBottom: 4,
                      }}
                    >
                      Với: {transaction.customerName}
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
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={transactionsRefreshing}
            onRefresh={onRefresh}
            colors={["#FF385C"]}
            tintColor="#FF385C"
            progressViewOffset={insets.top + 50}
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
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={handleGoBack}
                style={{ marginRight: 16 }}
              >
                <Ionicons name="arrow-back" size={24} color="#000000" />
              </TouchableOpacity>
              <Text
                style={{ color: "#000000", fontSize: 32, fontWeight: "bold" }}
              >
                Ví của tôi
              </Text>
            </View>
          </View>
          
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

            {/* <View
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
                  Tổng chi tiêu tháng này
                </Text>
                {statsLoading ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <Text
                    style={{
                      color: "#EF4444",
                      fontWeight: "600",
                      fontSize: 16,
                    }}
                  >
                    {formatCurrency(stats.monthlyExpense || 0)}
                  </Text>
                )}
              </View>
            </View> */}

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

        {/* Withdrawal Requests Card */}
        <WithdrawalRequestsCard
          requests={withdrawalRequests}
          loading={withdrawalLoading}
          error={withdrawalError}
          onRefresh={refreshWithdrawals}
          onViewAll={handleViewAllWithdrawals}
          onRequestPress={handleWithdrawalRequestPress}
        />

        {/* Recent Transactions */}
        {renderRecentTransactions()}
      </ScrollView>

      {/* Top-up Modal */}
      <WalletTopUpModal
        visible={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onSuccess={handleTopUpSuccess}
      />
    </>
  );
};

export default WalletScreen;