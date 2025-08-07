import { apiClient } from './base';
import type {
  PaymentResponse,
  CreatePaymentLinkRequest,
  PaymentCallbackParams,
  PaymentSuccessResponse,
  PaymentStatusResponse
} from '../types/payment';
import { DEEP_LINKS } from '../config/deepLinks';

const PAYMENT_ENDPOINTS = {
  CREATE: (userId: number) => `/api/Payment/create?userId=${userId}`,
  GET: (paymentId: number) => `/api/Payment/${paymentId}`,
  CANCEL: (bookingId: number) => `/api/Payment/booking/${bookingId}/cancel`,
  WEBHOOK: '/api/Payment/webhook'
};

export class PaymentService {

  // ✅ NEW: Helper method to analyze QR code format
  private analyzeQRCodeFormat(qrCode: string): {
    type: 'http_url' | 'data_uri' | 'base64_image' | 'emvco' | 'unknown';
    isValid: boolean;
    details: string;
  } {
    if (!qrCode || typeof qrCode !== 'string') {
      return { type: 'unknown', isValid: false, details: 'QR code is null or not string' };
    }

    const trimmed = qrCode.trim();
    
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return { 
        type: 'http_url', 
        isValid: true, 
        details: `HTTP URL (${trimmed.length} chars)` 
      };
    }
    
    if (trimmed.startsWith('data:image/')) {
      return { 
        type: 'data_uri', 
        isValid: true, 
        details: `Data URI (${trimmed.length} chars)` 
      };
    }
    
    if (trimmed.startsWith('/9j/') || trimmed.startsWith('iVBORw0K')) {
      return { 
        type: 'base64_image', 
        isValid: true, 
        details: `Base64 image (${trimmed.length} chars)` 
      };
    }
    
    // EMVCo QR code format check
    if (/^[0-9]{4}/.test(trimmed) && trimmed.length > 50) {
      return { 
        type: 'emvco', 
        isValid: true, 
        details: `EMVCo format (${trimmed.length} chars, starts with: ${trimmed.substring(0, 10)})` 
      };
    }
    
