import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
  TextInput,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useVenueOwnerEventImages } from "../../hooks/useVenueOwnerEventImages";
import { ImageResponse } from "../../services/venueOwnerImageService.ts";

const { width: screenWidth } = Dimensions.get("window");
const imageSize = (screenWidth - 48) / 2; // 2 columns with padding

interface EventImagesScreenProps {
  navigation: any;
  route: {
    params: {
      eventId: number;
      eventName?: string;
    };
  };
}

const VenueOwnerEventImagesScreen: React.FC<EventImagesScreenProps> = ({
  navigation,
  route,
}) => {
  const { eventId, eventName } = route.params;

  // Hooks
  const {
    images,
    primaryImage,
    loading,
    error,
    uploadImage,
    uploadMultipleImages,
    setPrimaryImage,
    deleteImage,
    updateImage,
    refresh,
    clearError,
  } = useVenueOwnerEventImages(eventId);

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageResponse | null>(
    null
  );
  const [showEditModal, setShowEditModal] = useState(false);
  const [editCaption, setEditCaption] = useState("");
  const [uploading, setUploading] = useState(false);

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
        mediaTypes: "images",
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10 - images.length, // Max 10 images total
      });

      if (!result.canceled && result.assets) {
        setUploading(true);

        try {
          const imageUris = result.assets.map((asset) => asset.uri);
          const primaryIndex = images.length === 0 ? 0 : undefined; // Set first as primary if no images exist

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
          const isPrimary = images.length === 0; // Set as primary if no images exist
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

  // Image actions
  const handleImagePress = (image: ImageResponse) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  const handleSetPrimary = async (imageId: number) => {
    try {
      const success = await setPrimaryImage(imageId);
      if (success) {
        Alert.alert("Thành công", "Đã đặt làm ảnh chính");
        setShowImageModal(false);
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể đặt làm ảnh chính");
    }
  };

  const handleEditImage = (image: ImageResponse) => {
    setSelectedImage(image);
    setEditCaption(image.caption || "");
    setShowEditModal(true);
    setShowImageModal(false);
  };

  const handleUpdateImage = async () => {
    if (!selectedImage) return;

    try {
      await updateImage(selectedImage.id, { caption: editCaption.trim() });
      Alert.alert("Thành công", "Đã cập nhật thông tin ảnh");
      setShowEditModal(false);
      setSelectedImage(null);
      setEditCaption("");
    } catch (error) {
      Alert.alert("Lỗi", "Không thể cập nhật ảnh");
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    Alert.alert("Xóa ảnh", "Bạn có chắc chắn muốn xóa ảnh này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          try {
            const success = await deleteImage(imageId);
            if (success) {
              Alert.alert("Thành công", "Đã xóa ảnh");
              setShowImageModal(false);
            }
          } catch (error) {
            Alert.alert("Lỗi", "Không thể xóa ảnh");
          }
        },
      },
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (error) {
      console.error("❌ Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-row items-center flex-1"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
            <View className="ml-2 flex-1">
              <Text
                className="text-lg font-medium text-gray-900"
                numberOfLines={1}
              >
                Ảnh sự kiện
              </Text>
              {eventName && (
                <Text className="text-sm text-gray-500" numberOfLines={1}>
                  {eventName}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={showImageOptions}
            disabled={images.length >= 10 || uploading}
            className={`px-4 py-2 rounded-lg ${
              images.length >= 10 || uploading ? "bg-gray-300" : "bg-blue-500"
            }`}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text
                className={`font-semibold ${
                  images.length >= 10 ? "text-gray-500" : "text-white"
                }`}
              >
                Thêm ảnh
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading state */}
      {loading && images.length === 0 && (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">Đang tải ảnh...</Text>
        </View>
      )}

      {/* Error state */}
      {error && images.length === 0 && (
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
              refresh();
            }}
          >
            <Text className="text-white font-semibold">Thử lại</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Images Grid */}
      {!loading || images.length > 0 ? (
        <ScrollView
          className="flex-1 p-4"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#3B82F6"
            />
          }
        >
          {images.length > 0 ? (
            <>
              {/* Image count info */}
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-semibold text-gray-900">
                  {images.length} ảnh
                </Text>
                <Text className="text-sm text-gray-500">Tối đa 10 ảnh</Text>
              </View>

              {/* Primary image section */}
              {primaryImage && (
                <View className="mb-6">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Ảnh chính
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleImagePress(primaryImage)}
                    className="relative"
                  >
                    <Image
                      source={{ uri: primaryImage.url }}
                      className="w-full h-48 rounded-lg"
                      resizeMode="cover"
                    />
                    <View className="absolute top-2 left-2 bg-blue-500 px-3 py-1 rounded-full">
                      <Text className="text-white text-sm font-medium">
                        Ảnh chính
                      </Text>
                    </View>
                    {primaryImage.caption && (
                      <View className="absolute bottom-2 left-2 right-2 bg-black/70 p-2 rounded">
                        <Text className="text-white text-sm" numberOfLines={2}>
                          {primaryImage.caption}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* All images grid */}
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Tất cả ảnh
              </Text>
              <View className="flex-row flex-wrap justify-between">
                {images.map((image) => (
                  <TouchableOpacity
                    key={image.id}
                    onPress={() => handleImagePress(image)}
                    className="relative mb-3"
                    style={{ width: imageSize, height: imageSize }}
                  >
                    <Image
                      source={{ uri: image.url }}
                      className="w-full h-full rounded-lg"
                      resizeMode="cover"
                    />

                    {/* Primary badge */}
                    {image.isPrimary && (
                      <View className="absolute top-1 left-1 bg-blue-500 px-2 py-1 rounded">
                        <Text className="text-white text-xs font-bold">
                          Chính
                        </Text>
                      </View>
                    )}

                    {/* Caption overlay */}
                    {image.caption && (
                      <View className="absolute bottom-0 left-0 right-0 bg-black/70 p-1 rounded-b-lg">
                        <Text className="text-white text-xs" numberOfLines={1}>
                          {image.caption}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            /* Empty state */
            <View className="flex-1 justify-center items-center py-16">
              <View className="bg-gray-100 p-6 rounded-full mb-4">
                <Ionicons name="images-outline" size={48} color="#6B7280" />
              </View>
              <Text className="text-xl font-medium text-gray-900 mb-2">
                Chưa có ảnh nào
              </Text>
              <Text className="text-gray-500 text-center mb-6 max-w-xs">
                Thêm ảnh để sự kiện của bạn trở nên hấp dẫn hơn với khách hàng
              </Text>
              <TouchableOpacity
                onPress={showImageOptions}
                disabled={uploading}
                className={`px-6 py-3 rounded-lg ${
                  uploading ? "bg-gray-300" : "bg-blue-500"
                }`}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text className="text-white font-semibold">
                    Thêm ảnh đầu tiên
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      ) : null}

      {/* Image Detail Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View className="flex-1 bg-black">
          <SafeAreaView className="flex-1">
            {/* Header */}
            <View className="absolute top-12 left-4 right-4 z-10 flex-row justify-between items-center">
              <TouchableOpacity
                onPress={() => setShowImageModal(false)}
                className="bg-black/50 p-2 rounded-full"
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>

              <View className="flex-row space-x-2">
                {selectedImage && !selectedImage.isPrimary && (
                  <TouchableOpacity
                    onPress={() => handleSetPrimary(selectedImage.id)}
                    className="bg-blue-500 px-3 py-2 rounded-lg"
                  >
                    <Text className="text-white text-sm font-medium">
                      Đặt chính
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={() =>
                    selectedImage && handleEditImage(selectedImage)
                  }
                  className="bg-black/50 p-2 rounded-full"
                >
                  <Ionicons name="pencil" size={20} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    selectedImage && handleDeleteImage(selectedImage.id)
                  }
                  className="bg-red-500 p-2 rounded-full"
                >
                  <Ionicons name="trash" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Image */}
            {selectedImage && (
              <View className="flex-1 justify-center items-center">
                <Image
                  source={{ uri: selectedImage.url }}
                  className="w-full h-full"
                  resizeMode="contain"
                />
              </View>
            )}

            {/* Image Info */}
            {selectedImage && (
              <View className="absolute bottom-8 left-4 right-4 bg-black/70 p-4 rounded-lg">
                {selectedImage.isPrimary && (
                  <View className="bg-blue-500 px-3 py-1 rounded-full self-start mb-2">
                    <Text className="text-white text-sm font-medium">
                      Ảnh chính
                    </Text>
                  </View>
                )}

                {selectedImage.caption && (
                  <Text className="text-white mb-2">
                    {selectedImage.caption}
                  </Text>
                )}

                <Text className="text-gray-300 text-sm">
                  Tải lên: {formatDate(selectedImage.createdAt)}
                </Text>
              </View>
            )}
          </SafeAreaView>
        </View>
      </Modal>

      {/* Edit Image Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowEditModal(false)}
        >
          <Pressable className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-gray-900">
                Chỉnh sửa ảnh
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Image preview */}
            {selectedImage && (
              <View className="mb-4">
                <Image
                  source={{ uri: selectedImage.url }}
                  className="w-full h-32 rounded-lg"
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Caption input */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Mô tả ảnh
              </Text>
              <TextInput
                value={editCaption}
                onChangeText={setEditCaption}
                placeholder="Nhập mô tả cho ảnh..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="border border-gray-300 rounded-lg p-3 text-gray-900"
                maxLength={200}
              />
              <Text className="text-gray-500 text-xs mt-1">
                {editCaption.length}/200 ký tự
              </Text>
            </View>

            {/* Actions */}
            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                className="flex-1 bg-gray-200 py-3 rounded-lg"
              >
                <Text className="text-gray-800 text-center font-medium">
                  Hủy
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleUpdateImage}
                className="flex-1 bg-blue-500 py-3 rounded-lg"
              >
                <Text className="text-white text-center font-medium">Lưu</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default VenueOwnerEventImagesScreen;
