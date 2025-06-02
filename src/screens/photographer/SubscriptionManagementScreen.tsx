import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../../navigation/types';
import { getResponsiveSize } from '../../utils/responsive';
import { useProfile } from '../../context/ProfileContext';

const SubscriptionManagementScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const { profileData, updateProfile } = useProfile();
  const [isLoading, setIsLoading] = useState(false);

  const currentPlan = profileData.subscription?.plan || 'None';
  const isActive = profileData.subscription?.isActive || false;
  const expiresAt = profileData.subscription?.expiresAt;

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

  const handleUpgrade = async (planName: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateProfile({
        subscription: {
          isActive: true,
          plan: planName,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        }
      });
    } catch (error) {
      console.error('Error upgrading plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      updateProfile({
        subscription: {
          isActive: false,
          plan: '',
          expiresAt: null
        }
      });
    } catch (error) {
      console.error('Error canceling subscription:', error);
    } finally {
      setIsLoading(false);
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
          Subscription
        </Text>
        <Text style={{ fontSize: getResponsiveSize(16) }} className="text-gray-400">
          Manage your subscription plan
        </Text>
      </View>

      {/* Current Plan */}
      {isActive && (
        <View className="px-5 mb-8">
          <View className="bg-white/10 rounded-2xl p-6 border border-[#32FAE9]">
            <View className="flex-row justify-between items-center mb-4">
              <View>
                <Text style={{ fontSize: getResponsiveSize(16) }} className="text-gray-400 mb-1">
                  Current Plan
                </Text>
                <Text style={{ fontSize: getResponsiveSize(24) }} className="text-white font-bold">
                  {currentPlan}
                </Text>
              </View>
              <View className="bg-[#32FAE9] px-3 py-1 rounded-full">
                <Text className="text-black font-bold text-xs">ACTIVE</Text>
              </View>
            </View>
            
            <View className="flex-row justify-between items-center">
              <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-400">
                Expires: {new Date(expiresAt || '').toLocaleDateString()}
              </Text>
              <TouchableOpacity 
                onPress={handleCancel}
                className="bg-red-500 px-4 py-2 rounded-lg"
              >
                <Text className="text-white font-bold">Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Available Plans */}
      <View className="px-5 pb-8">
        <Text style={{ fontSize: getResponsiveSize(18) }} className="text-white font-bold mb-4">
          Available Plans
        </Text>
        
        {plans.map((plan, index) => (
          <TouchableOpacity
            key={plan.name}
            className={`mb-4 rounded-2xl overflow-hidden ${
              plan.recommended ? 'border-2 border-[#32FAE9]' : 'border border-gray-800'
            }`}
            onPress={() => handleUpgrade(plan.name)}
            disabled={isLoading}
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
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={plan.recommended ? "black" : "white"} />
                ) : (
                  <Text
                    style={{ fontSize: getResponsiveSize(16) }}
                    className={`text-center font-bold ${
                      plan.recommended ? 'text-black' : 'text-white'
                    }`}
                  >
                    {currentPlan === plan.name ? 'Current Plan' : 'Upgrade'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Payment History */}
      <View className="px-5 pb-8">
        <Text style={{ fontSize: getResponsiveSize(18) }} className="text-white font-bold mb-4">
          Payment History
        </Text>
        <View className="bg-white/10 rounded-lg p-4">
          <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-400 text-center">
            No payment history available
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default SubscriptionManagementScreen;