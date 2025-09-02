import { View, Text, Alert, TouchableOpacity, ScrollView, ActivityIndicator, TextInput, Image } from "react-native";
import React, { useEffect, useState } from "react";
import { useNavigation, useRoute } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { useAuth } from "../../hooks/useAuth";
import { useAvailability } from "../../hooks/useAvailability";
import { getResponsiveSize } from "../../utils/responsive";
import { AntDesign, Feather } from "@expo/vector-icons";
import { useApprovedPhotographers, useEventBooking } from "../../hooks/useEvent";
import { EventBookingRequest } from "../../types/event";

interface RouteParams {
  event: {
    eventId: number;
    name: string;
    startDate: string;
    endDate: string;
    locationName?: string;
    discountedPrice?: number;
    originalPrice?: number;
    description?: string;
  };
  preSelectedPhotographer?: {
    eventPhotographerId: number;
    photographerId: number;
    photographerName?: string;
    profileImage?: string;
    specialRate?: number;
  };
}

interface EventDay {
  date: string;
  displayText: string;
  startTime: string;
  endTime: string;
  isToday: boolean;
}

// Thêm helper functions sau các imports
const isMultiDayEvent = (startDate: string, endDate: string): boolean => {
  console.log("🔍 isMultiDayEvent check:", { startDate, endDate });

  const start = new Date(startDate);
  const end = new Date(endDate);

  const startDay = start.toDateString();
  const endDay = end.toDateString();

  console.log("🔍 Date strings:", { startDay, endDay });

  const result = startDay !== endDay;
  console.log("🔍 isMultiDayEvent result:", result);

  return result;
};

// SỬA CÁC LỖI TYPESCRIPT:

