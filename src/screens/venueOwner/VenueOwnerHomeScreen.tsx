import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../hooks/useAuth";
import { useVenueOwnerProfile } from "../../hooks/useVenueOwnerProfile";
import { useVenueOwnerLocation } from "../../hooks/useVenueOwnerLocation";
import { useVenueWallet } from "../../hooks/useVenueWallet";
import { useWithdrawalRequests } from "../../hooks/useWithdrawal"; // 🆕 NEW IMPORT
import VenueWalletTopUpModal from "../../components/VenueWalletTopUpModal";
import VenueWithdrawalRequestCard from "../../components/VenueWithdrawalRequestCard"; // 🆕 NEW IMPORT
import { RootStackNavigationProp } from "../../navigation/types";

export default function VenueOwnerHomeScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user } = useAuth();
  const { getProfileByUserId } = useVenueOwnerProfile();
  const {
    getAllLocations,
    locations,
    loading: locationsLoading,
  } = useVenueOwnerLocation();

  // 🟢 VENUE WALLET INTEGRATION
  const {
    walletBalance,
    loading: walletLoading,
    error: walletError,
    fetchWalletBalance,
    formatCurrency,
    balanceStatus,
    hasLowBalance,
    hasCriticalBalance,
  } = useVenueWallet();

  // 🆕 WITHDRAWAL REQUESTS INTEGRATION
  const {
    requests: withdrawalRequests,
    loading: withdrawalLoading,
    error: withdrawalError,
    refreshRequests,
  } = useWithdrawalRequests(!!user?.id);

  // States
  const [locationOwnerId, setLocationOwnerId] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🟢 VENUE WALLET TOP-UP STATES
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  // Fetch venue owner profile
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

  // Load data
  const loadData = useCallback(async () => {
    await Promise.all([
      fetchVenueOwnerProfile(),
      fetchWalletBalance(),
      refreshRequests(), // 🆕 FETCH WITHDRAWAL REQUESTS
    ]);

    if (locationOwnerId) {
      await getAllLocations();
    }
  }, [
    fetchVenueOwnerProfile,
    fetchWalletBalance,
    refreshRequests,
    locationOwnerId,
    getAllLocations,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // 🟢 VENUE WALLET TOP-UP HANDLERS
  const handleTopUpSuccess = () => {
    fetchWalletBalance();
    Alert.alert(
      "Nạp tiền thành công",
      "Số dư ví của bạn đã được cập nhật. Bạn có thể tiếp tục sử dụng các dịch vụ của SnapLink.",
      [{ text: "Tuyệt vời!" }]
    );
  };

  const handleTopUp = () => {
    setShowTopUpModal(true);
  };

  // Navigate to transaction history
  const handleViewTransactionHistory = () => {
    navigation.navigate("VenueOwnerTransaction");
  };

  // 🆕 WITHDRAWAL HANDLERS
  const handleCreateWithdrawal = () => {
    navigation.navigate("WithdrawalScreen");
  };

  const handleViewAllWithdrawals = () => {
    navigation.navigate("VenueOwnerTransaction");
  };

  const handleWithdrawalPress = (request: any) => {
    Alert.alert(
      "Chi tiết yêu cầu rút tiền",
      `Số tiền: ${formatCurrency(request.amount)}\nNgân hàng: ${
        request.bankName
      }\nTrạng thái: ${request.requestStatus}`,
      [{ text: "Đóng" }]
    );
  };

  // Filter locations by actual locationOwnerId
  const myLocations = locationOwnerId
    ? locations.filter(
        (location) => location.locationOwnerId === locationOwnerId
      )
    : [];

  // Stats calculations
  const totalLocations = myLocations.length;
  const activeLocations = myLocations.filter(
    (loc) => loc.availabilityStatus === "Available"
  ).length;
  const pendingLocations = myLocations.filter(
    (loc) => loc.verificationStatus === "pending"
  ).length;

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
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-2xl font-bold text-gray-900">
                Chào mừng trở lại
              </Text>
              <Text className="text-gray-600 mt-1">
                {user?.fullName || "Venue Owner"}
              </Text>
            </View>
            <TouchableOpacity className="p-2">
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#6B7280"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* 🟢 VENUE WALLET SECTION - PURPLE THEMED */}
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <View
            style={{
              backgroundColor: "#8B5CF6",
              borderRadius: 12,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            {/* Balance Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 16,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 14, opacity: 0.9 }}>
                  Ví điện tử chủ địa điểm
                </Text>
                {walletLoading ? (
                  <ActivityIndicator
                    color="#FFFFFF"
                    size="small"
                    style={{ marginTop: 8 }}
                  />
                ) : walletError ? (
                  <Text
                    style={{
                      color: "#FCA5A5",
                      fontSize: 18,
                      fontWeight: "bold",
                      marginTop: 4,
                    }}
                  >
                    Lỗi tải dữ liệu
                  </Text>
                ) : (
                  <>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 24,
                        fontWeight: "bold",
                        marginTop: 4,
                      }}
                    >
                      {walletBalance
                        ? formatCurrency(walletBalance.balance)
                        : "0 VND"}
                    </Text>
                    {balanceStatus && (
                      <Text
                        style={{
                          color: "rgba(255, 255, 255, 0.8)",
                          fontSize: 12,
                          marginTop: 4,
                        }}
                      >
                        {balanceStatus.message}
                      </Text>
                    )}
                  </>
                )}
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  padding: 8,
                  borderRadius: 20,
                }}
                onPress={() => fetchWalletBalance()}
                disabled={walletLoading}
              >
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Low Balance Warning for Venue */}
            {hasCriticalBalance && (
              <View
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.2)",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Ionicons name="warning" size={16} color="#FCA5A5" />
                <Text
                  style={{
                    color: "#FCA5A5",
                    fontSize: 12,
                    marginLeft: 8,
                    flex: 1,
                  }}
                >
                  Số dư dưới 5,000đ! Nạp tiền để tiếp tục sử dụng dịch vụ.
                </Text>
              </View>
            )}

            {/* Wallet Actions */}
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              {/* 🟢 VENUE TOP-UP BUTTON */}
              <TouchableOpacity
                style={{
                  backgroundColor: hasCriticalBalance ? "#EF4444" : "#10B981",
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  flex: 0.48,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={handleTopUp}
                disabled={walletLoading}
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
                  {hasCriticalBalance ? "Nạp ngay" : "Nạp tiền"}
                </Text>
              </TouchableOpacity>

              {/* 🆕 WITHDRAWAL BUTTON */}
              <TouchableOpacity
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  flex: 0.48,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onPress={handleCreateWithdrawal}
              >
                <Ionicons
                  name="arrow-up-circle-outline"
                  size={20}
                  color="#FFFFFF"
                />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontWeight: "600",
                    fontSize: 14,
                    marginLeft: 8,
                  }}
                >
                  Rút tiền
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick Stats */}
            {walletBalance && (
              <View
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: "rgba(255, 255, 255, 0.2)",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <View>
                    <Text
                      style={{
                        color: "rgba(255, 255, 255, 0.7)",
                        fontSize: 12,
                      }}
                    >
                      Số dư hiện tại
                    </Text>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontWeight: "600",
                        marginTop: 2,
                      }}
                    >
                      {formatCurrency(walletBalance.balance)}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={{
                        color: "rgba(255, 255, 255, 0.7)",
                        fontSize: 12,
                      }}
                    >
                      Trạng thái
                    </Text>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontWeight: "600",
                        marginTop: 2,
                      }}
                    >
                      {balanceStatus?.status === "excellent"
                        ? "Tuyệt vời"
                        : balanceStatus?.status === "good"
                        ? "Ổn định"
                        : balanceStatus?.status === "low"
                        ? "Thấp"
                        : "Rất thấp"}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* 🆕 WITHDRAWAL REQUESTS CARD */}
        <VenueWithdrawalRequestCard
          requests={withdrawalRequests}
          loading={withdrawalLoading}
          error={withdrawalError}
          onRefresh={refreshRequests}
          onViewAll={handleViewAllWithdrawals}
          onRequestPress={handleWithdrawalPress}
          onCreateWithdrawal={handleCreateWithdrawal}
        />

        {/* Quick Stats */}
        <View className="mx-4 mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Tổng quan
          </Text>
          <View className="flex-row space-x-4">
            <View className="flex-1 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between mb-2">
                <Ionicons name="business-outline" size={20} color="#3B82F6" />
                <Text className="text-2xl font-bold text-gray-900">
                  {totalLocations}
                </Text>
              </View>
              <Text className="text-gray-600 text-sm">Tổng địa điểm</Text>
            </View>

            <View className="flex-1 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between mb-2">
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#10B981"
                />
                <Text className="text-2xl font-bold text-gray-900">
                  {activeLocations}
                </Text>
              </View>
              <Text className="text-gray-600 text-sm">Đang hoạt động</Text>
            </View>

            <View className="flex-1 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <View className="flex-row items-center justify-between mb-2">
                <Ionicons name="time-outline" size={20} color="#F59E0B" />
                <Text className="text-2xl font-bold text-gray-900">
                  {pendingLocations}
                </Text>
              </View>
              <Text className="text-gray-600 text-sm">Chờ xác minh</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mx-4 mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Thao tác nhanh
          </Text>
          <View className="space-y-3">
            <TouchableOpacity
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex-row items-center justify-between"
              onPress={() => navigation.navigate("VenueManagement")}
            >
              <View className="flex-row items-center">
                <View className="bg-blue-100 p-3 rounded-full mr-4">
                  <Ionicons name="business-outline" size={20} color="#3B82F6" />
                </View>
                <Text className="text-gray-900 font-medium">
                  Quản lý địa điểm
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex-row items-center justify-between"
              onPress={() => navigation.navigate("VenueOwnerEvents")}
            >
              <View className="flex-row items-center">
                <View className="bg-purple-100 p-3 rounded-full mr-4">
                  <Ionicons name="calendar-outline" size={20} color="#8B5CF6" />
                </View>
                <Text className="text-gray-900 font-medium">
                  Quản lý sự kiện
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>

            {/* 🟢 Enhanced Transaction History Quick Action */}
            <TouchableOpacity
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex-row items-center justify-between"
              onPress={handleViewTransactionHistory}
            >
              <View className="flex-row items-center">
                <View className="bg-green-100 p-3 rounded-full mr-4">
                  <Ionicons name="receipt-outline" size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">
                    Lịch sử giao dịch
                  </Text>
                  {withdrawalRequests.length > 0 && (
                    <Text className="text-green-600 text-xs mt-1">
                      Bao gồm{" "}
                      {
                        withdrawalRequests.filter(
                          (r) => r.requestStatus === "Pending"
                        ).length
                      }{" "}
                      yêu cầu rút tiền
                    </Text>
                  )}
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex-row items-center justify-between"
              onPress={() =>
                Alert.alert("Thông báo", "Tính năng sẽ được cập nhật sớm")
              }
            >
              <View className="flex-row items-center">
                <View className="bg-yellow-100 p-3 rounded-full mr-4">
                  <Ionicons
                    name="analytics-outline"
                    size={20}
                    color="#F59E0B"
                  />
                </View>
                <Text className="text-gray-900 font-medium">
                  Báo cáo & Thống kê
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Locations Preview */}
        {myLocations.length > 0 && (
          <View className="mx-4 mt-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold text-gray-900">
                Địa điểm gần đây
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("VenueManagement")}
              >
                <Text className="text-purple-500 font-medium">Xem tất cả</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row space-x-4">
                {myLocations.slice(0, 3).map((location) => (
                  <View
                    key={location.locationId}
                    className="bg-white rounded-lg shadow-sm border border-gray-100 w-64 p-4"
                  >
                    <Text className="font-semibold text-gray-900 mb-2">
                      {location.name}
                    </Text>
                    <Text
                      className="text-gray-600 text-sm mb-3"
                      numberOfLines={2}
                    >
                      {location.address}
                    </Text>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-purple-600 font-semibold">
                        {location.hourlyRate
                          ? formatCurrency(location.hourlyRate)
                          : "Chưa có giá"}
                        /giờ
                      </Text>
                      <View
                        className={`w-2 h-2 rounded-full ${
                          location.availabilityStatus === "Available"
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }`}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        <View className="h-6" />
      </ScrollView>

      {/* 🟢 VENUE WALLET TOP-UP MODAL */}
      <VenueWalletTopUpModal
        visible={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onSuccess={handleTopUpSuccess}
      />
    </SafeAreaView>
  );
}
