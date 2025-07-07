import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getResponsiveSize } from '../utils/responsive';


// Types
export interface CategoryItem {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

interface CategoryTabsProps {
  categories: CategoryItem[];
  selectedCategory: string;
  onCategoryPress: (categoryId: string) => void;
  containerStyle?: string;
  iconSize?: number;
  selectedIconColor?: string;
  unselectedIconColor?: string;
  selectedTextColor?: string;
  unselectedTextColor?: string;
  selectedBgColor?: string;
  unselectedBgColor?: string;
  underlineColor?: string;
  showUnderline?: boolean;
}

interface TextWidths {
  [key: string]: number;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  selectedCategory,
  onCategoryPress,
  containerStyle = "bg-white border-b border-stone-100 px-6 pt-1 pb-3",
  iconSize = 32,
  selectedIconColor = "#d97706",
  unselectedIconColor = "#57534e",
  selectedTextColor = "text-black",
  unselectedTextColor = "text-gray-400",
  selectedBgColor = "bg-amber-100",
  unselectedBgColor = "bg-stone-100",
  underlineColor = "bg-black",
  showUnderline = true,
}) => {
  const [textWidths, setTextWidths] = useState<TextWidths>({});

  // Handle text layout measurement
  const handleTextLayout = useCallback((categoryId: string, event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    setTextWidths(prev => ({
      ...prev,
      [categoryId]: width
    }));
  }, []);

  // Handle category press
  const handleCategoryPress = useCallback((categoryId: string) => {
    onCategoryPress(categoryId);
  }, [onCategoryPress]);

  return (
    <View className={containerStyle}>
      <View className="flex-row justify-between items-start">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          
          return (
            <TouchableOpacity
              key={category.id}
              className="flex-col items-center flex-1"
              onPress={() => handleCategoryPress(category.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`${category.label} tab`}
              accessibilityState={{ selected: isSelected }}
            >
              {/* Icon Container */}
              <View className="items-center mb-2">
                <View
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                    isSelected ? selectedBgColor : unselectedBgColor
                  }`}
                >
                  <Ionicons
                    name={category.icon}
                    size={iconSize}
                    color={isSelected ? selectedIconColor : unselectedIconColor}
                  />
                </View>
              </View>

              {/* Text label with optional underline */}
              <View className="items-center relative">
                <Text
                  className={`text-sm font-medium text-center ${
                    isSelected ? selectedTextColor : unselectedTextColor
                  }`}
                  style={{ marginBottom: getResponsiveSize(6) }}
                  onLayout={(event) => handleTextLayout(category.id, event)}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                >
                  {category.label}
                </Text>
                
                {/* Animated underline for selected category */}
                {showUnderline && isSelected && (
                  <View
                    className={`absolute bottom-0 ${underlineColor} rounded-full`}
                    style={{
                      width: textWidths[category.id] || getResponsiveSize(30),
                      height: getResponsiveSize(3),
                      bottom: -getResponsiveSize(2),
                    }}
                  />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default CategoryTabs;