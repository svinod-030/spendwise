import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Clock } from "lucide-react-native";
import { getTransactionDisplay, Transaction, useExpenseStore } from "../store/useExpenseStore";
import { TransactionKind } from "../utils/smsParser";

const Transactions = ({ navigation }: { navigation: any }) => {
  const { transactions, fetchTransactions } = useExpenseStore();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | TransactionKind>("all");

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      const kind = tx.kind ?? (tx.type === "income" ? "income" : "expense");
      const filterMatch = activeFilter === "all" || kind === activeFilter;
      if (!filterMatch) return false;
      if (!query) return true;
      return (
        tx.note?.toLowerCase().includes(query) ||
        tx.category_name?.toLowerCase().includes(query) ||
        tx.merchant?.toLowerCase().includes(query) ||
        tx.reference_id?.toLowerCase().includes(query)
      );
    });
  }, [search, transactions, activeFilter]);

  const renderItem = ({ item }: { item: Transaction }) => {
    const display = getTransactionDisplay(item);
    return (
      <View className="flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none">
        <View className="flex-1">
          <Text className="text-slate-900 dark:text-white font-semibold">{item.note || item.category_name || "Transaction"}</Text>
          <Text className="text-slate-500 dark:text-slate-400 text-xs mt-1">{new Date(item.date).toLocaleString()}</Text>
        </View>
        <View className="items-end">
          <Text className={`font-bold ${display.colorClass}`}>
            {display.sign}${item.amount.toFixed(2)}
          </Text>
          <Text className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{display.label}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-6 pt-6 pb-2 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900">
        <View className="flex-row items-center mb-1">
          <View className="w-8 h-8 bg-blue-500 rounded-xl items-center justify-center mr-3 shadow-lg shadow-blue-500/30">
            <Clock size={18} color="white" />
          </View>
          <Text className="text-slate-900 dark:text-white text-xl font-black tracking-tighter">SpendWise</Text>
        </View>
        <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">History Overview</Text>
      </View>

      <View className="px-6 py-4">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by note, category, merchant, reference"
          placeholderTextColor="#94a3b8"
          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl px-4 py-4 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
        />
      </View>
      <View className="px-6 pb-3 flex-row flex-wrap">
        {(["all", "expense", "income", "refund", "transfer"] as const).map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`px-3 py-2 rounded-xl mr-2 mb-2 border ${
                isActive 
                  ? "bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20" 
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
              }`}
            >
              <Text className={`text-xs capitalize font-bold ${isActive ? 'text-white' : 'text-slate-500'}`}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default Transactions;
