import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { imageService } from '../services/imageService';

interface UploadItem {
  id: string;
  uri: string;
  name: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface UseImageUploadOptions {
  photographerId?: number;
  locationId?: number;
  eventId?: number;
  onUploadComplete?: (results: any[]) => void;
  onUploadError?: (error: string) => void;
}

export const useImageUpload = (options: UseImageUploadOptions = {}) => {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need permission to access your photo library to upload images.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const updateUploadProgress = useCallback((id: string, progress: number, status?: 'uploading' | 'success' | 'error', error?: string) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id 
        ? { ...upload, progress, status: status || upload.status, error }
        : upload
    ));
  }, []);

  const addUpload = useCallback((id: string, uri: string, name: string) => {
    const newUpload: UploadItem = {
      id,
      uri,
      name,
      progress: 0,
      status: 'uploading',
    };
    
    setUploads(prev => [...prev, newUpload]);
    return newUpload;
  }, []);

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== id));
  }, []);

  const clearUploads = useCallback(() => {
    setUploads([]);
  }, []);

  // Helper function to get file name from URI
  const getFileNameFromUri = (uri: string): string => {
    const parts = uri.split('/');
    const fileName = parts[parts.length - 1];
    
    // If no extension, add .jpg
    if (!fileName.includes('.')) {
      return `${fileName || 'image'}.jpg`;
    }
    
    return fileName;
  };

  const uploadSingleImage = async (
    asset: ImagePicker.ImagePickerAsset,
    isPrimary: boolean = false,
    caption?: string
  ): Promise<any> => {
    const uploadId = `upload_${Date.now()}_${Math.random()}`;
    const fileName = getFileNameFromUri(asset.uri);
    
    console.log('🚀 Starting upload:', {
      uploadId,
      fileName,
      uri: asset.uri.substring(0, 50) + '...',
      isPrimary,
      caption
    });
    
    const upload = addUpload(uploadId, asset.uri, fileName);

    try {
      // Start progress simulation
      updateUploadProgress(uploadId, 10);
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploads(prev => {
          const currentUpload = prev.find(u => u.id === uploadId);
          if (currentUpload && currentUpload.progress < 90) {
            updateUploadProgress(uploadId, Math.min(currentUpload.progress + 15, 90));
          }
          return prev;
        });
      }, 300);

      // Upload based on type - FIXED VERSION
      let result = null;
      if (options.photographerId) {
        console.log('📸 Uploading photographer image...');
        result = await imageService.photographer.createImage(
          asset.uri, 
          fileName, 
          options.photographerId, 
          isPrimary, 
          caption
        );
      } else if (options.locationId) {
        console.log('🏠 Uploading location image...');
        result = await imageService.location.createImage(
          asset.uri, 
          fileName, 
          options.locationId, 
          isPrimary, 
          caption
        );
      } else if (options.eventId) {
        console.log('🎉 Uploading event image...');
        result = await imageService.event.createImage(
          asset.uri, 
          fileName, 
          options.eventId, 
          isPrimary, 
          caption
        );
      } else {
        throw new Error('No target ID specified (photographerId, locationId, or eventId)');
      }

      clearInterval(progressInterval);

      if (result) {
        console.log('✅ Upload successful:', result.id);
        updateUploadProgress(uploadId, 100, 'success');
        return result;
      } else {
        console.error('❌ Upload failed: Service returned null');
        updateUploadProgress(uploadId, 0, 'error', 'Upload failed - no result returned');
        return null;
      }
    } catch (error) {
      console.error('💥 Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      updateUploadProgress(uploadId, 0, 'error', errorMessage);
      return null;
    }
  };

  const uploadMultipleImages = async (
    assets: ImagePicker.ImagePickerAsset[],
    primaryIndex?: number
  ): Promise<any[]> => {
    setIsUploading(true);
    console.log(`🚀 Starting batch upload of ${assets.length} images...`);
    
    try {
      const results = [];
      
      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const isPrimary = i === primaryIndex;
        const caption = `Portfolio image ${i + 1}`;
        
        console.log(`📤 Uploading image ${i + 1}/${assets.length}...`);
        
        const result = await uploadSingleImage(asset, isPrimary, caption);
        results.push(result);
        
        // Small delay between uploads to prevent overwhelming the server
        if (i < assets.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      const successfulUploads = results.filter(result => result !== null);
      
      console.log(`✅ Batch upload completed: ${successfulUploads.length}/${assets.length} successful`);
      
      if (options.onUploadComplete) {
        options.onUploadComplete(successfulUploads);
      }

      return results;
    } catch (error) {
      console.error('💥 Batch upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Batch upload failed';
      if (options.onUploadError) {
        options.onUploadError(errorMessage);
      }
      return [];
    } finally {
      setIsUploading(false);
    }
  };

  const pickSingleImage = async (
    isPrimary: boolean = false,
    caption?: string
  ) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return null;

    try {
      console.log('📱 Opening image picker (single)...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('✅ Image selected, starting upload...');
        return await uploadSingleImage(result.assets[0], isPrimary, caption);
      }
      
      console.log('❌ Image selection cancelled');
      return null;
    } catch (error) {
      console.error('💥 Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      return null;
    }
  };

  const pickMultipleImages = async (
    maxImages: number = 10,
    primaryIndex?: number
  ) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return [];

    try {
      console.log(`📱 Opening image picker (multiple, max: ${maxImages})...`);
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: true,
        selectionLimit: maxImages,
      });

      if (!result.canceled && result.assets.length > 0) {
        console.log(`✅ ${result.assets.length} images selected, starting batch upload...`);
        return await uploadMultipleImages(result.assets, primaryIndex);
      }
      
      console.log('❌ Image selection cancelled');
      return [];
    } catch (error) {
      console.error('💥 Error picking images:', error);
      Alert.alert('Error', 'Failed to pick images. Please try again.');
      return [];
    }
  };

  const pickFromCamera = async (
    isPrimary: boolean = false,
    caption?: string
  ) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need permission to access your camera to take photos.',
        [{ text: 'OK' }]
      );
      return null;
    }

    try {
      console.log('📷 Opening camera...');
      
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('✅ Photo taken, starting upload...');
        return await uploadSingleImage(result.assets[0], isPrimary, caption);
      }
      
      console.log('❌ Camera cancelled');
      return null;
    } catch (error) {
      console.error('💥 Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      return null;
    }
  };

  // Computed values
  const totalUploads = uploads.length;
  const completedUploads = uploads.filter(u => u.status === 'success').length;
  const failedUploads = uploads.filter(u => u.status === 'error').length;
  const uploadingCount = uploads.filter(u => u.status === 'uploading').length;
  const overallProgress = totalUploads > 0 ? (completedUploads / totalUploads) * 100 : 0;
  const hasUploads = totalUploads > 0;
  const isComplete = completedUploads === totalUploads && totalUploads > 0;
  const hasErrors = failedUploads > 0;

  return {
    // State
    uploads,
    isUploading,
    totalUploads,
    completedUploads,
    failedUploads,
    uploadingCount,
    overallProgress,
    hasUploads,
    isComplete,
    hasErrors,

    // Actions
    pickSingleImage,
    pickMultipleImages,
    pickFromCamera,
    uploadSingleImage,
    uploadMultipleImages,
    updateUploadProgress,
    removeUpload,
    clearUploads,
  };
};