import React from "react";
import { View, Image, Text, TouchableOpacity, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { RootStackNavigationProp } from "../../navigation/types";

type ProfileCardProps = {
    name: string;
    avatar: any;
    images: any[];
    styles: string[];
    onBooking: () => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({
    name,
    avatar,
    images,
    styles,
    onBooking
}) => {
    // Lấy kích thước màn hình để tính toán responsive
    const screenWidth = Dimensions.get('window').width;
    // Tính chiều cao avatar dựa trên kích thước màn hình
    const avatarSize = Math.min(screenWidth * 0.22, 112); // 22% màn hình, max 112px

    const navigation = useNavigation<RootStackNavigationProp>();
    const handlePress = () => {
        navigation.navigate('ProfileCardDetail');
    }
    
    return (
        <TouchableOpacity onPress={handlePress} className="rounded-2xl items-center mt-4 relative mx-2">
            {/* Container cho cụm ảnh và avatar */}
            <View className="w-full">
                {/* 4 images small */}
                <View className="w-full flex-row flex-wrap justify-between gap-y-2">
                    {images.slice(0, 4).map((img, index) => (
                        <Image
                            key={index}
                            source={img}
                            className="w-[48%] h-32 rounded-xl"
                            resizeMode="cover"
                        />
                    ))}
                </View>
                
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
                    <Image 
                        source={avatar} 
                        style={{
                            width: avatarSize,
                            height: avatarSize,
                            borderRadius: avatarSize/2,
                            borderWidth: 4,
                            borderColor: '#232449'
                        }}
                    />
                </View>
            </View>

            <View style={{ height: avatarSize/2 + 20 }} />

            {/* Name  */}
            <Text className="text-white text-lg font-bold text-center mb-4">{name}</Text>
            
            {/* Styles */}
            <View className="flex-row justify-center flex-wrap gap-2 mb-5">
                {styles.map((style, idx) => (
                    <TouchableOpacity 
                        key={idx} 
                        className="bg-white px-6 py-3 rounded-full"
                    >
                        <Text className="text-black font-medium text-lg">{style}</Text>
                    </TouchableOpacity>
                ))}
            </View>
            
            {/* Booking button */}
            <TouchableOpacity
                className="bg-green-500 px-8 py-4 rounded-xl mb-3"
                onPress={onBooking}
            >
                <Text className="text-white font-semibold text-lg">Booking</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

export default ProfileCard;