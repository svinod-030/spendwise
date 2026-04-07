import React, { useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExpenseStore, Transaction } from "../store/useExpenseStore";
import { Plus, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

type RootStackParamList = {
  Dashboard: undefined;
  AddTransaction: undefined;
  Settings: undefined;
};

const Dashboard = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { transactions, fetchTransactions } = useExpenseStore();

  useEffect(() => {
    fetchTransactions();
  }, []);

  const { totalIncome, totalExpenses, balance } = useMemo(() => {
    let income = 0;
    let expenses = 0;
    transactions.forEach((t) => {
      if (t.type === "income") income += t.amount;
      else expenses += t.amount;
    });
    return {
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses,
    };
  }, [transactions]);

  const renderTransactionItem = ({ item, index }: { item: Transaction; index: number }) => (
    <Animated.View
      entering={FadeInRight.delay(index * 100)}
      className="flex-row items-center justify-between bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-800"
    >
      <View className="flex-row items-center flex-1">
        <View
          className="w-12 h-12 rounded-full items-center justify-center"
          style={{ backgroundColor: item.category_color + '20' }}
        >
          <Text className="text-xl">{item.category_icon === 'utensils' ? '🍴' : '📦'}</Text>
        </View>
        <View className="ml-4 flex-1">
          <Text className="text-white font-semibold text-lg">{item.note || item.category_name}</Text>
          <Text className="text-slate-400 text-sm">{new Date(item.date).toLocaleDateString()}</Text>
        </View>
      </View>
      <Text className={`font-bold text-lg ${item.type === 'expense' ? 'text-rose-500' : 'text-emerald-400'}`}>
        {item.type === 'expense' ? '-' : '+'}${item.amount.toFixed(2)}
      </Text>
    </Animated.View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="px-6 pt-8 pb-4">
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-slate-400 text-sm font-medium">Available Balance</Text>
            <Text className="text-white text-4xl font-bold mt-1">${balance.toFixed(2)}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate("Settings")}
            className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 items-center justify-center"
          >
            <Wallet size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View className="flex-row gap-4 mb-10">
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

        <View className="flex-row justify-between items-end mb-4">
          <Text className="text-white text-xl font-bold">Recent Activity</Text>
          <TouchableOpacity>
            <Text className="text-blue-400 font-medium">See All</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransactionItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 100 }}
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
      >
        <Plus size={32} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default Dashboard;
