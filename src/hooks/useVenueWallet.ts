// hooks/useVenueWallet.ts

import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import walletService from "../services/walletService";
import { usePayment } from "./usePayment";
import { WalletBalance } from "../types/wallet";
import type { CreateWalletTopUpRequest } from "../types/payment";

export const useVenueWallet = () => {
  const [walletBalance, setWalletBalance] = useState<WalletBalance | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Payment hook for top-up functionality
  const {
    createWalletTopUp,
    creatingWalletTopUp,
    error: paymentError,
  } = usePayment();

  // Fetch wallet balance using token authentication
  const fetchWalletBalance = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      console.log("🔄 [VenueOwner] Fetching wallet balance...");
      const balance = await walletService.getWalletBalance();
      console.log("✅ [VenueOwner] Wallet balance fetched:", balance);

      setWalletBalance(balance);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Có lỗi xảy ra khi tải số dư ví";
      setError(errorMessage);
      console.error("❌ [VenueOwner] Error fetching wallet balance:", err);

      // Show error alert for venue owners
      Alert.alert("Lỗi Ví Điện Tử", errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh wallet data
  const refreshWalletData = useCallback(async () => {
    setRefreshing(true);
    await fetchWalletBalance(false);
    setRefreshing(false);
  }, [fetchWalletBalance]);

  // Create wallet top-up for venue owners
  const createVenueWalletTopUp = useCallback(
    async (request: CreateWalletTopUpRequest) => {
      try {
        console.log("🏢 [VenueOwner] Creating wallet top-up:", request);

        // Add venue-specific description prefix
        const venueRequest = {
          ...request,
          productName: `${request.productName} - Venue Owner`,
          description: `Venue: ${request.description}`,
        };

        const response = await createWalletTopUp(venueRequest);
        console.log("✅ [VenueOwner] Wallet top-up created successfully");
        return response;
      } catch (err) {
        console.error("❌ [VenueOwner] Error creating wallet top-up:", err);
        throw err;
      }
    },
    [createWalletTopUp]
  );

  // Format currency helper with VND support
  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  }, []);

  // Format amount for display (shorter format)
  const formatAmount = useCallback((amount: number): string => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`;
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 0)}K`;
    }
    return amount.toString();
  }, []);

  // Venue-specific quick amounts for top-up (TESTING FRIENDLY!)
  const getVenueQuickAmounts = useCallback((): number[] => {
    return [
      5000, // 5K - minimum for testing
      10000, // 10K
      20000, // 20K
      30000, // 30K
      40000, // 40K
      100000, // 100K
    ];
  }, []);

  // Validate top-up amount for venue owners (TESTING FRIENDLY!)
  const validateVenueTopUpAmount = useCallback(
    (
      amount: number
    ): {
      isValid: boolean;
      error?: string;
    } => {
      if (!amount || amount <= 0) {
        return { isValid: false, error: "Vui lòng nhập số tiền hợp lệ" };
      }

      if (amount < 5000) {
        return { isValid: false, error: "Số tiền nạp tối thiểu là 5,000 VND" };
      }

      if (amount > 10000000) {
        return {
          isValid: false,
          error: "Số tiền nạp tối đa là 10,000,000 VND",
        };
      }

      return { isValid: true };
    },
    []
  );

  // Get recommended top-up amount based on current balance (TESTING FRIENDLY!)
  const getRecommendedTopUpAmount = useCallback(
    (currentBalance: number): number => {
      if (currentBalance < 10000) return 20000; // 20K for very low balance
      if (currentBalance < 30000) return 40000; // 40K for low balance
      if (currentBalance < 100000) return 100000; // 100K for medium balance
      return 200000; // 200K for high balance users
    },
    []
  );

  // Get balance status for venue owners (TESTING FRIENDLY!)
  const getBalanceStatus = useCallback(
    (
      balance: number
    ): {
      status: "excellent" | "good" | "low" | "critical";
      message: string;
      color: string;
      icon: string;
    } => {
      if (balance >= 100000) {
        return {
          status: "excellent",
          message: "Số dư tuyệt vời cho hoạt động kinh doanh",
          color: "#10B981",
          icon: "checkmark-circle",
        };
      }
      if (balance >= 30000) {
        return {
          status: "good",
          message: "Số dư ổn định để vận hành",
          color: "#8B5CF6",
          icon: "thumbs-up",
        };
      }
      if (balance >= 10000) {
        return {
          status: "low",
          message: "Nên nạp thêm tiền để đảm bảo hoạt động",
          color: "#F59E0B",
          icon: "warning",
        };
      }
      return {
        status: "critical",
        message: "Số dư thấp, cần nạp tiền ngay",
        color: "#EF4444",
        icon: "alert-circle",
      };
    },
    []
  );

  // Get balance color based on amount (TESTING FRIENDLY!)
  const getBalanceColor = useCallback((balance: number): string => {
    if (balance >= 100000) return "#10B981"; // Green for high balance
    if (balance >= 30000) return "#8B5CF6"; // Purple for medium balance
    if (balance >= 10000) return "#F59E0B"; // Orange for low balance
    return "#EF4444"; // Red for very low balance
  }, []);

  // Get venue business insights (TESTING FRIENDLY!)
  const getVenueBusinessInsights = useCallback((balance: number) => {
    const insights = [];

    if (balance < 5000) {
      insights.push({
        type: "critical",
        message: "Số dư quá thấp, không thể thực hiện giao dịch",
        action: "Nạp tiền ngay",
        priority: "high",
      });
    } else if (balance < 10000) {
      insights.push({
        type: "warning",
        message: "Số dư thấp có thể ảnh hưởng đến hoạt động",
        action: "Nạp thêm 20K",
        priority: "high",
      });
    } else if (balance >= 10000 && balance < 30000) {
      insights.push({
        type: "suggestion",
        message: "Nạp thêm để được ưu tiên hiển thị địa điểm",
        action: "Nạp 40K",
        priority: "medium",
      });
    } else if (balance >= 100000) {
      insights.push({
        type: "success",
        message: "Số dư tuyệt vời! Địa điểm của bạn sẽ được ưu tiên",
        action: "Tiếp tục kinh doanh",
        priority: "low",
      });
    }

    return insights;
  }, []);

  // Calculate venue spending power (TESTING FRIENDLY!)
  const getVenueSpendingPower = useCallback(
    (
      balance: number
    ): {
      canAffordPromotions: boolean;
      canAffordEvents: boolean;
      canAffordSubscriptions: boolean;
      estimatedDaysRunning: number;
    } => {
      const avgDailyCost = 2000; // Reduced daily cost for testing

      return {
        canAffordPromotions: balance >= 10000, // 10K instead of 100K
        canAffordEvents: balance >= 20000, // 20K instead of 200K
        canAffordSubscriptions: balance >= 30000, // 30K instead of 500K
        estimatedDaysRunning: Math.floor(balance / avgDailyCost),
      };
    },
    []
  );

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
    creatingWalletTopUp,

    // Error states
    error: error || paymentError,

    // Actions
    fetchWalletBalance,
    refreshWalletData,
    createVenueWalletTopUp,

    // Utilities
    formatCurrency,
    formatAmount,
    getBalanceColor,
    getBalanceStatus,
    getVenueQuickAmounts,
    validateVenueTopUpAmount,
    getRecommendedTopUpAmount,
    getVenueBusinessInsights,
    getVenueSpendingPower,

    // Computed values (TESTING FRIENDLY!)
    hasLowBalance: walletBalance ? walletBalance.balance < 10000 : false,
    hasCriticalBalance: walletBalance ? walletBalance.balance < 5000 : false,
    hasExcellentBalance: walletBalance
      ? walletBalance.balance >= 100000
      : false,
    balanceStatus: walletBalance
      ? getBalanceStatus(walletBalance.balance)
      : null,
    businessInsights: walletBalance
      ? getVenueBusinessInsights(walletBalance.balance)
      : [],
    spendingPower: walletBalance
      ? getVenueSpendingPower(walletBalance.balance)
      : null,

    // Venue-specific flags (TESTING FRIENDLY!)
    canRunPromotions: walletBalance ? walletBalance.balance >= 10000 : false,
    canCreateEvents: walletBalance ? walletBalance.balance >= 20000 : false,
    canUpgradeSubscription: walletBalance
      ? walletBalance.balance >= 30000
      : false,
  };
};
