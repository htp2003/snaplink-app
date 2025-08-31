import { apiClient } from "./base";
import {
  CreateAvailabilityRequest,
  UpdateAvailabilityRequest,
  BulkAvailabilityRequest,
  AvailabilityResponse,
  AvailabilityDetailResponse,
  AvailablePhotographersResponse,
  GetAvailablePhotographersParams,
  DayOfWeek,
  WeeklySchedule,
  DaySchedule,
  TimeSlot,
  AvailabilityStats,
  ProcessedTimeSlot,
  DayAvailabilityInfo,
  AvailableSlotsResponse,
  TimeSlotInfo,
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

  // Available slots endpoint
  GET_AVAILABLE_SLOTS: (photographerId: number, date: string) =>
    `/api/Availability/photographer/${photographerId}/available-slots?date=${date}`,
};

export class AvailabilityService {
  // ===== MAIN METHOD FOR GETTING AVAILABLE SLOTS =====

  async getAvailableSlots(
    photographerId: number,
    date: string
  ): Promise<DayAvailabilityInfo | null> {
    try {
      console.log("🔍 Getting available slots:", { photographerId, date });

      const response = await apiClient.get<AvailableSlotsResponse>(
        AVAILABILITY_ENDPOINTS.GET_AVAILABLE_SLOTS(photographerId, date)
      );

      console.log("📅 Available slots API response:", response);

      if (
        response.error !== 0 ||
        !response.data ||
        response.data.length === 0
      ) {
        console.warn("⚠️ No available slots found or API error");
        return null;
      }

      const dayData = response.data[0];
      const processedSlots = this.processTimeSlots(dayData);

      const dayInfo: DayAvailabilityInfo = {
        date: dayData.date,
        dayOfWeek: dayData.dayOfWeek,
        photographerId: dayData.photographerId,
        availableSlots: processedSlots,
        totalAvailableHours: processedSlots.filter((slot) => slot.isAvailable)
          .length,
        availabilityRange: this.getAvailabilityRange(dayData.availableSlots),
      };

      console.log("✅ Processed day availability:", dayInfo);
      return dayInfo;
    } catch (error) {
      console.error("❌ Error getting available slots:", error);
      return null;
    }
  }

  /**
   * ✅ FIXED: Process time slots from API response into UI-friendly format
   */
  private processTimeSlots(dayData: any): ProcessedTimeSlot[] {
    const processedSlots: ProcessedTimeSlot[] = [];
    const availableSlots = dayData.availableSlots || [];
    const bookedSlots = dayData.bookedSlots || [];

    console.log("🔧 Processing time slots:", {
      availableSlots,
      bookedSlots,
    });

    if (availableSlots.length === 0) {
      console.log("📭 No available slots to process");
      return [];
    }

    // ✅ FIXED: Process each available slot range correctly
    availableSlots.forEach((slot: any, slotIndex: number) => {
      console.log(`📊 Processing available slot ${slotIndex + 1}:`, slot);
      
      const startHour = parseInt(slot.startTime.split(":")[0]);
      const startMinute = parseInt(slot.startTime.split(":")[1]);
      const endHour = parseInt(slot.endTime.split(":")[0]);
      const endMinute = parseInt(slot.endTime.split(":")[1]);

      console.log(`⏰ Slot time range: ${startHour}:${startMinute.toString().padStart(2, '0')} - ${endHour}:${endMinute.toString().padStart(2, '0')}`);

      // ✅ FIXED: Generate hourly slots within the available range
      for (let hour = startHour; hour < endHour; hour++) {
        const timeStr = hour.toString().padStart(2, "0") + ":00";

        // ✅ Check if this hour is booked
        const isBooked = bookedSlots.some((bookedSlot: any) => {
          const bookedStartHour = parseInt(bookedSlot.startTime.split(":")[0]);
          const bookedEndHour = parseInt(bookedSlot.endTime.split(":")[0]);
          return hour >= bookedStartHour && hour < bookedEndHour;
        });

        // ✅ Only add if not already exists
        const existingSlot = processedSlots.find((s) => s.time === timeStr);
        if (!existingSlot) {
          processedSlots.push({
            time: timeStr,
            hour: hour,
            isAvailable: !isBooked,
            isBooked: isBooked,
            status: isBooked ? "booked" : "available",
            bookingInfo: isBooked
              ? this.getBookingInfo(bookedSlots, hour)
              : null,
          });
        }
      }
    });

    // ✅ Sort by hour
    processedSlots.sort((a, b) => a.hour - b.hour);
    
    console.log("✅ Processed slots result:", processedSlots.map(s => `${s.time}(${s.status})`));
    return processedSlots;
  }

