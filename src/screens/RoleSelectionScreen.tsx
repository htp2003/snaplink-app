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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../hooks/useAuth';
import { RootStackNavigationProp } from '../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

interface RoleOption {
  key: string;
  title: string;
  description: string;
  icon: string;
  gradient: [string, string, ...string[]];
  navigationTarget: 'CustomerMain' | 'PhotographerMain' | 'VenueOwnerMain';
}

const ROLE_OPTIONS: Record<string, RoleOption> = {
  'User': {
    key: 'User',
    title: 'Khách hàng',
    description: 'Tìm kiếm và đặt lịch chụp ảnh với các nhiếp ảnh gia chuyên nghiệp',
    icon: '👤',
    gradient: ['#667eea', '#764ba2'],
    navigationTarget: 'CustomerMain',
  },
  'Photographer': {
    key: 'Photographer',
    title: 'Nhiếp ảnh gia',
    description: 'Quản lý portfolio và nhận booking từ khách hàng',
    icon: '📸',
    gradient: ['#ff9966', '#ff5e62'],
    navigationTarget: 'PhotographerMain',
  },
  'LocationOwner': {
    key: 'LocationOwner', 
    title: 'Chủ địa điểm',
    description: 'Quản lý và cho thuê không gian chụp ảnh',
    icon: '🏢',
    gradient: ['#36d1c4', '#1e3799'],
    navigationTarget: 'VenueOwnerMain',
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
    setSelectedRole(roleKey);
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
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={role.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardContent}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.roleIcon}>{role.icon}</Text>
            </View>
            
            {/* Title */}
            <Text style={styles.roleTitle}>{role.title}</Text>
            
            {/* Description */}
            <Text style={styles.roleDescription}>{role.description}</Text>
            
            {/* Selection Indicator */}
            {isSelected && (
              <View style={styles.selectedIndicator}>
                <Text style={styles.checkmark}>✓</Text>
              </View>
            )}
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (!availableRoles.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Không tìm thấy vai trò hợp lệ</Text>
      </View>
    );
  }

  return (
    <LinearGradient
      colors={['#f8f9fa', '#e9ecef', '#dee2e6']}
      style={styles.container}
    >
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Chọn vai trò</Text>
        <Text style={styles.subtitle}>
          Tài khoản của bạn có nhiều vai trò. Hãy chọn vai trò để bắt đầu sử dụng SnapLink.
        </Text>
      </View>

      {/* User Info */}
      <View style={styles.userInfo}>
        <Text style={styles.welcomeText}>Chào mừng, {user?.fullName || user?.email}!</Text>
        <Text style={styles.rolesText}>
          Các vai trò khả dụng: {availableRoles.join(', ')}
        </Text>
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
      {selectedRole && (
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.continueButton, loading && styles.disabledButton]}
            onPress={handleContinue}
            disabled={loading}
          >
            <LinearGradient
              colors={['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Đang chuyển hướng...' : 'Tiếp tục'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginTop: height * 0.08,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
  },
  userInfo: {
    paddingHorizontal: 24,
    marginBottom: 30,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  rolesText: {
    fontSize: 14,
    color: '#6c757d',
  },
  cardsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  cardContainer: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  selectedCard: {
    elevation: 8,
    shadowOpacity: 0.2,
    transform: [{ scale: 1.02 }],
  },
  cardGradient: {
    padding: 20,
    minHeight: 120,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  roleIcon: {
    fontSize: 40,
  },
  roleTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  roleDescription: {
    fontSize: 14,
    color: '#f8f9fa',
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.9,
  },
  selectedIndicator: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28a745',
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  continueButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.7,
  },
  buttonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginTop: height * 0.4,
  },
});

export default RoleSelectionScreen;