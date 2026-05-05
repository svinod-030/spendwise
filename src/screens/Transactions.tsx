import React, { useEffect, useMemo, useState } from "react";
import { FlatList, ScrollView, Text, TextInput, TouchableOpacity, View, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RefreshCcw, Eye, EyeOff, Trash2, SlidersHorizontal, X } from "lucide-react-native";
import { getTransactionDisplay, useExpenseStore } from "../store/useExpenseStore";
import { TransactionKind } from "../types";
import { IconLoader } from "../components/IconLoader";
import { Alert } from "react-native";
import { CategoryPickerModal } from "../components/CategoryPickerModal";
import { Transaction } from "../types/expense-store";

const Transactions = ({ navigation, route }: { navigation: any; route: any }) => {
  const { transactions, fetchTransactions, fetchCategories, getCurrencySymbol, updateTransaction, deleteTransaction } = useExpenseStore();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | TransactionKind>("all");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);

  // Category picker state
  const [categoryPickerTx, setCategoryPickerTx] = useState<Transaction | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (route.params?.selectedMonth) return route.params.selectedMonth;
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("default", { month: "short" });
      result.push({ key, label, year: d.getFullYear() });
    }
    return result;
  }, []);

  useEffect(() => {
    fetchTransactions(undefined, selectedMonth);
  }, [fetchTransactions, selectedMonth]);

  useEffect(() => {
    const params: any = {};
    if (route.params?.searchQuery !== undefined) { setSearch(route.params.searchQuery); params.searchQuery = undefined; }
    if (route.params?.selectedMonth !== undefined) { setSelectedMonth(route.params.selectedMonth); params.selectedMonth = undefined; }
    if (Object.keys(params).length > 0) navigation.setParams(params);
  }, [route.params?.searchQuery, route.params?.selectedMonth, navigation]);

  const handleEditTransaction = (tx: Transaction) => {
    navigation.navigate("AddTransaction", { editingTransaction: tx, returnTo: "Transactions", selectedMonth });
  };

  const handleCategorySelect = async (categoryId: number | null) => {
    if (categoryPickerTx) {
      await updateTransaction(categoryPickerTx.id, { category_id: categoryId });
    }
    setCategoryPickerTx(null);
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions
      .filter((tx) => {
        const kind = tx.kind ?? (tx.type === "income" ? "income" : "expense");
        if (activeFilter !== "all" && kind !== activeFilter) return false;
        if (!query) return true;
        return tx.note?.toLowerCase().includes(query) || tx.category_name?.toLowerCase().includes(query) || tx.merchant?.toLowerCase().includes(query) || tx.reference_id?.toLowerCase().includes(query);
      })
      .sort((a, b) => {
        if (sortBy === "date") {
          const diff = new Date(b.date).getTime() - new Date(a.date).getTime();
          return sortOrder === "desc" ? diff : -diff;
        }
        return sortOrder === "desc" ? b.amount - a.amount : a.amount - b.amount;
      });
  }, [search, transactions, activeFilter, sortBy, sortOrder]);

  const refundMap = useMemo(() => {
    const map: Record<number, number> = {};
    transactions.forEach(t => { if (t.parent_id) map[t.parent_id] = (map[t.parent_id] || 0) + t.amount; });
    return map;
  }, [transactions]);

  const hasActiveFilters = activeFilter !== "all" || sortBy !== "date" || sortOrder !== "desc";
  const sortLabel = sortBy === "date" ? (sortOrder === "desc" ? "Newest" : "Oldest") : (sortOrder === "desc" ? "Highest" : "Lowest");

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

    const handleDelete = (e: any) => {
      e.stopPropagation();
      Alert.alert(
        "Delete Transaction",
        "Are you sure you want to delete this transaction?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteTransaction(item.id) },
        ]
      );
    };

    return (
      <TouchableOpacity
        onPress={() => handleEditTransaction(item)}
        activeOpacity={0.7}
        className="flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
      >
        <View className="flex-row items-center flex-1">
          {/* Category icon — tap to pick category inline */}
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation(); setCategoryPickerTx(item); }}
            activeOpacity={0.75}
            className="w-10 h-10 rounded-xl items-center justify-center mr-3 border border-slate-200 dark:border-slate-700"
            style={{ backgroundColor: `${item.category_color ?? "#3b82f6"}15` }}
          >
            <IconLoader name={display.icon} size={18} color={item.category_color ?? "#3b82f6"} />
          </TouchableOpacity>
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
        <View className="flex-row items-center ml-2">
          <View className="items-end mr-3">
            <Text className={`font-black italic text-base tracking-tighter ${isExcluded ? 'text-slate-400 line-through' : display.colorClass}`}>
              {display.sign} {getCurrencySymbol()} {(hasLinkedRefund ? remainingAmount : item.amount).toFixed(2)}
            </Text>
            {hasLinkedRefund && (
              <Text className="text-slate-400 text-[9px] font-bold uppercase tracking-tighter">
                {getCurrencySymbol()}{item.amount.toFixed(0)}
              </Text>
            )}
          </View>
          <View className="items-center justify-center">
            <TouchableOpacity
              onPress={handleToggleVisibility}
              className={`p-2 rounded-xl mb-1 ${isExcluded ? 'bg-rose-500/10' : 'bg-slate-100 dark:bg-slate-800'}`}
            >
              {isExcluded ? (
                <EyeOff size={13} color="#f43f5e" />
              ) : (
                <Eye size={13} color="#64748b" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800"
            >
              <Trash2 size={13} color="#f43f5e" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={["bottom", "left", "right"]}>
      {/* Month Picker */}
      <View className="px-6 pt-4 pb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {months.map((m) => {
            const isSelected = selectedMonth === m.key;
            return (
              <TouchableOpacity
                key={m.key}
                onPress={() => setSelectedMonth(m.key)}
                className={`mr-3 px-5 py-2.5 rounded-2xl border ${isSelected ? "bg-blue-600 border-blue-500" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"}`}
              >
                <Text className={`font-black uppercase tracking-tighter text-[11px] ${isSelected ? "text-white" : "text-slate-500"}`}>{m.label} {m.year}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search + Filter button */}
      <View className="px-6 py-2 flex-row items-center gap-3">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search note, category, merchant..."
          placeholderTextColor="#94a3b8"
          className="flex-1 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl px-4 py-3.5 border border-slate-100 dark:border-slate-800 shadow-sm"
        />
        <TouchableOpacity
          onPress={() => setIsFilterModalVisible(true)}
          className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl w-12 h-12 items-center justify-center shadow-sm"
        >
          <SlidersHorizontal size={18} color={hasActiveFilters ? "#2563eb" : "#64748b"} />
          {hasActiveFilters && <View className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full" />}
        </TouchableOpacity>
      </View>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <View className="px-6 pb-2 flex-row flex-wrap gap-2">
          {activeFilter !== "all" && (
            <View className="flex-row items-center bg-blue-600/10 border border-blue-600/20 px-2.5 py-1 rounded-full">
              <Text className="text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider">{activeFilter}</Text>
              <TouchableOpacity onPress={() => setActiveFilter("all")} className="ml-1.5"><X size={10} color="#2563eb" /></TouchableOpacity>
            </View>
          )}
          {(sortBy !== "date" || sortOrder !== "desc") && (
            <View className="flex-row items-center bg-violet-600/10 border border-violet-600/20 px-2.5 py-1 rounded-full">
              <Text className="text-violet-600 dark:text-violet-400 text-[10px] font-black uppercase tracking-wider">{sortLabel}</Text>
              <TouchableOpacity onPress={() => { setSortBy("date"); setSortOrder("desc"); }} className="ml-1.5"><X size={10} color="#7c3aed" /></TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Filter & Sort Modal */}
      <Modal visible={isFilterModalVisible} transparent animationType="slide" onRequestClose={() => setIsFilterModalVisible(false)}>
        <Pressable className="flex-1 bg-slate-900/40 justify-end" onPress={() => setIsFilterModalVisible(false)}>
          <Pressable className="bg-white dark:bg-slate-900 rounded-t-[32px] border border-slate-100 dark:border-slate-800 pb-10">
            <View className="items-center pt-4 pb-2">
              <View className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </View>
            <View className="px-6 py-3 border-b border-slate-50 dark:border-slate-800 flex-row items-center justify-between">
              <Text className="text-slate-900 dark:text-white font-black text-lg">Filter & Sort</Text>
              <TouchableOpacity onPress={() => { setActiveFilter("all"); setSortBy("date"); setSortOrder("desc"); }}>
                <Text className="text-blue-600 font-bold">Reset</Text>
              </TouchableOpacity>
            </View>

            <View className="px-6 pt-5">
              <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">Filter by Type</Text>
              <View className="flex-row flex-wrap gap-2">
                {(["all", "expense", "income", "refund", "transfer"] as const).map((f) => {
                  const clr: Record<string, string> = { all: "#3b82f6", expense: "#f43f5e", income: "#10b981", refund: "#06b6d4", transfer: "#f59e0b" };
                  const active = activeFilter === f;
                  return (
                    <TouchableOpacity key={f} onPress={() => setActiveFilter(f)} className="px-4 py-2 rounded-xl border"
                      style={active ? { backgroundColor: `${clr[f]}15`, borderColor: clr[f] } : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}>
                      <Text className="text-xs capitalize font-bold" style={{ color: active ? clr[f] : "#64748b" }}>{f === "all" ? "All Types" : f}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View className="px-6 pt-5">
              <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">Sort by</Text>
              <View className="flex-row flex-wrap gap-2">
                {[
                  { label: "Newest First", field: "date", order: "desc", color: "#8b5cf6" },
                  { label: "Oldest First", field: "date", order: "asc", color: "#8b5cf6" },
                  { label: "Highest Amount", field: "amount", order: "desc", color: "#3b82f6" },
                  { label: "Lowest Amount", field: "amount", order: "asc", color: "#3b82f6" },
                ].map(opt => {
                  const active = sortBy === opt.field && sortOrder === opt.order;
                  return (
                    <TouchableOpacity key={opt.label} onPress={() => { setSortBy(opt.field as any); setSortOrder(opt.order as any); }} className="px-4 py-2 rounded-xl border"
                      style={active ? { backgroundColor: `${opt.color}15`, borderColor: opt.color } : { backgroundColor: "#f8fafc", borderColor: "#e2e8f0" }}>
                      <Text className="text-xs font-bold" style={{ color: active ? opt.color : "#64748b" }}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} className="mx-6 mt-6 py-4 rounded-2xl bg-blue-600 items-center">
              <Text className="text-white font-black">Apply</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Inline Category Picker */}
      <CategoryPickerModal
        visible={categoryPickerTx !== null}
        selectedCategoryId={categoryPickerTx?.category_id ?? null}
        onSelect={handleCategorySelect}
        onClose={() => setCategoryPickerTx(null)}
      />
    </SafeAreaView>
  );
};

export default Transactions;
