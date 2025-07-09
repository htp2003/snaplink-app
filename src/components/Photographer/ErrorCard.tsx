import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';

interface ErrorCardProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({ 
  message = 'Failed to load data', 
  onRetry 
}) => {
  return (
    <View 
      className="rounded-2xl mt-4 border border-red-500/20 bg-red-900/20 items-center justify-center py-8"
      style={{ width: getResponsiveSize(300) }}
    >
      <Ionicons 
        name="alert-circle-outline" 
        size={getResponsiveSize(48)} 
        color="#EF4444" 
      />
      <Text className="text-red-400 text-center mt-4 px-4">
        {message}
      </Text>
      {onRetry && (
        <TouchableOpacity 
          onPress={onRetry}
          className="mt-4 px-6 py-2 bg-red-500 rounded-lg"
        >
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};