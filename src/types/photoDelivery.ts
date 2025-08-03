// types/photoDelivery.ts

export interface PhotoDeliveryData {
  photoDeliveryId: number;
  bookingId: number;
  deliveryMethod: string;
  driveLink?: string;
  driveFolderName?: string;
  photoCount?: number;
  status: string;
  uploadedAt?: string;
  deliveredAt?: string;
  expiresAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  customerName?: string;
  photographerName?: string;
  bookingDate?: string;
  locationName?: string;
}

export interface CreatePhotoDeliveryRequest {
  bookingId: number;
  deliveryMethod: string;
  driveLink?: string | null;
  driveFolderName?: string | null;
  photoCount?: number | null;
  notes?: string | null;
}

export interface UpdatePhotoDeliveryRequest {
  driveLink?: string;
  driveFolderName?: string;
  photoCount?: number;
  status?: string;
  expiresAt?: string;
  notes?: string;
}

export interface PhotoDeliveryApiResponse {
  error: number;
  message: string;
  data: PhotoDeliveryData;
}

export interface PhotoDeliveryListApiResponse {
  error: number;
  message: string;
  data: PhotoDeliveryData[];
}

export interface BooleanApiResponse {
  error: number;
  message: string;
  data: boolean;
}

export type DeliveryMethod = 'CustomerDevice' | 'PhotographerDevice';

export type DeliveryStatus = 'Pending' | 'NotRequired' | 'Delivered';

export interface DeliveryCounts {
  pending: number;
  delivered: number;
  notRequired: number;
}