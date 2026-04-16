import React from "react";
import { View, Text } from "react-native";
import Animated, { useAnimatedStyle, withSpring } from "react-native-reanimated";

interface ComparisonBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  subLabel?: string;
  prefix?: string;
  suffix?: string;
  statusColor?: boolean;
}

export const ComparisonBar = ({
  label,
  value,
  maxValue,
  color,
  subLabel,
  prefix = "$",
  suffix = "",
  statusColor = false
}: ComparisonBarProps) => {
  const percentage = Math.min(100, (value / Math.max(1, maxValue)) * 100);
  const isOver = value > maxValue && maxValue > 0;

  const animatedWidth = useAnimatedStyle(() => ({
    width: withSpring(`${percentage}%`, { damping: 20 })
  }));

  // Neutral brand blue for regular spending, Rose for over-budget
  const barColor = statusColor ? (isOver ? "#fb7185" : "#3b82f6") : color;

  return (
    <View className="mb-6 last:mb-0">
      <View className="flex-row justify-between items-end mb-2.5">
        <View>
          <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1">{label}</Text>
          <Text className="text-slate-900 dark:text-white font-black text-2xl tracking-tight">{prefix}{Math.round(value)}{suffix}</Text>
        </View>
        <View className="items-end">
          {subLabel && <Text className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-0.5">{subLabel}</Text>}
          <Text className={`font-black text-xs ${isOver ? 'text-rose-400' : 'text-slate-500'}`}>
            {Math.round(percentage)}%
          </Text>
        </View>
      </View>
      <View className="h-3 bg-slate-200 dark:bg-slate-800/50 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800/10">
        <Animated.View
          className="h-full rounded-full"
          style={[animatedWidth, { backgroundColor: barColor }]}
        />
      </View>
    </View>
  );
};
