// screens/venueOwner/VenueOwnerEditEventScreen.tsx
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
import DateTimePickerModal from "react-native-modal-datetime-picker";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useVenueOwnerEvent } from "../../hooks/useVenueOwnerEvent";
import { useVenueOwnerEventImages } from "../../hooks/useVenueOwnerEventImages";
import { useVenueOwnerLocation } from "../../hooks/useVenueOwnerLocation";
import { venueOwnerProfileService } from "../../services/venueOwnerProfileService";
import { UpdateEventRequest } from "../../types/VenueOwnerEvent";
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

interface EventEditScreenProps {
  navigation: any;
  route: {
    params: {
      eventId: number;
    };
  };
}
const VenueOwnerEditEventScreen: React.FC<EventEditScreenProps> = ({
  navigation,
  route,
}) => {
  const { eventId } = route.params;

  // Hooks
  const {
    selectedEvent,
    loading: eventLoading,
    error,
    getEventById,
    updateEvent,
    clearError,
  } = useVenueOwnerEvent();

  const {
    images,
    uploadImage,
    uploadMultipleImages,
    loading: imagesLoading,
  } = useVenueOwnerEventImages(eventId);

  const { getLocationsByOwnerId, loading: locationsLoading } =
    useVenueOwnerLocation();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    locationId: null,
    name: "",
    description: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    discountedPrice: "",
    originalPrice: "",
    maxPhotographers: "5",
    maxBookingsPerSlot: "3",
  });

  // UI state
  const [isStartDatePickerVisible, setStartDatePickerVisibility] =
    useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisibility] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userLocations, setUserLocations] = useState<VenueLocation[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Helper function to get current user ID from JWT
  const getCurrentUserId = async (): Promise<number | null> => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return null;

      const parts = token.split(".");
      if (parts.length !== 3) return null;

      const payload = parts[1];
      const paddedPayload =
        payload + "=".repeat((4 - (payload.length % 4)) % 4);
      const decodedPayload = atob(paddedPayload);
      const payloadObj = JSON.parse(decodedPayload);

      const userIdStr =
        payloadObj[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
        ];
      return parseInt(userIdStr, 10);
    } catch (error) {
      console.error("❌ Error extracting user ID from JWT:", error);
      return null;
    }
  };

  // Load event data and user locations
  useEffect(() => {
    loadEventData();
  }, [eventId]);

  // Track form changes
  useEffect(() => {
    if (selectedEvent) {
      checkForChanges();
    }
  }, [formData, selectedEvent]);

  // Populate form when event data is loaded
  useEffect(() => {
    if (selectedEvent) {
      setFormData({
        locationId: selectedEvent.locationId,
        name: selectedEvent.name,
        description: selectedEvent.description || "",
        startDate: new Date(selectedEvent.startDate),
        endDate: new Date(selectedEvent.endDate),
        discountedPrice: selectedEvent.discountedPrice?.toString() || "",
        originalPrice: selectedEvent.originalPrice?.toString() || "",
        maxPhotographers: selectedEvent.maxPhotographers.toString(),
        maxBookingsPerSlot: selectedEvent.maxBookingsPerSlot.toString(),
      });
    }
  }, [selectedEvent]);

  const loadEventData = async () => {
    try {
      await getEventById(eventId);
      await loadUserLocations();
    } catch (error) {
      console.error("❌ Error loading event data:", error);
    }
  };

  const loadUserLocations = async () => {
    try {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) return;

      const locationOwner =
        await venueOwnerProfileService.getLocationOwnerByUserId(currentUserId);
      if (!locationOwner) return;

      const locations = await getLocationsByOwnerId(
        locationOwner.locationOwnerId
      );
      setUserLocations(locations);
    } catch (error) {
      console.error("❌ Error loading user locations:", error);
    }
  };

  const checkForChanges = () => {
    if (!selectedEvent) return;

    const hasChanges =
      formData.name !== selectedEvent.name ||
      formData.description !== (selectedEvent.description || "") ||
      formData.startDate.getTime() !==
        new Date(selectedEvent.startDate).getTime() ||
      formData.endDate.getTime() !==
        new Date(selectedEvent.endDate).getTime() ||
      formData.discountedPrice !==
        (selectedEvent.discountedPrice?.toString() || "") ||
      formData.originalPrice !==
        (selectedEvent.originalPrice?.toString() || "") ||
      formData.maxPhotographers !== selectedEvent.maxPhotographers.toString() ||
      formData.maxBookingsPerSlot !==
        selectedEvent.maxBookingsPerSlot.toString();

    setHasUnsavedChanges(hasChanges);
  };
  // Form validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

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

  // Form handlers
  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Date picker handlers
  const showStartDatePicker = () => setStartDatePickerVisibility(true);
  const hideStartDatePicker = () => setStartDatePickerVisibility(false);
  const handleStartDateConfirm = (date: Date) => {
    updateFormData("startDate", date);
    if (date >= formData.endDate) {
      const newEndDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      updateFormData("endDate", newEndDate);
    }
    hideStartDatePicker();
  };

  const showEndDatePicker = () => setEndDatePickerVisibility(true);
  const hideEndDatePicker = () => setEndDatePickerVisibility(false);
  const handleEndDateConfirm = (date: Date) => {
    updateFormData("endDate", date);
    hideEndDatePicker();
  };

  // Image management
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
        mediaTypes: "images",
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10 - images.length,
      });

      if (!result.canceled && result.assets) {
        setUploading(true);
        try {
          const imageUris = result.assets.map((asset) => asset.uri);
          const primaryIndex = images.length === 0 ? 0 : undefined;
          await uploadMultipleImages(imageUris, primaryIndex);
          Alert.alert("Thành công", `Đã upload ${result.assets.length} ảnh`);
        } catch (error) {
          Alert.alert("Lỗi", "Không thể upload ảnh");
        } finally {
          setUploading(false);
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
        mediaTypes: "images",
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setUploading(true);
        try {
          const isPrimary = images.length === 0;
          await uploadImage(
            result.assets[0].uri,
            isPrimary,
            `Event photo ${Date.now()}`
          );
          Alert.alert("Thành công", "Đã upload ảnh");
        } catch (error) {
          Alert.alert("Lỗi", "Không thể upload ảnh");
        } finally {
          setUploading(false);
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

  const handleManageImages = () => {
    navigation.navigate("VenueOwnerEventImages", {
      eventId,
      eventName: selectedEvent?.name,
    });
  };
  // Submit handlers
  const handleUpdateEvent = async () => {
    try {
      if (!validateForm()) {
        Alert.alert("Lỗi", "Vui lòng kiểm tra lại thông tin");
        return;
      }

      if (!selectedEvent) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin sự kiện");
        return;
      }

      const updateData: UpdateEventRequest = {};

      // Only include changed fields
      if (formData.name !== selectedEvent.name) {
        updateData.name = formData.name.trim();
      }
      if (formData.description !== (selectedEvent.description || "")) {
        updateData.description = formData.description.trim() || undefined;
      }
      if (
        formData.startDate.getTime() !==
        new Date(selectedEvent.startDate).getTime()
      ) {
        updateData.startDate = formData.startDate.toISOString();
      }
      if (
        formData.endDate.getTime() !== new Date(selectedEvent.endDate).getTime()
      ) {
        updateData.endDate = formData.endDate.toISOString();
      }
      if (
        formData.discountedPrice !==
        (selectedEvent.discountedPrice?.toString() || "")
      ) {
        updateData.discountedPrice = formData.discountedPrice
          ? parseFloat(formData.discountedPrice)
          : undefined;
      }
      if (
        formData.originalPrice !==
        (selectedEvent.originalPrice?.toString() || "")
      ) {
        updateData.originalPrice = formData.originalPrice
          ? parseFloat(formData.originalPrice)
          : undefined;
      }
      if (
        formData.maxPhotographers !== selectedEvent.maxPhotographers.toString()
      ) {
        updateData.maxPhotographers = parseInt(formData.maxPhotographers);
      }
      if (
        formData.maxBookingsPerSlot !==
        selectedEvent.maxBookingsPerSlot.toString()
      ) {
        updateData.maxBookingsPerSlot = parseInt(formData.maxBookingsPerSlot);
      }

      // Only update if there are changes
      if (Object.keys(updateData).length === 0) {
        Alert.alert("Thông báo", "Không có thay đổi nào để lưu");
        return;
      }

      console.log("🔄 Updating event with data:", updateData);

      const updatedEvent = await updateEvent(eventId, updateData);
      if (!updatedEvent) {
        throw new Error("Không thể cập nhật sự kiện");
      }

      Alert.alert("Thành công", "Sự kiện đã được cập nhật!", [
        {
          text: "OK",
          onPress: () => {
            setHasUnsavedChanges(false);
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error("❌ Update event error:", error);
      Alert.alert(
        "Lỗi",
        error instanceof Error ? error.message : "Không thể cập nhật sự kiện"
      );
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      Alert.alert(
        "Hủy chỉnh sửa",
        "Bạn có thay đổi chưa được lưu. Bạn có chắc chắn muốn hủy?",
        [
          { text: "Tiếp tục chỉnh sửa", style: "cancel" },
          {
            text: "Hủy",
            style: "destructive",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  // Helper functions
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
  // Loading state
  if (eventLoading && !selectedEvent) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">
            Đang tải thông tin sự kiện...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !selectedEvent) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-red-100 p-4 rounded-full mb-4">
            <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
          </View>
          <Text className="text-gray-900 font-medium mb-2 text-center">
            Có lỗi xảy ra
          </Text>
          <Text className="text-gray-500 text-center mb-4">{error}</Text>
          <TouchableOpacity
            className="bg-blue-500 px-6 py-3 rounded-lg"
            onPress={() => {
              clearError();
              loadEventData();
            }}
          >
            <Text className="text-white font-semibold">Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Not found state
  if (!selectedEvent) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center px-4">
          <View className="bg-gray-100 p-4 rounded-full mb-4">
            <Ionicons name="calendar-outline" size={32} color="#6B7280" />
          </View>
          <Text className="text-gray-900 font-medium mb-2 text-center">
            Không tìm thấy sự kiện
          </Text>
          <Text className="text-gray-500 text-center mb-4">
            Sự kiện không tồn tại hoặc đã bị xóa
          </Text>
          <TouchableOpacity
            className="bg-blue-500 px-6 py-3 rounded-lg"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-white font-semibold">Quay lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
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
              Chỉnh sửa sự kiện
            </Text>
          </TouchableOpacity>

          <View className="flex-row space-x-2">
            {hasUnsavedChanges && (
              <View className="bg-orange-100 px-3 py-1 rounded-full">
                <Text className="text-orange-800 text-xs font-medium">
                  Có thay đổi
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleUpdateEvent}
              disabled={isLoading || !hasUnsavedChanges}
              className={`px-4 py-2 rounded-lg ${
                isLoading || !hasUnsavedChanges ? "bg-gray-300" : "bg-blue-500"
              }`}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text
                  className={`font-semibold ${
                    !hasUnsavedChanges ? "text-gray-500" : "text-white"
                  }`}
                >
                  Lưu
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* Current Event Status */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-900">
              Trạng thái hiện tại
            </Text>
            <View className="bg-blue-100 px-3 py-1 rounded-full">
              <Text className="text-blue-800 text-sm font-medium">
                {selectedEvent.status}
              </Text>
            </View>
          </View>
          <Text className="text-gray-500 text-sm mt-1">
            ID: {selectedEvent.eventId} • Tạo:{" "}
            {new Date(selectedEvent.createdAt).toLocaleDateString("vi-VN")}
          </Text>
        </View>

        {/* Basic Information */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Thông tin cơ bản
          </Text>

          {/* Location (Read-only) */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Địa điểm
            </Text>
            <View className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <View className="flex-row items-center">
                <Ionicons name="location-outline" size={20} color="#6B7280" />
                <Text className="ml-2 text-gray-700">
                  {selectedEvent.location?.name || "Địa điểm không xác định"}
                </Text>
              </View>
            </View>
            <Text className="text-gray-500 text-xs mt-1">
              💡 Không thể thay đổi địa điểm sau khi tạo
            </Text>
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
        {/* Images Management */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">
              Hình ảnh sự kiện
            </Text>
            <View className="flex-row space-x-2">
              <TouchableOpacity
                onPress={showImageOptions}
                disabled={images.length >= 10 || uploading}
                className={`px-3 py-2 rounded-lg ${
                  images.length >= 10 || uploading
                    ? "bg-gray-300"
                    : "bg-blue-500"
                }`}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text
                    className={`text-sm font-medium ${
                      images.length >= 10 ? "text-gray-500" : "text-white"
                    }`}
                  >
                    Thêm ảnh
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleManageImages}
                className="px-3 py-2 rounded-lg bg-purple-500"
              >
                <Text className="text-sm font-medium text-white">Quản lý</Text>
              </TouchableOpacity>
            </View>
          </View>

          {images.length > 0 ? (
            <View>
              <Text className="text-sm text-gray-500 mb-2">
                {images.length}/10 ảnh • Chạm "Quản lý" để chỉnh sửa chi tiết
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row space-x-3">
                  {images.slice(0, 5).map((image, index) => (
                    <View key={image.id} className="relative">
                      <Image
                        source={{ uri: image.url }}
                        className="w-20 h-20 rounded-lg"
                        resizeMode="cover"
                      />
                      {image.isPrimary && (
                        <View className="absolute top-1 left-1 bg-blue-500 px-2 py-1 rounded">
                          <Text className="text-white text-xs font-bold">
                            Chính
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                  {images.length > 5 && (
                    <View className="w-20 h-20 rounded-lg bg-gray-100 items-center justify-center">
                      <Text className="text-gray-500 text-xs">
                        +{images.length - 5}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>
            </View>
          ) : (
            <View className="border-2 border-dashed border-gray-300 rounded-lg p-6 items-center">
              <View className="bg-gray-100 p-3 rounded-full mb-2">
                <Ionicons name="images-outline" size={24} color="#6B7280" />
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

        {/* Current Statistics (Read-only) */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Thống kê hiện tại
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-600">Nhiếp ảnh gia đã duyệt</Text>
              <Text className="font-semibold text-green-600">
                {selectedEvent.approvedPhotographersCount || 0}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-gray-600">Tổng booking</Text>
              <Text className="font-semibold text-blue-600">
                {selectedEvent.totalBookingsCount || 0}
              </Text>
            </View>

            <View className="flex-row justify-between items-center">
              <Text className="text-gray-600">Tổng đăng ký</Text>
              <Text className="font-semibold text-orange-600">
                {selectedEvent.totalApplicationsCount || 0}
              </Text>
            </View>
          </View>
        </View>
        {/* Danger Zone (if event has applications/bookings) */}
        {(selectedEvent.approvedPhotographersCount > 0 ||
          selectedEvent.totalBookingsCount > 0) && (
          <View className="bg-red-50 rounded-lg p-4 mb-4 border border-red-200">
            <View className="flex-row items-center mb-2">
              <Ionicons name="warning-outline" size={20} color="#EF4444" />
              <Text className="ml-2 text-red-800 font-semibold">
                Lưu ý quan trọng
              </Text>
            </View>
            <Text className="text-red-700 text-sm">
              Sự kiện này đã có{" "}
              {selectedEvent.approvedPhotographersCount > 0 &&
                `${selectedEvent.approvedPhotographersCount} nhiếp ảnh gia đã được duyệt`}
              {selectedEvent.approvedPhotographersCount > 0 &&
                selectedEvent.totalBookingsCount > 0 &&
                " và "}
              {selectedEvent.totalBookingsCount > 0 &&
                `${selectedEvent.totalBookingsCount} booking`}
              . Việc thay đổi thông tin có thể ảnh hưởng đến các bên liên quan.
            </Text>

            {/* Warning for specific changes */}
            {hasUnsavedChanges && (
              <View className="mt-3 p-3 bg-red-100 rounded-lg">
                <Text className="text-red-800 text-sm font-medium">
                  ⚠️ Những thay đổi có thể ảnh hưởng:
                </Text>
                <View className="mt-2 space-y-1">
                  {formData.maxPhotographers !==
                    selectedEvent.maxPhotographers.toString() && (
                    <Text className="text-red-700 text-sm">
                      • Số lượng nhiếp ảnh gia tối đa
                    </Text>
                  )}
                  {formData.maxBookingsPerSlot !==
                    selectedEvent.maxBookingsPerSlot.toString() && (
                    <Text className="text-red-700 text-sm">
                      • Số booking tối đa mỗi slot
                    </Text>
                  )}
                  {(formData.startDate.getTime() !==
                    new Date(selectedEvent.startDate).getTime() ||
                    formData.endDate.getTime() !==
                      new Date(selectedEvent.endDate).getTime()) && (
                    <Text className="text-red-700 text-sm">
                      • Thời gian diễn ra sự kiện
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Additional Actions */}
        <View className="bg-white rounded-lg p-4 mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Hành động khác
          </Text>

          <View className="space-y-3">
            <TouchableOpacity
              onPress={() =>
                navigation.navigate("VenueOwnerEventApplications", { eventId })
              }
              className="flex-row items-center justify-between p-3 bg-blue-50 rounded-lg"
            >
              <View className="flex-row items-center">
                <Ionicons name="people-outline" size={20} color="#3B82F6" />
                <Text className="ml-3 font-medium text-blue-900">
                  Quản lý đăng ký
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-blue-600 font-semibold mr-2">
                  {selectedEvent.totalApplicationsCount || 0}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate("VenueOwnerEventBookings", { eventId })
              }
              className="flex-row items-center justify-between p-3 bg-green-50 rounded-lg"
            >
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={20} color="#10B981" />
                <Text className="ml-3 font-medium text-green-900">
                  Quản lý booking
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="text-green-600 font-semibold mr-2">
                  {selectedEvent.totalBookingsCount || 0}
                </Text>
                <Ionicons name="chevron-forward" size={16} color="#10B981" />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Date Time Pickers */}
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

export default VenueOwnerEditEventScreen;
