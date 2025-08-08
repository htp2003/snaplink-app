// screens/RegisterScreen.tsx - Clean version sử dụng RegisterForm component
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import RegisterForm from "../components/Auth/RegisterForm";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  // ✨ Handle register success - navigate to EmailVerification
  const handleRegisterSuccess = (userData: any) => {
    navigation.navigate("EmailVerification", {
      email: userData.email,
    });
  };

  // Handle navigate to login
  const handleNavigateToLogin = () => {
    navigation.navigate("Login");
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#10B981" />
      <LinearGradient
        colors={["#10B981", "#06B6D4", "#3B82F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoText}>📸</Text>
                </View>
              </View>

              <View style={styles.titleContainer}>
                <Text style={styles.title}>Tạo tài khoản mới</Text>
                <Text style={styles.subtitle}>
                  Tham gia SnapLink để khám phá thế giới nhiếp ảnh đầy màu sắc
                </Text>
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.formContainer}>
                {/* ✨ Sử dụng RegisterForm component với clean props */}
                <RegisterForm
                  onSuccess={handleRegisterSuccess}
                  onLogin={handleNavigateToLogin}
                />
              </View>
            </View>

            {/* Benefits Section */}
            <View style={styles.benefitsContainer}>
              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Text style={styles.benefitEmoji}>🎯</Text>
                </View>
                <Text style={styles.benefitText}>
                  Tìm nhiếp ảnh gia phù hợp
                </Text>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Text style={styles.benefitEmoji}>📍</Text>
                </View>
                <Text style={styles.benefitText}>Khám phá địa điểm đẹp</Text>
              </View>

              <View style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <Text style={styles.benefitEmoji}>💎</Text>
                </View>
                <Text style={styles.benefitText}>
                  Trải nghiệm chất lượng cao
                </Text>
              </View>
            </View>

            {/* Decorative Elements */}
            <View style={styles.decorativeContainer}>
              <View style={[styles.decorativeShape, styles.shape1]} />
              <View style={[styles.decorativeShape, styles.shape2]} />
              <View style={[styles.decorativeShape, styles.shape3]} />
              <View style={[styles.decorativeShape, styles.shape4]} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 30,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  logoText: {
    fontSize: 40,
  },
  titleContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 16,
  },
  formSection: {
    marginBottom: 32,
  },
  formContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 20,
    padding: 28,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
  },
  benefitsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    marginTop: 16,
  },
  benefitItem: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 8,
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  benefitEmoji: {
    fontSize: 20,
  },
  benefitText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    fontWeight: "500",
    lineHeight: 16,
  },
  decorativeContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  decorativeShape: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  shape1: {
    width: 140,
    height: 140,
    borderRadius: 70,
    top: 80,
    right: -40,
  },
  shape2: {
    width: 60,
    height: 60,
    borderRadius: 30,
    bottom: 300,
    left: -15,
  },
  shape3: {
    width: 100,
    height: 100,
    borderRadius: 20,
    top: 250,
    left: 30,
    transform: [{ rotate: "45deg" }],
  },
  shape4: {
    width: 80,
    height: 80,
    borderRadius: 40,
    bottom: 150,
    right: 20,
  },
});

export default RegisterScreen;
