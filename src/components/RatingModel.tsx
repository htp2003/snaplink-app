// components/modals/RatingModal.tsx - Rating Modal Component FIXED

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { RatingTarget } from '../types/rating';
import { BookingResponse } from '../types/booking';
import { useRating } from '../hooks/useRating';
import { getResponsiveSize } from '../utils/responsive';

const { height: screenHeight } = Dimensions.get('window');

interface RatingStep {
  type: RatingTarget;
  id: number;
  name: string;
  title: string;
  subtitle: string;
}

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  booking: BookingResponse;
  userId: number;
  onComplete?: () => void;
}

const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  onClose,
  booking,
  userId,
  onComplete,
}) => {
  // ===== STATES =====
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentScore, setCurrentScore] = useState(5);
  const [currentComment, setCurrentComment] = useState('');
  const [completedRatings, setCompletedRatings] = useState<Record<string, boolean>>({});
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));

  // ===== HOOKS =====
  const {
    createPhotographerRating,
    createLocationRating,
    creatingRating,
    error: ratingError,
    setError,
  } = useRating();

  // ===== RATING STEPS CONFIGURATION =====
  const ratingSteps: RatingStep[] = [];

  // Add photographer rating if exists
  if (booking.photographer) {
    ratingSteps.push({
      type: 'photographer',
      id: booking.photographer.photographerId,
      name: booking.photographer.fullName || booking.photographer.fullName,
      title: 'Đánh giá Photographer',
      subtitle: `Bạn cảm thấy thế nào về dịch vụ của ${booking.photographer.fullName}?`,
    });
  }

  // Add location rating if exists (either location or externalLocation)
  if (booking.location) {
    ratingSteps.push({
      type: 'location',
      id: booking.location.locationId,
      name: booking.location.name,
      title: 'Đánh giá Địa điểm',
      subtitle: `Bạn cảm thấy thế nào về địa điểm ${booking.location.name}?`,
    });
  } else if (booking.externalLocation) {
    ratingSteps.push({
      type: 'location',
      id: booking.externalLocation.id || 0,
      name: booking.externalLocation.name,
      title: 'Đánh giá Địa điểm',
      subtitle: `Bạn cảm thấy thế nào về địa điểm ${booking.externalLocation.name}?`,
    });
  }

  const currentStep = ratingSteps[currentStepIndex];
  const isLastStep = currentStepIndex === ratingSteps.length - 1;
  const hasNextStep = currentStepIndex < ratingSteps.length - 1;

  // ===== EFFECTS =====
  useEffect(() => {
    if (visible) {
      setCurrentStepIndex(0);
      setCurrentScore(5);
      setCurrentComment('');
      setCompletedRatings({});
      setError(null);
      
      // Animate in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.8);
    }
  }, [visible]);

  // ===== RATING UTILITIES =====
  const getRatingLabel = (score: number): string => {
    const labels = {
      1: 'Rất tệ',
      2: 'Tệ',
      3: 'Bình thường',
      4: 'Tốt',
      5: 'Xuất sắc'
    };
    return labels[score as keyof typeof labels] || 'Chưa chọn';
  };

  const getRatingColor = (score: number): string => {
    const colors = {
      1: '#f44336', // Red
      2: '#ff9800', // Orange
      3: '#ffeb3b', // Yellow
      4: '#8bc34a', // Light Green
      5: '#4caf50'  // Green
    };
    return colors[score as keyof typeof colors] || '#757575';
  };

  const getRatingIcon = (
    score: number
  ): 'sad-outline' | 'happy-outline' | 'heart-outline' => {
    const icons = {
      1: 'sad-outline',
      2: 'sad-outline',
      3: 'happy-outline',
      4: 'happy-outline',
      5: 'heart-outline',
    } as const;
    return icons[score as keyof typeof icons] || 'happy-outline';
  };

  // ===== HANDLERS =====
  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleStarPress = (score: number) => {
    setCurrentScore(score);
  };

  const handleSubmitRating = async () => {
    if (!currentStep) return;

    try {
      setError(null);
      
      const bookingId = booking.id || booking.bookingId;
      let result = null;

      if (currentStep.type === 'photographer') {
        result = await createPhotographerRating(
          bookingId,
          userId,
          currentStep.id,
          currentScore,
          currentComment.trim() || undefined
        );
      } else if (currentStep.type === 'location' && currentStep.id > 0) {
        // Only create location rating if we have a valid location ID
        result = await createLocationRating(
          bookingId,
          userId,
          currentStep.id,
          currentScore,
          currentComment.trim() || undefined
        );
      }
    
      if (result) {
        // Mark this step as completed
        setCompletedRatings(prev => ({
          ...prev,
          [currentStep.type]: true,
        }));

        console.log(`✅ Rating completed for ${currentStep.type}:`, result);

        if (hasNextStep) {
          // Move to next step
          setCurrentStepIndex(prev => prev + 1);
          setCurrentScore(5);
          setCurrentComment('');
        } else {
          // All ratings completed
          Alert.alert(
            'Cảm ơn bạn!',
            'Đánh giá của bạn đã được gửi thành công.',
            [
              {
                text: 'OK',
                onPress: () => {
                  handleClose();
                  onComplete?.();
                },
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      Alert.alert(
        'Lỗi',
        'Không thể gửi đánh giá. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleSkip = () => {
    if (hasNextStep) {
      setCurrentStepIndex(prev => prev + 1);
      setCurrentScore(5);
      setCurrentComment('');
    } else {
      handleClose();
      onComplete?.();
    }
  };

  // ===== RENDER METHODS =====
  const renderStarRating = () => {
    return (
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginVertical: getResponsiveSize(20) 
      }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handleStarPress(star)}
            style={{
              marginHorizontal: getResponsiveSize(4),
              transform: [{ scale: star <= currentScore ? 1.1 : 1 }],
            }}
          >
            <Ionicons
              name={star <= currentScore ? 'star' : 'star-outline'}
              size={getResponsiveSize(36)}
              color={star <= currentScore ? getRatingColor(currentScore) : '#E0E0E0'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderProgressIndicator = () => {
    return (
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center', 
        marginBottom: getResponsiveSize(16) 
      }}>
        {ratingSteps.map((_, index) => (
          <View
            key={index}
            style={{
              width: getResponsiveSize(8),
              height: getResponsiveSize(8),
              borderRadius: getResponsiveSize(4),
              marginHorizontal: getResponsiveSize(4),
              backgroundColor: index <= currentStepIndex ? '#3B82F6' : '#D1D5DB',
            }}
          />
        ))}
      </View>
    );
  };

  const renderStepIndicator = () => {
    return (
      <View style={{ alignItems: 'center', marginBottom: getResponsiveSize(20) }}>
        <Text style={{ 
          fontSize: getResponsiveSize(12), 
          color: '#6B7280', 
          marginBottom: getResponsiveSize(8) 
        }}>
          Bước {currentStepIndex + 1} / {ratingSteps.length}
        </Text>
        {renderProgressIndicator()}
      </View>
    );
  };

  const renderCurrentStep = () => {
    if (!currentStep) return null;

    return (
      <View style={{ alignItems: 'center' }}>
        {/* Step Icon */}
        <View 
          style={{
            width: getResponsiveSize(60),
            height: getResponsiveSize(60),
            borderRadius: getResponsiveSize(30),
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: getResponsiveSize(16),
            backgroundColor: getRatingColor(currentScore) + '20',
          }}
        >
          <Ionicons
            name={currentStep.type === 'photographer' ? 'camera' : 'location'}
            size={getResponsiveSize(28)}
            color={getRatingColor(currentScore)}
          />
        </View>

        {/* Title & Subtitle */}
        <Text 
          style={{
            fontSize: getResponsiveSize(18),
            fontWeight: 'bold',
            color: '#000000',
            textAlign: 'center',
            marginBottom: getResponsiveSize(8),
          }}
        >
          {currentStep.title}
        </Text>
        
        <Text 
          style={{
            fontSize: getResponsiveSize(14),
            color: '#6B7280',
            textAlign: 'center',
            marginBottom: getResponsiveSize(16),
            paddingHorizontal: getResponsiveSize(16),
          }}
        >
          {currentStep.subtitle}
        </Text>

        {/* Rating Stars */}
        {renderStarRating()}

        {/* Rating Label */}
        <View style={{ 
          flexDirection: 'row', 
          alignItems: 'center', 
          marginBottom: getResponsiveSize(20) 
        }}>
          <Ionicons
            name={getRatingIcon(currentScore)}
            size={getResponsiveSize(20)}
            color={getRatingColor(currentScore)}
          />
          <Text 
            style={{
              fontSize: getResponsiveSize(16),
              fontWeight: '600',
              marginLeft: getResponsiveSize(8),
              color: getRatingColor(currentScore),
            }}
          >
            {getRatingLabel(currentScore)}
          </Text>
        </View>

        {/* Comment Input */}
        <View style={{ width: '100%', paddingHorizontal: getResponsiveSize(16) }}>
          <Text 
            style={{
              fontSize: getResponsiveSize(12),
              color: '#374151',
              marginBottom: getResponsiveSize(8),
            }}
          >
            Nhận xét (tùy chọn)
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: '#D1D5DB',
              borderRadius: getResponsiveSize(8),
              padding: getResponsiveSize(12),
              fontSize: getResponsiveSize(14),
              color: '#000000',
              minHeight: getResponsiveSize(80),
              textAlignVertical: 'top',
            }}
            placeholder={`Chia sẻ trải nghiệm của bạn về ${currentStep.name}...`}
            placeholderTextColor="#9CA3AF"
            value={currentComment}
            onChangeText={setCurrentComment}
            multiline
            maxLength={500}
          />
          <Text 
            style={{
              fontSize: getResponsiveSize(10),
              color: '#9CA3AF',
              marginTop: getResponsiveSize(4),
              textAlign: 'right',
            }}
          >
            {currentComment.length}/500
          </Text>
        </View>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View 
        style={{ flex: 1, opacity: fadeAnim }}
      >
        <BlurView intensity={50} style={{ flex: 1 }}>
          <View style={{ 
            flex: 1, 
            backgroundColor: 'rgba(0,0,0,0.3)', 
            justifyContent: 'center', 
            alignItems: 'center', 
            padding: getResponsiveSize(16) 
          }}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ width: '100%', maxWidth: getResponsiveSize(400) }}
            >
              <Animated.View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: getResponsiveSize(16),
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.25,
                  shadowRadius: 20,
                  elevation: 10,
                  transform: [{ scale: scaleAnim }],
                  // ✅ FIX: Sử dụng height thay vì maxHeight
                  height: screenHeight * 0.85, // 85% of screen height
                }}
              >
                {/* Header */}
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: getResponsiveSize(16),
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}>
                  <View style={{ flex: 1 }}>
                    <Text 
                      style={{
                        fontSize: getResponsiveSize(16),
                        fontWeight: 'bold',
                        color: '#000000',
                      }}
                    >
                      Đánh giá dịch vụ
                    </Text>
                    <Text 
                      style={{
                        fontSize: getResponsiveSize(12),
                        color: '#6B7280',
                      }}
                    >
                      Booking #{booking.id || booking.bookingId}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={handleClose}
                    style={{
                      width: getResponsiveSize(32),
                      height: getResponsiveSize(32),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="close" size={getResponsiveSize(24)} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Content - ✅ FIX: Sử dụng flex: 1 để content chiếm hết không gian */}
                <ScrollView 
                  style={{ flex: 1 }} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ 
                    paddingHorizontal: getResponsiveSize(16), 
                    paddingVertical: getResponsiveSize(20),
                    flexGrow: 1,
                  }}
                >
                  {ratingSteps.length > 1 && renderStepIndicator()}
                  {renderCurrentStep()}
                  
                  {/* Error Message */}
                  {ratingError && (
                    <View style={{
                      backgroundColor: '#FEF2F2',
                      borderWidth: 1,
                      borderColor: '#FECACA',
                      borderRadius: getResponsiveSize(8),
                      padding: getResponsiveSize(12),
                      marginTop: getResponsiveSize(16),
                    }}>
                      <Text style={{
                        color: '#DC2626',
                        fontSize: getResponsiveSize(12),
                        textAlign: 'center',
                      }}>
                        {ratingError}
                      </Text>
                    </View>
                  )}
                </ScrollView>

                {/* Footer - ✅ FIX: Fixed height để buttons luôn hiện */}
                <View style={{
                  flexDirection: 'row',
                  padding: getResponsiveSize(16),
                  borderTopWidth: 1,
                  borderTopColor: '#F3F4F6',
                  gap: getResponsiveSize(12),
                  // ✅ Ensure footer is always visible
                  backgroundColor: '#FFFFFF',
                }}>
                  {/* Skip Button */}
                  <TouchableOpacity
                    onPress={handleSkip}
                    style={{
                      flex: 1,
                      paddingVertical: getResponsiveSize(12),
                      paddingHorizontal: getResponsiveSize(16),
                      borderWidth: 1,
                      borderColor: '#D1D5DB',
                      borderRadius: getResponsiveSize(8),
                      alignItems: 'center',
                    }}
                    disabled={creatingRating}
                  >
                    <Text 
                      style={{
                        color: '#6B7280',
                        fontSize: getResponsiveSize(14),
                        fontWeight: '500',
                      }}
                    >
                      {hasNextStep ? 'Bỏ qua' : 'Đóng'}
                    </Text>
                  </TouchableOpacity>

                  {/* Submit Button */}
                  <TouchableOpacity
                    onPress={handleSubmitRating}
                    style={{
                      flex: 1,
                      paddingVertical: getResponsiveSize(12),
                      paddingHorizontal: getResponsiveSize(16),
                      borderRadius: getResponsiveSize(8),
                      backgroundColor: creatingRating ? '#9CA3AF' : '#3B82F6',
                      alignItems: 'center',
                    }}
                    disabled={creatingRating}
                  >
                    {creatingRating ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text 
                        style={{
                          color: '#FFFFFF',
                          fontSize: getResponsiveSize(14),
                          fontWeight: '600',
                        }}
                      >
                        {isLastStep ? 'Hoàn thành' : 'Tiếp tục'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </KeyboardAvoidingView>
          </View>
        </BlurView>
      </Animated.View>
    </Modal>
  );
};

export default RatingModal;