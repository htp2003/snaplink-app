import { ViewStyle } from 'react-native';

export const customTabBarStyle: ViewStyle = {
  backgroundColor: '#232449',
  position: 'absolute', 
  marginHorizontal: 16,
  bottom: 30,
  borderRadius: 20,
  height: 60,
  borderTopWidth: 0,
  elevation: 8,
  shadowColor: '#000',
  shadowOpacity: 0.12,
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 16,
};

export const customTabScreenOptions = {
  tabBarActiveTintColor: '#22c55e',
  tabBarInactiveTintColor: '#fff',
  tabBarShowLabel: true,
  tabBarStyle: customTabBarStyle,
  headerShown: false,
};