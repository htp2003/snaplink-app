import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { getResponsiveSize } from "../../utils/responsive";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AntDesign, Feather, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ModernCalendar from "../../components/ModernCalendar";
import { useBooking } from "../../hooks/useBooking";
import { useAvailability } from "../../hooks/useAvailability";
import { useLocations } from "../../hooks/useLocations";
import type { RootStackNavigationProp } from "../../navigation/types";
import type { CreateBookingRequest } from "../../types/booking";
import type { DayOfWeek, AvailabilityResponse } from "../../types/availability";
import { useAuth } from "../../hooks/useAuth";
import { bookingService } from "../../services/bookingService";
import { cleanupService } from "../../services/cleanupService";

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

  



  // Extract photographerId ngay đầu
  const photographerId = photographer?.photographerId;

  if (!photographer || !photographerId || typeof photographerId !== 'number') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ color: '#E91E63', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
          Lỗi tải thông tin photographer
        </Text>
        <Text style={{ color: '#666', fontSize: 14, textAlign: 'center', marginTop: 10 }}>
          Dữ liệu photographer không hợp lệ. Vui lòng thử lại.
        </Text>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={{
            backgroundColor: '#E91E63',
            padding: 15,
            borderRadius: 8,
            marginTop: 20
          }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>← Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
    existingBookingData?.selectedStartTime || ""
  );
  const [selectedEndTime, setSelectedEndTime] = useState<string>(
    existingBookingData?.selectedEndTime || ""
  );
  const [selectedLocation, setSelectedLocation] = useState<any>(
    existingBookingData?.selectedLocation || null
  );
  const [specialRequests, setSpecialRequests] = useState<string>(
    existingBookingData?.specialRequests || ""
  );

  // UI State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // 🆕 THÊM: Availability hooks
  const {
    fetchPhotographerAvailability,
    availabilities,
    loading: availabilityLoading,
  } = useAvailability();

  const [photographerSchedule, setPhotographerSchedule] = useState<
    AvailabilityResponse[]
  >([]);

  // 🆕 THÊM: Booked slots state
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingBookedSlots, setLoadingBookedSlots] = useState(false);

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
    error,
  } = useBooking();

  const getCurrentAvailability = () => {
    return localAvailability || availability;
  };

  // 🆕 THÊM: Load photographer availability
  useEffect(() => {
    const loadPhotographerSchedule = async () => {
      if (photographerId) {
        await fetchPhotographerAvailability(photographerId);
      }
    };

    loadPhotographerSchedule();
  }, [photographerId, fetchPhotographerAvailability]);

  // 🆕 THÊM: Update photographerSchedule khi availabilities thay đổi
  useEffect(() => {
    setPhotographerSchedule(availabilities);
  }, [availabilities]);

  // 🆕 THÊM: Function để get booked slots cho ngày cụ thể
  const getBookedSlotsForDate = async (
    photographerIdParam: number,
    date: Date
  ): Promise<string[]> => {
    try {
      setLoadingBookedSlots(true);

      // Dùng API hiện có để get photographer bookings
      const bookingsResponse = await bookingService.getPhotographerBookings(
        photographerIdParam,
        1,
        100
      );

      if (!bookingsResponse || !bookingsResponse.bookings) {
        return [];
      }

      const dateString = date.toISOString().split("T")[0]; // "2025-08-01"

      const bookedTimes = bookingsResponse.bookings
        .filter((booking) => {
          // Filter bookings cho ngày đó và không bị cancel
          const bookingDate = booking.startDatetime.split("T")[0];
          const isValidStatus = !["cancelled", "expired"].includes(
            booking.status.toLowerCase()
          );
          const isSameDate = bookingDate === dateString;

          return isValidStatus && isSameDate;
        })
        .map((booking) => {
          // Extract time slots từ booking
          const startDateTime = new Date(booking.startDatetime);
          const endDateTime = new Date(booking.endDatetime);

          const startHour = startDateTime.getHours();
          const endHour = endDateTime.getHours();

          // Generate tất cả giờ bị block
          const blockedHours = [];
          for (let h = startHour; h < endHour; h++) {
            const timeSlot = h.toString().padStart(2, "0") + ":00";
            blockedHours.push(timeSlot);
          }

          return blockedHours;
        })
        .flat(); // Flatten array

      return bookedTimes;
    } catch (error) {
      console.error("❌ Error getting booked slots:", error);
      return [];
    } finally {
      setLoadingBookedSlots(false);
    }
  };

  // 🆕 THÊM: Load booked slots khi ngày thay đổi
  useEffect(() => {
    const loadBookedSlots = async () => {
      if (photographerId && selectedDate) {
        const booked = await getBookedSlotsForDate(
          photographerId,
          selectedDate
        );
        setBookedSlots(booked);
      }
    };

    loadBookedSlots();
  }, [photographerId, selectedDate]);

  // Check authentication khi component mount
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Vui lòng đăng nhập để đặt lịch chụp ảnh",
        [
          {
            text: "Đăng nhập",
            onPress: () => navigation.navigate("Login"),
          },
          {
            text: "Hủy",
            style: "cancel",
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  }, [isAuthenticated, navigation]);

  const allTimes = [
    "06:00",
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
    "21:00",
    "22:00",
  ];

  // Safe data extraction từ photographer object
  const photographerName =
    photographer?.fullName || photographer?.name || "Unknown Photographer";
  const photographerAvatar = photographer?.profileImage || photographer?.avatar;
  const photographerRate = photographer?.hourlyRate || 0;
  const photographerSpecialty =
    photographer?.specialty || "Professional Photographer";

  // Helper functions
  const formatDate = (d: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    if (d.toDateString() === today.toDateString()) {
      return "Hôm nay";
    } else if (d.toDateString() === tomorrow.toDateString()) {
      return "Ngày mai";
    } else {
      return d.toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      });
    }
  };

  const formatPrice = (price: number | undefined): string => {
    if (price === undefined || isNaN(price)) return "Liên hệ";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // 🆕 THÊM: Helper để convert JS date sang backend dayOfWeek
  const getDateDayOfWeek = (date: Date): DayOfWeek => {
    const jsDay = date.getDay();

    return jsDay as DayOfWeek;
  };

  // 🆕 UPDATE: getFilteredTimes với availability + booked slots
  const getFilteredTimes = () => {
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    const selectedDayOfWeek = getDateDayOfWeek(selectedDate);

    // Tìm availability cho ngày được chọn
    const dayAvailability = photographerSchedule.find(
      (av) => av.dayOfWeek === selectedDayOfWeek && av.status === "Available"
    );

    if (!dayAvailability) {
      return [];
    }

    // Parse thời gian từ API (format: "18:00:00")
    const startHour = parseInt(dayAvailability.startTime.split(":")[0]);
    const endHour = parseInt(dayAvailability.endTime.split(":")[0]);

    // Generate available times từ availability
    const availableTimes = [];
    for (let hour = startHour; hour < endHour; hour++) {
      const timeStr = hour.toString().padStart(2, "0") + ":00";
      availableTimes.push(timeStr);
    }

    // 🆕 THÊM: Filter out booked slots
    const unbookedTimes = availableTimes.filter((time) => {
      const isBooked = bookedSlots.includes(time);

      return !isBooked;
    });

    // Filter past times if today
    if (isToday) {
      const nowHour = today.getHours();

      const finalTimes = unbookedTimes.filter((time) => {
        const [h] = time.split(":").map(Number);
        const isFuture = h > nowHour;

        return isFuture;
      });

      return finalTimes;
    }

    return unbookedTimes;
  };

  const getEndTimeOptions = () => {
    if (!selectedStartTime) return [];
    const availableTimes = getFilteredTimes();
    const startIndex = availableTimes.indexOf(selectedStartTime);
    return availableTimes.slice(startIndex + 1);
  };

  // Event handlers
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedStartTime("");
    setSelectedEndTime("");
    setShowDatePicker(false);
  };

  const handleLocationSelect = (location: any) => {

    if (location && (location.id || location.locationId)) {
      const validLocation = {
        ...location,
        id: location.id || location.locationId, 
      };
      setSelectedLocation(validLocation);
    } else {
      console.warn('⚠️ Location selected without valid ID:', location);
      setSelectedLocation(null);
    }
    setShowLocationPicker(false);
  };

  const handleStartTimeSelect = (time: string) => {
    setSelectedStartTime(time);
    // Reset end time if it's before new start time
    const availableTimes = getFilteredTimes();
    if (
      selectedEndTime &&
      availableTimes.indexOf(selectedEndTime) <= availableTimes.indexOf(time)
    ) {
      setSelectedEndTime("");
    }
  };

  const handleEndTimeSelect = (time: string) => {
    setSelectedEndTime(time);
  };

  // Effects for price calculation
  useEffect(() => {
    const calculateAndSetPrice = async () => {

          // ✅ FIX 1: Thêm RETURN khi validation fail
    if (!selectedStartTime || !selectedEndTime || !photographerId) {
      console.log('⏭️ Skipping price calculation - missing required data:', {
        selectedStartTime,
        selectedEndTime,
        photographerId
      });
      return;
    }

      // ✅ FIX 2: Validate photographerId type
      if (typeof photographerId !== 'number' || photographerId <= 0) {
        console.warn('⚠️ Invalid photographerId:', photographerId);
        return;
      }






      const dateString = selectedDate.toISOString().split('T')[0];
      const [startHour, startMinute] = selectedStartTime.split(':').map(Number);
      const [endHour, endMinute] = selectedEndTime.split(':').map(Number);
  
      const startDateTimeString = `${dateString}T${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}:00`;
      const endDateTimeString = `${dateString}T${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;
        
      try {
         // ✅ FIX 3: Validate locationId trước khi sử dụng

         const locationId = selectedLocation?.id || selectedLocation?.locationId;
         const isValidLocationId = locationId && typeof locationId === 'number' && locationId > 0;
         console.log('🔍 Price calculation params:', {
          photographerId,
          locationId,
          isValidLocationId,
          selectedLocation: selectedLocation ? { 
            id: selectedLocation.id, 
            locationId: selectedLocation.locationId,
            name: selectedLocation.name 
          } : null
        });


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
              if (isValidLocationId) {
                console.log('✅ Calling checkAvailability WITH location:', locationId);
                await checkAvailability(
                  photographerId,
                  startDateTimeString,
                  endDateTimeString,
                  locationId
                );
              } else {
                console.log('✅ Calling checkAvailability WITHOUT location');
                await checkAvailability(
                  photographerId,
                  startDateTimeString,
                  endDateTimeString
                  // ❌ KHÔNG truyền undefined: , undefined
                );
              }
            }
          } else {
            // Create mode → Clear local availability, use hook's result
            console.log('📝 Create mode: Normal availability check');
            setLocalAvailability(null);
            if (isValidLocationId) {
              console.log('✅ Calling checkAvailability WITH location:', locationId);
              await checkAvailability(
                photographerId,
                startDateTimeString,
                endDateTimeString,
                locationId
              );
            } else {
              console.log('✅ Calling checkAvailability WITHOUT location');
              await checkAvailability(
                photographerId,
                startDateTimeString,
                endDateTimeString
                // ❌ KHÔNG truyền undefined: , undefined
              );
            }
          }

          // ✅ FIX 6: Price calculation cũng conditional
          let calculatePriceResult;
          if (isValidLocationId) {
            console.log('✅ Calling calculatePrice WITH location:', locationId);
            calculatePriceResult = await calculatePrice(
              photographerId,
              startDateTimeString,
              endDateTimeString,
              locationId
            );
          } else {
            console.log('✅ Calling calculatePrice WITHOUT location');
            calculatePriceResult = await calculatePrice(
              photographerId,
              startDateTimeString,
              endDateTimeString
              // ❌ KHÔNG truyền undefined: , undefined
            );
          }

          if (calculatePriceResult) {
            const startDateObj = new Date(startDateTimeString);
            const endDateObj = new Date(endDateTimeString);
            const duration = (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60);
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
        }
      
    };

    calculateAndSetPrice();
  }, [selectedStartTime, selectedEndTime, selectedLocation, selectedDate, photographerId, isEditMode, existingBookingData, checkAvailability, calculatePrice]);


  const handleSubmitBooking = async () => {
    // Basic validation
    if (!photographerId) {
      Alert.alert("Lỗi", "Thông tin photographer không hợp lệ");
      return;
    }

    if (!selectedStartTime || !selectedEndTime) {
      Alert.alert("Lỗi", "Vui lòng chọn thời gian bắt đầu và kết thúc");
      return;
    }

    if (!availability?.available) {
      Alert.alert(
        "Không khả dụng",
        "Photographer không rảnh trong khung giờ này."
      );
      return;
    }

    if (!isAuthenticated || !user?.id) {
      Alert.alert("Lỗi", "Vui lòng đăng nhập để đặt lịch");
      return;
    }

    try {
      const dateString = selectedDate.toISOString().split("T")[0];
      const [startHour, startMinute] = selectedStartTime.split(":").map(Number);
      const [endHour, endMinute] = selectedEndTime.split(":").map(Number);

      const startDateTimeString = `${dateString}T${startHour
        .toString()
        .padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}:00`;
      const endDateTimeString = `${dateString}T${endHour
        .toString()
        .padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00`;

      if (isEditMode && existingBookingId) {
        // UPDATE MODE: Cập nhật booking hiện tại

        const updateData = {
          startDatetime: startDateTimeString,
          endDatetime: endDateTimeString,
          ...(specialRequests && { specialRequests }),
        };

        const updatedBooking = await updateBooking(
          existingBookingId,
          updateData
        );

        if (!updatedBooking) {
          Alert.alert("Lỗi", "Không thể cập nhật booking. Vui lòng thử lại.");
          return;
        }

        // Navigate back với booking đã update
        navigation.navigate("OrderDetail", {
          bookingId: existingBookingId,
          photographer: {
            photographerId: photographer.photographerId,
            fullName:
              photographer.fullName ||
              photographer.name ||
              "Unknown Photographer",
            profileImage: photographer.profileImage || photographer.avatar,
            hourlyRate: photographer.hourlyRate,
          },
          selectedDate: selectedDate.toISOString(),
          selectedStartTime,
          selectedEndTime,
          selectedLocation: selectedLocation
            ? {
                id: selectedLocation.locationId,
                name: selectedLocation.name,
                hourlyRate: selectedLocation.hourlyRate,
              }
            : undefined,
          specialRequests: specialRequests || undefined,
          priceCalculation: priceCalculation || {
            totalPrice: 0,
            photographerFee: 0,
            locationFee: 0,
            duration: 0,
            breakdown: {
              baseRate: 0,
              locationRate: 0,
              additionalFees: [],
            },
          },
        });
      } else {
        // CREATE MODE: Tạo booking mới
        const bookingData: CreateBookingRequest = {
          photographerId: photographerId,
          startDatetime: startDateTimeString,
          endDatetime: endDateTimeString,
          ...(selectedLocation?.id && { locationId: selectedLocation.id }),
          ...(specialRequests && { specialRequests }),
        };

        const createdBooking = await createBooking(user.id, bookingData);

        if (!createdBooking) {
          Alert.alert("Lỗi", "Không thể tạo booking. Vui lòng thử lại.");
          return;
        }

        navigation.navigate("OrderDetail", {
          bookingId: createdBooking.id || createdBooking.bookingId,
          photographer: {
            photographerId: photographer.photographerId,
            fullName:
              photographer.fullName ||
              photographer.name ||
              "Unknown Photographer",
            profileImage: photographer.profileImage || photographer.avatar,
            hourlyRate: photographer.hourlyRate,
          },
          selectedDate: selectedDate.toISOString(),
          selectedStartTime,
          selectedEndTime,
          selectedLocation: selectedLocation
            ? {
                id: selectedLocation.locationId,
                name: selectedLocation.name,
                hourlyRate: selectedLocation.hourlyRate,
              }
            : undefined,
          specialRequests: specialRequests || undefined,
          priceCalculation: priceCalculation || {
            totalPrice: 0,
            photographerFee: 0,
            locationFee: 0,
            duration: 0,
            breakdown: {
              baseRate: 0,
              locationRate: 0,
              additionalFees: [],
            },
          },
        });
      }
    } catch (error) {
      console.error("❌ Error in booking operation:", error);
      const isConflictError =
        (error as any).status === 409 ||
        (error as any).message?.toLowerCase().includes("not available") ||
        (error as any).message?.toLowerCase().includes("conflict") ||
        (error as any).message?.toLowerCase().includes("unavailable") ||
        (error as any).message?.toLowerCase().includes("slot");

      if (isConflictError && !isEditMode) {
        // ✅ THÊM: Show cleanup dialog
        Alert.alert(
          "Khung giờ không khả dụng ⏰",
          "Có thể có booking cũ chưa được xử lý. Bạn có muốn thử làm mới và đặt lại không?",
          [
            {
              text: "Chọn giờ khác",
              style: "cancel",
            },
            {
              text: "Thử lại",
              onPress: () => handleCleanupAndRetry(),
            },
          ]
        );
      } else {
        // ✅ THÊM: Other errors
        Alert.alert(
          "Lỗi đặt lịch",
          (error as any).message ||
            "Có lỗi xảy ra khi đặt lịch. Vui lòng thử lại.",
          [{ text: "OK" }]
        );
      }
    }
  };

  const handleCleanupAndRetry = async () => {
    try {
      // Kiểm tra photographerId có tồn tại không
      if (!photographerId) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin photographer");
        return;
      }

      // Prepare booking data
      const dateString = selectedDate.toISOString().split("T")[0];
      const [startHour, startMinute] = selectedStartTime.split(":").map(Number);
      const [endHour, endMinute] = selectedEndTime.split(":").map(Number);

      const startDateTimeString = `${dateString}T${startHour
        .toString()
        .padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}:00`;
      const endDateTimeString = `${dateString}T${endHour
        .toString()
        .padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}:00`;

      const bookingData: CreateBookingRequest = {
        photographerId: photographerId, // Đã được kiểm tra không null ở trên
        startDatetime: startDateTimeString,
        endDatetime: endDateTimeString,
        ...(selectedLocation?.id && { locationId: selectedLocation.id }),
        ...(specialRequests && { specialRequests }),
      };

      if (!photographerId) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin photographer");
        return;
      }
      if (!user) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin user");
        return;
      }

      // ✅ THÊM: Use cleanup service
      const createdBooking = await cleanupService.cleanupAndRetryBooking(() =>
        createBooking(user.id, bookingData)
      );

      // Add null check
      if (!createdBooking) {
        Alert.alert("Lỗi", "Không thể tạo đơn đặt lịch. Vui lòng thử lại sau.");
        return;
      }

      // ✅ THÊM: Success after cleanup
      Alert.alert(
        "Đặt lịch thành công! 🎉",
        "Đã đặt lịch thành công sau khi làm mới dữ liệu.",
        [
          {
            text: "OK",
            onPress: () =>
              navigation.navigate("OrderDetail", {
                bookingId: createdBooking.id || createdBooking.bookingId,
                photographer: {
                  photographerId: photographer.photographerId,
                  fullName:
                    photographer.fullName ||
                    photographer.name ||
                    "Unknown Photographer",
                  profileImage:
                    photographer.profileImage || photographer.avatar,
                  hourlyRate: photographer.hourlyRate,
                },
                selectedDate: selectedDate.toISOString(),
                selectedStartTime,
                selectedEndTime,
                selectedLocation: selectedLocation
                  ? {
                      id: selectedLocation.locationId,
                      name: selectedLocation.name,
                      hourlyRate: selectedLocation.hourlyRate,
                    }
                  : undefined,
                specialRequests: specialRequests || undefined,
                priceCalculation: priceCalculation || {
                  totalPrice: 0,
                  photographerFee: 0,
                  locationFee: 0,
                  duration: 0,
                  breakdown: {
                    baseRate: 0,
                    locationRate: 0,
                    additionalFees: [],
                  },
                },
              }),
          },
        ]
      );

      // ✅ THÊM: Success after cleanup
      Alert.alert(
        "Đặt lịch thành công! 🎉",
        "Đã đặt lịch thành công sau khi làm mới dữ liệu.",
        [
          {
            text: "OK",
            onPress: () =>
              navigation.navigate("OrderDetail", {
                bookingId: createdBooking.id || createdBooking.bookingId,
                photographer: {
                  photographerId: photographer.photographerId,
                  fullName:
                    photographer.fullName ||
                    photographer.name ||
                    "Unknown Photographer",
                  profileImage:
                    photographer.profileImage || photographer.avatar,
                  hourlyRate: photographer.hourlyRate,
                },
                selectedDate: selectedDate.toISOString(),
                selectedStartTime,
                selectedEndTime,
                selectedLocation: selectedLocation
                  ? {
                      id: selectedLocation.locationId,
                      name: selectedLocation.name,
                      hourlyRate: selectedLocation.hourlyRate,
                    }
                  : undefined,
                specialRequests: specialRequests || undefined,
                priceCalculation: priceCalculation || {
                  totalPrice: 0,
                  photographerFee: 0,
                  locationFee: 0,
                  duration: 0,
                  breakdown: {
                    baseRate: 0,
                    locationRate: 0,
                    additionalFees: [],
                  },
                },
              }),
          },
        ]
      );
    } catch (retryError) {
      console.error("❌ Cleanup retry failed:", retryError);
      Alert.alert(
        "Vẫn không thể đặt lịch ❌",
        "Khung giờ này thực sự đã có người đặt hoặc có vấn đề khác. Vui lòng chọn khung giờ khác.",
        [{ text: "OK" }]
      );
    }
  };

  // Dynamic variables based on mode
  const buttonText =
    creating || updating
      ? isEditMode
        ? "Đang cập nhật..."
        : "Đang tạo..."
      : isEditMode
      ? "Cập nhật lịch"
      : "Xác nhận đặt lịch";

  const headerTitle = isEditMode ? "Chỉnh sửa lịch" : "Đặt lịch chụp";

  // 🆕 UPDATE: Check if form is ready for submission (bỏ availability check)
  const isFormValid =
    photographerId &&
    selectedStartTime &&
    selectedEndTime &&
    !creating &&
    !updating;

  // Modal Components

  const LocationModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showLocationPicker}
      onRequestClose={() => setShowLocationPicker(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: getResponsiveSize(20),
            borderTopRightRadius: getResponsiveSize(20),
            paddingTop: getResponsiveSize(20),
            paddingHorizontal: getResponsiveSize(20),
            paddingBottom: getResponsiveSize(40),
            maxHeight: "70%",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: getResponsiveSize(20),
            }}
          >
            <Text
              style={{
                fontSize: getResponsiveSize(18),
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Chọn địa điểm
            </Text>
            <TouchableOpacity
              onPress={() => setShowLocationPicker(false)}
              style={{
                backgroundColor: "#f5f5f5",
                borderRadius: getResponsiveSize(20),
                padding: getResponsiveSize(8),
              }}
            >
              <AntDesign
                name="close"
                size={getResponsiveSize(18)}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {locationsLoading ? (
              <Text
                style={{
                  textAlign: "center",
                  color: "#666",
                  padding: getResponsiveSize(20),
                }}
              >
                Đang tải...
              </Text>
            ) : locations.length === 0 ? (
              <Text
                style={{
                  textAlign: "center",
                  color: "#666",
                  padding: getResponsiveSize(20),
                }}
              >
                Không có địa điểm nào
              </Text>
            ) : (
              locations.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  onPress={() => handleLocationSelect(location)}
                  style={{
                    backgroundColor:
                      selectedLocation?.id === location.id ? "#fff" : "#f8f9fa",
                    borderRadius: getResponsiveSize(12),
                    marginBottom: getResponsiveSize(12),
                    borderWidth: selectedLocation?.id === location.id ? 2 : 1,
                    borderColor:
                      selectedLocation?.id === location.id
                        ? "#E91E63"
                        : "#e0e0e0",
                    padding: getResponsiveSize(15),
                  }}
                >
                  <Text
                    style={{
                      fontSize: getResponsiveSize(16),
                      fontWeight: "bold",
                      color: "#333",
                      marginBottom: getResponsiveSize(4),
                    }}
                  >
                    {location?.name || "Không có tên"}
                  </Text>
                  <Text
                    style={{
                      fontSize: getResponsiveSize(14),
                      color: "#666",
                    }}
                  >
                    {location?.address || "Địa chỉ chưa cập nhật"}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingTop: getResponsiveSize(50),
          paddingHorizontal: getResponsiveSize(20),
          paddingBottom: getResponsiveSize(20),
          elevation: 2,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              backgroundColor: "#f5f5f5",
              borderRadius: getResponsiveSize(12),
              padding: getResponsiveSize(10),
            }}
          >
            <AntDesign
              name="arrowleft"
              size={getResponsiveSize(24)}
              color="#333"
            />
          </TouchableOpacity>

          <Text
            style={{
              fontSize: getResponsiveSize(20),
              fontWeight: "bold",
              color: "#333",
            }}
          >
            {headerTitle}
          </Text>

          <View style={{ width: getResponsiveSize(44) }} />
        </View>

        {/* Photographer Info */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginTop: getResponsiveSize(20),
            backgroundColor: "#f8f9fa",
            borderRadius: getResponsiveSize(12),
            padding: getResponsiveSize(15),
          }}
        >
          <Image
            source={{ uri: photographerAvatar }}
            style={{
              width: getResponsiveSize(50),
              height: getResponsiveSize(50),
              borderRadius: getResponsiveSize(25),
              marginRight: getResponsiveSize(15),
            }}
          />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: getResponsiveSize(16),
                fontWeight: "bold",
                color: "#333",
              }}
            >
              {photographerName}
            </Text>
            <Text
              style={{
                fontSize: getResponsiveSize(14),
                color: "#666",
              }}
            >
              {photographerSpecialty}
            </Text>
          </View>
          <Text
            style={{
              fontSize: getResponsiveSize(16),
              fontWeight: "bold",
              color: "#E91E63",
            }}
          >
            {formatPrice(photographerRate)}/h
          </Text>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: getResponsiveSize(20) }}>
          {/* Date Selection */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: getResponsiveSize(16),
              padding: getResponsiveSize(20),
              marginBottom: getResponsiveSize(15),
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: getResponsiveSize(15),
              }}
            >
              <Feather
                name="calendar"
                size={getResponsiveSize(20)}
                color="#E91E63"
              />
              <Text
                style={{
                  fontSize: getResponsiveSize(16),
                  fontWeight: "bold",
                  color: "#333",
                  marginLeft: getResponsiveSize(10),
                }}
              >
                Chọn ngày
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={{
                backgroundColor: "#f8f9fa",
                borderRadius: getResponsiveSize(12),
                padding: getResponsiveSize(15),
                borderWidth: 1,
                borderColor: "#e0e0e0",
              }}
            >
              <Text
                style={{
                  fontSize: getResponsiveSize(16),
                  fontWeight: "bold",
                  color: "#E91E63",
                }}
              >
                {formatDate(selectedDate)}
              </Text>
              <Text
                style={{
                  fontSize: getResponsiveSize(14),
                  color: "#666",
                  marginTop: getResponsiveSize(2),
                }}
              >
                {selectedDate.toLocaleDateString("vi-VN", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Time Selection */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: getResponsiveSize(16),
              padding: getResponsiveSize(20),
              marginBottom: getResponsiveSize(15),
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: getResponsiveSize(15),
              }}
            >
              <Feather
                name="clock"
                size={getResponsiveSize(20)}
                color="#E91E63"
              />
              <Text
                style={{
                  fontSize: getResponsiveSize(16),
                  fontWeight: "bold",
                  color: "#333",
                  marginLeft: getResponsiveSize(10),
                }}
              >
                Chọn thời gian
              </Text>
              {(availabilityLoading || loadingBookedSlots) && (
                <Text
                  style={{
                    fontSize: getResponsiveSize(12),
                    color: "#E91E63",
                    marginLeft: "auto",
                  }}
                >
                  Đang tải...
                </Text>
              )}
            </View>

            {/* 🆕 THÊM: Hiển thị thông báo nếu không có lịch */}
            {!availabilityLoading &&
              !loadingBookedSlots &&
              getFilteredTimes().length === 0 && (
                <View
                  style={{
                    backgroundColor: "#FFF3F3",
                    borderRadius: getResponsiveSize(12),
                    padding: getResponsiveSize(15),
                    marginBottom: getResponsiveSize(15),
                    borderWidth: 1,
                    borderColor: "#F44336",
                  }}
                >
                  <Text
                    style={{
                      color: "#C62828",
                      fontSize: getResponsiveSize(14),
                    }}
                  >
                    Photographer không có lịch rảnh vào ngày này
                  </Text>
                </View>
              )}

            {/* Start Time */}
            <Text
              style={{
                fontSize: getResponsiveSize(14),
                color: "#666",
                marginBottom: getResponsiveSize(10),
              }}
            >
              Giờ bắt đầu
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: getResponsiveSize(15) }}
            >
              {getFilteredTimes().map((time) => (
                <TouchableOpacity
                  key={time}
                  onPress={() => handleStartTimeSelect(time)}
                  style={{
                    backgroundColor:
                      selectedStartTime === time ? "#E91E63" : "#f8f9fa",
                    borderRadius: getResponsiveSize(20),
                    paddingVertical: getResponsiveSize(12),
                    paddingHorizontal: getResponsiveSize(20),
                    marginRight: getResponsiveSize(10),
                    borderWidth: 1,
                    borderColor:
                      selectedStartTime === time ? "#E91E63" : "#e0e0e0",
                  }}
                >
                  <Text
                    style={{
                      color: selectedStartTime === time ? "#fff" : "#333",
                      fontWeight:
                        selectedStartTime === time ? "bold" : "normal",
                      fontSize: getResponsiveSize(14),
                    }}
                  >
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* End Time */}
            {selectedStartTime && (
              <>
                <Text
                  style={{
                    fontSize: getResponsiveSize(14),
                    color: "#666",
                    marginBottom: getResponsiveSize(10),
                  }}
                >
                  Giờ kết thúc
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {getEndTimeOptions().map((time) => (
                    <TouchableOpacity
                      key={time}
                      onPress={() => handleEndTimeSelect(time)}
                      style={{
                        backgroundColor:
                          selectedEndTime === time ? "#E91E63" : "#f8f9fa",
                        borderRadius: getResponsiveSize(20),
                        paddingVertical: getResponsiveSize(12),
                        paddingHorizontal: getResponsiveSize(20),
                        marginRight: getResponsiveSize(10),
                        borderWidth: 1,
                        borderColor:
                          selectedEndTime === time ? "#E91E63" : "#e0e0e0",
                      }}
                    >
                      <Text
                        style={{
                          color: selectedEndTime === time ? "#fff" : "#333",
                          fontWeight:
                            selectedEndTime === time ? "bold" : "normal",
                          fontSize: getResponsiveSize(14),
                        }}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Availability Status */}
            {availability && selectedStartTime && selectedEndTime && (
              <View
                style={{
                  marginTop: getResponsiveSize(15),
                  padding: getResponsiveSize(12),
                  borderRadius: getResponsiveSize(8),
                  backgroundColor: availability.available
                    ? "#E8F5E8"
                    : "#FFF3F3",
                  borderWidth: 1,
                  borderColor: availability.available ? "#4CAF50" : "#F44336",
                }}
              >
                <Text
                  style={{
                    color: availability.available ? "#2E7D32" : "#C62828",
                    fontSize: getResponsiveSize(14),
                    fontWeight: "bold",
                  }}
                >
                  {availability.available
                    ? "✓ Có thể đặt lịch"
                    : "✗ Không khả dụng"}
                </Text>
              </View>
            )}
          </View>

          {/* Location Selection */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: getResponsiveSize(16),
              padding: getResponsiveSize(20),
              marginBottom: getResponsiveSize(15),
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: getResponsiveSize(15),
              }}
            >
              <Feather
                name="map-pin"
                size={getResponsiveSize(20)}
                color="#E91E63"
              />
              <Text
                style={{
                  fontSize: getResponsiveSize(16),
                  fontWeight: "bold",
                  color: "#333",
                  marginLeft: getResponsiveSize(10),
                }}
              >
                Địa điểm
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => setShowLocationPicker(true)}
              style={{
                backgroundColor: "#f8f9fa",
                borderRadius: getResponsiveSize(12),
                padding: getResponsiveSize(15),
                borderWidth: 1,
                borderColor: "#e0e0e0",
              }}
            >
              <Text
                style={{
                  fontSize: getResponsiveSize(16),
                  color: selectedLocation ? "#333" : "#999",
                }}
              >
                {selectedLocation
                  ? selectedLocation.name
                  : "Chọn địa điểm (tùy chọn)"}
              </Text>
              {selectedLocation && (
                <Text
                  style={{
                    fontSize: getResponsiveSize(14),
                    color: "#666",
                    marginTop: getResponsiveSize(2),
                  }}
                >
                  {selectedLocation.address}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Special Requests */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: getResponsiveSize(16),
              padding: getResponsiveSize(20),
              marginBottom: getResponsiveSize(15),
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: getResponsiveSize(15),
              }}
            >
              <Feather
                name="edit-3"
                size={getResponsiveSize(20)}
                color="#E91E63"
              />
              <Text
                style={{
                  fontSize: getResponsiveSize(16),
                  fontWeight: "bold",
                  color: "#333",
                  marginLeft: getResponsiveSize(10),
                }}
              >
                Ghi chú đặc biệt
              </Text>
            </View>

            <TextInput
              value={specialRequests}
              onChangeText={setSpecialRequests}
              placeholder="Nhập yêu cầu đặc biệt của bạn..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                backgroundColor: "#f8f9fa",
                borderRadius: getResponsiveSize(12),
                padding: getResponsiveSize(15),
                fontSize: getResponsiveSize(14),
                color: "#333",
                borderWidth: 1,
                borderColor: "#e0e0e0",
                minHeight: getResponsiveSize(100),
                maxHeight: getResponsiveSize(150),
              }}
            />

            <Text
              style={{
                fontSize: getResponsiveSize(12),
                color: "#666",
                marginTop: getResponsiveSize(8),
              }}
            >
              Ví dụ: Phong cách chụp, góc độ yêu thích, số lượng ảnh mong
              muốn...
            </Text>

          </View>

          {/* Price Summary */}
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: getResponsiveSize(16),
              padding: getResponsiveSize(20),
              marginBottom: getResponsiveSize(20),
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: getResponsiveSize(15),
              }}
            >
              <MaterialIcons
                name="receipt"
                size={getResponsiveSize(20)}
                color="#E91E63"
              />
              <Text
                style={{
                  fontSize: getResponsiveSize(16),
                  fontWeight: "bold",
                  color: "#333",
                  marginLeft: getResponsiveSize(10),
                }}
              >
                Tổng chi phí
              </Text>
              {calculatingPrice && (
                <Text
                  style={{
                    fontSize: getResponsiveSize(12),
                    color: "#E91E63",
                    marginLeft: "auto",
                  }}
                >
                  Đang tính...
                </Text>
              )}
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: getResponsiveSize(10),
              }}
            >
              <Text style={{ fontSize: getResponsiveSize(16), color: "#333" }}>
                {priceCalculation?.duration
                  ? `${priceCalculation.duration.toFixed(1)} giờ`
                  : "0 giờ"}
              </Text>
              <Text style={{ fontSize: getResponsiveSize(16), color: "#333" }}>
                {priceCalculation?.photographerFee !== undefined &&
                priceCalculation?.duration
                  ? `${formatPrice(
                      priceCalculation.photographerFee /
                        Math.max(1, priceCalculation.duration)
                    )}/giờ`
                  : "Liên hệ"}
              </Text>
            </View>

            {priceCalculation?.locationFee ? (
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  marginBottom: getResponsiveSize(10),
                }}
              >
                <Text
                  style={{ fontSize: getResponsiveSize(14), color: "#666" }}
                >
                  Phí địa điểm:
                </Text>
                <Text
                  style={{ fontSize: getResponsiveSize(14), color: "#666" }}
                >
                  {formatPrice(priceCalculation.locationFee)}
                </Text>
              </View>
            ) : null}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                borderTopWidth: 1,
                borderTopColor: "#eee",
                paddingTop: getResponsiveSize(10),
                marginTop: getResponsiveSize(5),
              }}
            >
              <Text
                style={{
                  fontSize: getResponsiveSize(16),
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                Tổng cộng:
              </Text>
              <Text
                style={{
                  fontSize: getResponsiveSize(18),
                  fontWeight: "bold",
                  color: "#E91E63",
                }}
              >
                {priceCalculation?.totalPrice
                  ? formatPrice(priceCalculation.totalPrice)
                  : "Liên hệ"}
              </Text>
            </View>
          </View>

          {/* Booking Button */}
          <TouchableOpacity
            onPress={handleSubmitBooking}
            disabled={!isFormValid}
            style={{
              backgroundColor: isFormValid ? "#E91E63" : "#ccc",
              borderRadius: getResponsiveSize(16),
              padding: getResponsiveSize(18),
              alignItems: "center",
              marginBottom: getResponsiveSize(20),
              elevation: isFormValid ? 3 : 0,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: getResponsiveSize(16),
                fontWeight: "bold",
              }}
            >
              {buttonText}
            </Text>
          </TouchableOpacity>

          {/* 🆕 THÊM: Debug Info cho development */}
          {__DEV__ && (
            <View
              style={{
                backgroundColor: "#f0f0f0",
                padding: getResponsiveSize(10),
                borderRadius: getResponsiveSize(8),
                marginBottom: getResponsiveSize(10),
              }}
            >
              <Text style={{ fontSize: getResponsiveSize(12), color: "#666" }}>
                Debug: photographerId={photographerId}, rate={photographerRate}
              </Text>
              <Text style={{ fontSize: getResponsiveSize(12), color: "#666" }}>
                Availability: {photographerSchedule.length} slots, Loading:{" "}
                {availabilityLoading.toString()}
              </Text>
              <Text style={{ fontSize: getResponsiveSize(12), color: "#666" }}>
                Booked slots: [{bookedSlots.join(", ")}], Loading:{" "}
                {loadingBookedSlots.toString()}
              </Text>
              <Text style={{ fontSize: getResponsiveSize(12), color: "#666" }}>
                Available times: [{getFilteredTimes().join(", ")}]
              </Text>
              <Text style={{ fontSize: getResponsiveSize(12), color: "#666" }}>
                Selected: {selectedStartTime} - {selectedEndTime}
              </Text>
              <Text style={{ fontSize: getResponsiveSize(12), color: "#666" }}>
                Edit mode: {isEditMode ? "Yes" : "No"}, Booking ID:{" "}
                {existingBookingId || "None"}
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
      {/* Error Display */}
      {error && (
        <View
          style={{
            position: "absolute",
            top: getResponsiveSize(100),
            left: getResponsiveSize(20),
            right: getResponsiveSize(20),
            backgroundColor: "#F44336",
            borderRadius: getResponsiveSize(8),
            padding: getResponsiveSize(15),
            elevation: 5,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: getResponsiveSize(14),
              textAlign: "center",
            }}
          >
            {error}
          </Text>
        </View>
      )}

      <TouchableOpacity
        onPress={async () => {
          try {
            const success = await cleanupService.manualCleanup();
            if (success) {
              Alert.alert("Success", "Cleaned up pending bookings!");
              // Reload booked slots
              const booked = await getBookedSlotsForDate(
                photographerId,
                selectedDate
              );
              setBookedSlots(booked);
            }
          } catch (error) {
            Alert.alert("Error", "Cleanup failed");
          }
        }}
        style={{
          backgroundColor: "#FF6B35",
          padding: getResponsiveSize(8),
          borderRadius: getResponsiveSize(4),
          marginTop: getResponsiveSize(8),
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: getResponsiveSize(12),
            textAlign: "center",
          }}
        >
          🧹 Cleanup Pending Bookings
        </Text>
      </TouchableOpacity>
    </View>
  );
}