import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAvailability } from '../../hooks/useAvailability';
import {
  DayOfWeek,
  AvailabilityStatus,
  TimeSlot,
  DAY_NAMES,
  STATUS_LABELS,
  STATUS_COLORS,
  CreateAvailabilityRequest,
  UpdateAvailabilityRequest
} from '../../types/availability';

const { width, height } = Dimensions.get('window');

interface TimeSlotModalProps {
  visible: boolean;
  onClose: () => void;
  selectedSlot?: TimeSlot | null;
  selectedDay: DayOfWeek;
  photographerId: number | null;
  onSave?: () => void;
}

const TimeSlotModal: React.FC<TimeSlotModalProps> = ({
  visible,
  onClose,
  selectedSlot,
  selectedDay,
  photographerId,
  onSave
}) => {
  const insets = useSafeAreaInsets();
  const {
    createAvailability,
    updateAvailability,
    creating,
    updating,
    error,
    validateAvailabilityForm
  } = useAvailability();

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [status, setStatus] = useState<AvailabilityStatus>(AvailabilityStatus.AVAILABLE);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  const isEditing = !!selectedSlot;

  useEffect(() => {
    if (visible) {
      if (selectedSlot) {
        // Editing mode
        setStartTime(selectedSlot.startTime.substring(0, 5));
        setEndTime(selectedSlot.endTime.substring(0, 5));
        setStatus(selectedSlot.status);
      } else {
        // Creating mode
        resetForm();
      }
      setValidationErrors({});
    }
  }, [visible, selectedSlot]);

  const resetForm = () => {
    setStartTime('09:00');
    setEndTime('10:00');
    setStatus(AvailabilityStatus.AVAILABLE);
    setValidationErrors({});
  };

  const handleSave = async () => {
    if (!photographerId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin nhiếp ảnh gia');
      return;
    }

    // Validate form
    const formData = {
      photographerId,
      dayOfWeek: selectedDay,
      startTime: `${startTime}:00`,
      endTime: `${endTime}:00`,
      status
    };

    const errors = validateAvailabilityForm(formData);
    
    // if (Object.keys(errors).length > 0) {
    //   setValidationErrors(errors);
    //   return;
    // }

    try {
      if (isEditing && selectedSlot?.availabilityId) {
        // Update existing slot
        const updateData: UpdateAvailabilityRequest = {
          dayOfWeek: selectedDay,
          startTime: `${startTime}:00`,
          endTime: `${endTime}:00`,
          status
        };
        
        const result = await updateAvailability(selectedSlot.availabilityId, updateData);
        if (result) {
          Alert.alert('Thành công', 'Cập nhật khung giờ thành công');
          onSave?.();
          onClose();
        }
      } else {
        // Create new slot
        const createData: CreateAvailabilityRequest = {
          photographerId,
          dayOfWeek: selectedDay,
          startTime: `${startTime}:00`,
          endTime: `${endTime}:00`,
          status
        };
        
        const result = await createAvailability(createData);
        if (result) {
          Alert.alert('Thành công', 'Tạo khung giờ thành công');
          onSave?.();
          onClose();
        }
      }
    } catch (err) {
      console.error('Error saving time slot:', err);
      Alert.alert('Lỗi', 'Không thể lưu khung giờ. Vui lòng thử lại.');
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const generateHours = () => {
    const hours = [];
    for (let i = 6; i <= 23; i++) {
      hours.push(i.toString().padStart(2, '0'));
    }
    return hours;
  };

  const generateMinutes = () => {
    return ['00', '15', '30', '45'];
  };

  const hours = generateHours();
  const minutes = generateMinutes();

  const parseTime = (timeString: string) => {
    const [hour, minute] = timeString.split(':');
    return { hour, minute };
  };

  const formatTime = (hour: string, minute: string) => {
    return `${hour}:${minute}`;
  };

  const renderWheelPicker = (
    label: string,
    value: string,
    onSelect: (time: string) => void,
    errorKey: string
  ) => {
    const { hour: selectedHour, minute: selectedMinute } = parseTime(value);
    
    return (
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#000000', marginBottom: 8 }}>
          {label}
        </Text>
        
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#1C1C1E',
          borderRadius: 12,
          paddingVertical: 20,
          marginBottom: 8
        }}>
          {/* Hour Picker */}
          <ScrollView
            style={{ 
              height: 180, 
              width: 80,
            }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ 
              paddingVertical: 60,
              alignItems: 'center'
            }}
            snapToInterval={40}
            decelerationRate="fast"
          >
            {hours.map((hour) => (
              <TouchableOpacity
                key={hour}
                style={{
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 10
                }}
                onPress={() => onSelect(formatTime(hour, selectedMinute))}
              >
                <Text
                  style={{
                    fontSize: selectedHour === hour ? 24 : 18,
                    fontWeight: selectedHour === hour ? '600' : '400',
                    color: selectedHour === hour ? '#FFFFFF' : '#8E8E93'
                  }}
                >
                  {hour}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Separator */}
          <Text style={{ 
            fontSize: 24, 
            fontWeight: '600', 
            color: '#FFFFFF',
            marginHorizontal: 10
          }}>
            :
          </Text>

          {/* Minute Picker */}
          <ScrollView
            style={{ 
              height: 180, 
              width: 80,
            }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ 
              paddingVertical: 60,
              alignItems: 'center'
            }}
            snapToInterval={40}
            decelerationRate="fast"
          >
            {minutes.map((minute) => (
              <TouchableOpacity
                key={minute}
                style={{
                  height: 40,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 10
                }}
                onPress={() => onSelect(formatTime(selectedHour, minute))}
              >
                <Text
                  style={{
                    fontSize: selectedMinute === minute ? 24 : 18,
                    fontWeight: selectedMinute === minute ? '600' : '400',
                    color: selectedMinute === minute ? '#FFFFFF' : '#8E8E93'
                  }}
                >
                  {minute}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Hour/Minute Labels */}
          <View style={{ 
            position: 'absolute', 
            right: 20, 
            top: '50%', 
            transform: [{ translateY: -15 }]
          }}>
            <Text style={{ fontSize: 14, color: '#8E8E93', marginBottom: 5 }}>H</Text>
            <Text style={{ fontSize: 14, color: '#8E8E93' }}>M</Text>
          </View>
        </View>
        
        {/* Selected Time Display */}
        <View style={{ 
          backgroundColor: '#F2F2F7', 
          padding: 12, 
          borderRadius: 8, 
          alignItems: 'center',
          marginBottom: 8
        }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#000000' }}>
            {value}
          </Text>
        </View>
        
        {validationErrors[errorKey] && (
          <Text style={{ fontSize: 12, color: '#FF3B30', marginTop: 4 }}>
            {validationErrors[errorKey]}
          </Text>
        )}
      </View>
    );
  };

  const renderStatusPicker = () => (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 16, fontWeight: '600', color: '#000000', marginBottom: 8 }}>
        Trạng thái
      </Text>
      
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {Object.values(AvailabilityStatus).map((statusOption) => (
          <TouchableOpacity
            key={statusOption}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              marginRight: 8,
              marginBottom: 8,
              borderRadius: 20,
              backgroundColor: status === statusOption ? STATUS_COLORS[statusOption] : '#F2F2F7',
              borderWidth: 1,
              borderColor: status === statusOption ? STATUS_COLORS[statusOption] : '#E5E5EA'
            }}
            onPress={() => setStatus(statusOption)}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '500',
                color: status === statusOption ? '#FFFFFF' : '#000000'
              }}
            >
              {STATUS_LABELS[statusOption]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {validationErrors.status && (
        <Text style={{ fontSize: 12, color: '#FF3B30', marginTop: 4 }}>
          {validationErrors.status}
        </Text>
      )}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
        {/* Header */}
        <View
          style={{
            paddingTop: insets.top + 16,
            paddingHorizontal: 20,
            paddingBottom: 16,
            backgroundColor: '#FFFFFF',
            borderBottomWidth: 1,
            borderBottomColor: '#E5E5EA'
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity onPress={handleClose}>
              <Text style={{ fontSize: 16, color: '#007AFF' }}>Hủy</Text>
            </TouchableOpacity>
            
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000' }}>
              {isEditing ? 'Chỉnh sửa khung giờ' : 'Thêm khung giờ'}
            </Text>
            
            <TouchableOpacity
              onPress={handleSave}
              disabled={creating || updating}
            >
              {creating || updating ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text style={{ fontSize: 16, color: '#007AFF', fontWeight: '600' }}>
                  Lưu
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
          {/* Day Info */}
          <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#000000', marginBottom: 4 }}>
              Ngày trong tuần
            </Text>
            <Text style={{ fontSize: 14, color: '#8E8E93' }}>
              {DAY_NAMES[selectedDay]}
            </Text>
          </View>

          {/* Time Selection */}
          <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 20 }}>
            {renderWheelPicker('Giờ bắt đầu', startTime, setStartTime, 'startTime')}
            {renderWheelPicker('Giờ kết thúc', endTime, setEndTime, 'endTime')}
            
            {/* Duration Display */}
            <View style={{ padding: 12, backgroundColor: '#F2F2F7', borderRadius: 8 }}>
              <Text style={{ fontSize: 14, color: '#8E8E93', textAlign: 'center' }}>
                Thời lượng: {(() => {
                  const start = new Date(`2000-01-01 ${startTime}:00`);
                  const end = new Date(`2000-01-01 ${endTime}:00`);
                  const diff = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
                  const hours = Math.floor(diff / 60);
                  const minutes = diff % 60;
                  return hours > 0 
                    ? `${hours} giờ ${minutes > 0 ? `${minutes} phút` : ''}` 
                    : `${minutes} phút`;
                })()}
              </Text>
            </View>
          </View>

          {/* Status Selection */}
          <View style={{ backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 20 }}>
            {renderStatusPicker()}
          </View>

          {/* Validation Errors */}
          {Object.keys(validationErrors).length > 0 && (
            <View style={{ backgroundColor: '#FFEBEE', padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#D32F2F', marginBottom: 8 }}>
                Vui lòng kiểm tra lại:
              </Text>
              {Object.entries(validationErrors).map(([key, message]) => (
                <Text key={key} style={{ fontSize: 12, color: '#D32F2F', marginBottom: 4 }}>
                  • {message}
                </Text>
              ))}
            </View>
          )}

          {/* API Error */}
          {error && (
            <View style={{ backgroundColor: '#FFEBEE', padding: 16, borderRadius: 8, marginBottom: 20 }}>
              <Text style={{ fontSize: 14, color: '#D32F2F' }}>
                {error}
              </Text>
            </View>
          )}

          {/* Tips */}
          <View style={{ backgroundColor: '#E3F2FD', padding: 16, borderRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <Ionicons name="information-circle" size={20} color="#1976D2" style={{ marginRight: 8, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1976D2', marginBottom: 8 }}>
                  Gợi ý:
                </Text>
                <Text style={{ fontSize: 12, color: '#1976D2', lineHeight: 18 }}>
                  • Thiết lập các khung giờ không trùng lặp{'\n'}
                  • Khung giờ tối thiểu là 30 phút{'\n'}
                  • Bạn có thể thay đổi trạng thái sau khi tạo{'\n'}
                  • Khách hàng chỉ thấy các khung giờ "Có thể đặt lịch"
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

export default TimeSlotModal;