import { ViewStyle } from 'react-native';

export const customTabBarStyle: ViewStyle = {
  backgroundColor: '#232449',
  position: 'absolute', 
  marginHorizontal: 16,
  bottom: 30,
  borderRadius: 30, // Bo tròn hơn
  height: 60,
  borderTopWidth: 0,
  elevation: 8,
  shadowColor: '#000',
  shadowOpacity: 0.2, // Tăng độ mờ
  shadowOffset: { width: 0, height: 4 },
  shadowRadius: 16,
  paddingHorizontal: 10, // Thêm padding ngang
};

export const customTabScreenOptions = {
  tabBarActiveTintColor: '#3B82F6', // Đổi màu xanh dương như trong ảnh
  tabBarInactiveTintColor: '#fff',
  tabBarShowLabel: true,
  tabBarLabelStyle: { fontSize: 12, fontWeight: '500' as const },
  tabBarStyle: customTabBarStyle,
  headerShown: false,
};