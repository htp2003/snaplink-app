// screens/venueOwner/VenueOwnerSubscriptionScreen.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  StatusBar,
  Modal,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackNavigationProp } from "../../navigation/types";
import { useAuth } from "../../hooks/useAuth";
import { useWallet } from "../../hooks/useWallet";
import { useVenueOwnerProfile } from "../../hooks/useVenueOwnerProfile";
import { useVenueOwnerLocation } from "../../hooks/useVenueOwnerLocation";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

// Types
interface Package {
  packageId: number;
  applicableTo: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  features: string;
}

interface LocationSubscription {
  premiumSubscriptionId: number;
  packageId: number;
  paymentId?: number;
  userId: number;
  photographerId?: number;
  locationId: number;
  startDate: string;
  endDate: string;
  status: string;
  packageName: string;
  applicableTo: string;
}

interface ApiResponse<T> {
  error: number;
  message: string;
  data: T;
}

interface CancelResponse {
  message: string;
}

const API_BASE_URL =
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

const VenueOwnerSubscriptionScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { walletBalance, formatCurrency, fetchWalletBalance } = useWallet();
  const { getProfileByUserId } = useVenueOwnerProfile();
  const { getLocationsByOwnerId, locations } = useVenueOwnerLocation();

  // State
  const [activeTab, setActiveTab] = useState<"packages" | "history">(
    "packages"
  );
  const [packages, setPackages] = useState<Package[]>([]);
  const [subscriptions, setSubscriptions] = useState<LocationSubscription[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribingToPackage, setSubscribingToPackage] = useState<
    number | null
  >(null);

  // Location selection
  const [selectedLocation, setSelectedLocation] = useState<any | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [userLocations, setUserLocations] = useState<any[]>([]);
  const [locationOwnerId, setLocationOwnerId] = useState<number | null>(null);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const getAuthToken = async () => {
    return await AsyncStorage.getItem("token");
  };

  const makeApiRequest = async <T,>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> => {
    console.log("🌐 Making API request:", {
      endpoint,
      fullUrl: `${API_BASE_URL}${endpoint}`,
      method: options.method || "GET",
    });

    const token = await getAuthToken();

    const requestConfig = {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, requestConfig);

    console.log("📡 Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API Error:", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log("✅ API Response parsed successfully");
    return result;
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadVenueOwnerProfile(),
        loadPackages(),
        fetchWalletBalance(),
      ]);
    } catch (error) {
      console.error("Error loading initial data:", error);
      Alert.alert("Lỗi", "Không thể tải dữ liệu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const loadVenueOwnerProfile = async () => {
    if (!user?.id) return;

    try {
      const profile = await getProfileByUserId(user.id);
      if (profile) {
        setLocationOwnerId(profile.locationOwnerId);

        // Load locations for this owner
        const ownerLocations = await getLocationsByOwnerId(
          profile.locationOwnerId
        );
        setUserLocations(ownerLocations);

        // Auto-select first location if available
        if (ownerLocations.length > 0 && !selectedLocation) {
          setSelectedLocation(ownerLocations[0]);
        }

        console.log(
          "✅ Loaded",
          ownerLocations.length,
          "locations for venue owner"
        );
      }
    } catch (error) {
      console.error("Error loading venue owner profile:", error);
    }
  };

  const loadPackages = async () => {
    console.log("🚀 Loading packages for venue owners...");

    try {
      const response = await makeApiRequest<Package[]>(
        "/api/Package/GetPackages"
      );

      console.log(
        "📦 Raw packages response:",
        JSON.stringify(response, null, 2)
      );

      if (Array.isArray(response)) {
        console.log("✅ Success! Got packages array");
        console.log("📊 Number of packages:", response.length);

        if (response.length > 0) {
          // Filter packages for venue owners (applicableTo = "location")
          const venueOwnerPackages = response.filter(
            (pkg) => pkg.applicableTo === "location"
          );
          console.log(
            "🏢 Filtered venue owner packages:",
            venueOwnerPackages.length
          );

          setPackages(venueOwnerPackages);
          console.log("✅ Venue owner packages set to state");
        } else {
          console.log("⚠️ No packages in response");
          setPackages([]);
        }
      } else {
        console.log("❌ Response is not an array:", typeof response);
        setPackages([]);
      }
    } catch (error) {
      console.error("💥 Error in loadPackages:", error);
      Alert.alert(
        "Lỗi",
        "Không thể tải danh sách gói. Kiểm tra console để xem chi tiết."
      );
      throw error;
    }
  };

  const loadLocationSubscriptions = async (locationId: number) => {
    try {
      console.log("📡 Loading subscriptions for locationId:", locationId);
      const response = await makeApiRequest<LocationSubscription[]>(
        `/api/Subscription/Location/${locationId}`
      );

      console.log(
        "📦 Location subscriptions response:",
        JSON.stringify(response, null, 2)
      );

      if (Array.isArray(response)) {
        console.log("✅ Success! Got location subscriptions array");
        console.log("📊 Number of subscriptions:", response.length);

        setSubscriptions(response);
      } else {
        console.log("❌ Response is not an array:", typeof response);
        setSubscriptions([]);
      }
    } catch (error) {
      console.error("Error loading location subscriptions:", error);
      setSubscriptions([]);
    }
  };

  // Load subscriptions when location changes
  useEffect(() => {
    if (selectedLocation?.locationId && activeTab === "history") {
      loadLocationSubscriptions(selectedLocation.locationId);
    }
  }, [selectedLocation, activeTab]);

  const handleLocationSelect = (location: any) => {
    setSelectedLocation(location);
    setShowLocationModal(false);

    // Reload subscriptions for new location if on history tab
    if (activeTab === "history") {
      loadLocationSubscriptions(location.locationId);
    }
  };

  const handleSubscribe = async (packageItem: Package) => {
    if (!selectedLocation) {
      Alert.alert("Lỗi", "Vui lòng chọn địa điểm trước khi đăng ký");
      return;
    }

    if (!walletBalance) {
      Alert.alert("Lỗi", "Không thể kiểm tra số dư ví");
      return;
    }

    // Check wallet balance
    if (walletBalance.balance < packageItem.price) {
      Alert.alert("Số dư không đủ", "Hãy vui lòng nạp tiền vào ví", [
        { text: "OK", style: "cancel" },
      ]);
      return;
    }

    // Show confirmation
    Alert.alert(
      "Xác nhận đăng ký",
      `Bạn có chắc chắn muốn đăng ký gói "${packageItem.name}" cho địa điểm "${
        selectedLocation.name
      }" với giá ${formatCurrency(packageItem.price)}?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng ký",
          onPress: () => confirmSubscribe(packageItem),
        },
      ]
    );
  };

  const confirmSubscribe = async (packageItem: Package) => {
    if (!selectedLocation) return;

    try {
      console.log("🚀 Starting subscription for package:", packageItem.name);
      console.log(
        "🏢 For location:",
        selectedLocation.name,
        "ID:",
        selectedLocation.locationId
      );
      setSubscribingToPackage(packageItem.packageId);

      const requestBody = {
        packageId: packageItem.packageId,
        photographerId: null, // null for venue owner subscriptions
        locationId: selectedLocation.locationId,
        // Thêm applicableTo để backend validate
        applicableTo: packageItem.applicableTo, // "Owner"
      };

      console.log("📋 Subscribe request body:", requestBody);

      const response = await makeApiRequest<any>(
        "/api/Subscription/Subscribe",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        }
      );

      console.log("📦 Subscribe response:", JSON.stringify(response, null, 2));

      if (response && response.premiumSubscriptionId && response.status) {
        console.log("✅ Subscription successful!", {
          subscriptionId: response.premiumSubscriptionId,
          status: response.status,
          packageName: response.packageName,
          locationId: response.locationId,
          startDate: response.startDate,
          endDate: response.endDate,
        });

        Alert.alert(
          "Thành công",
          `Đăng ký gói "${response.packageName}" cho địa điểm "${
            selectedLocation.name
          }" thành công!\nTrạng thái: ${response.status}\nHết hạn: ${new Date(
            response.endDate
          ).toLocaleDateString("vi-VN")}`
        );

        // Reload data
        console.log("🔄 Reloading data...");
        await Promise.all([
          fetchWalletBalance(), // Refresh wallet balance
          loadLocationSubscriptions(selectedLocation.locationId), // Refresh subscriptions
        ]);
      } else {
        console.log("❌ Unexpected response format:", response);
        throw new Error("Phản hồi từ server không đúng định dạng");
      }
    } catch (error) {
      console.error("💥 Error subscribing:", error);

      let errorMessage = "Không thể đăng ký gói";
      if (error instanceof Error) {
        if (error.message.includes("HTTP 400")) {
          errorMessage = "Dữ liệu không hợp lệ";
        } else if (error.message.includes("HTTP 401")) {
          errorMessage = "Không có quyền truy cập";
        } else if (error.message.includes("HTTP 409")) {
          errorMessage = "Địa điểm này đã có gói đang hoạt động";
        } else if (error.message.includes("HTTP 500")) {
          errorMessage = "Lỗi server. Vui lòng thử lại sau";
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert("Lỗi đăng ký gói", errorMessage);
    } finally {
      setSubscribingToPackage(null);
    }
  };

  const handleCancelSubscription = async (
    subscription: LocationSubscription
  ) => {
    Alert.prompt(
      "Hủy gói đăng ký",
      `Bạn có chắc chắn muốn hủy gói "${subscription.packageName}" cho địa điểm này?\nVui lòng nhập lý do hủy:`,
      [
        { text: "Hủy bỏ", style: "cancel" },
        {
          text: "Xác nhận",
          onPress: (reason) => {
            if (reason && reason.trim()) {
              confirmCancelSubscription(
                subscription.premiumSubscriptionId,
                reason.trim()
              );
            } else {
              Alert.alert("Lỗi", "Vui lòng nhập lý do hủy gói");
            }
          },
        },
      ],
      "plain-text",
      "",
      "Nhập lý do hủy..."
    );
  };

  const confirmCancelSubscription = async (
    subscriptionId: number,
    reason: string
  ) => {
    try {
      console.log("🚀 Canceling subscription:", { subscriptionId, reason });
      setSubscribingToPackage(subscriptionId);

      const response = await makeApiRequest<CancelResponse>(
        `/api/Subscription/${subscriptionId}/cancel?reason=${encodeURIComponent(
          reason
        )}`,
        {
          method: "PUT",
        }
      );

      console.log("📦 Cancel response:", response);

      if (response && response.message) {
        Alert.alert("Thành công", response.message);

        // Reload subscriptions
        if (selectedLocation) {
          await loadLocationSubscriptions(selectedLocation.locationId);
        }
      } else {
        throw new Error("Phản hồi từ server không đúng định dạng");
      }
    } catch (error) {
      console.error("💥 Error canceling subscription:", error);

      let errorMessage = "Không thể hủy gói đăng ký";
      if (error instanceof Error) {
        if (error.message.includes("HTTP 400")) {
          errorMessage = "Thông tin không hợp lệ";
        } else if (error.message.includes("HTTP 404")) {
          errorMessage = "Không tìm thấy gói đăng ký";
        } else if (error.message.includes("HTTP 409")) {
          errorMessage = "Gói đăng ký không thể hủy";
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert("Lỗi hủy gói", errorMessage);
    } finally {
      setSubscribingToPackage(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData();
    if (selectedLocation && activeTab === "history") {
      await loadLocationSubscriptions(selectedLocation.locationId);
    }
    setRefreshing(false);
  };

  // Get active subscription for selected location
  const getActiveSubscription = useCallback(() => {
    if (!selectedLocation) return null;

    const activeSubscriptions = subscriptions.filter(
      (sub) =>
        sub.status === "Active" &&
        sub.locationId === selectedLocation.locationId
    );

    if (activeSubscriptions.length > 0) {
      // Get the latest active subscription
      return activeSubscriptions.sort(
        (a, b) =>
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      )[0];
    }

    return null;
  }, [selectedLocation, subscriptions]);

  const activeSubscription = getActiveSubscription();

  const renderPackageCard = (packageItem: Package) => {
    const isSubscribing = subscribingToPackage === packageItem.packageId;
    const hasActiveSubscription =
      activeSubscription?.packageId === packageItem.packageId;
    const isCanceling =
      activeSubscription &&
      subscribingToPackage === activeSubscription.premiumSubscriptionId;

    return (
      <View
        key={packageItem.packageId}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          borderWidth: hasActiveSubscription ? 2 : 0,
          borderColor: hasActiveSubscription ? "#4CAF50" : "transparent",
        }}
      >
        {hasActiveSubscription && (
          <View
            style={{
              backgroundColor: "#4CAF50",
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
              alignSelf: "flex-start",
              marginBottom: 12,
            }}
          >
            <Text
              style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "bold" }}
            >
              ĐANG SỬ DỤNG
            </Text>
          </View>
        )}

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "bold",
                color: "#000",
                marginBottom: 8,
              }}
            >
              {packageItem.name}
            </Text>
            <Text style={{ fontSize: 14, color: "#666", marginBottom: 12 }}>
              {packageItem.description}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={{ fontSize: 14, color: "#666", marginLeft: 4 }}>
                {packageItem.durationDays} ngày
              </Text>
            </View>

            {packageItem.features && (
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: "#333",
                    fontWeight: "600",
                    marginBottom: 4,
                  }}
                >
                  Tính năng:
                </Text>
                <Text style={{ fontSize: 14, color: "#666" }}>
                  {packageItem.features}
                </Text>
              </View>
            )}

            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#000" }}>
              {formatCurrency(packageItem.price)}
            </Text>

            {/* Show active subscription details */}
            {hasActiveSubscription && activeSubscription && (
              <View
                style={{
                  marginTop: 12,
                  padding: 12,
                  backgroundColor: "#E8F5E8",
                  borderRadius: 8,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#2E7D32",
                      fontWeight: "600",
                    }}
                  >
                    Bắt đầu:
                  </Text>
                  <Text style={{ fontSize: 12, color: "#2E7D32" }}>
                    {new Date(activeSubscription.startDate).toLocaleDateString(
                      "vi-VN"
                    )}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#2E7D32",
                      fontWeight: "600",
                    }}
                  >
                    Hết hạn:
                  </Text>
                  <Text style={{ fontSize: 12, color: "#2E7D32" }}>
                    {new Date(activeSubscription.endDate).toLocaleDateString(
                      "vi-VN"
                    )}
                  </Text>
                </View>
                {(() => {
                  const endDate = new Date(activeSubscription.endDate);
                  const today = new Date();
                  const daysRemaining = Math.ceil(
                    (endDate.getTime() - today.getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return (
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: "#2E7D32",
                          fontWeight: "600",
                        }}
                      >
                        Còn lại:
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          color: daysRemaining <= 7 ? "#F44336" : "#2E7D32",
                          fontWeight: "bold",
                        }}
                      >
                        {daysRemaining} ngày
                      </Text>
                    </View>
                  );
                })()}
              </View>
            )}
          </View>
        </View>

        {/* Action Button */}
        {hasActiveSubscription && activeSubscription ? (
          // Cancel button for active subscription
          <TouchableOpacity
            style={{
              backgroundColor: "#F44336",
              paddingVertical: 12,
              borderRadius: 8,
              marginTop: 16,
              opacity: isCanceling ? 0.6 : 1,
            }}
            onPress={() => handleCancelSubscription(activeSubscription)}
            disabled={!!isCanceling}
          >
            {isCanceling ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={{
                  color: "#FFFFFF",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                Hủy gói
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          // Subscribe button
          <TouchableOpacity
            style={{
              backgroundColor: "#000",
              paddingVertical: 12,
              borderRadius: 8,
              marginTop: 16,
              opacity: isSubscribing ? 0.6 : 1,
            }}
            onPress={() => handleSubscribe(packageItem)}
            disabled={isSubscribing || !selectedLocation}
          >
            {isSubscribing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text
                style={{
                  color: "#FFFFFF",
                  textAlign: "center",
                  fontWeight: "600",
                }}
              >
                {!selectedLocation ? "Chọn địa điểm trước" : "Đăng ký"}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSubscriptionHistory = (subscription: LocationSubscription) => {
    const startDate = new Date(subscription.startDate).toLocaleDateString(
      "vi-VN"
    );
    const endDate = new Date(subscription.endDate).toLocaleDateString("vi-VN");

    const getStatusColor = (status: string) => {
      switch (status) {
        case "Active":
          return "#4CAF50";
        case "Expired":
          return "#FF9800";
        case "Canceled":
          return "#F44336";
        default:
          return "#666";
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case "Active":
          return "Đang hoạt động";
        case "Expired":
          return "Đã hết hạn";
        case "Canceled":
          return "Đã hủy";
        default:
          return status;
      }
    };

    return (
      <View
        key={subscription.premiumSubscriptionId}
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 8,
          }}
        >
          <Text
            style={{ fontSize: 16, fontWeight: "bold", color: "#000", flex: 1 }}
          >
            {subscription.packageName}
          </Text>
          <View
            style={{
              backgroundColor: getStatusColor(subscription.status),
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
            }}
          >
            <Text
              style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "bold" }}
            >
              {getStatusText(subscription.status)}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
          ID: {subscription.premiumSubscriptionId}
        </Text>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <Text style={{ fontSize: 14, color: "#666" }}>Từ ngày:</Text>
          <Text style={{ fontSize: 14, color: "#333" }}>{startDate}</Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 4,
          }}
        >
          <Text style={{ fontSize: 14, color: "#666" }}>Đến ngày:</Text>
          <Text style={{ fontSize: 14, color: "#333" }}>{endDate}</Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontSize: 14, color: "#666" }}>Loại:</Text>
          <Text style={{ fontSize: 14, color: "#333", fontWeight: "600" }}>
            {subscription.applicableTo}
          </Text>
        </View>

        {/* Show days remaining for active subscriptions */}
        {subscription.status === "Active" && (
          <View
            style={{
              marginTop: 8,
              padding: 8,
              backgroundColor: "#E8F5E8",
              borderRadius: 8,
            }}
          >
            {(() => {
              const endDateObj = new Date(subscription.endDate);
              const today = new Date();
              const daysRemaining = Math.ceil(
                (endDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
              );
              return (
                <Text
                  style={{
                    fontSize: 12,
                    color: daysRemaining <= 7 ? "#F44336" : "#2E7D32",
                    fontWeight: "bold",
                    textAlign: "center",
                  }}
                >
                  Còn lại {daysRemaining} ngày
                </Text>
              );
            })()}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#F7F7F7",
        }}
      >
        <ActivityIndicator size="large" color="#000" />
        <Text style={{ marginTop: 10, color: "#666" }}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F7F7" }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 10,
          paddingHorizontal: 20,
          backgroundColor: "#FFFFFF",
          borderBottomWidth: 1,
          borderBottomColor: "#E0E0E0",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "bold", color: "#000" }}>
            Quản lý gói đăng ký
          </Text>
        </View>
      </View>

      {/* Wallet Balance */}
      {walletBalance && (
        <View
          style={{
            backgroundColor: "#FFFFFF",
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: "#E0E0E0",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Ionicons name="wallet-outline" size={20} color="#4CAF50" />
              <Text style={{ fontSize: 14, color: "#666", marginLeft: 8 }}>
                Số dư ví:
              </Text>
            </View>
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: "#4CAF50" }}
            >
              {formatCurrency(walletBalance.balance)}
            </Text>
          </View>
        </View>
      )}

      {/* Location Selector */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          paddingVertical: 16,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: "#E0E0E0",
        }}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "600",
            color: "#000",
            marginBottom: 12,
          }}
        >
          Chọn địa điểm
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#F7F7F7",
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            borderWidth: 1,
            borderColor: "#E0E0E0",
          }}
          onPress={() => setShowLocationModal(true)}
        >
          <View style={{ flex: 1 }}>
            {selectedLocation ? (
              <View>
                <Text
                  style={{ fontSize: 16, fontWeight: "600", color: "#000" }}
                >
                  {selectedLocation.name}
                </Text>
                <Text
                  style={{ fontSize: 14, color: "#666", marginTop: 2 }}
                  numberOfLines={1}
                >
                  {selectedLocation.address}
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 16, color: "#999" }}>
                Chọn địa điểm để đăng ký gói
              </Text>
            )}
          </View>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View
        style={{
          backgroundColor: "#FFFFFF",
          flexDirection: "row",
          borderBottomWidth: 1,
          borderBottomColor: "#E0E0E0",
        }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 16,
            alignItems: "center",
            borderBottomWidth: activeTab === "packages" ? 2 : 0,
            borderBottomColor: "#000",
          }}
          onPress={() => setActiveTab("packages")}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: activeTab === "packages" ? "bold" : "normal",
              color: activeTab === "packages" ? "#000" : "#666",
            }}
          >
            Gói có sẵn
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 16,
            alignItems: "center",
            borderBottomWidth: activeTab === "history" ? 2 : 0,
            borderBottomColor: "#000",
          }}
          onPress={() => setActiveTab("history")}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: activeTab === "history" ? "bold" : "normal",
              color: activeTab === "history" ? "#000" : "#666",
            }}
          >
            Lịch sử đăng ký
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 20,
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === "packages" && (
          <>
            {/* Active Subscription Banner */}
            {activeSubscription && selectedLocation && (
              <View
                style={{
                  backgroundColor: "#E8F5E8",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: "#4CAF50",
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "bold",
                      color: "#2E7D32",
                      marginLeft: 8,
                    }}
                  >
                    Gói đang sử dụng
                  </Text>
                </View>

                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "#000",
                    marginBottom: 4,
                  }}
                >
                  {activeSubscription.packageName}
                </Text>

                <Text style={{ fontSize: 14, color: "#666", marginBottom: 8 }}>
                  Cho địa điểm: {selectedLocation.name}
                </Text>

                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 14, color: "#666" }}>
                    Còn lại:{" "}
                    <Text
                      style={{
                        color: (() => {
                          const endDate = new Date(activeSubscription.endDate);
                          const today = new Date();
                          const daysRemaining = Math.ceil(
                            (endDate.getTime() - today.getTime()) /
                              (1000 * 60 * 60 * 24)
                          );
                          return daysRemaining <= 7 ? "#F44336" : "#4CAF50";
                        })(),
                        fontWeight: "bold",
                      }}
                    >
                      {(() => {
                        const endDate = new Date(activeSubscription.endDate);
                        const today = new Date();
                        const daysRemaining = Math.ceil(
                          (endDate.getTime() - today.getTime()) /
                            (1000 * 60 * 60 * 24)
                        );
                        return daysRemaining;
                      })()}{" "}
                      ngày
                    </Text>
                  </Text>
                  <Text style={{ fontSize: 14, color: "#666" }}>
                    Hết hạn:{" "}
                    {new Date(activeSubscription.endDate).toLocaleDateString(
                      "vi-VN"
                    )}
                  </Text>
                </View>
              </View>
            )}

            {loading ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingVertical: 40,
                }}
              >
                <ActivityIndicator size="large" color="#000" />
                <Text style={{ marginTop: 10, color: "#666" }}>
                  Đang tải gói...
                </Text>
              </View>
            ) : packages.length > 0 ? (
              packages.map(renderPackageCard)
            ) : (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingVertical: 40,
                }}
              >
                <Ionicons name="folder-open-outline" size={48} color="#CCC" />
                <Text style={{ fontSize: 16, color: "#666", marginTop: 16 }}>
                  Không có gói nào có sẵn
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === "history" && (
          <>
            {!selectedLocation ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingVertical: 40,
                }}
              >
                <Ionicons name="location-outline" size={48} color="#CCC" />
                <Text style={{ fontSize: 16, color: "#666", marginTop: 16 }}>
                  Vui lòng chọn địa điểm để xem lịch sử đăng ký
                </Text>
              </View>
            ) : loading ? (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingVertical: 40,
                }}
              >
                <ActivityIndicator size="large" color="#000" />
                <Text style={{ marginTop: 10, color: "#666" }}>
                  Đang tải lịch sử...
                </Text>
              </View>
            ) : subscriptions.length > 0 ? (
              <>
                <Text style={{ fontSize: 16, color: "#666", marginBottom: 16 }}>
                  Lịch sử đăng ký cho:{" "}
                  <Text style={{ fontWeight: "bold", color: "#000" }}>
                    {selectedLocation.name}
                  </Text>
                </Text>
                {subscriptions.map(renderSubscriptionHistory)}
              </>
            ) : (
              <View
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingVertical: 40,
                }}
              >
                <Ionicons name="receipt-outline" size={48} color="#CCC" />
                <Text style={{ fontSize: 16, color: "#666", marginTop: 16 }}>
                  Chưa có lịch sử đăng ký cho địa điểm này
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Location Selection Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowLocationModal(false)}
        >
          <Pressable className="bg-white rounded-t-3xl p-6 max-h-96">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-gray-900">
                Chọn địa điểm
              </Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {userLocations.map((location) => {
                const isSelected =
                  selectedLocation?.locationId === location.locationId;

                return (
                  <TouchableOpacity
                    key={location.locationId}
                    style={{
                      padding: 16,
                      borderRadius: 8,
                      marginBottom: 8,
                      backgroundColor: isSelected ? "#EBF4FF" : "#F7F7F7",
                      borderWidth: 1,
                      borderColor: isSelected ? "#3B82F6" : "#E5E5E5",
                    }}
                    onPress={() => handleLocationSelect(location)}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: "bold",
                            color: isSelected ? "#3B82F6" : "#000",
                            marginBottom: 4,
                          }}
                          numberOfLines={1}
                        >
                          {location.name}
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            color: "#666",
                            marginBottom: 4,
                          }}
                          numberOfLines={2}
                        >
                          {location.address}
                        </Text>
                        <View
                          style={{ flexDirection: "row", alignItems: "center" }}
                        >
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor:
                                location.availabilityStatus === "Available"
                                  ? "#4CAF50"
                                  : "#FF9800",
                              marginRight: 6,
                            }}
                          />
                          <Text style={{ fontSize: 12, color: "#666" }}>
                            {location.availabilityStatus === "Available"
                              ? "Hoạt động"
                              : "Không hoạt động"}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={24}
                          color="#3B82F6"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {userLocations.length === 0 && (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <Ionicons name="business-outline" size={48} color="#CCC" />
                  <Text style={{ fontSize: 16, color: "#666", marginTop: 16 }}>
                    Chưa có địa điểm nào
                  </Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default VenueOwnerSubscriptionScreen;
