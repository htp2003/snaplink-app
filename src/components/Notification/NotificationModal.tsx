// components/NotificationModal.tsx
import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NotificationApiResponse } from '../../types';
import NotificationItem from './NotificationItem';
import { getResponsiveSize } from '../../utils/responsive';
import { useNotifications } from '../../hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';

type NotificationModalProps = {
    visible: boolean;
    onClose: () => void;
    userId: number;
};

export const NotificationModal: React.FC<NotificationModalProps> = ({
    visible,
    onClose,
    userId
}) => {
    const {
        notifications,
        loading,
        error,
        unreadCount,
        refetch,
        markAsRead,
        markAllAsRead,
        deleteNotification
    } = useNotifications(userId);

    const handleNotificationPress = (notification: NotificationApiResponse) => {
        onClose();
    };

    const handleMarkAllAsRead = async () => {
        if (unreadCount === 0) return;

        Alert.alert(
            'Đánh dấu tất cả đã đọc',
            `Bạn có muốn đánh dấu tất cả ${unreadCount} thông báo là đã đọc?`,
            [
                {
                    text: 'Hủy',
                    style: 'cancel',
                },
                {
                    text: 'Đồng ý',
                    onPress: markAllAsRead,
                },
            ]
        );
    };

    const handleDeleteNotification = (notificationId: number) => {
        Alert.alert(
            'Xóa thông báo',
            'Bạn có chắc muốn xóa thông báo này?',
            [
                {
                    text: 'Hủy',
                    style: 'cancel',
                },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: () => deleteNotification(notificationId),
                },
            ]
        );
    };

    const renderEmptyState = () => (
        <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: getResponsiveSize(60)
        }}>
            <Text style={{
                color: '#666',
                fontSize: getResponsiveSize(16),
                textAlign: 'center',
                marginBottom: getResponsiveSize(8)
            }}>
                Không có thông báo nào
            </Text>
            <Text style={{
                color: '#999',
                fontSize: getResponsiveSize(14),
                textAlign: 'center'
            }}>
                Thông báo mới sẽ hiển thị ở đây
            </Text>
        </View>
    );

    const renderError = () => (
        <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: getResponsiveSize(60),
            paddingHorizontal: getResponsiveSize(20)
        }}>
            <Text style={{
                color: '#ff4444',
                fontSize: getResponsiveSize(16),
                textAlign: 'center',
                marginBottom: getResponsiveSize(16)
            }}>
                Không thể tải thông báo
            </Text>
            <Text style={{
                color: '#999',
                fontSize: getResponsiveSize(14),
                textAlign: 'center',
                marginBottom: getResponsiveSize(20)
            }}>
                {error}
            </Text>
            <TouchableOpacity
                onPress={refetch}
                style={{
                    backgroundColor: '#FF385C',
                    paddingHorizontal: getResponsiveSize(20),
                    paddingVertical: getResponsiveSize(10),
                    borderRadius: getResponsiveSize(8)
                }}
            >
                <Text style={{
                    color: '#fff',
                    fontSize: getResponsiveSize(14),
                    fontWeight: '500'
                }}>
                    Thử lại
                </Text>
            </TouchableOpacity>
        </View>
    );

    const renderLoadingState = () => (
        <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: getResponsiveSize(60)
        }}>
            <ActivityIndicator size="large" color="#FF385C" />
            <Text style={{
                color: '#666',
                fontSize: getResponsiveSize(14),
                marginTop: getResponsiveSize(12)
            }}>
                Đang tải thông báo...
            </Text>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            statusBarTranslucent
        >
            <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
                <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                    <View style={{ flex: 1 }}>
                        {/* Header */}
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: getResponsiveSize(16),
                                paddingHorizontal: getResponsiveSize(20),
                                minHeight: getResponsiveSize(56),
                            }}
                        >
                            {/* Arrow Left */}
                            <View style={{ position: 'absolute', left: getResponsiveSize(20) }}>
                                <TouchableOpacity
                                    onPress={onClose}
                                    style={{
                                        width: getResponsiveSize(40),
                                        height: getResponsiveSize(40),
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor: 'rgba(0,0,0,0.05)',
                                        borderRadius: getResponsiveSize(20),
                                    }}
                                >
                                    <Ionicons name="arrow-back" size={getResponsiveSize(24)} color="black" />
                                </TouchableOpacity>
                            </View>

                            {/* Title Center */}
                            <Text
                                style={{
                                    color: '#000',
                                    fontSize: getResponsiveSize(18),
                                    fontWeight: '600',
                                }}
                            >
                                Thông báo
                            </Text>

                            {/* Refresh Right */}
                            <View style={{ position: 'absolute', right: getResponsiveSize(20) }}>
                                <TouchableOpacity
                                    onPress={refetch}
                                    style={{
                                        borderColor: '#FF385C',
                                        borderWidth: 1,
                                        borderRadius: getResponsiveSize(6),
                                        paddingHorizontal: getResponsiveSize(12),
                                        paddingVertical: getResponsiveSize(6),
                                        backgroundColor: 'transparent',
                                    }}
                                >
                                    <Text
                                        style={{
                                            color: '#FF385C',
                                            fontSize: getResponsiveSize(12),
                                            fontWeight: '500',
                                        }}
                                    >
                                        Làm mới
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Mark all as read button */}
                        {unreadCount > 0 && (
                            <View style={{
                                paddingHorizontal: getResponsiveSize(20),
                                paddingVertical: getResponsiveSize(12),
                                backgroundColor: '#FFFFFF',
                                borderBottomWidth: 1,
                                borderBottomColor: '#F0F0F0',
                            }}>
                                <TouchableOpacity
                                    onPress={handleMarkAllAsRead}
                                    style={{
                                        alignSelf: 'flex-end',
                                        backgroundColor: '#F7F7F7',
                                        paddingHorizontal: getResponsiveSize(12),
                                        paddingVertical: getResponsiveSize(6),
                                        borderRadius: getResponsiveSize(6),
                                        borderWidth: 1,
                                        borderColor: '#E0E0E0',
                                    }}
                                >
                                    <Text style={{
                                        color: '#FF385C',
                                        fontSize: getResponsiveSize(12),
                                        fontWeight: '500'
                                    }}>
                                        Đánh dấu tất cả đã đọc ({unreadCount})
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Content */}
                        <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
                            {loading && notifications.length === 0 ? (
                                renderLoadingState()
                            ) : error ? (
                                renderError()
                            ) : notifications.length === 0 ? (
                                renderEmptyState()
                            ) : (
                                <ScrollView
                                    showsVerticalScrollIndicator={false}
                                    refreshControl={
                                        <RefreshControl
                                            refreshing={loading}
                                            onRefresh={refetch}
                                            tintColor="#FF385C"
                                            colors={['#FF385C']}
                                        />
                                    }
                                    contentContainerStyle={{
                                        paddingBottom: getResponsiveSize(20)
                                    }}
                                >
                                    {notifications.map((notification, index) => (
                                        <NotificationItem
                                            key={notification.motificationId}
                                            notification={notification}
                                            onPress={handleNotificationPress}
                                            onMarkAsRead={markAsRead}
                                        />
                                    ))}
                                </ScrollView>
                            )}
                        </View>
                    </View>
                </SafeAreaView>
            </View>
        </Modal>
    );
};

export default NotificationModal;