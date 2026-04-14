import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useColorScheme } from "nativewind";
import { Home, BarChart3, History, Settings as SettingsIcon, PlusCircle } from "lucide-react-native";
import Dashboard from "../screens/Dashboard";
import Analysis from "../screens/Analysis";
import Transactions from "../screens/Transactions";
import Settings from "../screens/Settings";
import AddTransactionScreen from "../screens/AddTransactionScreen";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
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
          if (route.name === "AddTransaction") return <PlusCircle size={size} color={color} />;
          if (route.name === "Transactions") return <History size={size} color={color} />;
          if (route.name === "Settings_Tab") return <SettingsIcon size={size} color={color} />;
          return null;
        },
      })}
    >
      <Tab.Screen name="Overview" component={Dashboard} />
      <Tab.Screen name="Analysis" component={Analysis} />
      <Tab.Screen 
        name="AddTransaction" 
        component={AddTransactionScreen} 
        options={{ title: '' }} 
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            navigation.setParams({ editingTransaction: undefined });
          },
        })}
      />
      <Tab.Screen name="Transactions" component={Transactions} />
      <Tab.Screen name="Settings_Tab" component={Settings} options={{ title: "Settings" }} />
    </Tab.Navigator>
  );
}
