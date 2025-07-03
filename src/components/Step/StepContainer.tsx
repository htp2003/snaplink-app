import StepIndicator from 'react-native-step-indicator';
import { useState, useEffect } from 'react';
import { View, Dimensions, StatusBar, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useCurrentUserId } from '../../hooks/useAuth';

const getBg = (role: string | null) => {
    if (role === 'photographer') return require('../../../assets/slider2.png');
    if (role === 'locationowner') return require('../../../assets/slider3.png'); // Changed from 'location'
    return null;
};

const StepContainer = () => {
    const [currentPosition, setCurrentPosition] = useState(0);
    const [maxStep, setMaxStep] = useState(0);
    const [selectedRole, setSelectedRole] = useState<string | null>(null);
    const [userData, setUserData] = useState<any>({});
    const { height } = Dimensions.get('window');
    const stepIndicatorMarginTop = height * 0.15;
    const navigation = useNavigation<RootStackNavigationProp>();
    const { user, updateProfile } = useAuth();
    const userId = useCurrentUserId();

    const bgSource = currentPosition === 0 ? null : getBg(selectedRole);

    // Check if user already has some profile data completed
    useEffect(() => {
        if (user) {
            // Determine starting step based on completed profile
            if (user.roles && user.roles.length > 0) {
                setSelectedRole(user.roles[0]); // Assume first role
                if (user.gender) {
                    setCurrentPosition(2); // Start from age step
                    setMaxStep(2);
                } else {
                    setCurrentPosition(1); // Start from gender step
                    setMaxStep(1);
                }
            }
        }
    }, [user]);

    const handleStepPress = (step: number) => {
        if (selectedRole === 'locationowner') { // Changed from 'location'
            // Location owners chỉ cần role và concepts, skip gender/age
            if (step === 0 || step === 3) {
                setCurrentPosition(step);
            }
        } else {
            if (step <= maxStep) {
                setCurrentPosition(step);
            }
        }
    };

    const handleRoleSelect = (roleData: { role: string, roleId: number }) => {
        const role = roleData.role;
        setSelectedRole(role);
        setUserData((prev: any) => ({ ...prev, role, roleId: roleData.roleId }));
        
        if (role === 'locationowner') {
            // Location owners skip to concept selection
            setCurrentPosition(3);
            setMaxStep(3);
        } else {
            // Users and photographers go through all steps
            setCurrentPosition(1);
            setMaxStep(1);
        }
    };

    const handleGenderSelect = async (gender: string) => {
        try {
            if (!userId) {
                Alert.alert('Lỗi', 'Không tìm thấy thông tin user');
                return;
            }

            // Update profile with gender
            await updateProfile(userId, { gender });
            setUserData((prev: any) => ({ ...prev, gender }));
            
            setCurrentPosition(2);
            setMaxStep(prev => Math.max(prev, 2));
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi lưu giới tính');
        }
    };

    const handleAgeSelect = async (ageRange: string) => {
        try {
            if (!userId) {
                Alert.alert('Lỗi', 'Không tìm thấy thông tin user');
                return;
            }

            // Update profile with age range
            await updateProfile(userId, { ageRange });
            setUserData((prev: any) => ({ ...prev, ageRange }));
            
            setCurrentPosition(3);
            setMaxStep(prev => Math.max(prev, 3));
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi lưu độ tuổi');
        }
    };

    const handleConceptSelect = async (concepts: string[]) => {
        try {
            if (!userId) {
                Alert.alert('Lỗi', 'Không tìm thấy thông tin user');
                return;
            }

            // Update profile with interests/concepts
            await updateProfile(userId, { interests: concepts });
            setUserData((prev: any) => ({ ...prev, concepts }));

            // Save role and navigate to appropriate dashboard
            await saveRoleAndNavigate(concepts);
        } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Có lỗi xảy ra khi lưu sở thích');
        }
    };

    const saveRoleAndNavigate = async (styles?: string[]) => {
        try {
            // Save to AsyncStorage for backward compatibility
            if (selectedRole) {
                await AsyncStorage.setItem('userRole', selectedRole);
            }
            
            if (styles && styles.length > 0) {
                await AsyncStorage.setItem('userStyles', JSON.stringify(styles));
            }
            
            // Navigate based on role - updated navigation names
            if (selectedRole === 'user') { // Changed from 'customer'
                navigation.navigate('CustomerMain' as never);
            } else if (selectedRole === 'photographer') {
                navigation.navigate('PhotographerHomeScreen' as never);
            } else if (selectedRole === 'locationowner') { // Changed from 'location'
                navigation.navigate('VenueOwnerMain' as never);
            } else {
                // Fallback - navigate to general dashboard
                navigation.navigate('CustomerMain' as never);
            }
        } catch (error) {
            console.error('Error saving role to AsyncStorage:', error);
            Alert.alert('Lỗi', 'Có lỗi xảy ra khi hoàn tất thiết lập');
        }
    };

    return (
        <LinearGradient
            colors={['#fff', '#d1d5db', '#222']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ flex: 1 }}
        >
            <StatusBar backgroundColor="#000" barStyle="light-content" />
            <View style={{ flex: 1 }}>
                <View style={{ marginTop: stepIndicatorMarginTop }}>
                    <StepIndicator
                        customStyles={customStyles}
                        currentPosition={currentPosition}
                        stepCount={4}
                        labels={['Vai trò', 'Giới tính', 'Tuổi', 'Sở thích']} // Updated label
                        onPress={handleStepPress}
                    />
                </View>
                
                {/* Step 1: Role Selection */}
                {currentPosition === 0 && (
                    <Step1 onSelectRole={handleRoleSelect} />
                )}
                
                {/* Step 2: Gender Selection */}
                {currentPosition === 1 && (
                    <Step2 onSelectGender={handleGenderSelect} />
                )}
                
                {/* Step 3: Age Selection */}
                {currentPosition === 2 && (
                    <Step3 onSelectAge={handleAgeSelect} />
                )}
                
                {/* Step 4: Concept/Style Selection */}
                {currentPosition === 3 && (
                    <Step4 
                        selectedRole={selectedRole || 'user'}
                        onComplete={handleConceptSelect}
                    />
                )}
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