import React from 'react';
import { View, Text, Button, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotificationIcon from '../components/Notification/NotificationIcon';
import { StatusBar } from 'react-native';
import ProfileCard from '../components/ProifileCard/ProfileCard';


type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [tab, setTab] = React.useState<'ForYou' | 'Favorite'>('ForYou');
  return (
    <SafeAreaView className='flex-1 bg-black'>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <View className='flex-1 mx-4 rounded-2xl bg-[#181926] shadow-lg'>
        <View className="flex-row items-center px-4 py-3">
          {/* Notification Icon */}
          <NotificationIcon />

          {/* Tabs */}
          <View className='flex-1 flex-row justify-center space-x-2'>
            <TouchableOpacity onPress={() => setTab('ForYou')} className={`px-6 py-2 pb-4  ${tab === 'ForYou' ? 'border-b-4 rounded-b-sm   border-[#32FAE9]' : ''}`}>
              <Text className={`text-xl ${tab === 'ForYou' ? 'text-white font-extrabold' : 'text-gray-400'}`}>For You</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setTab('Favorite')} className={`px-6 py-2 pb-4 ${tab === 'Favorite' ? 'border-b-4 rounded-b-sm   border-[#32FAE9]' : ''}`}>
              <Text className={`text-xl ${tab === 'Favorite' ? 'text-white font-extrabold' : 'text-gray-400'}`}>Favorite</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ProfileCard name="David Silva"
          avatar={require('../../assets/slider1.png')}
          images={[
            require('../../assets/slider1.png'),
            require('../../assets/slider2.png'),
            require('../../assets/slider3.png'),
            require('../../assets/slider4.png'),
          ]}
          styles={['Portrait', 'Landscape', 'Street']}
          onBooking={() => navigation.navigate('Booking')}
          
        />
      </View>


 




    </SafeAreaView>
  );
}
