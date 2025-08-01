import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { cleanupService } from '../services/cleanupService';
import { getResponsiveSize } from '../utils/responsive';

interface CleanupButtonProps {
  style?: any;
  onCleanupSuccess?: () => void;
  onCleanupError?: (error: any) => void;
}

export const CleanupButton: React.FC<CleanupButtonProps> = ({
  style,
  onCleanupSuccess,
  onCleanupError
}) => {
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  
  const handleCleanup = async () => {
    try {
      setIsCleaningUp(true);
      
      const success = await cleanupService.manualCleanup();
      
      if (success) {
        Alert.alert(
          'Cleanup thành công! 🎉',
          'Đã xóa tất cả booking pending. Time slots hiện đã được giải phóng.',
          [{ text: 'OK' }]
        );
        onCleanupSuccess?.();
      } else {
        throw new Error('Cleanup failed');
      }
      
    } catch (error) {
      console.error('Cleanup error:', error);
      Alert.alert(
        'Lỗi cleanup ❌',
        'Không thể thực hiện cleanup. Vui lòng thử lại sau.',
        [{ text: 'OK' }]
      );
      onCleanupError?.(error);
    } finally {
      setIsCleaningUp(false);
    }
  };
  
  // Chỉ hiện trong development
  if (!__DEV__) return null;
  
  return (
    <TouchableOpacity
      style={[styles.cleanupButton, style]}
      onPress={handleCleanup}
      disabled={isCleaningUp}
      activeOpacity={0.8}
    >
      {isCleaningUp ? (
        <>
          <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.cleanupButtonText}>Cleaning up...</Text>
        </>
      ) : (
        <Text style={styles.cleanupButtonText}>🧹 Cleanup Pending Bookings</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cleanupButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(12),
    borderRadius: getResponsiveSize(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: getResponsiveSize(8),
  },
  cleanupButtonText: {
    color: '#fff',
    fontSize: getResponsiveSize(14),
    fontWeight: '600',
  },
});