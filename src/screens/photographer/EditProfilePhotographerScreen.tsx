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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { useAuth } from "../../hooks/useAuth";
import { usePhotographerProfile } from "../../hooks/usePhotographerProfile";
import FieldEditModal from "../../components/Photographer/FileEditModal";
import {
  photographerService,
  Style,
  CreatePhotographerRequest,
  UpdatePhotographerRequest,
} from "../../services/photographerService";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { userService } from "../../services/userService";
import { getResponsiveSize } from "../../utils/responsive";
import LocationPickerModal from "../../components/LocationPickerModal";
import { PlaceDetails } from "../../types/locationTypes";

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

const EditProfilePhotographerScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user, getCurrentUserId, updateProfile  } = useAuth();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocationData, setSelectedLocationData] =
    useState<PlaceDetails | null>(null);
  // Sử dụng hook thay vì state và API calls trực tiếp
  const {
    photographer,
    styles: photographerStyles,
    loading,
    error,
    findByUserId,
    createProfile,
    updatePhotographer,
    addStyle,
    removeStyle,
    // Computed values
    displayName,
    hourlyRate,
    yearsExperience,
    equipment,
    isAvailable,
  } = usePhotographerProfile();

  // Local state cho form
  const [selectedField, setSelectedField] = useState<ProfileField | null>(null);
  const [isFieldModalVisible, setIsFieldModalVisible] = useState(false);
  const [isStyleModalVisible, setIsStyleModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [allStyles, setAllStyles] = useState<Style[]>([]);
  const [selectedStyleIds, setSelectedStyleIds] = useState<number[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  // Form data state
  const [profileData, setProfileData] = useState<ProfileField[]>([
    {
      id: "yearsExperience",
      icon: "ribbon-outline",
      title: "Số năm kinh nghiệm",
      value: "",
      placeholder: "VD: 5",
      question: "Bạn có bao nhiêu năm kinh nghiệm?",
      description:
        "Cho chúng tôi biết số năm bạn đã làm nhiếp ảnh gia chuyên nghiệp.",
      maxLength: 2,
      fieldType: "number",
    },
    {
      id: "equipment",
      icon: "camera-outline",
      title: "Thiết bị chuyên nghiệp",
      value: "",
      placeholder: "VD: Canon 5D Mark IV, 85mm lens",
      question: "Thiết bị chụp ảnh của bạn?",
      description:
        "Liệt kê các thiết bị chuyên nghiệp mà bạn sử dụng để chụp ảnh.",
      maxLength: 200,
      fieldType: "text",
    },
    {
      id: "hourlyRate",
      icon: "card-outline",
      title: "Giá theo giờ (VNĐ)",
      value: "",
      placeholder: "VD: 500000",
      question: "Giá dịch vụ của bạn?",
      description: "Nhập mức giá theo giờ cho dịch vụ chụp ảnh của bạn.",
      maxLength: 10,
      fieldType: "number",
    },
    {
      id: "availabilityStatus",
      icon: "time-outline",
      title: "Trạng thái làm việc",
      value: "Available",
      placeholder: "Chọn trạng thái",
      question: "Trạng thái hiện tại của bạn?",
      description: "Cho khách hàng biết bạn có sẵn sàng nhận việc hay không.",
      maxLength: 20,
      fieldType: "select",
      options: ["Available", "Busy", "Offline"],
    },
    {
      id: "location",
      icon: "location-outline",
      title: "Vị trí làm việc",
      value: "",
      placeholder: "Chọn khu vực làm việc",
      question: "Bạn làm việc ở khu vực nào?",
      description: "Chọn khu vực chính mà bạn có thể nhận việc chụp ảnh.",
      maxLength: 200,
      fieldType: "select",
    },
  ]);

  useEffect(() => {
    initializeData();
  }, []);

  // Load styles và photographer profile
  const initializeData = async () => {
    try {
      // Load all available styles
      await loadStyles();

      // Load photographer profile nếu có
      const userId = getCurrentUserId();
      if (userId) {
        await findByUserId(userId);
      }
    } catch (error) {
      console.error("Error initializing data:", error);
    }
  };

  const loadStyles = async () => {
    try {
      const stylesData = await photographerService.getStyles();

      setAllStyles(stylesData);
    } catch (error) {
      Alert.alert("Lỗi", "Không thể tải danh sách styles");
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
        type: "image/jpeg",
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
            // Don't set Content-Type for FormData
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
      console.log("✅ Image upload response:", imageResponse); // Debug log

      // Extract the URL from the response
      const imageUrl = imageResponse.url;
      if (!imageUrl) {
        throw new Error("No URL returned from image upload");
      }

      // Set the profile image to the URL returned from server
      setProfileImage(imageUrl);

      Alert.alert("Thành công", "Ảnh đại diện đã được cập nhật");

      setIsUploadingImage(false);
      return imageUrl;
    } catch (error) {
      console.error("❌ Error uploading image:", error);
      setIsUploadingImage(false);
      Alert.alert("Lỗi", "Không thể tải ảnh lên server. Vui lòng thử lại.");
      throw error;
    }
  };
  // Populate form khi có data từ hook
  useEffect(() => {
    if (photographer) {
      populateFormData();
      setIsEditMode(true);
    } else {
      setIsEditMode(false);
    }
  }, [photographer]);

  useEffect(() => {
    if (user?.profileImage && !profileImage) {
      setProfileImage(user.profileImage);
    }
  }, [user, profileImage]);

  // Populate styles khi có data - FIX HERE
  useEffect(() => {
    if (
      photographerStyles &&
      photographerStyles.length > 0 &&
      allStyles.length > 0
    ) {
      // Map photographer styles to styleIds using the loaded allStyles
      const styleIds = photographerStyles
        .map((photographerStyle) => {
          // Find matching style in allStyles by name
          const matchingStyle = allStyles.find(
            (style) =>
              style.name === photographerStyle.name ||
              style.styleId === photographerStyle.styleId
          );

          return matchingStyle?.styleId;
        })
        .filter((id) => id !== undefined) as number[];

      setSelectedStyleIds(styleIds);
    }
  }, [photographerStyles, allStyles]);

  const populateFormData = () => {
    if (!photographer) return;

    setProfileData((prev) =>
      prev.map((field) => {
        switch (field.id) {
          case "yearsExperience":
            return {
              ...field,
              value: photographer.yearsExperience?.toString() || "",
            };
          case "equipment":
            return { ...field, value: photographer.equipment || "" };
          case "hourlyRate":
            return {
              ...field,
              value: photographer.hourlyRate?.toString() || "",
            };
          case "availabilityStatus":
            return {
              ...field,
              value: photographer.availabilityStatus || "Available",
            };
          case "location":
            const locationDisplay =
              photographer.address || photographer.googleMapsAddress || "";

            // Nếu có coordinates, tạo PlaceDetails object
            if (
              photographer.latitude &&
              photographer.longitude &&
              locationDisplay
            ) {
              setSelectedLocationData({
                placeId: "existing_location",
                name: locationDisplay,
                address:
                  photographer.address || photographer.googleMapsAddress || "",
                coordinates: {
                  latitude: photographer.latitude,
                  longitude: photographer.longitude,
                },
              });
            }

            return {
              ...field,
              value: locationDisplay,
            };
          default:
            return field;
        }
      })
    );

    // Sửa lại logic này để ưu tiên user profileImage trước
    setProfileImage(
      photographer.user?.profileImage ||
        photographer.profileImage ||
        user?.profileImage ||
        null
    );
  };

  const requestImagePickerPermissions = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        console.warn("Media library permission not granted");
      }

      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus.status !== "granted") {
        console.warn("Camera permission not granted");
      }
    } catch (error) {
      console.error("Error requesting permissions:", error);
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleFieldPress = (field: ProfileField) => {
    if (field.id === "location") {
      setShowLocationModal(true);
      return;
    }

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

  const toggleStyle = (styleId: number) => {
    setSelectedStyleIds((prev) => {
      if (prev.includes(styleId)) {
        // Remove style
        return prev.filter((id) => id !== styleId);
      } else {
        // Add style only if under limit
        if (prev.length >= 3) {
          Alert.alert("Giới hạn", "Bạn chỉ có thể chọn tối đa 3 concept chụp.");
          return prev;
        }
        return [...prev, styleId];
      }
    });
  };
  const handleLocationSelect = async (location: PlaceDetails) => {
    try {
      // Cập nhật field value cho display
      setProfileData((prev) =>
        prev.map((item) =>
          item.id === "location" ? { ...item, value: location.name } : item
        )
      );

      // Lưu location data đầy đủ
      setSelectedLocationData(location);
    } catch (error) {
      console.error("Error selecting location:", error);
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
  
      // Validate required fields
      const yearsExperienceValue = parseInt(
        profileData.find((f) => f.id === "yearsExperience")?.value || "0"
      );
      const equipmentValue =
        profileData.find((f) => f.id === "equipment")?.value || "";
      const hourlyRateValue = parseInt(
        profileData.find((f) => f.id === "hourlyRate")?.value || "0"
      );
      const availabilityValue =
        profileData.find((f) => f.id === "availabilityStatus")?.value ||
        "Available";
  
      // Validation checks...
      if (yearsExperienceValue <= 0) {
        Alert.alert("Lỗi", "Vui lòng nhập số năm kinh nghiệm hợp lệ");
        setIsSaving(false);
        return;
      }
  
      if (!equipmentValue.trim()) {
        Alert.alert("Lỗi", "Vui lòng nhập thông tin thiết bị");
        setIsSaving(false);
        return;
      }
  
      if (hourlyRateValue <= 0) {
        Alert.alert("Lỗi", "Vui lòng nhập giá dịch vụ hợp lệ");
        setIsSaving(false);
        return;
      }
  
      if (selectedStyleIds.length === 0) {
        Alert.alert("Lỗi", "Vui lòng chọn ít nhất 1 concept chụp");
        setIsSaving(false);
        return;
      }
  
      if (isEditMode && photographer) {
        // ✅ STEP 1: Update User Profile (for profile image)
        if (profileImage && profileImage !== user?.profileImage) {
          try {
            console.log('🖼️ Updating user profile image:', profileImage);
            await updateProfile(userId, {
              profileImage: profileImage,
            });
            console.log('✅ User profile image updated successfully');
          } catch (userUpdateError) {
            console.error('❌ Error updating user profile image:', userUpdateError);
            // Continue with photographer update even if user update fails
          }
        }
  
        // ✅ STEP 2: Update Photographer Profile
        const updateData: UpdatePhotographerRequest = {
          yearsExperience: yearsExperienceValue,
          equipment: equipmentValue,
          hourlyRate: hourlyRateValue,
          availabilityStatus: availabilityValue,
          // Don't include profileImage in photographer update - it's handled in user profile
        };
  
        // Add location data if available
        if (selectedLocationData) {
          updateData.address = selectedLocationData.address;
          updateData.googleMapsAddress = selectedLocationData.address;
          updateData.latitude = selectedLocationData.coordinates.latitude;
          updateData.longitude = selectedLocationData.coordinates.longitude;
        }
  
        await updatePhotographer(updateData);
  
        // ✅ STEP 3: Update styles separately
        await updatePhotographerStyles();
  
        Alert.alert("Thành công", "Hồ sơ nhiếp ảnh gia đã được cập nhật", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
  
      } else {
        // ✅ CREATE MODE: Update user profile first, then create photographer
        
        // STEP 1: Update user profile image if changed
        if (profileImage && profileImage !== user?.profileImage) {
          try {
            console.log('🖼️ Creating - updating user profile image:', profileImage);
            await updateProfile(userId, {
              profileImage: profileImage,
            });
            console.log('✅ User profile image updated successfully');
          } catch (userUpdateError) {
            console.error('❌ Error updating user profile image:', userUpdateError);
            // Continue with photographer creation
          }
        }
  
        // STEP 2: Create photographer profile
        const createData: CreatePhotographerRequest = {
          userId: userId,
          yearsExperience: yearsExperienceValue,
          equipment: equipmentValue,
          hourlyRate: hourlyRateValue,
          availabilityStatus: availabilityValue,
          styleIds: selectedStyleIds,
          // Don't include profileImage - it's handled in user profile
          ...(selectedLocationData && {
            address: selectedLocationData.address,
            googleMapsAddress: selectedLocationData.address,
            latitude: selectedLocationData.coordinates.latitude,
            longitude: selectedLocationData.coordinates.longitude,
          }),
        };
  
        await createProfile(createData);
  
        Alert.alert(
          "Thành công",
          "Hồ sơ nhiếp ảnh gia đã được tạo thành công",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
  
      setIsSaving(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Lỗi", "Không thể lưu hồ sơ. Vui lòng thử lại.");
      setIsSaving(false);
    }
  };

  // Update styles using individual API calls
  const updatePhotographerStyles = async () => {
    if (!photographer) return;

    try {
      const currentStyleIds = photographerStyles.map((style) => {
        // Find the styleId from allStyles by matching name
        const matchingStyle = allStyles.find((s) => s.name === style.name);
        return matchingStyle?.styleId || style.styleId;
      });

      // Find styles to add and remove
      const stylesToAdd = selectedStyleIds.filter(
        (id) => !currentStyleIds.includes(id)
      );
      const stylesToRemove = currentStyleIds.filter(
        (id) => !selectedStyleIds.includes(id)
      );

      // Remove old styles first
      for (const styleId of stylesToRemove) {
        if (styleId) {
          await removeStyle(styleId);
        }
      }

      // Add new styles
      for (const styleId of stylesToAdd) {
        await addStyle(styleId);
      }
    } catch (error) {
      console.error("Error updating styles:", error);
      throw error;
    }
  };

  const getSelectedStyleNames = () => {
    const names = selectedStyleIds
      .map((id) => {
        const style = allStyles.find((style) => style.styleId === id);
        return style?.name;
      })
      .filter(Boolean);

    return names;
  };

  const renderProfileField = (field: ProfileField) => (
    <TouchableOpacity
      key={field.id}
      onPress={() => handleFieldPress(field)}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#F0F0F0",
      }}
    >
      <Ionicons
        name={field.icon}
        size={24}
        color="#666666"
        style={{ marginRight: 16 }}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 16,
            color: "#000000",
            marginBottom: 4,
          }}
        >
          {field.title}
        </Text>
        {field.value ? (
          <Text
            style={{
              fontSize: 14,
              color: "#666666",
            }}
          >
            {field.fieldType === "number" && field.id === "hourlyRate"
              ? `${parseInt(field.value).toLocaleString("vi-VN")} VNĐ`
              : field.value}
          </Text>
        ) : (
          <Text
            style={{
              fontSize: 14,
              color: "#999999",
              fontStyle: "italic",
            }}
          >
            {field.placeholder}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#C0C0C0" />
    </TouchableOpacity>
  );

  // Show loading state
  if (loading && !photographer && !isEditMode) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#FFFFFF",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#E91E63" />
        <Text style={{ marginTop: 16, fontSize: 16, color: "#666666" }}>
          Đang tải hồ sơ...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#F0F0F0",
        }}
      >
        <TouchableOpacity onPress={handleClose}>
          <Ionicons name="close" size={24} color="#000000" />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: "#000000",
          }}
        >
          {isEditMode ? "Chỉnh sửa Hồ sơ" : "Tạo Hồ sơ Nhiếp ảnh gia"}
        </Text>

        <View style={{ width: 24 }} />
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
        {/* Photographer Fields */}
        <View style={{ marginTop: 20 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#000000",
              paddingHorizontal: 20,
              marginBottom: 16,
            }}
          >
            Thông tin chuyên nghiệp
          </Text>

          <View
            style={{
              backgroundColor: "#FFFFFF",
              marginHorizontal: 16,
              borderRadius: 12,
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
        <View style={{ marginTop: 30, marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#000000",
              paddingHorizontal: 20,
              marginBottom: 8,
            }}
          >
            Sở thích của tôi
          </Text>

          <Text
            style={{
              fontSize: 14,
              color: "#666666",
              paddingHorizontal: 20,
              marginBottom: 20,
              lineHeight: 20,
            }}
          >
            Thêm sở thích vào hồ sơ để tìm ra điểm chung với host và khách khác.
          </Text>

          <View
            style={{
              backgroundColor: "#FFFFFF",
              marginHorizontal: 16,
              borderRadius: 12,
              padding: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {getSelectedStyleNames()
                .slice(0, 3)
                .map((styleName, index) => (
                  <View
                    key={index}
                    style={{
                      backgroundColor: "#F0F0F0",
                      paddingHorizontal: 16,
                      paddingVertical: 8,
                      borderRadius: 20,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: "#000000" }}>
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
                  style={{
                    borderWidth: 2,
                    borderColor: "#E0E0E0",
                    borderStyle: "dashed",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    minWidth: 60,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 20, color: "#C0C0C0" }}>+</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleStylePress}
              style={{
                marginTop: 16,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "500",
                  color: "#000000",
                }}
              >
                Thêm concept ({selectedStyleIds.length}/3)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <View style={{ padding: 20, paddingTop: 40 }}>
          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={isSaving || loading}
            style={{
              backgroundColor: isSaving || loading ? "#CCCCCC" : "#E91E63",
              paddingVertical: 16,
              borderRadius: 8,
              alignItems: "center",
            }}
          >
            {isSaving || loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                {isEditMode ? "Cập nhật" : "Tạo hồ sơ"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

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
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#F0F0F0",
            }}
          >
            <TouchableOpacity onPress={() => setIsStyleModalVisible(false)}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>

            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#000000",
              }}
            >
              Chọn Concept
            </Text>

            <View style={{ width: 24 }} />
          </View>

          <View style={{ flex: 1, padding: 20 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: "bold",
                color: "#000000",
                marginBottom: 16,
              }}
            >
              Bạn thích gì?
            </Text>

            <Text
              style={{
                fontSize: 16,
                color: "#666666",
                marginBottom: 24,
                lineHeight: 22,
              }}
            >
              Chọn một số sở thích mà bạn muốn hiển thị trên hồ sơ.
            </Text>

            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: "#000000",
                marginBottom: 16,
              }}
            >
              Concept chụp
            </Text>

            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 24,
              }}
            >
              {allStyles.map((style) => (
                <TouchableOpacity
                  key={style.styleId}
                  onPress={() => toggleStyle(style.styleId)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: selectedStyleIds.includes(style.styleId)
                      ? "#E91E63"
                      : "#F5F5F5",
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 25,
                    borderWidth: selectedStyleIds.includes(style.styleId)
                      ? 0
                      : 1,
                    borderColor: "#E5E5E5",
                  }}
                >
                  <Ionicons
                    name="camera"
                    size={16}
                    color={
                      selectedStyleIds.includes(style.styleId)
                        ? "#FFFFFF"
                        : "#666666"
                    }
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{
                      fontSize: 14,
                      color: selectedStyleIds.includes(style.styleId)
                        ? "#FFFFFF"
                        : "#000000",
                      fontWeight: "500",
                    }}
                  >
                    {style.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text
              style={{
                fontSize: 14,
                color: "#666666",
                textAlign: "center",
              }}
            >
              Đã chọn {selectedStyleIds.length}/3
            </Text>
          </View>

          <View style={{ padding: 20, paddingTop: 0 }}>
            <TouchableOpacity
              onPress={() => setIsStyleModalVisible(false)}
              style={{
                backgroundColor: "#E91E63",
                paddingVertical: 16,
                borderRadius: 8,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 16,
                  fontWeight: "600",
                }}
              >
                Lưu
              </Text>
              
            </TouchableOpacity>
          </View>
          </SafeAreaView>
      </Modal>
      <LocationPickerModal
            visible={showLocationModal}
            onClose={() => setShowLocationModal(false)}
            onLocationSelect={handleLocationSelect}
            initialLocation={selectedLocationData} // Truyền location hiện tại
            title="Chọn khu vực làm việc"
          />
    </SafeAreaView>
    
  );
};

export default EditProfilePhotographerScreen;
