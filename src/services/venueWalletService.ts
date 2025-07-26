// services/venueWalletService.ts
import { apiClient } from "./base";

export interface WalletBalance {
  balance: number;
  currency: string;
  totalEarned: number;
  totalSpent: number;
  pendingAmount: number;
}

export interface TransferRequest {
  fromUserId: number;
  toUserId: number;
  amount: number;
}

class VenueWalletService {
  async getBalance(userId?: number): Promise<WalletBalance> {
    if (userId) {
      return apiClient.get<WalletBalance>(`/api/Wallet/balance/${userId}`);
    }
    return apiClient.get<WalletBalance>("/api/Wallet/balance");
  }

  async transferFunds(data: TransferRequest): Promise<any> {
    return apiClient.post<any>("/api/Wallet/transfer", data);
  }
}

export const venueWalletService = new VenueWalletService();
