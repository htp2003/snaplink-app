import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  RefreshControl,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackNavigationProp } from "../../navigation/types";
import { usePhotographerAuth } from "../../hooks/usePhotographerAuth";
import { useWallet } from "../../hooks/useWallet";

const { width } = Dimensions.get("window");

// Types
interface Package {
  packageId: number;
  applicableTo: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  features: string;
}

interface Subscription {
  premiumSubscriptionId: number;
  packageId: number;
  paymentId?: number;
  userId: number;
  photographerId: number;
  locationId?: number;
  startDate: string;
  endDate: string;
  status: string;
  packageName: string;
  applicableTo: string;
}

interface ApiResponse<T> {
  error: number;
  message: string;
  data: T;
}

interface CancelResponse {
  message: string;
}

const API_BASE_URL = "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

const SubscriptionManagementScreen = () => {
  const navigation = useNavigation<RootStackNavigationProp>();
  const insets = useSafeAreaInsets();
  const { photographerId, isLoading: authLoading } = usePhotographerAuth();
  const { walletBalance, formatCurrency, fetchWalletBalance } = useWallet();
  
  // State
  const [activeTab, setActiveTab] = useState<'packages' | 'history'>('packages');
  const [packages, setPackages] = useState<Package[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribingToPackage, setSubscribingToPackage] = useState<number | null>(null);

  useEffect(() => {
    if (photographerId) {
      loadData();
    }
  }, [photographerId]);

  const getAuthToken = async () => {
    const AsyncStorage = await import('@react-native-async-storage/async-storage');
    return await AsyncStorage.default.getItem('token');
  };

  const makeApiRequest = async <T,>(endpoint: string, options: RequestInit = {}): Promise<T> => {
    console.log('🌐 Making API request:', {
      endpoint,
      fullUrl: `${API_BASE_URL}${endpoint}`,
      method: options.method || 'GET'
    });
    
    const token = await getAuthToken();
    console.log('🔑 Token status:', token ? 'Found' : 'Not found');
    
    const requestConfig = {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
      ...options,
    };
    
    console.log('📋 Request config:', {
      headers: requestConfig.headers,
      method: requestConfig.method || 'GET'
    });

    const response = await fetch(`${API_BASE_URL}${endpoint}`, requestConfig);
    
    console.log('📡 Response status:', response.status, response.statusText);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      });
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ API Response parsed successfully');
    return result;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPackages(),
        loadSubscriptions(),
        fetchWalletBalance(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const loadPackages = async () => {
    console.log('🚀 Starting loadPackages...');
    
    try {
      console.log('📡 Making API request to /api/Package/GetPackages');
      const response = await makeApiRequest<Package[]>('/api/Package/GetPackages');
      
      console.log('🔍 Raw packages response:', JSON.stringify(response, null, 2));
      
      // API returns array directly, not wrapped in ApiResponse
      if (Array.isArray(response)) {
        console.log('✅ Success! Got packages array');
        console.log('📦 All packages data:', response);
        console.log('📊 Number of packages:', response.length);
        
        if (response.length > 0) {
          // Log each package's applicableTo field
          response.forEach((pkg, index) => {
            console.log(`📋 Package ${index + 1}:`, {
              packageId: pkg.packageId,
              name: pkg.name,
              applicableTo: pkg.applicableTo,
              applicableToType: typeof pkg.applicableTo,
              price: pkg.price
            });
          });
          
          // Filter packages for Photographer
          const photographerPackages = response.filter(pkg => 
            pkg.applicableTo === 'Photographer' || pkg.applicableTo === 'All'
          );
          console.log('📸 Filtered photographer packages:', photographerPackages);
          
          setPackages(photographerPackages);
          console.log('✅ Packages set to state');
        } else {
          console.log('⚠️ No packages in response');
          setPackages([]);
        }
      } else {
        console.log('❌ Response is not an array:', typeof response);
        setPackages([]);
      }
    } catch (error) {
      console.error('💥 Error in loadPackages:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      
      Alert.alert('Lỗi', 'Không thể tải danh sách gói. Kiểm tra console để xem chi tiết.');
      throw error;
    }
  };

  const loadSubscriptions = async () => {
    if (!photographerId) return;
    
    try {
      console.log('📡 Loading subscriptions for photographerId:', photographerId);
      const response = await makeApiRequest<Subscription[]>(`/api/Subscription/Photographer/${photographerId}`);
      
      console.log('🔍 Subscriptions response (raw):', JSON.stringify(response, null, 2));
      
      // API returns array directly
      if (Array.isArray(response)) {
        console.log('✅ Success! Got subscriptions array');
        console.log('📊 Number of subscriptions:', response.length);
        
        setSubscriptions(response);
        
        // Find active subscription (latest active one)
        const activeSubscriptions = response.filter(sub => sub.status === 'Active');
        console.log('🟢 Active subscriptions:', activeSubscriptions);
        
        // Get the latest active subscription (by startDate)
        const latestActive = activeSubscriptions.sort((a, b) => 
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        )[0];
        
        setActiveSubscription(latestActive || null);
        console.log('🎯 Latest active subscription:', latestActive);
      } else {
        console.log('❌ Response is not an array:', typeof response);
        setSubscriptions([]);
        setActiveSubscription(null);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      throw error;
    }
  };

  const handleSubscribe = async (packageItem: Package) => {
    if (!photographerId || !walletBalance) return;

    // Check wallet balance
    if (walletBalance.balance < packageItem.price) {
      Alert.alert(
        'Số dư không đủ',
        'Hãy vui lòng nạp tiền vào ví',
        [
          { text: 'Hủy', style: 'cancel' },
          { 
            text: 'Nạp tiền', 
            onPress: () => navigation.navigate('PhotographerHomeScreen')
          }
        ]
      );
      return;
    }

    // Show confirmation
    Alert.alert(
      'Xác nhận đăng ký',
      `Bạn có chắc chắn muốn đăng ký gói "${packageItem.name}" với giá ${formatCurrency(packageItem.price)}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        { 
          text: 'Đăng ký', 
          onPress: () => confirmSubscribe(packageItem)
        }
      ]
    );
  };

  const confirmSubscribe = async (packageItem: Package) => {
    if (!photographerId) return;

    try {
      console.log('🚀 Starting subscription for package:', packageItem.name);
      setSubscribingToPackage(packageItem.packageId);

      const requestBody = {
        packageId: packageItem.packageId,
        photographerId: photographerId,
        // locationId is omitted as requested
      };

      console.log('📋 Subscribe request body:', requestBody);

      const response = await makeApiRequest<any>('/api/Subscription/Subscribe', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      console.log('🔍 Subscribe response (raw):', JSON.stringify(response, null, 2));

      // API returns subscription object directly, not wrapped in ApiResponse
      if (response && response.premiumSubscriptionId && response.status) {
        console.log('✅ Subscription successful!', {
          subscriptionId: response.premiumSubscriptionId,
          status: response.status,
          packageName: response.packageName,
          startDate: response.startDate,
          endDate: response.endDate
        });
        
        Alert.alert(
          'Thành công', 
          `Đăng ký gói "${response.packageName}" thành công!\nTrạng thái: ${response.status}\nHết hạn: ${new Date(response.endDate).toLocaleDateString('vi-VN')}`
        );
        
        // Reload data to refresh UI
        console.log('🔄 Reloading data...');
        await loadData();
      } else {
        console.log('❌ Unexpected response format:', response);
        throw new Error('Phản hồi từ server không đúng định dạng');
      }
    } catch (error) {
      console.error('💥 Error subscribing:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace',
        name: error instanceof Error ? error.name : 'Unknown'
      });
      
      // More specific error message
      let errorMessage = 'Không thể đăng ký gói';
      if (error instanceof Error) {
        if (error.message.includes('HTTP 400')) {
          errorMessage = 'Dữ liệu không hợp lệ';
        } else if (error.message.includes('HTTP 401')) {
          errorMessage = 'Không có quyền truy cập';
        } else if (error.message.includes('HTTP 409')) {
          errorMessage = 'Bạn đã có gói đang hoạt động';
        } else if (error.message.includes('HTTP 500')) {
          errorMessage = 'Lỗi server. Vui lòng thử lại sau';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Lỗi đăng ký gói', errorMessage);
    } finally {
      setSubscribingToPackage(null);
    }
  };

  const handleCancelSubscription = async (subscription: Subscription) => {
    Alert.prompt(
      'Hủy gói đăng ký',
      `Bạn có chắc chắn muốn hủy gói "${subscription.packageName}"?\nVui lòng nhập lý do hủy:`,
      [
        { text: 'Hủy bỏ', style: 'cancel' },
        { 
          text: 'Xác nhận', 
          onPress: (reason) => {
            if (reason && reason.trim()) {
              confirmCancelSubscription(subscription.premiumSubscriptionId, reason.trim());
            } else {
              Alert.alert('Lỗi', 'Vui lòng nhập lý do hủy gói');
            }
          }
        }
      ],
      'plain-text',
      '',
      'Nhập lý do hủy...'
    );
  };

  const confirmCancelSubscription = async (subscriptionId: number, reason: string) => {
    try {
      console.log('🚀 Canceling subscription:', { subscriptionId, reason });
      setSubscribingToPackage(subscriptionId); // Reuse loading state

      const response = await makeApiRequest<CancelResponse>(`/api/Subscription/${subscriptionId}/cancel?reason=${encodeURIComponent(reason)}`, {
        method: 'PUT',
      });

      console.log('🔍 Cancel response:', response);

      if (response && response.message) {
        Alert.alert('Thành công', response.message);
        
        // Reload data to refresh UI
        console.log('🔄 Reloading data after cancel...');
        await loadData();
      } else {
        throw new Error('Phản hồi từ server không đúng định dạng');
      }
    } catch (error) {
      console.error('💥 Error canceling subscription:', error);
      
      let errorMessage = 'Không thể hủy gói đăng ký';
      if (error instanceof Error) {
        if (error.message.includes('HTTP 400')) {
          errorMessage = 'Thông tin không hợp lệ';
        } else if (error.message.includes('HTTP 404')) {
          errorMessage = 'Không tìm thấy gói đăng ký';
        } else if (error.message.includes('HTTP 409')) {
          errorMessage = 'Gói đăng ký không thể hủy';
        } else {
          errorMessage = error.message;
        }
      }
      
      Alert.alert('Lỗi hủy gói', errorMessage);
    } finally {
      setSubscribingToPackage(null);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderPackageCard = (packageItem: Package) => {
    const isSubscribing = subscribingToPackage === packageItem.packageId;
    const currentActiveSubscription = activeSubscription?.packageId === packageItem.packageId ? activeSubscription : null;
    const hasOtherActiveSubscription = activeSubscription !== null && activeSubscription.packageId !== packageItem.packageId;
    const isCanceling = currentActiveSubscription && subscribingToPackage === currentActiveSubscription.premiumSubscriptionId;

    return (
      <View
        key={packageItem.packageId}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 20,
          marginBottom: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
          borderWidth: currentActiveSubscription ? 2 : 0,
          borderColor: currentActiveSubscription ? '#4CAF50' : 'transparent',
        }}
      >
        {currentActiveSubscription && (
          <View
            style={{
              backgroundColor: '#4CAF50',
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
              alignSelf: 'flex-start',
              marginBottom: 12,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>
              ĐANG SỬ DỤNG
            </Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 8 }}>
              {packageItem.name}
            </Text>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 12 }}>
              {packageItem.description}
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="time-outline" size={16} color="#666" />
              <Text style={{ fontSize: 14, color: '#666', marginLeft: 4 }}>
                {packageItem.durationDays} ngày
              </Text>
            </View>

            {packageItem.features && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 14, color: '#333', fontWeight: '600', marginBottom: 4 }}>
                  Tính năng:
                </Text>
                <Text style={{ fontSize: 14, color: '#666' }}>
                  {packageItem.features}
                </Text>
              </View>
            )}

            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#000' }}>
              {formatCurrency(packageItem.price)}
            </Text>

            {/* Show active subscription details */}
            {currentActiveSubscription && (
              <View style={{ marginTop: 12, padding: 12, backgroundColor: '#E8F5E8', borderRadius: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#2E7D32', fontWeight: '600' }}>Bắt đầu:</Text>
                  <Text style={{ fontSize: 12, color: '#2E7D32' }}>
                    {new Date(currentActiveSubscription.startDate).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 12, color: '#2E7D32', fontWeight: '600' }}>Hết hạn:</Text>
                  <Text style={{ fontSize: 12, color: '#2E7D32' }}>
                    {new Date(currentActiveSubscription.endDate).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
                {(() => {
                  const endDate = new Date(currentActiveSubscription.endDate);
                  const today = new Date();
                  const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: '#2E7D32', fontWeight: '600' }}>Còn lại:</Text>
                      <Text style={{ 
                        fontSize: 12, 
                        color: daysRemaining <= 7 ? '#F44336' : '#2E7D32',
                        fontWeight: 'bold'
                      }}>
                        {daysRemaining} ngày
                      </Text>
                    </View>
                  );
                })()}
              </View>
            )}
          </View>
        </View>

        {/* Action Button */}
        {currentActiveSubscription ? (
          // Cancel button for active subscription
          <TouchableOpacity
            style={{
              backgroundColor: '#F44336',
              paddingVertical: 12,
              borderRadius: 8,
              marginTop: 16,
              opacity: isCanceling ? 0.6 : 1,
            }}
            onPress={() => handleCancelSubscription(currentActiveSubscription)}
            disabled={!!isCanceling}
          >
            {isCanceling ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '600' }}>
                Hủy gói
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          // Subscribe button for non-active packages
          <TouchableOpacity
            style={{
              backgroundColor: hasOtherActiveSubscription ? '#999' : '#000',
              paddingVertical: 12,
              borderRadius: 8,
              marginTop: 16,
              opacity: isSubscribing ? 0.6 : 1,
            }}
            onPress={() => handleSubscribe(packageItem)}
            disabled={isSubscribing || hasOtherActiveSubscription}
          >
            {isSubscribing ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '600' }}>
                {hasOtherActiveSubscription ? 'Đã có gói đang sử dụng' : 'Đăng ký'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSubscriptionHistory = (subscription: Subscription) => {
    const startDate = new Date(subscription.startDate).toLocaleDateString('vi-VN');
    const endDate = new Date(subscription.endDate).toLocaleDateString('vi-VN');
    
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'Active': return '#4CAF50';
        case 'Expired': return '#FF9800';
        case 'Canceled': return '#F44336';
        default: return '#666';
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'Active': return 'Đang hoạt động';
        case 'Expired': return 'Đã hết hạn';
        case 'Canceled': return 'Đã hủy';
        default: return status;
      }
    };

    return (
      <View
        key={subscription.premiumSubscriptionId}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 12,
          padding: 16,
          marginBottom: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#000', flex: 1 }}>
            {subscription.packageName}
          </Text>
          <View
            style={{
              backgroundColor: getStatusColor(subscription.status),
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' }}>
              {getStatusText(subscription.status)}
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
          ID: {subscription.premiumSubscriptionId}
        </Text>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: 14, color: '#666' }}>Từ ngày:</Text>
          <Text style={{ fontSize: 14, color: '#333' }}>{startDate}</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ fontSize: 14, color: '#666' }}>Đến ngày:</Text>
          <Text style={{ fontSize: 14, color: '#333' }}>{endDate}</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 14, color: '#666' }}>Loại:</Text>
          <Text style={{ fontSize: 14, color: '#333', fontWeight: '600' }}>
            {subscription.applicableTo}
          </Text>
        </View>

        {/* Show days remaining for active subscriptions */}
        {subscription.status === 'Active' && (
          <View style={{ marginTop: 8, padding: 8, backgroundColor: '#E8F5E8', borderRadius: 8 }}>
            {(() => {
              const endDateObj = new Date(subscription.endDate);
              const today = new Date();
              const daysRemaining = Math.ceil((endDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <Text style={{ 
                  fontSize: 12, 
                  color: daysRemaining <= 7 ? '#F44336' : '#2E7D32',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  Còn lại {daysRemaining} ngày
                </Text>
              );
            })()}
          </View>
        )}
      </View>
    );
  };

  const renderActiveSubscriptionBanner = () => {
    if (!activeSubscription) return null;

    const endDate = new Date(activeSubscription.endDate);
    const today = new Date();
    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    return (
      <View
        style={{
          backgroundColor: '#E8F5E8',
          borderRadius: 12,
          padding: 16,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: '#4CAF50',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#2E7D32', marginLeft: 8 }}>
            Gói đang sử dụng
          </Text>
        </View>
        
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000', marginBottom: 4 }}>
          {activeSubscription.packageName}
        </Text>
        
        <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
          {activeSubscription.status === 'Active' ? 'Đang hoạt động' : 'Đã hết hạn'}
        </Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, color: '#666' }}>
            Còn lại: <Text style={{ color: daysRemaining <= 7 ? '#F44336' : '#4CAF50', fontWeight: 'bold' }}>
              {daysRemaining} ngày
            </Text>
          </Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            Hết hạn: {endDate.toLocaleDateString('vi-VN')}
          </Text>
        </View>
      </View>
    );
  };

  if (authLoading || !photographerId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F7F7F7' }}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={{ marginTop: 10, color: '#666' }}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F7' }}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 10,
          paddingBottom: 10,
          paddingHorizontal: 20,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#E0E0E0',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000' }}>
            Quản lý gói đăng ký
          </Text>
        </View>
      </View>

      {/* Wallet Balance */}
      {walletBalance && (
        <View
          style={{
            backgroundColor: '#FFFFFF',
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#E0E0E0',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="wallet-outline" size={20} color="#4CAF50" />
              <Text style={{ fontSize: 14, color: '#666', marginLeft: 8 }}>
                Số dư ví:
              </Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#4CAF50' }}>
              {formatCurrency(walletBalance.balance)}
            </Text>
          </View>
        </View>
      )}

      {/* Tab Navigation */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: '#E0E0E0',
        }}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 16,
            alignItems: 'center',
            borderBottomWidth: activeTab === 'packages' ? 2 : 0,
            borderBottomColor: '#000',
          }}
          onPress={() => setActiveTab('packages')}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: activeTab === 'packages' ? 'bold' : 'normal',
              color: activeTab === 'packages' ? '#000' : '#666',
            }}
          >
            Gói có sẵn
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 16,
            alignItems: 'center',
            borderBottomWidth: activeTab === 'history' ? 2 : 0,
            borderBottomColor: '#000',
          }}
          onPress={() => setActiveTab('history')}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: activeTab === 'history' ? 'bold' : 'normal',
              color: activeTab === 'history' ? '#000' : '#666',
            }}
          >
            Lịch sử đăng ký
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'packages' && (
          <>
            {renderActiveSubscriptionBanner()}
            
            {loading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#000" />
                <Text style={{ marginTop: 10, color: '#666' }}>Đang tải gói...</Text>
              </View>
            ) : packages.length > 0 ? (
              packages.map(renderPackageCard)
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="folder-open-outline" size={48} color="#CCC" />
                <Text style={{ fontSize: 16, color: '#666', marginTop: 16 }}>
                  Không có gói nào có sẵn
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'history' && (
          <>
            {loading ? (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                <ActivityIndicator size="large" color="#000" />
                <Text style={{ marginTop: 10, color: '#666' }}>Đang tải lịch sử...</Text>
              </View>
            ) : subscriptions.length > 0 ? (
              subscriptions.map(renderSubscriptionHistory)
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                <Ionicons name="receipt-outline" size={48} color="#CCC" />
                <Text style={{ fontSize: 16, color: '#666', marginTop: 16 }}>
                  Chưa có lịch sử đăng ký
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default SubscriptionManagementScreen;