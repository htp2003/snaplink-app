import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackNavigationProp } from '../../navigation/types';
import { useAvailability } from '../../hooks/useAvailability';
import { useAuth } from '../../hooks/useAuth';
import { photographerService } from '../../services/photographerService';
import  TimeSlotModal  from '../../components/Photographer/TimeSlotModal';
import {
  DayOfWeek,
  AvailabilityStatus,
  DAY_NAMES,
  DAY_NAMES_SHORT,
  STATUS_COLORS,
  STATUS_LABELS,
  TimeSlot
} from '../../types/availability';

const { width } = Dimensions.get('window');
const HEADER_HEIGHT = 60;

const ManageAvailabilityScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { getCurrentUserId } = useAuth();
  
  const [photographerId, setPhotographerId] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(DayOfWeek.MONDAY);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const {
    weeklySchedule,
    availabilityStats,
    loading,
    creating,
    updating,
    deleting,
    error,
    fetchPhotographerAvailability,
    createAvailability,
    updateAvailability,
    deleteAvailability,
    updateAvailabilityStatus,
    getSlotsByDay,
    refreshWeeklySchedule
  } = useAvailability({ 
    photographerId: photographerId || undefined, 
    autoFetch: false 
  });

  // Load photographer data on mount
  useEffect(() => {
    loadPhotographerData();
  }, []);

  const loadPhotographerData = async () => {
    try {
      const userId = getCurrentUserId();
      if (!userId) {
        Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
        navigation.goBack();
        return;
      }

      const photographerProfile = await photographerService.findPhotographerByUserId(userId);
      if (!photographerProfile) {
        Alert.alert(
          'Thông báo', 
          'Bạn chưa là nhiếp ảnh gia. Vui lòng hoàn thiện hồ sơ trước.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      setPhotographerId(photographerProfile.photographerId);
      // Auto fetch availability after getting photographer ID
      await fetchPhotographerAvailability(photographerProfile.photographerId);
    } catch (error) {
      console.error('Error loading photographer data:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin nhiếp ảnh gia');
    }
  };

  const onRefresh = useCallback(async () => {
    if (!photographerId) return;
    
    setRefreshing(true);
    try {
      await fetchPhotographerAvailability(photographerId);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [photographerId, fetchPhotographerAvailability]);

  const handleCreateSlot = () => {
    setSelectedSlot(null);
    setShowTimeSlotModal(true);
  };

  const handleEditSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
    setShowTimeSlotModal(true);
  };

  const handleDeleteSlot = (slot: TimeSlot) => {
    if (!slot.availabilityId) return;

    Alert.alert(
      'Xác nhận xóa',
      'Bạn có chắc chắn muốn xóa khung giờ này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => deleteAvailability(slot.availabilityId!)
        }
      ]
    );
  };

  const handleStatusToggle = async (slot: TimeSlot) => {
    if (!slot.availabilityId) return;

    const newStatus = slot.status === AvailabilityStatus.AVAILABLE 
      ? AvailabilityStatus.UNAVAILABLE 
      : AvailabilityStatus.AVAILABLE;

    await updateAvailabilityStatus(slot.availabilityId, newStatus);
  };

  // Get current day's slots
  const currentDaySlots = getSlotsByDay(selectedDay);

  // Render day selector
  const renderDaySelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 10 }}
    >
      {Object.values(DayOfWeek).filter(day => typeof day === 'number').map((day) => (
        <TouchableOpacity
          key={day}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            marginRight: 8,
            borderRadius: 20,
            backgroundColor: selectedDay === day ? '#007AFF' : '#F2F2F7',
            minWidth: 60,
            alignItems: 'center'
          }}
          onPress={() => setSelectedDay(day as DayOfWeek)}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: selectedDay === day ? '#FFFFFF' : '#8E8E93',
              marginBottom: 2
            }}
          >
            {DAY_NAMES_SHORT[day as DayOfWeek]}
          </Text>
          <Text
            style={{
              fontSize: 10,
              color: selectedDay === day ? '#FFFFFF' : '#8E8E93'
            }}
          >
            {DAY_NAMES[day as DayOfWeek]}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Render time slot
  const renderTimeSlot = (slot: TimeSlot, index: number) => {
    const isAvailable = slot.status === AvailabilityStatus.AVAILABLE;
    
    return (
      <TouchableOpacity
        key={index}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#FFFFFF',
          marginHorizontal: 20,
          marginBottom: 8,
          padding: 16,
          borderRadius: 12,
          borderLeftWidth: 4,
          borderLeftColor: STATUS_COLORS[slot.status],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
          elevation: 2,
        }}
        onPress={() => handleEditSlot(slot)}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#000000', marginBottom: 4 }}>
            {slot.startTime.substring(0, 5)} - {slot.endTime.substring(0, 5)}
          </Text>
          <Text style={{ fontSize: 14, color: STATUS_COLORS[slot.status] }}>
            {STATUS_LABELS[slot.status]}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Status toggle */}
          <TouchableOpacity
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: isAvailable ? '#34C759' : '#FF3B30',
              marginRight: 8
            }}
            onPress={() => handleStatusToggle(slot)}
          >
            <Ionicons 
              name={isAvailable ? 'checkmark' : 'close'} 
              size={16} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>

          {/* Delete button */}
          <TouchableOpacity
            style={{
              padding: 8,
              borderRadius: 8,
              backgroundColor: '#FF3B30'
            }}
            onPress={() => handleDeleteSlot(slot)}
          >
            <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Render stats
  const renderStats = () => {
    if (!availabilityStats) return null;

    return (
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 12 }}>
          Thống kê lịch làm việc
        </Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginRight: 8 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#007AFF' }}>
              {availabilityStats.totalSlots}
            </Text>
            <Text style={{ fontSize: 12, color: '#8E8E93' }}>Tổng khung giờ</Text>
          </View>
          
          <View style={{ flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginLeft: 8 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#34C759' }}>
              {availabilityStats.availableSlots}
            </Text>
            <Text style={{ fontSize: 12, color: '#8E8E93' }}>Còn trống</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !weeklySchedule) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#8E8E93' }}>
          Đang tải lịch làm việc...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F2F2F7' }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top,
          paddingBottom: 16,
          paddingHorizontal: 20,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E5E5EA'
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000' }}>
            Lịch rảnh của bạn
          </Text>
          
          <TouchableOpacity onPress={handleCreateSlot}>
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#007AFF"
          />
        }
      >
        {/* Day Selector */}
        {renderDaySelector()}

        {/* Stats */}
        {renderStats()}

        {/* Selected Day Header */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#000000' }}>
            {DAY_NAMES[selectedDay]}
          </Text>
          <Text style={{ fontSize: 14, color: '#8E8E93', marginTop: 4 }}>
            {currentDaySlots.length} khung giờ đã thiết lập
          </Text>
        </View>

        {/* Time Slots */}
        {currentDaySlots.length > 0 ? (
          currentDaySlots.map((slot, index) => renderTimeSlot(slot, index))
        ) : (
          <View style={{ paddingHorizontal: 20, paddingVertical: 40, alignItems: 'center' }}>
            <Ionicons name="time-outline" size={48} color="#C7C7CC" />
            <Text style={{ fontSize: 16, color: '#8E8E93', textAlign: 'center', marginTop: 16 }}>
              Chưa có khung giờ nào cho {DAY_NAMES[selectedDay]}
            </Text>
            <Text style={{ fontSize: 14, color: '#C7C7CC', textAlign: 'center', marginTop: 8 }}>
              Nhấn nút + để thêm khung giờ mới
            </Text>
          </View>
        )}

        {/* Add New Slot Button */}
        <TouchableOpacity
          style={{
            margin: 20,
            backgroundColor: '#007AFF',
            padding: 16,
            borderRadius: 12,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onPress={handleCreateSlot}
          disabled={creating || updating}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                Thêm khung giờ mới
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Error Message */}
        {error && (
          <View style={{ margin: 20, padding: 16, backgroundColor: '#FFEBEE', borderRadius: 8 }}>
            <Text style={{ color: '#D32F2F', fontSize: 14 }}>
              {error}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Time Slot Modal would be rendered here */}
      <TimeSlotModal 
        visible={showTimeSlotModal}
        onClose={() => setShowTimeSlotModal(false)}
        selectedSlot={selectedSlot}
        selectedDay={selectedDay}
        photographerId={photographerId}
        onSave={onRefresh}
      />
    </View>
  );
};

export default ManageAvailabilityScreen;