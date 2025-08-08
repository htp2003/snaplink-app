// screens/venueOwner/VenueOwnerProfileScreen.tsx - COMPLETED with new API
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
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useVenueOwnerProfile } from "../../hooks/useVenueOwnerProfile";
import { LocationOwner } from "../../types/venueOwner";

export default function VenueOwnerProfileScreen() {
  const { user, logout } = useAuth();
  const {
    createProfile,
    getProfileById,
    getProfileByUserId,
    updateProfile,
    loading,
    error,
    clearError,
  } = useVenueOwnerProfile();
  const navigation = useNavigation<RootStackNavigationProp>();
  const [venueOwner, setVenueOwner] = useState<LocationOwner | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [locationOwnerId, setLocationOwnerId] = useState<number | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    businessName: "",
    businessAddress: "",
    businessRegistrationNumber: "",
  });

  // Check if user has existing venue owner profile
  const checkExistingProfile = async () => {
    if (!user?.id) return;

    // Try to find existing profile by userId
    const existingProfile = await getProfileByUserId(user.id);

    if (existingProfile) {
      setVenueOwner(existingProfile);
      setLocationOwnerId(existingProfile.locationOwnerId);
      setFormData({
        businessName: existingProfile.businessName || "",
        businessAddress: existingProfile.businessAddress || "",
        businessRegistrationNumber:
          existingProfile.businessRegistrationNumber || "",
      });
      setShowCreateModal(false);
    } else {
      setVenueOwner(null);
      setLocationOwnerId(null);
      setShowCreateModal(true);
    }
  };

  const fetchVenueOwnerProfile = async (ownerIdToFetch?: number) => {
    if (!ownerIdToFetch && !locationOwnerId) {
      setShowCreateModal(true);
      return;
    }

    const idToUse = ownerIdToFetch || locationOwnerId;
    if (!idToUse) return;

    const data = await getProfileById(idToUse);
    if (data) {
      setVenueOwner(data);
      setLocationOwnerId(data.locationOwnerId);
      setFormData({
        businessName: data.businessName || "",
        businessAddress: data.businessAddress || "",
        businessRegistrationNumber: data.businessRegistrationNumber || "",
      });
      setShowCreateModal(false);
    } else {
      // Profile not found, show create form
      setShowCreateModal(true);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkExistingProfile();
    setRefreshing(false);
  };

  const handleCreateProfile = async () => {
    if (!user?.id) {
      Alert.alert("Lỗi", "Không thể xác định thông tin người dùng");
      return;
    }

    if (!formData.businessName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên doanh nghiệp");
      return;
    }

    const result = await createProfile({
      userId: user.id,
      businessName: formData.businessName,
      businessAddress: formData.businessAddress,
      businessRegistrationNumber: formData.businessRegistrationNumber,
    });

    if (result) {
      setVenueOwner(result);
      setLocationOwnerId(result.locationOwnerId);
      setShowCreateModal(false);
      Alert.alert("Thành công", "Tạo hồ sơ venue owner thành công!");

      // If ID is 0 (temporary), try to fetch the real profile
      if (result.locationOwnerId === 0) {
        setTimeout(() => {
          checkExistingProfile();
        }, 1000);
      }
    } else if (error) {
      Alert.alert("Lỗi", error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!locationOwnerId) {
      Alert.alert("Lỗi", "Không thể xác định hồ sơ cần cập nhật");
      return;
    }

    const result = await updateProfile(locationOwnerId, {
      businessName: formData.businessName || undefined,
      businessAddress: formData.businessAddress || undefined,
      businessRegistrationNumber:
        formData.businessRegistrationNumber || undefined,
    });

    if (result) {
      setVenueOwner(result);
      setShowEditModal(false);
      Alert.alert("Thành công", "Cập nhật hồ sơ thành công");
    } else if (error) {
      Alert.alert("Lỗi", error);
    }
  };

  const handleLogout = () => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất không?", [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoggingOut(true);

            await logout();

            // Reset navigation stack về Login
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }], // nhớ đổi nếu Login có tên route khác
            });
          } catch (error) {
            console.error("❌ Logout error:", error);

            Alert.alert(
              "Lỗi đăng xuất",
              "Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.",
              [{ text: "OK" }]
            );
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
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

  const resetForm = () => {
    setFormData({
      businessName: "",
      businessAddress: "",
      businessRegistrationNumber: "",
    });
  };

  useEffect(() => {
    checkExistingProfile();
  }, [user?.id]);

  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [showEditModal, showCreateModal]);

  const verificationStatus = venueOwner
    ? getVerificationStatusColor(venueOwner.verificationStatus || "")
    : null;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 80 }}
      >
        {/* Header */}
        <View className="bg-white px-4 py-6">
          <Text className="text-2xl font-bold text-gray-900">
            Hồ sơ Venue Owner
          </Text>
          <Text className="text-gray-600 mt-1">
            Quản lý thông tin venue owner
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
                    <View className="bg-gray-200 h-4 w-20 rounded animate-pulse" />
                    <View className="bg-gray-200 h-6 w-full rounded animate-pulse" />
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
                  disabled={loading}
                >
                  <Text className="text-white font-semibold text-center">
                    Chỉnh sửa thông tin
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="items-center py-8">
                <Ionicons name="business-outline" size={48} color="#6B7280" />
                <Text className="text-gray-500 mt-2 text-center">
                  Chưa có hồ sơ venue owner
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    resetForm();
                    setShowCreateModal(true);
                  }}
                  className="bg-blue-500 py-3 px-6 rounded-lg mt-4"
                  disabled={loading}
                >
                  <Text className="text-white font-semibold">
                    Tạo hồ sơ venue owner
                  </Text>
                </TouchableOpacity>
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
                <View className="bg-green-100 p-3 rounded-full mr-4">
                  <Ionicons
                    name="storefront-outline"
                    size={20}
                    color="#10B981"
                  />
                </View>
                <Text className="text-gray-900 font-medium">
                  Quản lý venues
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

      {/* Create Profile Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text className="text-gray-500 font-medium">Hủy</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold">Tạo hồ sơ Venue Owner</Text>
            <TouchableOpacity onPress={handleCreateProfile} disabled={loading}>
              <Text
                className={`font-medium ${
                  loading ? "text-gray-400" : "text-blue-500"
                }`}
              >
                {loading ? "Đang tạo..." : "Tạo"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-6">
            <View className="space-y-6">
              <View>
                <Text className="text-gray-900 font-medium mb-2">
                  Tên doanh nghiệp *
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
                    Hồ sơ venue owner cho phép bạn tạo và quản lý các địa điểm
                    cho thuê chụp ảnh. Thông tin này sẽ được sử dụng để xác minh
                    tài khoản của bạn.
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text className="text-gray-500 font-medium">Hủy</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold">Chỉnh sửa hồ sơ</Text>
            <TouchableOpacity onPress={handleUpdateProfile} disabled={loading}>
              <Text
                className={`font-medium ${
                  loading ? "text-gray-400" : "text-blue-500"
                }`}
              >
                {loading ? "Đang lưu..." : "Lưu"}
              </Text>
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
