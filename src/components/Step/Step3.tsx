import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

const Step3 = ({ onSelectRole }: { onSelectRole?: (age: number) => void }) => {
    const [age, setAge] = useState('');

    return (
        <View style={styles.container}>
            <Text style={styles.title}> Your age</Text>
            <TextInput
                style={styles.input}
                placeholder="Age"
                keyboardType="numeric"
                value={age}
                onChangeText={setAge}
                maxLength={2}
            />
            <TouchableOpacity
                style={styles.button}
                onPress={() => onSelectRole && onSelectRole(Number(age))}
                disabled={!age || isNaN(Number(age)) || Number(age) <= 0}
            >
                <Text style={styles.buttonText}>Next</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 24,
        color: '#fff',
    },
    input: {
        width: 120, 
        height: 48,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 12,
        fontSize: 20,
        paddingHorizontal: 16,
        marginBottom: 20,
        textAlign: 'center',
        backgroundColor: '#f8f8f8',
    },
    button: {
        backgroundColor: '#16AABF',
        paddingVertical: 14,
        paddingHorizontal: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default Step3;
