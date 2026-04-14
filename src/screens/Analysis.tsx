import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Dimensions, TextInput, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExpenseStore, MonthlyTrend } from "../store/useExpenseStore";
import { LineChart, PieChart } from "react-native-gifted-charts";
import Animated, { FadeInUp } from "react-native-reanimated";
import { BarChart3, PieChart as PieIcon, Plus, Tags, TrendingUp } from "lucide-react-native";
import { useColorScheme } from "nativewind";

const screenWidth = Dimensions.get("window").width;
const fallbackColors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

const Analysis = ({ navigation }: { navigation: any }) => {
  const [isFocused, setIsFocused] = useState(true);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    categories,
    budgets,
    getMonthlyTrends,
    getCurrentMonthCategorySpending,
    getCurrentMonthExpenseTotal,
    fetchCategories,
    fetchBudgets,
    addCategory,
    upsertMonthlyBudget,
    transactions,
    getCurrencySymbol,
  } = useExpenseStore();

  const [trendData, setTrendData] = useState<MonthlyTrend[]>([]);
  const [categorySpending, setCategorySpending] = useState<{ category_name: string; total: number; category_color?: string }[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);

  const [newCategoryName, setNewCategoryName] = useState("");

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

  // 1. Initial Load: Categories and budgets on focus
  useEffect(() => {
    const init = async () => {
      await fetchCategories();
      await fetchBudgets();
      const trends = await getMonthlyTrends();
      const categoriesData = await getCurrentMonthCategorySpending();
      const total = await getCurrentMonthExpenseTotal();
      setTrendData(trends);
      setCategorySpending(categoriesData);
      setTotalExpense(total);
    };
    if (isFocused) init();
  }, [fetchCategories, fetchBudgets, isFocused]);

  // 2. Reactive Refresh: Trends and breakdowns refresh when transactions update
  useEffect(() => {
    const refresh = async () => {
      const trends = await getMonthlyTrends();
      const categoriesData = await getCurrentMonthCategorySpending();
      const total = await getCurrentMonthExpenseTotal();
      setTrendData(trends);
      setCategorySpending(categoriesData);
      setTotalExpense(total);
    };
    if (isFocused) refresh();
  }, [getMonthlyTrends, getCurrentMonthCategorySpending, getCurrentMonthExpenseTotal, isFocused, transactions]);

  const monthlyBudget = useMemo(
    () => budgets.find((budget) => budget.category_id == null && budget.period_type === "monthly"),
    [budgets]
  );

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    await addCategory({
      name,
      icon: "circle",
      color: fallbackColors[categories.length % fallbackColors.length],
    });
    setNewCategoryName("");
    Alert.alert("Success", `Category "${name}" added.`);
  };

  const lineChartData = trendData.map((t) => {
    const date = new Date(t.month + "-01");
    const label = date.toLocaleString('default', { month: 'short' });
    return { value: t.total, label };
  });

  const pieData = categorySpending.map((cat, index) => ({
    value: cat.total,
    color: cat.category_color || fallbackColors[index % fallbackColors.length],
  }));

  const budgetProgress = monthlyBudget ? Math.min((totalExpense / monthlyBudget.limit_amount) * 100, 100) : 0;

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-6 pt-6 pb-2 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900">
        <View className="flex-row items-center mb-1">
          <View className="w-8 h-8 bg-emerald-500 rounded-xl items-center justify-center mr-3 shadow-lg shadow-emerald-500/30">
            <TrendingUp size={18} color="white" />
          </View>
          <Text className="text-slate-900 dark:text-white text-xl font-black tracking-tighter">SpendWise</Text>
        </View>
        <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Analysis Hub</Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 16, paddingBottom: 120 }}>
        <Animated.View entering={FadeInUp}>

          {/* Trends Section */}
          <View className="bg-white dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 mb-6 shadow-sm dark:shadow-none">
            <View className="flex-row items-center mb-6">
              <BarChart3 size={20} color="#f43f5e" />
              <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider ml-2">Spending Trends</Text>
            </View>

            {lineChartData.length > 0 ? (
              <View className="items-center -ml-4">
                <LineChart
                  data={lineChartData}
                  width={screenWidth - 100}
                  height={180}
                  color="#f43f5e"
                  thickness={3}
                  hideRules
                  xAxisThickness={0}
                  yAxisThickness={0}
                  yAxisLabelPrefix={getCurrencySymbol()}
                  yAxisTextStyle={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 10 }}
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
            ) : (
              <Text className="text-slate-500 text-center py-10">No trend data available yet.</Text>
            )}
          </View>

          {/* Categories Breakdown Section */}
          <View className="bg-white dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 mb-6 shadow-sm dark:shadow-none">
            <View className="flex-row items-center mb-6">
              <PieIcon size={20} color="#10b981" />
              <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider ml-2">Spending Breakdown</Text>
            </View>

            {pieData.length > 0 ? (
              <View className="items-center mb-8">
                <PieChart
                  data={pieData}
                  donut
                  textColor="white"
                  radius={100}
                  innerRadius={70}
                  textSize={12}
                  innerCircleColor={isDark ? "#0f172a" : "#ffffff"}
                  backgroundColor={isDark ? "transparent" : "#ffffff"}
                  centerLabelComponent={() => (
                    <View className="items-center justify-center">
                      <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Total</Text>
                      <Text className="text-slate-900 dark:text-white font-black text-lg">{getCurrencySymbol()}{totalExpense.toFixed(0)}</Text>
                    </View>
                  )}
                />
              </View>
            ) : (
              <Text className="text-slate-500 text-center py-10">No category data for this month.</Text>
            )}

            <View>
              {categorySpending.map((item, index) => (
                <View key={item.category_name + index} className="flex-row items-center justify-between mb-4 last:mb-0">
                  <View className="flex-row items-center flex-1 mr-4">
                    <View
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: item.category_color || fallbackColors[index % fallbackColors.length] }}
                    />
                    <Text className="text-slate-700 dark:text-slate-200 font-bold" numberOfLines={1}>{item.category_name}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-slate-900 dark:text-white font-black">{getCurrencySymbol()}{item.total.toFixed(0)}</Text>
                    <Text className="text-[10px] text-slate-500 font-bold">
                      {Math.round((item.total / Math.max(1, totalExpense)) * 100)}%
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Section 4: Category Management */}
          <View className="bg-white dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 mb-6 shadow-sm dark:shadow-none">
            <View className="flex-row items-center mb-6">
              <Tags size={20} color="#8b5cf6" />
              <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider ml-2">Manage Categories</Text>
            </View>

            <View className="flex-row items-center mb-6">
              <TextInput
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                placeholder="New category name..."
                placeholderTextColor="#94a3b8"
                className="flex-1 bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white rounded-2xl px-4 py-3 mr-3 font-medium border border-slate-200 dark:border-slate-700/50"
              />
              <TouchableOpacity onPress={handleAddCategory} className="bg-slate-100 dark:bg-slate-800 rounded-2xl w-12 h-12 items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
                <Plus size={24} color="#3b82f6" />
              </TouchableOpacity>
            </View>

            <View className="flex-row flex-wrap">
              {categories.map((category, index) => (
                <View key={category.id || index} className="px-3 py-1.5 bg-slate-100/50 dark:bg-slate-800/40 rounded-xl mr-2 mb-2 border border-slate-200 dark:border-slate-800/60 flex-row items-center">
                  <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: category.color || fallbackColors[index % fallbackColors.length] }} />
                  <Text className="text-slate-500 dark:text-slate-400 text-[11px] font-bold">{category.name}</Text>
                </View>
              ))}
            </View>
          </View>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Analysis;
