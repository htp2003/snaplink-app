import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StatusBar, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PhotographerCard from '../../components/Photographer/PhotographerCard';
import { getResponsiveSize } from '../../utils/responsive';
import { usePhotographers } from '../../hooks/usePhotographers';
import { useFavorites } from '../../hooks/useFavorites';
import { useCurrentUserId } from '../../hooks/useAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'ViewAllPhotographers'>;

export default function ViewAllPhotographers({ navigation, route }: Props) {
  const { 
    type = 'recommended', 
    title,
    userId,
    location
  } = route.params || {};
  
  const currentUserId = useCurrentUserId();
  const latitude = location?.latitude;
  const longitude = location?.longitude;
  
  // 🎯 Use exact same hooks as PhotographersTab
  const {
    // Recommended photographers - exactly like PhotographersTab
    recommendedPhotographers,
    recommendedLoading,
    recommendedError,
    fetchRecommendedPhotographers,
    refreshRecommendedPhotographers,
    
    // Popular photographers - exactly like PhotographersTab
    popularPhotographers,
    popularLoading,
    popularError,
    fetchPopularPhotographers,
    refreshPopularPhotographers,
    
    // User style photographers - exactly like PhotographersTab
    userStylePhotographers,
    userStyleLoading,
    userStyleError,
    fetchPhotographersByUserStyles,
    refreshUserStylePhotographers,
  } = usePhotographers();

  const { isFavorite, toggleFavorite } = useFavorites();

  // 📊 Get data based on type - EXACTLY like PhotographersTab logic
  const getCurrentData = () => {
    switch (type) {
      case 'recommended':
        return {
          data: recommendedPhotographers,
          loading: recommendedLoading,
          error: recommendedError,
          refresh: () => refreshRecommendedPhotographers(
            latitude || 0,
            longitude || 0, 
            50, 
            20 
          )
        };
      
      case 'popular':
        return {
          data: popularPhotographers,
          loading: popularLoading,
          error: popularError,
          refresh: () => refreshPopularPhotographers(
            latitude,
            longitude,
            1, // page - same as PhotographersTab
            50 // larger pageSize for view all (PhotographersTab uses 10)
          )
        };
      
      case 'user-styles':
        return {
          data: userStylePhotographers,
          loading: userStyleLoading,
          error: userStyleError,
          refresh: () => refreshUserStylePhotographers(
            latitude,
            longitude
          )
        };
      
      default:
        // Fallback to recommended
        return {
          data: recommendedPhotographers,
          loading: recommendedLoading,
          error: recommendedError,
          refresh: () => refreshRecommendedPhotographers(
            latitude || 0,
            longitude || 0,
            50,
            20
          )
        };
    }
  };

  const { data, loading, error, refresh } = getCurrentData();

  // 🎯 Initial fetch - EXACTLY like PhotographersTab
  useEffect(() => {
    console.log('🔄 ViewAllPhotographers: Fetching data for type:', type);
    console.log('📍 Location:', { latitude, longitude });
    
    switch (type) {
      case 'recommended':
        console.log('⭐ Fetching RECOMMENDED photographers');
        fetchRecommendedPhotographers(
          latitude || 0,
          longitude || 0,
          50, // radiusKm
          20  // maxResults
        );
        break;
        
      case 'popular':
        console.log('🔥 Fetching POPULAR photographers');
        fetchPopularPhotographers(
          latitude,
          longitude,
          1, // page
          50  // pageSize - more for view all
        );
        break;
        
      case 'user-styles':
        if (userId || currentUserId) {
          console.log('✨ Fetching photographers by USER STYLES');
          fetchPhotographersByUserStyles(
            latitude,
            longitude
          );
        }
        break;
    }
  }, [
    type, 
    userId, 
    currentUserId,
    latitude, 
    longitude,
    fetchRecommendedPhotographers,
    fetchPopularPhotographers, 
    fetchPhotographersByUserStyles
  ]);

  // 🏷️ Get title - exactly like PhotographersTab titles
  const getTitle = () => {
    if (title) return title;
    
    switch (type) {
      case 'recommended':
        return '⭐ Đề xuất dành cho bạn';
      case 'popular':
        return '🔥 Thợ chụp ảnh phổ biến';
      case 'user-styles':
        return '✨ Thợ chụp ảnh theo Style';
      default:
        return 'Thợ chụp ảnh';
    }
  };

  // 🎨 Render loading skeleton
  const renderLoadingItem = ({ index }: { index: number }) => (
    <View 
      key={`loading-${index}`}
      className="bg-stone-100 rounded-2xl mb-4 mx-4"
      style={{ height: getResponsiveSize(350) }}
    >
      <View 
        className="bg-stone-200 rounded-t-2xl"
        style={{ height: getResponsiveSize(240) }}
      />
      <View className="p-4 space-y-2">
        <View className="bg-stone-200 rounded h-4 w-3/4" />
        <View className="bg-stone-200 rounded h-3 w-1/2" />
        <View className="bg-stone-200 rounded h-3 w-1/3" />
      </View>
    </View>
  );

  // 🎨 Render photographer - EXACTLY like PhotographersTab
  const renderPhotographerItem = ({ item: photographer }: { item: any }) => (
    <View className="px-4 mb-4">
      <PhotographerCard
        id={photographer.id}
        fullName={photographer.fullName}
        avatar={photographer.avatar}
        styles={photographer.styles}
        rating={photographer.rating}
        hourlyRate={photographer.hourlyRate}
        availabilityStatus={photographer.availabilityStatus}
        yearsExperience={photographer.yearsExperience}
        equipment={photographer.equipment}
        verificationStatus={photographer.verificationStatus}
        onBooking={() => {
          if (photographer.id === undefined) {
            console.error("Photographer ID is undefined");
            return;
          }
          // EXACTLY like PhotographersTab booking navigation
          navigation.navigate("Booking", {
            photographer: {
              photographerId: Number(photographer.id),
              fullName: photographer.fullName || "",
              hourlyRate: photographer.hourlyRate || 0,
              profileImage: photographer.avatar || "",
            },
          });
        }}
        isFavorite={isFavorite(photographer.id, "photographer")}
        onFavoriteToggle={() => {
          // EXACTLY like PhotographersTab favorite toggle
          const favoriteItem = {
            id: photographer.id,
            type: "photographer" as const,
            data: photographer,
          };
          toggleFavorite(favoriteItem);
        }}
      />
    </View>
  );

  // 🎨 Render empty state - similar to PhotographersTab logic
  const renderEmptyState = () => {
    const getEmptyMessage = () => {
      if (error) return 'Không thể tải photographer';
      
      switch (type) {
        case 'recommended':
          return 'Chưa có đề xuất nào dành cho bạn';
        case 'popular':
          return 'Chưa có thợ chụp ảnh phổ biến';
        case 'user-styles':
          return !currentUserId && !userId 
            ? 'Đăng nhập để xem gợi ý theo style'
            : 'Chưa có gợi ý theo style cho bạn. Hãy cập nhật style yêu thích trong profile!';
        default:
          return 'Chưa có thợ chụp ảnh';
      }
    };

    return (
      <View className="flex-1 items-center justify-center px-6" style={{ marginTop: getResponsiveSize(100) }}>
        <View className="items-center">
          <View 
            className="bg-stone-100 rounded-full items-center justify-center mb-4"
            style={{ width: getResponsiveSize(80), height: getResponsiveSize(80) }}
          >
            <Ionicons 
              name={error ? "alert-circle-outline" : "camera-outline"} 
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
            {error ? `${error}` : getEmptyMessage()}
          </Text>
          {error && (
            <TouchableOpacity
              className="bg-stone-900 rounded-xl px-6 py-3"
              onPress={refresh}
            >
              <Text 
                className="text-white font-medium"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                Thử lại
              </Text>
            </TouchableOpacity>
          )}
          {!error && (type === 'user-styles') && (!currentUserId && !userId) && (
            <TouchableOpacity
              className="bg-blue-500 rounded-xl px-6 py-3"
              onPress={() => navigation.navigate('Login')}
            >
              <Text 
                className="text-white font-medium"
                style={{ fontSize: getResponsiveSize(14) }}
              >
                Đăng nhập ngay
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

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
      ) : data.length > 0 ? (
        <FlatList
          data={data}
          renderItem={renderPhotographerItem}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: getResponsiveSize(16), paddingBottom: getResponsiveSize(20) }}
          onRefresh={refresh}
          refreshing={loading}
        />
      ) : (
        renderEmptyState()
      )}

      {/* Floating Stats */}
      {!loading && data.length > 0 && (
        <View className="absolute bottom-6 left-4 right-4">
          <View className="bg-stone-900/90 backdrop-blur-sm rounded-xl px-4 py-3 flex-row items-center justify-between">
            <Text 
              className="text-white font-medium"
              style={{ fontSize: getResponsiveSize(14) }}
            >
              Tìm thấy {data.length} thợ chụp ảnh
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