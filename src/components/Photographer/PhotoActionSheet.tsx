import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface PhotoActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectCamera: () => void;
  onSelectGallery: () => void;
  onSelectMultiple: () => void;
  title?: string;
  subtitle?: string;
}

const PhotoActionSheet: React.FC<PhotoActionSheetProps> = ({
  visible,
  onClose,
  onSelectCamera,
  onSelectGallery,
  onSelectMultiple,
  title = "Add Photos",
  subtitle = "Choose how you'd like to add photos to your portfolio",
}) => {
  const slideAnim = React.useRef(new Animated.Value(300)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const actions = [
    {
      id: 'camera',
      title: 'Take Photo',
      subtitle: 'Use camera to take a new photo',
      icon: 'camera',
      color: '#4A90E2',
      onPress: () => {
        onClose();
        setTimeout(onSelectCamera, 300);
      },
    },
    {
      id: 'gallery',
      title: 'Choose from Gallery',
      subtitle: 'Select a single photo from your gallery',
      icon: 'image',
      color: '#7ED321',
      onPress: () => {
        onClose();
        setTimeout(onSelectGallery, 300);
      },
    },
    {
      id: 'multiple',
      title: 'Multiple Photos',
      subtitle: 'Select multiple photos at once',
      icon: 'images',
      color: '#F5A623',
      onPress: () => {
        onClose();
        setTimeout(onSelectMultiple, 300);
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
        opacity: fadeAnim,
      }}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
        
        <Animated.View style={{
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          transform: [{ translateY: slideAnim }],
        }}>
          <SafeAreaView>
            {/* Header */}
            <View style={{
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 10,
              alignItems: 'center',
            }}>
              {/* Handle Bar */}
              <View style={{
                width: 40,
                height: 4,
                backgroundColor: '#E0E0E0',
                borderRadius: 2,
                marginBottom: 20,
              }} />
              
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#000000',
                marginBottom: 8,
              }}>
                {title}
              </Text>
              
              <Text style={{
                fontSize: 14,
                color: '#666666',
                textAlign: 'center',
                paddingHorizontal: 20,
              }}>
                {subtitle}
              </Text>
            </View>

            {/* Actions */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              {actions.map((action, index) => (
                <TouchableOpacity
                  key={action.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    backgroundColor: '#F8F8F8',
                    borderRadius: 12,
                    marginBottom: index < actions.length - 1 ? 12 : 0,
                  }}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                >
                  <View style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: `${action.color}15`,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 16,
                  }}>
                    <Ionicons 
                      name={action.icon as any} 
                      size={24} 
                      color={action.color} 
                    />
                  </View>
                  
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: '#000000',
                      marginBottom: 2,
                    }}>
                      {action.title}
                    </Text>
                    <Text style={{
                      fontSize: 13,
                      color: '#666666',
                    }}>
                      {action.subtitle}
                    </Text>
                  </View>
                  
                  <Ionicons 
                    name="chevron-forward" 
                    size={20} 
                    color="#CCCCCC" 
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Cancel Button */}
            <View style={{
              paddingHorizontal: 20,
              paddingBottom: 20,
              borderTopWidth: 1,
              borderTopColor: '#F0F0F0',
              marginTop: 10,
            }}>
              <TouchableOpacity
                style={{
                  paddingVertical: 16,
                  alignItems: 'center',
                  backgroundColor: '#F5F5F5',
                  borderRadius: 12,
                  marginTop: 20,
                }}
                onPress={onClose}
              >
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#666666',
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default PhotoActionSheet;