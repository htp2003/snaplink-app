import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import { photographerService, PhotographerProfile } from '../../services/photographerService';

const ViewProfileScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user, getCurrentUserId } = useAuth();
  const [photographerData, setPhotographerData] = useState<PhotographerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPhotographerData();
  }, []);

  const loadPhotographerData = async () => {
    try {
      setIsLoading(true);
      const userId = getCurrentUserId();
      
      if (!userId) {
        setIsLoading(false);
        return;
      }

      // Use findPhotographerProfile to get data
      const photographerProfile = await photographerService.findPhotographerProfile(userId);
      setPhotographerData(photographerProfile);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading photographer data:', error);
      setIsLoading(false);
    }
  };

  const handleEditPress = () => {
    navigation.navigate('EditProfile');
  };

  const handleStartPress = () => {
    navigation.navigate('EditProfile');
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  const getUserInitial = () => {
    return user?.fullName?.charAt(0)?.toUpperCase() || 'U';
  };

  const renderProfileInfo = () => {
    if (!photographerData) {
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
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 24, paddingTop: 40 }}>
          {/* Profile Info Items */}
          <View style={{ marginBottom: 30 }}>
            {/* Years of Experience */}
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
                  Kinh nghiệm của tôi: {photographerData.yearsExperience} năm 
                </Text>
              </View>
            </View>

            {/* Equipment */}
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
                <Ionicons name="camera-outline" size={20} color="#666666" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  color: '#000000',
                  fontWeight: '500',
                }}>
                  Thiết bị: {photographerData.equipment}
                </Text>
              </View>
            </View>

            {/* Hourly Rate */}
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
                <Ionicons name="card-outline" size={20} color="#666666" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  color: '#000000',
                  fontWeight: '500',
                }}>
                  Giá dịch vụ: {photographerData.hourlyRate?.toLocaleString('vi-VN')} VNĐ/giờ
                </Text>
              </View>
            </View>

            {/* Rating */}
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
                <Ionicons name="star-outline" size={20} color="#666666" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  color: '#000000',
                  fontWeight: '500',
                }}>
                  Đánh giá: ⭐ {photographerData.rating?.toFixed(1)} ({photographerData.ratingCount || 0} lượt đánh giá)
                </Text>
              </View>
            </View>

            {/* Availability Status */}
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
                <Ionicons name="time-outline" size={20} color="#666666" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  color: '#000000',
                  fontWeight: '500',
                }}>
                  Trạng thái: {photographerData.availabilityStatus === 'Available' ? 'Sẵn sàng nhận việc' : photographerData.availabilityStatus}
                </Text>
              </View>
            </View>

            {/* Photography Styles */}
            {photographerData.styles && photographerData.styles.length > 0 && (
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
                  <Ionicons name="heart-outline" size={20} color="#666666" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    color: '#000000',
                    fontWeight: '500',
                    marginBottom: 8,
                  }}>
                    Sở thích nhiếp ảnh:
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 8,
                  }}>
                    {photographerData.styles.map((style, index) => (
                      <View
                        key={index}
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
                          {style}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  if (isLoading) {
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
          <ActivityIndicator size="large" color="#000000" />
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
          {photographerData ? 'Hồ sơ' : 'Chỉnh sửa'}
        </Text>
        
        {photographerData && (
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
        
        {!photographerData && <View style={{ width: 40 }} />}
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
            {user?.profileImage ? (
              <Image
                source={{ uri: user.profileImage }}
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
            {user?.fullName || 'User'}
          </Text>
          
          <Text style={{
            fontSize: 16,
            color: '#666666',
          }}>
            {photographerData ? 'Nhiếp ảnh gia' : 'Khách'}
          </Text>
        </View>

        {/* Main Content */}
        {renderProfileInfo()}
      </View>
    </SafeAreaView>
  );
};

export default ViewProfileScreen;