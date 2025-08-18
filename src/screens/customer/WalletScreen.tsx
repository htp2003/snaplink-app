import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWallet } from '../../hooks/useWallet';
import WalletTopUpModal from '../../components/WalletTopUpModal';

const WalletScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  
  // State for Top-up Modal
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  
  const {
    walletBalance,
    loading,
    refreshing,
    error,
    refreshWalletData,
    formatCurrency,
    getBalanceColor,
  } = useWallet();

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleTopUpPress = () => {
    setShowTopUpModal(true);
  };

  const handleTopUpSuccess = () => {
    // Refresh wallet data after successful top-up
    refreshWalletData();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <View className="flex-1 bg-gray-50">
        <View 
          className="bg-white px-4 pb-4 border-b border-gray-200"
          style={{ paddingTop: insets.top }}
        >
          <View className="flex-row items-center">
            <TouchableOpacity onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
            <Text className="text-xl font-semibold text-black ml-4">Ví của bạn</Text>
          </View>
        </View>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#FF385C" />
          <Text className="mt-4 text-gray-600">Đang tải thông tin ví...</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View 
        className="bg-white px-4 pb-4 border-b border-gray-200"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity onPress={handleGoBack}>
              <Ionicons name="arrow-back" size={24} color="#000000" />
            </TouchableOpacity>
            <Text className="text-xl font-semibold text-black ml-4">Ví của bạn</Text>
          </View>
          <TouchableOpacity onPress={refreshWalletData}>
            <Ionicons name="refresh-outline" size={24} color="#000000" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshWalletData}
            colors={['#FF385C']}
            tintColor="#FF385C"
          />
        }
      >
        {/* Balance Card */}
        <View className="mx-4 mt-6 mb-6">
          <View className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 shadow-lg">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-black text-lg font-medium">Số dư hiện tại</Text>
              <Ionicons name="wallet-outline" size={28} color="#FF0000" />
            </View>
            
            {error ? (
              <View className="items-center py-4">
                <Ionicons name="alert-circle-outline" size={48} color="#FFFFFF" />
                <Text className="text-black text-center mt-2">{error}</Text>
                <TouchableOpacity
                  className="bg-red-500 bg-opacity-20 px-4 py-2 rounded-lg mt-3"
                  onPress={refreshWalletData}
                >
                  <Text className="text-black font-medium">Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : walletBalance ? (
              <>
                <Text 
                  className="text-black text-4xl font-bold mb-2"
                  style={{ color: getBalanceColor(walletBalance.balance) }}
                >
                  {formatCurrency(walletBalance.balance)}
                </Text>
                
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={16} color="#FFFFFF" />
                  <Text className="text-black text-sm opacity-80 ml-2">
                    Cập nhật: {formatDate(walletBalance.lastUpdated)}
                  </Text>
                </View>
                
                {walletBalance.currency && (
                  <View className="flex-row items-center mt-2">
                    <Ionicons name="card-outline" size={16} color="#FFFFFF" />
                    <Text className="text-black text-sm opacity-80 ml-2">
                      Đơn vị: {walletBalance.currency}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View className="items-center py-4">
                <Text className="text-white text-2xl font-bold">---</Text>
                <Text className="text-white text-sm opacity-80 mt-2">
                  Không có dữ liệu
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="mx-4 mb-6">
          <Text className="text-lg font-semibold text-black mb-4">Thao tác nhanh</Text>
          
          <View className="flex-row justify-between">
            {/* Top-up Button */}
            <TouchableOpacity
              className="flex-1 bg-white rounded-xl p-4 mr-2 shadow-sm border border-gray-100"
              onPress={handleTopUpPress}
              activeOpacity={0.7}
            >
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-green-100 items-center justify-center mb-3">
                  <Ionicons name="add-circle" size={24} color="#10B981" />
                </View>
                <Text className="text-base font-semibold text-black mb-1">
                  Nạp tiền
                </Text>
                <Text className="text-sm text-gray-500 text-center">
                  Nạp tiền vào ví
                </Text>
              </View>
            </TouchableOpacity>

            {/* Transaction History Button (Coming Soon) */}
            <TouchableOpacity
              className="flex-1 bg-white rounded-xl p-4 ml-2 shadow-sm border border-gray-100 opacity-60"
              disabled={true}
              activeOpacity={0.7}
            >
              <View className="items-center">
                <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mb-3">
                  <Ionicons name="receipt-outline" size={24} color="#3B82F6" />
                </View>
                <Text className="text-base font-semibold text-black mb-1">
                  Lịch sử
                </Text>
                <Text className="text-sm text-gray-500 text-center">
                  Xem giao dịch
                </Text>
                <View className="absolute top-2 right-2 bg-orange-100 px-2 py-1 rounded-full">
                  <Text className="text-orange-600 text-xs font-medium">Sớm</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Information Cards */}
        <View className="mx-4 mb-6">
          <Text className="text-lg font-semibold text-black mb-4">Thông tin ví</Text>
          
          {/* Balance Status Card */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <View className="flex-row items-center">
              <View
                className={`w-12 h-12 rounded-full items-center justify-center mr-3`}
                style={{ 
                  backgroundColor: walletBalance 
                    ? `${getBalanceColor(walletBalance.balance)}20` 
                    : '#F0F0F0' 
                }}
              >
                <Ionicons 
                  name="trending-up-outline" 
                  size={24} 
                  color={walletBalance ? getBalanceColor(walletBalance.balance) : '#C0C0C0'} 
                />
              </View>
              
              <View className="flex-1">
                <Text className="text-base font-semibold text-black mb-1">
                  Trạng thái số dư
                </Text>
                <Text className="text-sm text-gray-500">
                  {walletBalance
                    ? walletBalance.balance > 100000
                      ? "Số dư ổn định"
                      : walletBalance.balance > 0
                      ? "Số dư thấp"
                      : "Cần nạp tiền"
                    : "Chưa có thông tin"
                  }
                </Text>
              </View>
              
              <Ionicons name="chevron-forward" size={20} color="#C0C0C0" />
            </View>
          </View>

          {/* User ID Card */}
          {walletBalance && (
            <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <View className="flex-row items-center">
                <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-3">
                  <Ionicons name="person-outline" size={24} color="#3B82F6" />
                </View>
                
                <View className="flex-1">
                  <Text className="text-base font-semibold text-black mb-1">
                    ID người dùng
                  </Text>
                  <Text className="text-sm text-gray-500">
                    {walletBalance.userId}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Payment Methods Info */}
          <View className="bg-white rounded-xl p-4 shadow-sm">
            <View className="flex-row items-center mb-3">
              <View className="w-12 h-12 rounded-full bg-purple-100 items-center justify-center mr-3">
                <Ionicons name="card-outline" size={24} color="#8B5CF6" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-black mb-1">
                  Phương thức thanh toán
                </Text>
                <Text className="text-sm text-gray-500">
                  Hỗ trợ tất cả ngân hàng Việt Nam
                </Text>
              </View>
            </View>
            
            <View className="bg-purple-50 rounded-lg p-3 mt-2">
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark" size={16} color="#8B5CF6" />
                <Text className="text-sm text-purple-700 ml-2 flex-1">
                  Thanh toán an toàn với mã QR Banking
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Wallet Top-up Modal */}
      <WalletTopUpModal
        visible={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        onSuccess={handleTopUpSuccess}
      />
    </View>
  );
};

export default WalletScreen;