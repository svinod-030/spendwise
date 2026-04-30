export interface VersionCheckResult {
    isUpdateAvailable: boolean;
    latestVersion: string;
    currentVersion: string;
    storeUrl: string;
}
