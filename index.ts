import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { AppRegistry } from "react-native";

import App from './App';
import { initDatabase } from "./src/db/database";
import { useExpenseStore } from "./src/store/useExpenseStore";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

AppRegistry.registerHeadlessTask("SmsReceivedTask", () => async (data: {
  address?: string;
  body?: string;
  date?: number;
}) => {
  if (!data?.address || !data?.body || !data?.date) return;
  try {
    await initDatabase();
    await useExpenseStore.getState().processIncomingSmsMessage({
      address: data.address,
      body: data.body,
      date: data.date,
    });
  } catch (error) {
    console.error("Headless SMS processing failed:", error);
  }
});
