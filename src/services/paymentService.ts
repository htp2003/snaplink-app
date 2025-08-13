import { apiClient } from "./base";
import type {
  PaymentResponse,
  CreatePaymentLinkRequest,
  CreateWalletTopUpRequest,
  WalletTopUpResponse,
  PaymentCallbackParams,
  PaymentSuccessResponse,
  PaymentStatusResponse,
} from "../types/payment";
import { createDeepLink, DEEP_LINKS } from "../config/deepLinks";

const PAYMENT_ENDPOINTS = {
  CREATE: (userId: number) => `/api/Payment/create?userId=${userId}`,
  GET: (paymentId: number) => `/api/Payment/${paymentId}`,
  CANCEL: (bookingId: number) => `/api/Payment/booking/${bookingId}/cancel`,
  WEBHOOK: "/api/Payment/webhook",
};

export class PaymentService {
  // ✅ NEW: Helper method to analyze QR code format
  private analyzeQRCodeFormat(qrCode: string): {
    type: "http_url" | "data_uri" | "base64_image" | "emvco" | "unknown";
    isValid: boolean;
    details: string;
  } {
    if (!qrCode || typeof qrCode !== "string") {
      return {
        type: "unknown",
        isValid: false,
        details: "QR code is null or not string",
      };
    }

    const trimmed = qrCode.trim();

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return {
        type: "http_url",
        isValid: true,
        details: `HTTP URL (${trimmed.length} chars)`,
      };
    }

    if (trimmed.startsWith("data:image/")) {
      return {
        type: "data_uri",
        isValid: true,
        details: `Data URI (${trimmed.length} chars)`,
      };
    }

    if (trimmed.startsWith("/9j/") || trimmed.startsWith("iVBORw0K")) {
      return {
        type: "base64_image",
        isValid: true,
        details: `Base64 image (${trimmed.length} chars)`,
      };
    }

    // EMVCo QR code format check
    if (/^[0-9]{4}/.test(trimmed) && trimmed.length > 50) {
      return {
        type: "emvco",
        isValid: true,
        details: `EMVCo format (${
          trimmed.length
        } chars, starts with: ${trimmed.substring(0, 10)})`,
      };
    }

