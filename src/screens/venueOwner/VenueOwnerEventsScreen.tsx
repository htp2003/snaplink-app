// screens/venueOwner/VenueOwnerEventsScreen.tsx
import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function VenueOwnerEventsScreen() {
  const upcomingEvents = [
    {
      id: 1,
      title: "Khuyến mãi mùa hè",
      description: "Giảm 20% cho tất cả booking trong tháng 7",
      startDate: "2024-07-01",
      endDate: "2024-07-31",
      status: "active",
    },
    {
      id: 2,
      title: "Event cuối tuần",
      description: "Gói chụp ảnh đặc biệt cho cuối tuần",
      startDate: "2024-07-15",
      endDate: "2024-07-16",
      status: "upcoming",
    },
  ];

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return {
          bg: "bg-green-100",
          text: "text-green-800",
          dot: "bg-green-500",
        };
      case "upcoming":
        return { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" };
      case "ended":
        return { bg: "bg-gray-100", text: "text-gray-800", dot: "bg-gray-500" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-800", dot: "bg-gray-500" };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white px-4 py-6">
          <View className="flex-row justify-between items-center">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Sự kiện</Text>
              <Text className="text-gray-600 mt-1">
                Quản lý sự kiện và khuyến mãi
              </Text>
            </View>
            <TouchableOpacity className="bg-blue-500 p-3 rounded-full">
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Events List */}
        <View className="px-4 mt-4">
          {upcomingEvents.length > 0 ? (
            <View className="space-y-4 mb-6">
              {upcomingEvents.map((event) => {
                const statusStyle = getEventStatusColor(event.status);

                return (
                  <TouchableOpacity
                    key={event.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-100 p-4"
                  >
                    <View className="flex-row justify-between items-start mb-3">
                      <Text className="text-lg font-semibold text-gray-900 flex-1 mr-2">
                        {event.title}
                      </Text>
                      <View
                        className={`px-3 py-1 rounded-full ${statusStyle.bg}`}
                      >
                        <View className="flex-row items-center">
                          <View
                            className={`w-2 h-2 rounded-full mr-2 ${statusStyle.dot}`}
                          />
                          <Text
                            className={`text-xs font-medium capitalize ${statusStyle.text}`}
                          >
                            {event.status === "active"
                              ? "Đang diễn ra"
                              : event.status === "upcoming"
                              ? "Sắp diễn ra"
                              : "Đã kết thúc"}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text className="text-gray-600 mb-3">
                      {event.description}
                    </Text>

                    <View className="flex-row items-center text-sm text-gray-500">
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color="#6B7280"
                      />
                      <Text className="ml-2">
                        {formatDate(event.startDate)} -{" "}
                        {formatDate(event.endDate)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View className="bg-white p-8 rounded-lg shadow-sm border border-gray-100">
              <View className="items-center">
                <View className="bg-gray-100 p-4 rounded-full mb-4">
                  <Ionicons name="calendar-outline" size={32} color="#6B7280" />
                </View>
                <Text className="text-gray-900 font-medium mb-2">
                  Chưa có sự kiện nào
                </Text>
                <Text className="text-gray-500 text-center mb-4">
                  Tạo sự kiện để thu hút khách hàng đến địa điểm của bạn
                </Text>
                <TouchableOpacity className="bg-blue-500 px-6 py-3 rounded-lg">
                  <Text className="text-white font-semibold">Tạo sự kiện</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Event Ideas */}
        <View className="mx-4 mt-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Ý tưởng sự kiện
          </Text>

          <View className="space-y-3">
            <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <View className="flex-row items-center">
                <View className="bg-yellow-100 p-3 rounded-full mr-4">
                  <Ionicons name="star-outline" size={20} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">
                    Khuyến mãi cuối tuần
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Giảm giá đặc biệt cho các ngày cuối tuần
                  </Text>
                </View>
              </View>
            </View>

            <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <View className="flex-row items-center">
                <View className="bg-pink-100 p-3 rounded-full mr-4">
                  <Ionicons name="heart-outline" size={20} color="#EC4899" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">
                    Gói Valentine
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Ưu đãi đặc biệt cho các cặp đôi
                  </Text>
                </View>
              </View>
            </View>

            <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <View className="flex-row items-center">
                <View className="bg-green-100 p-3 rounded-full mr-4">
                  <Ionicons name="camera-outline" size={20} color="#10B981" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-medium">
                    Workshop chụp ảnh
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Tổ chức lớp học chụp ảnh tại địa điểm
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
