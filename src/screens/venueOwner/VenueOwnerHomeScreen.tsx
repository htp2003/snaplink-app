import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useVenueWallet } from "../../hooks/useVenueWallet";
import { useVenueTransactions } from "../../hooks/useVenueTransactions";
import { useAuth } from "../../hooks/useAuth";

export default function VenueOwnerHomeScreen() {
  const { user } = useAuth();
  const {
    balance,
    loading: walletLoading,
    error: walletError,
    fetchBalance,
  } = useVenueWallet(user?.id);

  const {
    transactions = [],
    loading: transactionLoading,
    error: transactionError,
    refreshTransactions,
    totalCount,
  } = useVenueTransactions(user?.id, 1, 5); // Only get 5 recent transactions

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    if (!user?.id) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin người dùng");
      return;
    }
    setRefreshing(true);
    try {
      await Promise.all([fetchBalance(), refreshTransactions()]);
    } catch (err) {
      Alert.alert("Lỗi", "Không thể tải lại dữ liệu");
    } finally {
      setRefreshing(false);
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
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "VenueFee":
        return { name: "trending-up-outline", color: "#10B981" };
      case "Purchase":
        return { name: "card-outline", color: "#3B82F6" };
      case "Refund":
        return { name: "return-up-back-outline", color: "#8B5CF6" };
      case "Deposit":
        return { name: "add-circle-outline", color: "#3B82F6" };
      case "Withdrawal":
        return { name: "remove-circle-outline", color: "#EF4444" };
      case "PhotographerFee":
        return { name: "camera-outline", color: "#F59E0B" };
      case "PlatformFee":
        return { name: "business-outline", color: "#6B7280" };
      default:
        return { name: "swap-horizontal-outline", color: "#6B7280" };
    }
  };

  const getTransactionDisplayName = (type: string) => {
    switch (type) {
      case "VenueFee":
        return "Thu nhập từ địa điểm";
      case "Purchase":
        return "Thanh toán";
      case "Refund":
        return "Hoàn tiền";
      case "Deposit":
        return "Nạp tiền";
      case "Withdrawal":
        return "Rút tiền";
      case "PhotographerFee":
        return "Phí nhiếp ảnh";
      case "PlatformFee":
        return "Phí nền tảng";
      default:
        return type;
    }
  };

  if (walletError || transactionError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="warning-outline" size={64} color="#EF4444" />
          <Text className="text-xl font-semibold text-gray-900 mt-4 text-center">
            Có lỗi xảy ra
          </Text>
          <Text className="text-gray-600 mt-2 text-center">
            {walletError || transactionError}
          </Text>
          <TouchableOpacity
            onPress={onRefresh}
            className="bg-red-500 px-6 py-3 rounded-lg mt-4"
          >
            <Text className="text-white font-semibold">Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!user?.id) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="warning-outline" size={64} color="#EF4444" />
          <Text className="text-xl font-semibold text-gray-900 mt-4 text-center">
            Lỗi xác thực
          </Text>
          <Text className="text-gray-600 mt-2 text-center">
            Vui lòng đăng nhập lại
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="bg-white px-4 py-6">
          <Text className="text-2xl font-bold text-gray-900">Ví của tôi</Text>
          <Text className="text-gray-600 mt-1">
            Quản lý thu nhập từ địa điểm
          </Text>
        </View>

        {/* Wallet Balance Card */}
        <View className="mx-4 mt-4">
          <View
            className="rounded-xl p-6 shadow-lg"
            style={{
              backgroundColor: "#3B82F6", // Blue background as fallback
              // You can add LinearGradient component here later
            }}
          >
            <View className="flex-row justify-between items-start">
              <View className="flex-1">
                <Text className="text-white opacity-80 text-sm font-medium">
                  Số dư khả dụng
                </Text>
                {walletLoading ? (
                  <View
                    className="h-8 w-32 rounded mt-2"
                    style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                  />
                ) : (
                  <Text className="text-white text-3xl font-bold mt-1">
                    {formatCurrency(balance?.balance || 0)}
                  </Text>
                )}
              </View>
              <View
                className="p-3 rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
              >
                <Ionicons name="wallet" size={24} color="white" />
              </View>
            </View>

            <View
              className="flex-row justify-between mt-6 pt-4"
              style={{
                borderTopWidth: 1,
                borderTopColor: "rgba(255,255,255,0.2)",
              }}
            >
              <View>
                <Text className="text-white opacity-80 text-xs">
                  Đang chờ xử lý
                </Text>
                <Text className="text-white font-semibold">
                  {formatCurrency(balance?.pendingAmount || 0)}
                </Text>
              </View>
              <View>
                <Text className="text-white opacity-80 text-xs">
                  Tổng thu nhập
                </Text>
                <Text className="text-white font-semibold">
                  {formatCurrency(balance?.totalEarned || 0)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mx-4 mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            Thao tác nhanh
          </Text>
          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="flex-1 bg-white p-4 rounded-lg shadow-sm border border-gray-100"
              onPress={() => {
                Alert.alert(
                  "Thông báo",
                  "Tính năng rút tiền sẽ được cập nhật sớm"
                );
              }}
            >
              <View className="items-center">
                <View className="bg-green-100 p-3 rounded-full mb-2">
                  <Ionicons name="cash-outline" size={24} color="#10B981" />
                </View>
                <Text className="text-sm font-medium text-gray-900">
                  Rút tiền
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-white p-4 rounded-lg shadow-sm border border-gray-100"
              onPress={() => {
                Alert.alert(
                  "Thông báo",
                  "Tính năng lịch sử sẽ được cập nhật sớm"
                );
              }}
            >
              <View className="items-center">
                <View className="bg-purple-100 p-3 rounded-full mb-2">
                  <Ionicons name="time-outline" size={24} color="#8B5CF6" />
                </View>
                <Text className="text-sm font-medium text-gray-900">
                  Lịch sử
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-white p-4 rounded-lg shadow-sm border border-gray-100"
              onPress={() => {
                Alert.alert(
                  "Thông báo",
                  "Tính năng báo cáo sẽ được cập nhật sớm"
                );
              }}
            >
              <View className="items-center">
                <View className="bg-blue-100 p-3 rounded-full mb-2">
                  <Ionicons
                    name="stats-chart-outline"
                    size={24}
                    color="#3B82F6"
                  />
                </View>
                <Text className="text-sm font-medium text-gray-900">
                  Báo cáo
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <View className="mx-4 mt-6 mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900">
              Giao dịch gần đây
            </Text>
            {totalCount > 5 && (
              <TouchableOpacity
                onPress={() => {
                  Alert.alert(
                    "Thông báo",
                    "Tính năng xem tất cả sẽ được cập nhật sớm"
                  );
                }}
              >
                <Text className="text-blue-500 font-medium">Xem tất cả</Text>
              </TouchableOpacity>
            )}
          </View>

          {transactionLoading ? (
            <View className="space-y-3">
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                >
                  <View className="flex-row items-center space-x-3">
                    <View className="w-10 h-10 bg-gray-200 rounded-full" />
                    <View className="flex-1">
                      <View className="bg-gray-200 h-4 w-24 rounded mb-2" />
                      <View className="bg-gray-200 h-3 w-16 rounded" />
                    </View>
                    <View className="bg-gray-200 h-4 w-20 rounded" />
                  </View>
                </View>
              ))}
            </View>
          ) : transactions.length > 0 ? (
            <View className="space-y-3">
              {transactions.map((transaction) => {
                const icon = getTransactionIcon(transaction.type);
                const isPositive = ["VenueFee", "Deposit", "Refund"].includes(
                  transaction.type
                );

                return (
                  <TouchableOpacity
                    key={transaction.id}
                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-100"
                    onPress={() => {
                      Alert.alert(
                        "Chi tiết giao dịch",
                        transaction.description || "Không có mô tả"
                      );
                    }}
                  >
                    <View className="flex-row items-center space-x-3">
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={{ backgroundColor: `${icon.color}20` }}
                      >
                        <Ionicons
                          name={icon.name as any}
                          size={20}
                          color={icon.color}
                        />
                      </View>

                      <View className="flex-1">
                        <Text className="font-medium text-gray-900">
                          {getTransactionDisplayName(transaction.type)}
                        </Text>
                        <Text className="text-sm text-gray-500">
                          {formatDate(transaction.createdAt)}
                        </Text>
                      </View>

                      <View className="items-end">
                        <Text
                          className={`font-semibold ${
                            isPositive ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {isPositive ? "+" : "-"}
                          {formatCurrency(Math.abs(transaction.amount))}
                        </Text>
                        <View className="flex-row items-center mt-1">
                          <View
                            className={`w-2 h-2 rounded-full mr-2 ${
                              transaction.status === "completed"
                                ? "bg-green-500"
                                : transaction.status === "pending"
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                          />
                          <Text className="text-xs text-gray-500 capitalize">
                            {transaction.status === "completed"
                              ? "Hoàn thành"
                              : transaction.status === "pending"
                              ? "Đang xử lý"
                              : transaction.status === "failed"
                              ? "Thất bại"
                              : transaction.status}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
              <View className="items-center">
                <View className="bg-gray-100 p-4 rounded-full mb-4">
                  <Ionicons name="receipt-outline" size={32} color="#6B7280" />
                </View>
                <Text className="text-gray-900 font-medium mb-2">
                  Chưa có giao dịch nào
                </Text>
                <Text className="text-gray-500 text-center">
                  Các giao dịch của bạn sẽ hiển thị ở đây
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
