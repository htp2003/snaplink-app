// hooks/usePayment.ts - FIXED TO USE ORDERCODE

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
      
      setPayment(response);
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

  // ✅ FIX: Update getPayment with better error handling
  const getPayment = useCallback(async (paymentId: number): Promise<PaymentResponse | null> => {
    try {
      setLoadingPayment(true);
      setError(null);

      console.log('🔍 Hook: Fetching payment by orderCode:', paymentId);
      
      // Ensure it's a valid number
      if (!paymentId || isNaN(paymentId) || paymentId <= 0) {
        throw new Error('Invalid orderCode - must be a positive number');
      }
      
      const response = await paymentService.getPayment(paymentId);
      
      setPayment(response);
      setLastPollingTime(Date.now());
      setError(null); // ✅ Clear error on success
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể lấy thông tin thanh toán';
      
      // ✅ FIX: Don't set error state for polling failures - it will cause UI issues
      console.error('❌ Hook: Error in getPayment:', err);
      
      // Only set error for critical failures, not for polling issues
      if (errorMessage.includes('Invalid orderCode') || errorMessage.includes('network')) {
        setError(errorMessage);
      }
      
      return null;
    } finally {
      setLoadingPayment(false);
    }
  }, []);

  const cancelPayment = useCallback(async (paymentId: number): Promise<boolean> => {
    try {
      setLoadingPayment(true);
      setError(null);

      console.log('❌ Hook: Cancelling payment:', paymentId);
      
      // Ensure it's a valid number
      if (!paymentId || isNaN(paymentId) || paymentId <= 0) {
        throw new Error('Invalid orderCode for cancellation');
      }
      
      await paymentService.cancelPayment(paymentId);
      
      setPayment(prev => prev ? { ...prev, status: PaymentStatus.CANCELLED } : null);
      
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

  // ===== PAYMENT CALLBACK HANDLERS =====

  const handlePaymentSuccess = useCallback(async (params: PaymentCallbackParams): Promise<PaymentSuccessResponse | null> => {
    try {
      setLoadingPayment(true);
      setError(null);

      console.log('✅ Hook: Handling payment success:', params);
      const response = await paymentService.handlePaymentSuccess(params);
      
      // Update payment status
      if (payment && response.bookingId) {
        setPayment(prev => prev ? { ...prev, status: PaymentStatus.SUCCESS } : null);
      }
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể xử lý thanh toán thành công';
      setError(errorMessage);
      console.error('❌ Hook: Error in handlePaymentSuccess:', err);
      return null;
    } finally {
      setLoadingPayment(false);
    }
  }, [payment]);

  const handlePaymentCancel = useCallback(async (params: PaymentCallbackParams): Promise<any> => {
    try {
      setLoadingPayment(true);
      setError(null);

      console.log('❌ Hook: Handling payment cancel:', params);
      const response = await paymentService.handlePaymentCancel(params);
      
      // Update payment status
      if (payment) {
        setPayment(prev => prev ? { ...prev, status: PaymentStatus.CANCELLED } : null);
      }
      
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể xử lý hủy thanh toán';
      setError(errorMessage);
      console.error('❌ Hook: Error in handlePaymentCancel:', err);
      return null;
    } finally {
      setLoadingPayment(false);
    }
  }, [payment]);

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
        bookingId
      };

      console.log('🔧 Hook: Creating payment for existing booking:', { userIdParam, paymentData });
      
      const response = await paymentService.createPaymentLink(userIdParam, paymentData);
      
      setPayment(response);
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
  }, []);

  const refreshPayment = useCallback(async () => {
    if (payment?.id) {
      await getPayment(payment.id);
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

    return errors;
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
      }
      
      return {
        success: result.success,
        payment: result.data,
        error: result.error
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Test payment failed';
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
    if (!autoRefresh || !payment?.id || isPaymentCompleted(payment.status) || isPaymentFailed(payment.status)) {
      return;
    }

    const interval = setInterval(async () => {
      console.log('🔄 Auto refreshing payment status...');
      await refreshPayment();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, payment, refreshInterval, refreshPayment, isPaymentCompleted, isPaymentFailed]);

  // ===== QUICK ACCESS UTILITIES =====

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

    // ===== CALLBACK HANDLERS =====
    handlePaymentSuccess,
    handlePaymentCancel,

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

    // ===== SETTER METHODS (for external updates) =====
    setPayment,
    setError,
  };
};