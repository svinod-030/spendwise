import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExpenseStore } from "../store/useExpenseStore";
import { useThemeStore, AppTheme } from "../store/useThemeStore";
import {
  Shield, Trash2,
  MessageSquare,
  Sun, Moon, Monitor,
  TrendingUp, Search, Globe, ChevronRight, CheckCircle2, Tags, Plus
} from "lucide-react-native";
import { Modal, FlatList, TextInput as RNTextInput, TextInput } from "react-native";
import * as Localization from "expo-localization";

import { ALL_CURRENCY_CODES } from "../constants/currencies";

const fallbackColors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

const deviceLocales = Localization.getLocales();
const commonCurrencies = deviceLocales
  .filter(l => l.currencyCode)
  .map(l => ({
    label: l.currencyCode || "USD",
    value: l.currencyCode || "USD",
    symbol: l.currencySymbol || "$"
  }))
  .filter((v, i, a) => a.findIndex(t => t.value === v.value) === i); // Unique

// If device locales don't have enough, add some defaults
if (commonCurrencies.length < 3) {
  const defaults = [
    { label: "USD", value: "USD", symbol: "$" },
    { label: "INR", value: "INR", symbol: "₹" },
    { label: "EUR", value: "EUR", symbol: "€" },
  ];
  defaults.forEach(d => {
    if (!commonCurrencies.find(c => c.value === d.value)) {
      commonCurrencies.push(d);
    }
  });
}

const allCurrencyCodes = ALL_CURRENCY_CODES;

