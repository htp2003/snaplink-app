import React from "react";
import { View, Image, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { getResponsiveSize } from "../../utils/responsive";
import { Ionicons } from "@expo/vector-icons";

type PhotographerCardProps = {
    id: string;
    fullName: string;
    avatar: any;
    images: any[];
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

    // Lấy ảnh chính để hiển thị (ưu tiên images[0], fallback là avatar, hoặc placeholder)
    const fallbackImages = [
        'https://images.unsplash.com/photo-1554048612-b6eb0d27b92e?w=400&h=300&fit=crop', // Portrait photographer
        'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=400&h=300&fit=crop', // Wedding photographer  
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop', // Male photographer
        'https://images.unsplash.com/photo-1494790108755-2616b612b494?w=400&h=300&fit=crop', // Female photographer
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=300&fit=crop', // Professional photographer
    ];

    // Logic để chọn ảnh hiển thị
    let mainImage;
    if (images.length > 0) {
        mainImage = images[0]; // Ưu tiên ảnh từ API
    } else if (avatar) {
        mainImage = avatar; // Fallback về avatar
    } else {
        // Random placeholder image để test đa dạng
        const randomIndex = Math.abs(id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % fallbackImages.length;
        mainImage = fallbackImages[randomIndex];
    }

    const displayName = fullName || 'Photographer';
    const specialty = styles.length > 0 ? styles[0] : 'Professional Photographer';

    return (
        <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {/* Main Image */}
            <TouchableOpacity onPress={handlePress} className="relative">
                <Image
                    source={typeof mainImage === 'string' ? { uri: mainImage } : mainImage}
                    style={{ width: '100%', height: getResponsiveSize(240) }}
                    className="bg-stone-200"
                    resizeMode="cover"
                    onError={() => console.log('Failed to load main image')}
                />
                
                {/* Favorite Button */}
                <TouchableOpacity
                    className="absolute top-3 right-3"
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

                {/* Guest favorite badge (like in sample) */}
                <View 
                    className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-full"
                    style={{ 
                        paddingHorizontal: getResponsiveSize(12), 
                        paddingVertical: getResponsiveSize(4) 
                    }}
                >
                    <Text 
                        className="text-stone-800 font-medium"
                        style={{ fontSize: getResponsiveSize(12) }}
                    >
                        Được khách yêu thích
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Card Content */}
            <View style={{ padding: getResponsiveSize(4)}}>
                {/* Name and Specialty */}
                <View style={{ marginBottom: getResponsiveSize(8) }}>
                    <Text 
                        className="text-stone-900 font-medium leading-tight" 
                        style={{ fontSize: getResponsiveSize(16) }}
                        numberOfLines={1}
                    >
                        {displayName}
                    </Text>
                    <Text 
                        className="text-stone-600" 
                        style={{ fontSize: getResponsiveSize(14), marginTop: getResponsiveSize(4) }}
                        numberOfLines={1}
                    >
                        {specialty}
                    </Text>
                </View>

                {/* Additional info - can show experience or location */}
                {yearsExperience && (
                    <Text 
                        className="text-stone-600"
                        style={{ 
                            fontSize: getResponsiveSize(14), 
                            marginBottom: getResponsiveSize(8) 
                        }}
                    >
                        {yearsExperience} năm kinh nghiệm
                    </Text>
                )}

                {/* Price and Rating */}
                <View className="flex-row items-center justify-between">
                    <View>
                        <Text className="text-stone-600" style={{ fontSize: getResponsiveSize(14) }}>
                            <Text 
                                className="text-stone-900 font-semibold"
                                style={{ fontSize: getResponsiveSize(14) }}
                            >
                                {formatPrice(hourlyRate)}
                            </Text> / giờ
                        </Text>
                    </View>
                    {renderRating(rating)}
                </View>
            </View>
        </View>
    );
}

export default PhotographerCard;