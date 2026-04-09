import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Check, CheckCircle2 } from "lucide-react-native";
import { useExpenseStore } from "../store/useExpenseStore";
import { TransactionKind } from "../utils/smsParser";
import CustomNumpad from "../components/CustomNumpad";

const AddTransaction = () => {
  const navigation = useNavigation();
  const { categories, fetchCategories, addTransaction } = useExpenseStore();
  const [amountStr, setAmountStr] = useState("0");
  const [note, setNote] = useState("");
  const [selectedKind, setSelectedKind] = useState<TransactionKind>("expense");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const canSave = useMemo(() => {
    const parsed = Number(amountStr);
    return parsed > 0 && selectedCategoryId !== null;
  }, [amountStr, selectedCategoryId]);

  const handleSave = async () => {
    const parsedAmount = Number(amountStr);
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

  const handleNumpadPress = (val: string) => {
    setAmountStr((prev) => {
      if (val === "." && prev.includes(".")) return prev;
      if (prev === "0" && val !== ".") return val;
      // Limit decimal places to 2
      if (prev.includes(".")) {
        const [, decimal] = prev.split(".");
        if (decimal && decimal.length >= 2) return prev;
      }
      return prev + val;
    });
  };

  const handleNumpadDelete = () => {
    setAmountStr((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
  };

  const amountColorClasses = {
    expense: "text-rose-400",
    income: "text-emerald-400",
    refund: "text-cyan-400",
    transfer: "text-amber-400",
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-slate-900">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">New Transaction</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={!canSave}
          className={`px-4 py-2 rounded-full ${canSave ? "bg-blue-500" : "bg-slate-800"}`}
        >
          <Text className={`font-bold ${canSave ? "text-white" : "text-slate-500"}`}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Amount Display */}
        <View className="items-center justify-center py-12 pb-6">
          <Text className="text-slate-500 font-medium mb-2 uppercase tracking-widest text-xs">Amount</Text>
          <View className="flex-row items-center">
            <Text className={`text-4xl mr-1 ${amountColorClasses[selectedKind]}`}>$</Text>
            <Text className={`text-6xl font-bold ${amountColorClasses[selectedKind]}`}>{amountStr}</Text>
          </View>
        </View>

        {/* Numpad */}
        <View className="px-6 mb-8">
          <CustomNumpad onPressItem={handleNumpadPress} onDelete={handleNumpadDelete} />
        </View>

        {/* Type Selector */}
        <View className="px-6 mb-8">
          <Text className="text-slate-400 font-semibold mb-4 text-sm uppercase tracking-wide">Type</Text>
          <View className="bg-slate-900 rounded-2xl flex-row p-1 border border-slate-800">
            {(["expense", "income", "refund", "transfer"] as const).map((kind) => (
              <TouchableOpacity
                key={kind}
                onPress={() => setSelectedKind(kind)}
                className={`flex-1 py-3 items-center justify-center rounded-xl ${
                  selectedKind === kind ? "bg-slate-800 shadow-md" : ""
                }`}
              >
                <Text
                  className={`capitalize font-semibold ${
                    selectedKind === kind ? amountColorClasses[kind] : "text-slate-500"
                  }`}
                >
                  {kind}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Category Selector */}
        <View className="px-6 mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-slate-400 font-semibold text-sm uppercase tracking-wide">Category</Text>
            {selectedCategoryId === null && <Text className="text-rose-500 text-xs">Required</Text>}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
            <View className="flex-row pb-2 pr-6">
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => setSelectedCategoryId(category.id)}
                  className={`w-28 h-28 mr-3 rounded-3xl p-4 justify-between border ${
                    selectedCategoryId === category.id
                      ? "bg-blue-500/20 border-blue-500/50"
                      : "bg-slate-900 border-slate-800"
                  }`}
                >
                  <View
                    className="w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: `${category.color ?? "#4D96FF"}20` }}
                  >
                    <Text className="text-lg">{category.icon === "utensils" ? "🍴" : "📦"}</Text>
                  </View>
                  <View>
                    {selectedCategoryId === category.id && (
                      <View className="absolute right-0 bottom-6">
                        <CheckCircle2 size={16} color="#60a5fa" />
                      </View>
                    )}
                    <Text
                      className={`font-semibold mt-2 ${
                        selectedCategoryId === category.id ? "text-blue-400" : "text-slate-300"
                      }`}
                      numberOfLines={1}
                    >
                      {category.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Note */}
        <View className="px-6 mb-8">
          <Text className="text-slate-400 font-semibold mb-4 text-sm uppercase tracking-wide">Note (Optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What was this for?"
            placeholderTextColor="#64748b"
            className="bg-slate-900 text-white rounded-2xl px-5 py-4 border border-slate-800 font-medium"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddTransaction;
