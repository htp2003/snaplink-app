import React from 'react';
import { View, Image, TouchableOpacity } from 'react-native';

type RecentGridPreviewProps = {
    items: Array<{ image?: string }>;
    onPress: () => void;
    size?: number;
  };
export default function RecentGridPreview({ items, onPress, size = 160 }: RecentGridPreviewProps) {
  return (
    <TouchableOpacity onPress={onPress} style={{ width: size, height: size }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: size, height: size, borderRadius: 16, overflow: 'hidden' }}>
        {[0, 1, 2, 3].map(i => (
          <Image
            key={i}
            source={{ uri: items[i]?.image || 'fallback_url' }}
            style={{
              width: size / 2,
              height: size / 2,
              backgroundColor: '#e5e5e5'
            }}
            resizeMode="cover"
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}