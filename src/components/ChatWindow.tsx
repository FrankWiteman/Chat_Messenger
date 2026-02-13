import React, { useState, useEffect, useRef } from 'react';
import type { Chat } from '../types';
import { ArrowLeft, Send, MoreVertical, Smile, Paperclip, Check, CheckCheck, Camera, Image as ImageIcon, FileText, Phone, Video, ChevronLeft, Film } from 'lucide-react';
import { generateAIResponse } from '../services/geminiService';
import { useChat } from '../hooks/useChat';
import { formatRelativeTime, isUserOnline } from '../utils/time';

interface ChatWindowProps {
  chat: Chat;
  currentUserId: string;
  onBack: () => void;
  onSendMessage: (chatId: string, text: string, isPing?: boolean, media?: { type: 'image'|'video'|'document', url: string, name?: string }) => void;
  onTyping?: (isTyping: boolean) => void;
  onBlockUser?: (chatId: string) => void;
  onMuteUser?: (chatId: string) => void;
  onClearChat?: (chatId: string) => void;
  onStartCall?: (type: 'voice' | 'video') => void;
  onViewProfile?: () => void;
  onRemoveContact?: (contactId: string) => void;
  isDarkMode: boolean;
  enterToSend?: boolean;
  isIOS?: boolean;
  isRemoteTyping?: boolean;
}

const EMOJIS = ['😀','😂','😍','😎','😭','😡','👍','👎','🎉','🔥','❤️','👀','🤖','👻','💀','💪','🧠','💩','🤡','🙌'];

const StatusIcon: React.FC<{ status: 'sent' | 'delivered' | 'read' }> = ({ status }) => {
    if (status === 'sent') return <div className="flex flex-col items-center justify-center leading-none ml-1 -space-y-[3px]"><span className="text-[8px] font-black font-sans text-gray-400">S</span><Check size={10} strokeWidth={3} className="text-gray-400" /></div>;
    if (status === 'delivered') return <div className="flex flex-col items-center justify-center leading-none ml-1 -space-y-[3px]"><span className="text-[8px] font-black font-sans text-gray-500">D</span><Check size={10} strokeWidth={3} className="text-gray-500" /></div>;
    if (status === 'read') return <div className="flex flex-col items-center justify-center leading-none ml-1 -space-y-[3px]"><span className="text-[8px] font-black font-sans text-bbm-blue">R</span><CheckCheck size={10} strokeWidth={3} className="text-bbm-blue" /></div>;
    return null;
};

