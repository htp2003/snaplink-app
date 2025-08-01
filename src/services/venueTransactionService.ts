// services/venueTransactionService.ts
import { apiClient } from "./base";

export interface ApiResponse<T> {
  error: number;
  message: string;
  data: T;
}

export interface Transaction {
  id: number;
  type:
    | "Purchase"
    | "PhotographerFee"
    | "VenueFee"
    | "PlatformFee"
    | "Refund"
    | "Deposit"
    | "Withdrawal";
  amount: number;
  description: string;
  status: "pending" | "completed" | "failed";
  createdAt: string;
  relatedType?: string;
  relatedId?: number;
}

export interface TransactionHistory {
  transactions: Transaction[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  year: number | null;
  month: number | null;
}

export interface MonthlyIncome {
  userId: number;
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  totalTransactions: number;
  incomeByType: {
    [key: string]: number;
  };
  recentTransactions: Transaction[];
}

class VenueTransactionService {
  async getUserTransactionHistory(
    userId: number,
    page: number = 1,
    pageSize: number = 10,
    year?: number,
    month?: number
  ): Promise<TransactionHistory> {
    let endpoint = `/api/Transaction/history/user/${userId}?page=${page}&pageSize=${pageSize}`;

    if (year) endpoint += `&year=${year}`;
    if (month) endpoint += `&month=${month}`;

    const response = await apiClient.get<ApiResponse<TransactionHistory>>(
      endpoint
    );
    return response.data;
  }

  async getTransactionById(transactionId: number): Promise<Transaction> {
    const response = await apiClient.get<ApiResponse<Transaction>>(
      `/api/Transaction/${transactionId}`
    );
    return response.data;
  }

  async getMonthlyIncome(
    userId: number,
    year?: number,
    month?: number
  ): Promise<MonthlyIncome> {
    let endpoint = `/api/Transaction/monthly-income/${userId}`;

    const params = [];
    if (year) params.push(`year=${year}`);
    if (month) params.push(`month=${month}`);

    if (params.length > 0) {
      endpoint += `?${params.join("&")}`;
    }

    const response = await apiClient.get<ApiResponse<MonthlyIncome>>(endpoint);
    return response.data;
  }
}

export const venueTransactionService = new VenueTransactionService();
