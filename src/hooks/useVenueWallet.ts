// hooks/useVenueWallet.ts
import { useState, useEffect } from "react";
import {
  venueWalletService,
  WalletBalance,
} from "../services/venueWalletService";

export const useVenueWallet = (userId?: number) => {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    if (!userId) {
      setError("User ID is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await venueWalletService.getBalance();
      setBalance(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch wallet balance"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchBalance();
    }
  }, [userId]);

  return {
    balance,
    loading,
    error,
    fetchBalance,
  };
};
