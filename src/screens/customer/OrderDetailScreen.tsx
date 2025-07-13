import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  ScrollView, 
  StatusBar, 
  Modal, 
  Alert, 
  StyleSheet, 
  ActivityIndicator 
} from 'react-native';
import { getResponsiveSize } from '../../utils/responsive';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AntDesign, Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, RootStackNavigationProp } from '../../navigation/types';
import { useBooking } from '../../hooks/useBooking';

// Define the type for location
interface Location {
  id: number;
  name: string;
  hourlyRate?: number;
  imageUrl?: string;
}

// Define the type for photographer
interface Photographer {
  photographerId: number;
  fullName: string;
  profileImage?: string;
  hourlyRate: number;
}

// Define the type for price calculation
interface PriceCalculation {
  totalPrice: number;
  photographerFee: number;
  locationFee?: number;
}

// Extend the route params type
type OrderDetailRouteParams = {
  photographer: Photographer;
  selectedDate: string;
  selectedStartTime: string;
  selectedEndTime: string;
  selectedLocation?: Location;
  specialRequests?: string;
  priceCalculation: PriceCalculation;
};

type OrderDetailScreenRouteProp = RouteProp<{ OrderDetail: OrderDetailRouteParams }, 'OrderDetail'>;

export default function OrderDetailScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<OrderDetailScreenRouteProp>();
  const params = route.params;
  
  if (!params) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14B8A6" />
      </View>
    );
  }
  
  // ✅ Parse string back to Date
  const selectedDate = new Date(params.selectedDate);
  
  // State for success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  
  // Use the booking hook
  const { createBooking } = useBooking();

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return 'Liên hệ';
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  // Calculate total hours from start and end time
  const calculateTotalHours = () => {
    if (!params.selectedStartTime || !params.selectedEndTime) return 0;
    
    const [startHour, startMinute] = params.selectedStartTime.split(':').map(Number);
    const [endHour, endMinute] = params.selectedEndTime.split(':').map(Number);
    
    const startDate = new Date(selectedDate);
    startDate.setHours(startHour, startMinute, 0, 0);
    
    const endDate = new Date(selectedDate);
    endDate.setHours(endHour, endMinute, 0, 0);
    
    // Calculate difference in hours
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; // Round to 1 decimal place
  };
  
  // Calculate total hours, service fee and final total using useMemo
  const { totalHours, serviceFee, finalTotal } = useMemo(() => {
    const hours = calculateTotalHours();
    const fee = params.priceCalculation ? params.priceCalculation.totalPrice * 0.1 : 0;
    const total = params.priceCalculation ? params.priceCalculation.totalPrice + fee : 0;
    
    return {
      totalHours: hours,
      serviceFee: fee,
      finalTotal: total
    };
  }, [params.priceCalculation, params.selectedStartTime, params.selectedEndTime]);

  // Handle booking confirmation
  const handleBookNow = async () => {
    if (!params.priceCalculation) return;
    
    setIsBooking(true);
    
    try {
      // Format the date and time for the API
      const startDate = new Date(params.selectedDate);
      const [startHours, startMinutes] = params.selectedStartTime.split(':').map(Number);
      const [endHours, endMinutes] = params.selectedEndTime.split(':').map(Number);
      
      // Set the time on the selected date
      startDate.setHours(startHours, startMinutes, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(endHours, endMinutes, 0, 0);
      
      // Create the booking data matching CreateBookingRequest type
      const bookingData = {
        photographerId: params.photographer.photographerId,
        startDatetime: startDate.toISOString(),
        endDatetime: endDate.toISOString(),
        specialRequests: params.specialRequests,
        ...(params.selectedLocation?.id && { locationId: params.selectedLocation.id })
      };
      
      // Get current user ID (you might need to get this from your auth context)
      const currentUserId = 1; // Replace with actual user ID from auth context
      
      // Call createBooking with the correct signature
      const booking = await createBooking(currentUserId, bookingData);
      
      if (booking) {
        // Show success modal
        setShowSuccessModal(true);
        
        // Auto close modal and navigate after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
          // Navigate to customer home screen
          navigation.reset({
            index: 0,
            routes: [{ name: 'CustomerMain', params: { screen: 'CustomerHomeScreen' } }],
          });
        }, 3000);
      }
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Lỗi', 'Không thể tạo booking. Vui lòng thử lại.');
    } finally {
      setIsBooking(false);
    }
  };

  // Success Modal Component
  const SuccessModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showSuccessModal}
      onRequestClose={() => setShowSuccessModal(false)}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: getResponsiveSize(40)
      }}>
        <View style={{
          backgroundColor: '#1A1A1A',
          borderRadius: getResponsiveSize(25),
          padding: getResponsiveSize(40),
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#2A2A2A',
          width: '100%',
          maxWidth: getResponsiveSize(350)
        }}>
          {/* Success Icon */}
          <View style={{
            backgroundColor: 'rgba(20, 184, 166, 0.15)',
            borderRadius: getResponsiveSize(50),
            padding: getResponsiveSize(20),
            marginBottom: getResponsiveSize(24)
          }}>
            <MaterialIcons name="check-circle" size={getResponsiveSize(60)} color="#14B8A6" />
          </View>
          
          {/* Success Message */}
          <Text style={{
            color: '#fff',
            fontSize: getResponsiveSize(24),
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: getResponsiveSize(12)
          }}>Booking Successful!</Text>
          
          <Text style={{
            color: '#888',
            fontSize: getResponsiveSize(16),
            textAlign: 'center',
            lineHeight: getResponsiveSize(24),
            marginBottom: getResponsiveSize(20)
          }}>
            Buổi chụp ảnh của bạn đã được xác nhận. Chúng tôi sẽ gửi email xác nhận cho bạn trong giây lát.
          </Text>
          
          {/* Booking Details Summary */}
          <View style={{
            backgroundColor: '#252525',
            borderRadius: getResponsiveSize(16),
            padding: getResponsiveSize(16),
            width: '100%',
            marginBottom: getResponsiveSize(24)
          }}>
            <Text style={{
              color: '#14B8A6',
              fontSize: getResponsiveSize(14),
              fontWeight: 'bold',
              marginBottom: getResponsiveSize(8)
            }}>Booking Reference: #BK{Date.now().toString().slice(-6)}</Text>
            
            <Text style={{
              color: '#fff',
              fontSize: getResponsiveSize(14),
              marginBottom: getResponsiveSize(4)
            }}>{params.photographer.fullName}</Text>
            
            <Text style={{
              color: '#888',
              fontSize: getResponsiveSize(13)
            }}>{formatDate(selectedDate)} • {params.selectedStartTime} - {params.selectedEndTime}</Text>
          </View>
          
          {/* Auto redirect message */}
          <Text style={{
            color: '#666',
            fontSize: getResponsiveSize(12),
            textAlign: 'center'
          }}>Redirecting to home in 3 seconds...</Text>
        </View>
      </View>
    </Modal>
  );



  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{
            backgroundColor: '#2A2A2A',
            borderRadius: getResponsiveSize(12),
            padding: getResponsiveSize(10)
          }}
          activeOpacity={0.8}
        >
          <AntDesign name="arrowleft" size={getResponsiveSize(24)} color="#fff" />
        </TouchableOpacity>
        
        <Text style={{
          color: '#fff',
          fontSize: getResponsiveSize(20),
          fontWeight: 'bold'
        }}>Order Details</Text>
        
        <View style={{ width: getResponsiveSize(44) }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photographer Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Feather name="user" size={getResponsiveSize(20)} color="#14B8A6" />
            </View>
            <Text style={styles.cardTitle}>

// ...

<View style={styles.locationInfo}>
  <Image
    source={{ uri: 'https://via.placeholder.com/300x200?text=Location' }}
    style={styles.locationImage}
    resizeMode="cover"
  />
  <View style={styles.locationDetails}>
    <Text style={styles.locationName}>{params.selectedLocation?.name || 'Không có địa điểm'}</Text>
    {params.selectedLocation?.hourlyRate && (
      <Text style={styles.locationAddress}>Giá thuê: {formatCurrency(params.selectedLocation.hourlyRate)}/giờ</Text>
    )}
  </View>
</View>

// ...

<View style={styles.priceRow}>
  <Text style={styles.priceLabel}>Tổng thời gian</Text>
  <Text style={styles.priceValue}>{totalHours} giờ</Text>
</View>

<View style={styles.priceRow}>
  <Text style={styles.priceLabel}>Tổng cộng</Text>
  <Text style={styles.finalPrice}>{formatCurrency(finalTotal)}</Text>
</View>
              {formatCurrency(serviceFee)}
            </Text>
          </View>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: '#2A2A2A', marginVertical: getResponsiveSize(16) }} />

          {/* Total */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ color: '#fff', fontSize: getResponsiveSize(16), fontWeight: 'bold' }}>Total</Text>
            <Text style={{ color: '#14B8A6', fontSize: getResponsiveSize(18), fontWeight: 'bold' }}>
              {formatCurrency(finalTotal)}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{
          flexDirection: 'row',
          marginHorizontal: getResponsiveSize(20),
          marginTop: getResponsiveSize(24),
          marginBottom: getResponsiveSize(40),
          gap: getResponsiveSize(12)
        }}>
          {/* Edit Button */}
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            style={{
              flex: 1,
              backgroundColor: '#2A2A2A',
              borderRadius: getResponsiveSize(16),
              paddingVertical: getResponsiveSize(16),
              alignItems: 'center',
              borderWidth: 1,
              borderColor: '#404040'
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Feather name="edit-3" size={getResponsiveSize(18)} color="#fff" />
              <Text style={{
                color: '#fff',
                fontSize: getResponsiveSize(16),
                fontWeight: 'bold',
                marginLeft: getResponsiveSize(8)
              }}>Edit</Text>
            </View>
          </TouchableOpacity>

          {/* Confirm Booking Button */}
          <TouchableOpacity
            onPress={handleBookNow}
            disabled={isBooking}
            activeOpacity={0.8}
            style={{
              flex: 2,
              borderRadius: getResponsiveSize(16),
              overflow: 'hidden',
              elevation: 8,
              shadowColor: '#14B8A6',
              shadowOpacity: 0.4,
              shadowRadius: 15,
              opacity: isBooking ? 0.6 : 1
            }}
          >
            <LinearGradient
              colors={["#14B8A6", "#5EEAD4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                paddingVertical: getResponsiveSize(16),
                alignItems: 'center'
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isBooking ? (
                  <>
                    <MaterialIcons name="hourglass-empty" size={getResponsiveSize(20)} color="#fff" />
                    <Text style={{
                      color: '#fff',
                      fontSize: getResponsiveSize(16),
                      fontWeight: 'bold',
                      marginLeft: getResponsiveSize(8)
                    }}>Processing...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="payment" size={getResponsiveSize(20)} color="#fff" />
                    <Text style={{
                      color: '#fff',
                      fontSize: getResponsiveSize(16),
                      fontWeight: 'bold',
                      marginLeft: getResponsiveSize(8)
                    }}>Book & Pay</Text>
                  </>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        
        {/* Success Modal */}
        <SuccessModal />
      </ScrollView>
      
      {/* Success Modal */}
      <SuccessModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveSize(20),
    paddingTop: getResponsiveSize(50),
    paddingBottom: getResponsiveSize(20),
    backgroundColor: '#1A1A1A',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: getResponsiveSize(100),
  },
  card: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: getResponsiveSize(20),
    marginTop: getResponsiveSize(20),
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(20),
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(16),
  },
  iconContainer: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    padding: getResponsiveSize(8),
    borderRadius: getResponsiveSize(10),
    marginRight: getResponsiveSize(12),
  },
  cardTitle: {
    color: '#fff',
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
  },
  locationInfo: {
    marginTop: getResponsiveSize(16),
    backgroundColor: '#1A1A1A',
    borderRadius: getResponsiveSize(16),
    overflow: 'hidden',
    marginHorizontal: getResponsiveSize(20),
  },
  locationImage: {
    width: '100%',
    height: getResponsiveSize(160),
  },
  locationDetails: {
    padding: getResponsiveSize(16),
  },
  locationName: {
    color: '#fff',
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(4),
  },
  locationAddress: {
    color: '#888',
    fontSize: getResponsiveSize(14),
  },
  priceSection: {
    backgroundColor: '#1A1A1A',
    margin: getResponsiveSize(20),
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(20),
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: getResponsiveSize(12),
  },
  priceLabel: {
    color: '#888',
    fontSize: getResponsiveSize(14),
  },
  priceValue: {
    color: '#fff',
    fontSize: getResponsiveSize(14),
    fontWeight: '500',
  },
  finalPrice: {
    color: '#14B8A6',
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSize(20),
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: getResponsiveSize(20),
    padding: getResponsiveSize(24),
    alignItems: 'center',
    width: '100%',
    maxWidth: getResponsiveSize(350),
  },
  successIcon: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderRadius: getResponsiveSize(50),
    padding: getResponsiveSize(20),
    marginBottom: getResponsiveSize(24),
  },
  successTitle: {
    color: '#fff',
    fontSize: getResponsiveSize(24),
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(12),
    textAlign: 'center',
  },
  successMessage: {
    color: '#888',
    fontSize: getResponsiveSize(16),
    textAlign: 'center',
    marginBottom: getResponsiveSize(20),
    lineHeight: getResponsiveSize(24),
  },
  bookingSummary: {
    backgroundColor: '#252525',
    borderRadius: getResponsiveSize(16),
    padding: getResponsiveSize(16),
    width: '100%',
    marginBottom: getResponsiveSize(24),
  },
  bookingReference: {
    color: '#14B8A6',
    fontSize: getResponsiveSize(14),
    fontWeight: 'bold',
    marginBottom: getResponsiveSize(8),
  },
  bookingDateTime: {
    color: '#888',
    fontSize: getResponsiveSize(13),
  },
  redirectMessage: {
    color: '#666',
    fontSize: getResponsiveSize(12),
    textAlign: 'center',
  },
});