import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Flow steps enum
enum ForgotPasswordStep {
  EMAIL_INPUT = "EMAIL_INPUT",
  CODE_VERIFICATION = "CODE_VERIFICATION",
  PASSWORD_RESET = "PASSWORD_RESET",
  SUCCESS = "SUCCESS",
}

interface Props {
  currentStep: ForgotPasswordStep;
  email: string;
  isLoading: boolean;
  onSendResetCode: (email: string) => void;
  onVerifyCode: (code: string) => void;
  onResetPassword: (newPassword: string, confirmPassword: string) => void;
  onBackToLogin: () => void;
  onResendCode: () => void;
}

const ForgotPasswordForm: React.FC<Props> = ({
  currentStep,
  email,
  isLoading,
  onSendResetCode,
  onVerifyCode,
  onResetPassword,
  onBackToLogin,
  onResendCode,
}) => {
  // Step 1: Email input
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);

  // Step 2: Code verification
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const codeRefs = useRef<Array<TextInput | null>>([]);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);

  // Step 3: Password reset
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

  // Timer for resend code
  useEffect(() => {
    if (currentStep === ForgotPasswordStep.CODE_VERIFICATION && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setCanResend(true);
    }
  }, [timeLeft, currentStep]);

  // Reset timer when entering code verification step
  useEffect(() => {
    if (currentStep === ForgotPasswordStep.CODE_VERIFICATION) {
      setTimeLeft(300);
      setCanResend(false);
    }
  }, [currentStep]);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation
  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return "Mật khẩu phải có ít nhất 6 ký tự";
    }
    return "";
  };

  // Handle email submission
  const handleEmailSubmit = () => {
    setEmailError("");

    if (!emailInput.trim()) {
      setEmailError("Vui lòng nhập email");
      return;
    }

    if (!validateEmail(emailInput)) {
      setEmailError("Email không hợp lệ");
      return;
    }

    onSendResetCode(emailInput);
  };

  // Handle code input
  const handleCodeChange = (text: string, index: number) => {
    if (text.length > 1) {
      // Handle paste
      const pastedCode = text.slice(0, 6);
      const newCode = [...code];
      for (let i = 0; i < pastedCode.length && index + i < 6; i++) {
        newCode[index + i] = pastedCode[i];
      }
      setCode(newCode);

      // Focus last filled input or next empty
      const nextIndex = Math.min(index + pastedCode.length, 5);
      codeRefs.current[nextIndex]?.focus();
    } else {
      // Normal input
      const newCode = [...code];
      newCode[index] = text;
      setCode(newCode);

      // Auto focus next input
      if (text && index < 5) {
        codeRefs.current[index + 1]?.focus();
      }
    }
  };

  // Handle code verification
  const handleCodeVerify = () => {
    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      Alert.alert("Lỗi", "Vui lòng nhập đầy đủ mã 6 số");
      return;
    }
    onVerifyCode(fullCode);
  };

  // Handle password reset
  const handlePasswordReset = () => {
    setPasswordError("");

    const passwordValidation = validatePassword(newPassword);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp");
      return;
    }

    onResetPassword(newPassword, confirmPassword);
  };

  // Handle resend code
  const handleResendCode = () => {
    setCode(["", "", "", "", "", ""]);
    setTimeLeft(300);
    setCanResend(false);
    onResendCode();
  };

  // Auto-submit code when complete
  useEffect(() => {
    const fullCode = code.join("");
    if (fullCode.length === 6) {
      setTimeout(() => handleCodeVerify(), 500);
    }
  }, [code]);

  // Render different steps
  const renderEmailInput = () => (
    <View style={styles.stepContainer}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <View
          style={[
            styles.inputContainer,
            emailFocused && styles.inputContainerFocused,
            emailError && styles.inputContainerError,
          ]}
        >
          <TextInput
            style={styles.textInput}
            placeholder="your.email@example.com"
            placeholderTextColor="#9CA3AF"
            value={emailInput}
            onChangeText={(text) => {
              setEmailInput(text);
              setEmailError("");
            }}
            onFocus={() => setEmailFocused(true)}
            onBlur={() => setEmailFocused(false)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            multiline={false}
            numberOfLines={1}
          />
        </View>
        {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.disabledButton]}
        onPress={handleEmailSubmit}
        disabled={isLoading}
        activeOpacity={0.85}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.loadingText}>Đang gửi...</Text>
          </View>
        ) : (
          <Text style={styles.primaryButtonText}>Gửi mã xác nhận</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onBackToLogin}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryButtonText}>Quay lại đăng nhập</Text>
      </TouchableOpacity>

      {/* Professional Tip */}
      <View style={styles.tipContainer}>
        <View style={styles.tipHeader}>
          <Text style={styles.tipTitle}>Pro Tip</Text>
        </View>
        <Text style={styles.tipText}>
          Kiểm tra <Text style={styles.tipHighlight}>thư mục spam</Text> nếu
          không thấy email trong hộp thư chính
        </Text>
      </View>
    </View>
  );

  const renderCodeVerification = () => (
    <View style={styles.stepContainer}>
      <View style={styles.instructionContainer}>
        <Text style={styles.instructionText}>Mã xác nhận đã được gửi đến:</Text>
        <Text style={styles.emailText}>{email}</Text>
      </View>

      <View style={styles.codeGroup}>
        <Text style={styles.inputLabel}>Nhập mã xác nhận</Text>
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                codeRefs.current[index] = ref;
              }}
              style={styles.codeInput}
              value={digit}
              onChangeText={(text) => handleCodeChange(text, index)}
              keyboardType="numeric"
              maxLength={2} // Allow paste
              textAlign="center"
              editable={!isLoading}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === "Backspace" && !digit && index > 0) {
                  codeRefs.current[index - 1]?.focus();
                }
              }}
            />
          ))}
        </View>
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        {timeLeft > 0 ? (
          <Text style={styles.timerText}>
            Mã sẽ hết hạn sau:{" "}
            <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
          </Text>
        ) : (
          <Text style={styles.expiredText}>Mã xác nhận đã hết hạn</Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.primaryButton,
          (isLoading || code.join("").length !== 6) && styles.disabledButton,
        ]}
        onPress={handleCodeVerify}
        disabled={isLoading || code.join("").length !== 6}
        activeOpacity={0.85}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.loadingText}>Đang xác nhận...</Text>
          </View>
        ) : (
          <Text style={styles.primaryButtonText}>Xác nhận</Text>
        )}
      </TouchableOpacity>

      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Không nhận được mã? </Text>
        {canResend ? (
          <TouchableOpacity
            onPress={handleResendCode}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.resendLink}>Gửi lại</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.resendDisabled}>
            Có thể gửi lại sau {formatTime(timeLeft)}
          </Text>
        )}
      </View>
    </View>
  );

  const renderPasswordReset = () => (
    <View style={styles.stepContainer}>
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Mật khẩu mới</Text>
        <View
          style={[
            styles.inputContainer,
            newPasswordFocused && styles.inputContainerFocused,
            passwordError && styles.inputContainerError,
          ]}
        >
          <TextInput
            style={[styles.textInput, styles.passwordInput]}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            value={newPassword}
            onChangeText={(text) => {
              setNewPassword(text);
              setPasswordError("");
            }}
            onFocus={() => setNewPasswordFocused(true)}
            onBlur={() => setNewPasswordFocused(false)}
            secureTextEntry={!showNewPassword}
            editable={!isLoading}
            multiline={false}
            numberOfLines={1}
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowNewPassword(!showNewPassword)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleText}>
              {showNewPassword ? "Ẩn" : "Hiện"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Xác nhận mật khẩu mới</Text>
        <View
          style={[
            styles.inputContainer,
            confirmPasswordFocused && styles.inputContainerFocused,
            passwordError && styles.inputContainerError,
          ]}
        >
          <TextInput
            style={[styles.textInput, styles.passwordInput]}
            placeholder="••••••••"
            placeholderTextColor="#9CA3AF"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setPasswordError("");
            }}
            onFocus={() => setConfirmPasswordFocused(true)}
            onBlur={() => setConfirmPasswordFocused(false)}
            secureTextEntry={!showConfirmPassword}
            editable={!isLoading}
            multiline={false}
            numberOfLines={1}
          />
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleText}>
              {showConfirmPassword ? "Ẩn" : "Hiện"}
            </Text>
          </TouchableOpacity>
        </View>
        {passwordError ? (
          <Text style={styles.errorText}>{passwordError}</Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.disabledButton]}
        onPress={handlePasswordReset}
        disabled={isLoading}
        activeOpacity={0.85}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.loadingText}>Đang đặt lại...</Text>
          </View>
        ) : (
          <Text style={styles.primaryButtonText}>Đặt lại mật khẩu</Text>
        )}
      </TouchableOpacity>

      {/* Password Strength Tip */}
      <View style={styles.tipContainer}>
        <View style={styles.tipHeader}>
          <Text style={styles.tipTitle}>Pro Tip</Text>
        </View>
        <Text style={styles.tipText}>
          Sử dụng mật khẩu <Text style={styles.tipHighlight}>mạnh</Text> với ít
          nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số
        </Text>
      </View>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.stepContainer}>
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark-circle" size={80} color="#10B981" />
        </View>
        <Text style={styles.successTitle}>Thành công!</Text>
        <Text style={styles.successText}>
          Mật khẩu của bạn đã được đặt lại thành công. Bạn có thể đăng nhập với
          mật khẩu mới.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onBackToLogin}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Đăng nhập ngay</Text>
      </TouchableOpacity>
    </View>
  );

  // Main render
  switch (currentStep) {
    case ForgotPasswordStep.EMAIL_INPUT:
      return renderEmailInput();
    case ForgotPasswordStep.CODE_VERIFICATION:
      return renderCodeVerification();
    case ForgotPasswordStep.PASSWORD_RESET:
      return renderPasswordReset();
    case ForgotPasswordStep.SUCCESS:
      return renderSuccess();
    default:
      return renderEmailInput();
  }
};

const styles = StyleSheet.create({
  stepContainer: {
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
  inputContainerError: {
    borderColor: "#EF4444",
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
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    marginTop: 4,
    fontWeight: "500",
  },
  instructionContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  instructionText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "400",
  },
  emailText: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
    textAlign: "center",
  },
  codeGroup: {
    marginBottom: 24,
  },
  codeContainer: {
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
  primaryButton: {
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
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  secondaryButton: {
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
  secondaryButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    flexWrap: "wrap",
  },
  resendText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "400",
  },
  resendLink: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },
  resendDisabled: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  successContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  successIcon: {
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#10B981",
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "400",
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
});

export default ForgotPasswordForm;
