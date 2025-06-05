import StepIndicator from 'react-native-step-indicator';
import { useState, useEffect } from 'react';
import { View, Dimensions, StatusBar } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const getBg = (role: string | null) => {
    
    if (role === 'photographer') return require('../../../assets/slider2.png');
    if (role === 'location') return require('../../../assets/slider3.png');
    return null;
};


const StepContainer = () => {
    const [currentPosition, setCurrentPosition] = useState(0);
    const [maxStep, setMaxStep] = useState(0);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const { height } = Dimensions.get('window');
    const stepIndicatorMarginTop = height * 0.15;
    // const stepIndicatorMarginBottom = height * 0;
    const navigation = useNavigation<RootStackNavigationProp>();

    const bgSource = currentPosition === 0 ? null : getBg(selectedRole);

    const handleStepPress = (step: number) => {
        if (selectedRole === 'location') {
            // Chỉ cho phép quay lại Step 1 or Step 4
            if (step === 0 || step === 3) {
                setCurrentPosition(step);
            }
        } else {
            if (step <= maxStep) {
                setCurrentPosition(step);
            }
        };
    }

    return (
        <LinearGradient
            colors={['#fff', '#d1d5db', '#222']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
        >
                <StatusBar backgroundColor="#000" barStyle="light-content" />
                <View style={{ flex: 1 }}>
                    <View style={{ marginTop: stepIndicatorMarginTop}}>
                        <StepIndicator
                            customStyles={customStyles}
                            currentPosition={currentPosition}
                            stepCount={4}
                            labels={['Vai trò', 'Giới tính', 'Tuổi', 'Phong cách']}
                            onPress={handleStepPress}
                        />
                </View>
                {/* Render step content ở đây */}
                {currentPosition === 0 && (
                    <Step1 onSelectRole={(role) => {
                        setSelectedRole(role);
                        if (role === 'location') {
                            setCurrentPosition(3);
                            setMaxStep(3);
                        } else {
                            setCurrentPosition(1);
                            setMaxStep(1);
                        }
                    }} />
                )}
                {currentPosition === 1 && (
                    <Step2
                        onSelectGender={(gender) => {
                            setCurrentPosition(2);
                            setMaxStep((prev) => Math.max(prev, 2));
                        }}
                    />
                )}
                {currentPosition === 2 && <Step3 onSelectRole={(age) => {
                    setCurrentPosition(3);
                    setMaxStep((prev) => Math.max(prev, 3));
                }} />}
                {currentPosition === 3 && <Step4 onSelectRole={(styles) => {
                    // Lưu role vào AsyncStorage trước khi chuyển hướng
                    const saveRoleAndNavigate = async () => {
                        try {
                            await AsyncStorage.setItem('userRole', selectedRole || '');
                            // Lưu thêm styles nếu cần
                            if (styles && styles.length > 0) {
                                await AsyncStorage.setItem('userStyles', JSON.stringify(styles));
                            }
                            
                            // Chuyển hướng tới stack tương ứng dựa trên role
                            if (selectedRole === 'customer') {
                                navigation.navigate('CustomerMain');
                            } else if (selectedRole === 'photographer') {
                                navigation.navigate('PhotographerMain');
                            } else if (selectedRole === 'location') {
                                navigation.navigate('VenueOwnerMain');
                            }
                        } catch (error) {
                            console.error('Error saving role to AsyncStorage:', error);
                        }
                    };
                    
                    saveRoleAndNavigate();
                }} />}
            </View>
        
        </LinearGradient>
    );
};

const customStyles = {
  stepIndicatorSize: 36,
  currentStepIndicatorSize: 44,
  separatorStrokeWidth: 3,
  currentStepStrokeWidth: 4,
  stepStrokeCurrentColor: '#111',
  stepStrokeWidth: 3,
  stepStrokeFinishedColor: '#222',
  stepStrokeUnFinishedColor: '#bbb',
  separatorFinishedColor: '#222',
  separatorUnFinishedColor: '#eee',
  stepIndicatorFinishedColor: '#222',
  stepIndicatorUnFinishedColor: '#fff',
  stepIndicatorCurrentColor: '#111',
  stepIndicatorLabelFontSize: 16,
  currentStepIndicatorLabelFontSize: 18,
  stepIndicatorLabelCurrentColor: '#fff',
  stepIndicatorLabelFinishedColor: '#fff',
  stepIndicatorLabelUnFinishedColor: '#bbb',
  labelColor: '#888',
  labelSize: 14,
  currentStepLabelColor: '#111',
};
export default StepContainer;