import React from "react";
import { View, Image, Text, TouchableOpacity, Dimensions } from "react-native";
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
    // Tính toán kích thước responsive cho các thành phần
    const avatarSize = getResponsiveSize(80); // Kích thước avatar
    const cardPadding = getResponsiveSize(16); // Padding cho card

    const navigation = useNavigation<RootStackNavigationProp>();
    const handlePress = () => {
        navigation.navigate('PhotographerCardDetail', { photographerId: id });
    }

    // Helper function để format currency
    const formatPrice = (price?: number) => {
        if (!price) return 'Contact for price';
        return `$${price.toLocaleString()}/hr`;
    };
    console.log('hourlyRate:', hourlyRate, 'formatPrice:', formatPrice(hourlyRate));

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

    // Helper function để render rating stars
    const renderRating = (rating?: number) => {
        if (!rating) return null;
        
        const stars = [];
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 !== 0;
        
        for (let i = 0; i < fullStars; i++) {
            stars.push(
                <Ionicons key={i} name="star" size={getResponsiveSize(14)} color="#FFD700" />
            );
        }
        
        if (hasHalfStar) {
            stars.push(
                <Ionicons key="half" name="star-half" size={getResponsiveSize(14)} color="#FFD700" />
            );
        }
        
        const emptyStars = 5 - Math.ceil(rating);
        for (let i = 0; i < emptyStars; i++) {
            stars.push(
                <Ionicons key={`empty-${i}`} name="star-outline" size={getResponsiveSize(14)} color="#6B7280" />
            );
        }
        
        return (
            <View className="flex-row items-center">
                {stars}
                <Text className="text-white/80 text-xs ml-1">
                    ({rating.toFixed(1)})
                </Text>
            </View>
        );
    };

    // Xử lý images từ API
    const displayImages = images.length > 0 ? images : [
        // Default placeholder images nếu không có ảnh từ API
        
    ];

    return (
        <TouchableOpacity onPress={handlePress} className="rounded-2xl items-center mt-4 relative border border-[#32FAE9]/20 bg-gray-900/50">
            {/* Container cho cụm ảnh và avatar */}
            <View className="w-full">
                {/* 4 images small */}
                <View className="w-full flex-row flex-wrap justify-between gap-1 p-2">
                    {displayImages.slice(0, 4).map((img, index) => (
                        <Image
                            key={index}
                            source={typeof img === 'string' ? { uri: img } : img}
                            className="w-[49%] aspect-square rounded-lg"
                            resizeMode="cover"
                            onError={() => console.log(`Failed to load image ${index}`)}
                        />
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

                {/* Avatar đè lên 2 ảnh dưới */}
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
                        <Image
                            source={typeof avatar === 'string' ? { uri: avatar } : avatar}
                            style={{
                                width: avatarSize,
                                height: avatarSize,
                                borderRadius: avatarSize / 2,
                                borderWidth: 3,
                                borderColor: '#232449'
                            }}
                            onError={() => console.log('Failed to load avatar')}
                        />
                        {/* Verification badge */}
                        <View 
                            style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                backgroundColor: '#10B981',
                                borderRadius: getResponsiveSize(10),
                                padding: getResponsiveSize(2),
                                borderWidth: 2,
                                borderColor: '#232449'
                            }}
                        >
                            <Ionicons name="checkmark" size={getResponsiveSize(12)} color="white" />
                        </View>
                    </View>
                </View>
            </View>

            <View style={{ height: avatarSize / 2 + 20 }} />

            {/* Name */}
            <Text className="text-white text-xl font-bold text-center mb-1">{fullName}</Text>

            {/* Rating */}
            {rating && (
                <View className="mb-2">
                    {renderRating(rating)}
                </View>
            )}

            {/* Experience and Rate */}
            <View className="flex-row items-center justify-center mb-3 space-x-4">
                {/* {yearsExperience && (
                    <View className="flex-row items-center">
                        <Ionicons name="time-outline" size={getResponsiveSize(14)} color="#32FAE9" />
                        <Text className="text-white/80 text-sm ml-1">
                            {yearsExperience} years
                        </Text>
                    </View>
                )} */}
                {hourlyRate !== undefined && hourlyRate !== null && (
                    <View className="flex-row items-center">
                        <Ionicons name="cash-outline" size={getResponsiveSize(14)} color="#32FAE9" />
                        <Text className="text-white/80 text-sm ml-1">
                            {formatPrice(hourlyRate)}
                        </Text>
                    </View>
                )}
            </View>

            {/* Styles */}
            <View className="flex-row justify-center flex-wrap gap-2 mb-5 px-2">
                {styles.length > 0 ? (
                    styles.slice(0, 3).map((style, idx) => (
                        <TouchableOpacity
                            key={idx}
                            className="bg-white/10 px-3 py-1 rounded-full"
                        >
                            <Text className="text-white font-medium text-xs">{style}</Text>
                        </TouchableOpacity>
                    ))
                ) : (
                    <Text className="text-white/60 text-sm">No specialties listed</Text>
                )}
                {styles.length > 3 && (
                    <TouchableOpacity className="bg-white/10 px-3 py-1 rounded-full">
                        <Text className="text-white font-medium text-xs">
                            +{styles.length - 3} more
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Booking button */}
            <TouchableOpacity
                className="bg-blue-500 px-8 py-3 rounded-full mb-3 shadow-lg"
                onPress={onBooking}
                disabled={availabilityStatus?.toLowerCase() === 'unavailable'}
                style={{
                    opacity: availabilityStatus?.toLowerCase() === 'unavailable' ? 0.5 : 1
                }}
            >
                <Text className="text-white font-semibold text-base">
                    {availabilityStatus?.toLowerCase() === 'unavailable' ? 'Unavailable' : 'Book now'}
                </Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

export default PhotographerCard;