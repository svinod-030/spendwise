import { PermissionsAndroid, Platform } from "react-native";
import SmsAndroid from "react-native-get-sms-android";
import { SmsMessage } from "./smsParser";

interface SmsQueryResult {
  count: number;
  list: SmsMessage[];
}

export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
    title: "SMS access required",
    message: "Expense tracker needs SMS access to import bank and UPI transactions.",
    buttonPositive: "Allow",
    buttonNegative: "Deny",
    buttonNeutral: "Ask me later",
  });
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export async function checkSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
}

export async function requestSmsPermissionWithStatus(): Promise<"granted" | "denied" | "blocked"> {
  if (Platform.OS !== "android") return "denied";
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
    title: "SMS access required",
    message: "Expense tracker needs SMS access to import bank and UPI transactions.",
    buttonPositive: "Allow",
    buttonNegative: "Deny",
    buttonNeutral: "Ask me later",
  });

  if (granted === PermissionsAndroid.RESULTS.GRANTED) return "granted";
  if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return "blocked";
  return "denied";
}

export async function readInboxMessages(maxCount = 1000): Promise<SmsMessage[]> {
  if (Platform.OS !== "android") return [];

  const filter = {
    box: "inbox",
    maxCount,
    indexFrom: 0,
  };

  return new Promise<SmsMessage[]>((resolve, reject) => {
    SmsAndroid.list(
      JSON.stringify(filter),
      (error: string) => reject(new Error(error || "Failed to read SMS inbox")),
      (count: number, smsList: string) => {
        try {
          const parsed = JSON.parse(smsList) as SmsMessage[];
          const result: SmsQueryResult = { count, list: parsed };
          resolve(result.list);
        } catch {
          resolve([]);
        }
      }
    );
  });
}
