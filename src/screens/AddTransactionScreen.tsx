import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PlusCircle, Calendar as CalendarIcon, ChevronRight, Check, TrendingUp } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useExpenseStore, Transaction } from "../store/useExpenseStore";
import { IconLoader } from "../components/IconLoader";
import { useNavigation, useRoute, useIsFocused } from "@react-navigation/native";

const AddTransactionScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const editingTransaction: Transaction | undefined = route.params?.editingTransaction;

  const { addTransaction, updateTransaction, categories, fetchCategories, getCurrencySymbol } = useExpenseStore();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setCategoryId(editingTransaction.category_id);
      setDate(new Date(editingTransaction.date));
      setNote(editingTransaction.note || "");
    } else {
      setType("expense");
      setAmount("");
      setCategoryId(null);
      setDate(new Date());
      setNote("");
    }
  }, [editingTransaction]);

  useEffect(() => {
    if (!isFocused) {
      setType("expense");
      setAmount("");
      setCategoryId(null);
      setDate(new Date());
      setNote("");
    }
  }, [isFocused]);

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount))) {
      // In a real app we might use a toast, fallback to alert
      return;
    }

    const transactionData = {
      type,
      amount: Number(amount),
      category_id: categoryId,
      date: date.toISOString(),
      note,
      is_excluded: editingTransaction?.is_excluded ?? 0,
    };

    if (editingTransaction) {
      await updateTransaction(editingTransaction.id, transactionData);
      navigation.setParams({ editingTransaction: undefined });
      navigation.goBack();
    } else {
      await addTransaction(transactionData);
      // Reset form
      setType("expense");
      setAmount("");
      setCategoryId(null);
      setDate(new Date());
      setNote("");
      navigation.navigate("Transactions");
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900">
            <Text className="text-slate-900 dark:text-white text-xl font-black tracking-tighter">
              {editingTransaction ? "Edit Transaction" : "New Transaction"}
            </Text>
          </View>

          <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
            {/* Type Selector Dropdown */}
            <View className="mb-6 z-10">
              <Text className="text-slate-500 text-[10px] font-bold mb-2 uppercase tracking-widest">Transaction Type</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                className="bg-white dark:bg-slate-900 shadow-sm dark:shadow-none rounded-2xl px-4 py-4 flex-row items-center justify-between border border-slate-100 dark:border-slate-800"
              >
                <View className="flex-row items-center">
                  <View className={`w-8 h-8 rounded-xl items-center justify-center mr-3 ${type === "expense" ? "bg-rose-500/10" : "bg-emerald-500/10"}`}>
                    <TrendingUp size={16} color={type === "expense" ? "#f43f5e" : "#10b981"} style={{ transform: [{ rotate: type === "expense" ? "180deg" : "0deg" }] }} />
                  </View>
                  <Text className={`font-black text-base ${type === "expense" ? "text-rose-500" : "text-emerald-500"}`}>
                    {type === "expense" ? "Expense" : "Income"}
                  </Text>
                </View>
                <ChevronRight size={18} color="#64748b" style={{ transform: [{ rotate: isTypeDropdownOpen ? "90deg" : "0deg" }] }} />
              </TouchableOpacity>

              {isTypeDropdownOpen && (
                <Modal
                  transparent={true}
                  visible={isTypeDropdownOpen}
                  animationType="fade"
                  onRequestClose={() => setIsTypeDropdownOpen(false)}
                >
                  <Pressable
                    className="flex-1 bg-slate-900/40 backdrop-blur-sm justify-center px-10"
                    onPress={() => setIsTypeDropdownOpen(false)}
                  >
                    <Pressable className="bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800">
                      <View className="px-6 py-4 border-b border-slate-50 dark:border-slate-800">
                        <Text className="text-slate-900 dark:text-white font-black text-center">Select Type</Text>
                      </View>

                      <TouchableOpacity
                        className="flex-row items-center px-6 py-5 border-b border-slate-50 dark:border-slate-800"
                        onPress={() => {
                          setType("expense");
                          setIsTypeDropdownOpen(false);
                        }}
                      >
                        <View className="w-10 h-10 rounded-2xl bg-rose-500/10 items-center justify-center mr-4">
                          <TrendingUp size={20} color="#f43f5e" style={{ transform: [{ rotate: "180deg" }] }} />
                        </View>
                        <View className="flex-1">
                          <Text className="font-black text-slate-800 dark:text-slate-100 text-base">Expense</Text>
                          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Money going out</Text>
                        </View>
                        {type === "expense" && <Check size={20} color="#3b82f6" />}
                      </TouchableOpacity>

                      <TouchableOpacity
                        className="flex-row items-center px-6 py-5"
                        onPress={() => {
                          setType("income");
                          setIsTypeDropdownOpen(false);
                        }}
                      >
                        <View className="w-10 h-10 rounded-2xl bg-emerald-500/10 items-center justify-center mr-4">
                          <TrendingUp size={20} color="#10b981" />
                        </View>
                        <View className="flex-1">
                          <Text className="font-black text-slate-800 dark:text-slate-100 text-base">Income</Text>
                          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Money coming in</Text>
                        </View>
                        {type === "income" && <Check size={20} color="#3b82f6" />}
                      </TouchableOpacity>
                    </Pressable>
                  </Pressable>
                </Modal>
              )}
            </View>

            {/* Amount */}
            <View className="mb-6 items-center">
              <Text className="text-slate-500 text-sm font-bold mb-2 uppercase tracking-widest">Amount</Text>
              <View className="flex-row items-center">
                <Text className="text-3xl text-slate-400 font-bold mr-1">{getCurrencySymbol()}</Text>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#94a3b8"
                  className="text-5xl font-black text-slate-900 dark:text-white min-w-[100px] text-center"
                />
              </View>
            </View>

            {/* Note */}
            <View className="mb-6">
              <Text className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-widest">Description</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="What was this for?"
                placeholderTextColor="#94a3b8"
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl px-4 py-4 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
              />
            </View>

            {/* Date */}
            <View className="mb-6">
              <Text className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-widest">Date</Text>
              <TouchableOpacity
                className="bg-white dark:bg-slate-900 shadow-sm dark:shadow-none rounded-2xl px-4 py-4 flex-row items-center border border-slate-100 dark:border-slate-800"
                onPress={() => setShowDatePicker(true)}
              >
                <CalendarIcon size={18} color="#64748b" className="mr-3" />
                <Text className="text-slate-900 dark:text-white font-semibold">
                  {date.toLocaleDateString()}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
            </View>

            {/* Categories */}
            <View className="mb-8">
              <Text className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-widest">Category</Text>
              <View className="flex-row flex-wrap">
                {categories.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setCategoryId(cat.id)}
                      className={`mr-3 mb-3 px-4 py-3 rounded-2xl flex-row items-center border ${isSelected
                        ? 'bg-blue-600 border-blue-500 shadow-md shadow-blue-500/20'
                        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none'
                        }`}
                    >
                      <View className="mr-2">
                        <IconLoader name={cat.icon} size={16} color={isSelected ? "white" : cat.color || "#64748b"} />
                      </View>
                      <Text className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
            <View className="h-20" />
          </ScrollView>

          <View className="p-6 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900">
            <TouchableOpacity
              onPress={handleSave}
              className="bg-blue-600 py-4 rounded-2xl items-center shadow-lg shadow-blue-500/30 flex-row justify-center"
            >
              <PlusCircle size={20} color="white" className="mr-2" />
              <Text className="text-white font-black text-base">
                {editingTransaction ? "Save Changes" : "Add Transaction"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default AddTransactionScreen;
