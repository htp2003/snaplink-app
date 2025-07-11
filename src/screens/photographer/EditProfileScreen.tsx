import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import { useAuth } from '../../hooks/useAuth';
import FieldEditModal from '../../components/Photographer/FileEditModal';
import { photographerService, Style as ApiStyle, CreatePhotographerRequest, UpdatePhotographerRequest, PhotographerProfile as ApiPhotographerProfile } from '../../services/photographerService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Style {
  styleId: number;
  name: string;
  description: string;
  photographerCount: number;
}

interface ProfileField {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  placeholder: string;
  question: string;
  description: string;
  maxLength: number;
  fieldType: 'text' | 'number' | 'select';
  options?: string[];
}

const NewPhotographerEditProfile = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { getCurrentUserId } = useAuth();
  const [selectedField, setSelectedField] = useState<ProfileField | null>(null);
  const [isFieldModalVisible, setIsFieldModalVisible] = useState(false);
  const [isStyleModalVisible, setIsStyleModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [styles, setStyles] = useState<ApiStyle[]>([]);
  const [selectedStyleIds, setSelectedStyleIds] = useState<number[]>([]);
  const [currentPhotographerId, setCurrentPhotographerId] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false); // Để biết là edit hay create

  const [profileData, setProfileData] = useState<ProfileField[]>([
    {
      id: 'yearsExperience',
      icon: 'ribbon-outline',
      title: 'Số năm kinh nghiệm',
      value: '',
      placeholder: 'VD: 5',
      question: 'Bạn có bao nhiêu năm kinh nghiệm?',
      description: 'Cho chúng tôi biết số năm bạn đã làm nhiếp ảnh gia chuyên nghiệp.',
      maxLength: 2,
      fieldType: 'number',
    },
    {
      id: 'equipment',
      icon: 'camera-outline',
      title: 'Thiết bị chuyên nghiệp',
      value: '',
      placeholder: 'VD: Canon 5D Mark IV, 85mm lens',
      question: 'Thiết bị chụp ảnh của bạn?',
      description: 'Liệt kê các thiết bị chuyên nghiệp mà bạn sử dụng để chụp ảnh.',
      maxLength: 200,
      fieldType: 'text',
    },
    {
      id: 'hourlyRate',
      icon: 'card-outline',
      title: 'Giá theo giờ (VNĐ)',
      value: '',
      placeholder: 'VD: 500000',
      question: 'Giá dịch vụ của bạn?',
      description: 'Nhập mức giá theo giờ cho dịch vụ chụp ảnh của bạn.',
      maxLength: 10,
      fieldType: 'number',
    },
    {
      id: 'availabilityStatus',
      icon: 'time-outline',
      title: 'Trạng thái làm việc',
      value: 'Available',
      placeholder: 'Chọn trạng thái',
      question: 'Trạng thái hiện tại của bạn?',
      description: 'Cho khách hàng biết bạn có sẵn sàng nhận việc hay không.',
      maxLength: 20,
      fieldType: 'select',
      options: ['Available', 'Busy', 'Offline'],
    },
  ]);

  useEffect(() => {
    loadPhotographerProfile();
  }, []);

  const loadStyles = async () => {
    try {
      console.log('🎨 Fetching styles from API...');
      const stylesData = await photographerService.getStyles();
      console.log('✅ Styles loaded:', stylesData);
      setStyles(stylesData);
    } catch (error) {
      console.error('❌ Error loading styles:', error);
      Alert.alert('Lỗi', 'Không thể tải danh sách styles');
    }
  };

  const loadPhotographerProfile = async () => {
    try {
      setIsLoading(true);
      const userId = getCurrentUserId();
      
      if (!userId) {
        setIsLoading(false);
        return;
      }

      // Load styles first and wait for completion
      console.log('🔄 Loading styles...');
      await loadStyles();
      
      // Wait for styles state to update
      // We'll move the profile loading to useEffect when styles change
      
    } catch (error) {
      console.error('Error loading photographer profile:', error);
      setIsLoading(false);
    }
  };

  // Add separate effect to load profile when styles are ready
  useEffect(() => {
    const loadProfileData = async () => {
      if (styles.length === 0) return; // Wait until styles are loaded
      
      const userId = getCurrentUserId();
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔄 Loading photographer profile...');
        const profileData = await photographerService.findPhotographerProfile(userId);
        
        if (profileData) {
          populateFormData(profileData);
          setIsEditMode(true);
          console.log('✅ Loaded existing photographer profile for editing');
        } else {
          console.log('❌ No photographer profile found - creating new profile');
          setIsEditMode(false);
        }
      } catch (error) {
        console.error('Error loading photographer profile:', error);
      }
      
      setIsLoading(false);
    };

    loadProfileData();
  }, [styles]); // Run when styles change

  const populateFormData = (data: ApiPhotographerProfile) => {
    console.log('🔍 populateFormData received data:', data);
    console.log('🎨 Available styles:', styles);
    
    setProfileData(prev => prev.map(field => {
      switch (field.id) {
        case 'yearsExperience':
          return { ...field, value: data.yearsExperience?.toString() || '' };
        case 'equipment':
          return { ...field, value: data.equipment || '' };
        case 'hourlyRate':
          return { ...field, value: data.hourlyRate?.toString() || '' };
        case 'availabilityStatus':
          return { ...field, value: data.availabilityStatus || 'Available' };
        default:
          return field;
      }
    }));
    
    // Convert style names to styleIds
    if (data.styles && data.styles.length > 0) {
      console.log('📝 Converting style names to IDs:', data.styles);
      // Find matching styleIds from style names
      const matchingStyleIds = data.styles.map(styleName => {
        const style = styles.find(s => s.name === styleName);
        console.log(`🔄 Style "${styleName}" → styleId: ${style?.styleId || 'NOT FOUND'}`);
        return style ? style.styleId : null;
      }).filter(Boolean) as number[];
      
      console.log('✅ Final styleIds:', matchingStyleIds);
      setSelectedStyleIds(matchingStyleIds);
    } else if (data.styleIds) {
      console.log('📋 Using styleIds directly:', data.styleIds);
      setSelectedStyleIds(data.styleIds);
    } else {
      console.log('❌ No styles found');
      setSelectedStyleIds([]);
    }
    
    setCurrentPhotographerId(data.photographerId);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleFieldPress = (field: ProfileField) => {
    setSelectedField(field);
    setIsFieldModalVisible(true);
  };

  const handleSaveField = (fieldId: string, value: string) => {
    setProfileData(prev => 
      prev.map(item => 
        item.id === fieldId 
          ? { ...item, value: value }
          : item
      )
    );
    setIsFieldModalVisible(false);
    setSelectedField(null);
  };

  const handleStylePress = () => {
    setIsStyleModalVisible(true);
  };

  const toggleStyle = (styleId: number) => {
    setSelectedStyleIds(prev => {
      if (prev.includes(styleId)) {
        // Remove style
        return prev.filter(id => id !== styleId);
      } else {
        // Add style only if under limit
        if (prev.length >= 3) {
          Alert.alert('Giới hạn', 'Bạn chỉ có thể chọn tối đa 3 concept chụp.');
          return prev;
        }
        return [...prev, styleId];
      }
    });
  };

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true);
      const userId = getCurrentUserId();
      
      if (!userId) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin user');
        return;
      }

      // Validate required fields
      const yearsExperience = parseInt(profileData.find(f => f.id === 'yearsExperience')?.value || '0');
      const equipment = profileData.find(f => f.id === 'equipment')?.value || '';
      const hourlyRate = parseInt(profileData.find(f => f.id === 'hourlyRate')?.value || '0');

      if (yearsExperience <= 0) {
        Alert.alert('Lỗi', 'Vui lòng nhập số năm kinh nghiệm hợp lệ');
        setIsSaving(false);
        return;
      }

      if (!equipment.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập thông tin thiết bị');
        setIsSaving(false);
        return;
      }

      if (hourlyRate <= 0) {
        Alert.alert('Lỗi', 'Vui lòng nhập giá dịch vụ hợp lệ');
        setIsSaving(false);
        return;
      }

      if (selectedStyleIds.length === 0) {
        Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 1 concept chụp');
        setIsSaving(false);
        return;
      }

      if (isEditMode && currentPhotographerId) {
        // Update existing profile
        const updatePayload: Partial<UpdatePhotographerRequest> = {
          photographerId: currentPhotographerId,
          userId: userId,
          yearsExperience: yearsExperience,
          equipment: equipment,
          hourlyRate: hourlyRate,
          availabilityStatus: profileData.find(f => f.id === 'availabilityStatus')?.value || 'Available',
          styleIds: selectedStyleIds,
        };

        console.log('Updating photographer profile:', updatePayload);
        await photographerService.updatePhotographerProfile(currentPhotographerId, updatePayload);
        
        // Update styles separately
        await photographerService.updatePhotographerStyles(currentPhotographerId, selectedStyleIds);
        
        Alert.alert('Thành công', 'Hồ sơ nhiếp ảnh gia đã được cập nhật', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        // Create new profile
        const createPayload: CreatePhotographerRequest = {
          userId: userId,
          yearsExperience: yearsExperience,
          equipment: equipment,
          hourlyRate: hourlyRate,
          availabilityStatus: profileData.find(f => f.id === 'availabilityStatus')?.value || 'Available',
          rating: 5, // Default values
          ratingSum: 0,
          ratingCount: 0,
          featuredStatus: false,
          verificationStatus: 'Pending',
          styleIds: selectedStyleIds,
        };

        console.log('Creating photographer profile:', createPayload);
        const result = await photographerService.createPhotographerProfile(createPayload);
        console.log('Create result:', result);
        
        Alert.alert('Thành công', 'Hồ sơ nhiếp ảnh gia đã được tạo thành công', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }

      setIsSaving(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Lỗi', 'Không thể lưu hồ sơ. Vui lòng thử lại.');
      setIsSaving(false);
    }
  };

  const getSelectedStyleNames = () => {
    return selectedStyleIds
      .map(id => styles.find(style => style.styleId === id)?.name)
      .filter(Boolean);
  };

  const renderProfileField = (field: ProfileField) => (
    <TouchableOpacity
      key={field.id}
      onPress={() => handleFieldPress(field)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
      }}
    >
      <Ionicons 
        name={field.icon} 
        size={24} 
        color="#666666" 
        style={{ marginRight: 16 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          color: '#000000',
          marginBottom: 4,
        }}>
          {field.title}
        </Text>
        {field.value ? (
          <Text style={{
            fontSize: 14,
            color: '#666666',
          }}>
            {field.fieldType === 'number' && field.id === 'hourlyRate' 
              ? `${parseInt(field.value).toLocaleString('vi-VN')} VNĐ`
              : field.value
            }
          </Text>
        ) : (
          <Text style={{
            fontSize: 14,
            color: '#999999',
            fontStyle: 'italic',
          }}>
            {field.placeholder}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#C0C0C0" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000000" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666666' }}>
          Đang tải hồ sơ...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
      }}>
        <TouchableOpacity onPress={handleClose}>
          <Ionicons name="close" size={24} color="#000000" />
        </TouchableOpacity>
        
        <Text style={{
          fontSize: 18,
          fontWeight: '600',
          color: '#000000',
        }}>
          {isEditMode ? 'Chỉnh sửa Hồ sơ' : 'Tạo Hồ sơ Nhiếp ảnh gia'}
        </Text>
        
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Photographer Fields */}
        <View style={{ marginTop: 20 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#000000',
            paddingHorizontal: 20,
            marginBottom: 16,
          }}>
            Thông tin chuyên nghiệp
          </Text>

          <View style={{
            backgroundColor: '#FFFFFF',
            marginHorizontal: 16,
            borderRadius: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            overflow: 'hidden',
          }}>
            {profileData.map((field) => renderProfileField(field))}
          </View>
        </View>

        {/* Photography Styles Section */}
        <View style={{ marginTop: 30, marginBottom: 20 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#000000',
            paddingHorizontal: 20,
            marginBottom: 8,
          }}>
            Sở thích của tôi
          </Text>
          
          <Text style={{
            fontSize: 14,
            color: '#666666',
            paddingHorizontal: 20,
            marginBottom: 20,
            lineHeight: 20,
          }}>
            Thêm sở thích vào hồ sơ để tìm ra điểm chung với host và khách khác.
          </Text>

          <View style={{
            backgroundColor: '#FFFFFF',
            marginHorizontal: 16,
            borderRadius: 12,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}>
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
            }}>
              {getSelectedStyleNames().slice(0, 3).map((styleName, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: '#F0F0F0',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ fontSize: 14, color: '#000000' }}>
                    {styleName}
                  </Text>
                </View>
              ))}
              
              {Array.from({ length: Math.max(0, 3 - getSelectedStyleNames().length) }).map((_, index) => (
                <TouchableOpacity
                  key={`empty-${index}`}
                  onPress={handleStylePress}
                  style={{
                    borderWidth: 2,
                    borderColor: '#E0E0E0',
                    borderStyle: 'dashed',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    minWidth: 60,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 20, color: '#C0C0C0' }}>+</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              onPress={handleStylePress}
              style={{
                marginTop: 16,
                alignItems: 'center',
              }}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: '500',
                color: '#000000',
              }}>
                Thêm concept ({selectedStyleIds.length}/3)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Save Button */}
        <View style={{ padding: 20, paddingTop: 40 }}>
          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={isSaving}
            style={{
              backgroundColor: isSaving ? '#CCCCCC' : '#000000',
              paddingVertical: 16,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
              }}>
                {isEditMode ? 'Cập nhật' : 'Tạo hồ sơ'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Field Edit Modal */}
      <FieldEditModal
        visible={isFieldModalVisible}
        field={selectedField}
        onClose={() => {
          setIsFieldModalVisible(false);
          setSelectedField(null);
        }}
        onSave={handleSaveField}
      />

      {/* Style Selection Modal */}
      <Modal
        visible={isStyleModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#F0F0F0',
          }}>
            <TouchableOpacity onPress={() => setIsStyleModalVisible(false)}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
            
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#000000',
            }}>
              Chỉnh sửa Hồ sơ
            </Text>
            
            <View style={{ width: 24 }} />
          </View>

          <View style={{ flex: 1, padding: 20 }}>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: '#000000',
              marginBottom: 16,
            }}>
              Bạn thích gì?
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: '#666666',
              marginBottom: 24,
              lineHeight: 22,
            }}>
              Chọn một số sở thích mà bạn muốn hiển thị trên hồ sơ.
            </Text>

            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#000000',
              marginBottom: 16,
            }}>
              Concept chụp
            </Text>

            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 24,
            }}>
              {styles.map((style) => (
                <TouchableOpacity
                  key={style.styleId}
                  onPress={() => toggleStyle(style.styleId)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: selectedStyleIds.includes(style.styleId) ? '#000000' : '#F5F5F5',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    borderRadius: 25,
                    borderWidth: selectedStyleIds.includes(style.styleId) ? 0 : 1,
                    borderColor: '#E5E5E5',
                  }}
                >
                  <Ionicons 
                    name="camera" 
                    size={16} 
                    color={selectedStyleIds.includes(style.styleId) ? '#FFFFFF' : '#666666'} 
                    style={{ marginRight: 8 }}
                  />
                  <Text style={{
                    fontSize: 14,
                    color: selectedStyleIds.includes(style.styleId) ? '#FFFFFF' : '#000000',
                    fontWeight: '500',
                  }}>
                    {style.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={{
              fontSize: 14,
              color: '#666666',
              textAlign: 'center',
            }}>
              Đã chọn {selectedStyleIds.length}/3
            </Text>
          </View>

          <View style={{ padding: 20, paddingTop: 0 }}>
            <TouchableOpacity
              onPress={() => setIsStyleModalVisible(false)}
              style={{
                backgroundColor: '#000000',
                paddingVertical: 16,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
              }}>
                Lưu
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default NewPhotographerEditProfile;