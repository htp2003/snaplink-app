import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import { getResponsiveSize } from '../../utils/responsive';
import { useProfile } from '../../context/ProfileContext';

const SubscriptionScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { updateProfile } = useProfile();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const plans = [
    {
      name: 'Basic',
      price: '$9.99',
      period: 'month',
      features: [
        'Upload up to 50 photos',
        'Basic profile customization',
        'View booking requests'
      ],
      recommended: false
    },
    {
      name: 'Professional',
      price: '$19.99',
      period: 'month',
      features: [
        'Unlimited photo uploads',
        'Advanced profile customization',
        'Accept booking requests',
        'Priority support',
        'Analytics dashboard'
      ],
      recommended: true
    },
    {
      name: 'Premium',
      price: '$29.99',
      period: 'month',
      features: [
        'All Professional features',
        'Custom domain',
        'Advanced analytics',
        'Priority booking',
        '24/7 support'
      ],
      recommended: false
    }
  ];

  const handleGetStarted = async (planName: string) => {
    setIsLoading(planName);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update subscription in profile context
      updateProfile({
        subscription: {
          isActive: true,
          plan: planName,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        }
      });

      // Navigate to profile screen after successful subscription
      navigation.navigate('PhotographerMain', {screen: 'Profile'});
    } catch (error) {
      console.error('Error activating subscription:', error);
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <ScrollView className="flex-1 bg-black">
      {/* Header */}
      <View className="px-5 pt-12 pb-6">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
          <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="white" />
        </TouchableOpacity>
        <Text style={{ fontSize: getResponsiveSize(24) }} className="text-white font-bold mb-2">
          Choose Your Plan
        </Text>
        <Text style={{ fontSize: getResponsiveSize(16) }} className="text-gray-400">
          Select the perfect plan for your needs
        </Text>
      </View>

      {/* Plans */}
      <View className="px-5 pb-8">
        {plans.map((plan, index) => (
          <TouchableOpacity
            key={plan.name}
            className={`mb-4 rounded-2xl overflow-hidden ${
              plan.recommended ? 'border-2 border-[#32FAE9]' : 'border border-gray-800'
            }`}
            onPress={() => handleGetStarted(plan.name)}
            disabled={isLoading !== null}
          >
            <View className="p-6">
              {plan.recommended && (
                <View className="absolute top-0 right-0 bg-[#32FAE9] px-4 py-1 rounded-bl-lg">
                  <Text className="text-black font-bold text-xs">RECOMMENDED</Text>
                </View>
              )}
              
              <View className="flex-row items-baseline mb-4">
                <Text style={{ fontSize: getResponsiveSize(32) }} className="text-white font-bold">
                  {plan.price}
                </Text>
                <Text style={{ fontSize: getResponsiveSize(16) }} className="text-gray-400 ml-2">
                  /{plan.period}
                </Text>
              </View>

              <Text style={{ fontSize: getResponsiveSize(20) }} className="text-white font-bold mb-4">
                {plan.name}
              </Text>

              <View className="mb-6">
                {plan.features.map((feature, featureIndex) => (
                  <View key={featureIndex} className="flex-row items-center mb-3">
                    <Ionicons name="checkmark-circle" size={getResponsiveSize(20)} color="#32FAE9" />
                    <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-300 ml-2">
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                className={`py-3 rounded-lg ${
                  plan.recommended ? 'bg-[#32FAE9]' : 'bg-white/10'
                }`}
                disabled={isLoading !== null}
              >
                {isLoading === plan.name ? (
                  <ActivityIndicator color={plan.recommended ? "black" : "white"} />
                ) : (
                  <Text
                    style={{ fontSize: getResponsiveSize(16) }}
                    className={`text-center font-bold ${
                      plan.recommended ? 'text-black' : 'text-white'
                    }`}
                  >
                    Get Started
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Footer */}
      <View className="px-5 pb-8">
        <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-400 text-center">
          All plans include a 14-day free trial. Cancel anytime.
        </Text>
      </View>
    </ScrollView>
  );
};

export default SubscriptionScreen;