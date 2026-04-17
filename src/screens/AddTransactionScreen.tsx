import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Platform, KeyboardAvoidingView, Modal, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar as CalendarIcon, ChevronRight, Check, TrendingUp, Clock as ClockIcon, Trash2, Eye, EyeOff, Link as LinkIcon, RefreshCcw, Search, X, ArrowLeft } from "lucide-react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useExpenseStore, Transaction } from "../store/useExpenseStore";
import { IconLoader } from "../components/IconLoader";
import { useNavigation, useRoute, useIsFocused } from "@react-navigation/native";
import { Alert } from "react-native";
import { TransactionKind } from "../utils/smsParser";

const AddTransactionScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocused = useIsFocused();
  const editingTransaction: Transaction | undefined = route.params?.editingTransaction;

  const { addTransaction, updateTransaction, deleteTransaction, categories, fetchCategories, getCurrencySymbol, transactions } = useExpenseStore();

  const [type, setType] = useState<"expense" | "income">("expense");
  const [kind, setKind] = useState<string>("expense");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState("");
  const [isExcluded, setIsExcluded] = useState(false);
  const [parentId, setParentId] = useState<number | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");

  const parentTransaction = transactions.find(t => t.id === parentId);
  const linkedRefunds = transactions.filter(t => t.parent_id === editingTransaction?.id);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setKind(editingTransaction.kind || editingTransaction.type);
      setAmount(editingTransaction.amount.toString());
      setCategoryId(editingTransaction.category_id);
      setDate(new Date(editingTransaction.date));
      setNote(editingTransaction.note || "");
      setIsExcluded(editingTransaction.is_excluded === 1);
      setParentId(editingTransaction.parent_id || null);
    } else {
      setType("expense");
      setKind("expense");
      setAmount("");
      setCategoryId(null);
      setDate(new Date());
      setNote("");
      setIsExcluded(false);
      setParentId(null);
    }
  }, [editingTransaction]);

  useEffect(() => {
    if (!isFocused) {
      setType("expense");
      setKind("expense");
      setAmount("");
      setCategoryId(null);
      setDate(new Date());
      setNote("");
      setIsExcluded(false);
      setParentId(null);
    }
  }, [isFocused]);

  const handleDelete = () => {
    if (!editingTransaction) return;
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to permanently delete this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteTransaction(editingTransaction.id);
            navigation.goBack();
          }
        }
      ]
    );
  };

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount))) {
      return;
    }

    const transactionData = {
      type,
      kind: (type === "income" && parentId ? "refund" : (type === "income" ? "income" : "expense")) as TransactionKind,
      amount: Number(amount),
      category_id: categoryId,
      date: date.toISOString(),
      note,
      is_excluded: isExcluded ? 1 : 0,
      parent_id: parentId,
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
      setIsExcluded(false);
      setParentId(null);
      navigation.navigate("Transactions");
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const potentialParentTransactions = transactions.filter(t => {
    if (editingTransaction && t.id === editingTransaction.id) return false;
    if (type === "expense") {
      // If I'm an expense, I want to see candidate income/refunds to link to ME
      return (t.type === "income" || t.kind === "refund") && (!t.parent_id || t.parent_id === editingTransaction?.id);
    } else {
      // If I'm income (Refund), I want to link to an original expense
      return t.type === "expense" || t.kind === "expense";
    }
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredPotential = potentialParentTransactions.filter(t => {
    if (!linkSearch) return true;
    return (t.note || "").toLowerCase().includes(linkSearch.toLowerCase()) ||
      (t.merchant || "").toLowerCase().includes(linkSearch.toLowerCase()) ||
      t.amount.toString().includes(linkSearch);
  });

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <View className="px-4 py-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2 mr-2">
                <ArrowLeft size={24} color="#64748b" />
              </TouchableOpacity>
              <Text className="text-slate-900 dark:text-white text-xl font-black tracking-tighter">
                {editingTransaction ? "Edit Transaction" : "New Transaction"}
              </Text>
            </View>
            {editingTransaction && (
              <TouchableOpacity onPress={handleDelete} className="p-2 -mr-2">
                <Trash2 size={20} color="#f43f5e" />
              </TouchableOpacity>
            )}
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

            {/* Date & Time */}
            <View className="mb-6 flex-row w-full">
              <View className="flex-1 mr-2">
                <Text className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-widest">Date</Text>
                <TouchableOpacity
                  className="bg-white dark:bg-slate-900 shadow-sm dark:shadow-none rounded-2xl px-4 py-4 flex-row items-center border border-slate-100 dark:border-slate-800"
                  onPress={() => setShowDatePicker(true)}
                >
                  <CalendarIcon size={18} color="#64748b" className="mr-3" />
                  <Text className="text-slate-900 dark:text-white font-semibold flex-1" numberOfLines={1}>
                    {date.toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-slate-500 text-xs font-bold mb-2 uppercase tracking-widest">Time</Text>
                <TouchableOpacity
                  className="bg-white dark:bg-slate-900 shadow-sm dark:shadow-none rounded-2xl px-4 py-4 flex-row items-center border border-slate-100 dark:border-slate-800"
                  onPress={() => setShowTimePicker(true)}
                >
                  <ClockIcon size={18} color="#64748b" className="mr-3" />
                  <Text className="text-slate-900 dark:text-white font-semibold flex-1" numberOfLines={1}>
                    {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={date}
                  mode="time"
                  display="default"
                  onChange={handleTimeChange}
                />
              )}
            </View>

            {editingTransaction && (
              <>
                {/* Refund Linking Section */}
                <View className="mb-6">
                  <Text className="text-slate-500 text-[10px] font-bold mb-2 uppercase tracking-widest">
                    {type === "expense" ? "Linked Refunds" : "Refund Details"}
                  </Text>

                  {type === "expense" ? (
                    <View>
                      {linkedRefunds.length > 0 ? (
                        linkedRefunds.map(refund => (
                          <View key={refund.id} className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/30 rounded-2xl p-4 mb-2 flex-row items-center justify-between">
                            <View className="flex-row items-center flex-1">
                              <View className="w-8 h-8 rounded-full bg-emerald-500/10 items-center justify-center mr-3">
                                <RefreshCcw size={14} color="#10b981" />
                              </View>
                              <View>
                                <Text className="text-slate-900 dark:text-white font-bold text-sm">{refund.note || "Refund"}</Text>
                                <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                                  {new Date(refund.date).toLocaleDateString()}
                                </Text>
                              </View>
                            </View>
                            <View className="flex-row items-center">
                              <Text className="text-emerald-600 dark:text-emerald-400 font-black mr-4">+{getCurrencySymbol()}{refund.amount.toFixed(2)}</Text>
                              <TouchableOpacity
                                onPress={() => updateTransaction(refund.id, { parent_id: null })}
                                className="w-8 h-8 rounded-full bg-rose-500/10 items-center justify-center"
                              >
                                <X size={14} color="#f43f5e" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      ) : null}

                      <TouchableOpacity
                        onPress={() => setIsLinkingModalOpen(true)}
                        className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl py-4 items-center justify-center flex-row"
                      >
                        <LinkIcon size={16} color="#3b82f6" className="mr-2" />
                        <Text className="text-blue-600 dark:text-blue-400 font-black text-sm uppercase tracking-widest">Link a Refund</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setIsLinkingModalOpen(true)}
                      className={`bg-white dark:bg-slate-900 rounded-[24px] px-5 py-4 flex-row items-center border ${parentId ? 'border-emerald-100 dark:border-emerald-950/30 bg-emerald-50/30 dark:bg-emerald-950/10' : 'border-slate-100 dark:border-slate-800'}`}
                    >
                      <View className={`w-11 h-11 rounded-2xl items-center justify-center mr-4 ${parentId ? 'bg-emerald-500/10' : 'bg-slate-500/10'}`}>
                        <RefreshCcw size={22} color={parentId ? "#10b981" : "#64748b"} />
                      </View>
                      <View className="flex-1">
                        <Text className={`font-black text-sm ${parentId ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                          {parentId ? "Linked to Expense" : "Mark as Refund"}
                        </Text>
                        {parentTransaction ? (
                          <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                            {parentTransaction.note || "Expense"} • {getCurrencySymbol()}{parentTransaction.amount}
                          </Text>
                        ) : (
                          <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                            Link this to an original expense
                          </Text>
                        )}
                      </View>
                      {parentId && (
                        <TouchableOpacity onPress={(e) => { e.stopPropagation(); setParentId(null); }} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center">
                          <X size={14} color="#64748b" />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {/* Visibility Selection */}
                <View className="mb-6">
                  <Text className="text-slate-500 text-[10px] font-bold mb-2 uppercase tracking-widest">Reporting Visibility</Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setIsExcluded(!isExcluded)}
                    className={`bg-white dark:bg-slate-900 rounded-[24px] px-5 py-4 flex-row items-center border ${isExcluded ? 'border-rose-100 dark:border-rose-950/30 bg-rose-50/30 dark:bg-rose-950/10' : 'border-slate-100 dark:border-slate-800'}`}
                  >
                    <View className={`w-11 h-11 rounded-2xl items-center justify-center mr-4 ${isExcluded ? 'bg-rose-500/10' : 'bg-blue-500/10'}`}>
                      {isExcluded ? <EyeOff size={22} color="#f43f5e" /> : <Eye size={22} color="#3b82f6" />}
                    </View>
                    <View className="flex-1">
                      <Text className={`font-black text-sm ${isExcluded ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                        {isExcluded ? "Excluded from Budget" : "Included in Budget"}
                      </Text>
                      <Text className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">
                        {isExcluded ? "Hidden from all calculations" : "Visible in charts & reports"}
                      </Text>
                    </View>
                    <View className={`w-12 h-7 rounded-full px-1 justify-center ${isExcluded ? 'bg-rose-500' : 'bg-slate-200 dark:bg-slate-800'}`}>
                      <View
                        className={`w-5 h-5 bg-white rounded-full ${isExcluded ? 'self-end' : 'self-start'}`}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            )}

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

          {/* Linking Modal */}
          <Modal
            visible={isLinkingModalOpen}
            animationType="slide"
            transparent={true}
          >
            <SafeAreaView className="flex-1 bg-slate-900/50 backdrop-blur-md justify-end">
              <View className="bg-white dark:bg-slate-950 rounded-t-[40px] h-[80%] shadow-2xl">
                <View className="px-6 pt-8 pb-4 border-b border-slate-50 dark:border-slate-900">
                  <View className="flex-row items-center justify-between mb-6">
                    <Text className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">
                      {type === "expense" ? "Select a Refund" : "Select Original Expense"}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setIsLinkingModalOpen(false)}
                      className="bg-slate-100 dark:bg-slate-800 p-2 rounded-full"
                    >
                      <X size={20} color="#64748b" />
                    </TouchableOpacity>
                  </View>
                  <View className="flex-row items-center bg-slate-50 dark:bg-slate-900 rounded-2xl px-4 py-3">
                    <Search size={18} color="#94a3b8" />
                    <TextInput
                      placeholder="Search transactions..."
                      placeholderTextColor="#94a3b8"
                      value={linkSearch}
                      onChangeText={setLinkSearch}
                      className="flex-1 ml-2 text-slate-900 dark:text-white font-bold"
                    />
                  </View>
                </View>

                <FlatList
                  data={filteredPotential}
                  keyExtractor={(item) => item.id.toString()}
                  contentContainerStyle={{ padding: 24 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => {
                        if (type === "expense") {
                          // Link this refund to current expense
                          updateTransaction(item.id, { parent_id: editingTransaction?.id });
                        } else {
                          // Link current refund to this expense
                          setParentId(item.id);
                        }
                        setIsLinkingModalOpen(false);
                      }}
                      className="bg-white dark:bg-slate-900 p-4 rounded-3xl mb-3 border border-slate-100 dark:border-slate-800 shadow-sm"
                    >
                      <View className="flex-row justify-between items-center">
                        <View className="flex-1">
                          <Text className="text-slate-900 dark:text-white font-black text-sm">{item.note || item.merchant || "Transaction"}</Text>
                          <Text className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mt-1">
                            {new Date(item.date).toLocaleDateString()} • {item.type}
                          </Text>
                        </View>
                        <Text className={`font-black italic text-base ${item.type === 'expense' ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {item.type === 'expense' ? '-' : '+'}{getCurrencySymbol()}{item.amount.toFixed(2)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={() => (
                    <View className="py-10 items-center justify-center">
                      <Text className="text-slate-400 font-bold text-xs uppercase tracking-widest text-center px-10">
                        No suitable transactions found to link.
                      </Text>
                    </View>
                  )}
                />
              </View>
            </SafeAreaView>
          </Modal>

          <View className="p-6 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900">
            <TouchableOpacity
              onPress={handleSave}
              className="bg-blue-600 py-4 rounded-2xl items-center shadow-lg shadow-blue-500/30 flex-row justify-center"
            >
              <Text className="text-white font-black text-base">
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

export default AddTransactionScreen;
