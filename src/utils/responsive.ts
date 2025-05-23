import { Dimensions } from "react-native";


const { width, height } = Dimensions.get('window');

export const getResponsiveSize = (size: number) => {
    const scale = Math.min(width / 402, height / 874);
    return size * scale;
}