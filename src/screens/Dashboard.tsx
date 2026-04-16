import { useMemo, useState, useEffect } from "react";

import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getTransactionDisplay, useExpenseStore, Transaction } from "../store/useExpenseStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  Plus, ChevronRight, Calendar, Landmark,
  TrendingUp, Pencil, Check, X,
  RefreshCcw
} from "lucide-react-native";
import Animated, { FadeInUp, FadeInRight, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { IconLoader } from "../components/IconLoader";

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

  // Neutral brand blue for regular spending, Rose for over-budget
  const barColor = statusColor ? (isOver ? "#fb7185" : "#3b82f6") : color;

  return (
    <View className="mb-6 last:mb-0">
      <View className="flex-row justify-between items-end mb-2.5">
        <View>
          <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mb-1">{label}</Text>
          <Text className="text-slate-900 dark:text-white font-black text-2xl tracking-tight">{prefix}{Math.round(value)}{suffix}</Text>
        </View>
        <View className="items-end">
          {subLabel && <Text className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mb-0.5">{subLabel}</Text>}
          <Text className={`font-black text-xs ${isOver ? 'text-rose-400' : 'text-slate-500'}`}>
            {Math.round(percentage)}%
          </Text>
        </View>
      </View>
      <View className="h-3 bg-slate-200 dark:bg-slate-800/50 rounded-full overflow-hidden border border-slate-100 dark:border-slate-800/10">
        <Animated.View
          className="h-full rounded-full"
          style={[animatedWidth, { backgroundColor: barColor }]}
        />
      </View>
    </View>
  );
};

const Dashboard = ({ navigation }: { navigation: any }) => {
  const [isFocused, setIsFocused] = useState(true);

  const handleAddItem = () => {
    navigation.navigate("AddTransaction", { editingTransaction: null });
  };

  const handleEditItem = (tx: Transaction) => {
    navigation.navigate("AddTransaction", { editingTransaction: tx });
  };

  const {
    transactions,
    budgets,
    fetchTransactions,
    fetchBudgets,
    getCurrentMonthExpenseTotal,
    getCurrentMonthIncomeTotal,
    getCurrencySymbol,
    fetchCurrency
  } = useExpenseStore();

  useEffect(() => {
    fetchCurrency()
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [currentMonthExpense, setCurrentMonthExpense] = useState(0);
  const [currentMonthIncome, setCurrentMonthIncome] = useState(0);

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

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      setIsFocused(true);
    });
    const unsubscribeBlur = navigation.addListener("blur", () => {
      setIsFocused(false);
    });
    return () => {
      unsubscribe();
      unsubscribeBlur();
    };
  }, [navigation]);

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return selectedMonth === current;
  }, [selectedMonth]);

  // 1. Initial Load: Fetches everything when screen focuses or month changes
  useEffect(() => {
    const loadAll = async () => {
      await fetchTransactions();
      await fetchBudgets();
      const expense = await getCurrentMonthExpenseTotal(selectedMonth);
      const income = await getCurrentMonthIncomeTotal(selectedMonth);
      setCurrentMonthExpense(expense);
      setCurrentMonthIncome(income);
    };
    if (isFocused) loadAll();
  }, [fetchTransactions, fetchBudgets, isFocused, selectedMonth]);

  // 2. Reactive Refresh: Only updates totals when transactions change
  useEffect(() => {
    const refreshTotals = async () => {
      const expense = await getCurrentMonthExpenseTotal(selectedMonth);
      const income = await getCurrentMonthIncomeTotal(selectedMonth);
      setCurrentMonthExpense(expense);
      setCurrentMonthIncome(income);
    };
    if (isFocused) refreshTotals();
  }, [getCurrentMonthExpenseTotal, getCurrentMonthIncomeTotal, isFocused, selectedMonth, transactions]);

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
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      result.push({ key, label, year });
    }
    return result;
  }, []);

  const renderTransactionItem = (item: Transaction, index: number) => {
    const display = getTransactionDisplay(item);
    return (
      <Animated.View
        key={item.id}
        entering={FadeInRight.delay(index * 50)}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleEditItem(item)}
          className="flex-row items-center justify-between py-4 border-b border-slate-100 dark:border-slate-900/50"
        >
          <View className="flex-row items-center flex-1">
            <View
              className="w-12 h-12 rounded-2xl items-center justify-center border border-slate-200 dark:border-slate-800"
              style={{ backgroundColor: `${item.category_color ?? "#3b82f6"}15` }}
            >
              <IconLoader name={display.icon} size={20} color={item.category_color ?? "#3b82f6"} />
            </View>
            <View className="ml-4 flex-1">
              <View className="flex-row items-center">
                <Text className="text-slate-900 dark:text-slate-100 font-bold text-base leading-5">
                  {item.note || item.category_name || "Transaction"}
                </Text>
                {((transactions.some(t => t.parent_id === item.id)) || item.kind === "refund" || !!item.parent_id) && (
                  <View className="ml-2 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex-row items-center">
                    <RefreshCcw size={10} color="#10b981" />
                    <Text className="text-[8px] font-black text-emerald-600 dark:text-emerald-400 ml-1 uppercase">
                      {(item.kind === "refund" || !!item.parent_id) ? "Refund" : "Refunded"}
                    </Text>
                  </View>
                )}
                {item.is_excluded === 1 && <Text className="text-rose-500 text-[10px] italic font-bold ml-1"> (Hidden)</Text>}
              </View>
              <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-widest mt-0.5">
                {new Date(item.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })} • {new Date(item.date).toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit', hour12: true })}
              </Text>
            </View>
          </View>
          <View className="items-end">
            <Text className={`font-black text-base ${item.is_excluded === 1 ? 'text-slate-400 line-through' : display.colorClass}`}>
              {display.sign}{getCurrencySymbol()}{item.amount.toFixed(2)}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <SafeAreaView className="flex-1">
        <View className="px-6 pt-8 pb-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900">
          <View className="flex-row items-center mb-1">
            <View className="w-9 h-9 bg-blue-600 rounded-xl items-center justify-center mr-3 shadow-lg shadow-blue-500/40">
              <Landmark size={20} color="white" />
            </View>
            <Text className="text-slate-900 dark:text-white text-2xl font-black tracking-tighter">SpendWise</Text>
          </View>
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}>
          <Animated.View entering={FadeInUp}>

            {/* Month Picker */}
            <View className="mb-6 -mx-5 px-5">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="py-2">
                {months.map((m) => {
                  const isSelected = selectedMonth === m.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      onPress={() => setSelectedMonth(m.key)}
                      className={`mr-3 px-6 py-2.5 rounded-2xl border ${isSelected
                        ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none'
                        }`}
                    >
                      <Text className={`font-black uppercase tracking-tighter text-[11px] ${isSelected ? 'text-white' : 'text-slate-500'}`}>
                        {m.label} {m.year}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* SECTION 1: Summary Visual Bars */}
            <View className="bg-white dark:bg-slate-900/60 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 mb-6 shadow-sm dark:shadow-none">
              <View className="flex-row items-center justify-between mb-8">
                <View className="flex-row items-center">
                  <Calendar size={16} color="#64748b" />
                  <Text className="text-slate-500 dark:text-slate-400 font-bold text-[10px] uppercase tracking-wider ml-2">Performance Summary</Text>
                </View>
                {isCurrentMonth && (
                  <TouchableOpacity
                    onPress={() => {
                      setIsEditingBudget(!isEditingBudget);
                      setBudgetInput(limitAmount.toString());
                    }}
                    className="p-1 px-2 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex-row items-center"
                  >
                    <Pencil size={10} color="#3b82f6" />
                    <Text className="text-[10px] font-bold text-blue-600 dark:text-blue-400 ml-1.5">EDIT LIMIT</Text>
                  </TouchableOpacity>
                )}
                {!isCurrentMonth && (
                  <View className={`px-2 py-1 rounded-md ${isCurrentMonth ? 'bg-emerald-500/10' : 'bg-slate-100 dark:bg-slate-800'}`}>
                    <Text className={`text-[9px] font-black uppercase tracking-widest ${isCurrentMonth ? 'text-emerald-500 dark:text-emerald-400' : 'text-slate-500'}`}>
                      {isCurrentMonth ? 'LIVE' : 'ARCHIVED'}
                    </Text>
                  </View>
                )}
              </View>

              {isEditingBudget ? (
                <Animated.View entering={FadeInUp} className="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl border border-blue-500/30 mb-8 items-center flex-row">
                  <View className="flex-1">
                    <Text className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">New Monthly Limit</Text>
                    <TextInput
                      value={budgetInput}
                      onChangeText={setBudgetInput}
                      keyboardType="decimal-pad"
                      autoFocus
                      className="text-slate-900 dark:text-white text-2xl font-black p-0"
                      placeholderTextColor="#64748b"
                    />
                  </View>
                  <View className="flex-row items-center">
                    <TouchableOpacity
                      onPress={() => setIsEditingBudget(false)}
                      className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-xl items-center justify-center mr-3"
                    >
                      <X size={20} color="#64748b" />
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
                  subLabel={`Limit: ${getCurrencySymbol()}${limitAmount}`}
                  prefix={getCurrencySymbol()}
                  statusColor
                />
              )}


              <View className="flex-row gap-4 mt-4">
                {/* Monthly Income Card */}
                <View className="flex-1 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                  <View className="flex-row items-center mb-2">
                    <View className="w-6 h-6 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg items-center justify-center">
                      <TrendingUp size={12} color="#10b981" />
                    </View>
                    <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-widest ml-2">Income</Text>
                  </View>
                  <Text className="text-slate-900 dark:text-white font-black text-xl tracking-tight">{getCurrencySymbol()}{Math.round(currentMonthIncome)}</Text>
                  <Text className="text-slate-400 dark:text-slate-50 text-[8px] font-bold uppercase tracking-widest mt-1">Cash Flow</Text>
                </View>

                {/* Safe to Spend Card */}
                {isCurrentMonth ? (
                  <View className="flex-1 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50">
                    <View className="flex-row items-center mb-2">
                      <View className="w-6 h-6 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg items-center justify-center">
                        <Landmark size={12} color="#3b82f6" />
                      </View>
                      <Text className="text-slate-500 text-[9px] font-bold uppercase tracking-widest ml-2">Daily</Text>
                    </View>
                    <Text className="text-slate-900 dark:text-white font-black text-xl tracking-tight">{getCurrencySymbol()}{Math.round(safeToSpend)}</Text>
                    <Text className="text-slate-400 dark:text-slate-500 text-[8px] font-bold uppercase tracking-widest mt-1">Safe to Spend</Text>
                  </View>
                ) : (
                  <View className="flex-1 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/50 justify-center">
                    <Text className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-1 text-center">Month Result</Text>
                    <Text className={`font-black text-xs uppercase tracking-widest text-center ${currentMonthExpense > limitAmount ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                      {currentMonthExpense > limitAmount ? 'OVER' : 'GOOD'}
                    </Text>
                  </View>
                )}
              </View>

              {!isCurrentMonth && (
                <View className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex-row items-center justify-between">
                  <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Month Result</Text>
                  <Text className={`font-black text-xs uppercase tracking-widest ${currentMonthExpense > limitAmount ? 'text-rose-600 dark:text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {currentMonthExpense > limitAmount ? 'OVER BUDGET' : 'WITHIN BUDGET'}
                  </Text>
                </View>
              )}
            </View>

            <View className="mb-6 bg-white dark:bg-slate-900/30 rounded-[32px] p-2 border border-slate-100 dark:border-transparent shadow-sm dark:shadow-none">
              <View className="flex-row items-end justify-between mb-2 px-3 pt-4">
                <Text className="text-slate-900 dark:text-white text-lg font-black tracking-tight">Recent Activity</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Transactions")} className="flex-row items-center bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full">
                  <Text className="text-blue-600 dark:text-blue-400 font-bold text-[10px] mr-1 uppercase tracking-widest">View All</Text>
                  <ChevronRight size={12} color="#3b82f6" />
                </TouchableOpacity>
              </View>
              <View className="px-3 pb-4">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map(renderTransactionItem)
                ) : (
                  <View className="py-10 items-center justify-center">
                    <Text className="text-slate-400 dark:text-slate-600 font-bold text-[10px] uppercase tracking-widest">No activity recorded</Text>
                  </View>
                )}
              </View>
            </View>

          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default Dashboard;
