import "./global.css";
import React, { useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
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
import RootNavigator, { SpendWiseDarkTheme, SpendWiseLightTheme } from "./src/navigation/RootNavigator";
import { navigationRef } from "./src/utils/navigationService";

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [didRunLaunchImport, setDidRunLaunchImport] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<VersionCheckResult | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

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

  if (!isReady) {
    return (
      <View className="flex-1 bg-white dark:bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef} theme={isDark ? SpendWiseDarkTheme : SpendWiseLightTheme}>
          <RootNavigator />
          <StatusBar style={isDark ? "light" : "dark"} />
          {updateInfo && (
            <UpdateModal
              visible={showUpdateModal}
              onClose={() => setShowUpdateModal(false)}
              latestVersion={updateInfo.latestVersion}
              storeUrl={updateInfo.storeUrl}
            />
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
