import "./global.css";
import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Alert, Platform, AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from "nativewind";
import { initDatabase } from "./src/db/database";
import { useExpenseStore } from "./src/store/useExpenseStore";
import { checkSmsPermission, requestSmsPermissionWithStatus } from "./src/utils/smsReader";
import { preloadMLKitModel } from "./src/utils/smsParser";
import UpdateModal from './src/components/UpdateModal';
import { checkVersion, VersionCheckResult } from './src/utils/versionCheckService';
import RootNavigator, { darkTheme, lightTheme } from "./src/navigation/RootNavigator";
import { NavigationContainer } from "@react-navigation/native";


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
        // Phase 3: Pre-load the ML Kit model (~10 MB) silently in background
        // so the first real SMS parse via AI is instant rather than waiting
        // for a lazy download when the first message arrives.
        preloadMLKitModel().catch(() => { /* non-fatal */ });
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

  // Real-time SMS sync: Listen for native events instead of polling
  useEffect(() => {
    if (!isReady || Platform.OS !== "android") return;

    const store = useExpenseStore.getState();
    const { DeviceEventEmitter, AppState } = require("react-native");

    // 1. Define sync logic
    const runSync = async () => {
      try {
        await store.syncRecentSmsTransactions();
      } catch (err) {
        console.error("Sync failed:", err);
      }
    };

    // 2. Real-time Refresh
    const subscription = DeviceEventEmitter.addListener("onSmsReceived", () => {
      if (isReady) {
        setTimeout(() => {
          store.fetchTransactions();
          store.fetchBills();
        }, 2000);
      }
    });

    // 4. Run once on mount
    runSync();

    return () => {
      subscription.remove();
    };
  }, [isReady]);

  return (
    <NavigationContainer theme={isDark ? darkTheme : lightTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
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
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </NavigationContainer>
  );
}
