import React, { useEffect, useMemo, useState } from "react";
import {
  Alert, Text, TextInput,
  TouchableOpacity, View, Platform,
  KeyboardAvoidingView,
  Switch,
  Dimensions,
  StyleSheet,
  Pressable,
} from "react-native";
import { X, Calendar, Clock, ChevronRight, Eraser, Trash2, EyeOff } from "lucide-react-native";
import { getTransactionDisplay, Transaction, useExpenseStore } from "../store/useExpenseStore";
import { TransactionKind } from "../utils/smsParser";
import DateTimePicker from "@react-native-community/datetimepicker";
import { IconLoader } from "./IconLoader";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const KIND_OPTIONS: TransactionKind[] = ["expense", "income", "refund", "transfer"];

interface TransactionForm {
  amount: string;
  note: string;
  kind: TransactionKind;
  categoryId: number | null;
  date: Date;
  isExcluded: boolean;
}

interface AddTransactionProps {
  visible: boolean;
  onClose: () => void;
  editingTransaction?: Transaction | null;
}

const INITIAL_FORM: TransactionForm = {
  amount: "0",
  note: "",
  kind: "expense",
  categoryId: 4, // Default to a common category like Food or Misc
  date: new Date(),
  isExcluded: false,
};

const AddTransactionModal = ({ visible, onClose, editingTransaction }: AddTransactionProps) => {
  const bottomPadding = Platform.OS === 'ios' ? 34 : 20;
  const categories = useExpenseStore((state) => state.categories);
  const fetchCategories = useExpenseStore((state) => state.fetchCategories);
  const addTransaction = useExpenseStore((state) => state.addTransaction);
  const updateTransaction = useExpenseStore((state) => state.updateTransaction);
  const deleteTransaction = useExpenseStore((state) => state.deleteTransaction);

  const [form, setForm] = useState<TransactionForm>(INITIAL_FORM);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchCategories();
      if (editingTransaction) {
        setForm({
          amount: String(editingTransaction.amount),
          note: editingTransaction.note || "",
          kind: editingTransaction.kind || (editingTransaction.type === "income" ? "income" : "expense"),
          categoryId: editingTransaction.category_id,
          date: isNaN(new Date(editingTransaction.date).getTime())
            ? new Date()
            : new Date(editingTransaction.date),
          isExcluded: editingTransaction.is_excluded === 1,
        });
      } else {
        setForm({ ...INITIAL_FORM, date: new Date() });
      }
    }
  }, [visible, fetchCategories, editingTransaction]);

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
      const payload = {
        category_id: form.categoryId,
        amount: parsedAmount,
        type: type as any,
        kind: form.kind,
        date: form.date.toISOString(),
        note: form.note.trim(),
        is_excluded: form.isExcluded ? 1 : 0,
      };

      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, payload);
      } else {
        await addTransaction(payload);
      }
      onClose();
    } catch {
      Alert.alert("Error", "Unable to save transaction.");
    }
  };

  const handleDelete = () => {
    if (!editingTransaction) return;
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to remove this record? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteTransaction(editingTransaction.id);
            onClose();
          }
        }
      ]
    );
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

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} className="z-[9999]">
      {/* Backdrop */}
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
      >
        <Pressable style={{ flex: 1 }} onPress={onClose} />
      </Animated.View>

      {/* Main Container */}
      <Animated.View
        entering={SlideInDown.springify().damping(100)}
        exiting={SlideOutDown.springify().damping(100)}
        className="absolute bottom-0 w-full bg-white dark:bg-slate-950 rounded-t-[40px] shadow-2xl overflow-hidden"
        style={{ height: SCREEN_HEIGHT * 0.92 }}
      >
        {/* Header Bar */}
        <View className="flex-row items-center justify-between px-6 py-5 border-b border-slate-50 dark:border-slate-900">
          <TouchableOpacity onPress={onClose} className="p-2 -ml-2">
            <X size={24} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-slate-900 dark:text-white text-lg font-black italic uppercase tracking-tighter">
            {editingTransaction ? "Edit Record" : "New Record"}
          </Text>
          {editingTransaction ? (
            <TouchableOpacity onPress={handleDelete} className="p-2 -mr-2">
              <Trash2 size={24} color="#f43f5e" />
            </TouchableOpacity>
          ) : (
            <View className="w-10" />
          )}
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <Animated.ScrollView
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
                  autoFocus={!editingTransaction}
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
              {/* Exclusion Toggle */}
              <View className="flex-row items-center justify-between bg-slate-50 dark:bg-slate-900 px-5 py-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                <View className="flex-row items-center flex-1 mr-4">
                  <View className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-2xl items-center justify-center mr-3">
                    <EyeOff size={18} color={form.isExcluded ? "#f43f5e" : "#64748b"} />
                  </View>
                  <View>
                    <Text className="text-slate-900 dark:text-white font-black text-xs uppercase">Not an Expense</Text>
                    <Text className="text-slate-500 text-[10px] font-bold">Exclude from monthly totals</Text>
                  </View>
                </View>
                <Switch
                  value={form.isExcluded}
                  onValueChange={(val) => setForm(p => ({ ...p, isExcluded: val }))}
                  trackColor={{ false: '#cbd5e1', true: '#ef4444' }}
                />
              </View>

              {/* Category Section */}
              <View className="pb-6">
                <View className="flex-row justify-between items-end mb-4 px-1">
                  <Text className="text-slate-400 dark:text-slate-500 font-black text-[10px] uppercase tracking-[2px]">Category</Text>
                  {!form.categoryId && <Text className="text-rose-500 text-[10px] font-black italic">Selection Required</Text>}
                </View>
                <Animated.ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6 px-6">
                  <View className="flex-row space-x-3 gap-3">
                    {categories.map((cat) => {
                      const isSelected = form.categoryId === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          onPress={() => setForm(p => ({ ...p, categoryId: cat.id }))}
                          className={`flex-row items-center px-4 py-3 rounded-2xl border ${isSelected
                            ? "bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20"
                            : "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800"}`}
                        >
                          <View className={`mr-3 p-1.5 rounded-full ${isSelected ? "bg-blue-500/30" : "bg-white dark:bg-slate-800"}`}>
                            <IconLoader name={cat.icon || "Package"} size={16} color={isSelected ? "white" : (cat.color || "#3b82f6")} />
                          </View>
                          <Text className={`font-black text-xs uppercase tracking-tight ${isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"}`}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Animated.ScrollView>
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
                      {form.date.toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(true)}
                    className="flex-1 flex-row items-center bg-slate-50 dark:bg-slate-900 px-5 py-4 rounded-2xl border border-slate-100 dark:border-slate-800"
                  >
                    <Clock size={18} color="#64748b" className="mr-3" />
                    <Text className="text-slate-900 dark:text-white font-black text-xs uppercase">
                      {form.date.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' })}
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
          </Animated.ScrollView>

          {/* DateTime Pickers (Secondary Popups) */}
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
                {editingTransaction ? "Update Record" : "Save Record"}
              </Text>
              {canSave && <ChevronRight size={18} color="white" />}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
};

export default AddTransactionModal;
