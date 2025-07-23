// hooks/usePhotographerNavigation.ts

import { useNavigation } from '@react-navigation/native';
import { Alert } from 'react-native';
import { usePhotographerAuth } from './usePhotographerAuth';

/**
 * Hook để handle navigation với photographer context
 * Tự động truyền photographerId và userId vào navigation params
 */
export const usePhotographerNavigation = () => {
  const navigation = useNavigation<any>(); // Use any to avoid navigation typing issues
  const { userId, photographerId } = usePhotographerAuth();

  const navigateToTransactionHistory = () => {
    if (!photographerId) {
      console.warn('No photographerId available for navigation');
      Alert.alert('Lỗi', 'Không tìm thấy thông tin photographer');
      return;
    }
    
    try {
      navigation.navigate('TransactionHistoryScreen', { 
        photographerId,
        userId 
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Lỗi', 'Không thể điều hướng đến lịch sử giao dịch');
    }
  };

  const navigateToTransactionDetail = (transactionId: number) => {
    if (!transactionId) {
      console.warn('No transactionId provided for navigation');
      return;
    }

    try {
      navigation.navigate('TransactionDetailScreen', { 
        transactionId,
        photographerId,
        userId 
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Lỗi', 'Không thể điều hướng đến chi tiết giao dịch');
    }
  };

  const navigateToWithdrawal = () => {
    if (!userId) {
      console.warn('No userId available for navigation');
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }
    
    try {
      navigation.navigate('WithdrawalScreen', { 
        userId,
        photographerId 
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Lỗi', 'Không thể điều hướng đến trang rút tiền');
    }
  };

  const navigateToBankAccount = () => {
    if (!userId) {
      console.warn('No userId available for navigation');
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }
    
    try {
      navigation.navigate('BankAccountScreen', { 
        userId,
        photographerId 
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Lỗi', 'Không thể điều hướng đến thông tin tài khoản');
    }
  };

  const navigateToSupport = () => {
    try {
      navigation.navigate('SupportScreen', { 
        userId,
        photographerId 
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Lỗi', 'Không thể điều hướng đến trang hỗ trợ');
    }
  };

  const navigateToCreatePhotographerProfile = () => {
    if (!userId) {
      console.warn('No userId available for navigation');
      Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng');
      return;
    }
    
    try {
      navigation.navigate('CreatePhotographerProfileScreen', { 
        userId 
      });
    } catch (error) {
      console.error('Navigation error:', error);
      Alert.alert('Lỗi', 'Không thể điều hướng đến trang tạo hồ sơ');
    }
  };

  // Simple navigation function without parameters
  const navigateToScreen = (screenName: string, params?: any) => {
    try {
      const defaultParams = {
        userId,
        photographerId,
        ...params
      };
      
      navigation.navigate(screenName, defaultParams);
    } catch (error) {
      console.error('Navigation error to', screenName, ':', error);
      Alert.alert('Lỗi', `Không thể điều hướng đến ${screenName}`);
    }
  };

  // Go back function
  const goBack = () => {
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        // If can't go back, navigate to a default screen
        navigation.navigate('PhotographerHomeScreen');
      }
    } catch (error) {
      console.error('Go back error:', error);
    }
  };

  return {
    // Specific navigation functions
    navigateToTransactionHistory,
    navigateToTransactionDetail,
    navigateToWithdrawal,
    navigateToBankAccount,
    navigateToSupport,
    navigateToCreatePhotographerProfile,
    
    // Generic navigation functions
    navigateToScreen,
    goBack,
    
    // Raw navigation for custom use
    navigation,
    
    // IDs for manual use
    userId,
    photographerId,
  };
};