import { TouchableOpacity } from "react-native"
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from "react";
import NotificationModal from "./NotificationModal";
import { useAuth } from "../../hooks/useAuth";


const NotificationIcon = () => {
    const [visible, setVisible] = useState(false)
    const userId = useAuth().getCurrentUserId()
    return (
        <>
        <TouchableOpacity onPress={() => setVisible(true)}>
            <MaterialIcons name="notifications-active" size={30} color="white" />
        </TouchableOpacity>
        <NotificationModal visible={visible} onClose={() => setVisible(false)} userId={userId ?? 0} />
        </>
    )
}

export default NotificationIcon
