import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import InputField from '../InputField';
import Button from '../Button';
import { useAuth } from '../../hooks/useAuth';

interface RegisterFormProps {
  onSubmit?: (email: string, password: string, confirmPassword: string) => void;
  onLogin: () => void;
  onSuccess?: (userData: any) => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ 
  onSubmit, 
  onLogin, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const { register, isLoading } = useAuth(); // Sử dụng useAuth hook
  const navigation = useNavigation();

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { fullName, email, phoneNumber, password, confirmPassword } = formData;
    
    if (!fullName.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập họ tên');
      return false;
    }
    
    if (!email.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập email');
      return false;
    }
    
    if (!isValidEmail(email)) {
      Alert.alert('Lỗi', 'Email không hợp lệ');
      return false;
    }
    
    if (!phoneNumber.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập số điện thoại');
      return false;
    }
    
    if (!isValidPhoneNumber(phoneNumber)) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ');
      return false;
    }
    
    if (password.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu phải có ít nhất 6 ký tự');
      return false;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp');
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
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      const userData = {
        userName: formData.email,
        email: formData.email,
        passwordHash: formData.password, // Backend sẽ hash
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
      };

      // Sử dụng register từ useAuth
      const response = await register(userData);
      
      // Call success callback with user data
      const registrationData = { 
        userId: response.id || response.userId, 
        ...userData 
      };
      
      if (onSuccess) {
        onSuccess(registrationData);
      } else {
        // Navigate to StepContainer (AuthFlow) với userId đã lưu trong useAuth
        navigation.navigate('StepContainer' as never);
      }
      
      // Call parent onSubmit for any additional handling
      onSubmit?.(formData.email, formData.password, formData.confirmPassword);
      
    } catch (error: any) {
      Alert.alert('Đăng ký thất bại', error.message || 'Có lỗi xảy ra');
    }
  };

  return (
    <View style={styles.container}>
      <InputField
        icon="person-outline"
        placeholder="Họ và tên"
        value={formData.fullName}
        onChangeText={(value) => updateFormData('fullName', value)}
        autoCapitalize="words"
        editable={!isLoading}
      />
      <InputField
        icon="mail-outline"
        placeholder="Email"
        value={formData.email}
        onChangeText={(value) => updateFormData('email', value)}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!isLoading}
      />
      <InputField
        icon="call-outline"
        placeholder="Số điện thoại"
        value={formData.phoneNumber}
        onChangeText={(value) => updateFormData('phoneNumber', value)}
        keyboardType="phone-pad"
        editable={!isLoading}
      />
      <InputField
        icon="lock-closed-outline"
        placeholder="Mật khẩu"
        value={formData.password}
        onChangeText={(value) => updateFormData('password', value)}
        secureTextEntry
        editable={!isLoading}
      />
      <InputField
        icon="lock-closed-outline"
        placeholder="Xác nhận mật khẩu"
        value={formData.confirmPassword}
        onChangeText={(value) => updateFormData('confirmPassword', value)}
        secureTextEntry
        editable={!isLoading}
      />
      
      <Button 
        title={isLoading ? "Đang đăng ký..." : "Đăng ký"} 
        onPress={handleSubmit}
      />
      
      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Đã có tài khoản? </Text>
        <TouchableOpacity onPress={onLogin} disabled={isLoading}>
          <Text style={[styles.loginLink, isLoading && styles.disabled]}>
            Đăng nhập
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  loginText: {
    color: '#666666',
    fontSize: 14,
  },
  loginLink: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default RegisterForm;