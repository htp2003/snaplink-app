import StepIndicator from 'react-native-step-indicator';
import { useState } from 'react';
import { View, Dimensions } from 'react-native';
import Step1 from './Step1';
import Step2 from './Step2';
import Step3 from './Step3';
import Step4 from './Step4';

import { ImageBackground } from 'react-native';


const getBg = (role: string | null) => {
    if (role === 'customer') return require('../../../assets/slider1.png');
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
    const stepIndicatorMarginBottom = height * 0.18;

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
        <ImageBackground source={bgSource} style={{ flex: 1 }} resizeMode="cover">
            <View style={{ flex: 1 }}>
                <View style={{ marginTop: stepIndicatorMarginTop, marginBottom: stepIndicatorMarginBottom }}>
                    <StepIndicator
                        customStyles={customStyles}
                        currentPosition={currentPosition}
                        stepCount={4}
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
                {currentPosition === 3 && <Step4 onSelectRole={() => setCurrentPosition(4)} />}
            </View>
        </ImageBackground>
    );
};

const customStyles = {
    stepIndicatorSize: 30,
    currentStepIndicatorSize: 40,
    separatorStrokeWidth: 2,
    currentStepStrokeWidth: 3,
    stepStrokeCurrentColor: '#fe7013',
    stepStrokeWidth: 3,
    stepStrokeFinishedColor: '#fe7013',
    stepStrokeUnFinishedColor: '#aaaaaa',
    separatorFinishedColor: '#fe7013',
    separatorUnFinishedColor: '#aaaaaa',
    stepIndicatorFinishedColor: '#fe7013',
    stepIndicatorUnFinishedColor: '#ffffff',
    stepIndicatorCurrentColor: '#ffffff',
    stepIndicatorLabelFontSize: 15,
    currentStepIndicatorLabelFontSize: 15,
    stepIndicatorLabelCurrentColor: '#fe7013',
    stepIndicatorLabelFinishedColor: '#ffffff',
    stepIndicatorLabelUnFinishedColor: '#aaaaaa',
    labelColor: '#999999',
    labelSize: 13,
    currentStepLabelColor: '#fe7013'
};
export default StepContainer;