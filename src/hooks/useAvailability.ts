// hooks/useAvailability.ts - AVAILABILITY HOOK FOR PHOTOGRAPHER SCHEDULE MANAGEMENT

import { useState, useCallback, useEffect } from "react";
import { availabilityService } from "../services/availabilityService";
import {
  CreateAvailabilityRequest,
  UpdateAvailabilityRequest,
  BulkAvailabilityRequest,
  CheckAvailabilityRequest,
  AvailabilityResponse,
  AvailabilityDetailResponse,
  AvailablePhotographersResponse,
  CheckAvailabilityResponse,
  GetAvailablePhotographersParams,
  AvailabilityFormData,
  BulkAvailabilityFormData,
  AvailabilityValidationErrors,
  UseAvailabilityOptions,
  DayOfWeek,
  AvailabilityStatus,
  WeeklySchedule,
  AvailabilityStats,
  TimeSlot,
  DAY_NAMES,
} from "../types/availability";

export const useAvailability = (options: UseAvailabilityOptions = {}) => {
  const {
    photographerId,
    autoFetch = false,
    enableRealTimeUpdates = false,
  } = options;

  // ===== AVAILABILITY STATES =====
  const [availabilities, setAvailabilities] = useState<AvailabilityResponse[]>(
    []
  );
  const [currentAvailability, setCurrentAvailability] =
    useState<AvailabilityResponse | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(
    null
  );
  const [availabilityStats, setAvailabilityStats] =
    useState<AvailabilityStats | null>(null);

  // ===== LOADING STATES =====
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ===== SEARCH & FILTER STATES =====
  const [availablePhotographers, setAvailablePhotographers] =
    useState<AvailablePhotographersResponse>({ photographers: [] });
  const [checkResult, setCheckResult] =
    useState<CheckAvailabilityResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // ===== VALIDATION =====
  const validateAvailabilityForm = useCallback(
    (formData: AvailabilityFormData): AvailabilityValidationErrors => {
      const errors: AvailabilityValidationErrors = {};

      if (!formData.photographerId) {
        errors.photographer = "Vui lòng chọn photographer";
      }

      if (formData.dayOfWeek === undefined || formData.dayOfWeek === null) {
        errors.dayOfWeek = "Vui lòng chọn ngày trong tuần";
      }

      if (!formData.startTime) {
        errors.startTime = "Vui lòng chọn giờ bắt đầu";
      }

      if (!formData.endTime) {
        errors.endTime = "Vui lòng chọn giờ kết thúc";
      }

      if (formData.startTime && formData.endTime) {
        const startTime = new Date(`2000-01-01 ${formData.startTime}`);
        const endTime = new Date(`2000-01-01 ${formData.endTime}`);

        if (endTime <= startTime) {
          errors.endTime = "Giờ kết thúc phải sau giờ bắt đầu";
        }

        // Check for overlap with existing slots
        const existingSlots = availabilities.filter(
          (av) =>
            av.photographerId === formData.photographerId &&
            av.dayOfWeek === formData.dayOfWeek
        );

        const hasOverlap = existingSlots.some((slot) =>
          availabilityService.isTimeOverlap(
            formData.startTime,
            formData.endTime,
            slot.startTime,
            slot.endTime
          )
        );

        if (hasOverlap) {
          errors.timeOverlap = "Khung giờ này bị trùng với lịch đã có";
        }
      }

      return errors;
    },
    [availabilities]
  );

  const validateBulkAvailabilityForm = useCallback(
    (formData: BulkAvailabilityFormData): AvailabilityValidationErrors => {
      const errors: AvailabilityValidationErrors = {};

      if (!formData.photographerId) {
        errors.photographer = "Vui lòng chọn photographer";
      }

      // Check if at least one day is enabled
      const hasEnabledDay = Object.values(formData.schedule).some(
        (daySchedule) =>
          daySchedule && daySchedule.isEnabled && daySchedule.slots.length > 0
      );

      if (!hasEnabledDay) {
        errors.general = "Vui lòng thiết lập ít nhất một ngày làm việc";
      }

      // Validate individual time slots
      Object.entries(formData.schedule).forEach(([dayKey, daySchedule]) => {
        if (daySchedule && daySchedule.isEnabled) {
          daySchedule.slots.forEach((slot, index) => {
            if (!slot.startTime || !slot.endTime) {
              errors.general = `${
                DAY_NAMES[parseInt(dayKey) as DayOfWeek]
              }: Vui lòng điền đầy đủ thời gian`;
              return;
            }

            const startTime = new Date(`2000-01-01 ${slot.startTime}`);
            const endTime = new Date(`2000-01-01 ${slot.endTime}`);

            if (endTime <= startTime) {
              errors.general = `${
                DAY_NAMES[parseInt(dayKey) as DayOfWeek]
              }: Giờ kết thúc phải sau giờ bắt đầu`;
              return;
            }

            // Check overlap within same day
            for (let i = index + 1; i < daySchedule.slots.length; i++) {
              const otherSlot = daySchedule.slots[i];
              if (
                availabilityService.isTimeOverlap(
                  slot.startTime,
                  slot.endTime,
                  otherSlot.startTime,
                  otherSlot.endTime
                )
              ) {
                errors.general = `${
                  DAY_NAMES[parseInt(dayKey) as DayOfWeek]
                }: Các khung giờ bị trùng lặp`;
                return;
              }
            }
          });
        }
      });

      return errors;
    },
    []
  );

  // ===== CRUD METHODS =====

  const createAvailability = useCallback(
    async (
      data: CreateAvailabilityRequest
    ): Promise<AvailabilityResponse | null> => {
      if (creating) return null;

      try {
        setCreating(true);
        setError(null);

        const response = await availabilityService.createAvailability(data);

        setCurrentAvailability(response);
        setAvailabilities((prev) => [...prev, response]);

        // Refresh weekly schedule if it's for the same photographer
        if (photographerId === data.photographerId) {
          await refreshWeeklySchedule();
        }

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tạo lịch làm việc";
        setError(errorMessage);
        console.error("❌ Hook: Error in createAvailability:", err);
        return null;
      } finally {
        setCreating(false);
      }
    },
    [creating, photographerId]
  );

  const createBulkAvailability = useCallback(
    async (
      data: BulkAvailabilityRequest
    ): Promise<AvailabilityResponse[] | null> => {
      if (creating) return null;

      try {
        setCreating(true);
        setError(null);

        const response = await availabilityService.createBulkAvailability(data);

        setAvailabilities((prev) => [...prev, ...response]);

        // Refresh weekly schedule if it's for the same photographer
        if (photographerId === data.photographerId) {
          await refreshWeeklySchedule();
        }

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể tạo lịch làm việc";
        setError(errorMessage);
        console.error("❌ Hook: Error in createBulkAvailability:", err);
        return null;
      } finally {
        setCreating(false);
      }
    },
    [creating, photographerId]
  );

  const getAvailabilityById = useCallback(
    async (availabilityId: number): Promise<AvailabilityResponse | null> => {
      try {
        setLoading(true);
        setError(null);

        const response = await availabilityService.getAvailabilityById(
          availabilityId
        );
        setCurrentAvailability(response);
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể lấy thông tin lịch làm việc";
        setError(errorMessage);
        console.error("❌ Hook: Error in getAvailabilityById:", err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateAvailability = useCallback(
    async (
      availabilityId: number,
      data: UpdateAvailabilityRequest
    ): Promise<AvailabilityResponse | null> => {
      if (updating) return null;

      try {
        setUpdating(true);
        setError(null);

        const response = await availabilityService.updateAvailability(
          availabilityId,
          data
        );

        setCurrentAvailability(response);
        setAvailabilities((prev) =>
          prev.map((availability) =>
            availability.availabilityId === availabilityId ||
            availability.id === availabilityId
              ? response
              : availability
          )
        );

        // Refresh weekly schedule
        if (photographerId === response.photographerId) {
          await refreshWeeklySchedule();
        }

        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể cập nhật lịch làm việc";
        setError(errorMessage);
        console.error("❌ Hook: Error in updateAvailability:", err);
        return null;
      } finally {
        setUpdating(false);
      }
    },
    [updating, photographerId]
  );

  const deleteAvailability = useCallback(
    async (availabilityId: number): Promise<boolean> => {
      if (deleting) return false;

      try {
        setDeleting(true);
        setError(null);

        await availabilityService.deleteAvailability(availabilityId);

        setAvailabilities((prev) =>
          prev.filter(
            (availability) =>
              availability.availabilityId !== availabilityId &&
              availability.id !== availabilityId
          )
        );

        if (
          currentAvailability &&
          (currentAvailability.availabilityId === availabilityId ||
            currentAvailability.id === availabilityId)
        ) {
          setCurrentAvailability(null);
        }

        // Refresh weekly schedule
        if (photographerId) {
          await refreshWeeklySchedule();
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể xóa lịch làm việc";
        setError(errorMessage);
        console.error("❌ Hook: Error in deleteAvailability:", err);
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [deleting, currentAvailability, photographerId]
  );

  const updateAvailabilityStatus = useCallback(
    async (
      availabilityId: number,
      status: AvailabilityStatus
    ): Promise<boolean> => {
      try {
        setUpdating(true);
        setError(null);

        await availabilityService.updateAvailabilityStatus(
          availabilityId,
          status
        );

        setAvailabilities((prev) =>
          prev.map((availability) =>
            availability.availabilityId === availabilityId ||
            availability.id === availabilityId
              ? { ...availability, status }
              : availability
          )
        );

        if (
          currentAvailability &&
          (currentAvailability.availabilityId === availabilityId ||
            currentAvailability.id === availabilityId)
        ) {
          setCurrentAvailability((prev) => (prev ? { ...prev, status } : null));
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể cập nhật trạng thái";
        setError(errorMessage);
        console.error("❌ Hook: Error in updateAvailabilityStatus:", err);
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [currentAvailability]
  );

  // ===== PHOTOGRAPHER METHODS =====

  const fetchPhotographerAvailability = useCallback(
    async (photographerIdParam: number) => {
      try {
        setLoading(true);
        setError(null);

        const response = await availabilityService.getPhotographerAvailability(
          photographerIdParam
        );
        setAvailabilities(response);

        // Also fetch weekly schedule and stats
        const [schedule, stats] = await Promise.all([
          availabilityService.getWeeklySchedule(photographerIdParam),
          availabilityService.getAvailabilityStats(photographerIdParam),
        ]);

        setWeeklySchedule(schedule);
        setAvailabilityStats(stats);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể lấy lịch làm việc";
        setError(errorMessage);
        console.error("❌ Hook: Error in fetchPhotographerAvailability:", err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchPhotographerAvailabilityDetails = useCallback(
    async (
      photographerIdParam: number
    ): Promise<AvailabilityDetailResponse[]> => {
      try {
        setLoading(true);
        setError(null);

        const response =
          await availabilityService.getPhotographerAvailabilityDetails(
            photographerIdParam
          );
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể lấy chi tiết lịch làm việc";
        setError(errorMessage);
        console.error(
          "❌ Hook: Error in fetchPhotographerAvailabilityDetails:",
          err
        );
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const deleteAllPhotographerAvailability = useCallback(
    async (photographerIdParam: number): Promise<boolean> => {
      if (deleting) return false;

      try {
        setDeleting(true);
        setError(null);

        await availabilityService.deleteAllPhotographerAvailability(
          photographerIdParam
        );

        if (photographerId === photographerIdParam) {
          setAvailabilities([]);
          setWeeklySchedule(null);
          setAvailabilityStats(null);
          setCurrentAvailability(null);
        }

        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể xóa toàn bộ lịch làm việc";
        setError(errorMessage);
        console.error(
          "❌ Hook: Error in deleteAllPhotographerAvailability:",
          err
        );
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [deleting, photographerId]
  );

  // ===== SEARCH & FILTER METHODS =====

  const fetchAvailabilityByDay = useCallback(async (dayOfWeek: DayOfWeek) => {
    try {
      setSearchLoading(true);
      setError(null);

      const response = await availabilityService.getAvailabilityByDay(
        dayOfWeek
      );
      return response;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Không thể lấy lịch theo ngày";
      setError(errorMessage);
      console.error("❌ Hook: Error in fetchAvailabilityByDay:", err);
      return [];
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const searchAvailablePhotographers = useCallback(
    async (params: GetAvailablePhotographersParams) => {
      try {
        setSearchLoading(true);
        setError(null);

        const response = await availabilityService.getAvailablePhotographers(
          params
        );
        setAvailablePhotographers(response);
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Không thể tìm kiếm photographer";
        setError(errorMessage);
        console.error("❌ Hook: Error in searchAvailablePhotographers:", err);
        setAvailablePhotographers({ photographers: [] });
        return { photographers: [] };
      } finally {
        setSearchLoading(false);
      }
    },
    []
  );

  const checkAvailability = useCallback(
    async (data: CheckAvailabilityRequest) => {
      try {
        setChecking(true);
        setError(null);

        const response = await availabilityService.checkAvailability(data);
        setCheckResult(response);
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Không thể kiểm tra tình trạng";
        setError(errorMessage);
        console.error("❌ Hook: Error in checkAvailability:", err);
        const fallbackResponse: CheckAvailabilityResponse = {
          available: false,
          message: errorMessage,
        };
        setCheckResult(fallbackResponse);
        return fallbackResponse;
      } finally {
        setChecking(false);
      }
    },
    []
  );

  // ===== UTILITY METHODS =====

  const refreshWeeklySchedule = useCallback(async () => {
    if (!photographerId) return;

    try {
      const [schedule, stats] = await Promise.all([
        availabilityService.getWeeklySchedule(photographerId),
        availabilityService.getAvailabilityStats(photographerId),
      ]);

      setWeeklySchedule(schedule);
      setAvailabilityStats(stats);
    } catch (err) {
      console.error("❌ Hook: Error refreshing weekly schedule:", err);
    }
  }, [photographerId]);

  const clearAvailabilityData = useCallback(() => {
    setAvailabilities([]);
    setCurrentAvailability(null);
    setWeeklySchedule(null);
    setAvailabilityStats(null);
    setAvailablePhotographers({ photographers: [] });
    setCheckResult(null);
    setError(null);
  }, []);

  const refreshCurrentAvailability = useCallback(async () => {
    if (currentAvailability?.availabilityId || currentAvailability?.id) {
      const availabilityId =
        currentAvailability.availabilityId || currentAvailability.id!;
      await getAvailabilityById(availabilityId);
    }
  }, [currentAvailability, getAvailabilityById]);

  // ===== FORM HELPERS =====

  const buildBulkAvailabilityRequest = useCallback(
    (formData: BulkAvailabilityFormData): BulkAvailabilityRequest => {
      const availabilities: CreateAvailabilityRequest[] = [];

      Object.entries(formData.schedule).forEach(([dayKey, daySchedule]) => {
        if (daySchedule && daySchedule.isEnabled) {
          daySchedule.slots.forEach((slot) => {
            availabilities.push({
              photographerId: formData.photographerId,
              dayOfWeek: parseInt(dayKey) as DayOfWeek,
              startTime: availabilityService.parseTimeSpan(slot.startTime),
              endTime: availabilityService.parseTimeSpan(slot.endTime),
              status: slot.status,
            });
          });
        }
      });

      return {
        photographerId: formData.photographerId,
        availabilities,
      };
    },
    []
  );

  const getAvailabilityByDayAndTime = useCallback(
    (
      dayOfWeek: DayOfWeek,
      startTime: string,
      endTime: string
    ): AvailabilityResponse | null => {
      return (
        availabilities.find(
          (availability) =>
            availability.dayOfWeek === dayOfWeek &&
            availability.startTime === startTime &&
            availability.endTime === endTime
        ) || null
      );
    },
    [availabilities]
  );

  const getSlotsByDay = useCallback(
    (dayOfWeek: DayOfWeek): TimeSlot[] => {
      return availabilities
        .filter((availability) => availability.dayOfWeek === dayOfWeek)
        .map((availability) => ({
          startTime: availability.startTime,
          endTime: availability.endTime,
          status: availability.status as AvailabilityStatus,
          availabilityId: availability.availabilityId || availability.id,
        }))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
    },
    [availabilities]
  );

  // Auto fetch on mount
  useEffect(() => {
    if (autoFetch && photographerId) {
      fetchPhotographerAvailability(photographerId);
    }
  }, [autoFetch, photographerId, fetchPhotographerAvailability]);

  return {
    // ===== DATA =====
    availabilities,
    currentAvailability,
    weeklySchedule,
    availabilityStats,
    availablePhotographers,
    checkResult,

    // ===== LOADING STATES =====
    loading,
    creating,
    updating,
    deleting,
    checking,
    searchLoading,
    error,

    // ===== CRUD METHODS =====
    createAvailability,
    createBulkAvailability,
    getAvailabilityById,
    updateAvailability,
    deleteAvailability,
    updateAvailabilityStatus,
    validateAvailabilityForm,
    validateBulkAvailabilityForm,

    // ===== PHOTOGRAPHER METHODS =====
    fetchPhotographerAvailability,
    fetchPhotographerAvailabilityDetails,
    deleteAllPhotographerAvailability,

    // ===== SEARCH & FILTER METHODS =====
    fetchAvailabilityByDay,
    searchAvailablePhotographers,
    checkAvailability,

    // ===== UTILITY METHODS =====
    clearAvailabilityData,
    refreshCurrentAvailability,
    refreshWeeklySchedule,
    buildBulkAvailabilityRequest,
    getAvailabilityByDayAndTime,
    getSlotsByDay,

    // ===== SETTER METHODS =====
    setCurrentAvailability,
    setAvailabilities,
    setWeeklySchedule,
    setError,
    setCheckResult,

    // ===== REFRESH UTILITIES =====
    refreshPhotographerAvailability: () =>
      photographerId && fetchPhotographerAvailability(photographerId),
    refreshStats: () => photographerId && refreshWeeklySchedule(),
  };
};
