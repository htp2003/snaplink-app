import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';

type Props = {
  id: string;
  fullName: string;
  avatar: any;
  styles: string[];
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  onPress: () => void;
  isBooked?: boolean;
};

const ProfileMiniCard: React.FC<Props> = ({
  fullName, avatar, styles, isFavorite, onFavoriteToggle, onPress, isBooked
}) => (
  <View style={{ position: 'relative' }}>
    {/* Nhãn Đã booking */}
    {isBooked && (
      <View style={{
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: '#4ADE80',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        zIndex: 2
      }}>
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>Đã booking</Text>
      </View>
    )}
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#222',
        borderRadius: getResponsiveSize(12),
        padding: getResponsiveSize(12),
        marginBottom: getResponsiveSize(10),
        opacity: isBooked ? 0.7 : 1
      }}
      onPress={onPress}
      disabled={isBooked}
    >
      <Image
        source={avatar}
        style={{
          width: getResponsiveSize(40),
          height: getResponsiveSize(40),
          borderRadius: getResponsiveSize(20),
          marginRight: getResponsiveSize(12)
        }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ color: 'white', fontWeight: 'bold', fontSize: getResponsiveSize(15) }}>{fullName}</Text>
        <Text style={{ color: '#aaa', fontSize: getResponsiveSize(12) }}>{styles.join(', ')}</Text>
      </View>
      <TouchableOpacity onPress={onFavoriteToggle}>
        <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={getResponsiveSize(20)} color="#FF6B6B" />
      </TouchableOpacity>
    </TouchableOpacity>
  </View>
);

export default ProfileMiniCard;