import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Alert, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from 'expo-linear-gradient';
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
  onNavigateToForgotPassword
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
      // ✅ Lấy user data trực tiếp từ login function
      const loggedInUser = await login(email, password);

      if (loggedInUser && loggedInUser.roles) {
        // Filter roles (không phân biệt hoa thường)
        const validRoles = loggedInUser.roles.filter((role) =>
          ["user", "photographer", "owner"].includes(role.toLowerCase())
        );

        if (validRoles.length === 1) {
          // Single role - navigate directly
          const role = validRoles[0].toLowerCase();

          // Save selected role
          await AsyncStorage.setItem("selectedRole", role);

          // Navigate based on role
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
      console.error("🔍 LOGIN ERROR:", error);
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
        <View style={[
          styles.inputContainer,
          emailFocused && styles.inputContainerFocused
        ]}>
          <View style={styles.inputIcon}>
            <Text style={styles.iconText}>✉️</Text>
          </View>
          <TextInput
            style={styles.textInput}
            placeholder="example@gmail.com"
            placeholderTextColor="#A16207"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading}
          />
        </View>
      </View>

      {/* Password Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Mật khẩu</Text>
        <View style={[
          styles.inputContainer,
          passwordFocused && styles.inputContainerFocused
        ]}>
          <View style={styles.inputIcon}>
            <Text style={styles.iconText}>🗝️</Text>
          </View>
          <TextInput
            style={[styles.textInput, styles.passwordInput]}
            placeholder="Nhập mật khẩu"
            placeholderTextColor="#A16207"
            value={password}
            onChangeText={setPassword}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            secureTextEntry={!isPasswordVisible}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={togglePasswordVisibility}
            activeOpacity={0.7}
            disabled={isLoading}
          >
            <View style={styles.toggleButton}>
              <Text style={styles.toggleIcon}>
                {isPasswordVisible ? '🙈' : '👁️'}
              </Text>
            </View>
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
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#F97316', '#EA580C', '#DC2626']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.loginButtonGradient}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? '⏳ Đang đăng nhập...' : '🚀 Đăng nhập'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Register Link */}
      <View style={styles.registerContainer}>
        <Text style={styles.registerText}>Chưa có tài khoản? </Text>
        <TouchableOpacity 
          onPress={onRegister} 
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Text style={[styles.registerLink, isLoading && styles.disabled]}>
            Đăng ký ngay 
          </Text>
        </TouchableOpacity>
      </View>

      {/* Photography Tip */}
      <View style={styles.tipContainer}>
        <Text style={styles.tipText}>
          💡 <Text style={styles.tipHighlight}>Mẹo:</Text> Chụp ảnh đẹp nhất vào golden hour (6-7h sáng, 5-6h chiều)
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EA580C',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FDE68A',
    paddingHorizontal: 4,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputContainerFocused: {
    borderColor: '#F97316',
    backgroundColor: '#FFFBEB',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  inputIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
    marginLeft: 6,
  },
  iconText: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#92400E',
    fontWeight: '500',
  },
  passwordInput: {
    paddingRight: 60,
  },
  passwordToggle: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -20 }],
  },
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleIcon: {
    fontSize: 16,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  forgotPasswordText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#FDE68A',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#A16207',
    fontSize: 14,
    fontWeight: '500',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  socialButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#D1D5DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  socialButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  socialButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  socialButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  registerText: {
    color: '#A16207',
    fontSize: 14,
  },
  registerLink: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  tipContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  tipText: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  tipHighlight: {
    fontWeight: '700',
    color: '#EA580C',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default LoginForm;