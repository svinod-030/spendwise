import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, CheckCircle2, Wallet } from "lucide-react-native";
import { getTransactionDisplay, useExpenseStore } from "../store/useExpenseStore";
import { TransactionKind } from "../utils/smsParser";
import CustomNumpad from "../components/CustomNumpad";
import DateTimePicker from "@react-native-community/datetimepicker";
import { IconLoader } from "../components/IconLoader";

import { NativeStackNavigationProp } from "@react-navigation/native-stack";

const KIND_OPTIONS: TransactionKind[] = ["expense", "income", "refund", "transfer"];

interface AddTransactionProps {
  navigation: NativeStackNavigationProp<any>;
}

const AddTransaction = ({ navigation }: AddTransactionProps) => {
  const categories = useExpenseStore((state) => state.categories);
  const fetchCategories = useExpenseStore((state) => state.fetchCategories);
  const addTransaction = useExpenseStore((state) => state.addTransaction);
  const [amountStr, setAmountStr] = useState("0");
  const [note, setNote] = useState("");
  const [selectedKind, setSelectedKind] = useState<TransactionKind>("expense");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const canSave = useMemo(() => {
    const parsed = Number(amountStr);
    return parsed > 0 && selectedCategoryId !== null;
  }, [amountStr, selectedCategoryId]);

  const handleSave = async () => {
    if (!selectedCategoryId) {
      Alert.alert("Missing Category", "Please select a category for this transaction.");
      return;
    }

    const parsedAmount = Number(amountStr);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }

    try {
      const type = selectedKind === "expense" || selectedKind === "transfer" ? "expense" : "income";
      await addTransaction({
        category_id: selectedCategoryId,
        amount: parsedAmount,
        type,
        kind: selectedKind,
        date: date.toISOString(),
        note: note.trim(),
      });
      navigation.goBack();
    } catch {
      Alert.alert("Failed", "Unable to save transaction.");
    }
  };

  const handleNumpadPress = (val: string) => {
    setAmountStr((prev) => {
      if (val === "." && prev.includes(".")) return prev;
      if (prev === "0" && val !== ".") return val;
      // Limit decimal places to 2
      if (prev.includes(".")) {
        const [, decimal] = prev.split(".");
        if (decimal && decimal.length >= 2) return prev;
      }
      return prev + val;
    });
  };

  const handleNumpadDelete = () => {
    setAmountStr((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
  };

  const getSelectedKindStyles = () => {
    return getTransactionDisplay({ kind: selectedKind });
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-6 pt-6 pb-2 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900">
        <View className="flex-row items-center justify-between mb-1">
          <View className="flex-row items-center">
            <View className="w-8 h-8 bg-blue-600 rounded-xl items-center justify-center mr-3 shadow-lg shadow-blue-500/30">
              <Wallet size={18} color="white" />
            </View>
            <Text className="text-slate-900 dark:text-white text-xl font-black tracking-tighter">SpendWise</Text>
          </View>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            className={`px-4 py-2 rounded-full ${canSave ? "bg-blue-600 shadow-lg shadow-blue-500/30" : "bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"}`}
          >
            <Text className={`font-bold text-xs uppercase tracking-widest ${canSave ? "text-white" : "text-slate-400 dark:text-slate-600"}`}>Save</Text>
          </TouchableOpacity>
        </View>
        <View className="flex-row items-center mt-2">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1 mr-2">
            <ArrowLeft size={16} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">New Transaction</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Amount Display */}
        <View className="items-center justify-center py-10 pb-6">
          <Text className="text-slate-500 dark:text-slate-400 font-medium mb-2 uppercase tracking-widest text-[10px]">Amount</Text>
          <View className="flex-row items-center">
            <Text className={`text-4xl mr-1 font-black ${getSelectedKindStyles().colorClass}`}>$</Text>
            <Text className={`text-6xl font-black ${getSelectedKindStyles().colorClass}`}>{amountStr}</Text>
          </View>
        </View>

        {/* Numpad */}
        <View className="px-6">
          <CustomNumpad onPressItem={handleNumpadPress} onDelete={handleNumpadDelete} />
        </View>


        {/* Date & Time Selector */}
        <View className="px-6 mb-8">
          <Text className="text-slate-500 dark:text-slate-400 font-black mb-4 text-[10px] uppercase tracking-widest">Date & Time</Text>
          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="flex-1 bg-white dark:bg-slate-900 rounded-2xl px-5 py-4 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
            >
              <Text className="text-slate-900 dark:text-white font-bold">{date.toLocaleDateString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowTimePicker(true)}
              className="flex-1 bg-white dark:bg-slate-900 rounded-2xl px-5 py-4 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
            >
              <Text className="text-slate-900 dark:text-white font-bold">
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event: any, selectedDate?: Date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  const newDate = new Date(selectedDate);
                  newDate.setHours(date.getHours());
                  newDate.setMinutes(date.getMinutes());
                  setDate(newDate);
                }
              }}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              is24Hour={false}
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event: any, selectedTime?: Date) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (selectedTime) {
                  const newDate = new Date(date);
                  newDate.setHours(selectedTime.getHours());
                  newDate.setMinutes(selectedTime.getMinutes());
                  setDate(newDate);
                }
              }}
            />
          )}
        </View>

        {/* Type Selector */}
        <View className="px-6 mb-8">
          <Text className="text-slate-500 dark:text-slate-400 font-black mb-4 text-[10px] uppercase tracking-widest">Type</Text>
          <View className="bg-white dark:bg-slate-900 rounded-2xl flex-row p-1 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none">
            {KIND_OPTIONS.map((kind) => {
              const isActive = selectedKind === kind;
              const kindStyles = getTransactionDisplay({ kind });
              return (
                <TouchableOpacity
                  key={kind}
                  onPress={() => setSelectedKind(kind)}
                  className={`flex-1 py-3 items-center justify-center rounded-xl ${isActive ? "bg-slate-100 dark:bg-slate-800 shadow-sm" : ""
                    }`}
                >
                  <Text
                    className={`capitalize font-black text-xs ${isActive ? kindStyles.colorClass : "text-slate-400"
                      }`}
                  >
                    {kind}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Category Selector */}
        <View className="px-6 mb-8">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-widest">Category</Text>
            {selectedCategoryId === null && <Text className="text-rose-500 text-[10px] font-black uppercase">Required</Text>}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
            <View className="flex-row pb-2 pr-6">
              {categories.map((category) => {
                const isSelected = selectedCategoryId === category.id;
                return (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => setSelectedCategoryId(category.id)}
                    className={`w-28 h-28 mr-3 rounded-3xl p-4 justify-between border ${isSelected
                      ? "bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20"
                      : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
                      }`}
                  >
                    <View
                      className="w-10 h-10 rounded-full items-center justify-center"
                      style={{ backgroundColor: `${category.color && category.color.startsWith("#") ? category.color : "#3b82f6"}15` }}
                    >
                      <IconLoader name={category.icon || "Package"} size={20} color={category.color || "#3b82f6"} />
                    </View>
                    <View>
                      {isSelected && (
                        <View className="absolute right-0 bottom-6">
                          <CheckCircle2 size={16} color="white" />
                        </View>
                      )}
                      <Text
                        className={`font-black text-[11px] uppercase tracking-tight ${isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"
                          }`}
                        numberOfLines={1}
                      >
                        {category.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Note */}
        <View className="px-6 mb-8">
          <Text className="text-slate-500 dark:text-slate-400 font-black mb-4 text-[10px] uppercase tracking-widest">Note (Optional)</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What was this for?"
            placeholderTextColor="#94a3b8"
            className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl px-5 py-4 border border-slate-100 dark:border-slate-800 font-bold shadow-sm dark:shadow-none"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddTransaction;
