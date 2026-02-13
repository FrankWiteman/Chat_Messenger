import * as firebaseApp from "firebase/app";
import * as firestore from "firebase/firestore";
import * as firebaseAuth from "firebase/auth";
import * as firebaseDatabase from "firebase/database";
import * as firebaseStorage from "firebase/storage";

const { initializeApp, getApps, getApp } = firebaseApp as any;
const { getFirestore, enableIndexedDbPersistence } = firestore as any;
const { getAuth } = firebaseAuth as any;
const { getDatabase } = firebaseDatabase as any;
const { getStorage } = firebaseStorage as any;

const getInitialConfig = () => {
    // 1. Try environment variables (Securest for development/build)
    // Note: In Vite, env vars must start with VITE_ to be exposed to the client
    const env = (import.meta as any).env;
    if (env && env.VITE_FIREBASE_API_KEY) {
        return {
            apiKey: env.VITE_FIREBASE_API_KEY,
            authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: env.VITE_FIREBASE_APP_ID,
            databaseURL: env.VITE_FIREBASE_DATABASE_URL
        };
    }

    // 2. Try Firebase Hosting Auto-Config (Works when deployed to Firebase Hosting)
    if (typeof window !== 'undefined' && (window as any).FIREBASE_CONFIG_AUTO) {
        return (window as any).FIREBASE_CONFIG_AUTO;
    }
    
    // 3. Last Resort / Mock / Placeholder
    // Do NOT put real production keys here for a public repo.
    return {
        apiKey: "AIzaSy_PLACEHOLDER",
        authDomain: "bbm-reborn.firebaseapp.com",
        projectId: "bbm-reborn",
        storageBucket: "bbm-reborn.appspot.com",
        messagingSenderId: "00000000000",
        appId: "1:00000000000:web:00000000000"
    };
};

const firebaseConfig = getInitialConfig();

let app: any;
let auth: any;
let db: any;
let database: any;
let storage: any;

export const isFirebaseConfigured = () => {
    return !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "AIzaSy_PLACEHOLDER");
};

try {
    if (typeof window !== 'undefined') {
        const apps = getApps();
        app = apps.length === 0 ? initializeApp(firebaseConfig) : getApp();
        
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        
        try {
            database = getDatabase(app);
        } catch (e) {
            console.warn("[BBM] Failed to init DB, checking config...");
        }
        
        enableIndexedDbPersistence(db).catch((err: any) => {
            if (err.code !== 'failed-precondition') {
                console.warn('Persistence failed:', err.code);
            }
        });
        
        if (isFirebaseConfigured()) {
            console.log("[BBM] Firebase Initialized.");
        } else {
            console.warn("[BBM] Firebase running in MOCK mode. Configure .env for real backend.");
        }
    }
} catch (e) {
    console.error("Firebase Init Error:", e);
}

export { auth, db, database, storage };

export const getFirebaseDebugInfo = () => ({
    isConfigured: isFirebaseConfigured(),
    projectId: firebaseConfig.projectId || 'None',
    hasDatabase: !!database,
    dbUrl: firebaseConfig.databaseURL || 'Inferred'
});