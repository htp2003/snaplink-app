// screens/venueOwner/VenueOwnerProfileScreen.tsx - BEAUTIFUL REDESIGN
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
  Image,
  Dimensions,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { useVenueOwnerProfile } from "../../hooks/useVenueOwnerProfile";
import { LocationOwner } from "../../types/venueOwner";

const { width: screenWidth } = Dimensions.get("window");

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
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          } catch (error) {
            console.error("⚠ Logout error:", error);
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
        return {
          color: "#10B981",
          bg: "#ECFDF5",
          text: "Đã xác minh",
          icon: "checkmark-circle",
        };
      case "pending":
        return {
          color: "#F59E0B",
          bg: "#FFFBEB",
          text: "Đang chờ xác minh",
          icon: "time",
        };
      case "rejected":
        return {
          color: "#EF4444",
          bg: "#FEF2F2",
          text: "Bị từ chối",
          icon: "close-circle",
        };
      default:
        return {
          color: "#6B7280",
          bg: "#F9FAFB",
          text: "Chưa xác minh",
          icon: "alert-circle",
        };
    }
  };

  const resetForm = () => {
    setFormData({
      businessName: "",
      businessAddress: "",
      businessRegistrationNumber: "",
    });
  };

  // Avatar component with test image fallback
  const ProfileAvatar = () => {
    // Debug log to check user object structure
    console.log("🔍 User object for avatar:", user);
    console.log("🔍 Profile image:", user?.profileImage);

    // Temporary test with fixed image URL
    const testImageUrl = "https://picsum.photos/200/300";
    const imageUrl = user?.profileImage || testImageUrl;
    const initials =
      user?.fullName
        ?.split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "VO";

    return (
      <View className="relative">
        <View className="w-20 h-20 rounded-full border-2 border-white overflow-hidden">
          <Image
            source={{ uri: imageUrl }}
            className="w-full h-full"
            resizeMode="cover"
            onError={(error) => {
              console.log("❌ Image load error:", error);
              console.log("❌ Failed URL:", imageUrl);
            }}
            onLoad={() =>
              console.log("✅ Image loaded successfully:", imageUrl)
            }
          />
        </View>
        {/* Simple online dot */}
        <View className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
      </View>
    );
  };

  const InfoRow = ({
    icon,
    label,
    value,
    iconColor,
    iconBg,
  }: {
    icon: string;
    label: string;
    value: string;
    iconColor: string;
    iconBg: string;
  }) => (
    <View className="flex-row items-center py-4">
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: iconBg }}
      >
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-gray-500 text-sm">{label}</Text>
        <Text className="text-gray-900 font-medium mt-1">{value}</Text>
      </View>
    </View>
  );

  const ActionCard = ({
    icon,
    title,
    subtitle,
    onPress,
    color = "#6B7280",
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
    color?: string;
  }) => (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-xl p-4 flex-row items-center border border-gray-100 mb-3"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
      }}
    >
      <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center mr-4">
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View className="flex-1">
        <Text className="text-gray-900 font-medium">{title}</Text>
        {subtitle && (
          <Text className="text-gray-500 text-sm mt-1">{subtitle}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
    </TouchableOpacity>
  );

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
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaView className="flex-1 bg-gray-50">
        {/* Simple header */}
        <View className="bg-white px-6 py-4 border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xl font-bold text-gray-900">
                Hồ sơ của tôi
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                Quản lý thông tin venue owner
              </Text>
            </View>
            {/* <TouchableOpacity
              onPress={() =>
                Alert.alert("Thông báo", "Tính năng sẽ được cập nhật sớm")
              }
              className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center"
            >
              <Ionicons name="settings-outline" size={20} color="#6B7280" />
            </TouchableOpacity> */}
          </View>
        </View>

        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Profile section */}
          <View className="bg-white mx-4 mt-4 rounded-xl p-6 border border-gray-100">
            <View className="items-center">
              <ProfileAvatar />
              <Text className="text-xl font-bold text-gray-900 mt-3">
                {user?.fullName || "Venue Owner"}
              </Text>
              <Text className="text-gray-500 mt-1">{user?.email}</Text>

              {verificationStatus && (
                <View
                  className="flex-row items-center px-3 py-1 rounded-full mt-3"
                  style={{ backgroundColor: verificationStatus.bg }}
                >
                  <Ionicons
                    name={verificationStatus.icon as any}
                    size={14}
                    color={verificationStatus.color}
                    className="mr-1"
                  />
                  <Text
                    className="text-xs font-medium"
                    style={{ color: verificationStatus.color }}
                  >
                    {verificationStatus.text}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Business Info */}
          <View className="mx-4 mt-4">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              Thông tin doanh nghiệp
            </Text>

            {loading ? (
              <View className="bg-white rounded-xl p-6 border border-gray-100">
                <View className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <View key={i} className="flex-row items-center">
                      <View className="w-10 h-10 bg-gray-200 rounded-full mr-3" />
                      <View className="flex-1 space-y-2">
                        <View className="bg-gray-200 h-3 w-20 rounded" />
                        <View className="bg-gray-200 h-4 w-full rounded" />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : venueOwner ? (
              <View className="bg-white rounded-xl p-4 border border-gray-100">
                <InfoRow
                  icon="business"
                  label="Tên doanh nghiệp"
                  value={venueOwner.businessName || "Chưa cập nhật"}
                  iconColor="#3B82F6"
                  iconBg="#EFF6FF"
                />
                <View className="h-px bg-gray-100 ml-13" />
                <InfoRow
                  icon="location"
                  label="Địa chỉ doanh nghiệp"
                  value={venueOwner.businessAddress || "Chưa cập nhật"}
                  iconColor="#10B981"
                  iconBg="#ECFDF5"
                />
                <View className="h-px bg-gray-100 ml-13" />
                <InfoRow
                  icon="document-text"
                  label="Số đăng ký kinh doanh"
                  value={
                    venueOwner.businessRegistrationNumber || "Chưa cập nhật"
                  }
                  iconColor="#8B5CF6"
                  iconBg="#F3E8FF"
                />

                <TouchableOpacity
                  onPress={() => setShowEditModal(true)}
                  disabled={loading}
                  className="bg-blue-600 py-3 rounded-lg mt-4"
                >
                  <Text className="text-white font-medium text-center">
                    Chỉnh sửa thông tin
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="bg-white rounded-xl p-8 border border-gray-100 items-center">
                <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
                  <Ionicons name="business-outline" size={32} color="#6B7280" />
                </View>
                <Text className="text-gray-900 font-semibold text-lg text-center mb-2">
                  Chưa có hồ sơ venue owner
                </Text>
                <Text className="text-gray-500 text-center text-sm mb-6">
                  Tạo hồ sơ để bắt đầu quản lý địa điểm của bạn
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    resetForm();
                    setShowCreateModal(true);
                  }}
                  disabled={loading}
                  className="bg-blue-600 py-3 px-6 rounded-lg"
                >
                  <Text className="text-white font-medium">
                    Tạo hồ sơ venue owner
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View className="mx-4 mt-6">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              Thao tác nhanh
            </Text>

            <ActionCard
              icon="card-outline"
              title="Quản lý gói đăng ký"
              subtitle="Xem và nâng cấp gói dịch vụ"
              onPress={() => navigation.navigate("VenueOwnerSubscription")}
              color="#10B981"
            />

            <ActionCard
              icon="log-out-outline"
              title="Đăng xuất"
              subtitle="Thoát khỏi tài khoản"
              onPress={handleLogout}
              color="#EF4444"
            />
          </View>
        </ScrollView>

        {/* Create Profile Modal */}
        <Modal
          visible={showCreateModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowCreateModal(false)}
        >
          <SafeAreaView className="flex-1 bg-white">
            <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-100">
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text className="text-gray-500 font-medium">Hủy</Text>
              </TouchableOpacity>
              <Text className="text-lg font-bold">Tạo hồ sơ</Text>
              <TouchableOpacity
                onPress={handleCreateProfile}
                disabled={loading}
              >
                <Text
                  className={`font-medium ${loading ? "text-gray-400" : "text-blue-600"
                    }`}
                >
                  {loading ? "Đang tạo..." : "Tạo"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6 py-6">
              <Text className="text-xl font-bold text-gray-900 mb-6">
                Thông tin doanh nghiệp
              </Text>

              <View className="space-y-4">
                <View>
                  <Text className="text-gray-900 font-medium mb-2">
                    Tên doanh nghiệp <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={formData.businessName}
                    onChangeText={(text) =>
                      setFormData({ ...formData, businessName: text })
                    }
                    placeholder="Nhập tên doanh nghiệp"
                    className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
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
                    className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                    style={{ textAlignVertical: "top" }}
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
                    className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  />
                </View>

                <View className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                  <View className="flex-row items-start">
                    <Ionicons
                      name="information-circle"
                      size={20}
                      color="#3B82F6"
                      className="mr-3 mt-1"
                    />
                    <Text className="text-blue-800 text-sm flex-1">
                      Hồ sơ venue owner cho phép bạn tạo và quản lý các địa điểm
                      cho thuê chụp ảnh. Thông tin này sẽ được sử dụng để xác
                      minh tài khoản của bạn.
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
            <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-100">
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Text className="text-gray-500 font-medium">Hủy</Text>
              </TouchableOpacity>
              <Text className="text-lg font-bold">Chỉnh sửa</Text>
              <TouchableOpacity
                onPress={handleUpdateProfile}
                disabled={loading}
              >
                <Text
                  className={`font-medium ${loading ? "text-gray-400" : "text-blue-600"
                    }`}
                >
                  {loading ? "Đang lưu..." : "Lưu"}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6 py-6">
              <Text className="text-xl font-bold text-gray-900 mb-6">
                Cập nhật thông tin
              </Text>

              <View className="space-y-4">
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
                    className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
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
                    className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                    style={{ textAlignVertical: "top" }}
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
                    className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
                  />
                </View>

                <View className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                  <View className="flex-row items-start">
                    <Ionicons
                      name="warning"
                      size={20}
                      color="#F59E0B"
                      className="mr-3 mt-1"
                    />
                    <Text className="text-yellow-800 text-sm flex-1">
                      Thông tin này sẽ được sử dụng để xác minh tài khoản của
                      bạn. Vui lòng cung cấp thông tin chính xác để tránh gián
                      đoạn dịch vụ.
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        {/* Loading Overlay */}
        {isLoggingOut && (
          <View className="absolute inset-0 bg-black/30 items-center justify-center">
            <View className="bg-white rounded-xl p-6 items-center">
              <View className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
              <Text className="text-gray-900 font-medium">
                Đang đăng xuất...
              </Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </>
  );
}
