// screens/EmailVerificationScreen.tsx - Fixed để handle plain text response
import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';

const BASE_URL = 'https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net';

type Props = NativeStackScreenProps<RootStackParamList, 'EmailVerification'>;

const EmailVerificationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email } = route.params;
  
  useEffect(() => {
    console.log('📧 EmailVerificationScreen mounted với email:', email);
  }, []);
  
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 phút
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  
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
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle code input
  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    setError('');

    // Auto focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto verify when complete
    if (value && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerify(fullCode);
      }
    }
  };

  // Handle backspace
  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (pastedText: string) => {
    const numbers = pastedText.replace(/\D/g, '');
    if (numbers.length === 6) {
      const newCode = numbers.split('');
      setVerificationCode(newCode);
      inputRefs.current[5]?.focus();
      handleVerify(numbers);
    }
  };

  // API call to verify email
  const handleVerify = async (code?: string) => {
    const codeToVerify = code || verificationCode.join('');
    
    console.log('🔐 Bắt đầu verify với code:', codeToVerify, 'email:', email);
    
    if (codeToVerify.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('📡 Gọi API verify-email...');

      const requestBody = {
        email: email,
        code: codeToVerify,
      };

      console.log('📤 Request Body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${BASE_URL}/api/User/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📡 API Response Status:', response.status);
      console.log('📡 API Response OK:', response.ok);
      console.log('📡 Content-Type:', response.headers.get('content-type'));

      // Get raw response text
      const responseText = await response.text();
      console.log('📋 Raw Response Text:', responseText);

      let data;
      let errorMessage = '';

      // ✨ Smart response parsing - Handle both JSON and plain text
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = JSON.parse(responseText);
          console.log('✅ Parsed JSON:', data);
          errorMessage = data.message || data.error || 'Có lỗi xảy ra';
        } catch (parseError) {
          console.error('💥 JSON Parse Error:', parseError);
          errorMessage = 'Lỗi phản hồi từ server';
        }
      } else {
        // Server trả về plain text
        console.log('📝 Plain text response detected:', responseText);
        errorMessage = responseText.trim();
        data = { message: errorMessage };
      }

      if (response.ok) {
        console.log('✅ Verify thành công! Chuẩn bị navigate tới StepContainer');
        
        // Success - show success message then navigate
        Alert.alert(
          'Xác nhận thành công! 🎉',
          'Tài khoản của bạn đã được kích hoạt. Hãy hoàn tất thiết lập tài khoản.',
          [
            {
              text: 'Tiếp tục',
              onPress: () => {
                console.log('🧭 Navigate tới StepContainer để bắt đầu onboarding');
                navigation.replace('StepContainer');
              },
            },
          ]
        );
      } else {
        console.log('❌ Verify thất bại:', errorMessage);
        
        // ✨ Handle specific error messages
        let userFriendlyMessage = errorMessage;
        
        if (errorMessage.toLowerCase().includes('invalid') || 
            errorMessage.toLowerCase().includes('incorrect')) {
          userFriendlyMessage = 'Mã xác nhận không đúng. Vui lòng kiểm tra lại.';
        } else if (errorMessage.toLowerCase().includes('expired')) {
          userFriendlyMessage = 'Mã xác nhận đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.';
        } else if (errorMessage.toLowerCase().includes('already verified')) {
          userFriendlyMessage = 'Email đã được xác nhận trước đó.';
        }
        
        setError(userFriendlyMessage);
        
        // Clear incorrect code
        setVerificationCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      console.error('💥 Verification error:', error);
      
      setError('Lỗi kết nối. Vui lòng kiểm tra mạng và thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend verification code
  const handleResendCode = async () => {
    console.log('🔄 Resend verification code cho email:', email);
    
    setIsResending(true);
    setError('');

    try {
      // Tạm thời để test - có thể cần API endpoint khác cho resend
      console.log('🔄 Attempting to resend code...');
      
      // Reset timer và code
      setTimeLeft(300);
      setCanResend(false);
      setVerificationCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      
      Alert.alert(
        'Gửi lại thành công',
        'Mã xác nhận mới đã được gửi đến email của bạn.'
      );
    } catch (error) {
      console.error('Resend error:', error);
      setError('Không thể gửi lại mã. Vui lòng thử lại sau.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      <LinearGradient
        colors={['#6366F1', '#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientContainer}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View style={styles.headerSection}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => {
                  console.log('⬅️ Back button pressed - quay về Register');
                  navigation.goBack();
                }}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Ionicons name="mail" size={32} color="#FFFFFF" />
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
                        onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                        keyboardType="numeric"
                        maxLength={1}
                        selectTextOnFocus
                        editable={!isLoading}
                        
                      />
                    ))}
                  </View>
                </View>

                {/* Timer */}
                <View style={styles.timerContainer}>
                  {timeLeft > 0 ? (
                    <Text style={styles.timerText}>
                      Mã sẽ hết hạn sau: <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
                    </Text>
                  ) : (
                    <Text style={styles.expiredText}>Mã xác nhận đã hết hạn</Text>
                  )}
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                  style={[
                    styles.verifyButton,
                    (verificationCode.join('').length !== 6 || isLoading) && styles.disabledButton,
                  ]}
                  onPress={() => handleVerify()}
                  disabled={verificationCode.join('').length !== 6 || isLoading}
                >
                  <LinearGradient
                    colors={
                      verificationCode.join('').length === 6 && !isLoading
                        ? ['#10B981', '#059669']
                        : ['#9CA3AF', '#6B7280']
                    }
                    style={styles.buttonGradient}
                  >
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.loadingText}>Đang xác nhận...</Text>
                      </View>
                    ) : (
                      <Text style={styles.buttonText}>Xác nhận</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                {/* Resend Section */}
                <View style={styles.resendSection}>
                  <Text style={styles.resendLabel}>Không nhận được mã?</Text>
                  
                  {canResend ? (
                    <TouchableOpacity
                      onPress={handleResendCode}
                      disabled={isResending}
                      style={styles.resendButton}
                    >
                      {isResending ? (
                        <View style={styles.resendingContainer}>
                          <ActivityIndicator size="small" color="#6366F1" />
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

                {/* Help Section */}
                <View style={styles.helpSection}>
                  <Text style={styles.helpText}>
                    💡 Mẹo: Kiểm tra thư mục spam nếu không thấy email
                  </Text>
                </View>
              </View>
            </View>

            {/* Decorative Elements */}
            <View style={styles.decorativeContainer}>
              <View style={[styles.decorativeCircle, styles.circle1]} />
              <View style={[styles.decorativeCircle, styles.circle2]} />
              <View style={[styles.decorativeCircle, styles.circle3]} />
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
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  formSection: {
    flex: 1,
    justifyContent: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 32,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  codeContainer: {
    marginBottom: 24,
  },
  codeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  codeInput: {
    width: 45,
    height: 56,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
  },
  codeInputFilled: {
    borderColor: '#6366F1',
    backgroundColor: '#EEF2FF',
  },
  codeInputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  timerText: {
    fontSize: 14,
    color: '#6B7280',
  },
  timerValue: {
    fontWeight: '600',
    color: '#EF4444',
  },
  expiredText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  verifyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  resendSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  resendLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  resendButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '600',
  },
  resendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendingText: {
    fontSize: 14,
    color: '#6366F1',
    marginLeft: 8,
  },
  resendDisabledText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  helpSection: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  decorativeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 120,
    height: 120,
    top: 100,
    right: -30,
  },
  circle2: {
    width: 80,
    height: 80,
    bottom: 200,
    left: -20,
  },
  circle3: {
    width: 60,
    height: 60,
    top: 300,
    left: 50,
  },
});

export default EmailVerificationScreen;