import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';

const Step3 = ({ onSelectRole }: { onSelectRole?: (age: number) => void }) => {
    const [year, setYear] = useState('');
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 30 }, (_, i) => (currentYear - i - 18).toString()); // 2015 -> 1926

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
                  >
                    <Picker.Item label="Chọn năm sinh" value="" />
                    {years.map((y) => (
                      <Picker.Item key={y} label={y} value={y} />
                    ))}
                  </Picker>
                </View>
                <TouchableOpacity
                    style={{
                        backgroundColor: '#111',
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
                        opacity: !year ? 0.6 : 1,
                    }}
                    onPress={() => onSelectRole && onSelectRole(Number(year))}
                    disabled={!year}
                >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 }}>
                        Tiếp tục
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         alignItems: 'center',
//     },
//     title: {
//         fontSize: 22,
//         fontWeight: 'bold',
//         marginBottom: 24,
//         color: '#fff',
//     },
//     input: {
//         width: 20, 
//         height: 48,
//         borderWidth: 1,
//         borderColor: '#ccc',
//         borderRadius: 12,
//         fontSize: 20,
//         paddingHorizontal: 16,
//         marginBottom: 20,
//         textAlign: 'center',
//         backgroundColor: '#f8f8f8',
//     },
//     button: {
//         backgroundColor: '#16AABF',
//         paddingVertical: 14,
//         paddingHorizontal: 40,
//         borderRadius: 20,
//         alignItems: 'center',
//         justifyContent: 'center',
//     },
//     buttonText: {
//         color: '#fff',
//         fontSize: 18,
//         fontWeight: 'bold',
//     },
// });

export default Step3;