  /**
   * ✅ FIXED: Get available times for UI - ALL available start times
   */
  async getAvailableTimesForDate(
    photographerId: number,
    date: string
  ): Promise<string[]> {
    try {
      console.log("🕐 Getting available times for UI:", {
        photographerId,
        date,
      });
  
      const response = await apiClient.get<AvailableSlotsResponse>(
        AVAILABILITY_ENDPOINTS.GET_AVAILABLE_SLOTS(photographerId, date)
      );
  
      console.log("📅 RAW API Response:", JSON.stringify(response, null, 2));
  
      if (response.error !== 0 || !response.data || response.data.length === 0) {
        console.warn("⚠️ No available slots found or API error:", {
          error: response.error,
          hasData: !!response.data,
          dataLength: response.data?.length
        });
        return [];
      }
  
      const dayData = response.data[0];
      const availableSlots = dayData.availableSlots || [];
      const bookedSlots = dayData.bookedSlots || [];
  
      console.log("🔍 Extracted data:", {
        dayData: dayData,
        availableSlots: availableSlots,
        bookedSlots: bookedSlots
      });
  
      if (availableSlots.length === 0) {
        console.log("🔭 No available slots for this day");
        return [];
      }
  
      console.log("⏰ Processing available ranges:", availableSlots);
      console.log("📋 Booked ranges:", bookedSlots);
  
      // Generate ALL possible start times correctly
      const startTimes: string[] = [];
  
      availableSlots.forEach((slot: any, index: number) => {
        console.log("🎯 Processing slot:", slot);
        
        const startHour = parseInt(slot.startTime.split(":")[0]);
        const endHour = parseInt(slot.endTime.split(":")[0]);
  
        console.log(`📅 Available range ${index + 1}: ${startHour}:00 - ${endHour}:00`);
  
        // Add all possible start times within this range (except the last hour)
        for (let hour = startHour; hour < endHour; hour++) {
          console.log(`⏳ Checking hour ${hour}:00`);
          
          // Check if this hour is NOT booked
          const isBooked = bookedSlots.some((bookedSlot: any) => {
            const bookedStartHour = parseInt(bookedSlot.startTime.split(":")[0]);
            const bookedEndHour = parseInt(bookedSlot.endTime.split(":")[0]);
            const result = hour >= bookedStartHour && hour < bookedEndHour;
            
            console.log(`    🔍 Booked slot ${bookedSlot.startTime}-${bookedSlot.endTime}: ${hour} >= ${bookedStartHour} && ${hour} < ${bookedEndHour} = ${result}`);
            
            return result;
          });
  
          console.log(`    📊 Hour ${hour}:00 is booked: ${isBooked}`);
  
          if (!isBooked) {
            const timeStr = hour.toString().padStart(2, "0") + ":00";
            if (!startTimes.includes(timeStr)) {
              startTimes.push(timeStr);
              console.log(`    ✅ Added available start time: ${timeStr}`);
            }
          } else {
            console.log(`    ❌ Hour ${hour}:00 is booked, skipping`);
          }
        }
      });
  
      // Sort by hour
      startTimes.sort((a, b) => {
        const hourA = parseInt(a.split(":")[0]);
        const hourB = parseInt(b.split(":")[0]);
        return hourA - hourB;
      });
  
      console.log("✅ Final available START times for UI:", {
        startTimes,
        count: startTimes.length,
        example: "Can start at these times, end times calculated separately",
      });
  
      return startTimes;
    } catch (error) {
      console.error("❌ Error getting available times:", error);
      return [];
    }
  }

