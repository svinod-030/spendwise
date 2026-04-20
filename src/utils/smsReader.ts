import { PermissionsAndroid, Platform } from "react-native";
import SmsAndroid from "react-native-get-sms-android";
import { SmsMessage } from "./smsParser";

interface SmsQueryResult {
  count: number;
  list: SmsMessage[];
}

export async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const granted = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
  ]);
  return (
    granted[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED &&
    granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS] === PermissionsAndroid.RESULTS.GRANTED
  );
}

export async function checkSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  const readGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
  const receiveGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
  return readGranted && receiveGranted;
}

export async function requestSmsPermissionWithStatus(): Promise<"granted" | "denied" | "blocked"> {
  if (Platform.OS !== "android") return "denied";
  const granted = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_SMS,
    PermissionsAndroid.PERMISSIONS.RECEIVE_SMS
  ]);

  const readStatus = granted[PermissionsAndroid.PERMISSIONS.READ_SMS];
  const receiveStatus = granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS];

  if (readStatus === PermissionsAndroid.RESULTS.GRANTED && receiveStatus === PermissionsAndroid.RESULTS.GRANTED) {
    return "granted";
  }
  if (readStatus === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN || receiveStatus === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    return "blocked";
  }
  return "denied";
}

export async function readInboxMessages(maxCount?: number): Promise<SmsMessage[]> {
  if (Platform.OS !== "android") return [];

  const filter: { box: string, indexFrom: number, maxCount?: number } = {
    box: "inbox",
    indexFrom: 0,
  };

  if (maxCount) {
    filter.maxCount = maxCount;
  }

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
