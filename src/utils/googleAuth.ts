import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_CONFIG } from './constants';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from './firebase';

// Configure Google Sign-in
GoogleSignin.configure({
    webClientId: GOOGLE_CONFIG.webClientId,
    offlineAccess: true,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

export const getFreshAccessToken = async () => {
    try {
        let tokens = await GoogleSignin.getTokens();

        // If no token or potentially invalid, try silent sign in to refresh
        if (!tokens.accessToken) {
            console.log('No access token found, signing in silently...');
            const userInfo = await GoogleSignin.signInSilently();
            if (userInfo.data?.user) {
                tokens = await GoogleSignin.getTokens();
            }
        }

        return tokens.accessToken;
    } catch (error) {
        console.log('Error getting tokens, attempting silent sign-in...', error);
        try {
            const userInfo = await GoogleSignin.signInSilently();
            if (userInfo.data?.user) {
                const tokens = await GoogleSignin.getTokens();
                return tokens.accessToken;
            }
        } catch (silentError) {
            console.error('Silent sign-in failed:', silentError);
        }
        return null;
    }
};


export const signInWithGoogle = async () => {
    try {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();

        // Extract what we need for our store
        if (userInfo.data?.user && userInfo.data.idToken) {
            // 1. Create a Firebase credential
            const credential = GoogleAuthProvider.credential(userInfo.data.idToken);
            
            // 2. Sign in to Firebase Auth
            const firebaseUserCredential = await signInWithCredential(auth, credential);
            const firebaseUser = firebaseUserCredential.user;

            const accessToken = await getFreshAccessToken();

            return {
                user: {
                    id: firebaseUser.uid, // Always use Firebase UID for security rules
                    email: firebaseUser.email || userInfo.data.user.email,
                    name: firebaseUser.displayName || userInfo.data.user.name || '',
                    picture: firebaseUser.photoURL || userInfo.data.user.photo || undefined,
                },
                accessToken
            };
        }
        return null;

    } catch (error: any) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            console.log('User cancelled the login flow');
        } else if (error.code === statusCodes.IN_PROGRESS) {
            console.log('Sign in is in progress already');
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            console.log('Play services not available or outdated');
        } else {
            console.error('Some other error happened:', error);
        }
        throw error;
    }
};

export const signOutGoogle = async () => {
    try {
        await GoogleSignin.signOut();
    } catch (error) {
        console.error('Error signing out:', error);
    }
};

export const getCurrentUser = async () => {
    try {
        const userInfo = await GoogleSignin.getCurrentUser();
        return userInfo;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
};
