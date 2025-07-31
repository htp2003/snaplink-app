// screens/venueOwner/VenueManagementScreen.tsx - Back to working version
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useVenueOwnerLocation } from "../../hooks/useVenueOwnerLocation";
import { useVenueOwnerProfile } from "../../hooks/useVenueOwnerProfile";
import { useAuth } from "../../hooks/useAuth";
import {
  VenueLocation,
  CreateLocationRequest,
  UpdateLocationRequest,
} from "../../types/venueLocation";

export default function VenueManagementScreen() {
  const { user } = useAuth();
  const { getProfileByUserId } = useVenueOwnerProfile();
  const {
    locations,
    loading,
    error,
    refreshing,
    getAllLocations,
    createLocation,
    updateLocation,
    deleteLocation,
    getPrimaryImage,
    refreshLocations,
  } = useVenueOwnerLocation();

  const [locationOwnerId, setLocationOwnerId] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<VenueLocation | null>(
    null
  );
  const [locationImages, setLocationImages] = useState<Record<number, string>>(
    {}
  );

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    description: "",
    amenities: "",
    hourlyRate: "",
    capacity: "",
    indoor: false,
    outdoor: false,
  });

  // Filter locations by actual locationOwnerId from profile
  const myLocations = locationOwnerId
    ? locations.filter(
        (location) => location.locationOwnerId === locationOwnerId
      )
    : [];

  const onRefresh = async () => {
    await refreshLocations();
  };

  const loadLocationImages = async () => {
    // TEMPORARILY DISABLED to stop API spam
    console.log("🖼️ Image loading disabled to prevent API spam");
    return;

    if (!myLocations.length) return;

    console.log("🖼️ Loading images for locations:", myLocations.length);

    const imagePromises = myLocations.map(async (location) => {
      try {
        const imageUrl = await getPrimaryImage(location.locationId);
        return { locationId: location.locationId, imageUrl: imageUrl || "" };
      } catch {
        return { locationId: location.locationId, imageUrl: "" };
      }
    });

    const images = await Promise.all(imagePromises);
    const imageMap = images.reduce((acc, { locationId, imageUrl }) => {
      acc[locationId] = imageUrl;
      return acc;
    }, {} as Record<number, string>);

    console.log("🖼️ Images loaded:", Object.keys(imageMap).length);
    setLocationImages(imageMap);
  };

  // Get venue owner profile to extract locationOwnerId
  useEffect(() => {
    const fetchVenueOwnerProfile = async () => {
      if (!user?.id) return;

      setProfileLoading(true);
      try {
        console.log("🔍 Getting venue owner profile for userId:", user.id);
        const profile = await getProfileByUserId(user.id);

        if (profile) {
          console.log("✅ Found venue owner profile:", profile);
          setLocationOwnerId(profile.locationOwnerId);
        } else {
          console.log("ℹ️ No venue owner profile found");
          setLocationOwnerId(null);
        }
      } catch (error) {
        console.error("❌ Error getting venue owner profile:", error);
        setLocationOwnerId(null);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchVenueOwnerProfile();
  }, [user?.id, getProfileByUserId]);

  // Load all locations after we have the profile
  useEffect(() => {
    if (!profileLoading) {
      console.log("📍 Loading all locations...");
      getAllLocations();
    }
  }, [profileLoading]); // Load locations after profile is loaded

  useEffect(() => {
    // TEMPORARILY DISABLED - Load images when myLocations changes
    // if (myLocations.length > 0) {
    //   loadLocationImages();
    // }
    console.log("📍 Locations updated:", myLocations.length);
  }, [myLocations.length]);

  const resetForm = () => {
    setFormData({
      name: "",
      address: "",
      description: "",
      amenities: "",
      hourlyRate: "",
      capacity: "",
      indoor: false,
      outdoor: false,
    });
    setEditingLocation(null);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (location: VenueLocation) => {
    setFormData({
      name: location.name || "",
      address: location.address || "",
      description: location.description || "",
      amenities: location.amenities || "",
      hourlyRate: location.hourlyRate?.toString() || "",
      capacity: location.capacity?.toString() || "",
      indoor: location.indoor || false,
      outdoor: location.outdoor || false,
    });
    setEditingLocation(location);
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.address.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên và địa chỉ địa điểm");
      return;
    }

    if (!locationOwnerId) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin venue owner");
      return;
    }

    try {
      if (editingLocation) {
        const updateData: UpdateLocationRequest = {
          name: formData.name,
          address: formData.address,
          description: formData.description || undefined,
          amenities: formData.amenities || undefined,
          hourlyRate: formData.hourlyRate
            ? parseFloat(formData.hourlyRate)
            : undefined,
          capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
          indoor: formData.indoor,
          outdoor: formData.outdoor,
        };

        const result = await updateLocation(
          editingLocation.locationId,
          updateData
        );
        if (result) {
          Alert.alert("Thành công", "Cập nhật địa điểm thành công");
        }
      } else {
        const createData: CreateLocationRequest = {
          locationOwnerId: locationOwnerId,
          name: formData.name,
          address: formData.address,
          description: formData.description || undefined,
          amenities: formData.amenities || undefined,
          hourlyRate: formData.hourlyRate
            ? parseFloat(formData.hourlyRate)
            : undefined,
          capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
          indoor: formData.indoor,
          outdoor: formData.outdoor,
          availabilityStatus: "Available",
          featuredStatus: false,
          verificationStatus: "pending",
          locationType: "Registered",
        };

        const result = await createLocation(createData);
        if (result) {
          Alert.alert("Thành công", "Tạo địa điểm thành công");
        }
      }

      setShowCreateModal(false);
      resetForm();
      await onRefresh();
    } catch (error) {
      Alert.alert("Lỗi", "Có lỗi xảy ra khi lưu địa điểm");
    }
  };

  const handleDelete = (location: VenueLocation) => {
    Alert.alert(
      "Xác nhận xóa",
      `Bạn có chắc muốn xóa địa điểm "${location.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const success = await deleteLocation(location.locationId);
              if (success) {
                Alert.alert("Thành công", "Xóa địa điểm thành công");
                await onRefresh();
              } else {
                Alert.alert("Lỗi", "Có lỗi xảy ra khi xóa địa điểm");
              }
            } catch (err) {
              Alert.alert("Lỗi", "Có lỗi xảy ra khi xóa địa điểm");
            }
          },
        },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Show loading state while getting profile
  if (profileLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-lg text-gray-600">
            Đang tải hồ sơ venue owner...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show proper state based on venue owner profile
  if (!user?.id) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-lg text-gray-600">Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!locationOwnerId) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="business-outline" size={64} color="#6B7280" />
          <Text className="text-xl font-semibold text-gray-900 mt-4 text-center">
            Cần tạo hồ sơ venue owner
          </Text>
          <Text className="text-gray-600 mt-2 text-center">
            Bạn cần tạo hồ sơ venue owner trước khi quản lý địa điểm
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-4">
          <Ionicons name="warning-outline" size={64} color="#EF4444" />
          <Text className="text-xl font-semibold text-gray-900 mt-4 text-center">
            Có lỗi xảy ra
          </Text>
          <Text className="text-gray-600 mt-2 text-center">{error}</Text>
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

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="bg-white px-4 py-6">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-2xl font-bold text-gray-900">
                Địa điểm của tôi
              </Text>
              <Text className="text-gray-600 mt-1">
                Quản lý địa điểm cho thuê ({myLocations.length} địa điểm)
              </Text>
            </View>
            <TouchableOpacity
              onPress={openCreateModal}
              className="bg-blue-500 p-3 rounded-full"
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-4 mt-4">
          {loading ? (
            <View className="space-y-4">
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 p-4"
                >
                  <View className="flex-row space-x-3">
                    <View className="w-20 h-20 bg-gray-200 rounded-lg" />
                    <View className="flex-1">
                      <View className="bg-gray-200 h-5 w-32 rounded mb-2" />
                      <View className="bg-gray-200 h-4 w-24 rounded mb-2" />
                      <View className="bg-gray-200 h-4 w-20 rounded" />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : myLocations.length > 0 ? (
            <View className="space-y-4 mb-6">
              {myLocations.map((location) => (
                <View
                  key={location.locationId}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden"
                >
                  <View className="flex-row">
                    <View className="w-24 h-24">
                      {locationImages[location.locationId] ? (
                        <Image
                          source={{ uri: locationImages[location.locationId] }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-full h-full bg-gray-200 items-center justify-center">
                          <Ionicons
                            name="image-outline"
                            size={24}
                            color="#9CA3AF"
                          />
                        </View>
                      )}
                    </View>

                    <View className="flex-1 p-4">
                      <View className="flex-row justify-between items-start mb-2">
                        <Text className="text-lg font-semibold text-gray-900 flex-1 mr-2">
                          {location.name}
                        </Text>
                        <View className="flex-row space-x-2">
                          <TouchableOpacity
                            onPress={() => openEditModal(location)}
                            className="p-2"
                          >
                            <Ionicons
                              name="pencil-outline"
                              size={16}
                              color="#6B7280"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleDelete(location)}
                            className="p-2"
                          >
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color="#EF4444"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text
                        className="text-gray-600 text-sm mb-2"
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
                        <View className="flex-row items-center">
                          <View
                            className={`w-2 h-2 rounded-full mr-2 ${
                              location.availabilityStatus === "Available"
                                ? "bg-green-500"
                                : location.availabilityStatus === "Unavailable"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                            }`}
                          />
                          <Text className="text-xs text-gray-500 capitalize">
                            {location.availabilityStatus}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
              <View className="items-center">
                <View className="bg-gray-100 p-4 rounded-full mb-4">
                  <Ionicons name="business-outline" size={32} color="#6B7280" />
                </View>
                <Text className="text-gray-900 font-medium mb-2">
                  Chưa có địa điểm nào
                </Text>
                <Text className="text-gray-500 text-center mb-4">
                  Thêm địa điểm đầu tiên để bắt đầu kinh doanh
                </Text>
                <TouchableOpacity
                  onPress={openCreateModal}
                  className="bg-blue-500 px-6 py-3 rounded-lg"
                >
                  <Text className="text-white font-semibold">
                    Thêm địa điểm
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-gray-200">
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text className="text-blue-500 font-medium">Hủy</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold">
              {editingLocation ? "Chỉnh sửa địa điểm" : "Thêm địa điểm"}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text className="text-blue-500 font-medium">Lưu</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-6">
            <View className="space-y-6">
              <View>
                <Text className="text-gray-900 font-medium mb-2">
                  Tên địa điểm *
                </Text>
                <TextInput
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Nhập tên địa điểm"
                  className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                />
              </View>

              <View>
                <Text className="text-gray-900 font-medium mb-2">
                  Địa chỉ *
                </Text>
                <TextInput
                  value={formData.address}
                  onChangeText={(text) =>
                    setFormData({ ...formData, address: text })
                  }
                  placeholder="Nhập địa chỉ"
                  multiline
                  numberOfLines={2}
                  className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                />
              </View>

              <View>
                <Text className="text-gray-900 font-medium mb-2">Mô tả</Text>
                <TextInput
                  value={formData.description}
                  onChangeText={(text) =>
                    setFormData({ ...formData, description: text })
                  }
                  placeholder="Mô tả về địa điểm"
                  multiline
                  numberOfLines={3}
                  className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                />
              </View>

              <View>
                <Text className="text-gray-900 font-medium mb-2">Tiện ích</Text>
                <TextInput
                  value={formData.amenities}
                  onChangeText={(text) =>
                    setFormData({ ...formData, amenities: text })
                  }
                  placeholder="WiFi, Parking, Ánh sáng tự nhiên..."
                  className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                />
              </View>

              <View className="flex-row space-x-4">
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium mb-2">
                    Giá thuê/giờ (VNĐ)
                  </Text>
                  <TextInput
                    value={formData.hourlyRate}
                    onChangeText={(text) =>
                      setFormData({ ...formData, hourlyRate: text })
                    }
                    placeholder="100000"
                    keyboardType="numeric"
                    className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                  />
                </View>

                <View className="flex-1">
                  <Text className="text-gray-900 font-medium mb-2">
                    Sức chứa (người)
                  </Text>
                  <TextInput
                    value={formData.capacity}
                    onChangeText={(text) =>
                      setFormData({ ...formData, capacity: text })
                    }
                    placeholder="10"
                    keyboardType="numeric"
                    className="border border-gray-300 rounded-lg px-3 py-3 text-gray-900"
                  />
                </View>
              </View>

              <View>
                <Text className="text-gray-900 font-medium mb-3">
                  Loại không gian
                </Text>
                <View className="flex-row space-x-4">
                  <TouchableOpacity
                    onPress={() =>
                      setFormData({ ...formData, indoor: !formData.indoor })
                    }
                    className={`flex-1 p-4 rounded-lg border-2 ${
                      formData.indoor
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300"
                    }`}
                  >
                    <View className="items-center">
                      <Ionicons
                        name="home-outline"
                        size={24}
                        color={formData.indoor ? "#3B82F6" : "#6B7280"}
                      />
                      <Text
                        className={`mt-2 font-medium ${
                          formData.indoor ? "text-blue-600" : "text-gray-600"
                        }`}
                      >
                        Indoor
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      setFormData({ ...formData, outdoor: !formData.outdoor })
                    }
                    className={`flex-1 p-4 rounded-lg border-2 ${
                      formData.outdoor
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300"
                    }`}
                  >
                    <View className="items-center">
                      <Ionicons
                        name="sunny-outline"
                        size={24}
                        color={formData.outdoor ? "#3B82F6" : "#6B7280"}
                      />
                      <Text
                        className={`mt-2 font-medium ${
                          formData.outdoor ? "text-blue-600" : "text-gray-600"
                        }`}
                      >
                        Outdoor
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="bg-yellow-50 p-4 rounded-lg">
                <View className="flex-row items-start">
                  <Ionicons
                    name="information-circle"
                    size={20}
                    color="#F59E0B"
                  />
                  <Text className="text-yellow-800 text-sm flex-1 ml-2">
                    Địa điểm sẽ cần được xác minh trước khi có thể nhận booking
                    từ khách hàng.
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
