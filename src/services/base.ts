// services/api/base.ts

import { API_CONFIG } from "../config/api";

export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.timeout = API_CONFIG.TIMEOUT;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    console.log(`API Response [${response.status}]: ${response.url}`);
    
    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `HTTP error! status: ${response.status} ${response.statusText}`;
      
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      } catch (e) {
        // If we can't read the error response, use the default message
      }
      
      console.error(`API Error [${response.status}]:`, errorMessage);
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    
    // Handle empty responses (like successful DELETE or PUT requests)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      console.log('Empty response - returning empty object');
      return {} as T;
    }

    // Try to parse JSON, but handle non-JSON responses gracefully
    try {
      const text = await response.text();
      
      // If response is empty, return empty object
      if (!text || text.trim() === '') {
        console.log('Empty response body - returning empty object');
        return {} as T;
      }
      
      // Check if response is actually JSON
      if (contentType && contentType.includes('application/json')) {
        const data = JSON.parse(text);
        console.log(`API Response Data:`, data);
        return data;
      } else {
        console.warn('Response is not JSON, Content-Type:', contentType);
        console.warn('Response text:', text);
        
        // If it's a successful response but not JSON, return empty object
        // This handles cases where server returns success but with wrong content-type
        return {} as T;
      }
    } catch (error) {
      console.error('JSON Parse Error:', error);
      
      // If JSON parsing fails but response was successful, 
      // it might be a server that returns success but with invalid JSON
      // In this case, treat it as a successful operation
      if (response.ok) {
        console.log('Response was successful but JSON parsing failed - treating as success');
        return {} as T;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown JSON parse error';
      throw new Error(`JSON Parse Error: ${errorMessage}`);
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    console.log(`API Request: ${options.method || 'GET'} ${url}`);
    
    try {
      const response = await fetch(url, config);
      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error('API request failed:', error);
      
      // Handle different error types
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`API request failed: ${String(error)}`);
      }
    }
  }

  // Helper methods for common HTTP verbs
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();