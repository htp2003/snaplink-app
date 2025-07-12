import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  StatusBar,
  ActivityIndicator,
  Alert,
  SafeAreaView
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

const ViewProfileUserScreen = () => {
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
      console.log('🔍 Route params:', route.params);
      console.log('🔍 userId from params:', userId, typeof userId);
      
      if (!userId || typeof userId !== 'number' || userId <= 0) {
        setError('Invalid user ID');
        setLoading(false);
        return;
      }
  
      try {
        setLoading(true);
        console.log('📡 Calling userService.getUserById with userId:', userId);
        
        const userData = await userService.getUserById(userId);
        console.log('✅ User data received:', userData);
        
        setUserProfile(userData);
        setError(null);
      } catch (err) {
        console.error('❌ Error fetching user profile:', err);
        console.error('❌ Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          userId: userId,
          userIdType: typeof userId
        });
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

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleEditPress = () => {
    Alert.alert('Chỉnh sửa', 'Tính năng chỉnh sửa đang được phát triển');
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />
        
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#F7F7F7',
        }}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#E5E5E5',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </TouchableOpacity>
          
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#000000',
          }}>
            Hồ sơ
          </Text>
          
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#666666' }}>
            Đang tải hồ sơ...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />
        
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#F7F7F7',
        }}>
          <TouchableOpacity
            onPress={handleGoBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#E5E5E5',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </TouchableOpacity>
          
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#000000',
          }}>
            Hồ sơ
          </Text>
          
          <View style={{ width: 40 }} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF385C" />
          <Text style={{ 
            marginTop: 16, 
            fontSize: 18, 
            fontWeight: '600', 
            color: '#FF385C' 
          }}>
            Có lỗi xảy ra
          </Text>
          <Text style={{ 
            marginTop: 8, 
            color: '#666666', 
            textAlign: 'center',
            fontSize: 14
          }}>
            {error}
          </Text>
          <TouchableOpacity 
            style={{
              marginTop: 20,
              paddingHorizontal: 24,
              paddingVertical: 12,
              backgroundColor: '#FF385C',
              borderRadius: 8
            }}
            onPress={handleGoBack}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: 16, 
              fontWeight: '600' 
            }}>
              Quay lại
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const avatarUrl = getUserAvatar(userProfile);
  const displayName = getUserDisplayName(userProfile);
  const userRole = getUserRole(userProfile);
  const initials = getUserInitials(userProfile);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />
      
      {/* Header - Same style as photographer */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F7F7F7',
      }}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#E5E5E5',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="chevron-back" size={24} color="#000000" />
        </TouchableOpacity>
        
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: '#000000',
        }}>
          Hồ sơ
        </Text>
        
        <TouchableOpacity
          onPress={handleEditPress}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            borderWidth: 1,
            borderColor: '#E5E5E5',
          }}
        >
          <Text style={{
            fontSize: 14,
            fontWeight: '500',
            color: '#000000',
          }}>
            Chỉnh sửa
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {/* Profile Avatar Section - Same style as photographer */}
        <View style={{
          alignItems: 'center',
          paddingTop: 40,
          paddingBottom: 30,
          backgroundColor: '#FFFFFF',
          marginHorizontal: 16,
          marginTop: 16,
          borderRadius: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          <View style={{
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: '#333333',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 120, height: 120, borderRadius: 60 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{
                color: '#FFFFFF',
                fontSize: 48,
                fontWeight: 'bold',
              }}>
                {initials}
              </Text>
            )}
          </View>
          
          <Text style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: '#000000',
            marginBottom: 8,
          }}>
            {displayName}
          </Text>
          
          <Text style={{
            fontSize: 16,
            color: '#666666',
          }}>
            {userRole}
          </Text>
        </View>

        {/* User Info Section - Same list style as photographer */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 24, paddingTop: 40 }}>
            <View style={{ marginBottom: 30 }}>
              
              {/* Email */}
              {userProfile && 'email' in userProfile && userProfile.email && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F0F0F0',
                }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#F5F5F5',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16,
                  }}>
                    <Ionicons name="mail-outline" size={20} color="#666666" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      color: '#000000',
                      fontWeight: '500',
                    }}>
                      Email: {userProfile.email}
                    </Text>
                  </View>
                </View>
              )}

              {/* Phone Number */}
              {userProfile && 'phoneNumber' in userProfile && userProfile.phoneNumber && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 20,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F0F0F0',
                }}>
                  <View style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: '#F5F5F5',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16,
                  }}>
                    <Ionicons name="call-outline" size={20} color="#666666" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      color: '#000000',
                      fontWeight: '500',
                    }}>
                      Số điện thoại: {userProfile.phoneNumber}
                    </Text>
                  </View>
                </View>
              )}

              {/* Bio */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 20,
                borderBottomWidth: 1,
                borderBottomColor: '#F0F0F0',
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#F5F5F5',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}>
                  <Ionicons name="briefcase-outline" size={20} color="#666666" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    color: '#000000',
                    fontWeight: '500',
                  }}>
                    Công việc: {(userProfile && 'bio' in userProfile && userProfile.bio) || 'Công nghệ thông tin'}
                  </Text>
                </View>
              </View>

              {/* Location */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 20,
                borderBottomWidth: 1,
                borderBottomColor: '#F0F0F0',
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#F5F5F5',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}>
                  <Ionicons name="location-outline" size={20} color="#666666" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    color: '#000000',
                    fontWeight: '500',
                  }}>
                    Địa điểm yêu thích: Hà Nội
                  </Text>
                </View>
              </View>

              {/* Fun Fact */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 20,
                borderBottomWidth: 1,
                borderBottomColor: '#F0F0F0',
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#F5F5F5',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}>
                  <Ionicons name="bulb-outline" size={20} color="#666666" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    color: '#000000',
                    fontWeight: '500',
                  }}>
                    Sự thật thú vị: Hông có
                  </Text>
                </View>
              </View>

              {/* Pet */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 20,
                borderBottomWidth: 1,
                borderBottomColor: '#F0F0F0',
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#F5F5F5',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}>
                  <Ionicons name="paw-outline" size={20} color="#666666" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    color: '#000000',
                    fontWeight: '500',
                  }}>
                    Thú cưng: Rùa
                  </Text>
                </View>
              </View>

              {/* Birth Decade */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 20,
              }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#F5F5F5',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 16,
                }}>
                  <Ionicons name="calendar-outline" size={20} color="#666666" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    color: '#000000',
                    fontWeight: '500',
                  }}>
                    Sinh ra vào thập niên: {userProfile && 'createAt' in userProfile && userProfile.createAt 
                      ? Math.floor(new Date(userProfile.createAt).getFullYear() / 10) * 10
                      : '20'
                    }
                  </Text>
                </View>
              </View>

            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default ViewProfileUserScreen;