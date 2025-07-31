// types/userStyle.ts

export interface Style {
    styleId: number;
    name: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
  }
  
  export interface UserStyle {
    styleId: number;
    styleName: string;
    styleDescription?: string;
    addedAt: string;
  }
  
  // API Response structure - theo format thực tế
  export interface UserStylesResponse {
    userId: number;
    userName: string;
    favoriteStyles: UserStyle[];
  }
  
  export interface UserStyleResponse {
    $id: string;
    $values: UserStyle[];
  }
  
  // DTOs for API requests
  export interface AddUserStyleRequest {
    userId: number;
    styleId: number;
  }
  
  export interface UpdateUserStylesRequest {
    userId: number;
    styleIds: number[];
  }
  
  // Response types
  export interface UserStyleApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    errors?: string[];
  }
  
  // Helper types
  export interface StyleWithSelection {
    styleId: number;
    name: string;
    description?: string;
    isSelected: boolean;
  }
  
  export interface UserStyleStats {
    totalStyles: number;
    availableSlots: number;
    canAddMore: boolean;
    maxStyles: number;
  }
  
  // Constants
  export const USER_STYLE_CONSTANTS = {
    MAX_STYLES_PER_USER: 3,
    MIN_STYLES_PER_USER: 0,
  } as const;