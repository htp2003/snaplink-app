import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Types
interface RatingData {
  ratingId: number;
  bookingId: number;
  reviewerUserId: number;
  photographerId: number;
  locationId?: number;
  score: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  // Additional fields we might need to fetch
  customerName?: string;
  customerAvatar?: string;
  photographerResponse?: string;
}

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  photographerId: string | number;
}

// Rating Service
const ratingService = {
  async getPhotographerRatings(photographerId: string | number): Promise<RatingData[]> {
    try {
      const response = await fetch(`/api/Rating/ByPhotographer/${photographerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch ratings');
      }
      const data = await response.json();
      console.log('Rating API Response:', data); // Debug log
      return data;
    } catch (error) {
      console.error('Error fetching ratings:', error);
      throw error;
    }
  }
};

// Star Rating Component
const StarRating: React.FC<{ rating: number; size?: number }> = ({ 
  rating, 
  size = 16 
}) => {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <Ionicons 
          key={i} 
          name="star" 
          size={size} 
          color="#FFD700" 
          style={{ marginRight: 2 }}
        />
      );
    } else if (i === fullStars && hasHalfStar) {
      stars.push(
        <Ionicons 
          key={i} 
          name="star-half" 
          size={size} 
          color="#FFD700" 
          style={{ marginRight: 2 }}
        />
      );
    } else {
      stars.push(
        <Ionicons 
          key={i} 
          name="star-outline" 
          size={size} 
          color="#E0E0E0" 
          style={{ marginRight: 2 }}
        />
      );
    }
  }

  return <View style={{ flexDirection: 'row', alignItems: 'center' }}>{stars}</View>;
};

// Rating Item Component
const RatingItem: React.FC<{ rating: RatingData }> = ({ rating }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      padding: 16,
      marginBottom: 12,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    }}>
      {/* Customer Info */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: '#F0F0F0',
          justifyContent: 'center',
          alignItems: 'center',
          marginRight: 12,
        }}>
          {rating.customerAvatar ? (
            <Image
              source={{ uri: rating.customerAvatar }}
              style={{ width: 40, height: 40, borderRadius: 20 }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ color: '#666666', fontSize: 16, fontWeight: 'bold' }}>
              {rating.customerName?.charAt(0)?.toUpperCase() || `U${rating.reviewerUserId}`}
            </Text>
          )}
        </View>
        
        <View style={{ flex: 1 }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600', 
            color: '#000000',
            marginBottom: 4 
          }}>
            {rating.customerName || `Khách hàng #${rating.reviewerUserId}`}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <StarRating rating={rating.score} size={14} />
            <Text style={{ 
              marginLeft: 8, 
              fontSize: 12, 
              color: '#666666' 
            }}>
              {formatDate(rating.createdAt)}
            </Text>
          </View>
        </View>
      </View>

      {/* Comment */}
      {rating.comment && rating.comment.trim() !== '' ? (
        <Text style={{
          fontSize: 14,
          color: '#333333',
          lineHeight: 20,
          marginBottom: 8,
        }}>
          {rating.comment}
        </Text>
      ) : (
        <Text style={{
          fontSize: 14,
          color: '#999999',
          fontStyle: 'italic',
          lineHeight: 20,
          marginBottom: 8,
        }}>
          Khách hàng chưa để lại nhận xét
        </Text>
      )}

      {/* Photographer Response */}
      {rating.photographerResponse && (
        <View style={{
          backgroundColor: '#F8F9FA',
          padding: 12,
          borderRadius: 8,
          borderLeftWidth: 3,
          borderLeftColor: '#6B73FF',
          marginTop: 8,
        }}>
          <Text style={{
            fontSize: 12,
            color: '#666666',
            marginBottom: 4,
            fontWeight: '600',
          }}>
            Phản hồi từ nhiếp ảnh gia:
          </Text>
          <Text style={{
            fontSize: 14,
            color: '#333333',
            lineHeight: 18,
          }}>
            {rating.photographerResponse}
          </Text>
        </View>
      )}
    </View>
  );
};

// Main Rating Modal Component
const RatingModal: React.FC<RatingModalProps> = ({ 
  visible, 
  onClose, 
  photographerId 
}) => {
  const insets = useSafeAreaInsets();
  const [ratings, setRatings] = useState<RatingData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    if (visible && photographerId) {
      loadRatings();
    }
  }, [visible, photographerId]);

  const loadRatings = async () => {
    try {
      setIsLoading(true);
      const data = await ratingService.getPhotographerRatings(photographerId);
      setRatings(data);
      
      // Calculate average rating
      if (data.length > 0) {
        const avg = data.reduce((sum, rating) => sum + rating.score, 0) / data.length;
        setAverageRating(avg);
      } else {
        setAverageRating(0);
      }
    } catch (error) {
      Alert.alert(
        'Lỗi',
        'Không thể tải danh sách đánh giá. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const renderRatingItem = ({ item }: { item: RatingData }) => (
    <RatingItem rating={item} />
  );

  const getRatingDistribution = () => {
    const distribution = [5, 4, 3, 2, 1].map(star => {
      const count = ratings.filter(r => Math.floor(r.score) === star).length;
      const percentage = ratings.length > 0 ? (count / ratings.length) * 100 : 0;
      return { star, count, percentage };
    });
    return distribution;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ 
        flex: 1, 
        backgroundColor: '#F7F7F7',
        paddingTop: insets.top 
      }}>
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
          paddingVertical: 16,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E0E0E0',
        }}>
          <Text style={{ 
            fontSize: 20, 
            fontWeight: 'bold', 
            color: '#000000' 
          }}>
            Đánh giá khách hàng
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#666666" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}>
            <ActivityIndicator size="large" color="#6B73FF" />
            <Text style={{ 
              marginTop: 16, 
              color: '#666666', 
              fontSize: 16 
            }}>
              Đang tải đánh giá...
            </Text>
          </View>
        ) : (
          <ScrollView style={{ flex: 1 }}>
            {/* Rating Summary */}
            <View style={{
              backgroundColor: '#FFFFFF',
              margin: 16,
              padding: 20,
              borderRadius: 12,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 3,
            }}>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center',
                marginBottom: 16 
              }}>
                <View style={{ alignItems: 'center', marginRight: 24 }}>
                  <Text style={{ 
                    fontSize: 36, 
                    fontWeight: 'bold', 
                    color: '#000000',
                    marginBottom: 4 
                  }}>
                    {averageRating.toFixed(1)}
                  </Text>
                  <StarRating rating={averageRating} size={18} />
                  <Text style={{ 
                    fontSize: 14, 
                    color: '#666666',
                    marginTop: 4 
                  }}>
                    {ratings.length} đánh giá
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  {getRatingDistribution().map(({ star, count, percentage }) => (
                    <View key={star} style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center',
                      marginBottom: 4 
                    }}>
                      <Text style={{ fontSize: 12, color: '#666666', width: 20 }}>
                        {star}
                      </Text>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <View style={{
                        flex: 1,
                        height: 6,
                        backgroundColor: '#E0E0E0',
                        borderRadius: 3,
                        marginHorizontal: 8,
                      }}>
                        <View style={{
                          height: '100%',
                          backgroundColor: '#6B73FF',
                          borderRadius: 3,
                          width: `${percentage}%`,
                        }} />
                      </View>
                      <Text style={{ fontSize: 12, color: '#666666', width: 30 }}>
                        {count}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Reviews List */}
            {ratings.length > 0 ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: '#000000',
                  marginBottom: 16,
                }}>
                  Tất cả đánh giá
                </Text>
                {ratings.map((rating, index) => (
                  <RatingItem key={rating.ratingId || index} rating={rating} />
                ))}
              </View>
            ) : (
              <View style={{ 
                flex: 1, 
                justifyContent: 'center', 
                alignItems: 'center',
                paddingVertical: 60 
              }}>
                <Ionicons name="star-outline" size={64} color="#E0E0E0" />
                <Text style={{ 
                  fontSize: 18, 
                  color: '#666666',
                  marginTop: 16,
                  textAlign: 'center' 
                }}>
                  Chưa có đánh giá nào
                </Text>
                <Text style={{ 
                  fontSize: 14, 
                  color: '#999999',
                  marginTop: 8,
                  textAlign: 'center',
                  paddingHorizontal: 40 
                }}>
                  Đánh giá sẽ hiển thị ở đây sau khi bạn hoàn thành dịch vụ đầu tiên
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

export default RatingModal;