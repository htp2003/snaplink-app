// components/EnhancedQRDisplay.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Clipboard,
  Dimensions
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { getResponsiveSize } from '../utils/responsive';
import { QRCodeHandler, EnhancedPayOSService } from '../utils/qrCodeUtils';

const { width } = Dimensions.get('window');

interface EnhancedQRDisplayProps {
  paymentData: any; // PayOS response
  amount: number;
  orderCode: string;
  onOpenPaymentURL?: () => void;
}

export const EnhancedQRDisplay: React.FC<EnhancedQRDisplayProps> = ({
  paymentData,
  amount,
  orderCode,
  onOpenPaymentURL
}) => {
  const [showFullText, setShowFullText] = useState(false);
  
  // ✅ Analyze PayOS data
  const qrProps = EnhancedPayOSService.getQRDisplayProps(paymentData);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCopyQR = () => {
    if (qrProps.qrData) {
      Clipboard.setString(qrProps.qrData);
      Alert.alert('Thành công', 'Đã sao chép mã QR vào clipboard');
    }
  };

  const handleCopyPaymentURL = () => {
    if (qrProps.paymentUrl) {
      Clipboard.setString(qrProps.paymentUrl);
      Alert.alert('Thành công', 'Đã sao chép link thanh toán vào clipboard');
    }
  };

  // ✅ Render based on QR type
  const renderQRContent = () => {
    if (!qrProps.hasQR) {
      return (
        <View style={styles.noQRContainer}>
          <MaterialIcons name="qr-code" size={getResponsiveSize(80)} color="#ccc" />
          <Text style={styles.noQRText}>Không có mã QR</Text>
          <Text style={styles.noQRSubtext}>
            Vui lòng sử dụng link thanh toán
          </Text>
          
          {qrProps.paymentUrl && (
            <TouchableOpacity
              onPress={onOpenPaymentURL}
              style={styles.fallbackButton}
            >
              <MaterialIcons name="open-in-browser" size={20} color="#E91E63" />
              <Text style={styles.fallbackButtonText}>Mở link thanh toán</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.qrContainer}>
        {/* QR Header */}
        <View style={styles.qrHeader}>
          <MaterialIcons name="qr-code" size={getResponsiveSize(32)} color="#E91E63" />
          <Text style={styles.qrTitle}>
            {qrProps.qrType === 'url' ? 'Link thanh toán QR' : 'Mã thanh toán QR'}
          </Text>
        </View>

        {/* QR Content based on type */}
        {qrProps.qrType === 'text' && (
          <>
            {/* Scannable QR Image generated from text */}
            {qrProps.qrImageData && (
              <View style={styles.qrImageContainer}>
                <Text style={styles.qrImageTitle}>Quét mã QR này:</Text>
                <View style={styles.qrImageWrapper}>
                  <QRCode
                    value={qrProps.qrImageData}
                    size={width * 0.6}
                    backgroundColor="white"
                    color="black"
                  />
                </View>
                <Text style={styles.qrImageSubtitle}>
                  Sử dụng app banking để quét mã này
                </Text>
              </View>
            )}
          </>
        )}

        {qrProps.qrType === 'url' && (
          <View style={styles.qrUrlContainer}>
            {/* Generate QR from URL */}
            <View style={styles.qrImageContainer}>
              <Text style={styles.qrImageTitle}>Quét mã QR để thanh toán:</Text>
              <View style={styles.qrImageWrapper}>
                <QRCode
                  value={qrProps.qrData}
                  size={width * 0.6}
                  backgroundColor="white"
                  color="black"
                />
              </View>
            </View>
            
            {/* URL Display */}
            <View style={styles.urlDisplay}>
              <Text style={styles.urlTitle}>Link thanh toán:</Text>
              <Text 
                style={styles.urlText}
                numberOfLines={2}
                selectable={true}
              >
                {qrProps.qrData}
              </Text>
            </View>
          </View>
        )}

        {qrProps.qrType === 'image' && (
          <View style={styles.qrImageContainer}>
            <Text style={styles.qrImageTitle}>Mã QR thanh toán:</Text>
            {/* For data URI images, you might need a different approach */}
            <Text style={styles.qrImageSubtitle}>
              QR Image được cung cấp bởi PayOS
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {qrProps.qrData && (
            <TouchableOpacity
              onPress={handleCopyQR}
              style={styles.copyButton}
            >
              <MaterialIcons name="content-copy" size={20} color="#fff" />
              <Text style={styles.copyButtonText}>
                {qrProps.qrType === 'url' ? 'Sao chép link' : 'Sao chép mã'}
              </Text>
            </TouchableOpacity>
          )}
          
          {qrProps.paymentUrl && qrProps.qrType !== 'url' && (
            <TouchableOpacity
              onPress={handleCopyPaymentURL}
              style={styles.secondaryButton}
            >
              <MaterialIcons name="link" size={20} color="#E91E63" />
              <Text style={styles.secondaryButtonText}>Sao chép link thanh toán</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Payment Info */}
        <View style={styles.paymentInfo}>
          <Text style={styles.amountText}>
            💰 Số tiền: {formatCurrency(amount)}
          </Text>
          <Text style={styles.orderCodeText}>
            🏷️ Mã đơn hàng: {orderCode}
          </Text>
        </View>
      </View>
    );
  };

  return renderQRContent();
};

const styles = StyleSheet.create({
  // No QR styles
  noQRContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: getResponsiveSize(40),
    gap: getResponsiveSize(16),
  },
  noQRText: {
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
    color: '#999',
  },
  noQRSubtext: {
    fontSize: getResponsiveSize(14),
    color: '#999',
    textAlign: 'center',
  },
  fallbackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#E91E63',
    borderRadius: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(20),
    paddingVertical: getResponsiveSize(12),
    gap: getResponsiveSize(8),
    marginTop: getResponsiveSize(16),
  },
  fallbackButtonText: {
    color: '#E91E63',
    fontSize: getResponsiveSize(16),
    fontWeight: '600',
  },

  // QR Container
  qrContainer: {
    alignItems: 'center',
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
  },
  qrTitle: {
    fontSize: getResponsiveSize(18),
    fontWeight: 'bold',
    color: '#333',
    marginLeft: getResponsiveSize(12),
  },

  // QR Image (Generated)
  qrImageContainer: {
    alignItems: 'center',
    marginBottom: getResponsiveSize(20),
  },
  qrImageTitle: {
    fontSize: getResponsiveSize(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: getResponsiveSize(12),
  },
  qrImageWrapper: {
    backgroundColor: '#fff',
    padding: getResponsiveSize(20),
    borderRadius: getResponsiveSize(12),
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  qrImageSubtitle: {
    fontSize: getResponsiveSize(14),
    color: '#666',
    marginTop: getResponsiveSize(8),
    textAlign: 'center',
  },

  // QR Text
  qrTextContainer: {
    width: '100%',
    marginBottom: getResponsiveSize(20),
  },
  qrTextTitle: {
    fontSize: getResponsiveSize(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: getResponsiveSize(8),
    textAlign: 'center',
  },
  qrCodeBox: {
    backgroundColor: '#f8f9fa',
    borderRadius: getResponsiveSize(12),
    borderWidth: 2,
    borderColor: '#E91E63',
    borderStyle: 'dashed',
    marginBottom: getResponsiveSize(8),
  },
  qrScrollView: {
    maxHeight: getResponsiveSize(100),
  },
  qrTextData: {
    fontSize: getResponsiveSize(11),
    fontFamily: 'monospace',
    color: '#333',
    padding: getResponsiveSize(12),
    textAlign: 'center',
    backgroundColor: '#fff',
    margin: getResponsiveSize(4),
    borderRadius: getResponsiveSize(8),
  },
  qrTextTruncated: {
    maxHeight: getResponsiveSize(60),
  },
  qrTextFull: {
    lineHeight: getResponsiveSize(16),
  },
  toggleButton: {
    alignSelf: 'center',
    paddingHorizontal: getResponsiveSize(16),
    paddingVertical: getResponsiveSize(8),
    backgroundColor: '#E91E63',
    borderRadius: getResponsiveSize(20),
  },
  toggleButtonText: {
    color: '#fff',
    fontSize: getResponsiveSize(12),
    fontWeight: '600',
  },

  // URL Display
  qrUrlContainer: {
    width: '100%',
  },
  urlDisplay: {
    backgroundColor: '#f8f9fa',
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(16),
    marginBottom: getResponsiveSize(20),
  },
  urlTitle: {
    fontSize: getResponsiveSize(14),
    fontWeight: '600',
    color: '#333',
    marginBottom: getResponsiveSize(8),
  },
  urlText: {
    fontSize: getResponsiveSize(12),
    color: '#666',
    lineHeight: getResponsiveSize(18),
  },

  // Action Buttons
  actionButtons: {
    width: '100%',
    gap: getResponsiveSize(12),
    marginBottom: getResponsiveSize(20),
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E91E63',
    borderRadius: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(12),
    gap: getResponsiveSize(8),
  },
  copyButtonText: {
    color: '#fff',
    fontSize: getResponsiveSize(14),
    fontWeight: 'bold',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E91E63',
    borderRadius: getResponsiveSize(12),
    paddingVertical: getResponsiveSize(12),
    gap: getResponsiveSize(8),
  },
  secondaryButtonText: {
    color: '#E91E63',
    fontSize: getResponsiveSize(14),
    fontWeight: '600',
  },

  // Payment Info
  paymentInfo: {
    alignItems: 'center',
    backgroundColor: '#E8F5E8',
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(16),
    width: '100%',
    marginBottom: getResponsiveSize(20),
  },
  amountText: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: getResponsiveSize(4),
  },
  orderCodeText: {
    fontSize: getResponsiveSize(14),
    color: '#388E3C',
    fontWeight: '500',
  },

  // Instructions
  instructionsContainer: {
    backgroundColor: '#E3F2FD',
    borderRadius: getResponsiveSize(12),
    padding: getResponsiveSize(16),
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
    width: '100%',
  },
  instructionsTitle: {
    fontSize: getResponsiveSize(16),
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: getResponsiveSize(12),
  },
  instructionItem: {
    fontSize: getResponsiveSize(14),
    color: '#1565C0',
    marginBottom: getResponsiveSize(6),
    lineHeight: getResponsiveSize(20),
  },
});