import React, { useEffect, useMemo, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft } from "lucide-react-native";
import { useExpenseStore } from "../store/useExpenseStore";
import { TransactionKind } from "../utils/smsParser";

const AddTransaction = () => {
  const navigation = useNavigation();
  const { categories, fetchCategories, addTransaction } = useExpenseStore();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedKind, setSelectedKind] = useState<TransactionKind>("expense");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const canSave = useMemo(() => Number(amount) > 0, [amount]);

  const handleSave = async () => {
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }

    try {
      const type = selectedKind === "expense" || selectedKind === "transfer" ? "expense" : "income";
      await addTransaction({
        category_id: selectedCategoryId,
        amount: parsedAmount,
        type,
        kind: selectedKind,
        date: new Date().toISOString(),
        note: note.trim(),
      });
      navigation.goBack();
    } catch {
      Alert.alert("Failed", "Unable to save transaction.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="px-6 py-4 flex-row items-center border-b border-slate-900">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-4">Add Transaction</Text>
      </View>

      <View className="p-6">
        <Text className="text-slate-400 mb-2">Amount</Text>
        <TextInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#64748b"
          className="bg-slate-900 text-white rounded-2xl px-4 py-4 border border-slate-800 mb-4"
        />

        <Text className="text-slate-400 mb-2">Note</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Optional note"
          placeholderTextColor="#64748b"
          className="bg-slate-900 text-white rounded-2xl px-4 py-4 border border-slate-800 mb-4"
        />

        <Text className="text-slate-400 mb-2">Type</Text>
        <View className="flex-row flex-wrap mb-4">
          <TouchableOpacity
            onPress={() => setSelectedKind("expense")}
            className={`w-[48%] mr-[4%] mb-2 p-4 rounded-2xl border ${selectedKind === "expense" ? "bg-rose-500/20 border-rose-500/40" : "bg-slate-900 border-slate-800"}`}
          >
            <Text className="text-center text-white font-semibold">Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedKind("income")}
            className={`w-[48%] mb-2 p-4 rounded-2xl border ${selectedKind === "income" ? "bg-emerald-500/20 border-emerald-500/40" : "bg-slate-900 border-slate-800"}`}
          >
            <Text className="text-center text-white font-semibold">Income</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedKind("refund")}
            className={`w-[48%] mr-[4%] p-4 rounded-2xl border ${selectedKind === "refund" ? "bg-cyan-500/20 border-cyan-500/40" : "bg-slate-900 border-slate-800"}`}
          >
            <Text className="text-center text-white font-semibold">Refund</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setSelectedKind("transfer")}
            className={`w-[48%] p-4 rounded-2xl border ${selectedKind === "transfer" ? "bg-amber-500/20 border-amber-500/40" : "bg-slate-900 border-slate-800"}`}
          >
            <Text className="text-center text-white font-semibold">Transfer</Text>
          </TouchableOpacity>
        </View>

        <Text className="text-slate-400 mb-2">Category</Text>
        <View className="flex-row flex-wrap mb-6">
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              onPress={() => setSelectedCategoryId(category.id)}
              className={`px-3 py-2 rounded-xl mr-2 mb-2 border ${selectedCategoryId === category.id ? "border-blue-400 bg-blue-500/20" : "border-slate-700 bg-slate-900"}`}
            >
              <Text className="text-white text-xs">{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          className={`p-4 rounded-2xl ${canSave ? "bg-blue-500" : "bg-slate-700"}`}
        >
          <Text className="text-white text-center font-bold">Save Transaction</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default AddTransaction;
