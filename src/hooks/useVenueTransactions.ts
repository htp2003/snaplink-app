// hooks/useVenueTransactions.ts
import { useState, useEffect } from "react";
import {
  venueTransactionService,
  Transaction,
  TransactionHistory,
} from "../services/venueTransactionService";

export const useVenueTransactions = (
  userId?: number,
  locationOwnerId?: number,
  initialPage: number = 1,
  pageSize: number = 10
) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async (page: number = currentPage) => {
    try {
      setLoading(true);
      setError(null);

      let data: TransactionHistory;
      if (locationOwnerId) {
        data = await venueTransactionService.getLocationOwnerTransactionHistory(
          locationOwnerId,
          page,
          pageSize
        );
      } else if (userId) {
        data = await venueTransactionService.getUserTransactionHistory(
          userId,
          page,
          pageSize
        );
      } else {
        throw new Error("Either userId or locationOwnerId must be provided");
      }

      setTransactions(data.transactions);
      setTotalCount(data.totalCount);
      setCurrentPage(data.currentPage);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch transactions"
      );
    } finally {
      setLoading(false);
    }
  };

  const getTransactionById = async (
    transactionId: number
  ): Promise<Transaction | null> => {
    try {
      const data = await venueTransactionService.getTransactionById(
        transactionId
      );
      return data;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch transaction"
      );
      return null;
    }
  };

  const loadNextPage = async () => {
    if (currentPage * pageSize < totalCount) {
      await fetchTransactions(currentPage + 1);
    }
  };

  const loadPreviousPage = async () => {
    if (currentPage > 1) {
      await fetchTransactions(currentPage - 1);
    }
  };

  const refreshTransactions = () => {
    fetchTransactions(1);
  };

  useEffect(() => {
    if (userId || locationOwnerId) {
      fetchTransactions();
    }
  }, [userId, locationOwnerId]);

  return {
    transactions,
    totalCount,
    currentPage,
    loading,
    error,
    fetchTransactions,
    getTransactionById,
    loadNextPage,
    loadPreviousPage,
    refreshTransactions,
    hasNextPage: currentPage * pageSize < totalCount,
    hasPreviousPage: currentPage > 1,
  };
};
