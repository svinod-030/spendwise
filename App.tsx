import "./global.css";
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Alert, Linking, Platform, AppState } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
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
import { Home, BarChart3, History, Settings as SettingsIcon } from "lucide-react-native";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f172a', // slate-900
          borderTopWidth: 1,
          borderTopColor: '#1e293b', // slate-800
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#3b82f6', // blue-500
        tabBarInactiveTintColor: '#64748b', // slate-500
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          marginTop: -4,
        },
      }}
    >
      <Tab.Screen
        name="Overview"
        component={Dashboard}
        options={{
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Analysis"
        component={Analysis}
        options={{
          tabBarIcon: ({ color, size }) => <BarChart3 size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={Transactions}
        options={{
          tabBarIcon: ({ color, size }) => <History size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Settings_Tab"
        component={Settings}
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <SettingsIcon size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [didRunLaunchImport, setDidRunLaunchImport] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<VersionCheckResult | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        setIsReady(true);
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

  return (
    <SafeAreaProvider>
      {!isReady ? (
        <View className="flex-1 bg-slate-950 items-center justify-center">
          <ActivityIndicator size="large" color="#4D96FF" />
          <StatusBar style="light" />
        </View>
      ) : (
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
              contentStyle: { backgroundColor: '#020617' }
            }}
          >
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="AddTransaction" component={AddTransaction} options={{ presentation: 'modal' }} />
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
        </NavigationContainer>
      )}
    </SafeAreaProvider>
  );
}
