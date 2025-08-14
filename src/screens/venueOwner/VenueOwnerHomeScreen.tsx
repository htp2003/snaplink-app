// screens/venueOwner/VenueOwnerHomeScreen.tsx - INTEGRATED WALLET & TOP-UP
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
import { useWallet } from "../../hooks/useWallet";
import WalletTopUpModal from "../../components/WalletTopUpModal";
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

  // 🔥 WALLET INTEGRATION
  const {
    walletBalance,
    loading: walletLoading,
    error: walletError,
    fetchWalletBalance,
  } = useWallet();

  // States
  const [locationOwnerId, setLocationOwnerId] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 🔥 WALLET TOP-UP STATES
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
      fetchWalletBalance(), // 🔥 FETCH WALLET BALANCE
    ]);

    if (locationOwnerId) {
      await getAllLocations();
    }
  }, [
    fetchVenueOwnerProfile,
    fetchWalletBalance,
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

  // 🔥 WALLET TOP-UP HANDLERS (from your code)
  const handleTopUpSuccess = () => {
    // Refresh balance after successful top-up
    fetchWalletBalance();
    Alert.alert(
      "Thành công",
      "Nạp tiền thành công! Số dư của bạn sẽ được cập nhật trong vài phút.",
      [{ text: "OK" }]
    );
  };

  const handleTopUp = () => {
    setShowTopUpModal(true);
  };

  // Filter locations by actual locationOwnerId
  const myLocations = locationOwnerId
    ? locations.filter(
        (location) => location.locationOwnerId === locationOwnerId
      )
    : [];

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

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

        {/* 🔥 WALLET SECTION - SIMPLIFIED FOR DEBUG */}
        <View style={{ marginHorizontal: 16, marginTop: 16 }}>
          <View
            style={{
              backgroundColor: "#3B82F6", // Solid blue instead of gradient
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
                  Số dư ví của bạn
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

            {/* Wallet Actions */}
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              {/* 🔥 TOP-UP BUTTON (your code - exact styling) */}
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
                  Nạp tiền
                </Text>
              </TouchableOpacity>

              {/* Transaction History Button */}
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
                onPress={() =>
                  Alert.alert("Thông báo", "Tính năng sẽ được cập nhật sớm")
                }
              >
                <Ionicons name="receipt-outline" size={20} color="#FFFFFF" />
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontWeight: "600",
                    fontSize: 14,
                    marginLeft: 8,
                  }}
                >
                  Lịch sử
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
                      Tổng chi tiêu
                    </Text>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontWeight: "600",
                        marginTop: 2,
                      }}
                    >
                      {formatCurrency(walletBalance.totalSpent || 0)}
                    </Text>
                  </View>
                  <View>
                    <Text
                      style={{
                        color: "rgba(255, 255, 255, 0.7)",
                        fontSize: 12,
                      }}
                    >
                      Tổng nạp
                    </Text>
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontWeight: "600",
                        marginTop: 2,
                      }}
                    >
                      {formatCurrency(walletBalance.totalEarned || 0)}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

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

            <TouchableOpacity
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex-row items-center justify-between"
              onPress={() =>
                Alert.alert("Thông báo", "Tính năng sẽ được cập nhật sớm")
              }
            >
              <View className="flex-row items-center">
                <View className="bg-green-100 p-3 rounded-full mr-4">
                  <Ionicons name="card-outline" size={20} color="#10B981" />
                </View>
                <Text className="text-gray-900 font-medium">
                  Quản lý gói đăng ký
                </Text>
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
                <Text className="text-blue-500 font-medium">Xem tất cả</Text>
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
                      <Text className="text-blue-600 font-semibold">
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

      {/* 🔥 WALLET TOP-UP MODAL */}
      <WalletTopUpModal
        visible={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onSuccess={handleTopUpSuccess}
      />
    </SafeAreaView>
  );
}
