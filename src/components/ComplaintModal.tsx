// components/ComplaintModal.tsx

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../utils/responsive';
import complaintService, { CreateComplaintRequest } from '../services/complaintService';

interface ComplaintModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: number;
  reportedUserId: number; // Photographer's user ID
  reportedUserName?: string; // Photographer's name
  onComplaintSubmitted?: () => void;
  isBeforeBookingTime?: boolean;
  bookingStartTime?: string;
}

const ComplaintModal: React.FC<ComplaintModalProps> = ({
  visible,
  onClose,
  bookingId,
  reportedUserId,
  reportedUserName,
  onComplaintSubmitted,
  isBeforeBookingTime = false,
  bookingStartTime,
}) => {
  const [complaintTypes, setComplaintTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [customType, setCustomType] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);

  // 🆕 ADD: formatDate function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Use hardcoded complaint types immediately - no API call
  useEffect(() => {
    if (visible) {
      const getComplaintTypes = () => {
        if (isBeforeBookingTime) {
          // Trước thời gian booking - yêu cầu hủy/thay đổi
          return [
            "Không thể tham gia được nữa",
            "Thay đổi kế hoạch đột xuất",
            "Photographer không phản hồi",
            "Muốn thay đổi thời gian booking",
            "Không hài lòng với thỏa thuận ban đầu",
            "Vấn đề về giá cả",
            "Photographer yêu cầu thêm phí",
            "Vấn đề sức khỏe đột xuất",
            "Điều kiện thời tiết không phù hợp",
            "Khác"
          ];
        } else {
          // Sau/trong thời gian booking - khiếu nại chất lượng
          return [
            "Photographer không chuyên nghiệp",
            "Chất lượng ảnh không đạt yêu cầu", 
            "Không giao ảnh đúng hạn",
            "Ảnh không đúng như thỏa thuận",
            "Link ảnh bị lỗi hoặc không truy cập được",
            "Thái độ phục vụ không tốt",
            "Photographer đến muộn hoặc không đến",
            "Không tuân thủ yêu cầu đặc biệt",
            "Thiết bị chụp ảnh có vấn đề",
            "Vi phạm quy định an toàn",
            "Khác"
          ];
        }
      };
      
      setComplaintTypes(getComplaintTypes());
      setLoadingTypes(false);
    }
  }, [visible, isBeforeBookingTime]);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedType('');
      setCustomType('');
      setDescription('');
    }
  }, [visible]);

  const handleSubmit = async () => {
    // Validate form
    const finalType = selectedType === 'Khác' ? customType.trim() : selectedType;
    const finalDescription = description.trim();

    console.log('🔍 Form data before validation:', {
      selectedType,
      customType,
      description,
      finalType,
      finalDescription,
      finalDescriptionLength: finalDescription.length
    });

    if (!finalType) {
      Alert.alert('Lỗi', 'Vui lòng chọn loại khiếu nại');
      return;
    }

    if (selectedType === 'Khác' && !customType.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập loại khiếu nại cụ thể');
      return;
    }

    if (!finalDescription) {
      Alert.alert('Lỗi', 'Vui lòng mô tả chi tiết vấn đề');
      return;
    }

    if (finalDescription.length < 10) {
      Alert.alert('Lỗi', 'Mô tả phải có ít nhất 10 ký tự');
      return;
    }

    try {
      setLoading(true);

      // 🆕 ENHANCED: Build request with proper validation and logging
      const request: CreateComplaintRequest = {
        reportedUserId: Number(reportedUserId), // Ensure it's a number
        bookingId: Number(bookingId), // Ensure it's a number  
        complaintType: finalType,
        description: finalDescription, // ✅ This should be the actual description text
      };

      // 🆕 ENHANCED: Debug logging before sending request
      console.log('🔍 ComplaintModal - Final request object:', request);
      console.log('🔍 Request field types:', {
        reportedUserId: typeof request.reportedUserId,
        bookingId: typeof request.bookingId,
        complaintType: typeof request.complaintType,
        description: typeof request.description,
      });
      console.log('🔍 Request field values:', {
        reportedUserId: request.reportedUserId,
        bookingId: request.bookingId,
        complaintTypeLength: request.complaintType.length,
        descriptionLength: request.description.length,
        descriptionPreview: request.description.substring(0, 50) + '...'
      });

      // 🆕 VALIDATION: Double-check all fields
      if (!request.reportedUserId || request.reportedUserId === 0 || isNaN(request.reportedUserId)) {
        throw new Error(`Invalid reportedUserId: ${request.reportedUserId}`);
      }
      if (!request.bookingId || request.bookingId === 0 || isNaN(request.bookingId)) {
        throw new Error(`Invalid bookingId: ${request.bookingId}`);
      }
      if (!request.complaintType || request.complaintType.trim().length === 0) {
        throw new Error(`Invalid complaintType: "${request.complaintType}"`);
      }
      if (!request.description || request.description.trim().length < 10) {
        throw new Error(`Invalid description: length=${request.description?.length || 0}`);
      }

      console.log('✅ All validations passed, sending request...');
      
      const response = await complaintService.createComplaint(request);
      
      console.log('✅ Complaint created successfully:', response);

      Alert.alert(
        'Thành công',
        `${isBeforeBookingTime ? 'Yêu cầu hỗ trợ' : 'Khiếu nại'} của bạn đã được gửi thành công. Chúng tôi sẽ xem xét và phản hồi trong thời gian sớm nhất.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              onComplaintSubmitted?.();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Error submitting complaint:', error);
      
      let errorMessage = `Có lỗi xảy ra khi gửi ${isBeforeBookingTime ? 'yêu cầu hỗ trợ' : 'khiếu nại'}`;
      
      if (error?.message) {
        if (error.message.includes('401') || error.message.includes('Phiên đăng nhập')) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        } else if (error.message.includes('400')) {
          errorMessage = 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.';
        } else if (error.message.includes('Invalid')) {
          errorMessage = `Lỗi dữ liệu: ${error.message}`;
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Lỗi', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
          <View className="flex-1">
            <Text className="text-lg font-semibold text-gray-900">
              {isBeforeBookingTime ? "Yêu cầu hỗ trợ" : "Gửi khiếu nại"}
            </Text>
            {/* Dynamic subtitle based on timing */}
            {(isBeforeBookingTime && bookingStartTime) ? (
              <Text className="text-sm text-gray-600 mt-1">
                Booking: {formatDate(bookingStartTime)}
              </Text>
            ) : (
              reportedUserName && (
                <Text className="text-sm text-gray-600 mt-1">
                  Về: {reportedUserName}
                </Text>
              )
            )}
            {/* Time indicator for before booking */}
            {isBeforeBookingTime && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="time-outline" size={14} color="#059669" />
                <Text className="text-xs text-green-600 ml-1">
                  Còn thời gian thay đổi
                </Text>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="w-8 h-8 items-center justify-center"
            disabled={loading}
          >
            <Ionicons name="close" size={24} color="#666666" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4" showsVerticalScrollIndicator={false}>
          {/* Pre-booking info message */}
          {isBeforeBookingTime && (
            <View className="bg-green-50 p-4 rounded-lg mb-6">
              <View className="flex-row items-start">
                <Ionicons name="information-circle" size={20} color="#059669" />
                <View className="flex-1 ml-2">
                  <Text className="text-sm font-medium text-green-800 mb-1">
                    Thời gian thay đổi còn lại
                  </Text>
                  <Text className="text-xs text-green-700 leading-4">
                    Bạn có thể yêu cầu thay đổi hoặc hủy booking trước khi diễn ra.
                    Chúng tôi sẽ hỗ trợ tìm giải pháp tốt nhất cho bạn.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Complaint Types */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 mb-3">
              {isBeforeBookingTime ? 'Vấn đề bạn gặp phải' : 'Loại khiếu nại'} <Text className="text-red-500">*</Text>
            </Text>

            {loadingTypes ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color="#FF385C" />
                <Text className="text-gray-500 mt-2">Đang tải...</Text>
              </View>
            ) : (
              <View className="space-y-2">
                {complaintTypes.map((type, index) => (
                  <TouchableOpacity
                    key={index}
                    className={`flex-row items-center p-3 rounded-lg border ${
                      selectedType === type
                        ? (isBeforeBookingTime ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500')
                        : 'bg-gray-50 border-gray-200'
                    }`}
                    onPress={() => setSelectedType(type)}
                    disabled={loading}
                  >
                    <View
                      className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                        selectedType === type
                          ? (isBeforeBookingTime ? 'border-green-500 bg-green-500' : 'border-red-500 bg-red-500')
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedType === type && (
                        <Ionicons name="checkmark" size={12} color="white" />
                      )}
                    </View>
                    <Text
                      className={`ml-3 flex-1 ${
                        selectedType === type 
                          ? (isBeforeBookingTime ? 'text-green-700 font-medium' : 'text-red-700 font-medium')
                          : 'text-gray-700'
                      }`}
                      style={{ fontSize: getResponsiveSize(14) }}
                    >
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Custom Type Input */}
            {selectedType === 'Khác' && (
              <View className="mt-3">
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  {isBeforeBookingTime ? 'Nhập vấn đề cụ thể:' : 'Nhập loại khiếu nại cụ thể:'}
                </Text>
                <TextInput
                  className="border border-gray-300 rounded-lg p-3 text-gray-900"
                  placeholder={isBeforeBookingTime 
                    ? "Ví dụ: Có việc gia đình đột xuất"
                    : "Ví dụ: Photographer đến muộn 30 phút"
                  }
                  placeholderTextColor="#9CA3AF"
                  value={customType}
                  onChangeText={setCustomType}
                  maxLength={100}
                  editable={!loading}
                  style={{ fontSize: getResponsiveSize(14) }}
                />
              </View>
            )}
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="text-base font-medium text-gray-900 mb-3">
              Mô tả chi tiết <Text className="text-red-500">*</Text>
            </Text>
            <Text className="text-sm text-gray-600 mb-3">
              {isBeforeBookingTime 
                ? 'Vui lòng mô tả rõ ràng tình huống để chúng tôi có thể hỗ trợ bạn tốt nhất'
                : 'Vui lòng mô tả rõ ràng vấn đề để chúng tôi có thể hỗ trợ bạn tốt nhất'
              }
            </Text>
            <TextInput
              className="border border-gray-300 rounded-lg p-3 text-gray-900"
              placeholder={isBeforeBookingTime 
                ? "Mô tả chi tiết tình huống bạn gặp phải..."
                : "Mô tả chi tiết vấn đề bạn gặp phải..."
              }
              placeholderTextColor="#9CA3AF"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={1000}
              editable={!loading}
              style={{ 
                fontSize: getResponsiveSize(14),
                minHeight: getResponsiveSize(120)
              }}
            />
            <Text className="text-xs text-gray-400 mt-1 text-right">
              {description.length}/1000 ký tự (tối thiểu 10)
            </Text>
          </View>

          {/* Info Box - Dynamic content based on timing */}
          <View className={`p-4 rounded-lg mb-6 ${isBeforeBookingTime ? 'bg-green-50' : 'bg-blue-50'}`}>
            <View className="flex-row items-start">
              <Ionicons 
                name="information-circle" 
                size={20} 
                color={isBeforeBookingTime ? "#059669" : "#3B82F6"} 
              />
              <View className="flex-1 ml-2">
                <Text className={`text-sm font-medium mb-1 ${isBeforeBookingTime ? 'text-green-800' : 'text-blue-800'}`}>
                  Lưu ý quan trọng:
                </Text>
                <Text className={`text-xs leading-4 ${isBeforeBookingTime ? 'text-green-700' : 'text-blue-700'}`}>
                  {isBeforeBookingTime ? (
                    <>
                      • Yêu cầu sẽ được xem xét trong 2-4 giờ làm việc{'\n'}
                      • Yêu cầu phải được gửi trước 24h trước thời gian đặt lịch{'\n'}
                    </>
                  ) : (
                    <>
                      • Khiếu nại sẽ được xem xét trong 24-48 giờ làm việc{'\n'}
                      • Vui lòng cung cấp thông tin chính xác để được hỗ trợ nhanh chóng{'\n'}
                      • Chúng tôi có thể liên hệ để xác minh thông tin nếu cần thiết
                    </>
                  )}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Footer Buttons */}
        <View className="p-4 border-t border-gray-200">
          <View className="flex-row space-x-3">
            <TouchableOpacity
              className="flex-1 bg-gray-100 py-3 rounded-lg items-center justify-center"
              onPress={onClose}
              disabled={loading}
            >
              <Text className="text-gray-700 font-medium" style={{ fontSize: getResponsiveSize(16) }}>
                Hủy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className={`flex-1 py-3 rounded-lg items-center justify-center ${
                isBeforeBookingTime ? 'bg-green-500' : 'bg-red-500'
              } ${loading ? 'opacity-60' : ''}`}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white font-medium" style={{ fontSize: getResponsiveSize(16) }}>
                  {isBeforeBookingTime ? 'Gửi yêu cầu' : 'Gửi khiếu nại'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ComplaintModal;