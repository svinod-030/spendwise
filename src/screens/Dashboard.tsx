import React, { useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, FlatList, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getTransactionDisplay, useExpenseStore, Transaction } from "../store/useExpenseStore";
import { useAuthStore } from "../store/useAuthStore";
import { Plus, Settings as SettingsIcon, ArrowUpCircle, ArrowDownCircle } from "lucide-react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  AddTransaction: undefined;
  BudgetAndReports: undefined;
  Settings: undefined;
};

const Dashboard = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    transactions,
    budgets,
    fetchTransactions,
    fetchBudgets,
    getCurrentMonthExpenseTotal,
    getCurrentMonthCategorySpending,
  } = useExpenseStore();
  const { user, isAuthenticated } = useAuthStore();
  const [currentMonthExpense, setCurrentMonthExpense] = React.useState(0);
  const [topCategories, setTopCategories] = React.useState<{ name: string; total: number }[]>([]);
  const [range, setRange] = React.useState<"today" | "month" | "all">("month");

  useEffect(() => {
    const load = async () => {
      await fetchTransactions();
      await fetchBudgets();
      const monthExpense = await getCurrentMonthExpenseTotal();
      const categorySpending = await getCurrentMonthCategorySpending();
      setCurrentMonthExpense(monthExpense);
      setTopCategories(categorySpending.slice(0, 3).map((item) => ({ name: item.category_name, total: item.total })));
    };
    load();
  }, [fetchTransactions, fetchBudgets, getCurrentMonthExpenseTotal, getCurrentMonthCategorySpending]);

  const overallMonthlyBudget = useMemo(() => {
    return budgets.find((budget) => budget.category_id == null && budget.period_type === "monthly");
  }, [budgets]);

  const budgetProgress = useMemo(() => {
    if (!overallMonthlyBudget || overallMonthlyBudget.limit_amount <= 0) return 0;
    return Math.min((currentMonthExpense / overallMonthlyBudget.limit_amount) * 100, 100);
  }, [overallMonthlyBudget, currentMonthExpense]);

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    if (range === "all") return transactions;
    if (range === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const end = start + 24 * 60 * 60 * 1000;
      return transactions.filter((tx) => {
        const time = new Date(tx.date).getTime();
        return time >= start && time < end;
      });
    }
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    return transactions.filter((tx) => new Date(tx.date).getTime() >= monthStart);
  }, [transactions, range]);

  const { totalIncome, totalExpenses, totalRefunds, totalTransfers, balance } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    let refunds = 0;
    let transfers = 0;
    filteredTransactions.forEach((t) => {
      const kind = t.kind ?? (t.type === "income" ? "income" : "expense");
      if (kind === "income") income += t.amount;
      else if (kind === "refund") refunds += t.amount;
      else if (kind === "transfer") transfers += t.amount;
      else expenses += t.amount;
    });
    return {
      totalIncome: income,
      totalExpenses: expenses,
      totalRefunds: refunds,
      totalTransfers: transfers,
      balance: income + refunds - expenses,
    };
  }, [filteredTransactions]);

  const chartData = useMemo(() => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayBuckets = labels.map(() => ({ income: 0, expense: 0 }));
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 Sun
    const mondayOffset = (dayOfWeek + 6) % 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    transactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      const diffDays = Math.floor((txDate.getTime() - monday.getTime()) / (24 * 60 * 60 * 1000));
      if (diffDays < 0 || diffDays > 6) return;
      const kind = tx.kind ?? (tx.type === "income" ? "income" : "expense");
      if (kind === "income" || kind === "refund") dayBuckets[diffDays].income += tx.amount;
      if (kind === "expense") dayBuckets[diffDays].expense += tx.amount;
    });

    const net = dayBuckets.map((d) => d.income - d.expense);
    const peak = Math.max(1, ...net.map((value) => Math.abs(value)));
    return labels.map((label, index) => ({ label, net: net[index], peak }));
  }, [transactions]);

  const renderTransactionItem = ({ item, index }: { item: Transaction; index: number }) => (
    (() => {
      const display = getTransactionDisplay(item);
      return (
        <Animated.View
          entering={FadeInRight.delay(index * 100)}
          className="flex-row items-center justify-between bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-800"
        >
          <View className="flex-row items-center flex-1">
            <View
              className="w-12 h-12 rounded-full items-center justify-center"
              style={{ backgroundColor: `${item.category_color ?? "#334155"}20` }}
            >
              <Text className="text-xl">{item.category_icon === "utensils" ? "🍴" : "📦"}</Text>
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-white font-semibold text-lg">{item.note || item.category_name || "Transaction"}</Text>
              <Text className="text-slate-400 text-sm">{new Date(item.date).toLocaleDateString()}</Text>
            </View>
          </View>
          <View className="items-end">
            <Text className={`font-bold text-lg ${display.colorClass}`}>
              {display.sign}${item.amount.toFixed(2)}
            </Text>
            <Text className="text-[10px] text-slate-500">{display.label}</Text>
          </View>
        </Animated.View>
      );
    })()
  );
  

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100, paddingTop: 8 }}
        ListHeaderComponent={
          <View>
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-8">
                <View>
                  <Text className="text-slate-400 text-sm font-medium">Available Balance</Text>
                  <Text className="text-white text-4xl font-bold mt-1">${balance.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Settings")}
                  className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 items-center justify-center overflow-hidden"
                >
                  {isAuthenticated && user ? (
                    user.picture ? (
                      <Image source={{ uri: user.picture }} className="w-full h-full" />
                    ) : (
                      <View className="w-full h-full bg-blue-500 items-center justify-center">
                        <Text className="text-white font-bold text-lg">{user.name?.charAt(0) || "U"}</Text>
                      </View>
                    )
                  ) : (
                    <SettingsIcon size={24} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-4 mb-4">
                <View className="flex-1 bg-emerald-500/10 p-4 rounded-3xl border border-emerald-500/20">
                  <ArrowUpCircle size={20} color="#34d399" />
                  <Text className="text-emerald-400/80 text-xs mt-2 font-medium">Income</Text>
                  <Text className="text-emerald-400 text-xl font-bold">${totalIncome.toFixed(2)}</Text>
                </View>
                <View className="flex-1 bg-rose-500/10 p-4 rounded-3xl border border-rose-500/20">
                  <ArrowDownCircle size={20} color="#fb7185" />
                  <Text className="text-rose-400/80 text-xs mt-2 font-medium">Expenses</Text>
                  <Text className="text-rose-400 text-xl font-bold">${totalExpenses.toFixed(2)}</Text>
                </View>
              </View>
              <View className="flex-row gap-4 mb-6">
                <View className="flex-1 bg-cyan-500/10 p-4 rounded-3xl border border-cyan-500/20">
                  <Text className="text-cyan-400/80 text-xs mt-2 font-medium">Refunds</Text>
                  <Text className="text-cyan-400 text-xl font-bold">${totalRefunds.toFixed(2)}</Text>
                </View>
                <View className="flex-1 bg-amber-500/10 p-4 rounded-3xl border border-amber-500/20">
                  <Text className="text-amber-400/80 text-xs mt-2 font-medium">Transfers</Text>
                  <Text className="text-amber-400 text-xl font-bold">${totalTransfers.toFixed(2)}</Text>
                </View>
              </View>

              <View className="bg-slate-900 p-4 rounded-2xl border border-slate-800 mb-6">
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-white font-semibold text-base">Monthly Budget</Text>
                  <TouchableOpacity onPress={() => navigation.navigate("BudgetAndReports")}>
                    <Text className="text-blue-400 text-xs font-semibold">Manage</Text>
                  </TouchableOpacity>
                </View>
                {overallMonthlyBudget ? (
                  <>
                    <Text className="text-slate-300 text-sm mb-2">
                      ${currentMonthExpense.toFixed(2)} of ${overallMonthlyBudget.limit_amount.toFixed(2)}
                    </Text>
                    <View className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <View
                        className={`${budgetProgress > 90 ? "bg-rose-500" : "bg-blue-500"} h-2`}
                        style={{ width: `${budgetProgress}%` }}
                      />
                    </View>
                  </>
                ) : (
                  <Text className="text-slate-400 text-sm">Set a monthly budget to track spending progress.</Text>
                )}
              </View>

              {topCategories.length > 0 && (
                <View className="bg-slate-900 p-4 rounded-2xl border border-slate-800 mb-6">
                  <Text className="text-white font-semibold text-base mb-3">Top Categories This Month</Text>
                  {topCategories.map((category) => (
                    <View key={category.name} className="flex-row justify-between mb-2">
                      <Text className="text-slate-300">{category.name}</Text>
                      <Text className="text-white font-semibold">${category.total.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View className="flex-row pb-4">
              {([
                { id: "today", label: "Today" },
                { id: "month", label: "This Month" },
                { id: "all", label: "All Time" },
              ] as const).map((option) => (
                <TouchableOpacity
                  key={option.id}
                  onPress={() => setRange(option.id)}
                  className={`px-3 py-2 rounded-xl mr-2 border ${range === option.id ? "bg-blue-500/20 border-blue-400" : "bg-slate-900 border-slate-800"}`}
                >
                  <Text className="text-white text-xs">{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="mx-6 mb-6 bg-slate-900 p-4 rounded-2xl border border-slate-800">
              <Text className="text-white font-semibold mb-3">Weekly Cashflow (Income - Expense)</Text>
              <View className="flex-row items-end justify-between h-28">
                {chartData.map((point) => {
                  const heightPercent = Math.max(8, (Math.abs(point.net) / point.peak) * 100);
                  const positive = point.net >= 0;
                  return (
                    <View key={point.label} className="items-center flex-1">
                      <View
                        className={`${positive ? "bg-emerald-500" : "bg-rose-500"} w-4 rounded-t-md rounded-b-md`}
                        style={{ height: `${heightPercent}%` }}
                      />
                      <Text className="text-[10px] text-slate-400 mt-1">{point.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View className="flex-row justify-between items-end mb-4">
              <Text className="text-white text-xl font-bold">Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Transactions")}>
                <Text className="text-blue-400 font-medium">See All</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View className="items-center justify-center py-20">
            <Text className="text-slate-500 text-lg">No transactions yet.</Text>
            <Text className="text-slate-600 text-sm mt-2">Tap the + button to add one.</Text>
          </View>
        )}
      />

      <TouchableOpacity
        className="absolute bottom-8 right-8 w-16 h-16 bg-blue-500 rounded-full items-center justify-center shadow-lg shadow-blue-500/50"
        activeOpacity={0.8}
        onPress={() => navigation.navigate("AddTransaction")}
      >
        <Plus size={32} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default Dashboard;
