import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { getResponsiveSize } from '../../utils/responsive';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function BookingScreen() {
  // State chọn giờ
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const times = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"];

  const handleSelectTime = (time: string) => {
    setSelectedTimes(prev =>
      prev.includes(time)
        ? prev.filter(t => t !== time)
        : [...prev, time]
    );
  };

  const handleDataChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  }

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <ScrollView className="flex-1 bg-black">
      {/* Thông tin photographer */}
      <View className="items-center mt-6 mb-4">
        <Image
          source={{ uri: "https://randomuser.me/api/portraits/women/1.jpg" }}
          style={{
            width: getResponsiveSize(60),
            height: getResponsiveSize(60),
            borderRadius: getResponsiveSize(30),
            marginBottom: getResponsiveSize(8)
          }}
        />
        <Text className="text-white text-lg font-bold">David Silva</Text>
        <Text className="text-white mt-1">Booking</Text>
      </View>

      {/* Box chứa thông tin booking */}
      <View
        className="mx-3"
        style={{
          backgroundColor: "#2D2D2D",
          borderRadius: getResponsiveSize(18),
          padding: getResponsiveSize(18)
        }}
      >
        {/* Date */}
        <Text className="text-gray-400 font-semibold mb-1" style={{ fontSize: getResponsiveSize(15) }}>Date</Text>
        <TouchableOpacity onPress={() => setShowDatePicker(true)}>
          <Text className="text-white mb-2 underline" style={{ fontSize: getResponsiveSize(16) }}>
            {formatDate(date)}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          Platform.OS === 'android' || Platform.OS === 'ios' ? (
            <DateTimePicker
              value={date}
              mode='date'
              display={Platform.OS === "ios" ? "spinner" : "default"}
              onChange={handleDataChange}
            />
          ) : (
            // Fallback cho web
            <input
              type="date"
              style={{
                background: "#222",
                color: "#fff",
                borderRadius: 8,
                padding: 8,
                marginTop: 8,
                marginBottom: 8,
              }}
              value={date.toISOString().substring(0, 10)}
              onChange={e => {
                setDate(new Date(e.target.value));
                setShowDatePicker(false);
              }}
              autoFocus
            />
          )
        )}
        <View style={{ height: 1, backgroundColor: "#444", marginVertical: getResponsiveSize(8) }} />

        {/* Time */}
        <Text className="text-gray-400 font-semibold mb-2" style={{ fontSize: getResponsiveSize(15) }}>Time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {times.slice(3).map((time, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => handleSelectTime(time)}
              style={{
                backgroundColor: selectedTimes.includes(time) ? "#18C964" : "#222",
                borderRadius: getResponsiveSize(10),
                paddingVertical: getResponsiveSize(8),
                paddingHorizontal: getResponsiveSize(20),
                marginRight: getResponsiveSize(8),
              }}
            >
              <Text style={{
                color: "#fff",
                fontWeight: "bold",
                fontSize: getResponsiveSize(16)
              }}>{time}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Location */}
        <Text className="text-gray-400 font-semibold mt-2 mb-1" style={{ fontSize: getResponsiveSize(15) }}>Location</Text>
        <Text className="text-white mb-2" style={{ fontSize: getResponsiveSize(14) }}>S6.02 Vinhomes Grand Park</Text>
        {/* Map giả lập bằng hình ảnh */}
        <Image
          source={{ uri: "https://maps.googleapis.com/maps/api/staticmap?center=10.8411,106.8097&zoom=15&size=300x150&key=YOUR_API_KEY" }}
          style={{
            width: "100%",
            height: getResponsiveSize(120),
            borderRadius: getResponsiveSize(10),
            marginBottom: getResponsiveSize(16)
          }}
          resizeMode="cover"
        />

        {/* Nút Next */}
        <TouchableOpacity
          className="bg-blue-500 rounded-full"
          style={{
            paddingVertical: getResponsiveSize(12),
            marginTop: getResponsiveSize(8)
          }}
        >
          <Text className="text-white text-center font-bold" style={{ fontSize: getResponsiveSize(18) }}>
            Next
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}