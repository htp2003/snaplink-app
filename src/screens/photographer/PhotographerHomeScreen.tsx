import { View, Text } from 'react-native'
import React from 'react'
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, PhotographerTabParamList } from '../../navigation/types';
import { CompositeScreenProps } from '@react-navigation/native';

type Props = CompositeScreenProps<
  BottomTabScreenProps<PhotographerTabParamList, 'PhotographerHomeScreen'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function PhotographerHomeScreen({ navigation, route }: Props) {
  return (  
    <View className='flex-1 items-center justify-center'>
      <Text className='text-2xl font-bold'>PhotographerHomeScreen</Text>
    </View>
  )
}   