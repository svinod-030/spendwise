import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, Image, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getTransactionDisplay, useExpenseStore, Transaction } from "../store/useExpenseStore";
import { useAuthStore } from "../store/useAuthStore";
import { Plus, Settings as SettingsIcon, ArrowUpCircle, ArrowDownCircle } from "lucide-react-native";
import Animated, { FadeInRight, FadeInUp } from "react-native-reanimated";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { BarChart } from "react-native-gifted-charts";

type RootStackParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  AddTransaction: undefined;
  BudgetAndReports: undefined;
  Settings: undefined;
};

const screenWidth = Dimensions.get("window").width;

const Dashboard = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const {
    transactions,
    budgets,
    fetchTransactions,
    fetchBudgets,
    getCurrentMonthExpenseTotal,
    getCurrentMonthCategorySpending,
  } = useExpenseStore();
  const { user, isAuthenticated } = useAuthStore();
  const [currentMonthExpense, setCurrentMonthExpense] = useState(0);
  const [topCategories, setTopCategories] = useState<{ name: string; total: number }[]>([]);
  const [range, setRange] = useState<"today" | "month" | "all">("month");

  useEffect(() => {
    const load = async () => {
      await fetchTransactions();
      await fetchBudgets();
      const monthExpense = await getCurrentMonthExpenseTotal();
      const categorySpending = await getCurrentMonthCategorySpending();
      setCurrentMonthExpense(monthExpense);
      setTopCategories(categorySpending.slice(0, 3).map((item) => ({ name: item.category_name, total: item.total })));
    };
    if (isFocused) {
      load();
    }
  }, [fetchTransactions, fetchBudgets, getCurrentMonthExpenseTotal, getCurrentMonthCategorySpending, isFocused]);

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

  const barChartData = useMemo(() => {
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

    return labels.map((label, index) => {
      const net = dayBuckets[index].income - dayBuckets[index].expense;
      return {
        value: Math.abs(net),
        label,
        frontColor: net >= 0 ? "#10b981" : "#f43f5e",
        topLabelComponent: () => (
          <Text className="text-[10px] text-slate-400 -mt-4 absolute -pl-2">{Math.abs(net) > 0 ? `$${Math.abs(net)}` : ''}</Text>
        )
      };
    });
  }, [transactions]);

  const renderTransactionItem = ({ item, index }: { item: Transaction; index: number }) => (
    <Animated.View
      entering={FadeInRight.delay(index * 50)}
      className="flex-row items-center justify-between bg-slate-900/80 p-4 rounded-3xl mb-3 border border-slate-800 shadow-sm"
    >
      <View className="flex-row items-center flex-1">
        <View
          className="w-12 h-12 rounded-2xl items-center justify-center border border-slate-800"
          style={{ backgroundColor: `${item.category_color ?? "#3b82f6"}15` }}
        >
          <Text className="text-xl">{item.category_icon === "utensils" ? "🍴" : "📦"}</Text>
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-white font-bold text-base">{item.note || item.category_name || "Transaction"}</Text>
          <Text className="text-slate-400 text-xs font-medium">{new Date(item.date).toLocaleDateString()}</Text>
        </View>
      </View>
      <View className="items-end">
        <Text className={`font-black text-base ${getTransactionDisplay(item).colorClass}`}>
          {getTransactionDisplay(item).sign}${item.amount.toFixed(2)}
        </Text>
        <Text className="text-[10px] uppercase font-bold tracking-wider text-slate-500">{getTransactionDisplay(item).label}</Text>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120, paddingTop: 8 }}
        ListHeaderComponent={
          <Animated.View entering={FadeInUp}>
            <View className="mb-6">
              <View className="flex-row justify-between items-center mb-8">
                <View>
                  <Text className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">Available Balance</Text>
                  <Text className="text-white text-5xl font-black">${balance.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate("Settings")}
                  className="w-12 h-12 rounded-full bg-slate-900 border-2 border-slate-800 items-center justify-center overflow-hidden"
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
                    <SettingsIcon size={22} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>

              <View className="flex-row gap-4 mb-4">
                <View className="flex-1 bg-emerald-500/10 p-5 rounded-3xl border border-emerald-500/20 shadow-sm">
                  <View className="w-8 h-8 rounded-full bg-emerald-500/20 items-center justify-center mb-3">
                    <ArrowUpCircle size={20} color="#34d399" />
                  </View>
                  <Text className="text-emerald-400/80 text-xs font-bold uppercase tracking-wider">Income</Text>
                  <Text className="text-emerald-400 text-2xl font-black mt-1">${totalIncome.toFixed(0)}</Text>
                </View>
                <View className="flex-1 bg-rose-500/10 p-5 rounded-3xl border border-rose-500/20 shadow-sm">
                  <View className="w-8 h-8 rounded-full bg-rose-500/20 items-center justify-center mb-3">
                    <ArrowDownCircle size={20} color="#fb7185" />
                  </View>
                  <Text className="text-rose-400/80 text-xs font-bold uppercase tracking-wider">Expenses</Text>
                  <Text className="text-rose-400 text-2xl font-black mt-1">${totalExpenses.toFixed(0)}</Text>
                </View>
              </View>

              <View className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800 mb-6">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-white font-bold text-base">Monthly Budget</Text>
                  <TouchableOpacity onPress={() => navigation.navigate("BudgetAndReports")}>
                    <Text className="text-blue-400 text-xs font-bold uppercase tracking-wider">Manage</Text>
                  </TouchableOpacity>
                </View>
                {overallMonthlyBudget ? (
                  <>
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-slate-400 text-sm font-medium">Spent</Text>
                      <Text className="text-white font-bold">${currentMonthExpense.toFixed(2)} / ${overallMonthlyBudget.limit_amount.toFixed(0)}</Text>
                    </View>
                    <View className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <Animated.View
                        className={`${budgetProgress > 85 ? "bg-rose-500" : "bg-blue-500"} h-3 rounded-full`}
                        style={{ width: `${budgetProgress}%` }}
                      />
                    </View>
                  </>
                ) : (
                  <Text className="text-slate-400 text-sm">Set a monthly budget to track spending progress.</Text>
                )}
              </View>

              <View className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800 mb-6 pb-2">
                <Text className="text-white font-bold text-base mb-6">Weekly Cashflow</Text>
                <View className="items-center -ml-4">
                  <BarChart
                    data={barChartData}
                    width={screenWidth - 100}
                    height={150}
                    barWidth={22}
                    spacing={14}
                    roundedTop
                    roundedBottom
                    hideRules
                    xAxisThickness={0}
                    yAxisThickness={0}
                    yAxisTextStyle={{ color: '#64748b', fontSize: 10 }}
                    noOfSections={3}
                    isAnimated
                    animationDuration={1000}
                  />
                </View>
              </View>
            </View>

            <View className="flex-row items-end justify-between mb-4 mt-2">
              <Text className="text-white text-xl font-black">Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Transactions")}>
                <Text className="text-blue-400 font-bold text-sm">View All</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View className="items-center justify-center py-10 mt-10 bg-slate-900/40 rounded-3xl border border-slate-800 border-dashed">
            <Text className="text-slate-400 text-base font-medium">No transactions yet</Text>
            <Text className="text-slate-500 text-xs mt-2">Tap + to record an expense</Text>
          </View>
        )}
      />

      <View className="absolute bottom-6 w-full items-center">
        <TouchableOpacity
          className="w-16 h-16 bg-blue-500 rounded-full items-center justify-center shadow-lg shadow-blue-500/50"
          activeOpacity={0.9}
          onPress={() => navigation.navigate("AddTransaction")}
        >
          <Plus size={32} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Dashboard;
