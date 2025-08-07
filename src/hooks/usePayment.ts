// hooks/usePayment.ts - UPDATED FOR NEW API STRUCTURE

import { useState, useCallback, useEffect } from 'react';
import { paymentService } from '../services/paymentService';
import type {
  PaymentResponse,
  CreatePaymentLinkRequest,
  PaymentCallbackParams,
  PaymentSuccessResponse,
  UsePaymentOptions,
  PaymentValidationErrors,
  PaymentTestResult
} from '../types/payment';
import { PaymentStatus } from '../types/payment';
import { DEEP_LINKS } from '../config/deepLinks';

export const usePayment = (options: UsePaymentOptions = {}) => {
  const { userId, autoRefresh = false, refreshInterval = 5000 } = options;

  // ===== PAYMENT STATES =====
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPollingTime, setLastPollingTime] = useState<number>(0);

  // ===== PAYMENT CRUD METHODS =====
  
  const createPaymentLink = useCallback(async (
    userIdParam: number,
    paymentData: CreatePaymentLinkRequest
  ): Promise<PaymentResponse | null> => {
    if (creatingPayment) return null;

    try {
      setCreatingPayment(true);
      setError(null);

      console.log('🔧 Hook: Creating payment link with data:', paymentData);
      const response = await paymentService.createPaymentLink(userIdParam, paymentData);
      
      // ✅ NEW: Verify response structure with new API fields
      console.log('📦 Payment creation response structure:', {
        // Primary API fields
        paymentId: response.paymentId,                      // Database primary key (10)
        externalTransactionId: response.externalTransactionId, // PayOS orderCode (1430368655)
        totalAmount: response.totalAmount,                  // Total amount
        status: response.status,                           // "Pending", "Success", etc.
        customerId: response.customerId,
        bookingId: response.bookingId,
        
        // Legacy compatibility fields
        id: response.id,                                   // = paymentId
        orderCode: response.orderCode,                     // = externalTransactionId
        amount: response.amount,                           // = totalAmount
        
        // Additional fields
        hasQRCode: !!response.qrCode,
        paymentUrl: response.paymentUrl,
        currency: response.currency,
        method: response.method
      });
      
      setPayment(response);
      setError(null); // Clear any previous errors
      console.log('✅ Hook: Payment link created successfully');
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tạo link thanh toán';
      setError(errorMessage);
      console.error('❌ Hook: Error in createPaymentLink:', err);
      return null;
    } finally {
      setCreatingPayment(false);
    }
  }, [creatingPayment]);

  // ✅ UPDATED: getPayment with new API structure support
  const getPayment = useCallback(async (paymentId: number): Promise<PaymentResponse | null> => {
    try {
      setLoadingPayment(true);
      // Don't clear error here - let successful response clear it

      console.log('🔍 Hook: Fetching payment by paymentId (database primary key):', paymentId);
      
      // ✅ CRITICAL: paymentId must be database primary key, not orderCode
      if (!paymentId || isNaN(paymentId) || paymentId <= 0) {
        throw new Error('Invalid paymentId - must be a positive number (database primary key)');
      }
      
      const response = await paymentService.getPayment(paymentId);
      
      // ✅ NEW: Verify GET response structure
      console.log('📦 Payment GET response structure:', {
        // Primary API fields from GET
        paymentId: response.paymentId,                      // Database primary key (13)
        externalTransactionId: response.externalTransactionId, // PayOS orderCode (8668026703)
        totalAmount: response.totalAmount,                  // Total amount (5050)
        status: response.status,                           // "Success", "Pending", etc.
        customerId: response.customerId,
        customerName: response.customerName,               // "Phan Van Doi"
        customerEmail: response.customerEmail,
        bookingId: response.bookingId,
        photographerName: response.photographerName,       // "Alice Smith"
        locationName: response.locationName,               // "Central Park Studio"
        
        // Legacy compatibility fields  
        id: response.id,                                   // = paymentId
        orderCode: response.orderCode,                     // = externalTransactionId
        amount: response.amount,                           // = totalAmount
        
        // Status and timestamps
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
        currency: response.currency,                       // "VND"
        method: response.method                            // "PayOS"
      });
      
      setPayment(response);
      setLastPollingTime(Date.now());
      setError(null); // ✅ Clear error on successful fetch
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể lấy thông tin thanh toán';
      console.error('❌ Hook: Error in getPayment:', err);
      
      // ✅ Enhanced error handling
      if (errorMessage.includes('Payment not found')) {
        console.log('💀 Payment not found - this could be temporary during processing');
        // Don't set error state for "not found" during polling - it might be temporary
        // Only log for debugging
      } else if (errorMessage.includes('Invalid paymentId')) {
        // Critical validation error - set error state
        setError(errorMessage);
      } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
        // Network errors - set error state
        setError(errorMessage);
      }
      // For other errors during polling, don't set error state to avoid UI disruption
      
      return null;
    } finally {
      setLoadingPayment(false);
    }
  }, []);

  // ===== UTILITY METHODS =====

  const createPaymentForBooking = useCallback(async (
    userIdParam: number,
    bookingId: number,
    photographerName: string,
    bookingDetails: {
      date: string;
      startTime: string;
      endTime: string;
      location?: string;
    }
  ): Promise<PaymentResponse | null> => {
    try {
      setCreatingPayment(true);
      setError(null);

      console.log('🔧 Hook: Creating payment for booking:', { userIdParam, bookingId, photographerName, bookingDetails });
      
      const response = await paymentService.createPaymentForBooking(
        userIdParam,
        bookingId,
        photographerName,
        bookingDetails
      );
      
      setPayment(response);
      setError(null);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tạo thanh toán cho booking';
      setError(errorMessage);
      console.error('❌ Hook: Error in createPaymentForBooking:', err);
      return null;
    } finally {
      setCreatingPayment(false);
    }
  }, []);

  const createPaymentForExistingBooking = useCallback(async (
    userIdParam: number,
    bookingId: number,
    productName: string,
    description: string
  ): Promise<PaymentResponse | null> => {
    try {
      setCreatingPayment(true);
      setError(null);

      const paymentData: CreatePaymentLinkRequest = {
        productName,
        description,
        bookingId,
        successUrl: DEEP_LINKS.PAYMENT_SUCCESS,
        cancelUrl: DEEP_LINKS.PAYMENT_CANCEL
      };

      console.log('🔧 Hook: Creating payment for existing booking:', { userIdParam, paymentData });
      
      const response = await paymentService.createPaymentLink(userIdParam, paymentData);
      
      setPayment(response);
      setError(null);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tạo thanh toán';
      setError(errorMessage);
      console.error('❌ Hook: Error in createPaymentForExistingBooking:', err);
      return null;
    } finally {
      setCreatingPayment(false);
    }
  }, []);

  const clearPaymentData = useCallback(() => {
    setPayment(null);
    setError(null);
    setLastPollingTime(0);
    console.log('🧹 Payment data cleared');
  }, []);

  const refreshPayment = useCallback(async () => {
    // ✅ CRITICAL: Use paymentId (database primary key) for refresh
    const paymentId = payment?.paymentId || payment?.id;
    if (paymentId) {
      console.log('🔄 Refreshing payment with paymentId:', paymentId);
      await getPayment(paymentId);
    } else {
      console.warn('⚠️ Cannot refresh payment - no paymentId found');
    }
  }, [payment, getPayment]);

  // ===== VALIDATION =====

  const validatePaymentData = useCallback((paymentData: CreatePaymentLinkRequest): PaymentValidationErrors => {
    const errors: PaymentValidationErrors = {};

    if (!paymentData.productName || paymentData.productName.trim() === '') {
      errors.productName = 'Tên sản phẩm là bắt buộc';
    }

    if (!paymentData.description || paymentData.description.trim() === '') {
      errors.description = 'Mô tả là bắt buộc';
    }

    if (!paymentData.bookingId || paymentData.bookingId <= 0) {
      errors.bookingId = 'Booking ID không hợp lệ';
    }
    
    if (paymentData.successUrl && paymentData.successUrl.trim() === '') {
      errors.successUrl = 'Success URL không được để trống';
    }
    
    if (paymentData.cancelUrl && paymentData.cancelUrl.trim() === '') {
      errors.cancelUrl = 'Cancel URL không được để trống';
    }

    return errors;
  }, []);

  // ✅ UPDATED: Cancel payment with enhanced error handling
  const cancelPayment = useCallback(async (bookingId: number): Promise<boolean> => {
    try {
      setLoadingPayment(true);
      setError(null);

      console.log('❌ Hook: Cancelling payment for booking:', bookingId);
      
      // Validate bookingId
      if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
        throw new Error('Invalid booking ID for cancellation');
      }
      
      await paymentService.cancelPayment(bookingId);
      
      // ✅ Update payment status in state
      setPayment(prev => prev ? { 
        ...prev, 
        status: 'Cancelled',          // New API format
        updatedAt: new Date().toISOString()
      } : null);
      
      setError(null);
      console.log('✅ Hook: Payment cancelled successfully');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể hủy thanh toán';
      setError(errorMessage);
      console.error('❌ Hook: Error in cancelPayment:', err);
      return false;
    } finally {
      setLoadingPayment(false);
    }
  }, []);

  // ===== TESTING METHODS =====

  const testPaymentWithExistingBooking = useCallback(async (
    userIdParam: number,
    testBookingId: number
  ): Promise<PaymentTestResult> => {
    try {
      setCreatingPayment(true);
      setError(null);

      const result = await paymentService.testPaymentWithExistingBooking(userIdParam, testBookingId);
      
      if (result.success && result.data) {
        setPayment(result.data);
        setError(null);
      }
      
      return {
        success: result.success,
        payment: result.data,
        error: result.error
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Test payment failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setCreatingPayment(false);
    }
  }, []);

  const testDirectPaymentAPI = useCallback(async (
    userIdParam: number,
    paymentData: CreatePaymentLinkRequest
  ): Promise<PaymentTestResult> => {
    try {
      setCreatingPayment(true);
      setError(null);

      const result = await paymentService.createPaymentDirect(userIdParam, paymentData);
      
      return {
        success: result.success,
        payment: result.data,
        error: result.error,
        debug: {
          endpoint: `/api/Payment/create?userId=${userIdParam}`,
          payload: paymentData,
          response: result.data
        }
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Direct API test failed';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setCreatingPayment(false);
    }
  }, []);

  // ===== PAYMENT STATUS UTILITIES =====

  const getPaymentStatusColor = useCallback((status?: string): string => {
    return paymentService.getPaymentStatusColor(status);
  }, []);

  const getPaymentStatusText = useCallback((status?: string): string => {
    return paymentService.getPaymentStatusText(status);
  }, []);

  const isPaymentCompleted = useCallback((status?: string): boolean => {
    return paymentService.isPaymentCompleted(status);
  }, []);

  const isPaymentPending = useCallback((status?: string): boolean => {
    return paymentService.isPaymentPending(status);
  }, []);

  const isPaymentFailed = useCallback((status?: string): boolean => {
    return paymentService.isPaymentFailed(status);
  }, []);

  // ===== AUTO REFRESH EFFECT =====
  useEffect(() => {
    if (!autoRefresh || !payment?.paymentId || isPaymentCompleted(payment.status) || isPaymentFailed(payment.status)) {
      return;
    }

    console.log('🔄 Setting up auto refresh for payment:', payment.paymentId);
    
    const interval = setInterval(async () => {
      console.log('🔄 Auto refreshing payment status...');
      await refreshPayment();
    }, refreshInterval);

    return () => {
      console.log('🔄 Clearing auto refresh interval');
      clearInterval(interval);
    };
  }, [autoRefresh, payment?.paymentId, payment?.status, refreshInterval, refreshPayment, isPaymentCompleted, isPaymentFailed]);

  // ===== CURRENT PAYMENT UTILITIES =====

  const isCurrentPaymentCompleted = useCallback((): boolean => {
    return payment ? isPaymentCompleted(payment.status) : false;
  }, [payment, isPaymentCompleted]);

  const isCurrentPaymentPending = useCallback((): boolean => {
    return payment ? isPaymentPending(payment.status) : false;
  }, [payment, isPaymentPending]);

  const isCurrentPaymentFailed = useCallback((): boolean => {
    return payment ? isPaymentFailed(payment.status) : false;
  }, [payment, isPaymentFailed]);

  const getCurrentPaymentStatusColor = useCallback((): string => {
    return payment ? getPaymentStatusColor(payment.status) : '#757575';
  }, [payment, getPaymentStatusColor]);

  const getCurrentPaymentStatusText = useCallback((): string => {
    return payment ? getPaymentStatusText(payment.status) : 'Không có thanh toán';
  }, [payment, getPaymentStatusText]);

  // ===== NEW: PAYMENT ID UTILITIES =====

  const getCurrentPaymentId = useCallback((): number | null => {
    // Return database primary key for API calls
    return payment?.paymentId || payment?.id || null;
  }, [payment]);

  const getCurrentOrderCode = useCallback((): string => {
    // Return display orderCode (externalTransactionId)
    return payment?.externalTransactionId || payment?.orderCode || '';
  }, [payment]);

  const getPaymentDebugInfo = useCallback(() => {
    if (!payment) return null;
    
    return {
      // Database identifiers
      paymentId: payment.paymentId,                    // For API calls
      id: payment.id,                                  // Legacy compatibility
      
      // Display identifiers  
      externalTransactionId: payment.externalTransactionId, // PayOS orderCode
      orderCode: payment.orderCode,                    // Legacy compatibility
      
      // Amounts
      totalAmount: payment.totalAmount,                // New API field
      amount: payment.amount,                          // Legacy compatibility
      
      // Status and info
      status: payment.status,
      customerName: payment.customerName,
      photographerName: payment.photographerName,
      locationName: payment.locationName,
      
      // Timestamps
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      
      // Payment method info
      currency: payment.currency,
      method: payment.method,
      note: payment.note
    };
  }, [payment]);

  return {
    // ===== DATA =====
    payment,
    lastPollingTime,

    // ===== LOADING STATES =====
    loadingPayment,
    creatingPayment,
    error,

    // ===== PAYMENT METHODS =====
    createPaymentLink,
    getPayment,
    cancelPayment,

    // ===== UTILITY METHODS =====
    createPaymentForBooking,
    createPaymentForExistingBooking,
    clearPaymentData,
    refreshPayment,

    // ===== VALIDATION =====
    validatePaymentData,

    // ===== TESTING METHODS =====
    testPaymentWithExistingBooking,
    testDirectPaymentAPI,

    // ===== STATUS UTILITIES =====
    getPaymentStatusColor,
    getPaymentStatusText,
    isPaymentCompleted,
    isPaymentPending,
    isPaymentFailed,

    // ===== CURRENT PAYMENT UTILITIES =====
    isCurrentPaymentCompleted,
    isCurrentPaymentPending,
    isCurrentPaymentFailed,
    getCurrentPaymentStatusColor,
    getCurrentPaymentStatusText,

    // ✅ NEW: ID AND DEBUG UTILITIES
    getCurrentPaymentId,        // Returns paymentId for API calls
    getCurrentOrderCode,        // Returns orderCode for display
    getPaymentDebugInfo,        // Returns full debug info

    // ===== SETTER METHODS (for external updates) =====
    setPayment,
    setError,
  };
};