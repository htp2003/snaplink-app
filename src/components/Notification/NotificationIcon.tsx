import { TouchableOpacity } from "react-native"
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from "react";
import NotificationModal from "./NotificationModal";

const NotificationIcon = () => {
    const [visible, setVisible] = useState(false)
    return (
        <>
        <TouchableOpacity onPress={() => setVisible(true)}>
            <MaterialIcons name="notifications-active" size={30} color="white" />
        </TouchableOpacity>
        <NotificationModal visible={visible} onClose={() => setVisible(false)} />
        </>
    )
}

export default NotificationIcon