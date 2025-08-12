import { apiClient } from "./base";
import {
  CreateAvailabilityRequest,
  UpdateAvailabilityRequest,
  BulkAvailabilityRequest,
  CheckAvailabilityRequest,
  AvailabilityResponse,
  AvailabilityDetailResponse,
  AvailabilityListResponse,
  AvailablePhotographersResponse,
  CheckAvailabilityResponse,
  GetAvailablePhotographersParams,
  DayOfWeek,
  WeeklySchedule,
  DaySchedule,
  TimeSlot,
  AvailabilityStats,
} from "../types/availability";

const AVAILABILITY_ENDPOINTS = {
  // CRUD operations
  CREATE: "/api/Availability",
  BULK_CREATE: "/api/Availability/bulk",
  GET_BY_ID: (availabilityId: number) => `/api/Availability/${availabilityId}`,
  UPDATE: (availabilityId: number) => `/api/Availability/${availabilityId}`,
  DELETE: (availabilityId: number) => `/api/Availability/${availabilityId}`,
  UPDATE_STATUS: (availabilityId: number) =>
    `/api/Availability/${availabilityId}/status`,

  // Photographer-specific
  GET_BY_PHOTOGRAPHER: (photographerId: number) =>
    `/api/Availability/photographer/${photographerId}`,
  GET_PHOTOGRAPHER_DETAILS: (photographerId: number) =>
    `/api/Availability/photographer/${photographerId}/details`,
  DELETE_ALL_PHOTOGRAPHER: (photographerId: number) =>
    `/api/Availability/photographer/${photographerId}`,

  // Day-specific
  GET_BY_DAY: (dayOfWeek: DayOfWeek) => `/api/Availability/day/${dayOfWeek}`,

  // Search & filters
  GET_AVAILABLE_PHOTOGRAPHERS: "/api/Availability/available-photographers",
  CHECK_AVAILABILITY: "/api/Availability/check",
};

export class AvailabilityService {
  // ===== CRUD OPERATIONS =====

  async createAvailability(
    data: CreateAvailabilityRequest
  ): Promise<AvailabilityResponse> {
    try {
      const response = await apiClient.post<any>(
        AVAILABILITY_ENDPOINTS.CREATE,
        data
      );

      // Handle different response structures
      const availabilityData = response.data || response;

      const normalizedResponse: AvailabilityResponse = {
        availabilityId: availabilityData.availabilityId || availabilityData.id,
        id: availabilityData.id || availabilityData.availabilityId,
        photographerId: availabilityData.photographerId || data.photographerId,
        dayOfWeek: availabilityData.dayOfWeek ?? data.dayOfWeek,
        startTime: availabilityData.startTime || data.startTime,
        endTime: availabilityData.endTime || data.endTime,
        status: availabilityData.status || data.status || "available",
        createdAt: availabilityData.createdAt,
        updatedAt: availabilityData.updatedAt,
      };

      return normalizedResponse;
    } catch (error) {
      console.error("❌ Error creating availability:", error);
      throw error;
    }
  }

