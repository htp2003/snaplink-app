import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRating } from '../hooks/useRating';
import { RatingResponse } from '../types/rating';

interface PhotographerRatingsModalProps {
  visible: boolean;
  onClose: () => void;
  photographerId: string | number;
  photographerName?: string;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PhotographerRatingsModal: React.FC<PhotographerRatingsModalProps> = ({
  visible,
  onClose,
  photographerId,
  photographerName = 'Photographer',
}) => {
  const {
    photographerRatings,
    loadingRatings,
    error,
    getRatingsByPhotographer,
    calculateAverageRating,
    getRatingDistribution,
    getRatingLabel,
    getRatingColor,
  } = useRating();

  const [hasLoadedRatings, setHasLoadedRatings] = useState(false);

  // Load ratings when modal opens
  useEffect(() => {
    if (visible && photographerId && !hasLoadedRatings) {
      const numericPhotographerId = typeof photographerId === 'string' 
        ? parseInt(photographerId, 10) 
        : photographerId;
        
      if (!isNaN(numericPhotographerId) && numericPhotographerId > 0) {
        getRatingsByPhotographer(numericPhotographerId);
        setHasLoadedRatings(true);
      }
    }
    
    // Reset when modal closes
    if (!visible) {
      setHasLoadedRatings(false);
    }
  }, [visible, photographerId, getRatingsByPhotographer, hasLoadedRatings]);

  // Calculate statistics
  const averageRating = calculateAverageRating(photographerRatings);
  const ratingDistribution = getRatingDistribution(photographerRatings);
  const totalRatings = photographerRatings.length;

  // Render star rating
  const renderStars = (score: number, size: number = 16) => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= score ? 'star' : 'star-outline'}
            size={size}
            color={star <= score ? '#FFD700' : '#E0E0E0'}
          />
        ))}
      </View>
    );
  };

  // Render single rating item
  const renderRatingItem = (rating: RatingResponse, index: number) => {
    return (
      <View key={rating.id || index} style={styles.ratingItem}>
        <View style={styles.ratingHeader}>
          <View style={styles.ratingUserInfo}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitial}>
                {rating.reviewerName?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userDetails}>
              <Text style={styles.userName}>
                {rating.reviewerName || 'Anonymous'}
              </Text>
              <Text style={styles.ratingDate}>
                {rating.createdAt ? new Date(rating.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
              </Text>
            </View>
          </View>
          
          <View style={styles.ratingScore}>
            {renderStars(rating.score, 14)}
            <Text style={[styles.scoreText, { color: getRatingColor(rating.score) }]}>
              {rating.score}.0
            </Text>
          </View>
        </View>

        {rating.comment && (
          <Text style={styles.ratingComment}>
            "{rating.comment}"
          </Text>
        )}

        {rating.bookingDate && (
          <Text style={styles.bookingDate}>
            Chụp ảnh ngày: {new Date(rating.bookingDate).toLocaleDateString('vi-VN')}
          </Text>
        )}
      </View>
    );
  };

  // Render statistics section
  const renderStatistics = () => (
    <View style={styles.statisticsContainer}>
      <View style={styles.overallRating}>
        <Text style={styles.averageRatingText}>{averageRating.toFixed(1)}</Text>
        {renderStars(Math.round(averageRating), 20)}
        <Text style={styles.totalRatingsText}>
          {totalRatings} đánh giá
        </Text>
      </View>

      <View style={styles.distributionContainer}>
        {[5, 4, 3, 2, 1].map((star) => (
          <View key={star} style={styles.distributionRow}>
            <Text style={styles.starLabel}>{star}</Text>
            <Ionicons name="star" size={12} color="#FFD700" />
            <View style={styles.distributionBar}>
              <View 
                style={[
                  styles.distributionFill,
                  { 
                    width: totalRatings > 0 
                      ? `${(ratingDistribution[star] / totalRatings) * 100}%` 
                      : '0%'
                  }
                ]} 
              />
            </View>
            <Text style={styles.distributionCount}>
              {ratingDistribution[star]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="star-outline" size={64} color="#E0E0E0" />
      <Text style={styles.emptyTitle}>Chưa có đánh giá</Text>
      <Text style={styles.emptyMessage}>
        {photographerName} chưa có đánh giá nào từ khách hàng
      </Text>
    </View>
  );

  // Render error state
  const renderErrorState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
      <Text style={styles.emptyTitle}>Lỗi tải đánh giá</Text>
      <Text style={styles.emptyMessage}>
        {error || 'Không thể tải danh sách đánh giá'}
      </Text>
      <TouchableOpacity 
        style={styles.retryButton}
        onPress={() => {
          setHasLoadedRatings(false);
          const numericPhotographerId = typeof photographerId === 'string' 
            ? parseInt(photographerId, 10) 
            : photographerId;
          if (!isNaN(numericPhotographerId)) {
            getRatingsByPhotographer(numericPhotographerId);
          }
        }}
      >
        <Text style={styles.retryButtonText}>Thử lại</Text>
      </TouchableOpacity>
    </View>
  );

  // Render loading state
  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#000000" />
      <Text style={styles.loadingText}>Đang tải đánh giá...</Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Đánh giá</Text>
            <Text style={styles.headerSubtitle}>{photographerName}</Text>
          </View>
          
          <View style={styles.headerRight} />
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          {loadingRatings ? (
            renderLoadingState()
          ) : error ? (
            renderErrorState()
          ) : photographerRatings.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {/* Statistics */}
              {renderStatistics()}

              {/* Ratings List */}
              <View style={styles.ratingsListContainer}>
                <Text style={styles.sectionTitle}>Tất cả đánh giá</Text>
                {photographerRatings.map(renderRatingItem)}
              </View>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerLeft: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  statisticsContainer: {
    backgroundColor: '#F8F8F8',
    padding: 20,
    margin: 16,
    borderRadius: 12,
  },
  overallRating: {
    alignItems: 'center',
    marginBottom: 20,
  },
  averageRatingText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  totalRatingsText: {
    fontSize: 14,
    color: '#666666',
  },
  distributionContainer: {
    gap: 8,
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starLabel: {
    fontSize: 12,
    color: '#000000',
    width: 12,
    textAlign: 'center',
  },
  distributionBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  distributionFill: {
    height: '100%',
    backgroundColor: '#FFD700',
  },
  distributionCount: {
    fontSize: 12,
    color: '#666666',
    width: 20,
    textAlign: 'right',
  },
  ratingsListContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  ratingItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ratingUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitial: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  ratingDate: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  ratingScore: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  ratingComment: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  bookingDate: {
    fontSize: 12,
    color: '#999999',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#000000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 300,
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 16,
  },
});

export default PhotographerRatingsModal;