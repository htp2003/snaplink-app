import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { userService } from "../../services/userService";
import { userStyleService } from "../../services/userStyleService";
import { UserProfile } from "../../types/userProfile";
import { UserStyle } from "../../types/userStyle";
import { useAuth, User as AuthUser } from "../../hooks/useAuth";
import { getResponsiveSize } from "../../utils/responsive";

interface RouteParams {
  userId: number;
}

type ViewProfileRouteProp = RouteProp<Record<string, RouteParams>, string>;

const ViewProfileUserScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<ViewProfileRouteProp>();
  const insets = useSafeAreaInsets();
  const { userId } = route.params || { userId: 0 };
  const { user: currentUser, getCurrentUserId } = useAuth();

  const [userProfile, setUserProfile] = useState<UserProfile | AuthUser | null>(
    null
  );
  const [userStyles, setUserStyles] = useState<UserStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingStyles, setLoadingStyles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if viewing own profile
  const isOwnProfile = currentUser && userId === currentUser.id;

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId || typeof userId !== "number" || userId <= 0) {
        setError("Invalid user ID");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Always try to fetch from API first for most up-to-date data
        try {
          console.log("🔍 Fetching user from API for userId:", userId);
          const userData = await userService.getUserById(userId);
          console.log("🔍 API response userData:", userData);
          
          setUserProfile(userData);
          setError(null);
        } catch (apiError) {
          console.error("❌ API fetch failed:", apiError);
          
          // If API fails and viewing own profile, use currentUser as fallback
          if (isOwnProfile && currentUser) {
            console.log("🔍 Using currentUser as fallback:", currentUser);
            setUserProfile(currentUser);
            setError(null);
          } else {
            throw apiError; // Re-throw if no fallback available
          }
        }

        // Load user styles
        await loadUserStyles(userId);
      } catch (err) {
        console.error("❌ Error fetching user profile:", err);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId, currentUser, isOwnProfile]);

  const loadUserStyles = async (userId: number) => {
    try {
      setLoadingStyles(true);
      const styles = await userStyleService.getUserStyles(userId);
      setUserStyles(styles);
    } catch (error) {
      console.error("❌ Error loading user styles:", error);
      setUserStyles([]);
    } finally {
      setLoadingStyles(false);
    }
  };

  // Helper functions
  const getUserDisplayName = (user: UserProfile | AuthUser | null): string => {
    if (!user) return "Người dùng";

    if ("fullName" in user && user.fullName) {
      return user.fullName;
    }

    if ("userName" in user && user.userName) {
      return user.userName;
    }

    return "Người dùng";
  };

  const getUserAvatar = (
    user: UserProfile | AuthUser | null
  ): string | null => {
    if (!user) return null;

    console.log("🔍 getUserAvatar - user object:", user);
    console.log("🔍 getUserAvatar - profileImage:", user.profileImage);

    // Check for profileImage in different possible structures
    if ("profileImage" in user) {
      // Handle direct profileImage
      if (typeof user.profileImage === "string" && user.profileImage.trim()) {
        console.log("🔍 Found direct profileImage:", user.profileImage);
        return user.profileImage;
      }
      
      // Handle nested structure if exists
      if (user.profileImage && typeof user.profileImage === "object") {
        // @ts-ignore - Check if it's a nested object with value
        if (user.profileImage.value || user.profileImage.$value) {
          // @ts-ignore
          return user.profileImage.value || user.profileImage.$value;
        }
      }
    }

    // Check for alternative property names that might exist
    // @ts-ignore
    if (user.avatar) {
      // @ts-ignore
      return user.avatar;
    }
    // @ts-ignore
    if (user.image) {
      // @ts-ignore
      return user.image;
    }

    console.log("🔍 No valid avatar found, returning null");
    return null;
  };

  const getUserInitials = (user: UserProfile | AuthUser | null): string => {
    if (!user) return "U";

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

  const getUserRole = (user: UserProfile | AuthUser | null): string => {
    if (!user) return "Khách";

    // Check if user has roles from authUser
    if ("roles" in user && Array.isArray(user.roles)) {
      const authRoles = user.roles as string[];
      if (authRoles.length > 0) {
        const role = authRoles[0];
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

    // Check if user has userRoles from API
    if ("userRoles" in user && user.userRoles?.$values) {
      const roles = user.userRoles.$values || [];
      if (roles.length > 0) {
        const role = roles[0].roleName;
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

    return "Khách";
  };

  const getUserBio = (user: UserProfile | AuthUser | null): string => {
    if (!user) return "Chưa có mô tả";

    if ("bio" in user && user.bio) {
      return user.bio;
    }

    return "Chưa có mô tả";
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleEditPress = () => {
    if (isOwnProfile) {
      // Navigate to edit profile screen
      navigation.navigate("EditProfileUserScreen" as any);
    } else {
      Alert.alert("Thông báo", "Bạn chỉ có thể chỉnh sửa hồ sơ của chính mình");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F7" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: getResponsiveSize(16),
            paddingVertical: getResponsiveSize(12),
            backgroundColor: "#F7F7F7",
          }}
        >
          <TouchableOpacity
            onPress={handleGoBack}
            style={{
              width: getResponsiveSize(40),
              height: getResponsiveSize(40),
              borderRadius: getResponsiveSize(20),
              backgroundColor: "#E5E5E5",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons
              name="chevron-back"
              size={getResponsiveSize(24)}
              color="#000000"
            />
          </TouchableOpacity>

          <Text
            style={{
              fontSize: getResponsiveSize(18),
              fontWeight: "600",
              color: "#000000",
            }}
          >
            Hồ sơ
          </Text>

          <View style={{ width: getResponsiveSize(40) }} />
        </View>

        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color="#000000" />
          <Text
            style={{
              marginTop: getResponsiveSize(16),
              fontSize: getResponsiveSize(16),
              color: "#666666",
            }}
          >
            Đang tải hồ sơ...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F7" }}>
        <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />

        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: getResponsiveSize(16),
            paddingVertical: getResponsiveSize(12),
            backgroundColor: "#F7F7F7",
          }}
        >
          <TouchableOpacity
            onPress={handleGoBack}
            style={{
              width: getResponsiveSize(40),
              height: getResponsiveSize(40),
              borderRadius: getResponsiveSize(20),
              backgroundColor: "#E5E5E5",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Ionicons
              name="chevron-back"
              size={getResponsiveSize(24)}
              color="#000000"
            />
          </TouchableOpacity>

          <Text
            style={{
              fontSize: getResponsiveSize(18),
              fontWeight: "600",
              color: "#000000",
            }}
          >
            Hồ sơ
          </Text>

          <View style={{ width: getResponsiveSize(40) }} />
        </View>

        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            paddingHorizontal: getResponsiveSize(20),
          }}
        >
          <Ionicons
            name="alert-circle-outline"
            size={getResponsiveSize(64)}
            color="#FF385C"
          />
          <Text
            style={{
              marginTop: getResponsiveSize(16),
              fontSize: getResponsiveSize(18),
              fontWeight: "600",
              color: "#FF385C",
            }}
          >
            Có lỗi xảy ra
          </Text>
          <Text
            style={{
              marginTop: getResponsiveSize(8),
              color: "#666666",
              textAlign: "center",
              fontSize: getResponsiveSize(14),
            }}
          >
            {error}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: getResponsiveSize(20),
              paddingHorizontal: getResponsiveSize(24),
              paddingVertical: getResponsiveSize(12),
              backgroundColor: "#FF385C",
              borderRadius: getResponsiveSize(8),
            }}
            onPress={handleGoBack}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: getResponsiveSize(16),
                fontWeight: "600",
              }}
            >
              Quay lại
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const avatarUrl = getUserAvatar(userProfile);
  const displayName = getUserDisplayName(userProfile);
  const userRole = getUserRole(userProfile);
  const initials = getUserInitials(userProfile);
  const userBio = getUserBio(userProfile);

  console.log("🔍 Final render - avatarUrl:", avatarUrl);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F7F7" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F7F7F7" />

      {/* Header - Same style as photographer */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: getResponsiveSize(16),
          paddingVertical: getResponsiveSize(12),
          backgroundColor: "#F7F7F7",
        }}
      >
        <TouchableOpacity
          onPress={handleGoBack}
          style={{
            width: getResponsiveSize(40),
            height: getResponsiveSize(40),
            borderRadius: getResponsiveSize(20),
            backgroundColor: "#E5E5E5",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons
            name="chevron-back"
            size={getResponsiveSize(24)}
            color="#000000"
          />
        </TouchableOpacity>

        <Text
          style={{
            fontSize: getResponsiveSize(18),
            fontWeight: "600",
            color: "#000000",
          }}
        >
          Hồ sơ
        </Text>

        {isOwnProfile && (
          <TouchableOpacity
            onPress={handleEditPress}
            style={{
              paddingHorizontal: getResponsiveSize(16),
              paddingVertical: getResponsiveSize(8),
              backgroundColor: "#FFFFFF",
              borderRadius: getResponsiveSize(20),
              borderWidth: 1,
              borderColor: "#E5E5E5",
            }}
          >
            <Text
              style={{
                fontSize: getResponsiveSize(14),
                fontWeight: "500",
                color: "#000000",
              }}
            >
              Chỉnh sửa
            </Text>
          </TouchableOpacity>
        )}

        {!isOwnProfile && <View style={{ width: getResponsiveSize(40) }} />}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        {/* Profile Avatar Section */}
        <View
          style={{
            alignItems: "center",
            paddingTop: getResponsiveSize(40),
            paddingBottom: getResponsiveSize(30),
            backgroundColor: "#FFFFFF",
            marginHorizontal: getResponsiveSize(16),
            marginTop: getResponsiveSize(16),
            borderRadius: getResponsiveSize(12),
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <View
            style={{
              width: getResponsiveSize(120),
              height: getResponsiveSize(120),
              borderRadius: getResponsiveSize(60),
              backgroundColor: "#333333",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: getResponsiveSize(20),
            }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{
                  width: getResponsiveSize(120),
                  height: getResponsiveSize(120),
                  borderRadius: getResponsiveSize(60),
                }}
                resizeMode="cover"
                onError={(e) => {
                  console.log("❌ Avatar load error:", e.nativeEvent.error);
                  console.log("❌ Failed URL:", avatarUrl);
                }}
                onLoad={() => {
                  console.log("✅ Avatar loaded successfully:", avatarUrl);
                }}
              />
            ) : (
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: getResponsiveSize(48),
                  fontWeight: "bold",
                }}
              >
                {initials}
              </Text>
            )}
          </View>

          <Text
            style={{
              fontSize: getResponsiveSize(28),
              fontWeight: "bold",
              color: "#000000",
              marginBottom: getResponsiveSize(8),
            }}
          >
            {displayName}
          </Text>

          <Text
            style={{
              fontSize: getResponsiveSize(16),
              color: "#666666",
            }}
          >
            {userRole}
          </Text>
        </View>

        {/* User Info Section */}
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <View
            style={{
              paddingHorizontal: getResponsiveSize(24),
              paddingTop: getResponsiveSize(40),
            }}
          >
            <View style={{ marginBottom: getResponsiveSize(30) }}>
              {/* Email */}
              {userProfile && "email" in userProfile && userProfile.email && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingVertical: getResponsiveSize(20),
                    borderBottomWidth: 1,
                    borderBottomColor: "#F0F0F0",
                  }}
                >
                  <View
                    style={{
                      width: getResponsiveSize(40),
                      height: getResponsiveSize(40),
                      borderRadius: getResponsiveSize(20),
                      backgroundColor: "#F5F5F5",
                      justifyContent: "center",
                      alignItems: "center",
                      marginRight: getResponsiveSize(16),
                    }}
                  >
                    <Ionicons
                      name="mail-outline"
                      size={getResponsiveSize(20)}
                      color="#666666"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: getResponsiveSize(16),
                        color: "#000000",
                        fontWeight: "500",
                      }}
                    >
                      Email: {userProfile.email}
                    </Text>
                  </View>
                </View>
              )}

              {/* Phone Number */}
              {userProfile &&
                "phoneNumber" in userProfile &&
                userProfile.phoneNumber && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: getResponsiveSize(20),
                      borderBottomWidth: 1,
                      borderBottomColor: "#F0F0F0",
                    }}
                  >
                    <View
                      style={{
                        width: getResponsiveSize(40),
                        height: getResponsiveSize(40),
                        borderRadius: getResponsiveSize(20),
                        backgroundColor: "#F5F5F5",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: getResponsiveSize(16),
                      }}
                    >
                      <Ionicons
                        name="call-outline"
                        size={getResponsiveSize(20)}
                        color="#666666"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: getResponsiveSize(16),
                          color: "#000000",
                          fontWeight: "500",
                        }}
                      >
                        Số điện thoại: {userProfile.phoneNumber}
                      </Text>
                    </View>
                  </View>
                )}

              {/* Bio */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: getResponsiveSize(20),
                  borderBottomWidth: 1,
                  borderBottomColor: "#F0F0F0",
                }}
              >
                <View
                  style={{
                    width: getResponsiveSize(40),
                    height: getResponsiveSize(40),
                    borderRadius: getResponsiveSize(20),
                    backgroundColor: "#F5F5F5",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: getResponsiveSize(16),
                    marginTop: getResponsiveSize(2),
                  }}
                >
                  <Ionicons
                    name="briefcase-outline"
                    size={getResponsiveSize(20)}
                    color="#666666"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: getResponsiveSize(16),
                      color: "#000000",
                      fontWeight: "500",
                      lineHeight: getResponsiveSize(22),
                    }}
                  >
                    Mô tả: {userBio}
                  </Text>
                </View>
              </View>
              {/* User Styles */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  paddingVertical: getResponsiveSize(20),
                }}
              >
                <View
                  style={{
                    width: getResponsiveSize(40),
                    height: getResponsiveSize(40),
                    borderRadius: getResponsiveSize(20),
                    backgroundColor: "#F5F5F5",
                    justifyContent: "center",
                    alignItems: "center",
                    marginRight: getResponsiveSize(16),
                    marginTop: getResponsiveSize(2),
                  }}
                >
                  <Ionicons
                    name="camera-outline"
                    size={getResponsiveSize(20)}
                    color="#666666"
                  />
                </View>
                <View style={{ flex: 1, marginTop: getResponsiveSize(10) }}>
                  <Text
                    style={{
                      fontSize: getResponsiveSize(16),
                      color: "#000000",
                      fontWeight: "500",
                      marginBottom: getResponsiveSize(12),
                    }}
                  >
                    Styles của bạn:
                  </Text>

                  {loadingStyles ? (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: getResponsiveSize(4),
                      }}
                    >
                      <ActivityIndicator size="small" color="#E91E63" />
                      <Text
                        style={{
                          marginLeft: getResponsiveSize(8),
                          fontSize: getResponsiveSize(14),
                          color: "#666666",
                        }}
                      >
                        Đang tải...
                      </Text>
                    </View>
                  ) : userStyles.length > 0 ? (
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: getResponsiveSize(8),
                        marginTop: getResponsiveSize(4),
                      }}
                    >
                      {userStyles.map((style, index) => (
                        <View
                          key={style.styleId}
                          style={{
                            backgroundColor: "#F0F8FF",
                            paddingHorizontal: getResponsiveSize(16),
                            paddingVertical: getResponsiveSize(8),
                            borderRadius: getResponsiveSize(20),
                            borderWidth: 1,
                            borderColor: "#E0F2FE",
                            shadowColor: "#000",
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.1,
                            shadowRadius: 2,
                            elevation: 1,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: getResponsiveSize(14),
                              color: "#0369A1",
                              fontWeight: "600",
                            }}
                          >
                            {style.styleName}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text
                      style={{
                        fontSize: getResponsiveSize(14),
                        color: "#999999",
                        fontStyle: "italic",
                        paddingVertical: getResponsiveSize(4),
                      }}
                    >
                      Chưa có sở thích nào
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default ViewProfileUserScreen;