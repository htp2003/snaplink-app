// hooks/useWallet.ts

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import walletService from '../services/walletService';
import { WalletBalance } from '../types/wallet';

export const useWallet = () => {
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch wallet balance using token authentication
  const fetchWalletBalance = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) setLoading(true);
        setError(null);

        console.log("🔄 Fetching wallet balance...");
        const balance = await walletService.getWalletBalance();
        console.log("✅ Wallet balance fetched:", balance);
        
        setWalletBalance(balance);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Có lỗi xảy ra khi tải số dư ví';
        setError(errorMessage);
        console.error('❌ Error fetching wallet balance:', err);
        
        // Show error alert
        Alert.alert('Lỗi', errorMessage);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Refresh wallet data
  const refreshWalletData = useCallback(async () => {
    setRefreshing(true);
    await fetchWalletBalance(false);
    setRefreshing(false);
  }, [fetchWalletBalance]);

  // Format currency helper
  const formatCurrency = useCallback((amount: number): string => {
    return walletService.formatCurrency(amount);
  }, []);

  // Get balance color based on amount
  const getBalanceColor = useCallback((balance: number): string => {
    return walletService.getBalanceColor(balance);
  }, []);

  // Initialize data fetch on mount
  useEffect(() => {
    fetchWalletBalance();
  }, [fetchWalletBalance]);

  return {
    // Data
    walletBalance,
    
    // Loading states
    loading,
    refreshing,
    
    // Error state
    error,
    
    // Actions
    fetchWalletBalance,
    refreshWalletData,
    
    // Utilities
    formatCurrency,
    getBalanceColor,
  };
};