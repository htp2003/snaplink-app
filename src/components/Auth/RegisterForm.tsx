import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  TextInput,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { useAuth } from "../../hooks/useAuth";

interface RegisterFormProps {
  onSubmit?: (email: string, password: string, confirmPassword: string) => void;
  onLogin: () => void;
  onSuccess?: (userData: any) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onLogin,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
  });

  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [focusedField, setFocusedField] = useState<string>("");

  const navigation = useNavigation<RootStackNavigationProp>();
  const { register, isLoading } = useAuth();

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { fullName, email, phoneNumber, password, confirmPassword } =
      formData;

    if (!fullName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập họ tên");
      return false;
    }

    if (!email.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập email");
      return false;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Lỗi", "Email không hợp lệ");
      return false;
    }

    if (!phoneNumber.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập số điện thoại");
      return false;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      Alert.alert("Lỗi", "Số điện thoại không hợp lệ");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("Lỗi", "Mật khẩu phải có ít nhất 6 ký tự");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp");
      return false;
    }

    return true;
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhoneNumber = (phone: string) => {
    const phoneRegex = /^[0-9]{10,11}$/;
    return phoneRegex.test(phone.replace(/\s/g, ""));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const requestBody = {
        userName: formData.email,
        email: formData.email,
        passwordHash: formData.password,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
      };

      const userData = await register(requestBody);

      if (onSuccess) {
        onSuccess(userData);
      }

      onSubmit?.(formData.email, formData.password, formData.confirmPassword);
    } catch (error: any) {
      console.error("💥 Registration error:", error);

      let userFriendlyMessage = error.message || "Có lỗi xảy ra khi đăng ký";

      if (userFriendlyMessage.toLowerCase().includes("email already exists")) {
        userFriendlyMessage =
          "Email này đã được sử dụng. Vui lòng sử dụng email khác hoặc đăng nhập.";
      } else if (userFriendlyMessage.toLowerCase().includes("phone")) {
        userFriendlyMessage =
          "Số điện thoại không hợp lệ hoặc đã được sử dụng.";
      } else if (userFriendlyMessage.toLowerCase().includes("password")) {
        userFriendlyMessage = "Mật khẩu không đáp ứng yêu cầu bảo mật.";
      }

      Alert.alert("Đăng ký thất bại", userFriendlyMessage);
    }
  };

  const renderInputField = (
    field: string,
    label: string,
    placeholder: string,
    keyboardType?: any,
    secureTextEntry?: boolean
  ) => {
    const isFocused = focusedField === field;
    const isPassword = field === "password";
    const isConfirmPassword = field === "confirmPassword";
    const isPasswordField = secureTextEntry;

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View
          style={[
            styles.inputContainer,
            isFocused && styles.inputContainerFocused,
          ]}
        >
          <TextInput
            style={[styles.textInput, isPasswordField && styles.passwordInput]}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={formData[field as keyof typeof formData]}
            onChangeText={(value) =>
              updateFormData(
                field,
                field === "email" ? value.toLowerCase() : value
              )
            }
            onFocus={() => setFocusedField(field)}
            onBlur={() => setFocusedField("")}
            keyboardType={keyboardType}
            autoCapitalize={
              field === "fullName"
                ? "words"
                : field === "email"
                ? "none"
                : "sentences"
            }
            secureTextEntry={
              isPassword
                ? !isPasswordVisible
                : isConfirmPassword
                ? !isConfirmPasswordVisible
                : secureTextEntry
            }
            editable={!isLoading}
            autoCorrect={false}
            multiline={false}
            numberOfLines={1}
          />
          {isPasswordField && (
            <TouchableOpacity
              style={styles.passwordToggle}
              onPress={() => {
                if (isPassword) {
                  setIsPasswordVisible(!isPasswordVisible);
                } else if (isConfirmPassword) {
                  setIsConfirmPasswordVisible(!isConfirmPasswordVisible);
                }
              }}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              <Text style={styles.toggleText}>
                {(isPassword ? isPasswordVisible : isConfirmPasswordVisible)
                  ? "Ẩn"
                  : "Hiện"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const getPasswordStrength = () => {
    const { password } = formData;
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8 && /[A-Z]/.test(password)) strength++;
    if (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password)
    )
      strength++;
    return strength;
  };

  const getPasswordStrengthText = () => {
    const strength = getPasswordStrength();
    if (strength === 0) return "Quá yếu";
    if (strength === 1) return "Yếu";
    if (strength === 2) return "Trung bình";
    return "Mạnh";
  };

  const getPasswordStrengthColor = () => {
    const strength = getPasswordStrength();
    if (strength === 0) return "#EF4444";
    if (strength === 1) return "#F59E0B";
    if (strength === 2) return "#10B981";
    return "#059669";
  };

  return (
    <View style={styles.container}>
      {/* Form Fields */}
      {renderInputField(
        "fullName",
        "Họ và tên",
        "Nhập họ và tên của bạn",
        "default"
      )}
      {renderInputField(
        "email",
        "Email",
        "your.email@example.com",
        "email-address"
      )}
      {renderInputField(
        "phoneNumber",
        "Số điện thoại",
        "0912 345 678",
        "phone-pad"
      )}
      {renderInputField("password", "Mật khẩu", "••••••••", "default", true)}
      {renderInputField(
        "confirmPassword",
        "Xác nhận mật khẩu",
        "••••••••",
        "default",
        true
      )}

      {/* Password Strength Indicator */}
      {formData.password.length > 0 && (
        <View style={styles.passwordStrengthContainer}>
          <View style={styles.passwordStrengthHeader}>
            <Text style={styles.passwordStrengthTitle}>Độ mạnh mật khẩu:</Text>
            <Text
              style={[
                styles.passwordStrengthValue,
                { color: getPasswordStrengthColor() },
              ]}
            >
              {getPasswordStrengthText()}
            </Text>
          </View>
          <View style={styles.passwordStrengthBar}>
            {[0, 1, 2].map((index) => (
              <View
                key={index}
                style={[
                  styles.strengthSegment,
                  {
                    backgroundColor:
                      index < getPasswordStrength()
                        ? getPasswordStrengthColor()
                        : "#E5E7EB",
                  },
                ]}
              />
            ))}
          </View>
          <Text style={styles.passwordHint}>
            Nên có ít nhất 8 ký tự, bao gồm chữ hoa và số
          </Text>
        </View>
      )}

      {/* Register Button */}
      <TouchableOpacity
        style={[
          styles.registerButton,
          isLoading && styles.registerButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.85}
      >
        <Text style={styles.registerButtonText}>
          {isLoading ? "Đang tạo tài khoản..." : "Tạo tài khoản"}
        </Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>hoặc</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Login Link */}
      <TouchableOpacity
        style={styles.loginButton}
        onPress={onLogin}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Text style={[styles.loginButtonText, isLoading && styles.disabled]}>
          Đã có tài khoản? Đăng nhập ngay
        </Text>
      </TouchableOpacity>

      {/* Terms */}
      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          Bằng việc đăng ký, bạn đồng ý với{" "}
          <Text style={styles.linkText}>Điều khoản sử dụng</Text> và{" "}
          <Text style={styles.linkText}>Chính sách bảo mật</Text> của SnapLink
        </Text>
      </View>

      {/* Professional Tip */}
      <View style={styles.tipContainer}>
        <View style={styles.tipHeader}>
          <Text style={styles.tipTitle}>Pro Tip</Text>
        </View>
        <Text style={styles.tipText}>
          Hoàn thiện <Text style={styles.tipHighlight}>profile</Text> sau khi
          đăng ký để tăng cơ hội kết nối với photographer phù hợp
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 16,
    height: 56,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputContainerFocused: {
    borderColor: "#111827",
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    fontWeight: "400",
    paddingVertical: 0,
    textAlignVertical: "center",
  },
  passwordInput: {
    paddingRight: 60,
  },
  passwordToggle: {
    position: "absolute",
    right: 16,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  toggleText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "600",
  },
  passwordStrengthContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#E5E7EB",
  },
  passwordStrengthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  passwordStrengthTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  passwordStrengthValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  passwordStrengthBar: {
    flexDirection: "row",
    marginBottom: 8,
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  passwordHint: {
    fontSize: 12,
    color: "#6B7280",
    fontStyle: "italic",
  },
  registerButton: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginBottom: 24,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 56,
  },
  registerButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#9CA3AF",
    fontSize: 14,
    fontWeight: "500",
  },
  loginButton: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 32,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 56,
  },
  loginButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  termsContainer: {
    marginBottom: 24,
  },
  termsText: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 18,
  },
  linkText: {
    color: "#111827",
    fontWeight: "600",
  },
  tipContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#E5E7EB",
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: 0.2,
  },
  tipText: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
  tipHighlight: {
    fontWeight: "700",
    color: "#111827",
  },
  disabled: {
    opacity: 0.5,
  },
});

export default RegisterForm;
