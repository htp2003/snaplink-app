import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Platform,
  Easing,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AuthService } from '../../services/authService';
import { useAuth } from '../../hooks/useAuth';

const { width, height } = Dimensions.get('window');
const API_BASE_URL = 'https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net'; // Update with your actual API base URL

// Updated ROLES mapping to match API
const ROLES = [
  {
    key: 'user', // Changed from 'customer' to match API
    label: 'Khách hàng',
    desc: 'Tìm kiếm và đặt lịch chụp ảnh với các nhiếp ảnh gia chuyên nghiệp',
    features: [
      'Duyệt portfolio nhiếp ảnh gia',
      'Đặt lịch chụp ảnh dễ dàng',
      'Chọn địa điểm chụp yêu thích',
      'Theo dõi tiến độ dự án'
    ],
    colors: ['#667eea', '#764ba2'],
    iconColors: ['#43cea2', '#185a9d'],
    icon: 'account-heart-outline',
    emoji: '👤',
    roleId: 2, // Add role ID for API
  },
  {
    key: 'photographer',
    label: 'Nhiếp ảnh gia',
    desc: 'Showcase tài năng và kết nối với khách hàng tiềm năng',
    features: [
      'Tạo portfolio chuyên nghiệp',
      'Nhận booking trực tuyến',
      'Quản lý lịch trình linh hoạt',
      'Mở rộng mạng lưới khách hàng'
    ],
    colors: ['#667eea', '#764ba2'],
    iconColors: ['#ff9966', '#ff5e62'],
    icon: 'camera-outline',
    emoji: '📸',
    roleId: 3,
  },
  {
    key: 'locationowner', // Changed from 'location' to match API
    label: 'Chủ địa điểm',
    desc: 'Quản lý và cho thuê không gian chụp ảnh độc đáo',
    features: [
      'Đăng ký địa điểm chụp ảnh',
      'Quản lý lịch đặt chỗ',
      'Tối ưu doanh thu từ không gian',
      'Kết nối với cộng đồng nghệ thuật'
    ],
    colors: ['#667eea', '#764ba2'],
    iconColors: ['#36d1c4', '#1e3799'],
    icon: 'home-city-outline',
    emoji: '🏢',
    roleId: 4,
  },
];

interface Step1Props {
  onSelectRole?: (roleData: { role: string, roleId: number }) => void;
}

