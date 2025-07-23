// screens/CreatePhotographerEventScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CreateEventFormData } from '../../types/photographerEvent';
import { usePhotographerEvent, useLocations, useEventFormValidation } from '../../hooks/usePhotographerEvent';
import { usePhotographerAuth } from '../../hooks/usePhotographerAuth';
import { usePhotographerNavigation } from '../../hooks/usePhotographerNavigation';
import { RootStackParamList } from '../../navigation/types';

type PhotographerEventScreenRouteProp = RouteProp<RootStackParamList, 'PhotographerEventScreen'>;
type PhotographerEventScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'PhotographerEventScreen'>;

interface PhotographerEventScreenProps {
  route: PhotographerEventScreenRouteProp;
  navigation: PhotographerEventScreenNavigationProp;
}

const PhotographerEventScreen: React.FC<PhotographerEventScreenProps> = ({
  route,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  
  // 🎯 SỬ DỤNG AUTH HOOKS THAY VÌ HARDCODE
  const { 
    userId, 
    photographerId, 
    isPhotographer, 
    isLoading: authLoading, 
    error: authError,
    hasPhotographerProfile 
  } = usePhotographerAuth();

  const { goBack } = usePhotographerNavigation();

  // Chỉ initialize hooks khi có photographerId
  const shouldInitialize = photographerId && hasPhotographerProfile;
  
  const { loading, error, success, createEvent, resetStates } = usePhotographerEvent();
  const { locations, loading: locationsLoading } = useLocations();
  const { errors, validateForm, clearErrors } = useEventFormValidation();

  const [formData, setFormData] = useState<CreateEventFormData>({
    title: '',
    description: '',
    originalPrice: '',
    discountedPrice: '',
    discountPercentage: '',
    startDate: null,
    endDate: null,
    maxBookings: '',
    selectedLocationIds: [],
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Show loading cho auth check
  if (authLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#F8FAFC' 
      }}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={{ marginTop: 16, color: '#64748B', fontSize: 16 }}>
          Đang kiểm tra quyền truy cập...
        </Text>
      </View>
    );
  }

  // Show error nếu không phải photographer
  if (authError || !isPhotographer) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#F8FAFC',
        padding: 20
      }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#FEE2E2',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24
        }}>
          <Ionicons name="alert-circle-outline" size={40} color="#DC2626" />
        </View>
        <Text style={{ 
          fontSize: 24, 
          fontWeight: '700',
          color: '#1E293B',
          textAlign: 'center',
          marginBottom: 12
        }}>
          Không thể truy cập
        </Text>
        <Text style={{ 
          fontSize: 16,
          color: '#64748B', 
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 32
        }}>
          {authError || 'Bạn cần có quyền photographer để tạo sự kiện'}
        </Text>
        <TouchableOpacity 
          style={{
            backgroundColor: '#6366F1',
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 16,
            shadowColor: '#6366F1',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={() => goBack()}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
            Quay lại
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show message nếu chưa có photographer profile
  if (!hasPhotographerProfile) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#F8FAFC',
        padding: 20
      }}>
        <View style={{
          width: 80,
          height: 80,
          borderRadius: 40,
          backgroundColor: '#DBEAFE',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24
        }}>
          <Ionicons name="camera-outline" size={40} color="#2563EB" />
        </View>
        <Text style={{ 
          fontSize: 24, 
          fontWeight: '700',
          color: '#1E293B',
          textAlign: 'center',
          marginBottom: 12
        }}>
          Chưa có hồ sơ photographer
        </Text>
        <Text style={{ 
          fontSize: 16,
          color: '#64748B', 
          textAlign: 'center',
          lineHeight: 24,
          marginBottom: 32
        }}>
          Bạn cần tạo hồ sơ photographer trước khi có thể tạo sự kiện
        </Text>
        <TouchableOpacity 
          style={{
            backgroundColor: '#6366F1',
            paddingHorizontal: 32,
            paddingVertical: 16,
            borderRadius: 16,
            shadowColor: '#6366F1',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
          }}
          onPress={() => {
            navigation.navigate('CreatePhotographerProfileScreen' as any, { userId });
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>
            Tạo hồ sơ photographer
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleInputChange = (field: keyof CreateEventFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    clearErrors();
  };

  const handleLocationToggle = (locationId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedLocationIds: prev.selectedLocationIds.includes(locationId)
        ? prev.selectedLocationIds.filter(id => id !== locationId)
        : [...prev.selectedLocationIds, locationId],
    }));
  };

  const handleSubmit = async () => {
    if (!photographerId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin photographer');
      return;
    }

    if (!validateForm(formData)) {
      return;
    }

    const eventData = {
      title: formData.title,
      description: formData.description,
      originalPrice: parseFloat(formData.originalPrice),
      discountedPrice: formData.discountedPrice ? parseFloat(formData.discountedPrice) : undefined,
      discountPercentage: formData.discountPercentage ? parseFloat(formData.discountPercentage) : undefined,
      startDate: formData.startDate?.toISOString(),
      endDate: formData.endDate?.toISOString(),
      maxBookings: parseInt(formData.maxBookings),
      locationIds: formData.selectedLocationIds,
    };

    const result = await createEvent(photographerId, eventData);
    
    if (result) {
      setShowSuccessModal(true);
      setFormData({
        title: '',
        description: '',
        originalPrice: '',
        discountedPrice: '',
        discountPercentage: '',
        startDate: null,
        endDate: null,
        maxBookings: '',
        selectedLocationIds: [],
      });
    }
  };

  const selectedLocations = locations.filter(loc => 
    formData.selectedLocationIds.includes(loc.locationId)
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={{
        backgroundColor: '#FFFFFF',
        paddingTop: insets.top + 16,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 3,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <TouchableOpacity
            onPress={goBack}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#F1F5F9',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#475569" />
          </TouchableOpacity>
          
          <Text style={{
            fontSize: 20,
            fontWeight: '700',
            color: '#1E293B',
            letterSpacing: 0.5
          }}>
            Tạo sự kiện mới
          </Text>
          
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: 120 + insets.bottom // Tab bar height + safe area + extra padding
        }}
      >
        {/* Welcome Card */}
        <View style={{
          backgroundColor: '#FFFFFF',
          margin: 20,
          borderRadius: 16,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 5,
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: 12
          }}>
            <View style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: '#EEF2FF',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16
            }}>
              <Ionicons name="calendar" size={24} color="#6366F1" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 18,
                fontWeight: '700',
                color: '#1E293B',
                marginBottom: 4
              }}>
                Tạo sự kiện chụp ảnh
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#64748B',
                lineHeight: 20
              }}>
                Thiết lập sự kiện đặc biệt để thu hút khách hàng
              </Text>
            </View>
          </View>
        </View>

        {/* Form Container */}
        <View style={{
          backgroundColor: '#FFFFFF',
          marginHorizontal: 20,
          borderRadius: 16,
          padding: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 5,
        }}>
          {/* Title Input */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#374151',
              marginBottom: 8
            }}>
              Tên sự kiện *
            </Text>
            <View style={{
              borderWidth: 1.5,
              borderColor: errors.title ? '#EF4444' : '#E2E8F0',
              borderRadius: 12,
              backgroundColor: '#FAFBFC',
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <Ionicons 
                name="text-outline" 
                size={20} 
                color={errors.title ? '#EF4444' : '#9CA3AF'} 
                style={{ marginRight: 12 }}
              />
              <TextInput
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: '#1F2937',
                  fontWeight: '500'
                }}
                placeholder="Ví dụ: Chụp ảnh cưới giảm giá 30%"
                placeholderTextColor="#9CA3AF"
                value={formData.title}
                onChangeText={(value) => handleInputChange('title', value)}
              />
            </View>
            {errors.title && (
              <Text style={{
                color: '#EF4444',
                fontSize: 12,
                marginTop: 6,
                marginLeft: 4
              }}>
                {errors.title}
              </Text>
            )}
          </View>

          {/* Description Input */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#374151',
              marginBottom: 8
            }}>
              Mô tả sự kiện *
            </Text>
            <View style={{
              borderWidth: 1.5,
              borderColor: errors.description ? '#EF4444' : '#E2E8F0',
              borderRadius: 12,
              backgroundColor: '#FAFBFC',
              paddingHorizontal: 16,
              paddingVertical: 12,
              minHeight: 100
            }}>
              <TextInput
                style={{
                  fontSize: 16,
                  color: '#1F2937',
                  fontWeight: '500',
                  textAlignVertical: 'top',
                  minHeight: 76
                }}
                placeholder="Mô tả chi tiết về sự kiện, ưu đãi đặc biệt..."
                placeholderTextColor="#9CA3AF"
                value={formData.description}
                onChangeText={(value) => handleInputChange('description', value)}
                multiline
                numberOfLines={4}
              />
            </View>
            {errors.description && (
              <Text style={{
                color: '#EF4444',
                fontSize: 12,
                marginTop: 6,
                marginLeft: 4
              }}>
                {errors.description}
              </Text>
            )}
          </View>

          {/* Price Section */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#1E293B',
              marginBottom: 16,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              💰 Thông tin giá
            </Text>
            
            <View style={{ flexDirection: 'row', marginBottom: 16 }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8
                }}>
                  Giá gốc *
                </Text>
                <View style={{
                  borderWidth: 1.5,
                  borderColor: errors.originalPrice ? '#EF4444' : '#E2E8F0',
                  borderRadius: 12,
                  backgroundColor: '#FAFBFC',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Text style={{ color: '#9CA3AF', marginRight: 8 }}>₫</Text>
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: '#1F2937',
                      fontWeight: '600'
                    }}
                    placeholder="500,000"
                    placeholderTextColor="#9CA3AF"
                    value={formData.originalPrice}
                    onChangeText={(value) => handleInputChange('originalPrice', value)}
                    keyboardType="numeric"
                  />
                </View>
                {errors.originalPrice && (
                  <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
                    {errors.originalPrice}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8
                }}>
                  Giá khuyến mãi
                </Text>
                <View style={{
                  borderWidth: 1.5,
                  borderColor: errors.discountedPrice ? '#EF4444' : '#E2E8F0',
                  borderRadius: 12,
                  backgroundColor: '#FAFBFC',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Text style={{ color: '#9CA3AF', marginRight: 8 }}>₫</Text>
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: '#059669',
                      fontWeight: '600'
                    }}
                    placeholder="350,000"
                    placeholderTextColor="#9CA3AF"
                    value={formData.discountedPrice}
                    onChangeText={(value) => handleInputChange('discountedPrice', value)}
                    keyboardType="numeric"
                  />
                </View>
                {errors.discountedPrice && (
                  <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
                    {errors.discountedPrice}
                  </Text>
                )}
              </View>
            </View>

            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8
                }}>
                  Phần trăm giảm
                </Text>
                <View style={{
                  borderWidth: 1.5,
                  borderColor: errors.discountPercentage ? '#EF4444' : '#E2E8F0',
                  borderRadius: 12,
                  backgroundColor: '#FAFBFC',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: '#DC2626',
                      fontWeight: '600'
                    }}
                    placeholder="30"
                    placeholderTextColor="#9CA3AF"
                    value={formData.discountPercentage}
                    onChangeText={(value) => handleInputChange('discountPercentage', value)}
                    keyboardType="numeric"
                  />
                  <Text style={{ color: '#9CA3AF', marginLeft: 8 }}>%</Text>
                </View>
                {errors.discountPercentage && (
                  <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
                    {errors.discountPercentage}
                  </Text>
                )}
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8
                }}>
                  Số lượng tối đa *
                </Text>
                <View style={{
                  borderWidth: 1.5,
                  borderColor: errors.maxBookings ? '#EF4444' : '#E2E8F0',
                  borderRadius: 12,
                  backgroundColor: '#FAFBFC',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Ionicons 
                    name="people-outline" 
                    size={16} 
                    color="#9CA3AF" 
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    style={{
                      flex: 1,
                      fontSize: 16,
                      color: '#1F2937',
                      fontWeight: '600'
                    }}
                    placeholder="50"
                    placeholderTextColor="#9CA3AF"
                    value={formData.maxBookings}
                    onChangeText={(value) => handleInputChange('maxBookings', value)}
                    keyboardType="numeric"
                  />
                </View>
                {errors.maxBookings && (
                  <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
                    {errors.maxBookings}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Date Section */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#1E293B',
              marginBottom: 16
            }}>
              📅 Thời gian diễn ra
            </Text>
            
            <View style={{ flexDirection: 'row' }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8
                }}>
                  Ngày bắt đầu *
                </Text>
                <TouchableOpacity
                  style={{
                    borderWidth: 1.5,
                    borderColor: errors.startDate ? '#EF4444' : '#E2E8F0',
                    borderRadius: 12,
                    backgroundColor: '#FAFBFC',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    console.log('📅 Start date picker pressed');
                    setShowStartDatePicker(true);
                  }}
                >
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color="#6366F1" 
                    style={{ marginRight: 12 }}
                  />
                  <Text style={{
                    fontSize: 16,
                    color: formData.startDate ? '#1F2937' : '#9CA3AF',
                    fontWeight: '500'
                  }}>
                    {formData.startDate ? formData.startDate.toLocaleDateString('vi-VN') : 'Chọn ngày'}
                  </Text>
                </TouchableOpacity>
                {/* {errors.startDate && (
                  <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
                    {errors.startDate}
                  </Text>
                )} */}
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: 8
                }}>
                  Ngày kết thúc *
                </Text>
                <TouchableOpacity
                  style={{
                    borderWidth: 1.5,
                    borderColor: errors.endDate ? '#EF4444' : '#E2E8F0',
                    borderRadius: 12,
                    backgroundColor: '#FAFBFC',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    console.log('📅 End date picker pressed');
                    setShowEndDatePicker(true);
                  }}
                >
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color="#6366F1" 
                    style={{ marginRight: 12 }}
                  />
                  <Text style={{
                    fontSize: 16,
                    color: formData.endDate ? '#1F2937' : '#9CA3AF',
                    fontWeight: '500'
                  }}>
                    {formData.endDate ? formData.endDate.toLocaleDateString('vi-VN') : 'Chọn ngày'}
                  </Text>
                </TouchableOpacity>
                {/* {errors.endDate && (
                  <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4 }}>
                    {errors.endDate}
                  </Text>
                )} */}
              </View>
            </View>
          </View>

          {/* Location Selection */}
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '700',
              color: '#1E293B',
              marginBottom: 16
            }}>
              📍 Địa điểm áp dụng
            </Text>
            
            <TouchableOpacity
              style={{
                borderWidth: 1.5,
                borderColor: errors.selectedLocationIds ? '#EF4444' : '#E2E8F0',
                borderRadius: 12,
                backgroundColor: '#FAFBFC',
                paddingHorizontal: 16,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 12
              }}
              onPress={() => setShowLocationModal(true)}
            >
              <Ionicons 
                name="location-outline" 
                size={20} 
                color="#6366F1" 
                style={{ marginRight: 12 }}
              />
              <Text style={{
                flex: 1,
                fontSize: 16,
                color: selectedLocations.length > 0 ? '#1F2937' : '#9CA3AF',
                fontWeight: '500'
              }}>
                {selectedLocations.length > 0 
                  ? `${selectedLocations.length} địa điểm đã chọn`
                  : 'Chọn địa điểm áp dụng'
                }
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            {errors.selectedLocationIds && (
              <Text style={{ color: '#EF4444', fontSize: 12, marginLeft: 4 }}>
                {errors.selectedLocationIds}
              </Text>
            )}

            {selectedLocations.length > 0 && (
              <View style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 8,
                padding: 12,
                marginTop: 8
              }}>
                {selectedLocations.map(location => (
                  <View key={location.locationId} style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 6
                  }}>
                    <View style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: '#6366F1',
                      marginRight: 12
                    }} />
                    <Text style={{
                      fontSize: 14,
                      color: '#475569',
                      fontWeight: '500'
                    }}>
                      {location.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Error Message */}
          {error && (
            <View style={{
              backgroundColor: '#FEF2F2',
              borderRadius: 12,
              padding: 16,
              marginBottom: 24,
              flexDirection: 'row',
              alignItems: 'center'
            }}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" style={{ marginRight: 12 }} />
              <Text style={{
                color: '#DC2626',
                fontSize: 14,
                fontWeight: '500',
                flex: 1
              }}>
                {error}
              </Text>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={{
              backgroundColor: loading || !photographerId ? '#CBD5E1' : '#6366F1',
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              shadowColor: loading || !photographerId ? 'transparent' : '#6366F1',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={handleSubmit}
            disabled={loading || !photographerId}
          >
            {loading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color="white" size="small" />
                <Text style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: '700',
                  marginLeft: 12
                }}>
                  Đang tạo sự kiện...
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginRight: 8 }} />
                <Text style={{
                  color: 'white',
                  fontSize: 16,
                  fontWeight: '700'
                }}>
                  Tạo sự kiện
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Pickers - Fixed for both platforms */}
      {showStartDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide">
            <View style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }}>
              <View style={{
                backgroundColor: 'white',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingTop: 20,
                paddingBottom: insets.bottom + 20
              }}>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  marginBottom: 20
                }}>
                  <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                    <Text style={{ color: '#6366F1', fontSize: 16 }}>Hủy</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: '600' }}>Chọn ngày bắt đầu</Text>
                  <TouchableOpacity onPress={() => setShowStartDatePicker(false)}>
                    <Text style={{ color: '#6366F1', fontSize: 16, fontWeight: '600' }}>Xong</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ height: 200 }}>
                  <DateTimePicker
                    value={formData.startDate || new Date()}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      console.log('📅 Start date selected:', selectedDate);
                      if (selectedDate) {
                        handleInputChange('startDate', selectedDate);
                      }
                    }}
                    style={{ 
                      flex: 1,
                      backgroundColor: 'white',
                      height: 200
                    }}
                    textColor="#000000"
                  />
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={formData.startDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              console.log('📅 Android start date event:', event.type, selectedDate);
              setShowStartDatePicker(false);
              if (event.type === 'set' && selectedDate) {
                handleInputChange('startDate', selectedDate);
              }
            }}
          />
        )
      )}

      {showEndDatePicker && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide">
            <View style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: 'rgba(0, 0, 0, 0.5)'
            }}>
              <View style={{
                backgroundColor: 'white',
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingTop: 20,
                paddingBottom: insets.bottom + 20
              }}>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  marginBottom: 20
                }}>
                  <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                    <Text style={{ color: '#6366F1', fontSize: 16 }}>Hủy</Text>
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: '600' }}>Chọn ngày kết thúc</Text>
                  <TouchableOpacity onPress={() => setShowEndDatePicker(false)}>
                    <Text style={{ color: '#6366F1', fontSize: 16, fontWeight: '600' }}>Xong</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ height: 200 }}>
                  <DateTimePicker
                    value={formData.endDate || new Date()}
                    mode="date"
                    display="spinner"
                    onChange={(event, selectedDate) => {
                      console.log('📅 End date selected:', selectedDate);
                      if (selectedDate) {
                        handleInputChange('endDate', selectedDate);
                      }
                    }}
                    style={{ 
                      flex: 1,
                      backgroundColor: 'white',
                      height: 200
                    }}
                    textColor="#000000"
                  />
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={formData.endDate || new Date()}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              console.log('📅 Android end date event:', event.type, selectedDate);
              setShowEndDatePicker(false);
              if (event.type === 'set' && selectedDate) {
                handleInputChange('endDate', selectedDate);
              }
            }}
          />
        )
      )}

      {/* Beautiful Location Selection Modal */}
      <Modal visible={showLocationModal} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          
          {/* Modal Header */}
          <View style={{
            backgroundColor: '#FFFFFF',
            paddingTop: insets.top + 16,
            paddingBottom: 16,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#E2E8F0',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 3,
            elevation: 3,
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <Text style={{
                fontSize: 20,
                fontWeight: '700',
                color: '#1E293B'
              }}>
                Chọn địa điểm
              </Text>
              <TouchableOpacity
                onPress={() => setShowLocationModal(false)}
                style={{
                  backgroundColor: '#6366F1',
                  paddingHorizontal: 20,
                  paddingVertical: 8,
                  borderRadius: 20
                }}
              >
                <Text style={{
                  color: '#FFFFFF',
                  fontWeight: '600',
                  fontSize: 14
                }}>
                  Xong
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {locationsLoading ? (
            <View style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={{
                marginTop: 16,
                fontSize: 16,
                color: '#64748B'
              }}>
                Đang tải địa điểm...
              </Text>
            </View>
          ) : (
            <FlatList
              data={locations}
              keyExtractor={(item) => item.locationId.toString()}
              contentContainerStyle={{ padding: 16 }}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 12,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 4,
                    elevation: 2,
                    borderWidth: formData.selectedLocationIds.includes(item.locationId) ? 2 : 0,
                    borderColor: formData.selectedLocationIds.includes(item.locationId) ? '#6366F1' : 'transparent'
                  }}
                  onPress={() => handleLocationToggle(item.locationId)}
                >
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: '#1F2937',
                        marginBottom: 4
                      }}>
                        {item.name}
                      </Text>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 8
                      }}>
                        <Ionicons name="location-outline" size={14} color="#6B7280" />
                        <Text style={{
                          fontSize: 14,
                          color: '#6B7280',
                          marginLeft: 4,
                          flex: 1
                        }}>
                          {item.address}
                        </Text>
                      </View>
                      <View style={{
                        flexDirection: 'row',
                        alignItems: 'center'
                      }}>
                        <Ionicons name="cash-outline" size={14} color="#059669" />
                        <Text style={{
                          fontSize: 14,
                          color: '#059669',
                          fontWeight: '600',
                          marginLeft: 4
                        }}>
                          {item.hourlyRate?.toLocaleString('vi-VN')} ₫/giờ
                        </Text>
                      </View>
                    </View>
                    
                    <View style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor: formData.selectedLocationIds.includes(item.locationId) ? '#6366F1' : '#D1D5DB',
                      backgroundColor: formData.selectedLocationIds.includes(item.locationId) ? '#6366F1' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 12
                    }}>
                      {formData.selectedLocationIds.includes(item.locationId) && (
                        <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Beautiful Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 24,
            padding: 32,
            marginHorizontal: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#DCFCE7',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24
            }}>
              <Ionicons name="checkmark" size={40} color="#16A34A" />
            </View>
            
            <Text style={{
              fontSize: 24,
              fontWeight: '700',
              color: '#1E293B',
              textAlign: 'center',
              marginBottom: 12
            }}>
              Sự kiện đã được tạo!
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: '#64748B',
              textAlign: 'center',
              lineHeight: 24,
              marginBottom: 32
            }}>
              Sự kiện của bạn đã được tạo thành công và sẵn sàng để khách hàng đặt lịch.
            </Text>
            
            <TouchableOpacity
              style={{
                backgroundColor: '#6366F1',
                borderRadius: 16,
                paddingVertical: 16,
                paddingHorizontal: 32,
                shadowColor: '#6366F1',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}
              onPress={() => {
                setShowSuccessModal(false);
                resetStates();
                goBack();
              }}
            >
              <Text style={{
                color: 'white',
                fontSize: 16,
                fontWeight: '700'
              }}>
                Tuyệt vời!
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PhotographerEventScreen;