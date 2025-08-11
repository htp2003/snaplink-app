import React, { useState } from "react";
import { View, StyleSheet, TouchableOpacity, Text, Alert, TextInput } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
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
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<string>("");

  const navigation = useNavigation<RootStackNavigationProp>();
  const { register, isLoading } = useAuth();

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { fullName, email, phoneNumber, password, confirmPassword } = formData;

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
        userFriendlyMessage = "Email này đã được sử dụng. Vui lòng sử dụng email khác hoặc đăng nhập.";
      } else if (userFriendlyMessage.toLowerCase().includes("phone")) {
        userFriendlyMessage = "Số điện thoại không hợp lệ hoặc đã được sử dụng.";
      } else if (userFriendlyMessage.toLowerCase().includes("password")) {
        userFriendlyMessage = "Mật khẩu không đáp ứng yêu cầu bảo mật.";
      }

      Alert.alert("Đăng ký thất bại", userFriendlyMessage);
    }
  };

  const renderInputField = (
    field: string,
    placeholder: string,
    keyboardType?: any,
    secureTextEntry?: boolean,
    showToggle?: boolean
  ) => {
    const isFocused = focusedField === field;
    const isPassword = field === 'password';
    const isConfirmPassword = field === 'confirmPassword';
    const isPasswordField = secureTextEntry;

    return (
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>{placeholder}</Text>
        <View style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused
        ]}>
          <View style={styles.inputIcon}>
            <Text style={styles.iconText}>{
              field === 'fullName' ? '👤' :
              field === 'email' ? '📧' :
              field === 'phoneNumber' ? '📱' :
              field === 'password' ? '🔐' :
              field === 'confirmPassword' ? '🔒' : '📄'
            }</Text>
          </View>
          <TextInput
            style={[
              styles.textInput,
              isPasswordField && styles.passwordInput
            ]}
            placeholder={placeholder}
            placeholderTextColor="#6B7280"
            value={formData[field as keyof typeof formData]}
            onChangeText={(value) => updateFormData(field, field === 'email' ? value.toLowerCase() : value)}
            onFocus={() => setFocusedField(field)}
            onBlur={() => setFocusedField("")}
            keyboardType={keyboardType}
            autoCapitalize={field === 'fullName' ? 'words' : field === 'email' ? 'none' : 'sentences'}
            secureTextEntry={
              isPassword ? !isPasswordVisible :
              isConfirmPassword ? !isConfirmPasswordVisible :
              secureTextEntry
            }
            editable={!isLoading}
            autoCorrect={false}
          />
          {showToggle && (
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
              <View style={styles.toggleButton}>
                <Text style={styles.toggleIcon}>
                  {(isPassword ? isPasswordVisible : isConfirmPasswordVisible) ? '🙈' : '👁️'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Form Header */}
      <View style={styles.formHeader}>
        <Text style={styles.formTitle}>Tạo tài khoản</Text>
        <Text style={styles.formSubtitle}>
          Điền thông tin để bắt đầu hành trình nhiếp ảnh ✨
        </Text>
      </View>

      {/* Form Fields */}
      {renderInputField('fullName', 'Họ và tên',  'default')}
      {renderInputField('email', 'Email',  'email-address')}
      {renderInputField('phoneNumber', 'Số điện thoại', 'phone-pad')}
      {renderInputField('password', 'Mật khẩu', 'default', true, true)}
      {renderInputField('confirmPassword', 'Xác nhận mật khẩu',  'default', true, true)}

      {/* Password Strength Indicator */}
      <View style={styles.passwordStrengthContainer}>
        <Text style={styles.passwordStrengthTitle}>Độ mạnh mật khẩu:</Text>
        <View style={styles.passwordStrengthBar}>
          <View style={[
            styles.strengthSegment,
            formData.password.length >= 6 && styles.strengthActive
          ]} />
          <View style={[
            styles.strengthSegment,
            formData.password.length >= 8 && /[A-Z]/.test(formData.password) && styles.strengthActive
          ]} />
          <View style={[
            styles.strengthSegment,
            formData.password.length >= 8 && /[A-Z]/.test(formData.password) && /[0-9]/.test(formData.password) && styles.strengthActive
          ]} />
        </View>
        <Text style={styles.passwordHint}>
          Tối thiểu 6 ký tự, nên có chữ hoa và số
        </Text>
      </View>

      {/* Register Button */}
      <TouchableOpacity
        style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#10B981', '#059669', '#047857']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.registerButtonGradient}
        >
          <Text style={styles.registerButtonText}>
            {isLoading ? ' Đang tạo tài khoản...' : ' Tạo tài khoản'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Login Link */}
      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Đã có tài khoản? </Text>
        <TouchableOpacity 
          onPress={onLogin} 
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Text style={[styles.loginLink, isLoading && styles.disabled]}>
            Đăng nhập ngay 
          </Text>
        </TouchableOpacity>
      </View>

      {/* Terms */}
      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          Bằng việc đăng ký, bạn đồng ý với{" "}
          <Text style={styles.linkText}>Điều khoản sử dụng</Text> và{" "}
          <Text style={styles.linkText}>Chính sách bảo mật</Text> của SnapLink
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  formHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    paddingHorizontal: 4,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerFocused: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  inputIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
    marginLeft: 6,
  },
  iconText: {
    fontSize: 16,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  passwordInput: {
    paddingRight: 55,
  },
  passwordToggle: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -18 }],
  },
  toggleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleIcon: {
    fontSize: 14,
  },
  passwordStrengthContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  passwordStrengthTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 6,
  },
  passwordStrengthBar: {
    flexDirection: 'row',
    marginBottom: 4,
    gap: 4,
  },
  strengthSegment: {
    flex: 1,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  strengthActive: {
    backgroundColor: '#10B981',
  },
  passwordHint: {
    fontSize: 11,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  registerButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  registerButtonDisabled: {
    opacity: 0.7,
  },
  registerButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D1D5DB',
  },
  dividerText: {
    marginHorizontal: 14,
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '500',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  socialButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#D1D5DB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  socialButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  socialButtonIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  socialButtonText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loginText: {
    color: '#6B7280',
    fontSize: 14,
  },
  loginLink: {
    color: '#047857',
    fontSize: 14,
    fontWeight: '700',
  },
  termsContainer: {
    marginBottom: 12,
  },
  termsText: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
  linkText: {
    color: '#10B981',
    fontWeight: '600',
  },
  securityNote: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  securityText: {
    fontSize: 11,
    color: '#059669',
    textAlign: 'center',
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.5,
  },
});
export default RegisterForm;