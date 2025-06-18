// src/components/ProfileMiniCard/ProfileMiniCard.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';

type Props = {
  id: string;
  name: string;
  avatar: any;
  styles: string[];
  isFavorite: boolean;
  onFavoriteToggle: () => void;
  onPress: () => void;
};

const ProfileMiniCard: React.FC<Props> = ({
  name, avatar, styles, isFavorite, onFavoriteToggle, onPress
}) => (
  <TouchableOpacity
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#222',
      borderRadius: getResponsiveSize(12),
      padding: getResponsiveSize(12),
      marginBottom: getResponsiveSize(10)
    }}
    onPress={onPress}
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
      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: getResponsiveSize(15) }}>{name}</Text>
      <Text style={{ color: '#aaa', fontSize: getResponsiveSize(12) }}>{styles.join(', ')}</Text>
    </View>
    <TouchableOpacity onPress={onFavoriteToggle}>
      <Ionicons name={isFavorite ? 'heart' : 'heart-outline'} size={getResponsiveSize(20)} color="#FF6B6B" />
    </TouchableOpacity>
  </TouchableOpacity>
);

export default ProfileMiniCard;