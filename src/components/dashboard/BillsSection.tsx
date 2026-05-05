import React from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Check, Landmark, ChevronRight, Repeat } from "lucide-react-native";
import { Bill } from "../../types/expense-store";

interface BillsSectionProps {
  bills: Bill[];
  billFilter: "unpaid" | "paid";
  setBillFilter: (filter: "unpaid" | "paid") => void;
  onMarkPaid: (bill: Bill) => void;
  onRemoveBill: (bill: Bill) => void;
  onViewDetails: (bill: Bill) => void;
  currencySymbol: string;
}

export const BillsSection = React.memo(({
  bills,
  billFilter,
  setBillFilter,
  onMarkPaid,
  onRemoveBill,
  onViewDetails,
  currencySymbol
}: BillsSectionProps) => {
  return (
    <View className="mb-10 bg-white dark:bg-slate-900/30 rounded-[32px] p-2 border border-slate-100 dark:border-transparent shadow-sm dark:shadow-none">
      <View className="flex-row items-center justify-between mb-4 px-3 pt-4">
        <View>
          <Text className="text-slate-900 dark:text-white text-lg font-black tracking-tight">Bills & Payments</Text>
          <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Manage your dues</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setBillFilter(billFilter === "unpaid" ? "paid" : "unpaid")}
          className="flex-row items-center bg-slate-100 dark:bg-slate-800/50 pl-3 pr-1 py-1 rounded-full border border-slate-200 dark:border-slate-800"
        >
          <Text className="text-[9px] font-black uppercase tracking-widest text-slate-500 mr-2">Show All</Text>
          <View className={`w-10 h-6 rounded-full p-1 ${billFilter === "paid" ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"}`}>
            <View className={`w-4 h-4 bg-white rounded-full ${billFilter === "paid" ? "translate-x-4" : "translate-x-0"}`} />
          </View>
        </TouchableOpacity>
      </View>

      <View className="px-3 pb-2">
        {bills.length > 0 ? (
          <FlatList
            data={bills}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
            renderItem={({ item: bill, index }) => (
              <View
                className={`flex-row items-center justify-between py-4 ${index !== bills.length - 1 ? 'border-b border-slate-50 dark:border-slate-800/50' : ''}`}
              >
                <TouchableOpacity
                  onPress={() => onViewDetails(bill)}
                  activeOpacity={0.7}
                  className="flex-row items-center flex-1"
                >
                  <View className={`w-10 h-10 rounded-xl items-center justify-center ${bill.status === "paid" ? "bg-emerald-500/10" : bill.is_recurring ? "bg-violet-500/10" : "bg-slate-100 dark:bg-slate-800"}`}>
                    {bill.status === "paid" ? (
                      <Check size={18} color="#10b981" />
                    ) : bill.is_recurring ? (
                      <Repeat size={18} color="#8b5cf6" />
                    ) : (
                      <Landmark size={18} color="#64748b" />
                    )}
                  </View>
                  <View className="ml-3 flex-1">
                    <View className="flex-row items-center">
                      <Text className={`text-slate-900 dark:text-white font-bold text-sm ${bill.status === "paid" ? "opacity-50" : ""}`} numberOfLines={1}>
                        {bill.sender || "Bill Payment"}
                      </Text>
                      {bill.is_recurring === 1 && (
                        <View className="ml-2 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded-md">
                          <Text className="text-[7px] text-violet-600 dark:text-violet-400 font-black uppercase tracking-widest">Recurring</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                      {bill.status === "paid" ? "Paid on time" : `Due: ${new Date(bill.due_date).toLocaleDateString()}`}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View className="flex-row items-center">
                  <View className="mr-3 items-end">
                    <Text className={`text-slate-900 dark:text-white font-black text-sm ${bill.status === "paid" ? "opacity-50" : ""}`}>
                      {currencySymbol}{bill.amount.toFixed(2)}
                    </Text>
                  </View>
                  {bill.status === 'unpaid' ? (
                    <View className="flex-row gap-2">
                      <TouchableOpacity onPress={() => onMarkPaid(bill)} className="bg-emerald-50 dark:bg-emerald-500/20 p-2 rounded-lg">
                        <Check size={16} color="#10b981" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => onRemoveBill(bill)} className="bg-rose-50 dark:bg-rose-500/20 p-2 rounded-lg">
                        <Text className="text-rose-500 font-bold text-xs" style={{ marginTop: -2 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <ChevronRight size={16} color="#94a3b8" />
                  )}
                </View>
              </View>
            )}
          />
        ) : (
          <View className="py-10 items-center justify-center">
            <Text className="text-slate-400 dark:text-slate-600 font-bold text-[10px] uppercase tracking-widest">No {billFilter} bills</Text>
          </View>
        )}
      </View>
    </View>
  );
});
