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
    const avatarSize = getResponsiveSize(80);
    const navigation = useNavigation<RootStackNavigationProp>();
    
    const handlePress = () => {
        navigation.navigate('LocationCardDetail', { locationId: locationId.toString() });
    }

    // Helper function để format price
    const formatPrice = (price?: number) => {
        if (!price) return 'Contact for price';
        return `$${price.toLocaleString()}/hr`;
    };

    // Helper function để render availability status
    const getAvailabilityColor = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'available':
                return '#10B981'; // green
            case 'busy':
                return '#F59E0B'; // yellow
            case 'unavailable':
                return '#EF4444'; // red
            default:
                return '#6B7280'; // gray
        }
    };

    // Helper function to get image source
    const getImageSource = (img: any) => {
        if (typeof img === 'string') {
            return { uri: img };
        }
        return img;
    };

    // Handle images from API
    const allImages = images.length > 0 ? images : [
        'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300',
        'https://images.unsplash.com/photo-1497486751825-1233686d5d80?w=300',
        'https://images.unsplash.com/photo-1540518614846-7eded47c9eb8?w=300',
        'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=300',
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=300', // Thêm ảnh thứ 5 để có đủ
    ];

    // Get avatar image (first image)
    const avatarImage = allImages[0];
    
    // Get 4 images for grid (images 2-5, skip the first one used for avatar)
    let gridImages = allImages.slice(1, 5);
    
    // Ensure we have exactly 4 images for grid
    while (gridImages.length < 4) {
        gridImages.push(...allImages.slice(0, 4 - gridImages.length));
    }
    gridImages = gridImages.slice(0, 4); 
    return (
        <TouchableOpacity onPress={handlePress} className="rounded-2xl items-center mt-4 relative border border-[#32FAE9]/20 bg-gray-900/50">
            <View className="w-full">
                {/* 4 images grid (images 2-5, excluding avatar) */}
                <View className="w-full flex-row flex-wrap justify-between gap-1 p-2">
                    {gridImages.map((img, index) => (
                        <View
                            key={index}
                            className="w-[49%] aspect-square rounded-lg"
                        >
                            <Image
                                source={getImageSource(img)}
                                className="w-full h-full rounded-lg"
                                resizeMode="cover"
                                onError={() => console.log(`Failed to load grid image ${index + 1}:`, img)}
                            />
                        </View>
                    ))}
                </View>

                {/* Availability Status Badge */}
                {availabilityStatus && (
                    <View
                        style={{
                            position: 'absolute',
                            top: getResponsiveSize(10),
                            left: getResponsiveSize(10),
                            backgroundColor: getAvailabilityColor(availabilityStatus),
                            borderRadius: getResponsiveSize(12),
                            paddingHorizontal: getResponsiveSize(8),
                            paddingVertical: getResponsiveSize(4),
                            zIndex: 10,
                        }}
                    >
                        <Text className="text-white text-xs font-medium capitalize">
                            {availabilityStatus}
                        </Text>
                    </View>
                )}

                {/* Favorite Button */}
                <TouchableOpacity
                    style={{
                        position: 'absolute',
                        top: getResponsiveSize(10),
                        right: getResponsiveSize(10),
                        zIndex: 10,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        borderRadius: getResponsiveSize(15),
                        padding: getResponsiveSize(5),
                    }}
                    onPress={onFavoriteToggle}
                >
                    <Ionicons
                        name={isFavorite ? "heart" : "heart-outline"}
                        size={getResponsiveSize(20)}
                        color={isFavorite ? "#FF375F" : "white"}
                    />
                </TouchableOpacity>

                {/* Avatar - First image from locationImages */}
                <View
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        alignItems: 'center',
                        transform: [{ translateY: avatarSize / 2 }],
                        zIndex: 10,
                    }}
                >
                    <View className="relative">
                        <View
                            style={{
                                width: avatarSize,
                                height: avatarSize,
                                borderRadius: avatarSize / 2,
                                borderWidth: 3,
                                borderColor: '#232449',
                                backgroundColor: '#1a1a2e',
                                overflow: 'hidden', // Để ảnh không bị tràn ra ngoài
                            }}
                        >
                            {avatarImage ? (
                                <Image
                                    source={getImageSource(avatarImage)}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                    }}
                                    resizeMode="cover"
                                    onError={() => {
                                        console.log('Failed to load avatar image, falling back to icon');
                                    }}
                                />
                            ) : (
                                // Fallback to icon if no image
                                <View 
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: '#1a1a2e',
                                    }}
                                >
                                    <Ionicons name="location" size={getResponsiveSize(40)} color="#32FAE9" />
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            <View style={{ height: avatarSize / 2 + 20 }} />

            {/* Name */}
            <Text className="text-white text-xl font-bold text-center mb-1" numberOfLines={2}>
                {name}
            </Text>

            {/* Address */}
            {address && (
                <Text className="text-gray-400 text-sm text-center mb-3 px-2" numberOfLines={2}>
                    {address}
                </Text>
            )}

            {/* Capacity and Rate */}
            <View className="flex-row items-center justify-center mb-3 space-x-4">
                {capacity && (
                    <View className="flex-row items-center">
                        <Ionicons name="people-outline" size={getResponsiveSize(14)} color="#32FAE9" />
                        <Text className="text-white/80 text-sm ml-1">
                            {capacity} people
                        </Text>
                    </View>
                )}
                {hourlyRate !== undefined && hourlyRate !== null && (
                    <View className="flex-row items-center">
                        <Ionicons name="cash-outline" size={getResponsiveSize(14)} color="#32FAE9" />
                        <Text className="text-white/80 text-sm ml-1">
                            {formatPrice(hourlyRate)}
                        </Text>
                    </View>
                )}
            </View>

            {/* Amenities */}
            <View className="flex-row justify-center flex-wrap gap-2 mb-5 px-2">
                {styles && styles.length > 0 ? (
                    styles.slice(0, 3).map((amenity, idx) => (
                        <TouchableOpacity
                            key={idx}
                            className="bg-white/10 px-3 py-1 rounded-full"
                        >
                            <Text className="text-white font-medium text-xs">{amenity}</Text>
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text className="text-white/60 text-sm">No amenities listed</Text>
                )}
                {styles && styles.length > 3 && (
                    <TouchableOpacity className="bg-white/10 px-3 py-1 rounded-full">
                        <Text className="text-white font-medium text-xs">
                            +{styles.length - 3} more
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Booking button */}
            {onBooking && (
                <TouchableOpacity
                    className="bg-green-500 px-8 py-3 rounded-full mb-3 shadow-lg"
                    onPress={onBooking}
                    disabled={availabilityStatus?.toLowerCase() === 'unavailable'}
                    style={{
                        opacity: availabilityStatus?.toLowerCase() === 'unavailable' ? 0.5 : 1
                    }}
                >
                    <Text className="text-white font-semibold text-base">
                        {availabilityStatus?.toLowerCase() === 'unavailable' ? 'Unavailable' : 'Book Location'}
                    </Text>
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
}

export default LocationCard;