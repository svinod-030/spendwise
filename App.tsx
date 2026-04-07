import "./global.css";
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { initDatabase } from "./src/db/database";
import Dashboard from "./src/screens/Dashboard";
import Settings from "./src/screens/Settings";

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function setup() {
      try {
        await initDatabase();
        setIsReady(true);
      } catch (error) {
        console.error("Failed to initialize database:", error);
      }
    }
    setup();
  }, []);

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
              <Stack.Screen name="Settings" component={Settings} />
            </Stack.Navigator>
            <StatusBar style="light" />
          </>
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
