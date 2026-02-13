
import React, { useEffect, useRef } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import type { CallData } from '../services/callService';

interface IncomingCallModalProps {
  call: CallData;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingCallModal: React.FC<IncomingCallModalProps> = ({
  call,
  onAccept,
  onReject
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
      // Play ringtone
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.m3u'); // Using message sound as placeholder or specific ringtone
      audio.loop = true;
      audio.play().catch(() => {});
      audioRef.current = audio;

      if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 500]);

      return () => {
          if (audioRef.current) {
              audioRef.current.pause();
              audioRef.current = null;
          }
          if (navigator.vibrate) navigator.vibrate(0);
      };
  }, []);

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-md flex items-center justify-center animate-fade-in p-6">
      <div className="bg-white dark:bg-bbm-card rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-white/10 flex flex-col items-center">
        
        <div className="relative mb-6">
            <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-bbm-blue to-purple-500 animate-pulse">
                <img 
                    src={call.fromAvatar || 'https://via.placeholder.com/150'} 
                    alt={call.fromName} 
                    className="w-full h-full rounded-full object-cover border-4 border-white dark:border-gray-800"
                />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-700 p-2 rounded-full shadow-md">
                {call.type === 'video' ? '📹' : '📞'}
            </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 text-center">
          {call.fromName || 'Unknown Caller'}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">
          Incoming {call.type} call...
        </p>

        <div className="flex gap-6 w-full">
          <button
            onClick={onReject}
            className="flex-1 py-4 rounded-2xl bg-red-500 text-white font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-lg shadow-red-500/30"
          >
            <PhoneOff size={28} />
            <span className="text-xs">Decline</span>
          </button>
          
          <button
            onClick={onAccept}
            className="flex-1 py-4 rounded-2xl bg-green-500 text-white font-bold flex flex-col items-center justify-center gap-1 active:scale-95 transition-all shadow-lg shadow-green-500/30 animate-bounce"
          >
            <Phone size={28} />
            <span className="text-xs">Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
