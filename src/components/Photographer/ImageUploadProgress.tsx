import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  Animated,
  Dimensions,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface UploadItem {
  id: string;
  uri: string;
  name: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface ImageUploadProgressProps {
  visible: boolean;
  uploads: UploadItem[];
  onClose?: () => void;
}

// FIXED: Separate component for upload item to avoid hooks in loops
const UploadItemComponent: React.FC<{
  item: UploadItem;
  index: number;
  slideAnim: Animated.Value;
}> = ({ item, index, slideAnim }) => {
  // FIXED: Move useRef and useEffect outside of map function
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: item.progress,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [item.progress, progressAnim]);

  return (
    <Animated.View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        transform: [{
          translateY: slideAnim.interpolate({
            inputRange: [0, 50],
            outputRange: [0, index * 10],
          })
        }],
      }}
    >
      <View style={{
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
      }}>
        {/* Image Preview */}
        <View style={{
          width: 60,
          height: 60,
          borderRadius: 8,
          overflow: 'hidden',
          backgroundColor: '#F5F5F5',
          marginRight: 16,
        }}>
          <Image
            source={{ uri: item.uri }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          
          {/* Status Overlay */}
          <View style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: item.status === 'uploading' ? 'rgba(0,0,0,0.3)' : 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {item.status === 'success' && (
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#4CAF50',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              </View>
            )}
            
            {item.status === 'error' && (
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#F44336',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="close" size={16} color="#FFFFFF" />
              </View>
            )}
          </View>
        </View>

        {/* Upload Info */}
        <View style={{ flex: 1 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#000000',
            marginBottom: 4,
          }}>
            {item.name}
          </Text>

          {item.status === 'uploading' && (
            <>
              <Text style={{
                fontSize: 14,
                color: '#666666',
                marginBottom: 8,
              }}>
                Uploading... {Math.round(item.progress)}%
              </Text>
              
              {/* Progress Bar */}
              <View style={{
                height: 4,
                backgroundColor: '#E0E0E0',
                borderRadius: 2,
                overflow: 'hidden',
              }}>
                <Animated.View style={{
                  height: '100%',
                  backgroundColor: '#4CAF50',
                  borderRadius: 2,
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                }} />
              </View>
            </>
          )}

          {item.status === 'success' && (
            <Text style={{
              fontSize: 14,
              color: '#4CAF50',
              fontWeight: '600',
            }}>
              Upload completed successfully!
            </Text>
          )}

          {item.status === 'error' && (
            <Text style={{
              fontSize: 14,
              color: '#F44336',
              fontWeight: '600',
            }}>
              {item.error || 'Upload failed'}
            </Text>
          )}
        </View>

        {/* Status Icon */}
        <View style={{
          width: 32,
          height: 32,
          justifyContent: 'center',
          alignItems: 'center',
          marginLeft: 12,
        }}>
          {item.status === 'uploading' && (
            <Animated.View style={{
              transform: [{
                rotate: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0deg', '360deg'],
                })
              }]
            }}>
              <Ionicons name="sync-outline" size={20} color="#2196F3" />
            </Animated.View>
          )}
          
          {item.status === 'success' && (
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          )}
          
          {item.status === 'error' && (
            <Ionicons name="alert-circle" size={24} color="#F44336" />
          )}
        </View>
      </View>
    </Animated.View>
  );
};

const ImageUploadProgress: React.FC<ImageUploadProgressProps> = ({
  visible,
  uploads,
  onClose,
}) => {
  // FIXED: Keep hooks at top level, not in loops
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  // FIXED: Calculate stats with useMemo to avoid recalculation
  const stats = useMemo(() => {
    const completedUploads = uploads.filter(u => u.status === 'success').length;
    const failedUploads = uploads.filter(u => u.status === 'error').length;
    const totalProgress = uploads.length > 0 ? (completedUploads / uploads.length) * 100 : 0;
    
    return {
      completedUploads,
      failedUploads,
      totalProgress,
    };
  }, [uploads]);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        opacity: fadeAnim,
      }}>
        <Animated.View style={{
          backgroundColor: '#F7F7F7',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '80%',
          transform: [{ translateY: slideAnim }],
        }}>
          <SafeAreaView>
            {/* Header */}
            <View style={{
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: '#E0E0E0',
            }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: '#000000',
                }}>
                  Uploading Images
                </Text>
                
                {stats.completedUploads === uploads.length && uploads.length > 0 && (
                  <View style={{
                    backgroundColor: '#4CAF50',
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 12,
                  }}>
                    <Text style={{
                      color: '#FFFFFF',
                      fontSize: 12,
                      fontWeight: '600',
                    }}>
                      ALL DONE
                    </Text>
                  </View>
                )}
              </View>

              {/* Overall Progress */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}>
                <Text style={{
                  fontSize: 14,
                  color: '#666666',
                }}>
                  {stats.completedUploads} of {uploads.length} completed
                </Text>
                <Text style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: '#000000',
                }}>
                  {Math.round(stats.totalProgress)}%
                </Text>
              </View>

              <View style={{
                height: 6,
                backgroundColor: '#E0E0E0',
                borderRadius: 3,
                overflow: 'hidden',
              }}>
                <Animated.View style={{
                  height: '100%',
                  backgroundColor: stats.failedUploads > 0 ? '#FF9800' : '#4CAF50',
                  borderRadius: 3,
                  width: `${stats.totalProgress}%`,
                }} />
              </View>

              {stats.failedUploads > 0 && (
                <Text style={{
                  fontSize: 12,
                  color: '#F44336',
                  marginTop: 4,
                }}>
                  {stats.failedUploads} upload(s) failed
                </Text>
              )}
            </View>

            {/* Upload List - FIXED: Use separate component to avoid hooks in map */}
            <View style={{
              maxHeight: 400,
              padding: 20,
            }}>
              {uploads.map((item, index) => (
                <UploadItemComponent
                  key={item.id}
                  item={item}
                  index={index}
                  slideAnim={slideAnim}
                />
              ))}
            </View>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default ImageUploadProgress;