import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { directGooglePlaces, searchPlacesForSearchBar, searchNearbyPlaces, GooglePlaceResult } from '../services/directGooglePlacesService';
import { usePhotographerLocation } from '../hooks/usePhotographerLocation';
import { PlaceDetails, LOCATION_SUGGESTIONS } from '../types/locationTypes';

interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: PlaceDetails) => void;
  initialLocation?: PlaceDetails | null;
  title?: string;
}

const { width, height } = Dimensions.get('window');

export default function LocationPickerModal({
  visible,
  onClose,
  onLocationSelect,
  initialLocation,
  title = 'Chọn vị trí làm việc'
}: LocationPickerModalProps) {
  const insets = useSafeAreaInsets();
  const {
    currentLocation,
    loading,
    error,
    getCurrentLocation,
    selectPlace,
    clearError
  } = usePhotographerLocation();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceDetails[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<PlaceDetails | null>(initialLocation || null);
  const [googlePlaces, setGooglePlaces] = useState<GooglePlaceResult[]>([]);
  const [nearbyPlaces, setNearbyPlaces] = useState<GooglePlaceResult[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'nearby' | 'current'>('search');

  // Initialize location when modal opens
  useEffect(() => {
    if (visible) {
      handleGetCurrentLocation();
      if (initialLocation) {
        setSelectedLocation(initialLocation);
      }
    }
  }, [visible]);

  // Load nearby places when current location is available
  useEffect(() => {
    if (currentLocation && visible && activeTab === 'nearby') {
      loadNearbyPlaces();
    }
  }, [currentLocation, visible, activeTab]);

  const handleGetCurrentLocation = async () => {
    try {
      const location = await getCurrentLocation();
      if (location) {
        const currentPlace: PlaceDetails = {
          placeId: 'current_location',
          name: 'Vị trí hiện tại',
          address: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
          coordinates: location,
        };
        
        if (activeTab === 'current') {
          setSelectedLocation(currentPlace);
        }
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    }
  };

  // Load nearby places using Google Places
  const loadNearbyPlaces = async () => {
    if (!currentLocation) return;

    try {
      setLoadingNearby(true);
      console.log('🔍 Loading nearby places...');
      
      const nearby = await searchNearbyPlaces(currentLocation, {
        radius: 5000,
        maxResults: 15,
        includedTypes: [
          'tourist_attraction',
          'park', 
          'cafe',
          'art_gallery',
          'museum',
          'restaurant',
          'church',
          'shopping_mall'
        ]
      });

      console.log('✅ Loaded nearby places:', nearby.length);
      setNearbyPlaces(nearby);
    } catch (error) {
      console.error('❌ Error loading nearby places:', error);
    } finally {
      setLoadingNearby(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setGooglePlaces([]);
      return;
    }

    try {
      console.log('🔍 Searching for:', query);
      
      // Sử dụng Google Places API
      const results = await searchPlacesForSearchBar(query, currentLocation);
      
      // Transform Google Places results to PlaceDetails
      const transformedResults: PlaceDetails[] = results.googlePlaces.map(place => ({
        placeId: place.placeId,
        name: place.name,
        address: place.address,
        coordinates: {
          latitude: place.latitude || 0,
          longitude: place.longitude || 0
        },
        rating: place.rating,
        types: place.types,
        distance: place.distance
      }));
      
      console.log('✅ Search results:', transformedResults.length);
      setSearchResults(transformedResults);
      setGooglePlaces(results.googlePlaces);
    } catch (error) {
      console.error('❌ Google Places search error:', error);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setSearchQuery(suggestion);
    setActiveTab('search');
    handleSearch(suggestion);
  };

  const handleLocationSelect = (place: PlaceDetails) => {
    console.log('📍 Location selected:', place.name);
    setSelectedLocation(place);
    selectPlace(place);
  };

  const handleGooglePlaceSelect = (googlePlace: GooglePlaceResult) => {
    const placeDetails: PlaceDetails = {
      placeId: googlePlace.placeId,
      name: googlePlace.name,
      address: googlePlace.address,
      coordinates: {
        latitude: googlePlace.latitude || 0,
        longitude: googlePlace.longitude || 0
      },
      rating: googlePlace.rating,
      types: googlePlace.types,
      distance: googlePlace.distance
    };
    
    handleLocationSelect(placeDetails);
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
      onClose();
    } else {
      Alert.alert('Thông báo', 'Vui lòng chọn một vị trí');
    }
  };

  const renderTabButton = (tab: 'search' | 'nearby' | 'current', icon: string, label: string) => (
    <TouchableOpacity
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        backgroundColor: activeTab === tab ? '#FF385C' : '#FFFFFF',
        borderRadius: 8,
        marginHorizontal: 2,
        borderWidth: 1,
        borderColor: activeTab === tab ? '#FF385C' : '#E5E5E5'
      }}
      onPress={() => {
        setActiveTab(tab);
        if (tab === 'nearby' && currentLocation) {
          loadNearbyPlaces();
        } else if (tab === 'current') {
          handleGetCurrentLocation();
        }
      }}
    >
      <Ionicons 
        name={icon as any} 
        size={18} 
        color={activeTab === tab ? '#FFFFFF' : '#666666'} 
      />
      <Text style={{
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '500',
        color: activeTab === tab ? '#FFFFFF' : '#666666'
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderSearchResults = () => (
    <FlatList
      data={searchResults}
      keyExtractor={(item) => item.placeId}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={{
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#F0F0F0',
            backgroundColor: selectedLocation?.placeId === item.placeId ? '#F0F8FF' : '#FFFFFF'
          }}
          onPress={() => handleLocationSelect(item)}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="location-outline" size={20} color="#666666" />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontWeight: '500', color: '#000000' }}>
                {item.name}
              </Text>
              <Text style={{ color: '#666666', fontSize: 12, marginTop: 2 }}>
                {item.address}
              </Text>
              {item.rating && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <Ionicons name="star" size={12} color="#FFD700" />
                  <Text style={{ fontSize: 12, color: '#666666', marginLeft: 2 }}>
                    {item.rating.toFixed(1)}
                  </Text>
                  {item.distance && (
                    <Text style={{ fontSize: 12, color: '#999999', marginLeft: 8 }}>
                      • {item.distance} km
                    </Text>
                  )}
                </View>
              )}
            </View>
            {selectedLocation?.placeId === item.placeId && (
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            )}
          </View>
        </TouchableOpacity>
      )}
      style={{ maxHeight: 400 }}
      showsVerticalScrollIndicator={false}
    />
  );

  const renderNearbyPlaces = () => (
    <View style={{ flex: 1 }}>
      {loadingNearby ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF385C" />
          <Text style={{ marginTop: 12, color: '#666666' }}>
            Đang tìm địa điểm gần đây...
          </Text>
        </View>
      ) : nearbyPlaces.length > 0 ? (
        <FlatList
          data={nearbyPlaces}
          keyExtractor={(item) => item.placeId}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{
                padding: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#F0F0F0',
                backgroundColor: selectedLocation?.placeId === item.placeId ? '#F0F8FF' : '#FFFFFF'
              }}
              onPress={() => handleGooglePlaceSelect(item)}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: '#F5F5F5',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Ionicons name="business-outline" size={20} color="#666666" />
                </View>
                
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontWeight: '500', color: '#000000' }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: '#666666', fontSize: 12, marginTop: 2 }}>
                    {item.address}
                  </Text>
                  
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    {item.rating && (
                      <>
                        <Ionicons name="star" size={12} color="#FFD700" />
                        <Text style={{ fontSize: 12, color: '#666666', marginLeft: 2 }}>
                          {item.rating.toFixed(1)}
                        </Text>
                      </>
                    )}
                    {item.distance && (
                      <Text style={{ fontSize: 12, color: '#999999', marginLeft: 8 }}>
                        {item.distance} km
                      </Text>
                    )}
                  </View>
                </View>
                
                {selectedLocation?.placeId === item.placeId && (
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                )}
              </View>
            </TouchableOpacity>
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Ionicons name="location-outline" size={48} color="#CCCCCC" />
          <Text style={{ marginTop: 12, color: '#666666', textAlign: 'center' }}>
            Không tìm thấy địa điểm gần đây
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: '#FF385C',
              borderRadius: 8
            }}
            onPress={loadNearbyPlaces}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14 }}>
              Thử lại
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderCurrentLocation = () => (
    <View style={{ flex: 1, padding: 20 }}>
      {loading ? (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <ActivityIndicator size="large" color="#FF385C" />
          <Text style={{ marginTop: 12, color: '#666666' }}>
            Đang lấy vị trí hiện tại...
          </Text>
        </View>
      ) : currentLocation ? (
        <View>
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            padding: 20,
            alignItems: 'center',
            marginBottom: 20
          }}>
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: '#FF385C',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16
            }}>
              <Ionicons name="location" size={40} color="#FFFFFF" />
            </View>
            
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000', marginBottom: 8 }}>
              Vị trí hiện tại của bạn
            </Text>
            
            <Text style={{ color: '#666666', textAlign: 'center', marginBottom: 16 }}>
              Lat: {currentLocation.latitude.toFixed(6)}{'\n'}
              Lng: {currentLocation.longitude.toFixed(6)}
            </Text>
            
            <TouchableOpacity
              style={{
                backgroundColor: selectedLocation?.placeId === 'current_location' ? '#10B981' : '#FF385C',
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center'
              }}
              onPress={() => {
                const currentPlace: PlaceDetails = {
                  placeId: 'current_location',
                  name: 'Vị trí hiện tại',
                  address: `${currentLocation.latitude.toFixed(6)}, ${currentLocation.longitude.toFixed(6)}`,
                  coordinates: currentLocation,
                };
                handleLocationSelect(currentPlace);
              }}
            >
              <Ionicons 
                name={selectedLocation?.placeId === 'current_location' ? "checkmark" : "add"} 
                size={20} 
                color="#FFFFFF" 
              />
              <Text style={{ color: '#FFFFFF', marginLeft: 8, fontWeight: '500' }}>
                {selectedLocation?.placeId === 'current_location' ? 'Đã chọn' : 'Chọn vị trí này'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Ionicons name="location-outline" size={48} color="#CCCCCC" />
          <Text style={{ marginTop: 12, color: '#666666', textAlign: 'center' }}>
            Không thể lấy vị trí hiện tại
          </Text>
          <TouchableOpacity
            style={{
              marginTop: 12,
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: '#FF385C',
              borderRadius: 8
            }}
            onPress={handleGetCurrentLocation}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14 }}>
              Thử lại
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderSuggestions = () => (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontWeight: '500', color: '#000000', marginBottom: 8 }}>
        Gợi ý tìm kiếm
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {LOCATION_SUGGESTIONS.slice(0, 6).map((suggestion) => (
          <TouchableOpacity
            key={suggestion}
            style={{
              backgroundColor: '#F5F5F5',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
            }}
            onPress={() => handleSuggestionPress(suggestion)}
          >
            <Text style={{ color: '#666666', fontSize: 12 }}>
              {suggestion}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'search':
        return (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            {/* Search Input */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 12,
              marginBottom: 16
            }}>
              <Ionicons name="search" size={20} color="#666666" />
              <TextInput
                style={{
                  flex: 1,
                  marginLeft: 12,
                  fontSize: 16,
                  color: '#000000'
                }}
                placeholder="Tìm kiếm địa điểm..."
                placeholderTextColor="#CCCCCC"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                  handleSearch(text);
                }}
              />
              {loading && <ActivityIndicator size="small" color="#FF385C" />}
            </View>

            {/* Search Results */}
            {searchResults.length > 0 ? (
              <View style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                marginBottom: 16,
                overflow: 'hidden'
              }}>
                {renderSearchResults()}
              </View>
            ) : (
              /* Suggestions when no search results */
              renderSuggestions()
            )}
          </ScrollView>
        );

      case 'nearby':
        return renderNearbyPlaces();

      case 'current':
        return renderCurrentLocation();

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
        {/* Header */}
        <View style={{
          backgroundColor: '#FFFFFF',
          paddingTop: insets.top,
          paddingHorizontal: 20,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderBottomColor: '#F0F0F0'
        }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 16
          }}>
            <TouchableOpacity
              onPress={onClose}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#F5F5F5',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
            
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000' }}>
              {title}
            </Text>
            
            <View style={{ width: 40 }} />
          </View>

          {/* Tab Buttons */}
          <View style={{
            flexDirection: 'row',
            marginTop: 16,
            backgroundColor: '#F5F5F5',
            borderRadius: 10,
            padding: 4
          }}>
            {renderTabButton('search', 'search', 'Tìm kiếm')}
            {renderTabButton('nearby', 'business', 'Gần đây')}
            {renderTabButton('current', 'locate', 'Hiện tại')}
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={{
            backgroundColor: '#FEE2E2',
            marginHorizontal: 20,
            marginTop: 16,
            borderRadius: 8,
            padding: 12
          }}>
            <Text style={{ color: '#DC2626', fontSize: 14 }}>
              {error}
            </Text>
          </View>
        )}

        {/* Content */}
        <View style={{ flex: 1 }}>
          {renderContent()}
        </View>

        {/* Selected Location Display */}
        {selectedLocation && (
          <View style={{
            backgroundColor: '#E0F2FE',
            marginHorizontal: 20,
            marginTop: 12,
            borderRadius: 12,
            padding: 16
          }}>
            <Text style={{ fontWeight: '500', color: '#0369A1', marginBottom: 4 }}>
              Vị trí đã chọn:
            </Text>
            <Text style={{ color: '#0369A1' }}>
              {selectedLocation.name}
            </Text>
            <Text style={{ color: '#075985', fontSize: 12, marginTop: 2 }}>
              {selectedLocation.address}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={{
          backgroundColor: '#FFFFFF',
          paddingHorizontal: 20,
          paddingVertical: 16,
          paddingBottom: insets.bottom + 16,
          borderTopWidth: 1,
          borderTopColor: '#F0F0F0'
        }}>
          <TouchableOpacity
            style={{
              backgroundColor: selectedLocation ? '#FF385C' : '#CCCCCC',
              borderRadius: 12,
              padding: 16,
              alignItems: 'center'
            }}
            onPress={handleConfirm}
            disabled={!selectedLocation}
          >
            <Text style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '600'
            }}>
              Xác nhận vị trí
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}