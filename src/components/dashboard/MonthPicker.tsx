import React from "react";
import { View, ScrollView, TouchableOpacity, Text } from "react-native";

interface Month {
  key: string;
  label: string;
  year: number;
}

interface MonthPickerProps {
  months: Month[];
  selectedMonth: string;
  onSelectMonth: (monthKey: string) => void;
}

export const MonthPicker = ({ months, selectedMonth, onSelectMonth }: MonthPickerProps) => {
  return (
    <View className="mb-6 -mx-5 px-5">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
        {months.map((m) => {
          const isSelected = selectedMonth === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              onPress={() => onSelectMonth(m.key)}
              className={`mr-3 px-6 py-2.5 rounded-2xl border ${isSelected
                ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none'
                }`}
            >
              <Text className={`font-black uppercase tracking-tighter text-[11px] ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                {m.label} {m.year}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
