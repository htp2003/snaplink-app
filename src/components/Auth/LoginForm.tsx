import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import InputField from "../InputField";
import Button from "../Button";
import { useAuth } from "../../hooks/useAuth";

interface LoginFormProps {
  onSubmit?: (email: string, password: string) => void;
  onForgotPassword: () => void;
  onRegister: () => void;
  onSuccess?: (user: any) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onForgotPassword,
  onRegister,
  onSuccess,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  return (
    <View style={styles.container}>
      <InputField
        icon="mail-outline"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!isLoading}
      />
      <InputField
        icon="lock-closed-outline"
        placeholder="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!isLoading}
      />
      <TouchableOpacity
        style={styles.forgotPassword}
        onPress={onForgotPassword}
        disabled={isLoading}
      >
        <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
      </TouchableOpacity>

      <Button
        title={isLoading ? "Đang đăng nhập..." : "Đăng nhập"}
        onPress={handleSubmit}
      />

      <View style={styles.registerContainer}>
        <Text style={styles.registerText}>Chưa có tài khoản? </Text>
        <TouchableOpacity onPress={onRegister} disabled={isLoading}>
          <Text style={[styles.registerLink, isLoading && styles.disabled]}>
            Đăng ký
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  forgotPassword: {
    alignSelf: "flex-end",
  },
  forgotPasswordText: {
    color: "#666666",
    fontSize: 14,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  registerText: {
    color: "#666666",
    fontSize: 14,
  },
  registerLink: {
    color: "#000000",
    fontSize: 14,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
});

export default LoginForm;
