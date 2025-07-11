export interface ImageResponse {
  id: number;
  url: string;
  type: string; // 'photographer' | 'location'
  refId: number; // photographerId hoặc locationId
  isPrimary: boolean;
  caption?: string;
  createdAt: string;
}

export interface CreateImageRequest {
  url: string;
  type: string; // 'photographer' | 'location'
  refId: number; // photographerId hoặc locationId
  isPrimary: boolean;
  caption?: string;
}

export interface UpdateImageRequest {
  id: number;
  type?: string;
  url?: string;
  isPrimary?: boolean;
  caption?: string;
}