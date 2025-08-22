import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import {
  formatDateTimeForAPI,
  setTimeToDate,
  createDateWithTime,
} from "../utils/dateUtils";

export interface FormData {
  locationId: number | null;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  discountedPrice: string;
  originalPrice: string;
  maxPhotographers: string;
  maxBookingsPerSlot: string;
}

export interface ImageItem {
  uri: string;
  id: string;
  isPrimary: boolean;
}

export const useVenueOwnerEventForm = (preselectedLocationId?: number) => {
  // Default với ngày hôm nay và ngày mai, giờ mặc định 0:00 AM
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [formData, setFormData] = useState<FormData>({
    locationId: preselectedLocationId || null,
    name: "",
    description: "",
    startDate: setTimeToDate(today, 0, 0), // Hôm nay 12:00 AM
    endDate: setTimeToDate(tomorrow, 0, 0), // Ngày mai 12:00 AM
    discountedPrice: "",
    originalPrice: "",
    maxPhotographers: "5",
    maxBookingsPerSlot: "3",
  });

  const [images, setImages] = useState<ImageItem[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState<number | null>(
    null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form update helper
  const updateFormData = useCallback(
    (field: keyof FormData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));

      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }));
      }
    },
    [errors]
  );

  // Update date with time
  const updateDateTime = useCallback(
    (
      field: "startDate" | "endDate",
      date: Date,
      hour: number,
      minute: number
    ) => {
      const newDateTime = setTimeToDate(date, hour, minute);
      updateFormData(field, newDateTime);
    },
    [updateFormData]
  );

  // Validation
  const validateForm = useCallback(
    (userLocations: any[]) => {
      const newErrors: Record<string, string> = {};

      if (!formData.locationId) {
        newErrors.locationId = "Vui lòng chọn địa điểm";
      } else {
        const selectedLocation = userLocations.find(
          (loc) => loc.locationId === formData.locationId
        );
        if (selectedLocation && !selectedLocation.canCreateEvent) {
          newErrors.locationId =
            "Địa điểm này không có gói đăng ký active để tạo sự kiện";
        }
      }

      if (!formData.name.trim()) {
        newErrors.name = "Vui lòng nhập tên sự kiện";
      } else if (formData.name.trim().length < 3) {
        newErrors.name = "Tên sự kiện phải có ít nhất 3 ký tự";
      } else if (formData.name.trim().length > 255) {
        newErrors.name = "Tên sự kiện không được quá 255 ký tự";
      }

      if (formData.description.trim().length > 1000) {
        newErrors.description = "Mô tả không được quá 1000 ký tự";
      }

      const startTime = formData.startDate.getTime();
      const endTime = formData.endDate.getTime();
      const nowTime = new Date().getTime();

      if (startTime >= endTime) {
        newErrors.endDate = "Thời gian kết thúc phải sau thời gian bắt đầu";
      }

      if (startTime < nowTime - 60000) {
        newErrors.startDate = "Thời gian bắt đầu không thể trong quá khứ";
      }

      if (formData.discountedPrice) {
        const discountedPrice = parseFloat(formData.discountedPrice);
        if (isNaN(discountedPrice) || discountedPrice <= 0) {
          newErrors.discountedPrice = "Giá khuyến mãi phải là số dương";
        }
      }

      if (formData.originalPrice) {
        const originalPrice = parseFloat(formData.originalPrice);
        if (isNaN(originalPrice) || originalPrice <= 0) {
          newErrors.originalPrice = "Giá gốc phải là số dương";
        }

        if (formData.discountedPrice) {
          const discountedPrice = parseFloat(formData.discountedPrice);
          if (
            !isNaN(discountedPrice) &&
            !isNaN(originalPrice) &&
            discountedPrice >= originalPrice
          ) {
            newErrors.discountedPrice = "Giá khuyến mãi phải nhỏ hơn giá gốc";
          }
        }
      }

      const maxPhotographers = parseInt(formData.maxPhotographers);
      if (
        isNaN(maxPhotographers) ||
        maxPhotographers < 1 ||
        maxPhotographers > 100
      ) {
        newErrors.maxPhotographers = "Số nhiếp ảnh gia tối đa phải từ 1-100";
      }

      const maxBookingsPerSlot = parseInt(formData.maxBookingsPerSlot);
      if (
        isNaN(maxBookingsPerSlot) ||
        maxBookingsPerSlot < 1 ||
        maxBookingsPerSlot > 50
      ) {
        newErrors.maxBookingsPerSlot = "Số booking tối đa phải từ 1-50";
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [formData]
  );

  const getFormattedDatesForAPI = useCallback(() => {
    return {
      startDate: formatDateTimeForAPI(formData.startDate),
      endDate: formatDateTimeForAPI(formData.endDate),
    };
  }, [formData.startDate, formData.endDate]);

  // Image handling methods (unchanged)
  const requestPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Quyền truy cập",
        "Ứng dụng cần quyền truy cập thư viện ảnh để upload hình"
      );
      return false;
    }
    return true;
  }, []);

  const pickImages = useCallback(async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10 - images.length,
      });

      if (!result.canceled && result.assets) {
        const newImages: ImageItem[] = result.assets.map((asset, index) => ({
          uri: asset.uri,
          id: `${Date.now()}_${index}`,
          isPrimary: false,
        }));

        setImages((prev) => [...prev, ...newImages]);

        if (primaryImageIndex === null && newImages.length > 0) {
          setPrimaryImageIndex(images.length);
        }
      }
    } catch (error) {
      console.error("Pick images error:", error);
      Alert.alert("Lỗi", "Không thể chọn ảnh");
    }
  }, [images.length, primaryImageIndex, requestPermission]);

  const takePhoto = useCallback(async () => {
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newImage: ImageItem = {
          uri: result.assets[0].uri,
          id: `${Date.now()}`,
          isPrimary: false,
        };

        setImages((prev) => [...prev, newImage]);

        if (primaryImageIndex === null) {
          setPrimaryImageIndex(images.length);
        }
      }
    } catch (error) {
      console.error("Take photo error:", error);
      Alert.alert("Lỗi", "Không thể chụp ảnh");
    }
  }, [images.length, primaryImageIndex, requestPermission]);

  const removeImage = useCallback(
    (index: number) => {
      setImages((prev) => prev.filter((_, i) => i !== index));

      if (primaryImageIndex === index) {
        setPrimaryImageIndex(null);
      } else if (primaryImageIndex !== null && primaryImageIndex > index) {
        setPrimaryImageIndex(primaryImageIndex - 1);
      }
    },
    [primaryImageIndex]
  );

  const setPrimaryImage = useCallback((index: number) => {
    setPrimaryImageIndex(index);
  }, []);

  const showImageOptions = useCallback(() => {
    Alert.alert("Thêm ảnh", "Chọn cách thêm ảnh cho sự kiện", [
      { text: "Hủy", style: "cancel" },
      { text: "Chọn từ thư viện", onPress: pickImages },
      { text: "Chụp ảnh", onPress: takePhoto },
    ]);
  }, [pickImages, takePhoto]);

  return {
    formData,
    images,
    primaryImageIndex,
    errors,
    updateFormData,
    updateDateTime,
    validateForm,
    getFormattedDatesForAPI,
    pickImages,
    takePhoto,
    removeImage,
    setPrimaryImage,
    showImageOptions,
    setFormData,
    setImages,
    setPrimaryImageIndex,
  };
};
