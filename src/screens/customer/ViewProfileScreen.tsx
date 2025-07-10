import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  StatusBar,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { userService } from '../../services/userService';
import { UserProfile } from '../../types/userProfile';
import { useAuth, User as AuthUser } from '../../hooks/useAuth';
import { getResponsiveSize } from '../../utils/responsive';

interface RouteParams {
  userId: number;
}

type ViewProfileRouteProp = RouteProp<Record<string, RouteParams>, string>;

const ViewProfileScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<ViewProfileRouteProp>();
  const insets = useSafeAreaInsets();
  const { userId } = route.params || { userId: 0 };
  
  const [userProfile, setUserProfile] = useState<UserProfile | AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId || typeof userId !== 'number' || userId <= 0) {
        setError('Invalid user ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userData = await userService.getUserById(userId);
        setUserProfile(userData);
        setError(null);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  // Helper functions
  const getUserDisplayName = (user: UserProfile | AuthUser | null): string => {
    if (!user) return 'Người dùng';
    
    if ('fullName' in user && user.fullName) {
      return user.fullName;
    }
    
    if ('userName' in user && user.userName) {
      return user.userName;
    }
    
    return 'Người dùng';
  };

  const getUserAvatar = (user: UserProfile | AuthUser | null): string | null => {
    if (!user) return null;
    
    if ('profileImage' in user && user.profileImage) {
      return user.profileImage;
    }
    
    return null;
  };

  const getUserInitials = (user: UserProfile | AuthUser | null): string => {
    if (!user) return 'U';
    
    const name = ('fullName' in user && user.fullName) || 
                 ('userName' in user && user.userName) || 
                 'User';
    
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserRole = (user: UserProfile | AuthUser | null): string => {
    if (!user) return 'Khách';
    
    // Check if user has roles from authUser
    if ('roles' in user && Array.isArray(user.roles)) {
      const authRoles = user.roles as string[];
      if (authRoles.length > 0) {
        const role = authRoles[0];
        switch (role.toLowerCase()) {
          case 'photographer':
            return 'Nhiếp ảnh gia';
          case 'locationowner':
            return 'Chủ địa điểm';
          case 'admin':
            return 'Quản trị viên';
          case 'moderator':
            return 'Điều hành viên';
          default:
            return 'Khách';
        }
      }
    }
    
    // Check if user has userRoles from API
    if ('userRoles' in user && user.userRoles?.$values) {
      const roles = user.userRoles.$values || [];
      if (roles.length > 0) {
        const role = roles[0].roleName;
        switch (role) {
          case 'Photographer':
            return 'Nhiếp ảnh gia';
          case 'LocationOwner':
            return 'Chủ địa điểm';
          case 'Admin':
            return 'Quản trị viên';
          case 'Moderator':
            return 'Điều hành viên';
          default:
            return 'Khách';
        }
      }
    }
    
    return 'Khách';
  };

  // Get user info details based on API data
  const getUserInfo = (user: UserProfile | AuthUser | null) => {
    if (!user) return [];

    const info = [];

    // Location info - always show
    info.push({
      icon: 'location-outline',
      label: 'Nơi tôi hàng muốn đến',
      value: 'Hà Nội' // Default for now
    });

    // Work info from bio
    if ('bio' in user && user.bio) {
      info.push({
        icon: 'briefcase-outline',
        label: 'Công việc của tôi',
        value: user.bio
      });
    } else {
      info.push({
        icon: 'briefcase-outline',
        label: 'Công việc của tôi',
        value: 'Công nghệ thông tin'
      });
    }

    // Fun fact
    info.push({
      icon: 'bulb-outline',
      label: 'Sự thật thú vị',
      value: 'Hông có'
    });

    // Pets
    info.push({
      icon: 'paw-outline',
      label: 'Thú cưng',
      value: 'Rùa'
    });

    // Birth decade from createAt
    if ('createAt' in user && user.createAt) {
      const year = new Date(user.createAt).getFullYear();
      const decade = Math.floor(year / 10) * 10;
      info.push({
        icon: 'calendar-outline',
        label: 'Sinh ra vào thập niên',
        value: `${decade.toString().slice(-2)}`
      });
    } else {
      info.push({
        icon: 'calendar-outline',
        label: 'Sinh ra vào thập niên',
        value: '00'
      });
    }

    return info;
  };

  const userInfo = getUserInfo(userProfile);

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleViewAll = () => {
    Alert.alert('Xem tất cả', 'Tính năng này đang được phát triển');
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-100">
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        {/* Header */}
        <View style={{
          paddingTop: insets.top + getResponsiveSize(10),
          paddingHorizontal: getResponsiveSize(20),
          paddingBottom: getResponsiveSize(16),
          backgroundColor: '#FFFFFF',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <TouchableOpacity 
            onPress={handleGoBack}
            style={{
              position: 'absolute',
              left: getResponsiveSize(20),
              top: insets.top + getResponsiveSize(8),
              width: getResponsiveSize(40),
              height: getResponsiveSize(40),
              borderRadius: getResponsiveSize(20),
              backgroundColor: '#F0F0F0',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="#000000" />
          </TouchableOpacity>
          
          <Text style={{ 
            fontSize: getResponsiveSize(18), 
            fontWeight: '600', 
            color: '#000000' 
          }}>
            Chỉnh sửa
          </Text>
        </View>

        {/* Loading Content */}
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF385C" />
          <Text style={{ 
            marginTop: getResponsiveSize(12), 
            color: '#666666',
            fontSize: getResponsiveSize(16)
          }}>
            Đang tải...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-100">
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        
        {/* Header */}
        <View style={{
          paddingTop: insets.top + getResponsiveSize(10),
          paddingHorizontal: getResponsiveSize(20),
          paddingBottom: getResponsiveSize(16),
          backgroundColor: '#FFFFFF',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <TouchableOpacity 
            onPress={handleGoBack}
            style={{
              position: 'absolute',
              left: getResponsiveSize(20),
              top: insets.top + getResponsiveSize(8),
              width: getResponsiveSize(40),
              height: getResponsiveSize(40),
              borderRadius: getResponsiveSize(20),
              backgroundColor: '#F0F0F0',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="#000000" />
          </TouchableOpacity>
          
          <Text style={{ 
            fontSize: getResponsiveSize(18), 
            fontWeight: '600', 
            color: '#000000' 
          }}>
            Chỉnh sửa
          </Text>
        </View>

        {/* Error Content */}
        <View className="flex-1 justify-center items-center px-5">
          <Ionicons name="alert-circle-outline" size={getResponsiveSize(64)} color="#FF385C" />
          <Text style={{ 
            marginTop: getResponsiveSize(16), 
            fontSize: getResponsiveSize(18), 
            fontWeight: '600', 
            color: '#FF385C' 
          }}>
            Có lỗi xảy ra
          </Text>
          <Text style={{ 
            marginTop: getResponsiveSize(8), 
            color: '#666666', 
            textAlign: 'center',
            fontSize: getResponsiveSize(14)
          }}>
            {error}
          </Text>
          <TouchableOpacity 
            style={{
              marginTop: getResponsiveSize(20),
              paddingHorizontal: getResponsiveSize(24),
              paddingVertical: getResponsiveSize(12),
              backgroundColor: '#FF385C',
              borderRadius: getResponsiveSize(8)
            }}
            onPress={handleGoBack}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: getResponsiveSize(16), 
              fontWeight: '600' 
            }}>
              Quay lại
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const avatarUrl = getUserAvatar(userProfile);
  const displayName = getUserDisplayName(userProfile);
  const userRole = getUserRole(userProfile);
  const initials = getUserInitials(userProfile);

  return (
    <View className="flex-1 bg-gray-100">
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View style={{
        paddingTop: insets.top + getResponsiveSize(10),
        paddingHorizontal: getResponsiveSize(20),
        paddingBottom: getResponsiveSize(16),
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <TouchableOpacity 
          onPress={handleGoBack}
          style={{
            position: 'absolute',
            left: getResponsiveSize(20),
            top: insets.top + getResponsiveSize(8),
            width: getResponsiveSize(40),
            height: getResponsiveSize(40),
            borderRadius: getResponsiveSize(20),
            backgroundColor: '#F0F0F0',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="#000000" />
        </TouchableOpacity>
        
        <Text style={{ 
          fontSize: getResponsiveSize(18), 
          fontWeight: '600', 
          color: '#000000' 
        }}>
          Chỉnh sửa
        </Text>
      </View>

      <ScrollView 
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + getResponsiveSize(30) }}
      >
        {/* Profile Section */}
        <View style={{
          backgroundColor: '#FFFFFF',
          paddingHorizontal: getResponsiveSize(20),
          paddingTop: getResponsiveSize(40),
          paddingBottom: getResponsiveSize(30),
          alignItems: 'center',
          marginBottom: getResponsiveSize(20)
        }}>
          {/* Avatar */}
          <View style={{
            width: getResponsiveSize(120),
            height: getResponsiveSize(120),
            borderRadius: getResponsiveSize(60),
            backgroundColor: '#333333',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: getResponsiveSize(20)
          }}>
            {avatarUrl ? (
              <Image 
                source={{ uri: avatarUrl }}
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  borderRadius: getResponsiveSize(60) 
                }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ 
                color: '#FFFFFF', 
                fontSize: getResponsiveSize(48), 
                fontWeight: 'bold' 
              }}>
                {initials}
              </Text>
            )}
          </View>

          {/* Name and Role */}
          <Text style={{ 
            fontSize: getResponsiveSize(32), 
            fontWeight: 'bold', 
            color: '#000000', 
            marginBottom: getResponsiveSize(8),
            textAlign: 'center'
          }}>
            {displayName}
          </Text>
          <Text style={{ 
            fontSize: getResponsiveSize(16), 
            color: '#666666',
            textAlign: 'center'
          }}>
            {userRole}
          </Text>
        </View>

        {/* User Info Section */}
        <View className="bg-white">
          {userInfo.map((item, index) => (
            <View 
              key={index}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: getResponsiveSize(20),
                paddingHorizontal: getResponsiveSize(20),
                borderBottomWidth: index < userInfo.length - 1 ? 1 : 0,
                borderBottomColor: '#F0F0F0'
              }}
            >
              <Ionicons 
                name={item.icon as any} 
                size={getResponsiveSize(24)} 
                color="#666666" 
              />
              <View style={{ flex: 1, marginLeft: getResponsiveSize(16) }}>
                <Text style={{ 
                  fontSize: getResponsiveSize(14), 
                  color: '#666666', 
                  marginBottom: getResponsiveSize(4)
                }}>
                  {item.label}
                </Text>
                <Text style={{ 
                  fontSize: getResponsiveSize(16), 
                  color: '#000000', 
                  fontWeight: '500' 
                }}>
                  {item.value}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* View All Button */}
        <TouchableOpacity 
          style={{
            backgroundColor: '#FFFFFF',
            marginHorizontal: getResponsiveSize(20),
            marginTop: getResponsiveSize(20),
            paddingVertical: getResponsiveSize(18),
            borderRadius: getResponsiveSize(12),
            alignItems: 'center'
          }}
          onPress={handleViewAll}
        >
          <Text style={{ 
            fontSize: getResponsiveSize(16), 
            color: '#000000', 
            fontWeight: '600' 
          }}>
            Xem tất cả
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default ViewProfileScreen;