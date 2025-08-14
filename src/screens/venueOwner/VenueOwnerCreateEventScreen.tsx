// screens/venueOwner/VenueOwnerCreateEventScreen.tsx
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useVenueOwnerEvent } from "../../hooks/useVenueOwnerEvent";
import { useVenueOwnerLocation } from "../../hooks/useVenueOwnerLocation";
import { venueOwnerImageService } from "../../services/venueOwnerImageService.ts";
import { venueOwnerProfileService } from "../../services/venueOwnerProfileService";
import { CreateEventRequest } from "../../types/VenueOwnerEvent";
import { VenueLocation } from "../../types/venueLocation";

// Subscription related interfaces
interface PremiumSubscription {
  premiumSubscriptionId: number;
  userId: number;
  packageId: number;
  startDate: string;
  endDate: string;
  status: string;
  paymentId?: number;
  photographerId?: number;
  locationId: number;
  package: {
    packageId: number;
    name: string;
    description: string;
    price: number;
    durationDays: number;
    features: string;
    applicableTo: string;
  };
}

interface LocationWithSubscription extends VenueLocation {
  premiumSubscriptions?: PremiumSubscription[];
  hasActiveSubscription?: boolean;
  canCreateEvent?: boolean;
}

interface FormData {
  locationId: number | null;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  discountedPrice: string;
  originalPrice: string;
  maxPhotographers: string;
  maxBookingsPerSlot: string;
}

interface ImageItem {
  uri: string;
  id: string;
  isPrimary: boolean;
}

// Subscription utility functions
const hasActiveSubscription = (
  subscriptions?: PremiumSubscription[]
): boolean => {
  console.log(
    "🔍 [SUBSCRIPTION CHECK] Checking hasActiveSubscription with data:",
    {
      subscriptionsCount: subscriptions?.length || 0,
      subscriptions:
        subscriptions?.map((sub) => ({
          id: sub.premiumSubscriptionId,
          status: sub.status,
          endDate: sub.endDate,
          applicableTo: sub.package?.applicableTo,
          packageName: sub.package?.name,
          isExpired: new Date(sub.endDate) <= new Date(),
        })) || [],
    }
  );

  if (!subscriptions || subscriptions.length === 0) {
    console.log("❌ [SUBSCRIPTION CHECK] No subscriptions found");
    return false;
  }

  const activeSubscriptions = subscriptions.filter((subscription) => {
    const isActive = subscription.status === "Active";
    const isLocationSubscription =
      subscription.package?.applicableTo === "location";
    const isNotExpired = new Date(subscription.endDate) > new Date();

    console.log(
      `🔍 [SUBSCRIPTION CHECK] Subscription ${subscription.premiumSubscriptionId} analysis:`,
      {
        status: subscription.status,
        isActive,
        applicableTo: subscription.package?.applicableTo,
        isLocationSubscription,
        endDate: subscription.endDate,
        isNotExpired,
        currentTime: new Date().toISOString(),
        passesAllChecks: isActive && isLocationSubscription && isNotExpired,
      }
    );

    return isActive && isLocationSubscription && isNotExpired;
  });

  const hasActive = activeSubscriptions.length > 0;
  console.log(
    `📊 [SUBSCRIPTION CHECK] Final result: ${hasActive} (${activeSubscriptions.length}/${subscriptions.length} subscriptions are valid)`
  );

  return hasActive;
};

