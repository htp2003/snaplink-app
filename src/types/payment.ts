// types/payment.ts - COMPLETE VERSION WITH ALL API FIELDS

export enum PaymentStatus {
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  SUCCESS = 'Success',
  PAID = 'Paid',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
  CANCELLED = 'Cancelled',
  EXPIRED = 'Expired'
}

export interface QRAnalysis {
  type: 'http_url' | 'data_uri' | 'base64_image' | 'emvco' | 'unknown';
  isValid: boolean;
  details: string;
}

export interface PaymentResponse {
  // ✅ PRIMARY: Actual API response fields
  paymentId: number;
  externalTransactionId: string;
  customerId: number;
  customerName: string;
  customerEmail: string;
  totalAmount: number;
  status: string;                   // "Success", "Pending", "Failed", etc.
  currency: string;                 // "VND"
  method: string;                   // "PayOS"
  note: string;
  createdAt: string;
  updatedAt: string;
  bookingId: number;
  bookingStatus: string;
  photographerName: string;
  locationName: string;
  isWalletTopUp: boolean;

  // ✅ LEGACY: Backward compatibility fields
  id: number;                       // = paymentId
  paymentUrl: string;
  orderCode: string;                // = externalTransactionId
  amount: number;                   // = totalAmount
  qrCode?: string | null;
  
  // PayOS specific fields (from creation response)
  paymentLinkId?: string;
  accountNumber?: string;
  bin?: string;
  description?: string;
  expiredAt?: string;
  
  // QR Analysis (optional for debugging)
  qrAnalysis?: QRAnalysis | null;
}

export interface CreatePaymentLinkRequest {
  productName: string;
  description: string;
  bookingId: number;
  successUrl: string; 
  cancelUrl: string;  
}

export interface UpdatePaymentRequest {
  status?: string;
  amount?: number;
}

export interface PaymentCallbackParams {
  code?: string;
  id?: string;
  orderCode?: string;
  status?: string;
}

export interface PaymentSuccessResponse {
  success: boolean;
  bookingId: number;
  paymentId: number;
  message: string;
}

export interface PaymentStatusResponse {
  status: string;
  amount: number;
  orderCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentValidationErrors {
  productName?: string;
  description?: string;
  bookingId?: string;
  successUrl?: string; 
  cancelUrl?: string;  
}

export interface UsePaymentOptions {
  userId?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface PaymentFlowData {
  booking: {
    id: number;
    photographerName: string;
    date: string;
    time: string;
    location?: string;
    totalAmount: number;
  };
  payment: {
    // ✅ PRIMARY: New API fields
    paymentId: number;
    externalTransactionId: string;
    customerId: number;
    customerName: string;
    totalAmount: number;
    status: string;
    bookingId: number;
    photographerName: string;
    locationName: string;
    
    // ✅ LEGACY: Backward compatibility
    id: number;                       // = paymentId
    paymentUrl: string;
    orderCode: string;                // = externalTransactionId
    amount: number;                   // = totalAmount
    qrCode?: string | null;
  };
  user: {
    name: string;
    email: string;
  };
}

export interface PaymentTestResult {
  success: boolean;
  payment?: PaymentResponse;
  error?: string;
  debug?: {
    endpoint?: string;
    payload?: any;
    response?: any;
  };
}

export interface CreateWalletTopUpRequest {
  productName: string;
  description: string;
  amount: number; // Min: 5000, Max: 10000000 VND
  successUrl: string;
  cancelUrl: string;
}

export interface WalletTopUpResponse {
  error: number;
  message: string;
  data: {
    paymentId: number;
    payOSData: {
      status: string;
      paymentUrl?: string;
      checkoutUrl?: string;
      orderCode: string;
      qrCode?: string;
      expiredAt: string;
      amount: number;
      paymentLinkId: string;
      accountNumber: string;
      bin: string;
      description: string;
      currency: string;
      
    };
  };
}

// ✅ NEW: Type guards for payment status
export const isPaymentSuccess = (status: string): boolean => {
  return ['Success', 'Paid', 'Completed'].includes(status);
};

export const isPaymentPending = (status: string): boolean => {
  return ['Pending', 'Processing'].includes(status);
};

export const isPaymentFailed = (status: string): boolean => {
  return ['Failed', 'Cancelled', 'Expired'].includes(status);
};

// ✅ NEW: Payment status color mapping
export const getPaymentStatusColor = (status: string): string => {
  switch (status) {
    case 'Success':
    case 'Paid':
    case 'Completed':
      return '#4CAF50';
    case 'Pending':
      return '#FF9800';
    case 'Processing':
      return '#2196F3';
    case 'Failed':
      return '#F44336';
    case 'Cancelled':
      return '#9E9E9E';
    case 'Expired':
      return '#757575';
    default:
      return '#757575';
  }
};

// ✅ NEW: Payment status text mapping
export const getPaymentStatusText = (status: string): string => {
  switch (status) {
    case 'Success':
    case 'Paid':
    case 'Completed':
      return 'Thành công';
    case 'Pending':
      return 'Đang chờ';
    case 'Processing':
      return 'Đang xử lý';
    case 'Failed':
      return 'Thất bại';
    case 'Cancelled':
      return 'Đã hủy';
    case 'Expired':
      return 'Đã hết hạn';
    default:
      return 'Không xác định';
  }
};