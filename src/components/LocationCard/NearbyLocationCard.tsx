import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';
import { NearbyLocationData } from '../../hooks/useNearbyLocations';

interface NearbyLocationCardProps {
  location: NearbyLocationData;
  onPress: () => void;
  onFavoriteToggle?: () => void;
  isFavorite?: boolean;
}

const NearbyLocationCard: React.FC<NearbyLocationCardProps> = ({
  location,
  onPress,
  onFavoriteToggle,
  isFavorite = false
}) => {
  const isInternal = location.source === 'internal';
  
  // Format distance
  const formatDistance = (distance: number) => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`;
    }
    return `${distance.toFixed(1)}km`;
  };

  // Get location type icon
  const getTypeIcon = (type?: string) => {
    const iconMap: { [key: string]: string } = {
      restaurant: '🍽️',
      cafe: '☕',
      park: '🌳',
      shopping_mall: '🛍️',
      tourist_attraction: '🏛️',
      hotel: '🏨',
      hospital: '🏥',
      school: '🏫',
      bank: '🏦',
      gas_station: '⛽',
      museum: '🏛️'
    };
    return iconMap[type?.toLowerCase() || ''] || '📍';
  };

  // Format price for internal locations
  const formatPrice = (price?: number) => {
    if (!price) return null;
    if (price >= 1000000) {
      return `${(price / 1000000).toFixed(1)}M`;
    }
    if (price >= 1000) {
      return `${Math.floor(price / 1000)}K`;
    }
    return price.toString();
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <View className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 mb-3">
        <View className="flex-row">
          {/* Image/Icon */}
          <View 
            className="bg-stone-100 items-center justify-center"
            style={{ width: getResponsiveSize(80), height: getResponsiveSize(80) }}
          >
            {isInternal && location.images?.[0] ? (
              <Image
                source={{ uri: location.images[0] }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ fontSize: getResponsiveSize(28) }}>
                {getTypeIcon(location.type)}
              </Text>
            )}
          </View>

          {/* Content */}
          <View className="flex-1 p-3">
            {/* Header Row */}
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-1 mr-2">
                <Text 
                  className="text-stone-900 font-semibold"
                  style={{ fontSize: getResponsiveSize(15) }}
                  numberOfLines={1}
                >
                  {location.name}
                </Text>
                {location.address && (
                  <Text 
                    className="text-stone-500"
                    style={{ fontSize: getResponsiveSize(12) }}
                    numberOfLines={1}
                  >
                    {location.address}
                  </Text>
                )}
              </View>

              {/* Source Badge */}
              <View className={`px-2 py-1 rounded-full ${
                isInternal ? 'bg-emerald-100' : 'bg-blue-100'
              }`}>
                <Text 
                  className={`font-medium text-center ${
                    isInternal ? 'text-emerald-600' : 'text-blue-600'
                  }`}
                  style={{ fontSize: getResponsiveSize(9) }}
                >
                  {isInternal ? 'Hệ thống' : 'Google'}
                </Text>
              </View>
            </View>

            {/* Stats Row */}
            <View className="flex-row items-center justify-between mt-2">
              {/* Distance */}
              <View className="flex-row items-center bg-stone-50 rounded-full px-2 py-1">
                <Ionicons name="location-outline" size={12} color="#78716c" />
                <Text 
                  className="text-stone-600 font-medium ml-1"
                  style={{ fontSize: getResponsiveSize(11) }}
                >
                  {formatDistance(location.distanceInKm)}
                </Text>
              </View>

              {/* Rating */}
              {(location.rating || (isInternal && location.availabilityStatus)) && (
                <View className="flex-row items-center bg-stone-50 rounded-full px-2 py-1">
                  <Ionicons 
                    name={location.rating ? "star" : "checkmark-circle-outline"} 
                    size={12} 
                    color={location.rating ? "#d97706" : "#059669"} 
                  />
                  <Text 
                    className="text-stone-600 font-medium ml-1"
                    style={{ fontSize: getResponsiveSize(11) }}
                  >
                    {location.rating ? location.rating.toFixed(1) : 'Available'}
                  </Text>
                </View>
              )}

              {/* Price (for internal) or Type (for external) */}
              <View className="flex-row items-center bg-stone-50 rounded-full px-2 py-1">
                <Ionicons 
                  name={isInternal ? "cash-outline" : "pricetag-outline"} 
                  size={12} 
                  color="#78716c" 
                />
                <Text 
                  className="text-stone-600 font-medium ml-1"
                  style={{ fontSize: getResponsiveSize(11) }}
                >
                  {isInternal ? 
                    (formatPrice(location.hourlyRate) || 'TBD') : 
                    (location.type || 'Place')
                  }
                </Text>
              </View>
            </View>

            {/* Action Button */}
            <View className="mt-2">
              {isInternal ? (
                <TouchableOpacity
                  className="bg-emerald-500 rounded-full py-1 px-3"
                  onPress={onPress}
                >
                  <Text 
                    className="text-white font-medium text-center"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    Đặt ngay
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="bg-blue-500 rounded-full py-1 px-3"
                  onPress={onPress}
                >
                  <Text 
                    className="text-white font-medium text-center"
                    style={{ fontSize: getResponsiveSize(12) }}
                  >
                    Xem thông tin
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Favorite Button */}
          {onFavoriteToggle && (
            <TouchableOpacity
              className="absolute top-2 right-2 bg-black/20 rounded-full p-1"
              onPress={onFavoriteToggle}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={16}
                color={isFavorite ? "#ef4444" : "white"}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default NearbyLocationCard;