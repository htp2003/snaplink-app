import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { getResponsiveSize } from '../utils/responsive';


export interface LocationSearchState {
  searchQuery: string;
  currentLocation: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
  selectedArea: string | null;
  searchMode: 'manual' | 'gps' | 'area';
}

interface LocationSearchHeaderProps {
  onSearchStateChange: (state: LocationSearchState) => void;
  loading?: boolean;
}

const LocationSearchHeader: React.FC<LocationSearchHeaderProps> = ({
  onSearchStateChange,
  loading = false
}) => {
  const [searchState, setSearchState] = useState<LocationSearchState>({
    searchQuery: '',
    currentLocation: null,
    selectedArea: null,
    searchMode: 'manual'
  });

  const [gpsLoading, setGpsLoading] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  // Popular areas for quick selection
  const popularAreas = [
    'Quận 1, TP.HCM',
    'Quận 3, TP.HCM', 
    'Quận 7, TP.HCM',
    'Thủ Đức, TP.HCM',
    'Hà Nội',
    'Đà Nẵng'
  ];

  const updateSearchState = (updates: Partial<LocationSearchState>) => {
    const newState = { ...searchState, ...updates };
    setSearchState(newState);
    onSearchStateChange(newState);
  };

  const handleSearchInput = (text: string) => {
    updateSearchState({
      searchQuery: text,
      searchMode: text.trim() ? 'manual' : 'manual',
      selectedArea: null
    });
  };

  const handleGetCurrentLocation = async () => {
    if (gpsLoading) return;

    try {
      setGpsLoading(true);

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Cần quyền truy cập vị trí',
          'Vui lòng cấp quyền truy cập vị trí để sử dụng tính năng này.',
          [
            { text: 'Hủy', style: 'cancel' },
            { 
              text: 'Cài đặt', 
              onPress: () => Location.requestForegroundPermissionsAsync() 
            }
          ]
        );
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // Reverse geocoding to get address
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const address = addresses[0] ? 
        `${addresses[0].street ? addresses[0].street + ', ' : ''}${addresses[0].district ? addresses[0].district + ', ' : ''}${addresses[0].city || 'Việt Nam'}`.trim() :
        'Vị trí hiện tại';

      const currentLocation = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        address
      };

      updateSearchState({
        currentLocation,
        searchQuery: address,
        searchMode: 'gps',
        selectedArea: null
      });

      Alert.alert('✅ Thành công', `Đã lấy vị trí: ${address}`);

    } catch (error: any) {
      console.error('GPS Error:', error);
      
      let errorMessage = 'Không thể lấy vị trí hiện tại';
      if (error.code === 'E_LOCATION_TIMEOUT') {
        errorMessage = 'Timeout - Vui lòng thử lại';
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        errorMessage = 'GPS không khả dụng';
      }
      
      Alert.alert('❌ Lỗi GPS', `${errorMessage}. Vui lòng thử lại hoặc nhập địa chỉ thủ công.`);
    } finally {
      setGpsLoading(false);
    }
  };

  const handleAreaSelection = (area: string) => {
    updateSearchState({
      selectedArea: area,
      searchQuery: area,
      searchMode: 'area',
      currentLocation: null
    });
    setShowAreaPicker(false);
  };

  const toggleAreaPicker = () => {
    setShowAreaPicker(!showAreaPicker);
  };

  return (
    <View className="px-6 py-4 bg-white border-b border-stone-100">
      {/* Main Search Bar */}
      <View className="flex-row items-center bg-stone-50 rounded-2xl px-4 py-3 mb-3">
        <Ionicons name="search-outline" size={20} color="#78716c" />
        <TextInput
          className="flex-1 ml-3 text-stone-900"
          style={{ fontSize: getResponsiveSize(16) }}
          placeholder="Tìm kiếm địa điểm hoặc khu vực..."
          placeholderTextColor="#a8a29e"
          value={searchState.searchQuery}
          onChangeText={handleSearchInput}
          editable={!loading}
        />
        {searchState.searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => handleSearchInput('')}
            className="p-1"
          >
            <Ionicons name="close-circle" size={20} color="#a8a29e" />
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View className="flex-row space-x-3">
        {/* GPS Button */}
        <TouchableOpacity
          onPress={handleGetCurrentLocation}
          disabled={gpsLoading || loading}
          className={`flex-row items-center px-4 py-2 rounded-full border ${
            searchState.searchMode === 'gps' 
              ? 'bg-emerald-50 border-emerald-200' 
              : 'bg-white border-stone-200'
          } ${(gpsLoading || loading) ? 'opacity-50' : ''}`}
        >
          <Ionicons 
            name={gpsLoading ? "refresh-outline" : "location-outline"} 
            size={16} 
            color={searchState.searchMode === 'gps' ? "#059669" : "#78716c"}
          />
          <Text 
            className={`ml-2 font-medium ${
              searchState.searchMode === 'gps' ? 'text-emerald-700' : 'text-stone-600'
            }`}
            style={{ fontSize: getResponsiveSize(14) }}
          >
            {gpsLoading ? 'Đang lấy...' : 'Vị trí hiện tại'}
          </Text>
        </TouchableOpacity>

        {/* Area Selection Button */}
        <TouchableOpacity
          onPress={toggleAreaPicker}
          className={`flex-row items-center px-4 py-2 rounded-full border ${
            searchState.searchMode === 'area' 
              ? 'bg-blue-50 border-blue-200' 
              : 'bg-white border-stone-200'
          }`}
        >
          <Ionicons 
            name="map-outline" 
            size={16} 
            color={searchState.searchMode === 'area' ? "#2563eb" : "#78716c"}
          />
          <Text 
            className={`ml-2 font-medium ${
              searchState.searchMode === 'area' ? 'text-blue-700' : 'text-stone-600'
            }`}
            style={{ fontSize: getResponsiveSize(14) }}
          >
            Chọn khu vực
          </Text>
        </TouchableOpacity>
      </View>

      {/* Quick Area Selection */}
      {(showAreaPicker || searchState.searchQuery.length === 0) && (
        <View className="mt-3">
          <Text 
            className="text-stone-500 mb-2"
            style={{ fontSize: getResponsiveSize(12) }}
          >
            Khu vực phổ biến:
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {popularAreas.map((area) => (
              <TouchableOpacity
                key={area}
                onPress={() => handleAreaSelection(area)}
                className={`px-3 py-1 rounded-full border ${
                  searchState.selectedArea === area
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-stone-50 border-stone-200'
                }`}
              >
                <Text 
                  className={`${
                    searchState.selectedArea === area 
                      ? 'text-blue-700' : 'text-stone-600'
                  }`}
                  style={{ fontSize: getResponsiveSize(12) }}
                >
                  {area}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Current Status Display */}
      {searchState.searchMode === 'gps' && searchState.currentLocation && (
        <View className="mt-3 flex-row items-center bg-emerald-50 px-3 py-2 rounded-lg">
          <Ionicons name="location" size={16} color="#059669" />
          <Text 
            className="ml-2 text-emerald-700 flex-1"
            style={{ fontSize: getResponsiveSize(12) }}
            numberOfLines={1}
          >
            📍 {searchState.currentLocation.address}
          </Text>
        </View>
      )}
    </View>
  );
};

export default LocationSearchHeader;
