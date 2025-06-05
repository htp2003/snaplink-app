import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';

const stylesList = [
    "Portrait", "Landscape", "Street", "Fashion", "Wedding",
    "Food", "Product", "Event", "Travel",
];

const Step4 = ({ onSelectRole }: { onSelectRole?: (styles: string[]) => void }) => {
    const navigation = useNavigation<RootStackNavigationProp>();
    const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
    const [error, setError] = useState('');

    const handleSelect = (style: string) => {
        if (selectedStyles.includes(style)) {
            setSelectedStyles(selectedStyles.filter(s => s !== style));
        } else if (selectedStyles.length < 3) {
            setSelectedStyles([...selectedStyles, style]);
        }
        setError('');
    };

    const handleComplete = () => {
        if (selectedStyles.length < 3) {
            setError('Hãy chọn đủ 3 phong cách trước khi hoàn tất.');
            return;
        }
        if (onSelectRole) onSelectRole(selectedStyles);
    };

    return (
        <View style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'center', paddingHorizontal: 8, marginTop: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111', textAlign: 'center', marginBottom: 18, letterSpacing: 0.5 }}>
                Chọn 3 phong cách bạn thích
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10, marginTop: 10 }}>
                {stylesList.map((style) => {
                    const selected = selectedStyles.includes(style);
                    const disabled = !selected && selectedStyles.length >= 3;
                    return (
                        <TouchableOpacity
                            key={style}
                            activeOpacity={0.8}
                            onPress={() => handleSelect(style)}
                            disabled={disabled}
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
                                opacity: disabled ? 0.4 : 1,
                                position: 'relative',
                            }}
                        >
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: selected ? '#111' : '#333', letterSpacing: 0.5 }}>
                                {style}
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
            {error ? (
                <Text style={{ color: 'red', fontSize: 14, textAlign: 'center', marginBottom: 12 }}>{error}</Text>
            ) : null}
            <TouchableOpacity
                style={{
                    backgroundColor: selectedStyles.length === 3 ? '#111' : '#bbb',
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
                    opacity: selectedStyles.length === 3 ? 1 : 0.6,
                }}
                onPress={handleComplete}
                disabled={selectedStyles.length !== 3}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 }}>
                    Hoàn tất
                </Text>
            </TouchableOpacity>
        </View>
    );
};


export default Step4;