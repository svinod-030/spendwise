import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert, Modal, ScrollView, Text, TextInput,
  TouchableOpacity, View, Platform,
  KeyboardAvoidingView
} from "react-native";
import { CheckCircle2, X } from "lucide-react-native";
import { getTransactionDisplay, useExpenseStore } from "../store/useExpenseStore";
import { TransactionKind } from "../utils/smsParser";
import DateTimePicker from "@react-native-community/datetimepicker";
import { IconLoader } from "./IconLoader";

const KIND_OPTIONS: TransactionKind[] = ["expense", "income", "refund", "transfer"];

interface TransactionForm {
  amount: string;
  note: string;
  kind: TransactionKind;
  categoryId: number | null;
  date: Date;
}

interface AddTransactionProps {
  visible: boolean;
  onClose: () => void;
}

const INITIAL_FORM: TransactionForm = {
  amount: "0",
  note: "",
  kind: "expense",
  categoryId: 4,
  date: new Date(),
};

const AddTransactionModal = ({ visible, onClose }: AddTransactionProps) => {
  const bottomPadding = Platform.OS === 'ios' ? 34 : 0;
  const categories = useExpenseStore((state) => state.categories);
  const fetchCategories = useExpenseStore((state) => state.fetchCategories);
  const addTransaction = useExpenseStore((state) => state.addTransaction);

  const [form, setForm] = useState<TransactionForm>(INITIAL_FORM);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchCategories();
      setForm({ ...INITIAL_FORM, date: new Date() });
    }
  }, [visible, fetchCategories]);

  const canSave = useMemo(() => {
    const parsed = parseFloat(form.amount);
    return !isNaN(parsed) && parsed > 0 && form.categoryId !== null;
  }, [form.amount, form.categoryId]);

  const handleSave = async () => {
    if (!form.categoryId) {
      Alert.alert("Missing Category", "Please select a category for this transaction.");
      return;
    }

    const parsedAmount = Number(form.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }

    try {
      const type = form.kind === "expense" || form.kind === "transfer" ? "expense" : "income";
      await addTransaction({
        category_id: form.categoryId,
        amount: parsedAmount,
        type,
        kind: form.kind,
        date: form.date.toISOString(),
        note: form.note.trim(),
      });
      onClose();
    } catch {
      Alert.alert("Failed", "Unable to save transaction.");
    }
  };

  const handleAmountChange = (text: string) => {
    let cleaned = text.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = parts[0] + "." + parts.slice(1).join("");
    }
    if (parts[1] && parts[1].length > 2) {
      cleaned = parts[0] + "." + parts[1].slice(0, 2);
    }
    setForm(prev => ({ ...prev, amount: cleaned }));
  };

  const getSelectedKindStyles = () => {
    return getTransactionDisplay({ kind: form.kind });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <View className="flex-1 bg-slate-50 dark:bg-slate-950" style={{ paddingBottom: bottomPadding }}>
        {/* Drag Handle */}
        <View className="items-center pt-3 pb-1">
          <View className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </View>

        {/* Modal Header */}
        <View className="px-6 pt-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center justify-between">
            <Text className="text-slate-900 dark:text-white text-lg font-black tracking-tight">New Transaction</Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={handleSave}
                disabled={!canSave}
                className={`px-5 py-2 rounded-full ${canSave ? "bg-blue-600 shadow-lg shadow-blue-500/30" : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"}`}
              >
                <Text className={`font-bold text-xs uppercase tracking-widest ${canSave ? "text-white" : "text-slate-400 dark:text-slate-500"}`}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center"
              >
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
            {/* Amount Input Section */}
            <View className="px-6 py-10 pb-6 items-center">
              <Text className="text-slate-500 dark:text-slate-400 font-medium mb-3 uppercase tracking-widest text-[10px]">Enter Amount</Text>
              <View className="flex-row items-center bg-white dark:bg-slate-900 px-8 py-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none w-full justify-center">
                <Text className={`text-4xl mr-2 font-black ${getSelectedKindStyles().colorClass}`}>$</Text>
                <TextInput
                  value={form.amount}
                  onChangeText={handleAmountChange}
                  placeholder=""
                  placeholderTextColor="#94a3b8"
                  keyboardType="decimal-pad"
                  className={`text-6xl font-black ${getSelectedKindStyles().colorClass} min-w-[100px] text-center`}
                  selectionColor="#3b82f6"
                />
              </View>
            </View>

            {/* Date & Time Selector */}
            <View className="px-6 mb-8">
              <Text className="text-slate-500 dark:text-slate-400 font-black mb-4 text-[10px] uppercase tracking-widest">Date & Time</Text>
              <View className="flex-row gap-4">
                <TouchableOpacity
                  onPress={() => setShowDatePicker(true)}
                  className="flex-1 bg-white dark:bg-slate-900 rounded-2xl px-5 py-4 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
                >
                  <Text className="text-slate-900 dark:text-white font-bold">{form.date.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowTimePicker(true)}
                  className="flex-1 bg-white dark:bg-slate-900 rounded-2xl px-5 py-4 border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
                >
                  <Text className="text-slate-900 dark:text-white font-bold">
                    {form.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={form.date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event: any, selectedDate?: Date) => {
                    setShowDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      const newDate = new Date(selectedDate);
                      newDate.setHours(form.date.getHours());
                      newDate.setMinutes(form.date.getMinutes());
                      setForm(prev => ({ ...prev, date: newDate }));
                    }
                  }}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={form.date}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event: any, selectedTime?: Date) => {
                    setShowTimePicker(Platform.OS === 'ios');
                    if (selectedTime) {
                      const newDate = new Date(form.date);
                      newDate.setHours(selectedTime.getHours());
                      newDate.setMinutes(selectedTime.getMinutes());
                      setForm(prev => ({ ...prev, date: newDate }));
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
                  const isActive = form.kind === kind;
                  const kindStyles = getTransactionDisplay({ kind });
                  return (
                    <TouchableOpacity
                      key={kind}
                      onPress={() => { setForm(prev => ({ ...prev, kind })) }}
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
                {!form.categoryId && <Text className="text-rose-500 text-[10px] font-black uppercase">Required</Text>}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
                <View className="flex-row pb-2 pr-6">
                  {categories.map((category) => {
                    const isSelected = form.categoryId === category.id;
                    return (
                      <TouchableOpacity
                        key={category.id}
                        onPress={() => { setForm(prev => ({ ...prev, categoryId: category.id })) }}
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
                value={form.note}
                onChangeText={(text) => setForm(prev => ({ ...prev, note: text }))}
                placeholder="What was this for?"
                placeholderTextColor="#94a3b8"
                className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl px-5 py-4 border border-slate-100 dark:border-slate-800 font-bold shadow-sm dark:shadow-none"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default AddTransactionModal;
