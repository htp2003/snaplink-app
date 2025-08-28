// components/Photographer/PhotographerModal.tsx - Updated UI
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
import { usePhotographers } from "../../hooks/usePhotographers";
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
  // States
  const [activeTab, setActiveTab] = useState<TabType>('recommend');
  const [recommendedPhotographers, setRecommendedPhotographers] = useState<any[]>([]);
  const [loadingRecommend, setLoadingRecommend] = useState(false);
  const [errorRecommend, setErrorRecommend] = useState<string | null>(null);

  // Use existing hooks for other tabs
  const {
    userStylePhotographers,
    userStyleLoading,
    userStyleError,
    fetchPhotographersByUserStyles,
    popularPhotographers,
    popularLoading,
    popularError,
    fetchPopularPhotographers,
  } = usePhotographers();

  // Fetch recommended photographers
// Thay thế function fetchRecommendedPhotographers
const fetchRecommendedPhotographers = async () => {
  if (!location) return;
  
  setLoadingRecommend(true);
  setErrorRecommend(null);
  
  try {
    let targetLatitude: number;
    let targetLongitude: number;
    
    if (location.latitude && location.longitude) {
      // Sử dụng tọa độ của location - đây là case chính
      targetLatitude = location.latitude;
      targetLongitude = location.longitude;
      console.log("Using location coordinates:", { latitude: targetLatitude, longitude: targetLongitude });
    } else {
      // Nếu location không có tọa độ thì báo lỗi thay vì fallback
      throw new Error('Địa điểm không có thông tin tọa độ');
    }

    const photographers = await photographerService.getRecommended(
      targetLatitude,
      targetLongitude,
      location.locationId,
      50, 
      20  
    );
    
    setRecommendedPhotographers(photographers || []);
  } catch (error) {
    console.error('Error:', error);
    setErrorRecommend('Không thể tải danh sách photographer gần địa điểm này');
    setRecommendedPhotographers([]);
  } finally {
    setLoadingRecommend(false);
  }
};

  // Load data when tab changes
  useEffect(() => {
    if (!visible) return;
    
    switch (activeTab) {
      case 'recommend':
        fetchRecommendedPhotographers();
        break;
      case 'userStyle':
        fetchPhotographersByUserStyles(location?.latitude, location?.longitude);
        break;
      case 'popular':
        fetchPopularPhotographers(location?.latitude, location?.longitude, 1, 20);
        break;
    }
  }, [activeTab, visible, location]);

  // Tab configuration
  const tabs = [
    {
      key: 'recommend' as TabType,
      title: 'Gợi ý',
      icon: 'star',
      data: Array.isArray(recommendedPhotographers) ? recommendedPhotographers : [],
      loading: loadingRecommend,
      error: errorRecommend,
    },
    {
      key: 'userStyle' as TabType,
      title: 'Style của bạn',
      icon: 'heart',
      data: Array.isArray(userStylePhotographers) ? userStylePhotographers : [],
      loading: userStyleLoading,
      error: userStyleError,
    },
    {
      key: 'popular' as TabType,
      title: 'Phổ biến',
      icon: 'trending-up',
      data: Array.isArray(popularPhotographers) ? popularPhotographers : [],
      loading: popularLoading,
      error: popularError,
    },
  ];

  const renderPhotographerCard = (photographer: any, index: number) => {
    const isSelected = selectedPhotographer?.id === photographer.id || 
                      selectedPhotographer?.photographerId === photographer.photographerId;
    
    // 🔧 NEW: Check isbookedhere status
    const isBookedHere = photographer.isbookedhere === true;
    
    // 🎨 Keep original colors (red/pink theme)
    const cardBorderColor = isSelected ? "#E91E63" : "#e0e0e0";
    const cardBorderWidth = isSelected ? 2 : 1;
    const cardElevation = isSelected ? 4 : 2;
    const cardBackgroundColor = "#fff";
    
    return (
      <TouchableOpacity
        key={photographer.id || photographer.photographerId || index}
        onPress={() => {
          onPhotographerSelect(photographer);
          onClose();
        }}
        style={{
          backgroundColor: cardBackgroundColor,
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
                {photographer.fullName || photographer.user?.fullName || 'Unknown'}
              </Text>
              
              {/* 🔧 FIXED: Only show badge when isbookedhere is true */}
              {isBookedHere && (
                <View
                  style={{
                    backgroundColor: "#fbbf24",  // Yellow-400
                    borderRadius: getResponsiveSize(10),
                    paddingHorizontal: getResponsiveSize(8),
                    paddingVertical: getResponsiveSize(2),
                  }}
                >
                  <Text
                    style={{
                      color: "#92400e",  // Yellow-800
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
            
            {/* 🔧 NEW: Distance info if available */}
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
          backgroundColor: "#fef2f2",  // Red-50
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
              else if (activeTab === 'userStyle') fetchPhotographersByUserStyles();
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