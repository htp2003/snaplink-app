// types/transaction.types.ts

// API Response structure
export interface ApiResponse<T> {
  error: number;
  message: string;
  data: T;
}

// Transaction from API
export interface Transaction {
  transactionId: number;
  referencePaymentId?: string | null;
  fromUserId?: number | null;
  fromUserName?: string | null;
  toUserId?: number | null;
  toUserName?: string | null;
  amount: number;
  currency: string;
  type: string; // "Withdraw", "Payment", etc.
  status: string; // "Success", "Pending", "Failed"
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  paymentMethod?: string | null;
  paymentAmount?: number | null;
  paymentStatus?: string | null;
}

// Transaction History Response Data
export interface TransactionHistoryData {
  transactions: Transaction[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Complete API Response for Transaction History
export interface TransactionHistoryResponse extends ApiResponse<TransactionHistoryData> {}

// Wallet Balance Response Data
export interface WalletBalanceData {
  userId: number;
  balance: number;
}

// Complete API Response for Wallet Balance
export interface WalletBalanceResponse extends ApiResponse<WalletBalanceData> {}

// Display interfaces for UI
export interface DisplayTransaction extends Transaction {
  displayType: 'income' | 'withdrawal';
  customerName?: string;
  formattedDate: string;
  formattedAmount: string;
  statusColor: string;
  statusBgColor: string;
  iconName: string;
  iconBgColor: string;
  // Map API fields to display fields
  id: number; // transactionId
  description: string; // note
  transactionDate: string; // createdAt
}

export interface TransactionStats {
  todayIncome: number;
  monthlyIncome: number;
  pendingAmount: number;
  completedBookings: number;
}

export interface WalletBalance {
  availableBalance: number;
  pendingBalance: number;
  totalBalance: number;
}

// API request params
export interface TransactionHistoryParams {
  photographerId: number;
  page?: number;
  pageSize?: number;
}

export interface TransferFundsRequest {
  fromUserId: number;
  toUserId: number;
  amount: number;
}

// Transaction status and type enums based on API
export enum TransactionStatus {
  SUCCESS = 'Success',
  PENDING = 'Pending',
  FAILED = 'Failed',
  CANCELLED = 'Cancelled'
}

export enum TransactionType {
  WITHDRAW = 'Withdraw',
  PAYMENT = 'Payment',
  REFUND = 'Refund',
  COMMISSION = 'Commission',
  BONUS = 'Bonus'
}