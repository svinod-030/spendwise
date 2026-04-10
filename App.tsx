import "./global.css";
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Alert, Platform, AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from "nativewind";
import { initDatabase } from "./src/db/database";
import { useExpenseStore } from "./src/store/useExpenseStore";
import { checkSmsPermission, requestSmsPermissionWithStatus } from "./src/utils/smsReader";
import UpdateModal from './src/components/UpdateModal';
import { checkVersion, VersionCheckResult } from './src/utils/versionCheckService';
import TabNavigator from "./src/navigation/TabNavigator";
import { SpendWiseDarkTheme, SpendWiseLightTheme } from "./src/navigation/RootNavigator";

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [didRunLaunchImport, setDidRunLaunchImport] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<VersionCheckResult | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  // Initialize database and check for updates
  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        setIsReady(true);
        if (!__DEV__) {
          const result = await checkVersion();
          if (result.isUpdateAvailable) {
            setUpdateInfo(result);
            setShowUpdateModal(true);
          }
        }
      } catch (error) {
        console.error("Failed to initialize database:", error);
      }
    }
    setup();
  }, []);

  // Run initial SMS import if needed
  useEffect(() => {
    async function runLaunchImport() {
      if (!isReady || didRunLaunchImport) return;
      setDidRunLaunchImport(true);

      const store = useExpenseStore.getState();

      if (Platform.OS === "android" && !__DEV__) {
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
                  if (status === "granted") {
                    await store.runInitialSmsImportIfNeeded();
                  }
                },
              },
            ]
          );
          return;
        }
      }
      await store.runInitialSmsImportIfNeeded();
    }
    runLaunchImport();
  }, [isReady, didRunLaunchImport]);

  // Sync recent SMS transactions
  useEffect(() => {
    if (!isReady || Platform.OS !== "android") return;
    const store = useExpenseStore.getState();
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let isSyncing = false;
    const runSync = async () => {
      if (isSyncing) return;
      isSyncing = true;
      try {
        await store.syncRecentSmsTransactions();
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
  }, [isReady]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {!isReady ? (
          <View className="flex-1 bg-white dark:bg-slate-950 items-center justify-center">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <NavigationContainer theme={isDark ? SpendWiseDarkTheme : SpendWiseLightTheme}>
            <TabNavigator />
          </NavigationContainer>
        )}
        <StatusBar style={isDark ? "light" : "dark"} />
        {updateInfo && (
          <UpdateModal
            visible={showUpdateModal}
            onClose={() => setShowUpdateModal(false)}
            latestVersion={updateInfo.latestVersion}
            storeUrl={updateInfo.storeUrl}
          />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
