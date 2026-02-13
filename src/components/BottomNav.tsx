import React from 'react';
import { MessageSquare, Users, User, MoreVertical } from 'lucide-react';
import { NavTab } from '../types';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenDrawer: () => void;
  onOpenMore: () => void;
  unreadCount: number;
  requestCount?: number;
  hasNewFeeds?: boolean;
  isIOS?: boolean;
}

const BottomNav: React.FC<BottomNavProps> = ({ 
  activeTab, 
  onTabChange, 
  onOpenMore, 
  unreadCount, 
  requestCount = 0, 
  hasNewFeeds = false, 
  isIOS 
}) => {
  
  const iosNavClass = "bg-white/95 dark:bg-bbm-darker/95 backdrop-blur-xl border-t border-gray-200 dark:border-gray-800 shadow-[0_-1px_0_rgba(0,0,0,0.05)]";
  const androidNavClass = "bg-white dark:bg-bbm-blue border-t border-gray-200 dark:border-bbm-blue shadow-[0_-5px_20px_rgba(0,0,0,0.05)]";

  const getIconClass = (tab: NavTab) => {
      if (activeTab === tab) {
          return 'text-bbm-blue dark:text-white';
      }
      return 'text-gray-400 dark:text-white/60 hover:text-bbm-blue transition-colors';
  };

  return (
    <div 
      className={`fixed bottom-0 left-0 right-0 flex justify-between items-start z-50 px-6 pt-2 transition-all duration-300 ${isIOS ? iosNavClass : androidNavClass}`}
      style={{ 
        /* Harbor logic: Padding bottom based on env/constant to fill the screen edge */
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: 'calc(64px + env(safe-area-inset-bottom))',
      }}
    >
      <button 
        onClick={() => onTabChange(NavTab.CHATS)}
        className={`flex flex-col items-center justify-start h-12 min-w-[64px] transition-all duration-200 ${getIconClass(NavTab.CHATS)}`}
      >
        <div className="relative">
            <MessageSquare size={24} strokeWidth={activeTab === NavTab.CHATS ? 2.5 : 2} fill={activeTab === NavTab.CHATS ? "currentColor" : "none"} />
            {(unreadCount > 0 || hasNewFeeds) && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-red-500 border border-white dark:border-bbm-darker"></span>
            )}
        </div>
        <span className="text-[10px] font-bold mt-0.5 tracking-tight">Chats</span>
      </button>

      <button 
        onClick={() => onTabChange(NavTab.CONTACTS)}
        className={`flex flex-col items-center justify-start h-12 min-w-[64px] transition-all duration-200 ${getIconClass(NavTab.CONTACTS)}`}
      >
        <div className="relative">
            <User size={24} strokeWidth={activeTab === NavTab.CONTACTS ? 2.5 : 2} fill={activeTab === NavTab.CONTACTS ? "currentColor" : "none"} />
            {requestCount > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-red-500 border border-white dark:border-bbm-darker"></span>}
        </div>
        <span className="text-[10px] font-bold mt-0.5 tracking-tight">Contacts</span>
      </button>

      <button 
        onClick={() => onTabChange(NavTab.GROUPS)}
        className={`flex flex-col items-center justify-start h-12 min-w-[64px] transition-all duration-200 ${getIconClass(NavTab.GROUPS)}`}
      >
        <div className="relative">
            <Users size={24} strokeWidth={activeTab === NavTab.GROUPS ? 2.5 : 2} fill={activeTab === NavTab.GROUPS ? "currentColor" : "none"} />
        </div>
        <span className="text-[10px] font-bold mt-0.5 tracking-tight">Groups</span>
      </button>

      <button 
        onClick={onOpenMore}
        className="flex flex-col items-center justify-start h-12 min-w-[64px] text-gray-400 dark:text-white/60"
      >
        <MoreVertical size={24} strokeWidth={2} />
        <span className="text-[10px] font-bold mt-0.5 tracking-tight">More</span>
      </button>
    </div>
  );
};

export default BottomNav;