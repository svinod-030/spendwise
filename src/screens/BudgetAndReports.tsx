import React, { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Text, TextInput, TouchableOpacity, View, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Plus } from "lucide-react-native";
import { useExpenseStore } from "../store/useExpenseStore";
import { PieChart } from "react-native-gifted-charts";

const screenWidth = Dimensions.get("window").width;

const fallbackColors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

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
  const [categorySpending, setCategorySpending] = useState<{ category_name: string; category_color?: string; total: number }[]>([]);

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
      color: fallbackColors[categories.length % fallbackColors.length],
    });
    setNewCategoryName("");
  };

  const monthlyRemaining = monthlyBudget ? monthlyBudget.limit_amount - monthExpense : 0;
  const budgetProgress = monthlyBudget ? Math.min((monthExpense / monthlyBudget.limit_amount) * 100, 100) : 0;

  const pieData = useMemo(() => {
    if (categorySpending.length === 0) return [];
    return categorySpending.map((cat, index) => ({
      value: cat.total,
      color: cat.category_color || fallbackColors[index % fallbackColors.length],
      text: `${Math.round((cat.total / monthExpense) * 100)}%`,
    }));
  }, [categorySpending, monthExpense]);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="px-6 py-4 flex-row items-center border-b border-slate-900 shadow-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-2">Budgets & Reports</Text>
      </View>

      <FlatList
        data={categorySpending}
        keyExtractor={(item) => item.category_name}
        ListHeaderComponent={
          <View className="px-6 pt-6">
            {/* Monthly Budget Card */}
            <View className="bg-slate-900/60 rounded-3xl p-5 border border-slate-800 mb-6">
              <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-4">Overall Monthly Budget</Text>
              
              <View className="flex-row items-end justify-between mb-2">
                <Text className="text-white text-3xl font-black">${monthExpense.toFixed(0)}</Text>
                <Text className="text-slate-500 font-bold mb-1">/ ${monthlyBudget ? monthlyBudget.limit_amount.toFixed(0) : "0"}</Text>
              </View>

              <View className="h-4 bg-slate-800 rounded-full overflow-hidden mb-4 border border-slate-700">
                <View
                  className={`${budgetProgress > 85 ? "bg-rose-500" : "bg-blue-500"} h-4 rounded-full`}
                  style={{ width: `${budgetProgress}%` }}
                />
              </View>

              {monthlyBudget && (
                <View className="flex-row items-center mb-6">
                  <View className="w-3 h-3 rounded-full bg-emerald-500 mr-2" />
                  <Text className="text-emerald-400 font-medium text-sm flex-1">Remaining: ${monthlyRemaining.toFixed(2)}</Text>
                </View>
              )}

              <View className="flex-row border-t border-slate-800 pt-4 items-center">
                <TextInput
                  value={budgetInput}
                  onChangeText={setBudgetInput}
                  keyboardType="decimal-pad"
                  placeholder="Set new limit..."
                  placeholderTextColor="#64748b"
                  className="flex-1 bg-slate-800/80 text-white rounded-2xl px-4 py-3 mr-3 font-medium"
                />
                <TouchableOpacity onPress={handleSaveBudget} className="bg-blue-500 rounded-2xl px-5 py-3">
                  <Text className="text-white font-bold">Update</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Spending Chart */}
            <View className="bg-slate-900/60 rounded-3xl p-5 border border-slate-800 mb-6 items-center">
              <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-6 self-start">Expense Breakdown</Text>
              {pieData.length > 0 ? (
                <View className="items-center justify-center">
                  <PieChart
                    data={pieData}
                    donut
                    showText
                    textColor="white"
                    radius={100}
                    innerRadius={65}
                    textSize={12}
                    showTextBackground
                    textBackgroundRadius={14}
                    centerLabelComponent={() => {
                      return (
                        <View className="items-center justify-center">
                          <Text className="text-slate-500 text-xs">Total</Text>
                          <Text className="text-white text-xl font-bold">${monthExpense.toFixed(0)}</Text>
                        </View>
                      );
                    }}
                  />
                </View>
              ) : (
                <View className="h-40 items-center justify-center">
                  <Text className="text-slate-500">No expenses this month</Text>
                </View>
              )}
            </View>

            {/* Categories Management */}
            <View className="bg-slate-900/60 rounded-3xl p-5 border border-slate-800 mb-6">
              <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-4">Manage Categories</Text>
              <View className="flex-row items-center mb-4">
                <TextInput
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="New category name"
                  placeholderTextColor="#64748b"
                  className="flex-1 bg-slate-800/80 text-white rounded-2xl px-4 py-3 mr-3 font-medium"
                />
                <TouchableOpacity onPress={handleAddCategory} className="bg-slate-800 rounded-2xl w-12 h-[50px] items-center justify-center border border-slate-700">
                  <Plus size={24} color="#60a5fa" />
                </TouchableOpacity>
              </View>
              <View className="flex-row flex-wrap">
                {categories.map((category) => (
                  <View key={category.id} className="px-3 py-1.5 bg-slate-800/80 rounded-xl mr-2 mb-2 border border-slate-700 flex-row items-center">
                    <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: category.color || '#cbd5e1' }} />
                    <Text className="text-slate-300 text-xs font-medium">{category.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">Top Spending Categories</Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View className="mx-6 mb-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: item.category_color || fallbackColors[index % fallbackColors.length] }} />
              <Text className="text-white font-medium">{item.category_name}</Text>
            </View>
            <Text className="text-white font-bold">${item.total.toFixed(2)}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View className="px-6 py-4">
            <Text className="text-slate-500">No monthly expense data yet.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
};

export default BudgetAndReports;
