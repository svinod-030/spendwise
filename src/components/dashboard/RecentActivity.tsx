import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { Transaction } from "../../store/useExpenseStore";
import { TransactionItem } from "./TransactionItem";

interface RecentActivityProps {
  transactions: Transaction[];
  onViewAll: () => void;
  onEditTransaction: (tx: Transaction) => void;
  currencySymbol: string;
}

export const RecentActivity = ({
  transactions,
  onViewAll,
  onEditTransaction,
  currencySymbol
}: RecentActivityProps) => {
  return (
    <View className="mb-6 bg-white dark:bg-slate-900/30 rounded-[32px] p-2 border border-slate-100 dark:border-transparent shadow-sm dark:shadow-none">
      <View className="flex-row items-end justify-between mb-2 px-3 pt-4">
        <Text className="text-slate-900 dark:text-white text-lg font-black tracking-tight">Recent Activity</Text>
        <TouchableOpacity onPress={onViewAll} className="flex-row items-center bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full">
          <Text className="text-blue-600 dark:text-blue-400 font-bold text-[10px] mr-1 uppercase tracking-widest">View All</Text>
          <ChevronRight size={12} color="#3b82f6" />
        </TouchableOpacity>
      </View>
      <View className="px-3 pb-4">
        {transactions.length > 0 ? (
          transactions.map((item, index) => (
            <TransactionItem
              key={item.id}
              item={item}
              index={index}
              onPress={onEditTransaction}
              currencySymbol={currencySymbol}
            />
          ))
        ) : (
          <View className="py-10 items-center justify-center">
            <Text className="text-slate-400 dark:text-slate-600 font-bold text-[10px] uppercase tracking-widest">No activity recorded</Text>
          </View>
        )}
      </View>
    </View>
  );
};