  async createBulkAvailability(
    data: BulkAvailabilityRequest
  ): Promise<AvailabilityResponse[]> {
    try {
      const response = await apiClient.post<any>(
        AVAILABILITY_ENDPOINTS.BULK_CREATE,
        data
      );

      // Handle array response
      const availabilitiesData = response.data || response;

      if (!Array.isArray(availabilitiesData)) {
        console.warn("⚠️ Expected array response for bulk creation");
        return [];
      }

      const normalizedResponse = availabilitiesData.map((item: any) => ({
        availabilityId: item.availabilityId || item.id,
        id: item.id || item.availabilityId,
        photographerId: item.photographerId || data.photographerId,
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
        status: item.status || "available",
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      return normalizedResponse;
    } catch (error) {
      console.error("❌ Error creating bulk availability:", error);
      throw error;
    }
  }

  async getAvailabilityById(
    availabilityId: number
  ): Promise<AvailabilityResponse> {
    try {
      const response = await apiClient.get<any>(
        AVAILABILITY_ENDPOINTS.GET_BY_ID(availabilityId)
      );

      const availabilityData = response.data || response;

      const normalizedResponse: AvailabilityResponse = {
        availabilityId:
          availabilityData.availabilityId ||
          availabilityData.id ||
          availabilityId,
        id:
          availabilityData.id ||
          availabilityData.availabilityId ||
          availabilityId,
        photographerId: availabilityData.photographerId,
        dayOfWeek: availabilityData.dayOfWeek,
        startTime: availabilityData.startTime,
        endTime: availabilityData.endTime,
        status: availabilityData.status,
        createdAt: availabilityData.createdAt,
        updatedAt: availabilityData.updatedAt,
      };

      return normalizedResponse;
    } catch (error) {
      console.error("❌ Error fetching availability:", error);
      throw error;
    }
  }

  async updateAvailability(
    availabilityId: number,
    data: UpdateAvailabilityRequest
  ): Promise<AvailabilityResponse> {
    try {
      const response = await apiClient.put<any>(
        AVAILABILITY_ENDPOINTS.UPDATE(availabilityId),
        data
      );

      const availabilityData = response.data || response;

      const normalizedResponse: AvailabilityResponse = {
        availabilityId:
          availabilityData.availabilityId ||
          availabilityData.id ||
          availabilityId,
        id:
          availabilityData.id ||
          availabilityData.availabilityId ||
          availabilityId,
        photographerId: availabilityData.photographerId,
        dayOfWeek: availabilityData.dayOfWeek,
        startTime: availabilityData.startTime,
        endTime: availabilityData.endTime,
        status: availabilityData.status,
        createdAt: availabilityData.createdAt,
        updatedAt: availabilityData.updatedAt,
      };

      return normalizedResponse;
    } catch (error) {
      console.error("❌ Error updating availability:", error);
      throw error;
    }
  }

  async deleteAvailability(availabilityId: number): Promise<void> {
    try {
      await apiClient.delete<void>(
        AVAILABILITY_ENDPOINTS.DELETE(availabilityId)
      );
    } catch (error) {
      console.error("❌ Error deleting availability:", error);
      throw error;
    }
  }

  async updateAvailabilityStatus(
    availabilityId: number,
    status: string
  ): Promise<void> {
    try {
      await apiClient.patch<void>(
        AVAILABILITY_ENDPOINTS.UPDATE_STATUS(availabilityId),
        status
      );
    } catch (error) {
      console.error("❌ Error updating availability status:", error);
      throw error;
    }
  }

  // ===== PHOTOGRAPHER-SPECIFIC METHODS =====

  async getPhotographerAvailability(
    photographerId: number
  ): Promise<AvailabilityResponse[]> {
    try {
      const response = await apiClient.get<any>(
        AVAILABILITY_ENDPOINTS.GET_BY_PHOTOGRAPHER(photographerId)
      );

      const availabilitiesData = response.data || response;

      if (!Array.isArray(availabilitiesData)) {
        console.warn(
          "⚠️ Expected array response for photographer availability"
        );
        return [];
      }

      const normalizedResponse = availabilitiesData.map((item: any) => ({
        availabilityId: item.availabilityId || item.id,
        id: item.id || item.availabilityId,
        photographerId: item.photographerId || photographerId,
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      return normalizedResponse;
    } catch (error) {
      console.error("❌ Error fetching photographer availability:", error);
      throw error;
    }
  }

  async getPhotographerAvailabilityDetails(
    photographerId: number
  ): Promise<AvailabilityDetailResponse[]> {
    try {
      const response = await apiClient.get<any>(
        AVAILABILITY_ENDPOINTS.GET_PHOTOGRAPHER_DETAILS(photographerId)
      );

      const availabilitiesData = response.data || response;

      if (!Array.isArray(availabilitiesData)) {
        console.warn(
          "⚠️ Expected array response for photographer availability details"
        );
        return [];
      }

      const normalizedResponse = availabilitiesData.map((item: any) => ({
        availabilityId: item.availabilityId || item.id,
        id: item.id || item.availabilityId,
        photographerId: item.photographerId || photographerId,
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        photographer: item.photographer
          ? {
              photographerId:
                item.photographer.photographerId || item.photographerId,
              fullName: item.photographer.fullName || item.photographer.name,
              profileImage: item.photographer.profileImage,
              hourlyRate: item.photographer.hourlyRate,
            }
          : undefined,
      }));

      return normalizedResponse;
    } catch (error) {
      console.error(
        "❌ Error fetching photographer availability details:",
        error
      );
      throw error;
    }
  }

  async deleteAllPhotographerAvailability(
    photographerId: number
  ): Promise<void> {
    try {
      await apiClient.delete<void>(
        AVAILABILITY_ENDPOINTS.DELETE_ALL_PHOTOGRAPHER(photographerId)
      );
    } catch (error) {
      console.error("❌ Error deleting all photographer availability:", error);
      throw error;
    }
  }

  // ===== DAY-SPECIFIC METHODS =====

  async getAvailabilityByDay(
    dayOfWeek: DayOfWeek
  ): Promise<AvailabilityResponse[]> {
    try {
      const response = await apiClient.get<any>(
        AVAILABILITY_ENDPOINTS.GET_BY_DAY(dayOfWeek)
      );

      const availabilitiesData = response.data || response;

      if (!Array.isArray(availabilitiesData)) {
        console.warn("⚠️ Expected array response for day availability");
        return [];
      }

      const normalizedResponse = availabilitiesData.map((item: any) => ({
        availabilityId: item.availabilityId || item.id,
        id: item.id || item.availabilityId,
        photographerId: item.photographerId,
        dayOfWeek: item.dayOfWeek ?? dayOfWeek,
        startTime: item.startTime,
        endTime: item.endTime,
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));

      return normalizedResponse;
    } catch (error) {
      console.error("❌ Error fetching day availability:", error);
      throw error;
    }
  }

  // ===== SEARCH & FILTER METHODS =====

  async getAvailablePhotographers(
    params: GetAvailablePhotographersParams
  ): Promise<AvailablePhotographersResponse> {
    try {
      const queryParams = new URLSearchParams({
        dayOfWeek: params.dayOfWeek.toString(),
        startTime: params.startTime,
        endTime: params.endTime,
      });

      const response = await apiClient.get<any>(
        `${AVAILABILITY_ENDPOINTS.GET_AVAILABLE_PHOTOGRAPHERS}?${queryParams}`
      );

      const photographersData = response.data || response;

      if (!Array.isArray(photographersData)) {
        console.warn("⚠️ Expected array response for available photographers");
        return { photographers: [] };
      }

      const normalizedResponse: AvailablePhotographersResponse = {
        photographers: photographersData.map((item: any) => ({
          photographerId: item.photographerId || item.id,
          fullName: item.fullName || item.name,
          profileImage: item.profileImage,
          hourlyRate: item.hourlyRate || 0,
          rating: item.rating,
          availableSlots: item.availableSlots || [],
        })),
      };

      return normalizedResponse;
    } catch (error) {
      console.error("❌ Error searching available photographers:", error);
      return { photographers: [] };
    }
  }

// Sửa lại availabilityService.checkAvailability để handle nhiều format response:

async checkAvailability(
  data: CheckAvailabilityRequest
): Promise<CheckAvailabilityResponse> {
  try {
    console.log("🔍 Checking availability with data:", data);
    
    const response = await apiClient.post<any>(
      AVAILABILITY_ENDPOINTS.CHECK_AVAILABILITY,
      data
    );

    console.log("🔍 Full API response:", response);
    
    const responseData = response.data || response;
    
    console.log("🔍 Response data structure:", {
      keys: Object.keys(responseData),
      values: responseData,
      type: typeof responseData,
    });

    // ✅ TRY MULTIPLE POSSIBLE RESPONSE FORMATS:
    let available = false;
    let message = "";
    let conflictingBookings: any[] = [];
    let suggestedTimes: any[] = [];

    // Format 1: { isAvailable: boolean }
    if (typeof responseData.isAvailable === "boolean") {
      available = responseData.isAvailable;
      console.log("🔍 Using format 1: isAvailable =", available);
    }
    // Format 2: { available: boolean }
    else if (typeof responseData.available === "boolean") {
      available = responseData.available;
      console.log("🔍 Using format 2: available =", available);
    }
    // Format 3: { success: boolean }
    else if (typeof responseData.success === "boolean") {
      available = responseData.success;
      console.log("🔍 Using format 3: success =", available);
    }
    // Format 4: { error: 0 } (success), { error: 1 } (failure)
    else if (typeof responseData.error === "number") {
      available = responseData.error === 0;
      console.log("🔍 Using format 4: error =", responseData.error, "-> available =", available);
    }
    // Format 5: Status code based
    else if (response.status && response.status >= 200 && response.status < 300) {
      available = true;
      console.log("🔍 Using format 5: HTTP status =", response.status, "-> available = true");
    }
    else {
      console.warn("🔍 Unknown response format, defaulting to false");
      available = false;
    }

    // Extract message
    message = responseData.message || responseData.msg || responseData.description || "";

    // Extract conflicting bookings
    conflictingBookings = responseData.conflictingAvailabilities || 
                         responseData.conflictingBookings || 
                         responseData.conflicts || 
                         [];

    // Extract suggested times  
    suggestedTimes = responseData.suggestedTimes || 
                    responseData.suggestions || 
                    responseData.alternativeTimes || 
                    [];

    const normalizedResponse: CheckAvailabilityResponse = {
      available,
      conflictingBookings,
      suggestedTimes,
      message,
    };

    console.log("🔍 Final normalized response:", normalizedResponse);

    return normalizedResponse;
  } catch (error) {
    console.error("❌ Error checking availability:", error);
    
    // ✅ CHECK IF IT'S A NETWORK ERROR OR API ERROR
    if ((error as any).response) {
      console.error("❌ API Error Response:", (error as any).response.data);
      console.error("❌ API Error Status:", (error as any).response.status);
    } else if ((error as any).request) {
      console.error("❌ Network Error:", (error as any).request);
    }
    
    return {
      available: false,
      message: `Lỗi kiểm tra: ${(error as any).message || "Không thể kết nối API"}`,
    };
  }
}

// ✅ THÊM: Fallback availability check
async checkAvailabilityFallback(
  photographerId: number,
  startTime: string,
  endTime: string
): Promise<CheckAvailabilityResponse> {
  try {
    console.log("🔄 Fallback: Checking photographer schedule manually");

    // Get photographer's weekly schedule
    const schedule = await this.getPhotographerAvailability(photographerId);
    console.log("🔄 Photographer schedule:", schedule);

    if (schedule.length === 0) {
      return {
        available: false,
        message: "Photographer chưa thiết lập lịch làm việc",
      };
    }

    // Extract day and time from the request
    const startDate = new Date(startTime);
    const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const requestStartTime = startDate.toTimeString().substring(0, 8); // "HH:MM:SS"
    const requestEndTime = new Date(endTime).toTimeString().substring(0, 8);

    console.log("🔄 Checking for:", {
      dayOfWeek,
      requestStartTime,
      requestEndTime,
    });

    // Find availability for this day
    const dayAvailability = schedule.filter(slot =>
      slot.dayOfWeek === dayOfWeek &&
      slot.status === "Available"
    );

    console.log("🔄 Day availability:", dayAvailability);

    if (dayAvailability.length === 0) {
      return {
        available: false,
        message: "Photographer không làm việc vào ngày này",
      };
    }

    // Check if requested time falls within any available slot
    const isWithinSchedule = dayAvailability.some(slot => {
      const slotStart = slot.startTime;
      const slotEnd = slot.endTime;

      const isWithin = requestStartTime >= slotStart && requestEndTime <= slotEnd;
      console.log("🔄 Checking slot:", { slotStart, slotEnd, requestStartTime, requestEndTime, isWithin });

      return isWithin;
    });

    return {
      available: isWithinSchedule,
      message: isWithinSchedule ? "Trong khung giờ làm việc" : "Ngoài khung giờ làm việc",
    };

  } catch (error) {
    console.error("❌ Fallback check failed:", error);
    return {
      available: false,
      message: "Không thể kiểm tra lịch",
    };
  }
}

  // ===== UTILITY METHODS =====

  async getWeeklySchedule(photographerId: number): Promise<WeeklySchedule> {
    try {
      const availabilities = await this.getPhotographerAvailability(
        photographerId
      );

      // Initialize empty schedule
      const schedule: WeeklySchedule["schedule"] = {
        [DayOfWeek.SUNDAY]: {
          dayOfWeek: DayOfWeek.SUNDAY,
          slots: [],
          isEnabled: false,
        },
        [DayOfWeek.MONDAY]: {
          dayOfWeek: DayOfWeek.MONDAY,
          slots: [],
          isEnabled: false,
        },
        [DayOfWeek.TUESDAY]: {
          dayOfWeek: DayOfWeek.TUESDAY,
          slots: [],
          isEnabled: false,
        },
        [DayOfWeek.WEDNESDAY]: {
          dayOfWeek: DayOfWeek.WEDNESDAY,
          slots: [],
          isEnabled: false,
        },
        [DayOfWeek.THURSDAY]: {
          dayOfWeek: DayOfWeek.THURSDAY,
          slots: [],
          isEnabled: false,
        },
        [DayOfWeek.FRIDAY]: {
          dayOfWeek: DayOfWeek.FRIDAY,
          slots: [],
          isEnabled: false,
        },
        [DayOfWeek.SATURDAY]: {
          dayOfWeek: DayOfWeek.SATURDAY,
          slots: [],
          isEnabled: false,
        },
      };

      // Group availabilities by day
      availabilities.forEach((availability) => {
        const daySchedule = schedule[availability.dayOfWeek];
        if (daySchedule) {
          daySchedule.slots.push({
            startTime: availability.startTime,
            endTime: availability.endTime,
            status: availability.status as any,
            availabilityId: availability.availabilityId,
          });
          daySchedule.isEnabled = true;
        }
      });

      // Sort slots by start time for each day
      Object.values(schedule).forEach((daySchedule) => {
        daySchedule.slots.sort((a, b) =>
          a.startTime.localeCompare(b.startTime)
        );
      });

      const weeklySchedule: WeeklySchedule = {
        photographerId,
        schedule,
      };

      return weeklySchedule;
    } catch (error) {
      console.error("❌ Error building weekly schedule:", error);
      throw error;
    }
  }

  async getAvailabilityStats(
    photographerId: number
  ): Promise<AvailabilityStats> {
    try {
      const availabilities = await this.getPhotographerAvailability(
        photographerId
      );

      const stats: AvailabilityStats = {
        totalSlots: availabilities.length,
        availableSlots: 0,
        busySlots: 0,
        unavailableSlots: 0,
        breakSlots: 0,
        utilizationRate: 0,
      };

      availabilities.forEach((availability) => {
        switch (availability.status.toLowerCase()) {
          case "available":
            stats.availableSlots++;
            break;
          case "busy":
            stats.busySlots++;
            break;
          case "unavailable":
            stats.unavailableSlots++;
            break;
          case "break":
            stats.breakSlots++;
            break;
        }
      });

      // Calculate utilization rate (busy slots / total slots)
      stats.utilizationRate =
        stats.totalSlots > 0
          ? Math.round((stats.busySlots / stats.totalSlots) * 100)
          : 0;

      return stats;
    } catch (error) {
      console.error("❌ Error calculating availability stats:", error);
      throw error;
    }
  }

  // ===== TIME UTILITIES =====

  formatTimeSpan(timeString: string): string {
    // Convert "HH:mm:ss" to "HH:mm"
    return timeString.substring(0, 5);
  }

  parseTimeSpan(timeString: string): string {
    // Convert "HH:mm" to "HH:mm:ss"
    if (timeString.length === 5) {
      return `${timeString}:00`;
    }
    return timeString;
  }

  isTimeOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    return start1 < end2 && start2 < end1;
  }

  calculateSlotDuration(startTime: string, endTime: string): number {
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60); // minutes
  }
}

// Export singleton instance
export const availabilityService = new AvailabilityService();
