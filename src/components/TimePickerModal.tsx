import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Pressable,
  Platform,
} from "react-native";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { Ionicons } from "@expo/vector-icons";

interface TimePickerModalProps {
  isVisible: boolean;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  initialDate: Date;
  title?: string;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  isVisible,
  onConfirm,
  onCancel,
  initialDate,
  title = "Chọn giờ",
}) => {
  const handleConfirm = (selectedDate: Date) => {
    onConfirm(selectedDate);
  };

  if (Platform.OS === "ios") {
    // iOS sử dụng native time picker
    return (
      <DateTimePickerModal
        isVisible={isVisible}
        mode="time"
        onConfirm={handleConfirm}
        onCancel={onCancel}
        date={initialDate}
        locale="en_GB" // 24h format
        confirmTextIOS="Xác nhận"
        cancelTextIOS="Hủy"
        display="spinner" // Wheel picker style
        headerTextIOS={title}
      />
    );
  }

  // Android fallback với custom modal
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <Pressable
        className="flex-1 bg-black/50 justify-center items-center"
        onPress={onCancel}
      >
        <Pressable className="bg-white rounded-2xl p-6 w-80">
          <View className="items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900">{title}</Text>
          </View>

          <DateTimePickerModal
            isVisible={true}
            mode="time"
            onConfirm={handleConfirm}
            onCancel={onCancel}
            date={initialDate}
            locale="en_GB" // 24h format
            display="spinner"
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};
