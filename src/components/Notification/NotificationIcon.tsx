import { TouchableOpacity } from "react-native"
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const NotificationIcon = () => {
    return (
        <TouchableOpacity>
            <MaterialIcons name="notifications-active" size={30} color="white" />
        </TouchableOpacity>
    )
}

export default NotificationIcon