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
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { getResponsiveSize } from "../../utils/responsive";
import { useProfile } from "../../context/ProfileContext";
import FavoritedModal from "../../components/FavoritedModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
// import NotificationBell from "../../components/Notification/NotificationBell";
// import NotificationModal from "../../components/Notification/NotificationModal";
import { userService } from "../../services/userService";
import { UserProfile } from "../../types/userProfile";
import { useAuth, User as AuthUser } from "../../hooks/useAuth";


const { width } = Dimensions.get("window");
const HEADER_HEIGHT = 60;

const ProfileUserScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { profileData } = useProfile();
  const { user: authUser, getCurrentUserId, logout } = useAuth();
  const currentUserId = getCurrentUserId();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isNotificationModalVisible, setIsNotificationModalVisible] =
    useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | AuthUser | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const scrollY = useRef(new Animated.Value(0)).current;

  const favoritedUsers = [
    { id: "1", name: "John Doe", avatar: "https://example.com/avatar1.jpg" },
    { id: "2", name: "Jane Smith", avatar: "https://example.com/avatar2.jpg" },
    { id: "3", name: "Mike Johnson" },
  ];

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (
        !currentUserId ||
        typeof currentUserId !== "number" ||
        currentUserId <= 0
      ) {
        // If we have authUser data, use it as fallback
        if (authUser) {

          setUserProfile(authUser);
          setLoading(false);
          return;
        }

        setError("Invalid user ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userData = await userService.getUserById(currentUserId);
        setUserProfile(userData);
        setError(null);
      } catch (err) {
        console.error("Error fetching user profile:", err);

        // If API fails but we have authUser, use it as fallback
        if (authUser) {

          setUserProfile(authUser);
          setError(null);
        } else {
          setError("Failed to load profile");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [currentUserId, authUser]);

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


            await logout();



            // Navigate to login screen or reset navigation stack
            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }], // Adjust route name as needed
            });
          } catch (error) {
            console.error("❌ Logout error:", error);

            // Show error alert
            Alert.alert(
              "Lỗi đăng xuất",
              "Có lỗi xảy ra khi đăng xuất. Vui lòng thử lại.",
              [{ text: "OK" }]
            );
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  // Get user's primary role - for now, default to "Khách"
  const getUserRole = (user: UserProfile | AuthUser | null): string => {
    if (!user) return "Khách";

    // Check if user has roles from authUser (different structure)
    if ("roles" in user && Array.isArray(user.roles)) {
      const authRoles = user.roles as string[];
      if (authRoles.length > 0) {
        const role = authRoles[0];
        // Map English roles to Vietnamese
        switch (role.toLowerCase()) {
          case "photographer":
            return "Nhiếp ảnh gia";
          case "owner":
            return "Chủ địa điểm";
          case "admin":
            return "Quản trị viên";
          case "moderator":
            return "Điều hành viên";
          default:
            return "Khách";
        }
      }
    }

    // Check if user has userRoles from API (different structure)
    if ("userRoles" in user && user.userRoles?.$values) {
      const roles = user.userRoles.$values || [];
      if (roles.length > 0) {
        const role = roles[0].roleName;
        // Map English roles to Vietnamese
        switch (role) {
          case "Photographer":
            return "Nhiếp ảnh gia";
          case "LocationOwner":
            return "Chủ địa điểm";
          case "Admin":
            return "Quản trị viên";
          case "Moderator":
            return "Điều hành viên";
          default:
            return "Khách";
        }
      }
    }

    // Check if user is a photographer (from API structure)
    if (
      "photographers" in user &&
      user.photographers?.$values &&
      user.photographers.$values.length > 0
    ) {
      return "Nhiếp ảnh gia";
    }

    // Check if user is a location owner (from API structure)
    if (
      "locationOwners" in user &&
      user.locationOwners?.$values &&
      user.locationOwners.$values.length > 0
    ) {
      return "Chủ địa điểm";
    }

    return "Khách";
  };

  // Get user display name
  const getUserDisplayName = (user: UserProfile | AuthUser | null): string => {
    if (!user) return "Người dùng";

    // Handle both authUser and API user structures
    if ("fullName" in user && user.fullName) {
      return user.fullName;
    }

    if ("userName" in user && user.userName) {
      return user.userName;
    }

    return "Người dùng";
  };

  // Get user avatar
  const getUserAvatar = (
    user: UserProfile | AuthUser | null
  ): string | null => {
    if (!user) return null;

    // Handle both authUser and API user structures
    if ("profileImage" in user && user.profileImage) {
      return user.profileImage;
    }

    return null;
  };

  // Get user initials for avatar fallback
  const getUserInitials = (user: UserProfile | AuthUser | null): string => {
    if (!user) return "U";

    // Handle both authUser and API user structures
    const name =
      ("fullName" in user && user.fullName) ||
      ("userName" in user && user.userName) ||
      "User";

    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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

  const menuItems = [

    {
      icon: "shield-outline",
      title: "Tài khoản và bảo mật",
      onPress: () => {
        if (currentUserId !== null) {
          navigation.navigate('ViewProfileUserScreen', { userId: currentUserId });
        } else {
          Alert.alert("Lỗi", "Không tìm thấy ID người dùng");
        }
      },
    },
    {
      icon: "log-out-outline",
      title: "Đăng xuất",
      onPress: handleLogout,
      isLoading: isLoggingOut,
    },
  ];

  const handleFavoritedPress = () => {
    setIsModalVisible(true);
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
  };

  const handleNotificationPress = () => {
    setIsNotificationModalVisible(true);
  };

  const handleNotificationModalClose = () => {
    setIsNotificationModalVisible(false);
  };

  const renderNotificationBell = (isSticky = false) => {
    // Only render when currentUserId is valid
    if (
      !currentUserId ||
      typeof currentUserId !== "number" ||
      currentUserId <= 0
    ) {
      return null;
    }

    return (
      // <NotificationBell
      //   onPress={handleNotificationPress}
      //   userId={currentUserId}
      //   size={24}
      //   color="#000000"
      //   style={{
      //     opacity: isSticky ? 1 : 1,
      //   }}
      // />
      <Ionicons name="notifications-outline" size={24} color="#000000" />
    );
  };

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
    >
      <View style={{ position: "relative" }}>
        <Ionicons name={item.icon} size={24} color="#000000" />
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

  const renderProfileCard = () => {
    if (loading) {
      return (
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
              minHeight: 180,
              justifyContent: "center",
            }}
          >
            <ActivityIndicator size="large" color="#FF385C" />
            <Text style={{ marginTop: 12, color: "#666666" }}>Đang tải...</Text>
          </View>
        </View>
      );
    }

    if (error) {
      return (
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
              minHeight: 180,
              justifyContent: "center",
            }}
          >
            <Ionicons name="alert-circle-outline" size={48} color="#FF385C" />
            <Text
              style={{ marginTop: 12, color: "#FF385C", textAlign: "center" }}
            >
              {error}
            </Text>
            <TouchableOpacity
              style={{
                marginTop: 12,
                paddingHorizontal: 16,
                paddingVertical: 8,
                backgroundColor: "#FF385C",
                borderRadius: 8,
              }}
              onPress={() => {
                // Retry loading
                if (currentUserId) {
                  setError(null);
                  // Trigger re-fetch
                }
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 14 }}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    const avatarUrl = getUserAvatar(userProfile);
    const displayName = getUserDisplayName(userProfile);
    const userRole = getUserRole(userProfile);
    const initials = getUserInitials(userProfile);

    return (
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
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: "100%", height: "100%", borderRadius: 40 }}
                resizeMode="cover"
                onError={(e) => {
                  console.log("Avatar load error:", e.nativeEvent.error);
                }}
              />
            ) : (
              <Text
                style={{ color: "#FFFFFF", fontSize: 32, fontWeight: "bold" }}
              >
                {initials}
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
            {displayName}
          </Text>
          <Text style={{ fontSize: 16, color: "#666666" }}>{userRole}</Text>
        </View>
      </View>
    );
  };

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
            {renderNotificationBell(true)}
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
          {renderNotificationBell(false)}
        </View>

        {/* Profile Card with API Data */}
        <TouchableOpacity
          onPress={() => {
            if (currentUserId) {
              navigation.navigate("ViewProfileUserScreen", {
                userId: currentUserId,
              });
            }
          }}
        >
          {renderProfileCard()}
        </TouchableOpacity>

        {/* Feature Cards */}
        <View style={{ paddingHorizontal: 16, marginBottom: 30 }}>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            {/* Đơn hàng gần đây  */}
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
                if (currentUserId && typeof currentUserId === 'number' && currentUserId > 0) {
                  navigation.navigate('OrderHistoryScreen', { userId: currentUserId });
                } else {
                  Alert.alert(
                    'Thông báo',
                    'Không thể tải thông tin đơn hàng. Vui lòng thử lại sau.',
                    [{ text: 'OK' }]
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
                <Ionicons name="briefcase" size={32} color="#8B7355" />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#000000",
                  textAlign: "center",
                }}
              >
                Đơn hàng{"\n"}gần đây
              </Text>
            </TouchableOpacity>

            {/* Ví */}
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
                navigation.navigate("WalletScreen");
              }}
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
                <Ionicons
                  name="wallet"
                  size={32}
                  color="#FF385C"
                />
              </View>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#000000",
                  textAlign: "center",
                }}
              >
                Ví của bạn
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Items */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            marginHorizontal: 16,
            borderRadius: 12,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          {menuItems.map((item, index) => renderMenuItem(item, index))}
        </View>
      </ScrollView>

      {/* Modal */}
      <FavoritedModal
        visible={isModalVisible}
        favoritedUsers={favoritedUsers}
        onClose={handleModalClose}
      />

      {/* Notification Modal - Only render if userId is valid */}
      {/* {currentUserId &&
        typeof currentUserId === "number" &&
        currentUserId > 0 && (
          <NotificationModal
            visible={isNotificationModalVisible}
            onClose={handleNotificationModalClose}
            userId={currentUserId}
          />
        )} */}
    </View>
  );
};

export default ProfileUserScreen;
