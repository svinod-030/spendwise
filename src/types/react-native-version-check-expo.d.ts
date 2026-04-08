declare module 'react-native-version-check-expo' {
  export interface GetLatestVersionOptions {
    provider?: string | (() => string);
    packageName?: string;
    appId?: string;
  }

  export interface NeedUpdateOptions {
    currentVersion?: string;
    latestVersion?: string;
    depth?: number;
    forceUpdate?: boolean;
  }

  export interface NeedUpdateResult {
    isNeeded: boolean;
    currentVersion: string;
    latestVersion: string;
  }

  export default class VersionCheck {
    static getCurrentVersion(): string;
    static getLatestVersion(options?: GetLatestVersionOptions): Promise<string>;
    static needUpdate(options?: NeedUpdateOptions): Promise<NeedUpdateResult | null>;
  }
}
