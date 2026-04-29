import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useExpenseStore, PredictiveAlert } from "../../store/useExpenseStore";
import { AlertTriangle, ShieldCheck, AlertCircle, TrendingUp } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

export const PredictiveAlertCard = () => {
  const { getPredictiveAlert, getCurrencySymbol, transactions } = useExpenseStore();
  const [alert, setAlert] = useState<PredictiveAlert | null>(null);

  useEffect(() => {
    const fetchAlert = async () => {
      const data = await getPredictiveAlert();
      setAlert(data);
    };
    fetchAlert();
  }, [transactions]);

  if (!alert) return null;

  const getColors = () => {
    switch (alert.level) {
      case "danger":
        return {
          bg: "bg-rose-50 dark:bg-rose-950/30",
          border: "border-rose-200 dark:border-rose-900/50",
          text: "text-rose-700 dark:text-rose-300",
          icon: <AlertCircle size={20} color="#e11d48" />,
          title: "Budget Overrun Risk"
        };
      case "warning":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/30",
          border: "border-amber-200 dark:border-amber-900/50",
          text: "text-amber-700 dark:text-amber-300",
          icon: <AlertTriangle size={20} color="#d97706" />,
          title: "Spending Trend Warning"
        };
      case "safe":
        return {
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
          border: "border-emerald-200 dark:border-emerald-900/50",
          text: "text-emerald-700 dark:text-emerald-300",
          icon: <ShieldCheck size={20} color="#059669" />,
          title: "Budget on Track"
        };
    }
  };

  const colors = getColors();

  return (
    <Animated.View 
      entering={FadeInDown.delay(200)}
      className={`${colors.bg} ${colors.border} border rounded-2xl p-4 mb-6`}
    >
      <View className="flex-row items-center mb-2">
        {colors.icon}
        <Text className={`${colors.text} font-bold ml-2`}>{colors.title}</Text>
      </View>
      
      <Text className={`${colors.text} text-xs leading-relaxed opacity-90`}>
        {alert.message}
      </Text>

      <View className="flex-row items-center mt-3 pt-3 border-t border-black/5 dark:border-white/5">
        <TrendingUp size={14} color={alert.level === 'safe' ? '#059669' : '#d97706'} />
        <Text className="text-[10px] text-slate-500 dark:text-slate-400 font-medium ml-1 uppercase tracking-wider">
          Predicted end-of-month: {getCurrencySymbol()}{Math.round(alert.predictedTotal)}
        </Text>
      </View>
    </Animated.View>
  );
};