const Step1: React.FC<Step1Props> = ({ onSelectRole }) => {
  const { getCurrentUserId, assignRole } = useAuth(); // Add assignRole
  const userId = getCurrentUserId();
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [animations] = useState(() => 
    ROLES.map(() => new Animated.Value(0))
  );

  const handleSelectRole = (role: string, index: number) => {
    setSelectedRole(role);
    // Animate selection
    Animated.timing(animations[index], {
      toValue: 1,
      duration: 320,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // Reset other cards
    animations.forEach((anim, i) => {
      if (i !== index) {
        Animated.timing(anim, {
          toValue: 0,
          duration: 320,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    });
  };

  const handleContinue = async () => {
    if (!selectedRole || !userId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin user');
      return;
    }

    const selectedRoleData = ROLES.find(role => role.key === selectedRole);
    if (!selectedRoleData) return;

    setLoading(true);

    try {
      // Call API to assign role using useAuth method
      await assignRole(userId, selectedRole as any);
      
      // Create additional profile based on role
      if (selectedRole === 'photographer') {
        await createPhotographerProfile();
      } else if (selectedRole === 'locationowner') {
        await createLocationOwnerProfile();
      }

      // Call success callback
      onSelectRole?.({
        role: selectedRole,
        roleId: selectedRoleData.roleId
      });

    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi thiết lập vai trò');
    } finally {
      setLoading(false);
    }
  };

  const createPhotographerProfile = async () => {
    try {
      const token = await AuthService.getToken();
      const response = await fetch(`${API_BASE_URL}/api/Photographer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          availabilityStatus: 'available',
          verificationStatus: 'pending'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create photographer profile');
      }
    } catch (error) {
      console.warn('Could not create photographer profile:', error);
    }
  };

  const createLocationOwnerProfile = async () => {
    try {
      const token = await AuthService.getToken();
      const response = await fetch(`${API_BASE_URL}/api/LocationOwner/CreatedLocationOwnerId`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          verificationStatus: 'pending'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create location owner profile');
      }
    } catch (error) {
      console.warn('Could not create location owner profile:', error);
    }
  };

  const RoleCard = ({ role, index }: { role: typeof ROLES[0], index: number }) => {
    const isSelected = selectedRole === role.key;
    const animatedValue = animations[index];

    const cardTransform = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -6],
    });

    const scaleValue = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 1.015],
    });

    const cardWidth = width / 2 - 2;
    const opacityValue = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.85, 1],
    });
    const shadowValue = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [2, 8],
    });

    return (
      <Animated.View
        style={{
          width: cardWidth,
          marginBottom: 12,
          opacity: opacityValue,
          transform: [
            { translateY: cardTransform },
            { scale: scaleValue }
          ],
          shadowRadius: shadowValue,
          elevation: shadowValue,
        }}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleSelectRole(role.key, index)}
          disabled={loading}
          style={{
            backgroundColor: '#fff',
            borderRadius: 16,
            padding: 15,
            marginHorizontal: 8,
            borderWidth: isSelected ? 2 : 1,
            borderColor: isSelected ? '#222' : '#d1d5db',
            shadowColor: '#222',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isSelected ? 0.16 : 0.07,
            shadowRadius: isSelected ? 13 : 5,
            elevation: isSelected ? 8 : 2,
            opacity: loading ? 0.6 : 1,
          }}
        >
          {/* Icon Container */}
          <View style={{ alignItems: 'center', marginBottom: 6 }}>
            <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2, backgroundColor: '#222' }}>
              <Text style={{ fontSize: 18, color: '#fff' }}>{role.emoji}</Text>
            </View>
          </View>
          {/* Title */}
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#111', textAlign: 'center', marginBottom: 2, letterSpacing: 0.2 }}>
            {role.label}
          </Text>
          {/* Features List */}
          <View style={{ marginBottom: 2 }}>
            {role.features.map((feature, featureIndex) => (
              <View key={featureIndex} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 1 }}>
                <View style={{ width: 13, height: 13, backgroundColor: '#222', borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginRight: 4 }}>
                  <Icon name="check" size={7} color="#fff" />
                </View>
                <Text style={{ fontSize: 12, color: '#444', flex: 1, lineHeight: 15 }}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, marginTop: Platform.OS === 'ios' ? 32 : 20, marginBottom: 10 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'black', textAlign: 'center', marginBottom: 6, letterSpacing: 0.5 }}>
          Chọn vai trò của bạn
        </Text>
        <Text style={{ fontSize: 14, color: 'black', textAlign: 'center', lineHeight: 20, fontWeight: '300', paddingHorizontal: 8 }}>
          Khám phá trải nghiệm phù hợp nhất với nhu cầu và mục đích sử dụng của bạn
        </Text>
      </View>
      
      {/* Role Cards Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', flex: 1 }}>
        {ROLES.map((role, index) => (
          <RoleCard key={role.key} role={role} index={index} />
        ))}
      </View>
      
      {/* Button Tiếp tục */}
      {selectedRole && (
        <View style={{ width: '100%', paddingHorizontal: 24, marginBottom: 28 }}>
          <TouchableOpacity
            activeOpacity={0.87}
            onPress={handleContinue}
            disabled={loading}
            style={{
              backgroundColor: loading ? '#666' : '#111',
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#222',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 8,
              elevation: 4,
              marginBottom: 10
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1}}>
              {loading ? 'Đang thiết lập...' : 'Tiếp tục'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Floating Elements */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <View style={{ position: 'absolute', top: '25%', left: 32, width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 24 }} />
        <View style={{ position: 'absolute', top: '33%', right: 48, width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 16 }} />
        <View style={{ position: 'absolute', bottom: '33%', left: 48, width: 24, height: 24, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 12 }} />
        <View style={{ position: 'absolute', bottom: '25%', right: 32, width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 20 }} />
      </View>
    </View>
  );
};

export default Step1;