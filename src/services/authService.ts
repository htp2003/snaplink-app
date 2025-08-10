// authService.ts - Updated with forgot password endpoints
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL =
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

// Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateUserRequest {
  userName: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phoneNumber: string;
  profileImage?: string;
  bio?: string;
}

export interface AssignRolesRequest {
  userId: number;
  roleIds: number[];
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    roles: string[];
  };
}

// ✅ NEW: Forgot Password Types
export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyResetCodeRequest {
  email: string;
  code: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
  confirmNewPassword: string;
}

// API Client for React Native
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const token = await AuthService.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  async get(endpoint: string): Promise<any> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async post(endpoint: string, data?: any): Promise<any> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "POST",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || `HTTP ${response.status}`);
    }

    // Handle both JSON and text responses
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    } else {
      return response.text();
    }
  }

  async put(endpoint: string, data: any): Promise<any> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || `HTTP ${response.status}`);
    }

    return response.json();
  }
}

const apiClient = new ApiClient(API_BASE_URL);

// Auth Service for React Native
export class AuthService {
  // Step 1: Login
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    return apiClient.post(`/api/Auth/login`, credentials);
  }

  // ✅ NEW: Logout with API endpoint
  static async logout(): Promise<void> {
    try {
      // Call the logout endpoint
      await apiClient.post(`/api/Auth/Logout`);
    } catch (error) {
      console.error("❌ Logout API error:", error);
    } finally {
      // Always clear local storage regardless of API success/failure
      await this.clearLocalStorage();
    }
  }

  // ✅ NEW: Client-side logout (fallback)
  static async logoutLocal(): Promise<void> {
    await this.clearLocalStorage();
  }

  // ✅ NEW: Clear local storage helper
  private static async clearLocalStorage(): Promise<void> {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("currentUserId");
    } catch (error) {
      console.error("❌ Error clearing local storage:", error);
    }
  }

  // ✅ NEW: Forgot Password Flow - Step 1: Send Reset Code
  static async sendResetCode(email: string): Promise<{ message: string }> {
    try {
      console.log('🔄 Sending reset code to:', email);
      
      const requestBody: ForgotPasswordRequest = { email };
      const response = await apiClient.post(`/api/Auth/forgot-password/start`, requestBody);
      
      console.log('✅ Reset code sent successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Send reset code error:', error);
      throw error;
    }
  }

  // ✅ NEW: Forgot Password Flow - Step 2: Verify Reset Code
  static async verifyResetCode(email: string, code: string): Promise<{ message: string }> {
    try {
      console.log('🔄 Verifying reset code for:', email);
      
      const requestBody: VerifyResetCodeRequest = { email, code };
      const response = await apiClient.post(`/api/Auth/forgot-password/verify`, requestBody);
      
      console.log('✅ Reset code verified successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Verify reset code error:', error);
      throw error;
    }
  }

  // ✅ NEW: Forgot Password Flow - Step 3: Reset Password
  static async resetPassword(
    email: string, 
    code: string, 
    newPassword: string, 
    confirmNewPassword: string
  ): Promise<{ message: string }> {
    try {
      console.log('🔄 Resetting password for:', email);
      
      const requestBody: ResetPasswordRequest = {
        email,
        code,
        newPassword,
        confirmNewPassword
      };
      
      const response = await apiClient.post(`/api/Auth/forgot-password/reset`, requestBody);
      
      console.log('✅ Password reset successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Reset password error:', error);
      throw error;
    }
  }

  // Step 2: Register user
  static async registerUser(userData: CreateUserRequest): Promise<any> {
    return apiClient.post(`/api/User/create-user`, userData);
  }

  // ✅ REMOVED: assignRole - now handled directly in Step1 component
  // Role assignment is now done directly using assign-roles API with correct roleIds

  // Step 4: Update user profile
  static async updateUserProfile(
    userId: number,
    profileData: {
      fullName?: string;
      phoneNumber?: string;
      bio?: string;
      profileImage?: string;
      gender?: string;
      ageRange?: string;
      interests?: string[];
    }
  ): Promise<any> {
    return apiClient.put("/api/User/update", {
      userId,
      ...profileData,
    });
  }

  // Get current user info
  static async getCurrentUser(userId: number): Promise<any> {
    return apiClient.get(`/api/User/${userId}`);
  }

  // Token management for React Native
  static async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem("token");
    } catch (error) {
      console.error("Error getting token:", error);
      return null;
    }
  }

  static async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem("token", token);
    } catch (error) {
      console.error("Error setting token:", error);
    }
  }

  static async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("currentUserId");
    } catch (error) {
      console.error("Error removing token:", error);
    }
  }

  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }
}