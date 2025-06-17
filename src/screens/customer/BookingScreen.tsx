import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { getResponsiveSize } from '../../utils/responsive';
import { useNavigation } from '@react-navigation/native';
import { AntDesign, Feather, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ModernCalendar from '../../components/ModernCalendar';


export default function BookingScreen() {
  // State chọn giờ
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const times = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];
  const navigation = useNavigation();

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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#101010' }}>
      {/* Background + Back button + Avatar + Gradient overlay */}
      <View className="relative w-full mb-20" style={{ height: getResponsiveSize(320) }}>
        <Image
          className="w-full h-full object-cover rounded-b-3xl"
          source={{ uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80' }}
        />
        {/* Gradient overlay */}
        <LinearGradient
          colors={["rgba(0,0,0,0.0)", "rgba(0,0,0,0.7)"]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: getResponsiveSize(120), borderBottomLeftRadius: getResponsiveSize(30), borderBottomRightRadius: getResponsiveSize(30) }}
        />
        {/* Nút back */}
        <TouchableOpacity
          className="absolute"
          style={{ top: getResponsiveSize(20), left: getResponsiveSize(10), padding: getResponsiveSize(10), zIndex: 10 }}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <AntDesign name="arrowleft" size={getResponsiveSize(26)} color="#fff" />
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
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: getResponsiveSize(-100), alignItems: 'center', zIndex: 4 }}>
          <Text className="text-white font-bold" style={{ fontSize: getResponsiveSize(22), textAlign: 'center' }}>David Silva</Text>
          <Text className="text-gray-300 mt-1" style={{ fontSize: getResponsiveSize(14) }}>Chuyên gia chân dung</Text>
        </View>
      </View>

      {/* Box chứa thông tin booking */}
      <View
        className="mx-3 shadow-lg"
        style={{
          backgroundColor: "#18181B",
          borderRadius: getResponsiveSize(22),
          padding: getResponsiveSize(22),
          marginTop: getResponsiveSize(30),
          elevation: 8
        }}
      >
        {/* Date */}
        <View className="flex-row items-center mb-3">
          <View style={{
            backgroundColor: '#2A2A2A',
            padding: getResponsiveSize(8),
            borderRadius: getResponsiveSize(10),
            marginRight: getResponsiveSize(12),
          }}>
            <Feather name="calendar" size={getResponsiveSize(18)} color="#18C964" />
          </View>
          <Text className="text-gray-400 font-semibold" style={{ fontSize: getResponsiveSize(15) }}>Select Date</Text>
        </View>
        
        <TouchableOpacity 
          onPress={() => setShowDatePicker(true)} 
          activeOpacity={0.8}
          style={{
            backgroundColor: '#252525',
            borderRadius: getResponsiveSize(16),
            padding: getResponsiveSize(16),
            marginBottom: getResponsiveSize(20),
            borderWidth: 1,
            borderColor: '#333',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={{
              color: '#18C964',
              fontSize: getResponsiveSize(18),
              fontWeight: 'bold',
              marginBottom: getResponsiveSize(2),
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

        <View style={{ height: 1, backgroundColor: "#222", marginVertical: getResponsiveSize(10) }} />

        {/* Time */}
        <View className="flex-row items-center mb-3">
          <View style={{
            backgroundColor: '#2A2A2A',
            padding: getResponsiveSize(8),
            borderRadius: getResponsiveSize(10),
            marginRight: getResponsiveSize(12),
          }}>
            <Feather name="clock" size={getResponsiveSize(18)} color="#18C964" />
          </View>
          <Text className="text-gray-400 font-semibold" style={{ fontSize: getResponsiveSize(15) }}>Available Times</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
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
                    backgroundColor: isSelected ? "#18C964" : "#23272F",
                    borderRadius: getResponsiveSize(18),
                    paddingVertical: getResponsiveSize(12),
                    paddingHorizontal: getResponsiveSize(22),
                    marginRight: getResponsiveSize(10),
                    shadowColor: isSelected ? '#18C964' : 'transparent',
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: isSelected ? 6 : 0,
                    borderWidth: isSelected ? 0 : 1,
                    borderColor: '#333',
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

        {/* Location */}
        <View className="flex-row items-center mt-4 mb-1">
          <View style={{
            backgroundColor: '#2A2A2A',
            padding: getResponsiveSize(8),
            borderRadius: getResponsiveSize(10),
            marginRight: getResponsiveSize(12),
          }}>
            <Feather name="map-pin" size={getResponsiveSize(18)} color="#18C964" />
          </View>
          <Text className="text-gray-400 font-semibold" style={{ fontSize: getResponsiveSize(15) }}>Location</Text>
        </View>
        <Text className="text-white mb-2" style={{ fontSize: getResponsiveSize(14) }}>S6.02 Vinhomes Grand Park</Text>
        {/* Map giả lập bằng hình ảnh */}
        <View className="overflow-hidden rounded-2xl shadow-lg mb-3">
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80' }}
            style={{ width: '100%', height: getResponsiveSize(120), resizeMode: 'cover' }}
          />
        </View>

        {/* Nút xác nhận booking */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={{
            borderRadius: getResponsiveSize(18),
            overflow: 'hidden',
            marginTop: getResponsiveSize(10),
            elevation: 6,
            shadowColor: '#18C964',
            shadowOpacity: 0.5,
            shadowRadius: 12
          }}
        >
          <LinearGradient
            colors={["#18C964", "#38ef7d"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={{ paddingVertical: getResponsiveSize(16), alignItems: 'center' }}
          >
            <View className="flex-row items-center justify-center">
              <MaterialIcons name="check-circle" size={getResponsiveSize(22)} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white font-bold" style={{ fontSize: getResponsiveSize(18) }}>Confirm Booking</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}