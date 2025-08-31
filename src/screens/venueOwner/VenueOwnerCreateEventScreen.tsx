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
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Auto-fill pricing when location is selected
  useEffect(() => {
    if (formData.locationId) {
      const selectedLocation = userLocations.find(
        (loc) => loc.locationId === formData.locationId
      );

      if (selectedLocation?.hourlyRate) {
        // Auto-fill original price from location's hourly rate
        updateFormData("originalPrice", selectedLocation.hourlyRate.toString());
        console.log(
          "Auto-filled original price from location:",
          selectedLocation.hourlyRate
        );
      }
    }
  }, [formData.locationId, userLocations]);

  // Load locations on mount
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

  // Validation function - trực tiếp trong component
  const validateFormData = () => {
    const newErrors: Record<string, string> = {};

    // Location
    if (!formData.locationId) {
      newErrors.locationId = "Vui lòng chọn địa điểm";
    } else {
      const selectedLocation = userLocations.find(
        (loc) => loc.locationId === formData.locationId
      );
      if (selectedLocation && !selectedLocation.canCreateEvent) {
        newErrors.locationId = "Địa điểm này không có gói subscription active";
      }
    }

    // Name
    if (!formData.name.trim()) {
      newErrors.name = "Tên sự kiện không được để trống";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Tên sự kiện phải có ít nhất 3 ký tự";
    } else if (formData.name.trim().length > 255) {
      newErrors.name = "Tên sự kiện không được quá 255 ký tự";
    }

    // Description
    if (formData.description.length > 1000) {
      newErrors.description = "Mô tả không được quá 1000 ký tự";
    }

    // Dates
    const now = new Date();
    if (formData.startDate < now) {
      newErrors.startDate = "Ngày bắt đầu phải trong tương lai";
    }
    if (formData.endDate <= formData.startDate) {
      newErrors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
    }

    // Duration check (không quá 30 ngày)
    if (formData.startDate && formData.endDate) {
      const durationDays =
        (formData.endDate.getTime() - formData.startDate.getTime()) /
        (1000 * 60 * 60 * 24);
      if (durationDays > 30) {
        newErrors.endDate = "Sự kiện không thể kéo dài quá 30 ngày";
      }
    }

    // Prices - chỉ validate discountedPrice vì originalPrice là read-only
    if (formData.discountedPrice) {
      const discountedPrice = parseFloat(formData.discountedPrice);
      if (isNaN(discountedPrice) || discountedPrice < 0) {
        newErrors.discountedPrice = "Giá khuyến mãi phải là số dương";
      } else if (discountedPrice > 100000000) {
        newErrors.discountedPrice =
          "Giá khuyến mãi quá cao (tối đa 100 triệu VND)";
      }

      // So sánh với giá gốc
      if (formData.originalPrice) {
        const originalPrice = parseFloat(formData.originalPrice);
        if (!isNaN(originalPrice) && discountedPrice >= originalPrice) {
          newErrors.discountedPrice = "Giá khuyến mãi phải nhỏ hơn giá gốc";
        }
      }
    }

    // Kiểm tra phải có giá gốc (từ địa điểm)
    if (!formData.originalPrice) {
      newErrors.locationId = "Địa điểm phải có giá thuê để tạo sự kiện";
    }

    // Capacity
    const maxPhotographers = parseInt(formData.maxPhotographers);
    if (
      isNaN(maxPhotographers) ||
      maxPhotographers < 1 ||
      maxPhotographers > 1000
    ) {
      newErrors.maxPhotographers = "Số nhiếp ảnh gia phải từ 1-1000";
    }

    const maxBookingsPerSlot = parseInt(formData.maxBookingsPerSlot);
    if (
      isNaN(maxBookingsPerSlot) ||
      maxBookingsPerSlot < 1 ||
      maxBookingsPerSlot > 100
    ) {
      newErrors.maxBookingsPerSlot = "Số booking/slot phải từ 1-100";
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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

  // Input handlers với validation
  const handlePriceChange = (text: string) => {
    // Chỉ cho phép số và dấu thập phân
    const cleaned = text.replace(/[^\d.]/g, "");

    // Chỉ 1 dấu thập phân
    const parts = cleaned.split(".");
    let formatted = parts[0];
    if (parts.length > 1) {
      formatted += "." + parts[1].substring(0, 2);
    }

    // Giới hạn 100 triệu
    const num = parseFloat(formatted);
    if (num > 100000000) {
      formatted = "100000000";
    }

    updateFormData("discountedPrice", formatted);

    // Clear error khi user đang nhập
    if (formErrors.discountedPrice) {
      setFormErrors((prev) => ({ ...prev, discountedPrice: "" }));
    }
  };

  const handleIntegerChange =
    (field: "maxPhotographers" | "maxBookingsPerSlot") => (text: string) => {
      const cleaned = text.replace(/[^\d]/g, "");
      const maxValue = field === "maxPhotographers" ? 1000 : 100;

      if (cleaned && parseInt(cleaned) > maxValue) {
        updateFormData(field, maxValue.toString());
      } else {
        updateFormData(field, cleaned);
      }

      // Clear error khi user đang nhập
      if (formErrors[field]) {
        setFormErrors((prev) => ({ ...prev, [field]: "" }));
      }
    };

  const handleNameChange = (text: string) => {
    if (text.length <= 255) {
      updateFormData("name", text);
      // Clear error khi user đang nhập
      if (formErrors.name) {
        setFormErrors((prev) => ({ ...prev, name: "" }));
      }
    }
  };

  const handleDescriptionChange = (text: string) => {
    if (text.length <= 1000) {
      updateFormData("description", text);
      // Clear error khi user đang nhập
      if (formErrors.description) {
        setFormErrors((prev) => ({ ...prev, description: "" }));
      }
    }
  };

  // Auto-fill pricing from selected location
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

    // Always update original price from location's hourly rate
    if (location.hourlyRate) {
      updateFormData("originalPrice", location.hourlyRate.toString());
      console.log(
        "Set original price from location hourly rate:",
        location.hourlyRate
      );
    } else {
      // Clear original price if location has no hourly rate
      updateFormData("originalPrice", "");
    }

    setShowLocationPicker(false);
  };

  // Event handlers
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
      // Validate form trước khi submit
      if (!validateFormData()) {
        Alert.alert("Lỗi", "Vui lòng kiểm tra lại thông tin");
        return;
      }

      setUploading(true);

      const { startDate, endDate } = getFormattedDatesForAPI();

      console.log("Original dates:", {
        startDate: formData.startDate,
        endDate: formData.endDate,
      });

      console.log("Formatted dates for API:", {
        startDate,
        endDate,
      });

      // Auto-fill discounted price if empty (use original price)
      const finalDiscountedPrice = formData.discountedPrice
        ? parseFloat(formData.discountedPrice)
        : formData.originalPrice
        ? parseFloat(formData.originalPrice)
        : undefined;

      const eventData: CreateEventRequest = {
        locationId: formData.locationId!,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        startDate,
        endDate,
        discountedPrice: finalDiscountedPrice,
        originalPrice: formData.originalPrice
          ? parseFloat(formData.originalPrice)
          : undefined,
        maxPhotographers: parseInt(formData.maxPhotographers),
        maxBookingsPerSlot: parseInt(formData.maxBookingsPerSlot),
      };

      console.log("Event data being sent to API:", eventData);

      const createdEvent = await createEvent(eventData);
      if (!createdEvent) throw new Error("Không thể tạo sự kiện");

      console.log("Event created successfully:", createdEvent);

      // Upload images if any
      if (images.length > 0) {
        console.log("Uploading", images.length, "images...");

        const uploadPromises = images.map(async (image, index) => {
          try {
            const isPrimary = primaryImageIndex === index;
            const result = await venueOwnerImageService.uploadEventImage(
              createdEvent.eventId,
              image.uri,
              isPrimary,
              `Event ${createdEvent.name} - Image ${index + 1}`
            );
            console.log(`Image ${index + 1} uploaded:`, result?.url);
            return result;
          } catch (error) {
            console.error(`Failed to upload image ${index + 1}:`, error);
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
      console.error("Create event error:", error);
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

  // Có lỗi hay không
  const hasErrors = Object.keys(formErrors).length > 0;

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
            disabled={isLoading || hasErrors}
            className={`px-4 py-2 rounded-lg ${
              isLoading || hasErrors ? "bg-gray-300" : "bg-blue-500"
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
              disabled={isLoading}
              className={`border rounded-lg p-3 flex-row items-center justify-between ${
                formErrors.locationId ? "border-red-300" : "border-gray-300"
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
            {formErrors.locationId && (
              <Text className="text-red-500 text-sm mt-1">
                {formErrors.locationId}
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
              onChangeText={handleNameChange}
              placeholder="Nhập tên sự kiện..."
              className={`border rounded-lg p-3 text-gray-900 ${
                formErrors.name ? "border-red-300" : "border-gray-300"
              }`}
              maxLength={255}
            />
            {formErrors.name && (
              <Text className="text-red-500 text-sm mt-1">
                {formErrors.name}
              </Text>
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
              onChangeText={handleDescriptionChange}
              placeholder="Mô tả chi tiết về sự kiện..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className={`border rounded-lg p-3 text-gray-900 ${
                formErrors.description ? "border-red-300" : "border-gray-300"
              }`}
              maxLength={1000}
            />
            {formErrors.description && (
              <Text className="text-red-500 text-sm mt-1">
                {formErrors.description}
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

          {/* Start Date & Time */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Ngày và giờ bắt đầu *
            </Text>

            {/* Date Selection */}
            <TouchableOpacity
              onPress={() => setStartDatePickerVisibility(true)}
              className={`border rounded-lg p-3 flex-row items-center mb-2 ${
                formErrors.startDate ? "border-red-300" : "border-gray-300"
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
                formErrors.startDate ? "border-red-300" : "border-gray-300"
              }`}
            >
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text className="ml-2 text-gray-900 flex-1">
                {formatDisplayTimeOnly(formData.startDate)}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>

            {formErrors.startDate && (
              <Text className="text-red-500 text-sm mt-1">
                {formErrors.startDate}
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
                formErrors.endDate ? "border-red-300" : "border-gray-300"
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
                formErrors.endDate ? "border-red-300" : "border-gray-300"
              }`}
            >
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text className="ml-2 text-gray-900 flex-1">
                {formatDisplayTimeOnly(formData.endDate)}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#6B7280" />
            </TouchableOpacity>

            {formErrors.endDate && (
              <Text className="text-red-500 text-sm mt-1">
                {formErrors.endDate}
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

        {/* Improved Pricing Section */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Giá cả
          </Text>

          {/* Show location hourly rate info */}
          {formData.locationId &&
            (() => {
              const selectedLocation = getSelectedLocationInfo();
              if (selectedLocation?.hourlyRate) {
                return (
                  <View className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <View className="flex-row items-center">
                      <Ionicons
                        name="information-circle"
                        size={16}
                        color="#3B82F6"
                      />
                      <Text className="ml-2 text-sm text-blue-800">
                        Giá thuê địa điểm:{" "}
                        {selectedLocation.hourlyRate.toLocaleString("vi-VN")}{" "}
                        VND/giờ
                      </Text>
                    </View>
                    <Text className="text-xs text-blue-600 mt-1">
                      Giá gốc đã được tự động điền dựa trên giá thuê địa điểm
                    </Text>
                  </View>
                );
              }
              return null;
            })()}

          <View className="flex-row space-x-3">
            {/* Original Price - Read Only */}
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Giá gốc (VND)
              </Text>
              <View className="border rounded-lg p-3 bg-gray-100 flex-row items-center justify-between">
                <Text className="text-gray-900 font-medium">
                  {formData.originalPrice
                    ? `${parseFloat(formData.originalPrice).toLocaleString(
                        "vi-VN"
                      )} VND`
                    : formData.locationId
                    ? (() => {
                        const selectedLocation = getSelectedLocationInfo();
                        return selectedLocation?.hourlyRate
                          ? `${selectedLocation.hourlyRate.toLocaleString(
                              "vi-VN"
                            )} VND`
                          : "Chưa có giá";
                      })()
                    : "Chưa chọn địa điểm"}
                </Text>
                <Ionicons name="lock-closed" size={16} color="#6B7280" />
              </View>
              <Text className="text-gray-500 text-xs mt-1">
                Giá tự động lấy từ giá thuê địa điểm
              </Text>
            </View>

            {/* Discounted Price */}
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Giá khuyến mãi (VND)
              </Text>
              <TextInput
                value={formData.discountedPrice}
                onChangeText={handlePriceChange}
                placeholder={
                  formData.originalPrice || "Để trống nếu không có KM"
                }
                keyboardType="numeric"
                className={`border rounded-lg p-3 text-gray-900 ${
                  formErrors.discountedPrice
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
              {formErrors.discountedPrice && (
                <Text className="text-red-500 text-xs mt-1">
                  {formErrors.discountedPrice}
                </Text>
              )}
              <Text className="text-gray-500 text-xs mt-1">
                Phải nhỏ hơn giá gốc
              </Text>
            </View>
          </View>

          {/* Price Summary */}
          {(formData.originalPrice || formData.discountedPrice) && (
            <View className="mt-4 p-3 bg-gray-50 rounded-lg">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                💰 Tóm tắt giá:
              </Text>

              {formData.originalPrice && (
                <View className="flex-row justify-between items-center mb-1">
                  <Text className="text-sm text-gray-600">Giá gốc:</Text>
                  <Text className="text-sm font-medium text-gray-800">
                    {parseFloat(formData.originalPrice).toLocaleString("vi-VN")}{" "}
                    VND
                  </Text>
                </View>
              )}

              {formData.discountedPrice ? (
                <View>
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-sm text-gray-600">
                      Giá khuyến mãi:
                    </Text>
                    <Text className="text-sm font-medium text-green-600">
                      {parseFloat(formData.discountedPrice).toLocaleString(
                        "vi-VN"
                      )}{" "}
                      VND
                    </Text>
                  </View>
                  {formData.originalPrice && (
                    <View className="flex-row justify-between items-center">
                      <Text className="text-sm text-gray-600">Tiết kiệm:</Text>
                      <Text className="text-sm font-medium text-red-600">
                        -
                        {(
                          parseFloat(formData.originalPrice) -
                          parseFloat(formData.discountedPrice)
                        ).toLocaleString("vi-VN")}{" "}
                        VND (
                        {Math.round(
                          ((parseFloat(formData.originalPrice) -
                            parseFloat(formData.discountedPrice)) /
                            parseFloat(formData.originalPrice)) *
                            100
                        )}
                        %)
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                formData.originalPrice && (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-sm text-gray-600">Giá sự kiện:</Text>
                    <Text className="text-sm font-medium text-blue-600">
                      {parseFloat(formData.originalPrice).toLocaleString(
                        "vi-VN"
                      )}{" "}
                      VND
                    </Text>
                  </View>
                )
              )}
            </View>
          )}

          <Text className="text-gray-500 text-xs mt-2">
            💡 Nếu không nhập giá khuyến mãi, hệ thống sẽ sử dụng giá gốc làm
            giá sự kiện
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
                onChangeText={handleIntegerChange("maxPhotographers")}
                placeholder="5"
                keyboardType="numeric"
                className={`border rounded-lg p-3 text-gray-900 ${
                  formErrors.maxPhotographers
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
              {formErrors.maxPhotographers && (
                <Text className="text-red-500 text-xs mt-1">
                  {formErrors.maxPhotographers}
                </Text>
              )}
              <Text className="text-gray-500 text-xs mt-1">
                Từ 1-1000 người
              </Text>
            </View>

            {/* Max Bookings Per Slot */}
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Booking tối đa/slot *
              </Text>
              <TextInput
                value={formData.maxBookingsPerSlot}
                onChangeText={handleIntegerChange("maxBookingsPerSlot")}
                placeholder="3"
                keyboardType="numeric"
                className={`border rounded-lg p-3 text-gray-900 ${
                  formErrors.maxBookingsPerSlot
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
              {formErrors.maxBookingsPerSlot && (
                <Text className="text-red-500 text-xs mt-1">
                  {formErrors.maxBookingsPerSlot}
                </Text>
              )}
              <Text className="text-gray-500 text-xs mt-1">
                Từ 1-100 booking
              </Text>
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

                            {/* Show hourly rate for location */}
                            {location.hourlyRate && (
                              <Text className="text-xs text-green-600 mt-1">
                                Giá thuê:{" "}
                                {location.hourlyRate.toLocaleString("vi-VN")}{" "}
                                VND/giờ
                              </Text>
                            )}

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

      {/* Date Pickers */}
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

      {/* Time Pickers */}
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
