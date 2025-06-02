import React from 'react';
import { View, Text, TouchableOpacity, Dimensions, StatusBar, ScrollView } from 'react-native';
import { CompositeScreenProps } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, CustomerTabParamList } from '../../navigation/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import NotificationIcon from '../../components/Notification/NotificationIcon';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../../utils/responsive';
import ForyouContent from './ForyouContent';
import FavoriteContent from './FavoriteContent';


type Props = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, 'CustomerHomeScreen'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function CustomerHomeScreen({ navigation }: Props) {
  const [tab, setTab] = React.useState<'ForYou' | 'Favorite'>('ForYou');
  
  return (
    <SafeAreaView className='flex-1 bg-black'>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      
      {/* Header with Notification and Title */}
      <View className="flex-row items-center px-4 py-3">
        {/* Notification Icon */}
        <NotificationIcon />

        {/* Tabs */}
        <View className='flex-1 flex-row justify-center' style={{ gap: getResponsiveSize(8) }}>
          <TouchableOpacity 
            onPress={() => setTab('ForYou')} 
            style={{
              paddingHorizontal: getResponsiveSize(16),
              paddingTop: getResponsiveSize(8),
              paddingBottom: getResponsiveSize(12),
              borderBottomWidth: tab === 'ForYou' ? 4 : 0,
              borderBottomColor: '#32FAE9',
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2
            }}
          >
            <Text 
              style={{
                fontSize: getResponsiveSize(18),
                color: tab === 'ForYou' ? 'white' : '#9ca3af',
                fontWeight: tab === 'ForYou' ? '800' : '400'
              }}
            >
              For You
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setTab('Favorite')} 
            style={{
              paddingHorizontal: getResponsiveSize(16),
              paddingTop: getResponsiveSize(8),
              paddingBottom: getResponsiveSize(12),
              borderBottomWidth: tab === 'Favorite' ? 4 : 0,
              borderBottomColor: '#32FAE9',
              borderBottomLeftRadius: 2,
              borderBottomRightRadius: 2
            }}
          >
            <Text 
              style={{
                fontSize: getResponsiveSize(18),
                color: tab === 'Favorite' ? 'white' : '#9ca3af',
                fontWeight: tab === 'Favorite' ? '800' : '400'
              }}
            >
              Favorite
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Search Icon */}
        <TouchableOpacity>
          <Ionicons name="search" size={getResponsiveSize(24)} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* Main Content - Scrollable */}
      <ScrollView className='flex-1 px-4'
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: getResponsiveSize(90) }}
      >
        {tab === 'ForYou' ? <ForyouContent /> : <FavoriteContent />}
      </ScrollView>

      

    </SafeAreaView>
  );
}
