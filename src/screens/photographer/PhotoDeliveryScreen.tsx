import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import React, { useState, useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePhotoDelivery } from '../../hooks/usePhotoDelivery';
import { 
  CreatePhotoDeliveryRequest, 
  UpdatePhotoDeliveryRequest,
  DeliveryMethod,
  PhotoDeliveryData 
} from '../../types/photoDelivery';
import { usePhotographerAuth } from '../../hooks/usePhotographerAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'PhotoDeliveryScreen'>;

interface RouteParams {
  bookingId: number;
  customerName: string;
  orderId: string;
}

export default function PhotoDeliveryScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { bookingId, customerName, orderId } = route.params as RouteParams;
  
  // Replace with actual photographer ID (from auth context)
  const { 
        userId, 
        photographerId, 
        isPhotographer, 
        isLoading: authLoading, 
        error: authError,
        hasPhotographerProfile 
      } = usePhotographerAuth();
  
  const {
    loading,
    error,
    createPhotoDelivery,
    updatePhotoDelivery,
    getPhotoDeliveryByBooking,
  } = usePhotoDelivery(photographerId ?? 0);

  // Form state
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('CustomerDevice');
  const [driveLink, setDriveLink] = useState('');
  const [driveFolderName, setDriveFolderName] = useState('');
  const [photoCount, setPhotoCount] = useState('');
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [existingDelivery, setExistingDelivery] = useState<PhotoDeliveryData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Check if photo delivery already exists for this booking
  useEffect(() => {
    checkExistingDelivery();
  }, [bookingId]);

  const checkExistingDelivery = async () => {
    try {
      const delivery = await getPhotoDeliveryByBooking(bookingId);
      if (delivery) {
        setIsEditing(true);
        setExistingDelivery(delivery);
        setDeliveryMethod(delivery.deliveryMethod as DeliveryMethod);
        setDriveLink(delivery.driveLink || '');
        setDriveFolderName(delivery.driveFolderName || '');
        setPhotoCount(delivery.photoCount?.toString() || '');
        setNotes(delivery.notes || '');
      }
    } catch (err) {
      console.error('Error checking existing delivery:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const validateForm = (): boolean => {
    if (deliveryMethod === 'PhotographerDevice') {
      if (!driveLink.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập link Google Drive');
        return false;
      }
      
      // Basic URL validation
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(driveLink.trim())) {
        Alert.alert('Lỗi', 'Link Google Drive không hợp lệ. Vui lòng nhập link bắt đầu bằng http:// hoặc https://');
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      if (isEditing && existingDelivery) {
        // Update existing photo delivery
        const updateRequest: UpdatePhotoDeliveryRequest = {
          driveLink: deliveryMethod === 'PhotographerDevice' ? driveLink.trim() : undefined,
          driveFolderName: deliveryMethod === 'PhotographerDevice' ? driveFolderName.trim() : undefined,
          photoCount: deliveryMethod === 'PhotographerDevice' ? parseInt(photoCount) : undefined,
          notes: notes.trim() || undefined,
        };

        const success = await updatePhotoDelivery(existingDelivery.photoDeliveryId, updateRequest);
        if (success) {
          navigation.goBack();
        }
      } else {
        // Create new photo delivery
        const createRequest: CreatePhotoDeliveryRequest = {
          bookingId,
          deliveryMethod,
          driveLink: deliveryMethod === 'PhotographerDevice' ? driveLink.trim() : undefined,
          driveFolderName: deliveryMethod === 'PhotographerDevice' ? driveFolderName.trim() : undefined,
          photoCount: deliveryMethod === 'PhotographerDevice' ? parseInt(photoCount) : undefined,
          notes: notes.trim() || undefined,
        };

        const success = await createPhotoDelivery(createRequest);
        if (success) {
          navigation.goBack();
        }
      }
    } catch (err) {
      console.error('Error saving photo delivery:', err);
    }
  };

  const handleDeleteDelivery = () => {
    if (!existingDelivery) return;

    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa giao hàng ảnh này không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            // You can implement delete functionality here
            // const success = await deletePhotoDelivery(existingDelivery.photoDeliveryId);
            // if (success) navigation.goBack();
          }
        }
      ]
    );
  };

  const renderDeliveryMethodOption = (
    method: DeliveryMethod,
    title: string,
    description: string,
    icon: string
  ) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: deliveryMethod === method ? '#FEF3E2' : '#FFFFFF',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: deliveryMethod === method ? '#F59E0B' : '#E5E7EB',
        marginBottom: 12,
      }}
      onPress={() => {
        setDeliveryMethod(method);
        // Clear form when switching methods
        if (method === 'CustomerDevice') {
          setDriveLink('');
          setDriveFolderName('');
          setPhotoCount('');
        }
      }}
      activeOpacity={0.7}
    >
      <View style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: deliveryMethod === method ? '#F59E0B' : '#D1D5DB',
        backgroundColor: deliveryMethod === method ? '#F59E0B' : 'transparent',
        marginRight: 12,
        marginTop: 2,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {deliveryMethod === method && (
          <View style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#FFFFFF',
          }} />
        )}
      </View>
      
      <Ionicons 
        name={icon as any} 
        size={24} 
        color={deliveryMethod === method ? '#F59E0B' : '#6B7280'} 
        style={{ marginRight: 12, marginTop: 2 }}
      />
      
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#000000',
          marginBottom: 4,
        }}>
          {title}
        </Text>
        <Text style={{
          fontSize: 14,
          color: '#666666',
          lineHeight: 20,
        }}>
          {description}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderStatusBadge = () => {
    if (!existingDelivery) return null;

    const getStatusColor = (status: string) => {
      switch (status.toLowerCase()) {
        case 'pending': return { bg: '#FEF3C7', text: '#D97706' };
        case 'delivered': return { bg: '#D1FAE5', text: '#059669' };
        case 'notrequired': return { bg: '#F3F4F6', text: '#6B7280' };
        default: return { bg: '#F3F4F6', text: '#6B7280' };
      }
    };

    const getStatusText = (status: string) => {
      switch (status.toLowerCase()) {
        case 'pending': return 'Chờ xử lý';
        case 'delivered': return 'Đã giao';
        case 'notrequired': return 'Không yêu cầu';
        default: return status;
      }
    };

    const colors = getStatusColor(existingDelivery.status);

    return (
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.bg,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 16,
      }}>
        <View style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: colors.text,
          marginRight: 8,
        }} />
        <Text style={{
          color: colors.text,
          fontSize: 14,
          fontWeight: '600'
        }}>
          {getStatusText(existingDelivery.status)}
        </Text>
      </View>
    );
  };

  if (initialLoading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: '#F7F7F7' 
      }}>
        <ActivityIndicator size="large" color="#FF385C" />
        <Text style={{ marginTop: 16, color: '#666666' }}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#F7F7F7' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={{ 
        backgroundColor: '#FFFFFF', 
        paddingHorizontal: 20, 
        paddingTop: insets.top + 10, 
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
      }}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity 
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#F3F4F6',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                color: '#000000', 
                fontSize: 20, 
                fontWeight: 'bold' 
              }}>
                {isEditing ? 'Cập nhật giao hàng ảnh' : 'Tạo giao hàng ảnh'}
              </Text>
              <Text style={{ 
                color: '#666666', 
                fontSize: 14,
                marginTop: 2 
              }}>
                Đơn hàng #{orderId} - {customerName}
              </Text>
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {isEditing && (
              <TouchableOpacity
                style={{
                  backgroundColor: '#FEE2E2',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                }}
                onPress={handleDeleteDelivery}
              >
                <Ionicons name="trash" size={16} color="#DC2626" />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={{
                backgroundColor: '#FF385C',
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 8,
                opacity: loading ? 0.7 : 1,
              }}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontWeight: '600' 
                }}>
                  {isEditing ? 'Cập nhật' : 'Tạo'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          paddingHorizontal: 20,
          paddingVertical: 20,
          paddingBottom: 40 + insets.bottom 
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        {renderStatusBadge()}

        {/* Error Display */}
        {error && (
          <View style={{
            backgroundColor: '#FEE2E2',
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: '#FECACA'
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="alert-circle" size={20} color="#DC2626" />
              <Text style={{ color: '#DC2626', marginLeft: 8, flex: 1 }}>
                {error}
              </Text>
            </View>
          </View>
        )}

        {/* Delivery Method Selection */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#000000',
            marginBottom: 16,
          }}>
            Phương thức giao ảnh
          </Text>
          
          {renderDeliveryMethodOption(
            'CustomerDevice',
            'Chụp ảnh bằng điện thoại của khách',
            'Giao ảnh trực tiếp tại hiện trường, khách hàng tự lưu trữ',
            'person-outline'
          )}
          
          {renderDeliveryMethodOption(
            'PhotographerDevice',
            'Chụp ảnh bằng điện thoại của thợ chụp ảnh di động',
            'Upload ảnh lên và chia sẻ link với khách hàng',
            'cloud-upload-outline'
          )}
        </View>

        {/* Drive Details (only show when PhotographerDevice is selected) */}
        {deliveryMethod === 'PhotographerDevice' && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: '#000000',
              marginBottom: 16,
            }}>
              Thông tin Hình Ảnh
            </Text>

            {/* Drive Link */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#374151',
                marginBottom: 8,
              }}>
                Link Hình Ảnh
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: driveLink ? '#10B981' : '#D1D5DB',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: '#000000',
                  minHeight: 50,
                  textAlignVertical: 'top',
                }}
                placeholder="https://drive.google.com/drive/folders/..."
                placeholderTextColor="#9CA3AF"
                value={driveLink}
                onChangeText={setDriveLink}
                multiline
                numberOfLines={2}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Folder Name */}
            {/* <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#374151',
                marginBottom: 8,
              }}>
                Tên thư mục *
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: driveFolderName ? '#10B981' : '#D1D5DB',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: '#000000',
                }}
                placeholder="VD: Wedding_Photos_John_Doe"
                placeholderTextColor="#9CA3AF"
                value={driveFolderName}
                onChangeText={setDriveFolderName}
                autoCorrect={false}
              />
            </View> */}

            {/* Photo Count */}
            {/* <View style={{ marginBottom: 16 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#374151',
                marginBottom: 8,
              }}>
                Số lượng ảnh *
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1,
                  borderColor: photoCount && !isNaN(parseInt(photoCount)) ? '#10B981' : '#D1D5DB',
                  borderRadius: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: '#000000',
                }}
                placeholder="50"
                placeholderTextColor="#9CA3AF"
                value={photoCount}
                onChangeText={setPhotoCount}
                keyboardType="numeric"
                maxLength={4}
              />
              <Text style={{
                fontSize: 12,
                color: '#6B7280',
                marginTop: 4,
              }}>
                Tối đa 1000 ảnh
              </Text>
            </View> */}
          </View>
        )}

        {/* Notes */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: '#000000',
            marginBottom: 16,
          }}>
            Ghi chú
          </Text>
          <TextInput
            style={{
              backgroundColor: '#FFFFFF',
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              color: '#000000',
              minHeight: 100,
              textAlignVertical: 'top',
            }}
            placeholder="Thêm ghi chú về việc giao hàng ảnh (tùy chọn)..."
            placeholderTextColor="#9CA3AF"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Instructions */}
        <View style={{
          backgroundColor: '#E0F2FE',
          borderRadius: 12,
          padding: 16,
          marginBottom: 24,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Ionicons name="information-circle" size={24} color="#0891B2" style={{ marginRight: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#0891B2',
                marginBottom: 8,
              }}>
                Hướng dẫn
              </Text>
              {deliveryMethod === 'CustomerDevice' ? (
                <Text style={{
                  fontSize: 14,
                  color: '#0E7490',
                  lineHeight: 20,
                }}>
                  • Giao ảnh trực tiếp cho khách hàng tại hiện trường{'\n'}
                  • Không cần thông tin bổ sung{'\n'}
                  • Khách hàng sẽ tự hoàn thành đơn hàng sau khi nhận ảnh
                </Text>
              ) : (
                <Text style={{
                  fontSize: 14,
                  color: '#0E7490',
                  lineHeight: 20,
                }}>
                  • Upload tất cả ảnh lên Google Drive{'\n'}
                  • Đảm bảo quyền truy cập được thiết lập cho khách hàng{'\n'}
                  • Link Drive sẽ được gửi cho khách hàng{'\n'}
                  • Khách hàng sẽ hoàn thành đơn sau khi kiểm tra ảnh
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Existing delivery info */}
        {existingDelivery && (
          <View style={{
            backgroundColor: '#F9FAFB',
            borderRadius: 12,
            padding: 16,
            marginBottom: 24,
            borderWidth: 1,
            borderColor: '#E5E7EB',
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#374151',
              marginBottom: 12,
            }}>
              Thông tin hiện tại
            </Text>
            <View style={{ gap: 8 }}>
              <Text style={{ color: '#6B7280', fontSize: 14 }}>
                Tạo lúc: {existingDelivery.createdAt ? new Date(existingDelivery.createdAt).toLocaleString('vi-VN') : 'N/A'}
              </Text>
              {existingDelivery.updatedAt && (
                <Text style={{ color: '#6B7280', fontSize: 14 }}>
                  Cập nhật: {new Date(existingDelivery.updatedAt).toLocaleString('vi-VN')}
                </Text>
              )}
              {existingDelivery.deliveredAt && (
                <Text style={{ color: '#059669', fontSize: 14, fontWeight: '600' }}>
                  Đã giao: {new Date(existingDelivery.deliveredAt).toLocaleString('vi-VN')}
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}