import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Step1 from '../Step/Step1';
import Step2 from '../Step/Step2';
import Step3 from '../Step/Step3';
import Step4 from '../Step/Step4';

export type AuthStep = 'role-selection' | 'gender-selection' | 'age-selection' | 'concept-selection' | 'complete';

interface AuthFlowProps {
  initialStep?: AuthStep;
  onComplete?: (userData: any) => void;
}

export default function AuthFlow({ initialStep = 'role-selection', onComplete }: AuthFlowProps) {
  const [currentStep, setCurrentStep] = useState<AuthStep>(initialStep);
  const [userData, setUserData] = useState<any>({});

  const handleStepComplete = (data: any, nextStep: AuthStep) => {
    setUserData((prev: any) => ({ ...prev, ...data }));
    
    if (nextStep === 'complete') {
      onComplete?.(userData);
    } else {
      setCurrentStep(nextStep);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'role-selection':
        return (
          <Step1 
            onSelectRole={(roleData) => {
              handleStepComplete(roleData, 'gender-selection');
            }}
          />
        );
      
      case 'gender-selection':
        return (
          <Step2 
            onSelectGender={(gender) => {
              handleStepComplete({ gender }, 'age-selection');
            }}
          />
        );
      
      case 'age-selection':
        return (
          <Step3 
            onSelectAge={(ageRange) => {
              const nextStep = userData.role === 'user' ? 'concept-selection' : 'complete';
              handleStepComplete({ ageRange }, nextStep);
            }}
          />
        );
      
      case 'concept-selection':
        return (
          <Step4 
            selectedRole={userData.role}
            onComplete={(concepts) => {
              handleStepComplete({ concepts }, 'complete');
            }}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderStep()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});