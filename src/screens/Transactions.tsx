import React, { useEffect, useMemo, useState } from "react";
import { FlatList, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Clock } from "lucide-react-native";
import { getTransactionDisplay, Transaction, useExpenseStore } from "../store/useExpenseStore";
import { TransactionKind } from "../utils/smsParser";
import { IconLoader } from "../components/IconLoader";
import AddTransactionModal from "../components/AddTransactionModal";

const Transactions = ({ navigation }: { navigation: any }) => {
  const { transactions, fetchTransactions } = useExpenseStore();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | TransactionKind>("all");

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 12; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('default', { month: 'short' });
        const year = d.getFullYear();
        result.push({ key, label, year });
    }
    return result;
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setShowEditModal(true);
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      // Month check
      if (!tx.date.startsWith(selectedMonth)) return false;

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
  }, [search, transactions, activeFilter, selectedMonth]);

  const renderItem = ({ item }: { item: Transaction }) => {
    const display = getTransactionDisplay(item);
    return (
      <TouchableOpacity 
        onPress={() => handleEditTransaction(item)}
        activeOpacity={0.7}
        className="flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
      >
        <View className="flex-row items-center flex-1">
          <View className="w-10 h-10 bg-slate-50 dark:bg-slate-800 rounded-xl items-center justify-center mr-3">
             <IconLoader name={display.icon} size={18} color="#64748b" />
          </View>
          <View className="flex-1">
            <Text className="text-slate-900 dark:text-white font-semibold leading-5 text-sm">
                {item.note || item.category_name || "Transaction"}
                {item.is_excluded === 1 && <Text className="text-rose-500 text-[10px] italic font-bold"> (Hidden)</Text>}
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">{new Date(item.date).toLocaleString()}</Text>
          </View>
        </View>
        <View className="items-end">
          <Text className={`font-black italic text-base tracking-tighter ${item.is_excluded === 1 ? 'text-slate-400 line-through' : display.colorClass}`}>
            {display.sign}${item.amount.toFixed(2)}
          </Text>
          <Text className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mt-0.5">{display.label}</Text>
        </View>
      </TouchableOpacity>
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

      {/* Month Picker */}
      <View className="px-6 py-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
          {months.map((m) => {
            const isSelected = selectedMonth === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                onPress={() => setSelectedMonth(m.key)}
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

      <View className="px-6 py-2">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search note, category, etc..."
          placeholderTextColor="#94a3b8"
          className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl px-4 py-4 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
        />
      </View>
      <View className="px-6 py-3 flex-row flex-wrap">
        {(["all", "expense", "income", "refund", "transfer"] as const).map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`px-3 py-2 rounded-xl mr-2 mb-2 border ${isActive
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

      <AddTransactionModal
        visible={showEditModal}
        onClose={() => {
            setShowEditModal(false);
            setEditingTransaction(null);
        }}
        editingTransaction={editingTransaction}
      />
    </SafeAreaView>
  );
};

export default Transactions;
