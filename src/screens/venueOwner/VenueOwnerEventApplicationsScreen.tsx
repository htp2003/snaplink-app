// screens/venueOwner/VenueOwnerEventApplicationsScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
  RefreshControl,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useVenueOwnerEvent } from "../../hooks/useVenueOwnerEvent";
import {
  EventApplication,
  ApplicationStatus,
} from "../../types/VenueOwnerEvent";

interface ApplicationsScreenProps {
  navigation: any;
  route: {
    params: {
      eventId: number;
      eventName?: string;
    };
  };
}

type FilterStatus = "all" | ApplicationStatus;

const VenueOwnerEventApplicationsScreen: React.FC<ApplicationsScreenProps> = ({
  navigation,
  route,
}) => {
  const { eventId, eventName } = route.params;

  // Hooks
  const {
    applications,
    loading,
    error,
    getEventApplications,
    respondToApplication,
    clearError,
  } = useVenueOwnerEvent();

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedApplication, setSelectedApplication] =
    useState<EventApplication | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processingResponse, setProcessingResponse] = useState(false);

  // Debug: Log applications data
  useEffect(() => {
    if (__DEV__) {
      console.log(
        "🔍 Applications data:",
        JSON.stringify(applications, null, 2)
      );
      if (applications.length > 0) {
        console.log("🔍 First application structure:", applications[0]);
        console.log(
          "🔍 Photographer data in first application:",
          applications[0]?.photographer
        );
      }
    }
  }, [applications]);

  // Filter options
  const filterOptions = [
    { value: "all", label: "Tất cả", count: applications.length },
    {
      value: "Applied",
      label: "Chờ duyệt",
      count: applications.filter((app) => app.status === "Applied").length,
    },
    {
      value: "Approved",
      label: "Đã duyệt",
      count: applications.filter((app) => app.status === "Approved").length,
    },
    {
      value: "Rejected",
      label: "Đã từ chối",
      count: applications.filter((app) => app.status === "Rejected").length,
    },
    {
      value: "Withdrawn",
      label: "Đã rút",
      count: applications.filter((app) => app.status === "Withdrawn").length,
    },
  ];

  // Load data on mount
  useEffect(() => {
    loadApplications();
  }, [eventId]);

  const loadApplications = async () => {
    try {
      const result = await getEventApplications(eventId);
      console.log("📥 Applications loaded:", result);
    } catch (error) {
      console.error("❌ Load applications error:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadApplications();
    } catch (error) {
      console.error("❌ Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  // Filter applications
  const filteredApplications = applications.filter((app) => {
    if (filterStatus === "all") return true;
    return app.status === filterStatus;
  });

  // Application management
  const handleApplicationAction = (
    application: EventApplication,
    action: "approve" | "reject"
  ) => {
    setSelectedApplication(application);
    setRejectionReason("");

    if (action === "approve") {
      // Direct approval
      handleConfirmResponse("Approved");
    } else {
      // Show rejection modal for reason
      setShowResponseModal(true);
    }
  };

  const handleConfirmResponse = async (
    status: ApplicationStatus,
    reason?: string
  ) => {
    if (!selectedApplication) return;

    setProcessingResponse(true);
    setShowResponseModal(false);

    try {
      const success = await respondToApplication(
        eventId,
        selectedApplication.photographerId,
        status,
        reason
      );

      if (success) {
        Alert.alert(
          "Thành công",
          status === "Approved"
            ? "Đã duyệt đăng ký của nhiếp ảnh gia"
            : "Đã từ chối đăng ký của nhiếp ảnh gia"
        );
        // Reload applications to get updated data
        await loadApplications();
      }
    } catch (error) {
      Alert.alert("Lỗi", "Không thể xử lý phản hồi");
    } finally {
      setProcessingResponse(false);
      setSelectedApplication(null);
      setRejectionReason("");
    }
  };

  // Helper functions
  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case "Applied":
        return "bg-yellow-100 text-yellow-800";
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      case "Withdrawn":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: ApplicationStatus) => {
    switch (status) {
      case "Applied":
        return "Chờ duyệt";
      case "Approved":
        return "Đã duyệt";
      case "Rejected":
        return "Đã từ chối";
      case "Withdrawn":
        return "Đã rút";
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Helper function to get photographer info safely
  const getPhotographerInfo = (application: any) => {
    // API returns flat data structure with photographer info directly
    console.log("🔍 Photographer info for application:", {
      applicationId: `${application.eventId}-${application.photographerId}`,
      photographerName: application.photographerName,
      photographerProfileImage: application.photographerProfileImage,
      photographerRating: application.photographerRating,
    });

    return {
      fullName:
        application.photographerName ||
        application.photographer?.fullName ||
        `Nhiếp ảnh gia #${application.photographerId}`,
      profileImage:
        application.photographerProfileImage ||
        application.photographer?.profileImage ||
        "https://via.placeholder.com/50",
      yearsExperience:
        application.photographerYearsExperience ||
        application.photographer?.yearsExperience ||
        null,
      rating:
        application.photographerRating ||
        application.photographer?.rating ||
        null,
      ratingCount:
        application.photographerRatingCount ||
        application.photographer?.ratingCount ||
        null,
      phoneNumber:
        application.photographerPhoneNumber ||
        application.photographer?.phoneNumber ||
        null,
    };
  };

  // Loading state
  if (loading && applications.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-gray-600 mt-4">
            Đang tải danh sách đăng ký...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="flex-row items-center flex-1 mr-4"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
            <Text
              className="ml-2 text-lg font-medium text-gray-900"
              numberOfLines={1}
            >
              Đăng ký tham gia
            </Text>
          </TouchableOpacity>

          <View className="bg-blue-100 px-3 py-1 rounded-full">
            <Text className="text-blue-800 font-medium">
              {applications.length} đăng ký
            </Text>
          </View>
        </View>

        {eventName ? (
          <Text className="text-gray-600 mt-1" numberOfLines={1}>
            {eventName}
          </Text>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View className="bg-white px-4 py-3 border-b border-gray-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row space-x-3">
            {filterOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => setFilterStatus(option.value as FilterStatus)}
                className={`px-4 py-2 rounded-full border ${
                  filterStatus === option.value
                    ? "bg-blue-50 border-blue-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <Text
                  className={`font-medium ${
                    filterStatus === option.value
                      ? "text-blue-700"
                      : "text-gray-600"
                  }`}
                >
                  {option.label} ({option.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Applications List */}
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#3B82F6"
          />
        }
      >
        {filteredApplications.length === 0 ? (
          <View className="flex-1 justify-center items-center py-12">
            <View className="bg-gray-100 p-4 rounded-full mb-4">
              <Ionicons name="people-outline" size={32} color="#6B7280" />
            </View>
            <Text className="text-gray-900 font-medium mb-2">
              Chưa có đăng ký nào
            </Text>
            <Text className="text-gray-500 text-center">
              {filterStatus === "all"
                ? "Chưa có nhiếp ảnh gia nào đăng ký tham gia sự kiện"
                : `Chưa có đăng ký nào với trạng thái "${
                    filterOptions.find((f) => f.value === filterStatus)?.label
                  }"`}
            </Text>
          </View>
        ) : (
          <View className="p-4 space-y-4">
            {filteredApplications.map((application) => {
              const photographerInfo = getPhotographerInfo(application);

              return (
                <View
                  key={`${application.eventId}-${application.photographerId}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* Application Header */}
                  <View className="p-4">
                    <View className="flex-row items-start justify-between mb-3">
                      {/* Photographer Info */}
                      <View className="flex-row items-center flex-1 mr-4">
                        <Image
                          source={{
                            uri: photographerInfo.profileImage,
                          }}
                          className="w-12 h-12 rounded-full"
                          onError={(error) => {
                            if (__DEV__) {
                              console.log(
                                "❌ Failed to load image:",
                                photographerInfo.profileImage
                              );
                            }
                          }}
                        />
                        <View className="ml-3 flex-1">
                          <Text className="text-lg font-semibold text-gray-900">
                            {photographerInfo.fullName}
                          </Text>
                          <Text className="text-gray-500">
                            {photographerInfo.yearsExperience
                              ? `${photographerInfo.yearsExperience} năm kinh nghiệm`
                              : "Kinh nghiệm chưa cập nhật"}
                          </Text>
                        </View>
                      </View>

                      {/* Status Badge */}
                      <View
                        className={`px-3 py-1 rounded-full ${getStatusColor(
                          application.status
                        )}`}
                      >
                        <Text className="text-sm font-medium">
                          {getStatusLabel(application.status)}
                        </Text>
                      </View>
                    </View>

                    {/* Application Details */}
                    <View className="space-y-2">
                      <View className="flex-row items-center">
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color="#6B7280"
                        />
                        <Text className="ml-2 text-gray-600">
                          {`Đăng ký: ${formatDate(application.appliedAt)}`}
                        </Text>
                      </View>

                      {application.specialRate &&
                      application.specialRate > 0 ? (
                        <View className="flex-row items-center">
                          <Ionicons
                            name="pricetag-outline"
                            size={16}
                            color="#6B7280"
                          />
                          <Text className="ml-2 text-gray-600">
                            {`Giá đề xuất: ${formatCurrency(
                              application.specialRate
                            )}`}
                          </Text>
                        </View>
                      ) : null}

                      {photographerInfo.rating &&
                      photographerInfo.rating > 0 ? (
                        <View className="flex-row items-center">
                          <Ionicons name="star" size={16} color="#F59E0B" />
                          <Text className="ml-1 text-gray-600">
                            {`${photographerInfo.rating.toFixed(1)} (${
                              photographerInfo.ratingCount || 0
                            } đánh giá)`}
                          </Text>
                        </View>
                      ) : null}

                      {application.respondedAt ? (
                        <View className="flex-row items-center">
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={16}
                            color="#6B7280"
                          />
                          <Text className="ml-2 text-gray-600">
                            {`Phản hồi: ${formatDate(application.respondedAt)}`}
                          </Text>
                        </View>
                      ) : null}

                      {application.rejectionReason &&
                      application.rejectionReason.trim() ? (
                        <View className="bg-red-50 p-3 rounded-lg mt-2">
                          <Text className="text-red-800 font-medium mb-1">
                            Lý do từ chối:
                          </Text>
                          <Text className="text-red-700">
                            {application.rejectionReason}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Action Buttons */}
                    {application.status === "Applied" ? (
                      <View className="flex-row space-x-3 mt-4">
                        <TouchableOpacity
                          onPress={() =>
                            handleApplicationAction(application, "approve")
                          }
                          disabled={processingResponse}
                          className="flex-1 bg-green-500 py-3 rounded-lg"
                        >
                          <Text className="text-white font-semibold text-center">
                            {processingResponse &&
                            selectedApplication?.photographerId ===
                              application.photographerId
                              ? "Đang xử lý..."
                              : "Duyệt"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() =>
                            handleApplicationAction(application, "reject")
                          }
                          disabled={processingResponse}
                          className="flex-1 bg-red-500 py-3 rounded-lg"
                        >
                          <Text className="text-white font-semibold text-center">
                            Từ chối
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}

                    {/* Photographer Portfolio/Contact */}
                    <View className="flex-row space-x-3 mt-3">
                      <TouchableOpacity
                        onPress={() => {
                          // Navigate to photographer profile
                          navigation.navigate("PhotographerCardDetail", {
                            photographerId:
                              application.photographerId.toString(),
                          });
                        }}
                        className="flex-1 bg-blue-50 py-2 rounded-lg"
                      >
                        <Text className="text-blue-700 font-medium text-center">
                          Xem hồ sơ
                        </Text>
                      </TouchableOpacity>

                      {photographerInfo.phoneNumber &&
                      photographerInfo.phoneNumber.trim() ? (
                        <TouchableOpacity className="flex-1 bg-gray-50 py-2 rounded-lg">
                          <Text className="text-gray-700 font-medium text-center">
                            Liên hệ
                          </Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View className="h-6" />
      </ScrollView>

      {/* Rejection Reason Modal */}
      <Modal
        visible={showResponseModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowResponseModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowResponseModal(false)}
        >
          <Pressable className="bg-white rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-gray-900">
                Từ chối đăng ký
              </Text>
              <TouchableOpacity onPress={() => setShowResponseModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-4">
              Vui lòng cho biết lý do từ chối để nhiếp ảnh gia hiểu rõ hơn:
            </Text>

            <TextInput
              value={rejectionReason}
              onChangeText={setRejectionReason}
              placeholder="Nhập lý do từ chối..."
              multiline
              numberOfLines={4}
              className="border border-gray-300 rounded-lg p-4 mb-6 text-gray-900"
              style={{ textAlignVertical: "top" }}
            />

            <View className="flex-row space-x-3">
              <TouchableOpacity
                onPress={() => setShowResponseModal(false)}
                className="flex-1 bg-gray-100 py-3 rounded-lg"
              >
                <Text className="text-gray-700 font-semibold text-center">
                  Hủy
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  handleConfirmResponse("Rejected", rejectionReason)
                }
                disabled={!rejectionReason.trim()}
                className={`flex-1 py-3 rounded-lg ${
                  rejectionReason.trim() ? "bg-red-500" : "bg-gray-300"
                }`}
              >
                <Text
                  className={`font-semibold text-center ${
                    rejectionReason.trim() ? "text-white" : "text-gray-500"
                  }`}
                >
                  Xác nhận từ chối
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Summary Stats */}
      {applications.length > 0 ? (
        <View className="bg-white border-t border-gray-200 p-4">
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-sm text-gray-500">Tổng đăng ký</Text>
              <Text className="text-lg font-semibold text-gray-900">
                {applications.length}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-500">Đã duyệt</Text>
              <Text className="text-lg font-semibold text-green-600">
                {applications.filter((app) => app.status === "Approved").length}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm text-gray-500">Chờ duyệt</Text>
              <Text className="text-lg font-semibold text-yellow-600">
                {applications.filter((app) => app.status === "Applied").length}
              </Text>
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
};

export default VenueOwnerEventApplicationsScreen;
