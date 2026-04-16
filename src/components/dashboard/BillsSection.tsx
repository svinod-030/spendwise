import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Check, Landmark } from "lucide-react-native";
import { Bill } from "../../store/useExpenseStore";

interface BillsSectionProps {
  bills: Bill[];
  billFilter: "unpaid" | "paid";
  setBillFilter: (filter: "unpaid" | "paid") => void;
  onMarkPaid: (bill: Bill) => void;
  currencySymbol: string;
}

export const BillsSection = ({
  bills,
  billFilter,
  setBillFilter,
  onMarkPaid,
  currencySymbol
}: BillsSectionProps) => {
  return (
    <View className="mb-10 bg-white dark:bg-slate-900/30 rounded-[32px] p-2 border border-slate-100 dark:border-transparent shadow-sm dark:shadow-none">
      <View className="flex-row items-center justify-between mb-4 px-3 pt-4">
        <View>
          <Text className="text-slate-900 dark:text-white text-lg font-black tracking-tight">Bills & Payments</Text>
          <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Manage your dues</Text>
        </View>

        <View className="flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <TouchableOpacity
            onPress={() => setBillFilter("unpaid")}
            className={`px-3 py-1.5 rounded-lg ${billFilter === "unpaid" ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
          >
            <Text className={`text-[9px] font-black uppercase tracking-tighter ${billFilter === "unpaid" ? "text-blue-600 dark:text-blue-400" : "text-slate-500"}`}>Unpaid</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setBillFilter("paid")}
            className={`px-3 py-1.5 rounded-lg ${billFilter === "paid" ? "bg-white dark:bg-slate-700 shadow-sm" : ""}`}
          >
            <Text className={`text-[9px] font-black uppercase tracking-tighter ${billFilter === "paid" ? "text-blue-600 dark:text-blue-400" : "text-slate-500"}`}>All</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="px-3 pb-2">
        {bills.length > 0 ? (
          bills.map((bill, index, arr) => (
            <View
              key={bill.id}
              className={`flex-row items-center justify-between py-4 ${index !== arr.length - 1 ? 'border-b border-slate-50 dark:border-slate-800/50' : ''}`}
            >
              <View className="flex-row items-center flex-1">
                <View className={`w-10 h-10 rounded-xl items-center justify-center ${bill.status === "paid" ? "bg-emerald-500/10" : "bg-slate-100 dark:bg-slate-800"}`}>
                  {bill.status === "paid" ? (
                    <Check size={18} color="#10b981" />
                  ) : (
                    <Landmark size={18} color="#64748b" />
                  )}
                </View>
                <View className="ml-3 flex-1">
                  <Text className={`text-slate-900 dark:text-white font-bold text-sm ${bill.status === "paid" ? "opacity-50" : ""}`} numberOfLines={1}>
                    {bill.sender || "Bill Payment"}
                  </Text>
                  <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                    {bill.status === "paid" ? "Paid on time" : `Due: ${new Date(bill.due_date).toLocaleDateString()}`}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center">
                <View className="mr-4 items-end">
                  <Text className={`text-slate-900 dark:text-white font-black text-sm ${bill.status === "paid" ? "opacity-50" : ""}`}>
                    {currencySymbol}{bill.amount.toFixed(2)}
                  </Text>
                </View>
                {bill.status === "unpaid" ? (
                  <TouchableOpacity
                    onPress={() => onMarkPaid(bill)}
                    activeOpacity={0.7}
                    className="bg-blue-600 px-3 py-2 rounded-xl shadow-lg shadow-blue-500/20"
                  >
                    <Text className="text-white font-black text-[10px] uppercase tracking-tighter">Mark Paid</Text>
                  </TouchableOpacity>
                ) : (
                  <View className="bg-emerald-500/20 px-3 py-2 rounded-xl">
                    <Text className="text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-tighter">Paid</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <View className="py-10 items-center justify-center">
            <Text className="text-slate-400 dark:text-slate-600 font-bold text-[10px] uppercase tracking-widest">No {billFilter} bills</Text>
          </View>
        )}
      </View>
    </View>
  );
};
