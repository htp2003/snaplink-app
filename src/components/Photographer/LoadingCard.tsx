import React from 'react';
import { View, Text } from 'react-native';
import { getResponsiveSize } from '../../utils/responsive';

export const LoadingCard = () => {
  return (
    <View 
      className="rounded-2xl mt-4 border border-[#32FAE9]/20 bg-gray-900/50 animate-pulse"
      style={{ width: getResponsiveSize(300) }}
    >
      {/* Images placeholder */}
      <View className="w-full p-2">
        <View className="w-full flex-row flex-wrap justify-between gap-1">
          {[1, 2, 3, 4].map((_, index) => (
            <View
              key={index}
              className="w-[49%] aspect-square rounded-lg bg-gray-700"
            />
          ))}
        </View>
      </View>
      
      {/* Avatar placeholder */}
      <View className="items-center" style={{ marginTop: getResponsiveSize(20) }}>
        <View 
          className="bg-gray-700 rounded-full"
          style={{
            width: getResponsiveSize(80),
            height: getResponsiveSize(80),
          }}
        />
      </View>
      
      {/* Content placeholder */}
      <View className="items-center mt-6 px-4">
        <View className="h-6 bg-gray-700 rounded w-32 mb-2" />
        <View className="h-4 bg-gray-700 rounded w-20 mb-4" />
        <View className="flex-row gap-2 mb-6">
          <View className="h-6 bg-gray-700 rounded w-16" />
          <View className="h-6 bg-gray-700 rounded w-20" />
        </View>
        <View className="h-10 bg-gray-700 rounded w-24 mb-4" />
      </View>
    </View>
  );
};