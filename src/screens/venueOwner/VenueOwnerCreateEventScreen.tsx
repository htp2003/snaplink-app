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
import { useVenueOwnerEvent } from "../../hooks/useVenueOwnerEvent";
import { useVenueOwnerLocation } from "../../hooks/useVenueOwnerLocation";
import { venueOwnerImageService } from "../../services/venueOwnerImageService.ts";
import { CreateEventRequest } from "../../types/VenueOwnerEvent";
import { useVenueOwnerSubscription } from "../../hooks/useVenueOwnerSubscription";
import { useVenueOwnerEventForm } from "../../hooks/useVenueOwnerEventForm";
import { TimePickerModal } from "../../components/TimePickerModal";
import {
  formatDisplayDateTime,
  formatDisplayDateOnly,
  formatDisplayTimeOnly,
  getTimeFromDate,
} from "../../utils/dateUtils";

const VenueOwnerCreateEventScreen = ({ navigation, route }: any) => {
  const preselectedLocationId = route?.params?.locationId;

  // Hooks
  const { createEvent, loading: eventLoading } = useVenueOwnerEvent();
  const { getLocationsByOwnerId, loading: locationsLoading } =
    useVenueOwnerLocation();

  const {
    userLocations,
    loadingSubscriptions,
    hasActiveSubscription,
    getActiveSubscription,
    getSubscriptionRemainingDays,
    loadUserLocationsWithSubscriptions,
  } = useVenueOwnerSubscription();

  const {
    formData,
    images,
    primaryImageIndex,
    errors,
    updateFormData,
    updateDateTime,
    validateForm,
    getFormattedDatesForAPI,
    showImageOptions,
    removeImage,
    setPrimaryImage,
    setFormData,
  } = useVenueOwnerEventForm(preselectedLocationId);

  // UI state
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isStartDatePickerVisible, setStartDatePickerVisibility] =
    useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisibility] = useState(false);
  const [isStartTimePickerVisible, setStartTimePickerVisibility] =
    useState(false);
  const [isEndTimePickerVisible, setEndTimePickerVisibility] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Load locations on mount (unchanged)
  useEffect(() => {
    const loadLocations = async () => {
      const result = await loadUserLocationsWithSubscriptions(
        getLocationsByOwnerId,
        preselectedLocationId
      );

      if (result.error === "NO_LOCATIONS") {
        Alert.alert(
          "Chưa có địa điểm",
          "Bạn chưa tạo địa điểm nào. Vui lòng tạo địa điểm trước khi tạo sự kiện.",
          [
            { text: "Hủy", onPress: () => navigation.goBack() },
            {
              text: "Tạo địa điểm",
              onPress: () => {
                navigation.goBack();
                navigation.navigate("VenueOwnerCreateLocation");
              },
            },
          ]
        );
      } else if (result.error === "NO_SUBSCRIPTION") {
        setTimeout(() => {
          Alert.alert(
            "Cần đăng ký gói",
            "Không có địa điểm nào có gói đăng ký active để tạo sự kiện. Vui lòng đăng ký gói subscription trước.",
            [
              { text: "Hủy", onPress: () => navigation.goBack() },
              {
                text: "Đăng ký gói",
                onPress: () => {
                  navigation.goBack();
                  navigation.navigate("VenueOwnerSubscription");
                },
              },
            ]
          );
        }, 500);
      } else if (preselectedLocationId && result.locations.length > 0) {
        const location = result.locations.find(
          (l) => l.locationId === preselectedLocationId
        );
        if (location?.canCreateEvent) {
          setFormData((prev) => ({
            ...prev,
            locationId: preselectedLocationId,
          }));
        } else if (location) {
          Alert.alert(
            "Thông báo",
            `Địa điểm "${location.name}" không có gói đăng ký active. Vui lòng chọn địa điểm khác hoặc đăng ký gói subscription.`
          );
        }
      }
    };

    loadLocations();
  }, []);

  // Helper functions
  const getSelectedLocationName = () => {
    if (!formData.locationId) return "Chọn địa điểm";
    const location = userLocations.find(
      (l) => l.locationId === formData.locationId
    );
    return location?.name || "Địa điểm không xác định";
  };

  const getSelectedLocationInfo = () => {
    if (!formData.locationId) return null;
    return userLocations.find((l) => l.locationId === formData.locationId);
  };

  // Event handlers
  const handleLocationSelect = (location: any) => {
    if (!location.canCreateEvent) {
      Alert.alert(
        "Không thể chọn địa điểm",
        `Địa điểm "${location.name}" không có gói đăng ký active. Vui lòng đăng ký gói subscription trước.`,
        [
          { text: "OK", style: "cancel" },
          {
            text: "Đăng ký gói",
            onPress: () => {
              setShowLocationPicker(false);
              navigation.navigate("VenueOwnerSubscription");
            },
          },
        ]
      );
      return;
    }

    updateFormData("locationId", location.locationId);
    setShowLocationPicker(false);
  };

  const handleStartDateConfirm = (date: Date) => {
    const currentTime = getTimeFromDate(formData.startDate);
    updateDateTime("startDate", date, currentTime.hour, currentTime.minute);

    // Nếu start date >= end date, tự động set end date về ngày hôm sau
    const newStartDateTime = new Date(date);
    newStartDateTime.setHours(currentTime.hour, currentTime.minute, 0, 0);

    if (newStartDateTime >= formData.endDate) {
      const newEndDate = new Date(date);
      newEndDate.setDate(newEndDate.getDate() + 1);
      const currentEndTime = getTimeFromDate(formData.endDate);
      updateDateTime(
        "endDate",
        newEndDate,
        currentEndTime.hour,
        currentEndTime.minute
      );
    }

    setStartDatePickerVisibility(false);
  };

  const handleEndDateConfirm = (date: Date) => {
    const currentTime = getTimeFromDate(formData.endDate);
    updateDateTime("endDate", date, currentTime.hour, currentTime.minute);
    setEndDatePickerVisibility(false);
  };

  const handleStartTimeConfirm = (selectedTime: Date) => {
    const currentDate = new Date(formData.startDate);
    updateDateTime(
      "startDate",
      currentDate,
      selectedTime.getHours(),
      selectedTime.getMinutes()
    );
    setStartTimePickerVisibility(false);
  };

  const handleEndTimeConfirm = (selectedTime: Date) => {
    const currentDate = new Date(formData.endDate);
    updateDateTime(
      "endDate",
      currentDate,
      selectedTime.getHours(),
      selectedTime.getMinutes()
    );
    setEndTimePickerVisibility(false);
  };

  const handleCreateEvent = async () => {
    try {
      if (!validateForm(userLocations)) {
        Alert.alert("Lỗi", "Vui lòng kiểm tra lại thông tin");
        return;
      }

      setUploading(true);

      const { startDate, endDate } = getFormattedDatesForAPI();

      console.log("🕐 Original dates:", {
        startDate: formData.startDate,
        endDate: formData.endDate,
      });

      console.log("🕐 Formatted dates for API:", {
        startDate,
        endDate,
      });

      const eventData: CreateEventRequest = {
        locationId: formData.locationId!,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        startDate,
        endDate,
        discountedPrice: formData.discountedPrice
          ? parseFloat(formData.discountedPrice)
          : undefined,
        originalPrice: formData.originalPrice
          ? parseFloat(formData.originalPrice)
          : undefined,
        maxPhotographers: parseInt(formData.maxPhotographers),
        maxBookingsPerSlot: parseInt(formData.maxBookingsPerSlot),
      };

      console.log("📅 Event data being sent to API:", eventData);

      const createdEvent = await createEvent(eventData);
      if (!createdEvent) throw new Error("Không thể tạo sự kiện");

      console.log("✅ Event created successfully:", createdEvent);

      // Upload images if any
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

        if (successCount < images.length) {
          Alert.alert(
            "Thông báo",
            `Sự kiện đã được tạo thành công! Tuy nhiên chỉ upload được ${successCount}/${images.length} ảnh.`
          );
        }
      }

      Alert.alert("Thành công", "Sự kiện đã được tạo thành công!", [
        { text: "OK", onPress: () => navigation.goBack() },
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

  const isLoading =
    eventLoading || uploading || locationsLoading || loadingSubscriptions;

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

          {/* Location Selection with Subscription Info */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Địa điểm *
            </Text>
            <TouchableOpacity
              onPress={() => setShowLocationPicker(true)}
              disabled={isLoading}
              className={`border rounded-lg p-3 flex-row items-center justify-between ${
                errors.locationId ? "border-red-300" : "border-gray-300"
              } ${isLoading ? "opacity-50" : ""}`}
            >
              <View className="flex-row items-center flex-1">
                {isLoading ? (
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
                  {isLoading ? "Đang tải..." : getSelectedLocationName()}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            {errors.locationId && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.locationId}
              </Text>
            )}

            {/* Show subscription info for selected location */}
            {formData.locationId &&
              (() => {
                const selectedLocation = getSelectedLocationInfo();
                if (!selectedLocation) return null;

                const activeSubscription = getActiveSubscription(
                  selectedLocation.premiumSubscriptions
                );

                return (
                  <View className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <View className="flex-row items-center mb-2">
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#3B82F6"
                      />
                      <Text className="ml-2 text-sm font-medium text-blue-800">
                        Địa điểm có gói đăng ký active
                      </Text>
                    </View>
                    {activeSubscription && (
                      <View className="space-y-1">
                        <Text className="text-xs text-blue-600">
                          Gói: {activeSubscription.package.name}
                        </Text>
                        <Text className="text-xs text-blue-600">
                          Còn lại:{" "}
                          {getSubscriptionRemainingDays(
                            activeSubscription.endDate
                          )}{" "}
                          ngày
                        </Text>
                        <Text className="text-xs text-blue-600">
                          Hết hạn:{" "}
                          {new Date(
                            activeSubscription.endDate
                          ).toLocaleDateString("vi-VN")}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}
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

        {/* Date & Time - Updated với separate date and time pickers */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Thời gian
          </Text>

          {/* Start Date & Time */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Ngày và giờ bắt đầu *
            </Text>

            {/* Date Selection */}
            <TouchableOpacity
              onPress={() => setStartDatePickerVisibility(true)}
              className={`border rounded-lg p-3 flex-row items-center mb-2 ${
                errors.startDate ? "border-red-300" : "border-gray-300"
              }`}
            >
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text className="ml-2 text-gray-900 flex-1">
                {formatDisplayDateOnly(formData.startDate)}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>

            {/* Time Selection */}
            <TouchableOpacity
              onPress={() => setStartTimePickerVisibility(true)}
              className={`border rounded-lg p-3 flex-row items-center ${
                errors.startDate ? "border-red-300" : "border-gray-300"
              }`}
            >
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text className="ml-2 text-gray-900 flex-1">
                {formatDisplayTimeOnly(formData.startDate)}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>

            {errors.startDate && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.startDate}
              </Text>
            )}
          </View>

          {/* End Date & Time */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Ngày và giờ kết thúc *
            </Text>

            {/* Date Selection */}
            <TouchableOpacity
              onPress={() => setEndDatePickerVisibility(true)}
              className={`border rounded-lg p-3 flex-row items-center mb-2 ${
                errors.endDate ? "border-red-300" : "border-gray-300"
              }`}
            >
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text className="ml-2 text-gray-900 flex-1">
                {formatDisplayDateOnly(formData.endDate)}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>

            {/* Time Selection */}
            <TouchableOpacity
              onPress={() => setEndTimePickerVisibility(true)}
              className={`border rounded-lg p-3 flex-row items-center ${
                errors.endDate ? "border-red-300" : "border-gray-300"
              }`}
            >
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text className="ml-2 text-gray-900 flex-1">
                {formatDisplayTimeOnly(formData.endDate)}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>

            {errors.endDate && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.endDate}
              </Text>
            )}
          </View>

          {/* Summary */}
          <View className="bg-gray-50 p-3 rounded-lg">
            <Text className="text-sm text-gray-600 mb-1">
              📅 Tóm tắt thời gian:
            </Text>
            <Text className="text-sm font-medium text-gray-800">
              Từ {formatDisplayDateTime(formData.startDate)}
            </Text>
            <Text className="text-sm font-medium text-gray-800">
              Đến {formatDisplayDateTime(formData.endDate)}
            </Text>
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

      {/* Location Picker Modal with Subscription Status */}
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

            {isLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="text-gray-500 mt-2">Đang tải địa điểm...</Text>
              </View>
            ) : userLocations && userLocations.length > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {userLocations.map((location) => {
                  const isSelected =
                    formData.locationId === location.locationId;
                  const canCreateEvent = location.canCreateEvent;
                  const activeSubscription = getActiveSubscription(
                    location.premiumSubscriptions
                  );

                  return (
                    <TouchableOpacity
                      key={location.locationId}
                      className={`p-4 rounded-lg mb-2 ${
                        isSelected
                          ? "bg-blue-50 border border-blue-200"
                          : canCreateEvent
                          ? "bg-gray-50 border border-gray-200"
                          : "bg-red-50 border border-red-200"
                      } ${!canCreateEvent ? "opacity-70" : ""}`}
                      onPress={() => handleLocationSelect(location)}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                          <Ionicons
                            name="location-outline"
                            size={20}
                            color={
                              isSelected
                                ? "#3B82F6"
                                : canCreateEvent
                                ? "#6B7280"
                                : "#EF4444"
                            }
                          />
                          <View className="ml-3 flex-1">
                            <View className="flex-row items-center">
                              <Text
                                className={`font-medium ${
                                  isSelected
                                    ? "text-blue-600"
                                    : canCreateEvent
                                    ? "text-gray-700"
                                    : "text-red-600"
                                }`}
                                numberOfLines={1}
                              >
                                {location.name}
                              </Text>
                              {canCreateEvent && (
                                <View className="ml-2 bg-green-100 px-2 py-1 rounded-full">
                                  <Text className="text-green-800 text-xs font-bold">
                                    ACTIVE
                                  </Text>
                                </View>
                              )}
                              {!canCreateEvent && (
                                <View className="ml-2 bg-red-100 px-2 py-1 rounded-full">
                                  <Text className="text-red-800 text-xs font-bold">
                                    NO SUB
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text
                              className="text-sm text-gray-500"
                              numberOfLines={1}
                            >
                              {location.address}
                            </Text>

                            {/* Subscription status */}
                            {canCreateEvent && activeSubscription && (
                              <View className="mt-1">
                                <Text className="text-xs text-green-600">
                                  Gói: {activeSubscription.package.name} • Còn{" "}
                                  {getSubscriptionRemainingDays(
                                    activeSubscription.endDate
                                  )}{" "}
                                  ngày
                                </Text>
                              </View>
                            )}

                            {!canCreateEvent && (
                              <View className="mt-1">
                                <Text className="text-xs text-red-600">
                                  Cần đăng ký gói để tạo sự kiện
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View className="flex-row items-center ml-2">
                          {isSelected && (
                            <Ionicons
                              name="checkmark"
                              size={20}
                              color="#3B82F6"
                            />
                          )}
                          {!canCreateEvent && (
                            <Ionicons
                              name="lock-closed"
                              size={16}
                              color="#EF4444"
                            />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Add subscription call-to-action */}
                {userLocations.filter((loc) => loc.canCreateEvent).length ===
                  0 && (
                  <View className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="warning" size={20} color="#F59E0B" />
                      <Text className="ml-2 text-yellow-800 font-medium">
                        Cần đăng ký gói subscription
                      </Text>
                    </View>
                    <Text className="text-yellow-700 text-sm mb-3">
                      Không có địa điểm nào có gói active để tạo sự kiện. Vui
                      lòng đăng ký gói subscription trước.
                    </Text>
                    <TouchableOpacity
                      className="bg-yellow-500 px-4 py-2 rounded-lg"
                      onPress={() => {
                        setShowLocationPicker(false);
                        navigation.navigate("VenueOwnerSubscription");
                      }}
                    >
                      <Text className="text-white font-semibold text-center">
                        Đăng ký gói ngay
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
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

      {/* Date Pickers - Only for date selection */}
      <DateTimePickerModal
        isVisible={isStartDatePickerVisible}
        mode="date"
        onConfirm={handleStartDateConfirm}
        onCancel={() => setStartDatePickerVisibility(false)}
        minimumDate={new Date()}
        date={formData.startDate}
        locale="vi_VN"
        confirmTextIOS="Xác nhận"
        cancelTextIOS="Hủy"
      />

      <DateTimePickerModal
        isVisible={isEndDatePickerVisible}
        mode="date"
        onConfirm={handleEndDateConfirm}
        onCancel={() => setEndDatePickerVisibility(false)}
        minimumDate={formData.startDate}
        date={formData.endDate}
        locale="vi_VN"
        confirmTextIOS="Xác nhận"
        cancelTextIOS="Hủy"
      />

      {/* Time Pickers - Native time pickers */}
      <TimePickerModal
        isVisible={isStartTimePickerVisible}
        onConfirm={handleStartTimeConfirm}
        onCancel={() => setStartTimePickerVisibility(false)}
        initialDate={formData.startDate}
        title="Chọn giờ bắt đầu"
      />

      <TimePickerModal
        isVisible={isEndTimePickerVisible}
        onConfirm={handleEndTimeConfirm}
        onCancel={() => setEndTimePickerVisibility(false)}
        initialDate={formData.endDate}
        title="Chọn giờ kết thúc"
      />
    </SafeAreaView>
  );
};

export default VenueOwnerCreateEventScreen;
