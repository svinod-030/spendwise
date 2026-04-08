import "./global.css";
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Alert, Linking, Platform, AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initDatabase } from "./src/db/database";
import { useExpenseStore } from "./src/store/useExpenseStore";
import { checkSmsPermission, requestSmsPermissionWithStatus } from "./src/utils/smsReader";
import Dashboard from "./src/screens/Dashboard";
import Settings from "./src/screens/Settings";
import AddTransaction from "./src/screens/AddTransaction";
import Transactions from "./src/screens/Transactions";
import BudgetAndReports from "./src/screens/BudgetAndReports";
import UpdateModal from './src/components/UpdateModal';
import { checkVersion, VersionCheckResult } from './src/utils/versionCheckService';

const Stack = createNativeStackNavigator();

export default function App() {
  const runInitialSmsImportIfNeeded = useExpenseStore((state) => state.runInitialSmsImportIfNeeded);
  const syncRecentSmsTransactions = useExpenseStore((state) => state.syncRecentSmsTransactions);
  const [isReady, setIsReady] = useState(false);
  const [didRunLaunchImport, setDidRunLaunchImport] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<VersionCheckResult | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        setIsReady(true);
        
        // App auto-update check
        const result = await checkVersion();
        if (result.isUpdateAvailable) {
          setUpdateInfo(result);
          setShowUpdateModal(true);
        }
      } catch (error) {
        console.error("Failed to initialize database:", error);
      }
    }
    setup();
  }, []);

  useEffect(() => {
    async function runLaunchImport() {
      if (!isReady || didRunLaunchImport) return;
      setDidRunLaunchImport(true);
      if (Platform.OS === "android") {
        const hasPermission = await checkSmsPermission();
        if (!hasPermission) {
          Alert.alert(
            "Allow SMS permission",
            "Enable SMS access to automatically import transactions from your bank and UPI messages.",
            [
              { text: "Not now", style: "cancel" },
              {
                text: "Grant Permission",
                onPress: async () => {
                  const status = await requestSmsPermissionWithStatus();
                  if (status === "blocked") {
                    Alert.alert(
                      "Permission blocked",
                      "SMS permission is blocked. Please enable it from app settings.",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Open Settings", onPress: () => Linking.openSettings() },
                      ]
                    );
                  } else if (status === "granted") {
                    await runInitialSmsImportIfNeeded();
                  }
                },
              },
            ]
          );
          return;
        }
      }

      await runInitialSmsImportIfNeeded();
    }

    runLaunchImport();
  }, [isReady, didRunLaunchImport, runInitialSmsImportIfNeeded]);

  useEffect(() => {
    if (!isReady || Platform.OS !== "android") return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isSyncing = false;

    const runSync = async () => {
      if (isSyncing) return;
      isSyncing = true;
      try {
        await syncRecentSmsTransactions();
      } catch {
        // Intentionally ignore; next cycle retries.
      } finally {
        isSyncing = false;
      }
    };

    const startPolling = () => {
      if (intervalId) return;
      intervalId = setInterval(() => {
        runSync();
      }, 15000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    runSync();
    startPolling();

    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        runSync();
        startPolling();
      } else {
        stopPolling();
      }
    });

    return () => {
      appStateSubscription.remove();
      stopPolling();
    };
  }, [isReady, syncRecentSmsTransactions]);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {!isReady ? (
          <View className="flex-1 bg-slate-950 items-center justify-center">
            <ActivityIndicator size="large" color="#4D96FF" />
            <StatusBar style="light" />
          </View>
        ) : (
          <>
            <Stack.Navigator
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                contentStyle: { backgroundColor: '#020617' } // slate-950
              }}
            >
              <Stack.Screen name="Dashboard" component={Dashboard} />
              <Stack.Screen name="Transactions" component={Transactions} />
              <Stack.Screen name="AddTransaction" component={AddTransaction} />
              <Stack.Screen name="BudgetAndReports" component={BudgetAndReports} />
              <Stack.Screen name="Settings" component={Settings} />
            </Stack.Navigator>
            <StatusBar style="light" />
            {updateInfo && (
              <UpdateModal
                visible={showUpdateModal}
                onClose={() => setShowUpdateModal(false)}
                latestVersion={updateInfo.latestVersion}
                storeUrl={updateInfo.storeUrl}
              />
            )}
          </>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
