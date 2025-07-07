// screens/RoleSelectionScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
  ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { RootStackNavigationProp } from '../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface RoleOption {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundImage: any; // Image source
  overlay: [string, string, ...string[]]; // Gradient overlay
  navigationTarget: 'CustomerMain' | 'PhotographerMain' | 'VenueOwnerMain';
  benefits: string[];
}

const ROLE_OPTIONS: Record<string, RoleOption> = {
  'User': {
    key: 'User',
    title: 'Khách hàng',
    description: 'Khám phá và đặt lịch chụp ảnh với các nhiếp ảnh gia chuyên nghiệp',
    icon: 'person-circle',
    backgroundImage: require('../../assets/photographer.png'), // Thay bằng đường dẫn ảnh thực
    overlay: ['rgba(106, 90, 205, 0.8)', 'rgba(147, 51, 234, 0.9)'],
    navigationTarget: 'CustomerMain',
    benefits: ['Tìm nhiếp ảnh gia', 'Đặt lịch dễ dàng', 'Đánh giá chất lượng'],
  },
  'Photographer': {
    key: 'Photographer',
    title: 'Nhiếp ảnh gia',
    description: 'Quản lý portfolio và nhận booking từ khách hàng yêu thích',
    icon: 'camera',
    backgroundImage: require('../../assets/photographer.png'), // Thay bằng đường dẫn ảnh thực
    overlay: ['rgba(249, 115, 22, 0.8)', 'rgba(239, 68, 68, 0.9)'],
    navigationTarget: 'PhotographerMain',
    benefits: ['Hiển thị portfolio', 'Quản lý booking', 'Thu nhập ổn định'],
  },
  'LocationOwner': {
    key: 'LocationOwner', 
    title: 'Chủ địa điểm',
    description: 'Quản lý và cho thuê không gian chụp ảnh độc đáo',
    icon: 'business',
    backgroundImage: require('../../assets/photographer.png'), // Thay bằng đường dẫn ảnh thực
    overlay: ['rgba(16, 185, 129, 0.8)', 'rgba(6, 182, 212, 0.9)'],
    navigationTarget: 'VenueOwnerMain',
    benefits: ['Cho thuê địa điểm', 'Tăng doanh thu', 'Quản lý đặt chỗ'],
  },
};

