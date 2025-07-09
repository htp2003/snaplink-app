import React from "react";
import { View, Image, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { getResponsiveSize } from "../../utils/responsive";
import { Ionicons } from "@expo/vector-icons";

type PhotographerCardProps = {
    id: string;
    fullName: string;
    avatar: string; // Đây sẽ là profileImage từ API
    images: string[]; // Mảng images (có thể empty cho list view)
    styles: string[];
    rating?: number;
    hourlyRate?: number;
    availabilityStatus?: string;
    yearsExperience?: number;
    onBooking: () => void;
    onFavoriteToggle: () => void;
    isFavorite: boolean;
}

const PhotographerCard: React.FC<PhotographerCardProps> = ({
    id,
    fullName,
    avatar,
    images,
    styles,
    rating,
    hourlyRate,
    availabilityStatus,
    yearsExperience,
    onBooking,
    onFavoriteToggle,
    isFavorite
}) => {
    const navigation = useNavigation<RootStackNavigationProp>();
    
    const handlePress = () => {
        navigation.navigate('PhotographerCardDetail', { photographerId: id });
    }

    // Helper function để format currency
    const formatPrice = (price?: number) => {
        if (!price) return 'Liên hệ để biết giá';
        return `₫${price.toLocaleString()}`;
    };

    // Helper function để render rating
    const renderRating = (rating?: number) => {
        if (!rating) return (
            <Text 
                className="text-stone-900 font-medium"
                style={{ fontSize: getResponsiveSize(14) }}
            >
                5.0
            </Text>
        );
        
        return (
            <View className="flex-row items-center">
                <Ionicons name="star" size={getResponsiveSize(16)} color="#d97706" />
                <Text 
                    className="text-stone-900 font-medium ml-1"
                    style={{ fontSize: getResponsiveSize(14) }}
                >
                    {rating.toFixed(1)}
                </Text>
            </View>
        );
    };

    
   
// Fallback images nếu không có avatar
const fallbackImages = [
    'https://images.unsplash.com/photo-1554048612-b6eb0d27b92e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1494790108755-2616b612b494?w=400&h=300&fit=crop',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=300&fit=crop',
];

// Sử dụng profileImage làm avatar, fallback nếu không có
const getMainImage = () => {
    if (avatar && avatar !== 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&auto=format&fit=crop&q=80') {
        return avatar;
    }
    
    // Random placeholder image
    const randomIndex = Math.abs(id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % fallbackImages.length;
    return fallbackImages[randomIndex];
};

const mainImage = getMainImage();
const displayName = fullName || 'Photographer';
const specialty = styles.length > 0 ? styles[0] : 'Professional Photographer';

// Check if using real profileImage từ API
const isRealProfileImage = avatar && avatar !== 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&auto=format&fit=crop&q=80';


return (
    <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
        {/* Main Image */}
        <TouchableOpacity onPress={handlePress} className="relative">
            <Image
                source={{ uri: mainImage }}
                style={{ width: '100%', height: getResponsiveSize(240) }}
                className="bg-stone-200"
                resizeMode="cover"
                onError={(error) => {
                    console.log('Failed to load image for photographer:', id, error);
                }}
            />
            
            {/* Favorite Button */}
            <TouchableOpacity
                className="absolute top-3 right-3 bg-black/20 rounded-full"
                style={{ padding: getResponsiveSize(8) }}
                onPress={onFavoriteToggle}
            >
                <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={getResponsiveSize(24)}
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
                        style={{ fontSize: getResponsiveSize(12) }}
                    >
                        Available
                    </Text>
                </View>
            )}

            {/* Profile Badge */}
            <View 
                className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-full flex-row items-center"
                style={{ 
                    paddingHorizontal: getResponsiveSize(8), 
                    paddingVertical: getResponsiveSize(4) 
                }}
            >
                {isRealProfileImage ? (
                    <>
                        <Ionicons 
                            name="checkmark-circle" 
                            size={getResponsiveSize(14)} 
                            color="#10b981" 
                        />
                        <Text 
                            className="text-stone-800 font-medium ml-1"
                            style={{ fontSize: getResponsiveSize(12) }}
                        >
                            Verified Profile
                        </Text>
                    </>
                ) : (
                    <Text 
                        className="text-stone-800 font-medium"
                        style={{ fontSize: getResponsiveSize(12) }}
                    >
                        Professional Photographer
                    </Text>
                )}
            </View>

            {/* Portfolio Badge - chỉ hiển thị nếu có portfolio images */}
            {images && images.length > 0 && (
                <View 
                    className="absolute bottom-3 right-3 bg-black/60 rounded-full flex-row items-center"
                    style={{ 
                        paddingHorizontal: getResponsiveSize(8), 
                        paddingVertical: getResponsiveSize(4) 
                    }}
                >
                    <Ionicons 
                        name="images" 
                        size={getResponsiveSize(12)} 
                        color="white" 
                    />
                    <Text 
                        className="text-white font-medium ml-1"
                        style={{ fontSize: getResponsiveSize(12) }}
                    >
                        {images.length}
                    </Text>
                </View>
            )}
        </TouchableOpacity>

        {/* Card Content */}
        <View style={{ padding: getResponsiveSize(16) }}>
            {/* Name and Specialty */}
            <View style={{ marginBottom: getResponsiveSize(8) }}>
                <Text 
                    className="text-stone-900 font-semibold leading-tight" 
                    style={{ fontSize: getResponsiveSize(16) }}
                    numberOfLines={1}
                >
                    {displayName}
                </Text>
                <Text 
                    className="text-stone-600" 
                    style={{ fontSize: getResponsiveSize(14), marginTop: getResponsiveSize(2) }}
                    numberOfLines={1}
                >
                    {specialty}
                </Text>
            </View>

            {/* Additional info */}
            <View className="flex-row items-center" style={{ marginBottom: getResponsiveSize(8) }}>
                {yearsExperience && (
                    <View className="flex-row items-center mr-4">
                        <Ionicons 
                            name="time-outline" 
                            size={getResponsiveSize(14)} 
                            color="#6b7280" 
                        />
                        <Text 
                            className="text-stone-600 ml-1"
                            style={{ fontSize: getResponsiveSize(13) }}
                        >
                            {yearsExperience} năm
                        </Text>
                    </View>
                )}
                
                {/* Styles count */}
                {styles.length > 0 && (
                    <View className="flex-row items-center">
                        <Ionicons 
                            name="camera-outline" 
                            size={getResponsiveSize(14)} 
                            color="#6b7280" 
                        />
                        <Text 
                            className="text-stone-600 ml-1"
                            style={{ fontSize: getResponsiveSize(13) }}
                        >
                            {styles.length} phong cách
                        </Text>
                    </View>
                )}
            </View>

            {/* Price and Rating */}
            <View className="flex-row items-center justify-between">
                <View className="flex-1">
                    <Text className="text-stone-600" style={{ fontSize: getResponsiveSize(14) }}>
                        <Text 
                            className="text-stone-900 font-semibold"
                            style={{ fontSize: getResponsiveSize(16) }}
                        >
                            {formatPrice(hourlyRate)}
                        </Text>
                        {hourlyRate && (
                            <Text className="text-stone-600"> / giờ</Text>
                        )}
                    </Text>
                </View>
                <View className="flex-row items-center">
                    {renderRating(rating)}
                </View>
            </View>
        </View>
    </View>
);
}

export default PhotographerCard;