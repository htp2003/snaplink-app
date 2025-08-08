// hooks/useLocations.ts - Đã sửa, bỏ hàm fetchAllLocationImages có vấn đề
import { useState, useEffect } from 'react';
import { locationService } from '../services/locationService';
import { imageService } from '../services/imageService';
import type { Location, LocationImage } from '../types';

// Transform API data to match component props
export interface LocationData {
  id: string;
  locationId: number;
  name: string;
  images: string[]; // Array of image URLs - chỉ chứa ảnh đầu tiên cho card
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

  // 🖼️ Hàm helper để lấy ảnh chính cho một location cụ thể
  const getLocationMainImage = async (locationId: number): Promise<string> => {
    try {
      console.log(`🔍 Đang lấy ảnh cho location ${locationId}...`);
      
      // Lấy ảnh cho location cụ thể này
      const apiImages = await imageService.location.getImages(locationId);
      
      if (apiImages && apiImages.length > 0) {
        const firstImageUrl = apiImages[0].url;
        console.log(`✅ Tìm thấy ảnh cho location ${locationId}:`, firstImageUrl);
        return firstImageUrl;
      } else {
        console.log(`⚠️ Location ${locationId} không có ảnh`);
        return ''; // Trả về chuỗi rỗng nếu không có ảnh
      }
    } catch (error) {
      console.log(`❌ Lỗi khi lấy ảnh cho location ${locationId}:`, error);
      return ''; // Trả về chuỗi rỗng nếu có lỗi
    }
  };

  const transformLocationData = async (location: any): Promise<LocationData> => {
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

    // 🚀 Lấy ảnh chính cho location này
    const mainImageUrl = await getLocationMainImage(location.locationId);

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
      
      // ✅ Lấy dữ liệu location
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

      console.log('🏢 Location IDs from API:', validLocations.map(loc => loc.locationId));

      // 🚀 Transform từng location một (với async/await)
      const transformedData: LocationData[] = [];
      for (const location of validLocations) {
        try {
          const transformed = await transformLocationData(location);
          transformedData.push(transformed);
        } catch (error) {
          console.error(`❌ Lỗi transform location ${location.locationId}:`, error);
          // Thêm dữ liệu location fallback
          transformedData.push({
            id: location.locationId.toString(),
            locationId: location.locationId,
            name: location.name || 'Unknown Location',
            images: [''], // Chuỗi rỗng nếu không lấy được ảnh
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
      
      return await transformLocationData(data);
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