// hooks/useLocations.ts - Updated with Image API integration
import { useState, useEffect } from 'react';
import { locationService } from '../services/locationService';
import { imageService } from '../services/imageService';
import type { Location, LocationImage } from '../types';

// Transform API data to match component props
export interface LocationData {
  id: string;
  locationId: number;
  name: string;
  images: string[]; // Array of image URLs - will only contain first image for card
  styles: string[];
  address?: string;
  description?: string;
  amenities?: string;
  hourlyRate?: number;
  capacity?: number;
  indoor?: boolean;
  outdoor?: boolean;
  availabilityStatus?: string;
  featuredStatus?: boolean;
  verificationStatus?: string;
}

export const useLocations = () => {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allLocationImages, setAllLocationImages] = useState<any[]>([]); 

  // 🖼️ Lấy tất cả ảnh location một lần và cache lại
  const fetchAllLocationImages = async () => {
    try {
      console.log(`🖼️ Đang lấy TẤT CẢ ảnh location...`);
      
      // ✅ ĐÚNG: Dùng getAllImages() để lấy tất cả ảnh theo type location
      const apiImages = await imageService.location.getImages();
      
      console.log(`📦 Tìm thấy ${apiImages.length} ảnh location tổng cộng`);
      setAllLocationImages(apiImages);
      
      return apiImages;
    } catch (error) {
      console.log(`❌ Lỗi khi lấy tất cả ảnh location:`, error);
      return [];
    }
  };

  // 🖼️ Hàm helper để lấy ảnh đầu tiên cho location cụ thể từ cache
  const getLocationMainImage = (locationId: number, cachedImages: any[]): string => {
    try {
      console.log(`🔍 Đang tìm ảnh cho location ${locationId}...`);
      
      // Lọc ảnh theo refId (locationId)
      const locationImages = cachedImages.filter(img => img.refId === locationId);
      
      if (locationImages.length > 0) {
        const firstImageUrl = locationImages[0].url;
        console.log(`✅ Tìm thấy ảnh cache cho location ${locationId}:`, firstImageUrl);
        return firstImageUrl;
      } else {
        console.log(`🔄 Không có ảnh cho location ${locationId}, trả về empty string`);
      }
    } catch (error) {
      console.log(`❌ Lỗi khi lọc ảnh cho location ${locationId}:`, error);
    }
    
    // Trả về empty string để test xem có ảnh thật không
    console.log(`⚠️ Location ${locationId} không có ảnh từ API`);
    return '';
  };

  const transformLocationData = (location: any, cachedImages: any[]): LocationData => {
    console.log('🔄 Đang transform dữ liệu location:', location.locationId);
    
    // Tách amenities thành styles
    let styles: string[] = [];
    if (location.amenities) {
      styles = location.amenities.split(',').map((s: string) => s.trim());
    } else {
      styles = location.indoor && location.outdoor ? ['Indoor', 'Outdoor'] :
              location.indoor ? ['Indoor'] :
              location.outdoor ? ['Outdoor'] : ['Studio'];
    }

    // 🚀 MỚI: Lấy ảnh chính từ cache
    const mainImageUrl = getLocationMainImage(location.locationId, cachedImages);

    const transformedData: LocationData = {
      id: location.locationId.toString(),
      locationId: location.locationId,
      name: location.name || 'Unknown Location',
      images: [mainImageUrl], // ✅ Chỉ ảnh đầu tiên cho card
      styles,
      address: location.address,
      description: location.description,
      amenities: location.amenities,
      hourlyRate: location.hourlyRate,
      capacity: location.capacity,
      indoor: location.indoor,
      outdoor: location.outdoor,
      availabilityStatus: location.availabilityStatus || 'available',
      featuredStatus: location.featuredStatus,
      verificationStatus: location.verificationStatus,
    };

    console.log('✅ Đã transform xong dữ liệu location:', {
      locationId: transformedData.locationId,
      name: transformedData.name,
      mainImage: transformedData.images[0],
      styles: transformedData.styles
    });
    
    return transformedData;
  };

  const fetchAllLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🏢 Đang lấy tất cả locations...');
      
      // ✅ Bước 1: Lấy tất cả ảnh location trước
      const cachedImages = await fetchAllLocationImages();
      
      // ✅ Bước 2: Lấy dữ liệu location
      const data = await locationService.getAll();
      console.log('📦 Dữ liệu thô từ Location API:', data);
      
      let arr: any[] = [];
      
      // Xử lý các cấu trúc response khác nhau
      if (Array.isArray(data)) {
        arr = data;
      } else if (data && typeof data === 'object' && Array.isArray((data as any).$values)) {
        arr = (data as any).$values;
      } else if (data && typeof data === 'object') {
        // Single object response
        arr = [data];
      } else {
        console.warn('⚠️ Cấu trúc dữ liệu không mong đợi:', data);
        arr = [];
      }
      
      console.log(`📋 Đang xử lý ${arr.length} locations...`);
      
      // Lọc locations hợp lệ
      const validLocations = arr.filter(location => {
        const isValid = location && location.locationId !== undefined;
        if (!isValid) {
          console.warn('❌ Dữ liệu location không hợp lệ:', location);
        }
        return isValid;
      });
      
      // 🚀 Transform với ảnh đã cache (đồng bộ bây giờ)
      const transformedData: LocationData[] = [];
      for (const location of validLocations) {
        try {
          const transformed = transformLocationData(location, cachedImages);
          transformedData.push(transformed);
        } catch (error) {
          console.error(`❌ Lỗi transform location ${location.locationId}:`, error);
          // Thêm dữ liệu location fallback
          transformedData.push({
            id: location.locationId.toString(),
            locationId: location.locationId,
            name: location.name || 'Unknown Location',
            images: [''], // Empty string để test
            styles: ['Studio'],
            address: location.address,
            hourlyRate: location.hourlyRate,
            capacity: location.capacity,
            availabilityStatus: location.availabilityStatus || 'available',
          });
        }
      }
      
      console.log(`✅ Hoàn tất transform ${transformedData.length} locations với ảnh`);
      setLocations(transformedData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Lỗi khi lấy locations';
      console.error('❌ Lỗi khi lấy locations:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getLocationById = async (id: number): Promise<LocationData | null> => {
    try {
      console.log('🔍 Đang lấy location theo ID:', id);
      const data = await locationService.getById(id);
      console.log('📦 Dữ liệu thô location theo ID:', data);
      
      // Dùng ảnh đã cache nếu có, nếu không thì fetch mới
      const cachedImages = allLocationImages.length > 0 
        ? allLocationImages 
        : await fetchAllLocationImages();
      
      return transformLocationData(data, cachedImages);
    } catch (err) {
      console.error('❌ Lỗi khi lấy location theo ID:', err);
      return null;
    }
  };

  const refreshLocations = () => {
    fetchAllLocations();
  };

  useEffect(() => {
    fetchAllLocations();
  }, []);

  return {
    locations,
    loading,
    error,
    refreshLocations,
    fetchAllLocations,
    getLocationById,
  };
};