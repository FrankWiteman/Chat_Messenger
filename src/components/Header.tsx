import React from 'react';
import type { User } from '../types';
import { MessageSquarePlus, Menu } from 'lucide-react';

interface HeaderProps {
  user: User;
  title?: string;
  isDarkMode: boolean;
  showUserInfo?: boolean;
  onProfileClick?: () => void;
  onNewChat?: () => void;
  onOpenDrawer?: () => void;
  isIOS?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
    user, title, showUserInfo, onProfileClick, onNewChat, onOpenDrawer, isIOS
}) => {
  
  const iosHeaderClass = "bg-white/80 dark:bg-bbm-darker/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 text-slate-900 dark:text-white";
  const androidHeaderClass = "bg-bbm-blue text-white shadow-md border-none h-16";

  return (
    <div 
      className={`sticky top-0 left-0 right-0 z-40 px-4 transition-all duration-300 ${isIOS ? 'flex items-end pb-3' : 'flex items-center'} ${isIOS ? iosHeaderClass : androidHeaderClass}`}
      style={isIOS ? { 
        paddingTop: 'env(safe-area-inset-top)', 
        minHeight: 'calc(50px + env(safe-area-inset-top))' 
      } : {}}
    >
      {showUserInfo ? (
          <div className="w-full flex justify-between items-center">
            <div className="flex items-center space-x-2 flex-1 overflow-hidden">
                <button 
                  onClick={onOpenDrawer} 
                  className={`p-2 rounded-full ${isIOS ? 'text-bbm-blue hover:bg-gray-100 dark:hover:bg-gray-800' : 'text-white hover:bg-white/10'} transition-colors mr-1 shrink-0`}
                >
                    <Menu size={28} />
                </button>

                <div onClick={onProfileClick} className="flex items-center space-x-3 cursor-pointer active:opacity-50 min-w-0 flex-1">
                    <img 
                        src={user.avatarUrl} 
                        alt="Me" 
                        className={`rounded-xl object-cover bg-gray-200 shrink-0 ${isIOS ? 'w-10 h-10 shadow-sm' : 'w-11 h-11 border-2 border-white/30'}`}
                    />
                    <div className="flex flex-col justify-center min-w-0">
                        <h1 className={`font-bold leading-tight truncate ${isIOS ? 'text-lg' : 'text-xl'}`}>{user.name}</h1>
                        <div className="flex items-center space-x-1 opacity-90">
                            <span className={`text-[11px] font-medium truncate max-w-[140px] ${isIOS ? 'text-gray-500 dark:text-gray-400' : 'text-blue-50'}`}>
                                {user.statusMessage || "Available"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="ml-1 shrink-0">
                <button 
                    onClick={onNewChat}
                    className={`flex items-center justify-center rounded-full transition-colors active:scale-95 ${isIOS ? 'w-10 h-10 text-bbm-blue hover:bg-gray-100 dark:hover:bg-gray-800' : 'w-12 h-12 text-white hover:bg-white/10'}`}
                    title="New Chat"
                >
                    <MessageSquarePlus size={28} strokeWidth={2} />
                </button>
            </div>
          </div>
      ) : (
          <div className="w-full relative flex items-center">
             <button 
                onClick={onOpenDrawer} 
                className={`p-2 rounded-full ${isIOS ? 'text-bbm-blue hover:bg-gray-100 dark:hover:bg-gray-800' : 'text-white hover:bg-white/10'} transition-colors mr-3`}
             >
                <Menu size={28} />
             </button>
            <div className={`flex-1 ${isIOS ? 'text-center -ml-12' : 'text-left'}`}>
                <h1 className={`${isIOS ? 'text-lg font-bold' : 'text-2xl font-extrabold tracking-tight'}`}>{title}</h1>
            </div>
          </div>
      )}
    </div>
  );
};

export default Header;