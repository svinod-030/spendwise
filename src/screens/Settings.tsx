import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExpenseStore } from "../store/useExpenseStore";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore, AppTheme } from "../store/useThemeStore";
import { signInWithGoogle, signOutGoogle } from "../utils/googleAuth";
import { backupToDrive, restoreFromDrive } from "../utils/backupService";
import {
  Download, Upload, Shield, Trash2,
  Cloud, LogIn, LogOut, RefreshCcw, MessageSquare,
  Sun, Moon, Monitor,
  TrendingUp
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

const currencies = [
  { label: "US Dollar ($)", value: "USD", symbol: "$" },
  { label: "Indian Rupee (₹)", value: "INR", symbol: "₹" },
  { label: "Euro (€)", value: "EUR", symbol: "€" },
  { label: "British Pound (£)", value: "GBP", symbol: "£" },
];

const Settings = () => {
  const { importTransactionsFromSms, currency, updateCurrency, fetchCurrency, clearAllData } = useExpenseStore();
  const { theme, setTheme } = useThemeStore();
  const [isSyncing, setIsSyncing] = React.useState(false);

  useEffect(() => {
    fetchCurrency()
  }, []);

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

  const CurrencyOption = ({ type }: { type: string }) => {
    const isActive = currency === type;
    return (
      <TouchableOpacity
        onPress={() => updateCurrency(type)}
        className={`flex-1 items-center justify-center p-3 mx-2 rounded-2xl border ${isActive
          ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20'
          : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
          }`}
      >
        <Text className={`text-[10px] font-black uppercase tracking-widest mt-1.5 ${isActive ? 'text-white' : 'text-slate-500'}`}>
          {type}
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


        <Text className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mb-3 ml-2">Currency</Text>
        <View className="flex-row space-x-3 mb-8">
          {
            currencies.map((currency) => (
              <CurrencyOption key={currency.value} type={currency.value} />
            ))
          }
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
    </SafeAreaView>
  );
};

export default Settings;
