import { SafeAreaView } from 'react-native-safe-area-context';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from 'react-native';

export const SearchBar = () => {
    return (
      <SafeAreaView className="bg-white">
        <View className="px-6 py-4 pb-2">
          <TouchableOpacity className="bg-stone-100 rounded-full px-6 py-4 flex-row items-center">
            <Ionicons name="search" size={20} color="#78716c" />
            <Text className="text-stone-600 font-medium ml-3 flex-1">
              Bắt đầu tìm kiếm
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };