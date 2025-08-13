// components/EmptyStateComponent.tsx

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  iconName: keyof typeof Ionicons.glyphMap;
  onRefresh?: () => void;
  refreshButtonText?: string;
  showRefreshButton?: boolean;
}

const EmptyStateComponent: React.FC<EmptyStateProps> = ({
  title,
  subtitle,
  iconName,
  onRefresh,
  refreshButtonText = 'Thử lại',
  showRefreshButton = false,
}) => {
  return (
    <View className="flex-1 justify-center items-center py-16 px-8">
      <View className="bg-gray-100 rounded-full p-6 mb-4">
        <Ionicons name={iconName} size={48} color="#9CA3AF" />
      </View>
      
      <Text className="text-xl font-medium text-gray-700 mb-2 text-center">
        {title}
      </Text>
      
      <Text className="text-sm text-gray-500 text-center mb-6 leading-5">
        {subtitle}
      </Text>
      
      {showRefreshButton && onRefresh && (
        <TouchableOpacity
          className="bg-blue-500 px-6 py-3 rounded-lg"
          onPress={onRefresh}
        >
          <Text className="text-white text-base font-medium">
            {refreshButtonText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ✅ Pre-configured empty states for common scenarios
export const PhotoDeliveryEmptyState: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <EmptyStateComponent
    title="Chưa có giao hàng ảnh nào"
    subtitle="Các đơn hàng hoàn thành sẽ hiển thị ở đây để bạn gửi ảnh cho khách hàng."
    iconName="camera-outline"
    onRefresh={onRefresh}
    showRefreshButton={!!onRefresh}
    refreshButtonText="Làm mới"
  />
);

export const BookingEmptyState: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <EmptyStateComponent
    title="Chưa có đơn hàng nào"
    subtitle="Các đơn hàng của bạn sẽ hiển thị ở đây sau khi bạn đặt lịch chụp ảnh."
    iconName="document-text-outline"
    onRefresh={onRefresh}
    showRefreshButton={!!onRefresh}
    refreshButtonText="Làm mới"
  />
);

export const SearchEmptyState: React.FC<{ searchTerm?: string }> = ({ searchTerm }) => (
  <EmptyStateComponent
    title="Không tìm thấy kết quả"
    subtitle={`Không có kết quả nào cho "${searchTerm}". Thử tìm kiếm với từ khóa khác.`}
    iconName="search-outline"
    showRefreshButton={false}
  />
);

export const ErrorState: React.FC<{ 
  title?: string; 
  subtitle?: string; 
  onRetry?: () => void;
}> = ({ 
  title = "Có lỗi xảy ra", 
  subtitle = "Không thể tải dữ liệu. Vui lòng thử lại.", 
  onRetry 
}) => (
  <EmptyStateComponent
    title={title}
    subtitle={subtitle}
    iconName="alert-circle-outline"
    onRefresh={onRetry}
    showRefreshButton={!!onRetry}
    refreshButtonText="Thử lại"
  />
);

export const NetworkErrorState: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyStateComponent
    title="Không có kết nối mạng"
    subtitle="Vui lòng kiểm tra kết nối internet và thử lại."
    iconName="wifi-outline"
    onRefresh={onRetry}
    showRefreshButton={!!onRetry}
    refreshButtonText="Thử lại"
  />
);

export default EmptyStateComponent;