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
import { useAuth } from "../../hooks/useAuth";
import { cleanupService } from "../../services/cleanupService";

import * as Location from "expo-location";
import { useNearbyLocations } from "../../hooks/useNearbyLocations";
import LocationModal from "../../components/LocationCard/LocationModal";

// Route params interface
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
    userName?: string;
    email?: string;
    phoneNumber?: string;
    bio?: string;
    styles?: string[];
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

  const { photographer, editMode, existingBookingId, existingBookingData } =
    route.params as RouteParams;


  // Extract photographerId ngay đầu
  const photographerId = photographer?.photographerId;

  if (!photographer || !photographerId || typeof photographerId !== "number") {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 20,
        }}
      >
        <Text
          style={{
            color: "#E91E63",
            fontSize: 18,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          Lỗi tải thông tin photographer
        </Text>
        <Text
          style={{
            color: "#666",
            fontSize: 14,
            textAlign: "center",
            marginTop: 10,
          }}
        >
          Dữ liệu photographer không hợp lệ. Vui lòng thử lại.
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            backgroundColor: "#E91E63",
            padding: 15,
            borderRadius: 8,
            marginTop: 20,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>← Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ===== UNIFIED DATETIME HELPERS =====
  
  const createUnifiedDateTime = (date: Date, timeString: string): string => {
    // ✅ FIX: Sử dụng local date components để tránh timezone confusion
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const [hours, minutes] = timeString.split(':');
    const hoursStr = hours.padStart(2, '0');
    const minutesStr = minutes.padStart(2, '0');
    
    // Tạo UTC datetime string trực tiếp
    const result = `${year}-${month}-${day}T${hoursStr}:${minutesStr}:00.000Z`;
    
    console.log("🕐 Fixed Unified DateTime:", {
      input: { 
        originalDate: date.toISOString(),
        localDateComponents: `${day}/${month}/${year}`,
        time: timeString 
      },
      output: result,
      verify: {
        dateExtracted: `${day}/${month}/${year}`,
        timeExtracted: `${hoursStr}:${minutesStr}`,
        shouldBe: `${day}/${month}/${year} ${timeString}`,
      }
    });
    
    return result;
  };

  const createUnifiedDateTimeAlt = (date: Date, timeString: string): string => {
    // ✅ ALTERNATIVE: Using timezone-aware approach
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // Get local date string in YYYY-MM-DD format
    const localDateString = date.toLocaleDateString('sv-SE'); // Swedish format = ISO date
    
    // Create datetime string with Vietnam timezone
    const dateTimeWithTZ = `${localDateString}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00+07:00`;
    
    // Convert to UTC
    const result = new Date(dateTimeWithTZ).toISOString();
    
    console.log("🕐 Alternative DateTime:", {
      input: { 
        originalDate: date.toISOString(),
        localDateString,
        time: timeString 
      },
      process: {
        dateTimeWithTZ,
        result,
      },
      verify: {
        backToVN: new Date(result).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
      }
    });
    
    return result;
  };

  // Auth hook
  const { user, isAuthenticated } = useAuth();

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(editMode || false);

  // Form State
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

  // ===== NEW: Available times state =====
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  // ===== UPDATED: Availability hooks =====
  const {
    getAvailableTimesForDate,
    loadingSlots,
    error: availabilityError,
  } = useAvailability();

  const { locations, loading: locationsLoading } = useLocations();
  
  // ===== UPDATED: Booking hooks (removed checkAvailability) =====
  const {
    createBooking,
    updateBooking,
    calculatePrice,
    priceCalculation,
    setPriceCalculation,
    creating,
    updating,
    calculatingPrice,
    error,
  } = useBooking();

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

  // ===== NEW: Load available times when date changes =====
useEffect(() => {
  const loadAvailableTimes = async () => {
    if (!photographerId || !selectedDate) return;
    
    // ✅ FIX: Sử dụng local date để tránh timezone issues
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`; // "2025-08-14"
    
    // 🔍 DEBUG: Log date conversion
    console.log("🔍 DEBUG - Date conversion:", {
      originalDate: selectedDate,
      localDate: selectedDate.toLocaleDateString('vi-VN'),
      isoDate: selectedDate.toISOString(),
      apiDateString: dateString,
      selectedDateComponents: {
        year,
        month,
        day
      }
    });
    
    try {
      console.log("🔍 Loading available times for:", { photographerId, dateString });
      
      const times = await getAvailableTimesForDate(photographerId, dateString);
      setAvailableTimes(times);
      
      console.log("✅ Available times loaded:", {
        dateString,
        timesCount: times.length,
        times
      });
    } catch (error) {
      console.error("❌ Error loading available times:", error);
      setAvailableTimes([]);
    }
  };

  loadAvailableTimes();
}, [photographerId, selectedDate, getAvailableTimesForDate]);

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

  // ===== UPDATED: getFilteredTimes using new availableTimes =====
  const getFilteredTimes = () => {
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    
    if (isToday) {
      const nowHour = today.getHours();
      return availableTimes.filter((time) => {
        const [h] = time.split(":").map(Number);
        return h > nowHour;
      });
    }
    
    return availableTimes;
  };

  const getEndTimeOptions = () => {
    if (!selectedStartTime) return [];
    const availableTimesFiltered = getFilteredTimes();
    const startIndex = availableTimesFiltered.indexOf(selectedStartTime);
    return availableTimesFiltered.slice(startIndex + 1);
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
      console.warn("⚠️ Location selected without valid ID:", location);
      setSelectedLocation(null);
    }
    setShowLocationPicker(false);
  };

  const handleStartTimeSelect = (time: string) => {
    setSelectedStartTime(time);
    const availableTimesFiltered = getFilteredTimes();
    if (
      selectedEndTime &&
      availableTimesFiltered.indexOf(selectedEndTime) <= availableTimesFiltered.indexOf(time)
    ) {
      setSelectedEndTime("");
    }
  };

  const handleEndTimeSelect = (time: string) => {
    setSelectedEndTime(time);
  };

  // ===== SIMPLIFIED PRICE CALCULATION useEffect =====
  useEffect(() => {
    console.log("🔄 useEffect TRIGGERED for price calculation!");
    console.log("📅 selectedDate:", selectedDate);
    console.log("⏰ selectedStartTime:", selectedStartTime);
    console.log("⏰ selectedEndTime:", selectedEndTime);

    const calculateAndSetPrice = async () => {
      if (!selectedStartTime || !selectedEndTime || !photographerId) {
        console.log("⏭️ Skipping price calculation - missing required data:", {
          selectedStartTime,
          selectedEndTime,
          photographerId,
        });
        return;
      }

      if (typeof photographerId !== "number" || photographerId <= 0) {
        console.warn("⚠️ Invalid photographerId:", photographerId);
        return;
      }

      // ✅ UNIFIED DATETIME CREATION
      const startDateTimeString = createUnifiedDateTime(selectedDate, selectedStartTime);
      const endDateTimeString = createUnifiedDateTime(selectedDate, selectedEndTime);

      console.log("🔄 Unified DateTime for API:", {
        startDateTimeString,
        endDateTimeString,
      });

      try {
        const locationId = selectedLocation?.id || selectedLocation?.locationId;
        const isValidLocationId =
          locationId && typeof locationId === "number" && locationId > 0;

        // ===== PRICE CALCULATION ONLY (No availability check) =====
        let calculatePriceResult;
        if (isValidLocationId) {
          console.log("✅ Calling calculatePrice WITH location:", locationId);
          calculatePriceResult = await calculatePrice(
            photographerId,
            startDateTimeString,
            endDateTimeString,
            locationId
          );
        } else {
          console.log("✅ Calling calculatePrice WITHOUT location");
          calculatePriceResult = await calculatePrice(
            photographerId,
            startDateTimeString,
            endDateTimeString
          );
        }

        if (calculatePriceResult) {
          const [startHour, startMinute] = selectedStartTime.split(':').map(Number);
          const [endHour, endMinute] = selectedEndTime.split(':').map(Number);
          
          const startTotalMinutes = startHour * 60 + startMinute;
          const endTotalMinutes = endHour * 60 + endMinute;
          const duration = (endTotalMinutes - startTotalMinutes) / 60;
          
          const photographerFee = photographerRate * duration;
          const locationFee = selectedLocation?.hourlyRate
            ? selectedLocation.hourlyRate * duration
            : 0;

          console.log("💰 Price calculation details:", {
            duration,
            photographerRate,
            photographerFee,
            locationFee,
            totalFromAPI: calculatePriceResult?.totalPrice,
            calculatedTotal: photographerFee + locationFee,
          });

          setPriceCalculation({
            totalPrice:
              calculatePriceResult?.totalPrice ?? photographerFee + locationFee,
            photographerFee:
              calculatePriceResult?.photographerFee ?? photographerFee,
            locationFee: calculatePriceResult?.locationFee ?? locationFee,
            duration: calculatePriceResult?.duration ?? duration,
            breakdown: calculatePriceResult?.breakdown ?? {
              baseRate: photographerFee,
              locationRate: locationFee,
              additionalFees: [],
            },
          });
        }
      } catch (error) {
        console.error("❌ Error in price calculation:", error);
      }
    };

    calculateAndSetPrice();
  }, [
    selectedStartTime,
    selectedEndTime,
    selectedLocation,
    selectedDate,
    photographerId,
    calculatePrice,
    photographerRate,
  ]);

  // ===== SIMPLIFIED BOOKING SUBMISSION =====
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

    // ===== REMOVED: Availability check =====
    // No need to check availability since API already handles it

    if (!isAuthenticated || !user?.id) {
      Alert.alert("Lỗi", "Vui lòng đăng nhập để đặt lịch");
      return;
    }

    try {
      // ✅ UNIFIED DATETIME - Sử dụng cùng method với price calculation
      const startDateTimeString = createUnifiedDateTime(selectedDate, selectedStartTime);
      const endDateTimeString = createUnifiedDateTime(selectedDate, selectedEndTime);

      console.log("🚀 Submitting booking with unified datetime:", {
        selectedDate: selectedDate.toLocaleDateString('vi-VN'),
        selectedStartTime,
        selectedEndTime,
        startDateTimeString,
        endDateTimeString,
        photographerId,
        locationId: selectedLocation?.id,
      });

      if (isEditMode && existingBookingId) {
        // UPDATE MODE
        const updateData = {
          startDatetime: startDateTimeString,
          endDatetime: endDateTimeString,
          ...(specialRequests && { specialRequests }),
        };

        console.log("🔄 UPDATE MODE: Sending data:", updateData);

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
            fullName: photographerName,
            profileImage: photographerAvatar,
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
        // CREATE MODE
        const bookingData: CreateBookingRequest = {
          photographerId: photographerId,
          startDatetime: startDateTimeString,
          endDatetime: endDateTimeString,
          ...(selectedLocation?.id && { locationId: selectedLocation.id }),
          ...(specialRequests && { specialRequests }),
        };

        console.log("🔄 CREATE MODE: Sending unified data:", bookingData);

        // TRY MULTIPLE APPROACHES IF NEEDED
        let createdBooking = null;
        
        try {
          // Method 1: Standard unified approach
          createdBooking = await createBooking(user.id, bookingData);
        } catch (error1) {
          console.warn("⚠️ Method 1 failed, trying alternative:", error1);
          
          // Method 2: Alternative datetime format
          const altStartDateTime = createUnifiedDateTimeAlt(selectedDate, selectedStartTime);
          const altEndDateTime = createUnifiedDateTimeAlt(selectedDate, selectedEndTime);
          
          const altBookingData = {
            ...bookingData,
            startDatetime: altStartDateTime,
            endDatetime: altEndDateTime,
          };
          
          console.log("🔄 Trying alternative method:", altBookingData);
          
          try {
            createdBooking = await createBooking(user.id, altBookingData);
          } catch (error2) {
            console.error("❌ Both methods failed:", { error1, error2 });
            throw error1; // Throw original error
          }
        }

        if (!createdBooking) {
          Alert.alert("Lỗi", "Không thể tạo booking. Vui lòng thử lại.");
          return;
        }

        console.log("✅ Booking created successfully:", createdBooking);

        navigation.navigate("OrderDetail", {
          bookingId: createdBooking.id || createdBooking.bookingId,
          photographer: {
            photographerId: photographer.photographerId,
            fullName: photographerName,
            profileImage: photographerAvatar,
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
      if (!photographerId) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin photographer");
        return;
      }

      const startDateTimeString = createUnifiedDateTime(selectedDate, selectedStartTime);
      const endDateTimeString = createUnifiedDateTime(selectedDate, selectedEndTime);

      const bookingData: CreateBookingRequest = {
        photographerId: photographerId,
        startDatetime: startDateTimeString,
        endDatetime: endDateTimeString,
        ...(selectedLocation?.id && { locationId: selectedLocation.id }),
        ...(specialRequests && { specialRequests }),
      };

      if (!user) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin user");
        return;
      }

      const createdBooking = await cleanupService.cleanupAndRetryBooking(() =>
        createBooking(user.id, bookingData)
      );

      if (!createdBooking) {
        Alert.alert("Lỗi", "Không thể tạo đơn đặt lịch. Vui lòng thử lại sau.");
        return;
      }

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
                  fullName: photographerName,
                  profileImage: photographerAvatar,
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

  // ===== UPDATED: Check if form is ready for submission =====
  const isFormValid =
    photographerId &&
    selectedStartTime &&
    selectedEndTime &&
    !creating &&
    !updating &&
    availableTimes.length > 0;

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
              {loadingSlots && (
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

            {/* No availability message */}
            {!loadingSlots && getFilteredTimes().length === 0 && (
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
        </View>
      </ScrollView>

      {/* Modals */}
      <ModernCalendar
        date={selectedDate}
        onDateChange={handleDateChange}
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
      />

      <LocationModal
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onLocationSelect={handleLocationSelect}
        selectedLocation={selectedLocation}
        locations={locations}
        locationsLoading={locationsLoading}
        formatPrice={formatPrice}
      />

      {/* Error Display */}
      {(error || availabilityError) && (
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
            {error || availabilityError}
          </Text>
        </View>
      )}

      {/* Debug Cleanup Button - Remove in production */}
      {__DEV__ && (
        <TouchableOpacity
          onPress={async () => {
            try {
              const success = await cleanupService.manualCleanup();
              if (success) {
                Alert.alert("Success", "Cleaned up pending bookings!");
                // Refresh available times
                const dateString = selectedDate.toISOString().split('T')[0];
                const times = await getAvailableTimesForDate(photographerId, dateString);
                setAvailableTimes(times);
              }
            } catch (error) {
              Alert.alert("Error", "Cleanup failed");
            }
          }}
          style={{
            backgroundColor: "#FF6B35",
            padding: getResponsiveSize(8),
            borderRadius: getResponsiveSize(4),
            margin: getResponsiveSize(8),
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
      )}
    </View>
  );
}