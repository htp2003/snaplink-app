import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
const { width, height } = Dimensions.get("window");

// Calculate responsive dimensions
const getResponsiveSize = (size: number) => {
  const scale = Math.min(width / 402, height / 874); // Base dimensions from Figma
  return size * scale;
};

const images = [
  require("../../assets/slider5.jpg"),
  require("../../assets/slider6.jpg"),
  require("../../assets/slider7.jpg"),
  require("../../assets/slider8.jpg"),
];

const LayoutPage = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const navigation = useNavigation();
  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setActiveSlide(Math.round(index));
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#000" barStyle="light-content" />
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {images.map((image, index) => (
          <Image
            key={index}
            source={image}
            style={styles.sliderImage}
            resizeMode="cover"
          />
        ))}
      </ScrollView>

      <View style={styles.dotsContainer}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: index === activeSlide ? "#FFFFFF" : "#D9D9D9",
              },
            ]}
          />
        ))}
      </View>

      <Text style={styles.title}>SnapLink</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.darkButton}
          onPress={() => navigation.navigate("Login" as never)}
        >
          <Text style={styles.darkButtonText}>Login</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.lightButton}
          onPress={() => navigation.navigate("Register" as never)}
        >
          <Text style={styles.lightButtonText}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  sliderImage: {
    width: width,
    height: height,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: getResponsiveSize(231),
    width: "100%",
    zIndex: 1,
  },
  dot: {
    width: getResponsiveSize(8),
    height: getResponsiveSize(8),
    borderRadius: getResponsiveSize(4),
    marginHorizontal: getResponsiveSize(5),
  },
  title: {
    position: "absolute",
    top:
      Platform.OS === "ios"
        ? getResponsiveSize(60)
        : getResponsiveSize(60) + StatusBar.currentHeight!,
    left: getResponsiveSize(140),
    fontSize: getResponsiveSize(32),
    fontWeight: "bold",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    zIndex: 1,
  },
  buttonContainer: {
    position: "absolute",
    bottom: getResponsiveSize(52),
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: getResponsiveSize(27),
    zIndex: 1,
  },
  darkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderWidth: 1,
    borderColor: "#2C2C2C",
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(12),
    width: getResponsiveSize(154),
    minHeight: getResponsiveSize(49),
  },
  lightButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: getResponsiveSize(8),
    paddingVertical: getResponsiveSize(12),
    paddingHorizontal: getResponsiveSize(12),
    width: getResponsiveSize(153),
    minHeight: getResponsiveSize(49),
  },
  darkButtonText: {
    color: "#FFFFFF",
    fontSize: getResponsiveSize(14),
    textAlign: "center",
  },
  lightButtonText: {
    color: "#2C2C2C",
    fontSize: getResponsiveSize(14),
    textAlign: "center",
  },
});

export default LayoutPage;
