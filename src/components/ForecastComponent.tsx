import React, { useState } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { MonthlyTrend, useExpenseStore } from "../store/useExpenseStore";
import { BarChart } from "react-native-gifted-charts";
import { TrendingUp, AlertCircle, TrendingDown, Lightbulb, AlertTriangle } from "lucide-react-native";
import { useColorScheme } from "nativewind";

const screenWidth = Dimensions.get("window").width;

interface ForecastComponentProps {
  trends: MonthlyTrend[];
  currentIncome?: number;
}

const getAbsoluteMonth = (monthStr: string) => {
  const [year, month] = monthStr.split('-').map(Number);
  return year * 12 + month;
};

const formatMonthLabel = (absMonth: number) => {
  const year = Math.floor((absMonth - 1) / 12);
  const month = ((absMonth - 1) % 12) + 1;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString('default', { month: 'short' });
};

const formatAmount = (value: number | string) => {
  const amount = Number(value);
  if (isNaN(amount)) return String(value);
  if (amount >= 1000) {
    return Math.round(amount / 1000) + 'K';
  }
  return Math.round(amount).toString();
};

const ForecastComponent: React.FC<ForecastComponentProps> = ({ trends, currentIncome = 0 }) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { getCurrencySymbol } = useExpenseStore();
  const [forecastPeriod, setForecastPeriod] = useState<3 | 6>(3);

  if (trends.length < 3) {
    return (
      <View className="items-center justify-center py-10">
        <View className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-full mb-3">
          <AlertCircle size={24} color="#f97316" />
        </View>
        <Text className="text-slate-700 dark:text-slate-300 font-bold text-center mb-1">
          Not Enough Data
        </Text>
        <Text className="text-slate-500 dark:text-slate-400 text-center text-xs px-4">
          We need at least 3 months of expense history to generate a reliable forecast. Keep tracking your expenses!
        </Text>
      </View>
    );
  }

  // Linear Regression
  const N = trends.length;
  const startAbsMonth = getAbsoluteMonth(trends[0].month);

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  trends.forEach((t) => {
    const x = getAbsoluteMonth(t.month) - startAbsMonth;
    const y = t.total;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  const denominator = N * sumXX - sumX * sumX;
  let m = 0;
  let b = 0;

  if (denominator === 0) {
    m = 0;
    b = sumY / N;
  } else {
    m = (N * sumXY - sumX * sumY) / denominator;
    b = (sumY - m * sumX) / N;
  }

  const lastTrend = trends[trends.length - 1];
  const lastAbsMonth = getAbsoluteMonth(lastTrend.month);

  const forecastData = Array.from({ length: forecastPeriod }).map((_, i) => {
    const monthsAhead = i + 1;
    const futureAbsMonth = lastAbsMonth + monthsAhead;
    const x = futureAbsMonth - startAbsMonth;
    const predictedValue = Math.max(0, m * x + b);

    return {
      value: predictedValue,
      label: formatMonthLabel(futureAbsMonth),
      frontColor: isDark ? "#818cf8" : "#6366f1",
      topLabelComponent: () => (
        <View style={{ transform: [{ translateY: -25 }], alignItems: 'center' }}>
          <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 11, fontWeight: 'bold', textAlign: 'center' }}>
            {getCurrencySymbol()}{formatAmount(predictedValue)}
          </Text>
        </View>
      ),
    };
  });

  const renderInsights = () => {
    const nextMonthProjectedExpense = forecastData[0].value;
    const isTrendingUp = m > 0;

    // Estimate surplus based on current income
    const estimatedSurplus = currentIncome - nextMonthProjectedExpense;

    // Generate actionable insights
    if (currentIncome > 0 && estimatedSurplus <= 0) {
      return (
        <View className="mt-4 bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 flex-row">
          <View className="mr-3 mt-1">
            <AlertTriangle size={20} color="#ef4444" />
          </View>
          <View className="flex-1">
            <Text className="text-red-800 dark:text-red-300 font-bold mb-1">Budget Alert</Text>
            <Text className="text-red-700 dark:text-red-400 text-xs leading-relaxed">
              Your projected expenses ({getCurrencySymbol()}{formatAmount(nextMonthProjectedExpense)}) are expected to exceed your current income. Review your discretionary spending to avoid a deficit next month.
            </Text>
          </View>
        </View>
      );
    }

    if (isTrendingUp && m > (sumY / N) * 0.05) {
      // Expenses increasing by > 5% of average per month
      return (
        <View className="mt-4 bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 flex-row">
          <View className="mr-3 mt-1">
            <TrendingUp size={20} color="#f97316" />
          </View>
          <View className="flex-1">
            <Text className="text-orange-800 dark:text-orange-300 font-bold mb-1">Upward Trend Detected</Text>
            <Text className="text-orange-700 dark:text-orange-400 text-xs leading-relaxed">
              Your expenses are increasing by ~{getCurrencySymbol()}{formatAmount(m)} per month. Keep an eye on non-essential spending to maintain your savings rate.
            </Text>
          </View>
        </View>
      );
    }

    if (currentIncome > 0 && estimatedSurplus > 0) {
      return (
        <View className="mt-4 bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 flex-row">
          <View className="mr-3 mt-1">
            <Lightbulb size={20} color="#10b981" />
          </View>
          <View className="flex-1">
            <Text className="text-emerald-800 dark:text-emerald-300 font-bold mb-1">Investment Opportunity</Text>
            <Text className="text-emerald-700 dark:text-emerald-400 text-xs leading-relaxed">
              Based on your income, you could have {getCurrencySymbol()}{formatAmount(estimatedSurplus)} left over next month. Consider setting up an auto-transfer to your savings or investment accounts!
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View className="mt-4 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex-row">
        <View className="mr-3 mt-1">
          <TrendingDown size={20} color="#3b82f6" />
        </View>
        <View className="flex-1">
          <Text className="text-blue-800 dark:text-blue-300 font-bold mb-1">Stable Spending</Text>
          <Text className="text-blue-700 dark:text-blue-400 text-xs leading-relaxed">
            Great job! Your spending is well-managed and stable. Try lowering expenses further to free up funds for future goals.
          </Text>
        </View>
      </View>
    );
  };

  const maxPredictedValue = forecastData.length > 0 ? Math.max(...forecastData.map(d => d.value)) : 0;
  const chartMaxValue = maxPredictedValue > 0 ? maxPredictedValue * 1.3 : 100;

  return (
    <View>
      <View className="flex-row items-center justify-between mb-6">
        <View className="flex-row items-center">
          <TrendingUp size={20} color="#6366f1" />
          <Text className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider ml-2">
            AI Forecast
          </Text>
        </View>
        <View className="flex-row bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          <TouchableOpacity
            onPress={() => setForecastPeriod(3)}
            className={`px-3 py-1 rounded-md ${forecastPeriod === 3 ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
          >
            <Text className={`text-xs font-bold ${forecastPeriod === 3 ? 'text-indigo-500' : 'text-slate-400'}`}>
              3 Months
            </Text>
          </TouchableOpacity>
          {/* <TouchableOpacity
            onPress={() => setForecastPeriod(6)}
            className={`px-3 py-1 rounded-md ${forecastPeriod === 6 ? 'bg-white dark:bg-slate-700 shadow-sm' : ''}`}
          >
            <Text className={`text-xs font-bold ${forecastPeriod === 6 ? 'text-indigo-500' : 'text-slate-400'}`}>
              6 Months
            </Text>
          </TouchableOpacity> */}
        </View>
      </View>

      <View className="items-center -ml-2 mt-4">
        <BarChart
          data={forecastData}
          width={screenWidth - 100}
          height={160}
          barWidth={forecastPeriod === 3 ? 40 : 25}
          spacing={forecastPeriod === 3 ? 40 : 20}
          roundedTop
          hideRules
          xAxisThickness={0}
          yAxisThickness={0}
          yAxisLabelPrefix={getCurrencySymbol()}
          formatYLabel={(label) => formatAmount(label)}
          yAxisTextStyle={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 10 }}
          xAxisLabelTextStyle={{ color: isDark ? '#64748b' : '#94a3b8', fontSize: 10 }}
          noOfSections={3}
          maxValue={chartMaxValue}
          isAnimated
        />
      </View>

      {renderInsights()}
    </View>
  );
};

export default ForecastComponent;
