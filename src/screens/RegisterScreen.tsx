import React from "react";
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/types";
import RegisterForm from "../components/Auth/RegisterForm";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const handleRegisterSuccess = (userData: any) => {
    navigation.navigate("EmailVerification", {
      email: userData.email,
    });
  };

  const handleNavigateToLogin = () => {
    navigation.navigate("Login");
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#059669" />
      <LinearGradient
        colors={['#ECFDF5', '#D1FAE5', '#10B981']}
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
          >
            {/* Header Section - Simple Logo Only */}
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
              
              <View style={styles.titleContainer}>
                <Text style={styles.title}>Tạo tài khoản mới</Text>
                <Text style={styles.subtitle}>
                  Tham gia SnapLink để khám phá thế giới nhiếp ảnh đầy màu sắc
                </Text>
              </View>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              <View style={styles.formContainer}>
                <RegisterForm
                  onSuccess={handleRegisterSuccess}
                  onLogin={handleNavigateToLogin}
                />
              </View>
            </View>

            {/* Decorative Elements */}
            <View style={styles.decorativeContainer}>
              <View style={[styles.professionalShape, styles.shape1]}>
                <Text style={styles.shapeIcon}>📷</Text>
              </View>
              <View style={[styles.professionalShape, styles.shape2]}>
                <Text style={styles.shapeIcon}>🌟</Text>
              </View>
              <View style={[styles.professionalShape, styles.shape3]}>
                <Text style={styles.shapeIcon}>💼</Text>
              </View>
              <View style={[styles.lightEffect, styles.light1]} />
              <View style={[styles.lightEffect, styles.light2]} />
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
    paddingTop: 50,
    paddingBottom: 30,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoBackground: {
    width: 120,
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  logo: {
    width: 80,
    height: 80,
  },
  titleContainer: {
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: '#065F46',
    textAlign: 'center',
    lineHeight: 21,
    paddingHorizontal: 16,
    fontWeight: '500',
  },
  formSection: {
    marginBottom: 28,
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 4,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.1)',
  },
  decorativeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  professionalShape: {
    position: 'absolute',
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  shape1: {
    top: 100,
    right: 10,
    transform: [{ rotate: '15deg' }],
  },
  shape2: {
    bottom: 400,
    left: 5,
    transform: [{ rotate: '-20deg' }],
  },
  shape3: {
    top: 350,
    right: 30,
    transform: [{ rotate: '25deg' }],
  },
  shapeIcon: {
    fontSize: 20,
  },
  lightEffect: {
    position: 'absolute',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderRadius: 100,
  },
  light1: {
    width: 120,
    height: 120,
    top: 150,
    left: -30,
    opacity: 0.6,
  },
  light2: {
    width: 80,
    height: 80,
    bottom: 200,
    right: -20,
    opacity: 0.4,
  },
});

export default RegisterScreen;