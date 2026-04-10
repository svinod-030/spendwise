import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Modal, ScrollView, Text, TextInput,
  TouchableOpacity, View, Platform,
  KeyboardAvoidingView,
} from "react-native";
import { X, Calendar, Clock, ChevronRight, Eraser } from "lucide-react-native";
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
  amount: "10",
  note: "",
  kind: "expense",
  categoryId: 4, // Default to a common category like Food or Misc
  date: new Date(),
};

const AddTransactionModal = ({ visible, onClose }: AddTransactionProps) => {
  const bottomPadding = Platform.OS === 'ios' ? 34 : 20;
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
      Alert.alert("Required", "Please select a category.");
      return;
    }

    const parsedAmount = Number(form.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert("Invalid", "Please enter a valid amount.");
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
      Alert.alert("Error", "Unable to save transaction.");
    }
  };

  const handleAmountChange = (text: string) => {
    let cleaned = text.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) cleaned = parts[0] + "." + parts.slice(1).join("");
    if (parts[1] && parts[1].length > 2) cleaned = parts[0] + "." + parts[1].slice(0, 2);
    setForm(prev => ({ ...prev, amount: cleaned }));
  };

  const getKindStyles = (kind: TransactionKind) => getTransactionDisplay({ kind });
  const activeKindStyles = getKindStyles(form.kind);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <View className="flex-1 bg-white dark:bg-slate-950">
        {/* Header Bar */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <TouchableOpacity onPress={onClose} className="p-2 -ml-2">
            <X size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-slate-900 dark:text-white text-lg font-black italic uppercase tracking-tighter">
            New Record
          </Text>
          <View className="w-10" />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }}
          >
            {/* Amount & Type Section */}
            <View className="px-6 py-8 items-center justify-center">
              <View className="flex-row items-baseline mb-2">
                <Text className={`text-3xl font-black mr-2 ${activeKindStyles.colorClass}`}>$</Text>
                <TextInput
                  value={form.amount === "0" ? "" : form.amount}
                  onChangeText={handleAmountChange}
                  placeholder="0"
                  placeholderTextColor="#cbd5e1"
                  keyboardType="decimal-pad"
                  autoFocus
                  className={`text-6xl font-black ${activeKindStyles.colorClass} min-w-[50px]`}
                />
                {form.amount !== "0" && form.amount !== "" && (
                  <TouchableOpacity
                    onPress={() => setForm(p => ({ ...p, amount: "0" }))}
                    className="ml-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full"
                  >
                    <Eraser size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Kind Selector (Segmented) */}
              <View className="flex-row bg-slate-100 dark:bg-slate-900 rounded-2xl p-1 mt-6 gap-2 w-full max-w-[320px]">
                {KIND_OPTIONS.map((k) => {
                  const isActive = form.kind === k;
                  const kStyles = getKindStyles(k);
                  return (
                    <TouchableOpacity
                      key={k}
                      onPress={() => setForm(p => ({ ...p, kind: k }))}
                      className={`flex-1 py-2.5 items-center justify-center rounded-xl ${isActive ? "bg-white dark:bg-slate-800 shadow-sm" : ""}`}
                    >
                      <Text className={`text-[10px] font-black uppercase tracking-widest ${isActive ? kStyles.colorClass : "text-slate-400"}`}>
                        {k}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Main Form Fields */}
            <View className="px-6 space-y-6">
              {/* Category Section */}
              <View className="pb-6">
                <View className="flex-row justify-between items-end mb-4 px-1">
                  <Text className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[2px]">Category</Text>
                  {!form.categoryId && <Text className="text-rose-500 text-[10px] font-black italic">Selection Required</Text>}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
                  <View className="flex-row space-x-3 gap-3">
                    {categories.map((cat) => {
                      const isSelected = form.categoryId === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => setForm(p => ({ ...p, categoryId: cat.id }))}
                          className={`flex-row items-center px-2 py-1 rounded-2xl border ${isSelected
                            ? "bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20"
                            : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800"}`}
                        >
                          <View className={`mr-3 p-1.5 rounded-full ${isSelected ? "bg-blue-500/30" : "bg-white dark:bg-slate-800"}`}>
                            <IconLoader name={cat.icon || "Package"} size={16} color={isSelected ? "white" : (cat.color || "#3b82f6")} />
                          </View>
                          <Text className={`font-black text-xs uppercase tracking-tight ${isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"}`}>
                            {cat.name}
                          </Text>
                          {isSelected && <View className="ml-2 w-1.5 h-1.5 rounded-full bg-white" />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Date & Time Section */}
              <View className="pb-6">
                <Text className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[2px] mb-4 px-1">Timeline</Text>
                <View className="flex-row space-x-3">
                  <TouchableOpacity
                    onPress={() => setShowDatePicker(true)}
                    className="flex-1 flex-row items-center bg-slate-50 dark:bg-slate-900 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800"
                  >
                    <Calendar size={18} color="#64748b" className="mr-3" />
                    <Text className="text-slate-900 dark:text-white font-black text-xs uppercase">
                      {form.date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(true)}
                    className="flex-1 flex-row items-center bg-slate-50 dark:bg-slate-900 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800"
                  >
                    <Clock size={18} color="#64748b" className="mr-3" />
                    <Text className="text-slate-900 dark:text-white font-black text-xs uppercase">
                      {form.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Note Section */}
              <View>
                <Text className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[2px] mb-4 px-1">Note</Text>
                <TextInput
                  value={form.note}
                  onChangeText={(text) => setForm(p => ({ ...p, note: text }))}
                  placeholder="Optional details..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  className="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl px-5 py-4 border border-slate-100 dark:border-slate-800 font-bold min-h-[80px]"
                  textAlignVertical="top"
                />
              </View>
            </View>
          </ScrollView>

          {/* DateTime Pickers (Hidden) */}
          {showDatePicker && (
            <DateTimePicker
              value={form.date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, d) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (d) {
                  const n = new Date(d);
                  n.setHours(form.date.getHours());
                  n.setMinutes(form.date.getMinutes());
                  setForm(p => ({ ...p, date: n }));
                }
              }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker
              value={form.date}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, t) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (t) {
                  const n = new Date(form.date);
                  n.setHours(t.getHours());
                  n.setMinutes(t.getMinutes());
                  setForm(p => ({ ...p, date: n }));
                }
              }}
            />
          )}

          {/* Bottom Action Button */}
          <View className="p-6 bg-white/80 dark:bg-slate-950/80 border-t border-slate-50 dark:border-slate-900" style={{ paddingBottom: bottomPadding }}>
            <TouchableOpacity
              onPress={handleSave}
              disabled={!canSave}
              activeOpacity={0.8}
              className={`w-full py-5 rounded-[24px] flex-row items-center justify-center space-x-3 ${canSave ? "bg-blue-600 shadow-xl shadow-blue-500/40" : "bg-slate-100 dark:bg-slate-900"}`}
            >
              <Text className={`font-black text-sm uppercase tracking-[3px] ${canSave ? "text-white" : "text-slate-400 dark:text-slate-500"}`}>
                Save Transaction
              </Text>
              {canSave && <ChevronRight size={18} color="white" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

export default AddTransactionModal;
