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
  ImageSourcePropType,
  Modal,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { 
  GestureHandlerRootView, 
  PinchGestureHandler, 
  PanGestureHandler,
  State
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface EditImageResponse {
  success: boolean;
  message: string;
  imageBase64?: string;
  textResponse?: string;
  error?: string;
}

interface ZoomImageModalProps {
  visible: boolean;
  imageUri: string;
  title: string;
  onClose: () => void;
}

// Cấu hình resize
const RESIZE_CONFIG = {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 0.8,
  format: ImageManipulator.SaveFormat.PNG
};

const BASE_URL = "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

// Component Modal zoom ảnh
function ZoomImageModal({ visible, imageUri, title, onClose }: ZoomImageModalProps): JSX.Element {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const resetTransform = () => {
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinchHandler = useAnimatedGestureHandler({
    onStart: () => {
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    },
    onActive: (event) => {
      scale.value = Math.max(0.5, Math.min(savedScale.value, 3));
    },
    onEnd: () => {
      if (scale.value < 1) {
        scale.value = withTiming(1);
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
      }
    },
  });

  const panHandler = useAnimatedGestureHandler({
    onStart: () => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    },
    onActive: (event) => {
      if (scale.value > 1) {
        const maxTranslateX = (width * (scale.value - 1)) / 2;
        const maxTranslateY = (height * (scale.value - 1)) / 2;
        
        translateX.value = Math.max(
          -maxTranslateX,
          Math.min(maxTranslateX, savedTranslateX.value + event.translationX)
        );
        translateY.value = Math.max(
          -maxTranslateY,
          Math.min(maxTranslateY, savedTranslateY.value + event.translationY)
        );
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const handleClose = () => {
    resetTransform();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.9)" barStyle="light-content" />
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity style={styles.modalCloseButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Zoom controls */}
        <View style={styles.zoomControls}>
          <TouchableOpacity 
            style={styles.zoomButton}
            onPress={() => {
              scale.value = withTiming(Math.min(scale.value + 0.5, 3));
            }}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.zoomButton}
            onPress={() => {
              scale.value = withTiming(Math.max(scale.value - 0.5, 0.5));
              if (scale.value <= 1) {
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
              }
            }}
          >
            <Ionicons name="remove" size={20} color="#fff" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.resetButton}
            onPress={resetTransform}
          >
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Image container */}
        <GestureHandlerRootView style={styles.gestureContainer}>
          <PanGestureHandler onGestureEvent={panHandler}>
            <Animated.View style={styles.imageWrapper}>
              <PinchGestureHandler onGestureEvent={pinchHandler}>
                <Animated.View style={animatedStyle}>
                  <Image
                    source={{ uri: imageUri } as ImageSourcePropType}
                    style={styles.modalImage}
                    resizeMode="contain"
                  />
                </Animated.View>
              </PinchGestureHandler>
            </Animated.View>
          </PanGestureHandler>
        </GestureHandlerRootView>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            Pinch để zoom • Kéo để di chuyển • Tap để đóng
          </Text>
        </View>
      </View>
    </Modal>
  );
}

export default function SnapLinkAIEditor(): JSX.Element {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState<{width: number, height: number} | null>(null);
  const [resizedImageSize, setResizedImageSize] = useState<{width: number, height: number} | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [textResponse, setTextResponse] = useState<string>('');
  
  // Zoom modal states
  const [showZoomModal, setShowZoomModal] = useState<boolean>(false);
  const [zoomImageUri, setZoomImageUri] = useState<string>('');
  const [zoomImageTitle, setZoomImageTitle] = useState<string>('');

  // Hàm mở modal zoom
  const openZoomModal = (imageUri: string, title: string) => {
    setZoomImageUri(imageUri);
    setZoomImageTitle(title);
    setShowZoomModal(true);
  };

  // Hàm resize ảnh
  const resizeImage = async (imageUri: string): Promise<string> => {
    try {
      setIsResizing(true);
      
      const imageInfo = await FileSystem.getInfoAsync(imageUri);
      if (imageInfo.exists) {
        console.log('Original file size:', (imageInfo.size! / 1024 / 1024).toFixed(2), 'MB');
      }

      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            resize: {
              width: RESIZE_CONFIG.maxWidth,
              height: RESIZE_CONFIG.maxHeight,
            }
          }
        ],
        {
          compress: RESIZE_CONFIG.quality,
          format: RESIZE_CONFIG.format,
          base64: false,
        }
      );

      const resizedInfo = await FileSystem.getInfoAsync(manipulatedImage.uri);
      if (resizedInfo.exists) {
        console.log('Resized file size:', (resizedInfo.size! / 1024 / 1024).toFixed(2), 'MB');
      }

      setOriginalImageSize({width: manipulatedImage.width, height: manipulatedImage.height});
      setResizedImageSize({width: manipulatedImage.width, height: manipulatedImage.height});

      return manipulatedImage.uri;
    } catch (error) {
      console.error('Error resizing image:', error);
      throw new Error('Không thể resize ảnh');
    } finally {
      setIsResizing(false);
    }
  };

  const pickImage = async (): Promise<void> => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần quyền truy cập thư viện ảnh để tiếp tục');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setOriginalImageSize({width: asset.width || 0, height: asset.height || 0});
        const resizedUri = await resizeImage(asset.uri);
        setSelectedImage(resizedUri);
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
        const asset = result.assets[0];
        setOriginalImageSize({width: asset.width || 0, height: asset.height || 0});
        const resizedUri = await resizeImage(asset.uri);
        setSelectedImage(resizedUri);
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

      const base64Data = editedImage.replace('data:image/png;base64,', '');
      const filename = `snaplink_edited_${Date.now()}.png`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      
      await FileSystem.writeAsStringAsync(fileUri, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });

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
            setOriginalImageSize(null);
            setResizedImageSize(null);
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
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
              <>
                <Image 
                  source={{ uri: selectedImage } as ImageSourcePropType} 
                  style={styles.selectedImage} 
                />
                {resizedImageSize && (
                  <View style={styles.imageInfoOverlay}>
                    <Text style={styles.imageInfoText}>
                      {resizedImageSize.width} × {resizedImageSize.height}px
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="camera" size={40} color="#666" />
                <Text style={styles.placeholderText}>Chọn ảnh</Text>
                <Text style={styles.placeholderSubText}>Từ thư viện hoặc chụp mới</Text>
                <Text style={styles.placeholderSubText}>
                  (Ảnh sẽ được tối ưu về {RESIZE_CONFIG.maxWidth}×{RESIZE_CONFIG.maxHeight}px)
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {isResizing && (
            <View style={styles.resizeStatus}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.resizeStatusText}>Đang tối ưu ảnh...</Text>
            </View>
          )}
        </View>

        {/* Prompt Input */}
        {selectedImage && !isResizing && (
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
            <Text style={styles.loadingText}>AI đang xử lý ảnh...</Text>
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
                <TouchableOpacity 
                  onPress={() => openZoomModal(selectedImage!, 'Ảnh gốc')}
                  style={styles.zoomableImageContainer}
                >
                  <Image 
                    source={{ uri: selectedImage } as ImageSourcePropType} 
                    style={styles.comparisonImage} 
                  />
                  <View style={styles.zoomIndicator}>
                    <Ionicons name="expand" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
              <View style={styles.imageContainer}>
                <Text style={styles.imageLabel}>Sau</Text>
                <TouchableOpacity 
                  onPress={() => openZoomModal(editedImage, 'Ảnh đã chỉnh sửa')}
                  style={styles.zoomableImageContainer}
                >
                  <Image 
                    source={{ uri: editedImage } as ImageSourcePropType} 
                    style={styles.comparisonImage} 
                  />
                  <View style={styles.zoomIndicator}>
                    <Ionicons name="expand" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* Zoom instruction */}
            <Text style={styles.zoomInstruction}>
              💡 Nhấn vào ảnh để zoom và xem chi tiết
            </Text>

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

      {/* Zoom Modal */}
      <ZoomImageModal
        visible={showZoomModal}
        imageUri={zoomImageUri}
        title={zoomImageTitle}
        onClose={() => setShowZoomModal(false)}
      />
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
    paddingBottom: 120,
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
    position: 'relative',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    resizeMode: 'cover',
  },
  imageInfoOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  imageInfoText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
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
    fontSize: 12,
    textAlign: 'center',
  },
  resizeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  resizeStatusText: {
    marginLeft: 8,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  imageSizeInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  imageSizeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  imageSizeText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
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
  zoomableImageContainer: {
    position: 'relative',
  },
  comparisonImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  zoomIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomInstruction: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
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
  
  // Zoom Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  zoomControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 15,
  },
  zoomButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  gestureContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: width,
    height: height * 0.6,
    maxWidth: width,
    maxHeight: height * 0.6,
  },
  instructionsContainer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  instructionsText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});