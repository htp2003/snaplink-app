import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { getResponsiveSize } from '../../utils/responsive';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AntDesign, Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ModernCalendar from '../../components/ModernCalendar';
import { useBooking } from '../../hooks/useBooking';
import { useLocations } from '../../hooks/useLocations';
import type { RootStackNavigationProp } from '../../navigation/types';
import type { CreateBookingRequest } from '../../types/booking';
import { useAuth } from '../../hooks/useAuth';

// Route params interface - match với actual data structure
interface RouteParams {
  photographer: {
    photographerId: number;
    userId?: number;
    fullName: string;
    profileImage?: string;
    hourlyRate: number;
    specialty?: string;
    yearsExperience?: number;
    equipment?: string;
    availabilityStatus?: string;
    rating?: number;
    verificationStatus?: string;
    // API có thể return thêm fields
    userName?: string;
    email?: string;
    phoneNumber?: string;
    bio?: string;
    styles?: string[];
    // Legacy support
    name?: string;
    avatar?: string;
  };
  editMode?: boolean;
  existingBookingId?: number;
  existingBookingData?: {
    selectedDate: string;
    selectedStartTime: string;
    selectedEndTime: string;
    selectedLocation?: any;
    specialRequests?: string;
  };
}

export default function BookingScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute();
  const { photographer, editMode, existingBookingId, existingBookingData } = route.params as RouteParams;

  // Auth hook
  const { user, isAuthenticated } = useAuth();

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(editMode || false);

  // Form State - với logic để load existing data
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (existingBookingData?.selectedDate) {
      return new Date(existingBookingData.selectedDate);
    }
    return new Date();
  });

  const [selectedStartTime, setSelectedStartTime] = useState<string>(
    existingBookingData?.selectedStartTime || ''
  );
  const [selectedEndTime, setSelectedEndTime] = useState<string>(
    existingBookingData?.selectedEndTime || ''
  );
  const [selectedLocation, setSelectedLocation] = useState<any>(
    existingBookingData?.selectedLocation || null
  );
  const [specialRequests, setSpecialRequests] = useState<string>(
    existingBookingData?.specialRequests || ''
  );

  // UI State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showSpecialRequests, setShowSpecialRequests] = useState(false);

  // Debug log để check data
  useEffect(() => {
    console.log('BookingScreen received photographer:', photographer);
    console.log('Current user:', user);
    console.log('Is authenticated:', isAuthenticated);
    console.log('Edit mode:', isEditMode);
    console.log('Existing booking ID:', existingBookingId);
    console.log('Existing booking data:', existingBookingData);
  }, [photographer, user, isAuthenticated, isEditMode, existingBookingId, existingBookingData]);
  
  // Hooks
  const [localAvailability, setLocalAvailability] = useState<any>(null);
  const { locations, loading: locationsLoading } = useLocations();
  const {
    createBooking,
    updateBooking,
    checkAvailability,
    calculatePrice,
    priceCalculation,
    setPriceCalculation,
    availability,
    setAvailability,
    creating,
    updating,
    checkingAvailability,
    calculatingPrice,
    error
  } = useBooking();

  const getCurrentAvailability = () => {
    return localAvailability || availability;
  };

  // Check authentication khi component mount
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        'Yêu cầu đăng nhập',
        'Vui lòng đăng nhập để đặt lịch chụp ảnh',
        [
          {
            text: 'Đăng nhập',
            onPress: () => navigation.navigate('Login')
          },
          {
            text: 'Hủy',
            style: 'cancel',
            onPress: () => navigation.goBack()
          }
        ]
      );
    }
  }, [isAuthenticated, navigation]);

  const allTimes = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];

  // Safe data extraction từ photographer object
  const photographerName = photographer?.fullName || photographer?.name || 'Unknown Photographer';
  const photographerAvatar = photographer?.profileImage || photographer?.avatar;
  const photographerRate = photographer?.hourlyRate || 0;
  const photographerSpecialty = photographer?.specialty || 'Professional Photographer';
  const photographerId = photographer?.photographerId;

  // Helper functions
  const formatDate = (d: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (d.toDateString() === today.toDateString()) {
      return 'Hôm nay';
    } else if (d.toDateString() === tomorrow.toDateString()) {
      return 'Ngày mai';
    } else {
      return d.toLocaleDateString('vi-VN', { 
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
    }
  };

  const formatPrice = (price: number | undefined): string => {
    if (price === undefined || isNaN(price)) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  const getFilteredTimes = () => {
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    
    if (isToday) {
      const nowHour = today.getHours();
      const nowMinute = today.getMinutes();
      return allTimes.filter(time => {
        const [h, m] = time.split(":").map(Number);
        return h > nowHour || (h === nowHour && m > nowMinute);
      });
    }
    return allTimes;
  };

  const getEndTimeOptions = () => {
    if (!selectedStartTime) return [];
    const startIndex = allTimes.indexOf(selectedStartTime);
    return allTimes.slice(startIndex + 1);
  };

  // Event handlers
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedStartTime('');
    setSelectedEndTime('');
    setShowDatePicker(false);
  };

  const handleLocationSelect = (location: any) => {
    console.log('Selected location:', location);
    setSelectedLocation(location);
    setShowLocationPicker(false);
  };

  const handleStartTimeSelect = (time: string) => {
    setSelectedStartTime(time);
    // Reset end time if it's before new start time
    if (selectedEndTime && allTimes.indexOf(selectedEndTime) <= allTimes.indexOf(time)) {
      setSelectedEndTime('');
    }
  };

  const handleEndTimeSelect = (time: string) => {
    setSelectedEndTime(time);
  };

  // Effects
  useEffect(() => {
    const calculateAndSetPrice = async () => {
      if (selectedStartTime && selectedEndTime && photographerId) {
        const startDateTime = new Date(selectedDate);
        const [startHour, startMinute] = selectedStartTime.split(':').map(Number);
        startDateTime.setHours(startHour, startMinute, 0, 0);
        
        const endDateTime = new Date(selectedDate);
        const [endHour, endMinute] = selectedEndTime.split(':').map(Number);
        endDateTime.setHours(endHour, endMinute, 0, 0);

        try {
          // Check if same time slot in edit mode
          if (isEditMode && existingBookingData) {
            const isSameDate = existingBookingData.selectedDate === selectedDate.toISOString();
            const isSameStartTime = existingBookingData.selectedStartTime === selectedStartTime;
            const isSameEndTime = existingBookingData.selectedEndTime === selectedEndTime;
            
            if (isSameDate && isSameStartTime && isSameEndTime) {
              // Same time slot → Set local availability
              console.log('✅ Edit mode: Same time slot - auto available');
              setLocalAvailability({
                available: true,
                conflictingBookings: [],
                suggestedTimes: [],
                message: 'Thời gian hiện tại (có thể chỉnh sửa)'
              });
            } else {
              // Different time → Clear local availability, use hook's result
              console.log('🔍 Edit mode: Time changed - checking availability');
              setLocalAvailability(null);
              await checkAvailability(
                photographerId,
                startDateTime.toISOString(),
                endDateTime.toISOString(),
                selectedLocation?.id
              );
            }
          } else {
            // Create mode → Clear local availability, use hook's result
            console.log('📝 Create mode: Normal availability check');
            setLocalAvailability(null);
            await checkAvailability(
              photographerId,
              startDateTime.toISOString(),
              endDateTime.toISOString(),
              selectedLocation?.id
            );
          }

          // Price calculation (unchanged)
          const calculatePriceResult = await calculatePrice(
            photographerId,
            startDateTime.toISOString(),
            endDateTime.toISOString(),
            selectedLocation?.id
          );
          
          if (calculatePriceResult) {
            const duration = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
            const photographerFee = photographerRate * duration;
            const locationFee = selectedLocation?.hourlyRate ? selectedLocation.hourlyRate * duration : 0;
            
            setPriceCalculation({
              totalPrice: calculatePriceResult?.totalPrice ?? (photographerFee + locationFee),
              photographerFee: calculatePriceResult?.photographerFee ?? photographerFee,
              locationFee: calculatePriceResult?.locationFee ?? locationFee,
              duration: calculatePriceResult?.duration ?? duration,
              breakdown: calculatePriceResult?.breakdown ?? {
                baseRate: photographerFee,
                locationRate: locationFee,
                additionalFees: []
              }
            });
          }
        } catch (error) {
          console.error('Error in availability/price check:', error);
          // Fallback...
        }
      }
    };

    calculateAndSetPrice();
  }, [selectedStartTime, selectedEndTime, selectedLocation, selectedDate, photographerId, isEditMode, existingBookingData, checkAvailability, calculatePrice]);


  
  const handleSubmitBooking = async () => {
    // Basic validation
    if (!photographerId) {
      Alert.alert('Lỗi', 'Thông tin photographer không hợp lệ');
      return;
    }

    if (!selectedStartTime || !selectedEndTime) {
      Alert.alert('Lỗi', 'Vui lòng chọn thời gian bắt đầu và kết thúc');
      return;
    }

    if (!availability?.available) {
      Alert.alert('Không khả dụng', 'Photographer không rảnh trong khung giờ này.');
      return;
    }

    if (!isAuthenticated || !user?.id) {
      Alert.alert('Lỗi', 'Vui lòng đăng nhập để đặt lịch');
      return;
    }

    try {
      const startDateTime = new Date(selectedDate);
      const [startHour, startMinute] = selectedStartTime.split(':').map(Number);
      startDateTime.setHours(startHour, startMinute, 0, 0);
      
      const endDateTime = new Date(selectedDate);
      const [endHour, endMinute] = selectedEndTime.split(':').map(Number);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      if (isEditMode && existingBookingId) {
        // UPDATE MODE: Cập nhật booking hiện tại
        console.log('📝 Updating existing booking:', existingBookingId);
        
        const updateData = {
          startDatetime: startDateTime.toISOString(),
          endDatetime: endDateTime.toISOString(),
          ...(specialRequests && { specialRequests })
        };

        const updatedBooking = await updateBooking(existingBookingId, updateData);
        
        if (!updatedBooking) {
          Alert.alert('Lỗi', 'Không thể cập nhật booking. Vui lòng thử lại.');
          return;
        }

        console.log('✅ Booking updated successfully:', updatedBooking);
        
        // Navigate back với booking đã update
        navigation.navigate('OrderDetail', {
          bookingId: existingBookingId,
          photographer: {
            photographerId: photographer.photographerId,
            fullName: photographer.fullName || photographer.name || 'Unknown Photographer',
            profileImage: photographer.profileImage || photographer.avatar,
            hourlyRate: photographer.hourlyRate
          },
          selectedDate: selectedDate.toISOString(),
          selectedStartTime,
          selectedEndTime,
          selectedLocation: selectedLocation ? {
            id: selectedLocation.locationId,
            name: selectedLocation.name,
            hourlyRate: selectedLocation.hourlyRate
          } : undefined,
          specialRequests: specialRequests || undefined,
          priceCalculation: priceCalculation || {
            totalPrice: 0,
            photographerFee: 0,
            locationFee: 0,
            duration: 0,
            breakdown: {
              baseRate: 0,
              locationRate: 0,
              additionalFees: []
            }
          }
        });

      } else {
        // CREATE MODE: Tạo booking mới
        const bookingData: CreateBookingRequest = {
          photographerId: photographerId,
          startDatetime: startDateTime.toISOString(),
          endDatetime: endDateTime.toISOString(),
          ...(selectedLocation?.id && { locationId: selectedLocation.id }),
          ...(specialRequests && { specialRequests })
        };

        console.log('📝 Creating new booking with data:', bookingData);
        
        const createdBooking = await createBooking(user.id, bookingData);
        
        if (!createdBooking) {
          Alert.alert('Lỗi', 'Không thể tạo booking. Vui lòng thử lại.');
          return;
        }

        console.log('✅ Booking created successfully:', createdBooking);

        navigation.navigate('OrderDetail', {
          bookingId: createdBooking.id || createdBooking.bookingId,
          photographer: {
            photographerId: photographer.photographerId,
            fullName: photographer.fullName || photographer.name || 'Unknown Photographer',
            profileImage: photographer.profileImage || photographer.avatar,
            hourlyRate: photographer.hourlyRate
          },
          selectedDate: selectedDate.toISOString(),
          selectedStartTime,
          selectedEndTime,
          selectedLocation: selectedLocation ? {
            id: selectedLocation.locationId,
            name: selectedLocation.name,
            hourlyRate: selectedLocation.hourlyRate
          } : undefined,
          specialRequests: specialRequests || undefined,
          priceCalculation: priceCalculation || {
            totalPrice: 0,
            photographerFee: 0,
            locationFee: 0,
            duration: 0,
            breakdown: {
              baseRate: 0,
              locationRate: 0,
              additionalFees: []
            }
          }
        });
      }

    } catch (error) {
      console.error('❌ Error in booking operation:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  // Dynamic variables based on mode
  const buttonText = (creating || updating)
    ? (isEditMode ? 'Đang cập nhật...' : 'Đang tạo...') 
    : (isEditMode ? 'Cập nhật lịch' : 'Xác nhận đặt lịch');

  const headerTitle = isEditMode ? 'Chỉnh sửa lịch' : 'Đặt lịch chụp';

  // Check if form is ready for submission
  const isFormValid = photographerId && selectedStartTime && selectedEndTime && availability?.available && !creating && !updating;

  // Modal Components
// Modal Components
const SpecialRequestsModal = () => (
  <Modal
    animationType="slide"
    transparent={true}
    visible={showSpecialRequests}
    onRequestClose={() => setShowSpecialRequests(false)}
  >
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
      <View style={{
        backgroundColor: '#fff',
        borderTopLeftRadius: getResponsiveSize(20),
        borderTopRightRadius: getResponsiveSize(20),
        paddingTop: getResponsiveSize(20),
        paddingHorizontal: getResponsiveSize(20),
        paddingBottom: getResponsiveSize(40),
        maxHeight: '70%'
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: getResponsiveSize(20),
        }}>
          <Text style={{
            fontSize: getResponsiveSize(18),
            fontWeight: 'bold',
            color: '#333'
          }}>Yêu cầu đặc biệt</Text>
          <TouchableOpacity 
            onPress={() => setShowSpecialRequests(false)}
            style={{
              backgroundColor: '#f5f5f5',
              borderRadius: getResponsiveSize(20),
              padding: getResponsiveSize(8)
            }}
          >
            <AntDesign name="close" size={getResponsiveSize(18)} color="#666" />
          </TouchableOpacity>
        </View>

        <TextInput
          value={specialRequests}
          onChangeText={setSpecialRequests}
          placeholder="Ví dụ: Chụp ảnh gia đình, có em bé 2 tuổi cần kiên nhẫn..."
          multiline={true}
          numberOfLines={6}
          textAlignVertical="top"
          style={{
            borderWidth: 1,
            borderColor: '#e0e0e0',
            borderRadius: getResponsiveSize(12),
            padding: getResponsiveSize(15),
            fontSize: getResponsiveSize(16),
            color: '#333',
            height: getResponsiveSize(120),
            marginBottom: getResponsiveSize(20)
          }}
        />

        <TouchableOpacity
          onPress={() => setShowSpecialRequests(false)}
          style={{
            backgroundColor: '#E91E63',
            borderRadius: getResponsiveSize(12),
            padding: getResponsiveSize(15),
            alignItems: 'center'
          }}
        >
          <Text style={{
            color: '#fff',
            fontSize: getResponsiveSize(16),
            fontWeight: 'bold'
          }}>Lưu</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const LocationModal = () => (
  <Modal
    animationType="slide"
    transparent={true}
    visible={showLocationPicker}
    onRequestClose={() => setShowLocationPicker(false)}
  >
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
      <View style={{
        backgroundColor: '#fff',
        borderTopLeftRadius: getResponsiveSize(20),
        borderTopRightRadius: getResponsiveSize(20),
        paddingTop: getResponsiveSize(20),
        paddingHorizontal: getResponsiveSize(20),
        paddingBottom: getResponsiveSize(40),
        maxHeight: '70%'
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: getResponsiveSize(20),
        }}>
          <Text style={{
            fontSize: getResponsiveSize(18),
            fontWeight: 'bold',
            color: '#333'
          }}>Chọn địa điểm</Text>
          <TouchableOpacity 
            onPress={() => setShowLocationPicker(false)}
            style={{
              backgroundColor: '#f5f5f5',
              borderRadius: getResponsiveSize(20),
              padding: getResponsiveSize(8)
            }}
          >
            <AntDesign name="close" size={getResponsiveSize(18)} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {locationsLoading ? (
            <Text style={{ textAlign: 'center', color: '#666', padding: getResponsiveSize(20) }}>
              Đang tải...
            </Text>
          ) : locations.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#666', padding: getResponsiveSize(20) }}>
              Không có địa điểm nào
            </Text>
          ) : (
            locations.map((location) => (
              <TouchableOpacity
                key={location.id}
                onPress={() => handleLocationSelect(location)}
                style={{
                  backgroundColor: selectedLocation?.id === location.id ? '#fff' : '#f8f9fa',
                  borderRadius: getResponsiveSize(12),
                  marginBottom: getResponsiveSize(12),
                  borderWidth: selectedLocation?.id === location.id ? 2 : 1,
                  borderColor: selectedLocation?.id === location.id ? '#E91E63' : '#e0e0e0',
                  padding: getResponsiveSize(15),
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
              >
                {/* Location Image */}
                <Image
                  source={{ 
                    uri: location.images?.[0]
                  }}
                  style={{
                    width: getResponsiveSize(50),
                    height: getResponsiveSize(50),
                    borderRadius: getResponsiveSize(8),
                    marginRight: getResponsiveSize(12)
                  }}
                />
                
                <View style={{ flex: 1 }}>
                  <Text 
                    style={{
                      fontSize: getResponsiveSize(16),
                      fontWeight: 'bold',
                      color: '#333',
                      marginBottom: getResponsiveSize(4)
                    }}
                    numberOfLines={1}
                  >
                    {location?.name || 'Không có tên'}
                  </Text>
                  <Text 
                    style={{
                      fontSize: getResponsiveSize(14),
                      color: '#666',
                      marginBottom: getResponsiveSize(4)
                    }}
                    numberOfLines={1}
                  >
                    {location?.address || 'Địa chỉ chưa cập nhật'}
                  </Text>
                  {location?.hourlyRate && !isNaN(Number(location.hourlyRate)) ? (
                    <Text style={{
                      fontSize: getResponsiveSize(12),
                      color: '#E91E63',
                      fontWeight: 'bold'
                    }}>
                      {formatPrice(Number(location.hourlyRate))}/giờ
                    </Text>
                  ) : null}
                </View>

                {selectedLocation?.id === location.id && (
                  <Feather name="check" size={getResponsiveSize(18)} color="#E91E63" />
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

return (
  <View style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
    {/* Header */}
    <View style={{
      backgroundColor: '#fff',
      paddingTop: getResponsiveSize(50),
      paddingHorizontal: getResponsiveSize(20),
      paddingBottom: getResponsiveSize(20),
      elevation: 2
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            backgroundColor: '#f5f5f5',
            borderRadius: getResponsiveSize(12),
            padding: getResponsiveSize(10)
          }}
        >
          <AntDesign name="arrowleft" size={getResponsiveSize(24)} color="#333" />
        </TouchableOpacity>
        
        <Text style={{
          fontSize: getResponsiveSize(20),
          fontWeight: 'bold',
          color: '#333'
        }}>{headerTitle}</Text>
        
        <View style={{ width: getResponsiveSize(44) }} />
      </View>

      {/* Photographer Info */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: getResponsiveSize(20),
        backgroundColor: '#f8f9fa',
        borderRadius: getResponsiveSize(12),
        padding: getResponsiveSize(15)
      }}>
        <Image
          source={{ uri: photographerAvatar }}
          style={{
            width: getResponsiveSize(50),
            height: getResponsiveSize(50),
            borderRadius: getResponsiveSize(25),
            marginRight: getResponsiveSize(15)
          }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: getResponsiveSize(16),
            fontWeight: 'bold',
            color: '#333'
          }}>{photographerName}</Text>
          <Text style={{
            fontSize: getResponsiveSize(14),
            color: '#666'
          }}>{photographerSpecialty}</Text>
        </View>
        <Text style={{
          fontSize: getResponsiveSize(16),
          fontWeight: 'bold',
          color: '#E91E63'
        }}>{formatPrice(photographerRate)}/h</Text>
      </View>
    </View>

    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={{ padding: getResponsiveSize(20) }}>
        
        {/* Date Selection */}
        <View style={{
          backgroundColor: '#fff',
          borderRadius: getResponsiveSize(16),
          padding: getResponsiveSize(20),
          marginBottom: getResponsiveSize(15),
          elevation: 2
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: getResponsiveSize(15) }}>
            <Feather name="calendar" size={getResponsiveSize(20)} color="#E91E63" />
            <Text style={{
              fontSize: getResponsiveSize(16),
              fontWeight: 'bold',
              color: '#333',
              marginLeft: getResponsiveSize(10)
            }}>Chọn ngày</Text>
          </View>

          <TouchableOpacity 
            onPress={() => setShowDatePicker(true)}
            style={{
              backgroundColor: '#f8f9fa',
              borderRadius: getResponsiveSize(12),
              padding: getResponsiveSize(15),
              borderWidth: 1,
              borderColor: '#e0e0e0'
            }}
          >
            <Text style={{
              fontSize: getResponsiveSize(16),
              fontWeight: 'bold',
              color: '#E91E63'
            }}>{formatDate(selectedDate)}</Text>
            <Text style={{
              fontSize: getResponsiveSize(14),
              color: '#666',
              marginTop: getResponsiveSize(2)
            }}>{selectedDate.toLocaleDateString('vi-VN', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</Text>
          </TouchableOpacity>
        </View>

        {/* Time Selection */}
        <View style={{
          backgroundColor: '#fff',
          borderRadius: getResponsiveSize(16),
          padding: getResponsiveSize(20),
          marginBottom: getResponsiveSize(15),
          elevation: 2
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: getResponsiveSize(15) }}>
            <Feather name="clock" size={getResponsiveSize(20)} color="#E91E63" />
            <Text style={{
              fontSize: getResponsiveSize(16),
              fontWeight: 'bold',
              color: '#333',
              marginLeft: getResponsiveSize(10)
            }}>Chọn thời gian</Text>
            {checkingAvailability && (
              <Text style={{
                fontSize: getResponsiveSize(12),
                color: '#E91E63',
                marginLeft: 'auto'
              }}>Kiểm tra...</Text>
            )}
          </View>

          {/* Start Time */}
          <Text style={{
            fontSize: getResponsiveSize(14),
            color: '#666',
            marginBottom: getResponsiveSize(10)
          }}>Giờ bắt đầu</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: getResponsiveSize(15) }}>
            {getFilteredTimes().map((time) => (
              <TouchableOpacity
                key={time}
                onPress={() => handleStartTimeSelect(time)}
                style={{
                  backgroundColor: selectedStartTime === time ? '#E91E63' : '#f8f9fa',
                  borderRadius: getResponsiveSize(20),
                  paddingVertical: getResponsiveSize(12),
                  paddingHorizontal: getResponsiveSize(20),
                  marginRight: getResponsiveSize(10),
                  borderWidth: 1,
                  borderColor: selectedStartTime === time ? '#E91E63' : '#e0e0e0'
                }}
              >
                <Text style={{
                  color: selectedStartTime === time ? '#fff' : '#333',
                  fontWeight: selectedStartTime === time ? 'bold' : 'normal',
                  fontSize: getResponsiveSize(14)
                }}>{time}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* End Time */}
          {selectedStartTime && (
            <>
              <Text style={{
                fontSize: getResponsiveSize(14),
                color: '#666',
                marginBottom: getResponsiveSize(10)
              }}>Giờ kết thúc</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {getEndTimeOptions().map((time) => (
                  <TouchableOpacity
                    key={time}
                    onPress={() => handleEndTimeSelect(time)}
                    style={{
                      backgroundColor: selectedEndTime === time ? '#E91E63' : '#f8f9fa',
                      borderRadius: getResponsiveSize(20),
                      paddingVertical: getResponsiveSize(12),
                      paddingHorizontal: getResponsiveSize(20),
                      marginRight: getResponsiveSize(10),
                      borderWidth: 1,
                      borderColor: selectedEndTime === time ? '#E91E63' : '#e0e0e0'
                    }}
                  >
                    <Text style={{
                      color: selectedEndTime === time ? '#fff' : '#333',
                      fontWeight: selectedEndTime === time ? 'bold' : 'normal',
                      fontSize: getResponsiveSize(14)
                    }}>{time}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Availability Status */}
          {availability && selectedStartTime && selectedEndTime && (
            <View style={{
              marginTop: getResponsiveSize(15),
              padding: getResponsiveSize(12),
              borderRadius: getResponsiveSize(8),
              backgroundColor: availability.available ? '#E8F5E8' : '#FFF3F3',
              borderWidth: 1,
              borderColor: availability.available ? '#4CAF50' : '#F44336'
            }}>
              <Text style={{
                color: availability.available ? '#2E7D32' : '#C62828',
                fontSize: getResponsiveSize(14),
                fontWeight: 'bold'
              }}>
                {availability.available ? '✓ Có thể đặt lịch' : '✗ Không khả dụng'}
              </Text>
            </View>
          )}
        </View>

        {/* Location Selection */}
        <View style={{
          backgroundColor: '#fff',
          borderRadius: getResponsiveSize(16),
          padding: getResponsiveSize(20),
          marginBottom: getResponsiveSize(15),
          elevation: 2
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: getResponsiveSize(15) }}>
            <Feather name="map-pin" size={getResponsiveSize(20)} color="#E91E63" />
            <Text style={{
              fontSize: getResponsiveSize(16),
              fontWeight: 'bold',
              color: '#333',
              marginLeft: getResponsiveSize(10)
            }}>Địa điểm</Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowLocationPicker(true)}
            style={{
              backgroundColor: '#f8f9fa',
              borderRadius: getResponsiveSize(12),
              padding: getResponsiveSize(15),
              borderWidth: 1,
              borderColor: '#e0e0e0'
            }}
          >
            <Text style={{
              fontSize: getResponsiveSize(16),
              color: selectedLocation ? '#333' : '#999'
            }}>
              {selectedLocation ? selectedLocation.name : 'Chọn địa điểm (tùy chọn)'}
            </Text>
            {selectedLocation && (
              <Text style={{
                fontSize: getResponsiveSize(14),
                color: '#666',
                marginTop: getResponsiveSize(2)
              }}>{selectedLocation.address}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Special Requests */}
        <View style={{
          backgroundColor: '#fff',
          borderRadius: getResponsiveSize(16),
          padding: getResponsiveSize(20),
          marginBottom: getResponsiveSize(15),
          elevation: 2
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: getResponsiveSize(15) }}>
            <Feather name="edit-3" size={getResponsiveSize(20)} color="#E91E63" />
            <Text style={{
              fontSize: getResponsiveSize(16),
              fontWeight: 'bold',
              color: '#333',
              marginLeft: getResponsiveSize(10)
            }}>Ghi chú</Text>
          </View>

          <TouchableOpacity
            onPress={() => setShowSpecialRequests(true)}
            style={{
              backgroundColor: '#f8f9fa',
              borderRadius: getResponsiveSize(12),
              padding: getResponsiveSize(15),
              borderWidth: 1,
              borderColor: '#e0e0e0',
              minHeight: getResponsiveSize(50)
            }}
          >
            <Text style={{
              fontSize: getResponsiveSize(14),
              color: specialRequests ? '#333' : '#999'
            }}>
              {specialRequests || 'Thêm yêu cầu đặc biệt...'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Price Summary */}
        <View style={{
          backgroundColor: '#fff',
          borderRadius: getResponsiveSize(16),
          padding: getResponsiveSize(20),
          marginBottom: getResponsiveSize(20),
          elevation: 2
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: getResponsiveSize(15) }}>
            <MaterialIcons name="receipt" size={getResponsiveSize(20)} color="#E91E63" />
            <Text style={{
              fontSize: getResponsiveSize(16),
              fontWeight: 'bold',
              color: '#333',
              marginLeft: getResponsiveSize(10)
            }}>Tổng chi phí</Text>
            {calculatingPrice && (
              <Text style={{
                fontSize: getResponsiveSize(12),
                color: '#E91E63',
                marginLeft: 'auto'
              }}>Đang tính...</Text>
            )}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: getResponsiveSize(10) }}>
            <Text style={{ fontSize: getResponsiveSize(16), color: '#333' }}>
              {priceCalculation?.duration ? `${priceCalculation.duration.toFixed(1)} giờ` : '0 giờ'}
            </Text>
            <Text style={{ fontSize: getResponsiveSize(16), color: '#333' }}>
              {priceCalculation?.photographerFee !== undefined && priceCalculation?.duration 
                ? `${formatPrice(priceCalculation.photographerFee / Math.max(1, priceCalculation.duration))}/giờ`
                : 'Liên hệ'}
            </Text>
          </View>

          {priceCalculation?.locationFee ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: getResponsiveSize(10) }}>
              <Text style={{ fontSize: getResponsiveSize(14), color: '#666' }}>Phí địa điểm:</Text>
              <Text style={{ fontSize: getResponsiveSize(14), color: '#666' }}>
                {formatPrice(priceCalculation.locationFee)}
              </Text>
            </View>
          ) : null}

          <View style={{ 
            flexDirection: 'row', 
            justifyContent: 'space-between',
            borderTopWidth: 1,
            borderTopColor: '#eee',
            paddingTop: getResponsiveSize(10),
            marginTop: getResponsiveSize(5)
          }}>
            <Text style={{ fontSize: getResponsiveSize(16), fontWeight: 'bold', color: '#333' }}>
              Tổng cộng:
            </Text>
            <Text style={{ fontSize: getResponsiveSize(18), fontWeight: 'bold', color: '#E91E63' }}>
              {priceCalculation?.totalPrice ? formatPrice(priceCalculation.totalPrice) : 'Liên hệ'}
            </Text>
          </View>
        </View>

        {/* Booking Button */}
        <TouchableOpacity
          onPress={handleSubmitBooking}
          disabled={!isFormValid}
          style={{
            backgroundColor: isFormValid ? '#E91E63' : '#ccc',
            borderRadius: getResponsiveSize(16),
            padding: getResponsiveSize(18),
            alignItems: 'center',
            marginBottom: getResponsiveSize(20),
            elevation: isFormValid ? 3 : 0
          }}
        >
          <Text style={{
            color: '#fff',
            fontSize: getResponsiveSize(16),
            fontWeight: 'bold'
          }}>
            {buttonText}
          </Text>
        </TouchableOpacity>

        {/* Debug Info - Remove in production */}
        {__DEV__ && (
          <View style={{
            backgroundColor: '#f0f0f0',
            padding: getResponsiveSize(10),
            borderRadius: getResponsiveSize(8),
            marginBottom: getResponsiveSize(10)
          }}>
            <Text style={{ fontSize: getResponsiveSize(12), color: '#666' }}>
              Debug: photographerId={photographerId}, rate={photographerRate}
            </Text>
            <Text style={{ fontSize: getResponsiveSize(12), color: '#666' }}>
              Selected: {selectedStartTime} - {selectedEndTime}
            </Text>
            <Text style={{ fontSize: getResponsiveSize(12), color: '#666' }}>
              Location: {selectedLocation?.name || 'None'}
            </Text>
            <Text style={{ fontSize: getResponsiveSize(12), color: '#666' }}>
              Available: {availability?.available ? 'Yes' : 'No'}, Price: {priceCalculation?.totalPrice || 0}
            </Text>
            <Text style={{ fontSize: getResponsiveSize(12), color: '#666' }}>
              Edit mode: {isEditMode ? 'Yes' : 'No'}, Booking ID: {existingBookingId || 'None'}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>

    {/* Modals */}
    <ModernCalendar
      date={selectedDate}
      onDateChange={handleDateChange}
      visible={showDatePicker}
      onClose={() => setShowDatePicker(false)}
    />
    
    <LocationModal />
    <SpecialRequestsModal />

    {/* Error Display */}
    {error && (
      <View style={{
        position: 'absolute',
        top: getResponsiveSize(100),
        left: getResponsiveSize(20),
        right: getResponsiveSize(20),
        backgroundColor: '#F44336',
        borderRadius: getResponsiveSize(8),
        padding: getResponsiveSize(15),
        elevation: 5
      }}>
        <Text style={{
          color: '#fff',
          fontSize: getResponsiveSize(14),
          textAlign: 'center'
        }}>{error}</Text>
      </View>
    )}
  </View>
);
}