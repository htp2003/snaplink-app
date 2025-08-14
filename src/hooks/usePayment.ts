// hooks/usePayment.ts - UPDATED FOR NEW API STRUCTURE

import { useState, useCallback, useEffect } from "react";
import { paymentService } from "../services/paymentService";
import type {
  PaymentResponse,
  CreatePaymentLinkRequest,
  PaymentCallbackParams,
  PaymentSuccessResponse,
  UsePaymentOptions,
  PaymentValidationErrors,
  PaymentTestResult,
  WalletTopUpResponse,
  CreateWalletTopUpRequest,
} from "../types/payment";
import { PaymentStatus } from "../types/payment";
import { DEEP_LINKS, handleDeepLink } from "../config/deepLinks";

export const usePayment = (options: UsePaymentOptions = {}) => {
  const { userId, autoRefresh = false, refreshInterval = 5000 } = options;

  // ===== PAYMENT STATES =====
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPollingTime, setLastPollingTime] = useState<number>(0);
  const [walletTopUp, setWalletTopUp] = useState<WalletTopUpResponse | null>(
    null
  );
  const [creatingWalletTopUp, setCreatingWalletTopUp] = useState(false);

  // ===== PAYMENT CRUD METHODS =====

  const createPaymentLink = useCallback(
    async (
      userIdParam: number,
      paymentData: CreatePaymentLinkRequest
    ): Promise<PaymentResponse | null> => {
      if (creatingPayment) return null;

      try {
        setCreatingPayment(true);
        setError(null);

        console.log("🔧 Hook: Creating payment link with data:", paymentData);
        const response = await paymentService.createPaymentLink(
          userIdParam,
          paymentData
        );

        // ✅ NEW: Verify response structure with new API fields
        console.log("📦 Payment creation response structure:", {
          // Primary API fields
          paymentId: response.paymentId, // Database primary key (10)
          externalTransactionId: response.externalTransactionId, // PayOS orderCode (1430368655)
          totalAmount: response.totalAmount, // Total amount
          status: response.status, // "Pending", "Success", etc.
          customerId: response.customerId,
          bookingId: response.bookingId,

          // Legacy compatibility fields
          id: response.id, // = paymentId
          orderCode: response.orderCode, // = externalTransactionId
          amount: response.amount, // = totalAmount

          // Additional fields
          hasQRCode: !!response.qrCode,
          paymentUrl: response.paymentUrl,
          currency: response.currency,
          method: response.method,
        });

        setPayment(response);
        setError(null); // Clear any previous errors
        console.log("✅ Hook: Payment link created successfully");
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tạo link thanh toán";
        setError(errorMessage);
        console.error("❌ Hook: Error in createPaymentLink:", err);
        return null;
      } finally {
        setCreatingPayment(false);
      }
    },
    [creatingPayment]
  );

  // ✅ UPDATED: getPayment with new API structure support
  const getPayment = useCallback(
    async (paymentId: number): Promise<PaymentResponse | null> => {
      try {
        setLoadingPayment(true);
        // Don't clear error here - let successful response clear it

        console.log(
          "🔍 Hook: Fetching payment by paymentId (database primary key):",
          paymentId
        );

        // ✅ CRITICAL: paymentId must be database primary key, not orderCode
        if (!paymentId || isNaN(paymentId) || paymentId <= 0) {
          throw new Error(
            "Invalid paymentId - must be a positive number (database primary key)"
          );
        }

        const response = await paymentService.getPayment(paymentId);

        // ✅ NEW: Verify GET response structure
        console.log("📦 Payment GET response structure:", {
          // Primary API fields from GET
          paymentId: response.paymentId, // Database primary key (13)
          externalTransactionId: response.externalTransactionId, // PayOS orderCode (8668026703)
          totalAmount: response.totalAmount, // Total amount (5050)
          status: response.status, // "Success", "Pending", etc.
          customerId: response.customerId,
          customerName: response.customerName, // "Phan Van Doi"
          customerEmail: response.customerEmail,
          bookingId: response.bookingId,
          photographerName: response.photographerName, // "Alice Smith"
          locationName: response.locationName, // "Central Park Studio"

          // Legacy compatibility fields
          id: response.id, // = paymentId
          orderCode: response.orderCode, // = externalTransactionId
          amount: response.amount, // = totalAmount

          // Status and timestamps
          createdAt: response.createdAt,
          updatedAt: response.updatedAt,
          currency: response.currency, // "VND"
          method: response.method, // "PayOS"
        });

        setPayment(response);
        setLastPollingTime(Date.now());
        setError(null); // ✅ Clear error on successful fetch
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể lấy thông tin thanh toán";
        console.error("❌ Hook: Error in getPayment:", err);

        // ✅ Enhanced error handling
        if (errorMessage.includes("Payment not found")) {
          console.log(
            "💀 Payment not found - this could be temporary during processing"
          );
          // Don't set error state for "not found" during polling - it might be temporary
          // Only log for debugging
        } else if (errorMessage.includes("Invalid paymentId")) {
          // Critical validation error - set error state
          setError(errorMessage);
        } else if (
          errorMessage.includes("network") ||
          errorMessage.includes("timeout")
        ) {
          // Network errors - set error state
          setError(errorMessage);
        }
        // For other errors during polling, don't set error state to avoid UI disruption


  const createEventPayment = useCallback(async (
    userIdParam: number,
    bookingId: number, 
    eventName: string,
    eventDetails: {
      date: string;
      startTime: string;
      endTime: string;
      location?: string;
      photographerName: string;
    }
  ): Promise<PaymentResponse | null> => {
    try {
      setCreatingPayment(true);
      setError(null);
  
      console.log('🎉 Hook: Creating payment for event booking with regular booking ID:', { userIdParam, bookingId, eventName, eventDetails });
      
      // ✅ Đảm bảo eventName (mô tả) không vượt quá 25 ký tự
      const safeEventName = eventName ? eventName.substring(0, 25) : "";
  
      const response = await paymentService.createEventPayment(
        userIdParam,
        bookingId, 
        safeEventName,  // dùng biến đã cắt
        eventDetails
      );
      
      setPayment(response);
      setError(null);
      console.log('✅ Hook: Event payment created successfully');
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Không thể tạo thanh toán cho event booking';
      setError(errorMessage);
      console.error('❌ Hook: Error in createEventPayment:', err);
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

        return null;
      } finally {
        setLoadingPayment(false);
      }
    },
    []
  );


  // ===== UTILITY METHODS =====

  const createPaymentForBooking = useCallback(
    async (
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

        console.log("🔧 Hook: Creating payment for booking:", {
          userIdParam,
          bookingId,
          photographerName,
          bookingDetails,
        });

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
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tạo thanh toán cho booking";
        setError(errorMessage);
        console.error("❌ Hook: Error in createPaymentForBooking:", err);
        return null;
      } finally {
        setCreatingPayment(false);
      }
    },
    []
  );

  const createPaymentForExistingBooking = useCallback(
    async (
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
          cancelUrl: DEEP_LINKS.PAYMENT_CANCEL,
        };

        console.log("🔧 Hook: Creating payment for existing booking:", {
          userIdParam,
          paymentData,
        });

        const response = await paymentService.createPaymentLink(
          userIdParam,
          paymentData
        );

        setPayment(response);
        setError(null);
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tạo thanh toán";
        setError(errorMessage);
        console.error(
          "❌ Hook: Error in createPaymentForExistingBooking:",
          err
        );
        return null;
      } finally {
        setCreatingPayment(false);
      }
    },
    []
  );

  const clearPaymentData = useCallback(() => {
    setPayment(null);
    setError(null);
    setLastPollingTime(0);
    console.log("🧹 Payment data cleared");
  }, []);

  const refreshPayment = useCallback(async () => {
    // ✅ CRITICAL: Use paymentId (database primary key) for refresh
    const paymentId = payment?.paymentId || payment?.id;
    if (paymentId) {
      console.log("🔄 Refreshing payment with paymentId:", paymentId);
      await getPayment(paymentId);
    } else {
      console.warn("⚠️ Cannot refresh payment - no paymentId found");
    }
  }, [payment, getPayment]);

  // ===== VALIDATION =====

  const validatePaymentData = useCallback(
    (paymentData: CreatePaymentLinkRequest): PaymentValidationErrors => {
      const errors: PaymentValidationErrors = {};

      if (!paymentData.productName || paymentData.productName.trim() === "") {
        errors.productName = "Tên sản phẩm là bắt buộc";
      }

      if (!paymentData.description || paymentData.description.trim() === "") {
        errors.description = "Mô tả là bắt buộc";
      }

      if (!paymentData.bookingId || paymentData.bookingId <= 0) {
        errors.bookingId = "Booking ID không hợp lệ";
      }

      if (paymentData.successUrl && paymentData.successUrl.trim() === "") {
        errors.successUrl = "Success URL không được để trống";
      }

      if (paymentData.cancelUrl && paymentData.cancelUrl.trim() === "") {
        errors.cancelUrl = "Cancel URL không được để trống";
      }

      return errors;
    },
    []
  );

  // ✅ UPDATED: Cancel payment with enhanced error handling
  const cancelPayment = useCallback(
    async (bookingId: number): Promise<boolean> => {
      try {
        setLoadingPayment(true);
        setError(null);

        console.log("❌ Hook: Cancelling payment for booking:", bookingId);

        // Validate bookingId
        if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
          throw new Error("Invalid booking ID for cancellation");
        }

        await paymentService.cancelPayment(bookingId);

        // ✅ Update payment status in state
        setPayment((prev) =>
          prev
            ? {
                ...prev,
                status: "Cancelled", // New API format
                updatedAt: new Date().toISOString(),
              }
            : null
        );

        setError(null);
        console.log("✅ Hook: Payment cancelled successfully");
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể hủy thanh toán";
        setError(errorMessage);
        console.error("❌ Hook: Error in cancelPayment:", err);
        return false;
      } finally {
        setLoadingPayment(false);
      }
    },
    []
  );

  // ===== TESTING METHODS =====

  const testPaymentWithExistingBooking = useCallback(
    async (
      userIdParam: number,
      testBookingId: number
    ): Promise<PaymentTestResult> => {
      try {
        setCreatingPayment(true);
        setError(null);

        const result = await paymentService.testPaymentWithExistingBooking(
          userIdParam,
          testBookingId
        );

        if (result.success && result.data) {
          setPayment(result.data);
          setError(null);
        }

        return {
          success: result.success,
          payment: result.data,
          error: result.error,
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Test payment failed";
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setCreatingPayment(false);
      }
    },
    []
  );

  const testDirectPaymentAPI = useCallback(
    async (
      userIdParam: number,
      paymentData: CreatePaymentLinkRequest
    ): Promise<PaymentTestResult> => {
      try {
        setCreatingPayment(true);
        setError(null);

        const result = await paymentService.createPaymentDirect(
          userIdParam,
          paymentData
        );

        return {
          success: result.success,
          payment: result.data,
          error: result.error,
          debug: {
            endpoint: `/api/Payment/create?userId=${userIdParam}`,
            payload: paymentData,
            response: result.data,
          },
        };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Direct API test failed";
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setCreatingPayment(false);
      }
    },
    []
  );

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
    if (
      !autoRefresh ||
      !payment?.paymentId ||
      isPaymentCompleted(payment.status) ||
      isPaymentFailed(payment.status)
    ) {
      return;
    }

    console.log("🔄 Setting up auto refresh for payment:", payment.paymentId);

    const interval = setInterval(async () => {
      console.log("🔄 Auto refreshing payment status...");
      await refreshPayment();
    }, refreshInterval);

    return () => {
      console.log("🔄 Clearing auto refresh interval");
      clearInterval(interval);
    };
  }, [
    autoRefresh,
    payment?.paymentId,
    payment?.status,
    refreshInterval,
    refreshPayment,
    isPaymentCompleted,
    isPaymentFailed,
  ]);

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
    return payment ? getPaymentStatusColor(payment.status) : "#757575";
  }, [payment, getPaymentStatusColor]);

  const getCurrentPaymentStatusText = useCallback((): string => {
    return payment
      ? getPaymentStatusText(payment.status)
      : "Không có thanh toán";
  }, [payment, getPaymentStatusText]);

  // ===== NEW: PAYMENT ID UTILITIES =====

  const getCurrentPaymentId = useCallback((): number | null => {
    // Return database primary key for API calls
    return payment?.paymentId || payment?.id || null;
  }, [payment]);

  const getCurrentOrderCode = useCallback((): string => {
    // Return display orderCode (externalTransactionId)
    return payment?.externalTransactionId || payment?.orderCode || "";
  }, [payment]);

  const getPaymentDebugInfo = useCallback(() => {
    if (!payment) return null;

    return {
      // Database identifiers
      paymentId: payment.paymentId, // For API calls
      id: payment.id, // Legacy compatibility

      // Display identifiers
      externalTransactionId: payment.externalTransactionId, // PayOS orderCode
      orderCode: payment.orderCode, // Legacy compatibility

      // Amounts
      totalAmount: payment.totalAmount, // New API field
      amount: payment.amount, // Legacy compatibility

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
      note: payment.note,
    };
  }, [payment]);
  const createWalletTopUp = useCallback(async (
  request: CreateWalletTopUpRequest
): Promise<WalletTopUpResponse | null> => {
  if (creatingWalletTopUp) return null;

  try {
    setCreatingWalletTopUp(true);
    setError(null);

    console.log('💳 Hook: Creating wallet top-up with data:', request);
    const response = await paymentService.createWalletTopUp(request);
    
    console.log('📦 Wallet top-up creation response:', {
      error: response.error,
      message: response.message,
      paymentId: response.data?.paymentId,
      orderCode: response.data?.payOSData?.orderCode,
      amount: response.data?.payOSData?.amount,
      paymentUrl: response.data?.payOSData?.checkoutUrl || response.data?.payOSData?.paymentUrl,
      hasQRCode: !!response.data?.payOSData?.qrCode
    });
    
    setWalletTopUp(response);
    setError(null);
    console.log('✅ Hook: Wallet top-up created successfully');
    return response;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Không thể tạo yêu cầu nạp tiền';
    setError(errorMessage);
    console.error('❌ Hook: Error in createWalletTopUp:', err);
    return null;
  } finally {
    setCreatingWalletTopUp(false);
  }
}, [creatingWalletTopUp]);

