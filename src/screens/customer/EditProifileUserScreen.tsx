import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  Alert,
  Image,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { RootStackNavigationProp } from "../../navigation/types";
import { useAuth } from "../../hooks/useAuth";
import { useUserStyle } from "../../hooks/useUserStyle";
import { userService } from "../../services/userService";
import FieldEditModal from "../../components/Photographer/FileEditModal";
import { getResponsiveSize } from "../../utils/responsive";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: screenWidth } = Dimensions.get("window");

interface ProfileField {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  placeholder: string;
  question: string;
  description: string;
  maxLength: number;
  fieldType: "text" | "number" | "select";
  options?: string[];
}

const EditProfileCustomerScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user, updateProfile, getCurrentUserId } = useAuth();

  // Use UserStyle hook
  const {
    userStyles,
    allStyles,
    selectedStyleIds,
    loading: stylesLoading,
    saving: stylesSaving,
    error: stylesError,
    canAddMoreStyles,
    getSelectedStyleNames,
    loadUserStyles,
    loadAllStyles,
    toggleStyle,
    resetError,
  } = useUserStyle();

  // Local state
  const [selectedField, setSelectedField] = useState<ProfileField | null>(null);
  const [isFieldModalVisible, setIsFieldModalVisible] = useState(false);
  const [isStyleModalVisible, setIsStyleModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Form data state
  const [profileData, setProfileData] = useState<ProfileField[]>([
    {
      id: "fullName",
      icon: "person-outline",
      title: "Họ và tên",
      value: "",
      placeholder: "VD: Nguyễn Văn An",
      question: "Tên đầy đủ của bạn là gì?",
      description: "Nhập họ và tên đầy đủ của bạn để hiển thị trên hồ sơ.",
      maxLength: 50,
      fieldType: "text",
    },
    {
      id: "phoneNumber",
      icon: "call-outline",
      title: "Số điện thoại",
      value: "",
      placeholder: "VD: 0901234567",
      question: "Số điện thoại của bạn?",
      description: "Nhập số điện thoại để liên lạc khi cần thiết.",
      maxLength: 15,
      fieldType: "text",
    },
    {
      id: "bio",
      icon: "briefcase-outline",
      title: "Công việc/Giới thiệu",
      value: "",
      placeholder: "VD: Nhân viên IT, thích chụp ảnh phong cảnh",
      question: "Hãy giới thiệu về bản thân?",
      description: "Chia sẻ về công việc, sở thích hoặc điều thú vị về bạn.",
      maxLength: 200,
      fieldType: "text",
    },
  ]);

  useEffect(() => {
    if (user) {
      populateFormData();
      initializeStyles();
    }
  }, [user]);

  const initializeStyles = async () => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      // Load all styles and user's styles
      await loadAllStyles();
      await loadUserStyles(userId);
    } catch (error) {
      console.error("❌ Error initializing styles:", error);
    }
  };

  const populateFormData = () => {
    if (!user) return;

    setProfileData((prev) =>
      prev.map((field) => {
        switch (field.id) {
          case "fullName":
            return { ...field, value: user.fullName || "" };
          case "phoneNumber":
            return { ...field, value: user.phoneNumber || "" };
          case "bio":
            return { ...field, value: user.bio || "" };
          default:
            return field;
        }
      })
    );

    // Set profile image
    setProfileImage(user.profileImage || null);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleFieldPress = (field: ProfileField) => {
    setSelectedField(field);
    setIsFieldModalVisible(true);
  };

  const handleSaveField = (fieldId: string, value: string) => {
    setProfileData((prev) =>
      prev.map((item) =>
        item.id === fieldId ? { ...item, value: value } : item
      )
    );
    setIsFieldModalVisible(false);
    setSelectedField(null);
  };

  const handleStylePress = () => {
    setIsStyleModalVisible(true);
  };

  const handleToggleStyle = async (styleId: number) => {
    const userId = getCurrentUserId();
    if (!userId) return;

    try {
      resetError(); // Clear any previous errors
      await toggleStyle(userId, styleId);
    } catch (error) {
      console.error("❌ Error toggling style:", error);
      Alert.alert("Lỗi", "Không thể cập nhật sở thích. Vui lòng thử lại.");
    }
  };

  const handleImagePress = () => {
    Alert.alert("Chọn ảnh đại diện", "Bạn muốn chọn ảnh từ đâu?", [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Thư viện ảnh",
        onPress: () => pickImageFromLibrary(),
      },
      {
        text: "Chụp ảnh mới",
        onPress: () => takePhoto(),
      },
    ]);
  };

  const pickImageFromLibrary = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert("Lỗi", "Cần cấp quyền truy cập thư viện ảnh");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8, // Good quality for upload
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        // Upload to server and get URL
        await uploadImageToServer(imageUri);
      }
    } catch (error) {
      console.error("❌ Error picking image:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh");
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert("Lỗi", "Cần cấp quyền truy cập camera");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8, // Good quality for upload
      });

      if (!result.canceled && result.assets[0]) {
        const imageUri = result.assets[0].uri;

        // Upload to server and get URL
        await uploadImageToServer(imageUri);
      }
    } catch (error) {
      console.error("❌ Error taking photo:", error);
      Alert.alert("Lỗi", "Không thể chụp ảnh");
    }
  };

  const uploadImageToServer = async (imageUri: string) => {
    try {
      setIsUploadingImage(true);

      // Get token for authorization
      const token = await AsyncStorage.getItem("token");
      const userId = getCurrentUserId();
      if (!token) {
        throw new Error("No authentication token found");
      }

      if (!userId) {
        throw new Error("Không tìm thấy thông tin user");
      }
      const formData = new FormData();
      // Add the image file
      formData.append("File", {
        uri: imageUri,
        type: "image/jpeg", // or determine from file extension
        name: "profile_image.jpg",
      } as any);
      formData.append("UserId", userId.toString());

      formData.append("IsPrimary", "true");

      // Call the API endpoint
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_BASE_URL}/api/Image`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            // Don't set Content-Type for FormData, let the browser set it
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ Upload failed:", errorText);
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }
      // Parse the response to get the image data
      const imageResponse = await response.json();

      // Extract the URL from the response
      const imageUrl = imageResponse.url;
      if (!imageUrl) {
        throw new Error("No URL returned from image upload");
      }

      // Set the profile image to the URL returned from server
      setProfileImage(imageUrl);
      setIsUploadingImage(false);

      return imageUrl;
    } catch (error) {
      console.error("❌ Error uploading image:", error);
      setIsUploadingImage(false);
      Alert.alert("Lỗi", "Không thể tải ảnh lên server. Vui lòng thử lại.");
      throw error;
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const userId = getCurrentUserId();

      if (!userId) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin user");
        return;
      }

      // Get form values
      const fullNameValue =
        profileData.find((f) => f.id === "fullName")?.value || "";
      const phoneNumberValue =
        profileData.find((f) => f.id === "phoneNumber")?.value || "";
      const bioValue = profileData.find((f) => f.id === "bio")?.value || "";

      // Validate required fields
      if (!fullNameValue.trim()) {
        Alert.alert("Lỗi", "Vui lòng nhập họ và tên");
        setIsSaving(false);
        return;
      }

      if (!phoneNumberValue.trim()) {
        Alert.alert("Lỗi", "Vui lòng nhập số điện thoại");
        setIsSaving(false);
        return;
      }

      // Phone number validation
      const phoneRegex = /^[0-9]{10,11}$/;
      if (!phoneRegex.test(phoneNumberValue.trim())) {
        Alert.alert("Lỗi", "Số điện thoại không hợp lệ");
        setIsSaving(false);
        return;
      }

      // Update profile using auth context
      // profileImage is now a URL from the server, not base64
      await updateProfile(userId, {
        fullName: fullNameValue.trim(),
        phoneNumber: phoneNumberValue.trim(),
        bio: bioValue.trim(),
        profileImage: profileImage, // This will be the URL from server
      });

      Alert.alert("Thành công", "Hồ sơ đã được cập nhật thành công", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);

      setIsSaving(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Lỗi", "Không thể lưu hồ sơ. Vui lòng thử lại.");
      setIsSaving(false);
    }
  };

  const getUserInitials = (): string => {
    if (!user) return "U";

    const fullName =
      profileData.find((f) => f.id === "fullName")?.value ||
      user.fullName ||
      "";
    if (fullName) {
      return fullName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }

    return user.email?.[0]?.toUpperCase() || "U";
  };

  const renderProfileField = (field: ProfileField) => (
    <TouchableOpacity
      key={field.id}
      onPress={() => handleFieldPress(field)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: getResponsiveSize(20),
        paddingHorizontal: getResponsiveSize(20),
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
      }}
    >
      <Ionicons
        name={field.icon}
        size={getResponsiveSize(24)}
        color="#666666"
        style={{ marginRight: getResponsiveSize(16) }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: getResponsiveSize(16),
            color: "#000000",
            marginBottom: getResponsiveSize(4),
          }}
        >
          {field.title}
        </Text>
        {field.value ? (
          <Text
            style={{
              fontSize: getResponsiveSize(14),
              color: "#666666",
            }}
          >
            {field.value}
          </Text>
        ) : (
          <Text
            style={{
              fontSize: getResponsiveSize(14),
              color: "#999999",
              fontStyle: "italic",
            }}
          >
            {field.placeholder}
          </Text>
        )}
      </View>
      <Ionicons
        name="chevron-forward"
        size={getResponsiveSize(20)}
        color="#C0C0C0"
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: getResponsiveSize(16),
          paddingVertical: getResponsiveSize(12),
          borderBottomWidth: 1,
          borderBottomColor: "#F0F0F0",
        }}
      >
        <TouchableOpacity onPress={handleClose}>
          <Ionicons name="close" size={getResponsiveSize(24)} color="#000000" />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: getResponsiveSize(18),
            fontWeight: "600",
            color: "#000000",
          }}
        >
          Chỉnh sửa hồ sơ
        </Text>

        <View style={{ width: getResponsiveSize(24) }} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Profile Image Section */}
        <View
          style={{
            alignItems: "center",
            paddingTop: getResponsiveSize(40),
            paddingBottom: getResponsiveSize(30),
            backgroundColor: "#FFFFFF",
            marginHorizontal: getResponsiveSize(16),
            marginTop: getResponsiveSize(16),
            borderRadius: getResponsiveSize(12),
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <TouchableOpacity
            onPress={handleImagePress}
            disabled={isUploadingImage}
            style={{
              position: "relative",
              marginBottom: getResponsiveSize(20),
            }}
          >
            <View
              style={{
                width: getResponsiveSize(120),
                height: getResponsiveSize(120),
                borderRadius: getResponsiveSize(60),
                backgroundColor: "#333333",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={{
                    width: getResponsiveSize(120),
                    height: getResponsiveSize(120),
                    borderRadius: getResponsiveSize(60),
                  }}
                  resizeMode="cover"
                />
              ) : (
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: getResponsiveSize(48),
                    fontWeight: "bold",
                  }}
                >
                  {getUserInitials()}
                </Text>
              )}
            </View>

            {/* Upload indicator or camera icon */}
            <View
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                width: getResponsiveSize(36),
                height: getResponsiveSize(36),
                borderRadius: getResponsiveSize(18),
                backgroundColor: "#E91E63",
                justifyContent: "center",
                alignItems: "center",
                borderWidth: 3,
                borderColor: "#FFFFFF",
              }}
            >
              {isUploadingImage ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons
                  name="camera"
                  size={getResponsiveSize(18)}
                  color="#FFFFFF"
                />
              )}
            </View>
          </TouchableOpacity>

          <Text
            style={{
              fontSize: getResponsiveSize(14),
              color: "#666666",
              textAlign: "center",
            }}
          >
            Nhấn để thay đổi ảnh đại diện
          </Text>
        </View>

        {/* Profile Fields */}
        <View style={{ marginTop: getResponsiveSize(20) }}>
          <Text
            style={{
              fontSize: getResponsiveSize(18),
              fontWeight: "600",
              color: "#000000",
              paddingHorizontal: getResponsiveSize(20),
              marginBottom: getResponsiveSize(16),
            }}
          >
            Thông tin cá nhân
          </Text>

          <View
            style={{
              backgroundColor: "#FFFFFF",
              marginHorizontal: getResponsiveSize(16),
              borderRadius: getResponsiveSize(12),
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
              overflow: "hidden",
            }}
          >
            {profileData.map((field) => renderProfileField(field))}
          </View>
        </View>

        {/* Photography Styles Section */}
        <View
          style={{
            marginTop: getResponsiveSize(30),
            marginBottom: getResponsiveSize(20),
          }}
        >
          <Text
            style={{
              fontSize: getResponsiveSize(18),
              fontWeight: "600",
              color: "#000000",
              paddingHorizontal: getResponsiveSize(20),
              marginBottom: getResponsiveSize(8),
            }}
          >
            Sở thích của tôi
          </Text>

          <Text
            style={{
              fontSize: getResponsiveSize(14),
              color: "#666666",
              paddingHorizontal: getResponsiveSize(20),
              marginBottom: getResponsiveSize(20),
              lineHeight: getResponsiveSize(20),
            }}
          >
            Thêm sở thích vào hồ sơ để tìm ra điểm chung với nhiếp ảnh gia và
            người dùng khác.
          </Text>

          {/* Error display */}
          {stylesError && (
            <View
              style={{
                backgroundColor: "#FFE6E6",
                marginHorizontal: getResponsiveSize(16),
                marginBottom: getResponsiveSize(16),
                padding: getResponsiveSize(12),
                borderRadius: getResponsiveSize(8),
                borderLeftWidth: 4,
                borderLeftColor: "#FF4444",
              }}
            >
              <Text
                style={{ color: "#CC0000", fontSize: getResponsiveSize(14) }}
              >
                {stylesError}
              </Text>
            </View>
          )}

          <View
            style={{
              backgroundColor: "#FFFFFF",
              marginHorizontal: getResponsiveSize(16),
              borderRadius: getResponsiveSize(12),
              padding: getResponsiveSize(20),
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            {stylesLoading ? (
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: getResponsiveSize(20),
                }}
              >
                <ActivityIndicator size="small" color="#E91E63" />
                <Text
                  style={{
                    marginTop: getResponsiveSize(8),
                    fontSize: getResponsiveSize(14),
                    color: "#666666",
                  }}
                >
                  Đang tải sở thích...
                </Text>
              </View>
            ) : (
              <>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: getResponsiveSize(12),
                  }}
                >
                  {getSelectedStyleNames()
                    .slice(0, 3)
                    .map((styleName, index) => (
                      <View
                        key={index}
                        style={{
                          backgroundColor: "#F0F0F0",
                          paddingHorizontal: getResponsiveSize(16),
                          paddingVertical: getResponsiveSize(8),
                          borderRadius: getResponsiveSize(20),
                        }}
                      >
                        <Text
                          style={{
                            fontSize: getResponsiveSize(14),
                            color: "#000000",
                          }}
                        >
                          {styleName}
                        </Text>
                      </View>
                    ))}

                  {Array.from({
                    length: Math.max(0, 3 - getSelectedStyleNames().length),
                  }).map((_, index) => (
                    <TouchableOpacity
                      key={`empty-${index}`}
                      onPress={handleStylePress}
                      disabled={stylesSaving}
                      style={{
                        borderWidth: 2,
                        borderColor: "#E0E0E0",
                        borderStyle: "dashed",
                        paddingHorizontal: getResponsiveSize(16),
                        paddingVertical: getResponsiveSize(8),
                        borderRadius: getResponsiveSize(20),
                        minWidth: getResponsiveSize(60),
                        alignItems: "center",
                        opacity: stylesSaving ? 0.5 : 1,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: getResponsiveSize(20),
                          color: "#C0C0C0",
                        }}
                      >
                        +
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  onPress={handleStylePress}
                  disabled={stylesSaving}
                  style={{
                    marginTop: getResponsiveSize(16),
                    alignItems: "center",
                    opacity: stylesSaving ? 0.5 : 1,
                  }}
                >
                  <Text
                    style={{
                      fontSize: getResponsiveSize(16),
                      fontWeight: "500",
                      color: "#000000",
                    }}
                  >
                    {stylesSaving
                      ? "Đang cập nhật..."
                      : `Thêm sở thích (${selectedStyleIds.length}/3)`}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Additional Info Section */}
        <View
          style={{
            marginTop: getResponsiveSize(30),
            marginBottom: getResponsiveSize(20),
          }}
        >
          <Text
            style={{
              fontSize: getResponsiveSize(18),
              fontWeight: "600",
              color: "#000000",
              paddingHorizontal: getResponsiveSize(20),
              marginBottom: getResponsiveSize(8),
            }}
          >
            Thông tin tài khoản
          </Text>

          <View
            style={{
              backgroundColor: "#FFFFFF",
              marginHorizontal: getResponsiveSize(16),
              borderRadius: getResponsiveSize(12),
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            {/* Email - Read only */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: getResponsiveSize(20),
                paddingHorizontal: getResponsiveSize(20),
                borderBottomWidth: 1,
                borderBottomColor: "#F0F0F0",
              }}
            >
              <Ionicons
                name="mail-outline"
                size={getResponsiveSize(24)}
                color="#666666"
                style={{ marginRight: getResponsiveSize(16) }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: getResponsiveSize(16),
                    color: "#000000",
                    marginBottom: getResponsiveSize(4),
                  }}
                >
                  Email
                </Text>
                <Text
                  style={{
                    fontSize: getResponsiveSize(14),
                    color: "#666666",
                  }}
                >
                  {user?.email || "Chưa cập nhật"}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: "#F0F0F0",
                  paddingHorizontal: getResponsiveSize(8),
                  paddingVertical: getResponsiveSize(4),
                  borderRadius: getResponsiveSize(4),
                }}
              >
                <Text
                  style={{
                    fontSize: getResponsiveSize(12),
                    color: "#666666",
                  }}
                >
                  Chỉ đọc
                </Text>
              </View>
            </View>

            {/* Member since */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: getResponsiveSize(20),
                paddingHorizontal: getResponsiveSize(20),
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={getResponsiveSize(24)}
                color="#666666"
                style={{ marginRight: getResponsiveSize(16) }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: getResponsiveSize(16),
                    color: "#000000",
                    marginBottom: getResponsiveSize(4),
                  }}
                >
                  Thành viên từ
                </Text>
                <Text
                  style={{
                    fontSize: getResponsiveSize(14),
                    color: "#666666",
                  }}
                >
                  {user ? new Date().getFullYear().toString() : "Chưa cập nhật"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <View
          style={{
            padding: getResponsiveSize(20),
            paddingTop: getResponsiveSize(40),
            paddingBottom: getResponsiveSize(40),
          }}
        >
          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={isSaving}
            style={{
              backgroundColor: isSaving ? "#CCCCCC" : "#E91E63",
              paddingVertical: getResponsiveSize(16),
              borderRadius: getResponsiveSize(8),
              alignItems: "center",
            }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: getResponsiveSize(16),
                  fontWeight: "600",
                }}
              >
                Lưu thay đổi
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Style Selection Modal */}
      <Modal
        visible={isStyleModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: getResponsiveSize(16),
              paddingVertical: getResponsiveSize(12),
              borderBottomWidth: 1,
              borderBottomColor: "#F0F0F0",
            }}
          >
            <TouchableOpacity onPress={() => setIsStyleModalVisible(false)}>
              <Ionicons
                name="close"
                size={getResponsiveSize(24)}
                color="#000000"
              />
            </TouchableOpacity>

            <Text
              style={{
                fontSize: getResponsiveSize(18),
                fontWeight: "600",
                color: "#000000",
              }}
            >
              Chọn sở thích
            </Text>

            <View style={{ width: getResponsiveSize(24) }} />
          </View>

          <View style={{ flex: 1, padding: getResponsiveSize(20) }}>
            <Text
              style={{
                fontSize: getResponsiveSize(24),
                fontWeight: "bold",
                color: "#000000",
                marginBottom: getResponsiveSize(16),
              }}
            >
              Bạn thích gì?
            </Text>

            <Text
              style={{
                fontSize: getResponsiveSize(16),
                color: "#666666",
                marginBottom: getResponsiveSize(24),
                lineHeight: getResponsiveSize(22),
              }}
            >
              Chọn một số sở thích mà bạn muốn hiển thị trên hồ sơ. Điều này
              giúp bạn kết nối với những nhiếp ảnh gia có cùng phong cách.
            </Text>

            {/* Error display */}
            {stylesError && (
              <View
                style={{
                  backgroundColor: "#FFE6E6",
                  padding: getResponsiveSize(12),
                  borderRadius: getResponsiveSize(8),
                  marginBottom: getResponsiveSize(16),
                  borderLeftWidth: 4,
                  borderLeftColor: "#FF4444",
                }}
              >
                <Text
                  style={{ color: "#CC0000", fontSize: getResponsiveSize(14) }}
                >
                  {stylesError}
                </Text>
              </View>
            )}

            <Text
              style={{
                fontSize: getResponsiveSize(18),
                fontWeight: "600",
                color: "#000000",
                marginBottom: getResponsiveSize(16),
              }}
            >
              Phong cách chụp ảnh
            </Text>

            {stylesLoading ? (
              <View
                style={{
                  alignItems: "center",
                  paddingVertical: getResponsiveSize(40),
                }}
              >
                <ActivityIndicator size="large" color="#E91E63" />
                <Text
                  style={{
                    marginTop: getResponsiveSize(16),
                    fontSize: getResponsiveSize(16),
                    color: "#666666",
                  }}
                >
                  Đang tải sở thích...
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: getResponsiveSize(12),
                    marginBottom: getResponsiveSize(24),
                  }}
                >
                  {allStyles.map((style) => (
                    <TouchableOpacity
                      key={style.styleId}
                      onPress={() => handleToggleStyle(style.styleId)}
                      disabled={stylesSaving}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        backgroundColor: selectedStyleIds.includes(
                          style.styleId
                        )
                          ? "#E91E63"
                          : "#F5F5F5",
                        paddingHorizontal: getResponsiveSize(16),
                        paddingVertical: getResponsiveSize(12),
                        borderRadius: getResponsiveSize(25),
                        borderWidth: selectedStyleIds.includes(style.styleId)
                          ? 0
                          : 1,
                        borderColor: "#E5E5E5",
                        opacity: stylesSaving ? 0.5 : 1,
                      }}
                    >
                      <Ionicons
                        name="camera"
                        size={getResponsiveSize(16)}
                        color={
                          selectedStyleIds.includes(style.styleId)
                            ? "#FFFFFF"
                            : "#666666"
                        }
                        style={{ marginRight: getResponsiveSize(8) }}
                      />
                      <Text
                        style={{
                          fontSize: getResponsiveSize(14),
                          color: selectedStyleIds.includes(style.styleId)
                            ? "#FFFFFF"
                            : "#000000",
                          fontWeight: "500",
                        }}
                      >
                        {style.name}
                      </Text>
                      {stylesSaving &&
                        selectedStyleIds.includes(style.styleId) && (
                          <ActivityIndicator
                            size="small"
                            color="#FFFFFF"
                            style={{ marginLeft: getResponsiveSize(8) }}
                          />
                        )}
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}

            <Text
              style={{
                fontSize: getResponsiveSize(14),
                color: selectedStyleIds.length >= 3 ? "#E91E63" : "#666666",
                textAlign: "center",
                fontWeight: selectedStyleIds.length >= 3 ? "600" : "normal",
              }}
            >
              Đã chọn {selectedStyleIds.length}/3
              {selectedStyleIds.length >= 3 && " (Đã đạt giới hạn)"}
            </Text>
          </View>

          <View
            style={{
              padding: getResponsiveSize(20),
              paddingTop: 0,
              borderTopWidth: 1,
              borderTopColor: "#F0F0F0",
            }}
          >
            <TouchableOpacity
              onPress={() => setIsStyleModalVisible(false)}
              disabled={stylesSaving}
              style={{
                backgroundColor: stylesSaving ? "#CCCCCC" : "#E91E63",
                paddingVertical: getResponsiveSize(16),
                borderRadius: getResponsiveSize(8),
                alignItems: "center",
              }}
            >
              {stylesSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: getResponsiveSize(16),
                    fontWeight: "600",
                  }}
                >
                  Xong
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      {/* Field Edit Modal */}
      <FieldEditModal
        visible={isFieldModalVisible}
        field={selectedField}
        onClose={() => {
          setIsFieldModalVisible(false);
          setSelectedField(null);
        }}
        onSave={handleSaveField}
      />
    </SafeAreaView>
  );
};

export default EditProfileCustomerScreen;
