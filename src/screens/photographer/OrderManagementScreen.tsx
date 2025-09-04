import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  RootStackParamList,
  PhotographerTabParamList,
} from "../../navigation/types";
import { CompositeScreenProps } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBookings } from "../../hooks/useBookingPhotographer";
import { usePhotoDelivery } from "../../hooks/usePhotoDelivery";
import { BookingCardData } from "../../types/booking";
import { usePhotographerAuth } from "../../hooks/usePhotographerAuth";
import { useSubscriptionStatus } from "../../hooks/useSubscriptionStatus";
import SubscriptionRequiredOverlay from "../../components/SubscriptionRequiredOverlay";
import { useComplaintsAgainstMe } from "../../hooks/useComplaintsAgainstMe";
import WalletTopUpModal from "../../components/WalletTopUpModal";
// ✅ ADD THESE IMPORTS:
import { useChat } from "../../hooks/useChat";
import { useAuth } from "../../hooks/useAuth";

type Props = CompositeScreenProps<
  BottomTabScreenProps<PhotographerTabParamList, "OrderManagementScreen">,
  NativeStackScreenProps<RootStackParamList>
>;

export default function OrderManagementScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<
    "confirmed" | "completed" | "complaints" | "cancelled"
  >("confirmed");

  // ✅ ADD AUTH CONTEXT:
  const { getCurrentUserId, user } = useAuth();
  const currentUserId = getCurrentUserId();

  // ✅ GET REAL PHOTOGRAPHER ID:
  const {
    userId,
    photographerId,
    isPhotographer,
    isLoading: authLoading,
    error: authError,
    hasPhotographerProfile,
  } = usePhotographerAuth();

  const {
    loading,
    refreshing,
    error,
    refreshBookings,
    acceptBooking,
    rejectBooking,
    completeBooking,
    getBookingsByStatus,
    getBookingCounts,
    hasMorePages,
    loadMoreBookings,
    bookings, // Raw bookings data
    getBookingsForUI, // UI transformed data
  } = useBookings(photographerId ?? 0);

  // Photo Delivery hook
  const {
    hasPhotoDelivery,
    getPhotoDeliveryForBooking,
    refreshPhotoDeliveries,
  } = usePhotoDelivery(photographerId ?? 0);

  // ✅ ADD CHAT HOOK:
  const {
    createDirectConversation,
    error: chatError,
    creatingConversation,
    conversations, // ✅ For debugging
  } = useChat({
    userId: currentUserId || 0,
    autoRefresh: false,
    enableRealtime: true,
  });

  const {
    complaints,
    loading: complaintsLoading,
    error: complaintsError,
    hasComplaints,
    getComplaintsByBookingId,
    pendingComplaintsCount,
    refreshComplaints,
  } = useComplaintsAgainstMe();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };
  const {
    hasActiveSubscription,
    isLoading: subscriptionLoading,
    refreshSubscriptionStatus,
  } = useSubscriptionStatus(photographerId);
  useFocusEffect(
    React.useCallback(() => {
      console.log("🔍 Screen focused, refreshing subscription status...");
      refreshSubscriptionStatus();
      refreshComplaints();
      refreshBookings();
    }, [refreshSubscriptionStatus, refreshComplaints, refreshBookings])
  );

  const formatDateTime = (date: string, time: string) => {
    const dateObj = new Date(date);
    return `${dateObj.toLocaleDateString("vi-VN")} lúc ${time}`;
  };

  const getStatusColor = (status: string, hasComplaint: boolean = false) => {
    // Nếu đơn hàng bị complaint, dùng màu cảnh báo
    if (hasComplaint && status.toLowerCase() === "confirmed") {
      return { bg: "#FEF3C7", text: "#D97706" }; // Màu vàng cam cảnh báo
    }

    switch (status.toLowerCase()) {
      case "pending":
        return { bg: "#FEF3C7", text: "#D97706" };
      case "confirmed":
        return { bg: "#DBEAFE", text: "#2563EB" };
      case "completed":
        return { bg: "#D1FAE5", text: "#059669" };
      case "rejected":
      case "cancelled":
        return { bg: "#FEE2E2", text: "#DC2626" }; // Màu đỏ cho đã hủy
      case "in-progress":
        return { bg: "#E9D5FF", text: "#7C3AED" };
      default:
        return { bg: "#F3F4F6", text: "#6B7280" };
    }
  };

  const getStatusText = (status: string, hasComplaint: boolean = false) => {
    // Nếu đơn hàng bị complaint và đang confirmed, hiển thị "ĐANG XỬ LÝ"
    if (hasComplaint && status.toLowerCase() === "confirmed") {
      return "ĐANG XỬ LÝ";
    }

    switch (status.toLowerCase()) {
      case "pending":
        return "Chờ xác nhận";
      case "confirmed":
        return "Đã xác nhận";
      case "completed":
        return "Hoàn thành";
      case "rejected":
        return "Đã hủy";
      case "cancelled":
        return "Đã hủy";
      case "in-progress":
        return "Đang thực hiện";
      default:
        return "Không xác định";
    }
  };

  const getFilteredOrders = () => {
    // Debug log
    console.log("Active tab:", activeTab);
    console.log("All bookings:", bookings);
    console.log("All complaints:", complaints);

    if (activeTab === "complaints") {
      // Tab phàn nàn: chỉ hiển thị đơn có complaint CHƯA resolved (Pending/In Progress)
      const allBookings = [
        ...getBookingsByStatus("confirmed"),
        ...getBookingsByStatus("completed"),
      ];

      const filteredWithActiveComplaints = allBookings.filter((order) => {
        const bookingId = parseInt(order.id);
        const bookingComplaints = getComplaintsByBookingId(bookingId);

        // Chỉ hiển thị đơn có complaint chưa resolved
        const hasActiveComplaints = bookingComplaints.some(
          (complaint) => complaint.status !== "Resolved"
        );

        console.log(
          `Booking ${order.id}: hasActiveComplaints = ${hasActiveComplaints}`
        );
        return hasActiveComplaints;
      });

      console.log(
        "Filtered bookings with active complaints:",
        filteredWithActiveComplaints
      );
      return filteredWithActiveComplaints;
    } else if (activeTab === "confirmed") {
      // Tab đã nhận: loại bỏ đơn có complaint chưa resolved
      return getBookingsByStatus("confirmed").filter((order) => {
        const bookingId = parseInt(order.id);
        const bookingComplaints = getComplaintsByBookingId(bookingId);

        // Loại bỏ đơn có complaint chưa resolved
        const hasActiveComplaints = bookingComplaints.some(
          (complaint) => complaint.status !== "Resolved"
        );

        return !hasActiveComplaints;
      });
    } else if (activeTab === "cancelled") {
      // Tab đã hủy: chỉ hiển thị đơn có status cancelled
      return getBookingsByStatus("cancelled");
    }

    return getBookingsByStatus(activeTab);
  };
  const filteredOrders = getFilteredOrders();
  const bookingCounts = getBookingCounts();

  const handleCompleteOrder = async (bookingId: string) => {
    Alert.alert(
      "Hoàn thành đơn hàng",
      "Xác nhận đơn hàng này đã hoàn thành? Hành động này không thể hoàn tác.",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Hoàn thành",
          style: "default",
          onPress: async () => {
            try {
              console.log(`🔄 Completing booking ${bookingId}...`);

              // ✅ Sử dụng API Complete
              const success = await completeBooking(parseInt(bookingId));

              if (success) {
                console.log("✅ Booking completed successfully!");

                // Refresh data để đảm bảo UI được update
                await refreshBookings();

                // Optional: Trigger photo delivery refresh nếu cần
                await refreshPhotoDeliveries();
              }
            } catch (error) {
              console.error("❌ Error in handleCompleteOrder:", error);
              Alert.alert(
                "Lỗi",
                "Không thể hoàn thành đơn hàng. Vui lòng thử lại."
              );
            }
          },
        },
      ]
    );
  };

  const handlePhotoDelivery = (order: BookingCardData) => {
    const bookingId = parseInt(order.id);

    // Navigate to PhotoDeliveryScreen
    navigation.navigate("PhotoDeliveryScreen", {
      bookingId: bookingId,
      customerName: order.userName,
    });
  };

  // ✅ ADD NEW CHAT FUNCTION:
  const handleContactCustomer = async (order: BookingCardData) => {
    if (!currentUserId) {
      Alert.alert("Lỗi", "Vui lòng đăng nhập lại để sử dụng tính năng chat.");
      return;
    }

    try {
      // Get customer userId from booking
      const rawBooking = bookings.find(
        (b) => b.bookingId.toString() === order.id
      );

      if (!rawBooking || !rawBooking.userId) {
        Alert.alert(
          "Thông báo",
          "Chat chưa khả dụng cho đơn hàng này. Bạn có muốn liên hệ qua email?",
          [
            { text: "Hủy", style: "cancel" },
            {
              text: "Gửi Email",
              onPress: () =>
                Alert.alert("Liên hệ Email", `Email: ${order.customerEmail}`),
            },
          ]
        );
        return;
      }

      const customerId = rawBooking.userId;
      const customerName = order.userName || order.userName || "Khách hàng";

      // Create or get direct conversation with customer
      const conversation = await createDirectConversation(
        customerId,
        customerName
      );

      if (conversation) {
        // Navigate to chat screen
        navigation.navigate("ChatScreen", {
          conversationId: conversation.conversationId,
          title: `Chat với ${customerName}`,
          otherUser: {
            userId: customerId,
            userName: customerName,
            userFullName: customerName,
            userProfileImage: undefined,
          },
        });
      } else {
        throw new Error("Could not create conversation");
      }
    } catch (err) {
      console.error("❌ Error creating conversation:", err);

      Alert.alert(
        "Không thể kết nối chat",
        "Bạn có muốn liên hệ qua email thay thế?",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Gửi Email",
            onPress: () =>
              Alert.alert("Liên hệ Email", `Email: ${order.customerEmail}`),
          },
        ]
      );
    }
  };

  const getPhotoDeliveryButtonText = (order: BookingCardData): string => {
    const bookingId = parseInt(order.id);
    const hasDelivery = hasPhotoDelivery(bookingId);

    if (hasDelivery) {
      const delivery = getPhotoDeliveryForBooking(bookingId);
      if (delivery?.status.toLowerCase() === "delivered") {
        return "Đã gửi ảnh";
      }
      return "Cập nhật ảnh";
    }

    return "Gửi ảnh";
  };

  const getPhotoDeliveryButtonStyle = (order: BookingCardData) => {
    const bookingId = parseInt(order.id);
    const hasDelivery = hasPhotoDelivery(bookingId);

    if (hasDelivery) {
      const delivery = getPhotoDeliveryForBooking(bookingId);
      if (delivery?.status.toLowerCase() === "delivered") {
        return {
          backgroundColor: "#F3F4F6",
          textColor: "#6B7280",
        };
      }
      return {
        backgroundColor: "#FEF3E2",
        textColor: "#F59E0B",
      };
    }

    return {
      backgroundColor: "#D1FAE5",
      textColor: "#059669",
    };
  };

  const ComplaintSection = ({ bookingId }: { bookingId: number }) => {
    const bookingComplaints = getComplaintsByBookingId(bookingId);

    if (bookingComplaints.length === 0) return null;

    return (
      <View
        style={{
          backgroundColor: "#FEF2F2",
          borderRadius: 8,
          padding: 12,
          marginTop: 12,
          borderLeftWidth: 4,
          borderLeftColor: "#EF4444",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Ionicons name="warning" size={16} color="#EF4444" />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: "#EF4444",
              marginLeft: 6,
              letterSpacing: 0.5,
            }}
          >
            PHÀN NÀN ({bookingComplaints.length})
          </Text>
        </View>

        {bookingComplaints.map((complaint) => (
          <View key={complaint.complaintId} style={{ marginBottom: 8 }}>
            <Text
              style={{
                fontSize: 11,
                color: "#7F1D1D",
                fontWeight: "500",
                marginBottom: 4,
              }}
            >
              {complaint.complaintType}
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: "#991B1B",
                lineHeight: 16,
              }}
            >
              "{complaint.description}"
            </Text>
            <Text
              style={{
                fontSize: 10,
                color: "#7F1D1D",
                marginTop: 4,
              }}
            >
              Từ: {complaint.reporterName} •{" "}
              {new Date(complaint.createdAt).toLocaleDateString("vi-VN")}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  // ✅ UPDATE VIEW DETAILS TO USE CHAT:
  const handleViewDetails = (order: BookingCardData) => {
    const paymentInfo = order.hasPayment
      ? `\n\nThông tin thanh toán:\nTrạng thái: ${
          order.paymentStatus
        }\nSố tiền: ${
          order.paymentAmount ? formatCurrency(order.paymentAmount) : "Chưa có"
        }`
      : "\n\nChưa có thông tin thanh toán";

    Alert.alert(
      `Chi tiết đơn hàng #${order.id}`,
      `Khách hàng: ${order.userName}\nEmail: ${
        order.customerEmail
      }\n\nDịch vụ: ${order.serviceType}\nĐịa điểm: ${
        order.locationName
      }\nĐịa chỉ: ${order.locationAddress}\nThời gian: ${formatDateTime(
        order.date,
        order.time
      )}\nThời lượng: ${order.duration} giờ\n\nGiá: ${formatCurrency(
        order.totalPrice
      )}\nGiá/giờ: ${formatCurrency(order.pricePerHour)}\n\nMô tả: ${
        order.description
      }${
        order.specialRequests
          ? `\n\nYêu cầu đặc biệt: ${order.specialRequests}`
          : ""
      }${paymentInfo}`,
      [
        { text: "Đóng", style: "cancel" },
        {
          text: "Liên hệ khách hàng",
          onPress: () => handleContactCustomer(order), // ✅ USE CHAT FUNCTION
        },
      ]
    );
  };

  const getTabCount = (tab: string) => {
    switch (tab) {
      case "confirmed":
        // Đếm đơn confirmed KHÔNG có complaint active
        return getBookingsByStatus("confirmed").filter((order) => {
          const bookingId = parseInt(order.id);
          const bookingComplaints = getComplaintsByBookingId(bookingId);
          const hasActiveComplaints = bookingComplaints.some(
            (complaint) => complaint.status !== "Resolved"
          );
          return !hasActiveComplaints;
        }).length;
      case "completed":
        return bookingCounts.completed;
      case "cancelled":
        return (
          bookingCounts.cancelled || getBookingsByStatus("cancelled").length
        );
      default:
        return 0;
    }
  };

  const onScroll = ({ nativeEvent }: any) => {
    if (hasMorePages && !loading) {
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
      const paddingToBottom = 20;

      if (
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom
      ) {
        loadMoreBookings();
      }
    }
  };

  // Show loading for initial screen load
  if (loading && filteredOrders.length === 0) {
    console.log("Showing loading screen");
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F7F7F7",
        }}
      >
        <ActivityIndicator size="large" color="#FF385C" />
        <Text style={{ marginTop: 16, color: "#666666" }}>
          Đang tải đơn hàng...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F7F7" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#F7F7F7",
          paddingHorizontal: 20,
          paddingTop: insets.top + 20,
          paddingBottom: 20,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <Text style={{ color: "#000000", fontSize: 32, fontWeight: "bold" }}>
            Quản lý đơn hàng
          </Text>
          {/* ✅ UPDATE HEADER WITH CHAT BUTTON: */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {/* Chat button */}
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#FFFFFF",
                justifyContent: "center",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => navigation.navigate("NewChatScreen")}
            >
              <Ionicons name="chatbubble-outline" size={24} color="#000000" />
            </TouchableOpacity>

            {/* Refresh button */}
            <TouchableOpacity
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "#FFFFFF",
                justifyContent: "center",
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={async () => {
                await refreshBookings();
                await refreshPhotoDeliveries();
              }}
              disabled={refreshing}
            >
              <Ionicons
                name={refreshing ? "reload" : "filter"}
                size={24}
                color="#000000"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            padding: 4,
            flexDirection: "row",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          {[
            {
              key: "confirmed",
              label: "Đã nhận",
              count: getTabCount("confirmed"),
            },
            {
              key: "completed",
              label: "Hoàn thành",
              count: getTabCount("completed"),
            },
            {
              key: "cancelled",
              label: "Đã hủy",
              count: getTabCount("cancelled"),
            },
            {
              key: "complaints",
              label: "Phàn nàn",
              count: pendingComplaintsCount,
            },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={{
                flex: 1,
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 8,
                backgroundColor:
                  activeTab === tab.key ? "#FF385C" : "transparent",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
              onPress={() => {
                setActiveTab(tab.key as any);
              }}
            >
              <Text
                style={{
                  fontWeight: "600",
                  color: activeTab === tab.key ? "#FFFFFF" : "#666666",
                  marginRight: tab.count > 0 ? 8 : 0,
                }}
              >
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View
                  style={{
                    backgroundColor:
                      activeTab === tab.key ? "#FFFFFF" : "#FF385C",
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    minWidth: 20,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: activeTab === tab.key ? "#FF385C" : "#FFFFFF",
                      fontSize: 12,
                      fontWeight: "bold",
                    }}
                  >
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Error State */}
      {(error || chatError) && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View
            style={{
              backgroundColor: "#FEE2E2",
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: "#FECACA",
            }}
          >
            <Text
              style={{
                color: "#DC2626",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              {error || chatError}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#DC2626",
                borderRadius: 8,
                paddingVertical: 8,
                paddingHorizontal: 16,
                alignSelf: "center",
              }}
              onPress={refreshBookings}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                Thử lại
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Error State */}
      {(error || chatError) && (
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View
            style={{
              backgroundColor: "#FEE2E2",
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: "#FECACA",
            }}
          >
            <Text
              style={{
                color: "#DC2626",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              {error || chatError}
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#DC2626",
                borderRadius: 8,
                paddingVertical: 8,
                paddingHorizontal: 16,
                alignSelf: "center",
              }}
              onPress={refreshBookings}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "600" }}>
                Thử lại
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Orders List */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 120 + insets.bottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              await refreshBookings();
              await refreshPhotoDeliveries();
            }}
            colors={["#FF385C"]}
            tintColor="#FF385C"
          />
        }
        onScroll={onScroll}
        scrollEventThrottle={400}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.length === 0 ? (
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 80,
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              marginTop: 20,
            }}
          >
            <Ionicons name="receipt-outline" size={64} color="#CCCCCC" />
            <Text
              style={{
                color: "#666666",
                fontSize: 18,
                fontWeight: "500",
                marginTop: 16,
                textAlign: "center",
              }}
            >
              {loading
                ? "Đang tải..."
                : `Không có đơn hàng ${
                    activeTab === "confirmed"
                      ? "đã nhận"
                      : activeTab === "completed"
                      ? "hoàn thành"
                      : activeTab === "cancelled"
                      ? "đã hủy"
                      : "phàn nàn"
                  }`}
            </Text>
            {bookings.length > 0 && (
              <Text
                style={{
                  color: "#666666",
                  fontSize: 14,
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                Tổng {bookings.length} đơn hàng, nhưng không có đơn nào ở trạng
                thái này
              </Text>
            )}
          </View>
        ) : (
          <>
            {filteredOrders.map((order, index) => {
              return (
                <View
                  key={order.id}
                  style={{
                    backgroundColor: "#FFFFFF",
                    marginBottom: 12,
                    borderRadius: 4,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.06,
                    shadowRadius: 8,
                    elevation: 3,
                    overflow: "hidden",
                  }}
                >

                  <View style={{ padding: 20 }}>
                    {/* Header Section */}
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 20,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#8A8A8A",
                            marginBottom: 4,
                            letterSpacing: 0.5,
                          }}
                        >
                          ORDER #{order.id}
                        </Text>
                        <Text
                          style={{
                            fontSize: 18,
                            fontWeight: "400",
                            color: "#1A1A1A",
                            letterSpacing: 0.3,
                          }}
                        >
                          {order.userName}
                        </Text>
                      </View>

                      <View
                        style={{
                          backgroundColor: getStatusColor(
                            order.status,
                            hasComplaints(parseInt(order.id))
                          ).bg,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderRadius: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            color: getStatusColor(
                              order.status,
                              hasComplaints(parseInt(order.id))
                            ).text,
                            letterSpacing: 0.5,
                            textTransform: "uppercase",
                          }}
                        >
                          {getStatusText(
                            order.status,
                            hasComplaints(parseInt(order.id))
                          )}
                        </Text>
                      </View>
                    </View>

                    {/* Payment Status - if applicable */}
                    {order.hasPayment && (
                      <View
                        style={{
                          backgroundColor: "#F8F8F8",
                          padding: 12,
                          borderRadius: 4,
                          marginBottom: 16,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#1A1A1A",
                            letterSpacing: 0.3,
                          }}
                        >
                          ✓ PAYMENT {order.paymentStatus?.toUpperCase()}
                        </Text>
                      </View>
                    )}

                    {/* Service Details */}
                    <View style={{ marginBottom: 20 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "400",
                          color: "#1A1A1A",
                          marginBottom: 8,
                          letterSpacing: 0.2,
                        }}
                      >
                        {order.serviceType}
                      </Text>

                      <Text
                        style={{
                          fontSize: 12,
                          color: "#8A8A8A",
                          marginBottom: 6,
                          letterSpacing: 0.3,
                        }}
                      >
                        {order.locationName}
                      </Text>

                      <Text
                        style={{
                          fontSize: 12,
                          color: "#8A8A8A",
                          marginBottom: 12,
                          letterSpacing: 0.3,
                        }}
                      >
                        {formatDateTime(order.date, order.time)} •{" "}
                        {order.duration}h
                      </Text>

                      {/* Price */}
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingTop: 12,
                          borderTopWidth: 1,
                          borderTopColor: "#F5F5F5",
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "400",
                            color: "#1A1A1A",
                            letterSpacing: 0.3,
                          }}
                        >
                          {formatCurrency(order.totalPrice)}
                        </Text>
                        <Text
                          style={{
                            fontSize: 11,
                            color: "#8A8A8A",
                            letterSpacing: 0.3,
                          }}
                        >
                          {formatCurrency(order.pricePerHour)}/HR
                        </Text>
                      </View>
                    </View>

                    {/* Description */}
                    {order.description && (
                      <View
                        style={{
                          backgroundColor: "#FAFAFA",
                          padding: 12,
                          borderRadius: 4,
                          marginBottom: 20,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#8A8A8A",
                            lineHeight: 18,
                            letterSpacing: 0.2,
                          }}
                        >
                          {order.description}
                        </Text>
                      </View>
                    )}

                    {hasComplaints(parseInt(order.id)) && (
                      <ComplaintSection bookingId={parseInt(order.id)} />
                    )}

                    {/* Action Buttons */}
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 8,
                      }}
                    >
                      <TouchableOpacity
                        style={{
                          flex: 1,
                          paddingVertical: 12,
                          borderRadius: 4,
                          backgroundColor: "#F8F8F8",
                          alignItems: "center",
                          borderWidth: 1,
                          borderColor: "#E8E8E8",
                        }}
                        onPress={() => handleViewDetails(order)}
                      >
                        <Text
                          style={{
                            color: "#1A1A1A",
                            fontSize: 12,
                            fontWeight: "500",
                            letterSpacing: 0.5,
                          }}
                        >
                          CHI TIẾT
                        </Text>
                      </TouchableOpacity>

                      {order.status === "confirmed" && (
                        <>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              paddingVertical: 12,
                              borderRadius: 4,
                              backgroundColor: "#1A1A1A",
                              alignItems: "center",
                            }}
                            onPress={() => handleContactCustomer(order)}
                            disabled={creatingConversation}
                          >
                            {creatingConversation ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <Text
                                style={{
                                  color: "#FFFFFF",
                                  fontSize: 12,
                                  fontWeight: "500",
                                  letterSpacing: 0.5,
                                }}
                              >
                                NHẮN TIN
                              </Text>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={{
                              flex: 1,
                              paddingVertical: 12,
                              borderRadius: 4,
                              backgroundColor: (() => {
                                const bookingId = parseInt(order.id);
                                const delivery =
                                  getPhotoDeliveryForBooking(bookingId);
                                if (
                                  delivery?.status.toLowerCase() === "delivered"
                                ) {
                                  return "#F8F8F8";
                                }
                                return hasPhotoDelivery(bookingId)
                                  ? "#F8F8F8"
                                  : "#1A1A1A";
                              })(),
                              alignItems: "center",
                              borderWidth: (() => {
                                const bookingId = parseInt(order.id);
                                const delivery =
                                  getPhotoDeliveryForBooking(bookingId);
                                if (
                                  delivery?.status.toLowerCase() === "delivered"
                                ) {
                                  return 1;
                                }
                                return hasPhotoDelivery(bookingId) ? 1 : 0;
                              })(),
                              borderColor: "#E8E8E8",
                            }}
                            onPress={() => handlePhotoDelivery(order)}
                            disabled={(() => {
                              const bookingId = parseInt(order.id);
                              const delivery =
                                getPhotoDeliveryForBooking(bookingId);
                              return (
                                delivery?.status.toLowerCase() === "delivered"
                              );
                            })()}
                          >
                            <Text
                              style={{
                                color: (() => {
                                  const bookingId = parseInt(order.id);
                                  const delivery =
                                    getPhotoDeliveryForBooking(bookingId);
                                  if (
                                    delivery?.status.toLowerCase() ===
                                    "delivered"
                                  ) {
                                    return "#8A8A8A";
                                  }
                                  return hasPhotoDelivery(bookingId)
                                    ? "#1A1A1A"
                                    : "#FFFFFF";
                                })(),
                                fontSize: 12,
                                fontWeight: "500",
                                letterSpacing: 0.5,
                              }}
                            >
                              {(() => {
                                const bookingId = parseInt(order.id);
                                const delivery =
                                  getPhotoDeliveryForBooking(bookingId);
                                if (
                                  delivery?.status.toLowerCase() === "delivered"
                                ) {
                                  return "DELIVERED";
                                }
                                return hasPhotoDelivery(bookingId)
                                  ? "CẬP NHẬT ẢNH"
                                  : "GIAO ẢNH";
                              })()}
                            </Text>
                          </TouchableOpacity>
                        </>
                      )}

                      {(order.status === "completed" ||
                        order.status === "cancelled") && (
                        <TouchableOpacity
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: 4,
                            backgroundColor: "#1A1A1A",
                            alignItems: "center",
                          }}
                          onPress={() => handleContactCustomer(order)}
                          disabled={creatingConversation}
                        >
                          {creatingConversation ? (
                            <ActivityIndicator size="small" color="#FFFFFF" />
                          ) : (
                            <Text
                              style={{
                                color: "#FFFFFF",
                                fontSize: 12,
                                fontWeight: "500",
                                letterSpacing: 0.5,
                              }}
                            >
                              NHẮN TIN
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
            {/* Loading more indicator */}
            {loading && filteredOrders.length > 0 && (
              <View
                style={{
                  paddingVertical: 20,
                  alignItems: "center",
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  marginBottom: 16,
                }}
              >
                <ActivityIndicator size="small" color="#FF385C" />
                <Text
                  style={{
                    color: "#666666",
                    marginTop: 8,
                    fontSize: 14,
                  }}
                >
                  Đang tải thêm...
                </Text>
              </View>
            )}
            {/* End of list indicator */}
            {!hasMorePages && filteredOrders.length > 0 && (
              <View
                style={{
                  paddingVertical: 20,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "#999999",
                    fontSize: 14,
                  }}
                >
                  Đã hiển thị tất cả đơn hàng
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
      <SubscriptionRequiredOverlay
        isVisible={!hasActiveSubscription && !subscriptionLoading}
        onNavigateToSubscription={() =>
          navigation.navigate("SubscriptionManagement")
        }
      />
    </View>
  );
}
