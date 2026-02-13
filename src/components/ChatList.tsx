
import React, { useState, useRef } from 'react';
import type { Chat, CustomList } from '../types';
import { Check, CheckCheck, VolumeX, Ban, Trash2, Mail, Pin, Star, Archive, Lock, MessageSquare, ArchiveRestore, Search, MoreHorizontal, Plus, FolderPlus, Folder, UserMinus } from 'lucide-react';

interface ChatListProps {
  chats: Chat[];
  onSelectChat: (chatId: string) => void;
  onDeleteChat?: (chatId: string) => void;
  onPinChat?: (chatId: string) => void;
  onMarkUnread?: (chatId: string) => void;
  onMuteChat?: (chatId: string) => void;
  onArchiveChat?: (chatId: string) => void;
  onLockChat?: (chatId: string) => void;
  onBlockContact?: (chatId: string) => void;
  onViewProfile?: (chatId: string) => void;
  customLists?: CustomList[];
  onCreateList?: (list: CustomList) => void;
  customLabels?: string[];
  onAddToLabel?: (chatId: string, label: string) => void;
  onCreateLabel?: (label: string) => void;
  onRemoveContact?: (contactId: string) => void;
  currentUserId?: string;
}

// STRICT BBM STATUS ICON: Letter vertically ABOVE checkmark
// S = Grey 'S' (Top) + Grey Single Check (Bottom) - Sent
// D = Grey 'D' (Top) + Grey Single Check (Bottom) - Delivered
// R = Green 'R' (Top) + Blue Double Check (Bottom) - Read
const StatusIcon: React.FC<{ status: 'sent' | 'delivered' | 'read', isPing?: boolean }> = ({ status, isPing }) => {
    if (isPing) return <span className="text-[9px] font-black text-bbm-red tracking-wider mr-1">PING</span>;

    // Sent: 'S' above single check
    if (status === 'sent') {
        return (
            <div className="flex flex-col items-center justify-center leading-none mr-1.5 -space-y-[3px]">
                <span className="text-[8px] font-black font-sans text-gray-400">S</span>
                <Check size={11} strokeWidth={3} className="text-gray-400" />
            </div>
        );
    }

    // Delivered: 'D' above single check (Using single to distinguish from Read's double)
    if (status === 'delivered') {
        return (
            <div className="flex flex-col items-center justify-center leading-none mr-1.5 -space-y-[3px]">
                <span className="text-[8px] font-black font-sans text-gray-500">D</span>
                <Check size={11} strokeWidth={3} className="text-gray-500" />
            </div>
        );
    }

    // Read: 'R' above double check (Blue)
    if (status === 'read') {
        return (
            <div className="flex flex-col items-center justify-center leading-none mr-1.5 -space-y-[3px]">
                <span className="text-[8px] font-black font-sans text-green-600">R</span>
                <CheckCheck size={11} strokeWidth={3} className="text-blue-500" />
            </div>
        );
    }

    return null;
};

