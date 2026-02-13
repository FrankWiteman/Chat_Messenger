
import React, { useState } from 'react';
import { ArrowLeft, Bell, Volume2, EyeOff, Shield, Moon, Download, HelpCircle, MessageSquare, Power, Save, ChevronLeft, Clock, Wifi, WifiOff, BellOff, AlertCircle } from 'lucide-react';
import type { User } from '../types';
import { getFirebaseDebugInfo } from '../services/firebase';
import { useNotifications } from '../hooks/useNotifications';
import { playPingSound } from '../utils/sound';

interface SubScreenProps {
  onBack: () => void;
  title: string;
  isIOS?: boolean;
}

const ScreenLayout: React.FC<SubScreenProps & { children: React.ReactNode }> = ({ onBack, title, children, isIOS }) => {
    const iosHeaderClass = "bg-[#F2F4F8] dark:bg-bbm-darker border-b border-gray-200 dark:border-gray-800 text-slate-900 dark:text-white pt-[calc(4px+env(safe-area-inset-top))] h-[calc(44px+env(safe-area-inset-top))]";
    const androidHeaderClass = "bg-white dark:bg-bbm-card border-b border-gray-200 dark:border-gray-800 h-16 pt-safe";
    
    return (
        <div className={`fixed inset-0 z-50 bg-[#F2F4F8] dark:bg-bbm-darker flex flex-col ${isIOS ? 'animate-ios-slide-in' : 'animate-android-fade-scale'}`}>
            <div className={`flex items-center px-4 shrink-0 justify-between ${isIOS ? iosHeaderClass : androidHeaderClass}`}>
                {isIOS ? (
                    <>
                        <button onClick={onBack} className="flex items-center text-bbm-blue -ml-2 z-10"><ChevronLeft size={28} /><span className="text-base">Back</span></button>
                        <h2 className="text-base font-semibold absolute left-1/2 transform -translate-x-1/2">{title}</h2>
                        <div className="w-10"></div>
                    </>
                ) : (
                    <div className="flex items-center w-full">
                         <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 mr-2 text-slate-700 dark:text-white transition-colors"><ArrowLeft size={24} /></button>
                         <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{title}</h2>
                    </div>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-safe">
                {children}
            </div>
        </div>
    );
};

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <div className="px-2 pt-2 pb-1">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
    </div>
);

const ToggleItem: React.FC<{ label: string; icon: React.ElementType; value: boolean; onChange: () => void; desc?: string; colorClass?: string; disabled?: boolean }> = ({ label, icon: Icon, value, onChange, desc, colorClass = "text-bbm-blue", disabled }) => (
    <div className={`bg-white dark:bg-bbm-card p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="flex items-start space-x-4 pr-4">
            <div className={`p-2.5 rounded-xl ${colorClass === 'text-bbm-blue' ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-gray-50 dark:bg-gray-800'} ${colorClass}`}>
                <Icon size={20} />
            </div>
            <div>
                <p className="font-bold text-slate-900 dark:text-white text-sm">{label}</p>
                {desc && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{desc}</p>}
            </div>
        </div>
        <button 
            onClick={onChange}
            className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${value ? 'bg-bbm-blue' : 'bg-gray-300 dark:bg-gray-700'}`}
        >
            <div className={`absolute top-1 left-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    </div>
);

export const NotificationsScreen: React.FC<SubScreenProps & { userId?: string }> = (props) => {
    // Sound Preference: 'custom' (BBM) or 'system' (Device Default)
    const [soundPref, setSoundPref] = useState<'custom' | 'system'>(() => {
        return (localStorage.getItem('bbm_sound_preference') as 'custom' | 'system') || 'custom';
    });
    
    const [inAppSound, setInAppSound] = useState(true);
    
    // Notifications Hook
    const { isSupported, permission, requestPermission, isEnabled } = useNotifications(props.userId);

    const toggleSoundPref = () => {
        const newPref = soundPref === 'custom' ? 'system' : 'custom';
        setSoundPref(newPref);
        localStorage.setItem('bbm_sound_preference', newPref);
        
        // Preview the sound if switching to custom
        if (newPref === 'custom') {
            playPingSound();
        }
    };

    const getPermissionStatusText = () => {
        if (!isSupported) return "Not Supported by Browser";
        if (permission === 'granted') return "Enabled";
        if (permission === 'denied') return "Blocked in Browser Settings";
        return "Not Enabled";
    };

    return (
        <ScreenLayout {...props}>
            
            {/* Push Notifications Status Card */}
            <div className={`rounded-2xl p-5 border shadow-sm mb-2 ${isEnabled ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30' : 'bg-white dark:bg-bbm-card border-gray-200 dark:border-gray-800'}`}>
                <div className="flex items-center gap-4 mb-3">
                    <div className={`p-3 rounded-full ${isEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {isEnabled ? <Bell size={24} /> : (permission === 'denied' ? <BellOff size={24}/> : <AlertCircle size={24}/>)}
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Push Notifications</h3>
                        <p className={`text-xs font-bold uppercase tracking-wider ${isEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                            {getPermissionStatusText()}
                        </p>
                    </div>
                </div>
                
                {isSupported && permission === 'default' && (
                    <button 
                        onClick={() => requestPermission()}
                        className="w-full py-3 bg-bbm-blue text-white font-bold rounded-xl text-sm shadow-lg shadow-bbm-blue/20 active:scale-[0.98] transition-all"
                    >
                        Enable Notifications
                    </button>
                )}
            </div>

            <SectionHeader title="Sound & Haptics" />
            
            {/* Custom Sound Toggle */}
            <ToggleItem 
                label="BBM Classic Sound" 
                icon={Volume2} 
                value={soundPref === 'custom'} 
                onChange={toggleSoundPref} 
                desc={soundPref === 'custom' ? "Using classic BBM PING sound" : "Using device default sound"} 
            />
            
            <ToggleItem 
                label="In-App Sounds" 
                icon={MessageSquare} 
                value={inAppSound} 
                onChange={() => setInAppSound(!inAppSound)} 
                desc="Sounds while using the app" 
            />
        </ScreenLayout>
    );
};

interface PrivacyScreenProps extends SubScreenProps {
    currentUser?: User;
    onUpdateUser?: (user: User) => void;
}

export const PrivacyScreen: React.FC<PrivacyScreenProps> = (props) => {
    const { currentUser, onUpdateUser } = props;
    const [music, setMusic] = useState(true);
    
    const [localLastSeen, setLocalLastSeen] = useState(true);
    const showLastSeen = currentUser?.showLastSeen ?? localLastSeen;

    const toggleLastSeen = () => {
        if (currentUser && onUpdateUser) {
            onUpdateUser({ ...currentUser, showLastSeen: !showLastSeen });
        } else {
            setLocalLastSeen(!localLastSeen);
        }
    };

    return (
        <ScreenLayout {...props}>
            <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl flex items-start space-x-3 mb-2 border border-blue-100 dark:border-blue-900/30">
                <Shield className="text-bbm-blue shrink-0 mt-0.5" size={20} />
                <p className="text-xs text-slate-700 dark:text-blue-200 leading-relaxed font-medium">Your Privacy is our priority. Your PIN is unique to you.</p>
            </div>
            <SectionHeader title="Visibility" />
            <ToggleItem 
                label="Last Seen" 
                icon={Clock} 
                value={showLastSeen} 
                onChange={toggleLastSeen} 
                desc="Allow contacts to see when you were last active" 
            />
            <ToggleItem label="Share Listening To" icon={Volume2} value={music} onChange={() => setMusic(!music)} desc="Show music status in feeds" />
        </ScreenLayout>
    );
};

export const SettingsScreen: React.FC<SubScreenProps & {
    isDarkMode: boolean; 
    toggleTheme: () => void; 
    enterToSend: boolean; 
    setEnterToSend: (val: boolean) => void;
    onDeleteAccount?: () => void;
    currentUser?: User;
    onUpdateUser?: (user: User) => void;
}> = (props) => {
    const { currentUser, onUpdateUser } = props;
    const [saveChat, setSaveChat] = useState(true);
    const [autoDownload, setAutoDownload] = useState(false);
    
    // Default to true if undefined
    const [localReadReceipts, setLocalReadReceipts] = useState(true);
    const enableReadReceipts = currentUser?.enableReadReceipts ?? localReadReceipts;

    const toggleReadReceipts = () => {
        if (currentUser && onUpdateUser) {
            onUpdateUser({ ...currentUser, enableReadReceipts: !enableReadReceipts });
        } else {
            setLocalReadReceipts(!enableReadReceipts);
        }
    };

    return (
        <ScreenLayout {...props}>
             <SectionHeader title="Appearance" />
             <ToggleItem label="Dark Mode" icon={Moon} value={props.isDarkMode} onChange={props.toggleTheme} desc="Switch between Light and Dark themes" colorClass="text-purple-500" />
             
             <SectionHeader title="Chat Settings" />
             <ToggleItem 
                label="Read Receipts" 
                icon={EyeOff} 
                value={enableReadReceipts} 
                onChange={toggleReadReceipts} 
                desc="Show 'R' when you read messages. Turning off hides it for others too." 
             />
             <ToggleItem label="Enter to Send" icon={MessageSquare} value={props.enterToSend} onChange={() => props.setEnterToSend(!props.enterToSend)} desc="Send message on Enter key" />
             <ToggleItem label="Save Chat History" icon={Save} value={saveChat} onChange={() => setSaveChat(!saveChat)} desc="Keep messages after closing app" />
             
             <SectionHeader title="Data" />
             <ToggleItem label="Auto-Download Media" icon={Download} value={autoDownload} onChange={() => setAutoDownload(!autoDownload)} desc="Download photos automatically on Wi-Fi" />
             
             <SectionHeader title="Account" />
             <button 
                onClick={props.onDeleteAccount}
                className="w-full bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center justify-center space-x-2 text-red-600 dark:text-red-400 font-bold text-sm mt-2 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
             >
                 <Power size={18} /><span>Delete Account</span>
             </button>
        </ScreenLayout>
    );
};

export const HelpScreen: React.FC<SubScreenProps> = (props) => {
    const debugInfo = getFirebaseDebugInfo();
    const isLive = debugInfo.isConfigured;

    return (
        <ScreenLayout {...props}>
             <div className="bg-gradient-to-br from-bbm-blue to-blue-600 rounded-2xl p-6 text-white shadow-lg mb-6 relative overflow-hidden">
                 <div className="relative z-10">
                    <h3 className="text-xl font-extrabold mb-1">BBM Reborn</h3>
                    <p className="text-blue-100 text-sm font-medium opacity-90">Version 1.0.0 (Beta)</p>
                 </div>
                 <HelpCircle className="absolute -bottom-4 -right-4 text-white/20 w-32 h-32" />
             </div>
             
             <div className={`p-4 rounded-2xl border flex items-start gap-3 ${isLive ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-900/30' : 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-900/30'}`}>
                 {isLive ? <Wifi className="text-green-600 shrink-0 mt-1" /> : <WifiOff className="text-orange-500 shrink-0 mt-1" />}
                 <div className="flex-1 min-w-0">
                     <h4 className={`font-bold text-sm ${isLive ? 'text-green-700 dark:text-green-400' : 'text-orange-700 dark:text-orange-400'}`}>
                         {isLive ? 'Online - Global Directory' : 'Offline - Local Simulation'}
                     </h4>
                     <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-2">
                         {isLive 
                            ? 'Connected to Firebase. You can find others by PIN.' 
                            : 'No server connection. You can only simulate adding local mock users.'}
                     </p>
                 </div>
             </div>

             <SectionHeader title="FAQ" />
             <div className="bg-white dark:bg-bbm-card rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm space-y-1">
                 <div className="p-4 border-b border-gray-100 dark:border-gray-800"><h4 className="font-bold text-sm text-slate-900 dark:text-white">What is a PIN?</h4><p className="text-xs text-gray-500 mt-1">A unique 8-character ID used to add friends without sharing phone numbers.</p></div>
                 <div className="p-4"><h4 className="font-bold text-sm text-slate-900 dark:text-white">Is this official?</h4><p className="text-xs text-gray-500 mt-1">No, this is a fan-made recreation using modern web technologies.</p></div>
             </div>
        </ScreenLayout>
    );
};
