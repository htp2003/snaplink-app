import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../../hooks/useAuth";

const API_BASE_URL =
  "https://snaplinkapi-g7eubeghazh5byd8.southeastasia-01.azurewebsites.net";

interface Style {
  id: number;
  name: string;
  description?: string;
}

interface Step4Props {
  selectedRole: string;
  onComplete?: (styleIds: number[]) => void;
}

const Step4: React.FC<Step4Props> = ({ selectedRole, onComplete }) => {
  const navigation = useNavigation();
  const { getCurrentUserId, token } = useAuth();
  const userId = getCurrentUserId();

  const [styles, setStyles] = useState<Style[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingStyles, setFetchingStyles] = useState(true);
  const [error, setError] = useState("");

  // Fetch styles from API on component mount
  useEffect(() => {
    fetchStyles();
  }, []);

  const fetchStyles = async () => {
    try {
      setFetchingStyles(true);

      const response = await fetch(`${API_BASE_URL}/api/Style`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch styles: ${response.status}`);
      }

      const stylesData = await response.json();

      // Handle different response formats
      let stylesList: Style[] = [];
      if (stylesData?.$values && Array.isArray(stylesData.$values)) {
        stylesList = stylesData.$values;
      } else if (Array.isArray(stylesData)) {
        stylesList = stylesData;
      } else if (stylesData?.data && Array.isArray(stylesData.data)) {
        stylesList = stylesData.data;
      } else {
        console.warn("⚠️ Unexpected styles data format:", stylesData);
        stylesList = [];
      }

      // ✅ CRITICAL: Ensure all style IDs are unique numbers and handle invalid data
      const processedStyles = stylesList.map((style, index) => {
        // Generate a guaranteed unique ID
        let uniqueId = index + 1; // Start from 1, not 0

        // Try to use original ID if it's valid
        if (style.id && !isNaN(Number(style.id)) && Number(style.id) > 0) {
          uniqueId = Number(style.id);
        }

        return {
          ...style,
          id: uniqueId,
          name: style.name || `Style ${uniqueId}`, // Fallback name
        };
      });

      setStyles(processedStyles);
    } catch (error: any) {
      console.error("❌ Error fetching styles:", error);
      Alert.alert(
        "Lỗi",
        "Không thể tải danh sách phong cách. Sử dụng danh sách mặc định."
      );

      // Fallback to default styles if API fails
      const fallbackStyles: Style[] = [
        { id: 1001, name: "Portrait", description: "Chụp ảnh chân dung" },
        { id: 1002, name: "Landscape", description: "Chụp ảnh phong cảnh" },
        { id: 1003, name: "Wedding", description: "Chụp ảnh cưới" },
        { id: 1004, name: "Fashion", description: "Chụp ảnh thời trang" },
        { id: 1005, name: "Street", description: "Chụp ảnh đường phố" },
        { id: 1006, name: "Event", description: "Chụp ảnh sự kiện" },
        { id: 1007, name: "Nature", description: "Chụp ảnh thiên nhiên" },
        { id: 1008, name: "Product", description: "Chụp ảnh sản phẩm" },
      ];
      setStyles(fallbackStyles);
    } finally {
      setFetchingStyles(false);
    }
  };

  const handleStyleSelect = (styleId: number) => {
    if (selectedStyles.includes(styleId)) {
      // Remove style if already selected
      const newSelection = selectedStyles.filter((id) => id !== styleId);
      setSelectedStyles(newSelection);
    } else if (selectedStyles.length < 3) {
      // Add style if less than 3 selected
      const newSelection = [...selectedStyles, styleId];
      setSelectedStyles(newSelection);
    } else {
      console.log("⚠️ Cannot select more than 3 styles");
    }
    setError("");
  };

  const addUserStyles = async (styleIds: number[]) => {
    try {
      // Add each style individually using UserStyle API
      const promises = styleIds.map(async (styleId) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/UserStyle`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId: userId,
              styleId: styleId,
            }),
          });

          if (!response.ok) {
            console.warn(
              `⚠️ Failed to add style ${styleId} for user ${userId}: ${response.status}`
            );
            const errorText = await response.text();
            console.warn("Error details:", errorText);
          } else {
            console.log(
              `✅ Style ${styleId} added successfully for user ${userId}`
            );
          }
        } catch (styleError) {
          console.warn(`❌ Error adding style ${styleId}:`, styleError);
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      console.error("❌ Error in addUserStyles:", error);
      // Don't throw error here, as this is not critical for navigation
    }
  };

  const handleComplete = async () => {
    if (selectedStyles.length === 0) {
      setError("Hãy chọn ít nhất 1 phong cách.");
      return;
    }

    if (!userId) {
      Alert.alert("Lỗi", "Không tìm thấy thông tin user");
      return;
    }

    setLoading(true);

    try {
      // Add selected styles to user profile
      await addUserStyles(selectedStyles);

      // Call completion callback
      onComplete?.(selectedStyles);
    } catch (error: any) {
      console.error("❌ Error completing style selection:", error);
      Alert.alert(
        "Lỗi",
        error.message || "Có lỗi xảy ra khi hoàn tất thiết lập"
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetchingStyles) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#111" />
        <Text style={{ marginTop: 16, fontSize: 16, color: "#666" }}>
          Đang tải phong cách...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "flex-start",
        alignItems: "center",
        paddingHorizontal: 16,
        marginTop: 20,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          color: "#111",
          textAlign: "center",
          marginBottom: 8,
          letterSpacing: 0.5,
        }}
      >
        Chọn phong cách yêu thích
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: "#666",
          textAlign: "center",
          marginBottom: 18,
          paddingHorizontal: 16,
        }}
      >
        Chọn tối đa 3 phong cách để chúng tôi gợi ý những nhiếp ảnh gia và địa
        điểm phù hợp nhất
      </Text>

      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            marginBottom: 10,
            marginTop: 10,
          }}
        >
          {styles.map((style, index) => {
            // Use guaranteed unique ID from processed data
            const styleId = style.id;
            const selected = selectedStyles.includes(styleId);
            const disabled = !selected && selectedStyles.length >= 3;

            return (
              <TouchableOpacity
                key={`style-${index}-${styleId}`} // Double guarantee unique key
                activeOpacity={0.8}
                onPress={() => handleStyleSelect(styleId)}
                disabled={disabled || loading}
                style={{
                  width: 150,
                  minHeight: 80,
                  margin: 8,
                  backgroundColor: selected ? "#e5e7eb" : "#fff",
                  borderRadius: 16,
                  borderWidth: 2.5,
                  borderColor: selected ? "#111" : "#bbb",
                  shadowColor: selected ? "#111" : "#000",
                  shadowOffset: { width: 0, height: selected ? 6 : 4 },
                  shadowOpacity: selected ? 0.18 : 0.09,
                  shadowRadius: selected ? 12 : 8,
                  elevation: selected ? 4 : 2,
                  justifyContent: "center",
                  alignItems: "center",
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  opacity: disabled || loading ? 0.4 : 1,
                  position: "relative",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: selected ? "#111" : "#333",
                    letterSpacing: 0.5,
                    textAlign: "center",
                    marginBottom: style.description ? 4 : 0,
                  }}
                >
                  {style.name}
                </Text>

                {style.description && (
                  <Text
                    style={{
                      fontSize: 12,
                      color: selected ? "#666" : "#888",
                      textAlign: "center",
                      lineHeight: 16,
                    }}
                  >
                    {style.description}
                  </Text>
                )}

                {selected && (
                  <View
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      backgroundColor: "#111",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "bold",
                        fontSize: 14,
                      }}
                    >
                      ✓
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Fixed bottom section */}
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: "rgba(255,255,255,0.95)",
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 28,
        }}
      >
        {/* Selected count indicator */}
        <Text
          style={{
            fontSize: 14,
            color: "#666",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          Đã chọn: {selectedStyles.length}/3 phong cách
        </Text>

        {error ? (
          <Text
            style={{
              color: "red",
              fontSize: 14,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          style={{
            backgroundColor:
              selectedStyles.length > 0 && !loading ? "#111" : "#bbb",
            borderRadius: 16,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#222",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 8,
            elevation: 4,
            opacity: selectedStyles.length > 0 && !loading ? 1 : 0.6,
          }}
          onPress={handleComplete}
          disabled={selectedStyles.length === 0 || loading}
        >
          {loading ? (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <ActivityIndicator
                size="small"
                color="#fff"
                style={{ marginRight: 8 }}
              />
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "bold",
                  fontSize: 18,
                  letterSpacing: 1,
                }}
              >
                Đang hoàn tất...
              </Text>
            </View>
          ) : (
            <Text
              style={{
                color: "#fff",
                fontWeight: "bold",
                fontSize: 18,
                letterSpacing: 1,
              }}
            >
              Hoàn tất
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default Step4;
