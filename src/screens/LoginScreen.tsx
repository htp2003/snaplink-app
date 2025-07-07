import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import LoginForm from '../components/Auth/LoginForm';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const handleLogin = (email: string, password: string) => {
    // TODO: Implement login logic
    console.log('Login:', email, password);
  };

  const handleForgotPassword = () => {
    // TODO: Implement forgot password logic
    console.log('Forgot password');
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
                <Text style={styles.title}>Chào mừng trở lại!</Text>
                <Text style={styles.subtitle}>
                  Kết nối với nhiếp ảnh gia và địa điểm chụp ảnh tuyệt vời
                </Text>
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.formContainer}>
                <LoginForm
                  onSubmit={handleLogin}
                  onForgotPassword={handleForgotPassword}
                  onRegister={() => navigation.navigate('Register')}
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

export default LoginScreen;