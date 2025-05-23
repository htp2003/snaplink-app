import React from "react";
import { View, Image, Text, TouchableOpacity, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";
import { Ionicons } from "@expo/vector-icons";

import { getResponsiveSize } from "../../utils/responsive";

type LocationCardProps = {
    name: string;
    avatar: any;
    images: any[];
    styles: string[];
    onBooking: () => void;
    onFavoriteToggle: () => void;
    isFavorite: boolean;
}

const LocationCard: React.FC<LocationCardProps> = ({
    name,
    avatar,
    images,
    styles,
    onBooking,
    onFavoriteToggle,
    isFavorite
}) => {
    // Tính toán kích thước responsive cho các thành phần
    const avatarSize = getResponsiveSize(80); // Kích thước avatar
    const cardPadding = getResponsiveSize(16); // Padding cho card

    const navigation = useNavigation<RootStackNavigationProp>();
    const handlePress = () => {
        navigation.navigate('ProfileCardDetail');
    }
    
    return (
        <TouchableOpacity onPress={handlePress} className="rounded-2xl items-center mt-4 relative border border-[#32FAE9]/20">
            {/* Container cho cụm ảnh và avatar */}
            <View className="w-full">
                {/* 4 images small */}
                <View className="w-full flex-row flex-wrap justify-between gap-1">
                    {images.slice(0, 4).map((img, index) => (
                        <Image
                            key={index}
                            source={img}
                            className="w-[49%] aspect-square rounded-lg"
                            resizeMode="cover"
                        />
                    ))}
                </View>
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
                        transform: [{ translateY: avatarSize/2 }],
                        zIndex: 10,
                    }}
                >
                    <View className="relative">
                        <Image 
                            source={avatar} 
                            style={{
                                width: avatarSize,
                                height: avatarSize,
                                borderRadius: avatarSize/2,
                                borderWidth: 3,
                                borderColor: '#232449'
                            }}
                        />
                    </View>
                </View>
            </View>

            <View style={{ height: avatarSize/2 + 20 }} />

            {/* Name  */}
            <Text className="text-white text-xl font-bold text-center mb-2">{name}</Text>
            
            {/* Styles */}
            <View className="flex-row justify-center flex-wrap gap-2 mb-5">
                {styles.map((style, idx) => (
                    <TouchableOpacity 
                        key={idx} 
                        className="bg-white/10 px-4 py-2 rounded-full"
                    >
                        <Text className="text-white font-medium text-sm">{style}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            
            {/* Booking button */}
            <TouchableOpacity
                className="bg-blue-500 px-8 py-3 rounded-full mb-3"
                onPress={onBooking}
            >
                <Text className="text-white font-semibold text-base">Booking</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

export default LocationCard;