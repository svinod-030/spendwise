import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, Image, ScrollView, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getTransactionDisplay, useExpenseStore, Transaction, MonthlyTrend, MerchantSpending } from "../store/useExpenseStore";
import { useAuthStore } from "../store/useAuthStore";
import { Plus, Settings as SettingsIcon, ChevronRight } from "lucide-react-native";
import Animated, { FadeInUp, FadeInRight } from "react-native-reanimated";
import { useNavigation, useIsFocused } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { PieChart, LineChart } from "react-native-gifted-charts";

type RootStackParamList = {
  Dashboard: undefined;
  Transactions: undefined;
  AddTransaction: undefined;
  BudgetAndReports: undefined;
  Settings: undefined;
};

const screenWidth = Dimensions.get("window").width;
const fallbackColors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

const Dashboard = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const {
    transactions,
    budgets,
    fetchTransactions,
    fetchBudgets,
    getCurrentMonthExpenseTotal,
    getCurrentMonthIncomeTotal,
    getCurrentMonthCategorySpending,
    getMonthlyTrends,
    getMerchantSpending,
  } = useExpenseStore();
  
  const { user, isAuthenticated } = useAuthStore();
  
  const [currentMonthExpense, setCurrentMonthExpense] = useState(0);
  const [currentMonthIncome, setCurrentMonthIncome] = useState(0);
  const [topCategories, setTopCategories] = useState<{ name: string; total: number; color?: string }[]>([]);
  const [trendData, setTrendData] = useState<MonthlyTrend[]>([]);
  const [merchantData, setMerchantData] = useState<MerchantSpending[]>([]);

  useEffect(() => {
    const load = async () => {
      await fetchTransactions();
      await fetchBudgets();
      const expense = await getCurrentMonthExpenseTotal();
      const income = await getCurrentMonthIncomeTotal();
      const categorySpending = await getCurrentMonthCategorySpending();
      const trends = await getMonthlyTrends();
      const merchants = await getMerchantSpending();
      
      setCurrentMonthExpense(expense);
      setCurrentMonthIncome(income);
      setTopCategories(categorySpending.slice(0, 5).map((item) => ({ name: item.category_name, total: item.total, color: item.category_color })));
      setTrendData(trends);
      setMerchantData(merchants);
    };
    if (isFocused) load();
  }, [fetchTransactions, fetchBudgets, getCurrentMonthExpenseTotal, getCurrentMonthIncomeTotal, getCurrentMonthCategorySpending, getMonthlyTrends, getMerchantSpending, isFocused]);

  const overallMonthlyBudget = useMemo(() => {
    return budgets.find((budget) => budget.category_id == null && budget.period_type === "monthly");
  }, [budgets]);

  const limitAmount = overallMonthlyBudget?.limit_amount || 0;
  const remainingBudget = Math.max(0, limitAmount - currentMonthExpense);

  const safeToSpend = useMemo(() => {
    if (limitAmount <= 0) return 0;
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.max(1, lastDay.getDate() - now.getDate() + 1);
    return Math.max(0, remainingBudget / daysRemaining);
  }, [limitAmount, remainingBudget]);

  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  const lineChartData = useMemo(() => {
    if (trendData.length === 0) return [];
    return trendData.map((t) => {
      // Format 2026-04 -> Apr
      const date = new Date(t.month + "-01");
      const label = date.toLocaleString('default', { month: 'short' });
      return { value: t.total, label };
    });
  }, [trendData]);

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
      <View className="px-6 py-4 flex-row justify-between items-center bg-slate-950 z-10">
        <Text className="text-white text-2xl font-black tracking-wide">Overview</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("Settings")}
          className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 items-center justify-center overflow-hidden"
        >
          {isAuthenticated && user ? (
             user.picture ? <Image source={{ uri: user.picture }} className="w-full h-full" /> : <Text className="text-white font-bold">{user.name?.charAt(0) || "U"}</Text>
          ) : (
            <SettingsIcon size={20} color="#94a3b8" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}>
        <Animated.View entering={FadeInUp}>
          
          {/* SECTION 1: Summary Visual Diagram */}
          <View className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800 mb-6">
            <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-4">Summary</Text>
            <View className="flex-row items-center justify-between">
              
              <View className="items-center justify-center w-[140px] h-[140px]">
                {limitAmount > 0 ? (
                  <>
                    {/* Layer 1: Outer Track background */}
                    <View className="absolute z-10 items-center justify-center">
                      <PieChart
                        data={[{ value: 1, color: '#1e293b' }]}
                        donut={false}
                        radius={70}
                      />
                    </View>
                    {/* Layer 2: Outer Ring (Expense) */}
                    <View className="absolute z-20 items-center justify-center">
                      <PieChart
                        data={[
                          { value: currentMonthExpense, color: currentMonthExpense > limitAmount ? '#ef4444' : '#f43f5e' },
                          { value: Math.max(0.0001, limitAmount - currentMonthExpense), color: 'transparent' }
                        ]}
                        donut={false}
                        radius={70}
                        isAnimated
                        animationDuration={1000}
                      />
                    </View>
                    {/* Layer 3: Gap Cutout */}
                    <View className="absolute z-30 items-center justify-center rounded-full" style={{ width: 124, height: 124, backgroundColor: '#0b101a' }} />
                    
                    {/* Layer 4: Inner Ring (Budget) */}
                    <View className="absolute z-40 items-center justify-center">
                      <PieChart
                        data={[{ value: 1, color: '#10b981' }]}
                        donut={false}
                        radius={58}
                      />
                    </View>
                    
                    {/* Layer 5: Center Hole Cutout */}
                    <View className="absolute z-50 items-center justify-center rounded-full" style={{ width: 100, height: 100, backgroundColor: '#0b101a' }} />
                    
                    {/* Layer 6: Center Label */}
                    <View className="absolute z-50 items-center justify-center">
                      <Text className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Spent</Text>
                      <Text className={`font-black text-sm ${currentMonthExpense > limitAmount ? 'text-rose-500' : 'text-white'}`}>
                        {Math.round((currentMonthExpense/Math.max(1, limitAmount))*100)}%
                      </Text>
                    </View>
                  </>
                ) : (
                  <View className="w-[120px] h-[120px] rounded-full border-4 border-slate-800 items-center justify-center">
                    <Text className="text-slate-500 text-[10px] text-center px-2">No Budget Set</Text>
                  </View>
                )}
              </View>

              <View className="flex-1 ml-6 justify-center">
                <View className="mb-3">
                  <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider">Income</Text>
                  <Text className="text-emerald-400 text-xl font-black">+${currentMonthIncome.toFixed(0)}</Text>
                </View>
                <View className="mb-3">
                  <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider">Expense</Text>
                  <Text className="text-rose-400 text-xl font-black">-${currentMonthExpense.toFixed(0)}</Text>
                </View>
                <View className="bg-blue-500/10 p-2 rounded-xl border border-blue-500/20">
                  <Text className="text-blue-400/80 text-[10px] font-bold uppercase tracking-wider">Safe to spend</Text>
                  <Text className="text-blue-400 text-lg font-black">${safeToSpend.toFixed(0)} / day</Text>
                </View>
              </View>

            </View>
          </View>

          {/* SECTION 2: Recent 5 Transactions */}
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
               <View className="bg-slate-900/40 p-6 rounded-3xl border border-slate-800 border-dashed items-center justify-center">
                  <Text className="text-slate-400 font-medium">No transactions yet.</Text>
               </View>
            )}
          </View>

          {/* SECTION 3: Monthly Trends Timeline */}
          {lineChartData.length > 0 && (
            <View className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800 mb-6">
              <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-6">Expense Trends</Text>
              <View className="items-center -ml-4">
                <LineChart
                  data={lineChartData}
                  width={screenWidth - 100}
                  height={140}
                  color="#f43f5e"
                  thickness={3}
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisLabelPrefix="$"
                  yAxisTextStyle={{ color: '#64748b', fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: '#64748b', fontSize: 10 }}
                  noOfSections={3}
                  isAnimated
                  initialSpacing={20}
                  dataPointsColor="#f43f5e"
                  dataPointsRadius={4}
                  areaChart
                  startFillColor="#f43f5e"
                  startOpacity={0.2}
                  endOpacity={0.01}
                />
              </View>
            </View>
          )}

          {/* SECTION 4: Top Categories */}
          {topCategories.length > 0 && (
            <View className="bg-slate-900/60 p-5 rounded-3xl border border-slate-800 mb-6">
              <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-4">Top Categories</Text>
              {topCategories.map((item, index) => (
                <View key={item.name + index} className="flex-row items-center justify-between mb-3 last:mb-0">
                  <View className="flex-row items-center">
                    <View className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: item.color || fallbackColors[index % fallbackColors.length] }} />
                    <Text className="text-slate-200 font-bold">{item.name}</Text>
                  </View>
                  <Text className="text-white font-black">${item.total.toFixed(0)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* SECTION 5: Top Merchants */}
          {merchantData.length > 0 && (
            <View className="bg-slate-900/60 p-5 bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl border border-slate-800 mb-6">
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
