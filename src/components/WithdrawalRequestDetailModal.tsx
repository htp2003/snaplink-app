import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WithdrawalRequest } from '../types/withdrawal';

interface WithdrawalRequestDetailModalProps {
  visible: boolean;
  onClose: () => void;
  request: WithdrawalRequest | null;
}

export default function WithdrawalRequestDetailModal({
  visible,
  onClose,
  request,
}: WithdrawalRequestDetailModalProps) {
  if (!request) return null;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '#10B981';
      case 'rejected':
      case 'cancelled':
        return '#EF4444';
      case 'approved':
        return '#3B82F6';
      case 'processing':
        return '#8B5CF6';
      default:
        return '#F59E0B';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Chờ xử lý';
      case 'approved':
        return 'Đã duyệt';
      case 'rejected':
        return 'Đã từ chối';
      case 'processing':
        return 'Đang xử lý';
      case 'completed':
        return 'Hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  // Check if rejectionReason is an image URL
  const isImageUrl = (url: string) => {
    if (!url || typeof url !== 'string') return false;
    
    // Check for common image file extensions
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i;
    if (imageExtensions.test(url)) return true;
    
    // Check for common image hosting services
    const imageHosts = [
      'ibb.co',
      'imgur.com',
      'drive.google.com',
      'photos.app.goo.gl',
      'images.unsplash.com',
      'cdn.pixabay.com',
      'i.postimg.cc',
      'postimg.cc',
      'tinypic.com',
      'photobucket.com',
      'flickr.com',
    ];
    
    try {
      const urlObj = new URL(url);
      return imageHosts.some(host => urlObj.hostname.includes(host));
    } catch {
      return false;
    }
  };

  // Open URL in browser
  const openUrlInBrowser = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Lỗi', 'Không thể mở liên kết này');
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert('Lỗi', 'Không thể mở liên kết');
    }
  };

  // Handle image/link press
  const handleImageLinkPress = () => {
    if (request.rejectionReason) {
      if (isImageUrl(request.rejectionReason)) {
        Alert.alert(
          'Xem ảnh xác nhận',
          'Bạn có muốn mở ảnh trong trình duyệt?',
          [
            { text: 'Hủy', style: 'cancel' },
            {
              text: 'Mở',
              onPress: () => openUrlInBrowser(request.rejectionReason!),
            },
          ]
        );
      } else {
        // If it's a URL but not an image, still offer to open it
        if (request.rejectionReason.startsWith('http')) {
          Alert.alert(
            'Mở liên kết',
            'Bạn có muốn mở liên kết này trong trình duyệt?',
            [
              { text: 'Hủy', style: 'cancel' },
              {
                text: 'Mở',
                onPress: () => openUrlInBrowser(request.rejectionReason!),
              },
            ]
          );
        }
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#F0F0F0',
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000' }}>
            Chi tiết yêu cầu rút tiền
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#F5F5F5',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={20} color="#666666" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Card */}
          <View
            style={{
              backgroundColor: '#F8F9FA',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              borderLeftWidth: 4,
              borderLeftColor: getStatusColor(request.requestStatus),
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#000000' }}>
                Trạng thái
              </Text>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: 12,
                  backgroundColor: `${getStatusColor(request.requestStatus)}20`,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: getStatusColor(request.requestStatus),
                  }}
                >
                  {getStatusText(request.requestStatus)}
                </Text>
              </View>
            </View>
            <Text style={{ color: '#666666', fontSize: 14 }}>
              ID: #{request.id}
            </Text>
          </View>

          {/* Amount Card */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
          >
            <Text
              style={{
                fontSize: 14,
                color: '#666666',
                marginBottom: 8,
              }}
            >
              Số tiền rút
            </Text>
            <Text
              style={{
                fontSize: 28,
                fontWeight: 'bold',
                color: '#000000',
                marginBottom: 16,
              }}
            >
              {formatCurrency(request.amount)}
            </Text>
          </View>

          {/* Bank Info */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#000000',
                marginBottom: 16,
              }}
            >
              Thông tin ngân hàng
            </Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: '#666666', fontSize: 14, marginBottom: 4 }}>
                Ngân hàng
              </Text>
              <Text style={{ color: '#000000', fontWeight: '500' }}>
                {request.bankName}
              </Text>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: '#666666', fontSize: 14, marginBottom: 4 }}>
                Tên tài khoản
              </Text>
              <Text style={{ color: '#000000', fontWeight: '500' }}>
                {request.bankAccountName}
              </Text>
            </View>

            <View>
              <Text style={{ color: '#666666', fontSize: 14, marginBottom: 4 }}>
                Số tài khoản
              </Text>
              <Text style={{ color: '#000000', fontWeight: '500' }}>
                {request.bankAccountNumber}
              </Text>
            </View>
          </View>

          {/* Timeline */}
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: '#E5E7EB',
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#000000',
                marginBottom: 16,
              }}
            >
              Lịch sử xử lý
            </Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: '#666666', fontSize: 14, marginBottom: 4 }}>
                Thời gian tạo
              </Text>
              <Text style={{ color: '#000000', fontWeight: '500' }}>
                {formatDate(request.requestedAt)}
              </Text>
            </View>

            {request.processedAt && (
              <View>
                <Text style={{ color: '#666666', fontSize: 14, marginBottom: 4 }}>
                  Thời gian xử lý
                </Text>
                <Text style={{ color: '#000000', fontWeight: '500' }}>
                  {formatDate(request.processedAt)}
                </Text>
              </View>
            )}
          </View>

          {/* Rejection Reason / Completion Link */}
          {request.rejectionReason && (
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                padding: 16,
                marginBottom: 20,
                borderWidth: 1,
                borderColor: '#E5E7EB',
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#000000',
                  marginBottom: 16,
                }}
              >
                {request.requestStatus.toLowerCase() === 'completed'
                  ? 'Ảnh xác nhận chuyển khoản'
                  : 'Lý do từ chối'}
              </Text>

              {isImageUrl(request.rejectionReason) || request.rejectionReason.startsWith('http') ? (
                /* Display Link Button for Images/URLs */
                <TouchableOpacity
                  onPress={handleImageLinkPress}
                  style={{
                    backgroundColor: '#3B82F6',
                    borderRadius: 8,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={isImageUrl(request.rejectionReason) ? 'image-outline' : 'link-outline'}
                    size={20}
                    color="#FFFFFF"
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{
                      color: '#FFFFFF',
                      fontWeight: '600',
                      fontSize: 16,
                    }}
                  >
                    {isImageUrl(request.rejectionReason) 
                      ? 'Xem ảnh xác nhận' 
                      : 'Mở liên kết'}
                  </Text>
                </TouchableOpacity>
              ) : (
                /* Display Text Reason */
                <View
                  style={{
                    backgroundColor: '#FEF2F2',
                    borderRadius: 8,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: '#FECACA',
                  }}
                >
                  <Text
                    style={{
                      color: '#DC2626',
                      fontSize: 14,
                      lineHeight: 20,
                    }}
                  >
                    {request.rejectionReason}
                  </Text>
                </View>
              )}

              {(isImageUrl(request.rejectionReason) || request.rejectionReason.startsWith('http')) && (
                <View
                  style={{
                    backgroundColor: '#F3F4F6',
                    borderRadius: 6,
                    padding: 8,
                    marginTop: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <Ionicons name='information-circle-outline' size={14} color='#6B7280' />
                  <Text
                    style={{
                      color: '#6B7280',
                      fontSize: 12,
                      marginLeft: 4,
                      flex: 1,
                    }}
                  >
                    Nhấn nút trên để mở trong trình duyệt
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}