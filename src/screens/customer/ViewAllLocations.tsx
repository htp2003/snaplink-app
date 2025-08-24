import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StatusBar, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import LocationCard from '../../components/Location/LocationCard';
import { getResponsiveSize } from '../../utils/responsive';
import { useLocations } from '../../hooks/useLocations';
import { useFavorites } from '../../hooks/useFavorites';

// 🆕 UPDATE: Add type parameter for ViewAllLocations
type Props = NativeStackScreenProps<RootStackParamList, 'ViewAllLocations'>;

export default function ViewAllLocations({ navigation, route }: Props) {
  const { type = 'all' } = route.params || {};
  
  // 🎯 Use exact same hooks as LocationsTab
  const {
    // All locations - exactly like LocationsTab
    locations,
    loading: locationsLoading,
    error: locationsError,
    refreshLocations,
    
    // Nearby locations - exactly like LocationsTab  
    registeredNearbyLocations,
    nearbyLoading,
    nearbyError,
    fetchRegisteredNearbyLocations,
  } = useLocations();

  const { isFavorite, toggleFavorite } = useFavorites();

  // 📊 Get data based on type - EXACTLY like LocationsTab logic
  const getCurrentData = () => {
    switch (type) {
      case 'nearby':
        return {
          data: registeredNearbyLocations,
          loading: nearbyLoading,
          error: nearbyError,
          refresh: fetchRegisteredNearbyLocations,
          showDistance: true, // Show distance for nearby locations
        };
      
      case 'all':
      default:
        return {
          data: locations,
          loading: locationsLoading,
          error: locationsError,
          refresh: refreshLocations,
          showDistance: false, // Don't show distance for all locations
        };
    }
  };

  const { data, loading, error, refresh, showDistance } = getCurrentData();

  // 🎯 Initial fetch if needed
  useEffect(() => {
    console.log('📄 ViewAllLocations: Displaying data for type:', type);
    
    // If nearby type and no data, trigger fetch
    if (type === 'nearby' && registeredNearbyLocations.length === 0 && !nearbyLoading) {
      fetchRegisteredNearbyLocations();
    }
  }, [type, registeredNearbyLocations.length, nearbyLoading, fetchRegisteredNearbyLocations]);

  // 🏷️ Get title based on type
  const getTitle = () => {
    switch (type) {
      case 'nearby':
        return '📍 Địa điểm gần bạn';
      case 'all':
      default:
        return 'Tất cả địa điểm';
    }
  };

  // 🎨 Render loading skeleton
  const renderLoadingItem = ({ index }: { index: number }) => (
    <View 
      key={`loading-${index}`}
      className="bg-stone-100 rounded-2xl mb-4 mx-4"
      style={{ height: getResponsiveSize(280) }}
    >
      <View 
        className="bg-stone-200 rounded-t-2xl"
        style={{ height: getResponsiveSize(200) }}
      />
      <View className="p-4 space-y-2">
        <View className="bg-stone-200 rounded h-4 w-3/4" />
        <View className="bg-stone-200 rounded h-3 w-1/2" />
        <View className="bg-stone-200 rounded h-3 w-1/3" />
      </View>
    </View>
  );

  // 🎨 Render location - EXACTLY like LocationsTab
  const renderLocationItem = ({ item: location }: { item: any }) => (
    <View className="px-4 mb-4">
      <LocationCard
        locationId={location.locationId}
        name={location.name || "Địa điểm chưa có tên"}
        images={location.images || []}
        address={location.address || ""}
        hourlyRate={location.hourlyRate}
        capacity={location.capacity}
        availabilityStatus={location.availabilityStatus || "unknown"}
        styles={location.styles || []}
        isFavorite={isFavorite(location.id || location.locationId, "location")}
        onFavoriteToggle={() =>
          toggleFavorite({
            id: location.id || location.locationId,
            type: "location",
            data: location,
          })
        }
        distance={showDistance && location.distance ? Number(location.distance) : undefined}
        rating={location.rating ? Number(location.rating) : undefined}
        source={location.source || "internal"}
      />
    </View>
  );

  // 🎨 Render empty state - similar to LocationsTab logic
  const renderEmptyState = () => {
    const getEmptyMessage = () => {
      if (error) return 'Không thể tải địa điểm';
      
      switch (type) {
        case 'nearby':
          return 'Không tìm thấy địa điểm nào gần bạn';
        case 'all':
        default:
          return 'Không có địa điểm nào';
      }
    };

    const getEmptyIcon = () => {
      if (error) return "alert-circle-outline";
      return type === 'nearby' ? "navigate-outline" : "location-outline";
    };

    return (
      <View className="flex-1 items-center justify-center px-6" style={{ marginTop: getResponsiveSize(100) }}>
        <View className="items-center">
          <View 
            className="bg-stone-100 rounded-full items-center justify-center mb-4"
            style={{ width: getResponsiveSize(80), height: getResponsiveSize(80) }}
          >
            <Ionicons 
              name={getEmptyIcon()} 
              size={getResponsiveSize(40)} 
              color={error ? "#ef4444" : "#a8a29e"} 
            />
          </View>
          <Text 
            className={`font-semibold text-center mb-2 ${error ? 'text-red-600' : 'text-stone-900'}`}
            style={{ fontSize: getResponsiveSize(18) }}
          >
            {getEmptyMessage()}
          </Text>
          <Text 
            className="text-stone-500 text-center mb-6"
            style={{ fontSize: getResponsiveSize(14), lineHeight: getResponsiveSize(20) }}
          >
            {error ? `${error}` : 
             type === 'nearby' ? 'Hãy thử tìm kiếm lại hoặc mở rộng khu vực tìm kiếm' : 
             'Hiện tại chưa có địa điểm nào được đăng ký'}
          </Text>
          
          <TouchableOpacity
            className={`${error ? 'bg-red-500' : 'bg-stone-900'} rounded-xl px-6 py-3`}
            onPress={refresh}
          >
            <Text 
              className="text-white font-medium"
              style={{ fontSize: getResponsiveSize(14) }}
            >
              {error ? 'Thử lại' : 
               type === 'nearby' ? '🔍 Tìm kiếm lại' : 'Làm mới'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Filter data to ensure valid locationId - EXACTLY like LocationsTab
  const filteredData = data.filter(location => 
    location.locationId !== undefined && location.locationId !== null
  );

  return (
    <SafeAreaView className='flex-1 bg-white'>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-stone-100">
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          className="mr-3"
        >
          <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="#1c1917" />
        </TouchableOpacity>
        <Text 
          className="text-stone-900 font-semibold flex-1"
          style={{ fontSize: getResponsiveSize(18) }}
          numberOfLines={1}
        >
          {getTitle()}
        </Text>
        
        <TouchableOpacity className="ml-3">
          <Ionicons name="options-outline" size={getResponsiveSize(24)} color="#57534e" />
        </TouchableOpacity>
      </View>
      
      {/* Main Content */}
      {loading ? (
        <FlatList
          data={[1, 2, 3, 4, 5]}
          renderItem={renderLoadingItem}
          keyExtractor={(_, index) => `loading-${index}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: getResponsiveSize(16), paddingBottom: getResponsiveSize(20) }}
        />
      ) : filteredData.length > 0 ? (
        <FlatList
          data={filteredData}
          renderItem={renderLocationItem}
          keyExtractor={(item) => (item.id || item.locationId)?.toString() || Math.random().toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: getResponsiveSize(16), paddingBottom: getResponsiveSize(20) }}
          onRefresh={refresh}
          refreshing={loading}
        />
      ) : (
        renderEmptyState()
      )}

      {/* Floating Stats */}
      {!loading && filteredData.length > 0 && (
        <View className="absolute bottom-6 left-4 right-4">
          <View className="bg-stone-900/90 backdrop-blur-sm rounded-xl px-4 py-3 flex-row items-center justify-between">
            <Text 
              className="text-white font-medium"
              style={{ fontSize: getResponsiveSize(14) }}
            >
              Tìm thấy {filteredData.length} địa điểm
              {showDistance && ' gần bạn'}
            </Text>
            <View className="flex-row items-center">
              <Ionicons name="funnel-outline" size={getResponsiveSize(16)} color="white" />
              <Text 
                className="text-white ml-2"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                Bộ lọc
              </Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}