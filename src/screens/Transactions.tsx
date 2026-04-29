import React, { useEffect, useMemo, useState } from "react";
import { FlatList, ScrollView, Text, TextInput, TouchableOpacity, View, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Clock, RefreshCcw, ArrowUpDown, Check, ChevronDown, Eye, EyeOff } from "lucide-react-native";
import { getTransactionDisplay, Transaction, useExpenseStore } from "../store/useExpenseStore";
import { TransactionKind } from "../utils/smsParser";
import { IconLoader } from "../components/IconLoader";

const Transactions = ({ navigation, route }: { navigation: any; route: any }) => {
  const { transactions, fetchTransactions, getCurrencySymbol, updateTransaction } = useExpenseStore();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | TransactionKind>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isSortModalVisible, setIsSortModalVisible] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setDate(1);
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

  useEffect(() => {
    let updateParams: any = {};
    if (route.params?.searchQuery !== undefined) {
      setSearch(route.params.searchQuery);
      updateParams.searchQuery = undefined;
    }
    if (route.params?.selectedMonth !== undefined) {
      setSelectedMonth(route.params.selectedMonth);
      updateParams.selectedMonth = undefined;
    }
    
    if (Object.keys(updateParams).length > 0) {
      navigation.setParams(updateParams);
    }
  }, [route.params?.searchQuery, route.params?.selectedMonth, navigation]);

  const handleEditTransaction = (tx: Transaction) => {
    navigation.navigate("AddTransaction", { editingTransaction: tx, returnTo: "Transactions" });
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const result = transactions.filter((tx) => {
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

    // Sort the results
    return result.sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      } else {
        return sortOrder === "desc" ? b.amount - a.amount : a.amount - b.amount;
      }
    });
  }, [search, transactions, activeFilter, selectedMonth, sortBy, sortOrder]);

  const refundMap = useMemo(() => {
    const map: Record<number, number> = {};
    transactions.forEach(t => {
      if (t.parent_id) {
        map[t.parent_id] = (map[t.parent_id] || 0) + t.amount;
      }
    });
    return map;
  }, [transactions]);

  const renderItem = ({ item }: { item: Transaction }) => {
    const display = getTransactionDisplay(item);
    const totalRefunded = refundMap[item.id] || 0;
    const remainingAmount = item.amount - totalRefunded;
    const hasLinkedRefund = totalRefunded > 0;
    const isRefund = item.kind === "refund" || !!item.parent_id;

    const isExcluded = item.is_excluded === 1;
    const handleToggleVisibility = async (e: any) => {
      e.stopPropagation();
      await updateTransaction(item.id, { is_excluded: isExcluded ? 0 : 1 });
    };

    return (
      <TouchableOpacity
        onPress={() => handleEditTransaction(item)}
        activeOpacity={0.7}
        className="flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
      >
        <View className="flex-row items-center flex-1">
          <View
            className="w-10 h-10 rounded-xl items-center justify-center mr-3 border border-slate-200 dark:border-slate-700"
            style={{ backgroundColor: `${item.category_color ?? "#3b82f6"}15` }}
          >
            <IconLoader name={display.icon} size={18} color={item.category_color ?? "#3b82f6"} />
          </View>
          <View className="flex-1">
            <View className="flex-row items-center">
              <Text className="text-slate-900 dark:text-white font-semibold leading-5 text-sm">
                {item.note || item.category_name || "Transaction"}
              </Text>
              {(hasLinkedRefund || isRefund) && (
                <View className="ml-2 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex-row items-center">
                  <RefreshCcw size={10} color="#10b981" />
                  <Text className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 ml-1 uppercase">
                    {isRefund ? "Refund" : "Refunded"}
                  </Text>
                </View>
              )}

            </View>
            <Text className="text-slate-500 dark:text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-0.5">
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
            <Text className={`font-black italic text-base tracking-tighter ${isExcluded ? 'text-slate-400 line-through' : display.colorClass}`}>
              {display.sign} {getCurrencySymbol()} {(hasLinkedRefund ? remainingAmount : item.amount).toFixed(2)}
            </Text>
          </View>
          {hasLinkedRefund && (
            <Text className="text-slate-400 text-[9px] font-bold uppercase tracking-tighter">
              {getCurrencySymbol()}{item.amount.toFixed(0)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['bottom', 'left', 'right']}>
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
      <View className="px-6 py-3 flex-row items-center justify-between">
        <View className="flex-row flex-1 flex-wrap">
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

        <TouchableOpacity
          onPress={() => setIsSortModalVisible(true)}
          className="flex-row items-center bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl mb-2"
        >
          <ArrowUpDown size={12} color="#64748b" className="mr-2" />
          <Text className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 mr-1">
            {sortBy === 'date' ? (sortOrder === 'desc' ? 'Newest' : 'Oldest') : (sortOrder === 'desc' ? 'Highest' : 'Lowest')}
          </Text>
          <ChevronDown size={12} color="#64748b" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      />

      {/* Sort Modal */}
      <Modal
        visible={isSortModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsSortModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-slate-900/40 backdrop-blur-sm justify-center px-6"
          onPress={() => setIsSortModalVisible(false)}
        >
          <Pressable className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800">
            <View className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 items-center">
              <Text className="text-slate-900 dark:text-white font-black">Sort Transactions</Text>
            </View>

            {[
              { label: "Newest First", field: "date", order: "desc" },
              { label: "Oldest First", field: "date", order: "asc" },
              { label: "Highest Amount", field: "amount", order: "desc" },
              { label: "Lowest Amount", field: "amount", order: "asc" },
            ].map((opt, idx, arr) => {
              const isSelected = sortBy === opt.field && sortOrder === opt.order;
              return (
                <TouchableOpacity
                  key={opt.label}
                  className={`flex-row items-center px-6 py-5 ${idx !== arr.length - 1 ? 'border-b border-slate-50 dark:border-slate-800' : ''}`}
                  onPress={() => {
                    setSortBy(opt.field as any);
                    setSortOrder(opt.order as any);
                    setIsSortModalVisible(false);
                  }}
                >
                  <View className={`w-8 h-8 rounded-xl items-center justify-center mr-4 ${isSelected ? 'bg-blue-500/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    {opt.field === "date" ? (
                      <Clock size={16} color={isSelected ? "#3b82f6" : "#64748b"} />
                    ) : (
                      <ArrowUpDown size={16} color={isSelected ? "#3b82f6" : "#64748b"} />
                    )}
                  </View>
                  <Text className={`flex-1 font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                    {opt.label}
                  </Text>
                  {isSelected && <Check size={18} color="#3b82f6" />}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default Transactions;
