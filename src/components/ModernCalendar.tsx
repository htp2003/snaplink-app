import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Animated } from 'react-native';
import { AntDesign, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getResponsiveSize } from '../utils/responsive';

interface ModernCalendarProps {
    date: Date;
    onDateChange: (date: Date) => void;
    visible: boolean;
    onClose: () => void;
}
    
const ModernCalendar = ({ date, onDateChange, visible, onClose }: ModernCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date(date.getFullYear(), date.getMonth(), 1));
  const [slideAnim] = useState(new Animated.Value(0));

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Previous month's trailing days
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDate = new Date(year, month, 1 - (startingDayOfWeek - i));
      days.push({ date: prevDate, isCurrentMonth: false });
    }
    
    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    
    // Next month's leading days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }
    
    return days;
  };

  const navigateMonth = (direction: string) => {
    Animated.timing(slideAnim, {
      toValue: direction === 'next' ? -1 : 1,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      const newMonth = new Date(currentMonth);
      newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
      setCurrentMonth(newMonth);
      slideAnim.setValue(0);
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (checkDate: Date) => {
    return checkDate.toDateString() === date.toDateString();
  };

  const isPastDate = (checkDate: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(checkDate);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  const selectDate = (selectedDate: Date) => {
    if (isPastDate(selectedDate)) return; // Không cho chọn ngày đã qua
    onDateChange(selectedDate);
    onClose();
  };


  const days = getDaysInMonth(currentMonth);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: getResponsiveSize(20),
      }}>
        <View style={{
          backgroundColor: '#1A1A1A',
          borderRadius: getResponsiveSize(24),
          padding: getResponsiveSize(24),
          width: '100%',
          maxWidth: getResponsiveSize(350),
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 15,
        }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: getResponsiveSize(24),
          }}>
            <TouchableOpacity
              onPress={() => navigateMonth('prev')}
              style={{
                padding: getResponsiveSize(8),
                borderRadius: getResponsiveSize(12),
                backgroundColor: '#2A2A2A',
              }}
              activeOpacity={0.7}
            >
              <AntDesign name="left" size={getResponsiveSize(18)} color="#fff" />
            </TouchableOpacity>

            <Text style={{
              color: '#fff',
              fontSize: getResponsiveSize(20),
              fontWeight: 'bold',
            }}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>

            <TouchableOpacity
              onPress={() => navigateMonth('next')}
              style={{
                padding: getResponsiveSize(8),
                borderRadius: getResponsiveSize(12),
                backgroundColor: '#2A2A2A',
              }}
              activeOpacity={0.7}
            >
              <AntDesign name="right" size={getResponsiveSize(18)} color="#fff" />
            </TouchableOpacity>
          </View>


          {/* Week Days */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            marginBottom: getResponsiveSize(16),
          }}>
            {weekDays.map((day, index) => (
              <Text key={index} style={{
                color: '#666',
                fontSize: getResponsiveSize(14),
                fontWeight: '600',
                textAlign: 'center',
                width: getResponsiveSize(36),
              }}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <Animated.View style={{
            transform: [{ translateX: slideAnim.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [-getResponsiveSize(300), 0, getResponsiveSize(300)]
            })}]
          }}>
            {Array.from({ length: 5 }).map((_, weekIdx) => (
              <View key={weekIdx} style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                marginBottom: getResponsiveSize(4),
              }}>
                {days.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, index) => {
                  const isCurrentMonth = day.isCurrentMonth;
                  const isTodayDate = isToday(day.date);
                  const isSelectedDate = isSelected(day.date);
                  const isPast = isPastDate(day.date);
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => isCurrentMonth && !isPast && selectDate(day.date)}
                      disabled={!isCurrentMonth || isPast}
                      style={{
                        width: getResponsiveSize(36),
                        height: getResponsiveSize(36),
                        justifyContent: 'center',
                        alignItems: 'center',
                        borderRadius: getResponsiveSize(18),
                        backgroundColor: isSelectedDate ? '#18C964' : 
                                       isTodayDate ? '#2A2A2A' : 'transparent',
                        opacity: (!isCurrentMonth || isPast) ? 0.3 : 1,
                      }}
                      activeOpacity={(!isCurrentMonth || isPast) ? 1 : 0.7}
                    >
                      {isSelectedDate ? (
                        <LinearGradient
                          colors={['#18C964', '#38ef7d']}
                          style={{
                            width: getResponsiveSize(36),
                            height: getResponsiveSize(36),
                            borderRadius: getResponsiveSize(18),
                            justifyContent: 'center',
                            alignItems: 'center',
                            position: 'absolute',
                            left: 0, top: 0, right: 0, bottom: 0,
                          }}
                        >
                          <Text style={{
                            color: '#fff',
                            fontSize: getResponsiveSize(16),
                            fontWeight: 'bold',
                            zIndex: 2,
                          }}>
                            {day.date.getDate()}
                          </Text>
                        </LinearGradient>
                      ) : (
                        <Text style={{
                          color: !isCurrentMonth ? '#fff' : 
                                 isPast ? '#555' :
                                 isTodayDate ? '#18C964' : '#fff',
                          fontSize: getResponsiveSize(16),
                          fontWeight: isTodayDate ? 'bold' : 'normal',
                          zIndex: 2,
                        }}>
                          {day.date.getDate()}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </Animated.View>

          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: getResponsiveSize(24),
              padding: getResponsiveSize(16),
              borderRadius: getResponsiveSize(16),
              backgroundColor: '#2A2A2A',
              alignItems: 'center',
            }}
            activeOpacity={0.8}
          >
            <Text style={{
              color: '#fff',
              fontSize: getResponsiveSize(16),
              fontWeight: '600',
            }}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};


export default ModernCalendar;