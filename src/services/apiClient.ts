// services/apiClient.ts - Updated for React Native
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor để thêm token
    this.instance.interceptors.request.use(
      async (config) => {
        try {
          // ✅ CHANGE: Use AsyncStorage instead of localStorage
          const token = await AsyncStorage.getItem('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('🔑 ApiClient - Token attached to request');
          } else {
            console.log('⚠️ ApiClient - No token found');
          }
        } catch (error) {
          console.error('❌ Error getting token from AsyncStorage:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor để handle errors
    this.instance.interceptors.response.use(
      (response) => {
        console.log('✅ ApiClient Response:', {
          status: response.status,
          url: response.config?.url
        });
        return response;
      },
      async (error) => {
        console.error('❌ ApiClient Error:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          url: error.config?.url
        });

        if (error.response?.status === 401) {
          // ✅ CHANGE: Use AsyncStorage for React Native
          console.log('🔐 Token expired - clearing storage');
          try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            await AsyncStorage.removeItem('currentUserId');
            
            // ✅ CHANGE: Don't redirect to web URL in React Native
            // Instead, you might want to use navigation or emit an event
            // For now, just log the error
            console.log('🚪 User needs to login again');
            
            // Optional: You can emit a custom event here for logout
            // EventEmitter.emit('logout');
          } catch (storageError) {
            console.error('❌ Error clearing AsyncStorage:', storageError);
          }
        }
        
        // Transform error message
        const message = error.response?.data?.message || 
                       error.response?.data?.error || 
                       error.message || 
                       'Có lỗi xảy ra';
        
        return Promise.reject(new Error(message));
      }
    );
  }

  // ✅ UPDATE: Return data directly instead of full axios response
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.get(url, config);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.post(url, data, config);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.put(url, data, config);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.patch(url, data, config);
    return response.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.instance.delete(url, config);
    return response.data;
  }

  // ✅ ADD: Helper method to check if user is authenticated
  async isAuthenticated(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('token');
      return !!token;
    } catch {
      return false;
    }
  }

  // ✅ ADD: Helper method to get current token
  async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('token');
    } catch {
      return null;
    }
  }

  // ✅ ADD: Method to set auth token programmatically
  async setAuthToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('token', token);
      console.log('✅ Auth token set in ApiClient');
    } catch (error) {
      console.error('❌ Error setting auth token:', error);
    }
  }

  // ✅ ADD: Method to clear auth token
  async clearAuthToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('token');
      console.log('✅ Auth token cleared from ApiClient');
    } catch (error) {
      console.error('❌ Error clearing auth token:', error);
    }
  }
}

export const apiClient = new ApiClient();