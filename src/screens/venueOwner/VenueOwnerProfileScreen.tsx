// screens/venueOwner/VenueOwnerProfileScreen.tsx - COMPLETED
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useVenueOwnerData } from "../../hooks/useVenueOwnerData";
import {
  VenueOwner,
  UpdateVenueOwnerRequest,
} from "../../services/venueOwnerService";

export default function VenueOwnerProfileScreen() {
  const { user, logout } = useAuth();
  const { getVenueOwnerById, updateVenueOwner } = useVenueOwnerData();

  const [venueOwner, setVenueOwner] = useState<VenueOwner | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    businessName: "",
    businessAddress: "",
    businessRegistrationNumber: "",
  });

  const fetchVenueOwnerProfile = async () => {
    if (!user?.venueOwnerId) return;

    setLoading(true);
    try {
      const data = await getVenueOwnerById(user.venueOwnerId);
      if (data) {
        setVenueOwner(data);
        setFormData({
          businessName: data.businessName || "",
          businessAddress: data.businessAddress || "",
          businessRegistrationNumber: data.businessRegistrationNumber || "",
        });
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải thông tin hồ sơ");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchVenueOwnerProfile();
    setRefreshing(false);
  };

  const handleUpdateProfile = async () => {
    if (!venueOwner) return;

    try {
      const updateData: UpdateVenueOwnerRequest = {
        businessName: formData.businessName || undefined,
        businessAddress: formData.businessAddress || undefined,
        businessRegistrationNumber:
          formData.businessRegistrationNumber || undefined,
      };

      const updated = await updateVenueOwner(venueOwner.id, updateData);
      if (updated) {
        setVenueOwner(updated);
        setShowEditModal(false);
        Alert.alert("Thành công", "Cập nhật hồ sơ thành công");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Có lỗi xảy ra khi cập nhật hồ sơ");
    }
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
      { text: "Hủy", style: "cancel" },
      { text: "Đăng xuất", style: "destructive", onPress: logout },
    ]);
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "verified":
        return { color: "#10B981", bg: "#D1FAE5", text: "Đã xác minh" };
      case "pending":
        return { color: "#F59E0B", bg: "#FEF3C7", text: "Đang chờ xác minh" };
      case "rejected":
        return { color: "#EF4444", bg: "#FEE2E2", text: "Bị từ chối" };
      default:
        return { color: "#6B7280", bg: "#F3F4F6", text: "Chưa xác minh" };
    }
  };

  useEffect(() => {
    fetchVenueOwnerProfile();
  }, [user?.venueOwnerId]);

  const verificationStatus = venueOwner
    ? getVerificationStatusColor(venueOwner.verificationStatus)
    : null;

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
          <Text className="text-2xl font-bold text-gray-900">
            Hồ sơ của tôi
          </Text>
          <Text className="text-gray-600 mt-1">
            Quản lý thông tin tài khoản
          </Text>
        </View>

        {/* Profile Card */}
        <View className="mx-4 mt-4">
          <View className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <View className="items-center mb-6">
              <View className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full items-center justify-center mb-4">
                <Text className="text-white text-2xl font-bold">
                  {user?.fullName?.charAt(0).toUpperCase() || "V"}
                </Text>
              </View>
              <Text className="text-xl font-semibold text-gray-900">
                {user?.fullName || "Venue Owner"}
              </Text>
              <Text className="text-gray-500">{user?.email}</Text>

              {verificationStatus && (
                <View
                  className="flex-row items-center px-3 py-1 rounded-full mt-3"
                  style={{ backgroundColor: verificationStatus.bg }}
                >
                  <View
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: verificationStatus.color }}
                  />
                  <Text
                    className="text-sm font-medium"
                    style={{ color: verificationStatus.color }}
                  >
                    {verificationStatus.text}
                  </Text>
                </View>
              )}
            </View>

            {/* Business Info */}
            {loading ? (
              <View className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <View key={i} className="space-y-2">
                    <View className="bg-gray-200 h-4 w-20 rounded" />
                    <View className="bg-gray-200 h-6 w-full rounded" />
                  </View>
                ))}
              </View>
            ) : venueOwner ? (
              <View className="space-y-4">
                <View>
                  <Text className="text-sm text-gray-500 mb-1">
                    Tên doanh nghiệp
                  </Text>
                  <Text className="text-gray-900 font-medium">
                    {venueOwner.businessName || "Chưa cập nhật"}
                  </Text>
                </View>

                <View>
                  <Text className="text-sm text-gray-500 mb-1">
                    Địa chỉ doanh nghiệp
                  </Text>
                  <Text className="text-gray-900 font-medium">
                    {venueOwner.businessAddress || "Chưa cập nhật"}
                  </Text>
                </View>

                <View>
                  <Text className="text-sm text-gray-500 mb-1">
                    Số đăng ký kinh doanh
                  </Text>
                  <Text className="text-gray-900 font-medium">
                    {venueOwner.businessRegistrationNumber || "Chưa cập nhật"}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setShowEditModal(true)}
                  className="bg-blue-500 py-3 rounded-lg mt-4"
                >
                  <Text className="text-white font-semibold text-center">
                    Chỉnh sửa thông tin
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="items-center py-8">
                <Ionicons
                  name="alert-circle-outline"
                  size={48}
                  color="#6B7280"
                />
                <Text className="text-gray-500 mt-2">
                  Không thể tải thông tin hồ sơ
                </Text>
              </View>
            )}
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
              onPress={() =>
                Alert.alert("Thông báo", "Tính năng sẽ được cập nhật sớm")
              }
            >
              <View className="flex-row items-center">
                <View className="bg-blue-100 p-3 rounded-full mr-4">
                  <Ionicons
                    name="notifications-outline"
                    size={20}
                    color="#3B82F6"
                  />
                </View>
                <Text className="text-gray-900 font-medium">
                  Cài đặt thông báo
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
                  <Ionicons
                    name="help-circle-outline"
                    size={20}
                    color="#10B981"
                  />
                </View>
                <Text className="text-gray-900 font-medium">
                  Trợ giúp & Hỗ trợ
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
                <View className="bg-purple-100 p-3 rounded-full mr-4">
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color="#8B5CF6"
                  />
                </View>
                <Text className="text-gray-900 font-medium">
                  Điều khoản & Chính sách
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex-row items-center justify-between"
              onPress={handleLogout}
            >
              <View className="flex-row items-center">
                <View className="bg-red-100 p-3 rounded-full mr-4">
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                </View>
                <Text className="text-red-600 font-medium">Đăng xuất</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="h-6" />
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text className="text-blue-500 font-medium">Hủy</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold">Chỉnh sửa hồ sơ</Text>
            <TouchableOpacity onPress={handleUpdateProfile}>
              <Text className="text-blue-500 font-medium">Lưu</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-6">
            <View className="space-y-6">
              <View>
                <Text className="text-gray-900 font-medium mb-2">
                  Tên doanh nghiệp
                </Text>
                <TextInput
                  value={formData.businessName}
                  onChangeText={(text) =>
                    setFormData({ ...formData, businessName: text })
                  }
                  placeholder="Nhập tên doanh nghiệp"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                />
              </View>

              <View>
                <Text className="text-gray-900 font-medium mb-2">
                  Địa chỉ doanh nghiệp
                </Text>
                <TextInput
                  value={formData.businessAddress}
                  onChangeText={(text) =>
                    setFormData({ ...formData, businessAddress: text })
                  }
                  placeholder="Nhập địa chỉ doanh nghiệp"
                  multiline
                  numberOfLines={2}
                  className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                />
              </View>

              <View>
                <Text className="text-gray-900 font-medium mb-2">
                  Số đăng ký kinh doanh
                </Text>
                <TextInput
                  value={formData.businessRegistrationNumber}
                  onChangeText={(text) =>
                    setFormData({
                      ...formData,
                      businessRegistrationNumber: text,
                    })
                  }
                  placeholder="Nhập số đăng ký kinh doanh"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                />
              </View>

              <View className="bg-blue-50 p-4 rounded-lg">
                <View className="flex-row items-start">
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color="#3B82F6"
                    className="mr-2 mt-0.5"
                  />
                  <Text className="text-blue-800 text-sm flex-1">
                    Thông tin này sẽ được sử dụng để xác minh tài khoản của bạn.
                    Vui lòng cung cấp thông tin chính xác.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
