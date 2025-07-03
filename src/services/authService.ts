import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL =  'https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net';

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

// API Client for React Native
class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
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
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async post(endpoint: string, data: any): Promise<any> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(errorData || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async put(endpoint: string, data: any): Promise<any> {
    const headers = await this.getHeaders();
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
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
    return apiClient.post(`${API_BASE_URL}/api/Auth/login`, credentials);
  }

  // Step 2: Register user
  static async registerUser(userData: CreateUserRequest): Promise<any> {
    return apiClient.post(`${API_BASE_URL}/api/User/create-user`, userData);
  }

  // Step 3: Assign role using existing API
  static async assignRole(userId: number, roleType: 'user' | 'photographer' | 'locationowner'): Promise<any> {
    const roleMap = {
      'user': [2],
      'photographer': [3],  
      'locationowner': [4]
    };

    const assignRolesRequest: AssignRolesRequest = {
      userId,
      roleIds: roleMap[roleType]
    };

    return apiClient.post(`${API_BASE_URL}/api/User/assign-roles`, assignRolesRequest);
  }

  // Step 4: Update user profile
  static async updateUserProfile(userId: number, profileData: {
    fullName?: string;
    phoneNumber?: string;
    bio?: string;
    profileImage?: string;
    gender?: string;
    ageRange?: string;
    interests?: string[];
  }): Promise<any> {
    return apiClient.put('/api/User/update', {
      userId,
      ...profileData
    });
  }

  // Get current user info
  static async getCurrentUser(userId: number): Promise<any> {
    return apiClient.get(`${API_BASE_URL}/api/User/${userId}`);
  }

  // Token management for React Native
  static async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('token');
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  static async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem('token', token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  }

  static async removeToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  static async logout(): Promise<void> {
    await this.removeToken();
  }

  static async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    return !!token;
  }
}