    return { 
      type: 'unknown', 
      isValid: false, 
      details: `Unknown format (${trimmed.length} chars, starts with: ${trimmed.substring(0, 20)})` 
    };
  }

  // ✅ ENHANCED: Create payment link - Handle both old and new response formats
  async createPaymentLink(
    userId: number, 
    paymentData: CreatePaymentLinkRequest
  ): Promise<PaymentResponse> {
    try {
      console.log('💳 Creating payment link - START');
      console.log('👤 User ID:', userId);
      console.log('📋 Payment data:', JSON.stringify(paymentData, null, 2));
      
      // Enhanced validation
      if (!userId || isNaN(userId) || userId <= 0) {
        throw new Error('Invalid user ID provided');
      }

      if (!paymentData || !paymentData.productName || !paymentData.description || !paymentData.bookingId) {
        throw new Error('Missing required payment data fields');
      }

      // Prepare final payload
      const finalPayload = {
        productName: paymentData.productName.trim(),
        description: paymentData.description.trim(),
        bookingId: parseInt(paymentData.bookingId.toString()),
        successUrl: paymentData.successUrl?.trim() || DEEP_LINKS.PAYMENT_SUCCESS,
        cancelUrl: paymentData.cancelUrl?.trim() || DEEP_LINKS.PAYMENT_CANCEL
      };

      console.log('💳 Final payload:', JSON.stringify(finalPayload, null, 2));

      // Make API call
      const response = await apiClient.post<any>(
        PAYMENT_ENDPOINTS.CREATE(userId),
        finalPayload
      );
      
      console.log('📦 Payment Creation API response:', JSON.stringify(response, null, 2));
      
      // ✅ CRITICAL: Handle new API response format
      let apiResponse;
      if (response.error === 0 && response.data) {
        // New API format: { error: 0, message: "...", data: { paymentId: 10, payOSData: {...} } }
        apiResponse = response.data;
        console.log('✅ Detected new API response format');
      } else if (response.data) {
        apiResponse = response.data;
      } else {
        apiResponse = response;
      }
      
      if (!apiResponse) {
        throw new Error('Empty response from payment API');
      }

      console.log('🔍 Processing API response:', {
        hasPaymentId: 'paymentId' in apiResponse,
        hasPayOSData: 'payOSData' in apiResponse,
        paymentId: apiResponse.paymentId,
        responseKeys: Object.keys(apiResponse)
      });

      // ✅ NEW: Handle new API response structure
      // API response: { paymentId: 10, payOSData: { orderCode: 1430368655, ... } }
      const paymentId = apiResponse.paymentId;           // Database primary key
      const payOSData = apiResponse.payOSData || {};     // PayOS data
      const orderCode = payOSData.orderCode;             // PayOS orderCode

      if (!paymentId) {
        console.error('❌ Missing paymentId in API response:', Object.keys(apiResponse));
        throw new Error('Payment response missing required paymentId field');
      }

      // Extract QR code from payOSData
      let qrCode = null;
      let qrAnalysis = null;
      
      if (payOSData.qrCode) {
        qrCode = payOSData.qrCode;
        qrAnalysis = this.analyzeQRCodeFormat(qrCode);
        console.log('✅ Found QR code:', qrAnalysis);
      }

      // ✅ FIXED: Map to new PaymentResponse structure
      const normalizedPaymentResponse: PaymentResponse = {
        // ✅ PRIMARY: New API fields (with defaults from payOSData)
        paymentId: paymentId,
        externalTransactionId: orderCode?.toString() || '',
        customerId: userId,                                  // From request since API doesn't return
        customerName: '',                                    // Not available in creation response
        customerEmail: '',                                   // Not available in creation response
        totalAmount: payOSData.amount || 0,
        status: payOSData.status || 'Pending',
        currency: payOSData.currency || 'VND',
        method: 'PayOS',
        note: paymentData.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        bookingId: paymentData.bookingId,
        bookingStatus: 'Pending',                           // Default for new payment
        photographerName: '',                               // Not available in creation response
        locationName: '',                                   // Not available in creation response
        isWalletTopUp: false,

        // ✅ LEGACY: Backward compatibility
        id: paymentId,                                      // = paymentId
        paymentUrl: payOSData.checkoutUrl || '',
        orderCode: orderCode?.toString() || '',             // = externalTransactionId
        amount: payOSData.amount || 0,                      // = totalAmount
        qrCode: qrCode,
        
        // PayOS specific fields
        paymentLinkId: payOSData.paymentLinkId,
        accountNumber: payOSData.accountNumber,
        bin: payOSData.bin,
        description: paymentData.description,
        expiredAt: payOSData.expiredAt,
        
        // QR analysis
        qrAnalysis: qrAnalysis
      };

      console.log('✅ Payment link created successfully:', {
        paymentId: normalizedPaymentResponse.paymentId,     // Database ID (10)
        id: normalizedPaymentResponse.id,                   // Same as paymentId
        externalTransactionId: normalizedPaymentResponse.externalTransactionId, // PayOS orderCode (1430368655)
        orderCode: normalizedPaymentResponse.orderCode,     // Same as externalTransactionId
        paymentUrl: normalizedPaymentResponse.paymentUrl,
        amount: normalizedPaymentResponse.amount,
        totalAmount: normalizedPaymentResponse.totalAmount,
        status: normalizedPaymentResponse.status,
        hasQRCode: !!normalizedPaymentResponse.qrCode,
        qrType: qrAnalysis?.type,
        qrValid: qrAnalysis?.isValid
      });
      
      return normalizedPaymentResponse;
      
    } catch (error) {
      console.error('❌ Payment creation error:', error);
      throw error;
    }
  }

  // ✅ ENHANCED: Get payment - Handle new API response format
  async getPayment(paymentId: number): Promise<PaymentResponse> {
    try {
      console.log('🔍 Fetching payment by paymentId:', paymentId);
      
      if (!paymentId || isNaN(paymentId) || paymentId <= 0) {
        throw new Error('Invalid paymentId - must be a positive number');
      }
      
      const response = await apiClient.get<any>(
        PAYMENT_ENDPOINTS.GET(paymentId)  // /api/Payment/{paymentId}
      );
      
      console.log('📦 Raw payment GET response:', JSON.stringify(response, null, 2));
      
      // ✅ NEW: Handle new API response format
      let apiData;
      if (response.error === 0 && response.data) {
        // New API format: { error: 0, message: "...", data: { paymentId: 13, externalTransactionId: "...", ... } }
        apiData = response.data;
        console.log('✅ Detected new API GET response format');
      } else if (response.data) {
        apiData = response.data;
      } else {
        apiData = response;
      }
      
      if (!apiData) {
        throw new Error('Empty response from payment API');
      }

      console.log('🔍 GET Response structure:', {
        hasPaymentId: 'paymentId' in apiData,
        hasExternalTransactionId: 'externalTransactionId' in apiData,
        hasCustomerId: 'customerId' in apiData,
        hasTotalAmount: 'totalAmount' in apiData,
        status: apiData.status,
        responseKeys: Object.keys(apiData)
      });

      // ✅ CRITICAL: Map new API response to PaymentResponse
      const normalizedPayment: PaymentResponse = {
        // ✅ PRIMARY: Map new API fields directly
        paymentId: apiData.paymentId || paymentId,
        externalTransactionId: apiData.externalTransactionId || '',
        customerId: apiData.customerId || 0,
        customerName: apiData.customerName || '',
        customerEmail: apiData.customerEmail || '',
        totalAmount: apiData.totalAmount || 0,
        status: apiData.status || 'Pending',                // "Success", "Pending", etc.
        currency: apiData.currency || 'VND',
        method: apiData.method || 'PayOS',
        note: apiData.note || '',
        createdAt: apiData.createdAt || new Date().toISOString(),
        updatedAt: apiData.updatedAt || new Date().toISOString(),
        bookingId: apiData.bookingId || 0,
        bookingStatus: apiData.bookingStatus || 'Pending',
        photographerName: apiData.photographerName || '',
        locationName: apiData.locationName || '',
        isWalletTopUp: apiData.isWalletTopUp || false,

        // ✅ LEGACY: Backward compatibility mapping
        id: apiData.paymentId || paymentId,                 // = paymentId
        paymentUrl: '',                                     // Not in GET response
        orderCode: apiData.externalTransactionId || '',     // = externalTransactionId  
        amount: apiData.totalAmount || 0,                   // = totalAmount
        qrCode: null,                                       // Not in GET response
        
        // PayOS fields - not in new GET response
        paymentLinkId: undefined,
        accountNumber: undefined,
        bin: undefined,
        description: apiData.note || '',
        expiredAt: undefined,
        qrAnalysis: null
      };
      
      console.log('✅ Payment GET normalized successfully:', {
        paymentId: normalizedPayment.paymentId,             // Database ID (13)
        id: normalizedPayment.id,                           // Same as paymentId
        externalTransactionId: normalizedPayment.externalTransactionId, // PayOS orderCode
        orderCode: normalizedPayment.orderCode,             // Same as externalTransactionId
        status: normalizedPayment.status,                   // "Success", "Pending", etc.
        totalAmount: normalizedPayment.totalAmount,
        amount: normalizedPayment.amount,                   // Same as totalAmount
        customerName: normalizedPayment.customerName,
        photographerName: normalizedPayment.photographerName,
        locationName: normalizedPayment.locationName
      });
      
      return normalizedPayment;
    } catch (error) {
      console.error('❌ Error fetching payment:', error);
      throw error;
    }
  }

  // ✅ ENHANCED: Cancel payment 
  async cancelPayment(bookingId: number): Promise<void> {
    try {
      console.log('❌ Cancelling payment for booking:', bookingId);
      
      // Validate bookingId
      if (!bookingId || isNaN(bookingId) || bookingId <= 0) {
        throw new Error('Invalid booking ID for cancellation');
      }
      
      await apiClient.put<void>(PAYMENT_ENDPOINTS.CANCEL(bookingId));
      console.log('✅ Payment cancelled successfully');
    } catch (error) {
      console.error('❌ Error cancelling payment:', error);
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
      console.log('💳 Creating payment for booking:', { userId, bookingId, photographerName, bookingDetails });

      const productName = `Dịch vụ chụp ảnh - ${photographerName}`;
      const description = `Thanh toán booking ${bookingId}`;

      const paymentData: CreatePaymentLinkRequest = {
        productName,
        description,
        bookingId,
        successUrl: DEEP_LINKS.PAYMENT_SUCCESS,
        cancelUrl: DEEP_LINKS.PAYMENT_CANCEL
      };

      return await this.createPaymentLink(userId, paymentData);
    } catch (error) {
      console.error('❌ Error creating payment for booking:', error);
      throw error;
    }
  }

  // ===== STATUS UTILITY METHODS =====

  // ✅ Get payment status color
  getPaymentStatusColor(status?: string): string {
    if (!status) return '#757575';
    
    switch (status) {
      case 'Success':
      case 'Completed':
      case 'Paid':
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
  }

  // ✅ Get payment status text
  getPaymentStatusText(status?: string): string {
    if (!status) return 'Không xác định';
    
    switch (status) {
      case 'Success':
      case 'Completed':
      case 'Paid':
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
  }

  // ✅ Check if payment is completed
  isPaymentCompleted(status?: string): boolean {
    if (!status) return false;
    const completedStatuses = ['Success', 'Completed', 'Paid'];
    return completedStatuses.includes(status);
  }

  // ✅ Check if payment is pending
  isPaymentPending(status?: string): boolean {
    if (!status) return false;
    const pendingStatuses = ['Pending', 'Processing'];
    return pendingStatuses.includes(status);
  }

  // ✅ Check if payment is failed
  isPaymentFailed(status?: string): boolean {
    if (!status) return false;
    const failedStatuses = ['Failed', 'Cancelled', 'Expired'];
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
      console.log('🧪 Testing payment with existing booking:', { userId, testBookingId });
      
      const paymentPayload: CreatePaymentLinkRequest = {
        productName: "Test Service",
        description: "Test payment creation",
        bookingId: testBookingId,
        successUrl: DEEP_LINKS.PAYMENT_SUCCESS,
        cancelUrl: DEEP_LINKS.PAYMENT_CANCEL
      };

      const result = await this.createPaymentLink(userId, paymentPayload);
      
      console.log('🧪 Test result - SUCCESS:', result);
      return { 
        success: true, 
        data: result 
      };
      
    } catch (error) {
      console.error('🧪 Test result - FAILED:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // ✅ Direct API test method
  async createPaymentDirect(
    userId: number,
    paymentData: CreatePaymentLinkRequest
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🔧 Direct API call for payment creation');
      console.log('🔧 User ID:', userId);
      console.log('🔧 Payload:', JSON.stringify(paymentData, null, 2));

      // Make direct fetch call to bypass our service wrapper
      const response = await fetch(
        `https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net/api/Payment/create?userId=${userId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            productName: paymentData.productName.trim(),
            description: paymentData.description.trim(),
            bookingId: parseInt(paymentData.bookingId.toString()),
            successUrl: paymentData.successUrl || DEEP_LINKS.PAYMENT_SUCCESS,
            cancelUrl: paymentData.cancelUrl || DEEP_LINKS.PAYMENT_CANCEL
          })
        }
      );

      console.log('🔧 Direct API response status:', response.status);
      
      const responseText = await response.text();
      console.log('🔧 Direct API response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        return {
          success: false,
          error: `Invalid JSON response: ${responseText}`
        };
      }

      if (response.ok) {
        return {
          success: true,
          data
        };
      } else {
        return {
          success: false,
          error: `HTTP ${response.status}: ${data?.message || 'Unknown error'}`
        };
      }

    } catch (error) {
      console.error('🔧 Direct API call failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();