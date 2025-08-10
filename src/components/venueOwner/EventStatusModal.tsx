// components/venueOwner/EventStatusModal.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { EventStatus, VenueOwnerEvent } from "../../types/VenueOwnerEvent";

interface StatusOption {
  value: EventStatus;
  label: string;
  description: string;
  color: string;
  dotColor: string;
  icon: string;
  conditions?: string[];
  warnings?: string[];
}

interface EventStatusModalProps {
  visible: boolean;
  event: VenueOwnerEvent | null;
  currentStatus: EventStatus;
  loading?: boolean;
  onClose: () => void;
  onStatusChange: (newStatus: EventStatus) => Promise<void>;
}

const EventStatusModal: React.FC<EventStatusModalProps> = ({
  visible,
  event,
  currentStatus,
  loading = false,
  onClose,
  onStatusChange,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<EventStatus | null>(
    null
  );
  const [updating, setUpdating] = useState(false);

  // Status flow definitions
  const statusOptions: StatusOption[] = [
    {
      value: "Draft",
      label: "Bản nháp",
      description: "Sự kiện đang được chuẩn bị, chưa công khai",
      color: "bg-yellow-100 text-yellow-800",
      dotColor: "bg-yellow-500",
      icon: "document-outline",
      conditions: ["Có thể chỉnh sửa mọi thông tin"],
      warnings: [],
    },
    {
      value: "Open",
      label: "Đang mở đăng ký",
      description: "Nhiếp ảnh gia có thể đăng ký tham gia",
      color: "bg-blue-100 text-blue-800",
      dotColor: "bg-blue-500",
      icon: "people-outline",
      conditions: [
        "Thông tin sự kiện đã hoàn thiện",
        "Có ít nhất 1 ảnh đại diện",
        "Đã cài đặt giá và sức chứa",
      ],
      warnings:
        currentStatus === "Draft"
          ? []
          : ["Có thể ảnh hưởng đến các nhiếp ảnh gia đã đăng ký"],
    },
    {
      value: "Active",
      label: "Đang diễn ra",
      description: "Sự kiện đang hoạt động, cho phép booking",
      color: "bg-green-100 text-green-800",
      dotColor: "bg-green-500",
      icon: "play-outline",
      conditions: [
        "Đã có nhiếp ảnh gia được duyệt",
        "Trong khoảng thời gian sự kiện",
      ],
      warnings: [
        "Khách hàng có thể đặt booking",
        "Hạn chế chỉnh sửa thông tin",
      ],
    },
    {
      value: "Closed",
      label: "Đã đóng",
      description: "Sự kiện đã kết thúc, không nhận đăng ký mới",
      color: "bg-gray-100 text-gray-800",
      dotColor: "bg-gray-500",
      icon: "stop-outline",
      conditions: ["Sự kiện đã kết thúc"],
      warnings: ["Không thể đăng ký hoặc booking mới"],
    },
    {
      value: "Cancelled",
      label: "Đã hủy",
      description: "Sự kiện bị hủy bỏ",
      color: "bg-red-100 text-red-800",
      dotColor: "bg-red-500",
      icon: "close-outline",
      conditions: [],
      warnings: [
        "Tất cả đăng ký và booking sẽ bị hủy",
        "Có thể phải hoàn tiền cho khách hàng",
        "Thông báo cho tất cả bên liên quan",
      ],
    },
  ];

  // Get allowed status transitions based on current status and event data
  const getAllowedTransitions = (): EventStatus[] => {
    if (!event) return [];

    const hasImages =
      event.primaryImage || (event.images && event.images.length > 0);
    const hasApprovedPhotographers =
      (event.approvedPhotographersCount || 0) > 0;
    const hasBookings = (event.totalBookingsCount || 0) > 0;
    const eventStarted = new Date() >= new Date(event.startDate);
    const eventEnded = new Date() > new Date(event.endDate);

    switch (currentStatus) {
      case "Draft":
        return ["Open"]; // Draft can only go to Open

      case "Open":
        const openTransitions: EventStatus[] = ["Draft"];
        if (hasApprovedPhotographers) {
          openTransitions.push("Active");
        }
        openTransitions.push("Cancelled");
        return openTransitions;

      case "Active":
        const activeTransitions: EventStatus[] = [];
        if (eventEnded) {
          activeTransitions.push("Closed");
        }
        activeTransitions.push("Cancelled");
        return activeTransitions;

      case "Closed":
        return ["Active"]; // Can reopen if needed

      case "Cancelled":
        return ["Draft", "Open"]; // Can restart the event

      default:
        return [];
    }
  };

  const allowedTransitions = getAllowedTransitions();
  const availableStatuses = statusOptions.filter(
    (option) =>
      option.value === currentStatus ||
      allowedTransitions.includes(option.value)
  );

  // Check if status change is valid
  const canChangeToStatus = (
    targetStatus: EventStatus
  ): { canChange: boolean; reason?: string } => {
    if (targetStatus === currentStatus) {
      return { canChange: true };
    }

    if (!allowedTransitions.includes(targetStatus)) {
      return {
        canChange: false,
        reason: "Không thể chuyển trực tiếp sang trạng thái này",
      };
    }

    // Additional validations
    if (
      targetStatus === "Open" &&
      (!event?.name || event.name.trim().length < 3)
    ) {
      return { canChange: false, reason: "Cần có tên sự kiện hợp lệ" };
    }

    if (
      targetStatus === "Active" &&
      (event?.approvedPhotographersCount || 0) === 0
    ) {
      return {
        canChange: false,
        reason: "Cần có ít nhất 1 nhiếp ảnh gia được duyệt",
      };
    }

    return { canChange: true };
  };

  const handleStatusSelect = (status: EventStatus) => {
    const validation = canChangeToStatus(status);

    if (!validation.canChange) {
      Alert.alert(
        "Không thể thay đổi",
        validation.reason || "Trạng thái không hợp lệ"
      );
      return;
    }

    setSelectedStatus(status);
  };

  const handleConfirmChange = async () => {
    if (!selectedStatus || selectedStatus === currentStatus) {
      onClose();
      return;
    }

    const statusOption = statusOptions.find(
      (opt) => opt.value === selectedStatus
    );
    if (!statusOption) return;

    // Show confirmation for critical changes
    if (statusOption.warnings && statusOption.warnings.length > 0) {
      Alert.alert(
        "Xác nhận thay đổi",
        `Bạn có chắc muốn chuyển sang "${
          statusOption.label
        }"?\n\n⚠️ ${statusOption.warnings.join("\n• ")}`,
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Xác nhận",
            style: selectedStatus === "Cancelled" ? "destructive" : "default",
            onPress: executeStatusChange,
          },
        ]
      );
    } else {
      executeStatusChange();
    }
  };

  const executeStatusChange = async () => {
    if (!selectedStatus) return;

    setUpdating(true);
    try {
      await onStatusChange(selectedStatus);
      setSelectedStatus(null);
      onClose();
    } catch (error) {
      console.error("❌ Status change error:", error);
      Alert.alert("Lỗi", "Không thể thay đổi trạng thái sự kiện");
    } finally {
      setUpdating(false);
    }
  };

  const formatEventInfo = () => {
    if (!event) return "";

    const info = [];
    if (event.approvedPhotographersCount) {
      info.push(`${event.approvedPhotographersCount} nhiếp ảnh gia đã duyệt`);
    }
    if (event.totalBookingsCount) {
      info.push(`${event.totalBookingsCount} booking`);
    }
    if (event.totalApplicationsCount) {
      info.push(`${event.totalApplicationsCount} đăng ký`);
    }

    return info.length > 0 ? info.join(" • ") : "Chưa có hoạt động";
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/50 justify-end" onPress={onClose}>
        <Pressable className="bg-white rounded-t-3xl p-6 max-h-5/6">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-semibold text-gray-900">
              Thay đổi trạng thái
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Event Info */}
          {event && (
            <View className="bg-gray-50 p-4 rounded-lg mb-4">
              <Text className="font-medium text-gray-900" numberOfLines={1}>
                {event.name}
              </Text>
              <Text className="text-sm text-gray-500 mt-1">
                {formatEventInfo()}
              </Text>
              <Text className="text-xs text-gray-400 mt-1">
                {new Date(event.startDate).toLocaleDateString("vi-VN")} -{" "}
                {new Date(event.endDate).toLocaleDateString("vi-VN")}
              </Text>
            </View>
          )}

          {/* Status Options */}
          <View className="flex-1">
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Chọn trạng thái mới:
            </Text>

            {availableStatuses.map((option) => {
              const isCurrentStatus = option.value === currentStatus;
              const isSelected = selectedStatus === option.value;
              const validation = canChangeToStatus(option.value);

              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handleStatusSelect(option.value)}
                  disabled={!validation.canChange && !isCurrentStatus}
                  className={`p-4 rounded-lg mb-3 border ${
                    isSelected
                      ? "bg-blue-50 border-blue-200"
                      : isCurrentStatus
                      ? "bg-green-50 border-green-200"
                      : validation.canChange
                      ? "bg-white border-gray-200"
                      : "bg-gray-50 border-gray-100 opacity-50"
                  }`}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-row items-center flex-1">
                      <View
                        className={`p-2 rounded-full mr-3 ${
                          option.color.split(" ")[0]
                        }`}
                      >
                        <Ionicons
                          name={option.icon as any}
                          size={20}
                          color={
                            option.color.includes("yellow")
                              ? "#F59E0B"
                              : option.color.includes("blue")
                              ? "#3B82F6"
                              : option.color.includes("green")
                              ? "#10B981"
                              : option.color.includes("red")
                              ? "#EF4444"
                              : "#6B7280"
                          }
                        />
                      </View>

                      <View className="flex-1">
                        <View className="flex-row items-center">
                          <Text className="font-medium text-gray-900">
                            {option.label}
                          </Text>
                          {isCurrentStatus && (
                            <View className="ml-2 bg-green-100 px-2 py-1 rounded">
                              <Text className="text-green-800 text-xs font-medium">
                                Hiện tại
                              </Text>
                            </View>
                          )}
                        </View>

                        <Text className="text-sm text-gray-600 mt-1">
                          {option.description}
                        </Text>

                        {/* Conditions */}
                        {option.conditions && option.conditions.length > 0 && (
                          <View className="mt-2">
                            <Text className="text-xs text-gray-500 font-medium">
                              Điều kiện:
                            </Text>
                            {option.conditions.map((condition, index) => (
                              <Text
                                key={index}
                                className="text-xs text-gray-500 ml-2"
                              >
                                • {condition}
                              </Text>
                            ))}
                          </View>
                        )}

                        {/* Warnings */}
                        {option.warnings && option.warnings.length > 0 && (
                          <View className="mt-2">
                            <Text className="text-xs text-red-600 font-medium">
                              Cảnh báo:
                            </Text>
                            {option.warnings.map((warning, index) => (
                              <Text
                                key={index}
                                className="text-xs text-red-600 ml-2"
                              >
                                • {warning}
                              </Text>
                            ))}
                          </View>
                        )}

                        {/* Validation Error */}
                        {!validation.canChange && !isCurrentStatus && (
                          <Text className="text-xs text-red-500 mt-2">
                            ❌ {validation.reason}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Selection Indicator */}
                    <View className="ml-2">
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#3B82F6"
                        />
                      )}
                      {isCurrentStatus && !isSelected && (
                        <View
                          className={`w-3 h-3 rounded-full ${option.dotColor}`}
                        />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Action Buttons */}
          <View className="flex-row space-x-3 pt-4 border-t border-gray-200">
            <TouchableOpacity
              onPress={onClose}
              disabled={updating}
              className="flex-1 bg-gray-200 py-3 rounded-lg"
            >
              <Text className="text-gray-800 text-center font-medium">Hủy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleConfirmChange}
              disabled={
                !selectedStatus ||
                selectedStatus === currentStatus ||
                updating ||
                loading
              }
              className={`flex-1 py-3 rounded-lg ${
                !selectedStatus ||
                selectedStatus === currentStatus ||
                updating ||
                loading
                  ? "bg-gray-300"
                  : selectedStatus === "Cancelled"
                  ? "bg-red-500"
                  : "bg-blue-500"
              }`}
            >
              {updating || loading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text className="text-white text-center font-medium">
                  {selectedStatus === currentStatus ? "Đóng" : "Thay đổi"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default EventStatusModal;
