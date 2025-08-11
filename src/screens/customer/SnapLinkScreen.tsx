import React, { useState, JSX } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  ImageSourcePropType
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

interface EditImageResponse {
  success: boolean;
  message: string;
  imageBase64?: string;
  textResponse?: string;
  error?: string;
}
const BASE_URL = "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

export default function SnapLinkAIEditor(): JSX.Element {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [textResponse, setTextResponse] = useState<string>('');

  const pickImage = async (): Promise<void> => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh để tiếp tục');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Check if it's PNG format
        if (!asset.uri.toLowerCase().includes('.png') && asset.type !== 'image') {
          Alert.alert('Lỗi', 'Chỉ hỗ trợ định dạng PNG. Vui lòng chọn ảnh PNG khác.');
          return;
        }

        setSelectedImage(asset.uri);
        setEditedImage(null);
        setTextResponse('');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  const takePicture = async (): Promise<void> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền truy cập camera để tiếp tục');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedImage(result.assets[0].uri);
        setEditedImage(null);
        setTextResponse('');
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Lỗi', 'Không thể chụp ảnh');
    }
  };

  const convertImageToBase64 = async (imageUri: string): Promise<string> => {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (error) {
      console.error('Error converting to base64:', error);
      throw new Error('Không thể chuyển đổi ảnh');
    }
  };

  const editImage = async (): Promise<void> => {
    if (!selectedImage || !prompt.trim()) {
      Alert.alert('Lỗi', 'Vui lòng chọn ảnh và nhập prompt');
      return;
    }

    setIsLoading(true);
    setEditedImage(null);

    try {
      const imageBase64 = await convertImageToBase64(selectedImage);
      
      const requestBody = {
        prompt: prompt.trim(),
        imageBase64: imageBase64,
        mimeType: 'image/png'
      };

      const response = await fetch(`${BASE_URL}/api/ImageGeneration/edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_TOKEN'
        },
        body: JSON.stringify(requestBody)
      });

      const result: EditImageResponse = await response.json();

      if (result.success && result.imageBase64) {
        setEditedImage(`data:image/png;base64,${result.imageBase64}`);
        setTextResponse(result.textResponse || '');
      } else {
        Alert.alert('Lỗi', result.error || 'Không thể chỉnh sửa ảnh');
      }
    } catch (error) {
      console.error('Error editing image:', error);
      Alert.alert('Lỗi', 'Có lỗi xảy ra khi chỉnh sửa ảnh');
    } finally {
      setIsLoading(false);
    }
  };

  const saveImage = async (): Promise<void> => {
    if (!editedImage) return;

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền truy cập để lưu ảnh');
        return;
      }

      // Convert base64 to file
      const base64Data = editedImage.replace('data:image/png;base64,', '');
      const filename = `snaplink_edited_${Date.now()}.png`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Save to media library
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      await MediaLibrary.createAlbumAsync('SnapLink', asset, false);

      Alert.alert('Thành công', 'Ảnh đã được lưu vào thư viện');
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Lỗi', 'Không thể lưu ảnh');
    }
  };

  const shareImage = async (): Promise<void> => {
    if (!editedImage) return;

    try {
      const base64Data = editedImage.replace('data:image/png;base64,', '');
      const filename = `snaplink_edited_${Date.now()}.png`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert('Lỗi', 'Tính năng chia sẻ không khả dụng');
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Lỗi', 'Không thể chia sẻ ảnh');
    }
  };

  const showImagePickerOptions = (): void => {
    Alert.alert(
      'Chọn ảnh',
      'Bạn muốn chọn ảnh từ đâu?',
      [
        { text: 'Thư viện', onPress: pickImage },
        { text: 'Chụp ảnh', onPress: takePicture },
        { text: 'Hủy', style: 'cancel' }
      ]
    );
  };

  const clearAll = (): void => {
    Alert.alert(
      'Xóa tất cả',
      'Bạn có chắc muốn xóa tất cả và bắt đầu lại?',
      [
        {
          text: 'Hủy',
          style: 'cancel'
        },
        {
          text: 'Xóa tất cả',
          style: 'destructive',
          onPress: () => {
            setSelectedImage(null);
            setPrompt('');
            setEditedImage(null);
            setTextResponse('');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Image Editor</Text>
        {(selectedImage || editedImage) && (
          <TouchableOpacity style={styles.clearButton} onPress={clearAll}>
            <Ionicons name="refresh-outline" size={20} color="#ff4444" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
        {!(selectedImage || editedImage) && <View style={styles.placeholder} />}
      </View>

      <ScrollView 
        style={styles.scrollContainer} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn ảnh để chỉnh sửa</Text>
          <TouchableOpacity style={styles.imagePickerButton} onPress={showImagePickerOptions}>
            {selectedImage ? (
              <Image 
                source={{ uri: selectedImage } as ImageSourcePropType} 
                style={styles.selectedImage} 
              />
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="camera" size={40} color="#666" />
                <Text style={styles.placeholderText}>Chọn ảnh PNG</Text>
                <Text style={styles.placeholderSubText}>Từ thư viện hoặc chụp mới</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Prompt Input */}
        {selectedImage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mô tả cách bạn muốn chỉnh sửa</Text>
            <TextInput
              style={styles.promptInput}
              placeholder="Ví dụ: Remove background, make it brighter, add vintage filter, change colors..."
              value={prompt}
              onChangeText={setPrompt}
              multiline
              textAlignVertical="top"
              placeholderTextColor="#999"
            />
            
            <TouchableOpacity 
              style={[styles.editButton, (!prompt.trim() || isLoading) && styles.editButtonDisabled]}
              onPress={editImage}
              disabled={!prompt.trim() || isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingButtonContent}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.editButtonText}>Đang xử lý...</Text>
                </View>
              ) : (
                <Text style={styles.editButtonText}>
                  {editedImage ? 'Thử lại' : 'Chỉnh sửa với AI'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>AI đang xử lý ảnh... (~10 giây)</Text>
            <Text style={styles.loadingSubText}>Vui lòng chờ trong giây lát</Text>
          </View>
        )}

        {/* Results */}
        {editedImage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Kết quả</Text>
            
            {/* Before/After Comparison */}
            <View style={styles.comparisonContainer}>
              <View style={styles.imageContainer}>
                <Text style={styles.imageLabel}>Trước</Text>
                <Image 
                  source={{ uri: selectedImage } as ImageSourcePropType} 
                  style={styles.comparisonImage} 
                />
              </View>
              <View style={styles.imageContainer}>
                <Text style={styles.imageLabel}>Sau</Text>
                <Image 
                  source={{ uri: editedImage } as ImageSourcePropType} 
                  style={styles.comparisonImage} 
                />
              </View>
            </View>

            {/* AI Response */}
            {textResponse && (
              <View style={styles.responseContainer}>
                <Text style={styles.responseTitle}>AI đã thực hiện:</Text>
                <Text style={styles.responseText}>{textResponse}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.tryAgainButton} onPress={editImage}>
                <Ionicons name="refresh" size={20} color="#007AFF" />
                <Text style={styles.tryAgainText}>Thử lại</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.saveButton} onPress={saveImage}>
                <Ionicons name="download" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Lưu ảnh</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareButton} onPress={shareImage}>
                <Ionicons name="share" size={20} color="#007AFF" />
                <Text style={styles.shareText}>Chia sẻ</Text>
              </TouchableOpacity>
            </View>

            {/* Clear All Button */}
            <TouchableOpacity style={styles.clearAllButton} onPress={clearAll}>
              <Ionicons name="trash-outline" size={20} color="#ff4444" />
              <Text style={styles.clearAllText}>Xóa tất cả và bắt đầu lại</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Tăng padding bottom để scroll được hết
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearButtonText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  imagePickerButton: {
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    resizeMode: 'cover',
  },
  placeholderContainer: {
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 8,
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  placeholderSubText: {
    marginTop: 4,
    color: '#999',
    fontSize: 14,
  },
  promptInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    height: 100,
    fontSize: 14,
    backgroundColor: '#f8f9fa',
    textAlignVertical: 'top',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  editButtonDisabled: {
    backgroundColor: '#ccc',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  loadingSubText: {
    marginTop: 4,
    color: '#999',
    fontSize: 14,
  },
  comparisonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  imageContainer: {
    flex: 1,
    marginHorizontal: 4,
  },
  imageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  comparisonImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  responseContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  responseTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  tryAgainButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  tryAgainText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#28a745',
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  shareText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#ff4444',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  clearAllText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
});