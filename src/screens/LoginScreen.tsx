import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import LoginForm from '../components/Auth/LoginForm';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const handleLogin = (email: string, password: string) => {
    // Login logic is now handled inside LoginForm component via useAuth
    console.log('Login triggered for:', email);
  };

  const handleForgotPassword = () => {
    // Legacy handler - kept for compatibility
    console.log('Forgot password (legacy)');
  };

  // ✅ NEW: Navigate to ForgotPassword screen
  const handleNavigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF8E7" />
      <LinearGradient
        colors={['#FFF8E7', '#FEF3C7', '#FBBF24']}
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
            {/* Header Section with Logo */}
            <View style={styles.headerSection}>
              <View style={styles.logoContainer}>
                <View style={styles.logoBackground}>
                  <Image
                    source={require('../../assets/logo1.png')} // Thay đổi path này theo đường dẫn logo của bạn
                    style={styles.logo}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.formContainer}>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Đăng nhập</Text>
                  <Text style={styles.formSubtitle}>
                    Bắt đầu hành trình nhiếp ảnh của bạn ✨
                  </Text>
                </View>
                
                <LoginForm
                  onSubmit={handleLogin}
                  onForgotPassword={handleForgotPassword}
                  onRegister={() => navigation.navigate('Register')}
                  onNavigateToForgotPassword={handleNavigateToForgotPassword}
                />
              </View>
            </View>

            {/* Photography-themed Decorative Elements */}
            <View style={styles.decorativeContainer}>
              <View style={[styles.photoFrame, styles.frame1]}>
                <Text style={styles.frameEmoji}>🌸</Text>
              </View>
              <View style={[styles.photoFrame, styles.frame2]}>
                <Text style={styles.frameEmoji}>🏛️</Text>
              </View>
              <View style={[styles.photoFrame, styles.frame3]}>
                <Text style={styles.frameEmoji}>🌅</Text>
              </View>
              <View style={[styles.lightBeam, styles.beam1]} />
              <View style={[styles.lightBeam, styles.beam2]} />
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
  logoBackground: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 3,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  logo: {
    width: 80,
    height: 80,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#EA580C',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -1,
    textShadowColor: 'rgba(234, 88, 12, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#92400E',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#A16207',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    fontStyle: 'italic',
  },
  formSection: {
    flex: 1,
    justifyContent: 'center',
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    marginHorizontal: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  formHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EA580C',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#A16207',
    textAlign: 'center',
  },
  decorativeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  photoFrame: {
    position: 'absolute',
    width: 60,
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FEF3C7',
    transform: [{ rotate: '15deg' }],
  },
  frame1: {
    top: 120,
    right: 20,
    transform: [{ rotate: '15deg' }],
  },
  frame2: {
    bottom: 250,
    left: 10,
    transform: [{ rotate: '-12deg' }],
  },
  frame3: {
    top: 320,
    left: 40,
    transform: [{ rotate: '20deg' }],
  },
  frameEmoji: {
    fontSize: 20,
  },
  lightBeam: {
    position: 'absolute',
    backgroundColor: 'rgba(251, 191, 36, 0.3)',
    borderRadius: 4,
  },
  beam1: {
    width: 100,
    height: 4,
    top: 180,
    right: -20,
    transform: [{ rotate: '25deg' }],
  },
  beam2: {
    width: 80,
    height: 3,
    bottom: 300,
    left: -15,
    transform: [{ rotate: '-20deg' }],
  },
});
export default LoginScreen;