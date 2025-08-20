import React, { useState } from "react";
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
    // 🆕 Thêm props mới
    distance?: number;
    rating?: number;
    source?: string;
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
    isFavorite,
    // 🆕 Destructure props mới
    distance,
    rating,
    source
}) => {
    const navigation = useNavigation<RootStackNavigationProp>();
    const [imageError, setImageError] = useState(false);

    const handlePress = () => {
        navigation.navigate('LocationCardDetail', { locationId: locationId.toString() });
    }

    // Helper function để format price
    const formatPrice = (price?: number) => {
        if (!price || price === 0) return 'Miễn phí';
        return `${price.toLocaleString()}đ`;
    };

    // 🆕 Helper function để format distance
    const formatDistance = (dist?: number) => {
        if (!dist) return null;
        return dist < 1 ? `${(dist * 1000).toFixed(0)}m` : `${dist.toFixed(1)}km`;
    };

    // Lấy ảnh đã được validate
    const mainImage = images[0];

    // Helper function to get image source
    const getImageSource = (img: any) => {
        if (typeof img === 'string') {
            return { uri: img };
        }
        return img;
    };

    // Handle image load error
    const handleImageError = (error: any) => {
        setImageError(true);
    };

    const displayName = name || 'Location';
    const locationInfo = address || 'Địa điểm chụp ảnh';

    // Thay đổi function handleBookLocation
    const handleBookLocation = () => {
        const locationData: any = {
            locationId,
            name,
            address,
            hourlyRate,
            imageUrl: images?.[0]?.uri || images?.[0],
            capacity,
            styles: styles || [],
            indoor: true,
            outdoor: true,
        };
        (navigation as any).navigate('Booking', {
            location: locationData,
        });
    };

    return (
        <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100"
            style={{ height: getResponsiveSize(380) }}
        >
            {/* Header với Main Image */}
            <TouchableOpacity onPress={handlePress} className="relative">
                <Image
                    source={getImageSource(mainImage)}
                    style={{ width: '100%', height: getResponsiveSize(180) }}
                    className="bg-stone-200"
                    resizeMode="cover"
                    onError={handleImageError}
                    onLoad={() => {
                        console.log(`✅ Image loaded successfully for location ${locationId}`);
                    }}
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

                {/* 🆕 Distance Badge */}
                {distance !== undefined && (
                    <View
                        className="absolute top-3 left-3 bg-blue-500/90 rounded-full"
                        style={{
                            paddingHorizontal: getResponsiveSize(8),
                            paddingVertical: getResponsiveSize(4)
                        }}
                    >
                        <Text
                            className="text-white font-medium"
                            style={{ fontSize: getResponsiveSize(10) }}
                        >
                            📍 {formatDistance(distance)}
                        </Text>
                    </View>
                )}

                {/* 🆕 Source Badge (for external locations) */}
                {source === 'external' && (
                    <View
                        className="absolute bottom-3 left-3 bg-purple-500/90 rounded-full"
                        style={{
                            paddingHorizontal: getResponsiveSize(8),
                            paddingVertical: getResponsiveSize(4)
                        }}
                    >
                        <Text
                            className="text-white font-medium"
                            style={{ fontSize: getResponsiveSize(10) }}
                        >
                            🌍 Google
                        </Text>
                    </View>
                )}

                {/* Availability Badge */}
                {availabilityStatus && availabilityStatus.toLowerCase() === 'available' && !distance && (
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
            <View style={{ padding: getResponsiveSize(8), flex: 1, justifyContent: 'space-between' }}>
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

                    {/* 🆕 Rating - Sử dụng prop rating thay vì hardcode */}
                    <View className="flex-row items-center bg-stone-50 rounded-full px-3 py-1">
                        <Ionicons name="star" size={getResponsiveSize(14)} color="#d97706" />
                        <Text
                            className="text-stone-700 font-medium ml-1"
                            style={{ fontSize: getResponsiveSize(12) }}
                        >
                            {rating ? rating.toFixed(1) : '4.5'}
                        </Text>
                    </View>

                    {/* Price indicator */}
                    <View className="flex-row items-center bg-stone-50 rounded-full px-3 py-1">
                        <Ionicons name="cash-outline" size={getResponsiveSize(14)} color="#57534e" />
                        <Text
                            className="text-stone-700 font-medium ml-1"
                            style={{ fontSize: getResponsiveSize(12) }}
                        >
                            {hourlyRate ? `${Math.floor(hourlyRate / 1000)}K` : 'TBD'}
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
                    <View className="flex-1">
                        {hourlyRate && hourlyRate > 0 ? (
                            <View className="flex-row items-baseline">
                                <Text
                                    className="text-stone-900 font-semibold"
                                    style={{ fontSize: getResponsiveSize(16) }}
                                >
                                    {formatPrice(hourlyRate)}
                                </Text>
                                <Text
                                    className="text-stone-600"
                                    style={{
                                        fontSize: getResponsiveSize(14),
                                        marginLeft: getResponsiveSize(4)
                                    }}
                                >
                                    / giờ
                                </Text>
                            </View>
                        ) : (
                            <Text
                                className="text-stone-900 font-semibold"
                                style={{ fontSize: getResponsiveSize(16) }}
                            >
                                {formatPrice(hourlyRate)}
                            </Text>
                        )}
                    </View>

                    <TouchableOpacity
                        className={`rounded-full px-4 py-2 ${availabilityStatus?.toLowerCase() === 'unavailable'
                            ? 'bg-stone-200'
                            : 'bg-emerald-500'
                            }`}
                        onPress={handleBookLocation}
                        disabled={availabilityStatus?.toLowerCase() === 'unavailable'}
                    >
                        <Text
                            className={`font-medium ${availabilityStatus?.toLowerCase() === 'unavailable'
                                ? 'text-stone-500'
                                : 'text-white'
                                }`}
                            style={{ fontSize: getResponsiveSize(12) }}
                        >
                            {availabilityStatus?.toLowerCase() === 'unavailable' ? 'Unavailable' : 'Đặt lịch ngay'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

export default LocationCard;