    return {
      type: "unknown",
      isValid: false,
      details: `Unknown format (${
        trimmed.length
      } chars, starts with: ${trimmed.substring(0, 20)})`,
    };
  }

  // ✅ ENHANCED: Create payment link - Handle both old and new response formats
  async createPaymentLink(
    userId: number,
    paymentData: CreatePaymentLinkRequest
  ): Promise<PaymentResponse> {
    try {
      // Enhanced validation
      if (!userId || isNaN(userId) || userId <= 0) {
        throw new Error("Invalid user ID provided");
      }

      if (
        !paymentData ||
        !paymentData.productName ||
        !paymentData.description ||
        !paymentData.bookingId
      ) {
        throw new Error("Missing required payment data fields");
      }

      // Prepare final payload
      const finalPayload = {
        productName: paymentData.productName.trim(),
        description: paymentData.description.trim(),
        bookingId: parseInt(paymentData.bookingId.toString()),
        successUrl:
          paymentData.successUrl?.trim() || DEEP_LINKS.PAYMENT_SUCCESS,
        cancelUrl: paymentData.cancelUrl?.trim() || DEEP_LINKS.PAYMENT_CANCEL,
      };

      // Make API call
      const response = await apiClient.post<any>(
        PAYMENT_ENDPOINTS.CREATE(userId),
        finalPayload
      );

      // ✅ CRITICAL: Handle new API response format
      let apiResponse;
      if (response.error === 0 && response.data) {
        // New API format: { error: 0, message: "...", data: { paymentId: 10, payOSData: {...} } }
        apiResponse = response.data;
      } else if (response.data) {
        apiResponse = response.data;
      } else {
        apiResponse = response;
      }

      if (!apiResponse) {
        throw new Error("Empty response from payment API");
      }

      // ✅ NEW: Handle new API response structure
      // API response: { paymentId: 10, payOSData: { orderCode: 1430368655, ... } }
      const paymentId = apiResponse.paymentId; // Database primary key
      const payOSData = apiResponse.payOSData || {}; // PayOS data
      const orderCode = payOSData.orderCode; // PayOS orderCode

      if (!paymentId) {
        console.error(
          "❌ Missing paymentId in API response:",
          Object.keys(apiResponse)
        );
        throw new Error("Payment response missing required paymentId field");
      }

      // Extract QR code from payOSData
      let qrCode = null;
      let qrAnalysis = null;

      if (payOSData.qrCode) {
        qrCode = payOSData.qrCode;
        qrAnalysis = this.analyzeQRCodeFormat(qrCode);
      }

      // ✅ FIXED: Map to new PaymentResponse structure
      const normalizedPaymentResponse: PaymentResponse = {
        // ✅ PRIMARY: New API fields (with defaults from payOSData)
        paymentId: paymentId,
        externalTransactionId: orderCode?.toString() || "",
        customerId: userId, // From request since API doesn't return
        customerName: "", // Not available in creation response
        customerEmail: "", // Not available in creation response
        totalAmount: payOSData.amount || 0,
        status: payOSData.status || "Pending",
        currency: payOSData.currency || "VND",
        method: "PayOS",
        note: paymentData.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bookingId: paymentData.bookingId,
        bookingStatus: "Pending", // Default for new payment
        photographerName: "", // Not available in creation response
        locationName: "", // Not available in creation response
        isWalletTopUp: false,

        // ✅ LEGACY: Backward compatibility
        id: paymentId, // = paymentId
        paymentUrl: payOSData.checkoutUrl || "",
        orderCode: orderCode?.toString() || "", // = externalTransactionId
        amount: payOSData.amount || 0, // = totalAmount
        qrCode: qrCode,

        // PayOS specific fields
        paymentLinkId: payOSData.paymentLinkId,
        accountNumber: payOSData.accountNumber,
        bin: payOSData.bin,
        description: paymentData.description,
        expiredAt: payOSData.expiredAt,

        // QR analysis
        qrAnalysis: qrAnalysis,
      };

      return normalizedPaymentResponse;
    } catch (error) {
      console.error("❌ Payment creation error:", error);
      throw error;
    }
  }

  // ✅ ENHANCED: Get payment - Handle new API response format
  async getPayment(paymentId: number): Promise<PaymentResponse> {
    try {
      if (!paymentId || isNaN(paymentId) || paymentId <= 0) {
        throw new Error("Invalid paymentId - must be a positive number");
      }

      const response = await apiClient.get<any>(
        PAYMENT_ENDPOINTS.GET(paymentId) // /api/Payment/{paymentId}
      );

      // ✅ NEW: Handle new API response format
      let apiData;
      if (response.error === 0 && response.data) {
        // New API format: { error: 0, message: "...", data: { paymentId: 13, externalTransactionId: "...", ... } }
        apiData = response.data;
      } else if (response.data) {
        apiData = response.data;
      } else {
        apiData = response;
      }

      if (!apiData) {
        throw new Error("Empty response from payment API");
      }

      // ✅ CRITICAL: Map new API response to PaymentResponse
      const normalizedPayment: PaymentResponse = {
        // ✅ PRIMARY: Map new API fields directly
        paymentId: apiData.paymentId || paymentId,
        externalTransactionId: apiData.externalTransactionId || "",
        customerId: apiData.customerId || 0,
        customerName: apiData.customerName || "",
        customerEmail: apiData.customerEmail || "",
        totalAmount: apiData.totalAmount || 0,
        status: apiData.status || "Pending", // "Success", "Pending", etc.
        currency: apiData.currency || "VND",
        method: apiData.method || "PayOS",
        note: apiData.note || "",
        createdAt: apiData.createdAt || new Date().toISOString(),
        updatedAt: apiData.updatedAt || new Date().toISOString(),
        bookingId: apiData.bookingId || 0,
        bookingStatus: apiData.bookingStatus || "Pending",
        photographerName: apiData.photographerName || "",
        locationName: apiData.locationName || "",
        isWalletTopUp: apiData.isWalletTopUp || false,

        // ✅ LEGACY: Backward compatibility mapping
        id: apiData.paymentId || paymentId, // = paymentId
        paymentUrl: "", // Not in GET response
        orderCode: apiData.externalTransactionId || "", // = externalTransactionId
        amount: apiData.totalAmount || 0, // = totalAmount
        qrCode: null, // Not in GET response

        // PayOS fields - not in new GET response
        paymentLinkId: undefined,
        accountNumber: undefined,
        bin: undefined,
        description: apiData.note || "",
        expiredAt: undefined,
        qrAnalysis: null,
      };

      return normalizedPayment;
    } catch (error) {
      console.error("❌ Error fetching payment:", error);
      throw error;
    }
  }

  // ✅ ENHANCED: Cancel payment
  async cancelPayment(bookingId: number): Promise<void> {
    try {
      // Validate bookingId
      if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
        throw new Error("Invalid booking ID for cancellation");
      }

      await apiClient.put<void>(PAYMENT_ENDPOINTS.CANCEL(bookingId));
    } catch (error) {
      console.error("❌ Error cancelling payment:", error);
      throw error;
    }
  }

  // ✅ Create payment for booking (convenience method)
  async createPaymentForBooking(
    userId: number,
    bookingId: number,
    photographerName: string,
    bookingDetails: {
      date: string;
      startTime: string;
      endTime: string;
      location?: string;
    }
  ): Promise<PaymentResponse> {
    try {
      const productName = `Dịch vụ chụp ảnh - ${photographerName}`;
      const description = `Thanh toán booking ${bookingId}`;

      const paymentData: CreatePaymentLinkRequest = {
        productName,
        description,
        bookingId,
        successUrl: DEEP_LINKS.PAYMENT_SUCCESS,
        cancelUrl: DEEP_LINKS.PAYMENT_CANCEL,
      };

      return await this.createPaymentLink(userId, paymentData);
    } catch (error) {
      console.error("❌ Error creating payment for booking:", error);
      throw error;
    }
  }

  // ===== STATUS UTILITY METHODS =====

  // ✅ Get payment status color
  getPaymentStatusColor(status?: string): string {
    if (!status) return "#757575";

    switch (status) {
      case "Success":
      case "Completed":
      case "Paid":
        return "#4CAF50";
      case "Pending":
        return "#FF9800";
      case "Processing":
        return "#2196F3";
      case "Failed":
        return "#F44336";
      case "Cancelled":
        return "#9E9E9E";
      case "Expired":
        return "#757575";
      default:
        return "#757575";
    }
  }

  // ✅ Get payment status text
  getPaymentStatusText(status?: string): string {
    if (!status) return "Không xác định";

    switch (status) {
      case "Success":
      case "Completed":
      case "Paid":
        return "Thành công";
      case "Pending":
        return "Đang chờ";
      case "Processing":
        return "Đang xử lý";
      case "Failed":
        return "Thất bại";
      case "Cancelled":
        return "Đã hủy";
      case "Expired":
        return "Đã hết hạn";
      default:
        return "Không xác định";
    }
  }

  // ✅ Check if payment is completed
  isPaymentCompleted(status?: string): boolean {
    if (!status) return false;
    const completedStatuses = ["Success", "Completed", "Paid"];
    return completedStatuses.includes(status);
  }

  // ✅ Check if payment is pending
  isPaymentPending(status?: string): boolean {
    if (!status) return false;
    const pendingStatuses = ["Pending", "Processing"];
    return pendingStatuses.includes(status);
  }

  // ✅ Check if payment is failed
  isPaymentFailed(status?: string): boolean {
    if (!status) return false;
    const failedStatuses = ["Failed", "Cancelled", "Expired"];
    return failedStatuses.includes(status);
  }

  // ✅ NEW: Validate QR code format
  validateQRCode(qrCode: string): boolean {
    const analysis = this.analyzeQRCodeFormat(qrCode);
    return analysis.isValid;
  }

  // ===== TEST & DEBUG METHODS =====

  // ✅ Test payment with existing booking
  async testPaymentWithExistingBooking(
    userId: number,
    testBookingId: number
  ): Promise<{ success: boolean; data?: PaymentResponse; error?: string }> {
    try {
      const paymentPayload: CreatePaymentLinkRequest = {
        productName: "Test Service",
        description: "Test payment creation",
        bookingId: testBookingId,
        successUrl: DEEP_LINKS.PAYMENT_SUCCESS,
        cancelUrl: DEEP_LINKS.PAYMENT_CANCEL,
      };

      const result = await this.createPaymentLink(userId, paymentPayload);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error("🧪 Test result - FAILED:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ✅ Direct API test method
  async createPaymentDirect(
    userId: number,
    paymentData: CreatePaymentLinkRequest
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Make direct fetch call to bypass our service wrapper
      const response = await fetch(
        `https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net/api/Payment/create?userId=${userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            productName: paymentData.productName.trim(),
            description: paymentData.description.trim(),
            bookingId: parseInt(paymentData.bookingId.toString()),
            successUrl: paymentData.successUrl || DEEP_LINKS.PAYMENT_SUCCESS,
            cancelUrl: paymentData.cancelUrl || DEEP_LINKS.PAYMENT_CANCEL,
          }),
        }
      );

      const responseText = await response.text();

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        return {
          success: false,
          error: `Invalid JSON response: ${responseText}`,
        };
      }

      if (response.ok) {
        return {
          success: true,
          data,
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${data?.message || "Unknown error"}`,
        };
      }
    } catch (error) {
      console.error("🔧 Direct API call failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }
  async createWalletTopUp(request: CreateWalletTopUpRequest): Promise<WalletTopUpResponse> {
  try {
    const response = await apiClient.post<any>(
      '/api/Payment/wallet-topup',
      request
    );

    // Handle response format similar to createPaymentLink
    let apiResponse;
    if (response.error === 0 && response.data) {
      apiResponse = response.data;
    } else if (response.data) {
      apiResponse = response.data;
    } else {
      apiResponse = response;
    }

    if (!apiResponse) {
      throw new Error('Empty response from wallet top-up API');
    }

    return {
      error: 0,
      message: 'Wallet top-up created successfully',
      data: apiResponse
    };
  } catch (error) {
    console.error('❌ Create wallet top-up error:', error);
    throw error;
  }
}

// ✅ NEW: Create wallet top-up with proper description formatting
async createWalletTopUpPayment(
  amount: number,
  successUrl?: string,
  cancelUrl?: string
): Promise<WalletTopUpResponse> {
  try {
    // ✅ Format description like booking: short and simple
    const request: CreateWalletTopUpRequest = {
      productName: 'Nạp tiền ví SnapLink', // Shorter product name
      description: `Nạp tiền ${amount.toLocaleString('vi-VN')}đ`, // Max 25 chars
      amount: amount,
      successUrl: successUrl || DEEP_LINKS.PAYMENT_SUCCESS,
      cancelUrl: cancelUrl || DEEP_LINKS.PAYMENT_CANCEL
    };

    return await this.createWalletTopUp(request);
  } catch (error) {
    console.error('❌ Error creating wallet top-up payment:', error);
    throw error;
  }
}

// Generate callback URLs using existing DEEP_LINKS
generateCallbackUrls(paymentId?: string) {
  return {
    successUrl: paymentId 
      ? createDeepLink('payment-success', { paymentId })
      : DEEP_LINKS.PAYMENT_SUCCESS,
    cancelUrl: paymentId 
      ? createDeepLink('payment-cancel', { paymentId })
      : DEEP_LINKS.PAYMENT_CANCEL
  };
}

// Predefined amounts for quick selection
getQuickAmounts(): number[] {
  return [50000, 100000, 200000, 500000, 1000000, 2000000];
}

// Format amount for display
formatAmount(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(amount);
}

// ✅ NEW: Generate short description for wallet top-up (max 25 chars)
generateTopUpDescription(amount: number): string {
  // Format: "Nạp tiền 100,000đ" = ~16 chars (safe under 25)
  return `Nạp tiền ${amount.toLocaleString('vi-VN')}đ`;
}

// Validate amount
validateAmount(amount: number): { isValid: boolean; error?: string } {
  if (amount < 5000) {
    return { isValid: false, error: 'Số tiền tối thiểu là 5,000 VND' };
  }
  
  if (amount > 10000000) {
    return { isValid: false, error: 'Số tiền tối đa là 10,000,000 VND' };
  }
  
  return { isValid: true };
}
}



// Export singleton instance
export const paymentService = new PaymentService();
