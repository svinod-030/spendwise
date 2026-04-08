import { getFreshAccessToken } from './googleAuth';
import { useAuthStore } from '../store/useAuthStore';
import { getDb } from '../db/database';

const BACKUP_FOLDER_NAME = 'Expense Tracker Backups';
const BACKUP_FILE_NAME = 'expense_data_backup.json';

const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let token = useAuthStore.getState().accessToken;

    if (!token) {
        token = await getFreshAccessToken();
        if (token) {
            useAuthStore.getState().setUser(useAuthStore.getState().user, token);
        }
    }

    const setHeaders = (t: string | null) => ({
        ...options.headers,
        Authorization: `Bearer ${t}`,
        'Accept': 'application/json',
    });

    let response = await fetch(url, { ...options, headers: setHeaders(token) });

    // if 401, try to refresh token once
    if (response.status === 401) {
        console.log('Access token expired, refreshing...');
        const newToken = await getFreshAccessToken();
        if (newToken) {
            useAuthStore.getState().setUser(useAuthStore.getState().user, newToken);
            response = await fetch(url, { ...options, headers: setHeaders(newToken) });
        }
    }

    if (!response.ok) {
        try {
            const errorData = await response.clone().json();
            console.error(`API Error (${response.status}) for ${url}:`, JSON.stringify(errorData, null, 2));
        } catch (e) {
            const text = await response.clone().text();
            console.error(`API Error (${response.status}) for ${url}:`, text);
        }
    }

    return response;
};

export const getBackupData = async () => {
    const db = await getDb();
    const transactions = await db.getAllAsync("SELECT * FROM transactions");
    const categories = await db.getAllAsync("SELECT * FROM categories");
    return JSON.stringify({ transactions, categories }, null, 2);
};

export const backupToDrive = async () => {
    try {
        // 1. Get the data to backup
        const expenseData = await getBackupData();
        
        // 2. Find or Create Backup Folder
        let folderId = await findBackupFolder();
        if (!folderId) {
            console.log('Creating backup folder');
            folderId = await createBackupFolder();
        }

        if (!folderId) {
            throw new Error('Failed to create or find backup folder');
        }

        // 3. Find existing backup file in that folder
        const existingFileId = await findExistingBackupFile(folderId);

        // 4. Upload/Update file
        if (existingFileId) {
            await updateBackupFile(existingFileId, expenseData);
        } else {
            await createBackupFile(folderId, expenseData);
        }

        console.log('Backup successful');
        return true;
    } catch (error) {
        console.error('Backup failed:', error);
        return false;
    }
};

export const restoreFromDrive = async () => {
    try {
        const folderId = await findBackupFolder();
        if (!folderId) return null;

        const fileId = await findExistingBackupFile(folderId);
        if (!fileId) return null;

        const response = await authenticatedFetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
        );

        if (!response.ok) {
            console.error('Failed to download backup file');
            return null;
        }

        const data = await response.text();
        return data;
    } catch (error) {
        console.error('Restore failed:', error);
        return null;
    }
};

const findBackupFolder = async () => {
    try {
        const query = `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        const response = await authenticatedFetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`
        );
        const data = await response.json();
        return data.files && data.files.length > 0 ? data.files[0].id : null;
    } catch (error) {
        console.error('Failed to find backup folder:', error);
        return null;
    }
};


const createBackupFolder = async () => {
    try {
        const response = await authenticatedFetch('https://www.googleapis.com/drive/v3/files', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: BACKUP_FOLDER_NAME,
                mimeType: 'application/vnd.google-apps.folder',
            }),
        });
        const data = await response.json();
        return data.id;
    } catch (error) {
        console.error('Failed to create backup folder:', error);
        return null;
    }
};

const findExistingBackupFile = async (folderId: string) => {
    const query = `name='${BACKUP_FILE_NAME}' and '${folderId}' in parents and trashed=false`;
    const response = await authenticatedFetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
};


const createBackupFile = async (folderId: string, data: string) => {
    // 1. Create file with metadata
    const response = await authenticatedFetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: BACKUP_FILE_NAME,
            parents: [folderId],
        }),
    });

    if (!response.ok) return false;
    const file = await response.json();

    // 2. Upload the data content
    return await updateBackupFile(file.id, data);
};

const updateBackupFile = async (fileId: string, data: string) => {
    const response = await authenticatedFetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: data,
        }
    );
    return response.ok;
};
