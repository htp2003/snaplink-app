export interface PhotographerImage {
    id: number;
    photographerId: number;
    imageUrl: string;
    caption?: string;
    isPrimary: boolean;
    createdAt?: string;
    updatedAt?: string;
  }
  
  export interface CreatePhotographerImageRequest {
    photographerId: number;
    imageUrl: string;
    caption?: string;
    isPrimary: boolean;
  }
  
  export interface UpdatePhotographerImageRequest {
    photographerImageId: number;
    imageUrl?: string;
    caption?: string;
    isPrimary?: boolean;
  }