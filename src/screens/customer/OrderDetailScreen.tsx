import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StatusBar, Modal, Alert } from 'react-native';
import { getResponsiveSize } from '../../utils/responsive';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AntDesign, Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList, RootStackNavigationProp } from '../../navigation/types';

type OrderDetailScreenRouteProp = RouteProp<RootStackParamList, 'OrderDetail'>;

export default function OrderDetailScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<OrderDetailScreenRouteProp>();
  const params = route.params;
  
  // ✅ Parse string back to Date
  const selectedDate = new Date(params.selectedDate);
  
  // State for success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const serviceFee = params.totalPrice * 0.1; // 10% service fee
  const finalTotal = params.totalPrice + serviceFee;

  // Handle booking confirmation
  const handleBookNow = async () => {
    setIsBooking(true);
    
    try {
      // Simulate API call - replace with your actual booking API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Show success modal
      setIsBooking(false);
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
      
    } catch (error) {
      setIsBooking(false);
      Alert.alert('Error', 'Failed to book appointment. Please try again.');
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
            Your photography session has been confirmed. We'll send you a confirmation email shortly.
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
            }}>{params.photographer.name}</Text>
            
            <Text style={{
              color: '#888',
              fontSize: getResponsiveSize(13)
            }}>{formatDate(selectedDate)} • {params.selectedTimes.join(', ')}</Text>
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
    <View style={{ flex: 1, backgroundColor: '#0F0F0F' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F0F" />
      
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: getResponsiveSize(20),
        paddingTop: getResponsiveSize(50),
        paddingBottom: getResponsiveSize(20),
        backgroundColor: '#1A1A1A',
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A2A'
      }}>
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

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photographer Info Card */}
        <View style={{
          backgroundColor: '#1A1A1A',
          marginHorizontal: getResponsiveSize(20),
          marginTop: getResponsiveSize(20),
          borderRadius: getResponsiveSize(20),
          padding: getResponsiveSize(20),
          borderWidth: 1,
          borderColor: '#2A2A2A'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: getResponsiveSize(16) }}>
            <View style={{
              backgroundColor: 'rgba(20, 184, 166, 0.15)',
              padding: getResponsiveSize(8),
              borderRadius: getResponsiveSize(10),
              marginRight: getResponsiveSize(12)
            }}>
              <Feather name="user" size={getResponsiveSize(20)} color="#14B8A6" />
            </View>
            <Text style={{
              color: '#fff',
              fontSize: getResponsiveSize(18),
              fontWeight: 'bold'
            }}>Photographer</Text>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image
              source={{ uri: params.photographer.avatar }}
              style={{
                width: getResponsiveSize(60),
                height: getResponsiveSize(60),
                borderRadius: getResponsiveSize(30),
                marginRight: getResponsiveSize(16),
                borderWidth: 2,
                borderColor: '#14B8A6'
              }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{
                color: '#fff',
                fontSize: getResponsiveSize(18),
                fontWeight: 'bold',
                marginBottom: getResponsiveSize(4)
              }}>{params.photographer.name}</Text>
              <Text style={{
                color: '#888',
                fontSize: getResponsiveSize(14)
              }}>{params.photographer.specialty}</Text>
              <Text style={{
                color: '#14B8A6',
                fontSize: getResponsiveSize(14),
                fontWeight: 'bold',
                marginTop: getResponsiveSize(4)
              }}>{formatCurrency(params.photographer.hourlyRate)}/hour</Text>
            </View>
          </View>
        </View>

        {/* Booking Details Card */}
        <View style={{
          backgroundColor: '#1A1A1A',
          marginHorizontal: getResponsiveSize(20),
          marginTop: getResponsiveSize(16),
          borderRadius: getResponsiveSize(20),
          padding: getResponsiveSize(20),
          borderWidth: 1,
          borderColor: '#2A2A2A'
        }}>
          {/* Date & Time */}
          <View style={{ marginBottom: getResponsiveSize(20) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: getResponsiveSize(12) }}>
              <View style={{
                backgroundColor: 'rgba(20, 184, 166, 0.15)',
                padding: getResponsiveSize(8),
                borderRadius: getResponsiveSize(10),
                marginRight: getResponsiveSize(12)
              }}>
                <Feather name="calendar" size={getResponsiveSize(18)} color="#14B8A6" />
              </View>
              <Text style={{
                color: '#fff',
                fontSize: getResponsiveSize(16),
                fontWeight: 'bold'
              }}>Date & Time</Text>
            </View>
            
            <Text style={{
              color: '#14B8A6',
              fontSize: getResponsiveSize(16),
              fontWeight: 'bold',
              marginBottom: getResponsiveSize(4)
            }}>{formatDate(selectedDate)}</Text>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: getResponsiveSize(8) }}>
              {params.selectedTimes.map((time, index) => (
                <View
                  key={index}
                  style={{
                    backgroundColor: '#2A2A2A',
                    borderRadius: getResponsiveSize(12),
                    paddingHorizontal: getResponsiveSize(12),
                    paddingVertical: getResponsiveSize(6),
                    marginRight: getResponsiveSize(8),
                    marginBottom: getResponsiveSize(6),
                    borderWidth: 1,
                    borderColor: '#14B8A6'
                  }}
                >
                  <Text style={{
                    color: '#14B8A6',
                    fontSize: getResponsiveSize(14),
                    fontWeight: 'bold'
                  }}>{time}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Location */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: getResponsiveSize(12) }}>
              <View style={{
                backgroundColor: 'rgba(20, 184, 166, 0.15)',
                padding: getResponsiveSize(8),
                borderRadius: getResponsiveSize(10),
                marginRight: getResponsiveSize(12)
              }}>
                <Feather name="map-pin" size={getResponsiveSize(18)} color="#14B8A6" />
              </View>
              <Text style={{
                color: '#fff',
                fontSize: getResponsiveSize(16),
                fontWeight: 'bold'
              }}>Location</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={{ uri: params.selectedLocation.imageUrl }}
                style={{
                  width: getResponsiveSize(50),
                  height: getResponsiveSize(50),
                  borderRadius: getResponsiveSize(12),
                  marginRight: getResponsiveSize(12)
                }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{
                  color: '#fff',
                  fontSize: getResponsiveSize(16),
                  fontWeight: 'bold',
                  marginBottom: getResponsiveSize(2)
                }}>{params.selectedLocation.name}</Text>
                <Text style={{
                  color: '#888',
                  fontSize: getResponsiveSize(13),
                  marginBottom: getResponsiveSize(4)
                }}>{params.selectedLocation.address}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="star" size={getResponsiveSize(12)} color="#FFD700" />
                  <Text style={{
                    color: '#FFD700',
                    fontSize: getResponsiveSize(12),
                    fontWeight: 'bold',
                    marginLeft: getResponsiveSize(4),
                    marginRight: getResponsiveSize(12)
                  }}>{params.selectedLocation.rating}</Text>
                  <Feather name="map-pin" size={getResponsiveSize(10)} color="#666" />
                  <Text style={{
                    color: '#666',
                    fontSize: getResponsiveSize(12),
                    marginLeft: getResponsiveSize(4)
                  }}>{params.selectedLocation.distance}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Price Breakdown Card */}
        <View style={{
          backgroundColor: '#1A1A1A',
          marginHorizontal: getResponsiveSize(20),
          marginTop: getResponsiveSize(16),
          borderRadius: getResponsiveSize(20),
          padding: getResponsiveSize(20),
          borderWidth: 1,
          borderColor: '#2A2A2A'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: getResponsiveSize(16) }}>
            <View style={{
              backgroundColor: 'rgba(20, 184, 166, 0.15)',
              padding: getResponsiveSize(8),
              borderRadius: getResponsiveSize(10),
              marginRight: getResponsiveSize(12)
            }}>
              <Feather name="credit-card" size={getResponsiveSize(18)} color="#14B8A6" />
            </View>
            <Text style={{
              color: '#fff',
              fontSize: getResponsiveSize(16),
              fontWeight: 'bold'
            }}>Price Breakdown</Text>
          </View>

          {/* Service Details */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: getResponsiveSize(12) }}>
            <Text style={{ color: '#888', fontSize: getResponsiveSize(14) }}>
              Photography Service ({params.totalHours} hours)
            </Text>
            <Text style={{ color: '#fff', fontSize: getResponsiveSize(14), fontWeight: 'bold' }}>
              {formatCurrency(params.totalPrice)}
            </Text>
          </View>

          {/* Service Fee */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: getResponsiveSize(12) }}>
            <Text style={{ color: '#888', fontSize: getResponsiveSize(14) }}>Service Fee (10%)</Text>
            <Text style={{ color: '#fff', fontSize: getResponsiveSize(14), fontWeight: 'bold' }}>
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
    </View>
  );
}