// types/payment.ts - UPDATED WITH QR ANALYSIS

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
  
  // ✅ NEW: QR Analysis Type
  export interface QRAnalysis {
    type: 'http_url' | 'data_uri' | 'base64_image' | 'emvco' | 'unknown';
    isValid: boolean;
    details: string;
  }
  
  // ✅ UPDATED: PaymentResponse with QR Analysis
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
    
    // ✅ NEW: QR Analysis (optional for debugging)
    qrAnalysis?: QRAnalysis | null;
  }
  
  export interface CreatePaymentLinkRequest {
    productName: string;
    description: string;
    bookingId: number;
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
  
  // Validation types
  export interface PaymentValidationErrors {
    productName?: string;
    description?: string;
    bookingId?: string;
  }
  
  // Hook options
  export interface UsePaymentOptions {
    userId?: number;
    autoRefresh?: boolean;
    refreshInterval?: number;
  }
  
  // Navigation data for payment flow
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
  
  // Test result type
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