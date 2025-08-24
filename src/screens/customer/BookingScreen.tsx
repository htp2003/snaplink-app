
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
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getResponsiveSize } from "../../utils/responsive";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AntDesign, Feather, MaterialIcons } from "@expo/vector-icons";
import ModernCalendar from "../../components/ModernCalendar";
import { useBooking } from "../../hooks/useBooking";
import { useAvailability } from "../../hooks/useAvailability";
import { useLocations } from "../../hooks/useLocations";
import type { RootStackNavigationProp } from "../../navigation/types";
import type { CreateBookingRequest } from "../../types/booking";
import { useAuth } from "../../hooks/useAuth";
import { photographerStyleRecommendations } from "../../hooks/useStyleRecommendations";
import { useCurrentUserId } from "../../hooks/useAuth";
// ✅ ADD: Import availabilityService directly for end times
import { availabilityService } from "../../services/availabilityService";

import LocationModal from "../../components/Location/LocationModal";
import PhotographerModal from "src/components/Photographer/PhotographerModel";

// Route params interface - UPDATED
interface RouteParams {
  // Existing photographer-first mode
  photographer?: {
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
  // NEW: Location-first mode
  location?: {
    locationId: number;
    name: string;
    address?: string;
    hourlyRate?: number;
    imageUrl?: string;
    capacity?: number;
    styles?: string[];
    indoor?: boolean;
    outdoor?: boolean;
  };
  editMode?: boolean;
  existingBookingId?: number;
  existingBookingData?: {
    selectedDate: string;
    selectedStartTime: string;
    selectedEndTime: string;
    selectedLocation?: any;
    selectedPhotographer?: any;
    specialRequests?: string;
  };
}

export default function BookingScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute();
  const currentUserId = useCurrentUserId();

  // Extract both photographer and location params
  const { photographer, location, editMode, existingBookingId, existingBookingData } =
    route.params as RouteParams;

  // NEW: Detect booking mode
  const isLocationFirst = !!location && !photographer;
  const isPhotographerFirst = !!photographer && !location;

  console.log("🎯 Booking mode detected:", {
    isLocationFirst,
    isPhotographerFirst,
    hasLocation: !!location,
    hasPhotographer: !!photographer
  });

  // Extract photographerId (might be null in location-first mode initially)
  const initialPhotographerId = photographer?.photographerId;

  // ===== UNIFIED DATETIME HELPERS =====
  const createUnifiedDateTime = (date: Date, timeString: string): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    const [hours, minutes] = timeString.split(':');
    const hoursStr = hours.padStart(2, '0');
    const minutesStr = minutes.padStart(2, '0');

    const result = `${year}-${month}-${day}T${hoursStr}:${minutesStr}:00.000Z`;

