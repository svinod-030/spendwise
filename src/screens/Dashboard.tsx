import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Image, ScrollView, Dimensions, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getTransactionDisplay, useExpenseStore, Transaction, MerchantSpending } from "../store/useExpenseStore";
import { useAuthStore } from "../store/useAuthStore";
import { Plus, Settings as SettingsIcon, ChevronRight, Calendar, Landmark, TrendingUp, TrendingDown, Wallet, Pencil, Check, X } from "lucide-react-native";
import Animated, { FadeInUp, FadeInRight, useAnimatedStyle, withSpring, withTiming, interpolateColor } from "react-native-reanimated";
import { useNavigation, useIsFocused } from "@react-navigation/native";

type RootStackParamList = {
  Overview: undefined;
  Transactions: undefined;
  AddTransaction: undefined;
  Analysis: undefined;
  Settings: undefined;
};

const screenWidth = Dimensions.get("window").width;

// Reusable animated progress bar component
const ComparisonBar = ({
  label,
  value,
  maxValue,
  color,
  subLabel,
  prefix = "$",
  suffix = "",
  statusColor = false
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
  subLabel?: string;
  prefix?: string;
  suffix?: string;
  statusColor?: boolean;
}) => {
  const percentage = Math.min(100, (value / Math.max(1, maxValue)) * 100);
  const isOver = value > maxValue && maxValue > 0;

  const animatedWidth = useAnimatedStyle(() => ({
    width: withSpring(`${percentage}%`, { damping: 20 })
  }));

  const barColor = statusColor ? (isOver ? "#f43f5e" : "#10b981") : color;

  return (
    <View className="mb-8 last:mb-0">
      <View className="flex-row justify-between items-end mb-3">
        <View>
          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</Text>
          <Text className="text-white font-black text-2xl tracking-tight">{prefix}{Math.round(value)}{suffix}</Text>
        </View>
        <View className="items-end">
          {subLabel && <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">{subLabel}</Text>}
          <Text className={`font-black text-sm ${isOver ? 'text-rose-500' : 'text-slate-400'}`}>
            {Math.round(percentage)}%
          </Text>
        </View>
      </View>
      <View className="h-3.5 bg-slate-800/50 rounded-full overflow-hidden border border-slate-800/20">
        <Animated.View
          className="h-full rounded-full"
          style={[animatedWidth, { backgroundColor: barColor }]}
        />
      </View>
    </View>
  );
};

const Dashboard = () => {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const {
    transactions,
    budgets,
    fetchTransactions,
    fetchBudgets,
    getCurrentMonthExpenseTotal,
    getCurrentMonthIncomeTotal,
    getMerchantSpending,
  } = useExpenseStore();

  const { user, isAuthenticated } = useAuthStore();

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [currentMonthExpense, setCurrentMonthExpense] = useState(0);
  const [currentMonthIncome, setCurrentMonthIncome] = useState(0);
  const [merchantData, setMerchantData] = useState<MerchantSpending[]>([]);

  // Budget Editing States
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  const { upsertMonthlyBudget } = useExpenseStore();

  const handleSaveBudget = async () => {
    const amount = Number(budgetInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert("Invalid budget", "Please enter a valid monthly budget amount.");
      return;
    }
    await upsertMonthlyBudget(amount);
    setIsEditingBudget(false);
    setBudgetInput("");
  };

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth === current;
  }, [selectedMonth]);

  useEffect(() => {
    const load = async () => {
      await fetchTransactions();
      await fetchBudgets();
      const expense = await getCurrentMonthExpenseTotal(selectedMonth);
      const income = await getCurrentMonthIncomeTotal(selectedMonth);
      const merchants = await getMerchantSpending();

      setCurrentMonthExpense(expense);
      setCurrentMonthIncome(income);
      setMerchantData(merchants);
    };
    if (isFocused) load();
  }, [fetchTransactions, fetchBudgets, getCurrentMonthExpenseTotal, getCurrentMonthIncomeTotal, getMerchantSpending, isFocused, selectedMonth]);

  const overallMonthlyBudget = useMemo(() => {
    return budgets.find((budget) => budget.category_id == null && budget.period_type === "monthly");
  }, [budgets]);

  const limitAmount = overallMonthlyBudget?.limit_amount || 0;
  const remainingBudget = Math.max(0, limitAmount - currentMonthExpense);

  const safeToSpend = useMemo(() => {
    if (!isCurrentMonth || limitAmount <= 0) return 0;
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.max(1, lastDay.getDate() - now.getDate() + 1);
    return Math.max(0, remainingBudget / daysRemaining);
  }, [limitAmount, remainingBudget, isCurrentMonth]);

  const recentTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth)).slice(0, 5);
  }, [transactions, selectedMonth]);

  const months = useMemo(() => {
    const result = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      result.push({ key, label, year });
    }
    return result;
  }, []);

  const renderTransactionItem = (item: Transaction, index: number) => (
    <Animated.View
      key={item.id}
      entering={FadeInRight.delay(index * 50)}
      className="flex-row items-center justify-between bg-slate-900/40 p-4 rounded-3xl mb-3 border border-slate-800 shadow-sm"
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
      <View className="px-6 pt-6 pb-2 pb-2 bg-slate-950">
        <View className="flex-row items-center mb-1">
          <View className="w-8 h-8 bg-blue-500 rounded-xl items-center justify-center mr-3 shadow-lg shadow-blue-500/30">
            <Landmark size={18} color="white" />
          </View>
          <Text className="text-white text-xl font-black tracking-tighter">SpendWise</Text>
        </View>
        <View className="flex-row justify-between items-center mt-2">
          <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest">Dashboard</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}>
        <Animated.View entering={FadeInUp}>

          {/* Month Picker */}
          <View className="mb-6 -mx-5 px-5">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
              {months.map((m) => (
                <TouchableOpacity
                  key={m.key}
                  onPress={() => setSelectedMonth(m.key)}
                  className={`mr-3 px-6 py-2.5 rounded-2xl border ${selectedMonth === m.key ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-slate-900 border-slate-800'}`}
                >
                  <Text className={`font-black uppercase tracking-tighter text-[11px] ${selectedMonth === m.key ? 'text-white' : 'text-slate-500'}`}>
                    {m.label} {m.year}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* SECTION 1: Summary Visual Bars */}
          <View className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 mb-6">
            <View className="flex-row items-center justify-between mb-8">
              <View className="flex-row items-center">
                <Calendar size={16} color="#64748b" />
                <Text className="text-slate-400 font-bold text-[10px] uppercase tracking-wider ml-2">Performance Summary</Text>
              </View>
              {isCurrentMonth && (
                <TouchableOpacity 
                  onPress={() => {
                    setIsEditingBudget(!isEditingBudget);
                    setBudgetInput(limitAmount.toString());
                  }}
                  className="p-1 px-2 bg-slate-800 rounded-lg border border-slate-700 flex-row items-center"
                >
                  <Pencil size={10} color="#60a5fa" />
                  <Text className="text-[10px] font-bold text-blue-400 ml-1.5">EDIT LIMIT</Text>
                </TouchableOpacity>
              )}
              {!isCurrentMonth && (
                <View className={`px-2 py-1 rounded-md ${isCurrentMonth ? 'bg-emerald-500/10' : 'bg-slate-800'}`}>
                  <Text className={`text-[9px] font-black uppercase tracking-widest ${isCurrentMonth ? 'text-emerald-400' : 'text-slate-500'}`}>
                    {isCurrentMonth ? 'LIVE' : 'ARCHIVED'}
                  </Text>
                </View>
              )}
            </View>

            {isEditingBudget ? (
              <Animated.View entering={FadeInUp} className="bg-slate-800/80 p-5 rounded-2xl border border-blue-500/30 mb-8 items-center flex-row">
                <View className="flex-1">
                  <Text className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">New Monthly Limit</Text>
                  <TextInput
                    value={budgetInput}
                    onChangeText={setBudgetInput}
                    keyboardType="decimal-pad"
                    autoFocus
                    className="text-white text-2xl font-black p-0"
                    placeholderTextColor="#475569"
                  />
                </View>
                <View className="flex-row items-center">
                  <TouchableOpacity 
                    onPress={() => setIsEditingBudget(false)}
                    className="w-10 h-10 bg-slate-700 rounded-xl items-center justify-center mr-3"
                  >
                    <X size={20} color="#94a3b8" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={handleSaveBudget}
                    className="w-10 h-10 bg-blue-600 rounded-xl items-center justify-center shadow-lg shadow-blue-500/30"
                  >
                    <Check size={20} color="white" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            ) : (
              <ComparisonBar
                label="Monthly Expenses"
                value={currentMonthExpense}
                maxValue={limitAmount}
                color="#f43f5e"
                subLabel={`Limit: $${limitAmount}`}
                statusColor
              />
            )}

            <ComparisonBar
              label="Monthly Income"
              value={currentMonthIncome}
              maxValue={Math.max(currentMonthIncome, currentMonthExpense, 1)}
              color="#10b981"
              subLabel="Cash Flow"
            />

            {isCurrentMonth && (
              <ComparisonBar
                label="Safe to Spend"
                value={safeToSpend}
                maxValue={Math.max(0.1, limitAmount / 30)}
                color="#3b82f6"
                subLabel="Daily Target"
                suffix=" / day"
              />
            )}

            {!isCurrentMonth && (
              <View className="mt-4 pt-4 border-t border-slate-800/50 flex-row items-center justify-between">
                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Month Result</Text>
                <Text className={`font-black text-xs uppercase tracking-widest ${currentMonthExpense > limitAmount ? 'text-rose-500' : 'text-emerald-400'}`}>
                  {currentMonthExpense > limitAmount ? 'OVER BUDGET' : 'WITHIN BUDGET'}
                </Text>
              </View>
            )}
          </View>

          {/* SECTION 2: Recent Activity */}
          <View className="mb-6">
            <View className="flex-row items-end justify-between mb-4 px-1">
              <Text className="text-white text-lg font-black">Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Transactions")} className="flex-row items-center">
                <Text className="text-blue-400 font-bold text-xs mr-1 uppercase tracking-wider">View All</Text>
                <ChevronRight size={14} color="#60a5fa" />
              </TouchableOpacity>
            </View>
            {recentTransactions.length > 0 ? (
              recentTransactions.map(renderTransactionItem)
            ) : (
              <View className="bg-slate-900/40 p-10 rounded-3xl border border-slate-800 border-dashed items-center justify-center">
                <Text className="text-slate-500 font-medium text-center">No transactions recorded in this period.</Text>
              </View>
            )}
          </View>

          {/* SECTION 5: Top Merchants */}
          {merchantData.length > 0 && isCurrentMonth && (
            <View className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800 mb-6">
              <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-4">Top Merchants</Text>
              {merchantData.slice(0, 5).map((item, index) => (
                <View key={item.merchant + index} className="flex-row items-center justify-between mb-3 last:mb-0">
                  <Text className="text-slate-300 font-medium flex-1 truncate mr-4" numberOfLines={1}>
                    {item.merchant}
                  </Text>
                  <Text className="text-rose-400 font-bold">${item.total.toFixed(0)}</Text>
                </View>
              ))}
            </View>
          )}

        </Animated.View>
      </ScrollView>

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
