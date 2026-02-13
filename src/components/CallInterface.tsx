import React, { useState, useEffect, useRef } from 'react';
import type { User } from '../types';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Camera, Signal, Minimize2, Volume2, Loader, AlertCircle, Maximize2, MessageSquare } from 'lucide-react';
import { callService } from '../services/callService';

interface CallInterfaceProps {
  contact: User;
  type: 'voice' | 'video';
  onEndCall: () => void;
  isDarkMode?: boolean;
  isIOS?: boolean;
  isIncoming?: boolean;
  currentUserId: string;
}

const CallInterface: React.FC<CallInterfaceProps> = ({ 
    contact, 
    type, 
    onEndCall, 
    isDarkMode = false,
    isIOS, 
    isIncoming,
    currentUserId
}) => {
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected' | 'error'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(type === 'video');
  const [isMinimized, setIsMinimized] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Helper to ensure Safari plays the video once the stream is attached
  // Note: Safari requires a user interaction or specific attributes to play unmuted video
  const attachStream = (videoRef: React.RefObject<HTMLVideoElement | null>, stream: MediaStream) => {
    if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
            playPromise.catch(e => {
                console.warn("Autoplay blocked or failed on Safari:", e);
                // If it's the remote video (not muted), Safari might block it until a click
                setErrorMessage("Tap the screen to enable audio/video if it doesn't start.");
            });
        }
    }
  };

  useEffect(() => {
    // 1. Immediately attach local stream if available (for Caller)
    if (callService.localStream) {
        attachStream(localVideoRef, callService.localStream);
    }

    // 2. Handle stream setters for the peer connection
    (window as any).setRemoteStream = (stream: MediaStream) => {
      if (remoteVideoRef.current) {
        attachStream(remoteVideoRef, stream);
        setCallStatus('connected');
      }
    };
    
    (window as any).setLocalStream = (stream: MediaStream) => {
      attachStream(localVideoRef, stream);
    };

    if (isIncoming) setCallStatus('connected');
    else setCallStatus('ringing');

    // 3. Error listener
    const handleError = (e: any) => {
      setErrorMessage(e.detail || "Connection lost.");
      setCallStatus('error');
    };
    window.addEventListener('bbm-call-error', handleError);

    return () => {
      (window as any).setRemoteStream = null;
      (window as any).setLocalStream = null;
      window.removeEventListener('bbm-call-error', handleError);
    };
  }, [isIncoming]);

  useEffect(() => {
    let interval: any;
    if (callStatus === 'connected') {
        interval = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const handleToggleMute = (): void => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    callService.toggleMute(newMute);
  };

  const handleToggleVideo = (): void => {
    const newVideo = !isVideoOff;
    setIsVideoOff(newVideo);
    callService.toggleVideo(!newVideo);
  };

  const formatDuration = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleRetry = () => {
    onEndCall();
    window.location.reload();
  };

  // UI styling based on dark mode and connection status
  const themeBg = isDarkMode ? 'bg-black' : 'bg-gray-900';
  const gradientOverlay = isDarkMode 
    ? 'bg-gradient-to-br from-black via-gray-950 to-black' 
    : 'bg-gradient-to-br from-slate-950 via-[#004A66] to-slate-950';

  // Error State UI
  if (callStatus === 'error') {
    return (
      <div className={`fixed inset-0 z-[600] flex flex-col items-center justify-center p-6 ${isDarkMode ? 'bg-black' : 'bg-red-950'}`}>
        <div className="bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 max-w-md w-full text-center border border-white/20">
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <AlertCircle size={40} className="text-white" />
          </div>
          <h2 className="text-2xl font-black text-white mb-4 uppercase tracking-wider">Call Failed</h2>
          <p className="text-white/90 mb-8 leading-relaxed font-medium">{errorMessage}</p>
          <div className="space-y-3">
            <button onClick={handleRetry} className="w-full py-4 bg-bbm-blue hover:bg-bbm-blue/90 text-white font-black rounded-2xl transition-all active:scale-95 shadow-xl">Try Again</button>
            <button onClick={onEndCall} className="w-full py-4 bg-white/10 hover:bg-white/20 text-white font-black rounded-2xl transition-all active:scale-95">Go Back</button>
          </div>
          <div className="mt-8 p-4 bg-black/30 rounded-2xl text-left border border-white/5">
            <p className="text-xs text-blue-200 font-bold mb-2 uppercase tracking-widest">Safari Tips:</p>
            <ul className="text-[10px] text-white/60 space-y-1.5 font-medium">
              <li>• Use Safari directly (not through other apps)</li>
              <li>• Ensure your URL starts with https://</li>
              <li>• Check Settings &gt; Safari &gt; Camera/Mic &gt; Allow</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`fixed inset-0 z-[500] flex flex-col animate-fade-in overflow-hidden ${themeBg} ${isIOS ? 'pt-safe' : ''}`}
      onClick={() => {
          // Safari hack: Manual play trigger on user click if autoplay was blocked
          if (remoteVideoRef.current && remoteVideoRef.current.paused) remoteVideoRef.current.play().catch(() => {});
          if (localVideoRef.current && localVideoRef.current.paused) localVideoRef.current.play().catch(() => {});
      }}
    >
      
      {type === 'video' && !isVideoOff ? (
        <div className="absolute inset-0 bg-black">
          {/* Remote Video - playsInline and autoPlay are required for Safari */}
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover" 
          />
          
          {callStatus !== 'connected' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
              <Loader size={48} className="text-bbm-blue animate-spin mb-4" />
              <p className="text-white font-bold uppercase tracking-[0.2em]">Secure Line Connecting...</p>
            </div>
          )}

          {!isMinimized && (
            <div className={`absolute top-safe right-4 mt-20 w-28 h-40 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30 bg-black transition-all transform scale-100`}>
              {/* Local Video - must be muted and playsInline for Safari */}
              <video 
                ref={localVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className={`w-full h-full object-cover ${cameraFacing === 'front' ? 'scale-x-[-1]' : ''}`} 
              />
              <div className="absolute bottom-2 left-2 bg-black/40 px-1.5 py-0.5 rounded text-[8px] text-white font-bold uppercase">
                Me ({currentUserId.substring(0, 4)})
              </div>
              <button 
                onClick={(e) => {
                    e.stopPropagation();
                    setCameraFacing(prev => prev === 'front' ? 'back' : 'front');
                }}
                className="absolute bottom-2 right-2 p-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white"
              >
                <Camera size={14} />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className={`absolute inset-0 ${gradientOverlay}`}>
          <img src={contact.avatarUrl} className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-110" alt="" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full border-4 border-white/10 animate-[ping_3s_infinite]"></div>
          </div>
          {/* Silent video element to keep the stream alive even in voice mode */}
          <video ref={remoteVideoRef} autoPlay playsInline className="hidden" />
        </div>
      )}

      {/* Top Bar Controls */}
      <div className="relative z-10 px-6 pt-2 flex items-center justify-between h-20">
        <button onClick={() => setIsMinimized(!isMinimized)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-all">
          {isMinimized ? <Maximize2 size={20} /> : <Minimize2 size={20} />}
        </button>
        <div className="bg-black/30 backdrop-blur-md rounded-full px-4 py-1.5 flex items-center gap-2 border border-white/10">
          <Signal size={14} className={callStatus === 'connected' ? "text-green-400" : "text-yellow-400"} />
          <span className="text-[10px] text-white font-black tracking-widest uppercase">
            {callStatus === 'connected' ? 'Secure HD' : 'Ringing...'}
          </span>
        </div>
        <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white active:scale-90 transition-all">
                <MessageSquare size={18} />
            </button>
        </div>
      </div>

      {/* Main Avatar / Name Display */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 -mt-12">
        <div className={`transition-all duration-700 transform ${callStatus === 'connected' && type === 'video' && !isVideoOff ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100'}`}>
          <div className={`w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 ${isDarkMode ? 'border-gray-700' : 'border-white/20'} shadow-2xl mb-6 mx-auto bg-gray-800`}>
            <img src={contact.avatarUrl} alt={contact.name} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 drop-shadow-lg text-center tracking-tight">{contact.name}</h1>
          <p className={`text-lg font-bold tracking-widest text-center uppercase ${isDarkMode ? 'text-gray-400' : 'text-blue-100'}`}>
            {callStatus === 'connected' ? formatDuration(callDuration) : callStatus.toUpperCase() + '...'}
          </p>
        </div>
      </div>

      {/* Lower Action Controls */}
      <div className="relative z-10 px-6 pb-12">
        <div className={`flex items-center justify-evenly max-w-md mx-auto backdrop-blur-2xl rounded-[3rem] p-4 border border-white/10 shadow-2xl ${isDarkMode ? 'bg-gray-900/60' : 'bg-black/40'}`}>
          <div className="flex flex-col items-center gap-1">
            <button onClick={handleToggleMute} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 ${isMuted ? 'bg-white text-gray-900' : 'bg-gray-800/80 text-white'}`}>
              {isMuted ? <MicOff size={24}/> : <Mic size={24}/>}
            </button>
            <span className="text-[9px] font-black text-white/60 uppercase mt-1">Mute</span>
          </div>

          {type === 'video' && (
            <div className="flex flex-col items-center gap-1">
              <button onClick={handleToggleVideo} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 ${isVideoOff ? 'bg-white text-gray-900' : 'bg-gray-800/80 text-white'}`}>
                {isVideoOff ? <VideoOff size={24}/> : <Video size={24}/>}
              </button>
              <span className="text-[9px] font-black text-white/60 uppercase mt-1">Video</span>
            </div>
          )}

          <div className="flex flex-col items-center gap-1">
            <button onClick={onEndCall} className="w-16 h-16 bg-red-600 text-white rounded-full shadow-lg shadow-red-600/40 flex items-center justify-center transform active:scale-90 transition-all">
              <PhoneOff size={32} fill="currentColor" />
            </button>
            <span className="text-[9px] font-black text-red-500 uppercase mt-1">End</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <button onClick={() => setIsSpeaker(!isSpeaker)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 ${isSpeaker ? 'bg-white text-gray-900' : 'bg-gray-800/80 text-white'}`}>
              <Volume2 size={24}/>
            </button>
            <span className="text-[9px] font-black text-white/60 uppercase mt-1">Speaker</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallInterface;
