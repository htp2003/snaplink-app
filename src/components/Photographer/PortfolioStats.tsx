import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImageResponse } from '../../types/image';

interface PortfolioStatsProps {
  images: ImageResponse[];
  onViewAll?: () => void;
  showViewAll?: boolean;
}

const PortfolioStats: React.FC<PortfolioStatsProps> = ({
  images,
  onViewAll,
  showViewAll = false,
}) => {
  const totalImages = images.length;
  const primaryImages = images.filter(img => img.isPrimary).length;
  const recentImages = images.filter(img => {
    const createdDate = new Date(img.createdAt);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return createdDate > sevenDaysAgo;
  }).length;

  const stats = [
    {
      icon: 'camera-outline',
      label: 'Tổng ảnh',
      value: totalImages.toString(),
      color: '#4A90E2',
    },
    {
      icon: 'star-outline',
      label: 'Ảnh đại diện',
      value: primaryImages.toString(),
      color: '#FFD700',
    },
    {
      icon: 'time-outline',
      label: 'Mới (7 ngày)',
      value: recentImages.toString(),
      color: '#7ED321',
    },
  ];

  if (totalImages === 0) {
    return null;
  }

  return (
    <View style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 20,
      margin: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: '#000000',
        }}>
          Thống kê Portfolio
        </Text>
        
        {showViewAll && onViewAll && (
          <TouchableOpacity
            onPress={onViewAll}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Text style={{
              fontSize: 14,
              color: '#666666',
              marginRight: 4,
            }}>
              Xem tất cả
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#666666" />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Grid */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
      }}>
        {stats.map((stat, index) => (
          <View
            key={index}
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 15,
              marginHorizontal: index === 1 ? 10 : 0,
              backgroundColor: '#F8F8F8',
              borderRadius: 12,
            }}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: `${stat.color}20`,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 8,
            }}>
              <Ionicons name={stat.icon as any} size={20} color={stat.color} />
            </View>
            
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: '#000000',
              marginBottom: 4,
            }}>
              {stat.value}
            </Text>
            
            <Text style={{
              fontSize: 12,
              color: '#666666',
              textAlign: 'center',
            }}>
              {stat.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Progress Bar */}
      <View style={{
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 8,
        }}>
          <Text style={{
            fontSize: 14,
            color: '#666666',
          }}>
            Tiến độ Portfolio
          </Text>
          <Text style={{
            fontSize: 14,
            fontWeight: '600',
            color: '#000000',
          }}>
            {Math.min(Math.round((totalImages / 10) * 100), 100)}%
          </Text>
        </View>
        
        <View style={{
          height: 6,
          backgroundColor: '#F0F0F0',
          borderRadius: 3,
          overflow: 'hidden',
        }}>
          <View style={{
            height: '100%',
            width: `${Math.min((totalImages / 10) * 100, 100)}%`,
            backgroundColor: totalImages >= 10 ? '#7ED321' : '#4A90E2',
            borderRadius: 3,
          }} />
        </View>
        
        <Text style={{
          fontSize: 12,
          color: '#999999',
          marginTop: 6,
          textAlign: 'center',
        }}>
          {totalImages < 10 
            ? `Thêm ${10 - totalImages} ảnh nữa để hoàn thiện portfolio`
            : 'Portfolio đã hoàn thiện! 🎉'
          }
        </Text>
      </View>
    </View>
  );
};

export default PortfolioStats;