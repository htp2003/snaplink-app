// hooks/useVenueOwnerTransaction.ts

import { useState, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import venueTransactionService, {
  VenueTransaction,
  VenueTransactionHistoryData,
  VenueDisplayTransaction,
  VenueTransactionStats,
} from "../services/venueTransactionService";

interface UseVenueOwnerTransactionHistoryReturn {
  transactions: VenueDisplayTransaction[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  fetchTransactions: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  loadMoreTransactions: () => Promise<void>;
}

interface UseVenueOwnerTransactionStatsReturn {
  stats: VenueTransactionStats;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

// Hook for venue owner transaction history
export const useVenueOwnerTransactionHistory = (
  locationOwnerId: number,
  pageSize = 10
): UseVenueOwnerTransactionHistoryReturn => {
  const [transactions, setTransactions] = useState<VenueDisplayTransaction[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTransactions = useCallback(
    async (page = 1, isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
          setCurrentPage(1);
        } else if (page === 1) {
          setLoading(true);
        }

        setError(null);

        const response =
          await venueTransactionService.getLocationOwnerTransactionHistory(
            locationOwnerId,
            page,
            pageSize
          );

        // Check if response has transactions
        if (!response || !response.transactions) {
          throw new Error("No transaction data received");
        }

        // Convert API transactions to VenueDisplayTransactions
        const formattedTransactions: VenueDisplayTransaction[] =
          response.transactions.map((transaction) =>
            venueTransactionService.convertToDisplayTransaction(transaction)
          );

        if (page === 1 || isRefresh) {
          setTransactions(formattedTransactions);
        } else {
          setTransactions((prev) => [...prev, ...formattedTransactions]);
        }

        setTotalCount(response.totalCount || 0);
        setHasMore(page < (response.totalPages || 1));
        setCurrentPage(page);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định";
        setError(errorMessage);
        console.error("Error fetching venue owner transactions:", err);

        Alert.alert(
          "Lỗi",
          "Không thể tải lịch sử giao dịch. Vui lòng thử lại.",
          [{ text: "OK" }]
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [locationOwnerId, pageSize]
  );

  const refreshTransactions = useCallback(() => {
    return fetchTransactions(1, true);
  }, [fetchTransactions]);

  const loadMoreTransactions = useCallback(() => {
    if (hasMore && !loading) {
      return fetchTransactions(currentPage + 1);
    }
    return Promise.resolve();
  }, [fetchTransactions, currentPage, hasMore, loading]);

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    refreshing,
    error,
    hasMore,
    totalCount,
    fetchTransactions: () => fetchTransactions(),
    refreshTransactions,
    loadMoreTransactions,
  };
};

// Hook for venue owner transaction statistics
export const useVenueOwnerTransactionStats = (
  locationOwnerId: number
): UseVenueOwnerTransactionStatsReturn => {
  const [stats, setStats] = useState<VenueTransactionStats>({
    todayIncome: 0,
    monthlyIncome: 0,
    pendingAmount: 0,
    completedBookings: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch more transactions for better statistics (e.g., last 100 transactions)
      const response =
        await venueTransactionService.getLocationOwnerTransactionHistory(
          locationOwnerId,
          1,
          100
        );

      // Check if response has transactions before calculating stats
      if (!response || !response.transactions) {
        console.warn("No transaction data for stats calculation");
        setStats({
          todayIncome: 0,
          monthlyIncome: 0,
          pendingAmount: 0,
          completedBookings: 0,
        });
        return;
      }

      const calculatedStats = venueTransactionService.calculateStats(
        response.transactions
      );
      setStats(calculatedStats);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định";
      setError(errorMessage);
      console.error("Error fetching venue owner transaction stats:", err);

      // Set default stats on error
      setStats({
        todayIncome: 0,
        monthlyIncome: 0,
        pendingAmount: 0,
        completedBookings: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [locationOwnerId]);

  const refreshStats = useCallback(() => {
    return fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    fetchStats,
    refreshStats,
  };
};
