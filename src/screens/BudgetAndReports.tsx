import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft } from "lucide-react-native";
import { useExpenseStore } from "../store/useExpenseStore";

const BudgetAndReports = () => {
  const navigation = useNavigation();
  const {
    categories,
    budgets,
    fetchCategories,
    fetchBudgets,
    addCategory,
    upsertMonthlyBudget,
    getCurrentMonthExpenseTotal,
    getCurrentMonthCategorySpending,
  } = useExpenseStore();

  const [budgetInput, setBudgetInput] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [monthExpense, setMonthExpense] = useState(0);
  const [categorySpending, setCategorySpending] = useState<{ category_name: string; total: number }[]>([]);

  useEffect(() => {
    const load = async () => {
      await fetchCategories();
      await fetchBudgets();
      const expense = await getCurrentMonthExpenseTotal();
      const categoryTotals = await getCurrentMonthCategorySpending();
      setMonthExpense(expense);
      setCategorySpending(categoryTotals);
    };
    load();
  }, [fetchCategories, fetchBudgets, getCurrentMonthExpenseTotal, getCurrentMonthCategorySpending]);

  const monthlyBudget = useMemo(
    () => budgets.find((budget) => budget.category_id == null && budget.period_type === "monthly"),
    [budgets]
  );

  const handleSaveBudget = async () => {
    const amount = Number(budgetInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid budget", "Please enter a valid monthly budget amount.");
      return;
    }
    await upsertMonthlyBudget(amount);
    setBudgetInput("");
    Alert.alert("Saved", "Monthly budget updated.");
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    await addCategory({
      name,
      icon: "circle",
      color: "#4D96FF",
    });
    setNewCategoryName("");
  };

  const monthlyRemaining = monthlyBudget ? monthlyBudget.limit_amount - monthExpense : 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="px-6 py-4 flex-row items-center border-b border-slate-900">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-4">Budgets & Reports</Text>
      </View>

      <FlatList
        data={categorySpending}
        keyExtractor={(item) => item.category_name}
        ListHeaderComponent={
          <View className="px-6 pt-6">
            <View className="bg-slate-900 rounded-2xl p-4 border border-slate-800 mb-4">
              <Text className="text-white font-semibold text-base mb-2">Monthly Budget</Text>
              <Text className="text-slate-400 text-sm mb-3">
                Current: {monthlyBudget ? `$${monthlyBudget.limit_amount.toFixed(2)}` : "Not set"}
              </Text>
              <TextInput
                value={budgetInput}
                onChangeText={setBudgetInput}
                keyboardType="decimal-pad"
                placeholder="Set monthly budget amount"
                placeholderTextColor="#64748b"
                className="bg-slate-800 text-white rounded-xl px-4 py-3 border border-slate-700 mb-3"
              />
              <TouchableOpacity onPress={handleSaveBudget} className="bg-blue-500 rounded-xl py-3">
                <Text className="text-white text-center font-semibold">Save Monthly Budget</Text>
              </TouchableOpacity>
              {monthlyBudget && (
                <Text className="text-slate-300 text-xs mt-3">
                  Spent: ${monthExpense.toFixed(2)} | Remaining: ${monthlyRemaining.toFixed(2)}
                </Text>
              )}
            </View>

            <View className="bg-slate-900 rounded-2xl p-4 border border-slate-800 mb-4">
              <Text className="text-white font-semibold text-base mb-2">Category Management</Text>
              <TextInput
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="Add custom category"
                placeholderTextColor="#64748b"
                className="bg-slate-800 text-white rounded-xl px-4 py-3 border border-slate-700 mb-3"
              />
              <TouchableOpacity onPress={handleAddCategory} className="bg-emerald-500 rounded-xl py-3">
                <Text className="text-white text-center font-semibold">Add Category</Text>
              </TouchableOpacity>
              <View className="flex-row flex-wrap mt-3">
                {categories.map((category) => (
                  <View key={category.id} className="px-2 py-1 bg-slate-800 rounded-lg mr-2 mb-2">
                    <Text className="text-slate-200 text-xs">{category.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text className="text-white font-semibold text-base mb-3">Monthly Category Report</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mx-6 mb-3 bg-slate-900 p-4 rounded-2xl border border-slate-800 flex-row justify-between">
            <Text className="text-slate-200">{item.category_name}</Text>
            <Text className="text-white font-semibold">${item.total.toFixed(2)}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View className="px-6 py-4">
            <Text className="text-slate-500">No monthly expense data yet.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </SafeAreaView>
  );
};

export default BudgetAndReports;
