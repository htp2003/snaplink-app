import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const Step1 = ({ onSelectRole }: { onSelectRole?: (role: string) => void }) => {
    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <TouchableOpacity
                    style={[styles.roleButton, { backgroundColor: '#16AABF' }]}
                    onPress={() => onSelectRole && onSelectRole('customer')}
                >
                    <Text style={styles.roleText}>Customer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.roleButton, { backgroundColor: '#875195' }]}
                    onPress={() => onSelectRole && onSelectRole('photographer')}
                >
                    <Text style={styles.roleText}>Photographer</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.rowCenter}>
                <TouchableOpacity
                    style={[styles.roleButton, { backgroundColor: '#457DC0' }]}
                    onPress={() => onSelectRole && onSelectRole('location')}
                >
                    <Text style={styles.roleText}>Location</Text>
                </TouchableOpacity>
            </View>
        </View>
    )
}


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
    rowCenter: {
        flexDirection: 'row',
        justifyContent: 'center',
        width: '90%',
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

export default Step1;
