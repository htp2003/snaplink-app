import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Alert,
  Image,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { RootStackNavigationProp } from "../navigation/types";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width, height } = Dimensions.get("window");

interface RoleOption {
  key: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  navigationTarget: "CustomerMain" | "PhotographerMain" | "VenueOwnerMain";
  benefits: string[];
}

const ROLE_OPTIONS: Record<string, RoleOption> = {
  User: {
    key: "User",
    title: "Khách hàng",
    description:
      "Khám phá và đặt lịch chụp ảnh với các nhiếp ảnh gia chuyên nghiệp",
    icon: "person-circle",
    color: "#6366F1",
    navigationTarget: "CustomerMain",
    benefits: ["Tìm nhiếp ảnh gia", "Đặt lịch dễ dàng", "Đánh giá chất lượng"],
  },
  Photographer: {
    key: "Photographer",
    title: "Nhiếp ảnh gia",
    description: "Quản lý portfolio và nhận booking từ khách hàng yêu thích",
    icon: "camera",
    color: "#F59E0B",
    navigationTarget: "PhotographerMain",
    benefits: ["Hiển thị portfolio", "Quản lý booking", "Thu nhập ổn định"],
  },
  Owner: {
    key: "Owner",
    title: "Chủ địa điểm",
    description: "Quản lý và cho thuê không gian chụp ảnh độc đáo",
    icon: "business",
    color: "#10B981",
    navigationTarget: "VenueOwnerMain",
    benefits: ["Cho thuê địa điểm", "Tăng doanh thu", "Quản lý đặt chỗ"],
  },
};

