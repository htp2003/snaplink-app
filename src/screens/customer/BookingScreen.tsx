import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Platform, Modal } from 'react-native';
import { getResponsiveSize } from '../../utils/responsive';
import { useNavigation } from '@react-navigation/native';
import { AntDesign, Feather, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ModernCalendar from '../../components/ModernCalendar';
import type { RootStackNavigationProp } from '../../navigation/types';

interface Location {
  id: number;
  name: string;
  address: string;
  imageUrl: string;
  rating: number;
  distance: string;
}

const locations: Location[] = [
  {
    id: 1,
    name: "Vinhomes Grand Park",
    address: "S6.02 Vinhomes Grand Park, Quận 9",
    imageUrl: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80",
    rating: 4.8,
    distance: "2.5km"
  },
  {
    id: 2,
    name: "Landmark 81 Rooftop",
    address: "720A Điện Biên Phủ, Bình Thạnh",
    imageUrl: "https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=400&q=80",
    rating: 4.9,
    distance: "5.2km"
  },
  {
    id: 3,
    name: "Saigon Skydeck",
    address: "36 Hồ Tùng Mậu, Quận 1",
    imageUrl: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80",
    rating: 4.7,
    distance: "8.1km"
  },
  {
    id: 4,
    name: "Bitexco Financial Tower",
    address: "2 Hải Triều, Quận 1",
    imageUrl: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80",
    rating: 4.6,
    distance: "7.8km"
  }
];

export default function BookingScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  // State chọn giờ
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location>(locations[0]);
  
  const times = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];

  // Tự động chọn index giờ khả dụng đầu tiên
  const getFirstAvailableTimeIdx = () => {
    const now = new Date();
    const nowHour = now.getHours();
    const nowMinute = now.getMinutes();
    for (let i = 0; i < times.length; i++) {
      const [h, m] = times[i].split(":").map(Number);
      if (h > nowHour || (h === nowHour && m > nowMinute)) {
        return i;
      }
    }
    return times.length - 1;
  };
  const [selectedTimeIdxs, setSelectedTimeIdxs] = useState<number[]>([getFirstAvailableTimeIdx()]);

  // Toggle chọn/bỏ khung giờ
  const handleToggleTime = (idx: number) => {
    setSelectedTimeIdxs(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx].sort((a, b) => a - b)
    );
  }

  const handleDateChange = (selectedDate: Date) => {
    setDate(selectedDate);
    setShowDatePicker(false);
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setShowLocationPicker(false);
  };

  const formatDate = (d: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    if (d.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (d.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return d.toLocaleDateString('en-US', { 
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const LocationModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showLocationPicker}
      onRequestClose={() => setShowLocationPicker(false)}
    >
      <View style={{ 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end'
      }}>
        <View style={{
          backgroundColor: '#1A1A1A',
          borderTopLeftRadius: getResponsiveSize(25),
          borderTopRightRadius: getResponsiveSize(25),
          paddingTop: getResponsiveSize(20),
          paddingHorizontal: getResponsiveSize(20),
          paddingBottom: getResponsiveSize(40),
          maxHeight: '70%'
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: getResponsiveSize(20),
            paddingBottom: getResponsiveSize(15),
            borderBottomWidth: 1,
            borderBottomColor: '#333'
          }}>
            <Text style={{
              color: '#fff',
              fontSize: getResponsiveSize(20),
              fontWeight: 'bold'
            }}>Choose Location</Text>
            <TouchableOpacity 
              onPress={() => setShowLocationPicker(false)}
              style={{
                backgroundColor: '#333',
                borderRadius: getResponsiveSize(20),
                padding: getResponsiveSize(8)
              }}
            >
              <AntDesign name="close" size={getResponsiveSize(18)} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Location List */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {locations.map((location) => (
              <TouchableOpacity
                key={location.id}
                onPress={() => handleLocationSelect(location)}
                style={{
                  backgroundColor: selectedLocation.id === location.id ? '#252F3F' : '#2A2A2A',
                  borderRadius: getResponsiveSize(16),
                  marginBottom: getResponsiveSize(12),
                  overflow: 'hidden',
                  borderWidth: selectedLocation.id === location.id ? 2 : 1,
                  borderColor: selectedLocation.id === location.id ? '#14B8A6' : '#333'
                }}
                activeOpacity={0.8}
              >
                <View style={{ flexDirection: 'row', padding: getResponsiveSize(12) }}>
                  {/* Location Image */}
                  <Image
                    source={{ uri: location.imageUrl }}
                    style={{
                      width: getResponsiveSize(70),
                      height: getResponsiveSize(70),
                      borderRadius: getResponsiveSize(12),
                      marginRight: getResponsiveSize(15)
                    }}
                  />
                  
                  {/* Location Info */}
                  <View style={{ flex: 1, justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{
                        color: '#fff',
                        fontSize: getResponsiveSize(16),
                        fontWeight: 'bold',
                        marginBottom: getResponsiveSize(4)
                      }}>{location.name}</Text>
                      <Text style={{
                        color: '#888',
                        fontSize: getResponsiveSize(13),
                        marginBottom: getResponsiveSize(8)
                      }}>{location.address}</Text>
                    </View>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="star" size={getResponsiveSize(14)} color="#FFD700" />
                        <Text style={{
                          color: '#FFD700',
                          fontSize: getResponsiveSize(13),
                          fontWeight: 'bold',
                          marginLeft: getResponsiveSize(4),
                          marginRight: getResponsiveSize(12)
                        }}>{location.rating}</Text>
                        <Feather name="map-pin" size={getResponsiveSize(12)} color="#666" />
                        <Text style={{
                          color: '#666',
                          fontSize: getResponsiveSize(12),
                          marginLeft: getResponsiveSize(4)
                        }}>{location.distance}</Text>
                      </View>
                      
                      {selectedLocation.id === location.id && (
                        <View style={{
                          backgroundColor: '#14B8A6',
                          borderRadius: getResponsiveSize(12),
                          padding: getResponsiveSize(4)
                        }}>
                          <Feather name="check" size={getResponsiveSize(14)} color="#fff" />
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#0F0F0F' }}>
      {/* Background + Back button + Avatar + Gradient overlay */}
      <View className="relative w-full mb-20" style={{ height: getResponsiveSize(320) }}>
        <Image
          className="w-full h-full object-cover rounded-b-3xl"
          source={{ uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80' }}
        />
        {/* Gradient overlay */}
        <LinearGradient
          colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.8)"]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: getResponsiveSize(120), borderBottomLeftRadius: getResponsiveSize(30), borderBottomRightRadius: getResponsiveSize(30) }}
        />
        {/* Nút back */}
        <TouchableOpacity
          className="absolute"
          style={{ top: getResponsiveSize(20), left: getResponsiveSize(10), padding: getResponsiveSize(10), zIndex: 10 }}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <View style={{
            backgroundColor: 'rgba(0,0,0,0.3)',
            borderRadius: getResponsiveSize(20),
            padding: getResponsiveSize(8)
          }}>
            <AntDesign name="arrowleft" size={getResponsiveSize(24)} color="#fff" />
          </View>
        </TouchableOpacity>
        {/* Avatar */}
        <View
          className="absolute bg-white shadow-lg"
          style={{
            left: '50%',
            bottom: getResponsiveSize(-48),
            transform: [{ translateX: -getResponsiveSize(48) }],
            borderRadius: getResponsiveSize(48),
            padding: 4,
            zIndex: 5,
            elevation: 8
          }}
        >
          <Image
            source={{ uri: 'https://randomuser.me/api/portraits/women/1.jpg' }}
            style={{
              width: getResponsiveSize(96),
              height: getResponsiveSize(96),
              borderRadius: getResponsiveSize(48),
              borderWidth: 3,
              borderColor: '#fff',
              backgroundColor: '#eee',
            }}
          />
        </View>
        {/* Tên photographer dưới avatar */}
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: getResponsiveSize(-105), alignItems: 'center', zIndex: 4 }}>
          <Text className="text-white font-bold" style={{ fontSize: getResponsiveSize(22), textAlign: 'center' }}>David Silva</Text>
          <Text className="text-gray-300 mt-1" style={{ fontSize: getResponsiveSize(14) }}>Chuyên gia chân dung</Text>
        </View>
      </View>

      {/* Box chứa thông tin booking */}
      <View
        className="mx-3 shadow-lg"
        style={{
          backgroundColor: "#1A1A1A",
          borderRadius: getResponsiveSize(25),
          padding: getResponsiveSize(24),
          marginTop: getResponsiveSize(50),
          elevation: 8,
          borderWidth: 1,
          borderColor: '#2A2A2A'
        }}
      >
        {/* Date */}
        <View className="flex-row items-center mb-4">
          <View style={{
            backgroundColor: 'rgba(20, 184, 166, 0.15)',
            padding: getResponsiveSize(10),
            borderRadius: getResponsiveSize(12),
            marginRight: getResponsiveSize(12),
          }}>
            <Feather name="calendar" size={getResponsiveSize(20)} color="#14B8A6" />
          </View>
          <Text className="text-gray-300 font-semibold" style={{ fontSize: getResponsiveSize(16) }}>Select Date</Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => setShowDatePicker(true)} 
          activeOpacity={0.8}
          style={{
            backgroundColor: '#252525',
            borderRadius: getResponsiveSize(18),
            padding: getResponsiveSize(18),
            marginBottom: getResponsiveSize(24),
            borderWidth: 1,
            borderColor: '#333',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={{
              color: '#14B8A6',
              fontSize: getResponsiveSize(18),
              fontWeight: 'bold',
              marginBottom: getResponsiveSize(3),
            }}>
              {formatDate(date)}
            </Text>
            <Text style={{
              color: '#888',
              fontSize: getResponsiveSize(13),
            }}>
              {date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Text>
          </View>
          <AntDesign name="down" size={getResponsiveSize(16)} color="#666" />
        </TouchableOpacity>

        {/* Modern Calendar Modal */}
        <ModernCalendar
          date={date}
          onDateChange={handleDateChange}
          visible={showDatePicker}
          onClose={() => setShowDatePicker(false)}
        />

        <View style={{ height: 1, backgroundColor: "#2A2A2A", marginVertical: getResponsiveSize(12) }} />

        {/* Time */}
        <View className="flex-row items-center mb-4">
          <View style={{
            backgroundColor: 'rgba(24, 201, 100, 0.15)',
            padding: getResponsiveSize(10),
            borderRadius: getResponsiveSize(12),
            marginRight: getResponsiveSize(12),
          }}>
            <Feather name="clock" size={getResponsiveSize(20)} color="#14B8A6" />
          </View>
          <Text className="text-gray-300 font-semibold" style={{ fontSize: getResponsiveSize(16) }}>Available Times</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
          {(function() {
            const today = new Date();
            const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
            let filteredTimes = times;
            if (isToday) {
              const nowHour = today.getHours();
              const nowMinute = today.getMinutes();
              filteredTimes = times.filter(t => {
                const [h, m] = t.split(":").map(Number);
                return h > nowHour || (h === nowHour && m > nowMinute);
              });
            }
            return filteredTimes.map((time, idx) => {
              const realIdx = times.indexOf(time);
              const isSelected = selectedTimeIdxs.includes(realIdx);
              return (
                <TouchableOpacity
                  key={time}
                  onPress={() => handleToggleTime(realIdx)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: isSelected ? "#14B8A6" : "#2A2A2A",
                    borderRadius: getResponsiveSize(20),
                    paddingVertical: getResponsiveSize(14),
                    paddingHorizontal: getResponsiveSize(24),
                    marginRight: getResponsiveSize(12),
                    shadowColor: isSelected ? '#14B8A6' : 'transparent',
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: isSelected ? 6 : 0,
                    borderWidth: isSelected ? 0 : 1,
                    borderColor: '#404040',
                  }}
                >
                  <Text style={{
                    color: isSelected ? '#fff' : '#d1d5db',
                    fontWeight: 'bold',
                    fontSize: getResponsiveSize(16)
                  }}>{time}</Text>
                </TouchableOpacity>
              );
            });
          })()}
        </ScrollView>

        <View style={{ height: 1, backgroundColor: "#2A2A2A", marginVertical: getResponsiveSize(12) }} />

        {/* Location */}
        <View className="flex-row items-center mb-4">
          <View style={{
            backgroundColor: 'rgba(24, 201, 100, 0.15)',
            padding: getResponsiveSize(10),
            borderRadius: getResponsiveSize(12),
            marginRight: getResponsiveSize(12),
          }}>
            <Feather name="map-pin" size={getResponsiveSize(20)} color="#14B8A6" />
          </View>
          <Text className="text-gray-300 font-semibold" style={{ fontSize: getResponsiveSize(16) }}>Location</Text>
        </View>

        {/* Location Selector */}
        <TouchableOpacity
          onPress={() => setShowLocationPicker(true)}
          activeOpacity={0.8}
          style={{
            backgroundColor: '#252525',
            borderRadius: getResponsiveSize(18),
            padding: getResponsiveSize(16),
            marginBottom: getResponsiveSize(16),
            borderWidth: 1,
            borderColor: '#333',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{
              color: '#fff',
              fontSize: getResponsiveSize(16),
              fontWeight: 'bold',
              marginBottom: getResponsiveSize(3)
            }}>{selectedLocation.name}</Text>
            <Text style={{
              color: '#888',
              fontSize: getResponsiveSize(13)
            }}>{selectedLocation.address}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: getResponsiveSize(6) }}>
              <Ionicons name="star" size={getResponsiveSize(14)} color="#FFD700" />
              <Text style={{
                color: '#FFD700',
                fontSize: getResponsiveSize(12),
                fontWeight: 'bold',
                marginLeft: getResponsiveSize(4),
                marginRight: getResponsiveSize(12)
              }}>{selectedLocation.rating}</Text>
              <Feather name="map-pin" size={getResponsiveSize(12)} color="#666" />
              <Text style={{
                color: '#666',
                fontSize: getResponsiveSize(12),
                marginLeft: getResponsiveSize(4)
              }}>{selectedLocation.distance}</Text>
            </View>
          </View>
          <AntDesign name="down" size={getResponsiveSize(16)} color="#666" />
        </TouchableOpacity>

        {/* Location Preview Image */}
        <View className="overflow-hidden rounded-2xl shadow-lg mb-6">
          <Image
            source={{ uri: selectedLocation.imageUrl }}
            style={{ width: '100%', height: getResponsiveSize(140), resizeMode: 'cover' }}
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.6)"]}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: getResponsiveSize(60),
              justifyContent: 'flex-end',
              paddingHorizontal: getResponsiveSize(16),
              paddingBottom: getResponsiveSize(12)
            }}
          >
            <Text style={{
              color: '#fff',
              fontSize: getResponsiveSize(14),
              fontWeight: 'bold'
            }}>{selectedLocation.name}</Text>
          </LinearGradient>
        </View>

        {/* Location Modal */}
        <LocationModal />

        {/* Nút xác nhận booking */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            // Navigate to OrderDetail with booking data (serialize Date to string)
            navigation.navigate('OrderDetail', {
              photographer: {
                id: 1,
                name: 'David Silva',
                specialty: 'Chuyên gia chân dung',
                avatar: 'https://randomuser.me/api/portraits/women/1.jpg',
                hourlyRate: 500000
              },
              selectedDate: date.toISOString(), // ✅ Convert Date to string
              selectedTimes: selectedTimeIdxs.map(idx => times[idx]),
              selectedLocation: selectedLocation,
              totalHours: selectedTimeIdxs.length,
              totalPrice: selectedTimeIdxs.length * 500000
            });
          }}
          style={{
            borderRadius: getResponsiveSize(20),
            overflow: 'hidden',
            marginTop: getResponsiveSize(8),
            elevation: 8,
            shadowColor: '#14B8A6',
            shadowOpacity: 0.4,
            shadowRadius: 15
          }}
        >
          <LinearGradient
            colors={["#14B8A6", "#5EEAD4"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ paddingVertical: getResponsiveSize(18), alignItems: 'center' }}
          >
            <View className="flex-row items-center justify-center">
              <MaterialIcons name="check-circle" size={getResponsiveSize(24)} color="#fff" style={{ marginRight: 10 }} />
              <Text className="text-white font-bold" style={{ fontSize: getResponsiveSize(18) }}>Confirm Booking</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}