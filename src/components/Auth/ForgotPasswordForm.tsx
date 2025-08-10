import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Flow steps enum
enum ForgotPasswordStep {
  EMAIL_INPUT = 'EMAIL_INPUT',
  CODE_VERIFICATION = 'CODE_VERIFICATION',
  PASSWORD_RESET = 'PASSWORD_RESET',
  SUCCESS = 'SUCCESS'
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
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');

  // Step 2: Code verification
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const codeRefs = useRef<Array<TextInput | null>>([]);

  // Step 3: Password reset
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Email validation
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Password validation
  const validatePassword = (password: string) => {
    if (password.length < 6) {
      return 'Mật khẩu phải có ít nhất 6 ký tự';
    }
    return '';
  };

  // Handle email submission
  const handleEmailSubmit = () => {
    setEmailError('');
    
    if (!emailInput.trim()) {
      setEmailError('Vui lòng nhập email');
      return;
    }
    
    if (!validateEmail(emailInput)) {
      setEmailError('Email không hợp lệ');
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
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ mã 6 số');
      return;
    }
    onVerifyCode(fullCode);
  };

  // Handle password reset
  const handlePasswordReset = () => {
    setPasswordError('');
    
    const passwordValidation = validatePassword(newPassword);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu xác nhận không khớp');
      return;
    }
    
    onResetPassword(newPassword, confirmPassword);
  };

  // Auto-submit code when complete
  useEffect(() => {
    const fullCode = code.join('');
    if (fullCode.length === 6) {
      setTimeout(() => handleCodeVerify(), 500);
    }
  }, [code]);

  // Render different steps
  const renderEmailInput = () => (
    <View style={styles.stepContainer}>
      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={[styles.textInput, emailError ? styles.inputError : null]}
          placeholder="Nhập email của bạn"
          value={emailInput}
          onChangeText={(text) => {
            setEmailInput(text);
            setEmailError('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
      </View>
      {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
      
      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.disabledButton]}
        onPress={handleEmailSubmit}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Gửi mã xác nhận</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={onBackToLogin}
        disabled={isLoading}
      >
        <Text style={styles.secondaryButtonText}>Quay lại đăng nhập</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCodeVerification = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.instructionText}>
        Mã xác nhận đã được gửi đến:
      </Text>
      <Text style={styles.emailText}>{email}</Text>
      
      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { codeRefs.current[index] = ref; }}
            style={styles.codeInput}
            value={digit}
            onChangeText={(text) => handleCodeChange(text, index)}
            keyboardType="numeric"
            maxLength={2} // Allow paste
            textAlign="center"
            editable={!isLoading}
            onKeyPress={({ nativeEvent }) => {
              if (nativeEvent.key === 'Backspace' && !digit && index > 0) {
                codeRefs.current[index - 1]?.focus();
              }
            }}
          />
        ))}
      </View>
      
      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.disabledButton]}
        onPress={handleCodeVerify}
        disabled={isLoading || code.join('').length !== 6}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Xác nhận</Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Không nhận được mã? </Text>
        <TouchableOpacity onPress={onResendCode} disabled={isLoading}>
          <Text style={styles.resendLink}>Gửi lại</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPasswordReset = () => (
    <View style={styles.stepContainer}>
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={[styles.textInput, passwordError ? styles.inputError : null]}
          placeholder="Mật khẩu mới"
          value={newPassword}
          onChangeText={(text) => {
            setNewPassword(text);
            setPasswordError('');
          }}
          secureTextEntry={!showNewPassword}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowNewPassword(!showNewPassword)}
        >
          <Ionicons
            name={showNewPassword ? "eye-outline" : "eye-off-outline"}
            size={20}
            color="#666"
          />
        </TouchableOpacity>
      </View>
      
      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
        <TextInput
          style={[styles.textInput, passwordError ? styles.inputError : null]}
          placeholder="Xác nhận mật khẩu mới"
          value={confirmPassword}
          onChangeText={(text) => {
            setConfirmPassword(text);
            setPasswordError('');
          }}
          secureTextEntry={!showConfirmPassword}
          editable={!isLoading}
        />
        <TouchableOpacity
          style={styles.eyeIcon}
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          <Ionicons
            name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
            size={20}
            color="#666"
          />
        </TouchableOpacity>
      </View>
      
      {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
      
      <TouchableOpacity
        style={[styles.primaryButton, isLoading && styles.disabledButton]}
        onPress={handlePasswordReset}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.primaryButtonText}>Đặt lại mật khẩu</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.stepContainer}>
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#10B981" />
        <Text style={styles.successTitle}>Thành công!</Text>
        <Text style={styles.successText}>
          Mật khẩu của bạn đã được đặt lại thành công.
          Bạn có thể đăng nhập với mật khẩu mới.
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onBackToLogin}
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
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  eyeIcon: {
    padding: 4,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 16,
    marginLeft: 4,
  },
  primaryButton: {
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  instructionText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resendLink: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
    marginTop: 16,
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default ForgotPasswordForm;