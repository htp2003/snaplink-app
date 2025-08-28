import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CreateComplaintRequest {
  reportedUserId: number;
  bookingId?: number;
  complaintType: string;
  description: string;
}

export interface ComplaintResponse {
  complaintId: number;
  reporterId: number;
  reporterName?: string;
  reporterEmail?: string;
  reportedUserId: number;
  reportedUserName?: string;
  reportedUserEmail?: string;
  bookingId?: number;
  complaintType: string;
  description: string;
  status: string;
  assignedModeratorId?: number;
  assignedModeratorName?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ComplaintAgainstMeResponse {
  complaintId: number;
  reporterId: number;
  reporterName: string;
  reporterEmail: string;
  reportedUserId: number;
  reportedUserName: string;
  reportedUserEmail: string;
  bookingId: number;
  complaintType: string;
  description: string;
  status: "Pending" | "InProgress" | "Resolved";
  assignedModeratorId: number | null;
  assignedModeratorName: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintListResponse {
  complaints: ComplaintAgainstMeResponse[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const API_BASE_URL = "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

class ComplaintService {
  // 🔍 DEBUG: Enhanced getAuthToken with multiple possible keys
  private async getAuthToken(): Promise<string | null> {
    try {
      // 🔍 Try different possible token keys
      const possibleKeys = ['authToken', 'token', 'access_token', 'jwt_token', 'user_token'];
      
      for (const key of possibleKeys) {
        const token = await AsyncStorage.getItem(key);
        if (token) {
          console.log(`🔑 Found token with key: ${key}`);
          console.log(`🔑 Token preview: ${token.substring(0, 20)}...`);
          return token;
        }
      }
      console.log('❌ No auth token found in AsyncStorage');
      return null;
    } catch (error) {
      console.error('❌ Error getting auth token:', error);
      return null;
    }
  }
  async getComplaintsAgainstMe(page: number = 1, pageSize: number = 10): Promise<ComplaintListResponse> {
  try {
    console.log(`📋 Fetching complaints against me - Page: ${page}`);
    
    const result = await this.makeRequest<ComplaintListResponse>(
      `/api/Complaint/against-me?page=${page}&pageSize=${pageSize}`
    );

    console.log(`✅ Got ${result.complaints.length} complaints`);
    return result;
  } catch (error) {
    console.error('❌ Error fetching complaints against me:', error);
    throw error;
  }
}

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const fullUrl = `${API_BASE_URL}${endpoint}`;
      
      // 🔍 DEBUG: Get and log auth token
      const token = await this.getAuthToken();
      console.log(`🌐 Making request to: ${endpoint}`);
      console.log(`🔑 Token available: ${!!token}`);

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...options.headers as Record<string, string>,
      };

      // 🔍 Try different auth header formats
      if (token) {
        // Try both Bearer and direct token
        headers.Authorization = `Bearer ${token}`;
        console.log(`🔑 Using Bearer token: Bearer ${token.substring(0, 20)}...`);
      }

      const response = await fetch(fullUrl, {
        ...options,
        headers,
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API request failed for ${endpoint}:`, response.status, errorText);
        
        // 🔍 Log headers for debugging
        console.log(`🔍 Request headers:`, headers);
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Request successful for ${endpoint}`);
      return result;
    } catch (error) {
      console.error(`💥 API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Create complaint with enhanced debugging
  async createComplaint(request: CreateComplaintRequest): Promise<ComplaintResponse> {
    try {
      console.log('📝 Creating complaint with data:', {
        reportedUserId: request.reportedUserId,
        bookingId: request.bookingId,
        complaintType: request.complaintType,
        descriptionLength: request.description.length
      });

      const result = await this.makeRequest<ComplaintResponse>(
        `/api/Complaint`,
        {
          method: "POST",
          body: JSON.stringify(request),
        }
      );

      console.log('✅ Complaint created successfully:', result.complaintId);
      return result;
    } catch (error) {
      console.error('❌ Error creating complaint:', error);
      
      // 🆕 ENHANCED: Better error handling for business logic errors
      if (error instanceof Error && error.message.includes('400')) {
        // Try to get more specific error from response
        if (error.message.includes('cannot file complaint against this user')) {
          throw new Error('Không thể khiếu nại người dùng này cho đơn hàng này. Có thể do:\n• Bạn không phải chủ đơn hàng\n• Người được báo cáo không liên quan đến đơn hàng\n• Đơn hàng chưa hoàn thành');
        } else if (error.message.includes('User cannot file complaint')) {
          throw new Error('Bạn không có quyền khiếu nại đơn hàng này');
        } else {
          throw new Error('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin đơn hàng');
        }
      } else if (error instanceof Error && error.message.includes('401')) {
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để gửi khiếu nại.');
      }
      
      throw new Error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi gửi khiếu nại"
      );
    }
  }

  async getComplaintByBooking(bookingId: number): Promise<ComplaintResponse | null> {
    try {
      const result = await this.makeRequest<ComplaintResponse>(
        `/api/Complaint/by-booking/${bookingId}`
      );
      return result;
    } catch (error) {
      // 404 = không có complaint
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  // 🆕 UPDATED: Simplified - no API call for types to avoid auth issues
  getComplaintTypesStatic(): string[] {
    return [
      "Photographer không chuyên nghiệp",
      "Chất lượng ảnh không đạt yêu cầu", 
      "Không giao ảnh đúng hạn",
      "Ảnh không đúng như thỏa thuận",
      "Link ảnh bị lỗi hoặc không truy cập được",
      "Thái độ phục vụ không tốt",
      "Photographer đến muộn hoặc không đến",
      "Không tuân thủ yêu cầu đặc biệt",
      "Giá cả không minh bạch",
      "Thiết bị chụp ảnh có vấn đề",
      "Không liên lạc được với photographer",
      "Vi phạm quy định an toàn",
      "Khác"
    ];
  }
}

export const complaintService = new ComplaintService();
export default complaintService;