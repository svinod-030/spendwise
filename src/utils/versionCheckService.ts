import VersionCheck from 'react-native-version-check-expo';
import { APP_CONFIG } from './constants';
import { Platform } from 'react-native';

export interface VersionCheckResult {
    isUpdateAvailable: boolean;
    latestVersion: string;
    currentVersion: string;
    storeUrl: string;
}

export const checkVersion = async (): Promise<VersionCheckResult> => {
    try {
        const currentVersion = VersionCheck.getCurrentVersion();
        const latestVersion = await VersionCheck.getLatestVersion({
            provider: Platform.select({
                android: 'playStore',
                ios: 'appStore',
                default: 'playStore',
            }),
            packageName: APP_CONFIG.ANDROID_PACKAGE_NAME,
            appId: APP_CONFIG.IOS_APP_ID,
        });

        const isUpdateAvailable = await VersionCheck.needUpdate({
            currentVersion,
            latestVersion,
        });

        const storeUrl = Platform.select({
            android: APP_CONFIG.STORE_URL_ANDROID,
            ios: APP_CONFIG.STORE_URL_IOS,
            default: '',
        });

        return {
            isUpdateAvailable: !!isUpdateAvailable?.isNeeded,
            latestVersion: latestVersion || currentVersion,
            currentVersion,
            storeUrl: storeUrl || '',
        };
    } catch (error) {
        console.error('Error checking for version update:', error);
        return {
            isUpdateAvailable: false,
            latestVersion: APP_CONFIG.APP_VERSION,
            currentVersion: APP_CONFIG.APP_VERSION,
            storeUrl: '',
        };
    }
};
