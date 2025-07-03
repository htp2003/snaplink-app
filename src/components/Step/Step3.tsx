import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../../hooks/useAuth'; // Import useAuth

interface Step3Props {
  onSelectAge?: (ageRange: string) => void;
}

const Step3: React.FC<Step3Props> = ({ onSelectAge }) => {
  const { getCurrentUserId, updateProfile } = useAuth(); // Lấy từ useAuth
  const userId = getCurrentUserId();
  const [year, setYear] = useState('');
  const [loading, setLoading] = useState(false);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 60 }, (_, i) => (currentYear - i - 18).toString()); // 18-77 years old

  // Convert birth year to age range
  const getAgeRange = (birthYear: string): string => {
    const age = currentYear - parseInt(birthYear);
    if (age >= 18 && age <= 25) return '18-25';
    if (age >= 26 && age <= 35) return '26-35';
    if (age >= 36 && age <= 45) return '36-45';
    if (age >= 46 && age <= 55) return '46-55';
    return '55+';
  };

  const handleContinue = async () => {
    if (!year) {
      Alert.alert('Lỗi', 'Vui lòng chọn năm sinh');
      return;
    }

    if (!userId) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin user');
      return;
    }

    setLoading(true);

    try {
      const ageRange = getAgeRange(year);
      
      // Update user profile with age range
      await updateProfile(userId, {
        ageRange: ageRange
      });

      onSelectAge?.(ageRange);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, marginTop: 0 }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111', textAlign: 'center', marginBottom: 24, letterSpacing: 0.5 }}>
          Chọn năm sinh của bạn
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
          Kéo để chọn năm sinh
        </Text>
        
        <View style={{ width: 140, height: 200, position: 'relative', justifyContent: 'center', alignItems: 'center', marginBottom: 0 }}>
          {/* Khung highlight giá trị chọn */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 85, 
              height: 45, 
              borderRadius: 12,
              borderWidth: 2,
              borderColor: '#111',
              backgroundColor: 'rgba(255,255,255,0.08)',
              zIndex: 10,
            }}
          />
          
          <Picker
            selectedValue={year}
            style={{
              width: 140,
              height: 200,
              backgroundColor: 'gray',
              borderRadius: 20,
            }}
            itemStyle={{
              fontSize: 30,
              fontWeight: 'bold',
              color: '#111',
              textAlign: 'center',
            }}
            onValueChange={(value: string) => setYear(value)}
            enabled={!loading}
          >
            <Picker.Item label="Chọn năm sinh" value="" />
            {years.map((y) => (
              <Picker.Item key={y} label={y} value={y} />
            ))}
          </Picker>
        </View>
        
        {/* Show age range preview */}
        {year && (
          <Text style={{ fontSize: 16, color: '#666', marginBottom: 20 }}>
            Độ tuổi: {getAgeRange(year)} tuổi
          </Text>
        )}
        
        <TouchableOpacity
          style={{
            backgroundColor: (!year || loading) ? '#bbb' : '#111',
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
            marginTop: 40, 
            opacity: (!year || loading) ? 0.6 : 1,
          }}
          onPress={handleContinue}
          disabled={!year || loading}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 }}>
            {loading ? 'Đang lưu...' : 'Tiếp tục'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Step3;