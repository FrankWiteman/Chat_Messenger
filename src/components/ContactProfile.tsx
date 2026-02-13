import React, { useState, useEffect } from 'react';
import type { User } from '../types';
import { UserStatus } from '../types';
import { ArrowLeft, MessageSquare, Phone, Video, Ban, Share2, Music, Clock, ChevronLeft, MoreVertical, Star, Flag, Trash2, UserMinus } from 'lucide-react';
import { formatRelativeTime, isUserOnline } from '../utils/time';

interface ContactProfileProps {
  user: User;
  onBack: () => void;
  onMessage: (userId: string) => void;
  onCall: (type: 'voice' | 'video') => void;
  onBlock: (userId: string) => void;
  isIOS?: boolean;
  onRemoveContact?: (contactId: string) => void;
}

const ContactProfile: React.FC<ContactProfileProps> = ({ user, onBack, onMessage, onCall, onBlock, isIOS, onRemoveContact }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [tick, setTick] = useState(0);
  
  // Refresh the "Time Ago" every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: UserStatus) => {
      switch(status) {
          case UserStatus.AVAILABLE: return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
          case UserStatus.BUSY: return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
          case UserStatus.AWAY: return 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]';
          case UserStatus.DND: return 'bg-red-700';
          default: return 'bg-gray-400';
      }
  };

  const iosHeaderClass = "bg-[#F2F4F8] dark:bg-bbm-darker border-b border-gray-200 dark:border-gray-800 text-slate-900 dark:text-white pt-[calc(8px+env(safe-area-inset-top))] h-[calc(60px+env(safe-area-inset-top))]";
  const androidHeaderClass = "bg-bbm-blue text-white shadow-md h-16 pt-safe";
  
  // Reference tick to satisfy linter and ensure re-renders happen
  const online = tick >= 0 && isUserOnline(user.lastActive);
  const showLastSeen = user.showLastSeen !== false;

  return (
    <div className={`fixed inset-0 z-50 bg-[#F2F4F8] dark:bg-bbm-darker flex flex-col ${isIOS ? 'animate-ios-slide-in' : 'animate-android-fade-scale'}`}>
      {/* Header */}
      <div className={`flex items-end pb-3 px-4 shrink-0 justify-between relative z-10 ${isIOS ? iosHeaderClass : `${androidHeaderClass} items-center pb-0`}`}>
            {isIOS ? (
                <>
                    <button onClick={onBack} className="flex items-center text-bbm-blue -ml-2 active:opacity-50">
                        <ChevronLeft size={28} />
                        <span className="text-lg leading-none pb-0.5">Back</span>
                    </button>
                    <h2 className="text-lg font-bold absolute left-1/2 transform -translate-x-1/2 pb-0.5">Contact Info</h2>
                </>
            ) : (
                <div className="flex items-center">
                    <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 mr-2"><ArrowLeft size={24} /></button>
                    <h2 className="text-xl font-bold tracking-tight">Contact Info</h2>
                </div>
            )}
            
            <div className="relative pb-0.5">
                <button onClick={() => setShowMenu(!showMenu)} className={`p-2 rounded-full ${isIOS ? 'text-bbm-blue' : 'text-white hover:bg-white/10'}`}>
                    <MoreVertical size={24} />
                </button>
                
                {showMenu && (
                    <div className="absolute right-0 top-12 w-56 bg-white dark:bg-bbm-card shadow-xl rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in origin-top-right z-50">
                        <button onClick={() => { alert('Added to favorites'); setShowMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center text-sm font-medium"><Star size={16} className="mr-3 text-yellow-500"/> Add to Favorites</button>
                        <button onClick={() => { alert(`Shared PIN: ${user.pin}`); setShowMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center text-sm font-medium"><Share2 size={16} className="mr-3 text-blue-500"/> Share Contact</button>
                        <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
                        <button onClick={() => { alert('Chat history cleared'); setShowMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center text-sm font-medium text-red-500"><Trash2 size={16} className="mr-3"/> Clear Chat History</button>
                        <button onClick={() => { alert('Reported user'); setShowMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center text-sm font-medium text-red-500"><Flag size={16} className="mr-3"/> Report User</button>
                    </div>
                )}
            </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 pb-safe">
        
        {/* Identity Card */}
        <div className="bg-white dark:bg-bbm-card rounded-[2rem] p-6 shadow-sm border border-white/60 dark:border-gray-800 flex flex-col items-center relative overflow-hidden max-w-sm mx-auto w-full">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-gray-50 to-transparent dark:from-white/5 dark:to-transparent z-0"></div>
            <div className="relative z-10 mb-4">
                <div className="w-28 h-28 rounded-3xl p-1 bg-white dark:bg-gray-700 shadow-xl rotate-3 transform transition-transform hover:rotate-0">
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-2xl" />
                </div>
                {user.isAi && <span className="absolute -bottom-2 -right-2 bg-gradient-to-tr from-blue-500 to-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md border-2 border-white">AI BOT</span>}
            </div>
            <div className="z-10 text-center">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{user.name}</h2>
                <div className="flex items-center justify-center space-x-2"><span className="bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-300 font-mono text-xs px-3 py-1.5 rounded-lg tracking-wider select-all">{user.pin}</span></div>
            </div>
            <div className="mt-5 flex items-center space-x-2 bg-gray-50 dark:bg-black/20 px-4 py-2 rounded-full border border-gray-100 dark:border-gray-700">
                <span className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-green-500' : getStatusColor(user.status)} shadow-sm`}></span>
                <span className="text-sm font-bold text-slate-700 dark:text-gray-300">{online ? 'Online Now' : user.status}</span>
            </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-4 gap-3">
            <ActionButton icon={MessageSquare} label="Message" onClick={() => onMessage(user.id)} color="text-bbm-blue" bg="bg-blue-50 dark:bg-blue-900/20" />
            <ActionButton icon={Phone} label="Voice" onClick={() => onCall('voice')} color="text-green-500" bg="bg-green-50 dark:bg-green-900/20" />
            <ActionButton icon={Video} label="Video" onClick={() => onCall('video')} color="text-purple-500" bg="bg-purple-50 dark:bg-purple-900/20" />
            <ActionButton icon={Share2} label="Share" onClick={() => alert(`Sharing ${user.name}'s PIN: ${user.pin}`)} color="text-orange-500" bg="bg-orange-50 dark:bg-orange-900/20" />
        </div>

        {/* Info Cards */}
        <div className="space-y-3">
            <div className="bg-white dark:bg-bbm-card rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Status Message</h4>
                <p className="text-slate-800 dark:text-white font-medium italic text-lg">"{user.statusMessage}"</p>
            </div>
            {user.musicStatus && (
                <div className="bg-white dark:bg-bbm-card rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center space-x-4">
                    <div className="p-2.5 bg-pink-50 dark:bg-pink-900/20 rounded-xl text-pink-500"><Music size={20} /></div>
                    <div><h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Listening To</h4><p className="text-slate-800 dark:text-white font-medium text-base">{user.musicStatus}</p></div>
                </div>
            )}
            
            {showLastSeen && (
                <div className="bg-white dark:bg-bbm-card rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center space-x-4">
                    <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-gray-500"><Clock size={20} /></div>
                    <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System Presence</h4>
                        <p className="text-slate-800 dark:text-white font-medium text-base">
                            {online ? 'Online Now' : `Last seen ${formatRelativeTime(user.lastActive)}`}
                        </p>
                    </div>
                </div>
            )}
        </div>

        <button onClick={() => onRemoveContact && onRemoveContact(user.id)} className="w-full bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/30 flex items-center justify-center space-x-2 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"><UserMinus size={18} /><span>Remove Contact</span></button>
        <button onClick={() => onBlock(user.id)} className="w-full bg-gray-100 dark:bg-gray-800 p-4 rounded-2xl flex items-center justify-center space-x-2 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors mb-4"><Ban size={18} /><span>Block Contact</span></button>
      </div>
    </div>
  );
};

const ActionButton: React.FC<{ icon: React.ElementType, label: string, onClick: () => void, color: string, bg: string }> = ({ icon: Icon, label, onClick, color, bg }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center py-4 rounded-2xl ${bg} hover:brightness-95 transition-all active:scale-95`}><Icon size={24} className={`${color} mb-1.5`} /><span className={`text-[10px] font-bold uppercase tracking-wide ${color}`}>{label}</span></button>
);

export default ContactProfile;