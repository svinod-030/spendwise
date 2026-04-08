declare module "react-native-get-sms-android" {
  interface SmsAndroidModule {
    list(
      filter: string,
      failCallback: (error: string) => void,
      successCallback: (count: number, smsList: string) => void
    ): void;
  }

  const SmsAndroid: SmsAndroidModule;
  export default SmsAndroid;
}
