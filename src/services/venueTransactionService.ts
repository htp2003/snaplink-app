// services/venueTransactionService.ts
import { apiClient } from "./base";

export interface Transaction {
  id: number;
  type: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  relatedType?: string;
  relatedId?: number;
}

export interface TransactionHistory {
  transactions: Transaction[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
}

class VenueTransactionService {
  async getUserTransactionHistory(
    userId: number,
    page: number = 1,
    pageSize: number = 10
  ): Promise<TransactionHistory> {
    return apiClient.get<TransactionHistory>(
      `/api/Transaction/history/user/${userId}?page=${page}&pageSize=${pageSize}`
    );
  }

  async getLocationOwnerTransactionHistory(
    locationOwnerId: number,
    page: number = 1,
    pageSize: number = 10
  ): Promise<TransactionHistory> {
    return apiClient.get<TransactionHistory>(
      `/api/Transaction/history/location-owner/${locationOwnerId}?page=${page}&pageSize=${pageSize}`
    );
  }

  async getTransactionById(transactionId: number): Promise<Transaction> {
    return apiClient.get<Transaction>(`/api/Transaction/${transactionId}`);
  }
}

export const venueTransactionService = new VenueTransactionService();
