// Types for Location functionality

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  coordinates: LocationCoordinates;
  rating?: number;
  types?: string[];
  distance?: number;
}

export interface LocationUpdateRequest {
  address?: string;
  googleMapsAddress?: string;
  latitude?: number;
  longitude?: number;
  googlePlaceId?: string; // Thêm Google Place ID
  rating?: number;
  types?: string;
}

export interface GooglePlacesSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
  vicinity?: string;
  rating?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
}

export interface LocationSearchParams {
  query: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  types?: string[];
}

// Predefined location types for photographers
export const PHOTOGRAPHER_LOCATION_TYPES = [
  'establishment',
  'point_of_interest',
  'neighborhood',
  'sublocality',
  'locality'
] as const;

// Common search suggestions for photographers
export const LOCATION_SUGGESTIONS = [
  'Studio chụp ảnh',
  'Công viên',
  'Quán café',
  'Trung tâm thương mại',
  'Bảo tàng',
  'Thư viện',
  'Trường đại học',
  'Khách sạn',
  'Resort',
  'Bãi biển',
  'Núi',
  'Chùa',
  'Nhà thờ'
] as const;