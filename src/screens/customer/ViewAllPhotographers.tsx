import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar, FlatList } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PhotographerCard from '../../components/Photographer/PhotographerCard';
import { getResponsiveSize } from '../../utils/responsive';
import { usePhotographers } from '../../hooks/usePhotographers';
import { useFavorites } from '../../hooks/useFavorites';
import { photographerStyleRecommendations } from '../../hooks/useStyleRecommendations';
import { useCurrentUserId } from '../../hooks/useAuth';

type Props = NativeStackScreenProps<RootStackParamList, 'ViewAllPhotographers'>;

export default function ViewAllPhotographers({ navigation, route }: Props) {
  const { 
    type = 'featured', 
    title = 'Tất cả thợ chụp ảnh',
    userId 
  } = route.params || {};
  
  const currentUserId = useCurrentUserId();
  
  const {
    photographers,
    loading: photographersLoading,
    error: photographersError,
    fetchFeaturedPhotographers,
    fetchAllPhotographers
  } = usePhotographers();

  const {
    recommendedPhotographers,
    loading: recommendationsLoading,
    error: recommendationsError,
    refreshRecommendations,
  } = photographerStyleRecommendations(userId || currentUserId || 0);

  const { isFavorite, toggleFavorite } = useFavorites();

  // Determine which data and loading state to use
  const getCurrentData = () => {
    switch (type) {
      case 'recommendations':
        return {
          data: recommendedPhotographers,
          loading: recommendationsLoading,
          error: recommendationsError,
          refresh: refreshRecommendations
        };
      case 'featured':
        return {
          data: photographers,
          loading: photographersLoading,
          error: photographersError,
          refresh: fetchFeaturedPhotographers
        };
      case 'all':
        return {
          data: photographers,
          loading: photographersLoading,
          error: photographersError,
          refresh: fetchAllPhotographers
        };
      default:
        return {
          data: photographers,
          loading: photographersLoading,
          error: photographersError,
          refresh: fetchFeaturedPhotographers
        };
    }
  };

  const { data, loading, error, refresh } = getCurrentData();

  useEffect(() => {
    refresh();
  }, [type, userId]);

  // Get appropriate title
  const getTitle = () => {
    switch (type) {
      case 'recommendations':
        return 'Thợ chụp ảnh theo Style của bạn';
      case 'featured':
        return 'Thợ chụp ảnh được yêu thích';
      case 'all':
        return 'Tất cả thợ chụp ảnh';
      default:
        return title;
    }
  };

  // Render loading skeleton
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

  // Render photographer item
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
        onBooking={() => navigation.navigate('Booking', {
          photographerId: photographer.id,
          photographerName: photographer.fullName,
          hourlyRate: photographer.hourlyRate
        })}
        isFavorite={isFavorite(photographer.id, 'photographer')}
        onFavoriteToggle={() => toggleFavorite({
          id: photographer.id,
          type: 'photographer',
          data: photographer
        })}
      />
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center px-6" style={{ marginTop: getResponsiveSize(100) }}>
      <View className="items-center">
        <View 
          className="bg-stone-100 rounded-full items-center justify-center mb-4"
          style={{ width: getResponsiveSize(80), height: getResponsiveSize(80) }}
        >
          <Ionicons name="camera-outline" size={getResponsiveSize(40)} color="#a8a29e" />
        </View>
        <Text 
          className="text-stone-900 font-semibold text-center mb-2"
          style={{ fontSize: getResponsiveSize(18) }}
        >
          {error ? 'Đã có lỗi xảy ra' : 'Không có thợ chụp ảnh'}
        </Text>
        <Text 
          className="text-stone-500 text-center mb-6"
          style={{ fontSize: getResponsiveSize(14), lineHeight: getResponsiveSize(20) }}
        >
          {error 
            ? 'Vui lòng thử lại sau' 
            : type === 'recommendations' 
            ? !currentUserId 
              ? 'Vui lòng đăng nhập để xem gợi ý theo style'
              : 'Chưa có gợi ý theo style cho bạn'
            : type === 'featured'
            ? 'Hiện tại chưa có thợ chụp ảnh được yêu thích nào'
            : 'Hiện tại chưa có thợ chụp ảnh nào'
          }
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
      </View>
    </View>
  );

  return (
    <SafeAreaView className='flex-1 bg-white'>
      <StatusBar backgroundColor="white" barStyle="dark-content" />
      
      {/* Header with back button and title */}
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
        
        {/* Optional filter/search button */}
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
          keyExtractor={(item) => item.id.toString()}
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