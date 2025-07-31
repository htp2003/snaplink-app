import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Image,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface UploadImageModalProps {
  visible: boolean;
  onClose: () => void;
  onUpload: (caption: string, isPrimary: boolean) => Promise<void>;
  imageUri: string;
  isUploading: boolean;
}

const UploadImageModal: React.FC<UploadImageModalProps> = ({
  visible,
  onClose,
  onUpload,
  imageUri,
  isUploading,
}) => {
  const [caption, setCaption] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);

  const handleUpload = async () => {
    await onUpload(caption, isPrimary);
    setCaption('');
    setIsPrimary(false);
  };

  const handleClose = () => {
    setCaption('');
    setIsPrimary(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
      }}>
        <View style={{
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          maxHeight: '80%',
        }}>
          <SafeAreaView>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 15,
              borderBottomWidth: 1,
              borderBottomColor: '#F0F0F0',
            }}>
              <TouchableOpacity
                onPress={handleClose}
                disabled={isUploading}
              >
                <Text style={{
                  fontSize: 16,
                  color: isUploading ? '#CCCCCC' : '#666666',
                }}>
                  Hủy
                </Text>
              </TouchableOpacity>
              
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: '#000000',
              }}>
                Thêm ảnh mới
              </Text>
              
              <TouchableOpacity
                onPress={handleUpload}
                disabled={isUploading}
                style={{
                  backgroundColor: isUploading ? '#CCCCCC' : '#000000',
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 15,
                }}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{
                    color: '#FFFFFF',
                    fontWeight: '600',
                    fontSize: 14,
                  }}>
                    Thêm
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500 }}>
              {/* Image Preview */}
              <View style={{
                paddingHorizontal: 20,
                paddingTop: 20,
                alignItems: 'center',
              }}>
                <View style={{
                  width: width - 80,
                  height: width - 80,
                  borderRadius: 12,
                  overflow: 'hidden',
                  backgroundColor: '#F5F5F5',
                }}>
                  <Image
                    source={{ uri: imageUri }}
                    style={{ width: '100%', height: '100%' }}
                    resizeMode="cover"
                  />
                </View>
              </View>

              {/* Caption Input */}
              <View style={{
                paddingHorizontal: 20,
                paddingTop: 20,
              }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#000000',
                  marginBottom: 10,
                }}>
                  Mô tả ảnh
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#E0E0E0',
                    borderRadius: 12,
                    paddingHorizontal: 15,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: '#000000',
                    minHeight: 80,
                    textAlignVertical: 'top',
                  }}
                  placeholder="Thêm mô tả cho ảnh của bạn..."
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                  maxLength={200}
                  editable={!isUploading}
                />
                <Text style={{
                  fontSize: 12,
                  color: '#999999',
                  textAlign: 'right',
                  marginTop: 5,
                }}>
                  {caption.length}/200
                </Text>
              </View>

              {/* Primary Image Toggle */}
              <View style={{
                paddingHorizontal: 20,
                paddingTop: 20,
                paddingBottom: 30,
              }}>
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 15,
                    paddingHorizontal: 15,
                    backgroundColor: '#F8F8F8',
                    borderRadius: 12,
                  }}
                  onPress={() => setIsPrimary(!isPrimary)}
                  disabled={isUploading}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#000000',
                      marginBottom: 4,
                    }}>
                      Đặt làm ảnh đại diện
                    </Text>
                    <Text style={{
                      fontSize: 14,
                      color: '#666666',
                    }}>
                      Ảnh này sẽ hiển thị đầu tiên trong portfolio
                    </Text>
                  </View>
                  
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: isPrimary ? '#000000' : '#CCCCCC',
                    backgroundColor: isPrimary ? '#000000' : 'transparent',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginLeft: 15,
                  }}>
                    {isPrimary && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

export default UploadImageModal;