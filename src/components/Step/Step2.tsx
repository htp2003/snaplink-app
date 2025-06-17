import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const GENDERS = [
  {
    key: 'male',
    label: 'Nam',
    icon: 'gender-male',
    color: ['#36d1c4', '#1e3799'],
    iconColor: '#fff',
  },
  {
    key: 'female',
    label: 'Nữ',
    icon: 'gender-female',
    color: ['#ff758c', '#ff7eb3'],
    iconColor: '#fff',
  },
];

const Step2 = ({ onSelectGender }: { onSelectGender?: (gender: string) => void }) => {
  const [selectedGender, setSelectedGender] = useState<string | null>(null);
  const cardWidth = width / 2 - 18;
  const cardHeight = height * 0.2;
  const iconSize = cardHeight * 0.6;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: Platform.OS === 'ios' ? 32 : 20 }}>
        {GENDERS.map((gender, idx) => {
          const isSelected = selectedGender === gender.key;
          return (
            <TouchableOpacity
              key={gender.key}
              activeOpacity={0.85}
              onPress={() => {
                setSelectedGender(gender.key);
              }}
              style={{
                width: cardWidth,
                height: cardHeight,
                marginHorizontal: 8,
                borderRadius: 20,
                overflow: 'hidden',
                borderWidth: 3,
                borderColor: gender.color[0],
                backgroundColor: isSelected ? undefined : '#fff',
                shadowColor: isSelected ? gender.color[0] : '#000',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: isSelected ? 0.24 : 0.09,
                shadowRadius: isSelected ? 16 : 8,
                elevation: isSelected ? 6 : 2,
                justifyContent: 'center',
                alignItems: 'center',
                borderStyle: 'solid',
              }}
            >
              {isSelected ? (
                <LinearGradient
                  colors={gender.color as [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ flex: 1, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: 20 }}
                >
                  <Icon name={gender.icon} size={iconSize} color="#fff" style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.18)', textShadowRadius: 4, letterSpacing: 0.5 }}>
                    {gender.label}
                  </Text>
                </LinearGradient>
              ) : (
                <View style={{ flex: 1, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: 20, borderWidth: 2, borderColor: '#fff', backgroundColor: '#fff' }}>
                  <Icon name={gender.icon} size={iconSize} color={gender.color[0]} style={{ marginBottom: 8 }} />
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: gender.color[0], textAlign: 'center', letterSpacing: 0.5 }}>
                    {gender.label}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {/* Button Tiếp tục */}
      {selectedGender && (
        <View style={{ width: '100%', paddingHorizontal: 24, marginBottom: 28 }}>
          <TouchableOpacity
            activeOpacity={0.87}
            onPress={() => onSelectGender && onSelectGender(selectedGender)}
            style={{
              backgroundColor: '#111',
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#222',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.18,
              shadowRadius: 8,
              elevation: 4,
              marginBottom: 10,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }}>
              Tiếp tục
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default Step2;
