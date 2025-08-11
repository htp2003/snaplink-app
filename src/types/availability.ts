export enum DayOfWeek {
    SUNDAY = 0,
    MONDAY = 1,
    TUESDAY = 2,
    WEDNESDAY = 3,
    THURSDAY = 4,
    FRIDAY = 5,
    SATURDAY = 6
  }
  
  export enum AvailabilityStatus {
    AVAILABLE = 'Available',
    UNAVAILABLE = 'unavailable',
  }
  
  // ===== REQUEST TYPES =====
  
  export interface CreateAvailabilityRequest {
    photographerId: number;
    dayOfWeek: DayOfWeek;
    startTime: string; 
    endTime: string;   
    status?: string;   
  }
  
  export interface UpdateAvailabilityRequest {
    dayOfWeek?: DayOfWeek;
    startTime?: string; 
    endTime?: string;   
    status?: string;
  }
  
  export interface BulkAvailabilityRequest {
    photographerId: number;
    availabilities: CreateAvailabilityRequest[];
  }
  
  export interface CheckAvailabilityRequest {
    photographerId: number;
    startTime: string; 
    endTime: string;   
  }
  
  // ===== RESPONSE TYPES =====
  
  export interface AvailabilityResponse {
    availabilityId?: number;
    id?: number;
    photographerId: number;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    status: string;
    createdAt?: string;
    updatedAt?: string;
  }
  
  export interface AvailabilityDetailResponse extends AvailabilityResponse {
    photographer?: {
      photographerId: number;
      fullName: string;
      profileImage?: string;
      hourlyRate: number;
    };
  }
  
  export interface AvailabilityListResponse {
    availabilities: AvailabilityResponse[];
    totalCount?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  }
  
  export interface AvailablePhotographersResponse {
    photographers: {
      photographerId: number;
      fullName: string;
      profileImage?: string;
      hourlyRate: number;
      rating?: number;
      availableSlots: {
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
      }[];
    }[];
  }
  
  export interface CheckAvailabilityResponse {
    available: boolean;
    conflictingBookings?: any[];
    suggestedTimes?: {
      startTime: string;
      endTime: string;
    }[];
    message?: string;
  }
  
  // ===== FORM DATA TYPES =====
  
  export interface AvailabilityFormData {
    photographerId: number;
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
    status: AvailabilityStatus;
  }
  
  export interface BulkAvailabilityFormData {
    photographerId: number;
    schedule: {
      [key in DayOfWeek]?: {
        slots: {
          startTime: string;
          endTime: string;
          status: AvailabilityStatus;
        }[];
        isEnabled: boolean;
      };
    };
  }
  
  // ===== VALIDATION TYPES =====
  
  export interface AvailabilityValidationErrors {
    dayOfWeek?: string;
    startTime?: string;
    endTime?: string;
    status?: string;
    photographer?: string;
    timeOverlap?: string;
    general?: string;
  }
  
  // ===== HOOK OPTIONS =====
  
  export interface UseAvailabilityOptions {
    photographerId?: number;
    autoFetch?: boolean;
    enableRealTimeUpdates?: boolean;
  }
  
  // ===== UTILITY TYPES =====
  
  export interface TimeSlot {
    startTime: string;
    endTime: string;
    status: AvailabilityStatus;
    availabilityId?: number;
  }
  
  export interface DaySchedule {
    dayOfWeek: DayOfWeek;
    slots: TimeSlot[];
    isEnabled: boolean;
  }
  
  export interface WeeklySchedule {
    photographerId: number;
    schedule: {
      [key in DayOfWeek]: DaySchedule;
    };
  }
  
  // ===== FILTER & SEARCH TYPES =====
  
  export interface AvailabilityFilters {
    dayOfWeek?: DayOfWeek;
    status?: AvailabilityStatus;
    startTimeFrom?: string;
    startTimeTo?: string;
    endTimeFrom?: string;
    endTimeTo?: string;
  }
  
  export interface GetAvailablePhotographersParams {
    dayOfWeek: DayOfWeek;
    startTime: string; // TimeSpan format
    endTime: string;   // TimeSpan format
  }
  
  // ===== CONSTANTS =====
  
  export const DAY_NAMES: Record<DayOfWeek, string> = {
    [DayOfWeek.SUNDAY]: 'Chủ nhật',
    [DayOfWeek.MONDAY]: 'Thứ hai',
    [DayOfWeek.TUESDAY]: 'Thứ ba',
    [DayOfWeek.WEDNESDAY]: 'Thứ tư',
    [DayOfWeek.THURSDAY]: 'Thứ năm',
    [DayOfWeek.FRIDAY]: 'Thứ sáu',
    [DayOfWeek.SATURDAY]: 'Thứ bảy'
  };
  
  export const DAY_NAMES_SHORT: Record<DayOfWeek, string> = {
    [DayOfWeek.SUNDAY]: 'CN',
    [DayOfWeek.MONDAY]: 'T2',
    [DayOfWeek.TUESDAY]: 'T3',
    [DayOfWeek.WEDNESDAY]: 'T4',
    [DayOfWeek.THURSDAY]: 'T5',
    [DayOfWeek.FRIDAY]: 'T6',
    [DayOfWeek.SATURDAY]: 'T7'
  };
  
  export const STATUS_LABELS: Record<AvailabilityStatus, string> = {
    [AvailabilityStatus.AVAILABLE]: 'Có thể đặt lịch',
    [AvailabilityStatus.UNAVAILABLE]: 'Không rảnh',

  };
  
  export const STATUS_COLORS: Record<AvailabilityStatus, string> = {
    [AvailabilityStatus.AVAILABLE]: '#4CAF50',
    [AvailabilityStatus.UNAVAILABLE]: '#F44336',
  };
  
  // ===== TIME UTILITIES =====
  
  export const DEFAULT_TIME_SLOTS = [
    '09:00:00', '10:00:00', '11:00:00', '12:00:00',
    '13:00:00', '14:00:00', '15:00:00', '16:00:00',
    '17:00:00', '18:00:00', '19:00:00', '20:00:00',
    '21:00:00', '22:00:00'
  ];
  
  export const TIME_SLOT_DURATION = 60; // minutes
  
  export interface AvailabilityStats {
    totalSlots: number;
    availableSlots: number;
    busySlots: number;
    unavailableSlots: number;
    breakSlots: number;
    utilizationRate: number; // percentage
  }