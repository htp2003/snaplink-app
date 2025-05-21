import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList, TabParamList } from './types';
import { customTabScreenOptions } from './tabBarOptions';


// Screens
import HomeScreen from '../screens/HomeScreen';
import BookingScreen from '../screens/BookingScreen';
import LayoutPage from '../screens/LayoutPage';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import StepContainer from '../components/Step/StepContainer';
import ProfileCardDetail from '../screens/ProfileCardDetail';



const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const BottomTabs = () => {
  return (
    <Tab.Navigator screenOptions={customTabScreenOptions}>
  <Tab.Screen name="Home" component={HomeScreen}/>
  <Tab.Screen name="Booking" component={BookingScreen} />

</Tab.Navigator>
  )
}

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Layout"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Step" component={StepContainer} />
        <Stack.Screen name="Main" component={BottomTabs} />
        <Stack.Screen name="Booking" component={BookingScreen} />
        <Stack.Screen name="Layout" component={LayoutPage} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ProfileCardDetail" component={ProfileCardDetail} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;