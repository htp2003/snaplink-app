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
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackNavigationProp } from '../../navigation/types';
import { useAvailability } from '../../hooks/useAvailability';
import { useAuth } from '../../hooks/useAuth';
import { photographerService } from '../../services/photographerService';
import TimeSlotModal from '../../components/Photographer/TimeSlotModal';
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
        Alert.alert('Error', 'User information not found');
        navigation.goBack();
        return;
      }

      const photographerProfile = await photographerService.findPhotographerByUserId(userId);
      if (!photographerProfile) {
        Alert.alert(
          'Notice', 
          'You are not a photographer yet. Please complete your profile first.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      setPhotographerId(photographerProfile.photographerId);
      await fetchPhotographerAvailability(photographerProfile.photographerId);
    } catch (error) {
      console.error('Error loading photographer data:', error);
      Alert.alert('Error', 'Could not load photographer information');
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
      'Confirm Delete',
      'Are you sure you want to remove this time slot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
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

  // Professional Header
  const renderHeader = () => (
    <View style={{
      paddingHorizontal: 24,
      paddingVertical: 20,
      backgroundColor: '#FFFFFF',
      borderBottomWidth: 1,
      borderBottomColor: '#E8E8E8',
    }}>
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            padding: 8,
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
        </TouchableOpacity>
        
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#1A1A1A',
            letterSpacing: 0.5,
          }}>
            LỊCH CỦA BẠN
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={handleCreateSlot}
          style={{
            backgroundColor: '#1A1A1A',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 4,
          }}
          disabled={creating || updating}
        >
          {creating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: '500',
              letterSpacing: 0.8,
            }}>
              THÊM
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Minimalist Stats
  const renderStats = () => {
    if (!availabilityStats) return null;

    return (
      <View style={{
        paddingHorizontal: 24,
        paddingVertical: 20,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View>
            <Text style={{
              fontSize: 14,
              color: '#8A8A8A',
              marginBottom: 4,
              letterSpacing: 0.5,
            }}>
              TỔNG SỐ SLOTS
            </Text>
            <Text style={{
              fontSize: 24,
              fontWeight: '300',
              color: '#1A1A1A',
            }}>
              {availabilityStats.totalSlots}
            </Text>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <Text style={{
              fontSize: 14,
              color: '#8A8A8A',
              marginBottom: 4,
              letterSpacing: 0.5,
            }}>
              KHẢ DỤNG
            </Text>
            <Text style={{
              fontSize: 24,
              fontWeight: '300',
              color: '#1A1A1A',
            }}>
              {availabilityStats.availableSlots}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{
              fontSize: 14,
              color: '#8A8A8A',
              marginBottom: 4,
              letterSpacing: 0.5,
            }}>
              ĐÃ ĐẶT
            </Text>
            <Text style={{
              fontSize: 24,
              fontWeight: '300',
              color: '#1A1A1A',
            }}>
              {availabilityStats.totalSlots - availabilityStats.availableSlots}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Clean Day Selector
  const renderDaySelector = () => (
    <View style={{
      backgroundColor: '#FFFFFF',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {Object.values(DayOfWeek).filter(day => typeof day === 'number').map((day) => {
          const isSelected = selectedDay === day;
          return (
            <TouchableOpacity
              key={day}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                marginRight: 8,
                borderRadius: 4,
                backgroundColor: isSelected ? '#1A1A1A' : 'transparent',
                borderWidth: isSelected ? 0 : 1,
                borderColor: '#E8E8E8',
                minWidth: 80,
                alignItems: 'center'
              }}
              onPress={() => setSelectedDay(day as DayOfWeek)}
            >
              <Text style={{
                fontSize: 12,
                fontWeight: '500',
                color: isSelected ? '#FFFFFF' : '#8A8A8A',
                letterSpacing: 0.5,
                marginBottom: 4
              }}>
                {DAY_NAMES_SHORT[day as DayOfWeek].toUpperCase()}
              </Text>
              <Text style={{
                fontSize: 10,
                color: isSelected ? '#FFFFFF' : '#C8C8C8',
                letterSpacing: 0.3
              }}>
                {DAY_NAMES[day as DayOfWeek]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  // Professional Time Slot Card
  const renderTimeSlot = (slot: TimeSlot, index: number) => {
    const isAvailable = slot.status === AvailabilityStatus.AVAILABLE;
    
    return (
      <View
        key={index}
        style={{
          backgroundColor: '#FFFFFF',
          marginHorizontal: 24,
          marginBottom: 12,
          borderRadius: 4,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
          overflow: 'hidden',
        }}
      >
        {/* Status Indicator */}
        <View style={{
          height: 3,
          backgroundColor: isAvailable ? '#1A1A1A' : '#C8C8C8',
        }} />
        
        <TouchableOpacity
          style={{
            padding: 20,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          onPress={() => handleEditSlot(slot)}
        >
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '400',
              color: '#1A1A1A',
              marginBottom: 6,
              letterSpacing: 0.3,
            }}>
              {slot.startTime.substring(0, 5)} — {slot.endTime.substring(0, 5)}
            </Text>
            
            <Text style={{
              fontSize: 12,
              color: isAvailable ? '#1A1A1A' : '#8A8A8A',
              letterSpacing: 0.5,
              textTransform: 'uppercase'
            }}>
              {isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Status Toggle */}
            <TouchableOpacity
              style={{
                width: 36,
                height: 36,
                borderRadius: 4,
                backgroundColor: isAvailable ? '#1A1A1A' : '#E8E8E8',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12
              }}
              onPress={() => handleStatusToggle(slot)}
            >
              <Ionicons 
                name={isAvailable ? 'checkmark' : 'close'} 
                size={16} 
                color={isAvailable ? '#FFFFFF' : '#8A8A8A'} 
              />
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity
              style={{
                width: 36,
                height: 36,
                borderRadius: 4,
                backgroundColor: '#DC3545',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => handleDeleteSlot(slot)}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  // Professional Empty State
  const renderEmptyState = () => (
    <View style={{
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 40,
      backgroundColor: '#FAFAFA',
      paddingVertical: 60,
    }}>
      <View style={{
        width: 80,
        height: 80,
        borderRadius: 4,
        backgroundColor: '#E8E8E8',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
      }}>
        <Ionicons name="time-outline" size={32} color="#B8B8B8" />
      </View>
      
      <Text style={{
        fontSize: 20,
        fontWeight: '300',
        color: '#1A1A1A',
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: 0.5,
      }}>
        Không Có Lịch Trống
      </Text>
      
      <Text style={{
        fontSize: 15,
        color: '#8A8A8A',
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 22,
        maxWidth: 280,
      }}>
        Đặt lịch của bạn để bắt đầu nhận đặt chỗ từ khách hàng
      </Text>
      
      <TouchableOpacity
        style={{
          backgroundColor: '#1A1A1A',
          paddingHorizontal: 32,
          paddingVertical: 12,
          borderRadius: 4,
        }}
        onPress={handleCreateSlot}
      >
        <Text style={{
          color: '#FFFFFF',
          fontSize: 14,
          fontWeight: '500',
          letterSpacing: 0.8,
        }}>
          THÊM LỊCH TRỐNG
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Section Header
  const renderSectionHeader = () => (
    <View style={{
      paddingHorizontal: 24,
      paddingVertical: 16,
      backgroundColor: '#FAFAFA',
    }}>
      <Text style={{
        fontSize: 14,
        color: '#8A8A8A',
        letterSpacing: 0.5,
        marginBottom: 4,
      }}>
        {DAY_NAMES[selectedDay].toUpperCase()}
      </Text>
      <Text style={{
        fontSize: 12,
        color: '#C8C8C8',
        letterSpacing: 0.3,
      }}>
        {currentDaySlots.length} slots configured
      </Text>
    </View>
  );

  if (loading && !weeklySchedule) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        <StatusBar barStyle="dark-content" />
        <View style={{ 
          flex: 1, 
          justifyContent: 'center', 
          alignItems: 'center'
        }}>
          <ActivityIndicator size="large" color="#1A1A1A" />
          <Text style={{ 
            marginTop: 16, 
            fontSize: 14, 
            color: '#8A8A8A',
            fontWeight: '300'
          }}>
            Loading schedule...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar barStyle="dark-content" />
      
      {renderHeader()}

      {error && (
        <View style={{ 
          margin: 24, 
          padding: 16, 
          backgroundColor: '#FFE5E5', 
          borderRadius: 4 
        }}>
          <Text style={{ color: '#DC3545', fontSize: 14 }}>
            {error}
          </Text>
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1A1A1A"
          />
        }
      >
        {renderStats()}
        {renderDaySelector()}
        {renderSectionHeader()}

        {/* Time Slots or Empty State */}
        {currentDaySlots.length > 0 ? (
          <View style={{ 
            paddingVertical: 16,
            backgroundColor: '#FAFAFA',
            minHeight: 200
          }}>
            {currentDaySlots.map((slot, index) => renderTimeSlot(slot, index))}
          </View>
        ) : (
          renderEmptyState()
        )}

        {/* Add Button */}
        {currentDaySlots.length > 0 && (
          <View style={{ 
            paddingHorizontal: 24, 
            paddingVertical: 20,
            backgroundColor: '#FAFAFA' 
          }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#1A1A1A',
                paddingVertical: 16,
                borderRadius: 4,
                alignItems: 'center',
              }}
              onPress={handleCreateSlot}
              disabled={creating || updating}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={{
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '500',
                  letterSpacing: 0.8,
                }}>
                  ADD NEW SLOT
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40, backgroundColor: '#FAFAFA' }} />
      </ScrollView>

      <TimeSlotModal 
        visible={showTimeSlotModal}
        onClose={() => setShowTimeSlotModal(false)}
        selectedSlot={selectedSlot}
        selectedDay={selectedDay}
        photographerId={photographerId}
        existingSlots={currentDaySlots}
        onSave={onRefresh}
      />
    </SafeAreaView>
  );
};

export default ManageAvailabilityScreen;