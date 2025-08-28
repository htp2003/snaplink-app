import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Animated,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { getResponsiveSize } from "../../utils/responsive";
import { useProfile } from "../../context/ProfileContext";
import FavoritedModal from "../../components/FavoritedModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import {
  photographerService,
  PhotographerProfile,
} from "../../services/photographerService";

// Import the new PhotographerRatingsModal
import PhotographerRatingsModal from "../../components/PhotographerRatingModal";

// Notification
import { NotificationBadge } from "../../components/Notification/NotificationBell";
import NotificationModal from "../../components/Notification/NotificationModal";
import { useNotificationContext } from "../../context/NotificationProvider";

const { width } = Dimensions.get("window");
const HEADER_HEIGHT = 60;

const ProfilePhotographerScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { profileData } = useProfile();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const { user, getCurrentUserId, logout } = useAuth();
  const [photographerData, setPhotographerData] =
    useState<PhotographerProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const { unreadCount } = useNotificationContext();

  useEffect(() => {
    loadPhotographerData();
  }, []);

  const loadPhotographerData = async () => {
    try {
      setIsLoadingProfile(true);
      const userId = getCurrentUserId();

      if (!userId) {
        setIsLoadingProfile(false);
        return;
      }

      // Use the new findPhotographerProfile method that includes fallback logic
      const photographerProfile =
        await photographerService.findPhotographerByUserId(userId);

      if (photographerProfile) {
        setPhotographerData(photographerProfile);
      } else {
        setPhotographerData(null);
      }

      setIsLoadingProfile(false);
    } catch (error) {
      console.error("Error loading photographer data:", error);
      setIsLoadingProfile(false);
    }
  };

  const scrollY = useRef(new Animated.Value(0)).current;

  const favoritedUsers = [
    { id: "1", name: "John Doe", avatar: "https://example.com/avatar1.jpg" },
    { id: "2", name: "Jane Smith", avatar: "https://example.com/avatar2.jpg" },
    { id: "3", name: "Mike Johnson" },
  ];

  // Smooth animation values
  const headerOpacity = scrollY.interpolate({
    inputRange: [HEADER_HEIGHT - 20, HEADER_HEIGHT + 20],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_HEIGHT],
    outputRange: [-100, 0],
    extrapolate: "clamp",
  });

  const shadowOpacity = scrollY.interpolate({
    inputRange: [HEADER_HEIGHT - 10, HEADER_HEIGHT + 10],
    outputRange: [0, 0.1],
    extrapolate: "clamp",
  });

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  const handleRatingPress = () => {
    if (photographerData) {
      setShowRatingModal(true);
    } else {
      Alert.alert(
        "Thông báo",
        "Bạn cần trở thành nhiếp ảnh gia để xem đánh giá.",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Đăng ký",
            onPress: () => navigation.navigate("EditProfilePhotographer"),
          },
        ]
      );
    }
  };

  const handleLogout = async () => {
    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất không?", [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: async () => {
          try {
            setIsLoggingOut(true);

            // Clear any cached data first
            await AsyncStorage.clear();

            // Call logout from auth context
            await logout();

            // Small delay to ensure logout is processed
            await new Promise((resolve) => setTimeout(resolve, 100));

            // Reset navigation stack completely
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          } catch (error) {
            console.error("❌ Logout error:", error);

            // Reset loading state on error
            setIsLoggingOut(false);

            // Show error alert
            Alert.alert(
              "Lỗi đăng xuất",
              "Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.",
              [{ text: "OK" }]
            );
          }
        },
      },
    ]);
  };

  const handlePortfolioPress = () => {
    if (photographerData) {
      navigation.navigate("PortfolioScreen");
    } else {
      Alert.alert(
        "Thông báo",
        "Bạn cần trở thành nhiếp ảnh gia trước khi quản lý portfolio.",
        [
          { text: "Hủy", style: "cancel" },
          {
            text: "Đăng ký",
            onPress: () => navigation.navigate("EditProfilePhotographer"),
          },
        ]
      );
    }
  };

  const handleFavoritedPress = () => {
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
  };

  const handleNotificationPress = () => {
    setShowNotificationModal(true);
  };

  const menuItems = [
    {
      icon: "card-outline",
      title: "Quản lý gói đăng ký",
      hasNotification: false,
      onPress: () => {
        if (photographerData) {
          navigation.navigate("SubscriptionManagement");
        } else {
          Alert.alert(
            "Thông báo",
            "Bạn cần trở thành nhiếp ảnh gia trước khi quản lý gói đăng ký.",
            [
              { text: "Hủy", style: "cancel" },
              {
                text: "Đăng ký",
                onPress: () => navigation.navigate("EditProfilePhotographer"),
              },
            ]
          );
        }
      },
    },
    {
      icon: "settings-outline",
      title: "Cài đặt tài khoản",
      hasNotification: true,
      // onPress: () => navigation.navigate('Settings')
    },
    {
      icon: "help-circle-outline",
      title: "Nhận trợ giúp",
      // onPress: () => navigation.navigate('Help')
    },
    {
      icon: "person-outline",
      title: "Xem hồ sơ",
      // onPress: () => navigation.navigate('ViewProfile')
    },
    {
      icon: "hand-left-outline",
      title: "Quyền riêng tư",
      // onPress: () => navigation.navigate('Privacy')
    },
    {
      icon: "people-outline",
      title: "Giới thiệu host",
      // onPress: () => navigation.navigate('BecomeHost')
    },
    {
      icon: "business-outline",
      title: "Tìm đồng chủ nhà",
      // onPress: () => navigation.navigate('FindCoHost')
    },
    {
      icon: "document-text-outline",
      title: "Pháp lý",
      // onPress: () => navigation.navigate('Legal')
    },
    {
      icon: "log-out-outline",
      title: "Đăng xuất",
      onPress: handleLogout,
      isLoading: isLoggingOut,
    },
  ];

  const renderMenuItem = (item: any, index: number) => (
    <TouchableOpacity
      key={index}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: "#FFFFFF",
        borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
        borderBottomColor: "#F0F0F0",
      }}
      onPress={item.onPress}
      disabled={item.isLoading}
    >
      <View style={{ position: "relative" }}>
        {item.isLoading ? (
          <ActivityIndicator size="small" color="#000000" />
        ) : (
          <Ionicons name={item.icon} size={24} color="#000000" />
        )}
        {item.hasNotification && (
          <View
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#FF385C",
            }}
          />
        )}
      </View>
      <Text
        style={{
          flex: 1,
          marginLeft: 16,
          fontSize: 16,
          color: "#000000",
        }}
      >
        {item.title}
      </Text>
      <Ionicons name="chevron-forward" size={20} color="#C0C0C0" />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F7F7F7" }}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Smooth Sticky Header */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: HEADER_HEIGHT + insets.top,
          backgroundColor: "#FFFFFF",
          zIndex: 1000,
          paddingTop: insets.top,
          opacity: headerOpacity,
          transform: [{ translateY: headerTranslateY }],
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: shadowOpacity,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        <Animated.View
          style={{
            flex: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
          }}
        >
          <Animated.Text
            style={{
              fontSize: 32,
              fontWeight: "bold",
              color: "#000000",
              opacity: headerOpacity,
            }}
          >
            Hồ sơ
          </Animated.Text>
          <Animated.View style={{ opacity: headerOpacity }}>
            <NotificationBadge
              size="medium"
              color="#FF385C"
              onPress={handleNotificationPress}
              iconName="bell"
            />
          </Animated.View>
        </Animated.View>
      </Animated.View>

      {/* Scrollable Content */}
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 20,
          paddingBottom: insets.bottom + 100,
        }}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={8}
      >
        {/* Header trong scroll - sẽ scroll lên và trở thành sticky */}
        <View
          style={{
            height: HEADER_HEIGHT,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            marginBottom: 20,
          }}
        >
          <Text style={{ fontSize: 32, fontWeight: "bold", color: "#000000" }}>
            Hồ sơ
          </Text>
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: "#F7F7F7",
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={handleNotificationPress}
          >
            <Ionicons name="notifications-outline" size={24} color="#000000" />
            <View
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#FF385C",
              }}
            />
          </TouchableOpacity>
        </View>

        {/* Profile Card - Simplified */}
        <TouchableOpacity
          onPress={() => navigation.navigate("ViewProfilePhotographerScreen")}
        >
          <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 20,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: "#333333",
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                {user?.profileImage ? (
                  <Image
                    source={{ uri: user.profileImage }}
                    style={{ width: "100%", height: "100%", borderRadius: 40 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 32,
                      fontWeight: "bold",
                    }}
                  >
                    {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
                  </Text>
                )}
              </View>

              <Text
                style={{
                  fontSize: 24,
                  fontWeight: "bold",
                  color: "#000000",
                  marginBottom: 4,
                }}
              >
                {user?.fullName || "User"}
              </Text>

              <Text
                style={{ fontSize: 16, color: "#666666", marginBottom: 12 }}
              >
                {photographerData ? "Nhiếp ảnh gia" : "Khách"}
              </Text>

              {!photographerData && (
                <TouchableOpacity
                  onPress={() => navigation.navigate("EditProfilePhotographer")}
                  style={{
                    backgroundColor: "#000000",
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                  }}
                >
                  <Text style={{ fontSize: 14, color: "#FFFFFF" }}>
                    Trở thành nhiếp ảnh gia
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Feature Cards */}
        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            {/* Lịch rảnh của bạn */}
            <TouchableOpacity
              style={{
                flex: 0.48,
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 20,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={() => {
                if (photographerData) {
                  navigation.navigate("ManageAvailabilityScreen");
                } else {
                  Alert.alert(
                    "Thông báo",
                    "Bạn cần trở thành nhiếp ảnh gia trước khi quản lý lịch làm việc.",
                    [
                      { text: "Hủy", style: "cancel" },
                      {
                        text: "Đăng ký",
                        onPress: () =>
                          navigation.navigate("EditProfilePhotographer"),
                      },
                    ]
                  );
                }
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 32,
                  marginBottom: 12,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="calendar" size={32} color="#8B7355" />
              </View>
              <View
                style={{
                  backgroundColor: "#6B73FF",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "bold" }}
                >
                  {photographerData ? "QUẢN LÝ" : "MỚI"}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#000000",
                  textAlign: "center",
                }}
              >
                Lịch rảnh{"\n"}của bạn
              </Text>
            </TouchableOpacity>

            {/* Portfolio */}
            <TouchableOpacity
              style={{
                flex: 0.48,
                backgroundColor: "#FFFFFF",
                borderRadius: 12,
                padding: 20,
                alignItems: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              }}
              onPress={handlePortfolioPress}
            >
              <View
                style={{
                  width: 60,
                  height: 32,
                  marginBottom: 12,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="camera" size={32} color="#8B7355" />
              </View>
              <View
                style={{
                  backgroundColor: "#6B73FF",
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{ color: "#FFFFFF", fontSize: 10, fontWeight: "bold" }}
                >
                  {photographerData ? "QUẢN LÝ" : "MỚI"}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#000000",
                  textAlign: "center",
                }}
              >
                Portfolio
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Photographer Stats Cards - 3 cards in a row */}
        {isLoadingProfile ? (
          <View
            style={{
              paddingHorizontal: 16,
              marginBottom: 30,
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color="#666666" />
            <Text style={{ marginTop: 10, color: "#666666" }}>
              Đang tải thông tin nhiếp ảnh gia...
            </Text>
          </View>
        ) : photographerData ? (
          <View style={{ paddingHorizontal: 16, marginBottom: 30 }}>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              {/* Rating Card */}
              <TouchableOpacity
                style={{
                  flex: 0.32,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 16,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
                onPress={handleRatingPress}
              >
                <Ionicons name="star" size={24} color="#FFD700" />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "#000000",
                    marginTop: 8,
                  }}
                >
                  {photographerData.rating?.toFixed(1) || "0.0"}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#666666",
                    textAlign: "center",
                  }}
                >
                  Đánh giá
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    color: "#999999",
                    textAlign: "center",
                    marginTop: 4,
                  }}
                >
                  ({photographerData.ratingCount || 0} lượt)
                </Text>
              </TouchableOpacity>

              {/* Experience Card */}
              <View
                style={{
                  flex: 0.32,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 16,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons name="trophy" size={24} color="#8B7355" />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "bold",
                    color: "#000000",
                    marginTop: 8,
                  }}
                >
                  {photographerData.yearsExperience || 0}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#666666",
                    textAlign: "center",
                  }}
                >
                  Năm KN
                </Text>
              </View>

              {/* Hourly Rate Card */}
              <View
                style={{
                  flex: 0.32,
                  backgroundColor: "#FFFFFF",
                  borderRadius: 12,
                  padding: 16,
                  alignItems: "center",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Ionicons name="cash" size={24} color="#4CAF50" />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: "#000000",
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  {photographerData.hourlyRate?.toLocaleString("vi-VN") || "0"}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: "#666666",
                    textAlign: "center",
                  }}
                >
                  VNĐ/giờ
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Menu Items */}
        <View style={{ paddingHorizontal: 16, marginBottom: 30 }}>
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 12,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
              overflow: "hidden",
            }}
          >
            {menuItems.map((item, index) => renderMenuItem(item, index))}
          </View>
        </View>
      </ScrollView>

      {/* Updated Modal - Use PhotographerRatingsModal instead of RatingModal */}
      <PhotographerRatingsModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        photographerId={photographerData?.photographerId || ""}
        photographerName={user?.fullName || "Photographer"}
      />
      
      <FavoritedModal
        visible={isModalVisible}
        favoritedUsers={favoritedUsers}
        onClose={handleModalClose}
      />

      <NotificationModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </View>
  );
};

export default ProfilePhotographerScreen;