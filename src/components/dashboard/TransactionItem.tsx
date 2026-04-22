import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { RefreshCcw, Eye, EyeOff } from "lucide-react-native";
import { IconLoader } from "../IconLoader";
import { Transaction, getTransactionDisplay, useExpenseStore } from "../../store/useExpenseStore";

interface TransactionItemProps {
  item: Transaction;
  index: number;
  onPress: (item: Transaction) => void;
  currencySymbol: string;
  isLinked?: boolean;
}

export const TransactionItem = ({
  item,
  index,
  onPress,
  currencySymbol,
  isLinked = false
}: TransactionItemProps) => {
  const display = getTransactionDisplay(item);
  const { transactions, updateTransaction } = useExpenseStore();

  const totalRefunded = React.useMemo(() => {
    return transactions
      .filter(t => t.parent_id === item.id)
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, item.id]);

  const hasLinkedRefund = totalRefunded > 0;
  const remainingAmount = item.amount - totalRefunded;

  const isExcluded = item.is_excluded === 1;
  const handleToggleVisibility = async (e: any) => {
    e.stopPropagation();
    await updateTransaction(item.id, { is_excluded: isExcluded ? 0 : 1 });
  };

  return (
    <Animated.View
      entering={FadeInRight.delay(index * 50)}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => onPress(item)}
        className="flex-row items-center justify-between py-4 border-b border-slate-100 dark:border-slate-900/50"
      >
        <View className="flex-row items-center flex-1">
          <View
            className="w-12 h-12 rounded-2xl items-center justify-center border border-slate-200 dark:border-slate-800"
            style={{ backgroundColor: `${item.category_color ?? "#3b82f6"}15` }}
          >
            <IconLoader name={display.icon} size={20} color={item.category_color ?? "#3b82f6"} />
          </View>
          <View className="ml-4 flex-1">
            <View className="flex-row items-center">
              <Text className="text-slate-900 dark:text-slate-100 font-bold text-base leading-5">
                {item.note || item.category_name || "Transaction"}
              </Text>
              {(isLinked || hasLinkedRefund || item.kind === "refund" || !!item.parent_id) && (
                <View className="ml-2 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex-row items-center">
                  <RefreshCcw size={10} color="#10b981" />
                  <Text className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 ml-1 uppercase">
                    {(item.kind === "refund" || !!item.parent_id) ? "Refund" : "Refunded"}
                  </Text>
                </View>
              )}
              
            </View>
            <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">
              {new Date(item.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(item.date).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}
            </Text>
          </View>
        </View>
        <View className="items-end">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={handleToggleVisibility}
              className={`p-2 rounded-xl mr-1 ${isExcluded ? 'bg-rose-500/10' : 'bg-slate-100 dark:bg-slate-800'}`}
            >
              {isExcluded ? (
                <EyeOff size={14} color="#f43f5e" />
              ) : (
                <Eye size={14} color="#64748b" />
              )}
            </TouchableOpacity>
            <Text className={`font-black text-base ${isExcluded ? 'text-slate-400 line-through' : display.colorClass}`}>
              {display.sign}{currencySymbol}{(hasLinkedRefund ? remainingAmount : item.amount).toFixed(2)}
            </Text>
          </View>
          {hasLinkedRefund && (
            <Text className="text-slate-400 text-[9px] font-bold uppercase tracking-tighter">
              {currencySymbol}{item.amount.toFixed(0)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};
