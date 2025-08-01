// services/venueWalletService.ts
import { apiClient } from "./base";

export interface WalletBalance {
  userId: number;
  balance: number;
  currency?: string;
  totalEarned?: number;
  totalSpent?: number;
  pendingAmount?: number;
}

export interface ApiResponse<T> {
  error: number;
  message: string;
  data: T;
}

class VenueWalletService {
  async getBalance(userId: number): Promise<WalletBalance> {
    const response = await apiClient.get<ApiResponse<WalletBalance>>(
      `/api/Wallet/balance/${userId}`
    );
    return response.data;
  }
}

export const venueWalletService = new VenueWalletService();