const RoleSelectionScreen = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation<RootStackNavigationProp>();

  // Get available roles for current user
  const availableRoles = user?.roles?.filter(role => ROLE_OPTIONS[role]) || [];

  const handleRoleSelect = (roleKey: string) => {
    setSelectedRole(selectedRole === roleKey ? null : roleKey);
  };

  const handleContinue = async () => {
    if (!selectedRole) {
      Alert.alert('Lỗi', 'Vui lòng chọn vai trò để tiếp tục');
      return;
    }

    setLoading(true);

    try {
      // Save selected role to AsyncStorage for session
      await AsyncStorage.setItem('selectedRole', selectedRole);
      
      // Navigate to appropriate stack
      const roleOption = ROLE_OPTIONS[selectedRole];
      navigation.reset({
        index: 0,
        routes: [{ name: roleOption.navigationTarget }],
      });
      
    } catch (error) {
      console.error('Error saving selected role:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi chọn vai trò');
    } finally {
      setLoading(false);
    }
  };

  const RoleCard = ({ role }: { role: RoleOption }) => {
    const isSelected = selectedRole === role.key;
    
    return (
      <TouchableOpacity
        style={[styles.cardContainer, isSelected && styles.selectedCard]}
        onPress={() => handleRoleSelect(role.key)}
        activeOpacity={0.9}
      >
        <ImageBackground
          source={role.backgroundImage}
          style={styles.cardBackground}
          imageStyle={styles.cardImage}
        >
          <View style={styles.cardOverlay}>
            <View style={styles.cardContent}>
              {/* Selection Indicator */}
              {isSelected && (
                <View style={styles.selectedBadge}>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                </View>
              )}
              
              {/* Icon */}
              <View style={styles.iconContainer}>
                <View style={styles.iconWrapper}>
                  <Ionicons name={role.icon} size={32} color="#FFFFFF" />
                </View>
              </View>
              
              {/* Content */}
              <View style={styles.textContent}>
                <Text style={styles.roleTitle}>{role.title}</Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
                
                {/* Benefits */}
                <View style={styles.benefitsContainer}>
                  {role.benefits.map((benefit, index) => (
                    <View key={index} style={styles.benefitItem}>
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      <Text style={styles.benefitText}>{benefit}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
            </View>
        </ImageBackground>
        
        {/* Selection Border */}
        {isSelected && <View style={styles.selectionBorder} />}
      </TouchableOpacity>
    );
  };

  if (!availableRoles.length) {
    return (
      <LinearGradient
        colors={['#F8FAFC', '#E2E8F0']}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Không tìm thấy vai trò</Text>
          <Text style={styles.errorText}>
            Tài khoản của bạn chưa có vai trò hợp lệ. Vui lòng liên hệ hỗ trợ.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#F1F5F9', '#E2E8F0', '#CBD5E1']}
      style={styles.container}
    >
      <StatusBar backgroundColor="transparent" barStyle="dark-content" translucent />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Chọn vai trò của bạn</Text>
          <Text style={styles.subtitle}>
            Tài khoản của bạn có nhiều vai trò. Hãy chọn vai trò phù hợp để bắt đầu trải nghiệm SnapLink.
          </Text>
        </View>
      </View>

      {/* User Welcome Card */}
      <View style={styles.welcomeCard}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#6366F1" />
          </View>
        </View>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeTitle}>Chào mừng trở lại!</Text>
          <Text style={styles.welcomeName}>{user?.fullName || user?.email}</Text>
          <Text style={styles.rolesText}>
            {availableRoles.length} vai trò khả dụng
          </Text>
        </View>
      </View>

      {/* Role Cards */}
      <View style={styles.cardsContainer}>
        {availableRoles.map((roleKey) => {
          const roleOption = ROLE_OPTIONS[roleKey];
          if (!roleOption) return null;
          
          return <RoleCard key={roleKey} role={roleOption} />;
        })}
      </View>

      {/* Continue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton, 
            !selectedRole && styles.disabledButton,
            loading && styles.loadingButton
          ]}
          onPress={handleContinue}
          disabled={!selectedRole || loading}
        >
          <LinearGradient
            colors={selectedRole ? ['#6366F1', '#8B5CF6'] : ['#9CA3AF', '#6B7280']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.buttonGradient}
          >
            <View style={styles.buttonContent}>
              {loading && (
                <Ionicons name="refresh" size={20} color="#FFFFFF" style={styles.loadingIcon} />
              )}
              <Text style={styles.buttonText}>
                {loading ? 'Đang chuyển hướng...' : selectedRole ? `Tiếp tục với ${ROLE_OPTIONS[selectedRole]?.title}` : 'Chọn vai trò để tiếp tục'}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
        
        {selectedRole && (
          <Text style={styles.buttonHint}>
            Bạn có thể thay đổi vai trò bất cứ lúc nào trong phần cài đặt
          </Text>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  welcomeCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 32,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  welcomeName: {
    fontSize: 16,
    color: '#6366F1',
    fontWeight: '500',
    marginBottom: 4,
  },
  rolesText: {
    fontSize: 14,
    color: '#64748B',
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  cardContainer: {
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    position: 'relative',
  },
  selectedCard: {
    transform: [{ scale: 1.02 }],
    shadowOpacity: 0.25,
    elevation: 16,
  },
  cardBackground: {
    height: 180,
    justifyContent: 'center',
  },
  cardImage: {
    borderRadius: 24,
  },
  cardOverlay: {
    flex: 1,
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Chỉ có overlay đen nhẹ để text rõ ràng
  },
  cardContent: {
    flex: 1,
    position: 'relative',
  },
  selectedBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  textContent: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  roleDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
    marginBottom: 16,
  },
  benefitsContainer: {
    gap: 6,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    marginLeft: 8,
    fontWeight: '500',
  },
  selectionBorder: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: '#6366F1',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  continueButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    shadowOpacity: 0.1,
    elevation: 2,
  },
  loadingButton: {
    shadowOpacity: 0.2,
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  buttonHint: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default RoleSelectionScreen;