const ChatRow: React.FC<{ chat: Chat; onSelect: () => void; onAction: (action: string) => void; onLongPress: (e: any) => void; isLast: boolean; currentUserId?: string }> = ({ chat, onSelect, onAction, onLongPress, isLast, currentUserId }) => {
    const [offset, setOffset] = useState(0);
    const startX = useRef(0);
    const currentOffset = useRef(0);
    
    const lastMsg = chat.messages?.[chat.messages.length - 1];
    // Check if I sent the message. 
    const isMe = lastMsg && (lastMsg.senderId === 'me' || (currentUserId && lastMsg.senderId === currentUserId));
    
    // Only show unread count if I am NOT the sender (isMe is false) and there are unread messages
    const shouldShowUnreadCount = !isMe && chat.unreadCount > 0;

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        currentOffset.current = offset;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX.current;
        let newOffset = currentOffset.current + diff;
        if (newOffset > 100) newOffset = 100;
        if (newOffset < -100) newOffset = -100;
        setOffset(newOffset);
    };

    const handleTouchEnd = () => {
        if (offset > 50) setOffset(80); 
        else if (offset < -50) setOffset(-80); 
        else setOffset(0); 
    };

    const handleActionClick = (e: React.MouseEvent, action: string) => {
        e.stopPropagation();
        onAction(action);
        setOffset(0);
    };

    const formatTime = (timestamp: number) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.getDate() === now.getDate();
        return isToday ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString();
    };

    return (
        <div className="relative overflow-hidden w-full h-[80px]">
            <div className="absolute inset-0 flex justify-between items-center bg-gray-100 dark:bg-gray-900">
                <div 
                    className="flex items-center justify-start pl-5 text-white bg-bbm-blue h-full w-1/2 absolute left-0 cursor-pointer"
                    onClick={(e) => handleActionClick(e, 'pin')}
                >
                    <Pin size={24} fill={chat.isPinned ? "currentColor" : "none"} /> 
                </div>
                <div 
                    className="flex items-center justify-end pr-5 text-white bg-gray-500 h-full w-1/2 absolute right-0 cursor-pointer"
                    onClick={(e) => handleActionClick(e, 'more')}
                >
                    <MoreHorizontal size={24} />
                </div>
            </div>

            <div 
                className="absolute inset-0 bg-white dark:bg-bbm-card flex items-center px-4 active:bg-gray-50 dark:active:bg-gray-800 transition-transform duration-300 ease-out"
                style={{ transform: `translateX(${offset}px)` }}
                onClick={() => { if (offset !== 0) setOffset(0); else onSelect(); }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onContextMenu={(e) => { e.preventDefault(); onLongPress(e); }}
            >
                <div className="relative shrink-0">
                    <img src={chat.contact.avatarUrl} alt="" className="w-12 h-12 rounded-xl object-cover shadow-sm ring-1 ring-gray-100 dark:ring-gray-700" />
                    {chat.contact.isAi && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-bbm-blue rounded-full border-2 border-white"></div>}
                </div>
                
                <div className={`ml-4 flex-1 min-w-0 h-full flex flex-col justify-center pr-2 ${!isLast ? 'border-b border-gray-100 dark:border-gray-800/50' : ''}`}>
                    <div className="flex justify-between items-baseline mb-1">
                        <div className="flex items-center gap-1.5 truncate">
                            <h3 className={`font-bold text-base truncate ${chat.contact.isAi ? 'text-bbm-blue' : 'text-slate-900 dark:text-white'}`}>{chat.contact.name}</h3>
                            {chat.isPinned && <Pin size={10} className="text-bbm-blue fill-current" />}
                            {chat.isMuted && <VolumeX size={10} className="text-gray-400" />}
                            {chat.isLocked && <Lock size={10} className="text-orange-500" />}
                            {chat.isArchived && <Archive size={10} className="text-gray-400" />}
                        </div>
                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{lastMsg ? formatTime(chat.lastMessageTime) : ''}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <div className="flex items-center min-w-0 pr-4">
                            {/* STATUS ICON TO THE LEFT OF MESSAGE IF ME */}
                            {(isMe && lastMsg) && (
                                <StatusIcon status={lastMsg.status} isPing={lastMsg.isPing} />
                            )}
                            
                            <p className={`text-sm truncate ${lastMsg?.isPing ? 'text-bbm-red font-bold' : 'text-gray-500'}`}>
                                {lastMsg ? (lastMsg.isPing ? 'PING!!!' : lastMsg.text) : <span className="italic text-bbm-blue">Start chatting</span>}
                            </p>
                        </div>
                        
                        {/* UNREAD COUNT ON THE RIGHT - ONLY FOR RECEIVER AND ONLY IF > 0 */}
                        {shouldShowUnreadCount && (
                            <div className="bg-bbm-red text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 flex items-center justify-center rounded-full shadow-sm shrink-0">{chat.unreadCount}</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const FilterTab: React.FC<{ label: string; active: boolean; onClick: () => void; isIcon?: boolean }> = ({ label, active, onClick, isIcon }) => (
    <button 
        onClick={onClick}
        className={`flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap shrink-0 ${active ? 'bg-bbm-blue text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
    >
        {isIcon ? <Plus size={14} /> : label}
    </button>
);

const ChatList: React.FC<ChatListProps> = ({ 
    chats, onSelectChat, onPinChat, onArchiveChat, onViewProfile, onMarkUnread, onMuteChat, onLockChat, onBlockContact, onDeleteChat, customLists = [], onCreateList, customLabels = [], onAddToLabel, onRemoveContact, currentUserId
}) => {
  const [contextMenuChat, setContextMenuChat] = useState<Chat | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showCreateListModal, setShowCreateListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedForList, setSelectedForList] = useState<string[]>([]);
  const [showFolderSubMenu, setShowFolderSubMenu] = useState(false);

  const handleLongPress = (chat: Chat) => { setContextMenuChat(chat); if (navigator.vibrate) navigator.vibrate(50); };
  const handleAction = (chat: Chat, action: string) => { if (action === 'pin' && onPinChat) onPinChat(chat.id); if (action === 'more') setContextMenuChat(chat); };
  const handleCreateListSubmit = () => { if (!newListName.trim() || selectedForList.length === 0) return; if (onCreateList) onCreateList({ id: 'list_' + Date.now(), name: newListName, chatIds: selectedForList }); setShowCreateListModal(false); setNewListName(''); setSelectedForList([]); };
  const toggleSelection = (chatId: string) => { if (selectedForList.includes(chatId)) setSelectedForList(selectedForList.filter(id => id !== chatId)); else setSelectedForList([...selectedForList, chatId]); };

  let filteredChats = chats.filter(c => c.contact.name.toLowerCase().includes(searchTerm.toLowerCase()));
  if (activeFilter === 'unread') filteredChats = filteredChats.filter(c => c.unreadCount > 0);
  else if (activeFilter === 'favorites') filteredChats = filteredChats.filter(c => c.isPinned);
  else if (activeFilter === 'groups') filteredChats = filteredChats.filter(c => c.isGroup);
  else if (activeFilter !== 'all') { const list = customLists.find(l => l.id === activeFilter); if (list) filteredChats = filteredChats.filter(c => list.chatIds.includes(c.id)); }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-bbm-darker relative">
      <div className="bg-white dark:bg-bbm-darker sticky top-0 z-20 shadow-sm pt-2">
          {/* Search Bar */}
          <div className="px-4 pb-2">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center px-3 py-2">
                  <Search size={16} className="text-gray-400 mr-2" />
                  <input 
                      className="bg-transparent w-full outline-none text-sm text-slate-900 dark:text-white"
                      placeholder="Search chats..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
          </div>

          {/* Filter Tabs - Centered */}
          <div className="px-4 pb-3 flex items-center justify-center gap-2 overflow-x-auto no-scrollbar">
              <FilterTab label="All" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
              <FilterTab label="Unread" active={activeFilter === 'unread'} onClick={() => setActiveFilter('unread')} />
              <FilterTab label="Favorites" active={activeFilter === 'favorites'} onClick={() => setActiveFilter('favorites')} />
              <FilterTab label="Groups" active={activeFilter === 'groups'} onClick={() => setActiveFilter('groups')} />
              {customLists.map(list => (
                  <FilterTab key={list.id} label={list.name} active={activeFilter === list.id} onClick={() => setActiveFilter(list.id)} />
              ))}
              <FilterTab label="+" active={false} onClick={() => setShowCreateListModal(true)} isIcon />
          </div>
      </div>

      <div className="flex-1 overflow-y-auto">
          {filteredChats.map((chat, idx) => (
              <ChatRow 
                  key={chat.id} 
                  chat={chat} 
                  onSelect={() => onSelectChat(chat.id)}
                  onAction={(action) => handleAction(chat, action)}
                  onLongPress={() => handleLongPress(chat)}
                  isLast={idx === filteredChats.length - 1}
                  currentUserId={currentUserId}
              />
          ))}
          {filteredChats.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">
                  {activeFilter === 'all' ? 'No chats found.' : `No chats in "${activeFilter === 'unread' ? 'Unread' : activeFilter}".`}
              </div>
          )}
      </div>

      {showCreateListModal && (
          <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
              <div className="bg-white dark:bg-[#1C1C1E] w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-slide-up flex flex-col max-h-[85vh]">
                  <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#2C2C2E]">
                      <button onClick={() => setShowCreateListModal(false)} className="text-bbm-blue text-sm font-medium">Cancel</button>
                      <h3 className="text-slate-900 dark:text-white font-bold text-base">New list</h3>
                      <button 
                        onClick={handleCreateListSubmit} 
                        className={`text-sm font-bold ${!newListName.trim() || selectedForList.length === 0 ? 'text-gray-400' : 'text-bbm-blue'}`}
                        disabled={!newListName.trim() || selectedForList.length === 0}
                      >
                          Done
                      </button>
                  </div>
                  <div className="p-4 flex-1 overflow-y-auto">
                      <div className="mb-6">
                          <label className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase ml-1 mb-1 block">List name</label>
                          <div className="bg-gray-100 dark:bg-[#2C2C2E] rounded-xl px-4 py-3">
                              <input 
                                  value={newListName}
                                  onChange={(e) => setNewListName(e.target.value)}
                                  className="w-full bg-transparent text-slate-900 dark:text-white outline-none text-base placeholder-gray-400 dark:placeholder-gray-500"
                                  placeholder="Examples: Work, Friends"
                                  autoFocus
                              />
                          </div>
                      </div>
                      <div>
                          <label className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase ml-1 mb-2 block">Included Chats</label>
                          {chats.length > 0 ? (
                              <div className="bg-gray-100 dark:bg-[#2C2C2E] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700/50">
                                  {chats.map((chat, i) => (
                                      <div 
                                          key={chat.id} 
                                          onClick={() => toggleSelection(chat.id)}
                                          className={`flex items-center p-3 cursor-pointer active:bg-gray-200 dark:active:bg-white/10 ${i !== chats.length - 1 ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}
                                      >
                                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 transition-colors ${selectedForList.includes(chat.id) ? 'bg-bbm-blue border-bbm-blue' : 'border-gray-400 dark:border-gray-500'}`}>
                                              {selectedForList.includes(chat.id) && <Check size={12} className="text-white" strokeWidth={4} />}
                                          </div>
                                          <img src={chat.contact.avatarUrl} className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 mr-3 object-cover" alt="" />
                                          <span className="text-slate-900 dark:text-white font-medium text-sm flex-1 truncate">{chat.contact.name}</span>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="bg-gray-100 dark:bg-[#2C2C2E] rounded-xl p-4 text-center text-gray-500 text-sm">
                                  No chats available to add.
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {contextMenuChat && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-fade-in" onClick={() => setContextMenuChat(null)}>
              <div className="bg-white dark:bg-gray-900 w-64 rounded-2xl shadow-2xl scale-100 animate-android-fade-scale overflow-hidden border border-gray-100 dark:border-gray-800" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-3">
                      <img src={contextMenuChat.contact.avatarUrl} className="w-10 h-10 rounded-full" alt="" />
                      <div>
                          <h3 className="font-bold text-sm dark:text-white">{contextMenuChat.contact.name}</h3>
                          <p className="text-[10px] text-gray-500">{contextMenuChat.contact.pin}</p>
                      </div>
                  </div>
                  <div className="p-2 max-h-[60vh] overflow-y-auto">
                      <MenuButton icon={MessageSquare} label="Open Chat" onClick={() => { onSelectChat(contextMenuChat.id); setContextMenuChat(null); }} />
                      <MenuButton icon={Star} label="View Profile" onClick={() => { onViewProfile && onViewProfile(contextMenuChat.id); setContextMenuChat(null); }} />
                      <MenuButton icon={Pin} label={contextMenuChat.isPinned ? "Unpin Chat" : "Pin Chat"} onClick={() => { onPinChat && onPinChat(contextMenuChat.id); setContextMenuChat(null); }} />
                      <MenuButton icon={Mail} label={contextMenuChat.unreadCount > 0 ? "Mark Read" : "Mark Unread"} onClick={() => { onMarkUnread && onMarkUnread(contextMenuChat.id); setContextMenuChat(null); }} />
                      <MenuButton icon={VolumeX} label={contextMenuChat.isMuted ? "Unmute" : "Mute"} onClick={() => { onMuteChat && onMuteChat(contextMenuChat.id); setContextMenuChat(null); }} />
                      <MenuButton icon={Lock} label={contextMenuChat.isLocked ? "Unlock" : "Lock Chat"} onClick={() => { onLockChat && onLockChat(contextMenuChat.id); setContextMenuChat(null); }} />
                      <MenuButton icon={contextMenuChat.isArchived ? ArchiveRestore : Archive} label={contextMenuChat.isArchived ? "Unarchive" : "Archive"} onClick={() => { onArchiveChat && onArchiveChat(contextMenuChat.id); setContextMenuChat(null); }} />
                      
                      {customLabels.length > 0 && (
                          <div className="border-t border-gray-100 dark:border-gray-800 my-1 py-1">
                              {showFolderSubMenu ? (
                                  <>
                                    <button onClick={() => setShowFolderSubMenu(false)} className="px-3 py-1 text-xs text-gray-400 font-bold mb-1">Back</button>
                                    {customLabels.map(label => (
                                        <MenuButton key={label} icon={Folder} label={label} onClick={() => { onAddToLabel && onAddToLabel(contextMenuChat.id, label); setContextMenuChat(null); }} />
                                    ))}
                                  </>
                              ) : (
                                  <MenuButton icon={FolderPlus} label="Add to Folder" onClick={() => setShowFolderSubMenu(true)} />
                              )}
                          </div>
                      )}

                      <div className="border-t border-gray-100 dark:border-gray-800 my-1"></div>
                      <MenuButton icon={UserMinus} label="Remove Contact" color="text-red-500" onClick={() => { onRemoveContact && onRemoveContact(contextMenuChat.contact.id); setContextMenuChat(null); }} />
                      <MenuButton icon={Ban} label="Block Contact" color="text-red-500" onClick={() => { onBlockContact && onBlockContact(contextMenuChat.id); setContextMenuChat(null); }} />
                      <MenuButton icon={Trash2} label="Delete Chat" color="text-red-600 font-bold" onClick={() => { onDeleteChat && onDeleteChat(contextMenuChat.id); setContextMenuChat(null); }} />
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const MenuButton = ({ icon: Icon, label, onClick, color }: any) => (
    <button onClick={onClick} className={`w-full flex items-center px-3 py-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-sm font-medium ${color || 'text-slate-700 dark:text-gray-300'}`}>
        <Icon size={18} className="mr-3 opacity-70" /> {label}
    </button>
);

export default ChatList;