const generateEventDays = (startDate: string, endDate: string): EventDay[] => {
  console.log("🌍 generateEventDays input:", { startDate, endDate });

  const startDateOnly = startDate.split('T')[0];
  const endDateOnly = endDate.split('T')[0];

  // LẤY NGÀY HÔM NAY THEO MÚI GIỜ VIỆT NAM
  const todayVN = new Date().toLocaleString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).split(',')[0];

  console.log("📅 Today VN:", todayVN);

  // ✅ PARSE THỜI GIAN SỰ KIỆN CHÍNH
  const eventStartTime = new Date(startDate).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh'
  });

  const eventEndTime = new Date(endDate).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh'
  });

  console.log("🎯 Event time range:", { eventStartTime, eventEndTime });

  const days: EventDay[] = [];

  // Single day event
  if (startDateOnly === endDateOnly) {
    if (startDateOnly < todayVN) {
      console.log("⚠️ Single day event has passed");
      return [];
    }

    const [year, month, day] = startDateOnly.split('-').map(Number);
    const displayText = `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}`;

    return [{
      date: startDateOnly,
      displayText: displayText,
      startTime: eventStartTime, // ✅ DÙNG THỜI GIAN SỰ KIỆN
      endTime: eventEndTime,     // ✅ DÙNG THỜI GIAN SỰ KIỆN
      isToday: startDateOnly === todayVN
    }];
  }

  // Multi-day event
  const [startYear, startMonth, startDay] = startDateOnly.split('-').map(Number);
  const [endYear, endMonth, endDay] = endDateOnly.split('-').map(Number);

  let currentDate = new Date(startYear, startMonth - 1, startDay);
  const endDateObj = new Date(endYear, endMonth - 1, endDay);

  while (currentDate <= endDateObj) {
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();

    const currentDateString = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-${currentDay.toString().padStart(2, '0')}`;

    if (currentDateString >= todayVN) {
      const displayText = `${currentDay.toString().padStart(2, '0')}-${currentMonth.toString().padStart(2, '0')}`;

      // ✅ SỬA: TẤT CẢ NGÀY TRONG SỰ KIỆN NHIỀU NGÀY ĐỀU CÓ CÙNG THỜI GIAN
      const dayStartTime = eventStartTime; // 06:00
      const dayEndTime = eventEndTime;     // 20:00

      console.log(`📅 Adding event day: ${currentDateString}`, {
        displayText,
        dayStartTime,
        dayEndTime,
        isToday: currentDateString === todayVN
      });

      days.push({
        date: currentDateString,
        displayText: displayText,
        startTime: dayStartTime, // ✅ LUÔN LÀ 06:00
        endTime: dayEndTime,     // ✅ LUÔN LÀ 20:00
        isToday: currentDateString === todayVN
      });
    } else {
      console.log(`⏭️ Skipping past date: ${currentDateString} (before ${todayVN})`);
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  console.log("✅ Generated event days with correct times:", days);
  return days;
};

export default function BookingEventScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute();
  const { event, preSelectedPhotographer } = route.params as RouteParams;

  console.log("📥 BookingEvent received params:", {
    event,
    preSelectedPhotographer,
    eventStartDate: event.startDate,
    eventEndDate: event.endDate,
  });

  // Auth hook
  const { user, isAuthenticated } = useAuth();

  // Availability hook for API calls
  const {
    getAvailableTimesForDate,
    getEndTimesForStartTime,
    loadingSlots,
    error: availabilityError,
  } = useAvailability();

  // Event hooks
  const { bookEvent, loading: bookingLoading } = useEventBooking();
  const { photographers, loading: photographersLoading } = useApprovedPhotographers(event.eventId);

  // Multi-day event states
  const [eventDays] = useState<EventDay[]>(() => generateEventDays(event.startDate, event.endDate));
  const [selectedEventDay, setSelectedEventDay] = useState<EventDay | null>(
    eventDays.length === 1 ? eventDays[0] : null
  );
  const [isMultiDay] = useState<boolean>(() => isMultiDayEvent(event.startDate, event.endDate));

  // Form State
  const [selectedStartTime, setSelectedStartTime] = useState<string>("");
  const [selectedEndTime, setSelectedEndTime] = useState<string>("");
  const [selectedPhotographer, setSelectedPhotographer] = useState<any>(preSelectedPhotographer || null);
  const [specialRequests, setSpecialRequests] = useState<string>("");

  // ✅ UPDATED: Available times from API
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [eventFilteredTimes, setEventFilteredTimes] = useState<string[]>([]);
  const [endTimeOptions, setEndTimeOptions] = useState<string[]>([]);

  // Loading states
  const [isProcessing, setIsProcessing] = useState(false);



  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Vui lòng đăng nhập để tham gia sự kiện",
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

  // ✅ FIXED: Load available times and filter by event time range
  // Trong useEffect load available times, sau khi filter theo event time range:
  useEffect(() => {
    const loadAvailableTimesForEvent = async () => {
      if (!selectedPhotographer?.photographerId || !selectedEventDay) {
        setAvailableTimes([]);
        setEventFilteredTimes([]);
        return;
      }

      try {
        console.log("🎪 Loading available times for EVENT photographer:", {
          photographerId: selectedPhotographer.photographerId,
          selectedDay: selectedEventDay.date,
          timeRange: `${selectedEventDay.startTime} - ${selectedEventDay.endTime}`
        });

        const allAvailableTimes = await getAvailableTimesForDate(
          selectedPhotographer.photographerId,
          selectedEventDay.date
        );

        console.log("📋 Raw API Response:", allAvailableTimes);

        // Filter theo time range của ngày
        const dayStartTime = selectedEventDay.startTime;
        const dayEndTime = selectedEventDay.endTime;
        const [dayStartHour, dayStartMinute] = dayStartTime.split(':').map(Number);
        const [dayEndHour, dayEndMinute] = dayEndTime.split(':').map(Number);

        let filteredTimes = allAvailableTimes.filter(time => {
          const [timeHour, timeMinute] = time.split(':').map(Number);
          const timeInMinutes = timeHour * 60 + timeMinute;
          const dayStartInMinutes = dayStartHour * 60 + dayStartMinute;
          const dayEndInMinutes = dayEndHour * 60 + dayEndMinute;
          return timeInMinutes >= dayStartInMinutes && timeInMinutes < dayEndInMinutes;
        });

        console.log("🎯 After event time range filter:", filteredTimes);

        // KIỂM TRA HÔM NAY THEO MÚI GIỜ VIỆT NAM
        const nowVN = new Date().toLocaleString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
        const todayVN = nowVN.split(',')[0]; // "2025-09-02"

        console.log("📅 Vietnam timezone check:", {
          nowVN,
          todayVN,
          selectedDateString: selectedEventDay.date,
          isToday: selectedEventDay.date === todayVN
        });

        // CHỈ FILTER NẾU LÀ HÔM NAY THEO GIỜ VN
        if (selectedEventDay.date === todayVN) {
          console.log("🕐 This is TODAY in Vietnam - filtering past times");

          // ✅ SỬA: Lấy giờ hiện tại theo múi giờ VN đúng cách
          const now = new Date();
          const vnFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Ho_Chi_Minh',
            hour: 'numeric',
            minute: 'numeric',
            hour12: false
          });

          const vnTimeParts = vnFormatter.formatToParts(now);
          const currentHour = parseInt(vnTimeParts.find(part => part.type === 'hour')?.value || '0');
          const currentMinute = parseInt(vnTimeParts.find(part => part.type === 'minute')?.value || '0');

          const currentTimeInMinutes = currentHour * 60 + currentMinute;
          // ✅ BỎ BUFFER: Chỉ filter theo thời gian hiện tại
          const minimumTimeInMinutes = currentTimeInMinutes;

          console.log("⏰ Vietnam current time info:", {
            vnTimeParts,
            currentHour,
            currentMinute,
            currentTime: `${currentHour}:${String(currentMinute).padStart(2, '0')}`,
            currentTimeInMinutes,
            minimumTimeInMinutes,
            minimumBookingTime: `${Math.floor(minimumTimeInMinutes / 60)}:${String(minimumTimeInMinutes % 60).padStart(2, '0')}`
          });

          const beforeFilterCount = filteredTimes.length;
          const beforeFilterTimes = [...filteredTimes];

          filteredTimes = filteredTimes.filter(time => {
            const [timeHour, timeMinute] = time.split(':').map(Number);
            const timeInMinutes = timeHour * 60 + timeMinute;
            // ✅ THAY ĐỔI: >= thành > để chỉ giữ những giờ sau thời điểm hiện tại
            const isValid = timeInMinutes > minimumTimeInMinutes;

            if (!isValid) {
              console.log(`❌ Filtering out past/current time: ${time} (${timeInMinutes} <= ${minimumTimeInMinutes})`);
            } else {
              console.log(`✅ Keeping future time: ${time} (${timeInMinutes} > ${minimumTimeInMinutes})`);
            }

            return isValid;
          });

          console.log("⏰ Final time filtering result:", {
            beforeFilter: beforeFilterCount,
            afterFilter: filteredTimes.length,
            beforeFilterTimes,
            afterFilterTimes: filteredTimes,
            filteredOutTimes: beforeFilterTimes.filter(t => !filteredTimes.includes(t))
          });
        } else {
          console.log("📅 Not today in Vietnam - no time filtering needed");
        }

        setAvailableTimes(allAvailableTimes);
        setEventFilteredTimes(filteredTimes);

        // Reset selected times nếu không còn available
        if (selectedStartTime && !filteredTimes.includes(selectedStartTime)) {
          console.log("🔄 Resetting selected start time - no longer valid");
          setSelectedStartTime("");
          setSelectedEndTime("");
        }

      } catch (error) {
        console.error("❌ Error loading event available times:", error);
        setAvailableTimes([]);
        setEventFilteredTimes([]);
      }
    };

    loadAvailableTimesForEvent();
  }, [selectedPhotographer?.photographerId, selectedEventDay, getAvailableTimesForDate]);

  // Helper functions
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatCurrency = (amount: number | undefined): string => {
    if (amount === undefined || isNaN(amount)) return "Liên hệ";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // ✅ UPDATED: Use event filtered times instead of all available times
  const getEndTimeOptions = () => {
    return endTimeOptions;
  };

  // ✅ SỬA: Load end times theo selectedEventDay
  useEffect(() => {
    const loadEndTimes = async () => {
      if (!selectedStartTime || !selectedPhotographer?.photographerId || !selectedEventDay) { // ✅ THÊM selectedEventDay
        setEndTimeOptions([]);
        return;
      }

      try {
        console.log("🕒 Loading end times for selected start time:", selectedStartTime);

        // ✅ SỬA: Dùng selectedEventDay.date thay vì event.startDate
        const dateString = selectedEventDay.date;

        console.log("📅 Using selected event day for end times:", {
          selectedEventDay: selectedEventDay.date,
          selectedStartTime,
        });

        // ✅ Get end times from API 
        const apiEndTimes = await getEndTimesForStartTime(
          selectedPhotographer.photographerId,
          dateString, // ✅ SỬA: Dùng selectedEventDay.date
          selectedStartTime
        );

        console.log("📋 End times from API:", apiEndTimes);

        // ✅ Filter by event time range cho ngày đã chọn
        const dayEndTime = selectedEventDay.endTime; // ✅ SỬA: Dùng endTime của ngày đã chọn
        const dayEndHour = parseInt(dayEndTime.split(':')[0]);
        const dayEndMinute = parseInt(dayEndTime.split(':')[1]);
        const dayEndInMinutes = dayEndHour * 60 + dayEndMinute;

        const eventFilteredEndTimes = apiEndTimes.filter(time => {
          const timeHour = parseInt(time.split(':')[0]);
          const timeMinute = parseInt(time.split(':')[1]);
          const timeInMinutes = timeHour * 60 + timeMinute;

          // ✅ End time must be <= selected day end time
          return timeInMinutes <= dayEndInMinutes;
        });

        console.log("✅ Filtered end times for selected day:", {
          selectedStartTime,
          selectedDay: selectedEventDay.date,
          dayEndTime,
          apiEndTimes,
          eventFilteredEndTimes,
        });

        setEndTimeOptions(eventFilteredEndTimes);

        // ✅ Reset selected end time if it's no longer valid
        if (selectedEndTime && !eventFilteredEndTimes.includes(selectedEndTime)) {
          console.log("🔄 Resetting selected end time - no longer valid");
          setSelectedEndTime("");
        }

      } catch (error) {
        console.error("❌ Error loading end times:", error);
        setEndTimeOptions([]);
      }
    };

    loadEndTimes();
  }, [selectedStartTime, selectedPhotographer?.photographerId, selectedEventDay, getEndTimesForStartTime]); // ✅ THÊM selectedEventDay vào dependency

  const calculateDuration = () => {
    if (!selectedStartTime || !selectedEndTime) return 0;

    const [startHour, startMinute] = selectedStartTime.split(":").map(Number);
    const [endHour, endMinute] = selectedEndTime.split(":").map(Number);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return Math.max(0, (endMinutes - startMinutes) / 60);
  };

  const calculatePrice = () => {
    const duration = calculateDuration();
    if (!selectedPhotographer?.specialRate || duration === 0) return 0;

    // ✅ TÍNH ĐÚNG: PHÍ EVENT + GIÁ PHOTOGRAPHER * THỜI GIAN
    const photographerCost = selectedPhotographer.specialRate * duration;
    const eventBaseFee = event.discountedPrice || event.originalPrice || 0;

    return eventBaseFee + photographerCost;
  };

  // Create unified datetime for API
  const createEventDateTime = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);

    // Sử dụng selectedEventDay thay vì event.startDate
    if (!selectedEventDay) {
      console.error("No selected event day");
      return "";
    }

    // Tạo date từ selectedEventDay.date
    const selectedDate = new Date(selectedEventDay.date + 'T00:00:00');

    // Format as YYYY-MM-DDTHH:MM:SS in local time
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      hours,
      minutes,
      0
    );

    // Format as YYYY-MM-DDTHH:MM:SS (local time, no timezone)
    const localDateTimeString =
      `${localDate.getFullYear()}-` +
      `${pad(localDate.getMonth() + 1)}-` +
      `${pad(localDate.getDate())}T` +
      `${pad(localDate.getHours())}:` +
      `${pad(localDate.getMinutes())}:` +
      `${pad(localDate.getSeconds())}`;

    console.log('Selected event day:', selectedEventDay.date);
    console.log('Selected time:', timeString);
    console.log('Final datetime for API:', localDateTimeString);

    return localDateTimeString;
  };

  const validateBookingData = () => {
    const errors = [];

    if (!user?.id) errors.push("User ID is required");
    if (!event.eventId) errors.push("Event ID is required");
    if (!selectedPhotographer?.eventPhotographerId) errors.push("Event Photographer ID is required");
    if (!selectedStartTime) errors.push("Start time is required");
    if (!selectedEndTime) errors.push("End time is required");

    // ✅ FIXED: Validate time logic properly
    if (selectedStartTime && selectedEndTime) {
      const [startHour, startMinute] = selectedStartTime.split(":").map(Number);
      const [endHour, endMinute] = selectedEndTime.split(":").map(Number);

      const startTimeInMinutes = startHour * 60 + startMinute;
      const endTimeInMinutes = endHour * 60 + endMinute;

      console.log("🔍 Time validation:", {
        selectedStartTime,
        selectedEndTime,
        startTimeInMinutes,
        endTimeInMinutes,
        isValid: endTimeInMinutes > startTimeInMinutes,
      });

      if (endTimeInMinutes <= startTimeInMinutes) {
        errors.push("End time must be after start time");
      }

      // ✅ Additional validation: Check if end time is in valid options
      if (!endTimeOptions.includes(selectedEndTime)) {
        errors.push("Selected end time is not available");
      }
    }

    console.log("✅ Validation result:", {
      errors,
      hasErrors: errors.length > 0,
    });

    return errors;
  };

  // Event handlers
  const handleStartTimeSelect = (time: string) => {
    setSelectedStartTime(time);
    // ✅ End times will be loaded automatically by useEffect
    setSelectedEndTime("");
  };

  const handleEndTimeSelect = (time: string) => {
    setSelectedEndTime(time);
  };

  const handlePhotographerSelect = (photographer: any) => {
    setSelectedPhotographer(photographer);
    // Reset times when photographer changes (will reload via useEffect)
    setSelectedStartTime("");
    setSelectedEndTime("");
    setEndTimeOptions([]);
  };

  // Handle booking submission  
  const handleSubmitBooking = async () => {
    if (isProcessing || bookingLoading) return;

    // Enhanced validation
    const validationErrors = validateBookingData();
    if (validationErrors.length > 0) {
      Alert.alert("Lỗi validation", validationErrors.join('\n'));
      return;
    }

    setIsProcessing(true);

    try {
      // Create booking request with proper datetime format
      const bookingRequest: EventBookingRequest = {
        eventId: event.eventId,
        eventPhotographerId: selectedPhotographer.eventPhotographerId,
        userId: user?.id || 0,
        startDatetime: createEventDateTime(selectedStartTime),
        endDatetime: createEventDateTime(selectedEndTime),
        ...(specialRequests.trim() && { specialRequests: specialRequests.trim() }),
      };

      console.log("🚀 Submitting event booking:", {
        ...bookingRequest,
        startDatetime_readable: `${selectedStartTime} VN -> ${bookingRequest.startDatetime}`,
        endDatetime_readable: `${selectedEndTime} VN -> ${bookingRequest.endDatetime}`,
      });

      // Create booking and get the response
      const bookingResponse = await bookEvent(bookingRequest);

      if (!bookingResponse) {
        throw new Error("Không thể tạo booking sự kiện");
      }

      console.log("✅ Event booking successful:", bookingResponse);

      // Extract booking ID from response
      const actualBookingId = bookingResponse.eventBookingId;
      const regularBookingId = (bookingResponse as any).bookingId;

      if (!actualBookingId) {
        console.error("❌ No booking ID in response:", bookingResponse);
        throw new Error("Không nhận được booking ID từ server");
      }

      console.log("📋 Created event booking ID:", actualBookingId);

      // Show success message
      Alert.alert(
        "Đặt lịch thành công!",
        "Bạn đã đăng ký tham gia sự kiện thành công. Tiếp tục để chọn phương thức thanh toán.",
        [
          {
            text: "Tiếp tục",
            onPress: () => {
              const finalCalculatedPrice = calculatePrice();

              const navigationParams = {
                bookingId: regularBookingId,
                eventBookingId: actualBookingId,
                eventPrice: finalCalculatedPrice,
                eventBookingResponse: {
                  bookingId: regularBookingId,
                },
                photographer: {
                  eventPhotographerId: selectedPhotographer.eventPhotographerId,
                  fullName: selectedPhotographer.photographer?.fullName ||
                    selectedPhotographer.photographerName ||
                    "Event Photographer",
                  profileImage: selectedPhotographer.photographer?.profileImage,
                  specialRate: selectedPhotographer.specialRate || 0,
                },
                event: {
                  eventId: event.eventId,
                  name: event.name,
                  startDate: event.startDate,
                  endDate: event.endDate,
                  locationName: event.locationName,
                  discountedPrice: event.discountedPrice,
                  originalPrice: event.originalPrice,
                  description: event.description,
                },
                bookingTimes: {
                  startTime: selectedStartTime,
                  endTime: selectedEndTime,
                  startDatetime: createEventDateTime(selectedStartTime),
                  endDatetime: createEventDateTime(selectedEndTime),
                },
              };
              navigation.navigate("OrderEventDetail", navigationParams);
            }
          }
        ]
      );

    } catch (error: any) {
      console.error("❌ Error in event booking:", error);

      // Enhanced error handling
      let errorMessage = "Có lỗi xảy ra khi đặt lịch tham gia sự kiện. Vui lòng thử lại.";

      if (error.message) {
        if (error.message.includes("HTTP 400")) {
          errorMessage = "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.";
        } else if (error.message.includes("HTTP 401")) {
          errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
        } else if (error.message.includes("HTTP 403")) {
          errorMessage = "Bạn không có quyền thực hiện thao tác này.";
        } else if (error.message.includes("HTTP 409")) {
          errorMessage = "Thời gian đã được đặt bởi người khác. Vui lòng chọn thời gian khác.";
        } else if (error.message.includes("HTTP 500")) {
          errorMessage = "Lỗi server. Vui lòng thử lại sau.";
        }
      }

      Alert.alert("Lỗi đặt lịch", errorMessage, [{ text: "OK" }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const isFormValid =
    selectedStartTime &&
    selectedEndTime &&
    selectedPhotographer &&
    selectedEventDay &&
    !isProcessing &&
    !bookingLoading &&
    eventFilteredTimes.length > 0 &&
    endTimeOptions.includes(selectedEndTime);


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
            Tham gia sự kiện
          </Text>

          <View style={{ width: getResponsiveSize(44) }} />
        </View>

        {/* Event Info */}
        <View
          style={{
            marginTop: getResponsiveSize(20),
            backgroundColor: "#f8f9fa",
            borderRadius: getResponsiveSize(12),
            padding: getResponsiveSize(15),
          }}
        >
          <Text
            style={{
              fontSize: getResponsiveSize(18),
              fontWeight: "bold",
              color: "#333",
              marginBottom: getResponsiveSize(8),
            }}
            numberOfLines={2}
          >
            {event.name}
          </Text>
          <View
            key="event-date-info"
            style={{ flexDirection: "row", alignItems: "center", marginBottom: getResponsiveSize(4) }}
          >
            <Feather name="calendar" size={getResponsiveSize(14)} color="#666" />
            <Text
              style={{
                fontSize: getResponsiveSize(14),
                color: "#666",
                marginLeft: getResponsiveSize(6),
              }}
            >
              {isMultiDay
                ? `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`
                : formatDate(event.startDate)
              }
            </Text>
          </View>
          <View
            key="event-time-info"
            style={{ flexDirection: "row", alignItems: "center", marginBottom: getResponsiveSize(4) }}
          >
            <Feather name="clock" size={getResponsiveSize(14)} color="#666" />
            <Text
              style={{
                fontSize: getResponsiveSize(14),
                color: "#666",
                marginLeft: getResponsiveSize(6),
              }}
            >
              {formatTime(event.startDate)} - {formatTime(event.endDate)}
            </Text>
          </View>
          {event.locationName && (
            <View
              key="event-location-info"
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <Feather name="map-pin" size={getResponsiveSize(14)} color="#666" />
              <Text
                style={{
                  fontSize: getResponsiveSize(14),
                  color: "#666",
                  marginLeft: getResponsiveSize(6),
                }}
              >
                {event.locationName}
              </Text>
            </View>
          )}
          {(event.discountedPrice || event.originalPrice) && (
            <View
              key="event-price-info"
              style={{ flexDirection: "row", alignItems: "center", marginTop: getResponsiveSize(8) }}
            >
              <Text
                style={{
                  fontSize: getResponsiveSize(16),
                  fontWeight: "bold",
                  color: "#E91E63",
                }}
              >
                {formatCurrency(event.discountedPrice || event.originalPrice)}
              </Text>
              {event.originalPrice && event.discountedPrice && event.originalPrice > event.discountedPrice && (
                <Text
                  style={{
                    fontSize: getResponsiveSize(14),
                    color: "#999",
                    marginLeft: getResponsiveSize(8),
                    textDecorationLine: "line-through",
                  }}
                >
                  {formatCurrency(event.originalPrice)}
                </Text>
              )}
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: getResponsiveSize(120) }}
      >
        <View style={{ padding: getResponsiveSize(20) }}>

          {/* Step 0: Day Selection - Chỉ hiện khi multi-day event */}
          {isMultiDay && (
            <View
              key="day-selection-section"
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
                <View
                  style={{
                    backgroundColor: selectedEventDay ? "#4CAF50" : "#E91E63",
                    borderRadius: getResponsiveSize(20),
                    width: getResponsiveSize(24),
                    height: getResponsiveSize(24),
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: getResponsiveSize(10),
                  }}
                >
                  {selectedEventDay ? (
                    <Feather name="check" size={getResponsiveSize(14)} color="#fff" />
                  ) : (
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: getResponsiveSize(12),
                        fontWeight: "bold",
                      }}
                    >
                      1
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: getResponsiveSize(16),
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  Chọn ngày tham gia
                </Text>
              </View>

              <View style={{ gap: getResponsiveSize(12) }}>
                {eventDays.map((day, index) => (
                  <TouchableOpacity
                    key={`event-day-${day.date}-${index}`}
                    onPress={() => {
                      setSelectedEventDay(day);
                      // Reset photographer và time khi đổi ngày
                      setSelectedPhotographer(null);
                      setSelectedStartTime("");
                      setSelectedEndTime("");
                      setEndTimeOptions([]);
                    }}
                    style={{
                      backgroundColor:
                        selectedEventDay?.date === day.date ? "#FFF0F5" : "#f8f9fa",
                      borderRadius: getResponsiveSize(12),
                      padding: getResponsiveSize(15),
                      borderWidth: 2,
                      borderColor:
                        selectedEventDay?.date === day.date ? "#E91E63" : "#e0e0e0",
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: getResponsiveSize(16),
                            fontWeight: "bold",
                            color: "#333",
                            marginBottom: getResponsiveSize(4),
                          }}
                        >
                          {day.displayText}
                        </Text>
                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <Feather name="clock" size={getResponsiveSize(14)} color="#666" />
                          <Text
                            style={{
                              fontSize: getResponsiveSize(14),
                              color: "#666",
                              marginLeft: getResponsiveSize(6),
                            }}
                          >
                            {day.startTime} - {day.endTime}
                          </Text>
                        </View>
                        {day.isToday && (
                          <Text
                            style={{
                              fontSize: getResponsiveSize(12),
                              color: "#4CAF50",
                              fontWeight: "600",
                              marginTop: getResponsiveSize(4),
                            }}
                          >
                            Hôm nay
                          </Text>
                        )}
                      </View>
                      {selectedEventDay?.date === day.date && (
                        <View
                          style={{
                            backgroundColor: "#E91E63",
                            borderRadius: getResponsiveSize(10),
                            padding: getResponsiveSize(4),
                          }}
                        >
                          <Feather name="check" size={getResponsiveSize(16)} color="#fff" />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Step 1 (single-day) hoặc Step 2 (multi-day): Photographer Selection */}
          {(!isMultiDay || selectedEventDay) && (
            <View
              key="photographer-selection-section"
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
                <View
                  style={{
                    backgroundColor: selectedPhotographer ? "#4CAF50" : "#E91E63",
                    borderRadius: getResponsiveSize(20),
                    width: getResponsiveSize(24),
                    height: getResponsiveSize(24),
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: getResponsiveSize(10),
                  }}
                >
                  {selectedPhotographer ? (
                    <Feather name="check" size={getResponsiveSize(14)} color="#fff" />
                  ) : (
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: getResponsiveSize(12),
                        fontWeight: "bold",
                      }}
                    >
                      {isMultiDay ? "2" : "1"}
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: getResponsiveSize(16),
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  Chọn Photographer
                </Text>
                {photographersLoading && (
                  <ActivityIndicator
                    size="small"
                    color="#E91E63"
                    style={{ marginLeft: getResponsiveSize(10) }}
                  />
                )}
              </View>

              {/* Rest của photographer selection code giữ nguyên từ đây */}
              {photographersLoading ? (
                <View
                  key="photographers-loading"
                  style={{ alignItems: "center", paddingVertical: getResponsiveSize(20) }}
                >
                  <ActivityIndicator size="large" color="#E91E63" />
                  <Text style={{ color: "#666", marginTop: getResponsiveSize(8) }}>
                    Đang tải danh sách photographer...
                  </Text>
                </View>
              ) : photographers.length > 0 ? (
                <View key="photographers-list" style={{ gap: getResponsiveSize(12) }}>
                  {photographers.map((photographer) => (
                    <TouchableOpacity
                      key={`photographer-${photographer.eventPhotographerId}-${photographer.photographerId}`}
                      onPress={() => handlePhotographerSelect(photographer)}
                      style={{
                        backgroundColor:
                          selectedPhotographer?.eventPhotographerId === photographer.eventPhotographerId
                            ? "#FFF0F5"
                            : "#f8f9fa",
                        borderRadius: getResponsiveSize(12),
                        padding: getResponsiveSize(15),
                        borderWidth: 2,
                        borderColor:
                          selectedPhotographer?.eventPhotographerId === photographer.eventPhotographerId
                            ? "#E91E63"
                            : "#e0e0e0",
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Image
                          source={{
                            uri: photographer.photographer?.profileImage ||
                              "https://via.placeholder.com/50x50/f0f0f0/999?text=P"
                          }}
                          style={{
                            width: getResponsiveSize(50),
                            height: getResponsiveSize(50),
                            borderRadius: getResponsiveSize(25),
                            marginRight: getResponsiveSize(12),
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: getResponsiveSize(16),
                              fontWeight: "bold",
                              color: "#333",
                              marginBottom: getResponsiveSize(4),
                            }}
                          >
                            {photographer.photographer?.fullName || "Unknown Photographer"}
                          </Text>
                          {photographer.photographer?.rating && (
                            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: getResponsiveSize(4) }}>
                              <Text style={{ color: "#FFA500", marginRight: getResponsiveSize(4) }}>⭐</Text>
                              <Text style={{ fontSize: getResponsiveSize(14), color: "#666" }}>
                                {photographer.photographer.rating}
                              </Text>
                            </View>
                          )}
                          {photographer.specialRate && (
                            <Text
                              style={{
                                fontSize: getResponsiveSize(14),
                                fontWeight: "600",
                                color: "#E91E63",
                              }}
                            >
                              {formatCurrency(photographer.specialRate)}/giờ
                            </Text>
                          )}
                        </View>
                        {selectedPhotographer?.eventPhotographerId === photographer.eventPhotographerId && (
                          <View
                            style={{
                              backgroundColor: "#E91E63",
                              borderRadius: getResponsiveSize(10),
                              padding: getResponsiveSize(4),
                            }}
                          >
                            <Feather name="check" size={getResponsiveSize(16)} color="#fff" />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View
                  key="no-photographers"
                  style={{
                    backgroundColor: "#FFF3F3",
                    borderRadius: getResponsiveSize(12),
                    padding: getResponsiveSize(15),
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#C62828", fontSize: getResponsiveSize(14) }}>
                    Chưa có photographer nào được duyệt cho sự kiện này
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Step 2 (single-day) hoặc Step 3 (multi-day): Time Selection */}
          {selectedPhotographer && (
            <View
              key="time-selection-section"
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
                <View
                  style={{
                    backgroundColor: selectedStartTime && selectedEndTime ? "#4CAF50" : "#E91E63",
                    borderRadius: getResponsiveSize(20),
                    width: getResponsiveSize(24),
                    height: getResponsiveSize(24),
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: getResponsiveSize(10),
                  }}
                >
                  {selectedStartTime && selectedEndTime ? (
                    <Feather name="check" size={getResponsiveSize(14)} color="#fff" />
                  ) : (
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: getResponsiveSize(12),
                        fontWeight: "bold",
                      }}
                    >
                      {isMultiDay ? "3" : "2"}
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: getResponsiveSize(16),
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  Chọn thời gian làm việc
                </Text>
                {loadingSlots && (
                  <ActivityIndicator
                    size="small"
                    color="#E91E63"
                    style={{ marginLeft: getResponsiveSize(10) }}
                  />
                )}

              </View>

              {/* Photographer available time info */}
              <View
                key="event-time-range-info"
                style={{
                  backgroundColor: "#E8F5E8",
                  borderRadius: getResponsiveSize(8),
                  padding: getResponsiveSize(12),
                  marginBottom: getResponsiveSize(15),
                }}
              >
                <Text
                  style={{
                    fontSize: getResponsiveSize(14),
                    color: "#4CAF50",
                    fontWeight: "600",
                  }}
                >
                  {isMultiDay
                    ? `${selectedEventDay?.displayText}: ${selectedEventDay?.startTime} - ${selectedEventDay?.endTime}`
                    : `Sự kiện diễn ra: ${formatTime(event.startDate)} - ${formatTime(event.endDate)}`
                  }
                </Text>
                <Text
                  style={{
                    fontSize: getResponsiveSize(12),
                    color: "#666",
                    marginTop: getResponsiveSize(4),
                  }}
                >
                  {selectedPhotographer.photographer?.fullName} có {eventFilteredTimes.length} khung giờ rảnh trong thời gian này
                </Text>
              </View>

              {!loadingSlots && availableTimes.length === 0 && (
                <View
                  key="no-availability-warning"
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
                      textAlign: "center",
                    }}
                  >
                    Photographer không có lịch rảnh trong khung giờ sự kiện này
                  </Text>
                  <Text
                    style={{
                      color: "#999",
                      fontSize: getResponsiveSize(12),
                      textAlign: "center",
                      marginTop: getResponsiveSize(4),
                    }}
                  >
                    Các khung giờ có thể đã được đặt bởi người khác
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
                key="start-time-scroll"
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: getResponsiveSize(15) }}
              >
                {/* ✅ SỬA: Dùng eventFilteredTimes thay vì availableTimes */}
                {eventFilteredTimes.map((time, index) => (
                  <TouchableOpacity
                    key={`start-time-${time}-${index}`}
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
                  <ScrollView
                    key="end-time-scroll"
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {getEndTimeOptions().map((time, index) => (
                      <TouchableOpacity
                        key={`end-time-${time}-${index}`}
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

              {selectedStartTime && selectedEndTime && (
                <View
                  key="duration-info"
                  style={{
                    backgroundColor: "#E8F5E8",
                    borderRadius: getResponsiveSize(8),
                    padding: getResponsiveSize(12),
                    marginTop: getResponsiveSize(15),
                  }}
                >
                  <Text
                    style={{
                      fontSize: getResponsiveSize(14),
                      color: "#4CAF50",
                      fontWeight: "600",
                    }}
                  >
                    ⏱️ Thời lượng làm việc: {calculateDuration().toFixed(1)} giờ
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Step 3 (single-day) hoặc Step 4 (multi-day): Special Requests */}
          {selectedPhotographer && selectedStartTime && selectedEndTime && (
            <View
              key="special-requests-section"
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
                <View
                  style={{
                    backgroundColor: specialRequests.length > 0 ? "#4CAF50" : "#FFA500",
                    borderRadius: getResponsiveSize(20),
                    width: getResponsiveSize(24),
                    height: getResponsiveSize(24),
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: getResponsiveSize(10),
                  }}
                >
                  {specialRequests.length > 0 ? (
                    <Feather name="check" size={getResponsiveSize(14)} color="#fff" />
                  ) : (
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: getResponsiveSize(12),
                        fontWeight: "bold",
                      }}
                    >
                      {isMultiDay ? "4" : "3"}
                    </Text>
                  )}
                </View>
                <Text
                  style={{
                    fontSize: getResponsiveSize(16),
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  Ghi chú đặc biệt
                </Text>
                <Text
                  style={{
                    fontSize: getResponsiveSize(12),
                    color: "#FFA500",
                    marginLeft: getResponsiveSize(8),
                  }}
                >
                  (Tùy chọn)
                </Text>
              </View>

              <TextInput
                key="special-requests-input"
                value={specialRequests}
                onChangeText={setSpecialRequests}
                placeholder="Nhập yêu cầu đặc biệt cho photographer trong sự kiện này..."
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
                key="special-requests-hint"
                style={{
                  fontSize: getResponsiveSize(12),
                  color: "#666",
                  marginTop: getResponsiveSize(8),
                }}
              >
                💡 Ví dụ: Phong cách chụp, góc độ yêu thích, số lượng ảnh mong muốn...
              </Text>
            </View>
          )}

          {/* Price Summary */}
          {selectedPhotographer && selectedStartTime && selectedEndTime && (
            <View
              key="price-summary-section"
              style={{
                backgroundColor: "#fff",
                borderRadius: getResponsiveSize(16),
                padding: getResponsiveSize(20),
                marginBottom: getResponsiveSize(20),
                elevation: 2,
                borderWidth: 2,
                borderColor: "#4CAF50",
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: getResponsiveSize(15),
                }}
              >
                <View
                  style={{
                    backgroundColor: "#4CAF50",
                    borderRadius: getResponsiveSize(20),
                    width: getResponsiveSize(24),
                    height: getResponsiveSize(24),
                    alignItems: "center",
                    justifyContent: "center",
                    marginRight: getResponsiveSize(10),
                  }}
                >
                  <Feather name="check" size={getResponsiveSize(14)} color="#fff" />
                </View>
                <Text
                  style={{
                    fontSize: getResponsiveSize(16),
                    fontWeight: "bold",
                    color: "#333",
                  }}
                >
                  Tóm tắt booking
                </Text>
              </View>

              <View style={{ gap: getResponsiveSize(12) }}>
                {/* Photographer Info */}
                <View
                  key="summary-photographer"
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                >
                  <Text style={{ fontSize: getResponsiveSize(14), color: "#666" }}>
                    Photographer:
                  </Text>
                  <Text style={{ fontSize: getResponsiveSize(14), fontWeight: "600", color: "#333" }}>
                    {selectedPhotographer.photographer?.fullName}
                  </Text>
                </View>

                {/* Duration */}
                <View
                  key="summary-duration"
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                >
                  <Text style={{ fontSize: getResponsiveSize(14), color: "#666" }}>
                    Thời gian:
                  </Text>
                  <Text style={{ fontSize: getResponsiveSize(14), fontWeight: "600", color: "#333" }}>
                    {selectedStartTime} - {selectedEndTime} ({calculateDuration() % 1 === 0 ? calculateDuration() : calculateDuration().toFixed(1)}h)
                  </Text>
                </View>

                {/* Event Price */}
                {(event.discountedPrice || event.originalPrice) && (
                  <View
                    key="summary-event-price"
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <Text style={{ fontSize: getResponsiveSize(14), color: "#666" }}>
                      Giá tham gia sự kiện:
                    </Text>
                    <Text style={{ fontSize: getResponsiveSize(14), fontWeight: "600", color: "#333" }}>
                      {formatCurrency(event.discountedPrice || event.originalPrice)}
                    </Text>
                  </View>
                )}

                {/* Photographer Rate */}
                <View
                  key="summary-photographer-rate"
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                >
                  <Text style={{ fontSize: getResponsiveSize(14), color: "#666" }}>
                    Photographer ({calculateDuration() % 1 === 0 ? calculateDuration() : calculateDuration().toFixed(1)}h):
                  </Text>
                  <Text style={{ fontSize: getResponsiveSize(14), fontWeight: "600", color: "#333" }}>
                    {selectedPhotographer.specialRate ? formatCurrency(selectedPhotographer.specialRate * calculateDuration()) : "Liên hệ"}
                  </Text>
                </View>

                {/* Rate per hour info */}
                <View
                  key="summary-hourly-rate"
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                >
                  <Text style={{ fontSize: getResponsiveSize(12), color: "#999", fontStyle: "italic" }}>
                    Giá đặc biệt photographer:
                  </Text>
                  <Text style={{ fontSize: getResponsiveSize(12), color: "#E91E63", fontWeight: "600" }}>
                    {selectedPhotographer.specialRate ? formatCurrency(selectedPhotographer.specialRate) : "Liên hệ"}/giờ
                  </Text>
                </View>

                {/* Discount info - nếu có giảm giá */}
                {event.originalPrice && event.discountedPrice && event.originalPrice > event.discountedPrice && (
                  <View
                    key="summary-discount"
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                  >
                    <Text style={{ fontSize: getResponsiveSize(14), color: "#4CAF50" }}>
                      Giảm giá sự kiện:
                    </Text>
                    <Text style={{ fontSize: getResponsiveSize(14), fontWeight: "600", color: "#4CAF50" }}>
                      -{formatCurrency(event.originalPrice - event.discountedPrice)}
                    </Text>
                  </View>
                )}

                {/* Divider */}
                <View
                  key="summary-divider"
                  style={{
                    height: 1,
                    backgroundColor: "#e0e0e0",
                    marginVertical: getResponsiveSize(8),
                  }}
                />

                {/* Total */}
                <View
                  key="summary-total"
                  style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
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
                    {formatCurrency(calculatePrice())}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* CTA Section - Fixed Bottom Button */}
      {selectedPhotographer && selectedStartTime && selectedEndTime && (
        <View
          key="bottom-cta-section"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "#fff",
            borderTopWidth: 1,
            borderTopColor: "#e0e0e0",
            paddingHorizontal: getResponsiveSize(20),
            paddingVertical: getResponsiveSize(15),
            elevation: 8,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
          }}
        >
          <View
            key="bottom-price-preview"
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: getResponsiveSize(12),
            }}
          >
            <Text
              style={{
                fontSize: getResponsiveSize(18),
                fontWeight: "bold",
                color: "#333",
              }}
            >
              {formatCurrency(calculatePrice())}
            </Text>
            <Text
              style={{
                fontSize: getResponsiveSize(12),
                color: "#666",
              }}
            >
              Thời lượng: {calculateDuration() % 1 === 0 ? calculateDuration() : calculateDuration().toFixed(1)} giờ
            </Text>
          </View>

          <TouchableOpacity
            key="submit-booking-button"
            onPress={handleSubmitBooking}
            disabled={!isFormValid || isProcessing}
            style={{
              backgroundColor: !isFormValid || isProcessing ? "#d1d5db" : "#E91E63",
              borderRadius: getResponsiveSize(12),
              paddingVertical: getResponsiveSize(16),
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: getResponsiveSize(8),
              opacity: !isFormValid || isProcessing ? 0.6 : 1,
            }}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={{
                  color: "#fff",
                  fontSize: getResponsiveSize(16),
                  fontWeight: "bold",
                }}
              >
                Xác nhận tham gia sự kiện
              </Text>
            )}
          </TouchableOpacity>

          {!isFormValid && (
            <Text
              key="form-validation-text"
              style={{
                fontSize: getResponsiveSize(12),
                color: "#999",
                textAlign: "center",
                marginTop: getResponsiveSize(8),
              }}
            >
              {isMultiDay && !selectedEventDay
                ? "Vui lòng chọn ngày tham gia"
                : !selectedPhotographer
                  ? "Vui lòng chọn photographer"
                  : !selectedStartTime || !selectedEndTime
                    ? "Vui lòng chọn thời gian"
                    : "Hoàn thành thông tin để tiếp tục"}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}