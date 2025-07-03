import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth'; // Import useAuth

// Updated styles list to match photo concepts
const PHOTO_CONCEPTS = [
  "Portrait", "Couple", "Family", "Fashion", 
  "Lifestyle", "Travel", "Event", "Maternity", 
  "Graduation", "Wedding", "Street", "Product"
];

interface Step4Props {
  selectedRole: string;
  onComplete?: (concepts: string[]) => void;
}

const Step4: React.FC<Step4Props> = ({ selectedRole, onComplete }) => {
  const navigation = useNavigation();
  const { getCurrentUserId, updateProfile } = useAuth(); // Lấy từ useAuth
  const userId = getCurrentUserId();
  const [selectedConcepts, setSelectedConcepts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSelect = (concept: string) => {
    if (selectedConcepts.includes(concept)) {
      setSelectedConcepts(selectedConcepts.filter(c => c !== concept));
    } else if (selectedConcepts.length < 3) {
      setSelectedConcepts([...selectedConcepts, concept]);
    }
    setError('');
  };

  const handleComplete = async () => {
    if (selectedConcepts.length < 3) {
      setError('Hãy chọn đủ 3 concept trước khi hoàn tất.');
      return;
    }

    if (!userId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin user');
      return;
    }

    setLoading(true);

    try {
      // Update user preferences with selected concepts
      await updateProfile(userId, {
        interests: selectedConcepts
      });

      // Call completion callback
      onComplete?.(selectedConcepts);
      
      // Navigate to main app based on role
      if (selectedRole === 'photographer') {
        navigation.navigate('PhotographerDashboard' as never);
      } else if (selectedRole === 'locationowner') {
        navigation.navigate('LocationOwnerDashboard' as never);
      } else {
        navigation.navigate('UserDashboard' as never);
      }

    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi hoàn tất thiết lập');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingHorizontal: 8, marginTop: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111', textAlign: 'center', marginBottom: 8, letterSpacing: 0.5 }}>
        Chọn 3 concept yêu thích
      </Text>
      <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 18, paddingHorizontal: 16 }}>
        Để chúng tôi gợi ý những nhiếp ảnh gia và địa điểm phù hợp nhất
      </Text>
      
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10, marginTop: 10 }}>
        {PHOTO_CONCEPTS.map((concept) => {
          const selected = selectedConcepts.includes(concept);
          const disabled = !selected && selectedConcepts.length >= 3;
          return (
            <TouchableOpacity
              key={concept}
              activeOpacity={0.8}
              onPress={() => handleSelect(concept)}
              disabled={disabled || loading}
              style={{
                width: 150,
                height: 60,
                margin: 8,
                backgroundColor: selected ? '#e5e7eb' : '#fff',
                borderRadius: 16,
                borderWidth: 2.5,
                borderColor: selected ? '#111' : '#bbb',
                shadowColor: selected ? '#111' : '#000',
                shadowOffset: { width: 0, height: selected ? 6 : 4 },
                shadowOpacity: selected ? 0.18 : 0.09,
                shadowRadius: selected ? 12 : 8,
                elevation: selected ? 4 : 2,
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'row',
                opacity: (disabled || loading) ? 0.4 : 1,
                position: 'relative',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: selected ? '#111' : '#333', letterSpacing: 0.5 }}>
                {concept}
              </Text>
              {selected && (
                <View style={{ marginLeft: 10, width: 26, height: 26, borderRadius: 13, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Selected count indicator */}
      <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
        Đã chọn: {selectedConcepts.length}/3 concept
      </Text>
      
      {error ? (
        <Text style={{ color: 'red', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>
          {error}
        </Text>
      ) : null}
      
      <TouchableOpacity
        style={{
          backgroundColor: (selectedConcepts.length === 3 && !loading) ? '#111' : '#bbb',
          borderRadius: 16,
          paddingVertical: 16,
          paddingHorizontal: 56,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#222',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 4,
          marginTop: 18,
          opacity: (selectedConcepts.length === 3 && !loading) ? 1 : 0.6,
        }}
        onPress={handleComplete}
        disabled={selectedConcepts.length !== 3 || loading}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 }}>
          {loading ? 'Đang hoàn tất...' : 'Hoàn tất'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default Step4;