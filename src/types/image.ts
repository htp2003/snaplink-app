// Updated based on OpenAPI spec
export interface ImageResponse {
  id: number;
  url: string;
  photographerId?: number;
  locationId?: number;
  photographerEventId?: number;
  isPrimary: boolean;
  caption?: string;
  createdAt: string;
}

// For creating images via multipart/form-data
export interface CreateImageFormData {
  File: File;
  PhotographerId?: number;
  LocationId?: number;
  PhotographerEventId?: number;
  IsPrimary: boolean;
  Caption?: string;
}

// For updating images via JSON
export interface UpdateImageRequest {
  id: number;
  photographerId?: number;
  locationId?: number;
  photographerEventId?: number;
  url?: string;
  isPrimary?: boolean;
  caption?: string;
}

// Legacy interface for backwards compatibility
export interface CreateImageRequest {
  url: string;
  type: string; // 'photographer' | 'location' | 'event'
  refId: number; // photographerId, locationId, or eventId
  isPrimary: boolean;
  caption?: string;
}