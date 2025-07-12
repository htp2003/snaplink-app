import React, { useState } from "react";
import { View, Image, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { getResponsiveSize } from "../../utils/responsive";
import { Ionicons } from "@expo/vector-icons";

type PhotographerCardProps = {
    id: string;
    fullName: string;
    avatar: string; // Avatar từ User API (profileImage)
    styles: string[];
    rating?: number;
    hourlyRate?: number;
    availabilityStatus?: string;
    yearsExperience?: number;
    equipment?: string;
    verificationStatus?: string;
    onBooking: () => void;
    onFavoriteToggle: () => void;
    isFavorite: boolean;
}

const PhotographerCard: React.FC<PhotographerCardProps> = ({
    id,
    fullName,
    avatar,
    styles,
    rating,
    hourlyRate,
    availabilityStatus,
    yearsExperience,
    equipment,
    verificationStatus,
    onBooking,
    onFavoriteToggle,
    isFavorite
}) => {
    const navigation = useNavigation<RootStackNavigationProp>();

    const handlePress = () => {
        console.log('=== PhotographerCard handlePress ===');
        console.log('Navigating to detail with photographerId:', id);
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



    // State cho fallback handling
    const [imageError, setImageError] = useState(false);
    const [fallbackIndex, setFallbackIndex] = useState(0);

    // Lấy ảnh main để hiển thị - chỉ dùng avatar từ User API
    const getMainImage = () => {
        console.log('🖼️ Getting main image for photographer:', id);
        console.log('Avatar received:', avatar);
        console.log('Image error state:', imageError);

        // Nếu có lỗi image, dùng fallback
        if (imageError) {
            console.log('Using fallback due to image error');
            return '';
        }

        // Nếu có avatar (kể cả fallback URL), dùng nó
        if (avatar) {
            console.log('Using provided avatar:', avatar);
            return avatar;
        }

        // ✅ FIXED: Fallback cuối cùng nếu không có avatar
        console.log('No avatar provided, using default fallback');
        return '';
    };

    // Handle image error
    const handleImageError = (error: any) => {
        console.log('Failed to load avatar for photographer:', id);
        console.log('Error details:', error?.nativeEvent?.error || 'Unknown error');

        // Set error state và thử fallback image khác
        setImageError(true);
    };

    const mainImage = getMainImage();
    const displayName = fullName || 'Photographer';
    const specialty = styles.length > 0 ? styles[0] : 'Professional Photographer';

    // Check nếu có profile image thật từ User API
    const hasRealProfileImage = avatar &&
        avatar !== '' &&
        !imageError;

    return (
        <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
            {/* Main Image - Avatar từ User API */}
            <TouchableOpacity onPress={handlePress} className="relative">
                <Image
                    source={{ uri: mainImage }}
                    style={{ width: '100%', height: getResponsiveSize(240) }}
                    className="bg-stone-200"
                    resizeMode="cover"
                    onError={handleImageError}
                    key={`${id}-${imageError ? fallbackIndex : 'original'}`}
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

                {/* Verification Badge */}
                {verificationStatus && verificationStatus.toLowerCase() === 'verified' && (
                    <View
                        className="absolute bottom-3 left-3 bg-blue-500/90 backdrop-blur-sm rounded-full flex-row items-center"
                        style={{
                            paddingHorizontal: getResponsiveSize(8),
                            paddingVertical: getResponsiveSize(4)
                        }}
                    >
                        <Ionicons
                            name="checkmark-circle"
                            size={getResponsiveSize(14)}
                            color="white"
                        />
                        <Text
                            className="text-white font-medium ml-1"
                            style={{ fontSize: getResponsiveSize(12) }}
                        >
                            Verified
                        </Text>
                    </View>
                )}

                {/* Profile Status Badge */}
                <View
                    className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-full flex-row items-center"
                    style={{
                        paddingHorizontal: getResponsiveSize(8),
                        paddingVertical: getResponsiveSize(4)
                    }}
                >
                    {hasRealProfileImage ? (
                        <>
                            <Ionicons
                                name="person-circle"
                                size={getResponsiveSize(14)}
                                color="#10b981"
                            />
                            <Text
                                className="text-stone-800 font-medium ml-1"
                                style={{ fontSize: getResponsiveSize(12) }}
                            >
                                Profile
                            </Text>
                        </>
                    ) : (
                        <Text
                            className="text-stone-800 font-medium"
                            style={{ fontSize: getResponsiveSize(12) }}
                        >
                            Professional
                        </Text>
                    )}
                </View>
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
                            {styles.length > 0 ? `${styles.length} phong cách` : 'Photographer'}
                        </Text>
                    </View>
                </View>

                {/* Equipment info */}
                {equipment && (
                    <View className="flex-row items-center" style={{ marginBottom: getResponsiveSize(8) }}>
                        <Ionicons
                            name="hardware-chip-outline"
                            size={getResponsiveSize(14)}
                            color="#6b7280"
                        />
                        <Text
                            className="text-stone-600 ml-1"
                            style={{ fontSize: getResponsiveSize(13) }}
                            numberOfLines={1}
                        >
                            {equipment}
                        </Text>
                    </View>
                )}

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