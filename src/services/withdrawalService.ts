import { apiClient } from '../services/base';
import {
  WithdrawalRequest,
  CreateWithdrawalRequest,
  UpdateWithdrawalRequest,
  ProcessWithdrawalRequest,
  CompleteWithdrawalRequest,
  RejectWithdrawalRequest,
  WithdrawalLimits,
  WithdrawalRequestsResponse,
  WithdrawalApiResponse,
  WITHDRAWAL_STATUS_CONFIG,
  WITHDRAWAL_VALIDATION
} from '../types/withdrawal';

class WithdrawalService {
  private baseUrl = '/api/WithdrawalRequest';

  // Helper method để build URL với query parameters
  private buildUrlWithParams(endpoint: string, params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return endpoint;
    }

    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        searchParams.append(key, value.toString());
      }
    });

    return `${endpoint}?${searchParams.toString()}`;
  }

  // User Operations
  
  /**
   * Create a new withdrawal request
   */
  async createWithdrawalRequest(data: CreateWithdrawalRequest): Promise<WithdrawalApiResponse<WithdrawalRequest>> {
    try {
      // Validate input
      this.validateCreateRequest(data);
      
      const response = await apiClient.post<WithdrawalApiResponse<WithdrawalRequest>>(
        this.baseUrl, 
        data
      );
      return response;
    } catch (error: any) {
      console.error('Error creating withdrawal request:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update withdrawal request (only for pending requests)
   */
  async updateWithdrawalRequest(
    withdrawalId: number, 
    data: UpdateWithdrawalRequest
  ): Promise<WithdrawalApiResponse<WithdrawalRequest>> {
    try {
      const response = await apiClient.put<WithdrawalApiResponse<WithdrawalRequest>>(
        `${this.baseUrl}/${withdrawalId}`, 
        data
      );
      return response;
    } catch (error: any) {
      console.error('Error updating withdrawal request:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Cancel withdrawal request
   */
  async cancelWithdrawalRequest(withdrawalId: number): Promise<WithdrawalApiResponse<boolean>> {
    try {
      const response = await apiClient.delete<WithdrawalApiResponse<boolean>>(
        `${this.baseUrl}/${withdrawalId}`
      );
      return response;
    } catch (error: any) {
      console.error('Error cancelling withdrawal request:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get user's withdrawal requests with pagination
   */
  async getUserWithdrawalRequests(
    page: number = 1, 
    pageSize: number = 10
  ): Promise<WithdrawalApiResponse<WithdrawalRequestsResponse>> {
    try {
      const url = this.buildUrlWithParams(`${this.baseUrl}/user`, { page, pageSize });
      const response = await apiClient.get<WithdrawalApiResponse<WithdrawalRequestsResponse>>(url);
      return response;
    } catch (error: any) {
      console.error('Error fetching user withdrawal requests:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get withdrawal limits for user
   */
  async getWithdrawalLimits(): Promise<WithdrawalApiResponse<WithdrawalLimits>> {
    try {
      const response = await apiClient.get<WithdrawalApiResponse<WithdrawalLimits>>(
        `${this.baseUrl}/limits`
      );
      return response;
    } catch (error: any) {
      console.error('Error fetching withdrawal limits:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get single withdrawal request details
   */
  async getWithdrawalRequest(withdrawalId: number): Promise<WithdrawalApiResponse<WithdrawalRequest>> {
    try {
      const response = await apiClient.get<WithdrawalApiResponse<WithdrawalRequest>>(
        `${this.baseUrl}/${withdrawalId}`
      );
      return response;
    } catch (error: any) {
      console.error('Error fetching withdrawal request:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get withdrawal request detail with moderator info
   */
  async getWithdrawalRequestDetail(withdrawalId: number): Promise<WithdrawalApiResponse<WithdrawalRequest>> {
    try {
      const response = await apiClient.get<WithdrawalApiResponse<WithdrawalRequest>>(
        `${this.baseUrl}/${withdrawalId}/detail`
      );
      return response;
    } catch (error: any) {
      console.error('Error fetching withdrawal request detail:', error);
      throw this.handleError(error);
    }
  }

  // Admin/Moderator Operations

  /**
   * Get all withdrawal requests (Admin/Moderator only)
   */
  async getAllWithdrawalRequests(
    page: number = 1,
    pageSize: number = 10,
    status?: string
  ): Promise<WithdrawalApiResponse<WithdrawalRequestsResponse>> {
    try {
      const params: any = { page, pageSize };
      if (status) params.status = status;

      const url = this.buildUrlWithParams(this.baseUrl, params);
      const response = await apiClient.get<WithdrawalApiResponse<WithdrawalRequestsResponse>>(url);
      return response;
    } catch (error: any) {
      console.error('Error fetching all withdrawal requests:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get withdrawal requests by status (Admin/Moderator only)
   */
  async getWithdrawalRequestsByStatus(
    status: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<WithdrawalApiResponse<WithdrawalRequestsResponse>> {
    try {
      const url = this.buildUrlWithParams(`${this.baseUrl}/status/${status}`, { page, pageSize });
      const response = await apiClient.get<WithdrawalApiResponse<WithdrawalRequestsResponse>>(url);
      return response;
    } catch (error: any) {
      console.error('Error fetching withdrawal requests by status:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Process withdrawal request (Admin/Moderator only)
   */
  async processWithdrawalRequest(
    withdrawalId: number,
    data: ProcessWithdrawalRequest
  ): Promise<WithdrawalApiResponse<WithdrawalRequest>> {
    try {
      const response = await apiClient.post<WithdrawalApiResponse<WithdrawalRequest>>(
        `${this.baseUrl}/${withdrawalId}/process`,
        data
      );
      return response;
    } catch (error: any) {
      console.error('Error processing withdrawal request:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Approve withdrawal request (Admin/Moderator only)
   */
  async approveWithdrawalRequest(withdrawalId: number): Promise<WithdrawalApiResponse<WithdrawalRequest>> {
    try {
      const response = await apiClient.post<WithdrawalApiResponse<WithdrawalRequest>>(
        `${this.baseUrl}/${withdrawalId}/approve`
      );
      return response;
    } catch (error: any) {
      console.error('Error approving withdrawal request:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Reject withdrawal request (Admin/Moderator only)
   */
  async rejectWithdrawalRequest(
    withdrawalId: number,
    data: RejectWithdrawalRequest
  ): Promise<WithdrawalApiResponse<WithdrawalRequest>> {
    try {
      const response = await apiClient.post<WithdrawalApiResponse<WithdrawalRequest>>(
        `${this.baseUrl}/${withdrawalId}/reject`,
        data
      );
      return response;
    } catch (error: any) {
      console.error('Error rejecting withdrawal request:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Complete withdrawal request (Admin/Moderator only)
   */
  async completeWithdrawalRequest(
    withdrawalId: number,
    data?: CompleteWithdrawalRequest
  ): Promise<WithdrawalApiResponse<WithdrawalRequest>> {
    try {
      const response = await apiClient.post<WithdrawalApiResponse<WithdrawalRequest>>(
        `${this.baseUrl}/${withdrawalId}/complete`,
        data || {}
      );
      return response;
    } catch (error: any) {
      console.error('Error completing withdrawal request:', error);
      throw this.handleError(error);
    }
  }

  // Utility Methods

  /**
   * Validate create withdrawal request data
   */
  private validateCreateRequest(data: CreateWithdrawalRequest): void {
    const { amount, bankAccountNumber, bankAccountName, bankName } = data;

    if (!amount || amount < WITHDRAWAL_VALIDATION.MIN_AMOUNT) {
      throw new Error(`Số tiền tối thiểu là ${this.formatCurrency(WITHDRAWAL_VALIDATION.MIN_AMOUNT)}`);
    }

    if (amount > WITHDRAWAL_VALIDATION.MAX_AMOUNT) {
      throw new Error(`Số tiền tối đa là ${this.formatCurrency(WITHDRAWAL_VALIDATION.MAX_AMOUNT)}`);
    }

    if (!bankAccountNumber || bankAccountNumber.trim().length === 0) {
      throw new Error('Số tài khoản ngân hàng là bắt buộc');
    }

    if (bankAccountNumber.length > WITHDRAWAL_VALIDATION.BANK_ACCOUNT_NUMBER_MAX_LENGTH) {
      throw new Error(`Số tài khoản không được quá ${WITHDRAWAL_VALIDATION.BANK_ACCOUNT_NUMBER_MAX_LENGTH} ký tự`);
    }

    if (!bankAccountName || bankAccountName.trim().length === 0) {
      throw new Error('Tên chủ tài khoản là bắt buộc');
    }

    if (bankAccountName.length > WITHDRAWAL_VALIDATION.BANK_ACCOUNT_NAME_MAX_LENGTH) {
      throw new Error(`Tên chủ tài khoản không được quá ${WITHDRAWAL_VALIDATION.BANK_ACCOUNT_NAME_MAX_LENGTH} ký tự`);
    }

    if (!bankName || bankName.trim().length === 0) {
      throw new Error('Tên ngân hàng là bắt buộc');
    }

    if (bankName.length > WITHDRAWAL_VALIDATION.BANK_NAME_MAX_LENGTH) {
      throw new Error(`Tên ngân hàng không được quá ${WITHDRAWAL_VALIDATION.BANK_NAME_MAX_LENGTH} ký tự`);
    }
  }

  /**
   * Get status configuration for display
   */
  getStatusConfig(status: string) {
    return WITHDRAWAL_STATUS_CONFIG[status as keyof typeof WITHDRAWAL_STATUS_CONFIG] || {
      color: '#6B7280',
      bgColor: '#F3F4F6',
      text: status,
      icon: 'help-circle-outline'
    };
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Check if withdrawal request can be edited
   */
  canEditRequest(status: string): boolean {
    return status === 'Pending';
  }

  /**
   * Check if withdrawal request can be cancelled
   */
  canCancelRequest(status: string): boolean {
    return status === 'Pending';
  }

  /**
   * Get formatted withdrawal request for display
   */
  formatWithdrawalRequestForDisplay(request: WithdrawalRequest) {
    const statusConfig = this.getStatusConfig(request.requestStatus);
    
    return {
      ...request,
      formattedAmount: this.formatCurrency(request.amount),
      formattedDate: this.formatDate(request.requestedAt),
      formattedProcessedDate: request.processedAt ? this.formatDate(request.processedAt) : null,
      statusColor: statusConfig.color,
      statusBgColor: statusConfig.bgColor,
      statusText: statusConfig.text,
      statusIcon: statusConfig.icon,
      canEdit: this.canEditRequest(request.requestStatus),
      canCancel: this.canCancelRequest(request.requestStatus),
      maskedAccountNumber: this.maskAccountNumber(request.bankAccountNumber)
    };
  }

  /**
   * Mask account number for security
   */
  private maskAccountNumber(accountNumber: string): string {
    if (accountNumber.length <= 4) return accountNumber;
    const firstTwo = accountNumber.substring(0, 2);
    const lastFour = accountNumber.substring(accountNumber.length - 4);
    const middle = '*'.repeat(accountNumber.length - 6);
    return `${firstTwo}${middle}${lastFour}`;
  }

  /**
   * Handle API errors consistently
   */
  private handleError(error: any): Error {
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    
    if (error.response?.status === 401) {
      return new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    
    if (error.response?.status === 403) {
      return new Error('Bạn không có quyền thực hiện thao tác này.');
    }
    
    if (error.response?.status === 404) {
      return new Error('Không tìm thấy yêu cầu rút tiền.');
    }
    
    if (error.response?.status >= 500) {
      return new Error('Lỗi server. Vui lòng thử lại sau.');
    }
    
    return new Error(error.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
  }
}

const withdrawalService = new WithdrawalService();
export default withdrawalService;