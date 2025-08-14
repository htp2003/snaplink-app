// screens/venueOwner/VenueOwnerTransactionScreen.tsx - SIMPLIFIED VERSION

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../hooks/useAuth";
import { useVenueOwnerProfile } from "../../hooks/useVenueOwnerProfile";
import { useVenueOwnerTransactionHistory } from "../../hooks/useVenueOwnerTransaction";
import { useWallet } from "../../hooks/useWallet";
import { VenueDisplayTransaction } from "../../services/venueTransactionService";

interface TransactionItemProps {
  transaction: VenueDisplayTransaction;
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const getStatusText = (status: string): string => {
    switch (status.toLowerCase()) {
      case "success":
        return "Hoàn thành";
      case "pending":
        return "Đang xử lý";
      case "failed":
        return "Thất bại";
      case "cancelled":
        return "Đã hủy";
      default:
        return "Không xác định";
    }
  };

  const getTransactionTypeText = (type: string): string => {
    switch (type.toLowerCase()) {
      case "deposit":
        return "Nạp tiền vào ví";
      case "purchase":
        return "Mua gói dịch vụ";
      case "rental":
        return "Thu từ thuê địa điểm";
      case "booking":
        return "Thu từ đặt chỗ";
      case "commission":
        return "Hoa hồng";
      case "refund":
        return "Hoàn tiền";
      case "withdrawal":
        return "Rút tiền";
      case "subscription":
        return "Đăng ký gói";
      case "fee":
        return "Phí dịch vụ";
      case "bonus":
        return "Thưởng";
      case "payment":
        return "Thanh toán";
      case "upgrade":
        return "Nâng cấp dịch vụ";
      default:
        return type;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isIncome = transaction.displayType === "income";

  return (
    <View className="bg-white mx-4 mb-3 p-4 rounded-lg shadow-sm border border-gray-100">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="font-semibold text-gray-900 mb-1">
            {getTransactionTypeText(transaction.type)}
          </Text>
          {transaction.note && (
            <Text className="text-gray-600 text-sm" numberOfLines={2}>
              {transaction.note}
            </Text>
          )}
          {transaction.customerName && (
            <Text className="text-gray-500 text-xs mt-1">
              {isIncome ? "Từ: " : "Đến: "}
              {transaction.customerName}
            </Text>
          )}
        </View>
        <View className="items-end">
          <Text
            className={`font-bold text-lg ${
              isIncome ? "text-green-600" : "text-red-600"
            }`}
          >
            {isIncome ? "+" : "-"}
            {formatCurrency(transaction.amount)}
          </Text>
          <View
            className={`px-2 py-1 rounded-full mt-1`}
            style={{ backgroundColor: transaction.statusBgColor }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: transaction.statusColor }}
            >
              {getStatusText(transaction.status)}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row justify-between items-center pt-2 border-t border-gray-100">
        <Text className="text-gray-500 text-sm">
          {formatDate(transaction.createdAt)}
        </Text>
        <View className="flex-row items-center">
          <Ionicons
            name={transaction.iconName as any}
            size={16}
            color={transaction.statusColor}
          />
          <Text className="text-gray-500 text-sm ml-1">
            ID: {transaction.transactionId}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function VenueOwnerTransactionScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { getProfileByUserId } = useVenueOwnerProfile();
  const {
    walletBalance,
    loading: walletLoading,
    fetchWalletBalance,
  } = useWallet();

  // States
  const [locationOwnerId, setLocationOwnerId] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Get venue owner profile
  const fetchVenueOwnerProfile = useCallback(async () => {
    if (!user?.id) return;

    setProfileLoading(true);
    try {
      const profile = await getProfileByUserId(user.id);
      if (profile) {
        setLocationOwnerId(profile.locationOwnerId);
      } else {
        setLocationOwnerId(null);
      }
    } catch (error) {
      console.error("❌ Error getting venue owner profile:", error);
      setLocationOwnerId(null);
    } finally {
      setProfileLoading(false);
    }
  }, [user?.id, getProfileByUserId]);

  // Transaction hooks - only initialize if we have locationOwnerId
  const {
    transactions,
    loading: transactionsLoading,
    refreshing,
    error,
    hasMore,
    totalCount,
    refreshTransactions,
    loadMoreTransactions,
  } = useVenueOwnerTransactionHistory(locationOwnerId || 0);

  useEffect(() => {
    fetchVenueOwnerProfile();
  }, [fetchVenueOwnerProfile]);

  const onRefresh = useCallback(async () => {
    await Promise.all([refreshTransactions(), fetchWalletBalance()]);
  }, [refreshTransactions, fetchWalletBalance]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const renderTransaction = ({ item }: { item: VenueDisplayTransaction }) => (
    <TransactionItem transaction={item} />
  );

  const renderLoadMoreFooter = () => {
    if (!hasMore) return null;

    return (
      <View className="py-4">
        <TouchableOpacity
          className="bg-blue-500 mx-4 py-3 rounded-lg"
          onPress={loadMoreTransactions}
          disabled={transactionsLoading}
        >
          {transactionsLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white text-center font-semibold">
              Tải thêm
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const handleGoBack = () => {
    try {
      navigation.goBack();
    } catch (error) {
      console.error("❌ Navigation error:", error);
      // Fallback - just do nothing or show alert
    }
  };

  if (profileLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-2">Đang tải thông tin...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!locationOwnerId) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="business-outline" size={64} color="#9CA3AF" />
          <Text className="text-gray-600 text-center mt-4 text-lg">
            Bạn chưa có thông tin chủ địa điểm
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            Vui lòng liên hệ quản trị viên để được hỗ trợ
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={handleGoBack} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">
            Lịch sử giao dịch
          </Text>
        </View>
      </View>

      {/* Wallet Summary */}
      <View className="bg-white mx-4 mt-4 p-4 rounded-lg shadow-sm border border-gray-100">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-gray-600 mb-1">Số dư ví hiện tại</Text>
            {walletLoading ? (
              <ActivityIndicator color="#3B82F6" size="small" />
            ) : (
              <Text className="text-2xl font-bold text-gray-900">
                {walletBalance
                  ? formatCurrency(walletBalance.balance)
                  : "0 VND"}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => fetchWalletBalance()}
            className="bg-blue-100 p-2 rounded-full"
            disabled={walletLoading}
          >
            <Ionicons name="refresh" size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>

        {/* Transaction count */}
        <View className="flex-row justify-between items-center mt-3 pt-3 border-t border-gray-100">
          <Text className="text-gray-500 text-sm">
            Tổng {totalCount} giao dịch
          </Text>
          {transactions.length > 0 && (
            <Text className="text-gray-500 text-sm">
              Hiển thị {transactions.length} giao dịch
            </Text>
          )}
        </View>
      </View>

      {/* Transaction List */}
      <View className="flex-1 mt-4">
        {error ? (
          <View className="mx-4 bg-red-50 p-4 rounded-lg border border-red-200">
            <Text className="text-red-600 text-center">{error}</Text>
            <TouchableOpacity
              className="mt-2 bg-red-500 py-2 px-4 rounded-lg"
              onPress={onRefresh}
            >
              <Text className="text-white text-center font-semibold">
                Thử lại
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransaction}
            keyExtractor={(item) => item.transactionId.toString()}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              transactionsLoading ? (
                <View className="py-8">
                  <ActivityIndicator size="large" color="#3B82F6" />
                  <Text className="text-gray-600 text-center mt-2">
                    Đang tải giao dịch...
                  </Text>
                </View>
              ) : (
                <View className="py-8 px-4">
                  <Ionicons
                    name="receipt-outline"
                    size={64}
                    color="#9CA3AF"
                    style={{ alignSelf: "center" }}
                  />
                  <Text className="text-gray-600 text-center mt-4">
                    Chưa có giao dịch nào
                  </Text>
                  <Text className="text-gray-500 text-center mt-2">
                    Các giao dịch của bạn sẽ hiển thị tại đây
                  </Text>
                </View>
              )
            }
            ListFooterComponent={renderLoadMoreFooter}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