const RoleSelectionScreen = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const navigation = useNavigation<RootStackNavigationProp>();

  // Get available roles for current user
  const availableRoles =
    user?.roles?.filter((role) => ROLE_OPTIONS[role]) || [];

  const handleRoleSelect = (roleKey: string) => {
    setSelectedRole(selectedRole === roleKey ? null : roleKey);
  };

  const handleContinue = async () => {
    if (!selectedRole) {
      Alert.alert("Lỗi", "Vui lòng chọn vai trò để tiếp tục");
      return;
    }

    setLoading(true);

    try {
      // Save selected role to AsyncStorage for session
      await AsyncStorage.setItem("selectedRole", selectedRole);

      // Navigate to appropriate stack
      const roleOption = ROLE_OPTIONS[selectedRole];
      navigation.reset({
        index: 0,
        routes: [{ name: roleOption.navigationTarget }],
      });
    } catch (error) {
      console.error("Error saving selected role:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi chọn vai trò");
    } finally {
      setLoading(false);
    }
  };

  const RoleCard = ({ role }: { role: RoleOption }) => {
    const isSelected = selectedRole === role.key;

    return (
      <TouchableOpacity
        style={[
          styles.cardContainer,
          isSelected && styles.selectedCard,
          { borderColor: isSelected ? role.color : "#E5E7EB" },
        ]}
        onPress={() => handleRoleSelect(role.key)}
        activeOpacity={0.85}
      >
        <View style={styles.cardContent}>
          {/* Selection Indicator */}
          {isSelected && (
            <View
              style={[styles.selectedBadge, { backgroundColor: role.color }]}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
            </View>
          )}

          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${role.color}15` },
            ]}
          >
            <Ionicons name={role.icon} size={32} color={role.color} />
          </View>

          {/* Content */}
          <View style={styles.textContent}>
            <Text style={styles.roleTitle}>{role.title}</Text>
            <Text style={styles.roleDescription}>{role.description}</Text>

            {/* Benefits */}
            <View style={styles.benefitsContainer}>
              {role.benefits.map((benefit, index) => (
                <View key={index} style={styles.benefitItem}>
                  <View
                    style={[
                      styles.benefitIcon,
                      { backgroundColor: role.color },
                    ]}
                  >
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!availableRoles.length) {
    return (
      <LinearGradient
        colors={["#FFFFFF", "#F9FAFB", "#F3F4F6"]}
        style={styles.container}
      >
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorTitle}>Không tìm thấy vai trò</Text>
          <Text style={styles.errorText}>
            Tài khoản của bạn chưa có vai trò hợp lệ. Vui lòng liên hệ hỗ trợ.
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <LinearGradient
        colors={["#FFFFFF", "#F9FAFB", "#F3F4F6"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <View style={styles.logoContainer}>
              <View style={styles.logoBackground}>
                <Image
                  source={require("../../assets/logo.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            </View>

            <View style={styles.titleContainer}>
              <Text style={styles.title}>Chọn vai trò của bạn</Text>
              <Text style={styles.subtitle}>
                Tài khoản của bạn có nhiều vai trò. Hãy chọn vai trò phù hợp để
                bắt đầu trải nghiệm SnapLink.
              </Text>
            </View>
          </View>

          {/* User Welcome Card */}
          <View style={styles.welcomeCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color="#111827" />
              </View>
            </View>
            <View style={styles.welcomeContent}>
              <Text style={styles.welcomeTitle}>Chào mừng trở lại!</Text>
              <Text style={styles.welcomeName}>
                {user?.fullName || user?.email}
              </Text>
              <Text style={styles.rolesText}>
                {availableRoles.length} vai trò khả dụng
              </Text>
            </View>
          </View>

          {/* Role Cards */}
          <View style={styles.cardsContainer}>
            {availableRoles.map((roleKey) => {
              const roleOption = ROLE_OPTIONS[roleKey];
              if (!roleOption) return null;

              return <RoleCard key={roleKey} role={roleOption} />;
            })}
          </View>

          {/* Continue Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.continueButton,
                (!selectedRole || loading) && styles.disabledButton,
              ]}
              onPress={handleContinue}
              disabled={!selectedRole || loading}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>
                {loading
                  ? "Đang chuyển hướng..."
                  : selectedRole
                  ? `Tiếp tục với ${ROLE_OPTIONS[selectedRole]?.title}`
                  : "Chọn vai trò để tiếp tục"}
              </Text>
            </TouchableOpacity>

            {selectedRole && (
              <Text style={styles.buttonHint}>
                Bạn có thể thay đổi vai trò bất cứ lúc nào trong phần cài đặt
              </Text>
            )}
          </View>

          {/* Professional Tip */}
          <View style={styles.tipContainer}>
            <View style={styles.tipHeader}>
              <Text style={styles.tipTitle}>Pro Tip</Text>
            </View>
            <Text style={styles.tipText}>
              Mỗi vai trò có{" "}
              <Text style={styles.tipHighlight}>giao diện riêng</Text> được tối
              ưu cho trải nghiệm tốt nhất
            </Text>
          </View>

          {/* Minimal Decorative Elements */}
          <View style={styles.decorativeContainer}>
            <View style={[styles.decorativeElement, styles.element1]} />
            <View style={[styles.decorativeElement, styles.element2]} />
            <View style={[styles.decorativeElement, styles.element3]} />
          </View>
        </ScrollView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoBackground: {
    width: 80,
    height: 80,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  logo: {
    width: 70,
    height: 70,
  },
  titleContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 16,
    fontWeight: "400",
  },
  welcomeCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginBottom: 32,
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeContent: {
    flex: 1,
    justifyContent: "center",
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  welcomeName: {
    fontSize: 16,
    color: "#111827",
    fontWeight: "500",
    marginBottom: 4,
  },
  rolesText: {
    fontSize: 14,
    color: "#6B7280",
  },
  cardsContainer: {
    marginBottom: 32,
  },
  cardContainer: {
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },
  selectedCard: {
    shadowOpacity: 0.15,
    elevation: 12,
    transform: [{ scale: 1.02 }],
  },
  cardContent: {
    padding: 24,
    position: "relative",
  },
  selectedBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  textContent: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  roleDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 16,
    fontWeight: "400",
  },
  benefitsContainer: {
    gap: 8,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  benefitIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  benefitText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  buttonContainer: {
    marginBottom: 24,
  },
  continueButton: {
    backgroundColor: "#111827",
    borderRadius: 8,
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 56,
  },
  disabledButton: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0.05,
    elevation: 1,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  buttonHint: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    fontStyle: "italic",
  },
  tipContainer: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#E5E7EB",
    marginBottom: 20,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: 0.2,
  },
  tipText: {
    color: "#6B7280",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400",
  },
  tipHighlight: {
    fontWeight: "700",
    color: "#111827",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "400",
  },
  decorativeContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  decorativeElement: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  element1: {
    width: 60,
    height: 60,
    borderRadius: 30,
    top: 120,
    right: 30,
    transform: [{ rotate: "15deg" }],
  },
  element2: {
    width: 40,
    height: 40,
    borderRadius: 8,
    bottom: 180,
    left: 20,
    transform: [{ rotate: "-12deg" }],
  },
  element3: {
    width: 80,
    height: 20,
    borderRadius: 10,
    top: 300,
    left: 40,
    transform: [{ rotate: "25deg" }],
  },
});

export default RoleSelectionScreen;
