import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { getResponsiveSize } from '../utils/responsive';
import type { DistanceCalculationResponse } from '../types/booking';

interface DistanceConflictWarningProps {
  conflict: DistanceCalculationResponse;
  onAcceptSuggestion?: (suggestedTime: string) => void;
  onIgnore?: () => void;
  formatPrice?: (price: number) => string;
}

export const DistanceConflictWarning: React.FC<DistanceConflictWarningProps> = ({
  conflict,
  onAcceptSuggestion,
  onIgnore
}) => {
  // ✅ FIX: Add debug logging
  console.log("🚨 DistanceConflictWarning render:", {
    hasConflict: conflict?.hasConflict,
    conflict,
    willRender: !!conflict?.hasConflict
  });

  // ✅ FIX: Check both hasConflict and isTravelTimeFeasible
  if (!conflict || (!conflict.hasConflict && conflict.isTravelTimeFeasible !== false)) {
    console.log("❌ Not rendering warning - no conflict detected");
    return null;
  }

  console.log("✅ Rendering distance conflict warning");

  const formatTravelTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}phút` : ''}`;
    }
    return `${mins} phút`;
  };

  return (
    <View
      style={{
        backgroundColor: "#FFF3E0",
        borderLeftWidth: 4,
        borderLeftColor: "#FF9800",
        borderRadius: getResponsiveSize(12),
        padding: getResponsiveSize(16),
        marginBottom: getResponsiveSize(15),
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: getResponsiveSize(12) }}>
        <MaterialIcons name="warning" size={getResponsiveSize(20)} color="#FF9800" />
        <Text
          style={{
            fontSize: getResponsiveSize(16),
            fontWeight: "bold",
            color: "#E65100",
            marginLeft: getResponsiveSize(8),
          }}
        >
          Cảnh báo thời gian di chuyển
        </Text>
      </View>

      {/* Conflict Details */}
      <View style={{ marginBottom: getResponsiveSize(12) }}>
        <Text style={{ fontSize: getResponsiveSize(14), color: "#BF360C", marginBottom: 4 }}>
          Photographer có lịch trước đó tại{" "}
          <Text style={{ fontWeight: "bold" }}>
            {conflict.previousLocationName || "địa điểm khác"}
          </Text>
        </Text>
        
        {conflict.distanceInKm && (
          <Text style={{ fontSize: getResponsiveSize(13), color: "#8D6E63" }}>
            • Khoảng cách: <Text style={{ fontWeight: "bold" }}>{conflict.distanceInKm.toFixed(1)} km</Text>
          </Text>
        )}
        
        {conflict.travelTimeEstimateMinutes && (
          <Text style={{ fontSize: getResponsiveSize(13), color: "#8D6E63" }}>
            • Thời gian di chuyển ước tính: <Text style={{ fontWeight: "bold" }}>
              {formatTravelTime(conflict.travelTimeEstimateMinutes)}
            </Text>
          </Text>
        )}

        {conflict.previousBookingEndTime && (
          <Text style={{ fontSize: getResponsiveSize(13), color: "#8D6E63" }}>
            • Kết thúc lịch trước: <Text style={{ fontWeight: "bold" }}>
              {new Date(conflict.previousBookingEndTime).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </Text>
        )}
      </View>

      {/* Actions */}
      <View style={{ flexDirection: "row", gap: getResponsiveSize(12) }}>
        {conflict.suggestedStartTime && onAcceptSuggestion && (
          <TouchableOpacity
            onPress={() => {
              console.log("🎯 Accepting suggested time:", conflict.suggestedStartTime);
              onAcceptSuggestion(conflict.suggestedStartTime!);
            }}
            style={{
              backgroundColor: "#4CAF50",
              paddingHorizontal: getResponsiveSize(16),
              paddingVertical: getResponsiveSize(8),
              borderRadius: getResponsiveSize(20),
              flex: 1,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: getResponsiveSize(13),
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              Đặt lúc {conflict.suggestedStartTime.slice(0, 5)}
            </Text>
          </TouchableOpacity>
        )}

        {onIgnore && (
          <TouchableOpacity
            onPress={() => {
              console.log("❌ User ignored distance conflict");
              onIgnore();
            }}
            style={{
              backgroundColor: "#f0f0f0",
              paddingHorizontal: getResponsiveSize(16),
              paddingVertical: getResponsiveSize(8),
              borderRadius: getResponsiveSize(20),
              flex: 1,
            }}
          >
            <Text
              style={{
                color: "#666",
                fontSize: getResponsiveSize(13),
                fontWeight: "bold",
                textAlign: "center",
              }}
            >
              Bỏ qua
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {conflict.message && (
        <Text
          style={{
            fontSize: getResponsiveSize(12),
            color: "#8D6E63",
            fontStyle: "italic",
            marginTop: getResponsiveSize(8),
          }}
        >
          {conflict.message}
        </Text>
      )}
    </View>
  );
};