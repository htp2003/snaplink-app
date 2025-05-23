import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
export type RootStackParamList = {
    Step: undefined;
    Main: { screen?: keyof TabParamList } | undefined;
    Home: undefined;
    Booking: undefined;
    Layout: undefined;
    Login: undefined;
    Register: undefined;
    ProfileCardDetail: undefined;
    ViewAllPhotographers: undefined;
    ViewAllLocations: undefined;
  };

  export type TabParamList = {
    Home: undefined;
    Booking: undefined;
    Profile: undefined;
  }

  export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>
  export type TabNavigationProp = BottomTabNavigationProp<TabParamList>