// hooks/useTransaction.ts

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import transactionService from '../services/transactionService';
import { 
  Transaction, 
  TransactionHistoryData,
  DisplayTransaction,
  TransactionStats,
  WalletBalance,
  TransactionHistoryParams 
} from '../types/transaction';

interface UseTransactionHistoryReturn {
  transactions: DisplayTransaction[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  hasMore: boolean;
  totalCount: number;
  fetchTransactions: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  loadMoreTransactions: () => Promise<void>;
}

interface UseWalletReturn {
  balance: WalletBalance;
  loading: boolean;
  error: string | null;
  fetchBalance: () => Promise<void>;
  refreshBalance: () => Promise<void>;
}

interface UseTransactionStatsReturn {
  stats: TransactionStats;
  loading: boolean;
  error: string | null;
  fetchStats: () => Promise<void>;
  refreshStats: () => Promise<void>;
}

// Hook for transaction history
export const useTransactionHistory = (photographerId: number, pageSize = 10): UseTransactionHistoryReturn => {
  const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTransactions = useCallback(async (page = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setCurrentPage(1);
      } else if (page === 1) {
        setLoading(true);
      }

      setError(null);

      const params: TransactionHistoryParams = {
        photographerId,
        page,
        pageSize,
      };

      const response = await transactionService.getPhotographerTransactionHistory(params);
      
      // Check if response has transactions
      if (!response || !response.transactions) {
        throw new Error('No transaction data received');
      }

      // Convert API transactions to DisplayTransactions
      const formattedTransactions: DisplayTransaction[] = response.transactions.map(transaction => 
        transactionService.convertToDisplayTransaction(transaction)
      );

      if (page === 1 || isRefresh) {
        setTransactions(formattedTransactions);
      } else {
        setTransactions(prev => [...prev, ...formattedTransactions]);
      }

      setTotalCount(response.totalCount || 0);
      setHasMore(page < (response.totalPages || 1));
      setCurrentPage(page);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định';
      setError(errorMessage);
      console.error('Error fetching transactions:', err);
      
      Alert.alert(
        'Lỗi', 
        'Không thể tải lịch sử giao dịch. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [photographerId, pageSize]);

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

// Hook for user transaction history
export const useUserTransactionHistory = (userId: number, pageSize = 10): UseTransactionHistoryReturn => {
  const [transactions, setTransactions] = useState<DisplayTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchTransactions = useCallback(async (page = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setCurrentPage(1);
      } else if (page === 1) {
        setLoading(true);
      }

      setError(null);

      // Gọi getUserTransactionHistory thay vì getPhotographerTransactionHistory
      const response = await transactionService.getUserTransactionHistory(userId, page, pageSize);
      
      // Check if response has transactions
      if (!response || !response.transactions) {
        throw new Error('No transaction data received');
      }

      // Convert API transactions to DisplayTransactions
      const formattedTransactions: DisplayTransaction[] = response.transactions.map(transaction => 
        transactionService.convertToDisplayTransaction(transaction)
      );

      if (page === 1 || isRefresh) {
        setTransactions(formattedTransactions);
      } else {
        setTransactions(prev => [...prev, ...formattedTransactions]);
      }

      setTotalCount(response.totalCount || 0);
      setHasMore(page < (response.totalPages || 1));
      setCurrentPage(page);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định';
      setError(errorMessage);
      console.error('Error fetching user transactions:', err);
      
      Alert.alert(
        'Lỗi', 
        'Không thể tải lịch sử giao dịch. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, pageSize]); // Đổi từ photographerId thành userId

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
    if (userId > 0) { // Only fetch if we have a valid userId
      fetchTransactions();
    }
  }, [fetchTransactions, userId]);

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

// Hook for wallet balance
export const useWallet = (userId: number): UseWalletReturn => {
  const [balance, setBalance] = useState<WalletBalance>({
    availableBalance: 0,
    pendingBalance: 0,
    totalBalance: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const balanceData = await transactionService.getWalletBalance(userId);
      setBalance(balanceData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định';
      setError(errorMessage);
      console.error('Error fetching wallet balance:', err);
      
      Alert.alert(
        'Lỗi', 
        'Không thể tải thông tin ví. Vui lòng thử lại.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const refreshBalance = useCallback(() => {
    return fetchBalance();
  }, [fetchBalance]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    error,
    fetchBalance,
    refreshBalance,
  };
};

// Hook for transaction statistics
export const useTransactionStats = (photographerId: number): UseTransactionStatsReturn => {
  const [stats, setStats] = useState<TransactionStats>({
    todayIncome: 0,
    monthlyIncome: 0,
    pendingAmount: 0,
    completedBookings: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateStats = useCallback((transactions: Transaction[]) => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    let todayIncome = 0;
    let monthlyIncome = 0;
    let pendingAmount = 0;
    let completedBookings = 0;

    // Check if transactions is an array before forEach
    if (!Array.isArray(transactions)) {
      console.warn('Transactions is not an array:', transactions);
      return {
        todayIncome: 0,
        monthlyIncome: 0,
        pendingAmount: 0,
        completedBookings: 0,
      };
    }

    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.createdAt);
      const isIncome = transactionService.formatTransactionForDisplay(transaction).displayType === 'income';

      if (isIncome) {
        if (transaction.status.toLowerCase() === 'pending') {
          pendingAmount += transaction.amount;
        }

        if (transaction.status.toLowerCase() === 'success') {
          if (transactionDate >= startOfDay) {
            todayIncome += transaction.amount;
          }
          if (transactionDate >= startOfMonth) {
            monthlyIncome += transaction.amount;
          }
          // Count completed bookings (assuming payment transactions are from bookings)
          if (transaction.type.toLowerCase() === 'payment') {
            completedBookings++;
          }
        }
      }
    });

    return {
      todayIncome,
      monthlyIncome,
      pendingAmount,
      completedBookings,
    };
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch more transactions for better statistics (e.g., last 100 transactions)
      const response = await transactionService.getPhotographerTransactionHistory({
        photographerId,
        page: 1,
        pageSize: 100,
      });

      // Check if response has transactions before calculating stats
      if (!response || !response.transactions) {
        console.warn('No transaction data for stats calculation');
        setStats({
          todayIncome: 0,
          monthlyIncome: 0,
          pendingAmount: 0,
          completedBookings: 0,
        });
        return;
      }

      const calculatedStats = calculateStats(response.transactions);
      setStats(calculatedStats);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định';
      setError(errorMessage);
      console.error('Error fetching transaction stats:', err);
      
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
  }, [photographerId, calculateStats]);

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

// Hook for single transaction details
export const useTransaction = (transactionId: number | null) => {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransaction = useCallback(async () => {
    if (!transactionId) return;

    try {
      setLoading(true);
      setError(null);

      const transactionData = await transactionService.getTransactionById(transactionId);
      setTransaction(transactionData);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi không xác định';
      setError(errorMessage);
      console.error('Error fetching transaction:', err);
    } finally {
      setLoading(false);
    }
  }, [transactionId]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  return {
    transaction,
    loading,
    error,
    refetch: fetchTransaction,
  };
};