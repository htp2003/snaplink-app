import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Image,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { usePhotographerProfile } from '../../hooks/usePhotographerProfile';

const ViewProfilePhotographerScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user, getCurrentUserId } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  
  // Sử dụng hook
  const {
    photographer,
    styles,
    loading,
    error,
    findByUserId,
    // Computed values từ hook
    displayName,
    hourlyRate,
    yearsExperience,
    equipment,
    isAvailable,
  } = usePhotographerProfile();

  useEffect(() => {
    loadPhotographerData();
  }, []);

  const loadPhotographerData = async () => {
    const userId = getCurrentUserId();
    if (userId) {
      try {
        await findByUserId(userId);
      } catch (error) {
        console.error('Error loading photographer data:', error);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPhotographerData();
    setRefreshing(false);
  };

  const handleEditPress = () => {
    navigation.navigate('EditProfilePhotographer');
  };

  const handleStartPress = () => {
    navigation.navigate('EditProfilePhotographer');
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const getUserInitial = () => {
    return displayName?.charAt(0)?.toUpperCase() || user?.fullName?.charAt(0)?.toUpperCase() || 'U';
  };

  const getAvatar = () => {
    return photographer?.user?.profileImage || user?.profileImage;
  };

  const getFormattedRating = () => {
    if (!photographer) return '0.0';
    return photographer.rating ? photographer.rating.toFixed(1) : '0.0';
  };

  const getFormattedHourlyRate = () => {
    if (!photographer?.hourlyRate) return 'Chưa cập nhật';
    return `${photographer.hourlyRate.toLocaleString('vi-VN')} VNĐ/giờ`;
  };

  const getExperienceText = () => {
    if (!photographer?.yearsExperience) return 'Chưa cập nhật';
    return `${photographer.yearsExperience} năm`;
  };

  const getTotalBookings = () => {
    return photographer?.ratingCount || 0;
  };

  const renderProfileInfo = () => {
    if (!photographer) {
      // Show fallback UI for non-photographer users
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{
            fontSize: 24,
            fontWeight: 'bold',
            color: '#000000',
            textAlign: 'center',
            marginBottom: 20,
          }}>
            Hoàn tất hồ sơ của bạn
          </Text>
          
          <Text style={{
            fontSize: 16,
            color: '#666666',
            textAlign: 'center',
            lineHeight: 24,
            marginBottom: 40,
            paddingHorizontal: 20,
          }}>
            Hồ sơ Photographer là một phần quan trọng của mọi lượt đặt. Hãy hoàn tất hồ sơ để giúp khách hiểu hơn về bạn.
          </Text>
          
          <TouchableOpacity
            onPress={handleStartPress}
            style={{
              backgroundColor: '#E91E63',
              paddingHorizontal: 40,
              paddingVertical: 16,
              borderRadius: 25,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '600',
            }}>
              Bắt đầu
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Show photographer profile info
    return (
      <ScrollView 
        style={{ flex: 1 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#E91E63']}
            tintColor="#E91E63"
          />
        }
      >
        <View style={{ paddingHorizontal: 24, paddingTop: 40 }}>
          {/* Error message */}
          {error && (
            <View style={{
              backgroundColor: '#FFE6E6',
              padding: 16,
              borderRadius: 8,
              marginBottom: 20,
              borderLeftWidth: 4,
              borderLeftColor: '#FF4444',
            }}>
              <Text style={{ color: '#CC0000', fontSize: 14 }}>{error}</Text>
            </View>
          )}

          {/* Profile Info Items */}
          <View style={{ marginBottom: 30 }}>
            {/* Years of Experience */}
            <ProfileInfoItem
              icon="briefcase-outline"
              title="Kinh nghiệm của tôi"
              value={getExperienceText()}
            />

            {/* Equipment */}
            <ProfileInfoItem
              icon="camera-outline"
              title="Thiết bị"
              value={photographer.equipment || 'Chưa cập nhật'}
            />

            {/* Hourly Rate */}
            <ProfileInfoItem
              icon="card-outline"
              title="Giá dịch vụ"
              value={getFormattedHourlyRate()}
            />

            {/* Rating */}
            <ProfileInfoItem
              icon="star-outline"
              title="Đánh giá"
              value={`⭐ ${getFormattedRating()} (${getTotalBookings()} lượt đánh giá)`}
            />

            {/* Availability Status */}
            <ProfileInfoItem
              icon="time-outline"
              title="Trạng thái"
              value={isAvailable ? 'Sẵn sàng nhận việc' : photographer.availabilityStatus}
              isStatus={true}
              statusColor={isAvailable ? '#4CAF50' : '#FF9800'}
            />

            {/* Photography Styles */}
            {styles && styles.length > 0 && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
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
                  marginTop: 0,
                }}>
                  <Ionicons name="heart-outline" size={20} color="#666666" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    color: '#000000',
                    fontWeight: '500',
                    marginBottom: 12,
                  }}>
                    Sở thích nhiếp ảnh:
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}>
                    {styles.map((style) => (
                      <View
                        key={style.styleId}
                        style={{
                          backgroundColor: '#E8F4FD',
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 16,
                        }}
                      >
                        <Text style={{
                          fontSize: 14,
                          color: '#1976D2',
                          fontWeight: '500',
                        }}>
                          {style.name}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Verification Status */}
            {photographer.verificationStatus && (
              <ProfileInfoItem
                icon="shield-checkmark-outline"
                title="Trạng thái xác minh"
                value={photographer.verificationStatus === 'Verified' ? 'Đã xác minh' : 'Chưa xác minh'}
                isStatus={true}
                statusColor={photographer.verificationStatus === 'Verified' ? '#4CAF50' : '#FF9800'}
              />
            )}

            {/* Bio from User */}
            {(photographer.user?.bio || user?.bio) && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
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
                  marginTop: 0,
                }}>
                  <Ionicons name="person-outline" size={20} color="#666666" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 14,
                    color: '#666666',
                    marginBottom: 4,
                  }}>
                    Giới thiệu
                  </Text>
                  <Text style={{
                    fontSize: 16,
                    color: '#000000',
                    fontWeight: '500',
                    lineHeight: 22,
                  }}>
                    {photographer.user?.bio || user?.bio}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  // Loading state
  if (loading && !photographer) {
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
            onPress={handleBackPress}
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
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={{ marginTop: 16, fontSize: 16, color: '#666666' }}>
            Đang tải hồ sơ...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
          onPress={handleBackPress}
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
          {photographer ? 'Hồ sơ' : 'Chỉnh sửa'}
        </Text>
        
        {photographer && (
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
        )}
        
        {!photographer && <View style={{ width: 40 }} />}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {/* Profile Avatar Section */}
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
            {getAvatar() ? (
              <Image
                source={{ uri: getAvatar() }}
                style={{ width: 120, height: 120, borderRadius: 60 }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{
                color: '#FFFFFF',
                fontSize: 48,
                fontWeight: 'bold',
              }}>
                {getUserInitial()}
              </Text>
            )}
          </View>
          
          <Text style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: '#000000',
            marginBottom: 8,
          }}>
            {displayName || user?.fullName || 'User'}
          </Text>
          
          <Text style={{
            fontSize: 16,
            color: '#666666',
          }}>
            {photographer ? 'Nhiếp ảnh gia' : 'Khách'}
          </Text>

          {/* Email */}
          {(photographer?.user?.email || user?.email) && (
            <Text style={{
              fontSize: 14,
              color: '#666666',
              marginTop: 4,
            }}>
              {photographer?.user?.email || user?.email}
            </Text>
          )}

          {/* Phone */}
          {(photographer?.user?.phoneNumber || user?.phoneNumber) && (
            <Text style={{
              fontSize: 14,
              color: '#666666',
              marginTop: 2,
            }}>
              {photographer?.user?.phoneNumber || user?.phoneNumber}
            </Text>
          )}

          {/* Status Badge */}
          {photographer && (
            <View style={{
              marginTop: 12,
              paddingHorizontal: 16,
              paddingVertical: 6,
              backgroundColor: isAvailable ? '#E8F5E8' : '#FFF3E0',
              borderRadius: 20,
            }}>
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: isAvailable ? '#4CAF50' : '#FF9800',
              }}>
                {isAvailable ? 'Sẵn sàng' : 'Bận'}
              </Text>
            </View>
          )}
        </View>

        {/* Main Content */}
        {renderProfileInfo()}
      </View>
    </SafeAreaView>
  );
};

// Helper component để tái sử dụng
const ProfileInfoItem: React.FC<{
  icon: string;
  title: string;
  value: string;
  isStatus?: boolean;
  statusColor?: string;
}> = ({ icon, title, value, isStatus, statusColor }) => (
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
      <Ionicons name={icon as any} size={20} color="#666666" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={{
        fontSize: 14,
        color: '#666666',
        marginBottom: 4,
      }}>
        {title}
      </Text>
      <Text style={{
        fontSize: 16,
        color: isStatus && statusColor ? statusColor : '#000000',
        fontWeight: '500',
      }}>
        {value}
      </Text>
    </View>
  </View>
);

export default ViewProfilePhotographerScreen;