const ChatWindow: React.FC<ChatWindowProps> = ({ 
    chat, currentUserId, onBack, onSendMessage, onTyping, onViewProfile, onStartCall, enterToSend = true, isIOS, isRemoteTyping = false
}) => {
  const [inputText, setInputText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [tick, setTick] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  
  const typingTimeoutRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages: realMessages, isTyping: isHookTyping, send: sendReal, updateTypingStatus, markAsRead } = useChat({
      chatId: chat.id,
      currentUserId: currentUserId,
      recipientId: chat.contact.id
  });

  const isAi = chat.id === 'ai_bot';
  const displayMessages = isAi ? chat.messages : realMessages;
  const isTyping = isAi ? isAiTyping : (isRemoteTyping || isHookTyping);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const scrollToBottom = (instant = false) => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "end" });
    }
  };

  // Improved native keyboard handling via VisualViewport
  useEffect(() => {
    const handleResize = () => {
      if (isFocused) {
        setTimeout(() => scrollToBottom(true), 50);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      window.visualViewport.addEventListener('scroll', handleResize);
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
        window.visualViewport.removeEventListener('scroll', handleResize);
      }
    };
  }, [isFocused]);

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages.length, isTyping, isFocused, showEmojiPicker]);

  useEffect(() => {
    if(realMessages.length > 0 && !isAi) markAsRead();
  }, [realMessages.length, isAi, markAsRead]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setInputText(val);
      if (!isAi) updateTypingStatus(true);
      if (onTyping) {
          onTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => onTyping(false), 3000);
      }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (enterToSend && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    
    if (!isAi) updateTypingStatus(false);
    if (onTyping) onTyping(false);

    const text = inputText;
    setInputText('');
    setShowEmojiPicker(false);
    setShowAttachMenu(false);
    
    if (isAi) {
        onSendMessage(chat.id, text);
        setIsAiTyping(true);
        const history = chat.messages.map(m => ({ role: (m.senderId === 'me' ? 'user' : 'model') as 'user' | 'model', text: m.text }));
        try {
            const response = await generateAIResponse(history, text);
            setIsAiTyping(false);
            onSendMessage(chat.id, "AI_RESPONSE::" + response); 
        } catch (e) {
            setIsAiTyping(false);
            onSendMessage(chat.id, "AI_RESPONSE::Sorry, I am offline."); 
        }
    } else {
        sendReal(text);
    }
    
    scrollToBottom();
  };

  const handlePing = () => {
      if(isAi) onSendMessage(chat.id, "PING!!!", true);
      else sendReal("", true);
      scrollToBottom();
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'document') => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const url = URL.createObjectURL(file);
          if(isAi) onSendMessage(chat.id, "", false, { type, url, name: file.name });
          else sendReal("", false, { type, url, name: file.name });
          setShowAttachMenu(false);
      }
  };

  const formatTime = (timestamp: any) => {
      if (!timestamp) return '';
      const date = typeof timestamp === 'number' ? new Date(timestamp) : (timestamp.toDate ? timestamp.toDate() : new Date());
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const online = tick >= 0 && isUserOnline(chat.contact.lastActive);
  const showLastSeen = !chat.contact.isAi && chat.contact.showLastSeen !== false && !online;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col bg-[#f8fafc] dark:bg-bbm-darker overflow-hidden ${isIOS ? 'animate-ios-slide-in' : 'animate-android-fade-scale'}`}>
      <input type="file" ref={imageInputRef} className="hidden" accept="image/*" onChange={(e) => handleFileSelect(e, 'image')} />
      <input type="file" ref={videoInputRef} className="hidden" accept="video/*" onChange={(e) => handleFileSelect(e, 'video')} />
      <input type="file" ref={docInputRef} className="hidden" accept="*/*" onChange={(e) => handleFileSelect(e, 'document')} />
      <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => handleFileSelect(e, 'image')} />

      {/* HEADER - Positioned purely for the current viewport */}
      <div 
        className={`shrink-0 flex items-end justify-between z-40 w-full px-4 pb-3 transition-colors ${isIOS ? 'bg-white/95 dark:bg-bbm-darker/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800' : 'bg-bbm-blue text-white shadow-md pt-safe h-16 items-center'}`}
        style={isIOS ? { paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(44px + env(safe-area-inset-top))' } : {}}
      >
        <div className="flex items-center overflow-hidden flex-1 py-0.5">
          <button onClick={onBack} className={`mr-1 p-2 rounded-full transition-colors active:scale-95 ${isIOS ? 'text-bbm-blue hover:bg-gray-100 dark:hover:bg-gray-800 -ml-2' : 'text-white hover:bg-white/20'}`}>
            {isIOS ? <ChevronLeft size={32} /> : <ArrowLeft size={24} />}
          </button>
          
          <div className="relative cursor-pointer flex items-center overflow-hidden flex-1 active:opacity-70 transition-opacity" onClick={onViewProfile}>
            <img src={chat.contact.avatarUrl} alt={chat.contact.name} className={`rounded-xl object-cover shrink-0 ${isIOS ? 'w-9 h-9 mr-3 shadow-sm' : 'w-10 h-10 border-2 border-white/30 mr-3'}`} />
            <div className={`flex flex-col overflow-hidden ${isIOS ? 'text-slate-900 dark:text-white' : 'text-white mr-2'}`}>
                <h2 className="font-bold truncate text-base leading-none tracking-tight">{chat.contact.name}</h2>
                <div className="flex items-center text-[10px] mt-1 opacity-90">
                    <span className={`truncate max-w-[150px] font-medium ${isIOS ? 'text-gray-500' : 'opacity-90'}`}>
                        {isTyping ? <span className="animate-pulse font-bold text-bbm-blue dark:text-white">Typing...</span> : (
                            chat.contact.musicStatus ? `🎵 ${chat.contact.musicStatus}` : (
                                online ? <span className="flex items-center gap-1 text-green-500 font-bold"><span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online</span> : (
                                    showLastSeen ? `Last seen ${formatRelativeTime(chat.contact.lastActive)}` : chat.contact.statusMessage
                                )
                            )
                        )}
                    </span>
                </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
            <button onClick={() => onStartCall?.('voice')} className={`p-2 rounded-full active:scale-90 ${isIOS ? 'text-bbm-blue' : 'text-white'}`}><Phone size={20} /></button>
            <button onClick={() => onStartCall?.('video')} className={`p-2 rounded-full active:scale-90 ${isIOS ? 'text-bbm-blue' : 'text-white'}`}><Video size={20} /></button>
            <button onClick={() => setShowMenu(!showMenu)} className={`p-2 rounded-full active:scale-90 ${isIOS ? 'text-bbm-blue' : 'text-white'}`}><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div 
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto p-4 bg-[#f1f5f9] dark:bg-black/90 overscroll-contain"
        onClick={() => {
            if (isFocused) inputRef.current?.blur();
            setShowEmojiPicker(false);
            setShowAttachMenu(false);
        }}
      >
        <div className="space-y-4 pt-2 pb-4 min-h-full flex flex-col justify-end">
          {displayMessages.map((msg) => {
            const isMe = msg.senderId === 'me' || (currentUserId && msg.senderId === currentUserId);
            if (msg.isPing) return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} my-2`}>
                <div className="px-4 py-2 bg-white/80 dark:bg-black/80 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm"><span className="text-bbm-red font-black tracking-widest text-lg select-none">PING!!!</span></div>
                <div className="flex items-center space-x-1 mt-1 px-1 opacity-60"><span className="text-[9px] font-bold">{formatTime(msg.timestamp)}</span>{isMe && <StatusIcon status={msg.status} />}</div>
              </div>
            );
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={`max-w-[85%] px-3.5 py-2.5 relative shadow-sm text-[16px] break-words ${isMe ? 'bg-bbm-blue text-white rounded-2xl rounded-tr-none' : 'bg-white dark:bg-bbm-card text-slate-800 dark:text-gray-100 rounded-2xl rounded-tl-none border border-gray-100 dark:border-gray-800'}`}>
                  {msg.type === 'image' && msg.mediaUrl && <div className="mb-2 -mx-3.5 -mt-2.5"><img src={msg.mediaUrl} alt="sent" className="rounded-t-xl w-full h-auto max-h-72 object-cover" /></div>}
                  <p className="leading-snug whitespace-pre-wrap">{msg.text}</p>
                  <div className={`flex justify-end items-center mt-1 space-x-1 opacity-70 ${isMe ? 'text-blue-50' : 'text-gray-400'}`}><span className="text-[9px] font-medium">{formatTime(msg.timestamp)}</span>{isMe && <StatusIcon status={msg.status} />}</div>
                </div>
              </div>
            );
          })}
          {isTyping && <div className="flex justify-start"><div className="bg-white dark:bg-bbm-card border border-gray-100 dark:border-gray-800 rounded-2xl px-4 py-2 shadow-sm flex space-x-1"><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div><div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div></div></div>}
          <div ref={messagesEndRef} className="h-2" />
        </div>
      </div>

      {/* INPUT BAR - Adaptive Padding */}
      <div className="shrink-0 bg-white dark:bg-bbm-darker border-t border-gray-200 dark:border-gray-800 w-full z-50 transition-all shadow-[0_-5px_15px_rgba(0,0,0,0.03)]">
         {showAttachMenu && (
            <div className="absolute bottom-full left-2 mb-2 bg-white dark:bg-bbm-card rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 flex flex-col gap-1 z-50 animate-slide-up w-44">
                <button onClick={() => imageInputRef.current?.click()} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-bold uppercase tracking-wide"><ImageIcon size={18} className="text-purple-500 mr-3" /> Photo</button>
                <button onClick={() => videoInputRef.current?.click()} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-bold uppercase tracking-wide"><Film size={18} className="text-red-500 mr-3" /> Video</button>
                <button onClick={() => docInputRef.current?.click()} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-bold uppercase tracking-wide"><FileText size={18} className="text-blue-500 mr-3" /> Document</button>
                <button onClick={() => cameraInputRef.current?.click()} className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-bold uppercase tracking-wide"><Camera size={18} className="text-green-500 mr-3" /> Camera</button>
            </div>
         )}
         
         <div className="px-3 py-2.5 flex items-end gap-2 w-full">
             <button 
                onClick={handlePing} 
                disabled={isFocused}
                className={`h-11 w-11 shrink-0 flex items-center justify-center font-black text-[11px] rounded-full border transition-all active:scale-95 ${isFocused ? 'opacity-30 grayscale cursor-not-allowed' : 'text-bbm-red bg-red-50 dark:bg-red-900/10 border-red-100 hover:bg-red-100 shadow-sm'}`}
             >
                ((•))
             </button>
             
             <div 
                className={`flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center px-1.5 transition-all shadow-inner border ${isFocused ? 'border-bbm-blue ring-2 ring-bbm-blue/10 bg-white dark:bg-black/40' : 'border-transparent'}`}
             >
                 <button 
                    onClick={() => { inputRef.current?.blur(); setShowEmojiPicker(!showEmojiPicker); setShowAttachMenu(false); }} 
                    className={`p-2 transition-colors active:scale-95 shrink-0 ${showEmojiPicker ? 'text-bbm-blue' : 'text-gray-400'}`}
                 >
                    <Smile size={20}/>
                 </button>
                 
                 <textarea
                    ref={inputRef}
                    value={inputText}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => { 
                      setIsFocused(true); 
                      setShowEmojiPicker(false); 
                      setShowAttachMenu(false); 
                      // Precise scroll adjustment for keyboard appearance
                      setTimeout(() => scrollToBottom(true), 150); 
                    }}
                    onBlur={() => setIsFocused(false)}
                    placeholder="Message"
                    className="flex-1 bg-transparent py-2.5 px-2 text-sm text-slate-900 dark:text-white outline-none resize-none max-h-32 min-h-[40px] leading-normal"
                    rows={1}
                 />

                 <button 
                    onClick={() => { inputRef.current?.blur(); setShowAttachMenu(!showAttachMenu); setShowEmojiPicker(false); }} 
                    className={`p-2 transition-colors active:scale-95 shrink-0 ${showAttachMenu ? 'text-bbm-blue' : 'text-gray-400'}`}
                 >
                    <Paperclip size={18}/>
                 </button>
             </div>

             <button 
                onClick={handleSend} 
                disabled={!inputText.trim()} 
                className={`h-11 w-11 shrink-0 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 ${inputText.trim() ? 'bg-bbm-blue text-white scale-100' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}
             >
                <Send size={20} className={inputText.trim() ? 'ml-0.5' : ''}/>
             </button>
         </div>

         {showEmojiPicker && (
            <div className="p-2 h-[280px] overflow-y-auto grid grid-cols-8 gap-1 w-full bg-gray-50 dark:bg-black/20 border-t border-gray-100 dark:border-gray-800 animate-slide-up pb-safe no-scrollbar">
                {EMOJIS.map(e => <button key={e} onClick={() => { setInputText(inputText + e); scrollToBottom(); }} className="text-3xl p-2 hover:bg-white/50 rounded transition-all active:scale-125">{e}</button>)}
            </div>
         )}

         {/* Harbor pattern: Only show safe padding when keyboard is hidden */}
         {!isFocused && !showEmojiPicker && <div className="pb-safe h-2"></div>}
      </div>
    </div>
  );
};

export default ChatWindow;