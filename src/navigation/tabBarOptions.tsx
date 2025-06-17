import React, { useEffect, useRef } from 'react';
import { ViewStyle, TextStyle, Animated, TouchableOpacity, View, Text } from 'react-native';
import { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { StackCardInterpolationProps } from '@react-navigation/stack';

// ===== BASIC TAB BAR STYLES =====

export const customTabBarStyle: ViewStyle = {
  backgroundColor: 'rgba(0, 0, 0, 0.9)', // Background đen trong suốt
  position: 'absolute', 
  marginHorizontal: 16,
  bottom: 30,
  borderRadius: 30, 
  height: 60,
  borderTopWidth: 0,
  elevation: 8,
  shadowColor: '#000',
  shadowOpacity: 0.2, 
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 16,
  paddingHorizontal: 10,
  // Glass morphism effect
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.1)',
};

export const customTabScreenOptions: BottomTabNavigationOptions = {
  tabBarActiveTintColor: '#3B82F6', // Màu xanh dương khi active
  tabBarInactiveTintColor: '#fff',   // Màu trắng khi inactive
  tabBarShowLabel: true,
  tabBarLabelStyle: { 
    fontSize: 12, 
    fontWeight: '500',
    marginTop: -2,
    marginBottom: 2,
  },
  tabBarIconStyle: {
    marginTop: 2,
  },
  tabBarStyle: customTabBarStyle,
  headerShown: false,
};

// ===== DYNAMIC STYLES =====

export const getTabBarButtonStyle = (focused: boolean): ViewStyle => ({
  backgroundColor: focused ? 'rgba(50, 250, 233, 0.15)' : 'transparent',
  borderRadius: 20,
  paddingHorizontal: 12,
  paddingVertical: 8,
  marginHorizontal: 4,
  borderWidth: focused ? 1 : 0,
  borderColor: focused ? 'rgba(50, 250, 233, 0.3)' : 'transparent',
});

export const getTabBarLabelStyle = (focused: boolean): TextStyle => ({
  fontSize: focused ? 12 : 11,
  fontWeight: focused ? '700' : '500',
  color: focused ? '#32FAE9' : 'rgba(255, 255, 255, 0.6)',
  marginTop: 2,
});

export const tabBarIconContainerStyle: ViewStyle = {
  alignItems: 'center',
  justifyContent: 'center',
  width: 28,
  height: 28,
};

// ===== ALTERNATIVE STYLES =====

export const floatingActionButtonStyle: ViewStyle = {
  position: 'absolute',
  bottom: 20,
  alignSelf: 'center',
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: '#32FAE9',
  justifyContent: 'center',
  alignItems: 'center',
  elevation: 8,
  shadowColor: '#32FAE9',
  shadowOpacity: 0.4,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 12,
  borderWidth: 3,
  borderColor: 'rgba(0, 0, 0, 0.9)',
};

export const blurTabBarStyle: ViewStyle = {
  backgroundColor: 'rgba(35, 36, 73, 0.8)',
  position: 'absolute', 
  marginHorizontal: 16,
  bottom: 30,
  borderRadius: 32, 
  height: 72,
  borderTopWidth: 0,
  elevation: 25,
  shadowColor: '#000',
  shadowOpacity: 0.35, 
  shadowOffset: { width: 0, height: 10 },
  shadowRadius: 30,
  paddingHorizontal: 6,
  paddingVertical: 6,
  borderWidth: 1.5,
  borderColor: 'rgba(255, 255, 255, 0.15)',
  overflow: 'hidden',
};

// ===== RESPONSIVE UTILITIES =====

export const getResponsiveTabBarStyle = (screenWidth: number): ViewStyle => {
  const isSmallScreen = screenWidth < 375;
  
  return {
    ...customTabBarStyle,
    height: isSmallScreen ? 65 : 70,
    marginHorizontal: isSmallScreen ? 12 : 20,
    bottom: isSmallScreen ? 28 : 34,
  };
};

export const gradientTabBarColors = ['rgba(50, 250, 233, 0.1)', 'rgba(0, 0, 0, 0.95)'];

// ===== ANIMATION CONFIGURATIONS =====

export const tabBarAnimationConfig = {
  animation: 'timing' as const,
  config: {
    duration: 200,
  },
};

// ===== SCREEN TRANSITION ANIMATIONS =====

export const screenTransitionAnimations = {
  // Slide from right
  slideFromRight: {
    cardStyleInterpolator: ({ current, layouts }: StackCardInterpolationProps) => {
      return {
        cardStyle: {
          transform: [
            {
              translateX: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [layouts.screen.width, 0],
              }),
            },
          ],
        },
      };
    },
  },
  
  // Fade transition
  fadeTransition: {
    cardStyleInterpolator: ({ current }: StackCardInterpolationProps) => {
      return {
        cardStyle: {
          opacity: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          }),
        },
      };
    },
  },
  
  // Scale transition
  scaleTransition: {
    cardStyleInterpolator: ({ current }: StackCardInterpolationProps) => {
      return {
        cardStyle: {
          transform: [
            {
              scale: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.85, 1],
              }),
            },
          ],
          opacity: current.progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          }),
        },
      };
    },
  },
};

// ===== COMPONENT INTERFACES =====

interface AnimatedTabButtonProps {
  focused: boolean;
  children: React.ReactNode;
  label: string;
  icon?: React.ReactNode;
  onPress: () => void;
  accessibilityRole?: string;
  accessibilityState?: { selected?: boolean };
}

interface TabBarIndicatorProps {
  tabCount: number;
  activeIndex: number;
  containerWidth: number;
}

