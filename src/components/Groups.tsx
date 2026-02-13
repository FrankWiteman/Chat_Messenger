
import React from 'react';
import type { Chat } from '../types';
import { Users, Plus } from 'lucide-react';

interface GroupsProps {
  groups: Chat[];
  onSelectGroup: (chatId: string) => void;
  isIOS?: boolean;
}

const Groups: React.FC<GroupsProps> = ({ groups, onSelectGroup }) => {
  return (
    <div className="flex-1 overflow-y-auto pb-20 bg-bbm-light dark:bg-bbm-darker transition-colors duration-300 flex flex-col">
      
      {/* Create Group CTA */}
      <div className="px-4 py-3 shrink-0 mt-2">
          <button className="w-full bg-white dark:bg-bbm-card border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-4 flex items-center justify-center space-x-2 text-bbm-blue font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors shadow-sm">
              <Plus size={20} />
              <span>Start New Group</span>
          </button>
      </div>

      <div className="px-4 pb-2 shrink-0">
         <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">My Groups</h2>
      </div>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 text-gray-400 animate-fade-in -mt-10">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
               <Users size={32} className="text-gray-300 dark:text-gray-600" />
          </div>
          <p className="font-semibold text-slate-700 dark:text-gray-300">No groups yet</p>
          <p className="text-sm mt-1">Create a group to chat with multiple friends</p>
        </div>
      ) : (
        <div className="space-y-3 px-4">
          {groups.map((group) => (
            <div 
                key={group.id} 
                onClick={() => onSelectGroup(group.id)}
                className="bg-white dark:bg-bbm-card p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center space-x-4 cursor-pointer hover:border-bbm-blue/50 transition-all animate-fade-in"
            >
              <div className="relative">
                 <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-bbm-blue to-purple-600 flex items-center justify-center text-white shadow-md">
                     <Users size={24} />
                 </div>
                 {group.unreadCount > 0 && (
                     <div className="absolute -top-1 -right-1 bg-bbm-red text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full border-2 border-white dark:border-bbm-card">
                         {group.unreadCount}
                     </div>
                 )}
              </div>
              
              <div className="flex-1">
                 <h3 className="font-bold text-slate-900 dark:text-white">{group.contact.name}</h3>
                 <p className="text-sm text-gray-500 truncate mt-0.5">
                     {group.messages?.length > 0 ? group.messages[group.messages.length - 1].text : 'No messages yet'}
                 </p>
                 <div className="flex items-center mt-2 space-x-2 text-xs text-gray-400">
                     <div className="flex -space-x-1.5">
                         {/* Mock Participants Avatars */}
                         <div className="w-4 h-4 rounded-full bg-gray-300 border border-white"></div>
                         <div className="w-4 h-4 rounded-full bg-gray-400 border border-white"></div>
                         <div className="w-4 h-4 rounded-full bg-gray-500 border border-white"></div>
                     </div>
                     <span>{group.participants?.length || 3} participants</span>
                 </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Groups;
