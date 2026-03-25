import React, { useState, useEffect, useRef } from 'react';
import { NavTab, Screen, UserStatus } from './types';
import type { User, Chat, Message, CallSession, CustomList, FriendRequest, FeedItem } from './types';
import Header from './components/Header';
import BottomNav from './components/BottomNav';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import Profile from './components/Profile';
import ContactProfile from './components/ContactProfile';
import Contacts from './components/Contacts';
import Groups from './components/Groups';
import Feeds from './components/Feeds';
import Drawer from './components/Drawer';
import CallInterface from './components/CallInterface';
import { IncomingCallModal } from './components/IncomingCallModal';
import SplashScreen from './components/SplashScreen';
import { LoginScreen, RegisterScreen, TwoFAScreen, ForgotPasswordScreen } from './components/Auth';
import { NotificationsScreen, PrivacyScreen, SettingsScreen, HelpScreen } from './components/SubScreens';
import { playPingSound, playMessageSound } from './utils/sound';
import { fbUpdateUser, fbLogout, deleteUserAccount } from './services/authService';
import { createChat, findExistingChat, subscribeToChatList, setTypingStatus, deleteChat, markChatRead, sendMessage } from './services/chatService';
import { subscribeToRoster, sendFriendRequest, respondToFriendRequest, cancelFriendRequest, subscribeToFriendRequests, removeContactFromRoster } from './services/userService';
import { callService } from './services/callService';
import type { CallData } from './services/callService';
import { db, auth, isFirebaseConfigured } from './services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Laptop, Share, PlusSquare, X } from 'lucide-react';
import { useOnlinePresence } from './hooks/useOnlinePresence';
import { useNotifications } from './hooks/useNotifications';
import { isIOS as checkIsIOS, isPWA as checkIsPWA, setupVisibilityListener, handleAppResume } from './services/notificationService';

const AI_CONTACT: User = {
  id: 'ai_bot',
  name: 'BBM AI',
  pin: 'AI-GEN1',
  avatarUrl: 'https://cdn-icons-png.flaticon.com/512/4712/4712139.png',
  status: UserStatus.AVAILABLE,
  statusMessage: 'Ask me anything!',
  isAi: true,
  mood: '🤖',
  showLastSeen: true
};

const GlossyAsterisk = () => (
    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,_#ff5e5e,_#d60000)] shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.6)] z-10 border-[0.5px] border-red-900/10 overflow-hidden">
        <span className="text-white font-black text-[18px] leading-none drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)] pt-[5px] font-sans h-full w-full flex items-center justify-center transform scale-125">*</span>
        <span className="absolute top-[1px] left-[2px] w-[50%] h-[40%] bg-gradient-to-br from-white/90 to-white/10 rounded-[100%] blur-[0.3px] pointer-events-none"></span>
    </span>
);

