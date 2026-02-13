
import { UserStatus } from '../types';
import type { User } from '../types';

interface AuthRecord {
    username: string;
    email: string;
    passwordHash: string; 
    pin: string;
    failedAttempts: number;
    lockoutUntil: number | null;
    avatarUrl?: string;
    status?: UserStatus;
    statusMessage?: string;
    musicStatus?: string;
    mood?: string;
    showActivity?: boolean;
    showLastSeen?: boolean;
}

const DB_KEY = 'bbm_auth_db';
const TRUSTED_DEVICE_KEY = 'bbm_trusted_device';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getDb = (): AuthRecord[] => {
    const data = localStorage.getItem(DB_KEY);
    return data ? JSON.parse(data) : [];
};

const saveDb = (db: AuthRecord[]) => {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
};

const generatePin = () => {
    return Math.floor(Math.random() * 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0');
};

export const registerUser = async (username: string, email: string, password: string): Promise<{success: boolean, message?: string, user?: User}> => {
    await delay(800);
    const db = getDb();
    
    if (db.find(u => u.username.toLowerCase() === username.toLowerCase())) {
        return { success: false, message: 'Username already taken' };
    }
    if (db.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { success: false, message: 'Email already registered' };
    }

    const pin = generatePin();
    const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
    
    const newUser: AuthRecord = {
        username,
        email,
        passwordHash: password, 
        pin,
        failedAttempts: 0,
        lockoutUntil: null,
        avatarUrl: defaultAvatar,
        status: UserStatus.AVAILABLE,
        statusMessage: 'Just joined BBM Reborn!',
        musicStatus: '',
        mood: '',
        showActivity: true,
        showLastSeen: true
    };

    db.push(newUser);
    saveDb(db);

    const appUser: User = {
        id: pin, 
        name: username,
        pin: pin,
        email: email,
        avatarUrl: defaultAvatar,
        status: UserStatus.AVAILABLE,
        statusMessage: 'Just joined BBM Reborn!',
        lastActive: Date.now(),
        showActivity: true,
        showLastSeen: true
    };

    localStorage.setItem('bbm_user', JSON.stringify(appUser));
    localStorage.setItem(TRUSTED_DEVICE_KEY, 'true');

    return { success: true, user: appUser };
};

export const loginUser = async (username: string, password: string): Promise<{success: boolean, message?: string, requires2FA?: boolean, email?: string}> => {
    await delay(800);
    const db = getDb();
    const recordIndex = db.findIndex(u => u.username.toLowerCase() === username.toLowerCase());

    if (recordIndex === -1) {
        return { success: false, message: 'Invalid username or password' };
    }

    const record = db[recordIndex];

    if (record.lockoutUntil && Date.now() < record.lockoutUntil) {
        const remaining = Math.ceil((record.lockoutUntil - Date.now()) / 60000);
        return { success: false, message: `Account locked. Try again in ${remaining} minutes.` };
    }

    if (record.passwordHash !== password) {
        record.failedAttempts += 1;
        let lockMsg = '';
        
        if (record.failedAttempts >= 10) {
            const lockLevel = record.failedAttempts - 9; 
            let durationMinutes = 1;
            if (lockLevel > 1) durationMinutes = 5;
            if (lockLevel > 2) durationMinutes = 15;
            if (lockLevel > 3) durationMinutes = 60;

            record.lockoutUntil = Date.now() + (durationMinutes * 60 * 1000);
            lockMsg = ` Account locked for ${durationMinutes} minutes.`;
        }

        db[recordIndex] = record;
        saveDb(db);
        return { success: false, message: `Invalid credentials.${lockMsg}` };
    }

    record.failedAttempts = 0;
    record.lockoutUntil = null;
    db[recordIndex] = record;
    saveDb(db);

    const isTrustedDevice = localStorage.getItem(TRUSTED_DEVICE_KEY) === 'true';

    return { success: true, requires2FA: !isTrustedDevice, email: record.email };
};

export const send2FACode = async (email: string): Promise<string> => {
    await delay(1000);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[BBM BACKEND] 2FA CODE for ${email}: ${code}`);
    return code;
};

export const trustDevice = () => {
    localStorage.setItem(TRUSTED_DEVICE_KEY, 'true');
};

export const requestPasswordReset = async (email: string): Promise<boolean> => {
    await delay(1000);
    const db = getDb();
    const user = db.find(u => u.email.toLowerCase() === email.toLowerCase());
    return !!user;
};

export const getUserProfile = (username: string): User | null => {
    const db = getDb();
    const record = db.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!record) return null;
    
    return {
        id: record.pin,
        name: record.username,
        pin: record.pin,
        email: record.email,
        avatarUrl: record.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${record.username}`,
        status: record.status || UserStatus.AVAILABLE,
        statusMessage: record.statusMessage || 'Using BBM Reborn',
        musicStatus: record.musicStatus,
        mood: record.mood,
        showActivity: record.showActivity ?? true,
        showLastSeen: record.showLastSeen ?? true,
        lastActive: Date.now()
    };
};

export const updateUserInDb = (user: User) => {
    const db = getDb();
    const index = db.findIndex(u => u.pin === user.pin);
    if (index !== -1) {
        db[index] = {
            ...db[index],
            avatarUrl: user.avatarUrl,
            status: user.status,
            statusMessage: user.statusMessage,
            musicStatus: user.musicStatus,
            mood: user.mood,
            showActivity: user.showActivity,
            showLastSeen: user.showLastSeen
        };
        saveDb(db);
    }
};