// ===== WALLET UTILITY METHODS =====

const getQuickAmounts = useCallback((): number[] => {
  return paymentService.getQuickAmounts();
}, []);

const formatAmount = useCallback((amount: number): string => {
  return paymentService.formatAmount(amount);
}, []);

const validateTopUpAmount = useCallback((amount: number): { isValid: boolean; error?: string } => {
  return paymentService.validateAmount(amount);
}, []);

const generateWalletCallbackUrls = useCallback((paymentId?: string) => {
  return paymentService.generateCallbackUrls(paymentId);
}, []);

const clearWalletTopUpData = useCallback(() => {
  setWalletTopUp(null);
  console.log('🧹 Wallet top-up data cleared');
}, []);
  // ===== DEEP LINK HANDLING =====

  const parsePaymentDeepLink = useCallback((url: string) => {
    try {
      const result = handleDeepLink(url);

      if (
        result.type === "PAYMENT_SUCCESS" ||
        result.type === "PAYMENT_CANCEL"
      ) {
        const urlObj = new URL(url);
        const paymentId = urlObj.searchParams.get("paymentId") || undefined;
        const orderCode = urlObj.searchParams.get("orderCode") || undefined;

        return {
          type: result.type,
          paymentId,
          orderCode,
        };
      }

      return null;
    } catch (error) {
      console.error("Error parsing payment deep link:", error);
      return null;
    }
  }, []);

  const handlePaymentSuccess = useCallback(
    async (data: { paymentId?: string }) => {
      try {
        if (data.paymentId) {
          // Verify payment status
          const paymentStatus = await paymentService.getPayment(
            parseInt(data.paymentId)
          );

          if (paymentService.isPaymentCompleted(paymentStatus.status)) {
            return {
              success: true,
              message: "Nạp tiền thành công! Số dư của bạn đã được cập nhật.",
              payment: paymentStatus,
            };
          } else {
            return {
              success: false,
              message: "Thanh toán chưa được xác nhận. Vui lòng thử lại.",
            };
          }
        }

        return {
          success: true,
          message: "Nạp tiền thành công! Số dư của bạn đã được cập nhật.",
        };
      } catch (error) {
        console.error("Error verifying payment:", error);
        return {
          success: false,
          message:
            "Không thể xác minh trạng thái thanh toán. Vui lòng kiểm tra lại.",
        };
      }
    },
    []
  );

  const handlePaymentCancel = useCallback(() => {
    return {
      success: false,
      message: "Bạn đã hủy thanh toán. Bạn có thể thử lại bất cứ lúc nào.",
    };
  }, []);

  // ===== WALLET TOP-UP CONVENIENCE METHODS =====

  const createQuickWalletTopUp = useCallback(
    async (
      amount: number,
      description?: string
    ): Promise<WalletTopUpResponse | null> => {
      const validation = validateTopUpAmount(amount);
      if (!validation.isValid) {
        setError(validation.error || "Số tiền không hợp lệ");
        return null;
      }

      const request: CreateWalletTopUpRequest = {
        productName: "Nạp tiền vào ví SnapLink",
        description:
          description || `Nạp ${formatAmount(amount)} vào ví SnapLink`,
        amount: amount,
        successUrl: DEEP_LINKS.PAYMENT_SUCCESS,
        cancelUrl: DEEP_LINKS.PAYMENT_CANCEL,
      };

      return await createWalletTopUp(request);
    },
    [createWalletTopUp, validateTopUpAmount, formatAmount]
  );

  // ===== WALLET TOP-UP STATUS UTILITIES =====

  const getWalletTopUpPaymentUrl = useCallback((): string | null => {
    if (!walletTopUp?.data?.payOSData) return null;

    return (
      walletTopUp.data.payOSData.checkoutUrl ||
      walletTopUp.data.payOSData.paymentUrl ||
      null
    );
  }, [walletTopUp]);

  const getWalletTopUpOrderCode = useCallback((): string | null => {
    return walletTopUp?.data?.payOSData?.orderCode || null;
  }, [walletTopUp]);

  const getWalletTopUpAmount = useCallback((): number => {
    return walletTopUp?.data?.payOSData?.amount || 0;
  }, [walletTopUp]);

  const isWalletTopUpSuccessful = useCallback((): boolean => {
    return walletTopUp?.error === 0 && !!walletTopUp?.data?.paymentId;
  }, [walletTopUp]);

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
    createEventPayment,
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
    getCurrentPaymentId, // Returns paymentId for API calls
    getCurrentOrderCode, // Returns orderCode for display
    getPaymentDebugInfo, // Returns full debug info

    // ===== WALLET TOP-UP DATA =====
    walletTopUp,
    creatingWalletTopUp,

    // ===== WALLET TOP-UP METHODS =====
    createWalletTopUp,
    clearWalletTopUpData,

    // ===== WALLET UTILITY METHODS =====
    getQuickAmounts,
    formatAmount,
    validateTopUpAmount,

    // ===== DEEP LINK HANDLING =====
    parsePaymentDeepLink,
    handlePaymentSuccess,
    handlePaymentCancel,

    // ===== SETTER METHODS (for external updates) =====
    setPayment,
    setError,
  };
};
