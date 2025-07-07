import React from "react";
import { View, Image, Text, TouchableOpacity, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { Ionicons } from "@expo/vector-icons";
import { getResponsiveSize } from "../../utils/responsive";

type LocationCardProps = {
    locationId: number;
    name: string;
    images: any[];
    styles?: string[]; 
    address?: string;
    description?: string;
    hourlyRate?: number;
    capacity?: number;
    availabilityStatus?: string;
    onBooking?: () => void;
    onFavoriteToggle: () => void;
    isFavorite: boolean;
}

const LocationCard: React.FC<LocationCardProps> = ({
    locationId,
    name,
    images,
    styles = [],
    address,
    description,
    hourlyRate,
    capacity,
    availabilityStatus,
    onBooking,
    onFavoriteToggle,
    isFavorite
}) => {
    const navigation = useNavigation<RootStackNavigationProp>();
    
    const handlePress = () => {
        navigation.navigate('LocationCardDetail', { locationId: locationId.toString() });
    }

    // Helper function để format price
    const formatPrice = (price?: number) => {
        if (!price) return 'Liên hệ để biết giá';
        return `₫${price.toLocaleString()}`;
    };

    // Handle images from API
    const fallbackImages = [
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1540518614846-7eded47c9eb8?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=400&h=300&fit=crop',
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
    ];

    // Get all images for display
    const allImages = images.length > 0 ? images : fallbackImages;
    const mainImage = allImages[0];
    
    // Get 4 images for grid (skip main image if we have enough)
    const gridImages = allImages.length > 4 
        ? allImages.slice(1, 5) 
        : allImages.slice(0, 4);

    // Helper function to get image source
    const getImageSource = (img: any) => {
        if (typeof img === 'string') {
            return { uri: img };
        }
        return img;
    };

    const displayName = name || 'Location';
    const locationInfo = address || 'Địa điểm chụp ảnh';

    return (
        <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100">
            {/* Header với Main Image */}
            <TouchableOpacity onPress={handlePress} className="relative">
                <Image
                    source={getImageSource(mainImage)}
                    style={{ width: '100%', height: getResponsiveSize(180) }}
                    className="bg-stone-200"
                    resizeMode="cover"
                />
                
                {/* Favorite Button */}
                <TouchableOpacity
                    className="absolute top-3 right-3 bg-black/30 rounded-full"
                    style={{ padding: getResponsiveSize(6) }}
                    onPress={onFavoriteToggle}
                >
                    <Ionicons
                        name={isFavorite ? "heart" : "heart-outline"}
                        size={getResponsiveSize(20)}
                        color={isFavorite ? "#ef4444" : "white"}
                    />
                </TouchableOpacity>

                {/* Availability Badge */}
                {availabilityStatus && availabilityStatus.toLowerCase() === 'available' && (
                    <View 
                        className="absolute top-3 left-3 bg-emerald-500 rounded-full"
                        style={{ 
                            paddingHorizontal: getResponsiveSize(8), 
                            paddingVertical: getResponsiveSize(4) 
                        }}
                    >
                        <Text 
                            className="text-white font-medium"
                            style={{ fontSize: getResponsiveSize(10) }}
                        >
                            Available
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
            {/* Content area */}
            <View style={{ padding: getResponsiveSize(8) }}>
                {/* Title và thông tin cơ bản */}
                <View style={{ marginBottom: getResponsiveSize(12) }}>
                    <Text 
                        className="text-stone-900 font-semibold" 
                        style={{ fontSize: getResponsiveSize(17) }}
                        numberOfLines={1}
                    >
                        {displayName}
                    </Text>
                    <Text 
                        className="text-stone-600" 
                        style={{ fontSize: getResponsiveSize(14), marginTop: getResponsiveSize(2) }}
                        numberOfLines={1}
                    >
                        {locationInfo}
                    </Text>
                </View>

                {/* Stats row */}
                <View className="flex-row items-center justify-between mb-3">
                    {/* Capacity */}
                    {capacity && (
                        <View className="flex-row items-center bg-stone-50 rounded-full px-3 py-1">
                            <Ionicons name="people-outline" size={getResponsiveSize(14)} color="#57534e" />
                            <Text 
                                className="text-stone-700 font-medium ml-1"
                                style={{ fontSize: getResponsiveSize(12) }}
                            >
                                {capacity}
                            </Text>
                        </View>
                    )}

                    {/* Rating */}
                    <View className="flex-row items-center bg-stone-50 rounded-full px-3 py-1">
                    
                    </View>

                    {/* Price indicator */}
                    <View className="flex-row items-center bg-stone-50 rounded-full px-3 py-1">
                        <Ionicons name="cash-outline" size={getResponsiveSize(14)} color="#57534e" />
                        <Text 
                            className="text-stone-700 font-medium ml-1"
                            style={{ fontSize: getResponsiveSize(12) }}
                        >
                            {hourlyRate ? `${Math.floor(hourlyRate/1000)}K` : 'TBD'}
                        </Text>
                    </View>
                </View>

                {/* Amenities */}
                <View className="flex-row flex-wrap gap-2 mb-4">
                    {styles && styles.length > 0 ? (
                        styles.slice(0, 3).map((amenity, idx) => (
                            <View
                                key={idx}
                                className="bg-amber-50 border border-amber-200 rounded-full"
                                style={{ 
                                    paddingHorizontal: getResponsiveSize(10), 
                                    paddingVertical: getResponsiveSize(4) 
                                }}
                            >
                                <Text 
                                    className="text-amber-700 font-medium"
                                    style={{ fontSize: getResponsiveSize(11) }}
                                >
                                    {amenity}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <View className="bg-stone-50 rounded-full px-3 py-1">
                            <Text 
                                className="text-stone-500"
                                style={{ fontSize: getResponsiveSize(11) }}
                            >
                                Địa điểm chuyên nghiệp
                            </Text>
                        </View>
                    )}
                </View>

                {/* Price và action */}
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text 
                            className="text-stone-900 font-bold"
                            style={{ fontSize: getResponsiveSize(16) }}
                        >
                            {formatPrice(hourlyRate)}
                        </Text>
                        <Text 
                            className="text-stone-500"
                            style={{ fontSize: getResponsiveSize(12) }}
                        >
                            /giờ
                        </Text>
                    </View>

                    {/* Quick book button */}
                    <TouchableOpacity
                        className={`rounded-full px-4 py-2 ${
                            availabilityStatus?.toLowerCase() === 'unavailable' 
                                ? 'bg-stone-200' 
                                : 'bg-emerald-500'
                        }`}
                        onPress={onBooking}
                        disabled={availabilityStatus?.toLowerCase() === 'unavailable'}
                    >
                        <Text 
                            className={`font-medium ${
                                availabilityStatus?.toLowerCase() === 'unavailable'
                                    ? 'text-stone-500'
                                    : 'text-white'
                            }`}
                            style={{ fontSize: getResponsiveSize(12) }}
                        >
                            {availabilityStatus?.toLowerCase() === 'unavailable' ? 'Unavailable' : 'Book Now'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

export default LocationCard;