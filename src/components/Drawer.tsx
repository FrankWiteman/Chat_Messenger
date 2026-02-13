
import React from 'react';
import { UserStatus, Screen } from '../types';
import type { User } from '../types';
import { X, Settings, Shield, HelpCircle, LogOut, Music } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUpdateStatus: (status: UserStatus) => void;
  isDarkMode: boolean;
  onNavigate: (screen: Screen) => void;
}

const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, currentUser, onUpdateStatus, onNavigate }) => {
  const getOfflineDuration = () => {
    if (!currentUser.lastActive) return 'Just now';
    const diff = Date.now() - currentUser.lastActive;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days} days`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours} hours`;
    return 'Just now';
  };

  const handleNav = (screen: Screen) => {
      onNavigate(screen);
      onClose();
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />
      
      <div className={`fixed top-0 left-0 bottom-0 w-[80%] max-w-[320px] bg-white dark:bg-bbm-darker shadow-2xl z-50 transition-transform duration-300 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
            <div className="p-6 bg-bbm-light dark:bg-bbm-card border-b border-gray-200 dark:border-gray-800 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-bbm-blue">
                    <X size={24} />
                </button>
                <div className="flex items-center space-x-4 mb-4">
                    <img src={currentUser.avatarUrl} alt="Profile" className="w-16 h-16 rounded-2xl border-2 border-white dark:border-gray-700 shadow-lg object-cover" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{currentUser.name}</h2>
                        <p className="text-sm text-gray-500 font-mono tracking-wider">{currentUser.pin}</p>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-black/20 p-3 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm mb-1">
                    {currentUser.showActivity && currentUser.musicStatus ? (
                         <div className="flex items-center gap-2 text-bbm-blue font-medium text-sm">
                             <Music size={14} className="shrink-0 animate-pulse" />
                             <span className="truncate">{currentUser.musicStatus}</span>
                         </div>
                    ) : (
                         <div className="text-sm text-slate-600 dark:text-gray-300 italic truncate">
                            "{currentUser.statusMessage}"
                         </div>
                    )}
                </div>

                {currentUser.mood && (
                    <div className="inline-flex items-center space-x-2 text-xs font-medium text-gray-400 mt-2">
                        <span>Mood:</span>
                        <span className="text-base">{currentUser.mood}</span>
                    </div>
                )}
            </div>

            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-2">Set Status</h3>
                <div className="space-y-1">
                    {[UserStatus.AVAILABLE, UserStatus.BUSY, UserStatus.AWAY, UserStatus.DND, UserStatus.OFFLINE].map((status) => (
                        <button 
                            key={status}
                            onClick={() => onUpdateStatus(status)}
                            className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                currentUser.status === status 
                                ? 'bg-bbm-blue/10 text-bbm-blue border border-bbm-blue/20' 
                                : 'text-slate-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                        >
                            <span className={`w-2.5 h-2.5 rounded-full mr-3 ${
                                status === UserStatus.AVAILABLE ? 'bg-green-500' :
                                status === UserStatus.BUSY ? 'bg-red-500' :
                                status === UserStatus.AWAY ? 'bg-yellow-500' :
                                status === UserStatus.DND ? 'bg-red-700' : 'bg-gray-400'
                            }`}></span>
                            <span className="flex-1 text-left">{status}</span>
                            {status === UserStatus.OFFLINE && currentUser.status === UserStatus.OFFLINE && (
                                <span className="text-xs text-gray-400">{getOfflineDuration()}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                 <button onClick={() => handleNav(Screen.SETTINGS)} className="w-full flex items-center space-x-3 px-3 py-3 text-slate-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
                     <Settings size={20} className="text-gray-400" />
                     <span>Settings</span>
                 </button>
                 <button onClick={() => handleNav(Screen.PRIVACY)} className="w-full flex items-center space-x-3 px-3 py-3 text-slate-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
                     <Shield size={20} className="text-gray-400" />
                     <span>Privacy & Security</span>
                 </button>
                 <button onClick={() => handleNav(Screen.HELP)} className="w-full flex items-center space-x-3 px-3 py-3 text-slate-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
                     <HelpCircle size={20} className="text-gray-400" />
                     <span>Help & Support</span>
                 </button>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-800">
                <button className="w-full flex items-center justify-center space-x-2 text-red-500 p-3 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors">
                    <LogOut size={18} />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
      </div>
    </>
  );
};

export default Drawer;
