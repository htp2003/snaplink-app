import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../navigation/types';
import { getResponsiveSize } from '../utils/responsive';

const EditProfileScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [about, setAbout] = useState('');
  const [facebook, setFacebook] = useState('');
  const [instagram, setInstagram] = useState('');

  return (
    <ScrollView className="flex-1 bg-black">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 mt-12  ">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="white" />
        </TouchableOpacity>
        <Text style={{ fontSize: getResponsiveSize(18) }} className="text-white font-bold">Edit Profile</Text>
        <TouchableOpacity>
          <Text style={{ fontSize: getResponsiveSize(16) }} className="text-[#32FAE9] font-bold">Save</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar Section */}
      <View className="items-center py-6">
        <View style={{ 
          width: getResponsiveSize(100), 
          height: getResponsiveSize(100),
          borderRadius: getResponsiveSize(50)
        }} className="bg-gray-400 relative">
          <TouchableOpacity 
            className="absolute bottom-0 right-0 bg-[#32FAE9] rounded-full p-2"
            style={{ transform: [{ translateX: 5 }, { translateY: 5 }] }}
          >
            <Ionicons name="camera" size={getResponsiveSize(20)} color="black" />
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-400 mt-2">Tap to change photo</Text>
      </View>

      {/* Name Section */}
      <View className="px-5 mb-6">
        <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-400 mb-2">First Name</Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Enter your first name"
          placeholderTextColor="#666"
          className="bg-white/10 text-white px-4 py-3 rounded-lg"
          style={{ fontSize: getResponsiveSize(16) }}
        />

        <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-400 mb-2 mt-4">Last Name</Text>
        <TextInput
          value={lastName}
          onChangeText={setLastName}
          placeholder="Enter your last name"
          placeholderTextColor="#666"
          className="bg-white/10 text-white px-4 py-3 rounded-lg"
          style={{ fontSize: getResponsiveSize(16) }}
        />
      </View>

      {/* About Section */}
      <View className="px-5 mb-6">
        <Text style={{ fontSize: getResponsiveSize(14) }} className="text-gray-400 mb-2">About</Text>
        <TextInput
          value={about}
          onChangeText={setAbout}
          placeholder="Tell us about yourself"
          placeholderTextColor="#666"
          multiline
          numberOfLines={4}
          className="bg-white/10 text-white px-4 py-3 rounded-lg"
          style={{ 
            fontSize: getResponsiveSize(16),
            height: getResponsiveSize(100),
            textAlignVertical: 'top'
          }}
        />
      </View>

      {/* Contact Section */}
      <View className="px-5 mb-6">
        <Text style={{ fontSize: getResponsiveSize(16) }} className="text-white font-bold mb-4">Contact</Text>
        
        {/* Facebook */}
        <View className="flex-row items-center bg-white/10 rounded-lg px-4 py-3 mb-3">
          <Ionicons name="logo-facebook" size={getResponsiveSize(24)} color="#32FAE9" />
          <TextInput
            value={facebook}
            onChangeText={setFacebook}
            placeholder="Facebook profile link"
            placeholderTextColor="#666"
            className="flex-1 text-white ml-3"
            style={{ fontSize: getResponsiveSize(16) }}
          />
        </View>

        {/* Instagram */}
        <View className="flex-row items-center bg-white/10 rounded-lg px-4 py-3">
          <Ionicons name="logo-instagram" size={getResponsiveSize(24)} color="#32FAE9" />
          <TextInput
            value={instagram}
            onChangeText={setInstagram}
            placeholder="Instagram profile link"
            placeholderTextColor="#666"
            className="flex-1 text-white ml-3"
            style={{ fontSize: getResponsiveSize(16) }}
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default EditProfileScreen;