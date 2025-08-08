export interface WalletBalance {
  userId: number;
  balance: number;
  currency: string;
  lastUpdated: string;
}

export interface TransferFundsRequest {
  fromUserId: number;
  toUserId: number;
  amount: number;
}

export interface WalletTransaction {
  transactionId: number;
  userId: number;
  amount: number;
  transactionType: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'PAYMENT' | 'REFUND';
  description: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  createdAt: string;
  updatedAt?: string;
  referenceId?: number; // booking ID, payment ID, etc.
  relatedUserId?: number; // for transfers
  relatedUserName?: string;
}

export interface WalletApiResponse {
  error: number;
  message: string;
  data: WalletBalance;
}

export interface TransactionHistoryResponse {
  error: number;
  message: string;
  data: {
    transactions: WalletTransaction[];
    totalCount: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

export interface BooleanApiResponse {
  error: number;
  message: string;
  data: boolean;
}

export interface WalletTopUpRequest {
  amount: number;
  paymentMethod: 'BANK_TRANSFER' | 'CREDIT_CARD' | 'MOMO' | 'ZALOPAY';
  description?: string;
}

export interface WalletTopUpResponse {
  success: boolean;
  paymentUrl?: string;
  transactionId: number;
  message: string;
}

export interface WalletSummary {
  balance: number;
  totalDeposit: number;
  totalWithdrawal: number;
  totalSpent: number;
  totalEarned: number;
  pendingAmount: number;
}