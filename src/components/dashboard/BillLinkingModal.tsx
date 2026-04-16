import React from "react";
import { View, Text, TouchableOpacity, Modal, TextInput, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { X, Plus, ChevronRight, Search } from "lucide-react-native";
import { Bill, Transaction } from "../../store/useExpenseStore";

interface BillLinkingModalProps {
  isVisible: boolean;
  onClose: () => void;
  selectedBill: Bill | null;
  billSearch: string;
  onSearchChange: (text: string) => void;
  onMarkPaidManually: () => void;
  onLinkTransaction: (transaction: Transaction) => void;
  transactions: Transaction[];
  currencySymbol: string;
}

export const BillLinkingModal = ({
  isVisible,
  onClose,
  selectedBill,
  billSearch,
  onSearchChange,
  onMarkPaidManually,
  onLinkTransaction,
  transactions,
  currencySymbol
}: BillLinkingModalProps) => {
  const filteredTransactions = transactions.filter(t => {
    if (t.type !== 'expense') return false;
    if (!billSearch) {
      return Math.abs(t.amount - (selectedBill?.amount || 0)) < 100;
    }
    return (t.note || "").toLowerCase().includes(billSearch.toLowerCase()) ||
      (t.merchant || "").toLowerCase().includes(billSearch.toLowerCase()) ||
      t.amount.toString().includes(billSearch);
  }).slice(0, 20);

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
    >
      <SafeAreaView className="flex-1 bg-slate-900/50 backdrop-blur-md justify-end">
        <View className="bg-white dark:bg-slate-950 rounded-t-[40px] h-[85%] shadow-2xl">
          <View className="px-6 pt-8 pb-4 border-b border-slate-50 dark:border-slate-900">
            <View className="flex-row items-center justify-between mb-6">
              <View>
                <Text className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                  Mark Bill as Paid
                </Text>
                <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {selectedBill?.sender} • {currencySymbol}{selectedBill?.amount}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full"
              >
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Option 1: Create New */}
            <TouchableOpacity
              onPress={onMarkPaidManually}
              className="bg-blue-600 p-5 rounded-3xl flex-row items-center justify-between mb-6 shadow-xl shadow-blue-500/20"
            >
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-2xl bg-white/20 items-center justify-center mr-4">
                  <Plus size={20} color="white" />
                </View>
                <View>
                  <Text className="text-white font-black text-sm">Create New Transaction</Text>
                  <Text className="text-white/60 text-[10px] uppercase font-bold tracking-widest">Mark as paid manually</Text>
                </View>
              </View>
              <ChevronRight size={18} color="white" />
            </TouchableOpacity>

            <View className="flex-row items-center bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 py-3 mb-2">
              <Search size={18} color="#94a3b8" />
              <TextInput
                placeholder="Search recent transactions to link..."
                placeholderTextColor="#94a3b8"
                value={billSearch}
                onChangeText={onSearchChange}
                className="flex-1 ml-2 text-slate-900 dark:text-white font-bold"
              />
            </View>
          </View>

          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 24 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => onLinkTransaction(item)}
                className="bg-white dark:bg-slate-900 p-4 rounded-3xl mb-3 border border-slate-100 dark:border-slate-800 shadow-sm"
              >
                <View className="flex-row justify-between items-center">
                  <View className="flex-1">
                    <Text className="text-slate-900 dark:text-white font-black text-sm">{item.note || item.merchant || "Transaction"}</Text>
                    <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">
                      {new Date(item.date).toLocaleDateString()} • {currencySymbol}{item.amount}
                    </Text>
                  </View>
                  <View className="bg-blue-500/10 px-3 py-1.5 rounded-xl">
                    <Text className="text-blue-600 font-black text-[10px] uppercase tracking-tighter">Link This</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={() => (
              <View className="py-10 items-center justify-center">
                <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center px-10">
                  No matching transactions found to link.
                </Text>
              </View>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
};
