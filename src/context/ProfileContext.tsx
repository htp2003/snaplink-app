import React, { createContext, useContext, useState } from "react";
import * as ImagePicker from 'expo-image-picker';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  about: string;
  avatar: string;
  subscription: {
    isActive: boolean;
    plan: string;
    expiresAt: string | null;
  };
}

interface ProfileContextType {
  profileData: ProfileData;
  updateProfile: (data: Partial<ProfileData>) => void;
  uploadAvatar: () => Promise<void>;
  hasActiveSubscription: () => boolean;
}

const defaultProfileData: ProfileData = {
  firstName: 'Tuấn Dương',
  lastName: 'Nguyễn',
  email: '@tuanduongqua',
  about: 'I am a photographer',
  avatar: '',
  subscription: {
    isActive: false,
    plan: '',
    expiresAt: null
  }
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [profileData, setProfileData] = useState<ProfileData>(defaultProfileData);

  const updateProfile = (data: Partial<ProfileData>) => {
    setProfileData(prev => ({
      ...prev,
      ...data,
    }));
  };

  const uploadAvatar = async () => {
    if (!hasActiveSubscription()) {
      alert('Please subscribe to a plan to upload photos');
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        updateProfile({
          avatar: result.assets[0].uri
        });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

  const hasActiveSubscription = () => {
    return profileData.subscription.isActive;
  };

  return (
    <ProfileContext.Provider value={{ profileData, updateProfile, uploadAvatar, hasActiveSubscription }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context == undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};