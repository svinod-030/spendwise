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
    const { DeviceEventEmitter } = require("react-native");

    let isSyncing = false;
    const runSync = async () => {
      if (isSyncing) return;
      isSyncing = true;
      try {
        // We still fetch recent messages just in case some were missed
        await store.syncRecentSmsTransactions();
      } catch (err) {
        console.error("Manual sync failed:", err);
      } finally {
        isSyncing = false;
      }
    };

    // 1. Initial sync on launch
    runSync();

    // 2. Listen for real-time SMS events from our native SmsReceiver
    const subscription = DeviceEventEmitter.addListener("onSmsReceived", () => {
      // Small delay to ensure the Headless Task has finished writing to the DB
      setTimeout(() => {
        runSync();
      }, 1000);
    });

    // 3. Refresh on app return to foreground
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        runSync();
      }
    });

    return () => {
      subscription.remove();
      appStateSubscription.remove();
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
