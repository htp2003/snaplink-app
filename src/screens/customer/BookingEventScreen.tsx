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

export default function BookingEventScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute();
  const { event, preSelectedPhotographer } = route.params as RouteParams;

  // Auth hook
  const { user, isAuthenticated } = useAuth();

  // ✅ ADD: Availability hook for API calls
  const {
    getAvailableTimesForDate,
    loadingSlots,
    error: availabilityError,
  } = useAvailability();

  // Event hooks
  const { bookEvent, loading: bookingLoading } = useEventBooking();
  const { photographers, loading: photographersLoading } = useApprovedPhotographers(event.eventId);

  // Form State
  const [selectedStartTime, setSelectedStartTime] = useState<string>("");
  const [selectedEndTime, setSelectedEndTime] = useState<string>("");
  const [selectedPhotographer, setSelectedPhotographer] = useState<any>(preSelectedPhotographer || null);
  const [specialRequests, setSpecialRequests] = useState<string>("");

  // ✅ UPDATED: Available times from API instead of generated
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);

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

  // ✅ NEW: Load available times from API when photographer is selected
  useEffect(() => {
    const loadAvailableTimesForEvent = async () => {
      if (!selectedPhotographer?.photographerId || !event) {
        setAvailableTimes([]);
        return;
      }

      try {
        console.log("🎪 Loading available times for EVENT photographer:", {
          photographerId: selectedPhotographer.photographerId,
          eventName: event.name,
          eventTimeRange: `${formatTime(event.startDate)} - ${formatTime(event.endDate)}`
        });

        // Get event date (events have fixed date)
        const eventDate = new Date(event.startDate);
        const year = eventDate.getFullYear();
        const month = String(eventDate.getMonth() + 1).padStart(2, '0');
        const day = String(eventDate.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        // ✅ Call API to get available times for photographer
        const allAvailableTimes = await getAvailableTimesForDate(
          selectedPhotographer.photographerId, 
          dateString
        );

        // 🎯 FILTER: Only get times within event time range
        const eventStartTime = formatTime(event.startDate); // "10:00"
        const eventEndTime = formatTime(event.endDate);     // "16:00"
        
        const eventAvailableTimes = allAvailableTimes.filter(time => {
          return time >= eventStartTime && time < eventEndTime;
        });

        console.log("✅ Filtered available times for event:", {
          allTimes: allAvailableTimes,
          eventTimeRange: `${eventStartTime} - ${eventEndTime}`,
          filteredTimes: eventAvailableTimes,
          isEmpty: eventAvailableTimes.length === 0
        });

        setAvailableTimes(eventAvailableTimes);

        // Reset selected times if they're no longer available
        if (selectedStartTime && !eventAvailableTimes.includes(selectedStartTime)) {
          setSelectedStartTime("");
          setSelectedEndTime("");
        }

      } catch (error) {
        console.error("❌ Error loading event available times:", error);
        setAvailableTimes([]);
      }
    };

    loadAvailableTimesForEvent();
  }, [selectedPhotographer?.photographerId, event, getAvailableTimesForDate]);

  // ✅ REMOVED: generateTimeSlots function (no longer needed)
  // Now using availableTimes from API directly

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

  // ✅ UPDATED: Use API times instead of generated times
  const getEndTimeOptions = () => {
    if (!selectedStartTime) return [];
    const startIndex = availableTimes.indexOf(selectedStartTime);
    return availableTimes.slice(startIndex + 1);
  };

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
    
    // Create date in local timezone
    const eventDate = new Date(event.startDate);
    
    // Format as YYYY-MM-DDTHH:MM:SS in local time
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localDate = new Date(
      eventDate.getFullYear(),
      eventDate.getMonth(),
      eventDate.getDate(),
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
  
    console.log('Ngày sự kiện gốc:', event.startDate);
    console.log('Thời gian đã chọn:', timeString);
    console.log('Kết quả sau khi tạo (local):', localDate.toString());
    console.log('Kết quả gửi lên API:', localDateTimeString);
    
    return localDateTimeString;
  };

  const validateBookingData = () => {
    const errors = [];

    if (!user?.id) errors.push("User ID is required");
    if (!event.eventId) errors.push("Event ID is required");
    if (!selectedPhotographer?.eventPhotographerId) errors.push("Event Photographer ID is required");
    if (!selectedStartTime) errors.push("Start time is required");
    if (!selectedEndTime) errors.push("End time is required");

    // Validate time logic
    const startIdx = availableTimes.indexOf(selectedStartTime);
    const endIdx = availableTimes.indexOf(selectedEndTime);
    if (endIdx <= startIdx) errors.push("End time must be after start time");

    return errors;
  };

  // Event handlers
  const handleStartTimeSelect = (time: string) => {
    setSelectedStartTime(time);
    if (selectedEndTime && availableTimes.indexOf(selectedEndTime) <= availableTimes.indexOf(time)) {
      setSelectedEndTime("");
    }
  };

  const handleEndTimeSelect = (time: string) => {
    setSelectedEndTime(time);
  };

  const handlePhotographerSelect = (photographer: any) => {
    setSelectedPhotographer(photographer);
    // Reset times when photographer changes (will reload via useEffect)
    setSelectedStartTime("");
    setSelectedEndTime("");
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

  // Validate form
  const isFormValid =
    selectedStartTime &&
    selectedEndTime &&
    selectedPhotographer &&
    !isProcessing &&
    !bookingLoading &&
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
              {formatDate(event.startDate)}
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

          {/* Step 1: Photographer Selection */}
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

          {/* Step 2: Time Selection - Only show if photographer is selected */}
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
                      2
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
                key="photographer-available-time-info"
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
                  📅 {selectedPhotographer.photographer?.fullName} có lịch làm: {formatTime(event.startDate)} - {formatTime(event.endDate)}
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
                {availableTimes.map((time, index) => (
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

          {/* Step 3: Special Requests - Only show if time is selected */}
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
                      3
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
              {!selectedPhotographer
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