import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Dimensions, TouchableOpacity, Modal, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExpenseStore, MonthlyTrend } from "../store/useExpenseStore";
import { LineChart, PieChart } from "react-native-gifted-charts";
import Animated, { FadeInUp } from "react-native-reanimated";
import { BarChart3, PieChart as PieIcon, ChevronDown, Check } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import ForecastComponent from "../components/ForecastComponent";
import { IconLoader } from "../components/IconLoader";
import { CategorySpending } from "../store/useExpenseStore";

const screenWidth = Dimensions.get("window").width;
const fallbackColors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

const Analysis = ({ navigation }: { navigation: any }) => {
  const [isFocused, setIsFocused] = useState(true);
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const {
    budgets,
    getMonthlyTrends,
    getCurrentMonthCategorySpending,
    getCurrentMonthExpenseTotal,
    getCurrentMonthIncomeTotal,
    fetchCategories,
    fetchBudgets,
    transactions,
    getCurrencySymbol,
  } = useExpenseStore();

  const [trendData, setTrendData] = useState<MonthlyTrend[]>([]);
  const [categorySpending, setCategorySpending] = useState<CategorySpending[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [isMonthPickerVisible, setIsMonthPickerVisible] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const availableMonths = useMemo(() => {
    const result = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      result.push({ key, label });
    }
    return result;
  }, []);


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
      await Promise.all([
        fetchCategories(),
        fetchBudgets(),
      ]);
    };
    if (isFocused) init();
  }, [fetchCategories, fetchBudgets, isFocused]);

  // 2. Global Data Refresh: Trends refresh when transactions update or on focus
  useEffect(() => {
    const refreshGlobal = async () => {
      const trends = await getMonthlyTrends();
      setTrendData(trends);
    };
    if (isFocused) refreshGlobal();
  }, [getMonthlyTrends, isFocused, transactions]);

  // 3. Month-specific Data Refresh: refresh when month changes, transactions update or on focus
  useEffect(() => {
    const refreshMonthly = async () => {
      const [categoriesData, total, income] = await Promise.all([
        getCurrentMonthCategorySpending(selectedMonth),
        getCurrentMonthExpenseTotal(selectedMonth),
        getCurrentMonthIncomeTotal(selectedMonth),
      ]);
      setCategorySpending(categoriesData);
      setTotalExpense(total);
      setTotalIncome(income);
    };
    if (isFocused) refreshMonthly();
  }, [getCurrentMonthCategorySpending, getCurrentMonthExpenseTotal, getCurrentMonthIncomeTotal, isFocused, transactions, selectedMonth]);

  const monthlyBudget = useMemo(
    () => budgets.find((budget) => budget.category_id == null && budget.period_type === "monthly"),
    [budgets]
  );

  const lineChartData = trendData.map((t) => {
    const date = new Date(t.month + "-01");
    const label = date.toLocaleString('default', { month: 'short' });
    return { value: t.total, label };
  });

  const pieData = categorySpending.map((cat, index) => ({
    value: cat.total,
    color: cat.category_color || fallbackColors[index % fallbackColors.length],
  }));


  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950" edges={['bottom', 'left', 'right']}>
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

          {/* Forecast Section */}
          <View className="bg-white dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 mb-6 shadow-sm dark:shadow-none">
            <ForecastComponent trends={trendData} currentIncome={totalIncome} />
          </View>


          {/* Categories Breakdown Section */}
          <View className="bg-white dark:bg-slate-900/60 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 mb-6 shadow-sm dark:shadow-none">
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center">
                <PieIcon size={20} color="#10b981" />
                <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider ml-2">Spending Breakdown</Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsMonthPickerVisible(true)}
                className="flex-row items-center bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg"
              >
                <Text className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mr-1">
                  {availableMonths.find(m => m.key === selectedMonth)?.label || 'Select Month'}
                </Text>
                <ChevronDown size={12} color="#64748b" />
              </TouchableOpacity>
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

            <FlatList
              data={categorySpending}
              keyExtractor={(item, index) => item.category_name + index}
              scrollEnabled={false}
              renderItem={({ item, index }) => {
                const percentage = Math.round((item.total / Math.max(1, totalExpense)) * 100);
                const color = item.category_color || fallbackColors[index % fallbackColors.length];
                return (
                  <TouchableOpacity
                    className="my-1 last:mb-0 bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
                    onPress={() => navigation.navigate("Transactions", { searchQuery: item.category_name, selectedMonth: selectedMonth })}
                  >
                    <View className="flex-row items-center justify-between mb-1.5">
                      <View className="flex-row items-center flex-1 mr-4">
                        <View
                          className="w-8 h-8 rounded-xl items-center justify-center mr-3 border border-slate-100 dark:border-slate-800"
                          style={{ backgroundColor: `${color}15` }}
                        >
                          <IconLoader name={item.category_icon || "Package"} size={14} color={color} />
                        </View>
                        <Text className="text-slate-700 dark:text-slate-200 font-bold" numberOfLines={1}>{item.category_name}</Text>
                      </View>
                      <View className="items-end">
                        <Text className="text-slate-900 dark:text-white font-black">{getCurrencySymbol()}{item.total.toFixed(0)}</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center">
                      <View className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mr-3">
                        <View style={{ width: `${percentage}%`, backgroundColor: color }} className="h-full rounded-full" />
                      </View>
                      <Text className="text-[10px] text-slate-500 font-bold w-8 text-right">
                        {percentage}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

        </Animated.View>
      </ScrollView>

      {/* Month Picker Modal */}
      <Modal
        visible={isMonthPickerVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsMonthPickerVisible(false)}
      >
        <Pressable
          className="flex-1 bg-slate-900/40 backdrop-blur-sm justify-center px-6"
          onPress={() => setIsMonthPickerVisible(false)}
        >
          <Pressable className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[70%]">
            <View className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 items-center">
              <Text className="text-slate-900 dark:text-white font-black">Select Month</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {availableMonths.map((opt, idx, arr) => {
                const isSelected = selectedMonth === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    className={`flex-row items-center px-6 py-4 ${idx !== arr.length - 1 ? 'border-b border-slate-50 dark:border-slate-800' : ''}`}
                    onPress={() => {
                      setSelectedMonth(opt.key);
                      setIsMonthPickerVisible(false);
                    }}
                  >
                    <Text className={`flex-1 font-bold ${isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                      {opt.label}
                    </Text>
                    {isSelected && <Check size={18} color="#3b82f6" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

export default Analysis;
