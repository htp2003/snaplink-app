// hooks/useMonthlyIncome.ts
import { useState, useEffect } from "react";
import {
  venueTransactionService,
  MonthlyIncome,
} from "../services/venueTransactionService";

export const useMonthlyIncome = (
  userId?: number,
  year?: number,
  month?: number
) => {
  const [monthlyIncome, setMonthlyIncome] = useState<MonthlyIncome | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMonthlyIncome = async () => {
    if (!userId) {
      setError("User ID is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await venueTransactionService.getMonthlyIncome(
        userId,
        year,
        month
      );
      setMonthlyIncome(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch monthly income"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchMonthlyIncome();
    }
  }, [userId, year, month]);

  return {
    monthlyIncome,
    loading,
    error,
    fetchMonthlyIncome,
  };
};
