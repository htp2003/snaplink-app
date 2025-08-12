// components/LocationModal.tsx - Debug Version
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { AntDesign, Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNearbyLocations } from '../../hooks/useNearbyLocations';
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

  
  const [activeTab, setActiveTab] = useState<'system' | 'nearby'>('system');
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);

  // Nearby locations hook
  const {
    nearbyLocations = [],
    loading: loadingNearby = false,
    error: nearbyError,
    searchNearbyLocations,
  } = useNearbyLocations();

  // 🐛 DEBUG: Ultra safe string function
  const safeString = useCallback((value: any, fallback: string = ''): string => {
    try {
      if (value === null || value === undefined) {
        console.log('🐛 safeString: null/undefined, using fallback:', fallback);
        return fallback;
      }
      if (typeof value === 'string') {
        return value;
      }
      if (typeof value === 'number') {
        return value.toString();
      }
      const result = String(value);
      console.log('🐛 safeString converted:', typeof value, '→', result);
      return result;
    } catch (error) {
      console.error('🐛 safeString error:', error, 'value:', value);
      return fallback;
    }
  }, []);

  // 🐛 DEBUG: Ultra safe format price
  const safeFormatPrice = useCallback((price: any): string => {
    try {
      console.log('🐛 safeFormatPrice input:', price, typeof price);
      
      if (!price || typeof price !== 'number' || isNaN(price)) {
        console.log('🐛 safeFormatPrice: Invalid price, returning Liên hệ');
        return 'Liên hệ';
      }
      
      if (typeof formatPrice !== 'function') {
        console.error('🐛 formatPrice is not a function:', typeof formatPrice);
        return 'Liên hệ';
      }
      
      const result = formatPrice(price);
      console.log('🐛 safeFormatPrice result:', result, typeof result);
      return safeString(result, 'Liên hệ');
    } catch (error) {
      console.error('🐛 safeFormatPrice error:', error);
      return 'Liên hệ';
    }
  }, [formatPrice, safeString]);

  // 🐛 DEBUG: Memoized safe locations with extensive logging
  const safeLocations = useMemo(() => {
    console.log('🐛 Processing safeLocations, input:', locations);
    
    if (!Array.isArray(locations)) {
      return [];
    }
    
    const filtered = locations.filter((loc, idx) => {
      const isValid = loc && (loc.id || loc.locationId) && loc.name;
      return isValid;
    });
    
    console.log('🐛 safeLocations result:', filtered.length, 'valid locations');
    return filtered;
  }, [locations]);

  // Get user GPS location (simplified for debug)
  const getUserLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Cần quyền GPS', 'Vui lòng cấp quyền truy cập vị trí.');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const userLocationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address: `${location.coords.latitude}, ${location.coords.longitude}`
      };
      
      setUserLocation(userLocationData);
      return userLocationData;
      
    } catch (error) {
      console.error('Error getting user location:', error);
      return null;
    }
  };

  // Handle nearby tab press
  const handleNearbyTabPress = async () => {
    console.log('🐛 handleNearbyTabPress called');
    setActiveTab('nearby');
    
    // Always try to search nearby locations when tab is pressed
    try {
      let locationData = userLocation;
      if (!locationData) {
        console.log('🐛 No user location, getting GPS...');
        locationData = await getUserLocation();
        if (!locationData) {
          console.log('🐛 Failed to get GPS, switching back to system tab');
          setActiveTab('system');
          return;
        }
      }
      
      console.log('🐛 Searching nearby locations with:', locationData);
      await searchNearbyLocations({
        address: locationData.address,
        radiusInKm: 5,
        tags: "cafe, studio, coffee, restaurant, hotel, event space",
        limit: 10
      });
      console.log('🐛 Nearby search completed');
    } catch (error) {
      console.error('🐛 Error in handleNearbyTabPress:', error);
    }
  };

  const handleClose = () => {
    setActiveTab('system');
    onClose();
  };

  // 🐛 DEBUG: Safe location selection handler
  const handleLocationSelect = useCallback((location: any) => {
    console.log('🐛 handleLocationSelect called with:', location);
    if (!location) {
      console.log('🐛 handleLocationSelect: No location provided');
      return;
    }
    try {
      onLocationSelect(location);
    } catch (error) {
      console.error('🐛 handleLocationSelect error:', error);
    }
  }, [onLocationSelect]);


  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
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
          {/* Header - Ultra safe */}
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
              onPress={handleClose}
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

          {/* Tab Buttons - Ultra safe */}
          <View
            style={{
              flexDirection: "row",
              backgroundColor: "#f8f9fa",
              borderRadius: getResponsiveSize(12),
              padding: getResponsiveSize(4),
              marginBottom: getResponsiveSize(20),
            }}
          >
            <TouchableOpacity
              onPress={() => setActiveTab('system')}
              style={{
                flex: 1,
                backgroundColor: activeTab === 'system' ? "#E91E63" : "transparent",
                borderRadius: getResponsiveSize(8),
                paddingVertical: getResponsiveSize(12),
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: activeTab === 'system' ? "#fff" : "#666",
                  fontWeight: activeTab === 'system' ? "bold" : "normal",
                  fontSize: getResponsiveSize(14),
                }}
              >
                Trên hệ thống
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={handleNearbyTabPress}
              style={{
                flex: 1,
                backgroundColor: activeTab === 'nearby' ? "#E91E63" : "transparent",
                borderRadius: getResponsiveSize(8),
                paddingVertical: getResponsiveSize(12),
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: activeTab === 'nearby' ? "#fff" : "#666",
                  fontWeight: activeTab === 'nearby' ? "bold" : "normal",
                  fontSize: getResponsiveSize(14),
                }}
              >
                Gần bạn
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content - Only System tab for now */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {activeTab === 'system' ? (
              <View>
                {/* 🐛 DEBUG: Show loading state */}
                {locationsLoading ? (
                  <View style={{ alignItems: "center", padding: getResponsiveSize(20) }}>
                    <Text style={{ color: "#666" }}>
                      Đang tải địa điểm...
                    </Text>
                  </View>
                ) : safeLocations.length === 0 ? (
                  <View style={{ alignItems: "center", padding: getResponsiveSize(20) }}>
                    <Feather name="map-pin" size={getResponsiveSize(40)} color="#ccc" />
                    <Text style={{ color: "#666", marginTop: getResponsiveSize(10) }}>
                      Không có địa điểm nào trên hệ thống
                    </Text>
                  </View>
                ) : (
                  <View>
                    {/* 🐛 DEBUG: Ultra safe location rendering */}
                    {safeLocations.map((location, index) => {

                      
                      // 🐛 ULTRA SAFE: Extract all values first
                      const locationId = location?.id || location?.locationId || `fallback-${index}`;
                      const locationName = safeString(location?.name, `Location ${index + 1}`);
                      const locationAddress = safeString(location?.address, "Địa chỉ chưa cập nhật");
                      const hourlyRate = location?.hourlyRate;
                      const isSelected = selectedLocation?.id === locationId;

                      
                      return (
                        <View key={`debug-location-${index}`}>
                          <TouchableOpacity
                            onPress={() => {
                              console.log(`🐛 Clicked location ${index}`);
                              handleLocationSelect(location);
                            }}
                            style={{
                              backgroundColor: isSelected ? "#fff" : "#f8f9fa",
                              borderRadius: getResponsiveSize(12),
                              marginBottom: getResponsiveSize(12),
                              borderWidth: isSelected ? 2 : 1,
                              borderColor: isSelected ? "#E91E63" : "#e0e0e0",
                              padding: getResponsiveSize(15),
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                              <View style={{ flex: 1 }}>
                                {/* 🐛 ULTRA SAFE: Hardcoded text first */}
                                <Text
                                  style={{
                                    fontSize: getResponsiveSize(16),
                                    fontWeight: "bold",
                                    color: "#333",
                                    marginBottom: getResponsiveSize(4),
                                  }}
                                >
                                  {locationName}
                                </Text>
                                
                                <Text
                                  style={{
                                    fontSize: getResponsiveSize(14),
                                    color: "#666",
                                    marginBottom: getResponsiveSize(4),
                                  }}
                                >
                                  {locationAddress}
                                </Text>
                                
                                {/* 🐛 ULTRA SAFE: Only show price if valid */}
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
                                ) : null}
                              </View>
                              
                              {/* 🐛 ULTRA SAFE: Selection indicator */}
                              {isSelected ? (
                                <Feather name="check-circle" size={getResponsiveSize(20)} color="#E91E63" />
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            ) : (
              // Nearby Locations Tab - RESTORED FUNCTIONALITY
              <View>
                {loadingNearby ? (
                  <View style={{ alignItems: "center", padding: getResponsiveSize(20) }}>
                    <Text style={{ color: "#666" }}>
                      Đang tìm địa điểm gần bạn...
                    </Text>
                    {userLocation?.address && (
                      <Text style={{ color: "#999", fontSize: getResponsiveSize(12), marginTop: 5 }}>
                        {safeString(userLocation.address)}
                      </Text>
                    )}
                  </View>
                ) : nearbyError ? (
                  <View style={{ alignItems: "center", padding: getResponsiveSize(20) }}>
                    <Feather name="alert-circle" size={getResponsiveSize(40)} color="#F44336" />
                    <Text style={{ color: "#F44336", marginTop: getResponsiveSize(10), textAlign: "center" }}>
                      {safeString(nearbyError)}
                    </Text>
                    <TouchableOpacity
                      onPress={handleNearbyTabPress}
                      style={{
                        backgroundColor: "#E91E63",
                        borderRadius: getResponsiveSize(8),
                        paddingHorizontal: getResponsiveSize(16),
                        paddingVertical: getResponsiveSize(8),
                        marginTop: getResponsiveSize(10),
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: getResponsiveSize(12) }}>
                        Thử lại
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : nearbyLocations.length === 0 ? (
                  <View style={{ alignItems: "center", padding: getResponsiveSize(20) }}>
                    <Feather name="map" size={getResponsiveSize(40)} color="#ccc" />
                    <Text style={{ color: "#666", marginTop: getResponsiveSize(10) }}>
                      Không tìm thấy địa điểm nào gần bạn
                    </Text>
                    <TouchableOpacity
                      onPress={handleNearbyTabPress}
                      style={{
                        backgroundColor: "#E91E63",
                        borderRadius: getResponsiveSize(8),
                        paddingHorizontal: getResponsiveSize(16),
                        paddingVertical: getResponsiveSize(8),
                        marginTop: getResponsiveSize(10),
                      }}
                    >
                      <Text style={{ color: "#fff", fontSize: getResponsiveSize(12) }}>
                        Tìm lại
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    {/* User location info */}
                    {userLocation?.address && (
                      <View
                        style={{
                          backgroundColor: "#E8F5E8",
                          borderRadius: getResponsiveSize(8),
                          padding: getResponsiveSize(12),
                          marginBottom: getResponsiveSize(15),
                          borderWidth: 1,
                          borderColor: "#4CAF50",
                        }}
                      >
                        <Text style={{ color: "#2E7D32", fontSize: getResponsiveSize(12), fontWeight: "bold" }}>
                          Vị trí của bạn
                        </Text>
                        <Text style={{ color: "#2E7D32", fontSize: getResponsiveSize(11) }}>
                          {safeString(userLocation.address)}
                        </Text>
                      </View>
                    )}

                    {/* Nearby locations list */}
                    {nearbyLocations
                      .filter(location => location && location.name)
                      .map((location, index) => {
                        console.log(`🐛 Rendering nearby location ${index}:`, location);
                        
                        const isInternal = location?.source === 'internal';
                        const locationName = safeString(location?.name, "");
                        const locationAddress = safeString(location?.address, "Địa chỉ chưa có");
                        const distance = typeof location?.distanceInKm === 'number' ? location.distanceInKm.toFixed(1) : '0.0';
                        
                        // Create safe location for selection
                        const locationForSelection = isInternal ? {
                          id: location?.locationId || index,
                          locationId: location?.locationId,
                          name: locationName,
                          address: locationAddress,
                          hourlyRate: location?.hourlyRate,
                        } : {
                          id: location?.externalId || `external-${index}`,
                          locationId: undefined,
                          name: locationName,
                          address: locationAddress,
                          hourlyRate: undefined,
                          isExternal: true,
                          place_id: location?.place_id,
                          latitude: location?.latitude,
                          longitude: location?.longitude,
                        };

                        const isSelected = selectedLocation?.id === locationForSelection.id;

                        return (
                          <TouchableOpacity
                            key={`nearby-${location?.id || index}-${index}`}
                            onPress={() => {
                              console.log(`🐛 Clicked nearby location ${index}`);
                              handleLocationSelect(locationForSelection);
                            }}
                            style={{
                              backgroundColor: isSelected ? "#fff" : "#f8f9fa",
                              borderRadius: getResponsiveSize(12),
                              marginBottom: getResponsiveSize(12),
                              borderWidth: isSelected ? 2 : 1,
                              borderColor: isSelected ? "#E91E63" : "#e0e0e0",
                              padding: getResponsiveSize(15),
                            }}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center" }}>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: getResponsiveSize(4) }}>
                                  <Text
                                    style={{
                                      fontSize: getResponsiveSize(16),
                                      fontWeight: "bold",
                                      color: "#333",
                                      flex: 1,
                                    }}
                                  >
                                    {locationName}
                                  </Text>
                                  <View
                                    style={{
                                      backgroundColor: isInternal ? "#E8F5E8" : "#E3F2FD",
                                      borderRadius: getResponsiveSize(12),
                                      paddingHorizontal: getResponsiveSize(8),
                                      paddingVertical: getResponsiveSize(2),
                                    }}
                                  >
                                    <Text
                                      style={{
                                        fontSize: getResponsiveSize(10),
                                        color: isInternal ? "#2E7D32" : "#1976D2",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      {isInternal ? "HỆ THỐNG" : "EXTERNAL"}
                                    </Text>
                                  </View>
                                </View>
                                
                                <Text
                                  style={{
                                    fontSize: getResponsiveSize(14),
                                    color: "#666",
                                    marginBottom: getResponsiveSize(4),
                                  }}
                                >
                                  {locationAddress}
                                </Text>
                                
                                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                                  <Text
                                    style={{
                                      fontSize: getResponsiveSize(12),
                                      color: "#999",
                                    }}
                                  >
                                    {distance + " km"}
                                  </Text>
                                  
                                  {isInternal && location?.hourlyRate ? (
                                    <Text
                                      style={{
                                        fontSize: getResponsiveSize(12),
                                        color: "#E91E63",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      {safeFormatPrice(location.hourlyRate) + "/giờ"}
                                    </Text>
                                  ) : !isInternal && location?.rating ? (
                                    <Text
                                      style={{
                                        fontSize: getResponsiveSize(12),
                                        color: "#FF9800",
                                        fontWeight: "bold",
                                      }}
                                    >
                                      {typeof location.rating === 'number' ? location.rating.toFixed(1) + " sao" : ""}
                                    </Text>
                                  ) : null}
                                </View>
                              </View>
                              
                              {isSelected && (
                                <Feather name="check-circle" size={getResponsiveSize(20)} color="#E91E63" />
                              )}
                            </View>
                          </TouchableOpacity>
                        );
                      })}

                    {/* Refresh button */}
                    <TouchableOpacity
                      onPress={handleNearbyTabPress}
                      style={{
                        backgroundColor: "#f8f9fa",
                        borderRadius: getResponsiveSize(8),
                        paddingVertical: getResponsiveSize(12),
                        alignItems: "center",
                        marginTop: getResponsiveSize(10),
                        borderWidth: 1,
                        borderColor: "#e0e0e0",
                      }}
                    >
                      <Text style={{ color: "#666", fontSize: getResponsiveSize(14) }}>
                        Tìm lại địa điểm gần đây
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}