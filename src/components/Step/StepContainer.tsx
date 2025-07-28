import StepIndicator from "react-native-step-indicator";
import { useState, useEffect } from "react";
import { View, Dimensions, StatusBar, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import Step1 from "./Step1";
import Step4 from "./Step4";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth, useCurrentUserId } from "../../hooks/useAuth";

const getBg = (role: string | null) => {
  if (role === "photographer") return require("../../../assets/slider2.png");
  if (role === "owner") return require("../../../assets/slider3.png");
  return null;
};

const StepContainer = () => {
  const [currentPosition, setCurrentPosition] = useState(0); // Always start at step 0 (role selection)
  const [maxStep, setMaxStep] = useState(0); // User can only proceed after completing previous steps
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>({});
  const { height } = Dimensions.get("window");
  const stepIndicatorMarginTop = height * 0.15;
  const navigation = useNavigation<RootStackNavigationProp>();
  const { user } = useAuth();
  const userId = useCurrentUserId();

  const bgSource = currentPosition === 0 ? null : getBg(selectedRole);

  // Check if user has existing data but always start from step 0
  useEffect(() => {
    if (user) {
      // If user already has roles, pre-populate but still start from step 0
      if (user.roles && user.roles.length > 0) {
        setSelectedRole(user.roles[0]);
        // Don't auto-advance - let user confirm or change their role
      }
    }
  }, [user]);

  const handleStepPress = (step: number) => {
    // Only allow navigation to completed steps or next step
    if (step <= maxStep) {
      setCurrentPosition(step);
    }
  };

  const handleRoleSelect = (roleData: { role: string; roleId: number }) => {
    const role = roleData.role;
    console.log("🎯 Role selected:", role);

    setSelectedRole(role);
    setUserData((prev: any) => ({ ...prev, role, roleId: roleData.roleId }));

    // After role selection, allow and navigate to style selection
    setMaxStep(1); // Now user can access step 1
    setCurrentPosition(1); // Move to step 1 (style selection)

    console.log("✅ Moving to step 1 (style selection)");
  };

  const handleStyleSelect = async (styleIds: number[]) => {
    try {
      if (!userId) {
        Alert.alert("Lỗi", "Không tìm thấy thông tin user");
        return;
      }

      console.log("🎨 Styles selected:", styleIds);

      // Save selected styles to userData
      setUserData((prev: any) => ({ ...prev, styleIds }));

      // Complete the onboarding flow
      await completeOnboarding(styleIds);
    } catch (error: any) {
      console.error("❌ Error completing onboarding:", error);
      Alert.alert(
        "Lỗi",
        error.message || "Có lỗi xảy ra khi hoàn tất thiết lập"
      );
    }
  };

  const completeOnboarding = async (styleIds?: number[]) => {
    try {
      // Save to AsyncStorage for backward compatibility
      if (selectedRole) {
        await AsyncStorage.setItem("userRole", selectedRole);
        console.log("💾 Saved role to AsyncStorage:", selectedRole);
      }

      if (styleIds && styleIds.length > 0) {
        await AsyncStorage.setItem("userStyleIds", JSON.stringify(styleIds));
        console.log("💾 Saved style IDs to AsyncStorage:", styleIds);
      }

      // Mark onboarding as completed
      await AsyncStorage.setItem("onboardingCompleted", "true");

      console.log("🚀 Navigating based on role:", selectedRole);

      // Navigate based on role - updated navigation names
      if (selectedRole === "user") {
        navigation.navigate("CustomerMain" as never);
      } else if (selectedRole === "photographer") {
        navigation.navigate("PhotographerMain" as never);
      } else if (selectedRole === "owner") {
        navigation.navigate("VenueOwnerMain" as never);
      } else {
        // Fallback - navigate to general dashboard
        navigation.navigate("CustomerMain" as never);
      }
    } catch (error) {
      console.error("❌ Error completing onboarding:", error);
      Alert.alert("Lỗi", "Có lỗi xảy ra khi hoàn tất thiết lập");
    }
  };

  return (
    <LinearGradient
      colors={["#fff", "#d1d5db", "#222"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ flex: 1 }}
    >
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <View style={{ flex: 1 }}>
        <View style={{ marginTop: stepIndicatorMarginTop }}>
          <StepIndicator
            customStyles={customStyles}
            currentPosition={currentPosition}
            stepCount={2}
            labels={["Vai trò", "Phong cách"]}
            onPress={handleStepPress}
          />
        </View>

        {/* Step 0: Role Selection */}
        {currentPosition === 0 && <Step1 onSelectRole={handleRoleSelect} />}

        {/* Step 1: Style Selection */}
        {currentPosition === 1 && selectedRole && (
          <Step4 selectedRole={selectedRole} onComplete={handleStyleSelect} />
        )}
      </View>
    </LinearGradient>
  );
};

const customStyles = {
  stepIndicatorSize: 36,
  currentStepIndicatorSize: 44,
  separatorStrokeWidth: 3,
  currentStepStrokeWidth: 4,
  stepStrokeCurrentColor: "#111",
  stepStrokeWidth: 3,
  stepStrokeFinishedColor: "#222",
  stepStrokeUnFinishedColor: "#bbb",
  separatorFinishedColor: "#222",
  separatorUnFinishedColor: "#eee",
  stepIndicatorFinishedColor: "#222",
  stepIndicatorUnFinishedColor: "#fff",
  stepIndicatorCurrentColor: "#111",
  stepIndicatorLabelFontSize: 16,
  currentStepIndicatorLabelFontSize: 18,
  stepIndicatorLabelCurrentColor: "#fff",
  stepIndicatorLabelFinishedColor: "#fff",
  stepIndicatorLabelUnFinishedColor: "#bbb",
  labelColor: "#888",
  labelSize: 14,
  currentStepLabelColor: "#111",
};

export default StepContainer;
