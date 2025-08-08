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
        setStartTime(selectedSlot.startTime.substring(0, 5));
        setEndTime(selectedSlot.endTime.substring(0, 5));
        setStatus(selectedSlot.status);
      } else {
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
      Alert.alert('Error', 'Photographer information not found');
      return;
    }

    const formData = {
      photographerId,
      dayOfWeek: selectedDay,
      startTime: `${startTime}:00`,
      endTime: `${endTime}:00`,
      status
    };

    const errors = validateAvailabilityForm(formData);
    
    try {
      if (isEditing && selectedSlot?.availabilityId) {
        const updateData: UpdateAvailabilityRequest = {
          dayOfWeek: selectedDay,
          startTime: `${startTime}:00`,
          endTime: `${endTime}:00`,
          status
        };
        
        const result = await updateAvailability(selectedSlot.availabilityId, updateData);
        if (result) {
          Alert.alert('Success', 'Time slot updated successfully');
          onSave?.();
          onClose();
        }
      } else {
        const createData: CreateAvailabilityRequest = {
          photographerId,
          dayOfWeek: selectedDay,
          startTime: `${startTime}:00`,
          endTime: `${endTime}:00`,
          status
        };
        
        const result = await createAvailability(createData);
        if (result) {
          Alert.alert('Success', 'Time slot created successfully');
          onSave?.();
          onClose();
        }
      }
    } catch (err) {
      console.error('Error saving time slot:', err);
      Alert.alert('Error', 'Could not save time slot. Please try again.');
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Generate time options (every 30 minutes from 6:00 to 23:30)
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 6; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Calculate duration
  const calculateDuration = () => {
    const start = new Date(`2000-01-01 ${startTime}:00`);
    const end = new Date(`2000-01-01 ${endTime}:00`);
    const diff = Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60));
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    
    if (hours === 0) return `${minutes}min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}min`;
  };

  // Professional Header
  const renderHeader = () => (
    <View style={{
      paddingTop: insets.top + 20,
      paddingHorizontal: 24,
      paddingBottom: 20,
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
          onPress={handleClose}
          style={{ padding: 4 }}
        >
          <Ionicons name="close" size={24} color="#8A8A8A" />
        </TouchableOpacity>
        
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#1A1A1A',
            letterSpacing: 0.5,
          }}>
            {isEditing ? 'EDIT SLOT' : 'ADD SLOT'}
          </Text>
        </View>
        
        <TouchableOpacity
          onPress={handleSave}
          disabled={creating || updating}
          style={{
            backgroundColor: creating || updating ? '#E8E8E8' : '#1A1A1A',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 4,
          }}
        >
          {creating || updating ? (
            <ActivityIndicator size="small" color="#8A8A8A" />
          ) : (
            <Text style={{
              color: '#FFFFFF',
              fontSize: 12,
              fontWeight: '500',
              letterSpacing: 0.8,
            }}>
              SAVE
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Day Section
  const renderDaySection = () => (
    <View style={{
      backgroundColor: '#FFFFFF',
      paddingVertical: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    }}>
      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{
          fontSize: 14,
          color: '#8A8A8A',
          marginBottom: 8,
          letterSpacing: 0.5,
        }}>
          DAY
        </Text>
        <Text style={{
          fontSize: 18,
          fontWeight: '400',
          color: '#1A1A1A',
          letterSpacing: 0.3,
        }}>
          {DAY_NAMES[selectedDay]}
        </Text>
      </View>
    </View>
  );

  // Professional Time Picker
  const renderTimePicker = (
    label: string,
    value: string,
    onValueChange: (time: string) => void,
    excludeAfter?: string
  ) => {
    const filteredOptions = excludeAfter 
      ? timeOptions.filter(time => time > excludeAfter)
      : timeOptions;

    return (
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 14,
          color: '#8A8A8A',
          marginBottom: 12,
          letterSpacing: 0.5,
        }}>
          {label}
        </Text>
        
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 4,
          }}
        >
          {filteredOptions.map((time) => {
            const isSelected = time === value;
            return (
              <TouchableOpacity
                key={time}
                onPress={() => onValueChange(time)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginRight: 8,
                  borderRadius: 4,
                  backgroundColor: isSelected ? '#1A1A1A' : '#F8F8F8',
                  borderWidth: 1,
                  borderColor: isSelected ? '#1A1A1A' : '#E8E8E8',
                  minWidth: 70,
                  alignItems: 'center',
                }}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: isSelected ? '#FFFFFF' : '#1A1A1A',
                  letterSpacing: 0.3,
                }}>
                  {time}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  // Time Section
  const renderTimeSection = () => (
    <View style={{
      backgroundColor: '#FFFFFF',
      paddingVertical: 24,
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    }}>
      <View style={{ paddingHorizontal: 24 }}>
        {/* Start Time */}
        <View style={{ marginBottom: 32 }}>
          {renderTimePicker('START TIME', startTime, setStartTime)}
        </View>
        
        {/* End Time */}
        <View style={{ marginBottom: 20 }}>
          {renderTimePicker('END TIME', endTime, setEndTime, startTime)}
        </View>

        {/* Duration Display */}
        <View style={{
          backgroundColor: '#FAFAFA',
          padding: 16,
          borderRadius: 4,
          alignItems: 'center',
        }}>
          <Text style={{
            fontSize: 12,
            color: '#8A8A8A',
            marginBottom: 4,
            letterSpacing: 0.5,
          }}>
            DURATION
          </Text>
          <Text style={{
            fontSize: 16,
            fontWeight: '400',
            color: '#1A1A1A',
            letterSpacing: 0.3,
          }}>
            {calculateDuration()}
          </Text>
        </View>
      </View>
    </View>
  );

  // Professional Status Picker
  const renderStatusSection = () => (
    <View style={{
      backgroundColor: '#FFFFFF',
      paddingVertical: 24,
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
    }}>
      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{
          fontSize: 14,
          color: '#8A8A8A',
          marginBottom: 16,
          letterSpacing: 0.5,
        }}>
          STATUS
        </Text>
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {Object.values(AvailabilityStatus).map((statusOption) => {
            const isSelected = status === statusOption;
            const isAvailable = statusOption === AvailabilityStatus.AVAILABLE;
            
            return (
              <TouchableOpacity
                key={statusOption}
                style={{
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  marginRight: 12,
                  marginBottom: 8,
                  borderRadius: 4,
                  backgroundColor: isSelected 
                    ? (isAvailable ? '#1A1A1A' : '#8A8A8A') 
                    : '#F8F8F8',
                  borderWidth: 1,
                  borderColor: isSelected 
                    ? (isAvailable ? '#1A1A1A' : '#8A8A8A') 
                    : '#E8E8E8',
                }}
                onPress={() => setStatus(statusOption)}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: isSelected ? '#FFFFFF' : '#1A1A1A',
                  letterSpacing: 0.3,
                }}>
                  {isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  // Professional Guidelines
  const renderGuidelines = () => (
    <View style={{
      backgroundColor: '#FAFAFA',
      paddingVertical: 24,
    }}>
      <View style={{ paddingHorizontal: 24 }}>
        <Text style={{
          fontSize: 14,
          color: '#8A8A8A',
          marginBottom: 16,
          letterSpacing: 0.5,
        }}>
          GUIDELINES
        </Text>
        
        <View style={{ marginBottom: 12 }}>
          <Text style={{
            fontSize: 13,
            color: '#8A8A8A',
            lineHeight: 18,
            marginBottom: 8,
          }}>
            • Minimum slot duration is 30 minutes
          </Text>
          <Text style={{
            fontSize: 13,
            color: '#8A8A8A',
            lineHeight: 18,
            marginBottom: 8,
          }}>
            • Avoid overlapping time slots
          </Text>
          <Text style={{
            fontSize: 13,
            color: '#8A8A8A',
            lineHeight: 18,
            marginBottom: 8,
          }}>
            • Only available slots are visible to clients
          </Text>
          <Text style={{
            fontSize: 13,
            color: '#8A8A8A',
            lineHeight: 18,
          }}>
            • You can modify status after creation
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        {renderHeader()}

        <ScrollView style={{ flex: 1 }}>
          {renderDaySection()}
          {renderTimeSection()}
          {renderStatusSection()}
          
          {/* Error Display */}
          {error && (
            <View style={{
              backgroundColor: '#FFFFFF',
              paddingVertical: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#F5F5F5',
            }}>
              <View style={{
                marginHorizontal: 24,
                padding: 16,
                backgroundColor: '#FFE5E5',
                borderRadius: 4,
              }}>
                <Text style={{
                  fontSize: 14,
                  color: '#DC3545',
                  letterSpacing: 0.3,
                }}>
                  {error}
                </Text>
              </View>
            </View>
          )}
          
          {renderGuidelines()}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

export default TimeSlotModal;