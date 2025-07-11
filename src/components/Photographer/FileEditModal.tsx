import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileField {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  placeholder: string;
  question: string;
  description: string;
  maxLength: number;
  fieldType: 'text' | 'number' | 'select';
  options?: string[];
}

interface FieldEditModalProps {
  visible: boolean;
  field: ProfileField | null;
  onClose: () => void;
  onSave: (fieldId: string, value: string) => void;
}

const FieldEditModal: React.FC<FieldEditModalProps> = ({
  visible,
  field,
  onClose,
  onSave,
}) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (field) {
      setInputValue(field.value || '');
    }
  }, [field]);

  const handleSave = () => {
    if (field) {
      onSave(field.id, inputValue);
    }
    onClose();
  };

  const handleClose = () => {
    setInputValue(field?.value || '');
    onClose();
  };

  if (!field) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: '#F0F0F0',
          }}>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="#000000" />
            </TouchableOpacity>
            
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#000000',
            }}>
              Chỉnh sửa Hồ sơ
            </Text>
            
            <View style={{ width: 24 }} />
          </View>

          {/* Content */}
          <View style={{ flex: 1, padding: 20 }}>
            <Text style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: '#000000',
              marginBottom: 16,
            }}>
              {field.question}
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: '#666666',
              marginBottom: 24,
              lineHeight: 22,
            }}>
              {field.description}{' '}
              <Text style={{ textDecorationLine: 'underline' }}>
                Phần này được hiển thị ở đâu?
              </Text>
            </Text>

            {field.fieldType === 'select' ? (
              <View style={{ gap: 12 }}>
                {field.options?.map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setInputValue(option)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      padding: 16,
                      borderWidth: 2,
                      borderColor: inputValue === option ? '#000000' : '#E5E5E5',
                      borderRadius: 8,
                      backgroundColor: inputValue === option ? '#F5F5F5' : '#FFFFFF',
                    }}
                  >
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: inputValue === option ? '#000000' : '#E5E5E5',
                      backgroundColor: inputValue === option ? '#000000' : '#FFFFFF',
                      marginRight: 12,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {inputValue === option && (
                        <View style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: '#FFFFFF',
                        }} />
                      )}
                    </View>
                    <Text style={{
                      fontSize: 16,
                      color: '#000000',
                      fontWeight: inputValue === option ? '600' : '400',
                    }}>
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={{
                borderWidth: 2,
                borderColor: inputValue ? '#000000' : '#E5E5E5',
                borderRadius: 8,
                padding: 16,
                marginBottom: 8,
                minHeight: 56,
              }}>
                <TextInput
                  style={{
                    fontSize: 16,
                    color: '#000000',
                    flex: 1,
                  }}
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder={field.placeholder}
                  placeholderTextColor="#999999"
                  multiline={field.fieldType === 'text'}
                  keyboardType={field.fieldType === 'number' ? 'numeric' : 'default'}
                  maxLength={field.maxLength}
                  autoFocus
                />
              </View>
            )}
            
            {field.fieldType !== 'select' && (
              <Text style={{
                fontSize: 12,
                color: '#666666',
              }}>
                {inputValue.length}/{field.maxLength} ký tự
              </Text>
            )}
          </View>

          {/* Save Button */}
          <View style={{ padding: 20, paddingTop: 0 }}>
            <TouchableOpacity
              onPress={handleSave}
              style={{
                backgroundColor: '#000000',
                paddingVertical: 16,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '600',
              }}>
                Lưu
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default FieldEditModal;