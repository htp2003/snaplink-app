import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  StatusBar,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList, GooglePlaceDisplay } from "../../navigation/types";
import { getResponsiveSize } from "../../utils/responsive";
import { useNavigation } from "@react-navigation/native";

// Components
import CategoryTabs, { CategoryItem } from "../../components/CategoryTabs";
import { SearchBar } from "../../components/SearchBar";
import LocationsTab from "src/components/CustomerHome/LocationsTab";

import EventsTab from "src/components/CustomerHome/EventsTab";
import PhotographersTab from "src/components/CustomerHome/PhotographersTab";


type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function CustomerHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selectedCategory, setSelectedCategory] = useState<string>("locations");

  // Categories memo
  const categories = useMemo(
    (): CategoryItem[] => [
      { id: "locations", icon: "location", label: "Địa điểm" },
      { id: "photographers", icon: "camera", label: "Thợ chụp ảnh" },
      { id: "events", icon: "time-outline", label: "Sự kiện" },
    ],
    []
  );

  // Enhanced Handle nearby results from SearchBar
  const handleNearbyResults = useCallback((results: { appLocations: any[]; googlePlaces: any[] }) => {
    console.log('🔍 Received nearby results from SearchBar:', {
      appLocations: results.appLocations.length,
      googlePlaces: results.googlePlaces.length
    });
  }, []);

  // Category press handler
  const handleCategoryPress = useCallback(
    (categoryId: string) => {
      setSelectedCategory(categoryId);
    },
    []
  );

  // Handle location selection from search
  const handleLocationSelect = useCallback((result: any) => {
    if (result.type === 'app_location') {
      navigation.navigate('LocationCardDetail', {
        locationId: result.data.locationId.toString(),
      });
    } else if (result.type === 'google_place') {
      navigation.navigate('LocationCardDetail', {
        locationId: undefined,
        externalLocation: {
          placeId: result.data.placeId,
          name: result.data.name,
          address: result.data.address,
          latitude: result.data.latitude,
          longitude: result.data.longitude,
          rating: result.data.rating,
          types: result.data.types || [],
          photoReference: undefined,
        } as GooglePlaceDisplay,
      });
    }
  }, [navigation]);

  // Render current tab content
  const renderTabContent = () => {
    switch (selectedCategory) {
      case "locations":
        return <LocationsTab navigation={navigation} />;
      case "photographers":
        return <PhotographersTab navigation={navigation} />;
      case "events":
        return <EventsTab navigation={navigation} />;
      default:
        return <LocationsTab navigation={navigation} />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar backgroundColor="white" barStyle="dark-content" />

      {/* Enhanced Search Bar */}
      <View className="bg-white border-b border-gray-100">
        <View className="pt-2 pb-4">
          <SearchBar
            onLocationSelect={handleLocationSelect}
            onNearbyResults={handleNearbyResults}
            showGPSOptions={true}
          />
        </View>
      </View>

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
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}