// ===== ANIMATED COMPONENTS =====

export const SimpleAnimatedTabButton: React.FC<AnimatedTabButtonProps> = ({
  focused,
  children,
  label,
  icon,
  onPress,
  accessibilityRole,
  accessibilityState,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.6)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: focused ? 1 : 0.6,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [focused, opacityAnim]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();
    
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityRole={accessibilityRole as any}
      accessibilityState={accessibilityState}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
      }}
    >
      {/* Static background */}
      <View
        style={{
          position: 'absolute',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: focused ? 'rgba(50, 250, 233, 0.15)' : 'transparent',
          borderWidth: focused ? 1 : 0,
          borderColor: focused ? 'rgba(50, 250, 233, 0.4)' : 'transparent',
          ...(focused && {
            shadowColor: '#32FAE9',
            shadowOpacity: 0.3,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 6,
            elevation: 4,
          }),
        }}
      />
      
      {/* Animated content */}
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
          opacity: opacityAnim,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        {icon && (
          <View style={{ marginBottom: 2 }}>
            {icon}
          </View>
        )}
        {children}
        <Text
          style={{
            fontSize: focused ? 12 : 11,
            fontWeight: focused ? '700' : '500',
            color: focused ? '#32FAE9' : 'rgba(255, 255, 255, 0.6)',
            marginTop: 2,
          }}
        >
          {label}
        </Text>
      </Animated.View>
      
      {/* Active indicator */}
      {focused && (
        <View
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#32FAE9',
            bottom: 4,
          }}
        />
      )}
    </TouchableOpacity>
  );
};

// Advanced animated tab button with more effects
export const AdvancedAnimatedTabButton: React.FC<AnimatedTabButtonProps> = ({
  focused,
  children,
  label,
  icon,
  onPress,
  accessibilityRole,
  accessibilityState,
}) => {
  const scaleAnim = useRef(new Animated.Value(focused ? 1 : 0.9)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0.6)).current;
  const slideAnim = useRef(new Animated.Value(focused ? 0 : 5)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const iconScaleAnim = useRef(new Animated.Value(focused ? 1.1 : 1)).current;

  useEffect(() => {
    const nativeAnimations = [
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.05 : 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.timing(opacityAnim, {
        toValue: focused ? 1 : 0.6,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: focused ? 0 : 5,
        useNativeDriver: true,
        tension: 200,
        friction: 8,
      }),
      Animated.timing(iconScaleAnim, {
        toValue: focused ? 1.1 : 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ];

    // Glow animation for active tab
    let glowAnimation: Animated.CompositeAnimation | null = null;
    if (focused) {
      glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      glowAnimation.start();
    }

    Animated.parallel(nativeAnimations).start();

    return () => {
      if (glowAnimation) {
        glowAnimation.stop();
      }
    };
  }, [focused]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.05 : 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();
    
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      accessibilityRole={accessibilityRole as any}
      accessibilityState={accessibilityState}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
      }}
    >
      {/* Static background */}
      <View
        style={{
          position: 'absolute',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: focused ? 'rgba(50, 250, 233, 0.15)' : 'transparent',
          borderWidth: focused ? 1 : 0,
          borderColor: focused ? 'rgba(50, 250, 233, 0.4)' : 'transparent',
          ...(focused && {
            shadowColor: '#32FAE9',
            shadowOpacity: 0.4,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 8,
            elevation: 6,
          }),
        }}
      />
      
      {/* Content container (native animations) */}
      <Animated.View
        style={{
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim },
          ],
          opacity: opacityAnim,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}
      >
        <Animated.View
          style={{
            transform: [{ scale: iconScaleAnim }],
          }}
        >
          {icon && (
            <View style={{ marginBottom: 2 }}>
              {icon}
            </View>
          )}
          {children}
        </Animated.View>
        
        <Text
          style={{
            fontSize: focused ? 12 : 11,
            fontWeight: focused ? '700' : '500',
            color: focused ? '#32FAE9' : 'rgba(255, 255, 255, 0.6)',
            marginTop: 2,
          }}
        >
          {label}
        </Text>
      </Animated.View>
      
      {/* Ripple effect indicator */}
      {focused && (
        <Animated.View
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#32FAE9',
            bottom: 4,
            opacity: glowAnim,
            transform: [
              {
                scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1.2],
                }),
              },
            ],
          }}
        />
      )}
    </TouchableOpacity>
  );
};

// ===== TAB BAR INDICATOR =====

export const TabBarIndicator: React.FC<TabBarIndicatorProps> = ({ 
  tabCount, 
  activeIndex, 
  containerWidth 
}) => {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const tabWidth = containerWidth / tabCount;
  
  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: activeIndex * tabWidth,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [activeIndex, slideAnim, scaleAnim, tabWidth]);
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: tabWidth,
        height: 3,
        backgroundColor: '#32FAE9',
        borderRadius: 2,
        transform: [
          { translateX: slideAnim },
          { scaleX: scaleAnim },
        ],
      }}
    />
  );
};

// ===== UTILITY FUNCTIONS =====

export const createRippleEffect = (x: number, y: number) => {
  const rippleAnim = new Animated.Value(0);
  const opacityAnim = new Animated.Value(0.6);
  
  Animated.parallel([
    Animated.timing(rippleAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }),
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }),
  ]).start();
  
  return {
    position: 'absolute' as const,
    left: x - 25,
    top: y - 25,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#32FAE9',
    opacity: opacityAnim,
    transform: [
      {
        scale: rippleAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 2],
        }),
      },
    ],
  };
};