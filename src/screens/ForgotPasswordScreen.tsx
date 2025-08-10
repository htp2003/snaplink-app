import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import ForgotPasswordForm from '../components/Auth/ForgotPasswordForm';
import { useAuth } from '../hooks/useAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

// Flow steps
enum ForgotPasswordStep {
  EMAIL_INPUT = 'EMAIL_INPUT',
  CODE_VERIFICATION = 'CODE_VERIFICATION', 
  PASSWORD_RESET = 'PASSWORD_RESET',
  SUCCESS = 'SUCCESS'
}

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [currentStep, setCurrentStep] = useState<ForgotPasswordStep>(ForgotPasswordStep.EMAIL_INPUT);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
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
        'Thành công',
        response.message || 'Đã gửi mã đặt lại mật khẩu qua email. Vui lòng kiểm tra hộp thư của bạn.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Lỗi',
        error.message || 'Không thể gửi mã đặt lại. Vui lòng thử lại.',
        [{ text: 'OK' }]
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
        'Thành công',
        response.message || 'Mã xác nhận hợp lệ. Vui lòng nhập mật khẩu mới.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      Alert.alert(
        'Lỗi',
        error.message || 'Mã xác nhận không đúng. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (newPassword: string, confirmPassword: string) => {
    if (newPassword !== confirmPassword) {
      Alert.alert('Lỗi', 'Mật khẩu xác nhận không khớp!');
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
        'Thành công',
        response.message || 'Mật khẩu đã được đặt lại thành công!',
        [
          {
            text: 'Đăng nhập ngay',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Lỗi',
        error.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  const handleResendCode = () => {
    setCurrentStep(ForgotPasswordStep.EMAIL_INPUT);
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case ForgotPasswordStep.EMAIL_INPUT:
        return 'Quên mật khẩu?';
      case ForgotPasswordStep.CODE_VERIFICATION:
        return 'Xác nhận mã';
      case ForgotPasswordStep.PASSWORD_RESET:
        return 'Đặt lại mật khẩu';
      case ForgotPasswordStep.SUCCESS:
        return 'Hoàn thành!';
      default:
        return 'Quên mật khẩu?';
    }
  };

  const getStepSubtitle = () => {
    switch (currentStep) {
      case ForgotPasswordStep.EMAIL_INPUT:
        return 'Nhập email của bạn để nhận mã đặt lại mật khẩu';
      case ForgotPasswordStep.CODE_VERIFICATION:
        return `Nhập mã 6 số đã được gửi đến ${email}`;
      case ForgotPasswordStep.PASSWORD_RESET:
        return 'Nhập mật khẩu mới cho tài khoản của bạn';
      case ForgotPasswordStep.SUCCESS:
        return 'Mật khẩu đã được đặt lại thành công';
      default:
        return '';
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
              <View style={styles.logoContainer}>
                <View style={styles.logoCircle}>
                  <Text style={styles.logoText}>SL</Text>
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
                    style={[
                      styles.progressFill,
                      {
                        width: currentStep === ForgotPasswordStep.EMAIL_INPUT ? '33%' :
                               currentStep === ForgotPasswordStep.CODE_VERIFICATION ? '66%' : '100%'
                      }
                    ]} 
                  />
                </View>
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
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
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
    paddingHorizontal: 20,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
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

export default ForgotPasswordScreen;