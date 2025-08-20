// components/LocationModal.tsx - System Only (Simplified)
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { AntDesign, Feather } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';

interface LocationModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: any) => void;
  selectedLocation: any;
  locations: any[];
  locationsLoading: boolean;
  formatPrice: (price: number) => string;
}

export default function LocationModal({
  visible,
  onClose,
  onLocationSelect,
  selectedLocation,
  locations = [],
  locationsLoading = false,
  formatPrice,
}: LocationModalProps) {

  // Ultra safe string function
  const safeString = useCallback((value: any, fallback: string = ''): string => {
    try {
      if (value === null || value === undefined) {
        return fallback;
      }
      if (typeof value === 'string') {
        return value;
      }
      if (typeof value === 'number') {
        return value.toString();
      }
      return String(value);
    } catch (error) {
      console.error('🛠 safeString error:', error, 'value:', value);
      return fallback;
    }
  }, []);

  // Ultra safe format price
  const safeFormatPrice = useCallback((price: any): string => {
    try {
      if (!price || typeof price !== 'number' || isNaN(price)) {
        return 'Liên hệ';
      }
      
      if (typeof formatPrice !== 'function') {
        console.error('🛠 formatPrice is not a function:', typeof formatPrice);
        return 'Liên hệ';
      }
      
      const result = formatPrice(price);
      return safeString(result, 'Liên hệ');
    } catch (error) {
      console.error('🛠 safeFormatPrice error:', error);
      return 'Liên hệ';
    }
  }, [formatPrice, safeString]);

  // Memoized safe locations
  const safeLocations = useMemo(() => {
    console.log('🛠 Processing safeLocations, input:', locations);
    
    if (!Array.isArray(locations)) {
      return [];
    }
    
    const filtered = locations.filter((loc, idx) => {
      const isValid = loc && (loc.id || loc.locationId) && loc.name;
      return isValid;
    });
    
    console.log('🛠 safeLocations result:', filtered.length, 'valid locations');
    return filtered;
  }, [locations]);

  // Safe location selection handler
  const handleLocationSelect = useCallback((location: any) => {
    console.log('🛠 handleLocationSelect called with:', location);
    if (!location) {
      return;
    }
    try {
      onLocationSelect(location);
    } catch (error) {
      console.error('🛠 handleLocationSelect error:', error);
    }
  }, [onLocationSelect]);

  // Simple render location image - use images already in location data
  const renderLocationImage = useCallback((location: any) => {
    // Check if location has images in its data
    const images = location?.images;
    
    if (!images || !Array.isArray(images) || images.length === 0) {
      // No images available - show placeholder
      return (
        <View style={{
          width: getResponsiveSize(70),
          height: getResponsiveSize(50),
          backgroundColor: '#f8f9fa',
          borderRadius: getResponsiveSize(8),
          marginRight: getResponsiveSize(12),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Feather name="image" size={getResponsiveSize(16)} color="#ccc" />
        </View>
      );
    }

    // Get first image
    const firstImage = images[0];
    if (!firstImage) {
      return (
        <View style={{
          width: getResponsiveSize(70),
          height: getResponsiveSize(50),
          backgroundColor: '#f8f9fa',
          borderRadius: getResponsiveSize(8),
          marginRight: getResponsiveSize(12),
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Feather name="image" size={getResponsiveSize(16)} color="#ccc" />
        </View>
      );
    }

    // Determine image source
    const imageSource = typeof firstImage === 'string' 
      ? { uri: firstImage } 
      : { uri: firstImage.url || firstImage.uri || firstImage };

    return (
      <View style={{
        width: getResponsiveSize(70),
        height: getResponsiveSize(50),
        marginRight: getResponsiveSize(12),
        position: 'relative',
      }}>
        <Image
          source={imageSource}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: getResponsiveSize(8),
          }}
          resizeMode="cover"
          onError={(error) => {
            console.log('❌ Image load error for location:', location?.id || location?.locationId, error.nativeEvent.error);
          }}
          onLoad={() => {
            console.log('✅ Image loaded successfully for location:', location?.id || location?.locationId);
          }}
        />
        
        {/* Multiple images indicator */}
        {images.length > 1 && (
          <View style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            backgroundColor: 'rgba(0,0,0,0.7)',
            borderRadius: getResponsiveSize(8),
            paddingHorizontal: getResponsiveSize(4),
            paddingVertical: getResponsiveSize(1),
          }}>
            <Text style={{
              color: '#fff',
              fontSize: getResponsiveSize(8),
              fontWeight: 'bold',
            }}>
              +{images.length - 1}
            </Text>
          </View>
        )}
      </View>
    );
  }, []);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: getResponsiveSize(20),
            borderTopRightRadius: getResponsiveSize(20),
            paddingTop: getResponsiveSize(20),
            paddingHorizontal: getResponsiveSize(20),
            paddingBottom: getResponsiveSize(40),
            maxHeight: "80%",
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: getResponsiveSize(20),
            }}
          >
            <Text
              style={{
                fontSize: getResponsiveSize(18),
                fontWeight: "bold",
                color: "#333",
              }}
            >
              Chọn địa điểm
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={{
                backgroundColor: "#f5f5f5",
                borderRadius: getResponsiveSize(20),
                padding: getResponsiveSize(8),
              }}
            >
              <AntDesign
                name="close"
                size={getResponsiveSize(18)}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* System Locations with Images */}
            {locationsLoading ? (
              <View style={{ alignItems: "center", padding: getResponsiveSize(20) }}>
                <ActivityIndicator size="large" color="#E91E63" />
                <Text style={{ color: "#666", marginTop: 10 }}>
                  Đang tải địa điểm...
                </Text>
              </View>
            ) : safeLocations.length === 0 ? (
              <View style={{ alignItems: "center", padding: getResponsiveSize(20) }}>
                <Feather name="map-pin" size={getResponsiveSize(40)} color="#ccc" />
                <Text style={{ color: "#666", marginTop: getResponsiveSize(10) }}>
                  Không có địa điểm nào trong hệ thống
                </Text>
              </View>
            ) : (
              <View>
                {/* Location list with images from data */}
                {safeLocations.map((location, index) => {
                  const locationId = location?.id || location?.locationId || `fallback-${index}`;
                  const locationName = safeString(location?.name, `Location ${index + 1}`);
                  const locationAddress = safeString(location?.address, "Địa chỉ chưa cập nhật");
                  const hourlyRate = location?.hourlyRate;
                  const isSelected = selectedLocation?.id === locationId;

                  console.log(`🖼️ Location ${index} images:`, location?.images);

                  return (
                    <TouchableOpacity
                      key={`system-location-${index}`}
                      onPress={() => {
                        console.log(`🛠 Clicked location ${index}`);
                        handleLocationSelect(location);
                      }}
                      style={{
                        backgroundColor: isSelected ? "#fff" : "#f8f9fa",
                        borderRadius: getResponsiveSize(12),
                        marginBottom: getResponsiveSize(12),
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? "#E91E63" : "#e0e0e0",
                        padding: getResponsiveSize(15),
                        flexDirection: "row",
                        alignItems: "center",
                      }}
                    >
                      {/* Location Image from existing data */}
                      {renderLocationImage(location)}
                      
                      {/* Location Info */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontSize: getResponsiveSize(16),
                            fontWeight: "bold",
                            color: "#333",
                            marginBottom: getResponsiveSize(4),
                          }}
                          numberOfLines={1}
                        >
                          {locationName}
                        </Text>
                        
                        <Text
                          style={{
                            fontSize: getResponsiveSize(14),
                            color: "#666",
                            marginBottom: getResponsiveSize(4),
                          }}
                          numberOfLines={2}
                        >
                          {locationAddress}
                        </Text>
                        
                        {/* Price and Selection indicator */}
                        <View style={{ 
                          flexDirection: "row", 
                          alignItems: "center", 
                          justifyContent: "space-between" 
                        }}>
                          {(hourlyRate && typeof hourlyRate === 'number') ? (
                            <Text
                              style={{
                                fontSize: getResponsiveSize(12),
                                color: "#E91E63",
                                fontWeight: "bold",
                              }}
                            >
                              {safeFormatPrice(hourlyRate) + "/giờ"}
                            </Text>
                          ) : (
                            <Text
                              style={{
                                fontSize: getResponsiveSize(12),
                                color: "#4CAF50",
                                fontWeight: "bold",
                              }}
                            >
                              Miễn phí
                            </Text>
                          )}
                          
                          {isSelected && (
                            <Feather name="check-circle" size={getResponsiveSize(20)} color="#E91E63" />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}