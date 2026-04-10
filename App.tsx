import "./global.css";
import React, { useEffect, useState } from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Alert, Platform, AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useColorScheme } from "nativewind";
import { initDatabase } from "./src/db/database";
import { useExpenseStore } from "./src/store/useExpenseStore";
import { checkSmsPermission, requestSmsPermissionWithStatus } from "./src/utils/smsReader";
import Dashboard from "./src/screens/Dashboard";
import Analysis from "./src/screens/Analysis";
import Settings from "./src/screens/Settings";
import AddTransaction from "./src/screens/AddTransaction";
import Transactions from "./src/screens/Transactions";
import UpdateModal from './src/components/UpdateModal';
import { checkVersion, VersionCheckResult } from './src/utils/versionCheckService';
import { Home, BarChart3, History, Settings as SettingsIcon, PlusIcon } from "lucide-react-native";

const SpendWiseDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#020617', // slate-950
    card: '#0f172a', // slate-900
    border: '#1e293b', // slate-800
    primary: '#3b82f6', // blue-500
    text: '#f8fafc', // slate-50
  },
};

const SpendWiseLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#f8fafc', // slate-50
    card: '#ffffff',
    border: '#e2e8f0', // slate-200
    primary: '#2563eb', // blue-600
    text: '#0f172a', // slate-900
  },
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? "#0f172a" : "#ffffff",
          borderTopWidth: 1,
          borderTopColor: isDark ? "#1e293b" : "#f1f5f9",
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: isDark ? "#3b82f6" : "#2563eb",
        tabBarInactiveTintColor: isDark ? "#64748b" : "#94a3b8",
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "bold",
          marginTop: -4,
        },
        tabBarIcon: ({ color, size }) => {
          if (route.name === "Overview") return <Home size={size} color={color} />;
          if (route.name === "Analysis") return <BarChart3 size={size} color={color} />;
          if (route.name === "Transactions") return <History size={size} color={color} />;
          if (route.name === "Settings_Tab") return <SettingsIcon size={size} color={color} />;
          return null;
        },
      })}
    >
      <Tab.Screen name="Overview" component={Dashboard} />
      <Tab.Screen name="Analysis" component={Analysis} />
      <Tab.Screen name="Transactions" component={Transactions} />
      <Tab.Screen name="Settings_Tab" component={Settings} options={{ title: "Settings" }} />
    </Tab.Navigator>
  );
}

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
    <SafeAreaProvider>
      <NavigationContainer theme={isDark ? SpendWiseDarkTheme : SpendWiseLightTheme}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            contentStyle: { backgroundColor: isDark ? "#020617" : "#f8fafc" },
          }}
        >
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen name="AddTransaction" component={AddTransaction} />
        </Stack.Navigator>
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
  );
}
