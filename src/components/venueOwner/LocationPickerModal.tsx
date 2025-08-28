import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useVenueLocation } from "../../hooks/useVenueLocation";

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelected: (locationData: {
    latitude?: number;
    longitude?: number;
    address?: string;
    placeName?: string;
    placeId?: string;
  }) => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  onClose,
  onLocationSelected,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [manualAddress, setManualAddress] = useState("");
  const [selectedLocationData, setSelectedLocationData] = useState<{
    latitude?: number;
    longitude?: number;
    address?: string;
    placeName?: string;
    placeId?: string;
  } | null>(null);

  const {
    currentLocation,
    loading: locationLoading,
    error: locationError,
    getCurrentLocation,
    clearLocation,
    clearError: clearLocationError,
  } = useVenueLocation();

  // Handle current location
  const handleGetCurrentLocation = async () => {
    clearLocationError();
    const coordinates = await getCurrentLocation();

    if (coordinates) {
      const locationData = {
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        address:
          manualAddress ||
          `${coordinates.latitude.toFixed(6)}, ${coordinates.longitude.toFixed(
            6
          )}`,
        placeName: "Vị trí hiện tại",
      };

      setSelectedLocationData(locationData);
    }
  };

  // Handle manual address input with current location
  const handleManualAddressWithLocation = async () => {
    if (!manualAddress.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập địa chỉ");
      return;
    }

    // Try to get current location for coordinates
    clearLocationError();
    const coordinates = await getCurrentLocation();

    const locationData = {
      latitude: coordinates?.latitude,
      longitude: coordinates?.longitude,
      address: manualAddress,
      placeName: manualAddress,
    };

    setSelectedLocationData(locationData);
  };

  // Handle address only (without coordinates)
  const handleAddressOnly = () => {
    if (!manualAddress.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập địa chỉ");
      return;
    }

    const locationData = {
      address: manualAddress,
      placeName: manualAddress,
    };

    setSelectedLocationData(locationData);
  };

  // Handle confirm selection
  const handleConfirm = () => {
    if (selectedLocationData) {
      onLocationSelected(selectedLocationData);
      handleClose();
    } else {
      Alert.alert("Lỗi", "Vui lòng chọn một vị trí trước khi xác nhận");
    }
  };

  // Handle close
  const handleClose = () => {
    setSearchQuery("");
    setManualAddress("");
    setSelectedLocationData(null);
    clearLocation();
    clearLocationError();
    onClose();
  };

  const renderError = (error: string) => (
    <View className="bg-red-50 p-4 rounded-xl border border-red-200 mx-4 my-2">
      <View className="flex-row items-center">
        <Ionicons name="warning" size={20} color="#EF4444" />
        <Text className="text-red-800 ml-2 flex-1">{error}</Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row justify-between items-center px-6 py-4 border-b border-gray-100">
          <TouchableOpacity onPress={handleClose}>
            <Text className="text-blue-600 font-semibold text-base">Hủy</Text>
          </TouchableOpacity>

          <Text className="text-xl font-bold text-gray-900">Chọn vị trí</Text>

          <TouchableOpacity
            onPress={handleConfirm}
            disabled={!selectedLocationData}
          >
            <Text
              className={`font-semibold text-base ${
                selectedLocationData ? "text-blue-600" : "text-gray-400"
              }`}
            >
              Xác nhận
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
          {/* Current Location Section */}
          <View className="bg-white p-4 border-b border-gray-100">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              Vị trí hiện tại
            </Text>

            <TouchableOpacity
              onPress={handleGetCurrentLocation}
              disabled={locationLoading}
              className={`flex-row items-center p-4 rounded-xl border-2 ${
                selectedLocationData?.placeName === "Vị trí hiện tại"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <View
                className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                  selectedLocationData?.placeName === "Vị trí hiện tại"
                    ? "bg-blue-500"
                    : "bg-gray-400"
                }`}
              >
                {locationLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Ionicons name="location" size={24} color="white" />
                )}
              </View>

              <View className="flex-1">
                <Text
                  className={`font-semibold text-base ${
                    selectedLocationData?.placeName === "Vị trí hiện tại"
                      ? "text-blue-600"
                      : "text-gray-900"
                  }`}
                >
                  Sử dụng vị trí hiện tại
                </Text>
                <Text className="text-gray-600 text-sm mt-1">
                  {locationLoading
                    ? "Đang lấy vị trí..."
                    : "Tự động xác định vị trí của bạn"}
                </Text>
                {currentLocation && (
                  <Text className="text-gray-500 text-xs mt-1">
                    {currentLocation.latitude.toFixed(6)},{" "}
                    {currentLocation.longitude.toFixed(6)}
                  </Text>
                )}
              </View>

              {selectedLocationData?.placeName === "Vị trí hiện tại" && (
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              )}
            </TouchableOpacity>
          </View>

          {/* Location Error */}
          {locationError && renderError(locationError)}

          {/* Manual Address Section */}
          <View className="bg-white p-4 border-b border-gray-100">
            <Text className="text-lg font-bold text-gray-900 mb-3">
              Nhập địa chỉ thủ công
            </Text>

            <View className="space-y-3">
              <TextInput
                value={manualAddress}
                onChangeText={setManualAddress}
                placeholder="Nhập địa chỉ đầy đủ..."
                multiline
                numberOfLines={3}
                className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-base"
                style={{ textAlignVertical: "top" }}
              />

              <View className="flex-row space-x-3">
                <TouchableOpacity
                  onPress={handleManualAddressWithLocation}
                  disabled={!manualAddress.trim() || locationLoading}
                  className={`flex-1 py-3 px-4 rounded-xl flex-row items-center justify-center ${
                    manualAddress.trim() && !locationLoading
                      ? "bg-blue-500"
                      : "bg-gray-300"
                  }`}
                >
                  {locationLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons name="location" size={16} color="white" />
                      <Text className="text-white font-medium ml-2 text-sm">
                        Kèm tọa độ GPS
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleAddressOnly}
                  disabled={!manualAddress.trim()}
                  className={`flex-1 py-3 px-4 rounded-xl flex-row items-center justify-center ${
                    manualAddress.trim() ? "bg-gray-500" : "bg-gray-300"
                  }`}
                >
                  <Ionicons name="text" size={16} color="white" />
                  <Text className="text-white font-medium ml-2 text-sm">
                    Chỉ địa chỉ
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Selected Location Summary */}
          {selectedLocationData && (
            <View className="bg-green-50 border-t border-green-200 p-4">
              <View className="flex-row items-start">
                <View className="w-8 h-8 bg-green-500 rounded-full items-center justify-center mr-3 mt-1">
                  <Ionicons name="checkmark" size={16} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-green-900 text-base mb-1">
                    Đã chọn vị trí
                  </Text>
                  <Text className="text-green-800 text-sm mb-1">
                    {selectedLocationData.placeName || "Vị trí đã chọn"}
                  </Text>
                  {selectedLocationData.address && (
                    <Text
                      className="text-green-700 text-xs mb-2"
                      numberOfLines={3}
                    >
                      {selectedLocationData.address}
                    </Text>
                  )}
                  {selectedLocationData.latitude &&
                    selectedLocationData.longitude && (
                      <Text className="text-green-600 text-xs">
                        Tọa độ: {selectedLocationData.latitude.toFixed(6)},{" "}
                        {selectedLocationData.longitude.toFixed(6)}
                      </Text>
                    )}
                </View>
              </View>
            </View>
          )}

          {/* Info Section */}
          <View className="p-4">
            <View className="bg-blue-50 p-4 rounded-xl border border-blue-200">
              <View className="flex-row items-start">
                <View className="w-8 h-8 bg-blue-500 rounded-full items-center justify-center mr-3 mt-0.5">
                  <Ionicons name="information" size={16} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-blue-900 font-semibold mb-2">
                    Lưu ý về vị trí
                  </Text>
                  <Text className="text-blue-800 text-sm leading-relaxed">
                    • Vị trí hiện tại: Sử dụng GPS để lấy tọa độ chính xác{"\n"}
                    • Kèm tọa độ GPS: Nhập địa chỉ và lấy thêm tọa độ hiện tại
                    {"\n"}• Chỉ địa chỉ: Chỉ lưu địa chỉ văn bản, không có tọa
                    độ
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="pb-6" />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};
