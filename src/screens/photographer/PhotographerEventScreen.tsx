// screens/PhotographerEventScreen.tsx

import React, { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
  Alert,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useEventDiscovery,
  useEventSearch,
  usePhotographerApplications,
  useApplicationActions,
  useEventDetail,
  useApprovedPhotographers,
} from "../../hooks/usePhotographerEvent";
import {
  LocationEvent,
  EventApplication,
  ApplicationStatus,
  EventStatus,
} from "../../types/photographerEvent";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  DollarSign,
  Search,
  Send,
  X,
  CheckCircle,
  XCircle,
  Loader,
} from "lucide-react-native";
import { usePhotographerAuth } from "../../hooks/usePhotographerAuth";
import { useSubscriptionStatus } from "../../hooks/useSubscriptionStatus";
import SubscriptionRequiredOverlay from "../../components/SubscriptionRequiredOverlay";
import { useEventPrimaryImage } from "../../hooks/useImages";
import { usePhotographerProfile } from "src/hooks/usePhotographerProfile";
import { useAvailability } from "../../hooks/useAvailability";
interface PhotographerEventScreenProps {
  navigation: any;
}

const PhotographerEventScreen: React.FC<PhotographerEventScreenProps> = ({
  navigation,
}) => {
  const {
    photographerId,
    userId,
    isLoading: authLoading,
    error: authError,
    photographer,
  } = usePhotographerAuth();
  const {
    getAvailableSlotsForDate,
    getAvailableTimesForDate,
    isTimeSlotAvailable,
    loadingSlots,
    availabilities, // Thêm availabilities để access availability data
    fetchPhotographerAvailability, // Thêm function để fetch availability
  } = useAvailability();
  const [activeTab, setActiveTab] = useState<"discover" | "applications">(
    "discover"
  );
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<LocationEvent | null>(
    null
  );
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationRate, setApplicationRate] = useState("");
  // const {
  //   photographer: photographerProfile,
  //   loading: profileLoading,
  // } = usePhotographerProfile();
  const hourlyRate = photographer?.hourlyRate;
  const { findByUserId } = usePhotographerProfile();
  const [rateError, setRateError] = useState<string | null>(null);
  const { width: screenWidth } = Dimensions.get("window");
  const {
    hasActiveSubscription,
    isLoading: subscriptionLoading,
    refreshSubscriptionStatus,
  } = useSubscriptionStatus(photographerId);

  useFocusEffect(
    React.useCallback(() => {
      console.log("🔍 Screen focused, refreshing subscription status...");
      refreshSubscriptionStatus();
    }, [refreshSubscriptionStatus])
  );
  // Hooks
  const {
    activeEvents,
    upcomingEvents,
    featuredEvents,
    loading: discoveryLoading,
    error: discoveryError,
    refetch: refetchDiscovery,
  } = useEventDiscovery();

  const {
    events: searchResults,
    loading: searchLoading,
    searchEvents,
  } = useEventSearch();

  const {
    applications,
    loading: applicationsLoading,
    error: applicationsError,
    refetch: refetchApplications,
  } = usePhotographerApplications(photographerId);

  const {
    applyToEvent,
    withdrawApplication,
    checkApplicationEligibility,
    getApplicationStatus,
    loading: actionLoading,
    error: actionError,
  } = useApplicationActions();

  const {
    event: eventDetail,
    loading: detailLoading,
    refetch: refetchEventDetail,
  } = useEventDetail(selectedEvent?.eventId || null);

  const {
    photographers: approvedPhotographers,
    loading: photographersLoading,
  } = useApprovedPhotographers(selectedEvent?.eventId || null);

  // Effects
  useEffect(() => {
    if (searchQuery.trim()) {
      const delayedSearch = setTimeout(() => {
        searchEvents(searchQuery);
      }, 500);
      return () => clearTimeout(delayedSearch);
    }
  }, [searchQuery, searchEvents]);

  const validateSpecialRate = useCallback(
    (rate: string): string | null => {
      const trimmedRate = rate.trim();

      if (!trimmedRate) {
        return null; // Empty is OK (optional field)
      }

      const numericRate = parseFloat(trimmedRate);

      if (isNaN(numericRate) || numericRate <= 0) {
        return "Giá phải là số dương";
      }

      const photographerHourlyRate = photographer?.hourlyRate;

      console.log("Rate validation:", {
        inputRate: numericRate,
        photographerRate: photographerHourlyRate,
        hasPhotographer: !!photographer,
      });

      if (photographerHourlyRate && numericRate >= photographerHourlyRate) {
        return `Giá đặc biệt phải thấp hơn giá thông thường của bạn (${new Intl.NumberFormat(
          "vi-VN",
          {
            style: "currency",
            currency: "VND",
          }
        ).format(photographerHourlyRate)})`;
      }

      return null;
    },
    [photographer?.hourlyRate]
  );

  const handleRateChange = useCallback(
    (text: string) => {
      setApplicationRate(text);
      const error = validateSpecialRate(text);
      setRateError(error);
    },
    [validateSpecialRate]
  );
  const checkPhotographerAvailabilityForEvent = async (event: LocationEvent): Promise<{
  hasAvailability: boolean;
  availableDays: string[];
  message: string;
}> => {
  if (!photographerId) {
    return {
      hasAvailability: false,
      availableDays: [],
      message: "Không tìm thấy thông tin photographer"
    };
  }

  try {
    setCheckingAvailability(true);
    
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    const availableDays: string[] = [];
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    
    console.log('Checking availability for event:', {
      eventId: event.eventId,
      eventName: event.name,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      photographerId
    });
    
    // Get photographer's availability data first
    await fetchPhotographerAvailability(photographerId);
    
    // Get unique days of week in the event period
    const eventDaysOfWeek = new Set<number>();
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
      eventDaysOfWeek.add(dayOfWeek);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log('Event covers days of week:', Array.from(eventDaysOfWeek));
    console.log('Current availabilities:', availabilities);
    
    // Check if photographer has availability for any of these days
    for (const dayOfWeek of eventDaysOfWeek) {
      console.log(`Checking dayOfWeek ${dayOfWeek} (${dayNames[dayOfWeek]})`);
      
      // Find availability slots for this day of week
      const dayAvailabilities = availabilities.filter(
        (availability) => availability.dayOfWeek === dayOfWeek && availability.status === 'Available'
      );
      
      console.log(`Available slots for ${dayNames[dayOfWeek]}:`, dayAvailabilities);
      
      if (dayAvailabilities.length > 0) {
        availableDays.push(dayNames[dayOfWeek]);
      }
    }
    
    console.log('Availability check result:', {
      availableDays,
      hasAvailability: availableDays.length > 0
    });
    
    if (availableDays.length === 0) {
      const eventDaysList = Array.from(eventDaysOfWeek).map(day => dayNames[day]).join(', ');
      return {
        hasAvailability: false,
        availableDays: [],
        message: `Bạn không có khung giờ rảnh nào trong các ngày diễn ra sự kiện (${eventDaysList}). Sự kiện diễn ra từ ${formatDate(event.startDate)} đến ${formatDate(event.endDate)}.\n\nVui lòng cập nhật lịch làm việc của bạn trước khi đăng ký.`
      };
    }
    
    return {
      hasAvailability: true,
      availableDays,
      message: `Bạn có khung giờ rảnh trong các ngày: ${availableDays.join(', ')}`
    };
    
  } catch (error) {
    console.error('Error checking photographer availability:', error);
    return {
      hasAvailability: false,
      availableDays: [],
      message: "Có lỗi xảy ra khi kiểm tra lịch rảnh. Vui lòng thử lại."
    };
  } finally {
    setCheckingAvailability(false);
  }
};

  // Handle keyboard dismiss when modal closes
  useEffect(() => {
    if (!showApplicationModal) {
      Keyboard.dismiss();
      setApplicationRate(""); // Clear rate when modal closes
    }
  }, [showApplicationModal]);

  // Handlers
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      if (activeTab === "discover") {
        await refetchDiscovery();
      } else {
        await refetchApplications();
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleEventPress = (event: LocationEvent) => {
    setSelectedEvent(event);
  };

  const handleApplyPress = async (event: LocationEvent) => {
  try {
    // Show loading
    setCheckingAvailability(true);
    
    // 1. Check application eligibility first (existing logic)
    const canApply = await checkApplicationEligibility(
      event.eventId,
      photographerId ?? 0
    );

    if (!canApply) {
      Alert.alert(
        "Không thể đăng ký",
        "Bạn không đủ điều kiện để đăng ký sự kiện này hoặc đã đăng ký rồi."
      );
      return;
    }

    // 2. Check photographer availability during event period
    const availabilityCheck = await checkPhotographerAvailabilityForEvent(event);
    
    if (!availabilityCheck.hasAvailability) {
      Alert.alert(
        "Không có lịch rảnh", 
        availabilityCheck.message,
        [
          {
            text: "Cập nhật lịch",
            onPress: () => {
              // Navigate to availability management screen
              navigation.navigate("ManageAvailabilityScreen");
            }
          },
          {
            text: "Đóng",
            style: "cancel"
          }
        ]
      );
      return;
    }

    // 3. Show success message and proceed to application modal
    console.log('Availability check passed:', availabilityCheck.message);
    
    // Optional: Show available days info
    Alert.alert(
      "Có thể đăng ký!",
      availabilityCheck.message,
      [
        {
          text: "Tiếp tục đăng ký",
          onPress: () => {
            setSelectedEvent(event);
            setShowApplicationModal(true);
          }
        },
        {
          text: "Hủy",
          style: "cancel"
        }
      ]
    );
    
  } catch (error) {
    console.error('Error in handleApplyPress:', error);
    Alert.alert(
      "Lỗi",
      "Có lỗi xảy ra khi kiểm tra thông tin. Vui lòng thử lại."
    );
  } finally {
    setCheckingAvailability(false);
  }
};

  const handleSubmitApplication = async () => {
    if (!selectedEvent) return;

    // Validate rate trước khi submit
    const validationError = validateSpecialRate(applicationRate);
    if (validationError) {
      setRateError(validationError);
      return;
    }

    const success = await applyToEvent({
      eventId: selectedEvent.eventId,
      photographerId: photographerId ?? 0,
      specialRate: applicationRate ? parseFloat(applicationRate) : undefined,
    });

    if (success) {
      Alert.alert(
        "Success",
        "Your application has been submitted successfully!"
      );
      setShowApplicationModal(false);
      setApplicationRate("");
      setRateError(null);
      refetchApplications();
    } else {
      Alert.alert("Error", actionError || "Failed to submit application");
    }
  };
  useEffect(() => {
    if (!showApplicationModal) {
      Keyboard.dismiss();
      setApplicationRate("");
      setRateError(null); // Clear error when modal closes
    }
  }, [showApplicationModal]);

  const handleWithdrawApplication = async (eventId: number) => {
    Alert.alert(
      "Hủy Đơn",
      "Bạn có chắc chắn muốn hủy đơn đăng ký của mình không?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xác Nhận",
          style: "destructive",
          onPress: async () => {
            const success = await withdrawApplication(
              eventId,
              photographerId ?? 0
            );
            if (success) {
              Alert.alert("Success", "Đơn đăng ký đã được hủy thành công");
              refetchApplications();
            } else {
              Alert.alert("Error", actionError || "Không thể hủy đơn đăng ký");
            }
          },
        },
      ]
    );
  };

  const getApplicationStatusForEvent = (
    eventId: number
  ): ApplicationStatus | null => {
    const application = applications.find((app) => app.eventId === eventId);
    return application ? application.status : null;
  };

  const getApplicationForEvent = (
    eventId: number
  ): EventApplication | undefined => {
    return applications.find((app) => app.eventId === eventId);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("vi-VN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      return "N/A";
    }
  };

  const formatPrice = (price?: number) => {
    if (!price || price === 0) return "Miễn phí";
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };
  const getEventStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "#10B981";
      case "Active":
        return "#3B82F6";
      case "Closed":
        return "#6B7280";
      case "Cancelled":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.APPROVED:
        return "#10B981";
      case ApplicationStatus.REJECTED:
        return "#EF4444";
      case ApplicationStatus.APPLIED:
        return "#F59E0B";
      default:
        return "#6B7280";
    }
  };

  const getStatusIcon = (status: ApplicationStatus) => {
    switch (status) {
      case ApplicationStatus.APPROVED:
        return <CheckCircle size={16} color="#10B981" />;
      case ApplicationStatus.REJECTED:
        return <XCircle size={16} color="#EF4444" />;
      case ApplicationStatus.APPLIED:
        return <Loader size={16} color="#F59E0B" />;
      default:
        return null;
    }
  };

  // Event Card Component
  const EventCard: React.FC<{
    event: LocationEvent;
    showApplicationStatus?: boolean;
  }> = ({ event, showApplicationStatus = false }) => {
    const application = showApplicationStatus
      ? getApplicationForEvent(event.eventId)
      : null;

    // Sử dụng hook có sẵn để lấy primary image
    const primaryImageUrl = useEventPrimaryImage(event.eventId);

    // Ưu tiên sử dụng primaryImage từ API response, fallback về hook
    const displayImageUrl = event.primaryImage?.url || primaryImageUrl;

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={() => handleEventPress(event)}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          {displayImageUrl ? (
            <Image
              source={{ uri: displayImageUrl }}
              style={styles.eventImage}
            />
          ) : (
            <LinearGradient
              colors={["#667eea", "#764ba2"]}
              style={styles.eventImage}
            >
              <View style={styles.placeholderContainer}>
                <Calendar size={32} color="#FFFFFF" />
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            </LinearGradient>
          )}

          {/* Image Overlay */}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.7)"]}
            style={styles.imageOverlay}
          >
            {/* Status Badge on Image */}
            <View
              style={[
                styles.imageStatusBadge,
                { backgroundColor: getEventStatusColor(event.status) },
              ]}
            >
              <Text style={styles.imageStatusText}>{event.status}</Text>
            </View>

            {/* Price Tag */}
            {event.discountedPrice && event.discountedPrice > 0 && (
              <View style={styles.priceTag}>
                <Text style={styles.priceText}>
                  {formatPrice(event.discountedPrice)}
                </Text>
              </View>
            )}
          </LinearGradient>
        </View>

        {/* Rest of the card content... */}
        <View style={styles.eventContent}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {event.name}
          </Text>

          {event.description && (
            <Text style={styles.eventDescription} numberOfLines={3}>
              {event.description}
            </Text>
          )}

          {/* Info Section */}
          <View style={styles.infoSection}>
            {event.location?.name && (
              <View style={styles.eventInfo}>
                <View style={styles.iconContainer}>
                  <MapPin size={12} color="#667eea" />
                </View>
                <Text style={styles.eventInfoText} numberOfLines={1}>
                  {event.location.name}
                </Text>
              </View>
            )}

            <View style={styles.eventInfo}>
              <View style={styles.iconContainer}>
                <Calendar size={12} color="#667eea" />
              </View>
              <Text style={styles.eventInfoText} numberOfLines={1}>
                {formatDate(event.startDate)}
              </Text>
              <Text style={styles.eventInfoText} numberOfLines={1}>
                {formatDate(event.endDate)}
              </Text>
            </View>

            {event.maxPhotographers && (
              <View style={styles.eventInfo}>
                <View style={styles.iconContainer}>
                  <Users size={12} color="#667eea" />
                </View>
                <Text style={styles.eventInfoText}>
                  {event.approvedPhotographersCount || 0}/
                  {event.maxPhotographers} spots
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(
                          ((event.approvedPhotographersCount || 0) /
                            event.maxPhotographers) *
                            100,
                          100
                        )}%`,
                        backgroundColor:
                          (event.approvedPhotographersCount || 0) ===
                          event.maxPhotographers
                            ? "#EF4444"
                            : "#10B981",
                      },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Apply/Status Button */}
          {!showApplicationStatus &&
            event.status === "Open" &&
            (() => {
              const applicationStatus = getApplicationStatusForEvent(
                event.eventId
              );

              if (applicationStatus) {
                return (
                  <View
                    style={[
                      styles.statusButton,
                      {
                        backgroundColor:
                          getStatusColor(applicationStatus) + "15",
                      },
                    ]}
                  >
                    {getStatusIcon(applicationStatus)}
                    <Text
                      style={[
                        styles.statusButtonText,
                        { color: getStatusColor(applicationStatus) },
                      ]}
                    >
                      {applicationStatus === ApplicationStatus.APPLIED &&
                        "Applied"}
                      {applicationStatus === ApplicationStatus.APPROVED &&
                        "Approved"}
                      {applicationStatus === ApplicationStatus.REJECTED &&
                        "Rejected"}
                    </Text>
                  </View>
                );
              } else {
                return (
                  <TouchableOpacity
                    style={[
                      styles.applyButton,
                      (checkingAvailability || loadingSlots) &&
                        styles.disabledButton,
                    ]}
                    onPress={() => handleApplyPress(event)}
                    activeOpacity={0.8}
                    disabled={checkingAvailability || loadingSlots}
                  >
                    <LinearGradient
                      colors={["#667eea", "#764ba2"]}
                      style={styles.applyButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      {checkingAvailability || loadingSlots ? (
                        <Loader size={14} color="#FFFFFF" />
                      ) : (
                        <Send size={14} color="#FFFFFF" />
                      )}
                      <Text style={styles.applyButtonText}>
                        {checkingAvailability || loadingSlots
                          ? "Kiểm tra..."
                          : "Nộp Đơn Ngay"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              }
            })()}

          {showApplicationStatus && application && (
            <View
              style={[
                styles.statusButton,
                { backgroundColor: getStatusColor(application.status) + "15" },
              ]}
            >
              {getStatusIcon(application.status)}
              <Text
                style={[
                  styles.statusButtonText,
                  { color: getStatusColor(application.status) },
                ]}
              >
                Application {application.status}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render Methods
  const renderDiscoveryTab = () => {
    console.log("Rendering discovery tab:");
    console.log("Featured events:", featuredEvents);
    console.log("Active events:", activeEvents);
    console.log("Upcoming events:", upcomingEvents);
    console.log("Discovery loading:", discoveryLoading);
    console.log("Discovery error:", discoveryError);

    return (
      <View style={styles.container}>
        <View style={styles.searchSection}>
          <View style={styles.searchContainer}>
            <Search size={18} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search events..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <X size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {discoveryLoading && (
            <Text style={styles.loadingText}>Loading events...</Text>
          )}

          {discoveryError && (
            <Text style={styles.errorText}>Error: {discoveryError}</Text>
          )}

          {searchQuery.trim() ? (
            <View>
              <Text style={styles.sectionTitle}>Search Results</Text>
              {searchLoading ? (
                <Text style={styles.loadingText}>Searching...</Text>
              ) : searchResults.length === 0 ? (
                <Text style={styles.emptyText}>No search results found</Text>
              ) : (
                searchResults.map((event) => (
                  <EventCard key={event.eventId} event={event} />
                ))
              )}
            </View>
          ) : (
            <>
              {featuredEvents.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    Các Sự Kiện Đang Diễn Ra ({featuredEvents.length})
                  </Text>
                  {featuredEvents.map((event) => (
                    <EventCard key={event.eventId} event={event} />
                  ))}
                </View>
              )}
              {!discoveryLoading &&
                featuredEvents.length === 0 &&
                activeEvents.length === 0 &&
                upcomingEvents.length === 0 && (
                  <Text style={styles.emptyText}>
                    Không có sự kiện nào đang diễn ra
                  </Text>
                )}
            </>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderApplicationsTab = () => {
    console.log("Applications data:", applications);
    applications.forEach((app, index) => {
      console.log(`App ${index}:`, {
        eventName: app.eventName,
        eventStatus: app.eventStatus,
        specialRate: app.specialRate,
      });
    });

    return (
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.sectionTitle}>My Applications</Text>

        {applicationsLoading ? (
          <Text style={styles.loadingText}>Loading applications...</Text>
        ) : applicationsError ? (
          <Text style={styles.errorText}>Error: {applicationsError}</Text>
        ) : applications.length === 0 ? (
          <Text style={styles.emptyText}>No applications yet</Text>
        ) : (
          applications.map((application) => {
            const eventFromApplication: LocationEvent = {
              eventId: application.eventId,
              locationId: 0,
              name: application.eventName || "Tên sự kiện không có", // Safe fallback
              description: undefined,
              startDate: application.eventStartDate || "",
              endDate: application.eventEndDate || "",
              discountedPrice:
                application.specialRate !== undefined &&
                application.specialRate > 0
                  ? application.specialRate
                  : undefined,
              originalPrice: undefined,
              status: application.eventStatus as EventStatus,
              approvedPhotographersCount: 0,
              totalBookingsCount: 0,
              createdAt: application.appliedAt || new Date().toISOString(),
              updatedAt: application.appliedAt || new Date().toISOString(),
              maxPhotographers: 0,
              maxBookingsPerSlot: 0,
            };

            return (
              <View
                key={application.eventPhotographerId || application.eventId}
                style={styles.applicationCard}
              >
                <EventCard event={eventFromApplication} showApplicationStatus />

                {/* Application specific info */}
                <View style={styles.applicationInfo}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          getStatusColor(application.status) + "20",
                      },
                    ]}
                  >
                    {getStatusIcon(application.status)}
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStatusColor(application.status) },
                      ]}
                    >
                      {application.status}
                    </Text>
                  </View>

                  <Text style={styles.applicationDate}>
                    Đã Nộp Đơn: {formatDate(application.appliedAt)}
                  </Text>

                  {application.approvedAt && (
                    <Text style={styles.applicationDate}>
                      Đã Duyệt: {formatDate(application.approvedAt)}
                    </Text>
                  )}

                  {application.specialRate !== null &&
                    application.specialRate !== undefined &&
                    application.specialRate > 0 && (
                      <Text style={styles.specialRate}>
                        Giá khuyến mãi của bạn:{" "}
                        {formatPrice(application.specialRate)}
                      </Text>
                    )}
                </View>

                {application.status === ApplicationStatus.APPLIED && (
                  <TouchableOpacity
                    style={styles.withdrawButton}
                    onPress={() =>
                      handleWithdrawApplication(application.eventId)
                    }
                  >
                    <Text style={styles.withdrawButtonText}>Withdraw</Text>
                  </TouchableOpacity>
                )}

                {application.rejectionReason && (
                  <Text style={styles.rejectionReason}>
                    Lý do: {application.rejectionReason}
                  </Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    );
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <SafeAreaView style={styles.safeArea}>
        {/* Enhanced Header */}
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.headerTitle}>Sự Kiện Dành Cho PhotoPhone </Text>
          <Text style={styles.headerSubtitle}>
            Hãy tham gia để khám phá những cơ hội tuyệt vời
          </Text>
        </LinearGradient>

        {/* Enhanced Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "discover" && styles.activeTab]}
            onPress={() => setActiveTab("discover")}
            activeOpacity={0.8}
          >
            <View style={styles.tabContent}>
              <Search
                size={18}
                color={activeTab === "discover" ? "#667eea" : "#9CA3AF"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "discover" && styles.activeTabText,
                ]}
              >
                Các sự kiện
              </Text>
            </View>
            {activeTab === "discover" && <View style={styles.tabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "applications" && styles.activeTab,
            ]}
            onPress={() => setActiveTab("applications")}
            activeOpacity={0.8}
          >
            <View style={styles.tabContent}>
              <Send
                size={18}
                color={activeTab === "applications" ? "#667eea" : "#9CA3AF"}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "applications" && styles.activeTabText,
                ]}
              >
                Đơn đã nộp
              </Text>
              {applications.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{applications.length}</Text>
                </View>
              )}
            </View>
            {activeTab === "applications" && (
              <View style={styles.tabIndicator} />
            )}
          </TouchableOpacity>
        </View>

        {/* Content */}
        {activeTab === "discover"
          ? renderDiscoveryTab()
          : renderApplicationsTab()}

        {/* Application Modal */}
        <Modal
          visible={showApplicationModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowApplicationModal(false)}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>
                        Nộp Đơn Tham Gia Sự Kiện
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowApplicationModal(false)}
                      >
                        <X size={24} color="#6B7280" />
                      </TouchableOpacity>
                    </View>

                    {selectedEvent && (
                      <ScrollView
                        style={styles.modalScrollView}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                      >
                        <View style={styles.modalBody}>
                          <Text style={styles.eventName}>
                            {selectedEvent.name}
                          </Text>

                          {/* Updated input container with validation */}
                          <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>
                              Giá khuyến mãi bạn đề xuất
                            </Text>
                            <TextInput
                              style={[
                                styles.input,
                                rateError && styles.inputError, // Apply error style
                              ]}
                              placeholder="Nhập giá đặc biệt cho sự kiện này"
                              value={applicationRate}
                              onChangeText={handleRateChange} // Use validation handler
                              keyboardType="numeric"
                              returnKeyType="done"
                              onSubmitEditing={Keyboard.dismiss}
                              blurOnSubmit={true}
                            />

                            {/* Error message */}
                            {rateError && (
                              <Text style={styles.errorMessage}>
                                {rateError}
                              </Text>
                            )}

                            {/* Updated hint text */}
                            <Text style={styles.inputHint}>
                              {photographer?.hourlyRate
                                ? `Hãy điền giá khuyến mãi của bạn. Giá thông thường của bạn: ${new Intl.NumberFormat(
                                    "vi-VN",
                                    {
                                      style: "currency",
                                      currency: "VND",
                                    }
                                  ).format(photographer.hourlyRate)}`
                                : `Để trống để sử dụng giá mặc định của sự kiện: ${formatPrice(
                                    selectedEvent?.discountedPrice
                                  )}`}
                            </Text>
                          </View>

                          <View style={styles.modalActions}>
                            <TouchableOpacity
                              style={styles.cancelButton}
                              onPress={() => {
                                Keyboard.dismiss();
                                setShowApplicationModal(false);
                              }}
                            >
                              <Text style={styles.cancelButtonText}>Hủy</Text>
                            </TouchableOpacity>

                            {/* Updated submit button with validation check */}
                            <TouchableOpacity
                              style={[
                                styles.submitButton,
                                (actionLoading || rateError) &&
                                  styles.disabledButton, // Disable when error
                              ]}
                              onPress={() => {
                                Keyboard.dismiss();
                                handleSubmitApplication();
                              }}
                              disabled={actionLoading || Boolean(rateError)} // Disable when error
                            >
                              {actionLoading ? (
                                <Loader size={16} color="#FFFFFF" />
                              ) : (
                                <Send size={16} color="#FFFFFF" />
                              )}
                              <Text style={styles.submitButtonText}>
                                {actionLoading ? "Nộp Đơn..." : "Nộp Đơn"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </ScrollView>
                    )}
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
        <SubscriptionRequiredOverlay
          isVisible={!hasActiveSubscription && !subscriptionLoading}
          onNavigateToSubscription={() =>
            navigation.navigate("SubscriptionManagement")
          }
        />
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#667eea",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#E0E7FF",
    opacity: 0.9,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
    paddingTop: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  tab: {
    flex: 1,
    position: "relative",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#3B82F6",
  },
  tabText: {
    fontSize: 16,
    color: "#9CA3AF",
    marginLeft: 8,
    fontWeight: "500",
  },
  activeTabText: {
    color: "#667eea",
    fontWeight: "600",
  },
  tabBadge: {
    backgroundColor: "#EF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabIndicator: {
    position: "absolute",
    bottom: 0,
    left: "25%",
    right: "25%",
    height: 3,
    backgroundColor: "#667eea",
    borderRadius: 2,
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1E293B",
  },
  clearButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  section: {
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginHorizontal: 20,
    marginVertical: 16,
  },
  ectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginHorizontal: 20,
    marginVertical: 16,
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  imageContainer: {
    position: "relative",
  },
  eventImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  placeholderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#FFFFFF",
    fontSize: 14,
    marginTop: 8,
    opacity: 0.8,
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    justifyContent: "space-between",
    padding: 16,
  },
  imageStatusBadge: {
    position: "absolute",
    top: 55,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageStatusText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  priceTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: "auto",
  },
  priceText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  eventContent: {
    padding: 20,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
    lineHeight: 24,
  },
  eventDescription: {
    fontSize: 14,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 16,
  },
  infoSection: {
    marginBottom: 16,
  },
  eventInfo: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
  },
  iconContainer: {
    width: 20,
    alignItems: "center",
  },
  eventInfoText: {
    fontSize: 14,
    color: "#64748B",
    marginLeft: 12,
    flex: 1,
  },

  originalPrice: {
    textDecorationLine: "line-through",
    color: "#9CA3AF",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  applyButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  applyButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  applicationCard: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  applicationInfo: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  applicationDate: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  specialRate: {
    fontSize: 12,
    color: "#3B82F6",
    fontWeight: "600",
    marginTop: 4,
  },
  withdrawButton: {
    backgroundColor: "#EF4444",
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  withdrawButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  rejectionReason: {
    fontSize: 12,
    color: "#EF4444",
    marginHorizontal: 16,
    marginBottom: 12,
    fontStyle: "italic",
  },
  loadingText: {
    textAlign: "center",
    color: "#6B7280",
    marginVertical: 20,
  },
  emptyText: {
    textAlign: "center",
    color: "#6B7280",
    marginVertical: 20,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    minHeight: "50%",
  },
  modalScrollView: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  modalBody: {
    padding: 16,
    paddingBottom: 40,
  },
  eventName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },
  inputHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#6B7280",
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#3B82F6",
  },
  submitButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
  },
  appliedButton: {
    backgroundColor: "#6B7280", // Màu xám để thể hiện disabled
    opacity: 0.7,
  },
  appliedButtonText: {
    color: "#FFFFFF",
  },
  statusButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    marginLeft: 12,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 2,
  },
  inputError: {
    borderColor: "#EF4444",
    borderWidth: 2,
  },
  errorMessage: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
    fontWeight: "500",
  },
});

export default PhotographerEventScreen;
