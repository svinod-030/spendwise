import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft } from "lucide-react-native";
import { Transaction, useExpenseStore } from "../store/useExpenseStore";

const Transactions = () => {
  const navigation = useNavigation();
  const { transactions, fetchTransactions } = useExpenseStore();
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return transactions;
    return transactions.filter((tx) => {
      return (
        tx.note?.toLowerCase().includes(query) ||
        tx.category_name?.toLowerCase().includes(query) ||
        tx.merchant?.toLowerCase().includes(query) ||
        tx.reference_id?.toLowerCase().includes(query)
      );
    });
  }, [search, transactions]);

  const renderItem = ({ item }: { item: Transaction }) => (
    <View className="flex-row items-center justify-between bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-800">
      <View className="flex-1">
        <Text className="text-white font-semibold">{item.note || item.category_name || "Transaction"}</Text>
        <Text className="text-slate-400 text-xs mt-1">
          {new Date(item.date).toLocaleString()}
        </Text>
      </View>
      <Text className={`font-bold ${item.type === "expense" ? "text-rose-500" : "text-emerald-400"}`}>
        {item.type === "expense" ? "-" : "+"}${item.amount.toFixed(2)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="px-6 py-4 flex-row items-center border-b border-slate-900">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-4">All Transactions</Text>
      </View>

      <View className="px-6 py-4">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by note, category, merchant, reference"
          placeholderTextColor="#64748b"
          className="bg-slate-900 text-white rounded-2xl px-4 py-4 border border-slate-800"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 30 }}
      />
    </SafeAreaView>
  );
};

export default Transactions;
