import React, { useState, useRef, useEffect } from 'react';
import type { User, FriendRequest } from '../types';
import { UserStatus } from '../types';
import { Search, Share2, QrCode, X, Plus, Globe, Zap, ArrowDownLeft, ArrowUpRight, Check, Trash2 } from 'lucide-react';

interface ContactsProps {
  contacts: User[];
  onStartChat: (userId: string) => void;
  onAddContact?: (user: User | string) => void;
  incomingRequests?: FriendRequest[];
  outgoingRequests?: FriendRequest[];
  onAcceptRequest?: (request: FriendRequest) => void;
  onDeclineRequest?: (requestId: string) => void;
  onCancelRequest?: (requestId: string) => void;
  onRemoveContact?: (contactId: string) => void;
  isIOS?: boolean;
}

const ContactRow: React.FC<{ contact: User; onStartChat: () => void; onRemove: () => void; isLast: boolean }> = ({ contact, onStartChat, onRemove, isLast }) => {
    const [offset, setOffset] = useState(0);
    const startX = useRef(0);
    const currentOffset = useRef(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        currentOffset.current = offset;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX.current;
        
        let newOffset = currentOffset.current + diff;
        
        // Allow swiping left (negative offset) for delete
        if (newOffset > 0) newOffset = 0; 
        if (newOffset < -80) newOffset = -80; 
        
        setOffset(newOffset);
    };

    const handleTouchEnd = () => {
        if (offset < -40) {
            setOffset(-80); // Snap open
        } else {
            setOffset(0); // Snap closed
        }
    };

    return (
        <div className="relative overflow-hidden w-full">
            {/* Background Layer (Delete) */}
            <div className="absolute inset-0 flex justify-end items-center bg-red-500">
                <button 
                    onClick={(e) => { e.stopPropagation(); onRemove(); setOffset(0); }}
                    className="h-full w-20 flex items-center justify-center text-white"
                >
                    <Trash2 size={24} />
                </button>
            </div>

            {/* Foreground Content */}
            <div 
                className={`relative bg-white dark:bg-bbm-card flex items-center px-4 py-3 active:bg-gray-50 dark:active:bg-gray-800 transition-transform duration-300 ease-out cursor-pointer ${!isLast ? 'border-b border-gray-100 dark:border-gray-800' : ''}`}
                style={{ transform: `translateX(${offset}px)` }}
                onClick={() => {
                    if (offset !== 0) setOffset(0);
                    else onStartChat();
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="relative shrink-0">
                    <img src={contact.avatarUrl} className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 object-cover" alt="" />
                    {contact.isAi && <div className="absolute -top-1 -right-1 bg-bbm-blue text-[8px] text-white px-1.5 py-0.5 rounded-full font-bold shadow-sm border border-white">AI</div>}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                    <h3 className="text-slate-900 dark:text-white font-semibold text-sm truncate">{contact.name}</h3>
                    <p className="text-gray-500 text-xs truncate max-w-[200px]">{contact.statusMessage}</p>
                </div>
            </div>
        </div>
    );
};

const Contacts: React.FC<ContactsProps> = ({ 
    contacts, 
    onStartChat, 
    onAddContact, 
    incomingRequests = [],
    outgoingRequests = [],
    onAcceptRequest,
    onDeclineRequest,
    onCancelRequest,
    onRemoveContact
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'contacts' | 'requests'>('contacts');
  const [isScanning, setIsScanning] = useState(false);
  const [showMyQr, setShowMyQr] = useState(false);
  const [scanResult, setScanResult] = useState<User | null>(null);
  const [manualPin, setManualPin] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const getCurrentUser = () => {
      const u = localStorage.getItem('bbm_user') || sessionStorage.getItem('bbm_user');
      return u ? JSON.parse(u) : { name: 'Me', pin: '??????', avatarUrl: '' };
  };
  const currentUser = getCurrentUser();

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.pin.includes(searchTerm)
  );

  const groupedContacts: {[key: string]: User[]} = {};
  filteredContacts.forEach(contact => {
    const firstLetter = contact.name.charAt(0).toUpperCase();
    if (!groupedContacts[firstLetter]) groupedContacts[firstLetter] = [];
    groupedContacts[firstLetter].push(contact);
  });

  const sortedKeys = Object.keys(groupedContacts).sort();

  const handleInvite = async () => {
      const pin = currentUser.pin;
      const shareData = {
          title: 'Join me on BBM Reborn',
          text: `Add me on BBM Reborn! My PIN is ${pin}.`,
          url: window.location.href
      };

      try {
          if (navigator.share) {
              await navigator.share(shareData);
          } else {
              navigator.clipboard.writeText(`Add me on BBM Reborn! My PIN is ${pin}.`);
              alert('Invite message copied to clipboard!');
          }
      } catch (err) {
          console.error('Error sharing:', err);
      }
  };

  const startScan = async () => {
      setIsScanning(true);
      setShowMyQr(false);
      setScanResult(null);
      
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } } 
          });
          
          streamRef.current = stream;
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.onloadedmetadata = () => {
                  videoRef.current?.play();
              };
          }

          setTimeout(() => {
              const mockUser: User = {
                  id: 'scanned_' + Date.now(),
                  name: 'Scanned Friend',
                  pin: 'QR' + Math.floor(1000 + Math.random() * 9000),
                  avatarUrl: `https://picsum.photos/200/200?random=${Date.now()}`,
                  status: UserStatus.AVAILABLE,
                  statusMessage: 'Hey! I just scanned you.',
                  lastActive: Date.now()
              };
              setScanResult(mockUser);
              if (videoRef.current) videoRef.current.pause();
          }, 3500);

      } catch (e) {
          console.error("Camera error", e);
          alert("Could not access camera.");
          setIsScanning(false);
      }
  };

  const stopScan = () => {
      setIsScanning(false);
      setShowMyQr(false);
      setScanResult(null);
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
      }
  };

  const confirmAdd = () => {
      if (scanResult && onAddContact) {
          onAddContact(scanResult);
          stopScan();
      }
  };
  
  const handleManualAdd = () => {
      if(!manualPin.trim()) return;
      if(onAddContact) onAddContact(manualPin.toUpperCase());
      setManualPin('');
  };

  useEffect(() => {
      return () => {
          if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
          }
      };
  }, []);

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=bbm:${currentUser.pin}&bgcolor=ffffff`;
  
  const requestCount = incomingRequests.length;
  
  return (
    <div className="flex-1 bg-bbm-light dark:bg-bbm-darker overflow-y-auto pb-32 transition-colors duration-300 no-scrollbar">
      
      {/* Toggle View: Contacts | Requests */}
      <div className="px-4 mb-2 mt-2 sticky top-0 z-20 bg-bbm-light dark:bg-bbm-darker py-2">
          <div className="flex bg-gray-200 dark:bg-gray-800 rounded-xl p-1">
              <button 
                  onClick={() => setView('contacts')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${view === 'contacts' ? 'bg-white dark:bg-bbm-card text-bbm-blue shadow-sm' : 'text-gray-500'}`}
              >
                  All Contacts
              </button>
              <button 
                  onClick={() => setView('requests')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${view === 'requests' ? 'bg-white dark:bg-bbm-card text-bbm-blue shadow-sm' : 'text-gray-500'}`}
              >
                  Requests
                  {requestCount > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 rounded-full">{requestCount}</span>}
              </button>
          </div>
      </div>

      {view === 'contacts' && (
          <>
            <div className="px-4 mb-3">
                <div className="bg-white dark:bg-bbm-card rounded-xl flex items-center px-4 py-3 border border-gray-200 dark:border-gray-800 shadow-sm">
                    <Search size={18} className="text-gray-400 mr-3" />
                    <input 
                        type="text" 
                        placeholder="Filter contacts..." 
                        className="bg-transparent text-slate-900 dark:text-white w-full outline-none text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="space-y-4 px-4 pb-4">
                {sortedKeys.map(letter => (
                    <div key={letter}>
                        <div className="px-2 py-2 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">{letter}</div>
                        <div className="bg-white dark:bg-bbm-card rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
                            {groupedContacts[letter].map((contact, idx) => (
                                <ContactRow 
                                    key={contact.id} 
                                    contact={contact} 
                                    onStartChat={() => onStartChat(contact.id)}
                                    onRemove={() => onRemoveContact && onRemoveContact(contact.id)}
                                    isLast={idx === groupedContacts[letter].length - 1}
                                />
                            ))}
                        </div>
                    </div>
                ))}
                {contacts.length <= 1 && (
                    <div className="text-center py-8 opacity-60">
                        <p className="text-sm">No contacts found.</p>
                        <p className="text-xs">Switch to Requests tab to add people!</p>
                    </div>
                )}
            </div>
          </>
      )}

      {view === 'requests' && (
          <div className="px-4 space-y-6">
              
              <div className="bg-white dark:bg-bbm-card rounded-2xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Globe size={14} className="text-bbm-blue"/> Add Global Contact</h3>
                  
                  <div className="flex gap-2 mb-4">
                      <input 
                          className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 outline-none text-sm text-slate-900 dark:text-white font-mono uppercase"
                          placeholder="ENTER PIN"
                          value={manualPin}
                          onChange={(e) => setManualPin(e.target.value)}
                      />
                      <button onClick={handleManualAdd} className="bg-bbm-blue text-white p-3 rounded-xl hover:bg-bbm-blue/90 shadow-lg shadow-bbm-blue/30"><Plus size={20}/></button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                        <button onClick={startScan} className="flex flex-col items-center justify-center space-y-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-slate-700 dark:text-white py-3 rounded-xl font-semibold active:scale-[0.98] transition-all"><QrCode size={20} className="text-bbm-blue" /><span className="text-[10px]">Scan QR</span></button>
                        <button onClick={handleInvite} className="flex flex-col items-center justify-center space-y-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-slate-700 dark:text-white py-3 rounded-xl font-semibold active:scale-[0.98] transition-all"><Share2 size={20} className="text-bbm-blue" /><span className="text-[10px]">Share PIN</span></button>
                  </div>
              </div>

              {/* Incoming */}
              <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Received ({incomingRequests.length})</h3>
                  {incomingRequests.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 text-xs italic bg-white/50 dark:bg-black/20 rounded-xl">No pending incoming requests</div>
                  ) : (
                      incomingRequests.map(req => (
                          <div key={req.id} className="flex items-center justify-between bg-white dark:bg-bbm-card p-3 rounded-xl mb-2 shadow-sm border border-gray-100 dark:border-gray-800">
                              <div className="flex items-center gap-3">
                                  <div className="relative">
                                      <img src={req.fromUser.avatarUrl} className="w-10 h-10 rounded-full object-cover" alt=""/>
                                      <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-0.5 rounded-full border-2 border-white"><ArrowDownLeft size={10}/></div>
                                  </div>
                                  <div>
                                      <h4 className="font-bold text-sm dark:text-white">{req.fromUser.name}</h4>
                                      <p className="text-[10px] text-gray-500">PIN: {req.fromUser.pin}</p>
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => onAcceptRequest && onAcceptRequest(req)} className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 shadow-lg shadow-green-500/20"><Check size={18}/></button>
                                  <button onClick={() => onDeclineRequest && onDeclineRequest(req.id)} className="bg-red-50 text-red-500 border border-red-100 p-2 rounded-lg hover:bg-red-100"><X size={18}/></button>
                              </div>
                          </div>
                      ))
                  )}
              </div>

              {/* Outgoing */}
              <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Sent ({outgoingRequests.length})</h3>
                  {outgoingRequests.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 text-xs italic bg-white/50 dark:bg-black/20 rounded-xl">No pending outgoing requests</div>
                  ) : (
                      outgoingRequests.map(req => (
                          <div key={req.id} className="flex items-center justify-between p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-black/20">
                              <div className="flex items-center gap-3 opacity-80">
                                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                      <ArrowUpRight size={16} className="text-gray-500"/>
                                  </div>
                                  <div>
                                      <p className="text-xs font-bold dark:text-gray-300">{req.toUserId}</p>
                                      <p className="text-[10px] text-gray-400">Waiting for approval...</p>
                                  </div>
                              </div>
                              <button onClick={() => onCancelRequest && onCancelRequest(req.id)} className="text-gray-400 hover:text-red-500 p-2 text-xs font-bold border border-transparent hover:border-red-200 rounded-lg">
                                  Cancel
                              </button>
                          </div>
                      ))
                  )}
              </div>

          </div>
      )}

      {isScanning && (
          <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center animate-fade-in">
              <button onClick={stopScan} className="absolute top-4 left-4 text-white p-2 bg-black/50 rounded-full z-50"><X size={28} /></button>
              <div className="absolute top-4 right-4 z-50"><button onClick={() => setShowMyQr(!showMyQr)} className="text-xs font-bold px-3 py-1.5 rounded-full bg-white text-black">{showMyQr ? 'Hide QR' : 'Show My QR'}</button></div>
              
              {!scanResult ? (
                  <div className="relative w-full h-full flex flex-col items-center justify-center">
                        <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover opacity-80" playsInline muted autoPlay></video>
                        {!showMyQr ? (
                            <div className="relative z-10 w-64 h-64 border-4 border-bbm-blue/70 rounded-3xl overflow-hidden shadow-[0_0_100px_rgba(0,168,232,0.5)] backdrop-blur-sm">
                                <div className="w-full h-full bg-bbm-blue/5 animate-pulse relative"><div className="absolute top-0 left-0 w-full h-1 bg-bbm-blue shadow-[0_0_20px_#00A8E8] animate-[scan_2s_infinite_linear]"></div><Zap size={24} className="absolute top-2 right-2 text-white/50" /></div>
                            </div>
                        ) : (
                            <div className="relative z-10 bg-white p-4 rounded-3xl shadow-2xl flex flex-col items-center animate-fade-in">
                                <h3 className="text-black font-bold mb-2">My QR Code</h3>
                                <img src={qrUrl} alt="My QR" className="w-56 h-56" />
                                <p className="text-bbm-blue font-mono font-bold mt-2 text-lg">{currentUser.pin}</p>
                            </div>
                        )}
                  </div>
              ) : (
                  <div className="bg-white dark:bg-bbm-card p-6 rounded-3xl w-[80%] max-w-sm flex flex-col items-center z-50 animate-fade-in shadow-2xl">
                      <img src={scanResult.avatarUrl} className="w-24 h-24 rounded-full border-4 border-white dark:border-bbm-card mb-4" alt="" />
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{scanResult.name}</h2>
                      <p className="text-gray-500 font-mono mb-6">{scanResult.pin}</p>
                      <button onClick={confirmAdd} className="w-full bg-bbm-blue text-white py-3 rounded-xl font-bold mb-2">Add Contact</button>
                      <button onClick={() => setScanResult(null)} className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold">Scan Again</button>
                  </div>
              )}
              <style>{`@keyframes scan { 0% { top: 0%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 100%; opacity: 0; } }`}</style>
          </div>
      )}
    </div>
  );
};

export default Contacts;