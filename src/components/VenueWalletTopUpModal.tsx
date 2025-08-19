// components/VenueWalletTopUpModal.tsx - Updated với navigation mới
import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { usePayment } from "../hooks/usePayment";
import { useVenueWallet } from "../hooks/useVenueWallet";
import type { CreateWalletTopUpRequest } from "../types/payment";
import type { RootStackNavigationProp } from "../navigation/types";
import { DEEP_LINKS } from "../config/deepLinks";

interface VenueWalletTopUpModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PayOSResponse {
  error: number;
  message: string;
  data: {
    paymentId: number;
    payOSData: {
      bin: string;
      accountNumber: string;
      amount: number;
      description: string;
      orderCode: string;
      currency: string;
      paymentLinkId: string;
      status: string;
      expiredAt: string | null;
      checkoutUrl: string;
      qrCode: string;
    };
  };
}

export default function VenueWalletTopUpModal({
  visible,
  onClose,
  onSuccess,
}: VenueWalletTopUpModalProps) {
  const navigation = useNavigation<RootStackNavigationProp>();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  const { getVenueQuickAmounts, validateVenueTopUpAmount, formatCurrency } =
    useVenueWallet();

  const { createWalletTopUp, creatingWalletTopUp } = usePayment();

  const venueQuickAmounts = getVenueQuickAmounts();

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (text: string) => {
    const numericText = text.replace(/[^0-9]/g, "");
    setCustomAmount(numericText);
    setSelectedAmount(null);
  };

  const getCurrentAmount = (): number => {
    if (selectedAmount) return selectedAmount;
    return parseInt(customAmount) || 0;
  };

  const handleTopUp = async () => {
    const amount = getCurrentAmount();

    const validation = validateVenueTopUpAmount(amount);
    if (!validation.isValid) {
      Alert.alert("Lỗi", validation.error);
      return;
    }

    try {
      const request: CreateWalletTopUpRequest = {
        productName: "Nạp tiền ví SnapLink - Venue Owner",
        description: `Venue nap tien ${amount.toLocaleString("vi-VN")}d`,
        amount: amount,
        // 🏢 VENUE OWNER specific success/cancel URLs
        successUrl: `${DEEP_LINKS.PAYMENT_SUCCESS}?userType=venue_owner`,
        cancelUrl: `${DEEP_LINKS.PAYMENT_CANCEL}?userType=venue_owner`,
      };

      console.log("🏢 Venue wallet top-up request:", request);

      const response = (await createWalletTopUp(request)) as PayOSResponse;

      if (response && response.data) {
        // Close modal first
        onClose();
        resetForm();

        // 🏢 NEW: Navigate to VENUE-SPECIFIC payment waiting screen
        const venuePaymentData = {
          booking: {
            id: response.data.paymentId,
            photographerName: "SnapLink Wallet",
            date: new Date().toLocaleDateString("vi-VN"),
            time: new Date().toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }),
            location: "Nạp tiền ví điện tử - Venue Owner",
            totalAmount: response.data.payOSData.amount,
          },
          payment: {
            id: response.data.paymentId,
            paymentId: response.data.paymentId,
            orderCode: response.data.payOSData.orderCode.toString(),
            externalTransactionId: response.data.payOSData.paymentLinkId,
            amount: response.data.payOSData.amount,
            totalAmount: response.data.payOSData.amount,
            status: response.data.payOSData.status,
            paymentUrl: response.data.payOSData.checkoutUrl,
            qrCode: response.data.payOSData.qrCode,
            bin: response.data.payOSData.bin,
            accountNumber: response.data.payOSData.accountNumber,
            description: response.data.payOSData.description,
            currency: response.data.payOSData.currency,
            paymentLinkId: response.data.payOSData.paymentLinkId,
            expiredAt: response.data.payOSData.expiredAt,
            payOSData: response.data.payOSData,
          },
          // 🏢 VENUE OWNER specific flags
          isVenueOwner: true,
          returnToVenueHome: true,
          onPaymentSuccess: onSuccess, // Pass success callback
        };

        console.log("🏢 Venue navigating to VenuePaymentWaitingScreen");

        // 🏢 Navigate to VENUE-SPECIFIC payment waiting screen
        navigation.navigate("VenuePaymentWaitingScreen", venuePaymentData);
      } else {
        throw new Error("Không nhận được dữ liệu thanh toán từ server");
      }
    } catch (error) {
      console.error("🏢 Venue top-up error:", error);
      Alert.alert(
        "Lỗi thanh toán",
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra khi tạo yêu cầu nạp tiền.",
        [{ text: "Đóng" }]
      );
    }
  };

  const resetForm = () => {
    setSelectedAmount(null);
    setCustomAmount("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose}>
            <Ionicons name="close" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nạp tiền ví - Venue Owner</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={{ flex: 1 }}>
          {/* Current amount display */}
          <View style={styles.amountDisplay}>
            <Text style={styles.amountLabel}>Số tiền nạp</Text>
            <Text style={styles.amountValue}>
              {getCurrentAmount() > 0
                ? formatCurrency(getCurrentAmount())
                : "0 VND"}
            </Text>
            <Text style={styles.amountNote}>
              Số tiền tối thiểu: 5,000 VND{"\n"}
              Số tiền tối đa: 10,000,000 VND
            </Text>
          </View>

          {/* Quick amount selection */}
          <View style={styles.quickAmountSection}>
            <Text style={styles.sectionTitle}>Chọn nhanh số tiền</Text>
            <View style={styles.quickAmountGrid}>
              {venueQuickAmounts.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.quickAmountButton,
                    selectedAmount === amount &&
                      styles.quickAmountButtonSelected,
                  ]}
                  onPress={() => handleAmountSelect(amount)}
                >
                  <Text
                    style={[
                      styles.quickAmountText,
                      selectedAmount === amount &&
                        styles.quickAmountTextSelected,
                    ]}
                  >
                    {formatCurrency(amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom amount input */}
          <View style={styles.customAmountSection}>
            <Text style={styles.sectionTitle}>Hoặc nhập số tiền khác</Text>
            <View
              style={[
                styles.customAmountInput,
                customAmount && styles.customAmountInputFocused,
              ]}
            >
              <TextInput
                style={styles.textInput}
                placeholder="Nhập số tiền"
                placeholderTextColor="#999999"
                value={customAmount}
                onChangeText={handleCustomAmountChange}
                keyboardType="numeric"
                maxLength={8}
              />
              <Text style={styles.currencyLabel}>VND</Text>
            </View>
          </View>

          {/* Info about venue payment */}
          <View style={styles.infoSection}>
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#8B5CF6" />
              <Text style={styles.infoText}>
                Bạn sẽ được chuyển đến màn hình thanh toán với mã QR. Sau khi
                thanh toán thành công, số dư ví Venue Owner sẽ được cập nhật tự
                động.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Bottom button */}
        <View style={styles.bottomButton}>
          <TouchableOpacity
            style={[
              styles.topUpButton,
              getCurrentAmount() > 0
                ? styles.topUpButtonEnabled
                : styles.topUpButtonDisabled,
            ]}
            onPress={handleTopUp}
            disabled={getCurrentAmount() === 0 || creatingWalletTopUp}
          >
            {creatingWalletTopUp ? (
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
            ) : (
              <Ionicons
                name="qr-code-outline"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: 8 }}
              />
            )}
            <Text style={styles.topUpButtonText}>
              {creatingWalletTopUp ? "Đang tạo mã QR..." : "Tạo mã QR nạp tiền"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  amountDisplay: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  amountLabel: {
    color: "#666666",
    fontSize: 16,
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#8B5CF6",
    marginBottom: 8,
  },
  amountNote: {
    color: "#999999",
    fontSize: 12,
    textAlign: "center",
  },
  quickAmountSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  quickAmountGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickAmountButton: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  quickAmountButtonSelected: {
    backgroundColor: "#8B5CF6",
    borderColor: "#8B5CF6",
  },
  quickAmountText: {
    fontWeight: "600",
    color: "#000000",
  },
  quickAmountTextSelected: {
    color: "#FFFFFF",
  },
  customAmountSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  customAmountInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  customAmountInputFocused: {
    borderColor: "#8B5CF6",
  },
  textInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#000000",
  },
  currencyLabel: {
    color: "#666666",
    marginLeft: 8,
  },
  // Info section
  infoSection: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  bottomButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  topUpButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  topUpButtonEnabled: {
    backgroundColor: "#8B5CF6",
  },
  topUpButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  topUpButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
