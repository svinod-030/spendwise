import React from "react";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import TabNavigator from "./TabNavigator";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AddTransactionScreen from "../screens/AddTransactionScreen";

const Stack = createNativeStackNavigator();

export const darkTheme = {
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

export const lightTheme = {
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
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
    </Stack.Navigator>
  );
}
