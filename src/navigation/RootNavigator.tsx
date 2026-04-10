import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { DefaultTheme, DarkTheme } from "@react-navigation/native";
import { useColorScheme } from "nativewind";

// Import Screens
import TabNavigator from "./TabNavigator";
import AddTransaction from "../screens/AddTransaction";

const Stack = createNativeStackNavigator();

export const SpendWiseDarkTheme = {
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

export const SpendWiseLightTheme = {
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

export default function RootNavigator() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: isDark ? "#020617" : "#f8fafc" },
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="AddTransaction" component={AddTransaction} options={{ animation: "slide_from_right", presentation: "card" }} />
    </Stack.Navigator>
  );
}
