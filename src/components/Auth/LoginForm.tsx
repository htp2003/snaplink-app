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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import Button from "../Button";
import { useAuth } from "../../hooks/useAuth";

interface LoginFormProps {
  onSubmit?: (email: string, password: string) => void;
  onForgotPassword: () => void;
  onRegister: () => void;
  onSuccess?: (user: any) => void;
  onNavigateToForgotPassword?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onForgotPassword,
  onRegister,
  onSuccess,
  onNavigateToForgotPassword,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const { login, isLoading } = useAuth();
  const navigation = useNavigation();

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ thông tin");
      return;
    }

    if (!isValidEmail(email)) {
      Alert.alert("Lỗi", "Email không hợp lệ");
      return;
    }

    try {
      const loggedInUser = await login(email, password);

      if (loggedInUser && loggedInUser.roles) {
        const validRoles = loggedInUser.roles.filter((role) =>
          ["user", "photographer", "owner"].includes(role.toLowerCase())
        );

        if (validRoles.length === 1) {
          const role = validRoles[0].toLowerCase();
          await AsyncStorage.setItem("selectedRole", role);

          switch (role) {
            case "user":
              navigation.reset({
                index: 0,
                routes: [{ name: "CustomerMain" as never }],
              });
              break;
            case "photographer":
              navigation.reset({
                index: 0,
                routes: [{ name: "PhotographerMain" as never }],
              });
              break;
            case "owner":
              navigation.reset({
                index: 0,
                routes: [{ name: "VenueOwnerMain" as never }],
              });
              break;
            default:
              navigation.reset({
                index: 0,
                routes: [{ name: "CustomerMain" as never }],
              });
          }
        } else if (validRoles.length > 1) {
          navigation.navigate("RoleSelection" as never);
        } else {
          navigation.navigate("StepContainer" as never);
        }
      } else {
        navigation.navigate("StepContainer" as never);
      }

      if (onSuccess) {
        onSuccess({ email });
      }

      onSubmit?.(email, password);
    } catch (error: any) {
      console.error("🔥 LOGIN ERROR:", error);
      Alert.alert("Đăng nhập thất bại", error.message || "Có lỗi xảy ra");
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleForgotPassword = () => {
    if (onNavigateToForgotPassword) {
      onNavigateToForgotPassword();
    } else {
      onForgotPassword();
    }
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  return (
    <View style={styles.container}>
      {/* Email Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <View
          style={[
            styles.inputContainer,
            emailFocused && styles.inputContainerFocused,
          ]}
        >
          <TextInput
            style={styles.textInput}
            placeholder="your.email@example.com"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!isLoading}
            returnKeyType="next"
            multiline={false}
            numberOfLines={1}
          />
        </View>
      </View>

      {/* Password Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Mật khẩu</Text>
        <View
          style={[
            styles.inputContainer,
            passwordFocused && styles.inputContainerFocused,
          ]}
        >
          <TextInput
            style={[styles.textInput, styles.passwordInput]}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            secureTextEntry={!isPasswordVisible}
            autoComplete="password"
            editable={!isLoading}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            multiline={false}
            numberOfLines={1}
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={togglePasswordVisibility}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <Text style={styles.toggleText}>
              {isPasswordVisible ? "Ẩn" : "Hiện"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Forgot Password */}
      <TouchableOpacity
        style={styles.forgotPassword}
        onPress={handleForgotPassword}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Text style={[styles.forgotPasswordText, isLoading && styles.disabled]}>
          Quên mật khẩu?
        </Text>
      </TouchableOpacity>

      {/* Login Button */}
      <TouchableOpacity
        style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.85}
      >
        <Text style={styles.loginButtonText}>
          {isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
        </Text>
      </TouchableOpacity>

      {/* Divider */}
      <View style={styles.dividerContainer}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>hoặc</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Register Link */}
      <TouchableOpacity
        style={styles.registerButton}
        onPress={onRegister}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Text style={[styles.registerButtonText, isLoading && styles.disabled]}>
          Tạo tài khoản mới
        </Text>
      </TouchableOpacity>

      {/* Professional Tip */}
      <View style={styles.tipContainer}>
        <View style={styles.tipHeader}>
          <Text style={styles.tipTitle}>Pro Tip</Text>
        </View>
        <Text style={styles.tipText}>
          Chụp ảnh trong <Text style={styles.tipHighlight}>Golden Hour</Text>{" "}
          (6-7h sáng, 5-6h chiều) để có ánh sáng tự nhiên đẹp nhất
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 32,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "500",
  },
  loginButton: {
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
  loginButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  loginButtonText: {
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
  registerButton: {
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
  registerButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.3,
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
  tipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tipIconText: {
    fontSize: 12,
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

export default LoginForm;
