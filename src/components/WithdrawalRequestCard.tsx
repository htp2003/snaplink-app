import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WithdrawalRequest } from '../types/withdrawal';
import WithdrawalRequestDetailModal from './WithdrawalRequestDetailModal';

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
  onRequestPress,
}: WithdrawalRequestsCardProps) {
  const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '#10B981';
      case 'rejected':
      case 'cancelled':
        return '#EF4444';
      case 'approved':
        return '#3B82F6';
      case 'processing':
        return '#8B5CF6';
      default:
        return '#F59E0B';
    }
  };

  // Get status background color
  const getStatusBgColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '#D1FAE5';
      case 'rejected':
      case 'cancelled':
        return '#FEE2E2';
      case 'approved':
        return '#DBEAFE';
      case 'processing':
        return '#EDE9FE';
      default:
        return '#FEF3C7';
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'Chờ xử lý';
      case 'approved':
        return 'Đã duyệt';
      case 'rejected':
        return 'Đã từ chối';
      case 'processing':
        return 'Đang xử lý';
      case 'completed':
        return 'Hoàn thành';
      case 'cancelled':
        return 'Đã hủy';
      default:
        return status;
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'checkmark-circle';
      case 'rejected':
      case 'cancelled':
        return 'close-circle';
      case 'approved':
        return 'checkmark-circle-outline';
      case 'processing':
        return 'refresh-circle';
      default:
        return 'time-outline';
    }
  };

  // Handle request press
  const handleRequestPress = (request: WithdrawalRequest) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
    onRequestPress(request);
  };

  // Handle detail modal close
  const handleDetailModalClose = () => {
    setShowDetailModal(false);
    setSelectedRequest(null);
  };

  return (
    <>
      <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#000000' }}>
            Yêu cầu rút tiền
          </Text>
          <TouchableOpacity onPress={onViewAll}>
            <Text style={{ color: '#FF385C', fontWeight: '500', fontSize: 14 }}>
              Xem tất cả
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 12,
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          {/* Loading state */}
          {loading && requests.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#FF385C" />
              <Text style={{ color: '#666666', marginTop: 8 }}>
                Đang tải yêu cầu rút tiền...
              </Text>
            </View>
          ) : /* Error state */
          error ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
              <Text
                style={{ color: '#666666', marginTop: 12, textAlign: 'center' }}
              >
                Không thể tải yêu cầu rút tiền
              </Text>
              <TouchableOpacity style={{ marginTop: 8 }} onPress={onRefresh}>
                <Text style={{ color: '#FF385C', fontWeight: '500' }}>
                  Thử lại
                </Text>
              </TouchableOpacity>
            </View>
          ) : /* Empty state */
          requests.length === 0 ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Ionicons name="card-outline" size={48} color="#CCCCCC" />
              <Text
                style={{ color: '#666666', marginTop: 12, textAlign: 'center' }}
              >
                Chưa có yêu cầu rút tiền nào
              </Text>
            </View>
          ) : (
            /* Requests list */
            requests.slice(0, 3).map((request, index) => (
              <TouchableOpacity
                key={request.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderBottomWidth:
                    index !== Math.min(requests.length, 3) - 1 ? 1 : 0,
                  borderBottomColor: '#F0F0F0',
                }}
                onPress={() => handleRequestPress(request)}
              >
                {/* Status Icon */}
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: getStatusBgColor(request.requestStatus),
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  <Ionicons
                    name={getStatusIcon(request.requestStatus) as any}
                    size={20}
                    color={getStatusColor(request.requestStatus)}
                  />
                </View>

                {/* Request Details */}
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: '600',
                        color: '#000000',
                        fontSize: 16,
                      }}
                    >
                      {formatCurrency(request.amount)}
                    </Text>
                    <View
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        borderRadius: 12,
                        backgroundColor: getStatusBgColor(request.requestStatus),
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '500',
                          color: getStatusColor(request.requestStatus),
                        }}
                      >
                        {getStatusText(request.requestStatus)}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={{
                      color: '#666666',
                      fontSize: 14,
                      marginBottom: 4,
                    }}
                  >
                    {request.bankName} • {request.bankAccountNumber}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: '#999999', fontSize: 12 }}>
                      {formatDate(request.requestedAt)}
                    </Text>
                    <Text
                      style={{
                        color: '#999999',
                        fontSize: 12,
                        marginLeft: 8,
                      }}
                    >
                      • ID: #{request.id}
                    </Text>
                  </View>

                  {/* Show rejection reason preview for rejected requests */}
                  {request.requestStatus.toLowerCase() === 'rejected' &&
                    request.rejectionReason && (
                      <Text
                        style={{
                          color: '#DC2626',
                          fontSize: 12,
                          marginTop: 4,
                          fontStyle: 'italic',
                        }}
                        numberOfLines={1}
                      >
                        Lý do: {request.rejectionReason}
                      </Text>
                    )}

                  {/* Show completion indicator for completed requests with link */}
                  {request.requestStatus.toLowerCase() === 'completed' &&
                    request.rejectionReason &&
                    request.rejectionReason.startsWith('http') && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginTop: 4,
                        }}
                      >
                        <Ionicons
                          name="link-outline"
                          size={12}
                          color="#10B981"
                        />
                        <Text
                          style={{
                            color: '#10B981',
                            fontSize: 12,
                            marginLeft: 4,
                            fontStyle: 'italic',
                          }}
                        >
                          Có liên kết xác nhận
                        </Text>
                      </View>
                    )}
                </View>

                {/* Arrow */}
                <Ionicons name="chevron-forward" size={16} color="#CCCCCC" />
              </TouchableOpacity>
            ))
          )}
        </View>
      </View>

      {/* Detail Modal */}
      <WithdrawalRequestDetailModal
        visible={showDetailModal}
        onClose={handleDetailModalClose}
        request={selectedRequest}
      />
    </>
  );
}