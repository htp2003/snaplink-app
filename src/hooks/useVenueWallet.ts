// hooks/useVenueWallet.ts
import { useState, useEffect } from "react";
import {
  venueWalletService,
  WalletBalance,
  TransferRequest,
} from "../services/venueWalletService";

export const useVenueWallet = (userId?: number) => {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await venueWalletService.getBalance(userId);
      setBalance(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch wallet balance"
      );
    } finally {
      setLoading(false);
    }
  };

  const transferFunds = async (data: TransferRequest): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await venueWalletService.transferFunds(data);
      // Refresh balance after transfer
      await fetchBalance();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to transfer funds");
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [userId]);

  return {
    balance,
    loading,
    error,
    fetchBalance,
    transferFunds,
  };
};
