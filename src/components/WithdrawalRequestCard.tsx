import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WithdrawalRequest } from '../types/withdrawal';

interface WithdrawalRequestsCardProps {
  requests: WithdrawalRequest[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onViewAll: () => void;
  onRequestPress: (request: WithdrawalRequest) => void;
}

export default function WithdrawalRequestsCard({
  requests,
  loading,
  error,
  onRefresh,
  onViewAll,
  onRequestPress
}: WithdrawalRequestsCardProps) {
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  // Get status config
  const getStatusConfig = (status: string) => {
    const configs = {
      'Pending': { color: '#F59E0B', bgColor: '#FEF3C7', text: 'Đang chờ xử lý' },
      'Approved': { color: '#10B981', bgColor: '#D1FAE5', text: 'Đã phê duyệt' },
      'Rejected': { color: '#EF4444', bgColor: '#FEE2E2', text: 'Đã từ chối' },
      'Processing': { color: '#6B73FF', bgColor: '#E0E7FF', text: 'Đang xử lý' },
      'Completed': { color: '#10B981', bgColor: '#D1FAE5', text: 'Hoàn thành' },
      'Cancelled': { color: '#6B7280', bgColor: '#F3F4F6', text: 'Đã hủy' }
    };
    return configs[status as keyof typeof configs] || { 
      color: '#6B7280', 
      bgColor: '#F3F4F6', 
      text: status 
    };
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    }
  };

  return (
    <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 12 
      }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000' }}>
          Yêu cầu rút tiền
        </Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={{ color: '#FF385C', fontWeight: '500', fontSize: 14 }}>
            Xem tất cả
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        {/* Loading state */}
        {loading && requests.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="small" color="#FF385C" />
            <Text style={{ color: '#666666', marginTop: 8 }}>
              Đang tải yêu cầu rút tiền...
            </Text>
          </View>
        ) : 
        /* Error state */
        error ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={{ color: '#666666', marginTop: 12, textAlign: 'center' }}>
              Không thể tải yêu cầu rút tiền
            </Text>
            <TouchableOpacity 
              style={{ marginTop: 8 }}
              onPress={onRefresh}
            >
              <Text style={{ color: '#FF385C', fontWeight: '500' }}>
                Thử lại
              </Text>
            </TouchableOpacity>
          </View>
        ) : 
        /* Empty state */
        requests.length === 0 ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <Ionicons name="wallet-outline" size={48} color="#CCCCCC" />
            <Text style={{ color: '#666666', marginTop: 12, textAlign: 'center' }}>
              Chưa có yêu cầu rút tiền nào
            </Text>
          </View>
        ) : 
        /* Requests list */
        (
          requests.slice(0, 3).map((request, index) => {
            const statusConfig = getStatusConfig(request.requestStatus);
            
            return (
              <TouchableOpacity 
                key={request.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderBottomWidth: index !== Math.min(requests.length - 1, 2) ? 1 : 0,
                  borderBottomColor: '#F0F0F0'
                }}
                onPress={() => onRequestPress(request)}
              >
                {/* Request Icon */}
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: statusConfig.bgColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12
                }}>
                  <Ionicons 
                    name="arrow-up-circle-outline" 
                    size={20} 
                    color={statusConfig.color} 
                  />
                </View>

                {/* Request Details */}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '500', color: '#000000', marginBottom: 4 }}>
                    Rút tiền về {request.bankName}
                  </Text>
                  
                  {/* Bank account (masked) */}
                  <Text style={{ color: '#666666', fontSize: 14, marginBottom: 4 }}>
                    Tài khoản: {request.bankAccountNumber.replace(/(\d{4})\d*(\d{4})/, '$1****$2')}
                  </Text>
                  
                  {/* Date and Status */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: '#999999', fontSize: 12 }}>
                      {formatDate(request.requestedAt)}
                    </Text>
                    <View style={{
                      marginLeft: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 12,
                      backgroundColor: statusConfig.bgColor
                    }}>
                      <Text style={{
                        fontSize: 10,
                        fontWeight: '500',
                        color: statusConfig.color
                      }}>
                        {statusConfig.text}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Amount and Arrow */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{
                    fontWeight: 'bold',
                    textAlign: 'right',
                    color: statusConfig.color,
                    fontSize: 16
                  }}>
                    -{formatCurrency(request.amount)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#CCCCCC" style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Show more indicator if there are more than 3 requests */}
        {requests.length > 3 && (
          <TouchableOpacity 
            style={{
              padding: 12,
              alignItems: 'center',
              borderTopWidth: 1,
              borderTopColor: '#F0F0F0'
            }}
            onPress={onViewAll}
          >
            <Text style={{ color: '#FF385C', fontWeight: '500', fontSize: 14 }}>
              Xem thêm {requests.length - 3} yêu cầu khác
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}