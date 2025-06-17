import { View, Text, Modal, TouchableOpacity, Image } from 'react-native'
import React from 'react'
import { getResponsiveSize } from '../../utils/responsive'


type NotificationModalProps = {
    visible: boolean;
    onClose: () => void;
};

export default function NotificationModal({ visible, onClose }: NotificationModalProps) {
    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View className="flex-1 bg-black" style={{ justifyContent: "flex-start" }}>
                <View style={{
                    marginTop: getResponsiveSize(40),
                    marginHorizontal: getResponsiveSize(12)
                }}>
                    <TouchableOpacity onPress={onClose}
                        className="absolute z-10"
                        style={{ left: getResponsiveSize(8) }}>
                        <Text style={{ color: "#fff", fontSize: getResponsiveSize(28) }}>✕</Text>
                    </TouchableOpacity>
                    <Text className="text-white font-bold self-center"
                        style={{ fontSize: getResponsiveSize(24), marginTop: getResponsiveSize(8) }}>
                        Notifications
                    </Text>
                    <View className="flex-row items-center"
                        style={{
                            backgroundColor: "#111",
                            marginTop: getResponsiveSize(40),
                            borderRadius: getResponsiveSize(12),
                            padding: getResponsiveSize(12),
                        }}>
                        <Image
                            source={{ uri: "https://randomuser.me/api/portraits/women/1.jpg" }}
                            style={{
                                width: getResponsiveSize(44),
                                height: getResponsiveSize(44),
                                borderRadius: getResponsiveSize(22),
                                marginRight: getResponsiveSize(12)
                            }}
                        />
                        <View>
                            <Text className="text-white font-bold" style={{ fontSize: getResponsiveSize(15) }}>
                                Tôi đã đến nơi!
                            </Text>
                            <Text className="text-gray-300" style={{ fontSize: getResponsiveSize(12) }}>
                                2 giờ trước
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    )
}