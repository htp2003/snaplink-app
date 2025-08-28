import React, { useEffect, useState, useCallback } from "react";
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
  FlatList,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useVenueOwnerLocation } from "../../hooks/useVenueOwnerLocation";
import { useVenueOwnerProfile } from "../../hooks/useVenueOwnerProfile";
import { useAuth } from "../../hooks/useAuth";
import { useVenueOwnerLocationImages } from "../../hooks/useVenueOwnerLocationImages";
import { LocationPickerModal } from "../../components/venueOwner/LocationPickerModal";
import {
  VenueLocation,
  CreateLocationRequest,
  UpdateLocationRequest,
} from "../../types/venueLocation";

const { width: screenWidth } = Dimensions.get("window");

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
    refreshLocations,
  } = useVenueOwnerLocation();

  const [locationOwnerId, setLocationOwnerId] = useState<number | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<VenueLocation | null>(null);
  const [editingLocation, setEditingLocation] = useState<VenueLocation | null>(
    null
  );
  const [forceRefreshKey, setForceRefreshKey] = useState(0);

  // Image hook for selected location
  const {
    images: locationImages,
    primaryImage,
    loading: imageLoading,
    uploadImage,
    uploadMultipleImages,
    fetchImages,
    setPrimaryImage,
    deleteImage,
    clearError: clearImageError,
  } = useVenueOwnerLocationImages(selectedLocation?.locationId || 0);

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
    // New location fields
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    placeName: "",
    placeId: "",
  });

  // Filter locations by actual locationOwnerId from profile
  const myLocations = locationOwnerId
    ? locations.filter(
        (location) => location.locationOwnerId === locationOwnerId
      )
    : [];

  // Get venue owner profile to extract locationOwnerId
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
      console.error("Error getting venue owner profile:", error);
      setLocationOwnerId(null);
    } finally {
      setProfileLoading(false);
    }
  }, [user?.id, getProfileByUserId]);

  useFocusEffect(
    useCallback(() => {
      console.log("Screen focused, checking venue owner profile...");
      fetchVenueOwnerProfile();
    }, [fetchVenueOwnerProfile])
  );

  useEffect(() => {
    if (!profileLoading && locationOwnerId) {
      console.log("Loading locations for owner ID:", locationOwnerId);
      getAllLocations();
    }
  }, [profileLoading, locationOwnerId, forceRefreshKey]);

  const onRefresh = async () => {
    console.log("Manual refresh triggered");
    await Promise.all([fetchVenueOwnerProfile(), refreshLocations()]);
  };

  const forceRefresh = useCallback(async () => {
    console.log("Force refresh triggered");
    setForceRefreshKey((prev) => prev + 1);
    await fetchVenueOwnerProfile();
  }, [fetchVenueOwnerProfile]);

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
      latitude: undefined,
      longitude: undefined,
      placeName: "",
      placeId: "",
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
      latitude: location.latitude,
      longitude: location.longitude,
      placeName: location.name || "",
      placeId: location.externalPlaceId || "",
    });
    setEditingLocation(location);
    setShowCreateModal(true);
  };

  const openImageModal = (location: VenueLocation) => {
    setSelectedLocation(location);
    setShowImageModal(true);
    clearImageError();
  };

  // Handle location selection from picker
  const handleLocationSelected = (locationData: {
    latitude?: number;
    longitude?: number;
    address?: string;
    placeName?: string;
    placeId?: string;
  }) => {
    setFormData((prev) => ({
      ...prev,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      placeName: locationData.placeName || "",
      placeId: locationData.placeId || "",
      // Update address if selected from place
      address:
        locationData.address && locationData.placeName !== "Vị trí hiện tại"
          ? locationData.address
          : prev.address,
    }));
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
          latitude: formData.latitude,
          longitude: formData.longitude,
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
          latitude: formData.latitude,
          longitude: formData.longitude,
          // Note: externalPlaceId is not in CreateLocationRequest interface but can be added if needed
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

  const handlePickImages = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert("Lỗi", "Cần quyền truy cập thư viện ảnh để upload hình");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        aspect: [16, 9],
      });

      if (!result.canceled && result.assets) {
        const imageUris = result.assets.map((asset) => asset.uri);

        if (imageUris.length > 0) {
          try {
            await uploadMultipleImages(imageUris, 0);
            Alert.alert("Thành công", `Đã upload ${imageUris.length} hình ảnh`);
          } catch (error) {
            Alert.alert("Lỗi", "Có lỗi xảy ra khi upload hình ảnh");
          }
        }
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi chọn hình ảnh");
    }
  };

  const handleSetPrimaryImage = async (imageId: number) => {
    try {
      const success = await setPrimaryImage(imageId);
      if (success) {
        Alert.alert("Thành công", "Đã đặt làm hình ảnh chính");
      } else {
        Alert.alert("Lỗi", "Không thể đặt làm hình ảnh chính");
      }
    } catch (error) {
      Alert.alert("Lỗi", "Có lỗi xảy ra");
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    Alert.alert("Xác nhận xóa", "Bạn có chắc muốn xóa hình ảnh này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            const success = await deleteImage(imageId);
            if (success) {
              Alert.alert("Thành công", "Đã xóa hình ảnh");
            } else {
              Alert.alert("Lỗi", "Không thể xóa hình ảnh");
            }
          } catch (error) {
            Alert.alert("Lỗi", "Có lỗi xảy ra khi xóa hình ảnh");
          }
        },
      },
    ]);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Get thumbnail image for a location
  const getLocationThumbnail = (location: VenueLocation) => {
    if (location.images && location.images.length > 0) {
      const primaryImage = location.images.find((img) => img.isPrimary);
      return primaryImage?.url || location.images[0].url;
    }
    return null;
  };

  // Get location display text
  const getLocationDisplayText = () => {
    if (formData.placeName && formData.placeName !== "Vị trí hiện tại") {
      return formData.placeName;
    }
    if (formData.latitude && formData.longitude) {
      return `${formData.latitude.toFixed(6)}, ${formData.longitude.toFixed(
        6
      )}`;
    }
    return "Chọn vị trí địa điểm";
  };

  // Loading State
  if (profileLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-white p-8 rounded-2xl shadow-sm">
            <View className="items-center">
              <View className="w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="business" size={32} color="#3B82F6" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Đang tải hồ sơ...
              </Text>
              <Text className="text-gray-600 text-center">
                Vui lòng chờ trong giây lát
              </Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // No User State
  if (!user?.id) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-4">
          <Text className="text-lg text-gray-600">Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // No Venue Owner Profile State
  if (!locationOwnerId) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-white p-8 rounded-3xl shadow-lg max-w-sm w-full">
            <View className="items-center">
              <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-6">
                <Ionicons name="business" size={40} color="#3B82F6" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">
                Tạo hồ sơ Venue Owner
              </Text>
              <Text className="text-gray-600 text-center mb-6 leading-relaxed">
                Bạn cần tạo hồ sơ venue owner trước khi có thể quản lý địa điểm
                cho thuê
              </Text>
              <TouchableOpacity
                onPress={forceRefresh}
                className="bg-blue-500 px-8 py-4 rounded-2xl flex-row items-center shadow-md"
              >
                <Ionicons name="refresh" size={20} color="white" />
                <Text className="text-white font-semibold ml-2 text-base">
                  Kiểm tra lại
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Error State
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-white p-8 rounded-3xl shadow-lg max-w-sm w-full">
            <View className="items-center">
              <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-6">
                <Ionicons name="warning" size={40} color="#EF4444" />
              </View>
              <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">
                Có lỗi xảy ra
              </Text>
              <Text className="text-gray-600 text-center mb-6 leading-relaxed">
                {error}
              </Text>
              <TouchableOpacity
                onPress={onRefresh}
                className="bg-red-500 px-8 py-4 rounded-2xl shadow-md"
              >
                <Text className="text-white font-semibold text-base">
                  Thử lại
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Main UI
  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="bg-white px-6 py-8 border-b border-gray-100">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="text-3xl font-bold text-gray-900 mb-2">
                Địa điểm của tôi
              </Text>
              <Text className="text-gray-600 text-base">
                {myLocations.length} địa điểm • Quản lý dễ dàng
              </Text>
            </View>
            <TouchableOpacity
              onPress={openCreateModal}
              className="bg-blue-500 p-4 rounded-2xl shadow-md"
              style={{
                shadowColor: "#3B82F6",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
              }}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <View className="px-4 mt-6">
          {loading ? (
            // Loading Skeleton
            <View className="space-y-4">
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  className="bg-white rounded-2xl shadow-sm p-4 overflow-hidden"
                >
                  <View className="flex-row space-x-4">
                    <View className="w-24 h-24 bg-gray-200 rounded-xl animate-pulse" />
                    <View className="flex-1 space-y-3">
                      <View className="bg-gray-200 h-5 w-32 rounded animate-pulse" />
                      <View className="bg-gray-200 h-4 w-24 rounded animate-pulse" />
                      <View className="bg-gray-200 h-4 w-20 rounded animate-pulse" />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ) : myLocations.length > 0 ? (
            // Locations List
            <View className="space-y-4 mb-6">
              {myLocations.map((location, index) => {
                const thumbnail = getLocationThumbnail(location);
                return (
                  <View
                    key={location.locationId}
                    className="bg-white rounded-2xl shadow-md overflow-hidden"
                    style={{
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.1,
                      shadowRadius: 8,
                      elevation: 5,
                    }}
                  >
                    <View className="flex-row">
                      {/* Thumbnail */}
                      <TouchableOpacity
                        className="w-32 h-32"
                        onPress={() => openImageModal(location)}
                      >
                        {thumbnail ? (
                          <Image
                            source={{ uri: thumbnail }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 items-center justify-center">
                            <Ionicons name="camera" size={32} color="#9CA3AF" />
                            <Text className="text-xs text-gray-500 mt-2 px-2 text-center">
                              Thêm ảnh
                            </Text>
                          </View>
                        )}

                        {/* Image count overlay */}
                        {location.images && location.images.length > 0 && (
                          <View className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded-full">
                            <Text className="text-white text-xs font-medium">
                              {location.images.length}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      {/* Content */}
                      <View className="flex-1 p-4">
                        <View className="flex-row justify-between items-start mb-3">
                          <Text
                            className="text-lg font-bold text-gray-900 flex-1 mr-2"
                            numberOfLines={2}
                          >
                            {location.name}
                          </Text>

                          {/* Status Badge */}
                          <View
                            className={`px-2 py-1 rounded-full ${
                              location.availabilityStatus === "Available"
                                ? "bg-green-100"
                                : location.availabilityStatus === "Unavailable"
                                ? "bg-red-100"
                                : "bg-yellow-100"
                            }`}
                          >
                            <Text
                              className={`text-xs font-medium ${
                                location.availabilityStatus === "Available"
                                  ? "text-green-800"
                                  : location.availabilityStatus ===
                                    "Unavailable"
                                  ? "text-red-800"
                                  : "text-yellow-800"
                              }`}
                            >
                              {location.availabilityStatus === "Available"
                                ? "Sẵn sàng"
                                : location.availabilityStatus === "Unavailable"
                                ? "Không khả dụng"
                                : "Chờ xử lý"}
                            </Text>
                          </View>
                        </View>

                        {/* Address */}
                        <View className="flex-row items-start mb-3">
                          <Ionicons
                            name="location-outline"
                            size={16}
                            color="#6B7280"
                          />
                          <Text
                            className="text-gray-600 text-sm ml-1 flex-1"
                            numberOfLines={2}
                          >
                            {location.address}
                          </Text>
                        </View>

                        {/* Features */}
                        <View className="flex-row items-center mb-3">
                          {location.indoor && (
                            <View className="bg-blue-50 px-2 py-1 rounded-full mr-2">
                              <Text className="text-blue-700 text-xs font-medium">
                                Indoor
                              </Text>
                            </View>
                          )}
                          {location.outdoor && (
                            <View className="bg-amber-50 px-2 py-1 rounded-full mr-2">
                              <Text className="text-amber-700 text-xs font-medium">
                                Outdoor
                              </Text>
                            </View>
                          )}
                          {location.capacity && (
                            <View className="bg-gray-50 px-2 py-1 rounded-full">
                              <Text className="text-gray-700 text-xs font-medium">
                                {location.capacity} người
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Price and Actions */}
                        <View className="flex-row justify-between items-center">
                          <Text className="text-blue-600 font-bold text-base">
                            {location.hourlyRate
                              ? formatCurrency(location.hourlyRate) + "/giờ"
                              : "Chưa có giá"}
                          </Text>

                          <View className="flex-row space-x-1">
                            <TouchableOpacity
                              onPress={() => openImageModal(location)}
                              className="bg-gray-100 p-2 rounded-lg"
                            >
                              <Ionicons
                                name="image-outline"
                                size={16}
                                color="#6B7280"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => openEditModal(location)}
                              className="bg-blue-100 p-2 rounded-lg"
                            >
                              <Ionicons
                                name="pencil-outline"
                                size={16}
                                color="#3B82F6"
                              />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDelete(location)}
                              className="bg-red-100 p-2 rounded-lg"
                            >
                              <Ionicons
                                name="trash-outline"
                                size={16}
                                color="#EF4444"
                              />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            // Empty State
            <View className="bg-white p-8 rounded-2xl shadow-sm">
              <View className="items-center">
                <View className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full items-center justify-center mb-6">
                  <Ionicons name="business" size={48} color="#3B82F6" />
                </View>
                <Text className="text-2xl font-bold text-gray-900 mb-3">
                  Chưa có địa điểm nào
                </Text>
                <Text className="text-gray-600 text-center mb-6 leading-relaxed">
                  Thêm địa điểm đầu tiên để bắt đầu kinh doanh cho thuê không
                  gian
                </Text>
                <TouchableOpacity
                  onPress={openCreateModal}
                  className="bg-blue-500 px-8 py-4 rounded-2xl flex-row items-center shadow-md"
                >
                  <Ionicons name="add" size={20} color="white" />
                  <Text className="text-white font-semibold ml-2 text-base">
                    Thêm địa điểm
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create/Edit Location Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Modal Header */}
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text className="text-blue-600 font-semibold text-base">Hủy</Text>
            </TouchableOpacity>
            <Text className="text-xl font-bold text-gray-900">
              {editingLocation ? "Chỉnh sửa địa điểm" : "Thêm địa điểm"}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text className="text-blue-600 font-semibold text-base">Lưu</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1 px-6 py-4"
            showsVerticalScrollIndicator={false}
          >
            <View className="space-y-6">
              {/* Basic Information */}
              <View className="bg-gray-50 p-4 rounded-2xl">
                <Text className="text-lg font-bold text-gray-900 mb-4">
                  Thông tin cơ bản
                </Text>

                <View className="space-y-4">
                  <View>
                    <Text className="text-gray-900 font-semibold mb-2">
                      Tên địa điểm *
                    </Text>
                    <TextInput
                      value={formData.name}
                      onChangeText={(text) =>
                        setFormData({ ...formData, name: text })
                      }
                      placeholder="VD: Studio chụp ảnh vintage"
                      className="bg-white border border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-base"
                      style={{ fontSize: 16 }}
                    />
                  </View>

                  <View>
                    <Text className="text-gray-900 font-semibold mb-2">
                      Địa chỉ *
                    </Text>
                    <TextInput
                      value={formData.address}
                      onChangeText={(text) =>
                        setFormData({ ...formData, address: text })
                      }
                      placeholder="Nhập địa chỉ đầy đủ"
                      multiline
                      numberOfLines={3}
                      className="bg-white border border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-base"
                      style={{ fontSize: 16, textAlignVertical: "top" }}
                    />
                  </View>

                  <View>
                    <Text className="text-gray-900 font-semibold mb-2">
                      Mô tả
                    </Text>
                    <TextInput
                      value={formData.description}
                      onChangeText={(text) =>
                        setFormData({ ...formData, description: text })
                      }
                      placeholder="Mô tả về địa điểm, phong cách, đặc điểm nổi bật..."
                      multiline
                      numberOfLines={4}
                      className="bg-white border border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-base"
                      style={{ fontSize: 16, textAlignVertical: "top" }}
                    />
                  </View>
                </View>
              </View>

              {/* Location Section */}
              <View className="bg-gray-50 p-4 rounded-2xl">
                <Text className="text-lg font-bold text-gray-900 mb-4">
                  Vị trí địa điểm
                </Text>

                <TouchableOpacity
                  onPress={() => setShowLocationPicker(true)}
                  className="bg-white border border-gray-200 rounded-xl p-4 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center flex-1">
                    <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="location" size={20} color="#3B82F6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-gray-900 font-medium text-base">
                        {getLocationDisplayText()}
                      </Text>
                      {formData.latitude && formData.longitude && (
                        <Text className="text-gray-500 text-sm mt-1">
                          Lat: {formData.latitude.toFixed(6)}, Lng:{" "}
                          {formData.longitude.toFixed(6)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>

              {/* Details */}
              <View className="bg-gray-50 p-4 rounded-2xl">
                <Text className="text-lg font-bold text-gray-900 mb-4">
                  Chi tiết
                </Text>

                <View className="space-y-4">
                  <View>
                    <Text className="text-gray-900 font-semibold mb-2">
                      Tiện ích
                    </Text>
                    <TextInput
                      value={formData.amenities}
                      onChangeText={(text) =>
                        setFormData({ ...formData, amenities: text })
                      }
                      placeholder="WiFi, Parking, Ánh sáng tự nhiên, Điều hòa..."
                      className="bg-white border border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-base"
                      style={{ fontSize: 16 }}
                    />
                  </View>

                  <View className="flex-row space-x-3">
                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold mb-2">
                        Giá thuê/giờ (VNĐ)
                      </Text>
                      <TextInput
                        value={formData.hourlyRate}
                        onChangeText={(text) =>
                          setFormData({ ...formData, hourlyRate: text })
                        }
                        placeholder="100000"
                        keyboardType="numeric"
                        className="bg-white border border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-base"
                        style={{ fontSize: 16 }}
                      />
                    </View>

                    <View className="flex-1">
                      <Text className="text-gray-900 font-semibold mb-2">
                        Sức chứa (người)
                      </Text>
                      <TextInput
                        value={formData.capacity}
                        onChangeText={(text) =>
                          setFormData({ ...formData, capacity: text })
                        }
                        placeholder="10"
                        keyboardType="numeric"
                        className="bg-white border border-gray-200 rounded-xl px-4 py-4 text-gray-900 text-base"
                        style={{ fontSize: 16 }}
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Space Type */}
              <View className="bg-gray-50 p-4 rounded-2xl">
                <Text className="text-lg font-bold text-gray-900 mb-4">
                  Loại không gian
                </Text>
                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    onPress={() =>
                      setFormData({ ...formData, indoor: !formData.indoor })
                    }
                    className={`flex-1 p-6 rounded-2xl border-2 ${
                      formData.indoor
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <View className="items-center">
                      <View
                        className={`w-12 h-12 rounded-2xl items-center justify-center mb-3 ${
                          formData.indoor ? "bg-blue-500" : "bg-gray-200"
                        }`}
                      >
                        <Ionicons
                          name="home"
                          size={24}
                          color={formData.indoor ? "white" : "#6B7280"}
                        />
                      </View>
                      <Text
                        className={`font-semibold text-base ${
                          formData.indoor ? "text-blue-600" : "text-gray-600"
                        }`}
                      >
                        Indoor
                      </Text>
                      <Text
                        className={`text-sm text-center mt-1 ${
                          formData.indoor ? "text-blue-500" : "text-gray-500"
                        }`}
                      >
                        Trong nhà
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      setFormData({ ...formData, outdoor: !formData.outdoor })
                    }
                    className={`flex-1 p-6 rounded-2xl border-2 ${
                      formData.outdoor
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <View className="items-center">
                      <View
                        className={`w-12 h-12 rounded-2xl items-center justify-center mb-3 ${
                          formData.outdoor ? "bg-amber-500" : "bg-gray-200"
                        }`}
                      >
                        <Ionicons
                          name="sunny"
                          size={24}
                          color={formData.outdoor ? "white" : "#6B7280"}
                        />
                      </View>
                      <Text
                        className={`font-semibold text-base ${
                          formData.outdoor ? "text-amber-600" : "text-gray-600"
                        }`}
                      >
                        Outdoor
                      </Text>
                      <Text
                        className={`text-sm text-center mt-1 ${
                          formData.outdoor ? "text-amber-500" : "text-gray-500"
                        }`}
                      >
                        Ngoài trời
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Notice */}
              <View className="bg-blue-50 p-4 rounded-2xl border border-blue-200">
                <View className="flex-row items-start">
                  <View className="w-8 h-8 bg-blue-500 rounded-full items-center justify-center mr-3 mt-0.5">
                    <Ionicons name="information" size={16} color="white" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-blue-900 font-semibold mb-1">
                      Lưu ý quan trọng
                    </Text>
                    <Text className="text-blue-800 text-sm leading-relaxed">
                      Địa điểm sẽ cần được xác minh trước khi có thể nhận
                      booking từ khách hàng. Quá trình này thường mất 1-2 ngày
                      làm việc.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                className="bg-blue-500 py-4 rounded-2xl shadow-md mt-4"
              >
                <Text className="text-white font-bold text-center text-lg">
                  {editingLocation ? "Cập nhật địa điểm" : "Tạo địa điểm"}
                </Text>
              </TouchableOpacity>

              <View className="pb-6" />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Location Picker Modal */}
      <LocationPickerModal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelected={handleLocationSelected}
      />

      {/* Image Management Modal */}
      <Modal
        visible={showImageModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Modal Header */}
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowImageModal(false)}>
              <Text className="text-blue-600 font-semibold text-base">
                Đóng
              </Text>
            </TouchableOpacity>
            <View className="items-center">
              <Text className="text-lg font-bold text-gray-900">
                Quản lý hình ảnh
              </Text>
              <Text className="text-sm text-gray-600" numberOfLines={1}>
                {selectedLocation?.name}
              </Text>
            </View>
            <TouchableOpacity onPress={handlePickImages}>
              <View className="bg-blue-500 p-2 rounded-lg">
                <Ionicons name="add" size={20} color="white" />
              </View>
            </TouchableOpacity>
          </View>

          <View className="flex-1">
            {imageLoading ? (
              <View className="flex-1 justify-center items-center">
                <View className="bg-gray-100 p-6 rounded-2xl">
                  <Text className="text-gray-600 text-center">
                    Đang tải hình ảnh...
                  </Text>
                </View>
              </View>
            ) : locationImages.length > 0 ? (
              <FlatList
                data={locationImages}
                numColumns={2}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 16 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => (
                  <View className="flex-1 m-2">
                    <View
                      className="relative bg-white rounded-2xl shadow-md overflow-hidden"
                      style={{
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 4,
                      }}
                    >
                      <Image
                        source={{ uri: item.url }}
                        className="w-full h-40"
                        resizeMode="cover"
                      />

                      {/* Primary badge */}
                      {item.isPrimary && (
                        <View className="absolute top-3 left-3 bg-green-500 px-3 py-1 rounded-full">
                          <Text className="text-white text-xs font-bold">
                            Ảnh chính
                          </Text>
                        </View>
                      )}

                      {/* Action buttons */}
                      <View className="absolute top-3 right-3 space-y-2">
                        {!item.isPrimary && (
                          <TouchableOpacity
                            onPress={() => handleSetPrimaryImage(item.id)}
                            className="bg-white/90 p-2 rounded-lg shadow-sm"
                          >
                            <Ionicons name="star" size={16} color="#F59E0B" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => handleDeleteImage(item.id)}
                          className="bg-white/90 p-2 rounded-lg shadow-sm"
                        >
                          <Ionicons name="trash" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>

                      {/* Bottom info */}
                      <View className="p-3">
                        {item.caption && (
                          <Text
                            className="text-sm text-gray-700 font-medium mb-1"
                            numberOfLines={2}
                          >
                            {item.caption}
                          </Text>
                        )}
                        <Text className="text-xs text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString(
                            "vi-VN",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              />
            ) : (
              <View className="flex-1 justify-center items-center px-8">
                <View className="bg-white p-8 rounded-3xl shadow-lg max-w-sm w-full">
                  <View className="items-center">
                    <View className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full items-center justify-center mb-6">
                      <Ionicons name="image" size={40} color="#9CA3AF" />
                    </View>
                    <Text className="text-2xl font-bold text-gray-900 mb-3 text-center">
                      Chưa có hình ảnh
                    </Text>
                    <Text className="text-gray-600 text-center mb-6 leading-relaxed">
                      Thêm hình ảnh để khách hàng có thể xem không gian của bạn
                    </Text>
                    <TouchableOpacity
                      onPress={handlePickImages}
                      className="bg-blue-500 px-8 py-4 rounded-2xl flex-row items-center shadow-md"
                    >
                      <Ionicons name="camera" size={20} color="white" />
                      <Text className="text-white font-semibold ml-2 text-base">
                        Thêm hình ảnh
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Add More Images Button */}
          {locationImages.length > 0 && (
            <View className="p-6 border-t border-gray-100 bg-gray-50">
              <TouchableOpacity
                onPress={handlePickImages}
                className="bg-blue-500 py-4 rounded-2xl flex-row items-center justify-center shadow-md"
              >
                <Ionicons name="add" size={20} color="white" />
                <Text className="text-white font-semibold ml-2 text-base">
                  Thêm hình ảnh khác
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
