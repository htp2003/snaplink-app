import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { getResponsiveSize } from "../../utils/responsive";
import { userService } from "../../services/userService";
import { ChangePasswordRequest } from "../../types/userProfile";

interface RouteParams {
  userId: number;
}

type ChangePasswordRouteProp = RouteProp<Record<string, RouteParams>, string>;

const ChangePasswordScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<ChangePasswordRouteProp>();
  const { userId } = route.params || { userId: 0 };

  // Form states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Validation states
  const [errors, setErrors] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    general: "",
  });

  const clearErrors = () => {
    setErrors({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      general: "",
    });
  };

  const validateForm = (): boolean => {
    clearErrors();
    let isValid = true;
    const newErrors = { ...errors };

    // Validate current password
    if (!currentPassword.trim()) {
      newErrors.currentPassword = "Vui lòng nhập mật khẩu hiện tại";
      isValid = false;
    }

    // Validate new password
    if (!newPassword.trim()) {
      newErrors.newPassword = "Vui lòng nhập mật khẩu mới";
      isValid = false;
    } else {
      const passwordValidation = userService.validatePassword(newPassword);
      if (!passwordValidation.isValid) {
        newErrors.newPassword = passwordValidation.errors[0];
        isValid = false;
      }
    }

    // Validate confirm password
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu mới";
      isValid = false;
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Mật khẩu xác nhận không khớp";
      isValid = false;
    }

    // Check if new password is different from current
    if (currentPassword === newPassword) {
      newErrors.newPassword = "Mật khẩu mới phải khác mật khẩu hiện tại";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleChangePassword = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      clearErrors();

      const changePasswordRequest: ChangePasswordRequest = {
        userId,
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      };

      await userService.changePassword(changePasswordRequest);

      // Success
      Alert.alert(
        "Thành công",
        "Mật khẩu đã được thay đổi thành công",
        [
          {
            text: "OK",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error("❌ Change password error:", error);
      
      const errorMessage = error.message || "Không thể thay đổi mật khẩu. Vui lòng thử lại.";
      
      setErrors(prev => ({
        ...prev,
        general: errorMessage,
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const renderPasswordInput = (
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    showPassword: boolean,
    toggleShowPassword: () => void,
    error: string,
    autoFocus?: boolean
  ) => (
    <View style={{ marginBottom: getResponsiveSize(20) }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderWidth: 1,
          borderColor: error ? "#FF385C" : "#E5E5E5",
          borderRadius: getResponsiveSize(8),
          paddingHorizontal: getResponsiveSize(16),
          backgroundColor: "#FFFFFF",
          height: getResponsiveSize(56),
        }}
      >
        <Ionicons
          name="lock-closed-outline"
          size={getResponsiveSize(20)}
          color={error ? "#FF385C" : "#666666"}
          style={{ marginRight: getResponsiveSize(12) }}
        />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#999999"
          secureTextEntry={!showPassword}
          autoFocus={autoFocus}
          style={{
            flex: 1,
            fontSize: getResponsiveSize(16),
            color: "#000000",
            paddingVertical: 0,
          }}
          returnKeyType="next"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          onPress={toggleShowPassword}
          style={{
            padding: getResponsiveSize(4),
          }}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={getResponsiveSize(20)}
            color="#666666"
          />
        </TouchableOpacity>
      </View>
      {error ? (
        <Text
          style={{
            fontSize: getResponsiveSize(12),
            color: "#FF385C",
            marginTop: getResponsiveSize(4),
            marginLeft: getResponsiveSize(4),
          }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F7" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: getResponsiveSize(16),
          paddingVertical: getResponsiveSize(12),
          backgroundColor: "#F7F7F7",
          borderBottomWidth: 1,
          borderBottomColor: "#E5E5E5",
        }}
      >
        <TouchableOpacity
          onPress={handleGoBack}
          style={{
            width: getResponsiveSize(40),
            height: getResponsiveSize(40),
            borderRadius: getResponsiveSize(20),
            backgroundColor: "#E5E5E5",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons
            name="chevron-back"
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
          Đổi mật khẩu
        </Text>

        <View style={{ width: getResponsiveSize(40) }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: getResponsiveSize(20),
            paddingTop: getResponsiveSize(24),
            paddingBottom: getResponsiveSize(40),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Section */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: getResponsiveSize(12),
              padding: getResponsiveSize(20),
              marginBottom: getResponsiveSize(24),
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
                alignItems: "center",
                marginBottom: getResponsiveSize(12),
              }}
            >
              <Ionicons
                name="information-circle"
                size={getResponsiveSize(24)}
                color="#007AFF"
                style={{ marginRight: getResponsiveSize(8) }}
              />
              <Text
                style={{
                  fontSize: getResponsiveSize(16),
                  fontWeight: "600",
                  color: "#000000",
                }}
              >
                Yêu cầu mật khẩu
              </Text>
            </View>
            <Text
              style={{
                fontSize: getResponsiveSize(14),
                color: "#666666",
                lineHeight: getResponsiveSize(20),
              }}
            >
              • Ít nhất 6 ký tự{"\n"}
              • Chứa ít nhất một chữ cái{"\n"}
              • Nên chứa ít nhất một số{"\n"}
              • Khác với mật khẩu hiện tại
            </Text>
          </View>

          {/* Form Section */}
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: getResponsiveSize(12),
              padding: getResponsiveSize(20),
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            {/* General Error */}
            {errors.general ? (
              <View
                style={{
                  backgroundColor: "#FFF2F2",
                  borderWidth: 1,
                  borderColor: "#FF385C",
                  borderRadius: getResponsiveSize(8),
                  padding: getResponsiveSize(12),
                  marginBottom: getResponsiveSize(20),
                }}
              >
                <Text
                  style={{
                    fontSize: getResponsiveSize(14),
                    color: "#FF385C",
                    textAlign: "center",
                  }}
                >
                  {errors.general}
                </Text>
              </View>
            ) : null}

            {/* Current Password */}
            <Text
              style={{
                fontSize: getResponsiveSize(14),
                fontWeight: "500",
                color: "#000000",
                marginBottom: getResponsiveSize(8),
              }}
            >
              Mật khẩu hiện tại
            </Text>
            {renderPasswordInput(
              currentPassword,
              setCurrentPassword,
              "Nhập mật khẩu hiện tại",
              showCurrentPassword,
              () => setShowCurrentPassword(!showCurrentPassword),
              errors.currentPassword,
              true
            )}

            {/* New Password */}
            <Text
              style={{
                fontSize: getResponsiveSize(14),
                fontWeight: "500",
                color: "#000000",
                marginBottom: getResponsiveSize(8),
              }}
            >
              Mật khẩu mới
            </Text>
            {renderPasswordInput(
              newPassword,
              setNewPassword,
              "Nhập mật khẩu mới",
              showNewPassword,
              () => setShowNewPassword(!showNewPassword),
              errors.newPassword
            )}

            {/* Confirm Password */}
            <Text
              style={{
                fontSize: getResponsiveSize(14),
                fontWeight: "500",
                color: "#000000",
                marginBottom: getResponsiveSize(8),
              }}
            >
              Xác nhận mật khẩu mới
            </Text>
            {renderPasswordInput(
              confirmPassword,
              setConfirmPassword,
              "Nhập lại mật khẩu mới",
              showConfirmPassword,
              () => setShowConfirmPassword(!showConfirmPassword),
              errors.confirmPassword
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={loading}
              style={{
                backgroundColor: loading ? "#CCCCCC" : "#007AFF",
                borderRadius: getResponsiveSize(8),
                paddingVertical: getResponsiveSize(16),
                alignItems: "center",
                marginTop: getResponsiveSize(24),
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {loading ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                    style={{ marginRight: getResponsiveSize(8) }}
                  />
                  <Text
                    style={{
                      fontSize: getResponsiveSize(16),
                      fontWeight: "600",
                      color: "#FFFFFF",
                    }}
                  >
                    Đang xử lý...
                  </Text>
                </View>
              ) : (
                <Text
                  style={{
                    fontSize: getResponsiveSize(16),
                    fontWeight: "600",
                    color: "#FFFFFF",
                  }}
                >
                  Cập nhật mật khẩu
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ChangePasswordScreen;