const calculateTotalUnreadCount = (chats: Chat[], currentUserId: string): number => {
  return chats.reduce((total, chat) => {
    const lastMsg = chat.messages?.[chat.messages.length - 1];
    const isSentByMe = lastMsg && (lastMsg.senderId === 'me' || lastMsg.senderId === currentUserId);
    return !isSentByMe && chat.unreadCount > 0 ? total + chat.unreadCount : total;
  }, 0);
};

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
      try {
          const saved = localStorage.getItem('bbm_theme');
          if (saved) return saved === 'dark';
          return window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch { return false; }
  });

  const [showSplash, setShowSplash] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [enterToSend, setEnterToSend] = useState(true);

  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentScreen, setCurrentScreen] = useState<Screen>(Screen.SPLASH);

  // Data State
  const [chats, setChats] = useState<Chat[]>([]);
  const [contacts, setContacts] = useState<User[]>([AI_CONTACT]);
  const [groups, setGroups] = useState<Chat[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [customLists, setCustomLists] = useState<CustomList[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<NavTab>(NavTab.CHATS);
  const [isFeedView, setIsFeedView] = useState(false);
  
  const [lastFeedVisit, setLastFeedVisit] = useState<number>(() => {
      try {
          const saved = localStorage.getItem('bbm_last_feed_visit');
          return saved ? parseInt(saved) : 0;
      } catch { return 0; }
  }); 

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const activeChatIdRef = useRef<string | null>(null);
  const [viewingContactId, setViewingContactId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Call State
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [incomingCall, setIncomingCall] = useState<{data: CallData, id: string} | null>(null);
  
  const touchStartX = useRef<number | null>(null);

  // Hooks
  useOnlinePresence(currentUser?.id);
  useNotifications(currentUser?.id);

  // Initialize Visibility Listener
  useEffect(() => {
      setupVisibilityListener();
      if (document.visibilityState === 'visible') {
          handleAppResume();
      }
      
      const handleEnded = () => setActiveCall(null);
      window.addEventListener('bbm-call-ended', handleEnded);

      return () => {
        window.removeEventListener('bbm-call-ended', handleEnded);
      };
  }, []);

  // Handle Notification Clicks (from Service Worker)
  useEffect(() => {
    const handleSWMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OPEN_CHAT' && event.data?.chatId) {
        setActiveChatId(event.data.chatId);
        activeChatIdRef.current = event.data.chatId;
        if (!isDesktop) setCurrentScreen(Screen.CHAT);
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    return () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, [isDesktop]);

  // Handle Viewport Height & PWA Check
  useEffect(() => {
    const ios = checkIsIOS();
    const pwa = checkIsPWA();
    setIsIOS(ios);
    
    if (ios && !pwa) {
        const hasClosedPrompt = localStorage.getItem('bbm_install_prompt_closed');
        if (!hasClosedPrompt) {
            setTimeout(() => setShowInstallPrompt(true), 4000);
        }
    }
    
    const handleResize = () => {
        setIsDesktop(window.innerWidth >= 768);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
        window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
      activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
      if (contacts.length > 0) {
          const generatedFeeds: FeedItem[] = [];
          contacts.forEach(contact => {
              if (contact.isAi || contact.id === currentUser?.id) return;
              const timestamp = contact.lastStatusUpdate || contact.lastActive || 0; 
              if (contact.musicStatus) {
                  generatedFeeds.push({
                      id: `feed_music_${contact.id}_${contact.musicStatus.replace(/\s/g, '')}`,
                      userId: contact.id, userAvatar: contact.avatarUrl, userName: contact.name,
                      type: 'music', content: contact.musicStatus, timestamp: timestamp
                  });
              }
              if (contact.statusMessage && !['Available','Busy','Away','Using BBM Reborn'].includes(contact.statusMessage)) {
                   generatedFeeds.push({
                      id: `feed_status_${contact.id}_${contact.statusMessage.replace(/\s/g, '')}`,
                      userId: contact.id, userAvatar: contact.avatarUrl, userName: contact.name,
                      type: 'status', content: contact.statusMessage, timestamp: timestamp
                  });
              }
          });
          setFeeds(generatedFeeds.sort((a, b) => b.timestamp - a.timestamp));
      }
  }, [contacts, currentUser]);

  const handleFeedTabClick = () => {
      setIsFeedView(true);
      const now = Date.now();
      setLastFeedVisit(now);
      localStorage.setItem('bbm_last_feed_visit', now.toString());
  };

  const hasNewFeeds = feeds.length > 0 && (feeds[0].timestamp > lastFeedVisit);

  const handleSplashFinish = () => {
      setShowSplash(false);
      const bbmUser = localStorage.getItem('bbm_user');
      const savedProfileStr = localStorage.getItem('bbm_saved_profile');

      if (bbmUser) {
          try {
              setCurrentUser(JSON.parse(bbmUser));
              setIsAuthenticated(true);
              setCurrentScreen(Screen.MAIN);
              return;
          } catch(e) {}
      } 
      
      if (savedProfileStr && isFirebaseConfigured()) {
          setCurrentScreen(Screen.LOGIN);
      } else {
          setCurrentScreen(Screen.LOGIN);
      }
  };

  useEffect(() => {
      if (!auth) return;
      const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: any) => {
          if (firebaseUser) {
              setIsAuthenticated(true);
              if (([Screen.SPLASH, Screen.LOGIN, Screen.REGISTER] as Screen[]).includes(currentScreen)) {
                  setCurrentScreen(Screen.MAIN);
              }
          } else {
              const bbmUser = localStorage.getItem('bbm_user');
              if (!bbmUser) {
                  setIsAuthenticated(false);
                  setCurrentUser(null);
                  if (currentScreen !== Screen.SPLASH) {
                    setCurrentScreen(Screen.LOGIN);
                  }
              }
          }
      });
      return () => unsubscribeAuth();
  }, [auth, currentScreen]); 

  // --- Realtime Listeners ---
  useEffect(() => {
      if (!auth?.currentUser || !db) return;
      
      const userId = auth.currentUser.uid;
      const userRef = doc(db, "users", userId);
      const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
              const userData = docSnap.data() as User;
              if(!userData.id) userData.id = userId;
              setCurrentUser(userData);
              localStorage.setItem('bbm_user', JSON.stringify(userData));
          }
      });

      const unsubscribeRoster = subscribeToRoster(userId, (roster) => setContacts([AI_CONTACT, ...roster]));
      const unsubscribeRequests = subscribeToFriendRequests(userId, (incoming, outgoing) => {
          setIncomingRequests(incoming); setOutgoingRequests(outgoing);
      });
      
      const unsubscribeCalls = callService.listenForCalls(userId, (callData, callId) => {
          setIncomingCall({ data: callData, id: callId });
      });

      return () => { 
          unsubscribeUser(); 
          unsubscribeRoster(); 
          unsubscribeRequests();
          if (unsubscribeCalls) unsubscribeCalls();
      };
  }, [auth?.currentUser]);

  useEffect(() => {
      if (!currentUser || !db) return;
      const unsubscribeChats = subscribeToChatList(
          currentUser.id, contacts,
          (loadedChats) => {
              const processedChats = loadedChats.map(c => {
                  if (c.id === activeChatIdRef.current) {
                      if (c.unreadCount > 0) {
                          const sendReceipt = currentUser.enableReadReceipts !== false;
                          markChatRead(c.id, currentUser.id, sendReceipt);
                      }
                      return { ...c, unreadCount: 0 };
                  }
                  return c;
              });
              setChats(processedChats.filter(c => !c.isGroup));
              setGroups(processedChats.filter(c => c.isGroup));
          },
          () => {} 
      );
      return () => unsubscribeChats();
  }, [currentUser, activeChatId, contacts]); 

  // --- Call Handlers ---
  const handleInitiateCall = async (contact: User, type: 'voice' | 'video') => {
      if (!currentUser) return;
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          alert('Calls require a secure HTTPS connection.');
          return;
      }
      setActiveCall({ isActive: true, type, contact, status: 'ringing', startTime: Date.now() });
      const result = await callService.startCall(
          currentUser.id, currentUser.name, currentUser.avatarUrl, contact.id, type,
          (remoteStream) => {
              if ((window as any).setRemoteStream) (window as any).setRemoteStream(remoteStream);
          },
          (event, detail) => {
              if (event === 'error') { setActiveCall(null); }
              if (event === 'ended' || event === 'rejected') { setActiveCall(null); }
          }
      );
      if (result) {
          if ((window as any).setLocalStream) (window as any).setLocalStream(result.stream);
      } else {
          setActiveCall(null);
      }
  };

  const handleAnswerCall = async () => {
      if (!incomingCall || !currentUser) return;
      const { data, id } = incomingCall;
      setIncomingCall(null);
      const caller: User = { id: data.from, name: data.fromName || 'Unknown', avatarUrl: data.fromAvatar || '', pin: '????', status: UserStatus.BUSY, statusMessage: 'In a call' };
      setActiveCall({ isActive: true, type: data.type, contact: caller, status: 'connected', startTime: Date.now() });
      const localStream = await callService.answerCall(
          id, currentUser.id, data,
          (remoteStream) => {
              if ((window as any).setRemoteStream) (window as any).setRemoteStream(remoteStream);
          },
          (event) => {
              if (event === 'ended' || event === 'error') setActiveCall(null);
          }
      );
      if (localStream && (window as any).setLocalStream) (window as any).setLocalStream(localStream);
  };

  const handleRejectCall = () => { if (incomingCall && currentUser) { callService.rejectCall(currentUser.id, incomingCall.id); setIncomingCall(null); } };
  const handleEndCall = () => { callService.endCall(currentUser?.id, incomingCall?.id); setActiveCall(null); };

  const handleLoginSuccess = (user: User) => {
      setCurrentUser(user); 
      setIsAuthenticated(true); 
      setCurrentScreen(Screen.MAIN);
      localStorage.setItem('bbm_user', JSON.stringify(user));
  };

  const handleLogout = async () => {
      await fbLogout(); 
      setIsAuthenticated(false); 
      setCurrentUser(null); 
      setCurrentScreen(Screen.LOGIN);
      localStorage.removeItem('bbm_user');
      localStorage.removeItem('bbm_saved_profile');
  };

  const handleDeleteAccount = async () => {
      if (window.confirm("Permanently delete account?")) {
          const result = await deleteUserAccount();
          if (result.success) handleLogout();
          else alert("Error: " + result.message);
      }
  };

  const handleStartChat = async (contactId: string) => {
      if (!currentUser) return;
      const existingLocal = chats.find(c => c.contact.id === contactId);
      if (existingLocal) { handleSelectChat(existingLocal.id); return; }
      const contact = contacts.find(c => c.id === contactId);
      if (!contact) return;
      const existingChatData = await findExistingChat(currentUser.id, contactId);
      if (existingChatData) handleSelectChat(existingChatData.id);
      else {
          try {
              const newId = await createChat(currentUser, contact);
              if (newId) handleSelectChat(newId);
          } catch(e) {}
      }
  };

  const handleSelectChat = async (chatId: string) => {
      if (!currentUser) return;
      setActiveChatId(chatId);
      activeChatIdRef.current = chatId;
      if (!isDesktop) setCurrentScreen(Screen.CHAT);
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
      if (chatId !== 'ai_bot') {
          const sendReceipt = currentUser.enableReadReceipts !== false;
          await markChatRead(chatId, currentUser.id, sendReceipt);
      }
  };

  const handleAddContact = async (newContactOrPin: User | string) => {
      if (typeof newContactOrPin === 'object') {
           if(currentUser) sendFriendRequest(currentUser, newContactOrPin.pin);
           return;
      }
      if (currentUser && newContactOrPin) {
          const result = await sendFriendRequest(currentUser, newContactOrPin);
          alert(result.message);
      }
  };

  const handleDeleteChat = async (chatId: string) => {
      if (window.confirm("Delete chat history?")) {
          await deleteChat(chatId);
          setChats(prev => prev.filter(c => c.id !== chatId));
          if (activeChatId === chatId) {
              setActiveChatId(null); activeChatIdRef.current = null;
              if (!isDesktop) setCurrentScreen(Screen.MAIN);
          }
      }
  };

  const handleRemoveContact = async (contactId: string) => {
      if (!currentUser) return;
      const associatedChat = chats.find(c => c.contact.id === contactId);
      if (window.confirm("Remove contact?")) {
          await removeContactFromRoster(currentUser.id, contactId);
          if (associatedChat) await deleteChat(associatedChat.id);
          setContacts(prev => prev.filter(c => c.id !== contactId));
          setChats(prev => prev.filter(c => c.contact.id !== contactId));
          if (activeChatId && chats.find(c => c.id === activeChatId)?.contact.id === contactId) {
              if(!isDesktop) setCurrentScreen(Screen.MAIN);
              setActiveChatId(null); activeChatIdRef.current = null;
          }
      }
  };

  const handleRespondRequest = async (request: FriendRequest, action: 'accepted' | 'ignored') => {
      if (currentUser) await respondToFriendRequest(request, action, currentUser);
  };

  const handleSendMessage = async (chatId: string, text: string, isPing: boolean = false, media?: any) => {
      if (!currentUser) return;
      if (chatId === 'ai_bot') {
          if (isPing) playPingSound(); else playMessageSound();
          const newMessage: Message = { id: Date.now().toString(), text: text, senderId: currentUser.id, timestamp: Date.now(), isPing, status: 'sent', type: media ? media.type : 'text', mediaUrl: media ? media.url : undefined, fileName: media ? media.name : undefined };
          setChats(prev => {
              const idx = prev.findIndex(c => c.id === 'ai_bot');
              if (idx === -1) return [{ id: 'ai_bot', contact: AI_CONTACT, messages: [newMessage], unreadCount: 0, lastMessageTime: Date.now(), isGroup: false }, ...prev];
              const updated = { ...prev[idx], messages: [...prev[idx].messages, newMessage], lastMessageTime: Date.now() };
              const newChats = [...prev]; newChats[idx] = updated; return newChats;
          });
          return;
      }
      if (isPing) playPingSound(); else playMessageSound();
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
          await sendMessage(chatId, { id: '', senderId: currentUser.id, text: text, isPing: isPing, status: 'sent', timestamp: Date.now(), type: media ? media.type : 'text', mediaUrl: media?.url, fileName: media?.name }, chat.contact.id);
      }
  };

  const handleTyping = (isTyping: boolean) => {
      if (currentUser && activeChatId && activeChatId !== 'ai_bot') setTypingStatus(activeChatId, currentUser.id, isTyping);
  };

  const getActiveChatObject = () => {
      const chatMeta = chats.find(c => c.id === activeChatId) || groups.find(c => c.id === activeChatId);
      if (activeChatId === 'ai_bot') return chatMeta || { id: 'ai_bot', contact: AI_CONTACT, messages: [], unreadCount: 0, lastMessageTime: Date.now(), isGroup: false };
      return chatMeta ? { ...chatMeta } : null;
  };

  const activeChatObj = getActiveChatObject();
  const handleCreateList = (list: CustomList) => {
      const updatedLists = [...customLists, list];
      setCustomLists(updatedLists);
      localStorage.setItem('bbm_custom_lists', JSON.stringify(updatedLists));
  };

  const handleStatusUpdate = (status: string, message: string, music: string, mood: string, name?: string, showActivity?: boolean) => {
      if (!currentUser) return;
      const updatedUser = { 
          ...currentUser, 
          status: status as UserStatus, 
          statusMessage: message, 
          musicStatus: music, 
          mood, 
          name: name || currentUser.name, 
          showActivity: showActivity ?? currentUser.showActivity, 
          lastStatusUpdate: Date.now() 
      };
      setCurrentUser(updatedUser); 
      fbUpdateUser(updatedUser); 
  };

  const toggleTheme = () => {
      setIsDarkMode(prev => { const newMode = !prev; localStorage.setItem('bbm_theme', newMode ? 'dark' : 'light'); return newMode; });
  };

  const handleTouchStart = (e: React.TouchEvent) => { if (currentScreen === Screen.MAIN && !activeChatId && !isDrawerOpen) touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => { if (touchStartX.current !== null) { const touchEndX = e.changedTouches[0].clientX; if (touchStartX.current < 40 && touchEndX > touchStartX.current + 50) setIsDrawerOpen(true); touchStartX.current = null; } };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div 
        className="w-full h-[100dvh] bg-bbm-light dark:bg-bbm-darker overflow-hidden overscroll-none flex flex-col" style={{height: "100dvh"}}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
          <div className="flex-1 w-full relative flex flex-col md:flex-row md:justify-center overflow-hidden">
            {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
            {incomingCall && ( <IncomingCallModal call={incomingCall.data} onAccept={handleAnswerCall} onReject={handleRejectCall} /> )}
            {activeCall && currentUser && ( <CallInterface contact={activeCall.contact} type={activeCall.type} onEndCall={handleEndCall} isDarkMode={isDarkMode} isIOS={isIOS} isIncoming={activeCall.status === 'connected'} currentUserId={currentUser.id || ''} /> )}

            {showInstallPrompt && (
                <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 bg-slate-900/90 backdrop-blur-md text-white animate-slide-up border-t border-white/10 shadow-2xl">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 pr-4">
                            <h3 className="font-bold text-sm mb-1 flex items-center gap-2"><PlusSquare size={16} className="text-bbm-blue" /> Add to Home Screen</h3>
                            <p className="text-xs opacity-90 leading-relaxed">Install this app to enable notifications and full screen mode.</p>
                            <p className="text-xs mt-2 flex items-center gap-1.5 font-medium text-blue-200">Tap <Share size={14} /> then "Add to Home Screen"</p>
                        </div>
                        <button onClick={() => { setShowInstallPrompt(false); localStorage.setItem('bbm_install_prompt_closed', 'true'); }} className="p-1 opacity-60 hover:opacity-100"><X size={20} /></button>
                    </div>
                </div>
            )}

            {currentScreen === Screen.LOGIN && <LoginScreen onNavigate={setCurrentScreen} onLoginSuccess={handleLoginSuccess} screen={Screen.LOGIN} />}
            {currentScreen === Screen.REGISTER && <RegisterScreen onNavigate={setCurrentScreen} onLoginSuccess={handleLoginSuccess} screen={Screen.REGISTER} />}
            {currentScreen === Screen.FORGOT_PASSWORD && <ForgotPasswordScreen onNavigate={setCurrentScreen} onLoginSuccess={handleLoginSuccess} screen={Screen.FORGOT_PASSWORD} />}
            {currentScreen === Screen.TWO_FA && <TwoFAScreen onNavigate={setCurrentScreen} onLoginSuccess={handleLoginSuccess} screen={Screen.TWO_FA} />}

            {currentUser && isAuthenticated && (
                <div className="flex w-full h-full max-w-screen-2xl mx-auto relative overflow-hidden">
                    <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} currentUser={currentUser} onUpdateStatus={(s) => handleStatusUpdate(s, currentUser.statusMessage, currentUser.musicStatus || '', currentUser.mood || '', currentUser.name, currentUser.showActivity)} isDarkMode={isDarkMode} onNavigate={(s: Screen) => setCurrentScreen(s)} />

                    {/* LEFT PANE / MOBILE MAIN VIEW */}
                    <div className={`flex flex-col h-full bg-bbm-light dark:bg-bbm-darker transition-all duration-200 z-10 overflow-hidden ${isDesktop ? 'w-[380px] shrink-0 border-r border-gray-200 dark:border-gray-800' : 'w-full'} ${!isDesktop && currentScreen !== Screen.MAIN ? 'hidden' : 'flex'}`}>
                        <Header user={currentUser} title={activeTab === NavTab.CHATS ? "Chats" : activeTab === NavTab.CONTACTS ? "Contacts" : "Groups"} showUserInfo={activeTab === NavTab.CHATS} isDarkMode={isDarkMode} onProfileClick={() => setCurrentScreen(Screen.PROFILE)} onNewChat={() => setActiveTab(NavTab.CONTACTS)} onOpenDrawer={() => setIsDrawerOpen(true)} isIOS={isIOS} />
                        
                        <div className="flex-1 flex flex-col overflow-hidden relative z-0">
                            {activeTab === NavTab.CHATS && (
                                <>
                                    <div className="bg-white/95 dark:bg-bbm-darker/95 backdrop-blur-sm z-20 px-4 py-2 border-b border-gray-100 dark:border-gray-800 shrink-0">
                                        <div className="bg-gray-100 dark:bg-gray-800/50 p-1 rounded-xl flex items-center relative">
                                            <button onClick={() => setIsFeedView(false)} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 relative ${!isFeedView ? 'bg-white dark:bg-bbm-card text-bbm-blue shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>Chats {calculateTotalUnreadCount(chats, currentUser.id) > 0 && <GlossyAsterisk />}</button>
                                            <button onClick={handleFeedTabClick} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all duration-200 relative ${isFeedView ? 'bg-white dark:bg-bbm-card text-bbm-blue shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>Feeds {hasNewFeeds && <GlossyAsterisk />}</button>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-hidden relative">
                                        {isFeedView ? <Feeds feeds={feeds} /> : ( <ChatList chats={chats} onSelectChat={handleSelectChat} onDeleteChat={handleDeleteChat} customLists={customLists} onCreateList={handleCreateList} onRemoveContact={handleRemoveContact} currentUserId={currentUser.id} /> )}
                                    </div>
                                </>
                            )}
                            {activeTab === NavTab.CONTACTS && ( <Contacts contacts={contacts} onStartChat={handleStartChat} onAddContact={handleAddContact} incomingRequests={incomingRequests} outgoingRequests={outgoingRequests} onAcceptRequest={(req) => handleRespondRequest(req, 'accepted')} onDeclineRequest={(id) => handleRespondRequest({id} as FriendRequest, 'ignored')} onCancelRequest={cancelFriendRequest} onRemoveContact={handleRemoveContact} /> )}
                            {activeTab === NavTab.GROUPS && <Groups groups={groups} onSelectGroup={handleSelectChat} isIOS={isIOS} />}
                        </div>
                        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} onOpenDrawer={() => setIsDrawerOpen(true)} onOpenMore={() => setCurrentScreen(Screen.PROFILE)} unreadCount={calculateTotalUnreadCount(chats, currentUser.id)} requestCount={incomingRequests.length} hasNewFeeds={hasNewFeeds} isIOS={isIOS} />
                    </div>

                    <div className={`flex flex-col bg-gray-50 dark:bg-black overflow-hidden ${isDesktop ? 'flex-1 h-full relative' : 'fixed inset-0 z-20 w-full h-full'} ${!isDesktop && !( [Screen.CHAT, Screen.PROFILE, Screen.CONTACT_PROFILE, Screen.SETTINGS, Screen.PRIVACY, Screen.NOTIFICATIONS, Screen.HELP] as Screen[] ).includes(currentScreen) ? 'hidden' : ''}`}>
                        {isDesktop && !activeChatId && currentScreen === Screen.MAIN && (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-[#0b0f19]">
                                <div className="w-24 h-24 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6 animate-pulse"><Laptop size={48} className="opacity-50" /></div>
                                <h2 className="text-xl font-bold text-slate-700 dark:text-gray-300">BBM for Web</h2>
                                <p className="text-sm mt-2">Select a chat to start messaging</p>
                            </div>
                        )}
                        {activeChatObj && (isDesktop || currentScreen === Screen.CHAT) && (
                            <div className="flex h-full w-full overflow-hidden">
                                <ChatWindow 
                                    chat={activeChatObj} 
                                    currentUserId={currentUser.id} 
                                    onBack={() => { setActiveChatId(null); activeChatIdRef.current = null; if(!isDesktop) setCurrentScreen(Screen.MAIN); }} 
                                    onSendMessage={handleSendMessage} 
                                    onTyping={handleTyping}
                                    isDarkMode={isDarkMode} 
                                    enterToSend={enterToSend} 
                                    isIOS={isIOS} 
                                    onViewProfile={() => { setViewingContactId(activeChatObj.contact.id); setCurrentScreen(Screen.CONTACT_PROFILE); }} 
                                    onStartCall={(type) => handleInitiateCall(activeChatObj.contact, type)} 
                                    onRemoveContact={handleRemoveContact} 
                                />
                            </div>
                        )}
                        {currentScreen === Screen.PROFILE && <Profile user={currentUser} onUpdateStatus={handleStatusUpdate} onNavigate={(s: Screen) => setCurrentScreen(s)} onBack={() => setCurrentScreen(Screen.MAIN)} onLogout={handleLogout} isIOS={isIOS} />}
                        {currentScreen === Screen.CONTACT_PROFILE && viewingContactId && ( <ContactProfile user={contacts.find(c => c.id === viewingContactId) || (activeChatObj?.contact.id === viewingContactId ? activeChatObj?.contact : AI_CONTACT)} onBack={() => { setViewingContactId(null); activeChatId ? setCurrentScreen(Screen.CHAT) : setCurrentScreen(Screen.MAIN); }} onMessage={() => !isDesktop && setCurrentScreen(Screen.CHAT)} onCall={(type) => handleInitiateCall(contacts.find(c => c.id === viewingContactId) || AI_CONTACT, type)} onBlock={() => {}} isIOS={isIOS} onRemoveContact={handleRemoveContact} /> )}
                        {currentScreen === Screen.SETTINGS && ( <SettingsScreen onBack={() => setCurrentScreen(Screen.PROFILE)} title="Settings" isDarkMode={isDarkMode} toggleTheme={toggleTheme} enterToSend={enterToSend} setEnterToSend={setEnterToSend} isIOS={isIOS} onDeleteAccount={handleDeleteAccount} currentUser={currentUser} onUpdateUser={fbUpdateUser} /> )}
                        {currentScreen === Screen.HELP && <HelpScreen onBack={() => setCurrentScreen(Screen.PROFILE)} title="Help" isIOS={isIOS} />}
                        {currentScreen === Screen.PRIVACY && <PrivacyScreen onBack={() => setCurrentScreen(Screen.PROFILE)} title="Privacy" isIOS={isIOS} currentUser={currentUser} onUpdateUser={fbUpdateUser} />}
                        {currentScreen === Screen.NOTIFICATIONS && <NotificationsScreen userId={currentUser.id} onBack={() => setCurrentScreen(Screen.PROFILE)} title="Notifications" isIOS={isIOS} />}
                    </div>
                </div>
            )}
          </div>
      </div>
    </div>
  );
};

export default App;