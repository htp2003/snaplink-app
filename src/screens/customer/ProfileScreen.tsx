import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Animated,
  StatusBar,
  Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import { getResponsiveSize } from '../../utils/responsive';
import { useProfile } from '../../context/ProfileContext';
import FavoritedModal from '../../components/FavoritedModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NotificationBell from '../../components/Notification/NotificationBell';
import NotificationModal from '../../components/Notification/NotificationModal';
import { useCurrentUserId } from '../../hooks/useAuth';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 60;

const ProfileScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { profileData } = useProfile();
  const currentUserId = useCurrentUserId(); 
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  
  const favoritedUsers = [
    { id: '1', name: 'John Doe', avatar: 'https://example.com/avatar1.jpg' },
    { id: '2', name: 'Jane Smith', avatar: 'https://example.com/avatar2.jpg' },
    { id: '3', name: 'Mike Johnson' },
  ];

  // Smooth animation values
  const headerOpacity = scrollY.interpolate({
    inputRange: [HEADER_HEIGHT - 20, HEADER_HEIGHT + 20],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [-100, 0],
    extrapolate: 'clamp',
  });

  const shadowOpacity = scrollY.interpolate({
    inputRange: [HEADER_HEIGHT - 10, HEADER_HEIGHT + 10],
    outputRange: [0, 0.1],
    extrapolate: 'clamp',
  });

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const menuItems = [
    {
      icon: 'settings-outline',
      title: 'Cài đặt tài khoản',
      hasNotification: true,
      // onPress: () => navigation.navigate('Settings')
    },
    {
      icon: 'help-circle-outline',
      title: 'Nhận trợ giúp',
      // onPress: () => navigation.navigate('Help')
    },
    {
      icon: 'person-outline',
      title: 'Xem hồ sơ',
      // onPress: () => navigation.navigate('ViewProfile')
    },
    {
      icon: 'hand-left-outline',
      title: 'Quyền riêng tư',
      // onPress: () => navigation.navigate('Privacy')
    },
    {
      icon: 'people-outline',
      title: 'Giới thiệu host',
      // onPress: () => navigation.navigate('BecomeHost')
    },
    {
      icon: 'business-outline',
      title: 'Tìm đồng chủ nhà',
      // onPress: () => navigation.navigate('FindCoHost')
    },
    {
      icon: 'document-text-outline',
      title: 'Pháp lý',
      // onPress: () => navigation.navigate('Legal')
    },
    {
      icon: 'log-out-outline',
      title: 'Đăng xuất',
      onPress: () => {/* Handle logout */}
    }
  ];

  const handleFavoritedPress = () => {
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
  };

  const handleNotificationPress = () => {
    setIsNotificationModalVisible(true);
  };

  const handleNotificationModalClose = () => {
    setIsNotificationModalVisible(false);
  };

  const renderNotificationBell = (isSticky = false) => {
    // Chỉ render khi có currentUserId và currentUserId là số hợp lệ
    if (!currentUserId || typeof currentUserId !== 'number' || currentUserId <= 0) {
      return null;
    }
    
    return (
      <NotificationBell
        onPress={handleNotificationPress}
        userId={currentUserId}
        size={24}
        color="#000000"
        style={{
          opacity: isSticky ? 1 : 1
        }}
      />
    );
  };

  const renderMenuItem = (item: any, index: number) => (
    <TouchableOpacity
      key={index}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
        borderBottomColor: '#F0F0F0'
      }}
      onPress={item.onPress}
    >
      <View style={{ position: 'relative' }}>
        <Ionicons name={item.icon} size={24} color="#000000" />
        {item.hasNotification && (
          <View style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#FF385C'
          }} />
        )}
      </View>
      <Text style={{
        flex: 1,
        marginLeft: 16,
        fontSize: 16,
        color: '#000000'
      }}>
        {item.title}
      </Text>
      <Ionicons name="chevron-forward" size={20} color="#C0C0C0" />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Smooth Sticky Header */}
      <Animated.View style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: HEADER_HEIGHT + insets.top,
        backgroundColor: '#FFFFFF',
        zIndex: 1000,
        paddingTop: insets.top,
        opacity: headerOpacity,
        transform: [{ translateY: headerTranslateY }],
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: shadowOpacity,
        shadowRadius: 4,
        elevation: 4,
      }}>
        <Animated.View style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}>
          <Animated.Text style={{ 
            fontSize: 32, 
            fontWeight: 'bold', 
            color: '#000000',
            opacity: headerOpacity,
          }}>
            Hồ sơ
          </Animated.Text>
          <Animated.View style={{ opacity: headerOpacity }}>
            {renderNotificationBell(true)}
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={8}
      >
        {/* Header trong scroll - sẽ scroll lên và trở thành sticky */}
        <View style={{
          height: HEADER_HEIGHT,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          marginBottom: 20,
        }}>
          <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#000000' }}>
            Hồ sơ
          </Text>
          {renderNotificationBell(false)}
        </View>
        
        {/* Profile Card */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#333333',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 12
            }}>
              {profileData?.avatar ? (
                <Image 
                  source={{ uri: profileData.avatar }}
                  style={{ width: '100%', height: '100%', borderRadius: 40 }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 32, fontWeight: 'bold' }}>A</Text>
              )}
            </View>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#000000', marginBottom: 4 }}>
              Anh Sơn
            </Text>
            <Text style={{ fontSize: 16, color: '#666666' }}>
              Khách
            </Text>
          </View>
        </View>
        
        {/* Feature Cards */}
        <View style={{ paddingHorizontal: 16, marginBottom: 30 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {/* Chuyến di trước đây */}
            <TouchableOpacity style={{
              flex: 0.48,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 20,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}>
              <View style={{
                width: 40,
                height: 32,
                marginBottom: 12,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Ionicons name="briefcase" size={32} color="#8B7355" />
              </View>
              <View style={{
                backgroundColor: '#6B73FF',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 12,
                marginBottom: 8
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>MỚI</Text>
              </View>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#000000',
                textAlign: 'center'
              }}>
                Chuyến đi{'\n'}trước đây
              </Text>
            </TouchableOpacity>

            {/* Kết nối */}
            <TouchableOpacity 
              style={{
                flex: 0.48,
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 20,
                alignItems: 'center',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={handleFavoritedPress}
            >
              <View style={{
                width: 60,
                height: 32,
                marginBottom: 12,
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <View style={{ flexDirection: 'row' }}>
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#4A90E2',
                    marginRight: -5
                  }} />
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#F5A623',
                    marginRight: -5
                  }} />
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#7ED321'
                  }} />
                </View>
              </View>
              <View style={{
                backgroundColor: '#6B73FF',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 12,
                marginBottom: 8
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>MỚI</Text>
              </View>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#000000',
                textAlign: 'center'
              }}>
                Kết nối
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Host Invitation Card */}
        <View style={{ paddingHorizontal: 16, marginBottom: 30 }}>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#FF385C',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 16
              }}>
                <Ionicons name="home" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#000000',
                  marginBottom: 4
                }}>
                  Trở thành host
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#666666',
                  lineHeight: 20
                }}>
                  Bắt đầu đón tiếp khách và kiếm thêm thu nhập thật dễ dàng.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={{
          backgroundColor: '#FFFFFF',
          marginHorizontal: 16,
          borderRadius: 12,
          overflow: 'hidden',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}>
          {menuItems.map((item, index) => renderMenuItem(item, index))}
        </View>

        {/* Version Info */}
        <View style={{ 
          alignItems: 'center', 
          paddingVertical: 30,
          paddingHorizontal: 20 
        }}>
          <Text style={{ 
            fontSize: 12, 
            color: '#999999',
            textAlign: 'center'
          }}>
            Phiên bản 1.0.0 (Build 100)
          </Text>
        </View>
      </ScrollView>

      {/* Modal */}
      <FavoritedModal 
        visible={isModalVisible}
        favoritedUsers={favoritedUsers}
        onClose={handleModalClose}
      />
      
      {/* Notification Modal - Only render if userId is valid */}
      {currentUserId && typeof currentUserId === 'number' && currentUserId > 0 && (
        <NotificationModal
          visible={isNotificationModalVisible}
          onClose={handleNotificationModalClose}
          userId={currentUserId}
        />  
      )}
    </View>
  );
};

export default ProfileScreen;