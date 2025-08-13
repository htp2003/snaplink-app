import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Image, FlatList, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';
import { usePhotographerReviews } from '../../hooks/usePhotographerReviews';

// Use the enhanced rating response from the hook
interface EnhancedRatingResponse {
  id: number;
  bookingId: number;
  reviewerUserId: number;
  photographerId?: number | null;
  locationId?: number | null;
  score: number;
  comment?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  reviewerName?: string;
  photographerName?: string;
  locationName?: string;
  bookingDate?: string;
  // Enhanced fields
  reviewerFullName?: string;
  reviewerProfileImage?: string | null; // Allow null to match userService response
}

interface PhotographerReviewsProps {
  photographerId: number | string;
  currentRating?: number;
  totalReviews?: number;
}

const { width } = Dimensions.get('window');

export default function PhotographerReviews({ 
  photographerId, 
  currentRating, 
  totalReviews 
}: PhotographerReviewsProps) {
  const flatListRef = useRef<FlatList>(null);
  const { 
    reviews, 
    averageRating, 
    totalReviews: reviewCount, 
    loading, 
    error, 
    refreshReviews 
  } = usePhotographerReviews(photographerId, currentRating, totalReviews);

  const renderStars = (rating: number, size: number = 16) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={i} name="star" size={size} color="#f59e0b" />);
    }
    if (hasHalfStar) {
      stars.push(<Ionicons key="half" name="star-half" size={size} color="#f59e0b" />);
    }
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={size} color="#d1d5db" />);
    }
    return stars;
  };

  const formatDate = (dateString: string) => {
    try {
      // Fix timezone issue - force parse as UTC if no timezone info
      let date;
      if (dateString.includes('T') && !dateString.includes('Z') && !dateString.includes('+')) {
        // Add Z to indicate UTC if missing
        date = new Date(dateString + 'Z');
      } else {
        date = new Date(dateString);
      }
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Nếu < 1 phút
      if (diffMinutes < 1) return 'Vừa xong';
      
      // Nếu < 1 giờ
      if (diffMinutes < 60) return `${diffMinutes} phút trước`;
      
      // Nếu < 24 giờ
      if (diffHours < 24) return `${diffHours} giờ trước`;
      
      // Nếu < 7 ngày
      if (diffDays < 7) return `${diffDays} ngày trước`;
      
      // Nếu < 30 ngày
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
      
      // Nếu < 365 ngày
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`;
      
      return `${Math.floor(diffDays / 365)} năm trước`;
    } catch (error) {
      return 'Gần đây';
    }
  };

  const renderReviewItem = ({ item: review }: { item: EnhancedRatingResponse }) => (
    <View 
      style={{
        width: width - getResponsiveSize(48), // Full width minus padding
        marginRight: getResponsiveSize(16),
        backgroundColor: 'white',
        borderRadius: getResponsiveSize(16),
        padding: getResponsiveSize(16),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}
    >
      <View className="flex-row items-start">
        {/* Avatar */}
        <View className="mr-3">
          {review.reviewerProfileImage ? (
            <Image
              source={{ uri: review.reviewerProfileImage }}
              style={{
                width: getResponsiveSize(40),
                height: getResponsiveSize(40)
              }}
              className="rounded-full"
            />
          ) : (
            <View 
              className="bg-stone-300 rounded-full items-center justify-center"
              style={{
                width: getResponsiveSize(40),
                height: getResponsiveSize(40)
              }}
            >
              <Text 
                className="text-stone-600 font-medium"
                style={{ fontSize: getResponsiveSize(16) }}
              >
                {review.reviewerFullName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>

        {/* Review content */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-2">
            <Text 
              className="text-stone-900 font-semibold"
              style={{ fontSize: getResponsiveSize(16) }}
            >
              {review.reviewerFullName || review.reviewerName || 'Người dùng ẩn danh'}
            </Text>
            <Text 
              className="text-stone-500"
              style={{ fontSize: getResponsiveSize(12) }}
            >
              {review.createdAt ? formatDate(review.createdAt) : 'Gần đây'}
            </Text>
          </View>

          {/* Rating stars */}
          <View className="flex-row items-center mb-3">
            {renderStars(review.score || 5, getResponsiveSize(14))}
          </View>

          {/* Comment */}
          {review.comment && (
            <Text 
              className="text-stone-700 leading-6"
              style={{ fontSize: getResponsiveSize(14) }}
              numberOfLines={4}
            >
              {review.comment}
            </Text>
          )}

          {/* Booking date if available */}
          {review.bookingDate && (
            <Text 
              className="text-stone-500 mt-2"
              style={{ fontSize: getResponsiveSize(12) }}
            >
              Booking: {formatDate(review.bookingDate)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <View style={{ marginTop: getResponsiveSize(20), paddingHorizontal: getResponsiveSize(24) }}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text 
          className="text-stone-600 mt-4 text-center"
          style={{ fontSize: getResponsiveSize(16) }}
        >
          Đang tải đánh giá...
        </Text>
      </View>
    );
  }

  // Error state
  if (error && !averageRating) {
    return (
      <View style={{ marginTop: getResponsiveSize(20), paddingHorizontal: getResponsiveSize(24) }}>
        <View className="items-center">
          <Ionicons name="warning-outline" size={getResponsiveSize(48)} color="#f59e0b" />
          <Text 
            className="text-stone-800 font-medium mt-3 text-center"
            style={{ fontSize: getResponsiveSize(16) }}
          >
            {error}
          </Text>
          <TouchableOpacity
            onPress={refreshReviews}
            className="mt-4 px-6 py-2 bg-amber-500 rounded-full"
          >
            <Text 
              className="text-white font-medium"
              style={{ fontSize: getResponsiveSize(14) }}
            >
              Thử lại
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View>
      {/* Header với rating tổng - KHÔNG có border, nằm trực tiếp trên background */}
      <View 
        className="items-center"
        style={{ 
          paddingHorizontal: getResponsiveSize(24),
          paddingVertical: getResponsiveSize(32),
          backgroundColor: 'white'
        }}
      >
        {/* Rating number với icon lá như trong thiết kế */}
        <View className="flex-row items-center mb-3">
          <View className="flex-row items-center mr-3">
            <Ionicons name="leaf-outline" size={getResponsiveSize(20)} color="#10b981" />
            <Ionicons name="leaf-outline" size={getResponsiveSize(20)} color="#10b981" style={{ marginLeft: -6 }} />
          </View>
          
          <Text 
            className="text-stone-900 font-bold"
            style={{ fontSize: getResponsiveSize(48) }}
          >
            {averageRating.toFixed(2).replace('.', ',')}
          </Text>
          
          <View className="flex-row items-center ml-3">
            <Ionicons name="leaf-outline" size={getResponsiveSize(20)} color="#10b981" style={{ transform: [{ scaleX: -1 }] }} />
            <Ionicons name="leaf-outline" size={getResponsiveSize(20)} color="#10b981" style={{ marginLeft: -6, transform: [{ scaleX: -1 }] }} />
          </View>
        </View>

        <Text 
          className="text-stone-800 font-semibold mb-2"
          style={{ fontSize: getResponsiveSize(18) }}
        >
          Được khách yêu thích
        </Text>
        
        <Text 
          className="text-stone-600 text-center leading-6"
          style={{ fontSize: getResponsiveSize(14) }}
        >
          Thợ chụp ảnh này được khách yêu thích dựa trên điểm{'\n'}xếp hạng, lượt đánh giá và độ tin cậy
        </Text>
      </View>

      {/* Reviews section */}
      {reviews.length > 0 ? (
        <View>
          {/* Header cho reviews */}
          <View 
            className="flex-row items-center justify-between"
            style={{ 
              paddingHorizontal: getResponsiveSize(24),
              marginBottom: getResponsiveSize(16)
            }}
          >
            <Text 
              className="text-stone-900 font-semibold"
              style={{ fontSize: getResponsiveSize(18) }}
            >
              {reviewCount} đánh giá
            </Text>
            
            {/* Show error but still display reviews if we have them */}
            {error && (
              <TouchableOpacity onPress={refreshReviews}>
                <Ionicons name="refresh-outline" size={getResponsiveSize(20)} color="#f59e0b" />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Horizontal scroll reviews */}
          <FlatList
            ref={flatListRef}
            data={reviews}
            renderItem={renderReviewItem}
            keyExtractor={(item, index) => item.id?.toString() || index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: getResponsiveSize(24),
            }}
            snapToInterval={width - getResponsiveSize(32)} 
            decelerationRate="fast"
            pagingEnabled={false}
          />
        </View>
      ) : (
        <View 
          className="items-center"
          style={{ 
            paddingHorizontal: getResponsiveSize(24),
            paddingVertical: getResponsiveSize(32)
          }}
        >
          <Ionicons name="chatbubble-outline" size={getResponsiveSize(48)} color="#9ca3af" />
          <Text 
            className="text-stone-600 text-center mt-4"
            style={{ fontSize: getResponsiveSize(16) }}
          >
            Chưa có đánh giá nào{'\n'}Hãy là người đầu tiên đánh giá!
          </Text>
        </View>
      )}
    </View>
  );
}