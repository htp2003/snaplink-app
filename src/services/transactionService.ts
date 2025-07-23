// services/transactionService.ts

import { 
  Transaction, 
  TransactionHistoryResponse,
  TransactionHistoryData,
  TransactionHistoryParams,
  TransferFundsRequest,
  WalletBalance,
  WalletBalanceResponse,
  DisplayTransaction
} from '../types/transaction';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api-base-url.com';

class TransactionService {
  private getAuthToken(): string {
    // Replace with your actual token management logic
    // This could come from AsyncStorage, SecureStore, or a context
    return 'YOUR_JWT_TOKEN';
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getAuthToken()}`,
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`API Error: ${response.status} - ${errorData}`);
    }

    return response.json();
  }

  // Get transaction history for photographer
  async getPhotographerTransactionHistory(params: TransactionHistoryParams): Promise<TransactionHistoryData> {
    const { photographerId, page = 1, pageSize = 10 } = params;
    const endpoint = `/api/Transaction/history/photographer/${photographerId}?page=${page}&pageSize=${pageSize}`;
    
    try {
      const response = await this.makeRequest<TransactionHistoryResponse>(endpoint);
      
      // Check if API call was successful
      if (response.error !== 0) {
        throw new Error(response.message || 'API returned error');
      }

      // Return the data part of response
      return response.data;
    } catch (error) {
      console.error('Error fetching photographer transaction history:', error);
      // Return empty result on error
      return {
        transactions: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }
  }

  // Get transaction history for user
  async getUserTransactionHistory(userId: number, page = 1, pageSize = 10): Promise<TransactionHistoryData> {
    const endpoint = `/api/Transaction/history/user/${userId}?page=${page}&pageSize=${pageSize}`;
    
    try {
      const response = await this.makeRequest<TransactionHistoryResponse>(endpoint);
      
      if (response.error !== 0) {
        throw new Error(response.message || 'API returned error');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching user transaction history:', error);
      return {
        transactions: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }
  }

  // Get transaction history for location owner
  async getLocationOwnerTransactionHistory(locationOwnerId: number, page = 1, pageSize = 10): Promise<TransactionHistoryData> {
    const endpoint = `/api/Transaction/history/location-owner/${locationOwnerId}?page=${page}&pageSize=${pageSize}`;
    
    try {
      const response = await this.makeRequest<TransactionHistoryResponse>(endpoint);
      
      if (response.error !== 0) {
        throw new Error(response.message || 'API returned error');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching location owner transaction history:', error);
      return {
        transactions: [],
        totalCount: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }
  }

  // Get specific transaction by ID
  async getTransactionById(transactionId: number): Promise<Transaction | null> {
    const endpoint = `/api/Transaction/${transactionId}`;
    
    try {
      const response = await this.makeRequest<any>(endpoint);
      
      if (response.error !== 0) {
        throw new Error(response.message || 'API returned error');
      }

      return response.data;
    } catch (error) {
      console.error('Error fetching transaction by ID:', error);
      return null;
    }
  }

  // Get wallet balance
  async getWalletBalance(userId: number): Promise<WalletBalance> {
    const endpoint = `/api/Wallet/balance/${userId}`;
    
    try {
      const response = await this.makeRequest<WalletBalanceResponse>(endpoint);
      
      if (response.error !== 0) {
        throw new Error(response.message || 'API returned error');
      }

      // Transform API response to match our WalletBalance interface
      return {
        availableBalance: response.data.balance || 0,
        pendingBalance: 0, // API doesn't provide this, set to 0
        totalBalance: response.data.balance || 0,
      };
    } catch (error) {
      console.error('Error fetching wallet balance:', error);
      return {
        availableBalance: 0,
        pendingBalance: 0,
        totalBalance: 0,
      };
    }
  }

  // Transfer funds between users
  async transferFunds(request: TransferFundsRequest): Promise<any> {
    const endpoint = '/api/Wallet/transfer';
    
    return this.makeRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Helper method to format transaction for display
  formatTransactionForDisplay(transaction: Transaction): {
    displayType: 'income' | 'withdrawal';
    formattedDate: string;
    formattedAmount: string;
    statusColor: string;
    statusBgColor: string;
    iconName: string;
    iconBgColor: string;
  } {
    const displayType = this.getDisplayType(transaction.type);
    const formattedDate = new Date(transaction.createdAt).toLocaleDateString('vi-VN');
    const formattedAmount = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(transaction.amount);

    const statusColors = this.getStatusColors(transaction.status);
    const iconInfo = this.getTransactionIcon(displayType, transaction.status);

    return {
      displayType,
      formattedDate,
      formattedAmount,
      statusColor: statusColors.statusColor,
      statusBgColor: statusColors.statusBgColor,
      iconName: iconInfo.iconName,
      iconBgColor: iconInfo.iconBgColor,
    };
  }

  // Convert API transaction to DisplayTransaction
  convertToDisplayTransaction(transaction: Transaction): DisplayTransaction {
    const formatInfo = this.formatTransactionForDisplay(transaction);
    
    return {
      ...transaction,
      // Map API fields to display fields
      id: transaction.transactionId,
      description: transaction.note || 'Giao dịch',
      transactionDate: transaction.createdAt,
      // Add display properties
      displayType: formatInfo.displayType,
      formattedDate: formatInfo.formattedDate,
      formattedAmount: formatInfo.formattedAmount,
      statusColor: formatInfo.statusColor,
      statusBgColor: formatInfo.statusBgColor,
      iconName: formatInfo.iconName,
      iconBgColor: formatInfo.iconBgColor,
      customerName: this.getCustomerName(transaction),
    };
  }

  private getDisplayType(transactionType: string): 'income' | 'withdrawal' {
    const incomeTypes = ['payment', 'bonus', 'refund', 'commission'];
    return incomeTypes.includes(transactionType.toLowerCase()) ? 'income' : 'withdrawal';
  }

  private getCustomerName(transaction: Transaction): string | undefined {
    // For withdrawal, show toUserName, for income show fromUserName
    const displayType = this.getDisplayType(transaction.type);
    if (displayType === 'income' && transaction.fromUserName) {
      return transaction.fromUserName;
    }
    if (displayType === 'withdrawal' && transaction.toUserName) {
      return transaction.toUserName;
    }
    return undefined;
  }

  private getStatusColors(status: string): {
    statusColor: string;
    statusBgColor: string;
  } {
    switch (status.toLowerCase()) {
      case 'success':
        return {
          statusColor: '#166534',
          statusBgColor: '#DCFCE7',
        };
      case 'pending':
        return {
          statusColor: '#92400E',
          statusBgColor: '#FEF3C7',
        };
      case 'failed':
      case 'cancelled':
        return {
          statusColor: '#991B1B',
          statusBgColor: '#FEE2E2',
        };
      default:
        return {
          statusColor: '#374151',
          statusBgColor: '#F3F4F6',
        };
    }
  }

  private getTransactionIcon(type: 'income' | 'withdrawal', status: string): {
    iconName: string;
    iconBgColor: string;
  } {
    if (status.toLowerCase() === 'pending') {
      return {
        iconName: 'time-outline',
        iconBgColor: '#FEF3C7',
      };
    }

    if (status.toLowerCase() === 'failed' || status.toLowerCase() === 'cancelled') {
      return {
        iconName: 'close-circle-outline',
        iconBgColor: '#FEE2E2',
      };
    }

    return type === 'income' 
      ? {
          iconName: 'arrow-down-outline',
          iconBgColor: '#DCFCE7',
        }
      : {
          iconName: 'arrow-up-outline',
          iconBgColor: '#FEE2E2',
        };
  }

  // Get status text in Vietnamese
  getStatusText(status: string): string {
    switch (status.toLowerCase()) {
      case 'success': return 'Hoàn thành';
      case 'pending': return 'Đang xử lý';
      case 'failed': return 'Thất bại';
      case 'cancelled': return 'Đã hủy';
      default: return 'Không xác định';
    }
  }
}

export default new TransactionService();