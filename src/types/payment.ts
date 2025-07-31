// types/payment.ts - FINAL VERSION WITH URLS

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  PAID = 'PAID',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export interface QRAnalysis {
  type: 'http_url' | 'data_uri' | 'base64_image' | 'emvco' | 'unknown';
  isValid: boolean;
  details: string;
}

export interface PaymentResponse {
  id: number; // orderCode from PayOS
  paymentUrl: string;
  orderCode: string;
  amount: number;
  status: string;
  bookingId: number;
  createdAt: string;
  qrCode?: string | null;
  
  // PayOS specific fields
  paymentLinkId?: string;
  accountNumber?: string;
  bin?: string;
  currency?: string;
  description?: string;
  expiredAt?: string;
  
  // QR Analysis (optional for debugging)
  qrAnalysis?: QRAnalysis | null;
}

// ✅ FINAL: CreatePaymentLinkRequest with URLs
export interface CreatePaymentLinkRequest {
  productName: string;
  description: string;
  bookingId: number;
  successUrl: string; // ✅ Required for redirect after successful payment
  cancelUrl: string;  // ✅ Required for redirect after cancelled payment
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

// ✅ FINAL: Validation errors with URLs
export interface PaymentValidationErrors {
  productName?: string;
  description?: string;
  bookingId?: string;
  successUrl?: string; // ✅ URL validation
  cancelUrl?: string;  // ✅ URL validation
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
    id: number; // orderCode
    paymentUrl: string;
    orderCode: string;
    amount: number;
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