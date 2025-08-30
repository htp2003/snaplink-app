// components/Photographer/PhotographerModal.tsx - Fixed to use service directly
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { AntDesign, Feather } from "@expo/vector-icons";
import { getResponsiveSize } from "../../utils/responsive";
import { photographerService } from "../../services/photographerService";

interface PhotographerModalProps {
  visible: boolean;
  onClose: () => void;
  onPhotographerSelect: (photographer: any) => void;
  selectedPhotographer?: any;
  location?: {
    locationId: number;
    name: string;
    latitude?: number;
    longitude?: number;
  };
  formatPrice: (price: number | undefined | null) => string;
}

type TabType = 'recommend' | 'userStyle' | 'popular';

const PhotographerModal: React.FC<PhotographerModalProps> = ({
  visible,
  onClose,
  onPhotographerSelect,
  selectedPhotographer,
  location,
  formatPrice,
}) => {
  // States for all tabs - use service directly instead of hooks
  const [activeTab, setActiveTab] = useState<TabType>('recommend');

  // Recommend tab
  const [recommendedPhotographers, setRecommendedPhotographers] = useState<any[]>([]);
  const [loadingRecommend, setLoadingRecommend] = useState(false);
  const [errorRecommend, setErrorRecommend] = useState<string | null>(null);

  // User Style tab
  const [userStylePhotographers, setUserStylePhotographers] = useState<any[]>([]);
  const [loadingUserStyle, setLoadingUserStyle] = useState(false);
  const [errorUserStyle, setErrorUserStyle] = useState<string | null>(null);

  // Popular tab
  const [popularPhotographers, setPopularPhotographers] = useState<any[]>([]);
  const [loadingPopular, setLoadingPopular] = useState(false);
  const [errorPopular, setErrorPopular] = useState<string | null>(null);

  const processApiResponse = (apiResponse: any): any[] => {
    if (Array.isArray(apiResponse)) return apiResponse;
    if (Array.isArray(apiResponse?.data)) return apiResponse.data;
    if (Array.isArray(apiResponse?.$values)) return apiResponse.$values;
    if (apiResponse) return [apiResponse];
    return [];
  };

  // Normalize photographer data function
  const normalizePhotographerData = (photographer: any) => {
    const photographerId = photographer.photographerId || photographer.id;
    if (!photographerId) {
      console.error("❌ No photographerId found in:", photographer);
      throw new Error("Missing photographerId");
    }

    // Fix: try multiple sources for userId
    const userId =
      photographer.userId ||
      photographer.user?.id ||
      photographer.user?.userId ||
      photographer.id; // fallback (nếu API không gửi userId riêng)

    if (!userId) {
      console.warn("⚠️ Missing userId - fallback to photographerId");
    }

    return {
      id: photographerId,
      photographerId,
      userId: userId || photographerId, // đảm bảo không bị null
      fullName: photographer.fullName || photographer.user?.fullName || "Unknown",
      profileImage:
        photographer.profileImage ||
        photographer.avatar ||
        photographer.user?.profileImage,
      hourlyRate: photographer.hourlyRate || 0,
      specialty: photographer.specialty || "Professional Photographer",
      yearsExperience: photographer.yearsExperience || 0,
      equipment: photographer.equipment,
      rating: photographer.rating || 0,
      availabilityStatus: photographer.availabilityStatus,
      verificationStatus: photographer.verificationStatus,
      styles: photographer.styles || [],
      distanceKm: photographer.distanceKm,
      _original: photographer,
    };
  };


  // Fetch recommended photographers
  const fetchRecommendedPhotographers = async () => {
    if (!location) return;

    setLoadingRecommend(true);
    setErrorRecommend(null);

    try {
      if (!location.latitude || !location.longitude) {
        throw new Error('Địa điểm không có thông tin tọa độ');
      }

      console.log("📍 Fetching recommended photographers for location:", {
        locationId: location.locationId,
        latitude: location.latitude,
        longitude: location.longitude
      });

      const photographers = await photographerService.getRecommended(
        location.latitude,
        location.longitude,
        location.locationId,
        50,
        20
      );

      const normalizedPhotographers = (photographers || []).map(normalizePhotographerData);
      setRecommendedPhotographers(normalizedPhotographers);

      console.log("✅ Normalized recommended photographers:", normalizedPhotographers);
    } catch (error) {
      console.error('Error fetching recommended:', error);
      setErrorRecommend('Không thể tải danh sách photographer gợi ý');
      setRecommendedPhotographers([]);
    } finally {
      setLoadingRecommend(false);
    }
  };

  // Fetch user style photographers - use service directly
  const fetchUserStylePhotographers = async () => {
    setLoadingUserStyle(true);
    setErrorUserStyle(null);
  
    try {
      console.log("🎨 Fetching user style photographers");
  
      const photographers = await photographerService.getByUserStyles(
        location?.latitude,
        location?.longitude
      );
  
      console.log("🎨 Raw user style response:", photographers);
  
      // ✅ unwrap về array
      const photographersArray = processApiResponse(photographers);
      const normalizedPhotographers = photographersArray.map(normalizePhotographerData);
      setUserStylePhotographers(normalizedPhotographers);
  
      console.log("✅ Normalized user style photographers:", normalizedPhotographers);
    } catch (error) {
      console.error('Error fetching user style photographers:', error);
      setErrorUserStyle('Không thể tải photographer theo style của bạn');
      setUserStylePhotographers([]);
    } finally {
      setLoadingUserStyle(false);
    }
  };
  

  // Fetch popular photographers - use service directly
  const fetchPopularPhotographers = async () => {
    setLoadingPopular(true);
    setErrorPopular(null);
  
    try {
      console.log("🔥 Fetching popular photographers");
  
      const photographers: any = await photographerService.getPopular(
        location?.latitude,
        location?.longitude,
        1,
        20
      );
  
      console.log("🔥 Raw popular response:", photographers);
  
      const photographersArray = processApiResponse(photographers);
      const normalizedPhotographers = photographersArray.map(normalizePhotographerData);
  
      setPopularPhotographers(normalizedPhotographers);
      console.log("✅ Normalized popular photographers:", normalizedPhotographers);
    } catch (error) {
      console.error("Error fetching popular photographers:", error);
      setErrorPopular("Không thể tải photographer phổ biến");
      setPopularPhotographers([]);
    } finally {
      setLoadingPopular(false);
    }
  };
  
  

  // Load data when tab changes
  useEffect(() => {
    if (!visible) return;

    console.log("🔄 Tab changed to:", activeTab);

    switch (activeTab) {
      case 'recommend':
        fetchRecommendedPhotographers();
        break;
      case 'userStyle':
        fetchUserStylePhotographers();
        break;
      case 'popular':
        fetchPopularPhotographers();
        break;
    }
  }, [activeTab, visible, location]);

  // Tab configuration
  const tabs = [
    {
      key: 'recommend' as TabType,
      title: 'Gợi ý',
      icon: 'star',
      data: recommendedPhotographers,
      loading: loadingRecommend,
      error: errorRecommend,
    },
    {
      key: 'userStyle' as TabType,
      title: 'Style của bạn',
      icon: 'heart',
      data: userStylePhotographers,
      loading: loadingUserStyle,
      error: errorUserStyle,
    },
    {
      key: 'popular' as TabType,
      title: 'Phổ biến',
      icon: 'trending-up',
      data: popularPhotographers,
      loading: loadingPopular,
      error: errorPopular,
    },
  ];

  const renderPhotographerCard = (photographer: any, index: number) => {
    const isSelected = selectedPhotographer?.id === photographer.id ||
      selectedPhotographer?.photographerId === photographer.photographerId;

    const isBookedHere = photographer.isbookedhere === true;

    // Debug log for each card
    console.log(`🎯 Rendering photographer card [${activeTab}] #${index}:`, {
      id: photographer.id,
      photographerId: photographer.photographerId,
      userId: photographer.userId,
      fullName: photographer.fullName,
      hasRequiredFields: !!(photographer.photographerId) && !!(photographer.userId),
      tab: activeTab
    });

    const cardBorderColor = isSelected ? "#E91E63" : "#e0e0e0";
    const cardBorderWidth = isSelected ? 2 : 1;
    const cardElevation = isSelected ? 4 : 2;

    return (
      <TouchableOpacity
        key={photographer.photographerId || photographer.id || index}
        onPress={() => {
          console.log("📸 SELECTING photographer from", activeTab, "tab:", {
            originalData: photographer,
            photographerId: photographer.photographerId,
            userId: photographer.userId,
            fullName: photographer.fullName,
            hasRequiredIDs: !!(photographer.photographerId && photographer.userId)
          });

          onPhotographerSelect(photographer);
          onClose();
        }}
        style={{
          backgroundColor: "#fff",
          borderRadius: getResponsiveSize(16),
          padding: getResponsiveSize(16),
          marginBottom: getResponsiveSize(12),
          borderWidth: cardBorderWidth,
          borderColor: cardBorderColor,
          elevation: cardElevation,
          shadowColor: isSelected ? "#E91E63" : "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isSelected ? 0.1 : 0.05,
          shadowRadius: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {/* Photographer Image */}
          <Image
            source={{
              uri: photographer.profileImage ||
                photographer.avatar ||
                photographer.user?.profileImage ||
                ''
            }}
            style={{
              width: getResponsiveSize(80),
              height: getResponsiveSize(80),
              borderRadius: getResponsiveSize(12),
              marginRight: getResponsiveSize(16),
              backgroundColor: '#f0f0f0',
              borderWidth: isSelected ? 2 : 0,
              borderColor: "#E91E63",
            }}
          />

          {/* Photographer Info */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Text
                style={{
                  fontSize: getResponsiveSize(16),
                  fontWeight: "bold",
                  color: isSelected ? "#E91E63" : "#333",
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {photographer.fullName || 'Unknown'}
              </Text>

              {isBookedHere && (
                <View
                  style={{
                    backgroundColor: "#fbbf24",
                    borderRadius: getResponsiveSize(10),
                    paddingHorizontal: getResponsiveSize(8),
                    paddingVertical: getResponsiveSize(2),
                  }}
                >
                  <Text
                    style={{
                      color: "#92400e",
                      fontSize: getResponsiveSize(10),
                      fontWeight: "bold",
                    }}
                  >
                    Đã được đặt ở đây
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={{
                fontSize: getResponsiveSize(14),
                color: "#666",
                marginBottom: getResponsiveSize(4),
              }}
            >
              {photographer.specialty || 'Professional Photographer'}
            </Text>

            <Text
              style={{
                fontSize: getResponsiveSize(16),
                fontWeight: "bold",
                color: isSelected ? "#E91E63" : "#e11d48",
                marginBottom: getResponsiveSize(4),
              }}
            >
              {formatPrice(photographer.hourlyRate)}/h
            </Text>

            {/* Rating & Experience */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
              <Feather name="star" size={getResponsiveSize(14)} color="#fbbf24" />
              <Text
                style={{
                  fontSize: getResponsiveSize(12),
                  color: "#666",
                  marginLeft: getResponsiveSize(4),
                }}
              >
                {photographer.rating || 4.8} • {photographer.yearsExperience || 5}+ năm
              </Text>
            </View>

            {/* Distance info */}
            {photographer.distanceKm && (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Feather name="map-pin" size={getResponsiveSize(12)} color="#6b7280" />
                <Text
                  style={{
                    fontSize: getResponsiveSize(11),
                    color: "#6b7280",
                    marginLeft: getResponsiveSize(4),
                  }}
                >
                  Cách địa điểm {photographer.distanceKm.toFixed(1)}km
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Styles */}
        {photographer.styles && photographer.styles.length > 0 && (
          <View style={{
            marginTop: getResponsiveSize(12),
            paddingTop: getResponsiveSize(12),
            borderTopWidth: 1,
            borderTopColor: isSelected ? "#FFF0F5" : "#f0f0f0"
          }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photographer.styles.map((style: string, styleIndex: number) => (
                <View
                  key={styleIndex}
                  style={{
                    backgroundColor: isSelected ? "#FFF0F5" : "#f8f9fa",
                    borderRadius: getResponsiveSize(12),
                    paddingHorizontal: getResponsiveSize(8),
                    paddingVertical: getResponsiveSize(4),
                    marginRight: getResponsiveSize(6),
                    borderWidth: isSelected ? 1 : 0,
                    borderColor: "#FFC0CB",
                  }}
                >
                  <Text
                    style={{
                      fontSize: getResponsiveSize(11),
                      color: isSelected ? "#E91E63" : "#666",
                      fontWeight: isSelected ? "600" : "normal",
                    }}
                  >
                    {style}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTabContent = () => {
    const currentTab = tabs.find(tab => tab.key === activeTab);

    if (!currentTab) return null;

    if (currentTab.loading) {
      return (
        <View style={{ padding: getResponsiveSize(40), alignItems: "center" }}>
          <ActivityIndicator size="large" color="#E91E63" />
          <Text style={{ color: "#666", marginTop: 10 }}>
            Đang tải photographer...
          </Text>
        </View>
      );
    }

    if (currentTab.error) {
      return (
        <View style={{
          padding: getResponsiveSize(40),
          alignItems: "center",
          backgroundColor: "#fef2f2",
          borderRadius: getResponsiveSize(12),
          margin: getResponsiveSize(20),
        }}>
          <Feather name="alert-circle" size={getResponsiveSize(48)} color="#ef4444" />
          <Text style={{
            color: "#dc2626",
            marginTop: 10,
            textAlign: 'center',
          }}>
            {currentTab.error}
          </Text>
          <TouchableOpacity
            onPress={() => {
              // Retry logic based on tab
              if (activeTab === 'recommend') fetchRecommendedPhotographers();
              else if (activeTab === 'userStyle') fetchUserStylePhotographers();
              else if (activeTab === 'popular') fetchPopularPhotographers();
            }}
            style={{
              backgroundColor: "#E91E63",
              paddingHorizontal: getResponsiveSize(20),
              paddingVertical: getResponsiveSize(10),
              borderRadius: getResponsiveSize(20),
              marginTop: getResponsiveSize(12),
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>
              Thử lại
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!currentTab.data || currentTab.data.length === 0) {
      return (
        <View
          style={{
            padding: getResponsiveSize(40),
            alignItems: "center",
            backgroundColor: "#f8f9fa",
            borderRadius: getResponsiveSize(16),
            margin: getResponsiveSize(20),
          }}
        >
          <Feather name="camera" size={getResponsiveSize(48)} color="#ccc" />
          <Text
            style={{
              fontSize: getResponsiveSize(16),
              color: "#666",
              marginTop: getResponsiveSize(12),
              textAlign: "center",
            }}
          >
            Không tìm thấy photographer nào
          </Text>
          <Text
            style={{
              fontSize: getResponsiveSize(14),
              color: "#999",
              marginTop: getResponsiveSize(8),
              textAlign: "center",
            }}
          >
            {activeTab === 'userStyle' ?
              'Hãy cập nhật style yêu thích trong hồ sơ' :
              'Thử lại sau hoặc chọn tab khác'
            }
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: getResponsiveSize(20) }}
        showsVerticalScrollIndicator={false}
      >
        {currentTab.data.map(renderPhotographerCard)}
      </ScrollView>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: "#fff",
            paddingTop: getResponsiveSize(50),
            paddingHorizontal: getResponsiveSize(20),
            paddingBottom: getResponsiveSize(20),
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
            elevation: 2,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: "#f3f4f6",
                borderRadius: getResponsiveSize(12),
                padding: getResponsiveSize(10),
              }}
            >
              <AntDesign
                name="close"
                size={getResponsiveSize(24)}
                color="#374151"
              />
            </TouchableOpacity>

            <Text
              style={{
                fontSize: getResponsiveSize(18),
                fontWeight: "bold",
                color: "#111827",
                textAlign: "center",
                flex: 1,
              }}
            >
              Chọn Photographer
            </Text>

            <View style={{ width: getResponsiveSize(44) }} />
          </View>

          {/* Location info */}
          {location && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: getResponsiveSize(15),
                backgroundColor: "#eff6ff",
                borderRadius: getResponsiveSize(12),
                padding: getResponsiveSize(12),
              }}
            >
              <Feather name="map-pin" size={getResponsiveSize(16)} color="#3b82f6" />
              <Text
                style={{
                  fontSize: getResponsiveSize(14),
                  color: "#1e40af",
                  marginLeft: getResponsiveSize(8),
                  flex: 1,
                  fontWeight: "500"
                }}
                numberOfLines={1}
              >
                {location.name}
              </Text>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#fff",
            borderBottomWidth: 1,
            borderBottomColor: "#e5e7eb",
          }}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                paddingVertical: getResponsiveSize(15),
                alignItems: "center",
                borderBottomWidth: activeTab === tab.key ? 2 : 0,
                borderBottomColor: "#E91E63",
                backgroundColor: activeTab === tab.key ? "#FFF0F5" : "transparent"
              }}
            >
              <Feather
                name={tab.icon as any}
                size={getResponsiveSize(20)}
                color={activeTab === tab.key ? "#E91E63" : "#6b7280"}
              />
              <Text
                style={{
                  fontSize: getResponsiveSize(12),
                  color: activeTab === tab.key ? "#E91E63" : "#6b7280",
                  fontWeight: activeTab === tab.key ? "bold" : "normal",
                  marginTop: getResponsiveSize(4),
                }}
              >
                {tab.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {renderTabContent()}
      </View>
    </Modal>
  );
};

export default PhotographerModal;