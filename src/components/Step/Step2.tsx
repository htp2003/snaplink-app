import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';




const Step2 = ({ onSelectGender }: { onSelectGender?: (gender: string) => void }) => {
    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <TouchableOpacity
                    style={[styles.roleButton, { backgroundColor: '#16AABF' }]}
                    onPress={() => onSelectGender && onSelectGender('male')}
                >

                    <Text style={styles.roleText}>
                        <Text style={{ fontSize: 30 }}>🙋🏻</Text>
                        Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.roleButton, { backgroundColor: '#875195' }]}
                    onPress={() => onSelectGender && onSelectGender('female')}
                >

                    <Text style={styles.roleText}>
                        <Text style={{ fontSize: 30 }}>🙋🏻</Text>
                        Female</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '90%',
        marginBottom: '1%'
    },
    roleButton: {
        flex: 1,
        marginHorizontal: 5,
        paddingVertical: 30,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    roleText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '500',
    },
});

export default Step2;
