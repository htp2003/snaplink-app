// components/Photographer/PhotographerModal.tsx
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
import * as Location from 'expo-location';

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
  const fetchRecommendedPhotographers = async () => {
    if (!location) return;
    
    setLoadingRecommend(true);
    setErrorRecommend(null);
    
    try {
      // Lấy vị trí hiện tại
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Quyền truy cập vị trí bị từ chối');
      }
  
      let currentLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = currentLocation.coords;
  
      console.log("Using location:", { latitude, longitude, locationId: location.locationId });
  
      const photographers = await photographerService.getRecommended(
        latitude,
        longitude,
        location.locationId,
        50, 
        20  
      );
      
      setRecommendedPhotographers(photographers || []);
    } catch (error) {
      console.error('Error:', error);
      setErrorRecommend('Không thể lấy vị trí hoặc tải danh sách photographer');
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
    
    return (
      <TouchableOpacity
        key={photographer.id || photographer.photographerId || index}
        onPress={() => {
          onPhotographerSelect(photographer);
          onClose();
        }}
        style={{
          backgroundColor: "#fff",
          borderRadius: getResponsiveSize(16),
          padding: getResponsiveSize(16),
          marginBottom: getResponsiveSize(12),
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? "#E91E63" : "#e0e0e0",
          elevation: isSelected ? 4 : 2,
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
              {isSelected && (
                <View
                  style={{
                    backgroundColor: "#E91E63",
                    borderRadius: getResponsiveSize(10),
                    paddingHorizontal: getResponsiveSize(8),
                    paddingVertical: getResponsiveSize(2),
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: getResponsiveSize(10),
                      fontWeight: "bold",
                    }}
                  >
                    ✓ Đã chọn
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
                color: "#E91E63",
                marginBottom: getResponsiveSize(4),
              }}
            >
              {formatPrice(photographer.hourlyRate)}/h
            </Text>

            {/* Rating */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather name="star" size={getResponsiveSize(14)} color="#FFD700" />
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
          </View>
        </View>

        {/* Styles */}
        {photographer.styles && photographer.styles.length > 0 && (
          <View style={{ 
            marginTop: getResponsiveSize(12), 
            paddingTop: getResponsiveSize(12), 
            borderTopWidth: 1, 
            borderTopColor: "#f0f0f0" 
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
                  }}
                >
                  <Text
                    style={{
                      fontSize: getResponsiveSize(11),
                      color: isSelected ? "#E91E63" : "#666",
                      fontWeight: isSelected ? "bold" : "normal",
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
          backgroundColor: "#fff3f3",
          borderRadius: getResponsiveSize(12),
          margin: getResponsiveSize(20),
        }}>
          <Feather name="alert-circle" size={getResponsiveSize(48)} color="#ff6b6b" />
          <Text style={{ 
            color: "#ff6b6b", 
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
            borderBottomColor: "#e0e0e0",
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
                backgroundColor: "#f5f5f5",
                borderRadius: getResponsiveSize(12),
                padding: getResponsiveSize(10),
              }}
            >
              <AntDesign
                name="close"
                size={getResponsiveSize(24)}
                color="#333"
              />
            </TouchableOpacity>

            <Text
              style={{
                fontSize: getResponsiveSize(18),
                fontWeight: "bold",
                color: "#333",
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
                backgroundColor: "#f0f9ff",
                borderRadius: getResponsiveSize(12),
                padding: getResponsiveSize(12),
              }}
            >
              <Feather name="map-pin" size={getResponsiveSize(16)} color="#0EA5E9" />
              <Text
                style={{
                  fontSize: getResponsiveSize(14),
                  color: "#333",
                  marginLeft: getResponsiveSize(8),
                  flex: 1,
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
            borderBottomColor: "#e0e0e0",
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
              }}
            >
              <Feather
                name={tab.icon as any}
                size={getResponsiveSize(20)}
                color={activeTab === tab.key ? "#E91E63" : "#999"}
              />
              <Text
                style={{
                  fontSize: getResponsiveSize(12),
                  color: activeTab === tab.key ? "#E91E63" : "#999",
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