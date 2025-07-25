import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';

// Hook and Component
import { usePhotographers, PhotographerData } from '../../hooks/usePhotographers';
import { useLocations } from '../../hooks/useLocations';
import { useFavorites } from '../../hooks/useFavorites';
import PhotographerCard from '../../components/Photographer/PhotographerCard';
import LocationCard from '../../components/LocationCard/LocationCard';
import { useNavigation } from '@react-navigation/native';
import CategoryTabs, { CategoryItem } from '../../components/CategoryTabs';
import { SearchBar } from '../../components/SearchBar';
import { useCurrentUserId } from '../../hooks/useAuth';
import { photographerStyleRecommendations } from '../../hooks/useStyleRecommendations';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// 🔧 Define proper types for API responses
interface ApiPhotographerResponse {
  photographerId?: number;
  id?: number;
  fullName?: string;
  profileImage?: string;
  styles?: string[] | any[];
  rating?: number;
  hourlyRate?: number;
  availabilityStatus?: string;
  yearsExperience?: number;
  equipment?: string;
  verificationStatus?: string;
  specialty?: string;
  user?: {
    fullName?: string;
    profileImage?: string;
  };
}

interface ApiResponse {
  $values?: ApiPhotographerResponse[];
  [key: string]: any;
}

export default function CustomerHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState('photographers');

  const currentUserId = useCurrentUserId();

  // 🌟 SECTION 1: FEATURED PHOTOGRAPHERS - stable instance
  const featuredPhotographersHook = usePhotographers();
  const {
    photographers: featuredPhotographers,
    loading: featuredLoading,
    error: featuredError,
    fetchFeaturedPhotographers,
  } = featuredPhotographersHook;

  // 📷 SECTION 2: ALL PHOTOGRAPHERS - sử dụng state riêng để tránh conflict
  const [allPhotographers, setAllPhotographers] = useState<PhotographerData[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);

  // 🎨 SECTION 3: STYLE RECOMMENDATIONS - only if user logged in
  const styleRecommendationsHook = photographerStyleRecommendations(currentUserId || 0);
  const {
    recommendedPhotographers,
    loading: recommendationsLoading,
    error: recommendationsError,
    refreshRecommendations,
  } = styleRecommendationsHook;

  // 📍 LOCATIONS
  const {
    locations,
    loading: locationsLoading,
    error: locationsError,
    refreshLocations
  } = useLocations();

  const { isFavorite, toggleFavorite } = useFavorites();

  // 🔧 Helper functions - định nghĩa lại để không bị memoize issues
  const processApiResponse = (apiResponse: any): ApiPhotographerResponse[] => {
    console.log('Processing API response:', apiResponse);
    
    if (Array.isArray(apiResponse)) {
      return apiResponse as ApiPhotographerResponse[];
    }
    
    if (apiResponse && Array.isArray((apiResponse as ApiResponse).$values)) {
      return (apiResponse as ApiResponse).$values!;
    }
    
    if (apiResponse && typeof apiResponse === 'object') {
      return [apiResponse as ApiPhotographerResponse];
    }
    
    console.warn('Unexpected API response format:', apiResponse);
    return [];
  };

  const transformPhotographerData = (photographer: ApiPhotographerResponse): PhotographerData => {
    const photographerId = photographer.photographerId || photographer.id;
    const userInfo = photographer.user || photographer;
    
    return {
      id: photographerId ? photographerId.toString() : 'unknown',
      fullName: userInfo.fullName || photographer.fullName || 'Unknown Photographer',
      avatar: userInfo.profileImage || photographer.profileImage || 
              '',
      styles: Array.isArray(photographer.styles) ? photographer.styles : ['Professional Photography'],
      rating: photographer.rating,
      hourlyRate: photographer.hourlyRate,
      availabilityStatus: photographer.availabilityStatus || 'available',
      yearsExperience: photographer.yearsExperience,
      equipment: photographer.equipment,
      verificationStatus: photographer.verificationStatus,
      specialty: photographer.specialty || 'Professional Photographer',
    };
  };

  // 🔄 Fetch ALL photographers separately - simplified
  const fetchAllPhotographersSeparately = useCallback(async () => {
    if (allLoading) return;
    
    try {
      setAllLoading(true);
      setAllError(null);
      console.log('📷 Fetching ALL photographers for section 2...');
      
      const { photographerService } = await import('../../services/photographerService');
      const response = await photographerService.getAll();
      
      const photographersArray = processApiResponse(response);
      console.log('📷 All photographers count:', photographersArray.length);
      
      const transformedData: PhotographerData[] = [];
      for (const photographer of photographersArray) {
        if (photographer && (photographer.photographerId !== undefined || photographer.id !== undefined)) {
          try {
            const transformed = transformPhotographerData(photographer);
            transformedData.push(transformed);
          } catch (error) {
            console.error('Error transforming photographer:', error);
          }
        }
      }
      
      setAllPhotographers(transformedData);
      
    } catch (err) {
      console.error('Error fetching all photographers:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch all photographers';
      setAllError(errorMessage);
      setAllPhotographers([]);
    } finally {
      setAllLoading(false);
    }
  }, [allLoading]);

  // Categories - memoized để tránh re-create
  const categories = useMemo((): CategoryItem[] => [
    { id: 'photographers', icon: 'camera', label: 'Thợ chụp ảnh' },
    { id: 'locations', icon: 'location', label: 'Địa điểm' },
    { id: 'services', icon: 'construct', label: 'Dịch vụ' }
  ], []);

  // Handle category press - stable reference
  const handleCategoryPress = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    if (categoryId === 'locations' && locations.length === 0) {
      refreshLocations();
    }
  }, [locations.length, refreshLocations]);

  // Render functions - memoized để tránh re-render
  const renderPhotographerCard = useCallback((photographer: PhotographerData) => (
    <View
      key={photographer.id}
      style={{ width: getResponsiveSize(260), marginRight: 12 }}
    >
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
            console.error('Photographer ID is undefined');
            return;
          }
          
          navigation.navigate('Booking', {
            photographer: {
              photographerId: Number(photographer.id),
              fullName: photographer.fullName || '',
              hourlyRate: photographer.hourlyRate || 0,
              profileImage: photographer.avatar || '',
            }
          });
        }}
        isFavorite={isFavorite(photographer.id, 'photographer')}
        onFavoriteToggle={() => toggleFavorite({
          id: photographer.id,
          type: 'photographer',
          data: photographer
        })}
      />
    </View>
  ), [navigation, isFavorite, toggleFavorite]);

  const renderLoadingSkeleton = useCallback(() => (
    [1, 2, 3].map((_, index) => (
      <View
        key={`loading-${index}`}
        className="w-64 h-72 bg-stone-100 rounded-2xl mr-3"
      />
    ))
  ), []);

  const renderErrorState = useCallback((error: string, retryFunction: () => void) => (
    <View className="flex-1 items-center justify-center py-8">
      <Text className="text-red-500 text-center">❌ {error}</Text>
      <TouchableOpacity 
        onPress={retryFunction}
        className="mt-2 bg-red-500 px-4 py-2 rounded"
      >
        <Text className="text-white">Thử lại</Text>
      </TouchableOpacity>
    </View>
  ), []);

  // 🚀 Load data only once on mount - STABLE REFERENCE
  useEffect(() => {
    console.log('🚀 Initial useEffect triggered');
    fetchFeaturedPhotographers();
    fetchAllPhotographersSeparately();
  }, []); // EMPTY array để chỉ chạy 1 lần

  return (
    <View className="flex-1 bg-white">
      <StatusBar backgroundColor="white" barStyle="dark-content" />

      {/* Search Bar */}
      <SearchBar />

      {/* Category Tabs */}
      <CategoryTabs
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryPress={handleCategoryPress}
      />

      {/* Main Content */}
      <ScrollView 
        className="flex-1 bg-white"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: getResponsiveSize(100) }}
      >
        {/* PHOTOGRAPHERS SECTIONS */}
        {selectedCategory === 'photographers' && (
          <>
            {/* 🌟 SECTION 1: FEATURED PHOTOGRAPHERS */}
            <View className="px-6 py-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xl font-semibold text-stone-900">
                  Thợ chụp ảnh nổi bật
                </Text>
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => navigation.navigate('ViewAllPhotographers', {
                    type: 'featured',
                    title: 'Thợ chụp ảnh nổi bật'
                  })}
                >
                  <Ionicons name="chevron-forward" size={20} color="#57534e" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {featuredLoading ? (
                  renderLoadingSkeleton()
                ) : featuredError ? (
                  renderErrorState(featuredError, fetchFeaturedPhotographers)
                ) : featuredPhotographers.length > 0 ? (
                  featuredPhotographers.map(renderPhotographerCard)
                ) : (
                  <View className="flex-1 items-center justify-center py-8">
                    <Text className="text-stone-500 text-center">
                      Chưa có thợ chụp ảnh nổi bật
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* 📷 SECTION 2: ALL PHOTOGRAPHERS */}
            <View className="px-6 py-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xl font-semibold text-stone-900">
                  Tất cả thợ chụp ảnh
                </Text>
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => navigation.navigate('ViewAllPhotographers', {
                    type: 'all',
                    title: 'Tất cả thợ chụp ảnh'
                  })}
                >
                  <Ionicons name="chevron-forward" size={20} color="#57534e" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {allLoading ? (
                  renderLoadingSkeleton()
                ) : allError ? (
                  renderErrorState(allError, fetchAllPhotographersSeparately)
                ) : allPhotographers.length > 0 ? (
                  allPhotographers.map(renderPhotographerCard)
                ) : (
                  <View className="flex-1 items-center justify-center py-8">
                    <Text className="text-stone-500 text-center">
                      Không có thợ chụp ảnh nào
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* 🎨 SECTION 3: STYLE RECOMMENDATIONS */}
            <View className="px-6 py-4">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-xl font-semibold text-stone-900">
                  Thợ chụp ảnh theo Style của bạn
                </Text>
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => navigation.navigate('ViewAllPhotographers', {
                    type: 'recommendations',
                    title: 'Thợ chụp ảnh theo Style của bạn',
                    userId: currentUserId
                  })}
                >
                  <Ionicons name="chevron-forward" size={20} color="#57534e" />
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {recommendationsLoading ? (
                  renderLoadingSkeleton()
                ) : recommendationsError ? (
                  <View className="flex-1 items-center justify-center py-8">
                    <Text className="text-red-500 text-center">
                      ❌ Không thể tải gợi ý theo style
                    </Text>
                    {currentUserId && (
                      <TouchableOpacity
                        className="mt-2 bg-blue-500 px-4 py-2 rounded"
                        onPress={refreshRecommendations}
                      >
                        <Text className="text-white">Thử lại</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : recommendedPhotographers.length > 0 ? (
                  recommendedPhotographers.map(renderPhotographerCard)
                ) : (
                  <View className="flex-1 items-center justify-center py-8">
                    <Text className="text-stone-500 text-center">
                      {!currentUserId 
                        ? 'Vui lòng đăng nhập để xem gợi ý theo style'
                        : 'Chưa có gợi ý theo style cho bạn'}
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </>
        )}

        {/* LOCATIONS SECTION */}
        {selectedCategory === 'locations' && (
          <View className="px-6 py-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xl font-semibold text-stone-900">
                Địa điểm được yêu thích
              </Text>
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => navigation.navigate('ViewAllLocations')}
              >
                <Ionicons name="chevron-forward" size={20} color="#57534e" />
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {locationsLoading ? (
                renderLoadingSkeleton()
              ) : locations.length > 0 ? (
                locations.map((location) => (
                  <View
                    key={location.locationId}
                    style={{ width: getResponsiveSize(260), marginRight: 12 }}
                  >
                    <LocationCard
                      locationId={location.locationId}
                      name={location.name}
                      images={location.images}
                      address={location.address}
                      hourlyRate={location.hourlyRate}
                      capacity={location.capacity}
                      availabilityStatus={location.availabilityStatus}
                      styles={location.styles}
                      isFavorite={isFavorite(location.id, 'location')}
                      onFavoriteToggle={() => toggleFavorite({
                        id: location.id,
                        type: 'location',
                        data: location
                      })}
                    />
                  </View>
                ))
              ) : (
                <View className="flex-1 items-center justify-center py-8">
                  <Text className="text-stone-500 text-center">
                    Không có địa điểm nào
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}

        {/* SERVICES SECTION */}
        {selectedCategory === 'services' && (
          <View className="px-6 py-4">
            <Text className="text-xl font-semibold text-stone-900 mb-4">
              Dịch vụ khác
            </Text>
            <View className="h-48 bg-stone-100 rounded-2xl flex items-center justify-center">
              <Text className="text-stone-500">Đang phát triển...</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}