// services/walletService.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WalletBalance,
  WalletApiResponse,
} from "../types/wallet";

const API_BASE_URL =
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

class WalletService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const fullUrl = `${API_BASE_URL}${endpoint}`;

      // Get token from storage
      const token = await this.getAuthToken();
      
      console.log("🔐 Using token:", token ? `${token.substring(0, 20)}...` : 'null');

      const response = await fetch(fullUrl, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          ...options.headers,
        },
        ...options,
      });

      console.log(`📡 API Response Status: ${response.status} for ${endpoint}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `❌ Wallet API request failed for ${endpoint}:`,
          response.status,
          errorText
        );
        
        if (response.status === 401) {
          throw new Error(`Unauthorized: Token có thể đã hết hạn hoặc không hợp lệ`);
        }
        
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ API Response Data:`, result);
      return result;
    } catch (error) {
      console.error(`❌ Wallet API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get auth token from AsyncStorage (you might need to adjust the key)
  private async getAuthToken(): Promise<string | null> {
    try {
      // Common token storage keys - try different ones based on your auth implementation
      const possibleKeys = [
        'authToken',
        'accessToken', 
        'token',
        'jwt',
        'userToken',
        'auth_token',
        'access_token'
      ];

      for (const key of possibleKeys) {
        const token = await AsyncStorage.getItem(key);
        if (token) {
          console.log(`🔑 Found token with key: ${key}`);
          return token;
        }
      }

      // If no token found, log all keys for debugging
      console.log("🔍 No token found. Checking all AsyncStorage keys...");
      const allKeys = await AsyncStorage.getAllKeys();
      console.log("📋 All AsyncStorage keys:", allKeys);
      
      return null;
    } catch (error) {
      console.error("❌ Error getting auth token:", error);
      return null;
    }
  }

  // Debug method to manually set token for testing
  async setDebugToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('authToken', token);
      console.log("🐛 Debug token set successfully");
    } catch (error) {
      console.error("❌ Error setting debug token:", error);
    }
  }

  // Debug method to check current token
  async debugToken(): Promise<void> {
    try {
      const token = await this.getAuthToken();
      console.log("🔍 Current token:", token ? `${token.substring(0, 50)}...` : 'null');
      
      // Also check all keys
      const allKeys = await AsyncStorage.getAllKeys();
      console.log("📋 All AsyncStorage keys:", allKeys);
      
      // Check each key's value
      for (const key of allKeys) {
        const value = await AsyncStorage.getItem(key);
        console.log(`🔑 ${key}:`, value ? `${value.substring(0, 30)}...` : 'null');
      }
    } catch (error) {
      console.error("❌ Error debugging token:", error);
    }
  }

  // Alternative method if you use auth context
  private authContext: any = null;
  
  setAuthContext(authContext: any) {
    this.authContext = authContext;
    console.log("🔗 Auth context set for wallet service");
  }

  private async getAuthTokenFromContext(): Promise<string | null> {
    if (this.authContext && this.authContext.token) {
      console.log("🔑 Getting token from auth context");
      return this.authContext.token;
    }
    return null;
  }

  // Main method to get token (tries both storage and context)
  private async getToken(): Promise<string | null> {
    // Try auth context first
    let token = await this.getAuthTokenFromContext();
    if (token) return token;
    
    // Fallback to AsyncStorage
    token = await this.getAuthToken();
    return token;
  }

  // Get current user's wallet balance using token authentication
  async getWalletBalance(): Promise<WalletBalance> {
    try {
      const result = await this.makeRequest<WalletApiResponse>(
        `/api/Wallet/balance`,
        { method: "GET" }
      );

      console.log("💰 Wallet balance response:", result);

      if (result.error === 0 && result.data) {
        return result.data;
      } else {
        throw new Error(result.message || "Failed to fetch wallet balance");
      }
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi tải số dư ví"
      );
    }
  }

  // Format currency helper
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  }

  // Get balance color based on amount
  getBalanceColor(balance: number): string {
    if (balance <= 0) return '#F44336'; // Red
    if (balance < 100000) return '#FF9800'; // Orange
    return '#4CAF50'; // Green
  }
}

// Export singleton instance
export const walletService = new WalletService();
export default walletService;