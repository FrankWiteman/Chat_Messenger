
import React, { useState, useRef, useEffect } from 'react';
import { UserStatus, Screen } from '../types';
import type { User } from '../types';
// Fixed: Added missing ArrowLeft import to satisfy dependencies on line 99
import { Camera, ArrowLeft, Copy, Music, MessageSquare, LogOut, Bell, Shield, Settings, HelpCircle, ChevronRight, ChevronLeft, ChevronDown, Check, QrCode, X, Share2, CheckCircle2, Loader } from 'lucide-react';
import { uploadProfilePicture } from '../services/fileService';

interface ProfileProps {
  user: User;
  onUpdateStatus: (status: string, message: string, music: string, mood: string, name?: string, showActivity?: boolean) => void;
  onUpdateAvatar?: (url: string) => void;
  onNavigate: (screen: Screen) => void;
  onBack: () => void;
  onLogout: () => void;
  isIOS?: boolean;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdateStatus, onUpdateAvatar, onNavigate, onBack, onLogout, isIOS }) => {
  const [tempName, setTempName] = useState(user.name);
  const [tempMessage, setTempMessage] = useState(user.statusMessage);
  const [isCopied, setIsCopied] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Auto-sync local state if props change (e.g. from server)
  useEffect(() => {
    setTempName(user.name);
    setTempMessage(user.statusMessage);
  }, [user.name, user.statusMessage]);

  const triggerUpdate = (updates: {
    status?: string, 
    message?: string, 
    music?: string, 
    mood?: string, 
    name?: string, 
    showActivity?: boolean
  }) => {
    onUpdateStatus(
        updates.status ?? user.status,
        updates.message ?? user.statusMessage,
        // Fixed: Mixed '||' and '??' operations require parentheses on lines 43 and 44
        updates.music ?? (user.musicStatus || ''),
        // Fixed: Mixed '||' and '??' operations require parentheses on lines 43 and 44
        updates.mood ?? (user.mood || ''),
        updates.name ?? user.name,
        updates.showActivity ?? user.showActivity
    );
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && onUpdateAvatar) {
          const file = e.target.files[0];
          setIsUploading(true);
          try {
              const url = await uploadProfilePicture(file, user.id);
              onUpdateAvatar(url);
          } catch(e) {
              console.error("Avatar upload failed", e);
              alert("Failed to update avatar. Please try again.");
          } finally {
              setIsUploading(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
          }
      }
  };

  const getStatusColor = (status: UserStatus) => {
      switch(status) {
          case UserStatus.AVAILABLE: return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
          case UserStatus.BUSY: return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
          case UserStatus.AWAY: return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]';
          case UserStatus.DND: return 'bg-red-700';
          default: return 'bg-gray-400';
      }
  };

  const iosHeaderClass = "bg-[#F2F4F8] dark:bg-bbm-darker border-b border-gray-200 dark:border-gray-800 text-slate-900 dark:text-white pt-[calc(8px+env(safe-area-inset-top))] h-[calc(55px+env(safe-area-inset-top))]";
  const androidHeaderClass = "bg-bbm-blue text-white shadow-md h-16 pt-safe";

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=bbm:${user.pin}&bgcolor=ffffff`;

  return (
    <div className={`fixed inset-0 z-50 bg-[#F2F4F8] dark:bg-bbm-darker flex flex-col items-center ${isIOS ? 'animate-ios-slide-in' : 'animate-android-fade-scale'}`}>
      
      <input type="file" ref={fileInputRef} onChange={handleAvatarChange} className="hidden" accept="image/*" />

      <div className={`flex items-end pb-3 px-6 shrink-0 relative z-10 justify-between w-full max-w-screen-2xl mx-auto ${isIOS ? iosHeaderClass : `${androidHeaderClass} items-center pb-0`}`}>
            {isIOS ? (
                <>
                    <button onClick={onBack} className="flex items-center text-bbm-blue -ml-3 active:opacity-50 transition-opacity z-20">
                        <ChevronLeft size={32} />
                        <span className="text-lg leading-none pb-0.5 font-bold">Back</span>
                    </button>
                    <h2 className="text-lg font-bold absolute left-1/2 transform -translate-x-1/2 pb-0.5 w-full text-center pointer-events-none">My Profile</h2>
                    <div className="w-10"></div>
                </>
            ) : (
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 -ml-2 rounded-full active:bg-white/10 mr-2 transition-colors"><ArrowLeft size={24} /></button>
                    <h2 className="text-xl font-bold tracking-tight">My Profile</h2>
          </div>
            )}
      </div>

      <div className="flex-1 w-full max-w-screen-md mx-auto overflow-y-auto p-6 space-y-6 pb-safe no-scrollbar">
        
        <div className="bg-white dark:bg-bbm-card rounded-[2.5rem] p-8 shadow-sm border border-white/60 dark:border-gray-800 flex flex-col items-center text-center relative overflow-hidden transition-all duration-300">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl -z-0 pointer-events-none"></div>
            
            <div className="relative mb-6 group">
                <div className={`w-36 h-36 rounded-full p-1.5 bg-white dark:bg-gray-700 shadow-xl relative overflow-hidden transition-transform duration-500 hover:scale-105 ${isUploading ? 'opacity-40' : ''}`}>
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-full" />
                    {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                            <Loader size={32} className="text-bbm-blue animate-spin" />
                        </div>
                    )}
                </div>
                <button 
                    onClick={() => !isUploading && fileInputRef.current?.click()} 
                    className="absolute bottom-1 right-1 bg-slate-900 text-white p-3 rounded-full shadow-lg border-2 border-white dark:border-gray-800 active:scale-90 transition-all hover:bg-bbm-blue"
                >
                    {isUploading ? <Loader size={20} className="animate-spin" /> : <Camera size={20} />}
                </button>
            </div>

            <div className="w-full space-y-5">
                <div>
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] mb-1.5 block">Display Name</label>
                    <input 
                        value={tempName} 
                        onChange={(e) => setTempName(e.target.value)}
                        onBlur={() => tempName !== user.name && triggerUpdate({ name: tempName })}
                        className="w-full bg-transparent text-3xl font-black text-slate-900 dark:text-white outline-none border-b-2 border-transparent focus:border-bbm-blue transition-all placeholder-gray-300 text-center pb-1" 
                        placeholder="Your Name" 
                    />
                </div>
                <div className="pt-2">
                    <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] mb-3 block">Your PIN</label>
                    <div className="flex items-center justify-center gap-3">
                        <span className="font-mono font-black text-bbm-blue tracking-[0.15em] text-2xl bg-gray-50 dark:bg-black/20 px-6 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 select-all">{user.pin}</span>
                        <button onClick={() => { navigator.clipboard.writeText(user.pin); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }} className="bg-bbm-blue/10 active:bg-bbm-blue/20 text-bbm-blue p-3.5 rounded-2xl transition-all active:scale-90 border border-bbm-blue/30" title="Copy PIN">
                            {isCopied ? <CheckCircle2 size={22} className="text-green-500" /> : <Copy size={22} />}
                            </button>
                        <button onClick={() => setShowQrModal(true)} className="bg-bbm-blue/10 active:bg-bbm-blue/20 text-bbm-blue p-3.5 rounded-2xl transition-all active:scale-90 border border-bbm-blue/30" title="Show QR">
                            <QrCode size={22} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        <div className="bg-white dark:bg-bbm-card rounded-[2.5rem] shadow-sm border border-white/60 dark:border-gray-800 overflow-visible relative z-20 transition-all duration-300">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 relative z-30">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] mb-2.5 block px-1">Availability</label>
                
                <div className="relative">
                    <button 
                        onClick={() => setIsStatusOpen(!isStatusOpen)}
                        className="w-full bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 text-slate-900 dark:text-white font-bold px-5 py-4.5 rounded-3xl outline-none focus:ring-2 focus:ring-bbm-blue/50 transition-all flex items-center justify-between active:bg-gray-100"
                    >
                        <div className="flex items-center">
                             <div className={`w-4 h-4 rounded-full mr-4 ${getStatusColor(user.status)} shadow-md`}></div>
                             <span className="text-lg">{user.status}</span>
                        </div>
                        <ChevronDown size={24} className={`text-gray-400 transition-transform duration-300 ${isStatusOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isStatusOpen && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-white dark:bg-bbm-card border border-gray-100 dark:border-gray-700 rounded-[2rem] shadow-2xl overflow-hidden animate-fade-in origin-top z-50">
                            {Object.values(UserStatus).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => { triggerUpdate({ status: s }); setIsStatusOpen(false); }}
                                    className="w-full flex items-center px-6 py-5 active:bg-gray-50 dark:active:bg-gray-800 transition-colors text-left border-b border-gray-50 dark:border-gray-800 last:border-0"
                                >
                                    <div className={`w-3.5 h-3.5 rounded-full mr-4 ${getStatusColor(s)}`}></div>
                                    <span className={`text-lg font-bold ${user.status === s ? 'text-bbm-blue' : 'text-slate-700 dark:text-gray-200'}`}>{s}</span>
                                    {user.status === s && <Check size={22} className="ml-auto text-bbm-blue" strokeWidth={3} />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 relative z-10">
                <label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.1em] mb-2.5 block px-1">Current Mood</label>
                <div className="flex items-center bg-gray-50 dark:bg-gray-900/50 rounded-[2rem] px-5 border border-gray-200 dark:border-gray-700 focus-within:border-bbm-blue transition-colors">
                    <MessageSquare size={24} className="text-gray-400 mr-4 shrink-0" />
                    <input 
                        value={tempMessage} 
                        onChange={(e) => setTempMessage(e.target.value)}
                        onBlur={() => tempMessage !== user.statusMessage && triggerUpdate({ message: tempMessage })}
                        className="w-full bg-transparent py-5 text-lg font-bold text-slate-900 dark:text-white outline-none placeholder:text-gray-400" 
                        placeholder="What's happening?" 
                    />
                </div>
            </div>
            
            <div className="p-6 flex items-center justify-between active:bg-gray-50 transition-colors cursor-pointer rounded-b-[2.5rem] relative z-10" onClick={() => triggerUpdate({ showActivity: !user.showActivity })}>
                <div className="flex items-center space-x-5">
                    <div className={`p-3 rounded-2xl ${user.showActivity ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'} transition-all`}><Music size={26} /></div>
                    <div><p className="text-lg font-bold text-slate-900 dark:text-white">Music Listening Status</p><p className="text-xs text-gray-500 font-medium">Broadcast what you're currently hearing</p></div>
                </div>
                <div className={`w-14 h-8 rounded-full relative transition-all duration-300 ${user.showActivity ? 'bg-bbm-blue' : 'bg-gray-300 dark:bg-gray-700'}`}><div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full shadow-md transition-transform duration-300 ${user.showActivity ? 'translate-x-6' : 'translate-x-0'}`}></div></div>
            </div>
        </div>

        <div className="bg-white dark:bg-bbm-card rounded-[2.5rem] shadow-sm border border-white/60 dark:border-gray-800 overflow-hidden relative z-0 transition-all duration-300">
             <MenuRow icon={Bell} label="Notifications" onClick={() => onNavigate(Screen.NOTIFICATIONS)} />
             <MenuRow icon={Shield} label="Privacy & Security" onClick={() => onNavigate(Screen.PRIVACY)} />
             <MenuRow icon={Settings} label="Global Settings" onClick={() => onNavigate(Screen.SETTINGS)} />
             <MenuRow icon={HelpCircle} label="Help & Feedback" onClick={() => onNavigate(Screen.HELP)} isLast />
        </div>

        <button onClick={onLogout} className="w-full bg-white dark:bg-bbm-card border-2 border-red-100 dark:border-red-900/30 text-red-500 font-black py-5 rounded-[2rem] flex items-center justify-center space-x-3 active:bg-red-50 transition-all shadow-sm mb-4">
            <LogOut size={24} /><span>Sign Out of BBM</span>
        </button>
      </div>

      {showQrModal && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-8 animate-fade-in">
              <div className="bg-white dark:bg-bbm-card rounded-[3rem] p-10 max-sm w-full flex flex-col items-center shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] relative animate-slide-up border border-white/10">
                  <button onClick={() => setShowQrModal(false)} className="absolute top-6 right-6 text-gray-400 hover:text-bbm-blue transition-colors"><X size={32} /></button>
                  
                  <div className="w-24 h-24 rounded-full p-1.5 bg-gradient-to-tr from-bbm-blue to-purple-500 shadow-2xl mb-8 -mt-20">
                      <img src={user.avatarUrl} alt="QR Avatar" className="w-full h-full rounded-full object-cover border-4 border-white dark:border-bbm-card shadow-inner" />
                  </div>
                  
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{user.name}</h3>
                  <p className="text-bbm-blue font-mono font-black tracking-[0.2em] mb-8 text-xl px-4 py-1.5 bg-bbm-blue/5 rounded-full">{user.pin}</p>
                  
                  <div className="bg-white p-5 rounded-[2.5rem] shadow-inner border border-gray-200 mb-8 overflow-hidden">
                      <img src={qrUrl} alt="QR Code" className="w-56 h-56 mix-blend-multiply" />
                  </div>
                  
                  <div className="flex gap-4 w-full">
                      <button 
                          onClick={() => { if(navigator.share) navigator.share({title: 'Add me on BBM', text: `My PIN: ${user.pin}`, url: window.location.origin}); }}
                          className="flex-1 bg-bbm-blue text-white py-5 rounded-3xl font-black flex items-center justify-center gap-3 active:bg-bbm-blue/90 shadow-xl shadow-bbm-blue/30 transition-all active:scale-95"
                      >
                          <Share2 size={20} /> Share
                      </button>
                      <button 
                          onClick={() => setShowQrModal(false)}
                          className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white py-5 rounded-3xl font-black active:bg-gray-200 transition-all active:scale-95"
                      >
                          Close
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

const MenuRow = ({ icon: Icon, label, onClick, isLast }: any) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-6 active:bg-gray-50 transition-colors ${!isLast ? 'border-b border-gray-50 dark:border-gray-800' : ''}`}>
        <div className="flex items-center space-x-5">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-bbm-blue"><Icon size={24} /></div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">{label}</span>
        </div>
        <ChevronRight size={22} className="text-gray-300 dark:text-gray-600" />
    </button>
);

export default Profile;
