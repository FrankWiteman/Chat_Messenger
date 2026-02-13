
import { auth, db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import * as firebaseAuth from "firebase/auth";
import { UserStatus } from '../types';
import type { User } from '../types';

// Cast to any to avoid "Module has no exported member" errors
const { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, deleteUser } = firebaseAuth as any;

export const generatePin = () => {
    return Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0');
};

export const fbRegister = async (username: string, email: string, password: string): Promise<{success: boolean, message?: string, user?: User}> => {
    if (!auth || !db) {
        return { success: false, message: "System Error: Database connection not established." };
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;
        const pin = generatePin();
        
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

        const newUserProfile: User = {
            id: fbUser.uid,
            name: username,
            email: email,
            pin: pin,
            avatarUrl: avatarUrl,
            status: UserStatus.AVAILABLE,
            statusMessage: 'Using BBM Reborn',
            showActivity: true,
            showLastSeen: true,
            lastActive: Date.now()
        };

        await setDoc(doc(db, "users", fbUser.uid), newUserProfile);
        await updateProfile(fbUser, { displayName: username, photoURL: avatarUrl });

        return { success: true, user: newUserProfile };

    } catch (error: any) {
        console.error("Firebase Registration Error:", error);
        if (error.code === 'auth/api-key-not-valid' || error.message?.includes('api-key-not-valid')) {
            return { success: false, message: "Invalid API Key. Please configure connection." };
        }
        return { success: false, message: error.message };
    }
};

export const fbLogin = async (email: string, password: string): Promise<{success: boolean, message?: string, user?: User}> => {
    if (!auth || !db) {
        return { success: false, message: "System Error: Database connection not established." };
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const fbUser = userCredential.user;

        const docRef = doc(db, "users", fbUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            // Double check pin exists
            if (!userData.pin) {
                userData.pin = generatePin();
                await updateDoc(docRef, { pin: userData.pin });
            }
            return { success: true, user: userData };
        } else {
             return { success: false, message: "User profile not found." };
        }
    } catch (error: any) {
        if (error.code === 'auth/api-key-not-valid') {
            return { success: false, message: "Invalid API Key. Please configure connection." };
        }
        return { success: false, message: error.message };
    }
};

export const fbLogout = async () => {
    if (auth) await signOut(auth);
};

export const fbUpdateUser = async (user: User) => {
    if (db) {
        try {
            const userRef = doc(db, "users", user.id);
            await updateDoc(userRef, { ...user, lastActive: Date.now() });
        } catch(e) { console.error(e); }
    }
};

export const deleteUserAccount = async (): Promise<{success: boolean, message?: string}> => {
    if (!auth || !auth.currentUser) return { success: false, message: "No user logged in" };
    try {
        const uid = auth.currentUser.uid;
        if (db) {
             // Delete user document from firestore
             await deleteDoc(doc(db, "users", uid));
        }
        // Delete auth user
        await deleteUser(auth.currentUser);
        return { success: true };
    } catch (error: any) {
        console.error("Delete Account Error:", error);
        return { success: false, message: error.message };
    }
};
