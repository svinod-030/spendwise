import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import { AppRegistry } from "react-native";
import { parseSmsForTransaction, parseSmsForBill, showTransactionNotification, showBillNotification } from "./src/utils/smsParser";

import App from './App';
import { initDatabase } from "./src/db/database";
import { useExpenseStore } from "./src/store/useExpenseStore";
import { loadCachedConfig } from "./src/utils/remoteConfig";

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Pre-initialize database and config once for the headless environment
const headlessInit = Promise.all([initDatabase(), loadCachedConfig()]);

AppRegistry.registerHeadlessTask("SmsReceivedTask", () => async (data: {
  address?: string;
  body?: string;
  date?: number;
}) => {
  if (!data?.address || !data?.body || !data?.date) return;
  try {
    const sms = { address: data.address, body: data.body, date: data.date };

    // 1. Try transaction parsing first
    const parsed = await parseSmsForTransaction(sms);

    if (parsed) {
      // Show transaction notification immediately from JS
      showTransactionNotification(parsed);
    } else {
      // 2. Try bill parsing if not a transaction
      const parsedBill = await parseSmsForBill(sms);
      if (parsedBill && parsedBill.amount > 0) {
        // Show bill notification immediately from JS
        showBillNotification(parsedBill);
      }
    }

    // 3. Always run the full ingest pipeline (handles dedup + DB insert for both types)
    await headlessInit;
    await useExpenseStore.getState().processIncomingSmsMessage(sms);
  } catch (error) {
    console.error("Headless SMS processing failed:", error);
  }
});
