import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';

const stylesList = [
    "Portrait", "Landscape", "Street", "Fashion", "Wedding",
    "Food", "Product", "Event", "Travel"
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
            setError('Please select exactly 3 styles before completing.');
            return;
        }
        if (onSelectRole) {
            onSelectRole(selectedStyles);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Select up to 3 styles</Text>
            <View style={styles.grid}>
                {stylesList.map((style) => {
                    const isSelected = selectedStyles.includes(style);
                    const isDisabled = !isSelected && selectedStyles.length >= 3;
                    return (
                        <TouchableOpacity
                            key={style}
                            style={[
                                styles.styleButton,
                                isSelected && styles.selectedButton,
                                isDisabled && styles.disabledButton
                            ]}
                            onPress={() => handleSelect(style)}
                            disabled={isDisabled}
                        >
                            <Text style={[
                                styles.styleText,
                                isSelected && styles.selectedText,
                                isDisabled && styles.disabledText
                            ]}>
                                {style}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <TouchableOpacity
                style={styles.completeButton}
                onPress={handleComplete}
            >
                <Text style={styles.completeButtonText}>Finish</Text>
            </TouchableOpacity>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, alignItems: 'center', },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#fff', },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center'
    },
    styleButton: {
        backgroundColor: '#eee',
        margin: 8,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 16,
        minWidth: 100,
        alignItems: 'center',
    },
    selectedButton: {
        backgroundColor: '#16AABF',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    styleText: {
        color: '#222',
        fontSize: 18,
    },
    selectedText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    disabledText: {
        color: '#888',
    },
    completeButton: {
        marginTop: 32,
        backgroundColor: '#16AABF',
        paddingVertical: 16,
        paddingHorizontal: 48,
        borderRadius: 24,
        alignItems: 'center',
    },
    completeButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    errorText: {
        color: 'red',
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center',
    },
});

export default Step4;