import React from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExpenseStore } from "../store/useExpenseStore";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore, AppTheme } from "../store/useThemeStore";
import { signInWithGoogle, signOutGoogle } from "../utils/googleAuth";
import { backupToDrive, restoreFromDrive } from "../utils/backupService";
import {
  ArrowLeft, Download, Upload, Shield, Trash2,
  Cloud, LogIn, LogOut, RefreshCcw, MessageSquare, CheckCircle2,
  Sun, Moon, Monitor
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

const Settings = () => {
  const navigation = useNavigation();
  const { exportData, importData, importTransactionsFromSms } = useExpenseStore();
  const { user, isAuthenticated, setUser, signOut, isLoading } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      if (result) {
        setUser(result.user, result.accessToken);
        Alert.alert("Success", `Signed in as ${result.user.name}`);
      }
    } catch (error) {
      console.error("Login failed", error);
      Alert.alert("Error", "Google Sign-in failed. Please try again.");
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await signOutGoogle();
      signOut();
      Alert.alert("Signed Out", "You have been signed out from Google.");
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleDriveBackup = async () => {
    if (!isAuthenticated) return;
    setIsSyncing(true);
    try {
      const success = await backupToDrive();
      if (success) {
        Alert.alert("Success", "Data backed up to Google Drive successfully.");
      } else {
        throw new Error("Backup failed");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to backup data to Google Drive.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDriveRestore = async () => {
    if (!isAuthenticated) return;

    Alert.alert(
      "Restore from Drive",
      "This will overwrite all local data. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          style: "destructive",
          onPress: async () => {
            setIsSyncing(true);
            try {
              const data = await restoreFromDrive();
              if (data) {
                await importData(data);
                Alert.alert("Success", "Data restored from Google Drive successfully.");
              } else {
                Alert.alert("Error", "No backup found or failed to download.");
              }
            } catch (error) {
              Alert.alert("Error", "Failed to restore data.");
            } finally {
              setIsSyncing(false);
            }
          }
        },
      ]
    );
  };

  const handleExport = async () => {
    try {
      await exportData();
      Alert.alert("Success", "Backup file created and ready to share.");
    } catch (error) {
      Alert.alert("Error", "Failed to export data.");
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const content = await FileSystem.readAsStringAsync(result.assets[0].uri);
        Alert.alert(
          "Import Data",
          "This will overwrite all existing data. Are you sure?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Import",
              style: "destructive",
              onPress: async () => {
                await importData(content);
                Alert.alert("Success", "Data imported successfully.");
              }
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to import data. Please ensure it's a valid backup file.");
    }
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
        className={`flex-1 items-center justify-center p-4 rounded-2xl border ${
          isActive 
            ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/20' 
            : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
        }`}
      >
        <Icon size={20} color={isActive ? "white" : "#64748b"} />
        <Text className={`text-[10px] font-black uppercase tracking-widest mt-2 ${isActive ? 'text-white' : 'text-slate-500'}`}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50 dark:bg-slate-950">
      <View className="px-6 pt-6 pb-2 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-900">
        <View className="flex-row items-center mb-1">
          <View className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-xl items-center justify-center mr-3 shadow-sm dark:shadow-slate-900/30">
            <Shield size={18} color="#64748b" />
          </View>
          <Text className="text-slate-900 dark:text-white text-xl font-black tracking-tighter">SpendWise</Text>
        </View>
        <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">App Settings & Profile</Text>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 30, paddingBottom: 60 }}
      >
        <View className="bg-blue-500/5 dark:bg-blue-500/10 p-6 rounded-3xl border border-blue-500/10 dark:border-blue-500/20 mb-10">
          <View className="flex-row items-center mb-4">
            <Shield size={24} color="#3b82f6" />
            <Text className="text-blue-600 dark:text-blue-400 font-bold text-lg ml-3">Privacy First</Text>
          </View>
          <Text className="text-slate-600 dark:text-slate-400 leading-relaxed">
            All your financial data is stored locally on this device.
            We do not have access to your data, nor is it uploaded to any servers.
            Manage your own backups using the options below.
          </Text>
        </View>

        <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-4 ml-2">App Appearance</Text>
        <View className="flex-row space-x-3 mb-10">
          <ThemeOption type="light" label="Light" icon={Sun} />
          <ThemeOption type="dark" label="Dark" icon={Moon} />
          <ThemeOption type="system" label="System" icon={Monitor} />
        </View>

        <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-4 ml-2">Cloud Sync</Text>

        {!isAuthenticated ? (
          <TouchableOpacity
            onPress={handleGoogleLogin}
            className="flex-row items-center bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 mb-8 shadow-sm dark:shadow-none"
          >
            <View className="w-12 h-12 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl items-center justify-center">
              <LogIn size={24} color="#3b82f6" />
            </View>
            <View className="ml-4">
              <Text className="text-slate-900 dark:text-white font-bold text-lg">Sign in with Google</Text>
              <Text className="text-slate-500 text-sm">Enable cloud backup & restore</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View className="mb-8">
            <View className="flex-row items-center bg-blue-500/5 dark:bg-blue-500/10 p-4 rounded-2xl border border-blue-500/10 dark:border-blue-500/20 mb-4">
              <View className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full items-center justify-center">
                <Text className="text-white font-bold">{user?.name?.charAt(0) || 'U'}</Text>
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-slate-900 dark:text-white font-bold">{user?.name}</Text>
                <Text className="text-slate-500 text-xs">{user?.email}</Text>
              </View>
              <TouchableOpacity onPress={handleGoogleLogout} className="p-2">
                <LogOut size={20} color="#f43f5e" />
              </TouchableOpacity>
            </View>

            <View className="flex-row space-x-4">
              <TouchableOpacity
                onPress={handleDriveBackup}
                disabled={isSyncing}
                className="flex-1 flex-row items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
              >
                <View className="w-10 h-10 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl items-center justify-center">
                  {isSyncing ? <RefreshCcw size={20} color="#10b981" /> : <Cloud size={20} color="#10b981" />}
                </View>
                <View className="ml-3">
                  <Text className="text-slate-900 dark:text-white font-bold">Backup</Text>
                  <Text className="text-slate-500 text-[10px]">Cloud</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDriveRestore}
                disabled={isSyncing}
                className="flex-1 flex-row items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none"
              >
                <View className="w-10 h-10 bg-amber-500/10 dark:bg-amber-500/20 rounded-xl items-center justify-center">
                  <RefreshCcw size={20} color="#f59e0b" />
                </View>
                <View className="ml-3">
                  <Text className="text-slate-900 dark:text-white font-bold">Restore</Text>
                  <Text className="text-slate-500 text-[10px]">Cloud</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-4 ml-2">Local Data</Text>

        <TouchableOpacity
          onPress={handleSmsImport}
          disabled={isSyncing}
          className="flex-row items-center bg-violet-500/5 dark:bg-violet-500/10 p-5 rounded-2xl border border-violet-500/10 dark:border-violet-500/20 mb-4"
        >
          <View className="w-12 h-12 bg-violet-500/10 dark:bg-violet-500/20 rounded-xl items-center justify-center">
            <MessageSquare size={24} color="#8b5cf6" />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-slate-900 dark:text-white font-bold text-lg">Import SMS Transactions</Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm">Scan inbox and auto-create transactions</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleExport}
          className="flex-row items-center bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 mb-4 shadow-sm dark:shadow-none"
        >
          <View className="w-12 h-12 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-xl items-center justify-center">
            <Download size={24} color="#10b981" />
          </View>
          <View className="ml-4">
            <Text className="text-slate-900 dark:text-white font-bold text-lg">Export JSON</Text>
            <Text className="text-slate-500 text-sm">Save to local device</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleImport}
          className="flex-row items-center bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 mb-8 shadow-sm dark:shadow-none"
        >
          <View className="w-12 h-12 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl items-center justify-center">
            <Upload size={24} color="#3b82f6" />
          </View>
          <View className="ml-4">
            <Text className="text-slate-900 dark:text-white font-bold text-lg">Import JSON</Text>
            <Text className="text-slate-500 text-sm">Restore from local file</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-row items-center bg-rose-500/5 p-5 rounded-2xl border border-rose-500/10"
        >
          <View className="w-12 h-12 bg-rose-500/10 dark:bg-rose-500/20 rounded-xl items-center justify-center">
            <Trash2 size={24} color="#f43f5e" />
          </View>
          <View className="ml-4">
            <Text className="text-rose-600 dark:text-rose-500 font-bold text-lg">Clear All Data</Text>
            <Text className="text-slate-500 text-sm">Permanently delete all records</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Settings;
