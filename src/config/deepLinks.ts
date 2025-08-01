import { Linking } from 'react-native';
import Constants from 'expo-constants';

// ✅ Kiểm tra environment
const IS_EXPO_GO = Constants.appOwnership === 'expo';

console.log('🔍 Deep Link Environment:', {
  isExpoGo: IS_EXPO_GO,
  linkingUri: Constants.linkingUri,
  appOwnership: Constants.appOwnership
});

// ✅ Dynamic URL scheme cho Expo Go vs Standalone
export const APP_SCHEME = 'snaplink';

// ✅ Tạo deep links phù hợp với môi trường
export const DEEP_LINKS = {
  PAYMENT_SUCCESS: IS_EXPO_GO 
    ? `${Constants.linkingUri}payment-success`
    : `${APP_SCHEME}://payment-success`,
  PAYMENT_CANCEL: IS_EXPO_GO 
    ? `${Constants.linkingUri}payment-cancel` 
    : `${APP_SCHEME}://payment-cancel`,
  HOME: IS_EXPO_GO 
    ? `${Constants.linkingUri}home`
    : `${APP_SCHEME}://home`
};

export const createDeepLink = (path: string, params?: Record<string, string>) => {
  let url = IS_EXPO_GO 
    ? `${Constants.linkingUri}${path}`
    : `${APP_SCHEME}://${path}`;
  
  if (params) {
    const queryString = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    url += `?${queryString}`;
  }
  
  console.log(`🔗 Created deep link: ${url}`);
  return url;
};

export const handleDeepLink = (url: string) => {
  console.log('📱 Deep link received:', url);
  console.log('📱 Environment:', IS_EXPO_GO ? 'Expo Go' : 'Standalone');
  
  // ✅ Handle cả 2 format: exp://... và snaplink://...
  if (url.includes('payment-success')) {
    return { type: 'PAYMENT_SUCCESS', url };
  } else if (url.includes('payment-cancel')) {
    return { type: 'PAYMENT_CANCEL', url };
  }
  
  return { type: 'UNKNOWN', url };
};

// ✅ Debug helper - gọi để xem thông tin deep links
export const logDeepLinkInfo = () => {
  console.log('🔍 Deep Link Debug Info:');
  console.log('📱 Environment:', IS_EXPO_GO ? 'Expo Go' : 'Standalone');
  console.log('📱 Constants.linkingUri:', Constants.linkingUri);
  console.log('📱 APP_SCHEME:', APP_SCHEME);
  console.log('📱 DEEP_LINKS:', DEEP_LINKS);
};