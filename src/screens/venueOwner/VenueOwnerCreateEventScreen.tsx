// screens/venueOwner/VenueOwnerCreateEventScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
// THAY ĐỔI: Sử dụng thư viện mới
import DateTimePickerModal from "react-native-modal-datetime-picker";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useVenueOwnerEvent } from "../../hooks/useVenueOwnerEvent";
import { useVenueOwnerLocation } from "../../hooks/useVenueOwnerLocation";
import { venueOwnerImageService } from "../../services/venueOwnerImageService.ts";
import { venueOwnerProfileService } from "../../services/venueOwnerProfileService";
import { CreateEventRequest } from "../../types/VenueOwnerEvent";
import { VenueLocation } from "../../types/venueLocation";

interface FormData {
  locationId: number | null;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  discountedPrice: string;
  originalPrice: string;
  maxPhotographers: string;
  maxBookingsPerSlot: string;
}

interface ImageItem {
  uri: string;
  id: string;
  isPrimary: boolean;
}

const VenueOwnerCreateEventScreen = ({ navigation, route }: any) => {
  // Get locationId from navigation params if available
  const preselectedLocationId = route?.params?.locationId;

  // Hooks
  const { createEvent, loading: eventLoading } = useVenueOwnerEvent();
  const { getLocationsByOwnerId, loading: locationsLoading } =
    useVenueOwnerLocation();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    locationId: preselectedLocationId || null,
    name: "",
    description: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    discountedPrice: "",
    originalPrice: "",
    maxPhotographers: "5",
    maxBookingsPerSlot: "3",
  });

  // UI state - THAY ĐỔI: Sử dụng state cho modal picker
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isStartDatePickerVisible, setStartDatePickerVisibility] =
    useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisibility] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number | null>(
    null
  );
  const [uploading, setUploading] = useState(false);

  // Location state
  const [userLocations, setUserLocations] = useState<VenueLocation[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper function to get current user ID from JWT
  const getCurrentUserId = async (): Promise<number | null> => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.log("ℹ️ No token found");
        return null;
      }

      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const payload = parts[1];
      const paddedPayload =
        payload + "=".repeat((4 - (payload.length % 4)) % 4);
      const decodedPayload = atob(paddedPayload);
      const payloadObj = JSON.parse(decodedPayload);

      const userIdStr =
        payloadObj[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
        ];
      const userId = parseInt(userIdStr, 10);

      console.log("✅ Current user ID from JWT:", userId);
      return userId;
    } catch (error) {
      console.error("❌ Error extracting user ID from JWT:", error);
      return null;
    }
  };

  // Load user locations
  const loadUserLocations = async () => {
    try {
      console.log("🏗️ Loading user locations for create event...");

      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        console.error("❌ Could not get current user ID from JWT");
        Alert.alert("Lỗi", "Không thể xác thực người dùng");
        return;
      }

      console.log("👤 Current user ID:", currentUserId);

      const locationOwner =
        await venueOwnerProfileService.getLocationOwnerByUserId(currentUserId);

      if (!locationOwner) {
        console.log(
          "ℹ️ No LocationOwner record found for userId:",
          currentUserId
        );
        Alert.alert("Thông báo", "Bạn chưa đăng ký làm chủ địa điểm");
        return;
      }

      console.log("✅ LocationOwner found:", {
        locationOwnerId: locationOwner.locationOwnerId,
        userId: locationOwner.userId,
        businessName: locationOwner.businessName,
      });

      const locations = await getLocationsByOwnerId(
        locationOwner.locationOwnerId
      );
      console.log("✅ Locations loaded:", locations.length);
      setUserLocations(locations);

      if (preselectedLocationId && locations.length > 0) {
        const location = locations.find(
          (l) => l.locationId === preselectedLocationId
        );
        if (location) {
          setFormData((prev) => ({
            ...prev,
            locationId: preselectedLocationId,
          }));
          console.log("✅ Pre-selected location:", location.name);
        }
      }
    } catch (error) {
      console.error("❌ Error loading user locations:", error);
      Alert.alert("Lỗi", "Không thể tải danh sách địa điểm");
    }
  };

  useEffect(() => {
    loadUserLocations();
  }, []);

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.locationId) {
      newErrors.locationId = "Vui lòng chọn địa điểm";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Vui lòng nhập tên sự kiện";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Tên sự kiện phải có ít nhất 3 ký tự";
    } else if (formData.name.trim().length > 255) {
      newErrors.name = "Tên sự kiện không được quá 255 ký tự";
    }

    if (formData.description.trim().length > 1000) {
      newErrors.description = "Mô tả không được quá 1000 ký tự";
    }

    if (formData.startDate >= formData.endDate) {
      newErrors.endDate = "Thời gian kết thúc phải sau thời gian bắt đầu";
    }

    if (formData.startDate < new Date()) {
      newErrors.startDate = "Thời gian bắt đầu không thể trong quá khứ";
    }

    if (formData.discountedPrice) {
      const discountedPrice = parseFloat(formData.discountedPrice);
      if (isNaN(discountedPrice) || discountedPrice <= 0) {
        newErrors.discountedPrice = "Giá khuyến mãi phải là số dương";
      }
    }

    if (formData.originalPrice) {
      const originalPrice = parseFloat(formData.originalPrice);
      if (isNaN(originalPrice) || originalPrice <= 0) {
        newErrors.originalPrice = "Giá gốc phải là số dương";
      }

      if (formData.discountedPrice) {
        const discountedPrice = parseFloat(formData.discountedPrice);
        if (
          !isNaN(discountedPrice) &&
          !isNaN(originalPrice) &&
          discountedPrice >= originalPrice
        ) {
          newErrors.discountedPrice = "Giá khuyến mãi phải nhỏ hơn giá gốc";
        }
      }
    }

    const maxPhotographers = parseInt(formData.maxPhotographers);
    if (
      isNaN(maxPhotographers) ||
      maxPhotographers < 1 ||
      maxPhotographers > 100
    ) {
      newErrors.maxPhotographers = "Số nhiếp ảnh gia tối đa phải từ 1-100";
    }

    const maxBookingsPerSlot = parseInt(formData.maxBookingsPerSlot);
    if (
      isNaN(maxBookingsPerSlot) ||
      maxBookingsPerSlot < 1 ||
      maxBookingsPerSlot > 50
    ) {
      newErrors.maxBookingsPerSlot = "Số booking tối đa phải từ 1-50";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Image picker functions
  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Quyền truy cập",
        "Ứng dụng cần quyền truy cập thư viện ảnh để upload hình"
      );
      return false;
    }
    return true;
  };

  const pickImages = async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10 - images.length,
      });

      if (!result.canceled && result.assets) {
        const newImages: ImageItem[] = result.assets.map((asset, index) => ({
          uri: asset.uri,
          id: `${Date.now()}_${index}`,
          isPrimary: false,
        }));

        setImages((prev) => [...prev, ...newImages]);

        if (primaryImageIndex === null && newImages.length > 0) {
          setPrimaryImageIndex(images.length);
        }
      }
    } catch (error) {
      console.error("❌ Pick images error:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh");
    }
  };

  const takePhoto = async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newImage: ImageItem = {
          uri: result.assets[0].uri,
          id: `${Date.now()}`,
          isPrimary: false,
        };

        setImages((prev) => [...prev, newImage]);

        if (primaryImageIndex === null) {
          setPrimaryImageIndex(images.length);
        }
      }
    } catch (error) {
      console.error("❌ Take photo error:", error);
      Alert.alert("Lỗi", "Không thể chụp ảnh");
    }
  };

  const showImageOptions = () => {
    Alert.alert("Thêm ảnh", "Chọn cách thêm ảnh cho sự kiện", [
      { text: "Hủy", style: "cancel" },
      { text: "Chọn từ thư viện", onPress: pickImages },
      { text: "Chụp ảnh", onPress: takePhoto },
    ]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));

    if (primaryImageIndex === index) {
      setPrimaryImageIndex(null);
    } else if (primaryImageIndex !== null && primaryImageIndex > index) {
      setPrimaryImageIndex(primaryImageIndex - 1);
    }
  };

  const setPrimaryImage = (index: number) => {
    setPrimaryImageIndex(index);
  };

  // Form handlers
  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleLocationSelect = (location: VenueLocation) => {
    updateFormData("locationId", location.locationId);
    setShowLocationPicker(false);
  };

  // THAY ĐỔI: Sử dụng Modal DateTimePicker handlers
  const showStartDatePicker = () => {
    setStartDatePickerVisibility(true);
  };

  const hideStartDatePicker = () => {
    setStartDatePickerVisibility(false);
  };

  const handleStartDateConfirm = (date: Date) => {
    updateFormData("startDate", date);

    // Automatically adjust end date if it's before start date
    if (date >= formData.endDate) {
      const newEndDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      updateFormData("endDate", newEndDate);
    }

    hideStartDatePicker();
  };

  const showEndDatePicker = () => {
    setEndDatePickerVisibility(true);
  };

  const hideEndDatePicker = () => {
    setEndDatePickerVisibility(false);
  };

  const handleEndDateConfirm = (date: Date) => {
    updateFormData("endDate", date);
    hideEndDatePicker();
  };

  // Submit handlers
  const handleCreateEvent = async () => {
    try {
      if (!validateForm()) {
        Alert.alert("Lỗi", "Vui lòng kiểm tra lại thông tin");
        return;
      }

      setUploading(true);

      const eventData: CreateEventRequest = {
        locationId: formData.locationId!,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        discountedPrice: formData.discountedPrice
          ? parseFloat(formData.discountedPrice)
          : undefined,
        originalPrice: formData.originalPrice
          ? parseFloat(formData.originalPrice)
          : undefined,
        maxPhotographers: parseInt(formData.maxPhotographers),
        maxBookingsPerSlot: parseInt(formData.maxBookingsPerSlot),
      };

      console.log("🏗️ Creating event with data:", eventData);

      const createdEvent = await createEvent(eventData);
      if (!createdEvent) {
        throw new Error("Không thể tạo sự kiện");
      }

      console.log("✅ Event created:", createdEvent.eventId);

      if (images.length > 0) {
        console.log("📸 Uploading", images.length, "images...");

        const uploadPromises = images.map(async (image, index) => {
          try {
            const isPrimary = primaryImageIndex === index;
            const result = await venueOwnerImageService.uploadEventImage(
              createdEvent.eventId,
              image.uri,
              isPrimary,
              `Event ${createdEvent.name} - Image ${index + 1}`
            );
            console.log(`✅ Image ${index + 1} uploaded:`, result?.url);
            return result;
          } catch (error) {
            console.error(`❌ Failed to upload image ${index + 1}:`, error);
            return null;
          }
        });

        const uploadResults = await Promise.all(uploadPromises);
        const successCount = uploadResults.filter((r) => r !== null).length;

        console.log(`📸 Uploaded ${successCount}/${images.length} images`);

        if (successCount < images.length) {
          Alert.alert(
            "Thông báo",
            `Sự kiện đã được tạo thành công! Tuy nhiên chỉ upload được ${successCount}/${images.length} ảnh.`
          );
        }
      }

      Alert.alert("Thành công", "Sự kiện đã được tạo thành công!", [
        {
          text: "OK",
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error("❌ Create event error:", error);
      Alert.alert(
        "Lỗi",
        error instanceof Error ? error.message : "Không thể tạo sự kiện"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Hủy tạo sự kiện",
      "Bạn có chắc chắn muốn hủy? Tất cả thông tin đã nhập sẽ bị mất.",
      [
        { text: "Tiếp tục chỉnh sửa", style: "cancel" },
        {
          text: "Hủy",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  // Get selected location name
  const getSelectedLocationName = () => {
    if (!formData.locationId) return "Chọn địa điểm";
    const location = userLocations.find(
      (l) => l.locationId === formData.locationId
    );
    return location?.name || "Địa điểm không xác định";
  };

  // Format date for display
  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isLoading = eventLoading || uploading || locationsLoading;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={handleCancel}
            className="flex-row items-center"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
            <Text className="ml-2 text-lg font-medium text-gray-900">
              Tạo sự kiện
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCreateEvent}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg ${
              isLoading ? "bg-gray-300" : "bg-blue-500"
            }`}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold">Tạo</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* Basic Information */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Thông tin cơ bản
          </Text>

          {/* Location Selection */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Địa điểm *
            </Text>
            <TouchableOpacity
              onPress={() => setShowLocationPicker(true)}
              disabled={locationsLoading}
              className={`border rounded-lg p-3 flex-row items-center justify-between ${
                errors.locationId ? "border-red-300" : "border-gray-300"
              } ${locationsLoading ? "opacity-50" : ""}`}
            >
              <View className="flex-row items-center flex-1">
                {locationsLoading ? (
                  <ActivityIndicator size="small" color="#6B7280" />
                ) : (
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={formData.locationId ? "#374151" : "#9CA3AF"}
                  />
                )}
                <Text
                  className={`ml-2 ${
                    formData.locationId ? "text-gray-900" : "text-gray-500"
                  }`}
                  numberOfLines={1}
                >
                  {locationsLoading ? "Đang tải..." : getSelectedLocationName()}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            {errors.locationId && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.locationId}
              </Text>
            )}
          </View>

          {/* Event Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Tên sự kiện *
            </Text>
            <TextInput
              value={formData.name}
              onChangeText={(text) => updateFormData("name", text)}
              placeholder="Nhập tên sự kiện..."
              className={`border rounded-lg p-3 text-gray-900 ${
                errors.name ? "border-red-300" : "border-gray-300"
              }`}
              maxLength={255}
            />
            {errors.name && (
              <Text className="text-red-500 text-sm mt-1">{errors.name}</Text>
            )}
            <Text className="text-gray-500 text-xs mt-1">
              {formData.name.length}/255 ký tự
            </Text>
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Mô tả sự kiện
            </Text>
            <TextInput
              value={formData.description}
              onChangeText={(text) => updateFormData("description", text)}
              placeholder="Mô tả chi tiết về sự kiện..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className={`border rounded-lg p-3 text-gray-900 ${
                errors.description ? "border-red-300" : "border-gray-300"
              }`}
              maxLength={1000}
            />
            {errors.description && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.description}
              </Text>
            )}
            <Text className="text-gray-500 text-xs mt-1">
              {formData.description.length}/1000 ký tự
            </Text>
          </View>
        </View>

        {/* Date & Time */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Thời gian
          </Text>

          {/* Start Date */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Ngày bắt đầu *
            </Text>
            <TouchableOpacity
              onPress={showStartDatePicker}
              className={`border rounded-lg p-3 flex-row items-center ${
                errors.startDate ? "border-red-300" : "border-gray-300"
              }`}
            >
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text className="ml-2 text-gray-900">
                {formatDateTime(formData.startDate)}
              </Text>
            </TouchableOpacity>
            {errors.startDate && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.startDate}
              </Text>
            )}
          </View>

          {/* End Date */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Ngày kết thúc *
            </Text>
            <TouchableOpacity
              onPress={showEndDatePicker}
              className={`border rounded-lg p-3 flex-row items-center ${
                errors.endDate ? "border-red-300" : "border-gray-300"
              }`}
            >
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text className="ml-2 text-gray-900">
                {formatDateTime(formData.endDate)}
              </Text>
            </TouchableOpacity>
            {errors.endDate && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.endDate}
              </Text>
            )}
          </View>
        </View>

        {/* Pricing */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Giá cả
          </Text>

          <View className="flex-row space-x-3">
            {/* Original Price */}
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Giá gốc (VNĐ)
              </Text>
              <TextInput
                value={formData.originalPrice}
                onChangeText={(text) => updateFormData("originalPrice", text)}
                placeholder="0"
                keyboardType="numeric"
                className={`border rounded-lg p-3 text-gray-900 ${
                  errors.originalPrice ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.originalPrice && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.originalPrice}
                </Text>
              )}
            </View>

            {/* Discounted Price */}
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Giá khuyến mãi (VNĐ)
              </Text>
              <TextInput
                value={formData.discountedPrice}
                onChangeText={(text) => updateFormData("discountedPrice", text)}
                placeholder="0"
                keyboardType="numeric"
                className={`border rounded-lg p-3 text-gray-900 ${
                  errors.discountedPrice ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.discountedPrice && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.discountedPrice}
                </Text>
              )}
            </View>
          </View>

          <Text className="text-gray-500 text-xs mt-2">
            💡 Để trống nếu không có khuyến mãi
          </Text>
        </View>

        {/* Capacity */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Sức chứa
          </Text>

          <View className="flex-row space-x-3">
            {/* Max Photographers */}
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Số nhiếp ảnh gia tối đa *
              </Text>
              <TextInput
                value={formData.maxPhotographers}
                onChangeText={(text) =>
                  updateFormData("maxPhotographers", text)
                }
                placeholder="5"
                keyboardType="numeric"
                className={`border rounded-lg p-3 text-gray-900 ${
                  errors.maxPhotographers ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.maxPhotographers && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.maxPhotographers}
                </Text>
              )}
            </View>

            {/* Max Bookings Per Slot */}
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Booking tối đa/slot *
              </Text>
              <TextInput
                value={formData.maxBookingsPerSlot}
                onChangeText={(text) =>
                  updateFormData("maxBookingsPerSlot", text)
                }
                placeholder="3"
                keyboardType="numeric"
                className={`border rounded-lg p-3 text-gray-900 ${
                  errors.maxBookingsPerSlot
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
              {errors.maxBookingsPerSlot && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.maxBookingsPerSlot}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Images */}
        <View className="bg-white rounded-lg p-4 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">
              Hình ảnh sự kiện
            </Text>
            <TouchableOpacity
              onPress={showImageOptions}
              disabled={images.length >= 10}
              className={`px-3 py-2 rounded-lg ${
                images.length >= 10 ? "bg-gray-300" : "bg-blue-500"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  images.length >= 10 ? "text-gray-500" : "text-white"
                }`}
              >
                Thêm ảnh
              </Text>
            </TouchableOpacity>
          </View>

          {images.length > 0 ? (
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row space-x-3">
                  {images.map((image, index) => (
                    <View key={image.id} className="relative">
                      <Image
                        source={{ uri: image.uri }}
                        className="w-24 h-24 rounded-lg"
                        resizeMode="cover"
                      />

                      {/* Primary Badge */}
                      {primaryImageIndex === index && (
                        <View className="absolute top-1 left-1 bg-blue-500 px-2 py-1 rounded">
                          <Text className="text-white text-xs font-bold">
                            Chính
                          </Text>
                        </View>
                      )}

                      {/* Remove Button */}
                      <TouchableOpacity
                        onPress={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 w-6 h-6 rounded-full items-center justify-center"
                      >
                        <Ionicons name="close" size={14} color="white" />
                      </TouchableOpacity>

                      {/* Set Primary Button */}
                      {primaryImageIndex !== index && (
                        <TouchableOpacity
                          onPress={() => setPrimaryImage(index)}
                          className="absolute bottom-1 right-1 bg-gray-800 bg-opacity-70 px-2 py-1 rounded"
                        >
                          <Text className="text-white text-xs">Đặt chính</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>

              <Text className="text-gray-500 text-xs mt-2">
                {images.length}/10 ảnh • Chạm "Đặt chính" để chọn ảnh đại diện
              </Text>
            </View>
          ) : (
            <View className="border-2 border-dashed border-gray-300 rounded-lg p-8 items-center">
              <View className="bg-gray-100 p-4 rounded-full mb-3">
                <Ionicons name="images-outline" size={32} color="#6B7280" />
              </View>
              <Text className="text-gray-600 font-medium mb-1">
                Chưa có ảnh nào
              </Text>
              <Text className="text-gray-500 text-sm text-center">
                Thêm ảnh để sự kiện trở nên hấp dẫn hơn
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowLocationPicker(false)}
        >
          <Pressable className="bg-white rounded-t-3xl p-6 max-h-96">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-gray-900">
                Chọn địa điểm
              </Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {locationsLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="text-gray-500 mt-2">Đang tải địa điểm...</Text>
              </View>
            ) : userLocations && userLocations.length > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {userLocations.map((location) => (
                  <TouchableOpacity
                    key={location.locationId}
                    className={`p-4 rounded-lg mb-2 ${
                      formData.locationId === location.locationId
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-gray-50"
                    }`}
                    onPress={() => handleLocationSelect(location)}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <Ionicons
                          name="location-outline"
                          size={20}
                          color={
                            formData.locationId === location.locationId
                              ? "#3B82F6"
                              : "#6B7280"
                          }
                        />
                        <View className="ml-3 flex-1">
                          <Text
                            className={`font-medium ${
                              formData.locationId === location.locationId
                                ? "text-blue-600"
                                : "text-gray-700"
                            }`}
                            numberOfLines={1}
                          >
                            {location.name}
                          </Text>
                          <Text
                            className="text-sm text-gray-500"
                            numberOfLines={1}
                          >
                            {location.address}
                          </Text>
                        </View>
                      </View>
                      {formData.locationId === location.locationId && (
                        <Ionicons name="checkmark" size={20} color="#3B82F6" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View className="items-center py-8">
                <View className="bg-gray-100 p-4 rounded-full mb-3">
                  <Ionicons name="location-outline" size={32} color="#6B7280" />
                </View>
                <Text className="text-gray-600 font-medium mb-1">
                  Chưa có địa điểm
                </Text>
                <Text className="text-gray-500 text-sm text-center">
                  Vui lòng tạo địa điểm trước khi tạo sự kiện
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* THAY ĐỔI: Sử dụng Modal DateTimePicker thay vì thư viện cũ */}
      <DateTimePickerModal
        isVisible={isStartDatePickerVisible}
        mode="datetime"
        onConfirm={handleStartDateConfirm}
        onCancel={hideStartDatePicker}
        minimumDate={new Date()}
        date={formData.startDate}
        locale="vi_VN"
        confirmTextIOS="Xác nhận"
        cancelTextIOS="Hủy"
      />

      <DateTimePickerModal
        isVisible={isEndDatePickerVisible}
        mode="datetime"
        onConfirm={handleEndDateConfirm}
        onCancel={hideEndDatePicker}
        minimumDate={formData.startDate}
        date={formData.endDate}
        locale="vi_VN"
        confirmTextIOS="Xác nhận"
        cancelTextIOS="Hủy"
      />
    </SafeAreaView>
  );
};

export default VenueOwnerCreateEventScreen;
