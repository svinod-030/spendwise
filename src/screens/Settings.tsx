import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExpenseStore } from "../store/useExpenseStore";
import { ArrowLeft, Download, Upload, Shield, Trash2 } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

const Settings = () => {
  const navigation = useNavigation();
  const { exportData, importData } = useExpenseStore();

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

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="px-6 py-4 flex-row items-center border-b border-slate-900">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 -ml-2">
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold ml-4">Settings & Privacy</Text>
      </View>

      <View className="px-6 pt-10">
        <View className="bg-blue-500/10 p-6 rounded-3xl border border-blue-500/20 mb-10">
          <View className="flex-row items-center mb-4">
            <Shield size={24} color="#3b82f6" />
            <Text className="text-blue-400 font-bold text-lg ml-3">Privacy First</Text>
          </View>
          <Text className="text-slate-400 leading-relaxed">
            All your financial data is stored locally on this device. 
            We do not have access to your data, nor is it uploaded to any servers. 
            Manage your own backups using the options below.
          </Text>
        </View>

        <Text className="text-slate-500 font-bold uppercase tracking-widest text-xs mb-4 ml-2">Data Management</Text>
        
        <TouchableOpacity 
          onPress={handleExport}
          className="flex-row items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 mb-4"
        >
          <View className="w-12 h-12 bg-emerald-500/20 rounded-xl items-center justify-center">
            <Download size={24} color="#10b981" />
          </View>
          <View className="ml-4">
            <Text className="text-white font-bold text-lg">Export Data</Text>
            <Text className="text-slate-500 text-sm">Save your data to a JSON file</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleImport}
          className="flex-row items-center bg-slate-900 p-5 rounded-2xl border border-slate-800 mb-4"
        >
          <View className="w-12 h-12 bg-blue-500/20 rounded-xl items-center justify-center">
            <Upload size={24} color="#3b82f6" />
          </View>
          <View className="ml-4">
            <Text className="text-white font-bold text-lg">Import Data</Text>
            <Text className="text-slate-500 text-sm">Restore from a previous backup</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          className="flex-row items-center bg-slate-900 p-5 rounded-2xl border border-slate-800"
        >
          <View className="w-12 h-12 bg-rose-500/20 rounded-xl items-center justify-center">
            <Trash2 size={24} color="#f43f5e" />
          </View>
          <View className="ml-4">
            <Text className="text-rose-500 font-bold text-lg">Clear All Data</Text>
            <Text className="text-slate-500 text-sm">Permanently delete all records</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default Settings;