const Settings = () => {
  const { importTransactionsFromSms, currency, updateCurrency, fetchCurrency, clearAllData, getCurrencySymbol, categories, fetchCategories, addCategory } = useExpenseStore();
  const { theme, setTheme } = useThemeStore();
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [isCurrencyModalVisible, setIsCurrencyModalVisible] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [newCategoryName, setNewCategoryName] = React.useState("");

  useEffect(() => {
    fetchCurrency();
    fetchCategories();
  }, []);

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    await addCategory({
      name,
      icon: "circle",
      color: fallbackColors[categories.length % fallbackColors.length],
    });
    setNewCategoryName("");
    Alert.alert("Success", `Category "${name}" added.`);
  };

  const filteredCurrencies = allCurrencyCodes.filter(code =>
    code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClearData = async () => {
    Alert.alert(
      "Clear All Data",
      "This will permanently delete all transactions, messages, and budgets. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Everything",
          style: "destructive",
          onPress: async () => {
            setIsSyncing(true);
            try {
              await clearAllData();
              Alert.alert("Success", "All data has been cleared.");
            } catch (error) {
              Alert.alert("Error", "Failed to clear data.");
            } finally {
              setIsSyncing(false);
            }
          }
        },
      ]
    );
  };

  const handleSmsImport = async () => {
    setIsSyncing(true);
    try {
      const result = await importTransactionsFromSms();
      Alert.alert(
        "SMS import complete",
        `Imported ${result.imported} transaction(s).\nSkipped ${result.skipped} message(s).`
      );
    } catch (error) {
      Alert.alert(
        "SMS import failed",
        "Please grant SMS permission and run on Android device."
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const ThemeOption = ({ type, label, icon: Icon }: { type: AppTheme, label: string, icon: any }) => {
    const isActive = theme === type;
    return (
      <TouchableOpacity
        onPress={() => setTheme(type)}
        className={`flex-1 items-center justify-center p-3 mx-2 rounded-2xl border ${isActive
          ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20'
          : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
      >
        <Icon size={18} color={isActive ? "white" : "#64748b"} />
        <Text className={`text-[10px] font-black uppercase tracking-widest mt-1.5 ${isActive ? 'text-white' : 'text-slate-500'}`}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-6 py-4 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900">
        <View className="flex-row items-center mb-0.5">
          <View className="w-7 h-7 bg-slate-100 dark:bg-slate-800 rounded-lg items-center justify-center mr-2.5 shadow-sm dark:shadow-slate-900/30">
            <Shield size={16} color="#64748b" />
          </View>
          <Text className="text-slate-900 dark:text-white text-lg font-black tracking-tighter">SpendWise</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 20, paddingBottom: 120 }}
      >
        <View className="bg-blue-500/5 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-500/10 dark:border-blue-500/20 mb-6">
          <View className="flex-row items-center mb-2">
            <Shield size={20} color="#3b82f6" />
            <Text className="text-blue-600 dark:text-blue-400 font-bold text-base ml-2.5">Privacy First</Text>
          </View>
          <Text className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            All your financial data is stored locally on this device.
            We do not have access to your data.
          </Text>
        </View>

        <Text className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-3 ml-2">App Appearance</Text>
        <View className="flex-row space-x-3 mb-8">
          <ThemeOption type="light" label="Light" icon={Sun} />
          <ThemeOption type="dark" label="Dark" icon={Moon} />
          <ThemeOption type="system" label="System" icon={Monitor} />
        </View>

        <Text className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-3 ml-2">Display Currency</Text>
        <TouchableOpacity
          onPress={() => setIsCurrencyModalVisible(true)}
          className="flex-row items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 mb-8 shadow-sm dark:shadow-none"
        >
          <View className="w-10 h-10 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl items-center justify-center">
            <Globe size={20} color="#3b82f6" />
          </View>
          <View className="ml-3.5 flex-1">
            <Text className="text-slate-900 dark:text-white font-bold text-base">{currency}</Text>
            <Text className="text-slate-500 text-xs">Symbol: {getCurrencySymbol()}</Text>
          </View>
          <ChevronRight size={20} color="#64748b" />
        </TouchableOpacity>

        <Text className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-3 ml-2">Manage Categories</Text>
        <View className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 mb-8 shadow-sm dark:shadow-none">
          <View className="flex-row items-center mb-6">
            <TextInput
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              placeholder="New category name..."
              placeholderTextColor="#94a3b8"
              className="flex-1 bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white rounded-2xl px-4 py-3 mr-3 font-medium border border-slate-200 dark:border-slate-700/50"
            />
            <TouchableOpacity onPress={handleAddCategory} className="bg-slate-100 dark:bg-slate-800 rounded-2xl w-12 h-12 items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none">
              <Plus size={24} color="#3b82f6" />
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap">
            {categories.map((category, index) => (
              <View key={category.id || index} className="px-3 py-1.5 bg-slate-100/50 dark:bg-slate-800/40 rounded-xl mr-2 mb-2 border border-slate-200 dark:border-slate-800/60 flex-row items-center">
                <View className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: category.color || fallbackColors[index % fallbackColors.length] }} />
                <Text className="text-slate-500 dark:text-slate-400 text-[11px] font-bold">{category.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-3 ml-2">Data Management</Text>

        <TouchableOpacity
          onPress={handleSmsImport}
          disabled={isSyncing}
          className="flex-row items-center bg-violet-500/5 dark:bg-violet-500/10 p-4 rounded-2xl border border-violet-500/10 dark:border-violet-500/20 mb-3"
        >
          <View className="w-10 h-10 bg-violet-500/10 dark:bg-violet-500/20 rounded-xl items-center justify-center">
            <MessageSquare size={20} color="#8b5cf6" />
          </View>
          <View className="ml-3.5 flex-1">
            <Text className="text-slate-900 dark:text-white font-bold text-base">Import SMS Transactions</Text>
            <Text className="text-slate-500 dark:text-slate-400 text-xs">Scan inbox and auto-create transactions</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleClearData}
          disabled={isSyncing}
          className="flex-row items-center bg-rose-500/5 p-4 rounded-2xl border border-rose-500/10 mb-8"
        >
          <View className="w-10 h-10 bg-rose-500/10 dark:bg-rose-500/20 rounded-xl items-center justify-center">
            <Trash2 size={20} color="#f43f5e" />
          </View>
          <View className="ml-3.5">
            <Text className="text-rose-600 dark:text-rose-500 font-bold text-base">Clear All Data</Text>
            <Text className="text-slate-500 text-xs">Permanently delete all records</Text>
          </View>
        </TouchableOpacity>

        {__DEV__ && (
          <>
            <Text className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-3 ml-2">Developer Tools</Text>

            <TouchableOpacity
              onPress={async () => {
                const mockSms = {
                  address: "HDFCBNK",
                  body: `Your A/C x1234 has been debited for Rs. 500.00 at ZOMATO on ${new Date().toLocaleDateString()}. Ref: 1234567890`,
                  date: Date.now()
                };
                const result = await useExpenseStore.getState().processIncomingSmsMessage(mockSms);
                Alert.alert(result ? "Success" : "Already exists or failed", "Mock expense processed.");
              }}
              className="flex-row items-center bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-3"
            >
              <View className="w-10 h-10 bg-rose-500/10 dark:bg-rose-500/20 rounded-xl items-center justify-center">
                <TrendingUp size={20} color="#f43f5e" style={{ transform: [{ rotate: '180deg' }] }} />
              </View>
              <View className="ml-3.5 flex-1">
                <Text className="text-slate-900 dark:text-white font-bold text-base">Simulate Expense SMS</Text>
                <Text className="text-slate-500 text-xs">Test: HDFC Rs. 500 at Zomato</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                const mockSms = {
                  address: "ICICIBNK",
                  body: `Dear Customer, your Acct XX123 has been credited with INR 2,500.00 on ${new Date().toLocaleDateString()} from Google India.`,
                  date: Date.now()
                };
                const result = await useExpenseStore.getState().processIncomingSmsMessage(mockSms);
                Alert.alert(result ? "Success" : "Already exists or failed", "Mock income processed.");
              }}
              className="flex-row items-center bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800"
            >
              <View className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl items-center justify-center">
                <TrendingUp size={20} color="#10b981" />
              </View>
              <View className="ml-3.5 flex-1">
                <Text className="text-slate-900 dark:text-white font-bold text-base">Simulate Income SMS</Text>
                <Text className="text-slate-500 text-xs">Test: ICICI INR 2,500 credit</Text>
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Currency Selector Modal */}
      <Modal
        visible={isCurrencyModalVisible}
        animationType="slide"
        onRequestClose={() => setIsCurrencyModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white dark:bg-slate-950">
          <View className="px-6 py-4 border-b border-slate-100 dark:border-slate-900 flex-row items-center justify-between">
            <Text className="text-xl font-black text-slate-900 dark:text-white">Select Currency</Text>
            <TouchableOpacity onPress={() => setIsCurrencyModalVisible(false)}>
              <Text className="text-blue-600 font-bold text-base">Done</Text>
            </TouchableOpacity>
          </View>

          <View className="px-6 py-3">
            <View className="flex-row items-center bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <Search size={18} color="#64748b" />
              <RNTextInput
                className="flex-1 ml-2 text-slate-900 dark:text-white py-1.5"
                placeholder="Search currency code (e.g. USD, INR)..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="characters"
              />
            </View>
          </View>

          <FlatList
            data={filteredCurrencies}
            numColumns={3}
            keyExtractor={(item) => item}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            ListHeaderComponent={() => (
              searchQuery === "" ? (
                <View className="px-2">
                  <Text className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-6 mb-2">All Currencies</Text>
                </View>
              ) : (
                <View className="px-2">
                  <Text className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-6 mb-2">Search Results</Text>
                </View>
              )
            )}
            renderItem={({ item }) => {
              const isActive = currency === item;
              return (
                <TouchableOpacity
                  onPress={() => {
                    updateCurrency(item);
                    setIsCurrencyModalVisible(false);
                  }}
                  className={`flex-1 m-1 py-1 rounded-[20px] items-center justify-center border ${isActive ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 shadow-sm'}`}
                >
                  <View className={`px-1 py-1 items-center justify-center`}>
                    <Text className={`font-black text-[12px] text-center ${isActive ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>
                      {item} {getCurrencySymbol(item)}
                    </Text>
                  </View>
                  {isActive && (
                    <View className="absolute top-2 right-2">
                      <CheckCircle2 size={12} color="white" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

export default Settings;