  /**
   * ✅ FIXED: Get end times for a specific start time - STOPS AT BOOKED SLOTS
   */
  async getEndTimesForStartTime(
    photographerId: number,
    date: string,
    startTime: string
  ): Promise<string[]> {
    try {
      console.log("🕑 Getting end times for start time:", {
        photographerId,
        date,
        startTime,
      });

      const response = await apiClient.get<AvailableSlotsResponse>(
        AVAILABILITY_ENDPOINTS.GET_AVAILABLE_SLOTS(photographerId, date)
      );

      if (
        response.error !== 0 ||
        !response.data ||
        response.data.length === 0
      ) {
        return [];
      }

      const dayData = response.data[0];
      const availableSlots = dayData.availableSlots || [];
      const bookedSlots = dayData.bookedSlots || [];
      const startHour = parseInt(startTime.split(":")[0]);

      console.log("🔍 Processing end times with booked slots:", {
        startHour,
        availableSlots,
        bookedSlots,
      });

      // ✅ Find which available range contains this start time
      const containingSlot = availableSlots.find((slot: any) => {
        const slotStartHour = parseInt(slot.startTime.split(":")[0]);
        const slotEndHour = parseInt(slot.endTime.split(":")[0]);
        return startHour >= slotStartHour && startHour < slotEndHour;
      });

      if (!containingSlot) {
        console.warn("⚠️ Start time not found in any available slot");
        return [];
      }

      const rangeEndHour = parseInt(containingSlot.endTime.split(":")[0]);
      const endTimes: string[] = [];

      // ✅ CRITICAL FIX: Generate end times but STOP when hitting a booked slot
      for (let hour = startHour + 1; hour <= rangeEndHour; hour++) {
        // ✅ Check if the hour right before this end time is booked
        const previousHour = hour - 1;
        
        const isPreviousHourBooked = bookedSlots.some((bookedSlot: any) => {
          const bookedStartHour = parseInt(bookedSlot.startTime.split(":")[0]);
          const bookedEndHour = parseInt(bookedSlot.endTime.split(":")[0]);
          return previousHour >= bookedStartHour && previousHour < bookedEndHour;
        });

        console.log(`🔍 Checking end time ${hour}:00 (previous hour ${previousHour}:00 booked: ${isPreviousHourBooked})`);

        if (isPreviousHourBooked && previousHour > startHour) {
          // ✅ STOP: We hit a booked slot in our working range
          console.log(`🛑 STOPPING at ${hour}:00 because ${previousHour}:00-${previousHour+1}:00 is booked`);
          break;
        }

        // ✅ This end time is valid
        const timeStr = hour.toString().padStart(2, "0") + ":00";
        endTimes.push(timeStr);
        
        console.log(`✅ Added valid end time: ${timeStr}`);
      }

      console.log("✅ Final end times for start time:", {
        startTime,
        containingRange: `${containingSlot.startTime}-${containingSlot.endTime}`,
        endTimes,
        explanation: endTimes.length === 0 
          ? `No valid end times - next hour after ${startTime} is booked`
          : `${startTime} can end at: ${endTimes.join(", ")}`,
      });

      return endTimes;
    } catch (error) {
      console.error("❌ Error getting end times:", error);
      return [];
    }
  }

  /**
   * Get booking info for a specific hour
   */
  private getBookingInfo(bookedSlots: TimeSlotInfo[], hour: number): any {
    const relevantBooking = bookedSlots.find((bookedSlot: TimeSlotInfo) => {
      const bookedStartHour = parseInt(bookedSlot.startTime.split(":")[0]);
      const bookedEndHour = parseInt(bookedSlot.endTime.split(":")[0]);
      return hour >= bookedStartHour && hour < bookedEndHour;
    });

    return relevantBooking?.bookingInfo || null;
  }

  /**
   * Get availability range (start and end time) from available slots
   */
  private getAvailabilityRange(
    availableSlots: TimeSlotInfo[]
  ): { start: string; end: string } | null {
    if (availableSlots.length === 0) return null;

    // ✅ FIXED: Get the overall range from all available slots
    const allStartTimes = availableSlots.map(slot => slot.startTime);
    const allEndTimes = availableSlots.map(slot => slot.endTime);
    
    const earliestStart = allStartTimes.sort()[0];
    const latestEnd = allEndTimes.sort().reverse()[0];

    return {
      start: earliestStart.substring(0, 5), // "06:00:00" -> "06:00"
      end: latestEnd.substring(0, 5), // "18:00:00" -> "18:00"
    };
  }

  async getAvailableSlotsForDate(
    photographerId: number,
    date: string
  ): Promise<DayAvailabilityInfo | null> {
    return await this.getAvailableSlots(photographerId, date);
  }

  /**
   * Check if a specific time slot is available
   */
  async isTimeSlotAvailable(
    photographerId: number,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    try {
      const dayInfo = await this.getAvailableSlots(photographerId, date);

      if (!dayInfo) return false;

      const startHour = parseInt(startTime.split(":")[0]);
      const endHour = parseInt(endTime.split(":")[0]);

      // Check all hours in the range
      for (let hour = startHour; hour < endHour; hour++) {
        const slot = dayInfo.availableSlots.find((s) => s.hour === hour);
        if (!slot || !slot.isAvailable) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error("❌ Error checking time slot availability:", error);
      return false;
    }
  }

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