    console.log("🕕 Fixed Unified DateTime:", {
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

  // Auth hook
  const { user, isAuthenticated } = useAuth();

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(editMode || false);

  // NEW: State for selected photographer (location-first mode)
  const [selectedPhotographer, setSelectedPhotographer] = useState<any>(
    existingBookingData?.selectedPhotographer || photographer || null
  );

  // ✅ FIXED: End time state management
  const [endTimeOptions, setEndTimeOptions] = useState<string[]>([]);
  const [loadingEndTimes, setLoadingEndTimes] = useState(false);

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
    existingBookingData?.selectedLocation || location || null
  );
  const [specialRequests, setSpecialRequests] = useState<string>(
    existingBookingData?.specialRequests || ""
  );
  const [showPhotographerSelection, setShowPhotographerSelection] = useState(false);

  // UI State
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // NEW: Available times state
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

  // Style recommendations hook (for location-first mode)
  const styleRecommendationsHook = photographerStyleRecommendations(currentUserId || 0);
  const {
    recommendedPhotographers,
    loading: recommendationsLoading,
    error: recommendationsError,
    refreshRecommendations,
  } = styleRecommendationsHook;

  // Hooks
  const {
    getAvailableTimesForDate,
    loadingSlots,
    error: availabilityError,
  } = useAvailability();

  const { locations, loading: locationsLoading } = useLocations();

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

  // UPDATED: Only show error if NEITHER photographer NOR location is provided
  if ((!photographer || !initialPhotographerId) && !location) {
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
          Lỗi tải thông tin booking
        </Text>
        <Text
          style={{
            color: "#666",
            fontSize: 14,
            textAlign: "center",
            marginTop: 10,
          }}
        >
          Vui lòng chọn photographer hoặc location để tiếp tục.
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

  // Check authentication
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

  // Get current photographer ID (either from selected or initial)
  const currentPhotographerId = selectedPhotographer?.photographerId ||
    selectedPhotographer?.id ||
    photographer?.photographerId ||
    initialPhotographerId;

  console.log("🔍 Current Photographer ID Resolution:", {
    fromSelectedPhotographerId: selectedPhotographer?.photographerId,
    fromSelectedId: selectedPhotographer?.id,
    fromPhotographerId: photographer?.photographerId,
    fromInitial: initialPhotographerId,
    final: currentPhotographerId
  });

  // Load available times when date changes
  useEffect(() => {
    const loadAvailableTimes = async () => {
      console.log("🔍 PHOTOGRAPHER ID DEBUG:", {
        selectedPhotographer: selectedPhotographer,
        selectedPhotographer_photographerId: selectedPhotographer?.photographerId,
        selectedPhotographer_id: selectedPhotographer?.id,
        initialPhotographerId: initialPhotographerId,
        currentPhotographerId: currentPhotographerId,
        typeof_currentPhotographerId: typeof currentPhotographerId
      });

      if (!currentPhotographerId || !selectedDate) {
        console.log("⭐️ Skipping loadAvailableTimes:", {
          hasPhotographerId: !!currentPhotographerId,
          hasSelectedDate: !!selectedDate,
          currentPhotographerId,
          selectedPhotographer: selectedPhotographer?.photographerId
        });
        setAvailableTimes([]);
        return;
      }

      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      console.log("🔍 DETAILED DATE DEBUG:", {
        selectedDate: selectedDate.toISOString(),
        localDate: selectedDate.toLocaleDateString('vi-VN'),
        dayOfWeek: selectedDate.getDay(),
        dayOfWeekName: ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][selectedDate.getDay()],
        dateStringForAPI: dateString,
        currentPhotographerId
      });

      try {
        console.log("📞 Calling getAvailableTimesForDate with:", {
          photographerId: currentPhotographerId,
          date: dateString
        });

        const times = await getAvailableTimesForDate(currentPhotographerId, dateString);
        setAvailableTimes(times);

        console.log("✅ API Response:", {
          dateString,
          timesCount: times.length,
          times,
          isEmpty: times.length === 0
        });

        if (times.length === 0) {
          console.log("⚠️ NO TIMES AVAILABLE - Debugging info:", {
            photographerId: currentPhotographerId,
            requestedDate: dateString,
            dayOfWeek: selectedDate.getDay(),
            dateObject: selectedDate
          });
        }

      } catch (error) {
        console.error("❌ Error loading available times:", error);
        setAvailableTimes([]);
      }
    };

    loadAvailableTimes();
  }, [currentPhotographerId, selectedDate, getAvailableTimesForDate]);

  // ✅ FIXED: Load end times when start time changes using service directly
  useEffect(() => {
    const loadEndTimes = async () => {
      if (!selectedStartTime || !currentPhotographerId || !selectedDate) {
        setEndTimeOptions([]);
        return;
      }

      setLoadingEndTimes(true);
      try {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        console.log("🕒 Loading end times for:", {
          photographerId: currentPhotographerId,
          date: dateString,
          startTime: selectedStartTime
        });

        // ✅ USE SERVICE DIRECTLY - Not hook inside useEffect
        const endTimes = await availabilityService.getEndTimesForStartTime(
          currentPhotographerId,
          dateString,
          selectedStartTime
        );

        setEndTimeOptions(endTimes);

        // Clear selected end time if it's no longer valid
        if (selectedEndTime && !endTimes.includes(selectedEndTime)) {
          setSelectedEndTime("");
        }

        console.log("✅ End times loaded:", {
          startTime: selectedStartTime,
          endTimes,
          example: `${selectedStartTime} → [${endTimes.join(', ')}]`
        });

      } catch (error) {
        console.error("❌ Error loading end times:", error);
        setEndTimeOptions([]);
      } finally {
        setLoadingEndTimes(false);
      }
    };

    loadEndTimes();
  }, [selectedStartTime, currentPhotographerId, selectedDate]);

  // Safe data extraction
  const photographerName = selectedPhotographer?.fullName ||
    selectedPhotographer?.name ||
    photographer?.fullName ||
    photographer?.name ||
    "Unknown Photographer";

  const photographerAvatar = selectedPhotographer?.profileImage ||
    selectedPhotographer?.avatar ||
    photographer?.profileImage ||
    photographer?.avatar;

  const photographerRate = selectedPhotographer?.hourlyRate ||
    photographer?.hourlyRate ||
    0;

  const photographerSpecialty = selectedPhotographer?.specialty ||
    photographer?.specialty ||
    "Professional Photographer";

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

  // ✅ FIXED: Better handling for undefined/null values
  const formatPrice = (price: number | undefined | null): string => {
    if (price === undefined || price === null || isNaN(price)) return "Liên hệ";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

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

  // ✅ SIMPLIFIED: Just return loaded end time options
  const getEndTimeOptions = () => {
    return endTimeOptions;
  };

  // Event handlers
  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setSelectedStartTime("");
    setSelectedEndTime("");
    setEndTimeOptions([]); // ✅ Clear end time options when date changes
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

  // NEW: Handle photographer selection (for location-first mode)
  const handlePhotographerSelect = (photographer: any) => {
    console.log("📸 Photographer selected DETAILED:", {
      photographer: photographer,
      photographerId: photographer.photographerId,
      id: photographer.id,
      typeof_photographerId: typeof photographer.photographerId,
      typeof_id: typeof photographer.id
    });

    setSelectedPhotographer(photographer);
    // Reset times when photographer changes
    setSelectedStartTime("");
    setSelectedEndTime("");
    setAvailableTimes([]);
    setEndTimeOptions([]); // ✅ Clear end time options when photographer changes
  };

  const handleStartTimeSelect = (time: string) => {
    setSelectedStartTime(time);
    // ✅ Clear end time when start time changes - it will reload via useEffect
    setSelectedEndTime("");
    setEndTimeOptions([]);
  };

  const handleEndTimeSelect = (time: string) => {
    setSelectedEndTime(time);
  };

  useEffect(() => {
    console.log("💰 RATES DEBUG:", {
      photographerRate,
      locationHourlyRate: selectedLocation?.hourlyRate,
      location,
      selectedPhotographer,
    });
  }, [photographerRate, selectedLocation?.hourlyRate, location, selectedPhotographer]);

  // ✅ FIXED: Price calculation with better external location handling
  useEffect(() => {
    const calculateAndSetPrice = async () => {
      console.log("💰 PRICE CALCULATION START:", {
        hasSelectedStartTime: !!selectedStartTime,
        hasSelectedEndTime: !!selectedEndTime,
        hasCurrentPhotographerId: !!currentPhotographerId,
        isAuthenticated,
        hasUser: !!user,
      });

      if (!isAuthenticated || !user) {
        console.warn("⚠️ Not authenticated, skipping price calculation");
        return;
      }

      if (!selectedStartTime || !selectedEndTime || !currentPhotographerId) {
        console.log("⚠️ Missing required data for price calculation");
        return;
      }

      // 🔐 CHECK TOKEN BEFORE API CALL
      const storedToken = await AsyncStorage.getItem("token");
      console.log("🔐 Pre-API token check:", {
        hasStoredToken: !!storedToken,
        tokenLength: storedToken?.length,
        isValidJWT: storedToken ? storedToken.split('.').length === 3 : false,
      });

      if (!storedToken) {
        console.error("🚨 NO TOKEN FOUND - Redirecting to login");
        Alert.alert(
          "Phiên đăng nhập hết hạn",
          "Vui lòng đăng nhập lại để tiếp tục",
          [
            {
              text: "Đăng nhập",
              onPress: () => navigation.navigate("Login"),
            },
            { text: "Hủy", style: "cancel" }
          ]
        );
        return;
      }

      const [startHour, startMinute] = selectedStartTime.split(':').map(Number);
      const [endHour, endMinute] = selectedEndTime.split(':').map(Number);
      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;
      const duration = (endTotalMinutes - startTotalMinutes) / 60;

      const photographerFee = (photographerRate || 0) * duration;

      // ✅ FIX: Safely handle location fee - external locations are free
      const isExternalLocation = selectedLocation && selectedLocation.placeId && !selectedLocation.id && !selectedLocation.locationId;
      const locationFee = isExternalLocation ? 0 : ((selectedLocation?.hourlyRate || 0) * duration);

      const manualTotalPrice = photographerFee + locationFee;

      try {
        const startDateTimeString = createUnifiedDateTime(selectedDate, selectedStartTime);
        const endDateTimeString = createUnifiedDateTime(selectedDate, selectedEndTime);

        const locationId = selectedLocation?.id || selectedLocation?.locationId;
        const isValidLocationId = locationId && typeof locationId === "number" && locationId > 0;

        console.log("💰 CALLING CALCULATE PRICE API:", {
          photographerId: currentPhotographerId,
          startDateTime: startDateTimeString,
          endDateTime: endDateTimeString,
          locationId: isValidLocationId ? locationId : "none",
          isExternalLocation,
          hasToken: !!storedToken,
          apiUrl: "calculate-price"
        });

        let calculatePriceResult;
        if (isValidLocationId && !isExternalLocation) {
          calculatePriceResult = await calculatePrice(
            currentPhotographerId,
            startDateTimeString,
            endDateTimeString,
            locationId
          );
        } else {
          // For external locations or no location, don't pass locationId
          calculatePriceResult = await calculatePrice(
            currentPhotographerId,
            startDateTimeString,
            endDateTimeString
          );
        }

        console.log("✅ Price calculation API success:", calculatePriceResult);

        const finalPriceCalculation = {
          totalPrice: calculatePriceResult?.totalPrice ?? manualTotalPrice,
          photographerFee: calculatePriceResult?.photographerFee ?? photographerFee,
          locationFee: calculatePriceResult?.locationFee ?? locationFee,
          duration: calculatePriceResult?.duration ?? duration,
          breakdown: calculatePriceResult?.breakdown ?? {
            baseRate: photographerFee,
            locationRate: locationFee,
            additionalFees: [],
          },
        };
        setPriceCalculation(finalPriceCalculation);

      } catch (error) {
        console.error("❌ DETAILED ERROR in price calculation:", {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          errorType: error?.constructor?.name,
        });

        // 🔐 SPECIFIC 401 HANDLING
        if (error instanceof Error) {
          if (error.message.includes("401") || error.message.includes("Unauthorized")) {
            console.error("🚨 401 UNAUTHORIZED - Token is invalid/expired");

            // Clear all auth data
            await AsyncStorage.multiRemove(["token", "user", "currentUserId"]);

            Alert.alert(
              "Phiên đăng nhập hết hạn",
              "Token xác thực đã hết hạn. Vui lòng đăng nhập lại.",
              [
                {
                  text: "Đăng nhập lại",
                  onPress: async () => {
                    navigation.navigate("Login");
                  },
                },
                { text: "Bỏ qua", style: "cancel" }
              ]
            );
            return;
          }

          if (error.message.includes("Network") || error.message.includes("fetch")) {
            console.warn("🌐 Network error in price calculation, using fallback");
          }
        }

        // ✅ ALWAYS USE FALLBACK CALCULATION
        const fallbackCalculation = {
          totalPrice: manualTotalPrice,
          photographerFee: photographerFee,
          locationFee: locationFee,
          duration: duration,
          breakdown: {
            baseRate: photographerFee,
            locationRate: locationFee,
            additionalFees: [],
          },
        };

        console.log("💰 USING FALLBACK CALCULATION:", fallbackCalculation);
        setPriceCalculation(fallbackCalculation);
      }
    };

    calculateAndSetPrice();
  }, [
    selectedStartTime,
    selectedEndTime,
    selectedLocation,
    selectedDate,
    currentPhotographerId,
    calculatePrice,
    photographerRate,
    isAuthenticated,
    user,
  ]);

  // Booking submission
  const handleSubmitBooking = async () => {
    if (!currentPhotographerId) {
      Alert.alert("Lỗi", "Vui lòng chọn photographer");
      return;
    }

    if (!selectedStartTime || !selectedEndTime) {
      Alert.alert("Lỗi", "Vui lòng chọn thời gian bắt đầu và kết thúc");
      return;
    }

    if (!isAuthenticated || !user?.id) {
      Alert.alert("Lỗi", "Vui lòng đăng nhập để đặt lịch");
      return;
    }

    try {
      const startDateTimeString = createUnifiedDateTime(selectedDate, selectedStartTime);
      const endDateTimeString = createUnifiedDateTime(selectedDate, selectedEndTime);

      if (isEditMode && existingBookingId) {
        // UPDATE MODE
        const updateData = {
          startDatetime: startDateTimeString,
          endDatetime: endDateTimeString,
          ...(specialRequests && { specialRequests }),
        };

        const updatedBooking = await updateBooking(existingBookingId, updateData);

        if (!updatedBooking) {
          Alert.alert("Lỗi", "Không thể cập nhật booking. Vui lòng thử lại.");
          return;
        }

        navigation.navigate("OrderDetail", {
          bookingId: existingBookingId,
          photographer: {
            photographerId: currentPhotographerId,
            fullName: photographerName,
            profileImage: photographerAvatar,
            hourlyRate: photographerRate,
          },
          selectedDate: selectedDate.toISOString(),
          selectedStartTime,
          selectedEndTime,
          selectedLocation: selectedLocation
            ? {
              id: selectedLocation.locationId || selectedLocation.id,
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
          photographerId: currentPhotographerId,
          startDatetime: startDateTimeString,
          endDatetime: endDateTimeString,
          ...(selectedLocation?.id && { locationId: selectedLocation.id }),
          ...(specialRequests && { specialRequests }),
        };

        if (selectedLocation) {
          if (selectedLocation.id || selectedLocation.locationId) {
            // Internal location từ database
            bookingData.locationId = selectedLocation.id || selectedLocation.locationId;
          } else if (selectedLocation.placeId) {

            // External location
            bookingData.externalLocation = {
              placeId: selectedLocation.placeId,
              name: selectedLocation.name,
              address: selectedLocation.address || selectedLocation.formatted_address || "",
            };
          }
        }

        console.log("🗓️ Final booking data:", {
          bookingData,
          selectedLocation,
          hasInternalId: !!(selectedLocation?.id || selectedLocation?.locationId),
          hasExternalPlaceId: !!selectedLocation?.placeId,
        });

        const createdBooking = await createBooking(user.id, bookingData);

        if (!createdBooking) {
          Alert.alert("Lỗi", "Không thể tạo booking. Vui lòng thử lại.");
          return;
        }

        navigation.navigate("OrderDetail", {
          bookingId: createdBooking.id || createdBooking.bookingId,
          photographer: {
            photographerId: currentPhotographerId,
            fullName: photographerName,
            profileImage: photographerAvatar,
            hourlyRate: photographerRate,
          },
          selectedDate: selectedDate.toISOString(),
          selectedStartTime,
          selectedEndTime,
          selectedLocation: selectedLocation
            ? {
              id: selectedLocation.locationId || selectedLocation.id,
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
      Alert.alert(
        "Lỗi đặt lịch",
        (error as any).message || "Có lỗi xảy ra khi đặt lịch. Vui lòng thử lại.",
        [{ text: "OK" }]
      );
    }
  };

  // Dynamic variables
  const buttonText = creating || updating
    ? isEditMode ? "Đang cập nhật..." : "Đang tạo..."
    : isEditMode ? "Cập nhật lịch" : "Xác nhận đặt lịch";

  const headerTitle = isEditMode ? "Chỉnh sửa lịch" :
    isLocationFirst ? `Đặt lịch tại ${location?.name}` :
      "Đặt lịch chụp";

  // Form validation
  const isFormValid = currentPhotographerId &&
    selectedStartTime &&
    selectedEndTime &&
    !creating &&
    !updating &&
    availableTimes.length > 0;

  // NEW: Render photographer card for vertical selection
  const renderPhotographerCard = (photographer: any, index: number) => {
    // Kiểm tra dữ liệu photographer có hợp lệ không
    if (!photographer) {
      return null;
    }

    const photographerName = photographer.fullName || photographer.name || 'Unknown Photographer';
    const photographerImage = photographer.avatar || photographer.profileImage || '';
    const photographerSpecialty = photographer.specialty || 'Professional Photographer';
    const photographerHourlyRate = photographer.hourlyRate || 0;
    const photographerRating = photographer.rating || 4.8;
    const photographerExperience = photographer.yearsExperience || 5;
    const photographerStyles = Array.isArray(photographer.styles) ? photographer.styles : [];

    return (
      <TouchableOpacity
        key={photographer.id || index}
        onPress={() => {
          handlePhotographerSelect(photographer);
          setShowPhotographerSelection(false);
        }}
        style={{
          backgroundColor: "#fff",
          borderRadius: getResponsiveSize(16),
          padding: getResponsiveSize(16),
          marginBottom: getResponsiveSize(12),
          borderWidth: selectedPhotographer?.id === photographer.id ? 2 : 1,
          borderColor: selectedPhotographer?.id === photographer.id ? "#E91E63" : "#e0e0e0",
          elevation: selectedPhotographer?.id === photographer.id ? 4 : 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Photographer Image */}
          <Image
            source={{ uri: photographerImage }}
            style={{
              width: getResponsiveSize(80),
              height: getResponsiveSize(80),
              borderRadius: getResponsiveSize(12),
              marginRight: getResponsiveSize(16),
            }}
          />

          {/* Photographer Info */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Text
                style={{
                  fontSize: getResponsiveSize(16),
                  fontWeight: "bold",
                  color: selectedPhotographer?.id === photographer.id ? "#E91E63" : "#333",
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {photographerName}
              </Text>
              {selectedPhotographer?.id === photographer.id && (
                <View
                  style={{
                    backgroundColor: "#E91E63",
                    borderRadius: getResponsiveSize(10),
                    paddingHorizontal: getResponsiveSize(8),
                    paddingVertical: getResponsiveSize(2),
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: getResponsiveSize(10),
                      fontWeight: "bold",
                    }}
                  >
                    ✓ Đã chọn
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={{
                fontSize: getResponsiveSize(14),
                color: "#666",
                marginBottom: getResponsiveSize(4),
              }}
            >
              {photographerSpecialty}
            </Text>

            <Text
              style={{
                fontSize: getResponsiveSize(16),
                fontWeight: "bold",
                color: "#E91E63",
                marginBottom: getResponsiveSize(4),
              }}
            >
              {formatPrice(photographerHourlyRate)}/h
            </Text>

            {/* Rating */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather name="star" size={getResponsiveSize(14)} color="#FFD700" />
              <Text
                style={{
                  fontSize: getResponsiveSize(12),
                  color: "#666",
                  marginLeft: getResponsiveSize(4),
                }}
              >
                {photographerRating} • {photographerExperience}+ năm kinh nghiệm
              </Text>
            </View>
          </View>
        </View>

        {/* Styles/Specialties */}
        {photographerStyles.length > 0 && (
          <View style={{ marginTop: getResponsiveSize(12), paddingTop: getResponsiveSize(12), borderTopWidth: 1, borderTopColor: "#f0f0f0" }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photographerStyles.map((style: any, styleIndex: number) => {
                const styleText = typeof style === 'string' ? style : String(style || '');

                return (
                  <View
                    key={styleIndex}
                    style={{
                      backgroundColor: selectedPhotographer?.id === photographer.id ? "#FFF0F5" : "#f8f9fa",
                      borderRadius: getResponsiveSize(12),
                      paddingHorizontal: getResponsiveSize(8),
                      paddingVertical: getResponsiveSize(4),
                      marginRight: getResponsiveSize(6),
                    }}
                  >
                    <Text
                      style={{
                        fontSize: getResponsiveSize(11),
                        color: selectedPhotographer?.id === photographer.id ? "#E91E63" : "#666",
                        fontWeight: selectedPhotographer?.id === photographer.id ? "bold" : "normal",
                      }}
                    >
                      {styleText}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
              fontSize: getResponsiveSize(18),
              fontWeight: "bold",
              color: "#333",
              textAlign: "center",
              flex: 1,
            }}
            numberOfLines={1}
          >
            {headerTitle}
          </Text>

          <View style={{ width: getResponsiveSize(44) }} />
        </View>

        {/* Location Info (for location-first mode) */}
        {isLocationFirst && location && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginTop: getResponsiveSize(15),
              backgroundColor: "#f0f9ff",
              borderRadius: getResponsiveSize(12),
              padding: getResponsiveSize(15),
            }}
          >
            <Feather name="map-pin" size={getResponsiveSize(20)} color="#0EA5E9" />
            <View style={{ flex: 1, marginLeft: getResponsiveSize(12) }}>
              <Text
                style={{
                  fontSize: getResponsiveSize(16),
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                {location.name || 'Tên địa điểm'}
              </Text>
              <Text
                style={{
                  fontSize: getResponsiveSize(14),
                  color: "#666",
                }}
              >
                {location.address || 'Địa chỉ'}
              </Text>
            </View>
            {location.hourlyRate && location.hourlyRate > 0 ? (
              <Text
                style={{
                  fontSize: getResponsiveSize(14),
                  fontWeight: "bold",
                  color: "#0EA5E9",
                }}
              >
                {formatPrice(location.hourlyRate)}/h
              </Text>
            ) : (
              <View
                style={{
                  backgroundColor: "#4CAF50",
                  paddingHorizontal: getResponsiveSize(8),
                  paddingVertical: getResponsiveSize(4),
                  borderRadius: getResponsiveSize(12),
                }}
              >
                <Text
                  style={{
                    fontSize: getResponsiveSize(10),
                    color: "#fff",
                    fontWeight: "bold",
                  }}
                >
                  Miễn phí
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: getResponsiveSize(20) }}>

          {/* NEW: Photographer Selection (for location-first mode) */}
          {isLocationFirst && (
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
                  justifyContent: "space-between",
                  marginBottom: getResponsiveSize(15),
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Feather
                    name="camera"
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
                    Photographer
                  </Text>
                </View>

                {selectedPhotographer && (
                  <TouchableOpacity
                    onPress={() => setShowPhotographerSelection(true)}
                    style={{
                      backgroundColor: "#E91E63",
                      paddingHorizontal: getResponsiveSize(12),
                      paddingVertical: getResponsiveSize(6),
                      borderRadius: getResponsiveSize(20),
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontSize: getResponsiveSize(12),
                        fontWeight: "bold",
                      }}
                    >
                      Thay đổi
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {selectedPhotographer ? (
                // Hiển thị photographer đã chọn
                <TouchableOpacity
                  onPress={() => setShowPhotographerSelection(true)}
                  style={{
                    backgroundColor: "#f8f9fa",
                    borderRadius: getResponsiveSize(12),
                    padding: getResponsiveSize(15),
                    borderWidth: 1,
                    borderColor: "#E91E63",
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Image
                    source={{ uri: (selectedPhotographer.avatar || selectedPhotographer.profileImage) || '' }}
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
                      {String(selectedPhotographer.fullName || selectedPhotographer.name || 'Unknown')}
                    </Text>
                    <Text
                      style={{
                        fontSize: getResponsiveSize(14),
                        color: "#666",
                      }}
                    >
                      {formatPrice(selectedPhotographer.hourlyRate || 0)}/h
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                      <Text style={{ fontSize: 12, color: "#999" }}>Nhấn để thay đổi</Text>
                    </View>
                  </View>
                  <Feather name="chevron-right" size={getResponsiveSize(20)} color="#E91E63" />
                </TouchableOpacity>
              ) : (
                // Hiển thị khi chưa chọn photographer
                <TouchableOpacity
                  onPress={() => setShowPhotographerSelection(true)}
                  style={{
                    backgroundColor: "#f8f9fa",
                    borderRadius: getResponsiveSize(12),
                    padding: getResponsiveSize(20),
                    borderWidth: 1,
                    borderColor: "#e0e0e0",
                    alignItems: "center",
                    borderStyle: "dashed",
                  }}
                >
                  <Feather name="camera" size={getResponsiveSize(32)} color="#ccc" />
                  <Text
                    style={{
                      fontSize: getResponsiveSize(16),
                      color: "#999",
                      marginTop: getResponsiveSize(8),
                    }}
                  >
                    Chọn photographer
                  </Text>
                  <Text
                    style={{
                      fontSize: getResponsiveSize(12),
                      color: "#ccc",
                      marginTop: getResponsiveSize(4),
                    }}
                  >
                    Nhấn để xem danh sách photographer
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Date Selection */}
          {(selectedPhotographer || photographer) && (
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
          )}

          {/* Time Selection */}
          {(selectedPhotographer || photographer) && (
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
          )}

          {/* Location Selection */}
          {(selectedPhotographer || photographer) && (
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
                disabled={isLocationFirst && !!location}
                style={{
                  backgroundColor: (isLocationFirst && location) ? "#f0f0f0" : "#f8f9fa",
                  borderRadius: getResponsiveSize(12),
                  padding: getResponsiveSize(15),
                  borderWidth: 1,
                  borderColor: "#e0e0e0",
                  opacity: (isLocationFirst && location) ? 0.7 : 1,
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
                {selectedLocation && selectedLocation.address && (
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
                {isLocationFirst && location && (
                  <Text
                    style={{
                      fontSize: getResponsiveSize(12),
                      color: "#999",
                      marginTop: getResponsiveSize(4),
                      fontStyle: "italic",
                    }}
                  >
                    Địa điểm đã được chọn trước
                  </Text>
                )}

                {selectedLocation && (
                  <View
                    style={{
                      marginTop: getResponsiveSize(10),
                      flex: 1,
                      alignItems: 'flex-start',
                    }}
                  >
                    {selectedLocation.hourlyRate && selectedLocation.hourlyRate > 0 ? (
                      <Text
                        style={{
                          fontSize: getResponsiveSize(12),
                          color: "#E91E63",
                          fontWeight: "bold",
                        }}
                      >
                        {formatPrice(selectedLocation.hourlyRate)}/h
                      </Text>
                    ) : (
                      <View
                        style={{
                          backgroundColor: "#4CAF50",
                          paddingHorizontal: getResponsiveSize(6),
                          paddingVertical: getResponsiveSize(3),
                          borderRadius: getResponsiveSize(8),
                          alignSelf: 'flex-start',
                          maxWidth: getResponsiveSize(60),
                        }}
                      >
                        <Text
                          style={{
                            fontSize: getResponsiveSize(10),
                            color: "#fff",
                            fontWeight: "bold",
                            textAlign: 'center',
                          }}
                          numberOfLines={1}
                        >
                          Miễn phí
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Special Requests */}
          {(selectedPhotographer || photographer) && (
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
                Ví dụ: Phong cách chụp, góc độ yêu thích, số lượng ảnh mong muốn...
              </Text>
            </View>
          )}

          {/* Price Summary */}
          {(selectedPhotographer || photographer) && (
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
          )}

          {/* Booking Button */}
          {(selectedPhotographer || photographer) && (
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
          )}
        </View>
      </ScrollView>

      {/* Photographer Selection Modal */}
      <PhotographerModal
        visible={showPhotographerSelection}
        onClose={() => setShowPhotographerSelection(false)}
        onPhotographerSelect={handlePhotographerSelect}
        selectedPhotographer={selectedPhotographer}
        location={location}
        formatPrice={formatPrice}
      />

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
    </View>
  );
}