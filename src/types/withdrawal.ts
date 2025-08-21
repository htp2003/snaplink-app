// Types for Withdrawal Request API

export interface WithdrawalRequest {
  id: number;
  walletId: number;
  amount: number;
  bankAccountNumber: string;
  bankAccountName: string;
  bankName: string;
  requestStatus: 'Pending' | 'Approved' | 'Rejected' | 'Processing' | 'Completed' | 'Cancelled';
  requestedAt: string;
  processedAt?: string;
  processedByModeratorId?: number;
  rejectionReason?: string;
  userId: number;
  userName?: string;
  userEmail?: string;
  walletBalance?: number;
  transactionReference?: string;
}

export interface CreateWithdrawalRequest {
  amount: number;
  bankAccountNumber: string;
  bankAccountName: string;
  bankName: string;
}

export interface UpdateWithdrawalRequest {
  bankAccountNumber?: string;
  bankAccountName?: string;
  bankName?: string;
}

export interface ProcessWithdrawalRequest {
  status: 'Pending' | 'Approved' | 'Rejected' | 'Processing' | 'Completed' | 'Cancelled';
  rejectionReason?: string;
}

export interface CompleteWithdrawalRequest {
  transactionReference?: string;
}

export interface RejectWithdrawalRequest {
  rejectionReason?: string;
}

export interface WithdrawalLimits {
  minAmount: number;
  maxAmount: number;
  dailyLimit?: number;
  monthlyLimit?: number;
}

export interface WithdrawalRequestsResponse {
  withdrawalRequests: WithdrawalRequest[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WithdrawalApiResponse<T = any> {
  error: number;
  message: string;
  data: T;
}

// Status colors and display texts
export const WITHDRAWAL_STATUS_CONFIG = {
  Pending: {
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    text: 'Đang chờ xử lý',
    icon: 'time-outline'
  },
  Approved: {
    color: '#10B981',
    bgColor: '#D1FAE5',
    text: 'Đã phê duyệt',
    icon: 'checkmark-circle-outline'
  },
  Rejected: {
    color: '#EF4444',
    bgColor: '#FEE2E2',
    text: 'Đã từ chối',
    icon: 'close-circle-outline'
  },
  Processing: {
    color: '#6B73FF',
    bgColor: '#E0E7FF',
    text: 'Đang xử lý',
    icon: 'sync-outline'
  },
  Completed: {
    color: '#10B981',
    bgColor: '#D1FAE5',
    text: 'Hoàn thành',
    icon: 'checkmark-done-outline'
  },
  Cancelled: {
    color: '#6B7280',
    bgColor: '#F3F4F6',
    text: 'Đã hủy',
    icon: 'ban-outline'
  }
} as const;

// Validation rules
export const WITHDRAWAL_VALIDATION = {
  MIN_AMOUNT: 10000,
  MAX_AMOUNT: 50000000, 
  BANK_ACCOUNT_NUMBER_MAX_LENGTH: 100,
  BANK_ACCOUNT_NAME_MAX_LENGTH: 100,
  BANK_NAME_MAX_LENGTH: 100,
  REJECTION_REASON_MAX_LENGTH: 500
} as const;

// Bank list for dropdown
export const VIETNAM_BANKS = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'VTB', name: 'Vietinbank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'MB', name: 'MB Bank' },
  { code: 'SHB', name: 'SHB' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'CTG', name: 'VietinBank' },
  { code: 'EIB', name: 'Eximbank' },
  { code: 'MSB', name: 'MSB' },
  { code: 'OCB', name: 'OCB' },
  { code: 'SCB', name: 'SCB' },
  { code: 'SEA', name: 'SeABank' },
  { code: 'VAB', name: 'VietABank' },
  { code: 'NAB', name: 'Nam A Bank' },
  { code: 'LPB', name: 'LienVietPostBank' },
  { code: 'KLB', name: 'Kienlongbank' },
  { code: 'AGRI', name: 'Agribank' },
  { code: 'HDBANK', name: 'HDBank' },
  { code: 'DONGABANK', name: 'Dong A Bank' },
  { code: 'ABBANK', name: 'ABBank' },
  { code: 'BACABANK', name: 'Bac A Bank' },
  { code: 'PVCOMBANK', name: 'PVcomBank' },
  { code: 'OCEANBANK', name: 'OceanBank' },
  { code: 'NCB', name: 'NCB' },
  { code: 'VCCB', name: 'BanViet Bank' },
  { code: 'WOORI', name: 'Woori Bank' }
] as const;