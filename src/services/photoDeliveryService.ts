// services/photoDeliveryService.ts

import {
  PhotoDeliveryData,
  CreatePhotoDeliveryRequest,
  UpdatePhotoDeliveryRequest,
  PhotoDeliveryApiResponse,
  PhotoDeliveryListApiResponse,
  BooleanApiResponse,
} from "../types/photoDelivery";

const API_BASE_URL =
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

class PhotoDeliveryService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const fullUrl = `${API_BASE_URL}${endpoint}`;

      const response = await fetch(fullUrl, {
        headers: {
          "Content-Type": "application/json",
          // Add authorization header if needed
          // 'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `API request failed for ${endpoint}:`,
          response.status,
          errorText
        );
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      return result;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Get photo deliveries by photographer
  async getPhotoDeliveriesByPhotographer(
    photographerId: number
  ): Promise<PhotoDeliveryData[]> {
    try {
      const result = await this.makeRequest<PhotoDeliveryListApiResponse>(
        `/api/PhotoDelivery/photographer/${photographerId}`,
        { method: "GET" }
      );

      // Handle both new API format and direct array response
      if (result.error === 0) {
        return result.data || []; // ✅ Return empty array if data is null/undefined
      } else if (Array.isArray(result)) {
        return result; // ✅ Handle direct array response
      } else {
        // Not an error if empty, just return empty array

        return [];
      }
    } catch (error) {
      console.error("PhotoDelivery API error:", error);
      // Don't throw error for 404 or empty results, return empty array
      if (error instanceof Error && error.message.includes("404")) {
        return [];
      }
      throw new Error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi tải danh sách giao hàng ảnh"
      );
    }
  }

  // Get photo delivery by booking ID
  async getPhotoDeliveryByBooking(
    bookingId: number
  ): Promise<PhotoDeliveryData | null> {
    try {
      const result = await this.makeRequest<PhotoDeliveryApiResponse>(
        `/api/PhotoDelivery/booking/${bookingId}`,
        { method: "GET" }
      );

      if (result.error === 0 && result.data) {
        return result.data;
      }

      return null;
    } catch (error) {
      // Return null if not found (404) - this is expected for bookings without photo delivery
      if (error instanceof Error && error.message.includes("404")) {
        return null;
      }
      console.error("Error fetching photo delivery by booking:", error);
      return null;
    }
  }

  // Get photo delivery by ID
  async getPhotoDeliveryById(
    photoDeliveryId: number
  ): Promise<PhotoDeliveryData | null> {
    try {
      const result = await this.makeRequest<PhotoDeliveryApiResponse>(
        `/api/PhotoDelivery/${photoDeliveryId}`,
        { method: "GET" }
      );

      if (result.error === 0 && result.data) {
        return result.data;
      }

      return null;
    } catch (error) {
      console.error("Error fetching photo delivery by ID:", error);
      return null;
    }
  }

  // Get photo deliveries by customer
  async getPhotoDeliveriesByCustomer(
    customerId: number
  ): Promise<PhotoDeliveryData[]> {
    try {
      const result = await this.makeRequest<PhotoDeliveryListApiResponse>(
        `/api/PhotoDelivery/customer/${customerId}`,
        { method: "GET" }
      );

      if (result.error === 0 && result.data) {
        return result.data;
      } else {
        throw new Error(result.message || "Failed to fetch photo deliveries");
      }
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi tải danh sách giao hàng ảnh"
      );
    }
  }

  // Get photo deliveries by status
  async getPhotoDeliveriesByStatus(
    status: string
  ): Promise<PhotoDeliveryData[]> {
    try {
      const result = await this.makeRequest<PhotoDeliveryListApiResponse>(
        `/api/PhotoDelivery/status/${status}`,
        { method: "GET" }
      );

      if (result.error === 0 && result.data) {
        return result.data;
      } else {
        throw new Error(result.message || "Failed to fetch photo deliveries");
      }
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi tải danh sách giao hàng ảnh"
      );
    }
  }

  // Get pending photo deliveries
  async getPendingPhotoDeliveries(): Promise<PhotoDeliveryData[]> {
    try {
      const result = await this.makeRequest<PhotoDeliveryListApiResponse>(
        `/api/PhotoDelivery/pending`,
        { method: "GET" }
      );

      if (result.error === 0 && result.data) {
        return result.data;
      } else {
        throw new Error(
          result.message || "Failed to fetch pending photo deliveries"
        );
      }
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi tải danh sách giao hàng ảnh chờ xử lý"
      );
    }
  }

  // Get expired photo deliveries
  async getExpiredPhotoDeliveries(): Promise<PhotoDeliveryData[]> {
    try {
      const result = await this.makeRequest<PhotoDeliveryListApiResponse>(
        `/api/PhotoDelivery/expired`,
        { method: "GET" }
      );

      if (result.error === 0 && result.data) {
        return result.data;
      } else {
        throw new Error(
          result.message || "Failed to fetch expired photo deliveries"
        );
      }
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi tải danh sách giao hàng ảnh hết hạn"
      );
    }
  }

  // Create photo delivery
  async createPhotoDelivery(
    request: CreatePhotoDeliveryRequest
  ): Promise<PhotoDeliveryData> {
    try {
      // Ensure all fields are present, even if null/undefined
      const fullRequest = {
        bookingId: request.bookingId,
        deliveryMethod: request.deliveryMethod,
        driveLink: request.driveLink || null,
        driveFolderName: request.driveFolderName || null,
        photoCount: request.photoCount || null,
        notes: request.notes || null,
      };

      const result = await this.makeRequest<PhotoDeliveryApiResponse>(
        `/api/PhotoDelivery`,
        {
          method: "POST",
          body: JSON.stringify(fullRequest),
        }
      );

      if (result.error === 0 && result.data) {
        return result.data;
      } else {
        throw new Error(result.message || "Failed to create photo delivery");
      }
    } catch (error) {
      console.error("❌ Create photo delivery error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi tạo giao hàng ảnh"
      );
    }
  }

  // Update photo delivery
  async updatePhotoDelivery(
    photoDeliveryId: number,
    request: UpdatePhotoDeliveryRequest
  ): Promise<PhotoDeliveryData> {
    try {
      const result = await this.makeRequest<PhotoDeliveryApiResponse>(
        `/api/PhotoDelivery/${photoDeliveryId}`,
        {
          method: "PUT",
          body: JSON.stringify(request),
        }
      );

      if (result.error === 0 && result.data) {
        return result.data;
      } else {
        throw new Error(result.message || "Failed to update photo delivery");
      }
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi cập nhật giao hàng ảnh"
      );
    }
  }

  // Delete photo delivery
  async deletePhotoDelivery(photoDeliveryId: number): Promise<boolean> {
    try {
      const result = await this.makeRequest<BooleanApiResponse>(
        `/api/PhotoDelivery/${photoDeliveryId}`,
        { method: "DELETE" }
      );

      if (result.error === 0) {
        return result.data;
      } else {
        throw new Error(result.message || "Failed to delete photo delivery");
      }
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi xóa giao hàng ảnh"
      );
    }
  }
}

// Export singleton instance
export const photoDeliveryService = new PhotoDeliveryService();
export default photoDeliveryService;
