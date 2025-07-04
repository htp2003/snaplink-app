import React, { useEffect, useState } from 'react';
import { View, Text, Alert, RefreshControl } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useNavigation } from '@react-navigation/native';

import { usePhotographers } from '../../hooks/usePhotographers';

import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView } from 'react-native';
import { getResponsiveSize } from '../../utils/responsive';

import { useFavorites } from '../../hooks/useFavorites';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import { LoadingCard } from '../../components/ProifileCard/LoadingCard';
import { ErrorCard } from '../../components/ProifileCard/ErrorCard';
import LocationCard from '../../components/LocationCard/LocationCard';
import { useLocations } from '../../hooks/useLocations';
import PhotographerCard from '../../components/ProifileCard/PhotographerCard';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ForyouContent() {
    const navigation = useNavigation<NavigationProp>();
    const {
        photographers,
        loading: photographersLoading,
        error: photographersError,
        fetchFeaturedPhotographers,
        refreshPhotographers
    } = usePhotographers();

    const { 
        locations,
        loading: locationsLoading,
        error: locationsError,
        refreshLocations 
    } = useLocations();

    const { isFavorite, toggleFavorite, refetch } = useFavorites();

    const [refreshing, setRefreshing] = useState(false);

    // Load featured photographers when component mounts
    useEffect(() => {
        fetchFeaturedPhotographers();
    }, []);

    // Handle API errors
    useEffect(() => {
        if (photographersError) {
            Alert.alert(
                'Error',
                `Failed to load photographers: ${photographersError}`,
                [
                    {
                        text: 'Retry',
                        onPress: () => fetchFeaturedPhotographers()
                    },
                    {
                        text: 'OK',
                        style: 'cancel'
                    }
                ]
            );
        }
    }, [photographersError, fetchFeaturedPhotographers]);

    // Handle location errors
    useEffect(() => {
        if (locationsError) {
            Alert.alert(
                'Error',
                `Failed to load locations: ${locationsError}`,
                [
                    {
                        text: 'Retry',
                        onPress: () => refreshLocations()
                    },
                    {
                        text: 'OK',
                        style: 'cancel'
                    }
                ]
            );
        }
    }, [locationsError, refreshLocations]);

    // Đồng bộ lại danh sách favorites mỗi khi màn hình được focus
    useFocusEffect(
        useCallback(() => {
            refetch();
        }, [])
    );

    // Handle pull to refresh
    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchFeaturedPhotographers(),
                refreshLocations(),
                refetch()
            ]);
        } catch (error) {
            console.error('Error refreshing data:', error);
        } finally {
            setRefreshing(false);
        }
    }, [fetchFeaturedPhotographers, refreshLocations, refetch]);

    if (photographersLoading && locationsLoading) {
        return (
            <View className='flex-1 items-center justify-center'>
                <Text className='text-white'>Loading...</Text>
            </View>
        )
    }

    return (
        <ScrollView
            className='flex-1'
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor="white"
                />
            }
        >
            {/* Photographers Section */}
            <View className="mt-4 px-4">
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-white text-xl font-bold">Featured Photographers</Text>
                    <TouchableOpacity
                        className="flex-row items-center"
                        onPress={() => navigation.navigate('ViewAllPhotographers')}
                    >
                        <Text className="text-white mr-1">View all</Text>
                        <Ionicons name="chevron-forward" size={getResponsiveSize(16)} color="white" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: getResponsiveSize(16) }}
                >
                    {photographersLoading ? (
                        // Show loading cards
                        [1, 2, 3].map((_, index) => (
                            <View key={`loading-${index}`} style={{ marginRight: getResponsiveSize(12) }}>
                                <LoadingCard />
                            </View>
                        ))
                    ) : photographersError ? (
                        // Show error card
                        <ErrorCard
                            message={photographersError}
                            onRetry={fetchFeaturedPhotographers}
                        />
                    ) : photographers.length > 0 ? (
                        // Show actual data
                        photographers.map((photographer) => (
                            <View
                                key={photographer.id}
                                style={{ width: getResponsiveSize(300), marginRight: getResponsiveSize(12) }}
                            >
                                <PhotographerCard
                                    id={photographer.id}
                                    fullName={photographer.fullName}
                                    avatar={photographer.avatar}
                                    images={photographer.images}
                                    styles={photographer.styles}
                                    rating={photographer.rating}
                                    hourlyRate={photographer.hourlyRate}
                                    availabilityStatus={photographer.availabilityStatus}
                                    // yearsExperience={profile.yearsExperience}
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
                        ))
                    ) : (
                        // Show empty state
                        <View className="flex-1 items-center justify-center py-8 w-full">
                            <Text className="text-white/60 text-center mb-4">
                                No featured photographers available
                            </Text>
                            <TouchableOpacity
                                onPress={fetchFeaturedPhotographers}
                                className="px-6 py-3 bg-blue-500 rounded-lg"
                            >
                                <Text className="text-white font-semibold">Refresh</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </View>

            {/* Location Section */}
            <View className="mt-4 px-4">
                <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-white text-xl font-bold">Featured Locations</Text>
                    <TouchableOpacity
                        className="flex-row items-center"
                        onPress={() => navigation.navigate('ViewAllLocations')}
                    >
                        <Text className="text-white mr-1">View all</Text>
                        <Ionicons name="chevron-forward" size={getResponsiveSize(16)} color="white" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ paddingRight: getResponsiveSize(16) }}
                >
                    {locationsLoading ? (
                        // Show loading cards
                        [1, 2, 3].map((_, index) => (
                            <View key={`loading-${index}`} style={{ marginRight: getResponsiveSize(12) }}>
                                <LoadingCard />
                            </View>
                        ))
                    ) : locationsError ? (
                        // Show error card
                        <ErrorCard
                            message={locationsError}
                            onRetry={refreshLocations}
                        />
                    ) : locations.length > 0 ? (
                        // Show actual data
                        locations.map((location) => (
                            <View
                                key={location.locationId}
                                style={{ width: getResponsiveSize(300), marginRight: getResponsiveSize(12) }}
                            >
                                <LocationCard
                                    locationId={location.locationId}
                                    name={location.name}
                                    images={location.images} // Truyền tất cả ảnh, LocationCard sẽ tự xử lý
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
                        // Show empty state
                        <View className="flex-1 items-center justify-center py-8 w-full">
                            <Text className="text-white/60 text-center mb-4">
                                No featured locations available
                            </Text>
                            <TouchableOpacity
                                onPress={refreshLocations}
                                className="px-6 py-3 bg-blue-500 rounded-lg"
                            >
                                <Text className="text-white font-semibold">Refresh</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </View>
        </ScrollView>
    )
}