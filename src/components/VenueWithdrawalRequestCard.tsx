import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WithdrawalRequest } from "../types/withdrawal";

interface VenueWithdrawalRequestCardProps {
  requests: WithdrawalRequest[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onViewAll: () => void;
  onRequestPress: (request: WithdrawalRequest) => void;
  onCreateWithdrawal: () => void;
}

export default function VenueWithdrawalRequestCard({
  requests,
  loading,
  error,
  onRefresh,
  onViewAll,
  onRequestPress,
  onCreateWithdrawal,
}: VenueWithdrawalRequestCardProps) {
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  // Get status config with venue-specific colors (Purple theme)
  const getStatusConfig = (status: string) => {
    const configs = {
      Pending: { color: "#8B5CF6", bgColor: "#EDE9FE", text: "Đang chờ xử lý" },
      Approved: { color: "#10B981", bgColor: "#D1FAE5", text: "Đã phê duyệt" },
      Rejected: { color: "#EF4444", bgColor: "#FEE2E2", text: "Đã từ chối" },
      Processing: { color: "#6366F1", bgColor: "#E0E7FF", text: "Đang xử lý" },
      Completed: { color: "#10B981", bgColor: "#D1FAE5", text: "Hoàn thành" },
      Cancelled: { color: "#6B7280", bgColor: "#F3F4F6", text: "Đã hủy" },
    };
    return (
      configs[status as keyof typeof configs] || {
        color: "#6B7280",
        bgColor: "#F3F4F6",
        text: status,
      }
    );
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });
    }
  };

  return (
    <View style={{ marginHorizontal: 16, marginTop: 24 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "600", color: "#111827" }}>
          Yêu cầu rút tiền
        </Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={{ color: "#8B5CF6", fontWeight: "500", fontSize: 14 }}>
            Xem tất cả
          </Text>
        </TouchableOpacity>
      </View>

      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          borderWidth: 1,
          borderColor: "#F3F4F6",
        }}
      >
        {/* Header with Create Button */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            padding: 16,
            backgroundColor: "#F9FAFB",
            borderBottomWidth: 1,
            borderBottomColor: "#F3F4F6",
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151" }}>
            Yêu cầu gần đây
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: "#8B5CF6",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 6,
              flexDirection: "row",
              alignItems: "center",
            }}
            onPress={onCreateWithdrawal}
          >
            <Ionicons
              name="add"
              size={14}
              color="#FFFFFF"
              style={{ marginRight: 4 }}
            />
            <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "600" }}>
              Rút tiền
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loading && requests.length === 0 ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <ActivityIndicator size="small" color="#8B5CF6" />
            <Text style={{ color: "#6B7280", marginTop: 8 }}>
              Đang tải yêu cầu rút tiền...
            </Text>
          </View>
        ) : error ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text
              style={{ color: "#6B7280", marginTop: 12, textAlign: "center" }}
            >
              Không thể tải yêu cầu rút tiền
            </Text>
            <TouchableOpacity style={{ marginTop: 8 }} onPress={onRefresh}>
              <Text style={{ color: "#8B5CF6", fontWeight: "500" }}>
                Thử lại
              </Text>
            </TouchableOpacity>
          </View>
        ) : requests.length === 0 ? (
          <View style={{ padding: 40, alignItems: "center" }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "#EDE9FE",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <Ionicons name="wallet-outline" size={28} color="#8B5CF6" />
            </View>
            <Text
              style={{ color: "#6B7280", textAlign: "center", marginBottom: 8 }}
            >
              Chưa có yêu cầu rút tiền nào
            </Text>
            <Text
              style={{
                color: "#9CA3AF",
                textAlign: "center",
                fontSize: 12,
                marginBottom: 16,
              }}
            >
              Tạo yêu cầu đầu tiên để rút tiền từ ví của bạn
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: "#8B5CF6",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
              }}
              onPress={onCreateWithdrawal}
            >
              <Ionicons
                name="add-circle-outline"
                size={16}
                color="#FFFFFF"
                style={{ marginRight: 6 }}
              />
              <Text
                style={{ color: "#FFFFFF", fontWeight: "600", fontSize: 14 }}
              >
                Tạo yêu cầu rút tiền
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {requests.slice(0, 3).map((request, index) => {
              const statusConfig = getStatusConfig(request.requestStatus);

              return (
                <TouchableOpacity
                  key={request.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 16,
                    borderBottomWidth:
                      index !== Math.min(requests.length - 1, 2) ? 1 : 0,
                    borderBottomColor: "#F3F4F6",
                  }}
                  onPress={() => onRequestPress(request)}
                >
                  {/* Request Icon */}
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: statusConfig.bgColor,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Ionicons
                      name="arrow-up-circle-outline"
                      size={22}
                      color={statusConfig.color}
                    />
                  </View>

                  {/* Request Details */}
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontWeight: "600",
                        color: "#111827",
                        marginBottom: 4,
                      }}
                    >
                      Rút tiền về {request.bankName}
                    </Text>

                    {/* Bank account (masked) */}
                    <Text
                      style={{
                        color: "#6B7280",
                        fontSize: 13,
                        marginBottom: 6,
                      }}
                    >
                      Tài khoản:{" "}
                      {request.bankAccountNumber.replace(
                        /(\d{4})\d*(\d{4})/,
                        "$1****$2"
                      )}
                    </Text>

                    {/* Date and Status */}
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text style={{ color: "#9CA3AF", fontSize: 11 }}>
                        {formatDate(request.requestedAt)}
                      </Text>
                      <View
                        style={{
                          marginLeft: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 12,
                          backgroundColor: statusConfig.bgColor,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 10,
                            fontWeight: "600",
                            color: statusConfig.color,
                          }}
                        >
                          {statusConfig.text}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Amount and Arrow */}
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{
                        fontWeight: "bold",
                        textAlign: "right",
                        color: statusConfig.color,
                        fontSize: 15,
                      }}
                    >
                      -{formatCurrency(request.amount)}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#D1D5DB"
                      style={{ marginTop: 4 }}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Show more indicator */}
            {requests.length > 3 && (
              <TouchableOpacity
                style={{
                  padding: 12,
                  alignItems: "center",
                  borderTopWidth: 1,
                  borderTopColor: "#F3F4F6",
                  backgroundColor: "#F9FAFB",
                }}
                onPress={onViewAll}
              >
                <Text
                  style={{ color: "#8B5CF6", fontWeight: "500", fontSize: 13 }}
                >
                  Xem thêm {requests.length - 3} yêu cầu khác
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
