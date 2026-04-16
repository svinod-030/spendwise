import React from "react";
import { View, Text, TouchableOpacity, TextInput } from "react-native";
import { Calendar, Pencil, X, Check, TrendingUp, Landmark } from "lucide-react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { ComparisonBar } from "./ComparisonBar";

interface PerformanceSummaryProps {
  isCurrentMonth: boolean;
  isEditingBudget: boolean;
  setIsEditingBudget: (v: boolean) => void;
  budgetInput: string;
  setBudgetInput: (v: string) => void;
  limitAmount: number;
  currentMonthExpense: number;
  currentMonthIncome: number;
  safeToSpend: number;
  currencySymbol: string;
  onSaveBudget: () => void;
}

export const PerformanceSummary = ({
  isCurrentMonth,
  isEditingBudget,
  setIsEditingBudget,
  budgetInput,
  setBudgetInput,
  limitAmount,
  currentMonthExpense,
  currentMonthIncome,
  safeToSpend,
  currencySymbol,
  onSaveBudget
}: PerformanceSummaryProps) => {
  return (
    <View className="bg-white dark:bg-slate-900/60 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 mb-6 shadow-sm dark:shadow-none">
      <View className="flex-row items-center justify-between mb-8">
        <View className="flex-row items-center">
          <Calendar size={16} color="#64748b" />
          <Text className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider ml-2">Performance Summary</Text>
        </View>
        {isCurrentMonth && (
          <TouchableOpacity
            onPress={() => {
              setIsEditingBudget(!isEditingBudget);
              setBudgetInput(limitAmount.toString());
            }}
            className="p-1 px-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex-row items-center"
          >
            <Pencil size={10} color="#3b82f6" />
            <Text className="text-[10px] font-bold text-blue-600 dark:text-blue-400 ml-1.5">EDIT LIMIT</Text>
          </TouchableOpacity>
        )}
        {!isCurrentMonth && (
          <View className={`px-2 py-1 rounded-md ${isCurrentMonth ? 'bg-emerald-500/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
            <Text className={`text-[9px] font-black uppercase tracking-widest ${isCurrentMonth ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-500'}`}>
              {isCurrentMonth ? 'LIVE' : 'ARCHIVED'}
            </Text>
          </View>
        )}
      </View>

      {isEditingBudget ? (
        <Animated.View entering={FadeInUp} className="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-blue-500/30 mb-8 items-center flex-row">
          <View className="flex-1">
            <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">New Monthly Limit</Text>
            <TextInput
              value={budgetInput}
              onChangeText={setBudgetInput}
              keyboardType="decimal-pad"
              autoFocus
              className="text-slate-900 dark:text-white text-2xl font-black p-0"
              placeholderTextColor="#64748b"
            />
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => setIsEditingBudget(false)}
              className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl items-center justify-center mr-3"
            >
              <X size={20} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onSaveBudget}
              className="w-10 h-10 bg-blue-600 rounded-xl items-center justify-center shadow-lg shadow-blue-500/30"
            >
              <Check size={20} color="white" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      ) : (
        <ComparisonBar
          label="Monthly Expenses"
          value={currentMonthExpense}
          maxValue={limitAmount}
          color="#f43f5e"
          subLabel={`Limit: ${currencySymbol}${limitAmount}`}
          prefix={currencySymbol}
          statusColor
        />
      )}


      <View className="flex-row gap-4 mt-4">
        {/* Monthly Income Card */}
        <View className="flex-1 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50">
          <View className="flex-row items-center mb-2">
            <View className="w-6 h-6 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg items-center justify-center">
              <TrendingUp size={12} color="#10b981" />
            </View>
            <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-widest ml-2">Income</Text>
          </View>
          <Text className="text-slate-900 dark:text-white font-black text-xl tracking-tight">{currencySymbol}{Math.round(currentMonthIncome)}</Text>
          <Text className="text-slate-400 dark:text-slate-50 text-[8px] font-bold uppercase tracking-widest mt-1">Cash Flow</Text>
        </View>

        {/* Safe to Spend Card */}
        {isCurrentMonth ? (
          <View className="flex-1 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50">
            <View className="flex-row items-center mb-2">
              <View className="w-6 h-6 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg items-center justify-center">
                <Landmark size={12} color="#3b82f6" />
              </View>
              <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-widest ml-2">Daily</Text>
            </View>
            <Text className="text-slate-900 dark:text-white font-black text-xl tracking-tight">{currencySymbol}{Math.round(safeToSpend)}</Text>
            <Text className="text-slate-400 dark:text-slate-500 text-[8px] font-bold uppercase tracking-widest mt-1">Safe to Spend</Text>
          </View>
        ) : (
          <View className="flex-1 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50 justify-center">
            <Text className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1 text-center">Month Result</Text>
            <Text className={`font-black text-xs uppercase tracking-widest text-center ${currentMonthExpense > limitAmount ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {currentMonthExpense > limitAmount ? 'OVER' : 'GOOD'}
            </Text>
          </View>
        )}
      </View>

      {!isCurrentMonth && (
        <View className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex-row items-center justify-between">
          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Month Result</Text>
          <Text className={`font-black text-xs uppercase tracking-widest ${currentMonthExpense > limitAmount ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {currentMonthExpense > limitAmount ? 'OVER BUDGET' : 'WITHIN BUDGET'}
          </Text>
        </View>
      )}
    </View>
  );
};
