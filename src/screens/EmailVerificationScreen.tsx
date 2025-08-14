import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";

const BASE_URL =
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

type Props = NativeStackScreenProps<RootStackParamList, "EmailVerification">;

const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email } = route.params;

  useEffect(() => {
    console.log("📧 EmailVerificationScreen mounted với email:", email);
  }, []);

  const [verificationCode, setVerificationCode] = useState([
    "",
    "",
    "",
    "",
    "",
    "",
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 phút
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState("");

  const inputRefs = useRef<TextInput[]>([]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Handle code input
  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    setError("");

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto verify when complete
    if (value && index === 5) {
      const fullCode = newCode.join("");
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  // Handle backspace
  const handleKeyPress = (index: number, key: string) => {
    if (key === "Backspace" && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (pastedText: string) => {
    const numbers = pastedText.replace(/\D/g, "");
    if (numbers.length === 6) {
      const newCode = numbers.split("");
      setVerificationCode(newCode);
      inputRefs.current[5]?.focus();
      handleVerify(numbers);
    }
  };

  // API call to verify email
  const handleVerify = async (code?: string) => {
    const codeToVerify = code || verificationCode.join("");

    console.log("🔍 Bắt đầu verify với code:", codeToVerify, "email:", email);

    if (codeToVerify.length !== 6) {
      setError("Vui lòng nhập đủ 6 chữ số");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      console.log("📡 Gọi API verify-email...");

      const requestBody = {
        email: email,
        code: codeToVerify,
      };

      console.log("📤 Request Body:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${BASE_URL}/api/User/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("📡 API Response Status:", response.status);
      console.log("📡 API Response OK:", response.ok);
      console.log("📡 Content-Type:", response.headers.get("content-type"));

      // Get raw response text
      const responseText = await response.text();
      console.log("📋 Raw Response Text:", responseText);

      let data;
      let errorMessage = "";

      // ✨ Smart response parsing - Handle both JSON and plain text
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        try {
          data = JSON.parse(responseText);
          console.log("✅ Parsed JSON:", data);
          errorMessage = data.message || data.error || "Có lỗi xảy ra";
        } catch (parseError) {
          console.error("💥 JSON Parse Error:", parseError);
          errorMessage = "Lỗi phản hồi từ server";
        }
      } else {
        // Server trả về plain text
        console.log("📄 Plain text response detected:", responseText);
        errorMessage = responseText.trim();
        data = { message: errorMessage };
      }

      if (response.ok) {
        console.log(
          "✅ Verify thành công! Chuẩn bị navigate tới StepContainer"
        );

        // Success - show success message then navigate
        Alert.alert(
          "Xác nhận thành công! 🎉",
          "Tài khoản của bạn đã được kích hoạt. Hãy hoàn tất thiết lập tài khoản.",
          [
            {
              text: "Tiếp tục",
              onPress: () => {
                console.log(
                  "🧭 Navigate tới StepContainer để bắt đầu onboarding"
                );
                navigation.replace("StepContainer");
              },
            },
          ]
        );
      } else {
        console.log("❌ Verify thất bại:", errorMessage);

        // ✨ Handle specific error messages
        let userFriendlyMessage = errorMessage;

        if (
          errorMessage.toLowerCase().includes("invalid") ||
          errorMessage.toLowerCase().includes("incorrect")
        ) {
          userFriendlyMessage =
            "Mã xác nhận không đúng. Vui lòng kiểm tra lại.";
        } else if (errorMessage.toLowerCase().includes("expired")) {
          userFriendlyMessage =
            "Mã xác nhận đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.";
        } else if (errorMessage.toLowerCase().includes("already verified")) {
          userFriendlyMessage = "Email đã được xác nhận trước đó.";
        }

        setError(userFriendlyMessage);

        // Clear incorrect code
        setVerificationCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error("💥 Verification error:", error);

      setError("Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    console.log("🔄 Resend verification code cho email:", email);

    setIsResending(true);
    setError("");

    try {
      // Tạm thời để test - có thể cần API endpoint khác cho resend
      console.log("🔄 Attempting to resend code...");

      // Reset timer và code
      setTimeLeft(300);
      setCanResend(false);
      setVerificationCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();

      Alert.alert(
        "Gửi lại thành công",
        "Mã xác nhận mới đã được gửi đến email của bạn."
      );
    } catch (error) {
      console.error("Resend error:", error);
      setError("Không thể gửi lại mã. Vui lòng thử lại sau.");
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    console.log("⬅️ Back button pressed - quay về Register");
    navigation.goBack();
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
                <Text style={styles.title}>Xác nhận email</Text>
                <Text style={styles.subtitle}>
                  Chúng tôi đã gửi mã xác nhận 6 chữ số đến
                </Text>
                <Text style={styles.emailText}>{email}</Text>
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.formContainer}>
                {/* Error Message */}
                {error && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}

                {/* Code Input */}
                <View style={styles.codeContainer}>
                  <Text style={styles.codeLabel}>Nhập mã xác nhận</Text>
                  <View style={styles.codeInputContainer}>
                    {verificationCode.map((digit, index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => {
                          if (ref) inputRefs.current[index] = ref;
                        }}
                        style={[
                          styles.codeInput,
                          digit && styles.codeInputFilled,
                          error && styles.codeInputError,
                        ]}
                        value={digit}
                        onChangeText={(value) => handleCodeChange(index, value)}
                        onKeyPress={({ nativeEvent }) =>
                          handleKeyPress(index, nativeEvent.key)
                        }
                        keyboardType="numeric"
                        maxLength={1}
                        selectTextOnFocus
                        editable={!isLoading}
                        textAlign="center"
                      />
                    ))}
                  </View>
                </View>

                {/* Timer */}
                <View style={styles.timerContainer}>
                  {timeLeft > 0 ? (
                    <Text style={styles.timerText}>
                      Mã sẽ hết hạn sau:{" "}
                      <Text style={styles.timerValue}>
                        {formatTime(timeLeft)}
                      </Text>
                    </Text>
                  ) : (
                    <Text style={styles.expiredText}>
                      Mã xác nhận đã hết hạn
                    </Text>
                  )}
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                  style={[
                    styles.verifyButton,
                    (verificationCode.join("").length !== 6 || isLoading) &&
                      styles.disabledButton,
                  ]}
                  onPress={() => handleVerify()}
                  disabled={verificationCode.join("").length !== 6 || isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.loadingText}>Đang xác nhận...</Text>
                    </View>
                  ) : (
                    <Text style={styles.buttonText}>Xác nhận</Text>
                  )}
                </TouchableOpacity>

                {/* Resend Section */}
                <View style={styles.resendSection}>
                  <Text style={styles.resendLabel}>Không nhận được mã?</Text>

                  {canResend ? (
                    <TouchableOpacity
                      onPress={handleResendCode}
                      disabled={isResending}
                      style={styles.resendButton}
                      activeOpacity={0.7}
                    >
                      {isResending ? (
                        <View style={styles.resendingContainer}>
                          <ActivityIndicator size="small" color="#111827" />
                          <Text style={styles.resendingText}>Đang gửi...</Text>
                        </View>
                      ) : (
                        <Text style={styles.resendText}>Gửi lại mã</Text>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.resendDisabledText}>
                      Có thể gửi lại sau {formatTime(timeLeft)}
                    </Text>
                  )}
                </View>

                {/* Professional Tip */}
                <View style={styles.tipContainer}>
                  <View style={styles.tipHeader}>
                    <Text style={styles.tipTitle}>Pro Tip</Text>
                  </View>
                  <Text style={styles.tipText}>
                    Kiểm tra thư mục{" "}
                    <Text style={styles.tipHighlight}>spam</Text> nếu không thấy
                    email trong hộp thư chính
                  </Text>
                </View>
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
    marginBottom: 8,
    fontWeight: "400",
  },
  emailText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
    textAlign: "center",
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
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    fontWeight: "500",
  },
  codeContainer: {
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
    textAlign: "center",
    letterSpacing: 0.2,
  },
  codeInputContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  codeInput: {
    width: 45,
    height: 56,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    fontSize: 20,
    fontWeight: "600",
    color: "#111827",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  codeInputFilled: {
    borderColor: "#111827",
    backgroundColor: "#F9FAFB",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  codeInputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  timerContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  timerText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "400",
  },
  timerValue: {
    fontWeight: "600",
    color: "#EF4444",
  },
  expiredText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "600",
  },
  verifyButton: {
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
  disabledButton: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0.05,
    elevation: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
  },
  resendSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  resendLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 8,
    fontWeight: "400",
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  resendingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  resendingText: {
    fontSize: 14,
    color: "#111827",
    marginLeft: 8,
  },
  resendDisabledText: {
    fontSize: 14,
    color: "#9CA3AF",
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

export default EmailVerificationScreen;