const getActiveSubscription = (
  subscriptions?: PremiumSubscription[]
): PremiumSubscription | null => {
  console.log("🔍 [GET ACTIVE SUB] Getting active subscription from:", {
    subscriptionsCount: subscriptions?.length || 0,
  });

  if (!subscriptions || subscriptions.length === 0) {
    console.log("❌ [GET ACTIVE SUB] No subscriptions provided");
    return null;
  }

  const activeSubscriptions = subscriptions.filter((subscription) => {
    const isActive = subscription.status === "Active";
    const isLocationSubscription =
      subscription.package?.applicableTo === "location";
    const isNotExpired = new Date(subscription.endDate) > new Date();

    return isActive && isLocationSubscription && isNotExpired;
  });

  if (activeSubscriptions.length === 0) {
    console.log("❌ [GET ACTIVE SUB] No active subscriptions found");
    return null;
  }

  // Return the subscription with the latest end date
  const selectedSubscription = activeSubscriptions.sort(
    (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime()
  )[0];

  console.log("✅ [GET ACTIVE SUB] Selected subscription:", {
    id: selectedSubscription.premiumSubscriptionId,
    packageName: selectedSubscription.package?.name,
    endDate: selectedSubscription.endDate,
    remainingDays: getSubscriptionRemainingDays(selectedSubscription.endDate),
  });

  return selectedSubscription;
};

const getSubscriptionRemainingDays = (endDate: string): number => {
  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
};

// Enhanced location service to get location with subscription details
const getLocationWithSubscriptionDetails = async (
  locationId: number
): Promise<LocationWithSubscription | null> => {
  try {
    console.log(
      `🔍 [LOCATION API] Getting location details for ID: ${locationId}`
    );

    const token = await AsyncStorage.getItem("token");
    if (!token) {
      console.log("❌ [LOCATION API] No token found");
      return null;
    }

    const apiUrl = `https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net/api/Location/GetLocationById?id=${locationId}`;
    console.log(`🌐 [LOCATION API] Making request to: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log(
      `📡 [LOCATION API] Response status: ${response.status} ${response.statusText}`
    );

    if (!response.ok) {
      console.error(`❌ [LOCATION API] HTTP error: ${response.status}`);
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log(
      `📦 [LOCATION API] Raw response for location ${locationId}:`,
      JSON.stringify(result, null, 2)
    );

    // FIXED: Check if response is direct data or wrapped in {error, data} format
    let location: LocationWithSubscription;

    if (result.error !== undefined && result.data) {
      // Wrapped format: {error: 0, data: {...}}
      console.log(
        `📋 [LOCATION API] Response format: WRAPPED (error: ${result.error})`
      );
      if (result.error === 0) {
        location = result.data as LocationWithSubscription;
      } else {
        console.log(
          `❌ [LOCATION API] API returned error: ${result.error}, message: ${result.message}`
        );
        return null;
      }
    } else if (result.locationId) {
      // Direct format: {...location data...}
      console.log(`📋 [LOCATION API] Response format: DIRECT`);
      location = result as LocationWithSubscription;
    } else {
      console.log(
        `⚠️ [LOCATION API] Invalid response format for location ${locationId}:`,
        {
          hasError: result.error !== undefined,
          hasData: !!result.data,
          hasLocationId: !!result.locationId,
          keys: Object.keys(result),
        }
      );
      return null;
    }

    console.log(`📋 [LOCATION API] Parsed location ${locationId} data:`, {
      locationId: location.locationId,
      name: location.name,
      premiumSubscriptionsCount: location.premiumSubscriptions?.length || 0,
      premiumSubscriptionsDetail:
        location.premiumSubscriptions?.map((sub) => ({
          id: sub.premiumSubscriptionId,
          status: sub.status,
          startDate: sub.startDate,
          endDate: sub.endDate,
          packageId: sub.packageId,
          packageName: sub.package?.name,
          applicableTo: sub.package?.applicableTo,
        })) || [],
    });

    // Check subscription status with detailed logging
    location.hasActiveSubscription = hasActiveSubscription(
      location.premiumSubscriptions
    );
    location.canCreateEvent = location.hasActiveSubscription;

    console.log(`✅ [LOCATION API] Location ${locationId} processed:`, {
      hasActiveSubscription: location.hasActiveSubscription,
      canCreateEvent: location.canCreateEvent,
    });

    return location;
  } catch (error) {
    console.error(
      `❌ [LOCATION API] Error getting location ${locationId} with subscription details:`,
      error
    );
    return null;
  }
};

const VenueOwnerCreateEventScreen = ({ navigation, route }: any) => {
  // Get locationId from navigation params if available
  const preselectedLocationId = route?.params?.locationId;

  // Hooks
  const { createEvent, loading: eventLoading } = useVenueOwnerEvent();
  const { getLocationsByOwnerId, loading: locationsLoading } =
    useVenueOwnerLocation();

  // Form state
  const [formData, setFormData] = useState<FormData>({
    locationId: preselectedLocationId || null,
    name: "",
    description: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    discountedPrice: "",
    originalPrice: "",
    maxPhotographers: "5",
    maxBookingsPerSlot: "3",
  });

  // UI state
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [isStartDatePickerVisible, setStartDatePickerVisibility] =
    useState(false);
  const [isEndDatePickerVisible, setEndDatePickerVisibility] = useState(false);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number | null>(
    null
  );
  const [uploading, setUploading] = useState(false);

  // Location state with subscription info
  const [userLocations, setUserLocations] = useState<
    LocationWithSubscription[]
  >([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper function to get current user ID from JWT
  const getCurrentUserId = async (): Promise<number | null> => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        console.log("ℹ️ No token found");
        return null;
      }

      const parts = token.split(".");
      if (parts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const payload = parts[1];
      const paddedPayload =
        payload + "=".repeat((4 - (payload.length % 4)) % 4);
      const decodedPayload = atob(paddedPayload);
      const payloadObj = JSON.parse(decodedPayload);

      const userIdStr =
        payloadObj[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
        ];
      const userId = parseInt(userIdStr, 10);

      console.log("✅ Current user ID from JWT:", userId);
      return userId;
    } catch (error) {
      console.error("❌ Error extracting user ID from JWT:", error);
      return null;
    }
  };

  // Load user locations with subscription details
  const loadUserLocationsWithSubscriptions = async () => {
    try {
      console.log(
        "🗃️ [CREATE EVENT] Starting to load user locations with subscription details..."
      );
      setLoadingSubscriptions(true);

      const currentUserId = await getCurrentUserId();
      if (!currentUserId) {
        console.error(
          "❌ [CREATE EVENT] Could not get current user ID from JWT"
        );
        Alert.alert("Lỗi", "Không thể xác thực người dùng");
        return;
      }

      console.log("👤 [CREATE EVENT] Current user ID:", currentUserId);

      const locationOwner =
        await venueOwnerProfileService.getLocationOwnerByUserId(currentUserId);

      if (!locationOwner) {
        console.log(
          "ℹ️ [CREATE EVENT] No LocationOwner record found for userId:",
          currentUserId
        );
        Alert.alert("Thông báo", "Bạn chưa đăng ký làm chủ địa điểm");
        return;
      }

      console.log("✅ [CREATE EVENT] LocationOwner found:", {
        locationOwnerId: locationOwner.locationOwnerId,
        userId: locationOwner.userId,
        businessName: locationOwner.businessName,
      });

      // Get basic locations first
      const basicLocations = await getLocationsByOwnerId(
        locationOwner.locationOwnerId
      );
      console.log(
        "📍 [CREATE EVENT] Basic locations loaded:",
        basicLocations.length
      );
      console.log(
        "📍 [CREATE EVENT] Basic locations detail:",
        basicLocations.map((loc) => ({
          id: loc.locationId,
          name: loc.name,
          address: loc.address?.substring(0, 30) + "...",
        }))
      );

      if (basicLocations.length === 0) {
        console.log(
          "⚠️ [CREATE EVENT] No basic locations found, showing alert"
        );
        Alert.alert(
          "Chưa có địa điểm",
          "Bạn chưa tạo địa điểm nào. Vui lòng tạo địa điểm trước khi tạo sự kiện.",
          [
            { text: "Huỷ", onPress: () => navigation.goBack() },
            {
              text: "Tạo địa điểm",
              onPress: () => {
                navigation.goBack();
                navigation.navigate("VenueOwnerCreateLocation");
              },
            },
          ]
        );
        return;
      }

      // Enhanced with subscription details
      const locationsWithSubscriptions: LocationWithSubscription[] = [];
      let totalActiveSubscriptions = 0;

      console.log(
        "🔍 [CREATE EVENT] Starting to check subscriptions for each location..."
      );

      for (const location of basicLocations) {
        try {
          console.log(
            `🔍 [CREATE EVENT] Checking subscription for location ${location.locationId}: "${location.name}"`
          );

          const locationWithSub = await getLocationWithSubscriptionDetails(
            location.locationId
          );

          if (locationWithSub) {
            console.log(
              `📋 [CREATE EVENT] Location ${location.locationId} subscription data:`,
              {
                premiumSubscriptionsCount:
                  locationWithSub.premiumSubscriptions?.length || 0,
                premiumSubscriptions:
                  locationWithSub.premiumSubscriptions?.map((sub) => ({
                    id: sub.premiumSubscriptionId,
                    status: sub.status,
                    endDate: sub.endDate,
                    packageName: sub.package.name,
                    applicableTo: sub.package.applicableTo,
                    isExpired: new Date(sub.endDate) <= new Date(),
                    daysRemaining: getSubscriptionRemainingDays(sub.endDate),
                  })) || [],
              }
            );

            const activeSubscription = getActiveSubscription(
              locationWithSub.premiumSubscriptions
            );
            const hasActive = hasActiveSubscription(
              locationWithSub.premiumSubscriptions
            );

            console.log(
              `📊 [CREATE EVENT] Location ${location.locationId} analysis:`,
              {
                hasActiveSubscription: hasActive,
                activeSubscription: activeSubscription
                  ? {
                      id: activeSubscription.premiumSubscriptionId,
                      packageName: activeSubscription.package.name,
                      status: activeSubscription.status,
                      endDate: activeSubscription.endDate,
                      remainingDays: getSubscriptionRemainingDays(
                        activeSubscription.endDate
                      ),
                      isLocationPackage:
                        activeSubscription.package.applicableTo === "location",
                    }
                  : null,
              }
            );

            if (hasActive) {
              totalActiveSubscriptions++;
              console.log(
                `✅ [CREATE EVENT] Location ${location.locationId} CAN create events!`
              );
            } else {
              console.log(
                `❌ [CREATE EVENT] Location ${location.locationId} CANNOT create events`
              );
            }

            const enhancedLocation: LocationWithSubscription = {
              ...locationWithSub,
              hasActiveSubscription: hasActive,
              canCreateEvent: hasActive,
            };

            locationsWithSubscriptions.push(enhancedLocation);
          } else {
            console.log(
              `⚠️ [CREATE EVENT] Could not get subscription details for location ${location.locationId}, treating as no subscription`
            );
            // Fallback to basic location without subscription
            const basicLocationWithSub: LocationWithSubscription = {
              ...location,
              hasActiveSubscription: false,
              canCreateEvent: false,
            };
            locationsWithSubscriptions.push(basicLocationWithSub);
          }
        } catch (error) {
          console.error(
            `❌ [CREATE EVENT] Error checking subscription for location ${location.locationId}:`,
            error
          );
          // Fallback to basic location without subscription
          const basicLocationWithSub: LocationWithSubscription = {
            ...location,
            hasActiveSubscription: false,
            canCreateEvent: false,
          };
          locationsWithSubscriptions.push(basicLocationWithSub);
        }
      }

      console.log(
        `📊 [CREATE EVENT] FINAL SUMMARY: ${totalActiveSubscriptions}/${locationsWithSubscriptions.length} locations can create events`
      );
      console.log(
        "📊 [CREATE EVENT] Locations with subscription status:",
        locationsWithSubscriptions.map((loc) => ({
          id: loc.locationId,
          name: loc.name,
          canCreateEvent: loc.canCreateEvent,
          hasActiveSubscription: loc.hasActiveSubscription,
        }))
      );

      setUserLocations(locationsWithSubscriptions);

      // Auto-select preselected location if it has subscription
      if (preselectedLocationId && locationsWithSubscriptions.length > 0) {
        console.log(
          `🎯 [CREATE EVENT] Processing preselected location ID: ${preselectedLocationId}`
        );
        const location = locationsWithSubscriptions.find(
          (l) => l.locationId === preselectedLocationId
        );
        if (location) {
          console.log(`🎯 [CREATE EVENT] Found preselected location:`, {
            id: location.locationId,
            name: location.name,
            canCreateEvent: location.canCreateEvent,
          });

          if (location.canCreateEvent) {
            setFormData((prev) => ({
              ...prev,
              locationId: preselectedLocationId,
            }));
            console.log(
              "✅ [CREATE EVENT] Pre-selected location with subscription:",
              location.name
            );
          } else {
            console.log(
              "⚠️ [CREATE EVENT] Pre-selected location has no active subscription:",
              location.name
            );
            Alert.alert(
              "Thông báo",
              `Địa điểm "${location.name}" không có gói đăng ký active. Vui lòng chọn địa điểm khác hoặc đăng ký gói subscription.`
            );
          }
        } else {
          console.log(
            "⚠️ [CREATE EVENT] Preselected location not found in loaded locations"
          );
        }
      }

      // DELAY the alert check to ensure state is updated
      setTimeout(() => {
        const locationsWithSubscription = locationsWithSubscriptions.filter(
          (loc) => loc.canCreateEvent
        );
        console.log(
          `⏰ [CREATE EVENT] DELAYED CHECK: ${locationsWithSubscription.length}/${locationsWithSubscriptions.length} locations can create events`
        );

        if (
          locationsWithSubscription.length === 0 &&
          locationsWithSubscriptions.length > 0
        ) {
          console.log(
            "🚨 [CREATE EVENT] No locations with subscription found, showing alert"
          );
          Alert.alert(
            "Cần đăng ký gói",
            "Không có địa điểm nào có gói đăng ký active để tạo sự kiện. Vui lòng đăng ký gói subscription trước.",
            [
              { text: "Huỷ", onPress: () => navigation.goBack() },
              {
                text: "Đăng ký gói",
                onPress: () => {
                  navigation.goBack();
                  // Navigate to subscription screen
                  navigation.navigate("VenueOwnerSubscription");
                },
              },
            ]
          );
        } else if (locationsWithSubscription.length > 0) {
          console.log(
            "✅ [CREATE EVENT] Found locations with subscription, user can proceed"
          );
        }
      }, 500);
    } catch (error) {
      console.error(
        "❌ [CREATE EVENT] Error loading user locations with subscriptions:",
        error
      );
      Alert.alert("Lỗi", "Không thể tải danh sách địa điểm");
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  useEffect(() => {
    loadUserLocationsWithSubscriptions();
  }, []);

  // Form validation with subscription check
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.locationId) {
      newErrors.locationId = "Vui lòng chọn địa điểm";
    } else {
      // Check if selected location has active subscription
      const selectedLocation = userLocations.find(
        (loc) => loc.locationId === formData.locationId
      );
      if (selectedLocation && !selectedLocation.canCreateEvent) {
        newErrors.locationId =
          "Địa điểm này không có gói đăng ký active để tạo sự kiện";
      }
    }

    if (!formData.name.trim()) {
      newErrors.name = "Vui lòng nhập tên sự kiện";
    } else if (formData.name.trim().length < 3) {
      newErrors.name = "Tên sự kiện phải có ít nhất 3 ký tự";
    } else if (formData.name.trim().length > 255) {
      newErrors.name = "Tên sự kiện không được quá 255 ký tự";
    }

    if (formData.description.trim().length > 1000) {
      newErrors.description = "Mô tả không được quá 1000 ký tự";
    }

    if (formData.startDate >= formData.endDate) {
      newErrors.endDate = "Thời gian kết thúc phải sau thời gian bắt đầu";
    }

    if (formData.startDate < new Date()) {
      newErrors.startDate = "Thời gian bắt đầu không thể trong quá khứ";
    }

    if (formData.discountedPrice) {
      const discountedPrice = parseFloat(formData.discountedPrice);
      if (isNaN(discountedPrice) || discountedPrice <= 0) {
        newErrors.discountedPrice = "Giá khuyến mãi phải là số dương";
      }
    }

    if (formData.originalPrice) {
      const originalPrice = parseFloat(formData.originalPrice);
      if (isNaN(originalPrice) || originalPrice <= 0) {
        newErrors.originalPrice = "Giá gốc phải là số dương";
      }

      if (formData.discountedPrice) {
        const discountedPrice = parseFloat(formData.discountedPrice);
        if (
          !isNaN(discountedPrice) &&
          !isNaN(originalPrice) &&
          discountedPrice >= originalPrice
        ) {
          newErrors.discountedPrice = "Giá khuyến mãi phải nhỏ hơn giá gốc";
        }
      }
    }

    const maxPhotographers = parseInt(formData.maxPhotographers);
    if (
      isNaN(maxPhotographers) ||
      maxPhotographers < 1 ||
      maxPhotographers > 100
    ) {
      newErrors.maxPhotographers = "Số nhiếp ảnh gia tối đa phải từ 1-100";
    }

    const maxBookingsPerSlot = parseInt(formData.maxBookingsPerSlot);
    if (
      isNaN(maxBookingsPerSlot) ||
      maxBookingsPerSlot < 1 ||
      maxBookingsPerSlot > 50
    ) {
      newErrors.maxBookingsPerSlot = "Số booking tối đa phải từ 1-50";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Image picker functions (unchanged)
  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Quyền truy cập",
        "Ứng dụng cần quyền truy cập thư viện ảnh để upload hình"
      );
      return false;
    }
    return true;
  };

  const pickImages = async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10 - images.length,
      });

      if (!result.canceled && result.assets) {
        const newImages: ImageItem[] = result.assets.map((asset, index) => ({
          uri: asset.uri,
          id: `${Date.now()}_${index}`,
          isPrimary: false,
        }));

        setImages((prev) => [...prev, ...newImages]);

        if (primaryImageIndex === null && newImages.length > 0) {
          setPrimaryImageIndex(images.length);
        }
      }
    } catch (error) {
      console.error("❌ Pick images error:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh");
    }
  };

  const takePhoto = async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newImage: ImageItem = {
          uri: result.assets[0].uri,
          id: `${Date.now()}`,
          isPrimary: false,
        };

        setImages((prev) => [...prev, newImage]);

        if (primaryImageIndex === null) {
          setPrimaryImageIndex(images.length);
        }
      }
    } catch (error) {
      console.error("❌ Take photo error:", error);
      Alert.alert("Lỗi", "Không thể chụp ảnh");
    }
  };

  const showImageOptions = () => {
    Alert.alert("Thêm ảnh", "Chọn cách thêm ảnh cho sự kiện", [
      { text: "Huỷ", style: "cancel" },
      { text: "Chọn từ thư viện", onPress: pickImages },
      { text: "Chụp ảnh", onPress: takePhoto },
    ]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));

    if (primaryImageIndex === index) {
      setPrimaryImageIndex(null);
    } else if (primaryImageIndex !== null && primaryImageIndex > index) {
      setPrimaryImageIndex(primaryImageIndex - 1);
    }
  };

  const setPrimaryImage = (index: number) => {
    setPrimaryImageIndex(index);
  };

  // Form handlers
  const updateFormData = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleLocationSelect = (location: LocationWithSubscription) => {
    if (!location.canCreateEvent) {
      Alert.alert(
        "Không thể chọn địa điểm",
        `Địa điểm "${location.name}" không có gói đăng ký active. Vui lòng đăng ký gói subscription trước.`,
        [
          { text: "OK", style: "cancel" },
          {
            text: "Đăng ký gói",
            onPress: () => {
              setShowLocationPicker(false);
              navigation.navigate("VenueOwnerSubscription");
            },
          },
        ]
      );
      return;
    }

    updateFormData("locationId", location.locationId);
    setShowLocationPicker(false);
  };

  // Date picker handlers (unchanged)
  const showStartDatePicker = () => {
    setStartDatePickerVisibility(true);
  };

  const hideStartDatePicker = () => {
    setStartDatePickerVisibility(false);
  };

  const handleStartDateConfirm = (date: Date) => {
    updateFormData("startDate", date);

    if (date >= formData.endDate) {
      const newEndDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      updateFormData("endDate", newEndDate);
    }

    hideStartDatePicker();
  };

  const showEndDatePicker = () => {
    setEndDatePickerVisibility(true);
  };

  const hideEndDatePicker = () => {
    setEndDatePickerVisibility(false);
  };

  const handleEndDateConfirm = (date: Date) => {
    updateFormData("endDate", date);
    hideEndDatePicker();
  };

  // Submit handlers (unchanged except for additional validation)
  const handleCreateEvent = async () => {
    try {
      if (!validateForm()) {
        Alert.alert("Lỗi", "Vui lòng kiểm tra lại thông tin");
        return;
      }

      setUploading(true);

      const eventData: CreateEventRequest = {
        locationId: formData.locationId!,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        startDate: formData.startDate.toISOString(),
        endDate: formData.endDate.toISOString(),
        discountedPrice: formData.discountedPrice
          ? parseFloat(formData.discountedPrice)
          : undefined,
        originalPrice: formData.originalPrice
          ? parseFloat(formData.originalPrice)
          : undefined,
        maxPhotographers: parseInt(formData.maxPhotographers),
        maxBookingsPerSlot: parseInt(formData.maxBookingsPerSlot),
      };

      console.log("🗃️ Creating event with data:", eventData);

      const createdEvent = await createEvent(eventData);
      if (!createdEvent) {
        throw new Error("Không thể tạo sự kiện");
      }

      console.log("✅ Event created:", createdEvent.eventId);

      if (images.length > 0) {
        console.log("📸 Uploading", images.length, "images...");

        const uploadPromises = images.map(async (image, index) => {
          try {
            const isPrimary = primaryImageIndex === index;
            const result = await venueOwnerImageService.uploadEventImage(
              createdEvent.eventId,
              image.uri,
              isPrimary,
              `Event ${createdEvent.name} - Image ${index + 1}`
            );
            console.log(`✅ Image ${index + 1} uploaded:`, result?.url);
            return result;
          } catch (error) {
            console.error(`❌ Failed to upload image ${index + 1}:`, error);
            return null;
          }
        });

        const uploadResults = await Promise.all(uploadPromises);
        const successCount = uploadResults.filter((r) => r !== null).length;

        console.log(`📸 Uploaded ${successCount}/${images.length} images`);

        if (successCount < images.length) {
          Alert.alert(
            "Thông báo",
            `Sự kiện đã được tạo thành công! Tuy nhiên chỉ upload được ${successCount}/${images.length} ảnh.`
          );
        }
      }

      Alert.alert("Thành công", "Sự kiện đã được tạo thành công!", [
        {
          text: "OK",
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } catch (error) {
      console.error("❌ Create event error:", error);
      Alert.alert(
        "Lỗi",
        error instanceof Error ? error.message : "Không thể tạo sự kiện"
      );
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Huỷ tạo sự kiện",
      "Bạn có chắc chắn muốn huỷ? Tất cả thông tin đã nhập sẽ bị mất.",
      [
        { text: "Tiếp tục chỉnh sửa", style: "cancel" },
        {
          text: "Huỷ",
          style: "destructive",
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  // Get selected location name with subscription info
  const getSelectedLocationName = () => {
    if (!formData.locationId) return "Chọn địa điểm";
    const location = userLocations.find(
      (l) => l.locationId === formData.locationId
    );
    return location?.name || "Địa điểm không xác định";
  };

  const getSelectedLocationInfo = () => {
    if (!formData.locationId) return null;
    const location = userLocations.find(
      (l) => l.locationId === formData.locationId
    );
    return location;
  };

  // Format date for display
  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isLoading =
    eventLoading || uploading || locationsLoading || loadingSubscriptions;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={handleCancel}
            className="flex-row items-center"
          >
            <Ionicons name="arrow-back" size={24} color="#374151" />
            <Text className="ml-2 text-lg font-medium text-gray-900">
              Tạo sự kiện
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCreateEvent}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg ${
              isLoading ? "bg-gray-300" : "bg-blue-500"
            }`}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold">Tạo</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 py-6">
        {/* Basic Information */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Thông tin cơ bản
          </Text>

          {/* Location Selection with Subscription Info */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Địa điểm *
            </Text>
            <TouchableOpacity
              onPress={() => setShowLocationPicker(true)}
              disabled={isLoading}
              className={`border rounded-lg p-3 flex-row items-center justify-between ${
                errors.locationId ? "border-red-300" : "border-gray-300"
              } ${isLoading ? "opacity-50" : ""}`}
            >
              <View className="flex-row items-center flex-1">
                {isLoading ? (
                  <ActivityIndicator size="small" color="#6B7280" />
                ) : (
                  <Ionicons
                    name="location-outline"
                    size={20}
                    color={formData.locationId ? "#374151" : "#9CA3AF"}
                  />
                )}
                <Text
                  className={`ml-2 ${
                    formData.locationId ? "text-gray-900" : "text-gray-500"
                  }`}
                  numberOfLines={1}
                >
                  {isLoading ? "Đang tải..." : getSelectedLocationName()}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={20} color="#6B7280" />
            </TouchableOpacity>
            {errors.locationId && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.locationId}
              </Text>
            )}

            {/* Show subscription info for selected location */}
            {formData.locationId &&
              (() => {
                const selectedLocation = getSelectedLocationInfo();
                if (!selectedLocation) return null;

                const activeSubscription = getActiveSubscription(
                  selectedLocation.premiumSubscriptions
                );

                return (
                  <View className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <View className="flex-row items-center mb-2">
                      <Ionicons
                        name="checkmark-circle"
                        size={16}
                        color="#3B82F6"
                      />
                      <Text className="ml-2 text-sm font-medium text-blue-800">
                        Địa điểm có gói đăng ký active
                      </Text>
                    </View>
                    {activeSubscription && (
                      <View className="space-y-1">
                        <Text className="text-xs text-blue-600">
                          Gói: {activeSubscription.package.name}
                        </Text>
                        <Text className="text-xs text-blue-600">
                          Còn lại:{" "}
                          {getSubscriptionRemainingDays(
                            activeSubscription.endDate
                          )}{" "}
                          ngày
                        </Text>
                        <Text className="text-xs text-blue-600">
                          Hết hạn:{" "}
                          {new Date(
                            activeSubscription.endDate
                          ).toLocaleDateString("vi-VN")}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()}
          </View>

          {/* Event Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Tên sự kiện *
            </Text>
            <TextInput
              value={formData.name}
              onChangeText={(text) => updateFormData("name", text)}
              placeholder="Nhập tên sự kiện..."
              className={`border rounded-lg p-3 text-gray-900 ${
                errors.name ? "border-red-300" : "border-gray-300"
              }`}
              maxLength={255}
            />
            {errors.name && (
              <Text className="text-red-500 text-sm mt-1">{errors.name}</Text>
            )}
            <Text className="text-gray-500 text-xs mt-1">
              {formData.name.length}/255 ký tự
            </Text>
          </View>

          {/* Description */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Mô tả sự kiện
            </Text>
            <TextInput
              value={formData.description}
              onChangeText={(text) => updateFormData("description", text)}
              placeholder="Mô tả chi tiết về sự kiện..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className={`border rounded-lg p-3 text-gray-900 ${
                errors.description ? "border-red-300" : "border-gray-300"
              }`}
              maxLength={1000}
            />
            {errors.description && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.description}
              </Text>
            )}
            <Text className="text-gray-500 text-xs mt-1">
              {formData.description.length}/1000 ký tự
            </Text>
          </View>
        </View>

        {/* Date & Time */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Thời gian
          </Text>

          {/* Start Date */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Ngày bắt đầu *
            </Text>
            <TouchableOpacity
              onPress={showStartDatePicker}
              className={`border rounded-lg p-3 flex-row items-center ${
                errors.startDate ? "border-red-300" : "border-gray-300"
              }`}
            >
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text className="ml-2 text-gray-900">
                {formatDateTime(formData.startDate)}
              </Text>
            </TouchableOpacity>
            {errors.startDate && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.startDate}
              </Text>
            )}
          </View>

          {/* End Date */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Ngày kết thúc *
            </Text>
            <TouchableOpacity
              onPress={showEndDatePicker}
              className={`border rounded-lg p-3 flex-row items-center ${
                errors.endDate ? "border-red-300" : "border-gray-300"
              }`}
            >
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text className="ml-2 text-gray-900">
                {formatDateTime(formData.endDate)}
              </Text>
            </TouchableOpacity>
            {errors.endDate && (
              <Text className="text-red-500 text-sm mt-1">
                {errors.endDate}
              </Text>
            )}
          </View>
        </View>

        {/* Pricing */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Giá cả
          </Text>

          <View className="flex-row space-x-3">
            {/* Original Price */}
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Giá gốc (VNĐ)
              </Text>
              <TextInput
                value={formData.originalPrice}
                onChangeText={(text) => updateFormData("originalPrice", text)}
                placeholder="0"
                keyboardType="numeric"
                className={`border rounded-lg p-3 text-gray-900 ${
                  errors.originalPrice ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.originalPrice && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.originalPrice}
                </Text>
              )}
            </View>

            {/* Discounted Price */}
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Giá khuyến mãi (VNĐ)
              </Text>
              <TextInput
                value={formData.discountedPrice}
                onChangeText={(text) => updateFormData("discountedPrice", text)}
                placeholder="0"
                keyboardType="numeric"
                className={`border rounded-lg p-3 text-gray-900 ${
                  errors.discountedPrice ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.discountedPrice && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.discountedPrice}
                </Text>
              )}
            </View>
          </View>

          <Text className="text-gray-500 text-xs mt-2">
            💡 Để trống nếu không có khuyến mãi
          </Text>
        </View>

        {/* Capacity */}
        <View className="bg-white rounded-lg p-4 mb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Sức chứa
          </Text>

          <View className="flex-row space-x-3">
            {/* Max Photographers */}
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Số nhiếp ảnh gia tối đa *
              </Text>
              <TextInput
                value={formData.maxPhotographers}
                onChangeText={(text) =>
                  updateFormData("maxPhotographers", text)
                }
                placeholder="5"
                keyboardType="numeric"
                className={`border rounded-lg p-3 text-gray-900 ${
                  errors.maxPhotographers ? "border-red-300" : "border-gray-300"
                }`}
              />
              {errors.maxPhotographers && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.maxPhotographers}
                </Text>
              )}
            </View>

            {/* Max Bookings Per Slot */}
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Booking tối đa/slot *
              </Text>
              <TextInput
                value={formData.maxBookingsPerSlot}
                onChangeText={(text) =>
                  updateFormData("maxBookingsPerSlot", text)
                }
                placeholder="3"
                keyboardType="numeric"
                className={`border rounded-lg p-3 text-gray-900 ${
                  errors.maxBookingsPerSlot
                    ? "border-red-300"
                    : "border-gray-300"
                }`}
              />
              {errors.maxBookingsPerSlot && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.maxBookingsPerSlot}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Images */}
        <View className="bg-white rounded-lg p-4 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-900">
              Hình ảnh sự kiện
            </Text>
            <TouchableOpacity
              onPress={showImageOptions}
              disabled={images.length >= 10}
              className={`px-3 py-2 rounded-lg ${
                images.length >= 10 ? "bg-gray-300" : "bg-blue-500"
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  images.length >= 10 ? "text-gray-500" : "text-white"
                }`}
              >
                Thêm ảnh
              </Text>
            </TouchableOpacity>
          </View>

          {images.length > 0 ? (
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row space-x-3">
                  {images.map((image, index) => (
                    <View key={image.id} className="relative">
                      <Image
                        source={{ uri: image.uri }}
                        className="w-24 h-24 rounded-lg"
                        resizeMode="cover"
                      />

                      {/* Primary Badge */}
                      {primaryImageIndex === index && (
                        <View className="absolute top-1 left-1 bg-blue-500 px-2 py-1 rounded">
                          <Text className="text-white text-xs font-bold">
                            Chính
                          </Text>
                        </View>
                      )}

                      {/* Remove Button */}
                      <TouchableOpacity
                        onPress={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 w-6 h-6 rounded-full items-center justify-center"
                      >
                        <Ionicons name="close" size={14} color="white" />
                      </TouchableOpacity>

                      {/* Set Primary Button */}
                      {primaryImageIndex !== index && (
                        <TouchableOpacity
                          onPress={() => setPrimaryImage(index)}
                          className="absolute bottom-1 right-1 bg-gray-800 bg-opacity-70 px-2 py-1 rounded"
                        >
                          <Text className="text-white text-xs">Đặt chính</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>

              <Text className="text-gray-500 text-xs mt-2">
                {images.length}/10 ảnh • Chạm "Đặt chính" để chọn ảnh đại diện
              </Text>
            </View>
          ) : (
            <View className="border-2 border-dashed border-gray-300 rounded-lg p-8 items-center">
              <View className="bg-gray-100 p-4 rounded-full mb-3">
                <Ionicons name="images-outline" size={32} color="#6B7280" />
              </View>
              <Text className="text-gray-600 font-medium mb-1">
                Chưa có ảnh nào
              </Text>
              <Text className="text-gray-500 text-sm text-center">
                Thêm ảnh để sự kiện trở nên hấp dẫn hơn
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Location Picker Modal with Subscription Status */}
      <Modal
        visible={showLocationPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowLocationPicker(false)}
        >
          <Pressable className="bg-white rounded-t-3xl p-6 max-h-96">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-semibold text-gray-900">
                Chọn địa điểm
              </Text>
              <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View className="items-center py-8">
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text className="text-gray-500 mt-2">Đang tải địa điểm...</Text>
              </View>
            ) : userLocations && userLocations.length > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                {userLocations.map((location) => {
                  const isSelected =
                    formData.locationId === location.locationId;
                  const canCreateEvent = location.canCreateEvent;
                  const activeSubscription = getActiveSubscription(
                    location.premiumSubscriptions
                  );

                  return (
                    <TouchableOpacity
                      key={location.locationId}
                      className={`p-4 rounded-lg mb-2 ${
                        isSelected
                          ? "bg-blue-50 border border-blue-200"
                          : canCreateEvent
                          ? "bg-gray-50 border border-gray-200"
                          : "bg-red-50 border border-red-200"
                      } ${!canCreateEvent ? "opacity-70" : ""}`}
                      onPress={() => handleLocationSelect(location)}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center flex-1">
                          <Ionicons
                            name="location-outline"
                            size={20}
                            color={
                              isSelected
                                ? "#3B82F6"
                                : canCreateEvent
                                ? "#6B7280"
                                : "#EF4444"
                            }
                          />
                          <View className="ml-3 flex-1">
                            <View className="flex-row items-center">
                              <Text
                                className={`font-medium ${
                                  isSelected
                                    ? "text-blue-600"
                                    : canCreateEvent
                                    ? "text-gray-700"
                                    : "text-red-600"
                                }`}
                                numberOfLines={1}
                              >
                                {location.name}
                              </Text>
                              {canCreateEvent && (
                                <View className="ml-2 bg-green-100 px-2 py-1 rounded-full">
                                  <Text className="text-green-800 text-xs font-bold">
                                    ACTIVE
                                  </Text>
                                </View>
                              )}
                              {!canCreateEvent && (
                                <View className="ml-2 bg-red-100 px-2 py-1 rounded-full">
                                  <Text className="text-red-800 text-xs font-bold">
                                    NO SUB
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text
                              className="text-sm text-gray-500"
                              numberOfLines={1}
                            >
                              {location.address}
                            </Text>

                            {/* Subscription status */}
                            {canCreateEvent && activeSubscription && (
                              <View className="mt-1">
                                <Text className="text-xs text-green-600">
                                  Gói: {activeSubscription.package.name} • Còn{" "}
                                  {getSubscriptionRemainingDays(
                                    activeSubscription.endDate
                                  )}{" "}
                                  ngày
                                </Text>
                              </View>
                            )}

                            {!canCreateEvent && (
                              <View className="mt-1">
                                <Text className="text-xs text-red-600">
                                  Cần đăng ký gói để tạo sự kiện
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View className="flex-row items-center ml-2">
                          {isSelected && (
                            <Ionicons
                              name="checkmark"
                              size={20}
                              color="#3B82F6"
                            />
                          )}
                          {!canCreateEvent && (
                            <Ionicons
                              name="lock-closed"
                              size={16}
                              color="#EF4444"
                            />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Add subscription call-to-action */}
                {userLocations.filter((loc) => loc.canCreateEvent).length ===
                  0 && (
                  <View className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <View className="flex-row items-center mb-2">
                      <Ionicons name="warning" size={20} color="#F59E0B" />
                      <Text className="ml-2 text-yellow-800 font-medium">
                        Cần đăng ký gói subscription
                      </Text>
                    </View>
                    <Text className="text-yellow-700 text-sm mb-3">
                      Không có địa điểm nào có gói active để tạo sự kiện. Vui
                      lòng đăng ký gói subscription trước.
                    </Text>
                    <TouchableOpacity
                      className="bg-yellow-500 px-4 py-2 rounded-lg"
                      onPress={() => {
                        setShowLocationPicker(false);
                        navigation.navigate("VenueOwnerSubscription");
                      }}
                    >
                      <Text className="text-white font-semibold text-center">
                        Đăng ký gói ngay
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View className="items-center py-8">
                <View className="bg-gray-100 p-4 rounded-full mb-3">
                  <Ionicons name="location-outline" size={32} color="#6B7280" />
                </View>
                <Text className="text-gray-600 font-medium mb-1">
                  Chưa có địa điểm
                </Text>
                <Text className="text-gray-500 text-sm text-center">
                  Vui lòng tạo địa điểm trước khi tạo sự kiện
                </Text>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Date Time Pickers */}
      <DateTimePickerModal
        isVisible={isStartDatePickerVisible}
        mode="datetime"
        onConfirm={handleStartDateConfirm}
        onCancel={hideStartDatePicker}
        minimumDate={new Date()}
        date={formData.startDate}
        locale="vi_VN"
        confirmTextIOS="Xác nhận"
        cancelTextIOS="Huỷ"
      />

      <DateTimePickerModal
        isVisible={isEndDatePickerVisible}
        mode="datetime"
        onConfirm={handleEndDateConfirm}
        onCancel={hideEndDatePicker}
        minimumDate={formData.startDate}
        date={formData.endDate}
        locale="vi_VN"
        confirmTextIOS="Xác nhận"
        cancelTextIOS="Huỷ"
      />
    </SafeAreaView>
  );
};

export default VenueOwnerCreateEventScreen;
