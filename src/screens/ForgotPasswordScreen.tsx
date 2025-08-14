import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
  TouchableOpacity,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { RootStackParamList } from "../navigation/types";
import ForgotPasswordForm from "../components/Auth/ForgotPasswordForm";
import { useAuth } from "../hooks/useAuth";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

// Flow steps
enum ForgotPasswordStep {
  EMAIL_INPUT = "EMAIL_INPUT",
  CODE_VERIFICATION = "CODE_VERIFICATION",
  PASSWORD_RESET = "PASSWORD_RESET",
  SUCCESS = "SUCCESS",
}

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState<ForgotPasswordStep>(
    ForgotPasswordStep.EMAIL_INPUT
  );
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ✅ Use useAuth hook instead of AuthService
  const { sendResetCode, verifyResetCode, resetPassword } = useAuth();

  // Step 1: Send reset code to email
  const handleSendResetCode = async (emailInput: string) => {
    setIsLoading(true);
    try {
      const response = await sendResetCode(emailInput);
      setEmail(emailInput);
      setCurrentStep(ForgotPasswordStep.CODE_VERIFICATION);
      Alert.alert(
        "Thành công",
        response.message ||
          "Đã gửi mã đặt lại mật khẩu qua email. Vui lòng kiểm tra hộp thư của bạn.",
        [{ text: "OK" }]
      );
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.message || "Không thể gửi mã đặt lại. Vui lòng thử lại.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify reset code
  const handleVerifyCode = async (code: string) => {
    setIsLoading(true);
    try {
      const response = await verifyResetCode(email, code);
      setVerificationCode(code);
      setCurrentStep(ForgotPasswordStep.PASSWORD_RESET);
      Alert.alert(
        "Thành công",
        response.message || "Mã xác nhận hợp lệ. Vui lòng nhập mật khẩu mới.",
        [{ text: "OK" }]
      );
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.message || "Mã xác nhận không đúng. Vui lòng thử lại.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (
    newPassword: string,
    confirmPassword: string
  ) => {
    if (newPassword !== confirmPassword) {
      Alert.alert("Lỗi", "Mật khẩu xác nhận không khớp!");
      return;
    }

    setIsLoading(true);
    try {
      const response = await resetPassword(
        email,
        verificationCode,
        newPassword,
        confirmPassword
      );
      setCurrentStep(ForgotPasswordStep.SUCCESS);

      Alert.alert(
        "Thành công",
        response.message || "Mật khẩu đã được đặt lại thành công!",
        [
          {
            text: "Đăng nhập ngay",
            onPress: () => navigation.navigate("Login"),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        "Lỗi",
        error.message || "Không thể đặt lại mật khẩu. Vui lòng thử lại.",
        [{ text: "OK" }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate("Login");
  };

  const handleResendCode = () => {
    setCurrentStep(ForgotPasswordStep.EMAIL_INPUT);
  };

  const handleBack = () => {
    if (currentStep === ForgotPasswordStep.EMAIL_INPUT) {
      navigation.goBack();
    } else {
      // Go back to previous step
      switch (currentStep) {
        case ForgotPasswordStep.CODE_VERIFICATION:
          setCurrentStep(ForgotPasswordStep.EMAIL_INPUT);
          break;
        case ForgotPasswordStep.PASSWORD_RESET:
          setCurrentStep(ForgotPasswordStep.CODE_VERIFICATION);
          break;
        default:
          setCurrentStep(ForgotPasswordStep.EMAIL_INPUT);
      }
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case ForgotPasswordStep.EMAIL_INPUT:
        return "Quên mật khẩu?";
      case ForgotPasswordStep.CODE_VERIFICATION:
        return "Xác nhận mã";
      case ForgotPasswordStep.PASSWORD_RESET:
        return "Đặt lại mật khẩu";
      case ForgotPasswordStep.SUCCESS:
        return "Hoàn thành!";
      default:
        return "Quên mật khẩu?";
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case ForgotPasswordStep.EMAIL_INPUT:
        return "Nhập email của bạn để nhận mã đặt lại mật khẩu";
      case ForgotPasswordStep.CODE_VERIFICATION:
        return `Nhập mã 6 số đã được gửi đến ${email}`;
      case ForgotPasswordStep.PASSWORD_RESET:
        return "Nhập mật khẩu mới cho tài khoản của bạn";
      case ForgotPasswordStep.SUCCESS:
        return "Mật khẩu đã được đặt lại thành công";
      default:
        return "";
    }
  };

  const getProgressWidth = () => {
    switch (currentStep) {
      case ForgotPasswordStep.EMAIL_INPUT:
        return "33%";
      case ForgotPasswordStep.CODE_VERIFICATION:
        return "66%";
      case ForgotPasswordStep.PASSWORD_RESET:
      case ForgotPasswordStep.SUCCESS:
        return "100%";
      default:
        return "33%";
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <LinearGradient
        colors={["#FFFFFF", "#F9FAFB", "#F3F4F6"]}
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
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Section */}
            <View style={styles.headerSection}>
              {/* Back Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBack}
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#111827" />
              </TouchableOpacity>

              <View style={styles.logoContainer}>
                <View style={styles.logoBackground}>
                  <Image
                    source={require("../../assets/logo.png")}
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <View style={styles.titleContainer}>
                <Text style={styles.title}>{getStepTitle()}</Text>
                <Text style={styles.subtitle}>{getStepSubtitle()}</Text>
              </View>

              {/* Progress indicator */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[styles.progressFill, { width: getProgressWidth() }]}
                  />
                </View>
                <Text style={styles.progressText}>
                  Bước{" "}
                  {currentStep === ForgotPasswordStep.EMAIL_INPUT
                    ? "1"
                    : currentStep === ForgotPasswordStep.CODE_VERIFICATION
                    ? "2"
                    : "3"}{" "}
                  / 3
                </Text>
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.formContainer}>
                <ForgotPasswordForm
                  currentStep={currentStep}
                  email={email}
                  isLoading={isLoading}
                  onSendResetCode={handleSendResetCode}
                  onVerifyCode={handleVerifyCode}
                  onResetPassword={handleResetPassword}
                  onBackToLogin={handleBackToLogin}
                  onResendCode={handleResendCode}
                />
              </View>
            </View>

            {/* Minimal Decorative Elements */}
            <View style={styles.decorativeContainer}>
              <View style={[styles.decorativeElement, styles.element1]} />
              <View style={[styles.decorativeElement, styles.element2]} />
              <View style={[styles.decorativeElement, styles.element3]} />
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
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingBottom: 30,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 48,
    paddingTop: 20,
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 0,
    top: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoBackground: {
    width: 80,
    height: 80,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  logo: {
    width: 70,
    height: 70,
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
    fontWeight: "400",
  },
  progressContainer: {
    width: "100%",
    alignItems: "center",
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#111827",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  formSection: {
    flex: 1,
    justifyContent: "center",
  },
  formContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    marginHorizontal: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  decorativeContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  decorativeElement: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  element1: {
    width: 60,
    height: 60,
    borderRadius: 30,
    top: 120,
    right: 30,
    transform: [{ rotate: "15deg" }],
  },
  element2: {
    width: 40,
    height: 40,
    borderRadius: 8,
    bottom: 180,
    left: 20,
    transform: [{ rotate: "-12deg" }],
  },
  element3: {
    width: 80,
    height: 20,
    borderRadius: 10,
    top: 300,
    left: 40,
    transform: [{ rotate: "25deg" }],
  },
});

export default ForgotPasswordScreen;
