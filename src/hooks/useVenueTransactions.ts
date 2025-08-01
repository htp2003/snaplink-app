// hooks/useVenueTransactions.ts
import { useState, useEffect } from "react";
import {
  venueTransactionService,
  Transaction,
  TransactionHistory,
} from "../services/venueTransactionService";

export const useVenueTransactions = (
  userId?: number,
  initialPage: number = 1,
  pageSize: number = 10,
  year?: number,
  month?: number
) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async (page: number = currentPage) => {
    if (!userId) {
      setError("User ID is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await venueTransactionService.getUserTransactionHistory(
        userId,
        page,
        pageSize,
        year,
        month
      );

      setTransactions(data.transactions);
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
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
    if (currentPage < totalPages) {
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
    if (userId) {
      fetchTransactions();
    }
  }, [userId, year, month]);

  return {
    transactions,
    totalCount,
    totalPages,
    currentPage,
    loading,
    error,
    fetchTransactions,
    getTransactionById,
    loadNextPage,
    loadPreviousPage,
    refreshTransactions,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
};
