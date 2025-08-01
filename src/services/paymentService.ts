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

  // ✅ ENHANCED: Create payment link with better QR handling
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

      if (!paymentData) {
        throw new Error('Payment data is required');
      }

      if (!paymentData.productName || typeof paymentData.productName !== 'string' || paymentData.productName.trim() === '') {
        throw new Error('productName is required and must be a non-empty string');
      }

      if (!paymentData.description || typeof paymentData.description !== 'string' || paymentData.description.trim() === '') {
        throw new Error('description is required and must be a non-empty string');
      }

      if (!paymentData.bookingId || isNaN(paymentData.bookingId) || paymentData.bookingId <= 0) {
        throw new Error('bookingId is required and must be a positive number');
      }

      if (!paymentData.successUrl || typeof paymentData.successUrl !== 'string' || paymentData.successUrl.trim() === '') {
        throw new Error('successUrl is required and must be a non-empty string');
      }
  
      if (!paymentData.cancelUrl || typeof paymentData.cancelUrl !== 'string' || paymentData.cancelUrl.trim() === '') {
        throw new Error('cancelUrl is required and must be a non-empty string');
      }

      // Prepare final payload
      const finalPayload = {
        productName: paymentData.productName.trim(),
        description: paymentData.description.trim(),
        bookingId: parseInt(paymentData.bookingId.toString()),
        successUrl: paymentData.successUrl.trim(),
        cancelUrl: paymentData.cancelUrl.trim()
      };

      console.log('💳 Final payload:', JSON.stringify(finalPayload, null, 2));
      console.log('💳 API endpoint:', PAYMENT_ENDPOINTS.CREATE(userId));

      // Make API call
      const response = await apiClient.post<any>(
        PAYMENT_ENDPOINTS.CREATE(userId),
        finalPayload
      );
      
      console.log('📦 Payment API response:', JSON.stringify(response, null, 2));
      
      // Handle different response structures for payment
      let paymentResponse;
      
      if (response.data) {
        paymentResponse = response.data;
        console.log('📦 Using response.data for payment:', paymentResponse);
      } else if (response.payment) {
        paymentResponse = response.payment;
        console.log('📦 Using response.payment:', paymentResponse);
      } else {
        paymentResponse = response;
        console.log('📦 Using direct payment response:', paymentResponse);
      }
      
      // Validate response
      if (!paymentResponse) {
        throw new Error('Empty response from payment API');
      }

      // ✅ FIX: Use orderCode as the main ID for tracking
      const paymentId = paymentResponse.orderCode; // Use orderCode (number) instead of paymentLinkId (string)
      const paymentLinkId = paymentResponse.paymentLinkId; // Keep paymentLinkId for reference
      
      if (!paymentId) {
        console.error('❌ Payment response missing orderCode. Available fields:', Object.keys(paymentResponse));
        throw new Error('Payment response missing required orderCode field');
      }

      // ✅ ENHANCED: Better QR code extraction with analysis
      let qrCode = null;
      let qrAnalysis = null;
      
      // Try different possible QR code field names
      if (paymentResponse.qrCode) {
        qrCode = paymentResponse.qrCode;
        qrAnalysis = this.analyzeQRCodeFormat(qrCode);
        console.log('✅ Found QR code in qrCode field:', qrAnalysis);
      } else if (paymentResponse.qr) {
        qrCode = paymentResponse.qr;
        qrAnalysis = this.analyzeQRCodeFormat(qrCode);
        console.log('✅ Found QR code in qr field:', qrAnalysis);
      } else if (paymentResponse.qrCodeUrl) {
        qrCode = paymentResponse.qrCodeUrl;
        qrAnalysis = this.analyzeQRCodeFormat(qrCode);
        console.log('✅ Found QR code in qrCodeUrl field:', qrAnalysis);
      } else {
        console.warn('⚠️ No QR code found in payment response. Available fields:', Object.keys(paymentResponse));
      }

      // ✅ Enhanced QR validation and logging
      if (qrCode && qrAnalysis) {
        console.log('🔍 QR Code Analysis:', {
          type: qrAnalysis.type,
          isValid: qrAnalysis.isValid,
          details: qrAnalysis.details,
          rawLength: qrCode.length,
          preview: qrCode.substring(0, 50) + (qrCode.length > 50 ? '...' : '')
        });
        
        if (!qrAnalysis.isValid) {
          console.warn('⚠️ QR Code validation failed:', qrAnalysis.details);
          console.warn('⚠️ Raw QR data preview:', qrCode.substring(0, 200));
        }
      }

      // ✅ FIX: Map PayOS response to our PaymentResponse interface
      const normalizedPaymentResponse: PaymentResponse = {
        id: paymentId, // ✅ FIX: Use orderCode as main ID for tracking
        paymentUrl: paymentResponse.checkoutUrl || paymentResponse.paymentUrl || '',
        orderCode: paymentResponse.orderCode?.toString() || '',
        amount: paymentResponse.amount || 0,
        status: paymentResponse.status || 'PENDING',
        bookingId: paymentData.bookingId, // From original request since API doesn't return it
        createdAt: new Date().toISOString(), // PayOS doesn't return createdAt
        qrCode: qrCode, // ✅ FIX: Properly extracted QR code
        
        // ✅ THÊM: Keep original PayOS fields for reference
        paymentLinkId: paymentLinkId, // Keep for PayOS operations
        accountNumber: paymentResponse.accountNumber,
        bin: paymentResponse.bin,
        currency: paymentResponse.currency,
        description: paymentResponse.description,
        expiredAt: paymentResponse.expiredAt,
        
        // ✅ NEW: Add QR analysis for debugging (if needed in type)
        qrAnalysis: qrAnalysis
      };

      console.log('✅ Payment link created successfully:', {
        id: normalizedPaymentResponse.id, // This is orderCode (number)
        paymentLinkId: normalizedPaymentResponse.paymentLinkId, // This is paymentLinkId (string)
        paymentUrl: normalizedPaymentResponse.paymentUrl,
        orderCode: normalizedPaymentResponse.orderCode,
        amount: normalizedPaymentResponse.amount,
        status: normalizedPaymentResponse.status,
        hasQRCode: !!normalizedPaymentResponse.qrCode,
        qrType: qrAnalysis?.type,
        qrValid: qrAnalysis?.isValid,
        qrLength: normalizedPaymentResponse.qrCode?.length
      });
      
      return normalizedPaymentResponse;
      
    } catch (error) {
      console.error('❌ Payment creation error details:');
      
      if (error instanceof Error) {
        console.error('❌ Error message:', error.message);
        console.error('❌ Error stack:', error.stack);
        
        // Check nếu là API error với message cụ thể
        if (error.message.includes('Failed to create payment link')) {
          console.error('🚨 Specific API Error: Payment link creation failed - possible reasons:');
          console.error('   - Booking already has a payment');
          console.error('   - Booking status is not valid for payment');
          console.error('   - Payment service configuration issue');
          console.error('   - BookingId does not exist or is not accessible');
          
          throw new Error('Không thể tạo link thanh toán. Booking có thể đã có thanh toán hoặc trạng thái không phù hợp.');
        }
      } else {
        console.error('❌ Raw error:', error);
      }
      
      // Re-throw with more context
      const errorMessage = error instanceof Error ? error.message : 'Unknown payment creation error';
      throw new Error(`Payment creation failed: ${errorMessage}`);
    }
  }

  // ✅ ENHANCED: Get payment with better QR handling
  async getPayment(paymentId: number): Promise<PaymentResponse> {
    try {
      console.log('🔍 Fetching payment by orderCode:', paymentId);
      
      const response = await apiClient.get<any>(
        PAYMENT_ENDPOINTS.GET(paymentId)
      );
      
      console.log('📦 Raw payment response:', JSON.stringify(response, null, 2));
      
      // Handle different response structures
      let paymentData;
      if (response.data) {
        paymentData = response.data;
      } else if (response.payment) {
        paymentData = response.payment;
      } else {
        paymentData = response;
      }

      // ✅ ENHANCED: Better QR code extraction for getPayment
      let qrCode = null;
      let qrAnalysis = null;
      
      if (paymentData.qrCode) {
        qrCode = paymentData.qrCode;
        qrAnalysis = this.analyzeQRCodeFormat(qrCode);
      } else if (paymentData.qr) {
        qrCode = paymentData.qr;
        qrAnalysis = this.analyzeQRCodeFormat(qrCode);
      } else if (paymentData.qrCodeUrl) {
        qrCode = paymentData.qrCodeUrl;
        qrAnalysis = this.analyzeQRCodeFormat(qrCode);
      }

      if (qrCode && qrAnalysis) {
        console.log('🔍 QR Code Analysis (getPayment):', {
          type: qrAnalysis.type,
          isValid: qrAnalysis.isValid,
          details: qrAnalysis.details
        });
      }

      // ✅ FIX: Normalize PayOS response for getPayment
      const normalizedPayment: PaymentResponse = {
        id: paymentData.orderCode || paymentId, // Use orderCode as main ID
        paymentUrl: paymentData.checkoutUrl || paymentData.paymentUrl || '',
        orderCode: paymentData.orderCode?.toString() || paymentId.toString(),
        amount: paymentData.amount || 0,
        status: paymentData.status || 'PENDING',
        bookingId: paymentData.bookingId || 0,
        createdAt: paymentData.createdAt || new Date().toISOString(),
        qrCode: qrCode, // ✅ FIX: Properly extracted QR code
        
        // Keep PayOS specific fields
        paymentLinkId: paymentData.paymentLinkId,
        accountNumber: paymentData.accountNumber,
        bin: paymentData.bin,
        currency: paymentData.currency,
        description: paymentData.description,
        expiredAt: paymentData.expiredAt,
        
        // Add QR analysis
        qrAnalysis: qrAnalysis
      };
      
      console.log('✅ Payment fetched successfully:', {
        id: normalizedPayment.id,
        status: normalizedPayment.status,
        orderCode: normalizedPayment.orderCode,
        hasQRCode: !!normalizedPayment.qrCode,
        qrType: qrAnalysis?.type,
        qrValid: qrAnalysis?.isValid
      });
      
      return normalizedPayment;
    } catch (error) {
      console.error('❌ Error fetching payment:', error);
      throw error;
    }
  }

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
      const description = `Thanh toán`;

    // ✅ THÊM: Sử dụng deep link URLs
    const successUrl = DEEP_LINKS.PAYMENT_SUCCESS;
    const cancelUrl = DEEP_LINKS.PAYMENT_CANCEL;

      console.log('📝 Payment data:', {
        productName,
        productNameLength: productName.length,
        description,
        descriptionLength: description.length,
        bookingId,
        userId
      });

      const paymentData: CreatePaymentLinkRequest = {
        productName,
        description,
        bookingId,
        successUrl,
        cancelUrl
      };

      return await this.createPaymentLink(userId, paymentData);
    } catch (error) {
      console.error('❌ Error creating payment for booking:', error);
      throw error;
    }
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
            bookingId: parseInt(paymentData.bookingId.toString())
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

  // ===== UTILITY METHODS =====

  // ✅ Get payment status color
  getPaymentStatusColor(status?: string): string {
    if (!status) return '#757575';
    
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
      case 'paid':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'processing':
        return '#2196F3';
      case 'failed':
        return '#F44336';
      case 'cancelled':
        return '#9E9E9E';
      case 'expired':
        return '#757575';
      default:
        return '#757575';
    }
  }

  // ✅ Get payment status text
  getPaymentStatusText(status?: string): string {
    if (!status) return 'Không xác định';
    
    switch (status.toLowerCase()) {
      case 'success':
      case 'completed':
      case 'paid':
        return 'Thành công';
      case 'pending':
        return 'Đang chờ';
      case 'processing':
        return 'Đang xử lý';
      case 'failed':
        return 'Thất bại';
      case 'cancelled':
        return 'Đã hủy';
      case 'expired':
        return 'Đã hết hạn';
      default:
        return 'Không xác định';
    }
  }

  // ✅ Check if payment is completed
  isPaymentCompleted(status?: string): boolean {
    if (!status) return false;
    const completedStatuses = ['success', 'completed', 'paid'];
    return completedStatuses.includes(status.toLowerCase());
  }

  // ✅ Check if payment is pending
  isPaymentPending(status?: string): boolean {
    if (!status) return false;
    const pendingStatuses = ['pending', 'processing'];
    return pendingStatuses.includes(status.toLowerCase());
  }

  // ✅ Check if payment is failed
  isPaymentFailed(status?: string): boolean {
    if (!status) return false;
    const failedStatuses = ['failed', 'cancelled', 'expired'];
    return failedStatuses.includes(status.toLowerCase());
  }

  // ✅ NEW: Validate QR code format
  validateQRCode(qrCode: string): boolean {
    const analysis = this.analyzeQRCodeFormat(qrCode);
    return analysis.isValid;
  }

  // ✅ NEW: Get QR code suggestions for troubleshooting
  getQRCodeSuggestions(qrCode: string): string[] {
    const analysis = this.analyzeQRCodeFormat(qrCode);
    const suggestions: string[] = [];

    switch (analysis.type) {
      case 'emvco':
        suggestions.push('Đây là mã QR EMVCo - có thể sao chép và dán vào ứng dụng banking');
        suggestions.push('Thử sử dụng chức năng "Nhập mã thủ công" trong app banking');
        break;
      case 'http_url':
        suggestions.push('Đây là URL - có thể mở trực tiếp trong trình duyệt');
        break;
      case 'data_uri':
        suggestions.push('Đây là ảnh QR dạng Data URI - có thể hiển thị trực tiếp');
        break;
      case 'base64_image':
        suggestions.push('Đây là ảnh QR dạng Base64 - cần thêm prefix để hiển thị');
        break;
      default:
        suggestions.push('Định dạng QR không xác định - thử sao chép và dán vào app banking');
        suggestions.push('Hoặc sử dụng link thanh toán thay thế');
    }

    return suggestions;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();